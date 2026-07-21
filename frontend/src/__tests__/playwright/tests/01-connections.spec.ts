import { test, expect } from '@playwright/test';
import { DataRegistryPage } from '../pages/data-registry.page';
import { ConnectionsPage } from '../pages/connections.page';
import { CONNECTIONS_PROJECT, TEST_CONNECTION, TEST_CONNECTION_UPDATE } from '../fixtures/test-data';

/**
 * CRUD tests for Data Connections.
 *
 * The Create Connection flow replicates the RHOAI dashboard modal:
 *   Step 1 — pick connection type (e.g. "S3 compatible object storage — v1")
 *   Step 2 — fill in details (name, description, access key, secret key, endpoint, bucket)
 *
 * Tests run sequentially: Create → Read → Update → Delete.
 */
test.describe('Connections CRUD', () => {
  let registry: DataRegistryPage;
  let connections: ConnectionsPage;

  test.beforeEach(async ({ page }) => {
    registry = new DataRegistryPage(page);
    connections = new ConnectionsPage(page);
  });

  test('01 — navigate to connections tab', async ({ page }) => {
    await connections.goto(CONNECTIONS_PROJECT);

    await expect(page.getByRole('heading', { name: 'Data connections', exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(connections.createConnectionButton).toBeVisible({ timeout: 10_000 });
  });

  test('02 — create connection (two-step modal)', async ({ page }) => {
    await connections.goto(CONNECTIONS_PROJECT);

    await connections.createConnection({
      type: TEST_CONNECTION.type,
      name: TEST_CONNECTION.name,
      description: TEST_CONNECTION.description,
      accessKey: TEST_CONNECTION.accessKey,
      secretKey: TEST_CONNECTION.secretKey,
      endpoint: TEST_CONNECTION.endpoint,
      bucket: TEST_CONNECTION.bucket,
      region: TEST_CONNECTION.region,
    });

    // Verify the connection appears in the table
    const row = await connections.findConnectionRow(TEST_CONNECTION.name);
    await expect(row).toBeVisible({ timeout: 10_000 });
  });

  test('03 — read / verify connection details', async ({ page }) => {
    await connections.goto(CONNECTIONS_PROJECT);

    const row = await connections.findConnectionRow(TEST_CONNECTION.name);
    await expect(row).toBeVisible();

    // Verify displayed fields
    await expect(row.locator('td[data-label="Name"]')).toHaveText(TEST_CONNECTION.name);
    await expect(row.locator('td[data-label="Endpoint"]')).toContainText(TEST_CONNECTION.endpoint);
    await expect(row.locator('td[data-label="Bucket"]')).toHaveText(TEST_CONNECTION.bucket);
  });

  test('04 — filter connections', async ({ page }) => {
    await connections.goto(CONNECTIONS_PROJECT);

    // Filter should match our test connection
    await connections.filterConnections(TEST_CONNECTION.name);
    const rows = await connections.getConnectionRows();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(TEST_CONNECTION.name);

    // Filter with non-matching text should show empty
    await connections.filterConnections('zzz-no-match-zzz');
    await expect(page.getByText('No Data Connections found')).toBeVisible();

    await connections.clearFilter();
  });

  test.skip('05 — update connection', async ({ page }) => {
    // Edit connection modal not yet implemented
    await connections.goto(CONNECTIONS_PROJECT);

    await connections.editConnection(TEST_CONNECTION.name, {
      description: TEST_CONNECTION_UPDATE.description,
      bucket: TEST_CONNECTION_UPDATE.bucket,
    });

    const row = await connections.findConnectionRow(TEST_CONNECTION.name);
    await expect(row).toBeVisible();
    await expect(row.locator('td[data-label="Bucket"]')).toHaveText(TEST_CONNECTION_UPDATE.bucket);
  });

  test('06 — delete connection', async ({ page }) => {
    await connections.goto(CONNECTIONS_PROJECT);

    await connections.deleteConnection(TEST_CONNECTION.name);

    // Verify the connection is no longer listed
    const row = await connections.findConnectionRow(TEST_CONNECTION.name);
    await expect(row).toHaveCount(0);
  });
});
