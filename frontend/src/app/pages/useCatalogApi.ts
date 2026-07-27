import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const PROXY_BASE = '/data-hub/api/catalog';
const BFF_BASE = '/data-hub/api/v1';
const CATALOG_API = `${PROXY_BASE}/catalog`;
const ICEBERG_API = `${PROXY_BASE}/v1`;

function catalogPath(project: string) {
  return `${CATALOG_API}/projects/${project}`;
}

function collectionPath(project: string, collection: string) {
  return `${catalogPath(project)}/collections/${collection}`;
}

// Legacy Iceberg REST paths (used by useUpdateTable — Iceberg-specific operations)
function icebergPath(project: string) {
  return `${ICEBERG_API}/${project}`;
}

function namespacePath(project: string, collection: string) {
  return `${icebergPath(project)}/namespaces/${collection}`;
}

// --- Catalog API Response Interfaces ---

interface CatalogCollection {
  name: string;
  description: string;
  table_count: number;
  volume_count: number;
  database_count?: number;
  created_date?: string;
  properties?: Record<string, string>;
}

interface CatalogCollectionsResponse {
  collections: CatalogCollection[];
}

interface CatalogAsset {
  name: string;
  asset_type: string;
  format?: string;
  volume_type?: string;
  location?: string;
  connection_ref?: string;
  description?: string;
  tags?: Record<string, string>;
  properties?: Record<string, string>;
  uuid?: string;
  collection?: string;
  columns?: Array<{name: string; type: string; nullable?: boolean; description?: string}>;
}

interface CatalogAssetsResponse {
  assets: CatalogAsset[];
}

interface CatalogDatabaseAsset {
  name: string;
  asset_type: string;
  db_type: string;
  host: string;
  database: string;
  schemas: string[];
  connection_ref: string;
  description: string;
}

interface CatalogDatabasesResponse {
  assets: CatalogDatabaseAsset[];
}

// --- Exported Interfaces ---

export interface ProjectInfo {
  name: string;
  createdTimestamp?: string;
}

export interface CollectionInfo {
  name: string;
  project: string;
  description: string;
  tableCount: number;
  volumeCount: number;
  createdDate: string;
  properties: Record<string, string>;
}

export interface SearchResult {
  type: 'collection' | 'table' | 'volume' | 'database';
  name: string;
  project: string;
  namespace: string;
  description: string;
  format?: string;
  location?: string;
  connectionRef?: string;
  tags?: Record<string, string>;
}

export interface TableAsset {
  name: string;
  namespace: string;
  description: string;
  format: string;
  volumeType: string;
  location: string;
  connectionRef: string;
  tags: Record<string, string>;
  properties: Record<string, string>;
  uuid: string;
  isVolume: boolean;
  columns?: Array<{name: string; type: string; nullable?: boolean; description?: string}>;
}

export interface DatabaseAsset {
  name: string;
  asset_type: 'database';
  db_type: string;       // postgresql, mysql, snowflake, etc.
  host: string;
  database: string;
  schemas: string[];
  connection_ref: string;
  description: string;
  collection: string;
}

export interface DataConnection {
  name: string;
  displayName: string;
  connectionType: string;
  endpoint: string;
  bucket: string;
  region: string;
  namespace?: string;
}

