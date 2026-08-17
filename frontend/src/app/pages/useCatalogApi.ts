import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const PROXY_BASE = '/data-hub/api/catalog';
const BFF_BASE = '/data-hub/api/v1';
const API_BASE = `${PROXY_BASE}/v1`;

// Iceberg extension paths (/v1)
function namespacesPath(project: string) {
  return `${API_BASE}/${project}/namespaces`;
}

function genericTablesPath(project: string, namespace: string) {
  return `${API_BASE}/${project}/namespaces/${namespace}/generic-tables`;
}

function icebergTablesPath(project: string, namespace: string) {
  return `${API_BASE}/${project}/namespaces/${namespace}/tables`;
}

function volumesPath(project: string, namespace: string) {
  return `${API_BASE}/${project}/namespaces/${namespace}/volumes`;
}

function searchPath(project: string) {
  return `${API_BASE}/${project}/search`;
}

// --- Catalog API Response Interfaces ---

interface CatalogAsset {
  name: string;
  asset_type: string;
  format?: string;
  volume_type?: string;
  location?: string;
  connection_ref?: string;
  description?: string;
  tags?: string[];
  properties?: Record<string, string>;
  uuid?: string;
  collection?: string;
  columns?: Array<{name: string; type: string; nullable?: boolean; description?: string}>;
}

interface CatalogAssetsResponse {
  assets: CatalogAsset[];
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
  type: 'collection' | 'table' | 'volume';
  name: string;
  project: string;
  namespace: string;
  description: string;
  format?: string;
  location?: string;
  connectionRef?: string;
  tags?: string[];
}

export interface TableAsset {
  name: string;
  namespace: string;
  description: string;
  format: string;
  volumeType: string;
  location: string;
  connectionRef: string;
  tags: string[];
  properties: Record<string, string>;
  uuid: string;
  isVolume: boolean;
  columns?: Array<{name: string; type: string; nullable?: boolean; description?: string}>;
  registeredBy?: string;
  createdAt?: string;
}

export interface DataConnection {
  name: string;
  displayName: string;
  connectionType: string;
  endpoint: string;
  bucket: string;
  region: string;
  namespace?: string;
  status?: 'Unverified' | 'Verifying' | 'Verified' | 'Verification failed';
  lastTested?: string;
}

// --- Fetch Helpers ---

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(url, {
    credentials: 'include',
    headers: {},
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
    headers: {},
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
  projects: string[];
}

export function useProjects() {
  return useQuery({
    queryKey: ['catalog', 'projects'],
    queryFn: async (): Promise<ProjectInfo[]> => {
      const data = await fetchJson<ProjectsResponse>(`${API_BASE}/projects`);
      return (data.projects || []).map((name) => ({ name }));
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
        headers: {},
      });
      if (!resp.ok) throw new Error(`BFF error: ${resp.status}`);
      const envelope: NamespaceEnvelope = await resp.json();
      return envelope.data;
    },
    staleTime: 60000,
  });
}

// --- Namespaces (Iceberg extension) ---

interface IcebergNamespacesResponse {
  namespaces: string[][];
}

export function useNamespaces(project: string) {
  return useQuery({
    queryKey: ['catalog', 'namespaces', project],
    queryFn: () => fetchJson<IcebergNamespacesResponse>(namespacesPath(project)),
    enabled: !!project,
  });
}

export function useCollections(project: string) {
  return useQuery({
    queryKey: ['catalog', 'collections', project],
    queryFn: async (): Promise<CollectionInfo[]> => {
      const data = await fetchJson<IcebergNamespacesResponse>(namespacesPath(project));
      const collections = await Promise.all(
        (data.namespaces || []).map(async (ns) => {
          const name = ns[0] || 'default';
          let description = '';
          let tableCount = 0;
          let volumeCount = 0;
          let properties: Record<string, string> = {};
          try {
            const props = await fetchJson<{ properties: Record<string, string> }>(
              `${namespacesPath(project)}/${name}/properties`,
            );
            description = props.properties?.description || '';
            properties = props.properties || {};
          } catch { /* ignore */ }
          try {
            const tables = await fetchJson<CatalogAssetsResponse>(
              genericTablesPath(project, name),
            );
            tableCount = (tables.assets || []).length;
          } catch { /* ignore */ }
          try {
            const vols = await fetchJson<{ volumes: unknown[] }>(
              volumesPath(project, name),
            );
            volumeCount = (vols.volumes || []).length;
          } catch { /* ignore */ }
          return { name, project, description, tableCount, volumeCount, createdDate: '', properties };
        }),
      );
      return collections;
    },
    enabled: !!project,
  });
}

