import { type Page, type Locator, expect } from '@playwright/test';

export class DataRegistryPage {
  readonly page: Page;
  readonly collectionsTab: Locator;
  readonly connectionsTab: Locator;
  readonly searchInput: Locator;
  readonly createCollectionButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.collectionsTab = page.getByRole('tab', { name: 'Collections' });
    this.connectionsTab = page.getByRole('tab', { name: 'Connections' });
    this.searchInput = page.getByPlaceholder(/Search collections|Filter by name/);
    this.createCollectionButton = page.getByRole('button', { name: 'Create collection' });
  }

  async goto(project?: string) {
    const params = project ? `?project=${project}` : '';
    await this.page.goto(`/ai-hub/data/collections${params}`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.getByRole('heading', { name: 'Data Registry' }).waitFor({ timeout: 15_000 });
    // Wait for collections to load
    const cardsOrEmpty = this.page.locator('div.pf-v6-c-card')
      .or(this.page.getByText('No collections found'));
    await cardsOrEmpty.first().waitFor({ timeout: 15_000 }).catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  async selectProject(name: string) {
    const currentToggle = this.page.locator('button[class*="menu-toggle"], button[class*="pf-v6-c-menu-toggle"]').first();
    const toggleText = await currentToggle.textContent();
    if (toggleText?.includes(name)) return;

    await currentToggle.click();
    await this.page.getByRole('option', { name, exact: true }).click();
    await this.page.waitForTimeout(2000);
  }

  async switchToCollections() {
    await this.collectionsTab.click();
    await this.page.waitForTimeout(1000);
  }

  async switchToConnections() {
    await this.connectionsTab.click();
    await this.page.waitForTimeout(1000);
  }

  async collectionCardByName(name: string): Promise<Locator> {
    return this.page.locator('div.pf-v6-c-card').filter({ hasText: name }).first();
  }

  async openCollection(name: string) {
    const card = await this.collectionCardByName(name);
    await card.click();
    await this.page.waitForTimeout(2000);
  }

  async createCollection(name: string) {
    await this.createCollectionButton.click();
    const modal = this.page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await modal.getByLabel('Name').fill(name);
    await modal.getByRole('button', { name: 'Create' }).click();
    await this.page.waitForTimeout(3000);
  }

  async deleteCollection(name: string) {
    const card = await this.collectionCardByName(name);
    await card.getByRole('button', { name: 'Delete' }).click();
    const confirmButton = this.page.getByRole('dialog').getByRole('button', { name: 'Delete' });
    await expect(confirmButton).toBeVisible({ timeout: 3000 });
    await confirmButton.click();
    await this.page.waitForTimeout(2000);
  }

  async filterCollections(text: string) {
    await this.searchInput.waitFor({ timeout: 10_000 });
    await this.searchInput.fill(text);
  }

  async clearFilter() {
    await this.searchInput.clear();
  }
}
