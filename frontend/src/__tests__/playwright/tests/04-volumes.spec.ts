import { test, expect } from '@playwright/test';
import { CollectionDetailPage } from '../pages/collection-detail.page';
import { PROJECT, TEST_VOLUME } from '../fixtures/test-data';

/**
 * CRUD tests for Volumes within a collection.
 *
 * Prerequisites: a collection must already exist.
 * These tests use the existing 'underwriting' collection.
 * Volumes are linked to a connection during creation.
 *
 * Tests run sequentially: Create → Read → Filter → (Update — future) → Delete.
 */
const COLLECTION = 'underwriting';

test.describe('Volumes CRUD', () => {
  let detail: CollectionDetailPage;

  test.beforeEach(async ({ page }) => {
    detail = new CollectionDetailPage(page);
  });

  test('01 — register volume', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    await detail.registerVolume({
      name: TEST_VOLUME.name,
      description: TEST_VOLUME.description,
      location: TEST_VOLUME.location,
      tags: TEST_VOLUME.tags,
    });

    // Verify the volume appears in the volume list
    const row = await detail.findVolumeRow(TEST_VOLUME.name);
    await expect(row).toBeVisible({ timeout: 10_000 });
  });

  test('02 — verify volume details', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    const row = await detail.findVolumeRow(TEST_VOLUME.name);
    await expect(row).toBeVisible();

    // Verify displayed fields
    await expect(row.getByText(TEST_VOLUME.name)).toBeVisible();
    await expect(row.getByText('EXTERNAL')).toBeVisible();
  });

  test('03 — register volume linked to a connection', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    const linkedVolName = `${TEST_VOLUME.name}-linked`;
    await detail.registerVolume({
      name: linkedVolName,
      description: 'Volume with connection ref',
      connection: 'minio', // partial match
      location: `s3://poc-underwriting/test/linked-volume/`,
    });

    const row = await detail.findVolumeRow(linkedVolName);
    await expect(row).toBeVisible({ timeout: 10_000 });
    const connCell = row.locator('td[data-label="Connection"]');
    await expect(connCell).not.toHaveText('—');
  });

  test('04 — filter volumes', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    await detail.filterVolumes(TEST_VOLUME.name);
    const matchingRow = await detail.findVolumeRow(TEST_VOLUME.name);
    await expect(matchingRow).toBeVisible({ timeout: 5000 });

    // Non-matching filter
    await detail.filterVolumes('zzz-no-match-zzz');
    await expect(page.getByText('No volumes match your filter')).toBeVisible({ timeout: 5000 });

    await detail.clearVolumeFilter();
  });

  test('05 — verify tags on volume', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    const row = await detail.findVolumeRow(TEST_VOLUME.name);
    await expect(row).toBeVisible();

    for (const tag of TEST_VOLUME.tags) {
      await expect(row.getByText(`${tag.key}: ${tag.value}`)).toBeVisible();
    }
  });
});
