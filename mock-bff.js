const http = require('http');
const url = require('url');

const TABLES = {
  underwriting: [
    {
      name: 'underwriting_guidelines',
      description: 'Policy underwriting guidelines — rating manuals, risk scoring',
      format: 'iceberg',
      location: 's3://poc-underwriting/warehouse/underwriting/underwriting_guidelines',
      connection_ref: 'dataconnection-minio-underwriting',
      volume_type: 'MANAGED',
      uuid: 'uw-guide-001',
      tags: { tier: 'gold', domain: 'underwriting', line_of_business: 'all_p_and_c' },
      properties: { tier: 'gold', domain: 'underwriting', line_of_business: 'all_p_and_c' },
      columns: [
        { name: 'doc_id', type: 'string', nullable: true },
        { name: 'title', type: 'string', nullable: true },
        { name: 'category', type: 'string', nullable: true },
        { name: 'effective_date', type: 'string', nullable: true },
        { name: 'content_hash', type: 'string', nullable: true },
        { name: 'page_count', type: 'int', nullable: true },
      ],
    },
    {
      name: 'claims_documents',
      description: 'P&C claims documents — wildfire, flood, catastrophe assessments',
      format: 'iceberg',
      location: 's3://poc-underwriting/warehouse/underwriting/claims_documents',
      connection_ref: 'dataconnection-minio-underwriting',
      volume_type: 'MANAGED',
      uuid: 'uw-claims-001',
      tags: { tier: 'gold', domain: 'claims', line_of_business: 'property,flood' },
      properties: { tier: 'gold', domain: 'claims', line_of_business: 'property,flood' },
      columns: [
        { name: 'claim_id', type: 'string', nullable: true },
        { name: 'doc_type', type: 'string', nullable: true },
        { name: 'loss_type', type: 'string', nullable: true },
        { name: 'filing_date', type: 'string', nullable: true },
        { name: 'state', type: 'string', nullable: true },
        { name: 'amount_reserved', type: 'double', nullable: true },
      ],
    },
    {
      name: 'underwriting_embeddings',
      description: 'Vector embeddings of underwriting documents (468 chunks)',
      format: 'milvus',
      location: 'milvus://underwriting_embeddings',
      connection_ref: 'dataconnection-minio-underwriting',
      volume_type: 'MANAGED',
      uuid: 'uw-embed-001',
      tags: { chunks: '468', embedding_model: 'bge-base-en-v1.5' },
      properties: { chunks: '468', embedding_model: 'bge-base-en-v1.5' },
      columns: [
        { name: 'chunk_id', type: 'string', nullable: true },
        { name: 'doc_id', type: 'string', nullable: true },
        { name: 'chunk_text', type: 'string', nullable: true },
        { name: 'embedding_dim', type: 'int', nullable: true },
      ],
    },
  ],
  regulatory: [
    {
      name: 'regulatory_bulletins',
      description: 'State DOI bulletins, NAIC model laws, rate filing instructions',
      format: 'iceberg',
      location: 's3://poc-underwriting/warehouse/regulatory/regulatory_bulletins',
      connection_ref: 'dataconnection-minio-underwriting',
      volume_type: 'MANAGED',
      uuid: 'reg-bull-001',
      tags: { tier: 'silver', domain: 'compliance', source_system: 'ca_doi,fema,naic' },
      properties: { tier: 'silver', domain: 'compliance', source_system: 'ca_doi,fema,naic' },
      columns: [
        { name: 'bulletin_id', type: 'string', nullable: true },
        { name: 'issuing_authority', type: 'string', nullable: true },
        { name: 'subject', type: 'string', nullable: true },
        { name: 'effective_date', type: 'string', nullable: true },
        { name: 'state_jurisdiction', type: 'string', nullable: true },
        { name: 'status', type: 'string', nullable: true },
      ],
    },
    {
      name: 'regulatory_embeddings',
      description: 'Vector embeddings of regulatory documents',
      format: 'milvus',
      location: 'milvus://regulatory_embeddings',
      connection_ref: 'dataconnection-minio-underwriting',
      volume_type: 'MANAGED',
      uuid: 'reg-embed-001',
      tags: { chunks: '312', embedding_model: 'bge-base-en-v1.5' },
      properties: { chunks: '312', embedding_model: 'bge-base-en-v1.5' },
      columns: [
        { name: 'chunk_id', type: 'string', nullable: true },
        { name: 'bulletin_id', type: 'string', nullable: true },
        { name: 'chunk_text', type: 'string', nullable: true },
        { name: 'embedding_dim', type: 'int', nullable: true },
      ],
    },
  ],
  forms: [
    {
      name: 'iso_form_extractions',
      description: 'ISO/ACORD form text extractions from document processing',
      format: 'parquet',
      location: 's3://poc-underwriting/warehouse/forms/iso_form_extractions',
      connection_ref: 'dataconnection-minio-iso-forms',
      volume_type: 'MANAGED',
      uuid: 'forms-iso-001',
      tags: { tier: 'silver', domain: 'forms', source_system: 'iso,acord' },
      properties: { tier: 'silver', domain: 'forms', source_system: 'iso,acord' },
      columns: [
        { name: 'form_id', type: 'string', nullable: true },
        { name: 'form_name', type: 'string', nullable: true },
        { name: 'edition_date', type: 'string', nullable: true },
        { name: 'line_of_business', type: 'string', nullable: true },
        { name: 'extracted_text_length', type: 'int', nullable: true },
        { name: 'extraction_confidence', type: 'double', nullable: true },
      ],
    },
    {
      name: 'forms_embeddings',
      description: 'Vector embeddings of form content',
      format: 'milvus',
      location: 'milvus://forms_embeddings',
      connection_ref: 'dataconnection-minio-iso-forms',
      volume_type: 'MANAGED',
      uuid: 'forms-embed-001',
      tags: { chunks: '156', embedding_model: 'bge-base-en-v1.5' },
      properties: { chunks: '156', embedding_model: 'bge-base-en-v1.5' },
      columns: [
        { name: 'chunk_id', type: 'string', nullable: true },
        { name: 'form_id', type: 'string', nullable: true },
        { name: 'chunk_text', type: 'string', nullable: true },
        { name: 'embedding_dim', type: 'int', nullable: true },
      ],
    },
  ],
};

