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

async function reloadAndWaitForData(page: import('@playwright/test').Page, project: string, collection: string) {
  await page.reload();
  await page.waitForResponse(
    (resp) => resp.url().includes(`/v1/${project}/namespaces/${collection}/`) && resp.status() === 200,
    { timeout: 15_000 },
  ).catch(() => {});
  await page.waitForTimeout(1000);
}

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

    await reloadAndWaitForData(page, PROJECT, COLLECTION);
    const updatedRow = await detail.findTableRow(TEST_TABLE.name);
    await expect(updatedRow).toBeVisible({ timeout: 10_000 });
    await expect(updatedRow.locator('td[data-label="Description"]')).toContainText('Updated by Playwright edit test', { timeout: 10_000 });
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

    await reloadAndWaitForData(page, PROJECT, COLLECTION);
    const updatedRow = await detail.findTableRow(TEST_TABLE.name);
    await expect(updatedRow.getByText('edited-by: playwright')).toBeVisible({ timeout: 10_000 });
  });

  test('03 — remove tag from table', async ({ page }) => {
    await detail.goto(COLLECTION, PROJECT);
    await page.waitForResponse(
      (resp) => resp.url().includes(`/v1/${PROJECT}/namespaces/${COLLECTION}/`) && resp.status() === 200,
      { timeout: 15_000 },
    ).catch(() => {});
    await page.waitForTimeout(1000);

    const row = await detail.findTableRow(TEST_TABLE.name);
    if (!(await row.isVisible())) {
      test.skip();
      return;
    }

    // Verify the tag from test 02 exists before trying to remove it
    const tagsBefore = await row.locator('td[data-label="Tags"]').textContent();
    if (!tagsBefore?.includes('edited-by')) {
      test.skip();
      return;
    }

    await detail.editTable(TEST_TABLE.name, {
      removeTags: ['edited-by'],
    });

    await reloadAndWaitForData(page, PROJECT, COLLECTION);
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

    await reloadAndWaitForData(page, PROJECT, COLLECTION);
    const updatedRow = await detail.findVolumeRow(TEST_VOLUME.name);
    await expect(updatedRow).toBeVisible({ timeout: 10_000 });
    await expect(updatedRow.locator('td[data-label="Description"]')).toContainText('Volume updated by Playwright', { timeout: 10_000 });
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

    await reloadAndWaitForData(page, PROJECT, COLLECTION);
    const updatedRow = await detail.findVolumeRow(TEST_VOLUME.name);
    await expect(updatedRow.locator('td[data-label="Storage location"]')).toContainText('updated-volume-path', { timeout: 10_000 });
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

    await reloadAndWaitForData(page, PROJECT, COLLECTION);
    const updatedRow = await detail.findVolumeRow(TEST_VOLUME.name);
    await expect(updatedRow.getByText('volume-edit-test: true')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Edit Collections', () => {
  test('01 — edit collection via pencil icon', async ({ page }) => {
    await page.goto(`/ai-hub/data/collections?project=${PROJECT}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const card = page.locator('[data-testid="collection-card"]').filter({
      hasText: COLLECTION,
    }).first();

    if (!(await card.isVisible())) {
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

    await modal.locator('#edit-collection-description').fill('Updated by Playwright');
    await modal.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(2000);

    await expect(modal).not.toBeVisible();
  });
});
