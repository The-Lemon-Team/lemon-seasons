import { ItemView, WorkspaceLeaf, Notice, setIcon, MarkdownRenderer, Component, TFile } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaFrontmatterUtil } from '../services/lenta-frontmatter';
import { LentaPluginSettings, LentaFeedDto, LentaFolderDto, LentaTaxonomyNodeDto, LentaNoteDto } from '../types';
import { LentaCreateFolderModal } from './create-folder-modal';

export const VIEW_TYPE_LENTA_SIDEBAR = 'lemon-lenta-sidebar-view';

export class LentaSidebarView extends ItemView {
  private apiClient: LentaApiClient;
  private getSettings: () => LentaPluginSettings;
  private onOpenQuickAdd: (folderId?: string, folderPath?: string) => void;
  private onOpenSyncModal: (mode?: 'push' | 'pull') => void;
  private onOpenConnectionsModal?: () => void;
  private onOpenContainersFoldersModal?: () => void;
  private onOpenCreateFolder?: (folderId?: string, folderPath?: string) => void;

  private feeds: LentaFeedDto[] = [];
  private folders: LentaFolderDto[] = [];
  private taxonomy: LentaTaxonomyNodeDto[] = [];
  private activeTab: 'folders' | 'feeds' | 'taxonomy' = 'folders';
  private scopeFilter: 'all' | 'my' | 'public' = 'all';
  private isLoading = false;

  // Selected folder for context
  private selectedFolderId: string | null = null;
  private selectedFolderPath: string | null = null;

  // Track which items have expanded markdown previews / accordions
  private expandedPreviews: Set<string> = new Set();

  // Lazy-loaded notes per feed (list of notes)
  private feedNotesList: Map<string, LentaNoteDto[]> = new Map();
  private loadingPreviewFor: Set<string> = new Set();

  // Lazy-loaded notes per folder (list of notes)
  private folderPreviewNotes: Map<string, LentaNoteDto[]> = new Map();
  private loadingFolderNotesFor: Set<string> = new Set();

  // MarkdownRenderer component ref
  private mdComponent: Component;

  constructor(
    leaf: WorkspaceLeaf,
    apiClient: LentaApiClient,
    getSettings: () => LentaPluginSettings,
    onOpenQuickAdd: (folderId?: string, folderPath?: string) => void,
    onOpenSyncModal: (mode?: 'push' | 'pull') => void,
    onOpenConnectionsModal?: () => void,
    onOpenContainersFoldersModal?: () => void,
    private onQuickPull?: () => Promise<void>,
    private onQuickPush?: () => Promise<void>,
    onOpenCreateFolder?: (folderId?: string, folderPath?: string) => void
  ) {
    super(leaf);
    this.apiClient = apiClient;
    this.getSettings = getSettings;
    this.onOpenQuickAdd = onOpenQuickAdd;
    this.onOpenSyncModal = onOpenSyncModal;
    this.onOpenConnectionsModal = onOpenConnectionsModal;
    this.onOpenContainersFoldersModal = onOpenContainersFoldersModal;
    this.onOpenCreateFolder = onOpenCreateFolder;
    this.mdComponent = new Component();
  }

  public selectFolder(folderId: string, folderPath: string) {
    this.selectedFolderId = folderId;
    this.selectedFolderPath = folderPath;
    this.render();
  }

  public openCreateFolderModal(parentFolderId?: string, parentFolderPath?: string) {
    if (this.onOpenCreateFolder) {
      this.onOpenCreateFolder(parentFolderId, parentFolderPath);
    } else {
      const defaultPrivacy = this.scopeFilter === 'public' ? 'public' : 'private';
      new LentaCreateFolderModal(
        this.app,
        this.apiClient,
        this.getSettings,
        async (newFolder) => {
          this.selectedFolderId = newFolder.id;
          this.selectedFolderPath = newFolder.path;
          await this.refreshData();
        },
        parentFolderId,
        parentFolderPath,
        defaultPrivacy
      ).open();
    }
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
    this.containerEl.style.minWidth = '300px';
    this.mdComponent.load();
    await this.refreshData();
  }

  async onClose() {
    this.mdComponent.unload();
  }

  public invalidateFolderNotes(folderId?: string) {
    if (folderId) {
      this.folderPreviewNotes.delete(folderId);
    } else {
      this.folderPreviewNotes.clear();
    }
  }