// --- Tags ---

interface TagsResponse {
  tags: string[];
}

export function useTags(project: string) {
  return useQuery({
    queryKey: ['catalog', 'tags', project],
    queryFn: () => fetchJson<TagsResponse>(`${API_BASE}/${project}/tags`),
    enabled: !!project,
    select: (data) => data.tags || [],
  });
}

// --- Server-side Search ---

interface ServerSearchResult {
  type: string;
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
        ? `${searchPath(project)}?query=${encodeURIComponent(query)}`
        : `${API_BASE}/search?query=${encodeURIComponent(query)}`;

      const data = await fetchJson<ServerSearchResponse>(url);
      return (data.results || []).map((item) => ({
        type: item.type as SearchResult['type'],
        name: item.name,
        project: item.project || project,
        namespace: item.namespace?.[0] || '',
        description: item.description || '',
        format: item.properties?.format,
        location: item.properties?.location,
        connectionRef: item.properties?.['connection-ref'],
        tags: [],
      }));
    },
    enabled: query.length >= 2 && (!!project || collections.length > 0),
    staleTime: 30000,
  });
}

// --- Tables & Volumes (Iceberg extension) ---

export async function fetchTablesAndVolumes(project: string, namespace: string): Promise<TableAsset[]> {
      const assets: TableAsset[] = [];

      // Fetch tables (including databases) via generic-tables extension
      try {
        const tablesResp = await fetchJson<CatalogAssetsResponse>(
          genericTablesPath(project, namespace),
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
            tags: a.tags || [],
            properties: a.properties || {},
            uuid: a.uuid || '',
            isVolume: false,
            columns: a.columns || [],
            registeredBy: (a as any).registered_by || undefined,
            createdAt: (a as any).created_at || undefined,
          });
        }
      } catch { /* no tables */ }

      // Fetch volumes via Iceberg extension
      try {
        const volumesResp = await fetchJson<any>(
          volumesPath(project, namespace),
        );
        for (const v of volumesResp.volumes || []) {
          assets.push({
            name: v.name,
            namespace,
            description: v.comment || v.properties?.description || '',
            format: '',
            volumeType: v['volume-type'] || 'EXTERNAL',
            location: v['storage-location'] || '',
            connectionRef: v.properties?.['connection-ref'] || '',
            tags: [],
            properties: v.properties || {},
            uuid: '',
            isVolume: true,
            registeredBy: v.properties?.registered_by,
            createdAt: v['created-at'] ? String(v['created-at']) : undefined,
          });
        }
      } catch { /* no volumes */ }

  return assets;
}

export function useTablesAndVolumes(project: string, namespace: string) {
  return useQuery({
    queryKey: ['catalog', 'tables-and-volumes', project, namespace],
    queryFn: () => fetchTablesAndVolumes(project, namespace),
    enabled: !!project && !!namespace,
  });
}

export function useTableDetail(project: string, namespace: string, name: string) {
  return useQuery({
    queryKey: ['catalog', 'table-detail', project, namespace, name],
    queryFn: () => fetchJson<CatalogAsset>(`${genericTablesPath(project, namespace)}/${name}`),
    enabled: !!project && !!namespace && !!name,
  });
}

export function useVolumeDetail(project: string, namespace: string, name: string) {
  return useQuery({
    queryKey: ['catalog', 'volume-detail', project, namespace, name],
    queryFn: async (): Promise<CatalogAsset> => {
      const v = await fetchJson<any>(`${volumesPath(project, namespace)}/${name}`);
      return {
        name: v.name,
        asset_type: 'volume',
        description: v.comment || v.properties?.description || '',
        format: '',
        volume_type: v['volume-type'] || 'EXTERNAL',
        location: v['storage-location'] || '',
        connection_ref: v.properties?.['connection-ref'] || '',
        tags: [],
        properties: v.properties || {},
        uuid: '',
        collection: namespace,
      };
    },
    enabled: !!project && !!namespace && !!name,
  });
}

