/**
 * Test data constants used across all CRUD test suites.
 * The suffix is stable for the lifetime of the module (i.e., per worker/test file),
 * so tables/volumes created in test 01 are findable in tests 04-05.
 */
const SUFFIX = process.env.TEST_SUFFIX || 'pw-test';

export const PROJECT = process.env.TEST_PROJECT || 'option2-poc';
export const CONNECTIONS_PROJECT = process.env.TEST_CONNECTIONS_PROJECT || 'option2-poc';

export const TEST_CONNECTION = {
  type: 'S3 compatible object storage',
  name: `test-conn-${SUFFIX}`,
  description: 'Playwright test connection — safe to delete',
  accessKey: 'test-access-key',
  secretKey: 'test-secret-key',
  endpoint: 'http://minio-service.minio.svc:9000',
  bucket: 'poc-underwriting',
  region: 'us-east-1',
};

export const TEST_CONNECTION_UPDATE = {
  description: 'Updated by Playwright test',
  endpoint: 'http://minio-service.minio.svc:9000',
  bucket: 'poc-underwriting-updated',
};

export const TEST_COLLECTION = {
  name: `test-coll-${SUFFIX}`,
};

export const TEST_TABLE = {
  name: `test-table-${SUFFIX}`,
  description: 'Playwright test table — safe to delete',
  format: 'parquet',
  type: 'EXTERNAL',
  location: `s3://poc-underwriting/test/${SUFFIX}/test-table`,
  tags: [
    { key: 'env', value: 'test' },
    { key: 'created-by', value: 'playwright' },
  ],
};

export const TEST_VOLUME = {
  name: `test-vol-${SUFFIX}`,
  description: 'Playwright test volume — safe to delete',
  location: `s3://poc-underwriting/test/${SUFFIX}/test-volume/`,
  tags: [
    { key: 'env', value: 'test' },
    { key: 'created-by', value: 'playwright' },
  ],
};
