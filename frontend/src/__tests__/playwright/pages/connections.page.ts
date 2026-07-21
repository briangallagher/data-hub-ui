import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page object for the Connections tab within the Data Registry.
 * Handles CRUD operations on Data Connections.
 *
 * The Create Connection modal replicates the RHOAI dashboard flow:
 *   Step 1 — Select connection type (dropdown)
 *   Step 2 — Fill connection details (name, description, access key, secret key, endpoint, bucket, region)
 */
export class ConnectionsPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly createConnectionButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder('Filter connections');
    this.createConnectionButton = page.locator('text=Create connection').first();
  }

  async goto(project: string) {
    await this.page.goto(`/ai-hub/data/collections?tab=connections&project=${project}`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.getByRole('heading', { name: 'Data connections', exact: true }).waitFor({ timeout: 15_000 });
    await this.page.waitForTimeout(2000);
  }

  async getConnectionRows(): Promise<Locator> {
    return this.page.locator('table[aria-label="Connections table"] tbody tr');
  }

  async findConnectionRow(name: string): Promise<Locator> {
    return this.page.locator('table[aria-label="Connections table"] tbody tr').filter({ hasText: name });
  }

  /**
   * Create a new connection using the two-step modal flow:
   * 1. Select connection type
   * 2. Fill in connection details
   */
  async createConnection(opts: {
    type: string;
    name: string;
    description?: string;
    accessKey: string;
    secretKey: string;
    endpoint?: string;
    bucket?: string;
    region?: string;
  }) {
    await this.createConnectionButton.click();
    const modal = this.page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Step 1: Select connection type via native <select> then advance
    const typeSelect = modal.locator('select').first();
    await typeSelect.selectOption('s3');
    await modal.getByRole('button', { name: 'Create' }).click();

    // After type selection, the details form should appear
    await expect(modal.locator('#connection-name')).toBeVisible({ timeout: 5000 });

    // Step 2: Fill connection details
    await modal.locator('#connection-name').fill(opts.name);

    if (opts.description) {
      await modal.locator('#connection-description').fill(opts.description);
    }

    await modal.locator('#connection-access-key').fill(opts.accessKey);
    await modal.locator('#connection-secret-key').fill(opts.secretKey);

    if (opts.endpoint) {
      await modal.locator('#connection-endpoint').fill(opts.endpoint);
    }
    if (opts.bucket) {
      await modal.locator('#connection-bucket').fill(opts.bucket);
    }
    if (opts.region) {
      await modal.locator('#connection-region').fill(opts.region);
    }

    await modal.getByRole('button', { name: 'Create' }).click();

    // Wait for modal to close (success) or show error
    await this.page.waitForTimeout(3000);
    const errorAlert = modal.locator('[class*="pf-v6-c-alert"][class*="pf-m-danger"]');
    if (await errorAlert.isVisible().catch(() => false)) {
      const errorText = await errorAlert.textContent();
      throw new Error(`Create connection failed: ${errorText}`);
    }
  }

  async editConnection(name: string, updates: {
    description?: string;
    accessKey?: string;
    secretKey?: string;
    endpoint?: string;
    bucket?: string;
    region?: string;
  }) {
    const row = await this.findConnectionRow(name);
    await row.getByRole('button', { name: /Edit|Actions/ }).click();

    // Handle kebab menu if edit is in a dropdown
    const editOption = this.page.getByRole('menuitem', { name: /Edit/i });
    if (await editOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await editOption.click();
    }

    const modal = this.page.getByRole('dialog');
    await expect(modal).toBeVisible();

    if (updates.description !== undefined) {
      await modal.locator('#connection-description').clear();
      await modal.locator('#connection-description').fill(updates.description);
    }
    if (updates.accessKey) {
      await modal.locator('#connection-access-key').clear();
      await modal.locator('#connection-access-key').fill(updates.accessKey);
    }
    if (updates.secretKey) {
      await modal.locator('#connection-secret-key').clear();
      await modal.locator('#connection-secret-key').fill(updates.secretKey);
    }
    if (updates.endpoint) {
      await modal.locator('#connection-endpoint').clear();
      await modal.locator('#connection-endpoint').fill(updates.endpoint);
    }
    if (updates.bucket) {
      await modal.locator('#connection-bucket').clear();
      await modal.locator('#connection-bucket').fill(updates.bucket);
    }
    if (updates.region) {
      await modal.locator('#connection-region').clear();
      await modal.locator('#connection-region').fill(updates.region);
    }

    await modal.getByRole('button', { name: /Save|Update/ }).click();
    await this.page.waitForTimeout(2000);
  }

  async deleteConnection(name: string) {
    const row = await this.findConnectionRow(name);
    await row.getByRole('button', { name: /Delete|Actions/ }).click();

    // Handle kebab menu if delete is in a dropdown
    const deleteOption = this.page.getByRole('menuitem', { name: /Delete/i });
    if (await deleteOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await deleteOption.click();
    }

    // Confirm deletion
    const confirmButton = this.page.getByRole('button', { name: /Delete|Confirm/ });
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }
    await this.page.waitForTimeout(2000);
  }

  async filterConnections(text: string) {
    await this.searchInput.fill(text);
  }

  async clearFilter() {
    await this.searchInput.clear();
  }
}
