import { test as setup, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '..', '..', '..', '..', 'playwright-auth.json');
export { AUTH_FILE };

/**
 * Authenticate against the RHOAI dashboard via OpenShift OAuth.
 * Flow: RHOAI → OAuth authorize → htpasswd login form → redirect back.
 *
 * Credentials come from env vars RHOAI_USER / RHOAI_PASS, falling back to
 * the values provided during test setup.
 */
setup('authenticate with RHOAI', async ({ page }) => {
  const user = process.env.RHOAI_USER || 'htpasswd-cluster-admin-user';
  const pass = process.env.RHOAI_PASS || '';

  if (!pass) {
    throw new Error('RHOAI_PASS env var is required for OAuth login');
  }

  const dashboardURL = process.env.DATA_HUB_URL
    || 'https://rh-ai.apps.bgal-feast-pool-t6grq.aws.rh-ods.com';

  // Navigate to the dashboard — it will redirect to OAuth
  await page.goto(dashboardURL, { waitUntil: 'domcontentloaded' });

  // The OAuth login page might show identity provider selection first
  const htpasswdLink = page.getByRole('link', { name: /htpasswd/i })
    .or(page.getByText(/htpasswd/i));
  if (await htpasswdLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await htpasswdLink.click();
    await page.waitForLoadState('domcontentloaded');
  }

  // Fill the login form
  await page.locator('#inputUsername').fill(user);
  await page.locator('#inputPassword').fill(pass);
  await page.getByRole('button', { name: /Log in/i }).click();

  // Wait for the dashboard to load after redirect
  await page.waitForURL(new RegExp(dashboardURL.replace(/https?:\/\//, '')), { timeout: 30_000 });

  // Approve access if prompted
  const approveButton = page.getByRole('button', { name: /Allow|Approve|Grant/i });
  if (await approveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await approveButton.click();
    await page.waitForLoadState('domcontentloaded');
  }

  // Verify we're on the dashboard
  await expect(page).toHaveURL(new RegExp(dashboardURL.replace(/https?:\/\//, '')), { timeout: 15_000 });

  // Save the authenticated session
  await page.context().storageState({ path: AUTH_FILE });
});