const VOLUMES = {
  underwriting: [
    {
      name: 'raw_guidelines',
      'volume-type': 'EXTERNAL',
      'storage-location': 's3://poc-underwriting/raw/underwriting_guidelines/',
      comment: 'Source PDF documents — guidelines and manuals',
      properties: { 'connection-ref': 'dataconnection-minio-underwriting', 'content-type': 'application/pdf' },
    },
  ],
  regulatory: [
    {
      name: 'raw_bulletins',
      'volume-type': 'EXTERNAL',
      'storage-location': 's3://poc-underwriting/raw/regulatory_bulletins/',
      comment: 'Source PDF documents — DOI bulletins, NAIC publications',
      properties: { 'connection-ref': 'dataconnection-minio-underwriting', 'content-type': 'application/pdf' },
    },
  ],
  forms: [
    {
      name: 'raw_iso_forms',
      'volume-type': 'EXTERNAL',
      'storage-location': 's3://poc-underwriting/raw/iso_forms/',
      comment: 'Source PDF documents — ISO and ACORD forms',
      properties: { 'connection-ref': 'dataconnection-minio-iso-forms', 'content-type': 'application/pdf' },
    },
  ],
};

const NAMESPACE_DESCRIPTIONS = {
  underwriting: 'Underwriting documents — claims, guidelines, and risk assessment',
  regulatory: 'Regulatory bulletins — filing instructions, state actions, claims manuals',
  forms: 'ISO and ACORD coverage forms — CGL, property, additional insured, applications',
};

