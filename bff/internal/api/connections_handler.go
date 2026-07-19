package api

import (
	"context"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/constants"
	k8sIntegration "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
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

	connections, err := listDataConnections(ctx, namespace, identity.Token)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to list connections: %w", err))
		return
	}

	resp := ConnectionsResponse{Connections: connections}
	if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func listDataConnections(ctx context.Context, namespace, token string) ([]ConnectionModel, error) {
	cfg, err := rest.InClusterConfig()
	if err != nil {
		cfg = &rest.Config{Host: "https://kubernetes.default.svc"}
	}
	// Use user token if provided; otherwise use the pod's service account
	if token != "" {
		cfg.BearerToken = token
		cfg.BearerTokenFile = ""
	}

	clientset, err := kubernetes.NewForConfig(cfg)
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
