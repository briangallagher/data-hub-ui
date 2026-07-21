import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const CATALOG_BASE = '/data-hub/api/catalog';
const BFF_BASE = '/data-hub/api/v1';

function catalogPath(project: string) {
  return `${CATALOG_BASE}/v1/${project}`;
}

function namespacePath(project: string, collection: string) {
  return `${catalogPath(project)}/namespaces/${collection}`;
}

interface ListNamespacesResponse {
  namespaces: string[][];
  'next-page-token'?: string | null;
}

interface TableIdentifier {
  namespace: string[];
  name: string;
}

interface ListTablesResponse {
  identifiers: TableIdentifier[];
  'next-page-token'?: string | null;
}

interface TableMetadata {
  'format-version': number;
  'table-uuid': string;
  location: string;
  schemas: any[];
  'current-schema-id': number;
  properties: Record<string, string>;
}

interface LoadTableResult {
  'metadata-location': string;
  metadata: TableMetadata;
  config: Record<string, string>;
}

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
  uuid: string;
  isVolume: boolean;
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
      const data = await fetchJson<ProjectsResponse>(`${CATALOG_BASE}/projects`);
      return (data.projects || []).map((p) => ({
        name: p.spec.name,
        createdTimestamp: p.meta?.createdTimestamp,
      }));
    },
  });
}

// --- Namespaces (collections within a project) ---

export function useNamespaces(project: string) {
  return useQuery({
    queryKey: ['catalog', 'namespaces', project],
    queryFn: () => fetchJson<ListNamespacesResponse>(`${catalogPath(project)}/namespaces`),
    enabled: !!project,
  });
}

interface VolumeInfo {
  name: string;
  'catalog-name': string;
  'schema-name': string;
  'volume-type': string;
  'storage-location': string;
  comment: string;
  owner: string | null;
  'created-at': number;
  'updated-at': number;
  properties: Record<string, string>;
}

interface ListVolumesResponse {
  volumes: VolumeInfo[];
}

