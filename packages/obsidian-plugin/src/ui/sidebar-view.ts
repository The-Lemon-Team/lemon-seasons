import { ItemView, WorkspaceLeaf, Notice, setIcon, MarkdownRenderer, Component } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaPluginSettings, LentaFeedDto, LentaFolderDto, LentaTaxonomyNodeDto, LentaNoteDto } from '../types';

export const VIEW_TYPE_LENTA_SIDEBAR = 'lemon-lenta-sidebar-view';

export class LentaSidebarView extends ItemView {
  private apiClient: LentaApiClient;
  private getSettings: () => LentaPluginSettings;
  private onOpenQuickAdd: () => void;
  private onOpenSyncModal: () => void;
  private onOpenConnectionsModal?: () => void;
  private onOpenContainersFoldersModal?: () => void;

  private feeds: LentaFeedDto[] = [];
  private folders: LentaFolderDto[] = [];
  private taxonomy: LentaTaxonomyNodeDto[] = [];
  private activeTab: 'folders' | 'feeds' | 'taxonomy' = 'folders';
  private isLoading = false;

  // Track which items have expanded markdown previews
  private expandedPreviews: Set<string> = new Set();

  // Recent notes per feed (loaded lazily)
  private feedPreviewNotes: Map<string, LentaNoteDto> = new Map();
  private loadingPreviewFor: Set<string> = new Set();

  // MarkdownRenderer component ref
  private mdComponent: Component;

  constructor(
    leaf: WorkspaceLeaf,
    apiClient: LentaApiClient,
    getSettings: () => LentaPluginSettings,
    onOpenQuickAdd: () => void,
    onOpenSyncModal: () => void,
    onOpenConnectionsModal?: () => void,
    onOpenContainersFoldersModal?: () => void
  ) {
    super(leaf);
    this.apiClient = apiClient;
    this.getSettings = getSettings;
    this.onOpenQuickAdd = onOpenQuickAdd;
    this.onOpenSyncModal = onOpenSyncModal;
    this.onOpenConnectionsModal = onOpenConnectionsModal;
    this.onOpenContainersFoldersModal = onOpenContainersFoldersModal;
    this.mdComponent = new Component();
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
    this.mdComponent.load();
    await this.refreshData();
  }

  async onClose() {
    this.mdComponent.unload();
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

    // ── Toolbar Header ─────────────────────────────────────────────────────
    const header = container.createDiv({ cls: 'lenta-sidebar-header' });
    const titleRow = header.createDiv({ cls: 'lenta-sidebar-title' });
    titleRow.createEl('h4', { text: '🍋 Project Lenta' });
    const settings = this.getSettings();
    if (settings.containerKey) {
      const badge = titleRow.createSpan({ cls: 'lenta-badge' });
      badge.setText(`KEY: ${settings.containerKey.slice(0, 10)}…`);
      badge.title = `Connected container key: ${settings.containerKey}`;
    }

    const toolbar = header.createDiv({ cls: 'lenta-sidebar-toolbar' });

    const addBtn = toolbar.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Quick Add Note' } });
    setIcon(addBtn, 'plus');
    addBtn.onclick = () => this.onOpenQuickAdd();

    const syncBtn = toolbar.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Sync Hub' } });
    setIcon(syncBtn, 'zap');
    syncBtn.onclick = () => this.onOpenSyncModal();

    if (this.onOpenContainersFoldersModal) {
      const containerBtn = toolbar.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Containers & Folders Workspace' } });
      setIcon(containerBtn, 'box');
      containerBtn.onclick = () => this.onOpenContainersFoldersModal!();
    }

    if (this.onOpenConnectionsModal) {
      const connBtn = toolbar.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Connections & Auth' } });
      setIcon(connBtn, 'link-2');
      connBtn.onclick = () => this.onOpenConnectionsModal!();
    }

    const refreshBtn = toolbar.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Refresh Data' } });
    setIcon(refreshBtn, 'refresh-cw');
    refreshBtn.onclick = () => this.refreshData();

    // ── Tabs ───────────────────────────────────────────────────────────────
    const tabsRow = container.createDiv({ cls: 'lenta-sidebar-tabs' });

    const tabFolders = tabsRow.createDiv({
      cls: `lenta-tab ${this.activeTab === 'folders' ? 'active' : ''}`,
      text: 'Folders',
    });
    tabFolders.onclick = () => { this.activeTab = 'folders'; this.render(); };

    const tabFeeds = tabsRow.createDiv({
      cls: `lenta-tab ${this.activeTab === 'feeds' ? 'active' : ''}`,
      text: 'Feeds',
    });
    tabFeeds.onclick = () => { this.activeTab = 'feeds'; this.render(); };

    const tabTaxonomy = tabsRow.createDiv({
      cls: `lenta-tab ${this.activeTab === 'taxonomy' ? 'active' : ''}`,
      text: 'Taxonomy',
    });
    tabTaxonomy.onclick = () => { this.activeTab = 'taxonomy'; this.render(); };

    // ── Content Area ───────────────────────────────────────────────────────
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

    // ── Floating Quick-Add Footer ──────────────────────────────────────────
    this.renderQuickAddFooter(container);
  }

