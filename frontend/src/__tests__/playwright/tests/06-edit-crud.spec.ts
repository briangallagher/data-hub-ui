import { test, expect } from '@playwright/test';
import { CollectionDetailPage } from '../pages/collection-detail.page';
import { PROJECT, TEST_TABLE, TEST_VOLUME } from '../fixtures/test-data';

/**
 * Edit/update tests for tables, volumes, and collections.
 *
 * Prerequisites: tables and volumes from 03-tables.spec.ts and 04-volumes.spec.ts
 * must already exist (run those first).
 */
const COLLECTION = 'underwriting';

test.describe('Edit Tables', () => {
  let detail: CollectionDetailPage;

  test.beforeEach(async ({ page }) => {
    detail = new CollectionDetailPage(page);
  });

  test('01 — edit table description', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    const row = await detail.findTableRow(TEST_TABLE.name);
    if (!(await row.isVisible())) {
      test.skip();
      return;
    }

    await detail.editTable(TEST_TABLE.name, {
      description: 'Updated by Playwright edit test',
    });

    // Verify updated description appears
    await page.reload();
    await page.waitForTimeout(2000);
    const updatedRow = await detail.findTableRow(TEST_TABLE.name);
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow.getByText('Updated by Playwright edit test')).toBeVisible();
  });

  test('02 — add tag to table', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    const row = await detail.findTableRow(TEST_TABLE.name);
    if (!(await row.isVisible())) {
      test.skip();
      return;
    }

    await detail.editTable(TEST_TABLE.name, {
      addTags: [{ key: 'edited-by', value: 'playwright' }],
    });

    await page.reload();
    await page.waitForTimeout(2000);
    const updatedRow = await detail.findTableRow(TEST_TABLE.name);
    await expect(updatedRow.getByText('edited-by: playwright')).toBeVisible();
  });

  test('03 — remove tag from table', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    const row = await detail.findTableRow(TEST_TABLE.name);
    if (!(await row.isVisible())) {
      test.skip();
      return;
    }

    await detail.editTable(TEST_TABLE.name, {
      removeTags: ['edited-by'],
    });

    await page.reload();
    await page.waitForTimeout(2000);
    const updatedRow = await detail.findTableRow(TEST_TABLE.name);
    const tagText = await updatedRow.locator('td[data-label="Tags"]').textContent();
    expect(tagText).not.toContain('edited-by');
  });
});

test.describe('Edit Volumes', () => {
  let detail: CollectionDetailPage;

  test.beforeEach(async ({ page }) => {
    detail = new CollectionDetailPage(page);
  });

  test('01 — edit volume description', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    const row = await detail.findVolumeRow(TEST_VOLUME.name);
    if (!(await row.isVisible())) {
      test.skip();
      return;
    }

    await detail.editVolume(TEST_VOLUME.name, {
      description: 'Volume updated by Playwright',
    });

    await page.reload();
    await page.waitForTimeout(2000);
    const updatedRow = await detail.findVolumeRow(TEST_VOLUME.name);
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow.getByText('Volume updated by Playwright')).toBeVisible();
  });

  test('02 — edit volume storage location', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    const row = await detail.findVolumeRow(TEST_VOLUME.name);
    if (!(await row.isVisible())) {
      test.skip();
      return;
    }

    const newLocation = 's3://poc-underwriting/test/updated-volume-path/';
    await detail.editVolume(TEST_VOLUME.name, {
      storageLocation: newLocation,
    });

    await page.reload();
    await page.waitForTimeout(2000);
    const updatedRow = await detail.findVolumeRow(TEST_VOLUME.name);
    await expect(updatedRow.locator('td[data-label="Storage location"]')).toContainText('updated-volume-path');
  });

  test('03 — add tag to volume', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);

    const row = await detail.findVolumeRow(TEST_VOLUME.name);
    if (!(await row.isVisible())) {
      test.skip();
      return;
    }

    await detail.editVolume(TEST_VOLUME.name, {
      addTags: [{ key: 'volume-edit-test', value: 'true' }],
    });

    await page.reload();
    await page.waitForTimeout(2000);
    const updatedRow = await detail.findVolumeRow(TEST_VOLUME.name);
    await expect(updatedRow.getByText('volume-edit-test: true')).toBeVisible();
  });
});

test.describe('Edit Collections', () => {
  test('01 — edit collection via pencil icon', async ({ page }) => {
    await page.goto(`/ai-hub/data/collections?project=${PROJECT}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Find the underwriting collection card and click its edit button
    const card = page.locator('[data-testid="collection-card"]').filter({
      hasText: COLLECTION,
    }).first();

    if (!(await card.isVisible())) {
      // Try without data-testid — look for a Card containing the collection name
      const anyCard = page.locator('article, [class*="card"]').filter({
        hasText: COLLECTION,
      }).first();
      if (!(await anyCard.isVisible())) {
        test.skip();
        return;
      }
      await anyCard.getByRole('button', { name: 'Edit' }).click();
    } else {
      await card.getByRole('button', { name: 'Edit' }).click();
    }

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.getByText(`Edit collection: ${COLLECTION}`)).toBeVisible();

    // Update description
    await modal.locator('#edit-collection-description').fill('Updated by Playwright');
    await modal.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(2000);

    // Modal should close
    await expect(modal).not.toBeVisible();
  });
});