export function useCollections(project: string) {
  const namespacesQuery = useNamespaces(project);

  return useQuery({
    queryKey: ['catalog', 'collections', project],
    queryFn: async (): Promise<CollectionInfo[]> => {
      const namespaces = namespacesQuery.data?.namespaces || [];
      const collections: CollectionInfo[] = [];

      // Fetch namespace properties (shared at project level) for descriptions
      let nsProps: Record<string, string> = {};
      if (namespaces.length > 0) {
        try {
          const nsDetail = await fetchJson<{ namespace: string[]; properties: Record<string, string> }>(
            `${catalogPath(project)}/namespaces/${namespaces[0][0]}`,
          );
          nsProps = nsDetail.properties || {};
        } catch { /* no props */ }
      }

      for (const ns of namespaces) {
        const nsName = ns[0];
        if (!nsName) continue;

        const description = nsProps[`desc.${nsName}`] || '';

        let tableCount = 0;
        let volumeCount = 0;
        let createdDate = '';
        try {
          const tablesResp = await fetchJson<ListTablesResponse>(
            `${namespacePath(project, nsName)}/tables`,
          );
          const filtered = (tablesResp.identifiers || []).filter(
            (id) => !id.namespace || id.namespace[0] === nsName,
          );
          tableCount = filtered.length;
        } catch {
          // empty
        }
        try {
          const volumesResp = await fetchJson<ListVolumesResponse>(
            `${namespacePath(project, nsName)}/volumes`,
          );
          const filteredVols = (volumesResp.volumes || []).filter(
            (v) => !v['schema-name'] || v['catalog-name'] === nsName || v['schema-name'] === nsName,
          );
          volumeCount = filteredVols.length;
          if (filteredVols.length > 0) {
            const ts = filteredVols[0]['created-at'];
            if (ts) createdDate = new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          }
        } catch {
          // no volumes
        }

        collections.push({
          name: nsName,
          project,
          description,
          tableCount,
          volumeCount,
          createdDate,
          properties: nsProps,
        });
      }

      return collections;
    },
    enabled: !!project && !!namespacesQuery.data,
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
          const nsResp = await fetchJson<ListNamespacesResponse>(
            `${catalogPath(projectName)}/namespaces`,
          );
          for (const ns of nsResp.namespaces || []) {
            const nsName = ns[0];
            if (!nsName) continue;
            allCollections.push({
              name: nsName,
              project: projectName,
              description: '',
              tableCount: 0,
              volumeCount: 0,
              createdDate: '',
              properties: {},
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

// --- Multi-level Search ---

export function useSearchAssets(
  project: string,
  collections: CollectionInfo[],
  query: string,
  includeAssets: boolean,
) {
  return useQuery({
    queryKey: ['catalog', 'search', project, query, includeAssets],
    queryFn: async (): Promise<SearchResult[]> => {
      const q = query.toLowerCase();
      const results: SearchResult[] = [];

      const targetCollections = project
        ? collections.filter((c) => c.project === project)
        : collections;

      for (const coll of targetCollections) {
        if (
          coll.name.toLowerCase().includes(q) ||
          coll.description.toLowerCase().includes(q)
        ) {
          results.push({
            type: 'collection',
            name: coll.name,
            project: coll.project,
            namespace: coll.name,
            description: coll.description,
          });
        }
      }

      if (!includeAssets) return results;

      const searchProjects = project
        ? [project]
        : [...new Set(targetCollections.map((c) => c.project))];

      for (const proj of searchProjects) {
        const projCollections = targetCollections.filter((c) => c.project === proj);
        for (const coll of projCollections) {
          try {
            const tablesResp = await fetchJson<ListTablesResponse>(
              `${namespacePath(proj, coll.name)}/tables`,
            );
            for (const id of tablesResp.identifiers || []) {
              try {
                const detail = await fetchJson<LoadTableResult>(
                  `${namespacePath(proj, coll.name)}/tables/${id.name}`,
                );
                const props = detail.metadata?.properties || {};
                const desc = props.description || '';
                const name = id.name;
                if (name.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
                  results.push({
                    type: 'table',
                    name,
                    project: proj,
                    namespace: coll.name,
                    description: desc,
                    format: props.format,
                    location: detail.metadata?.location,
                    connectionRef: props['connection-ref'],
                    tags: props,
                  });
                }
              } catch { /* skip */ }
            }
          } catch { /* skip */ }

          try {
            const volResp = await fetchJson<ListVolumesResponse>(
              `${namespacePath(proj, coll.name)}/volumes`,
            );
            for (const vol of volResp.volumes || []) {
              const desc = vol.comment || '';
              if (vol.name.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
                results.push({
                  type: 'volume',
                  name: vol.name,
                  project: proj,
                  namespace: coll.name,
                  description: desc,
                  location: vol['storage-location'],
                  connectionRef: vol.properties?.['connection-ref'],
                  tags: vol.properties,
                });
              }
            }
          } catch { /* skip */ }
        }
      }

      return results;
    },
    enabled: query.length >= 2 && collections.length > 0,
    staleTime: 30000,
  });
}

// --- Tables & Volumes ---

export function useTablesAndVolumes(project: string, namespace: string) {
  return useQuery({
    queryKey: ['catalog', 'tables-and-volumes', project, namespace],
    queryFn: async (): Promise<TableAsset[]> => {
      const assets: TableAsset[] = [];

      try {
        const tablesResp = await fetchJson<ListTablesResponse>(
          `${namespacePath(project, namespace)}/tables`,
        );
        const filtered = (tablesResp.identifiers || []).filter(
          (id) => !id.namespace || id.namespace[0] === namespace,
        );
        for (const id of filtered) {
          try {
            const detail = await fetchJson<LoadTableResult>(
              `${namespacePath(project, namespace)}/tables/${id.name}`,
            );
            const props = detail.metadata?.properties || {};
            assets.push({
              name: id.name,
              namespace: id.namespace?.[0] || namespace,
              description: props.description || '',
              format: props.format || '',
              volumeType: props.volume_type || 'MANAGED',
              location: detail.metadata?.location || '',
              connectionRef: props['connection-ref'] || props['connection_ref'] || '',
              tags: props,
              uuid: detail.metadata?.['table-uuid'] || '',
              isVolume: false,
            });
          } catch {
            assets.push({
              name: id.name, namespace: id.namespace?.[0] || namespace,
              description: '', format: '', volumeType: 'MANAGED', location: '',
              connectionRef: '', tags: {}, uuid: '', isVolume: false,
            });
          }
        }
      } catch { /* no tables */ }

      try {
        const volumesResp = await fetchJson<ListVolumesResponse>(
          `${namespacePath(project, namespace)}/volumes`,
        );
        const filteredVols = (volumesResp.volumes || []).filter(
          (v) => v['schema-name'] === namespace || !v['schema-name'],
        );
        for (const vol of filteredVols) {
          assets.push({
            name: vol.name,
            namespace: namespace,
            description: vol.comment || '',
            format: '',
            volumeType: vol['volume-type'] || 'EXTERNAL',
            location: vol['storage-location'] || '',
            connectionRef: vol.properties?.['connection-ref'] || '',
            tags: vol.properties || {},
            uuid: '',
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
    queryFn: () => fetchJson<LoadTableResult>(`${namespacePath(project, namespace)}/tables/${name}`),
    enabled: !!project && !!namespace && !!name,
  });
}

// --- Connections ---

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

// --- Create Table/Volume ---

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
        schema: {
          type: 'struct',
          'schema-id': 0,
          fields: [],
        },
        location: payload.location || null,
        properties,
      };

      return postJson(
        `${namespacePath(payload.project, payload.namespace)}/tables`,
        body,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

export function useCreateVolume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTablePayload) => {
      const properties: Record<string, string> = { ...payload.tags };
      if (payload.description) properties.description = payload.description;
      if (payload.connectionRef) properties['connection-ref'] = payload.connectionRef;

      const body: any = {
        name: payload.name,
        'volume-type': 'EXTERNAL',
        'storage-location': payload.location || '',
        comment: payload.description || null,
        properties,
      };

      return postJson(
        `${namespacePath(payload.project, payload.namespace)}/volumes`,
        body,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

export function useCreateNamespace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { project: string; name: string }) => {
      return postJson(
        `${catalogPath(payload.project)}/namespaces`,
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

// --- Delete Namespace (Collection) ---

export function useDeleteNamespace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { project: string; name: string }) => {
      return deleteRequest(`${catalogPath(payload.project)}/namespaces/${payload.name}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'namespaces', variables.project] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

// --- Delete Table ---

export function useDeleteTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { project: string; namespace: string; name: string }) => {
      return deleteRequest(
        `${namespacePath(payload.project, payload.namespace)}/tables/${payload.name}`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

// --- Delete Volume ---

export function useDeleteVolume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { project: string; namespace: string; name: string }) => {
      return deleteRequest(
        `${namespacePath(payload.project, payload.namespace)}/volumes/${payload.name}`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'collections', variables.project] });
    },
  });
}

// --- Update Table (set-properties / remove-properties) ---

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

// --- Update Volume (PUT) ---

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
        `${namespacePath(payload.project, payload.namespace)}/volumes/${payload.name}`,
        body,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'tables-and-volumes', variables.project, variables.namespace] });
    },
  });
}

// --- Create Connection (via BFF → K8s Secret) ---

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

// --- Delete Connection (via BFF → K8s Secret) ---

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
