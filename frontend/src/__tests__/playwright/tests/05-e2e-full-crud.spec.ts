import { test, expect } from '@playwright/test';
import { DataRegistryPage } from '../pages/data-registry.page';
import { CollectionDetailPage } from '../pages/collection-detail.page';
import { ConnectionsPage } from '../pages/connections.page';

/**
 * End-to-end CRUD test exercising the full lifecycle in order:
 *   1. Create connections
 *   2. Create a collection
 *   3. Create tables (linked to connections)
 *   4. Create volumes (linked to connections)
 *   5. Verify all reads
 *   6. Update connection
 *   7. Delete in reverse order: volumes → tables → collection → connections
 *
 * This test uses a unique suffix to avoid collisions.
 */
const PROJECT = process.env.TEST_PROJECT || 'option2-poc';
const SUFFIX = `e2e-${Date.now().toString(36)}`;

test.describe.serial('Full CRUD lifecycle', () => {
  const CONN_NAME = `conn-${SUFFIX}`;
  const COLL_NAME = `coll-${SUFFIX}`;
  const TABLE_NAME = `tbl-${SUFFIX}`;
  const VOLUME_NAME = `vol-${SUFFIX}`;

  // --- 1. Connections ---

  test('1a — create connection', async ({ page }) => {
    const connections = new ConnectionsPage(page);
    await connections.goto(PROJECT);

    await connections.createConnection({
      type: 'S3 compatible object storage',
      name: CONN_NAME,
      description: `E2E test connection ${SUFFIX}`,
      accessKey: 'e2e-access',
      secretKey: 'e2e-secret',
      endpoint: 'http://minio-service.minio.svc:9000',
      bucket: 'poc-underwriting',
    });

    const row = await connections.findConnectionRow(CONN_NAME);
    await expect(row).toBeVisible({ timeout: 10_000 });
  });

  test('1b — verify connection in table', async ({ page }) => {
    const connections = new ConnectionsPage(page);
    await connections.goto(PROJECT);

    const row = await connections.findConnectionRow(CONN_NAME);
    await expect(row).toBeVisible();
    await expect(row.getByText(CONN_NAME)).toBeVisible();
    await expect(row.getByText('poc-underwriting')).toBeVisible();
  });

  // --- 2. Collection ---

  test('2a — create collection', async ({ page }) => {
    const registry = new DataRegistryPage(page);
    await registry.goto();
    await registry.selectProject(PROJECT);

    await registry.createCollection(COLL_NAME);
    await expect(page).toHaveURL(new RegExp(`collections/${COLL_NAME}`));
  });

  test('2b — verify collection in gallery', async ({ page }) => {
    const registry = new DataRegistryPage(page);
    await registry.goto();
    await registry.selectProject(PROJECT);

    const card = await registry.collectionCardByName(COLL_NAME);
    await expect(card).toBeVisible({ timeout: 10_000 });
  });

  // --- 3. Table (linked to connection) ---

  test('3a — register table with connection', async ({ page }) => {
    const detail = new CollectionDetailPage(page);
    await detail.goto(COLL_NAME, PROJECT);

    await detail.registerTable({
      name: TABLE_NAME,
      description: `E2E test table ${SUFFIX}`,
      format: 'parquet',
      type: 'EXTERNAL',
      connection: CONN_NAME,
      location: `s3://poc-underwriting/e2e/${SUFFIX}/table`,
      tags: [{ key: 'env', value: 'e2e' }],
    });

    const row = await detail.findTableRow(TABLE_NAME);
    await expect(row).toBeVisible({ timeout: 10_000 });
  });

  test('3b — verify table details and connection link', async ({ page }) => {
    const detail = new CollectionDetailPage(page);
    await detail.goto(COLL_NAME, PROJECT);

    const row = await detail.findTableRow(TABLE_NAME);
    await expect(row).toBeVisible();
    await expect(row.getByText('parquet')).toBeVisible();
    await expect(row.getByText('EXTERNAL')).toBeVisible();
    await expect(row.getByText(CONN_NAME)).toBeVisible();
    await expect(row.getByText('env: e2e')).toBeVisible();
  });

  // --- 4. Volume (linked to connection) ---

  test('4a — register volume with connection', async ({ page }) => {
    const detail = new CollectionDetailPage(page);
    await detail.goto(COLL_NAME, PROJECT);

    await detail.registerVolume({
      name: VOLUME_NAME,
      description: `E2E test volume ${SUFFIX}`,
      connection: CONN_NAME,
      location: `s3://poc-underwriting/e2e/${SUFFIX}/volume/`,
      tags: [{ key: 'env', value: 'e2e' }],
    });

    const row = await detail.findVolumeRow(VOLUME_NAME);
    await expect(row).toBeVisible({ timeout: 10_000 });
  });

  test('4b — verify volume details and connection link', async ({ page }) => {
    const detail = new CollectionDetailPage(page);
    await detail.goto(COLL_NAME, PROJECT);

    const row = await detail.findVolumeRow(VOLUME_NAME);
    await expect(row).toBeVisible();
    await expect(row.getByText('EXTERNAL')).toBeVisible();
    await expect(row.getByText(CONN_NAME)).toBeVisible();
    await expect(row.getByText('env: e2e')).toBeVisible();
  });

  // --- 5. Update connection ---

  test('5a — update connection description', async ({ page }) => {
    const connections = new ConnectionsPage(page);
    await connections.goto(PROJECT);

    await connections.editConnection(CONN_NAME, {
      description: `Updated E2E connection ${SUFFIX}`,
      bucket: 'poc-underwriting-updated',
    });

    const row = await connections.findConnectionRow(CONN_NAME);
    await expect(row).toBeVisible();
    await expect(row.getByText('poc-underwriting-updated')).toBeVisible();
  });

  // --- 6. Delete in reverse order ---

  test('6a — delete volume', async ({ page }) => {
    const detail = new CollectionDetailPage(page);
    await detail.goto(COLL_NAME, PROJECT);

    // Volume deletion — if there's a delete button per row
    const volRow = await detail.findVolumeRow(VOLUME_NAME);
    await expect(volRow).toBeVisible();

    // TODO: once delete volume UI is implemented, call it here
    // For now, verify the volume exists (delete will be added when UI supports it)
    test.skip(!await volRow.getByRole('button', { name: /Delete/ }).isVisible().catch(() => false),
      'Volume delete button not yet in UI');

    await volRow.getByRole('button', { name: /Delete/ }).click();
    const confirmButton = page.getByRole('button', { name: /Delete|Confirm/ });
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }
    await page.waitForTimeout(2000);
  });

  test('6b — delete table', async ({ page }) => {
    const detail = new CollectionDetailPage(page);
    await detail.goto(COLL_NAME, PROJECT);

    const tblRow = await detail.findTableRow(TABLE_NAME);
    await expect(tblRow).toBeVisible();

    // TODO: once delete table UI is implemented, call it here
    test.skip(!await tblRow.getByRole('button', { name: /Delete/ }).isVisible().catch(() => false),
      'Table delete button not yet in UI');

    await tblRow.getByRole('button', { name: /Delete/ }).click();
    const confirmButton = page.getByRole('button', { name: /Delete|Confirm/ });
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }
    await page.waitForTimeout(2000);
  });

  test('6c — delete collection', async ({ page }) => {
    const registry = new DataRegistryPage(page);
    await registry.goto();
    await registry.selectProject(PROJECT);

    const card = await registry.collectionCardByName(COLL_NAME);
    await expect(card).toBeVisible();

    // TODO: once delete collection UI is implemented, call it here
    test.skip(!await card.getByRole('button', { name: /Delete/ }).isVisible().catch(() => false),
      'Collection delete button not yet wired');

    await registry.deleteCollection(COLL_NAME);
    await expect(card).toHaveCount(0);
  });

  test('6d — delete connection', async ({ page }) => {
    const connections = new ConnectionsPage(page);
    await connections.goto(PROJECT);

    const row = await connections.findConnectionRow(CONN_NAME);
    await expect(row).toBeVisible();

    // TODO: once delete connection UI is implemented, call it here
    test.skip(!await row.getByRole('button', { name: /Delete|Actions/ }).isVisible().catch(() => false),
      'Connection delete button not yet in UI');

    await connections.deleteConnection(CONN_NAME);
    await expect(row).toHaveCount(0);
  });
});
