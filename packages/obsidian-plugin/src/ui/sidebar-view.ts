import { ItemView, WorkspaceLeaf, Notice, setIcon } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaPluginSettings, LentaFeedDto, LentaFolderDto, LentaTaxonomyNodeDto } from '../types';

export const VIEW_TYPE_LENTA_SIDEBAR = 'lemon-lenta-sidebar-view';

export class LentaSidebarView extends ItemView {
  private apiClient: LentaApiClient;
  private getSettings: () => LentaPluginSettings;
  private onOpenQuickAdd: () => void;
  private onOpenSyncModal: () => void;

  private feeds: LentaFeedDto[] = [];
  private folders: LentaFolderDto[] = [];
  private taxonomy: LentaTaxonomyNodeDto[] = [];
  private activeTab: 'folders' | 'feeds' | 'taxonomy' = 'folders';
  private isLoading = false;

  constructor(
    leaf: WorkspaceLeaf,
    apiClient: LentaApiClient,
    getSettings: () => LentaPluginSettings,
    onOpenQuickAdd: () => void,
    onOpenSyncModal: () => void
  ) {
    super(leaf);
    this.apiClient = apiClient;
    this.getSettings = getSettings;
    this.onOpenQuickAdd = onOpenQuickAdd;
    this.onOpenSyncModal = onOpenSyncModal;
  }

  getViewType(): string {
    return VIEW_TYPE_LENTA_SIDEBAR;
  }

  getDisplayText(): string {
    return 'Project Lenta Hub';
  }

  getIcon(): string {
    return 'calendar-range';
  }

  async onOpen() {
    await this.refreshData();
  }

  async refreshData() {
    this.isLoading = true;
    this.render();

    try {
      const [feeds, folders, taxonomy] = await Promise.all([
        this.apiClient.getFeeds().catch(() => []),
        this.apiClient.getFolders().catch(() => []),
        this.apiClient.getTaxonomyTree().catch(() => []),
      ]);

      this.feeds = feeds;
      this.folders = folders;
      this.taxonomy = taxonomy;
    } catch (err: any) {
      new Notice(`Failed to load Lenta hierarchy: ${err.message}`);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  private render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('lenta-sidebar-container');

    // 1. Toolbar Header
    const header = container.createDiv({ cls: 'lenta-sidebar-header' });
    const titleRow = header.createDiv({ cls: 'lenta-sidebar-title' });
    titleRow.createEl('h4', { text: '🍋 Project Lenta' });

    const toolbar = header.createDiv({ cls: 'lenta-sidebar-toolbar' });

    const addBtn = toolbar.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Quick Add Note' } });
    setIcon(addBtn, 'plus');
    addBtn.onclick = () => this.onOpenQuickAdd();

    const syncBtn = toolbar.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Sync Hub' } });
    setIcon(syncBtn, 'zap');
    syncBtn.onclick = () => this.onOpenSyncModal();

    const refreshBtn = toolbar.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Refresh Data' } });
    setIcon(refreshBtn, 'refresh-cw');
    refreshBtn.onclick = () => this.refreshData();

    // 2. Tabs Selector
    const tabsRow = container.createDiv({ cls: 'lenta-sidebar-tabs' });

    const tabFolders = tabsRow.createDiv({
      cls: `lenta-tab ${this.activeTab === 'folders' ? 'active' : ''}`,
      text: 'Folders',
    });
    tabFolders.onclick = () => {
      this.activeTab = 'folders';
      this.render();
    };

    const tabFeeds = tabsRow.createDiv({
      cls: `lenta-tab ${this.activeTab === 'feeds' ? 'active' : ''}`,
      text: 'Feeds',
    });
    tabFeeds.onclick = () => {
      this.activeTab = 'feeds';
      this.render();
    };

    const tabTaxonomy = tabsRow.createDiv({
      cls: `lenta-tab ${this.activeTab === 'taxonomy' ? 'active' : ''}`,
      text: 'Taxonomy',
    });
    tabTaxonomy.onclick = () => {
      this.activeTab = 'taxonomy';
      this.render();
    };

    // 3. Content Area
    const content = container.createDiv({ cls: 'lenta-sidebar-content' });

    if (this.isLoading) {
      content.createDiv({ cls: 'lenta-loading-text', text: 'Loading...' });
      return;
    }

    if (this.activeTab === 'folders') {
      this.renderFolders(content);
    } else if (this.activeTab === 'feeds') {
      this.renderFeeds(content);
    } else {
      this.renderTaxonomy(content);
    }
  }

  private renderFolders(container: HTMLElement) {
    if (this.folders.length === 0) {
      container.createDiv({ cls: 'lenta-empty-state', text: 'No folders found on Lenta server.' });
      return;
    }

    const list = container.createDiv({ cls: 'lenta-tree-list' });
    for (const folder of this.folders) {
      const item = list.createDiv({ cls: 'lenta-tree-item' });
      item.createSpan({ text: folder.icon ? `${folder.icon} ` : '📁 ', cls: 'lenta-item-icon' });
      item.createSpan({ text: folder.path, cls: 'lenta-item-name' });
    }
  }

  private renderFeeds(container: HTMLElement) {
    if (this.feeds.length === 0) {
      container.createDiv({ cls: 'lenta-empty-state', text: 'No feeds configured.' });
      return;
    }

    const list = container.createDiv({ cls: 'lenta-tree-list' });
    for (const feed of this.feeds) {
      const item = list.createDiv({ cls: 'lenta-tree-item feed' });
      item.createSpan({ text: '📰 ', cls: 'lenta-item-icon' });
      item.createSpan({ text: feed.title, cls: 'lenta-item-name' });

      const count = item.createSpan({ cls: 'lenta-count-pill' });
      count.setText(`${feed._count?.notes || 0}`);
    }
  }

  private renderTaxonomy(container: HTMLElement) {
    if (this.taxonomy.length === 0) {
      container.createDiv({ cls: 'lenta-empty-state', text: 'No taxonomy nodes found.' });
      return;
    }

    const list = container.createDiv({ cls: 'lenta-tree-list' });
    for (const node of this.taxonomy) {
      const item = list.createDiv({ cls: 'lenta-tree-item taxonomy' });
      item.createSpan({ text: node.icon ? `${node.icon} ` : '🏷️ ', cls: 'lenta-item-icon' });
      item.createSpan({ text: node.path, cls: 'lenta-item-name' });
    }
  }
}
