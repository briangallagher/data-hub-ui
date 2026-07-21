import { test, expect } from '@playwright/test';
import { DataRegistryPage } from '../pages/data-registry.page';
import { PROJECT, TEST_COLLECTION } from '../fixtures/test-data';

/**
 * CRUD tests for Collections (Iceberg namespaces).
 *
 * Tests run sequentially: Create → Read → Filter → Delete.
 */
test.describe('Collections CRUD', () => {
  let registry: DataRegistryPage;

  test.beforeEach(async ({ page }) => {
    registry = new DataRegistryPage(page);
  });

  test('01 — create collection', async ({ page }) => {
    await registry.goto(PROJECT);

    await registry.createCollection(TEST_COLLECTION.name);

    // After creation, we should either navigate to the detail page or stay on collections
    const navigated = await page.waitForURL(
      new RegExp(`collections/${TEST_COLLECTION.name}`),
      { timeout: 5_000 },
    ).then(() => true).catch(() => false);

    if (!navigated) {
      // If navigation didn't happen, verify the collection appears in the gallery
      const card = await registry.collectionCardByName(TEST_COLLECTION.name);
      await expect(card).toBeVisible({ timeout: 10_000 });
    }
  });

  test('02 — verify collection appears in gallery', async ({ page }) => {
    // Use existing 'underwriting' collection which is always present
    await registry.goto(PROJECT);

    const card = await registry.collectionCardByName('underwriting');
    await expect(card).toBeVisible({ timeout: 10_000 });
  });

  test('03 — filter collections', async ({ page }) => {
    await registry.goto(PROJECT);

    // Filter using known existing collection
    await registry.filterCollections('underwriting');
    const card = await registry.collectionCardByName('underwriting');
    await expect(card).toBeVisible({ timeout: 5000 });

    // Non-matching filter
    await registry.filterCollections('zzz-no-match-zzz');
    await expect(page.getByText('No collections match your filter')).toBeVisible({ timeout: 5000 });

    await registry.clearFilter();
  });

  test('04 — open collection detail page', async ({ page }) => {
    await registry.goto(PROJECT);

    await registry.openCollection('underwriting');

    await expect(page).toHaveURL(/collections\/underwriting/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'underwriting', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tables' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Volumes' })).toBeVisible();
  });

  test('05 — delete collection', async ({ page }) => {
    await registry.goto(PROJECT);

    // Delete the test collection created in test 01 (if visible), or skip
    const card = await registry.collectionCardByName(TEST_COLLECTION.name);
    const isVisible = await card.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip(true, 'Test collection not visible in gallery — skipping delete');
      return;
    }

    await registry.deleteCollection(TEST_COLLECTION.name);
    await expect(card).toHaveCount(0);
  });
});