  public expandFolder(folderId: string) {
    this.expandedPreviews.add(`folder-${folderId}`);
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

      // Re-fetch notes for currently expanded folder accordions or cached folders
      const foldersToFetch = new Set<string>();
      for (const key of this.expandedPreviews) {
        if (key.startsWith('folder-')) {
          foldersToFetch.add(key.replace('folder-', ''));
        }
      }
      for (const fId of this.folderPreviewNotes.keys()) {
        foldersToFetch.add(fId);
      }

      await Promise.all(
        Array.from(foldersToFetch).map(async (folderId) => {
          const folderObj = folders.find((f) => f.id === folderId);
          if (folderObj) {
            try {
              const notes = await this.apiClient.getNotes({ folder: folderObj.path });
              this.folderPreviewNotes.set(folderId, notes);
            } catch {
              this.folderPreviewNotes.set(folderId, []);
            }
          }
        })
      );
    } catch (err: any) {
      new Notice(`Failed to load Lenta hierarchy: ${err.message}`);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  private isMyFolder(folder: LentaFolderDto): boolean {
    if (folder.privacy === 'private') return true;
    if (folder.privacy === 'public') return false;
    if (folder.containerId && folder.containerId !== 'main-git-vault' && folder.containerId !== 'simple-notes') {
      return true;
    }
    const p = (folder.path || folder.name || '').toLowerCase();
    const myKeywords = [
      '01_daily',
      '02_project',
      '03_research',
      '04_archive',
      'bookmark',
      'financial',
      'core_strategy',
      'personal',
      'private',
      'my_',
    ];
    return myKeywords.some((kw) => p.includes(kw));
  }

  private isMyScopeActive(): boolean {
    if (this.activeTab === 'feeds') {
      return false;
    }
    if (this.scopeFilter === 'my') {
      return true;
    }
    if (this.scopeFilter === 'public') {
      return false;
    }
    if (this.selectedFolderId) {
      const f = this.folders.find((x) => x.id === this.selectedFolderId);
      if (f) return this.isMyFolder(f);
    }
    return this.folders.some((f) => this.isMyFolder(f));
  }

  private render() {
    const container = this.containerEl.children[1] as HTMLElement;
    if (!container) return;
    container.empty();
    container.addClass('lenta-sidebar-container');
    container.style.minWidth = '300px';

    // ── Toolbar Header ─────────────────────────────────────────────────────
    const header = container.createDiv({ cls: 'lenta-sidebar-header' });
    const titleRow = header.createDiv({ cls: 'lenta-sidebar-title' });
    titleRow.createEl('h4', { text: '🍋 Project Lenta' });
    const settings = this.getSettings();
    const selectedCount = Array.isArray(settings.activeContainerIds) && settings.activeContainerIds.length > 0
      ? settings.activeContainerIds.length
      : settings.activeContainerId ? 1 : 0;
    if (selectedCount > 0) {
      const badge = titleRow.createSpan({ cls: 'lenta-badge' });
      badge.setText(`CONTAINERS: ${selectedCount}`);
      badge.title = `Connected containers count (${selectedCount}): ${settings.activeContainerIds.join(', ')}`;
    }

    const toolbar = header.createDiv({ cls: 'lenta-sidebar-toolbar' });

    const addBtn = toolbar.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Quick Add Note' } });
    setIcon(addBtn, 'plus');
    addBtn.onclick = () => {
      if (!this.isMyScopeActive()) {
        new Notice('🔒 Создание заметок разрешено только в личных папках (My Folders). Переключитесь на "My".');
        return;
      }
      this.onOpenQuickAdd(this.selectedFolderId || undefined, this.selectedFolderPath || undefined);
    };

    const addFolderToolbarBtn = toolbar.createEl('button', {
      cls: 'clickable-icon',
      attr: { 'aria-label': 'New Folder' },
    });
    setIcon(addFolderToolbarBtn, 'folder-plus');
    addFolderToolbarBtn.onclick = () => {
      this.openCreateFolderModal(this.selectedFolderId || undefined, this.selectedFolderPath || undefined);
    };

    const pullBtn = toolbar.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Pull from Lenta Server (⬇)' } });
    setIcon(pullBtn, 'download');
    pullBtn.onclick = () => {
      this.onOpenSyncModal('pull');
    };

    const pushBtn = toolbar.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Push Changed to Server (⬆)' } });
    setIcon(pushBtn, 'upload');
    pushBtn.onclick = () => {
      if (!this.isMyScopeActive()) {
        new Notice('🔒 Отправка заметок разрешена только для личных папок (My Folders).');
        return;
      }
      this.onOpenSyncModal('push');
    };

    const syncBtn = toolbar.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Sync Hub' } });
    setIcon(syncBtn, 'zap');
    syncBtn.onclick = () => this.onOpenSyncModal('push');

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

    const collapseBtn = toolbar.createEl('button', {
      cls: 'clickable-icon',
      attr: { 'aria-label': 'Скрыть все (Collapse all)' },
    });
    setIcon(collapseBtn, 'chevrons-down-up');
    collapseBtn.onclick = () => {
      this.expandedPreviews.clear();
      this.render();
      new Notice('🍋 Все папки свернуты');
    };

    const refreshBtn = toolbar.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Refresh Data' } });
    setIcon(refreshBtn, 'refresh-cw');
    refreshBtn.onclick = () => this.refreshData();

    // ── 2. Tabs ───────────────────────────────────────────────────────────────
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

    // ── 3. Scope Filter Bar (All / My / Public) ─────────────────────────────
    const filterBar = container.createDiv({ cls: 'lenta-scope-filter-bar' });

    const filterOptions: Array<{ id: 'all' | 'my' | 'public'; label: string; icon: string }> = [
      { id: 'all', label: 'All', icon: '👥' },
      { id: 'my', label: 'My', icon: '🔒' },
      { id: 'public', label: 'Public', icon: '🌐' },
    ];

    for (const opt of filterOptions) {
      const pill = filterBar.createDiv({
        cls: `lenta-scope-pill ${this.scopeFilter === opt.id ? 'active' : ''}`,
        text: `${opt.icon} ${opt.label}`,
      });
      pill.onclick = () => {
        this.scopeFilter = opt.id;
        this.render();
      };
    }
    // ── 4. Scrollable Middle Content ────────────────────────────────────────
    const content = container.createDiv({ cls: 'lenta-sidebar-content' });

    if (this.isLoading) {
      content.createDiv({ cls: 'lenta-loading-text', text: '⏳ Loading hierarchy...' });
    } else if (this.activeTab === 'folders') {
      this.renderFolders(content);
    } else if (this.activeTab === 'feeds') {
      this.renderFeeds(content);
    } else {
      this.renderTaxonomy(content);
    }

    // ── 5. Sticky Bottom Action Footer (Always pinned at bottom) ────────────
    this.renderQuickAddFooter(container);
  }

  private renderQuickAddFooter(container: Element) {
    const footer = container.createDiv({ cls: 'lenta-sidebar-footer' });
    const isMyActive = this.isMyScopeActive();

    // 1. Push Current Note shortcut
    const pushCurrentBtn = footer.createEl('button', {
      cls: `lenta-footer-btn lenta-footer-btn-secondary ${isMyActive ? '' : 'is-disabled'}`,
      text: isMyActive ? '📤 Push Note' : '🔒 Push Note',
      attr: {
        'aria-label': isMyActive
          ? 'Push current open note to Lenta server'
          : 'Disabled: Push is only available for notes in My Folders',
      },
    });

    pushCurrentBtn.onclick = () => {
      if (!isMyActive) {
        new Notice('🔒 Отправка заметок разрешена только в личных папках (My Folders). Переключите фильтр на "My".');
        return;
      }
      const file = this.app.workspace.getActiveFile();
      if (!file) {
        new Notice('Open a Lenta markdown note, then use Sync Hub (⚡) to push it.');
        return;
      }
      this.onOpenSyncModal();
    };

    // 2. New Folder prominent button
    const addFolderBtn = footer.createEl('button', {
      cls: 'lenta-footer-btn lenta-footer-btn-secondary',
      text: '+ New folder',
      attr: {
        'aria-label': this.selectedFolderPath
          ? `Create new folder inside "${this.selectedFolderPath}"`
          : 'Create new folder in Lenta & Vault',
      },
    });
    setIcon(addFolderBtn.createSpan(), 'folder-plus');

    addFolderBtn.onclick = () => {
      this.openCreateFolderModal(this.selectedFolderId || undefined, this.selectedFolderPath || undefined);
    };

    // 3. Quick-Add prominent button
    const addBtn = footer.createEl('button', {
      cls: `lenta-footer-btn lenta-footer-btn-primary ${isMyActive ? '' : 'is-disabled'}`,
      text: isMyActive ? '+ New note' : '🔒 + New note',
      attr: {
        'aria-label': isMyActive
          ? `Create new note${this.selectedFolderPath ? ` in ${this.selectedFolderPath}` : ' in My Folders'}`
          : 'Disabled: Creating notes is only allowed in My Folders',
      },
    });

    if (isMyActive) {
      setIcon(addBtn.createSpan(), 'plus');
    }

    addBtn.onclick = () => {
      if (!isMyActive) {
        new Notice('🔒 Создание заметок разрешено только в личных папках (My Folders). Переключите фильтр на "My".');
        return;
      }
      this.onOpenQuickAdd(this.selectedFolderId || undefined, this.selectedFolderPath || undefined);
    };
  }

  private renderFolders(container: HTMLElement) {
    if (this.folders.length === 0) {
      container.createDiv({ cls: 'lenta-empty-state', text: 'No folders found on Lenta server.' });
      return;
    }

    const myFolders = this.folders.filter((f) => this.isMyFolder(f));
    const publicFolders = this.folders.filter((f) => !this.isMyFolder(f));

    if (this.scopeFilter === 'my') {
      if (myFolders.length === 0) {
        container.createDiv({ cls: 'lenta-empty-state', text: '🔒 No personal (My) folders found.' });
        return;
      }
      this.renderFolderList(container, myFolders, '🔒 My Folders');
    } else if (this.scopeFilter === 'public') {
      if (publicFolders.length === 0) {
        container.createDiv({ cls: 'lenta-empty-state', text: '🌐 No public folders found.' });
        return;
      }
      this.renderFolderList(container, publicFolders, '🌐 Public Folders');
    } else {
      // Scope "all": Show both sections
      if (myFolders.length > 0) {
        this.renderFolderList(container, myFolders, '🔒 My Folders');
      }
      if (publicFolders.length > 0) {
        this.renderFolderList(container, publicFolders, '🌐 Public Folders');
      }
    }
  }

  private renderFolderList(container: HTMLElement, folders: LentaFolderDto[], groupTitle?: string) {
    if (groupTitle) {
      const groupHeader = container.createDiv({ cls: 'lenta-folder-group-title' });
      groupHeader.createSpan({ text: groupTitle });
      groupHeader.createSpan({ cls: 'lenta-count-pill', text: `${folders.length}` });
    }

    const list = container.createDiv({ cls: 'lenta-tree-list' });

    for (const folder of folders) {
      const item = list.createDiv({ cls: 'lenta-tree-item lenta-tree-item-folder' });
      const previewKey = `folder-${folder.id}`;
      const isExpanded = this.expandedPreviews.has(previewKey);
      const isSelected = this.selectedFolderId === folder.id;

      // Header row
      const headerRow = item.createDiv({
        cls: `lenta-folder-header-row ${isSelected ? 'is-active' : ''}`,
      });

      const iconSpan = headerRow.createSpan({ cls: 'lenta-item-icon' });
      const fIcon = folder.icon || 'folder';
      if (fIcon.match(/^[a-z0-9-]+$/)) {
        setIcon(iconSpan, fIcon);
      } else {
        iconSpan.setText(fIcon);
      }

      headerRow.createSpan({ text: folder.path, cls: 'lenta-item-name' });

      if (folder.noteCount !== undefined && folder.noteCount !== null) {
        headerRow.createSpan({ text: `${folder.noteCount}`, cls: 'lenta-count-pill' });
      }

      // Add Note button specifically in this folder
      const addNoteBtn = headerRow.createEl('span', {
        cls: 'lenta-folder-add-note clickable-icon',
        attr: {
          'aria-label': `+ Добавить заметку в ${folder.path || folder.name}`,
          title: `Добавить заметку в папку ${folder.path || folder.name}`,
        },
      });
      setIcon(addNoteBtn, 'plus');
      addNoteBtn.onclick = (e) => {
        e.stopPropagation();
        this.selectedFolderId = folder.id;
        this.selectedFolderPath = folder.path;
        this.onOpenQuickAdd(folder.id, folder.path);
      };

      const toggleBtn = headerRow.createEl('span', {
        cls: 'lenta-preview-toggle clickable-icon',
        attr: { 'aria-label': isExpanded ? 'Collapse folder' : 'Expand folder notes' },
      });
      setIcon(toggleBtn, isExpanded ? 'chevron-up' : 'chevron-down');

      headerRow.onclick = async () => {
        this.selectedFolderId = folder.id;
        this.selectedFolderPath = folder.path;

        if (isExpanded) {
          this.expandedPreviews.delete(previewKey);
          this.render();
        } else {
          this.expandedPreviews.add(previewKey);
          if (!this.folderPreviewNotes.has(folder.id) && !this.loadingFolderNotesFor.has(folder.id)) {
            this.loadingFolderNotesFor.add(folder.id);
            this.render();
            try {
              const notes = await this.apiClient.getNotes({ folder: folder.path }).catch(() => []);
              this.folderPreviewNotes.set(folder.id, notes);
            } catch {
              this.folderPreviewNotes.set(folder.id, []);
            } finally {
              this.loadingFolderNotesFor.delete(folder.id);
            }
          }
          this.render();
        }
      };

      // Accordion Body
      if (isExpanded) {
        const previewPane = item.createDiv({ cls: 'lenta-markdown-preview-pane' });

        if (this.loadingFolderNotesFor.has(folder.id)) {
          previewPane.createDiv({ cls: 'lenta-preview-loading', text: `⏳ Loading notes in "${folder.name}"...` });
        } else {
          const notes = this.folderPreviewNotes.get(folder.id) || [];
          if (notes.length === 0) {
            previewPane.createDiv({ cls: 'lenta-preview-empty', text: '📭 No notes in this folder yet.' });
          } else {
            const notesList = previewPane.createDiv({ cls: 'lenta-notes-list' });
            for (const note of notes.slice(0, 25)) {
              const row = notesList.createDiv({ cls: 'lenta-note-row' });
              const noteIconSpan = row.createSpan({ cls: 'lenta-item-icon lenta-note-icon' });
              const nIcon = note.icon || 'file-text';
              if (nIcon.match(/^[a-z0-9-]+$/)) {
                setIcon(noteIconSpan, nIcon);
              } else {
                noteIconSpan.setText(nIcon);
              }

              row.createSpan({ text: note.title, cls: 'lenta-note-title' });
              if (note.startDate) {
                row.createSpan({ text: note.startDate.slice(0, 10), cls: 'lenta-note-date' });
              }
              row.onclick = async (e) => {
                e.stopPropagation();
                await this.openNoteInVaultOrPreview(note);
              };
            }
          }
        }
      }
    }
  }

  private renderFeeds(container: HTMLElement) {
    if (this.scopeFilter === 'my') {
      const empty = container.createDiv({ cls: 'lenta-empty-state' });
      empty.createEl('div', { text: '🔒 Feeds are public publication channels.' });
      empty.createEl('p', {
        cls: 'setting-item-description',
        text: 'Switch filter to "All" or "Public" to view feeds.',
      });
      return;
    }

    if (this.feeds.length === 0) {
      container.createDiv({ cls: 'lenta-empty-state', text: 'No feeds configured.' });
      return;
    }

    const list = container.createDiv({ cls: 'lenta-tree-list' });
    for (const feed of this.feeds) {
      const item = list.createDiv({ cls: 'lenta-tree-item lenta-tree-item-feed' });
      const previewKey = `feed-${feed.id}`;
      const isExpanded = this.expandedPreviews.has(previewKey);

      // Header row: clickable across whole row
      const headerRow = item.createDiv({
        cls: `lenta-feed-header-row ${isExpanded ? 'is-active' : ''}`,
      });

      headerRow.createSpan({ text: '📰 ', cls: 'lenta-item-icon' });
      headerRow.createSpan({ text: feed.title, cls: 'lenta-item-name' });

      const count = headerRow.createSpan({ cls: 'lenta-count-pill' });
      count.setText(`${feed._count?.notes || 0}`);

      const toggleBtn = headerRow.createEl('span', {
        cls: 'lenta-preview-toggle clickable-icon',
        attr: { 'aria-label': isExpanded ? 'Collapse feed' : 'Show feed notes' },
      });
      setIcon(toggleBtn, isExpanded ? 'chevron-up' : 'chevron-down');

      headerRow.onclick = async () => {
        if (isExpanded) {
          this.expandedPreviews.delete(previewKey);
          this.render();
        } else {
          this.expandedPreviews.add(previewKey);
          if (!this.feedNotesList.has(feed.id) && !this.loadingPreviewFor.has(feed.id)) {
            this.loadingPreviewFor.add(feed.id);
            this.render();
            try {
              const notes = await this.apiClient.getNotes({ feedId: feed.id }).catch(() => []);
              this.feedNotesList.set(feed.id, notes);
            } catch {
              this.feedNotesList.set(feed.id, []);
            } finally {
              this.loadingPreviewFor.delete(feed.id);
            }
          }
          this.render();
        }
      };

      // Accordion Pane - RENDERED AS FULL VERTICAL ACCORDION BELOW TITLE
      if (isExpanded) {
        const previewPane = item.createDiv({ cls: 'lenta-markdown-preview-pane' });

        if (this.loadingPreviewFor.has(feed.id)) {
          previewPane.createDiv({ cls: 'lenta-preview-loading', text: '⏳ Loading feed notes...' });
        } else {
          const notes = this.feedNotesList.get(feed.id) || [];
          if (notes.length === 0) {
            previewPane.createDiv({ cls: 'lenta-preview-empty', text: '📭 No notes in this feed yet.' });
          } else {
            const notesList = previewPane.createDiv({ cls: 'lenta-notes-list' });
            for (const note of notes.slice(0, 15)) {
              const row = notesList.createDiv({ cls: 'lenta-note-row' });
              const noteIconSpan = row.createSpan({ cls: 'lenta-item-icon lenta-note-icon' });
              const nIcon = note.icon || 'file-text';
              if (nIcon.match(/^[a-z0-9-]+$/)) {
                setIcon(noteIconSpan, nIcon);
              } else {
                noteIconSpan.setText(nIcon);
              }

              row.createSpan({ text: note.title, cls: 'lenta-note-title' });
              if (note.startDate) {
                row.createSpan({ text: note.startDate.slice(0, 10), cls: 'lenta-note-date' });
              }
              row.onclick = async (e) => {
                e.stopPropagation();
                await this.openNoteInVaultOrPreview(note);
              };
            }
          }
        }
      }
    }
  }

  private async openNoteInVaultOrPreview(note: LentaNoteDto) {
    const files = this.app.vault.getMarkdownFiles();
    let matched: TFile | undefined;

    // 1. Primary lookup: Match exact lenta_id in Frontmatter
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fileLentaId = cache?.frontmatter?.lenta_id || cache?.frontmatter?.id;
      if (fileLentaId && fileLentaId === note.id) {
        matched = file;
        break;
      }
    }

    // 2. Secondary lookup: Normalized title comparison (ignoring punctuation differences like ":" vs "-")
    if (!matched) {
      const normalize = (s: string) =>
        s.toLowerCase().replace(/[:\/\\*?"<>|_-]/g, ' ').replace(/\s+/g, ' ').trim();
      const normTitle = normalize(note.title);

      matched = files.find((f) => {
        const normBase = normalize(f.basename);
        return normBase === normTitle || normBase.includes(normTitle) || normTitle.includes(normBase);
      });
    }

    // 3. Tertiary lookup: Substring check on first 25 characters of title
    if (!matched) {
      const safeSub = note.title.replace(/[:\/\\*?"<>|_-]/g, ' ').trim().slice(0, 25).toLowerCase();
      matched = files.find((f) => f.basename.toLowerCase().includes(safeSub));
    }

    if (matched) {
      await this.app.workspace.getLeaf(false).openFile(matched);
      new Notice(`🍋 Opened "${matched.basename}"`);
      return;
    }

    // 4. If file is not yet in local vault: On-demand download and open!
    try {
      new Notice(`⏳ Downloading "${note.title}" into vault...`);
      const root = this.getSettings().vaultRootFolder || 'Lemon-Seasons';
      const folderPath =
        note.folders && note.folders.length > 0 && note.folders[0].folder
          ? note.folders[0].folder.path
          : '01_Daily_Logs';

      const safeTitle = note.title.replace(/[:\/\\*?"<>|]/g, '-').trim();
      const targetDir = `${root}/${folderPath}`;
      const targetPath = `${targetDir}/${safeTitle}.md`;

      if (!(await this.app.vault.adapter.exists(targetDir))) {
        await this.app.vault.adapter.mkdir(targetDir);
      }

      const mdContent = LentaFrontmatterUtil.serializeNoteToMarkdown(note);
      const newFile = await this.app.vault.create(targetPath, mdContent);
      await this.app.workspace.getLeaf(false).openFile(newFile);
      new Notice(`🍋 Downloaded & opened "${newFile.basename}"!`);
    } catch (err: any) {
      new Notice(`📄 ${note.title} (${note.startDate ? note.startDate.slice(0, 10) : 'Lenta'})`);
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
