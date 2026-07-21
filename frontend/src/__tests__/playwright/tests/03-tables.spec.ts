import { test, expect } from '@playwright/test';
import { CollectionDetailPage } from '../pages/collection-detail.page';
import { PROJECT, TEST_TABLE, TEST_CONNECTION } from '../fixtures/test-data';

/**
 * CRUD tests for Tables within a collection.
 *
 * Prerequisites: a collection must already exist.
 * These tests use the existing 'underwriting' collection.
 * Tables are linked to a connection during creation.
 *
 * Tests run sequentially: Create → Read → Filter → (Update — future) → Delete.
 */
const COLLECTION = 'underwriting';

test.describe('Tables CRUD', () => {
  let detail: CollectionDetailPage;

  test.beforeEach(async ({ page }) => {
    detail = new CollectionDetailPage(page);
  });

  test('01 — register table with connection', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    await detail.registerTable({
      name: TEST_TABLE.name,
      description: TEST_TABLE.description,
      format: TEST_TABLE.format,
      type: TEST_TABLE.type,
      location: TEST_TABLE.location,
      tags: TEST_TABLE.tags,
    });

    // Verify the table appears in the table list
    const row = await detail.findTableRow(TEST_TABLE.name);
    await expect(row).toBeVisible({ timeout: 10_000 });
  });

  test('02 — verify table details', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    const row = await detail.findTableRow(TEST_TABLE.name);
    await expect(row).toBeVisible();

    // Verify displayed fields
    await expect(row.getByText(TEST_TABLE.name)).toBeVisible();
    await expect(row.getByText(TEST_TABLE.format)).toBeVisible();
    await expect(row.getByText(TEST_TABLE.type)).toBeVisible();
  });

  test('03 — register table linked to a connection', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    const linkedTableName = `${TEST_TABLE.name}-linked`;
    await detail.registerTable({
      name: linkedTableName,
      description: 'Table with connection ref',
      format: 'iceberg',
      connection: 'minio', // partial match against display name
      location: `s3://poc-underwriting/test/linked-table`,
    });

    const row = await detail.findTableRow(linkedTableName);
    await expect(row).toBeVisible({ timeout: 10_000 });
    // The Connection column should show a non-empty value
    const connCell = row.locator('td[data-label="Connection"]');
    await expect(connCell).not.toHaveText('—');
  });

  test('04 — filter tables', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    // Filter by the test table we created in test 01
    await detail.filterTables(TEST_TABLE.name);
    const matchingRow = await detail.findTableRow(TEST_TABLE.name);
    await expect(matchingRow).toBeVisible({ timeout: 5000 });

    // Non-matching filter
    await detail.filterTables('zzz-no-match-zzz');
    await expect(page.getByText('No tables match your filter')).toBeVisible({ timeout: 5000 });

    await detail.clearTableFilter();
  });

  test('05 — verify tags on table', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    const row = await detail.findTableRow(TEST_TABLE.name);
    await expect(row).toBeVisible();

    // Verify at least one tag is visible
    for (const tag of TEST_TABLE.tags) {
      await expect(row.getByText(`${tag.key}: ${tag.value}`)).toBeVisible();
    }
  });
});