const CONNECTIONS = [
  {
    name: 'dataconnection-minio-underwriting',
    displayName: 'MinIO Underwriting',
    connectionType: 's3',
    endpoint: 'http://minio-service.minio.svc:9000',
    bucket: 'poc-underwriting',
  },
  {
    name: 'dataconnection-minio-iso-forms',
    displayName: 'MinIO ISO Forms',
    connectionType: 's3',
    endpoint: 'http://minio-service.minio.svc:9000',
    bucket: 'poc-underwriting',
  },
];

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const parsed = url.parse(req.url, true);
  const path = parsed.pathname.replace('/mod-arch', '');

  // BFF endpoints (mod-arch envelope)
  if (path === '/api/v1/user') {
    return res.end(JSON.stringify({ data: { userId: 'user@example.com', clusterAdmin: false } }));
  }
  if (path === '/api/v1/namespaces') {
    return res.end(JSON.stringify({ data: [{ name: 'scenario-b' }, { name: 'team-alpha' }, { name: 'team-beta' }] }));
  }
  if (path.startsWith('/api/v1/connections')) {
    const ns = parsed.query.namespace || '';
    return res.end(JSON.stringify({ connections: CONNECTIONS.map(c => ({ ...c, namespace: ns })) }));
  }
  if (path === '/healthcheck') {
    return res.end(JSON.stringify({ status: 'ok' }));
  }

  // Catalog endpoints: /api/catalog/v1/{project}/...
  const catalogMatch = path.match(/^\/api\/catalog\/v1\/([^/]+)\/(.+)$/);
  if (catalogMatch) {
    const project = catalogMatch[1];
    const rest = catalogMatch[2];

    // GET /namespaces
    if (rest === 'namespaces' && req.method === 'GET') {
      return res.end(JSON.stringify({
        namespaces: [['underwriting'], ['regulatory'], ['forms']],
      }));
    }

    // POST /namespaces (create)
    if (rest === 'namespaces' && req.method === 'POST') {
      res.writeHead(201);
      return res.end(JSON.stringify({ namespace: ['new-collection'] }));
    }

    // GET /namespaces/{ns}/generic-tables
    const genericTablesMatch = rest.match(/^namespaces\/([^/]+)\/generic-tables$/);
    if (genericTablesMatch) {
      const ns = genericTablesMatch[1];
      const tables = TABLES[ns] || [];
      return res.end(JSON.stringify({ assets: tables }));
    }

    // GET /namespaces/{ns}/generic-tables/{name}
    const tableDetailMatch = rest.match(/^namespaces\/([^/]+)\/generic-tables\/([^/]+)$/);
    if (tableDetailMatch) {
      const ns = tableDetailMatch[1];
      const name = tableDetailMatch[2];
      const table = (TABLES[ns] || []).find(t => t.name === name);
      if (table) return res.end(JSON.stringify(table));
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'not found' }));
    }

    // GET /namespaces/{ns}/tables (iceberg)
    const icebergTablesMatch = rest.match(/^namespaces\/([^/]+)\/tables$/);
    if (icebergTablesMatch) {
      const ns = icebergTablesMatch[1];
      const tables = TABLES[ns] || [];
      return res.end(JSON.stringify({ identifiers: tables.map(t => ({ namespace: [ns], name: t.name })) }));
    }

    // POST /namespaces/{ns}/tables (create table)
    const createTableMatch = rest.match(/^namespaces\/([^/]+)\/tables$/);
    if (createTableMatch && req.method === 'POST') {
      res.writeHead(201);
      return res.end(JSON.stringify({ ok: true }));
    }

    // GET /namespaces/{ns}/volumes
    const volumesMatch = rest.match(/^namespaces\/([^/]+)\/volumes$/);
    if (volumesMatch) {
      const ns = volumesMatch[1];
      const vols = VOLUMES[ns] || [];
      return res.end(JSON.stringify({ volumes: vols }));
    }

    // POST /namespaces/{ns}/volumes (create volume)
    if (volumesMatch && req.method === 'POST') {
      res.writeHead(201);
      return res.end(JSON.stringify({ ok: true }));
    }

    // GET /namespaces/{ns}/properties
    const propsMatch = rest.match(/^namespaces\/([^/]+)\/properties$/);
    if (propsMatch) {
      const ns = propsMatch[1];
      return res.end(JSON.stringify({
        properties: { description: NAMESPACE_DESCRIPTIONS[ns] || '' },
      }));
    }

    // POST /namespaces/{ns}/properties
    if (propsMatch && req.method === 'POST') {
      return res.end(JSON.stringify({ updated: [], removed: [] }));
    }

    // GET /projects
    if (rest === 'projects' || path === '/api/catalog/v1/projects') {
      return res.end(JSON.stringify({ projects: ['scenario-b'] }));
    }
  }

  // Top-level catalog /projects
  if (path === '/api/catalog/v1/projects') {
    return res.end(JSON.stringify({ projects: ['scenario-b'] }));
  }

  console.log('404:', req.method, req.url);
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(4000, () => console.log('Mock BFF running on port 4000 with scenario-b data'));