// --- Connections (BFF — unchanged) ---

export function useConnections(namespace: string) {
  return useQuery({
    queryKey: ['catalog', 'connections', namespace],
    queryFn: async (): Promise<DataConnection[]> => {
      const resp = await fetch(`${BFF_BASE}/connections?namespace=${namespace}`, {
        credentials: 'include',
        headers: {},
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.connections || []).map((c: any) => ({ ...c, namespace }));
    },
    enabled: !!namespace,
  });
}

// --- Create Table (Iceberg extension) ---

interface CreateTablePayload {
  project: string;
  name: string;
  namespace: string;
  description: string;
  format: string;
  volumeType: string;
  location: string;
  connectionRef: string;
  tags: string[];
  isVolume: boolean;
  schemaFields?: Array<{name: string; type: string; nullable: boolean; description?: string}>;
  properties?: Record<string, string>;
}

export function useCreateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTablePayload) => {
      const body: any = {
        name: payload.name,
        format: payload.format || 'iceberg',
        location: payload.location || null,
        connection_ref: payload.connectionRef || null,
        description: payload.description || null,
        schema_fields: payload.schemaFields || null,
        properties: payload.properties || null,
        tags: payload.tags.length > 0 ? payload.tags : null,
      };

      return postJson(
        genericTablesPath(payload.project, payload.namespace),
        body,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tags', variables.project] });
    },
  });
}

// --- Create Volume (Iceberg extension) ---

export function useCreateVolume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTablePayload) => {
      const body: any = {
        name: payload.name,
        location: payload.location || '',
        connection_ref: payload.connectionRef || null,
        description: payload.description || null,
        content_type: payload.format || null,
        properties: payload.properties || null,
        tags: payload.tags.length > 0 ? payload.tags : null,
      };

      return postJson(
        volumesPath(payload.project, payload.namespace),
        body,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tags', variables.project] });
    },
  });
}

// --- Create Namespace (Iceberg extension) ---

export function useCreateNamespace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { project: string; name: string }) => {
      return postJson(
        namespacesPath(payload.project),
        { namespace: [payload.name] },
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

// --- Delete Namespace (Iceberg extension) ---

export function useDeleteNamespace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { project: string; name: string }) => {
      return deleteRequest(`${API_BASE}/${payload.project}/namespaces/${payload.name}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'namespaces', variables.project] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

// --- Delete Table (Iceberg extension) ---

export function useDeleteTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { project: string; namespace: string; name: string }) => {
      return deleteRequest(
        `${genericTablesPath(payload.project, payload.namespace)}/${payload.name}`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

// --- Delete Volume (Iceberg extension) ---

export function useDeleteVolume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { project: string; namespace: string; name: string }) => {
      return deleteRequest(
        `${volumesPath(payload.project, payload.namespace)}/${payload.name}`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

// --- Patch helpers ---

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const resp = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`API error: ${resp.status} ${resp.statusText} — ${text}`);
  }
  return resp.json();
}

// --- Patch Generic Table ---

export interface PatchGenericTablePayload {
  project: string;
  namespace: string;
  name: string;
  description?: string;
  owner?: string;
  tags?: string[];
  properties?: Record<string, string>;
}

export function usePatchGenericTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PatchGenericTablePayload) => {
      const body: Record<string, unknown> = {};
      if (payload.description !== undefined) body.description = payload.description;
      if (payload.owner !== undefined) body.owner = payload.owner;
      if (payload.tags !== undefined) body.tags = payload.tags;
      if (payload.properties !== undefined) body.properties = payload.properties;
      return patchJson(
        `${genericTablesPath(payload.project, payload.namespace)}/${payload.name}`,
        body,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'table-detail', variables.project, variables.namespace, variables.name] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tags', variables.project] });
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
        `${icebergTablesPath(payload.project, payload.namespace)}/${payload.name}`,
        { updates },
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
    },
  });
}

// --- Update Volume (Iceberg extension) ---

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
        `${volumesPath(payload.project, payload.namespace)}/${payload.name}`,
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
