# Data Hub UI — Playwright E2E Test Plan

## Overview

End-to-end browser tests validating CRUD operations across all four Data Registry entities: **Connections**, **Collections**, **Tables**, and **Volumes**. Tests run against the live Data Hub UI deployment using Playwright with Chromium.

## Target Environment

| Item | Value |
|---|---|
| App URL | `https://data-hub-option2-poc.apps.bgal-feast-pool-t6grq.aws.rh-ods.com` |
| Catalog server | `feast-catalog` svc in `redhat-ods-applications`, port 6572 |
| Project | `feast` |
| Existing collection | `underwriting` (3 tables, 2 volumes) |

Override the URL via `DATA_HUB_URL` env var, project via `TEST_PROJECT`.

## Test Structure

```
frontend/src/__tests__/playwright/
├── TEST-PLAN.md          # This file
├── fixtures/
│   └── test-data.ts      # Shared test constants (unique per run)
├── pages/                # Page Object Models
│   ├── data-registry.page.ts    # Top-level registry (project selector, collections gallery)
│   ├── collection-detail.page.ts # Collection detail (tables + volumes)
│   └── connections.page.ts       # Connections tab (CRUD with two-step modal)
└── tests/                # Test specs (numbered for execution order)
    ├── 01-connections.spec.ts    # Connection CRUD
    ├── 02-collections.spec.ts   # Collection CRUD
    ├── 03-tables.spec.ts        # Table CRUD (within collection)
    ├── 04-volumes.spec.ts       # Volume CRUD (within collection)
    └── 05-e2e-full-crud.spec.ts # Full lifecycle integration test
```

## Test Suites

### 01 — Connections CRUD

| # | Test | Status | Notes |
|---|------|--------|-------|
| 01 | Navigate to connections tab | Ready | Selects project, switches tab |
| 02 | Create connection (two-step modal) | Ready | Step 1: select type, Step 2: fill details |
| 03 | Read / verify connection details | Ready | Checks name, endpoint, bucket in table |
| 04 | Filter connections | Ready | Match + no-match + clear |
| 05 | Update connection | Ready | Edit description, bucket |
| 06 | Delete connection | Ready | Remove + verify gone |

**Create Connection flow** replicates the RHOAI dashboard pattern (not a redirect):
1. Click "Create connection" → modal opens
2. **Step 1**: Select connection type (e.g. "S3 compatible object storage — v1")
3. **Step 2**: Fill details — Connection name, Connection description, Access key, Secret key, Endpoint, Bucket, Region
4. Click "Create" → modal closes, connection appears in table

### 02 — Collections CRUD

| # | Test | Status | Notes |
|---|------|--------|-------|
| 01 | Create collection | Ready | Must select project first |
| 02 | Verify collection in gallery | Ready | Card visible with name |
| 03 | Filter collections | Ready | Match + no-match + clear |
| 04 | Open collection detail page | Ready | Navigates, shows breadcrumb + tables/volumes |
| 05 | Delete collection | Blocked | Delete button onClick not wired (no-op) |

### 03 — Tables CRUD

| # | Test | Status | Notes |
|---|------|--------|-------|
| 01 | Register table with tags | Ready | Name, description, format, type, location, tags |
| 02 | Verify table details | Ready | All fields visible in row |
| 03 | Register table linked to connection | Ready | Connection dropdown, verify label |
| 04 | Filter tables | Ready | Match + no-match + clear |
| 05 | Verify tags on table | Ready | Tag labels in row |

### 04 — Volumes CRUD

| # | Test | Status | Notes |
|---|------|--------|-------|
| 01 | Register volume | Ready | Name, description, location, tags |
| 02 | Verify volume details | Ready | Fields visible in row |
| 03 | Register volume linked to connection | Ready | Connection dropdown, verify label |
| 04 | Filter volumes | Ready | Match + no-match + clear |
| 05 | Verify tags on volume | Ready | Tag labels in row |

### 05 — E2E Full CRUD Lifecycle

Sequential integration test exercising the full lifecycle:

| Step | Operation | Status |
|------|-----------|--------|
| 1a | Create connection | Ready |
| 1b | Verify connection | Ready |
| 2a | Create collection | Ready |
| 2b | Verify collection | Ready |
| 3a | Register table (linked to connection) | Ready |
| 3b | Verify table details + connection | Ready |
| 4a | Register volume (linked to connection) | Ready |
| 4b | Verify volume details + connection | Ready |
| 5a | Update connection | Ready |
| 6a | Delete volume | Skipped if UI missing |
| 6b | Delete table | Skipped if UI missing |
| 6c | Delete collection | Skipped if UI missing |
| 6d | Delete connection | Skipped if UI missing |

## Running Tests

```bash
# All tests
npm run test:pw

# Headed (visible browser)
npm run test:pw:headed

# Interactive UI mode
npm run test:pw:ui

# Individual suites
npm run test:pw:connections
npm run test:pw:collections
npm run test:pw:tables
npm run test:pw:volumes
npm run test:pw:e2e

# Against a different deployment
DATA_HUB_URL=https://my-cluster.example.com npm run test:pw
```

## Known Issues / Blockers

1. **Create Collection disabled without project selection** — The "Create collection" button has `isDisabled={!activeProject}`, but `activeProject` defaults to empty string even when the first project's collections are displayed. The user must explicitly select a project from the dropdown.

2. **Create Connection redirects** — The current "Create connection" button in `ConnectionsTab.tsx` is an `<a href>` that redirects to the RHOAI dashboard's project connections page. This needs to be replaced with an in-app modal replicating the dashboard's two-step flow (type selection → details).

3. **Delete not wired** — Edit and Delete buttons on collection cards have empty `onClick` handlers (`(e) => { e.stopPropagation(); }`). Same for table/volume row actions (no delete buttons exist yet).

4. **Update not implemented** — No edit modals exist for tables, volumes, or collections. Connection edit depends on the new create modal being built first.

## UI Changes Required

Before all tests will pass, the following UI changes are needed:

| Change | Component | Priority |
|--------|-----------|----------|
| Create Connection modal (two-step) | `ConnectionsTab.tsx` + new `CreateConnectionModal.tsx` | **P0** |
| Wire Create Collection (fix disabled state) | `CollectionsPage.tsx` | **P0** |
| Delete collection (API + confirm dialog) | `CollectionsPage.tsx` | P1 |
| Delete table (API + confirm dialog) | `CollectionDetailPage.tsx` | P1 |
| Delete volume (API + confirm dialog) | `CollectionDetailPage.tsx` | P1 |
| Edit connection modal | `ConnectionsTab.tsx` | P2 |
| Edit table modal | `CollectionDetailPage.tsx` | P2 |
| Edit collection (rename / description) | `CollectionsPage.tsx` | P2 |