// --- Fetch Helpers ---

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(url, {
    credentials: 'include',
    headers: { 'kubeflow-userid': 'admin@example.com' },
  });
  if (!resp.ok) {
    throw new Error(`API error: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const resp = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'kubeflow-userid': 'admin@example.com',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`API error: ${resp.status} ${resp.statusText} — ${text}`);
  }
  return resp.json();
}

async function deleteRequest(url: string): Promise<void> {
  const resp = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'kubeflow-userid': 'admin@example.com' },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`API error: ${resp.status} ${resp.statusText} — ${text}`);
  }
}

async function putJson<T>(url: string, body: unknown): Promise<T> {
  const resp = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'kubeflow-userid': 'admin@example.com',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`API error: ${resp.status} ${resp.statusText} — ${text}`);
  }
  return resp.json();
}

// --- Projects ---

interface ProjectsResponse {
  projects: Array<{ spec: { name: string }; meta: { createdTimestamp: string } }>;
}

export function useProjects() {
  return useQuery({
    queryKey: ['catalog', 'projects'],
    queryFn: async (): Promise<ProjectInfo[]> => {
      const data = await fetchJson<ProjectsResponse>(`${PROXY_BASE}/v1/projects`);
      return (data.projects || []).map((p) => ({
        name: p.spec.name,
        createdTimestamp: p.meta?.createdTimestamp,
      }));
    },
  });
}

interface NamespaceEnvelope {
  data: { name: string; displayName?: string }[];
}

export function useK8sNamespaces() {
  return useQuery({
    queryKey: ['bff', 'namespaces'],
    queryFn: async (): Promise<{ name: string }[]> => {
      const resp = await fetch(`${BFF_BASE}/namespaces`, {
        credentials: 'include',
        headers: { 'kubeflow-userid': 'admin@example.com' },
      });
      if (!resp.ok) throw new Error(`BFF error: ${resp.status}`);
      const envelope: NamespaceEnvelope = await resp.json();
      return envelope.data;
    },
    staleTime: 60000,
  });
}

// --- Namespaces / Collections within a project (Catalog API) ---

export function useNamespaces(project: string) {
  return useQuery({
    queryKey: ['catalog', 'namespaces', project],
    queryFn: () => fetchJson<CatalogCollectionsResponse>(`${catalogPath(project)}/collections`),
    enabled: !!project,
  });
}

export function useCollections(project: string) {
  return useQuery({
    queryKey: ['catalog', 'collections', project],
    queryFn: async (): Promise<CollectionInfo[]> => {
      const data = await fetchJson<CatalogCollectionsResponse>(
        `${catalogPath(project)}/collections`,
      );
      return (data.collections || []).map((c) => ({
        name: c.name,
        project,
        description: c.description || '',
        tableCount: c.table_count || 0,
        volumeCount: c.volume_count || 0,
        createdDate: c.created_date || '',
        properties: c.properties || {},
      }));
    },
    enabled: !!project,
  });
}

// --- All-Projects Collections ---

export function useAllProjectsCollections(projects: ProjectInfo[]) {
  const projectNames = projects.map((p) => p.name);

  return useQuery({
    queryKey: ['catalog', 'all-collections', projectNames],
    queryFn: async (): Promise<CollectionInfo[]> => {
      const allCollections: CollectionInfo[] = [];

      for (const projectName of projectNames) {
        try {
          const data = await fetchJson<CatalogCollectionsResponse>(
            `${catalogPath(projectName)}/collections`,
          );
          for (const c of data.collections || []) {
            allCollections.push({
              name: c.name,
              project: projectName,
              description: c.description || '',
              tableCount: c.table_count || 0,
              volumeCount: c.volume_count || 0,
              createdDate: c.created_date || '',
              properties: c.properties || {},
            });
          }
        } catch { /* skip inaccessible projects */ }
      }

      return allCollections;
    },
    enabled: projectNames.length > 0,
    staleTime: 60000,
  });
}

// --- Server-side Search ---

interface ServerSearchResult {
  type: 'collection' | 'table' | 'volume' | 'database';
  namespace: string[];
  name: string;
  description: string | null;
  properties: Record<string, string>;
  score: number;
  project: string;
}

interface ServerSearchResponse {
  query: string;
  results: ServerSearchResult[];
  total: number;
  page: number;
  limit: number;
}

export function useSearchAssets(
  project: string,
  collections: CollectionInfo[],
  query: string,
  _includeAssets: boolean,
) {
  return useQuery({
    queryKey: ['catalog', 'search', project, query],
    queryFn: async (): Promise<SearchResult[]> => {
      const url = project
        ? `${catalogPath(project)}/search?query=${encodeURIComponent(query)}`
        : `${CATALOG_API}/search?query=${encodeURIComponent(query)}`;

      const data = await fetchJson<ServerSearchResponse>(url);
      return (data.results || []).map((item) => ({
        type: item.type,
        name: item.name,
        project: item.project || project,
        namespace: item.namespace?.[0] || '',
        description: item.description || '',
        format: item.properties?.format,
        location: item.properties?.location,
        connectionRef: item.properties?.['connection-ref'],
        tags: item.properties,
      }));
    },
    enabled: query.length >= 2 && (!!project || collections.length > 0),
    staleTime: 30000,
  });
}

// --- Tables & Volumes (Catalog API) ---

export function useTablesAndVolumes(project: string, namespace: string) {
  return useQuery({
    queryKey: ['catalog', 'tables-and-volumes', project, namespace],
    queryFn: async (): Promise<TableAsset[]> => {
      const assets: TableAsset[] = [];

      // Fetch tables via Catalog API
      try {
        const tablesResp = await fetchJson<CatalogAssetsResponse>(
          `${collectionPath(project, namespace)}/tables`,
        );
        for (const a of tablesResp.assets || []) {
          assets.push({
            name: a.name,
            namespace,
            description: a.description || '',
            format: a.format || '',
            volumeType: a.volume_type || 'MANAGED',
            location: a.location || '',
            connectionRef: a.connection_ref || '',
            tags: a.tags || {},
            properties: a.properties || {},
            uuid: a.uuid || '',
            isVolume: false,
            columns: a.columns || [],
          });
        }
      } catch { /* no tables */ }

      // Fetch volumes via Catalog API
      try {
        const volumesResp = await fetchJson<CatalogAssetsResponse>(
          `${collectionPath(project, namespace)}/volumes`,
        );
        for (const a of volumesResp.assets || []) {
          assets.push({
            name: a.name,
            namespace,
            description: a.description || '',
            format: a.format || '',
            volumeType: a.volume_type || 'EXTERNAL',
            location: a.location || '',
            connectionRef: a.connection_ref || '',
            tags: a.tags || {},
            properties: a.properties || {},
            uuid: a.uuid || '',
            isVolume: true,
          });
        }
      } catch { /* no volumes */ }

      return assets;
    },
    enabled: !!project && !!namespace,
  });
}

export function useTableDetail(project: string, namespace: string, name: string) {
  return useQuery({
    queryKey: ['catalog', 'table-detail', project, namespace, name],
    queryFn: () => fetchJson<CatalogAsset>(`${collectionPath(project, namespace)}/tables/${name}`),
    enabled: !!project && !!namespace && !!name,
  });
}

// --- Databases (Catalog API) ---

export function useDatabases(project: string, collection: string) {
  return useQuery({
    queryKey: ['catalog', 'databases', project, collection],
    queryFn: async (): Promise<DatabaseAsset[]> => {
      const data = await fetchJson<CatalogDatabasesResponse>(
        `${collectionPath(project, collection)}/databases`,
      );
      return (data.assets || []).map((a) => ({
        name: a.name,
        asset_type: 'database' as const,
        db_type: a.db_type || '',
        host: a.host || '',
        database: a.database || '',
        schemas: a.schemas || [],
        connection_ref: a.connection_ref || '',
        description: a.description || '',
        collection,
      }));
    },
    enabled: !!project && !!collection,
  });
}

// --- Connections (BFF — unchanged) ---

export function useConnections(namespace: string) {
  return useQuery({
    queryKey: ['catalog', 'connections', namespace],
    queryFn: async (): Promise<DataConnection[]> => {
      const resp = await fetch(`${BFF_BASE}/connections?namespace=${namespace}`, {
        credentials: 'include',
        headers: { 'kubeflow-userid': 'admin@example.com' },
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.connections || []).map((c: any) => ({ ...c, namespace }));
    },
    enabled: !!namespace,
  });
}

// --- Create Table (Catalog API) ---

interface CreateTablePayload {
  project: string;
  name: string;
  namespace: string;
  description: string;
  format: string;
  volumeType: string;
  location: string;
  connectionRef: string;
  tags: Record<string, string>;
  isVolume: boolean;
  schemaFields?: Array<{name: string; type: string; nullable: boolean; description?: string}>;
  properties?: Record<string, string>;
}

export function useCreateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTablePayload) => {
      const properties: Record<string, string> = { ...payload.tags };
      if (payload.description) properties.description = payload.description;
      if (payload.format) properties.format = payload.format;
      if (payload.volumeType) properties.volume_type = payload.volumeType;
      if (payload.connectionRef) properties['connection-ref'] = payload.connectionRef;

      const body: any = {
        name: payload.name,
        format: payload.format || 'iceberg',
        location: payload.location || null,
        connection_ref: payload.connectionRef || null,
        description: payload.description || null,
        schema_fields: payload.schemaFields || null,
        properties: payload.properties || null,
      };

      return postJson(
        `${collectionPath(payload.project, payload.namespace)}/tables`,
        body,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

// --- Create Volume (Catalog API) ---

export function useCreateVolume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTablePayload) => {
      const properties: Record<string, string> = { ...payload.tags };
      if (payload.description) properties.description = payload.description;
      if (payload.connectionRef) properties['connection-ref'] = payload.connectionRef;

      const body: any = {
        name: payload.name,
        location: payload.location || '',
        connection_ref: payload.connectionRef || null,
        description: payload.description || null,
        content_type: payload.format || null,
        properties: payload.properties || null,
      };

      return postJson(
        `${collectionPath(payload.project, payload.namespace)}/volumes`,
        body,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

// --- Create Collection (Catalog API) ---

export function useCreateNamespace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { project: string; name: string }) => {
      return postJson(
        `${catalogPath(payload.project)}/collections`,
        { name: payload.name },
      );
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['catalog', 'namespaces', variables.project] });
      await queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
      queryClient.refetchQueries({ queryKey: ['catalog', 'namespaces', variables.project] });
      queryClient.refetchQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

// --- Create Database (Catalog API) ---

interface CreateDatabasePayload {
  project: string;
  collection: string;
  name: string;
  db_type: string;
  host: string;
  database: string;
  schemas: string[];
  connection_ref: string;
  description: string;
}

export function useCreateDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDatabasePayload) => {
      const { project, collection, ...body } = payload;
      return postJson(
        `${collectionPath(project, collection)}/databases`,
        body,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'databases', variables.project, variables.collection] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

// --- Delete Collection (Catalog API) ---

export function useDeleteNamespace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { project: string; name: string }) => {
      return deleteRequest(`${collectionPath(payload.project, payload.name)}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'namespaces', variables.project] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

// --- Delete Table (Catalog API) ---

export function useDeleteTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { project: string; namespace: string; name: string }) => {
      return deleteRequest(
        `${collectionPath(payload.project, payload.namespace)}/tables/${payload.name}`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

// --- Delete Volume (Catalog API) ---

export function useDeleteVolume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { project: string; namespace: string; name: string }) => {
      return deleteRequest(
        `${collectionPath(payload.project, payload.namespace)}/volumes/${payload.name}`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

// --- Delete Database (Catalog API) ---

export function useDeleteDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { project: string; collection: string; name: string }) => {
      return deleteRequest(
        `${collectionPath(payload.project, payload.collection)}/databases/${payload.name}`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'databases', variables.project, variables.collection] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

// --- Update Table (Iceberg REST — set-properties / remove-properties) ---

export interface UpdateTablePayload {
  project: string;
  namespace: string;
  name: string;
  setProperties?: Record<string, string>;
  removeProperties?: string[];
}

export function useUpdateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateTablePayload) => {
      const updates: Array<{ action: string; updates?: Record<string, string>; removals?: string[] }> = [];
      if (payload.setProperties && Object.keys(payload.setProperties).length > 0) {
        updates.push({ action: 'set-properties', updates: payload.setProperties });
      }
      if (payload.removeProperties && payload.removeProperties.length > 0) {
        updates.push({ action: 'remove-properties', removals: payload.removeProperties });
      }
      return postJson(
        `${namespacePath(payload.project, payload.namespace)}/tables/${payload.name}`,
        { updates },
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
    },
  });
}