  private renderQuickAddFooter(container: Element) {
    const footer = container.createDiv({ cls: 'lenta-sidebar-footer' });

    // Push Current Note shortcut
    const pushCurrentBtn = footer.createEl('button', {
      cls: 'lenta-footer-btn lenta-footer-btn-secondary',
      text: '📤 Push Note',
      attr: { 'aria-label': 'Push current open note to Lenta server' },
    });
    pushCurrentBtn.onclick = () => {
      const file = this.app.workspace.getActiveFile();
      if (!file) {
        new Notice('Open a Lenta markdown note, then use Sync Hub (⚡) to push it.');
        return;
      }
      this.onOpenSyncModal();
    };

    // Quick-Add prominent button
    const addBtn = footer.createEl('button', {
      cls: 'lenta-footer-btn lenta-footer-btn-primary',
      text: '+ New Note',
      attr: { 'aria-label': 'Open Quick Add Note modal' },
    });
    setIcon(addBtn.createSpan(), 'plus');
    addBtn.onclick = () => this.onOpenQuickAdd();
  }

  private renderFolders(container: HTMLElement) {
    if (this.folders.length === 0) {
      container.createDiv({ cls: 'lenta-empty-state', text: 'No folders found on Lenta server.' });
      return;
    }

    const list = container.createDiv({ cls: 'lenta-tree-list' });
    for (const folder of this.folders) {
      const item = list.createDiv({ cls: 'lenta-tree-item lenta-tree-item-folder' });
      item.createSpan({ text: folder.icon ? `${folder.icon} ` : '📁 ', cls: 'lenta-item-icon' });

      const nameSpan = item.createSpan({ text: folder.path, cls: 'lenta-item-name' });

      if (folder.noteCount) {
        item.createSpan({ text: `${folder.noteCount}`, cls: 'lenta-count-pill' });
      }
    }
  }

  private renderFeeds(container: HTMLElement) {
    if (this.feeds.length === 0) {
      container.createDiv({ cls: 'lenta-empty-state', text: 'No feeds configured.' });
      return;
    }

    const list = container.createDiv({ cls: 'lenta-tree-list' });
    for (const feed of this.feeds) {
      const item = list.createDiv({ cls: 'lenta-tree-item lenta-tree-item-feed' });

      // Header row
      const headerRow = item.createDiv({ cls: 'lenta-feed-header-row' });
      headerRow.createSpan({ text: '📰 ', cls: 'lenta-item-icon' });
      headerRow.createSpan({ text: feed.title, cls: 'lenta-item-name' });

      const count = headerRow.createSpan({ cls: 'lenta-count-pill' });
      count.setText(`${feed._count?.notes || 0}`);

      // Toggle expand/collapse preview
      const previewKey = `feed-${feed.id}`;
      const isExpanded = this.expandedPreviews.has(previewKey);

      const toggleBtn = headerRow.createEl('button', {
        cls: 'lenta-preview-toggle clickable-icon',
        attr: { 'aria-label': isExpanded ? 'Collapse preview' : 'Show latest note preview' },
      });
      setIcon(toggleBtn, isExpanded ? 'chevron-up' : 'chevron-down');
      toggleBtn.onclick = async (e) => {
        e.stopPropagation();
        if (isExpanded) {
          this.expandedPreviews.delete(previewKey);
          this.render();
        } else {
          this.expandedPreviews.add(previewKey);
          // Load preview note if not already loaded
          if (!this.feedPreviewNotes.has(feed.id) && !this.loadingPreviewFor.has(feed.id)) {
            this.loadingPreviewFor.add(feed.id);
            this.render();
            try {
              const notes = await this.apiClient.getNotes({ feedId: feed.id }).catch(() => []);
              if (notes.length > 0) {
                this.feedPreviewNotes.set(feed.id, notes[0]);
              }
            } catch {
              // ignore
            } finally {
              this.loadingPreviewFor.delete(feed.id);
            }
          }
          this.render();
        }
      };

      // Markdown Preview Pane
      if (isExpanded) {
        const previewPane = item.createDiv({ cls: 'lenta-markdown-preview-pane' });

        if (this.loadingPreviewFor.has(feed.id)) {
          previewPane.createDiv({ cls: 'lenta-preview-loading', text: '⏳ Loading...' });
        } else {
          const note = this.feedPreviewNotes.get(feed.id);
          if (note) {
            const titleEl = previewPane.createDiv({ cls: 'lenta-preview-note-title' });
            titleEl.setText(`📄 ${note.title}`);

            if (note.description && note.description.trim()) {
              const mdEl = previewPane.createDiv({ cls: 'lenta-preview-md-body' });
              // Use Obsidian's native Markdown renderer
              MarkdownRenderer.render(
                this.app,
                note.description.slice(0, 400) + (note.description.length > 400 ? '\n\n*…*' : ''),
                mdEl,
                '',
                this.mdComponent
              );
            } else {
              previewPane.createDiv({ cls: 'lenta-preview-empty', text: 'No description.' });
            }
          } else {
            previewPane.createDiv({ cls: 'lenta-preview-empty', text: 'No notes in this feed yet.' });
          }
        }
      }
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
