import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page object for the Collection Detail page.
 * Handles tables and volumes CRUD within a collection.
 */
export class CollectionDetailPage {
  readonly page: Page;
  readonly breadcrumb: Locator;
  readonly registerTableButton: Locator;
  readonly registerVolumeButton: Locator;
  readonly tablesSection: Locator;
  readonly volumesSection: Locator;
  readonly tableSearchInput: Locator;
  readonly volumeSearchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.breadcrumb = page.locator('nav[aria-label="breadcrumb"]');
    this.registerTableButton = page.getByRole('button', { name: 'Register table' });
    this.registerVolumeButton = page.getByRole('button', { name: 'Register volume' });
    this.tablesSection = page.locator('section').filter({ has: page.getByText('Tables', { exact: true }) }).first();
    this.volumesSection = page.locator('section').filter({ has: page.getByText('Volumes', { exact: true }) }).first();
    this.tableSearchInput = page.getByPlaceholder('Filter tables');
    this.volumeSearchInput = page.getByPlaceholder('Filter volumes');
  }

  async goto(collectionName: string, project: string) {
    await this.page.goto(`/ai-hub/data/collections/${collectionName}?project=${project}`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.getByText(collectionName).first().waitFor({ timeout: 15_000 }).catch(() => {});
  }

  // --- Tables ---

  async getTableRows(): Promise<Locator> {
    return this.page.locator('table[aria-label="Tables"] tbody tr');
  }

  async findTableRow(name: string): Promise<Locator> {
    return this.page.locator('table[aria-label="Tables"] tbody tr').filter({
      has: this.page.locator('td[data-label="Name"]', { hasText: name }),
    }).first();
  }

  async registerTable(opts: {
    name: string;
    description?: string;
    format?: string;
    type?: string;
    connection?: string;
    location?: string;
    tags?: Array<{ key: string; value: string }>;
  }) {
    await this.registerTableButton.click();
    const modal = this.page.getByRole('dialog');
    await expect(modal).toBeVisible();

    await modal.locator('#table-name').fill(opts.name);

    if (opts.description) {
      await modal.locator('#table-description').fill(opts.description);
    }
    if (opts.format) {
      await modal.locator('#table-format').selectOption(opts.format);
    }
    if (opts.type) {
      await modal.locator('#table-type').selectOption(opts.type);
    }
    if (opts.connection) {
      await this.page.waitForTimeout(1000);
      const options = modal.locator('#table-connection option');
      const count = await options.count();
      for (let i = 0; i < count; i++) {
        const text = await options.nth(i).textContent();
        if (text && text.toLowerCase().includes(opts.connection.toLowerCase())) {
          await modal.locator('#table-connection').selectOption({ label: text });
          break;
        }
      }
    }
    if (opts.location) {
      await modal.locator('#table-location').fill(opts.location);
    }
    if (opts.tags) {
      for (const tag of opts.tags) {
        await modal.locator('#tag-key').fill(tag.key);
        await modal.locator('#tag-value').fill(tag.value);
        await modal.getByRole('button', { name: 'Add' }).click();
      }
    }

    await modal.getByRole('button', { name: 'Register' }).click();
    await this.page.waitForTimeout(2000);
  }

  async filterTables(text: string) {
    await this.tableSearchInput.fill(text);
  }

  async clearTableFilter() {
    await this.tableSearchInput.clear();
  }

  // --- Volumes ---

  async getVolumeRows(): Promise<Locator> {
    return this.page.locator('table[aria-label="Volumes"] tbody tr');
  }

  async findVolumeRow(name: string): Promise<Locator> {
    return this.page.locator('table[aria-label="Volumes"] tbody tr').filter({
      has: this.page.locator('td[data-label="Name"]', { hasText: name }),
    }).first();
  }

  async registerVolume(opts: {
    name: string;
    description?: string;
    connection?: string;
    location: string;
    tags?: Array<{ key: string; value: string }>;
  }) {
    await this.registerVolumeButton.click();
    const modal = this.page.getByRole('dialog');
    await expect(modal).toBeVisible();

    await modal.locator('#volume-name').fill(opts.name);

    if (opts.description) {
      await modal.locator('#volume-description').fill(opts.description);
    }
    if (opts.connection) {
      await this.page.waitForTimeout(1000);
      const options = modal.locator('#volume-connection option');
      const count = await options.count();
      for (let i = 0; i < count; i++) {
        const text = await options.nth(i).textContent();
        if (text && text.toLowerCase().includes(opts.connection.toLowerCase())) {
          await modal.locator('#volume-connection').selectOption({ label: text });
          break;
        }
      }
    }
    await modal.locator('#volume-location').fill(opts.location);

    if (opts.tags) {
      for (const tag of opts.tags) {
        await modal.locator('#vol-tag-key').fill(tag.key);
        await modal.locator('#vol-tag-value').fill(tag.value);
        await modal.getByRole('button', { name: 'Add' }).click();
      }
    }

    await modal.getByRole('button', { name: 'Register' }).click();
    await this.page.waitForTimeout(2000);
  }

  async filterVolumes(text: string) {
    await this.volumeSearchInput.fill(text);
  }

  async clearVolumeFilter() {
    await this.volumeSearchInput.clear();
  }

  // --- Edit Table ---

  async editTable(tableName: string, opts: {
    description?: string;
    addTags?: Array<{ key: string; value: string }>;
    removeTags?: string[];
  }) {
    const row = await this.findTableRow(tableName);
    await row.getByRole('button', { name: 'Edit' }).click();
    const modal = this.page.getByRole('dialog');
    await expect(modal).toBeVisible();

    if (opts.description !== undefined) {
      await modal.locator('#edit-table-description').fill(opts.description);
    }

    if (opts.removeTags) {
      for (const key of opts.removeTags) {
        const tagRow = modal.locator('div').filter({ hasText: `${key}:` }).first();
        if (await tagRow.isVisible()) {
          await tagRow.getByText('×').click();
        }
      }
    }

    if (opts.addTags) {
      for (const tag of opts.addTags) {
        await modal.locator('#edit-tag-key').fill(tag.key);
        await modal.locator('#edit-tag-value').fill(tag.value);
        await modal.getByRole('button', { name: 'Add' }).click();
      }
    }

    await modal.getByRole('button', { name: 'Save' }).click();
    await this.page.waitForTimeout(2000);
  }

  // --- Edit Volume ---

  async editVolume(volumeName: string, opts: {
    description?: string;
    storageLocation?: string;
    addTags?: Array<{ key: string; value: string }>;
    removeTags?: string[];
  }) {
    const row = await this.findVolumeRow(volumeName);
    await row.getByRole('button', { name: 'Edit' }).click();
    const modal = this.page.getByRole('dialog');
    await expect(modal).toBeVisible();

    if (opts.description !== undefined) {
      await modal.locator('#edit-volume-description').fill(opts.description);
    }
    if (opts.storageLocation !== undefined) {
      await modal.locator('#edit-volume-location').fill(opts.storageLocation);
    }

    if (opts.removeTags) {
      for (const key of opts.removeTags) {
        const tagRow = modal.locator('div').filter({ hasText: `${key}:` }).first();
        if (await tagRow.isVisible()) {
          await tagRow.getByText('×').click();
        }
      }
    }

    if (opts.addTags) {
      for (const tag of opts.addTags) {
        await modal.locator('#edit-vol-tag-key').fill(tag.key);
        await modal.locator('#edit-vol-tag-value').fill(tag.value);
        await modal.getByRole('button', { name: 'Add' }).click();
      }
    }

    await modal.getByRole('button', { name: 'Save' }).click();
    await this.page.waitForTimeout(2000);
  }
}
