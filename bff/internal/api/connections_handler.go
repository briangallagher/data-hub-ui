package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/constants"
	k8sIntegration "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type ConnectionModel struct {
	Name           string `json:"name"`
	DisplayName    string `json:"displayName"`
	ConnectionType string `json:"connectionType"`
	Endpoint       string `json:"endpoint"`
	Bucket         string `json:"bucket"`
	Region         string `json:"region"`
}

type ConnectionsResponse struct {
	Connections []ConnectionModel `json:"connections"`
}

type CreateConnectionRequest struct {
	Name           string `json:"name"`
	DisplayName    string `json:"displayName"`
	Description    string `json:"description"`
	ConnectionType string `json:"connectionType"`
	AccessKey      string `json:"accessKey"`
	SecretKey      string `json:"secretKey"`
	Endpoint       string `json:"endpoint"`
	Bucket         string `json:"bucket"`
	Region         string `json:"region"`
}

func (app *App) GetConnectionsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8sIntegration.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("namespace query parameter is required"))
		return
	}

	token := resolveUserToken(r, identity)
	connections, err := listDataConnections(ctx, namespace, token)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to list connections: %w", err))
		return
	}

	resp := ConnectionsResponse{Connections: connections}
	if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) CreateConnectionHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8sIntegration.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("namespace query parameter is required"))
		return
	}

	var req CreateConnectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid request body: %w", err))
		return
	}
	if req.Name == "" {
		app.badRequestResponse(w, r, fmt.Errorf("name is required"))
		return
	}

	token := resolveUserToken(r, identity)
	conn, err := createDataConnection(ctx, namespace, token, req)
	if err != nil {
		app.LogError(r, err)
		httpError := &HTTPError{
			StatusCode: http.StatusInternalServerError,
			Error: ErrorPayload{
				Code:    "500",
				Message: fmt.Sprintf("failed to create connection: %v", err),
			},
		}
		app.errorResponse(w, r, httpError)
		return
	}

	if err := app.WriteJSON(w, http.StatusCreated, conn, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) DeleteConnectionHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8sIntegration.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("namespace query parameter is required"))
		return
	}

	name := ps.ByName("name")
	if name == "" {
		app.badRequestResponse(w, r, fmt.Errorf("connection name is required"))
		return
	}

	token := resolveUserToken(r, identity)
	if err := deleteDataConnection(ctx, namespace, name, token); err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to delete connection: %w", err))
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// resolveUserToken returns the best available user token for K8s API calls.
// In the RHOAI dashboard, the user's OAuth token arrives via x-forwarded-access-token.
// The middleware may produce an empty token in dev mode, so we fall back to the header.
func resolveUserToken(r *http.Request, identity *k8sIntegration.RequestIdentity) string {
	if identity != nil && identity.Token != "" {
		return identity.Token
	}
	if fwd := r.Header.Get("X-Forwarded-Access-Token"); fwd != "" {
		return fwd
	}
	if auth := r.Header.Get("Authorization"); len(auth) > 7 && auth[:7] == "Bearer " {
		return auth[7:]
	}
	return ""
}

func newK8sClientset(token string) (kubernetes.Interface, error) {
	cfg, err := rest.InClusterConfig()
	if err != nil {
		cfg = &rest.Config{Host: "https://kubernetes.default.svc"}
	}
	if token != "" {
		cfg.BearerToken = token
		cfg.BearerTokenFile = ""
	}
	return kubernetes.NewForConfig(cfg)
}

func listDataConnections(ctx context.Context, namespace, token string) ([]ConnectionModel, error) {
	clientset, err := newK8sClientset(token)
	if err != nil {
		return nil, fmt.Errorf("creating clientset: %w", err)
	}

	secrets, err := clientset.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: "opendatahub.io/managed=true,opendatahub.io/dashboard=true",
	})
	if err != nil {
		return nil, fmt.Errorf("listing secrets in %s: %w", namespace, err)
	}

	connections := make([]ConnectionModel, 0, len(secrets.Items))
	for _, s := range secrets.Items {
		connType := s.Annotations["opendatahub.io/connection-type-ref"]
		if connType == "" {
			connType = "s3"
		}
		displayName := s.Annotations["openshift.io/display-name"]
		if displayName == "" {
			displayName = s.Name
		}

		connections = append(connections, ConnectionModel{
			Name:           s.Name,
			DisplayName:    displayName,
			ConnectionType: connType,
			Endpoint:       string(s.Data["AWS_S3_ENDPOINT"]),
			Bucket:         string(s.Data["AWS_S3_BUCKET"]),
			Region:         string(s.Data["AWS_DEFAULT_REGION"]),
		})
	}

	return connections, nil
}

func createDataConnection(ctx context.Context, namespace, token string, req CreateConnectionRequest) (ConnectionModel, error) {
	if token == "" {
		return ConnectionModel{}, fmt.Errorf("no authentication token available — cannot create secrets (ensure you are logged in)")
	}

	clientset, err := newK8sClientset(token)
	if err != nil {
		return ConnectionModel{}, fmt.Errorf("creating clientset: %w", err)
	}

	displayName := req.DisplayName
	if displayName == "" {
		displayName = req.Name
	}
	connType := req.ConnectionType
	if connType == "" {
		connType = "s3"
	}

	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      req.Name,
			Namespace: namespace,
			Labels: map[string]string{
				"opendatahub.io/managed":   "true",
				"opendatahub.io/dashboard": "true",
			},
			Annotations: map[string]string{
				"opendatahub.io/connection-type-ref": connType,
				"openshift.io/display-name":          displayName,
				"openshift.io/description":           req.Description,
			},
		},
		Type: corev1.SecretTypeOpaque,
		StringData: map[string]string{
			"AWS_ACCESS_KEY_ID":     req.AccessKey,
			"AWS_SECRET_ACCESS_KEY": req.SecretKey,
			"AWS_S3_ENDPOINT":       req.Endpoint,
			"AWS_S3_BUCKET":         req.Bucket,
			"AWS_DEFAULT_REGION":    req.Region,
		},
	}

	_, err = clientset.CoreV1().Secrets(namespace).Create(ctx, secret, metav1.CreateOptions{})
	if err != nil {
		return ConnectionModel{}, fmt.Errorf("creating secret %s in %s: %w", req.Name, namespace, err)
	}

	return ConnectionModel{
		Name:           req.Name,
		DisplayName:    displayName,
		ConnectionType: connType,
		Endpoint:       req.Endpoint,
		Bucket:         req.Bucket,
		Region:         req.Region,
	}, nil
}

func deleteDataConnection(ctx context.Context, namespace, name, token string) error {
	clientset, err := newK8sClientset(token)
	if err != nil {
		return fmt.Errorf("creating clientset: %w", err)
	}

	return clientset.CoreV1().Secrets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}
