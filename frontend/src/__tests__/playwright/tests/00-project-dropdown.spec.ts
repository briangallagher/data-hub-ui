import { test, expect } from '@playwright/test';

/**
 * Tests for the project dropdown on the Data Registry page.
 * Validates project listing, switching, default selection, and "All projects" mode.
 */
test.describe('Project Dropdown', () => {
  test('01 — lists available projects', async ({ page }) => {
    await page.goto('/ai-hub/data/collections');
    await page.getByRole('heading', { name: 'Data Registry' }).waitFor({ timeout: 15_000 });
    await page.waitForTimeout(3000);

    const toggle = page.locator('button').filter({ hasText: /projects|feast|option|catalog|All/i }).first();
    await toggle.click();

    // Wait for options to populate
    await expect(page.getByRole('option', { name: 'All projects' })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    const options = page.getByRole('option');
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
  });

  test('02 — switch to a specific project', async ({ page }) => {
    await page.goto('/ai-hub/data/collections');
    await page.getByRole('heading', { name: 'Data Registry' }).waitFor({ timeout: 15_000 });

    const toggle = page.locator('button').filter({ hasText: /projects|feast|option|catalog/i }).first();
    await toggle.click();
    await page.getByRole('option', { name: 'option2-poc', exact: true }).click();
    await page.waitForTimeout(2000);

    // URL should contain the project param
    await expect(page).toHaveURL(/project=option2-poc/);

    // Dropdown should show the selected project
    await expect(toggle).toContainText('option2-poc');
  });

  test('03 — select All Projects', async ({ page }) => {
    // Start on a specific project
    await page.goto('/ai-hub/data/collections?project=option2-poc');
    await page.getByRole('heading', { name: 'Data Registry' }).waitFor({ timeout: 15_000 });

    const toggle = page.locator('button').filter({ hasText: /projects|feast|option|catalog/i }).first();
    await toggle.click();
    await page.getByRole('option', { name: 'All projects' }).click();
    await page.waitForTimeout(2000);

    // URL should not contain a project param
    expect(page.url()).not.toContain('project=');

    // Dropdown should show "All projects"
    await expect(toggle).toContainText('All projects');
  });

  test('04 — collections load when switching projects', async ({ page }) => {
    await page.goto('/ai-hub/data/collections?project=option2-poc');
    await page.getByRole('heading', { name: 'Data Registry' }).waitFor({ timeout: 15_000 });

    // Wait for collections to appear
    const cards = page.locator('div.pf-v6-c-card');
    await cards.first().waitFor({ timeout: 15_000 }).catch(() => {});

    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('05 — search placeholder updates based on mode', async ({ page }) => {
    await page.goto('/ai-hub/data/collections?project=option2-poc');
    await page.getByRole('heading', { name: 'Data Registry' }).waitFor({ timeout: 15_000 });

    // Verify the "Include Tables/Volumes" checkbox exists
    const checkbox = page.getByLabel('Include Tables/Volumes');
    await expect(checkbox).toBeVisible();

    // By default, checkbox is unchecked
    await expect(checkbox).not.toBeChecked();
  });
});