// --- Update Volume (Catalog API) ---

export interface UpdateVolumePayload {
  project: string;
  namespace: string;
  name: string;
  comment?: string;
  properties?: Record<string, string>;
  storageLocation?: string;
}

export function useUpdateVolume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateVolumePayload) => {
      const body: any = {};
      if (payload.comment !== undefined) body.comment = payload.comment;
      if (payload.properties) body.properties = payload.properties;
      if (payload.storageLocation) body.storage_location = payload.storageLocation;
      return putJson(
        `${collectionPath(payload.project, payload.namespace)}/volumes/${payload.name}`,
        body,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
    },
  });
}

// --- Create Connection (via BFF — unchanged) ---

export interface CreateConnectionPayload {
  namespace: string;
  name: string;
  displayName: string;
  description: string;
  connectionType: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
  bucket: string;
  region: string;
}

export function useCreateConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateConnectionPayload) => {
      return postJson<DataConnection>(
        `${BFF_BASE}/connections?namespace=${payload.namespace}`,
        payload,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'connections', variables.namespace] });
    },
  });
}

// --- Delete Connection (via BFF — unchanged) ---

export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { namespace: string; name: string }) => {
      return deleteRequest(`${BFF_BASE}/connections/${payload.name}?namespace=${payload.namespace}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'connections', variables.namespace] });
    },
  });
}
