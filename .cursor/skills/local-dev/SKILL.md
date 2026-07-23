---
name: local-dev
description: Start the Data Hub UI locally for development with hot-reloading, proxied to a real cluster catalog API. Use when the user asks to run locally, start dev mode, review locally, or test UI changes.
---

# Local Dev — Data Hub UI

Start the frontend (hot-reload) + BFF + port-forward to a remote cluster for a fully functional local environment.

## Prerequisites

- `oc` logged into the target cluster (default: `bgal-feast-pool-t6grq`)
- Go >= 1.24.3 (for BFF)
- Node >= 22 (for frontend)
- Port 6572 free locally (catalog port-forward)
- Port 4000 free locally (BFF)
- Port 9000 free locally (frontend dev server)

## Startup Procedure

Run these three processes concurrently. Each needs its own terminal.

### 1. Port-forward the Catalog API

```bash
oc --context="default/api-bgal-feast-pool-t6grq-aws-rh-ods-com:6443/htpasswd-cluster-admin-user" \
  port-forward svc/feast-catalog 6572:6572 -n redhat-ods-applications
```

If port 6572 is busy, kill the existing process or use an alternate port and adjust `CATALOG_API_URL` below.

### 2. Start the BFF

```bash
cd ~/dev/git-repos/data-hub-ui/bff
CATALOG_API_URL=http://localhost:6572 make run PORT=4000 MOCK_K8S_CLIENT=true DEV_MODE=true AUTH_METHOD=user_token
```

Key env vars:
- `CATALOG_API_URL` — where the BFF forwards `/api/catalog/*` requests
- `MOCK_K8S_CLIENT=true` — returns mock namespaces (no real K8s RBAC needed)
- `DEV_MODE=true` — enables namespace listing endpoint
- `AUTH_METHOD=user_token` — uses bearer token auth

### 3. Start the Frontend (hot-reload)

```bash
cd ~/dev/git-repos/data-hub-ui/frontend
DEPLOYMENT_MODE=standalone AUTH_METHOD=user_token PROXY_HOST=localhost PROXY_PORT=4000 npm run start:dev
```

The dev server starts on `http://localhost:9000`. Changes to `.tsx` files reflect instantly via HMR.

**Note:** The webpack dev proxy in `config/webpack.dev.js` must include a rule for `/data-hub/api` that rewrites the path (stripping `/data-hub`) before forwarding to the BFF. This is already configured.

## Verification

Once all three are running:
1. Open `http://localhost:9000` in browser
2. The project dropdown should show namespaces (mocked)
3. Search should return results from the real catalog on the cluster

## Switching Clusters

To target a different cluster, change the `oc` context in step 1 and ensure the feast-catalog service exists in `redhat-ods-applications`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Port 6572 in use | `lsof -ti :6572 \| xargs kill` then retry |
| BFF won't build | Ensure Go >= 1.24.3: `go version` |
| Frontend won't start | Ensure Node >= 22: `node --version`; run `npm install` if needed |
| Catalog returns 401 | Token expired — re-login: `oc login` on the target cluster |
| Empty search results | Ensure the catalog has data — check `curl http://localhost:6572/v1/projects` |
