import { ItemView, WorkspaceLeaf, Notice, setIcon, Component, TFile, Menu } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaFrontmatterUtil } from '../services/lenta-frontmatter';
import {
  LentaPluginSettings,
  LentaFeedDto,
  LentaFolderDto,
  LentaTaxonomyNodeDto,
  LentaNoteDto,
  LentaContainerSummaryDto,
} from '../types';
import { LentaCreateFolderModal } from './create-folder-modal';
import { LentaQuickAddModal } from './quick-add-modal';
import { LentaAiQuickAddModal } from './ai-quick-add-modal';
import { isContainerPublic } from '../utils/container-privacy';

import { getContainerDisplayTitle } from '../utils/container-title';
import LentaSidebar from './svelte/LentaSidebar.svelte';
import type { ObsidianBridge } from './svelte/sidebar-store';

export const VIEW_TYPE_LENTA_SIDEBAR = 'lemon-lenta-sidebar-view';

export interface ContainerFileTreeNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  children?: ContainerFileTreeNode[];
  size?: number;
  mtime?: number;
  startDate?: string;
  endDate?: string;
  dateStr?: string;
}

export function buildFileTree(
  files: Array<{ path: string; size?: number; mtime?: number; startDate?: string; endDate?: string }>,
  folders: Array<{ path: string; name?: string; icon?: string; color?: string }> = []
): ContainerFileTreeNode[] {
  const rootChildren: ContainerFileTreeNode[] = [];

  // 1. Process explicit folder paths first so empty folders are retained
  for (const folder of folders) {
    const rawPath = (folder.path || '').replace(/\\/g, '/');
    const parts = rawPath.split('/').filter(Boolean);
    let currentChildren = rootChildren;
    let accumulatedPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;

      let existing = currentChildren.find((node) => node.name === part);
      if (!existing) {
        existing = {
          name: part,
          path: accumulatedPath,
          type: 'folder',
          children: [],
        };
        currentChildren.push(existing);
      }
      if (existing.children) {
        currentChildren = existing.children;
      }
    }
  }

  // 2. Process files
  for (const file of files) {
    const rawPath = file.path.replace(/\\/g, '/');
    const parts = rawPath.split('/').filter(Boolean);
    let currentChildren = rootChildren;
    let accumulatedPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;

      let dateStr: string | undefined = undefined;
      if (isFile) {
        if (file.startDate) {
          const d = new Date(file.startDate);
          if (!isNaN(d.getTime())) {
            dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          }
        }
        if (!dateStr) {
          const match = part.match(/^(\d{4}-\d{2}-\d{2})/);
          if (match) {
            dateStr = match[1];
          }
        }
      }

      let existing = currentChildren.find((node) => node.name === part);
      if (!existing) {
        existing = {
          name: part,
          path: accumulatedPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
          size: isFile ? file.size : undefined,
          mtime: isFile ? file.mtime : undefined,
          startDate: isFile ? file.startDate : undefined,
          endDate: isFile ? file.endDate : undefined,
          dateStr: isFile ? dateStr : undefined,
        };
        currentChildren.push(existing);
      }
      if (!isFile && existing.children) {
        currentChildren = existing.children;
      }
    }
  }

  function sortNodes(nodes: ContainerFileTreeNode[]) {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      if (a.dateStr && b.dateStr) {
        const cmp = a.dateStr.localeCompare(b.dateStr);
        if (cmp !== 0) return cmp;
      }
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) {
        sortNodes(node.children);
      }
    }
  }
  sortNodes(rootChildren);

  return rootChildren;
}

export class LentaSidebarView extends ItemView {
  private apiClient: LentaApiClient;
  private getSettings: () => LentaPluginSettings;
  private onOpenQuickAdd: (folderId?: string, folderPath?: string) => void;
  private onOpenSyncModal: (mode?: 'push' | 'pull') => void;
  private onOpenConnectionsModal?: () => void;
  private onOpenContainersFoldersModal?: () => void;
  private onOpenCreateFolder?: (
    folderId?: string,
    folderPath?: string,
    defaultPrivacy?: 'private' | 'public' | 'obsidian',
    targetContainerId?: string
  ) => void;
  private onSaveSettings?: () => Promise<void>;

  private sidebarMode: 'notes' | 'containers' = 'notes';
  private activeTab: 'folders' | 'feeds' = 'folders';
  private scopeFilter: 'my' | 'public' = 'my';
  private isLoading = false;

  private feeds: LentaFeedDto[] = [];
  private folders: LentaFolderDto[] = [];
  private taxonomy: LentaTaxonomyNodeDto[] = [];
  private containers: LentaContainerSummaryDto[] = [];

  // Selected folder for context
  private selectedFolderId: string | null = null;
  private selectedFolderPath: string | null = null;

  // Track which items have expanded previews / accordions
  private expandedPreviews: Set<string> = new Set();

  // Lazy-loaded notes per feed (list of notes)
  private feedNotesList: Map<string, LentaNoteDto[]> = new Map();
  private loadingPreviewFor: Set<string> = new Set();

  // Lazy-loaded notes per folder (list of notes)
  private folderPreviewNotes: Map<string, LentaNoteDto[]> = new Map();
  private loadingFolderNotesFor: Set<string> = new Set();

  // Lazy-loaded files and folders per container
  private containerFilesList: Map<string, Array<{ path: string; content?: string; mtime?: number; size?: number }>> = new Map();
  private containerFoldersList: Map<string, LentaFolderDto[]> = new Map();
  private loadingContainerFilesFor: Set<string> = new Set();
  private expandedContainerFolders: Set<string> = new Set();

  // Scroll position tracking per view key (mode:tab:filter)
  private scrollPositions: Map<string, number> = new Map();
  private currentViewKey = 'notes:folders:my';

  // Key connection state
  private isConnectingKey = false;
  private keyInputText = '';

  private mdComponent: Component;
  private svelteComponent: any = null;

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
    onOpenCreateFolder?: (
      folderId?: string,
      folderPath?: string,
      defaultPrivacy?: 'private' | 'public' | 'obsidian',
      targetContainerId?: string
    ) => void,
    onSaveSettings?: () => Promise<void>
  ) {
    super(leaf);
    this.apiClient = apiClient;
    this.getSettings = getSettings;
    this.onOpenQuickAdd = onOpenQuickAdd;
    this.onOpenSyncModal = onOpenSyncModal;
    this.onOpenConnectionsModal = onOpenConnectionsModal;
    this.onOpenContainersFoldersModal = onOpenContainersFoldersModal;
    this.onOpenCreateFolder = onOpenCreateFolder;
    this.onSaveSettings = onSaveSettings;
    this.mdComponent = new Component();
  }

  public selectFolder(folderId: string, folderPath: string) {
    this.selectedFolderId = folderId;
    this.selectedFolderPath = folderPath;
    this.render();
  }

  public openCreateFolderModal(parentFolderId?: string, parentFolderPath?: string) {
    const settings = this.getSettings();
    const isContainerMode = this.sidebarMode === 'containers';
    const activeContainerId = isContainerMode
      ? (settings.activeContainerId || (settings.activeContainerIds && settings.activeContainerIds[0]) || this.containers[0]?.id)
      : undefined;

    if (this.onOpenCreateFolder) {
      this.onOpenCreateFolder(
        parentFolderId,
        parentFolderPath,
        isContainerMode ? 'obsidian' : undefined,
        activeContainerId
      );
    } else {
      const defaultPrivacy = isContainerMode
        ? 'obsidian'
        : this.scopeFilter === 'public'
        ? 'public'
        : 'private';
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
        defaultPrivacy,
        activeContainerId
      ).open();
    }
  }

  public openQuickAddForContainer(
    containerId: string,
    containerName?: string,
    folderPath?: string,
    initialDate?: string
  ) {
    const matchedContainer = this.containers.find((c) => c.id === containerId);
    const resolvedName = containerName || matchedContainer?.name;

    new LentaQuickAddModal(
      this.app,
      this.apiClient,
      this.getSettings,
      async () => {
        this.containerFilesList.delete(containerId);
        this.containerFoldersList.delete(containerId);
        this.expandedPreviews.add(`container-${containerId}`);
        if (folderPath) {
          this.expandedContainerFolders.add(`${containerId}:${folderPath}`);
        }
        try {
          const [files, folders] = await Promise.all([
            this.apiClient.getContainerFiles(containerId).catch(() => []),
            this.apiClient.getFolders({ containerId, scope: 'all' }).catch(() => []),
          ]);
          this.containerFilesList.set(containerId, files);
          this.containerFoldersList.set(containerId, folders);
        } catch {
          // ignore
        }
        await this.refreshData();
      },
      undefined,
      folderPath,
      containerId,
      resolvedName,
      this.containerFilesList.get(containerId),
      initialDate
    ).open();
  }

  public openCreateFolderForContainer(
    containerId: string,
    containerName?: string,
    parentFolderId?: string,
    parentFolderPath?: string
  ) {
    const defaultPrivacy = 'obsidian';

    new LentaCreateFolderModal(
      this.app,
      this.apiClient,
      this.getSettings,
      async (newFolder) => {
        this.containerFilesList.delete(containerId);
        if (newFolder?.path) {
          const currentFolders = this.containerFoldersList.get(containerId) || [];
          if (!currentFolders.some((f) => f.path === newFolder.path)) {
            currentFolders.push(newFolder);
            this.containerFoldersList.set(containerId, currentFolders);
          }
        }
        this.expandedPreviews.add(`container-${containerId}`);
        if (parentFolderPath) {
          this.expandedContainerFolders.add(`${containerId}:${parentFolderPath}`);
        }
        if (newFolder?.path) {
          this.expandedContainerFolders.add(`${containerId}:${newFolder.path}`);
        }
        try {
          const [files, folders] = await Promise.all([
            this.apiClient.getContainerFiles(containerId).catch(() => []),
            this.apiClient.getFolders({ containerId, scope: 'all' }).catch(() => []),
          ]);
          this.containerFilesList.set(containerId, files);
          this.containerFoldersList.set(containerId, folders);
        } catch {
          // ignore
        }
        await this.refreshData();
      },
      parentFolderId,
      parentFolderPath,
      defaultPrivacy,
      containerId
    ).open();
  }

  public openAiQuickAddModal(initialFolder?: string, initialDate?: string) {
    const modal = new LentaAiQuickAddModal(
      this.app,
      this.apiClient,
      this.getSettings,
      async (createdPaths) => {
        await this.refreshData();
        if (createdPaths.length > 0) {
          await this.openNoteInVault(createdPaths[0]);
        }
      },
      this.getSettings().activeContainerId || undefined,
      this.getSettings().connectedContainerName || undefined,
      initialFolder,
      initialDate,
    );
    modal.open();
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

  private createObsidianBridge(): ObsidianBridge {
    return {
      openAiQuickAdd: (fPath?: string, date?: string) => this.openAiQuickAddModal(fPath, date),
      openQuickAdd: (fId?: string, fPath?: string) => this.onOpenQuickAdd(fId, fPath),
      openCreateFolder: (pFId?: string, pFPath?: string, privacy?: any, cId?: string) =>
        this.openCreateFolderModal(pFId, pFPath, privacy, cId),
      openQuickAddForContainer: (cId: string, cName?: string, fPath?: string, initDate?: string) =>
        this.openQuickAddForContainer(cId, cName, fPath, initDate),
      openCreateFolderForContainer: (cId: string, cName?: string, pFId?: string, pFPath?: string) =>
        this.openCreateFolderForContainer(cId, cName, pFId, pFPath),
      openSyncModal: (mode?: 'push' | 'pull') => this.onOpenSyncModal(mode),
      openConnectionsModal: this.onOpenConnectionsModal ? () => this.onOpenConnectionsModal!() : undefined,
      openNoteInVault: async (path: string) => {
        const fileName = path.split('/').pop() || path;
        await this.openContainerFileInVault(this.getSettings().activeContainerId || this.containers[0]?.id || '', path, fileName);
      },
      refreshData: () => this.refreshData(),
      saveSettings: async () => {
        if (this.onSaveSettings) await this.onSaveSettings();
      },
      loadContainerFiles: async (containerId: string) => {
        const [files, cFolders] = await Promise.all([
          this.apiClient.getContainerFiles(containerId).catch(() => []),
          this.apiClient.getFolders({ containerId, scope: 'all' }).catch(() => []),
        ]);
        this.containerFilesList.set(containerId, files);
        this.containerFoldersList.set(containerId, cFolders);
        this.updateSvelteProps();
      },
      loadFolderNotes: async (folderId: string, folderPath: string) => {
        const notes = await this.apiClient.getNotes({ folder: folderPath }).catch(() => []);
        this.folderPreviewNotes.set(folderId, notes);
        this.updateSvelteProps();
      },
      loadFeedNotes: async (feedId: string, feedSlug: string) => {
        const notes = await this.apiClient.getNotes({ feed: feedSlug }).catch(() => []);
        this.feedNotesList.set(feedId, notes);
        this.updateSvelteProps();
      },
      connectKey: async (key: string) => {
        this.keyInputText = key;
        await this.connectKeyAction();
        this.updateSvelteProps();
      },
      disconnectKey: async () => {
        const settings = this.getSettings();
        settings.containerKey = '';
        settings.activeContainerIds = [];
        settings.activeContainerId = '';
        settings.connectedContainerName = '';
        if (this.onSaveSettings) {
          await this.onSaveSettings();
        }
        new Notice('🍋 Container key disconnected');
        await this.refreshData();
      },
      toggleContainerConnect: async (containerId: string) => {
        const settings = this.getSettings();
        let currentIds = Array.isArray(settings.activeContainerIds) ? [...settings.activeContainerIds] : [];
        if (currentIds.includes(containerId)) {
          currentIds = currentIds.filter((id) => id !== containerId);
          new Notice(`Отключен контейнер: ${containerId}`);
        } else {
          currentIds.push(containerId);
          new Notice(`Подключен контейнер: ${containerId}`);
        }
        settings.activeContainerIds = currentIds;
        settings.activeContainerId = currentIds[0] || '';
        if (this.onSaveSettings) {
          await this.onSaveSettings();
        }
        this.updateSvelteProps();
      },
    };
  }

  async onOpen() {
    this.containerEl.style.minWidth = '300px';
    this.mdComponent.load();

    const target = (this.containerEl.children[1] as HTMLElement) || this.contentEl;
    if (target) {
      target.empty();
      try {
        const bridge = this.createObsidianBridge();
        this.svelteComponent = new (LentaSidebar as any)({
          target,
          props: {
            settings: this.getSettings(),
            containers: this.containers,
            folders: this.folders,
            feeds: this.feeds,
            containerFilesList: this.containerFilesList,
            containerFoldersList: this.containerFoldersList,
            folderPreviewNotes: this.folderPreviewNotes,
            feedNotesList: this.feedNotesList,
            isLoading: this.isLoading,
            bridge,
            onOpenQuickAdd: bridge.openQuickAdd,
            onOpenCreateFolder: bridge.openCreateFolder,
            onOpenQuickAddForContainer: bridge.openQuickAddForContainer,
            onOpenCreateFolderForContainer: bridge.openCreateFolderForContainer,
            onOpenSyncModal: bridge.openSyncModal,
            onOpenConnectionsModal: bridge.openConnectionsModal,
            onRefreshData: bridge.refreshData,
            onSaveSettings: bridge.saveSettings,
            onOpenNoteInVault: bridge.openNoteInVault,
            onLoadContainerFiles: bridge.loadContainerFiles,
            onLoadFolderNotes: bridge.loadFolderNotes,
            onLoadFeedNotes: bridge.loadFeedNotes,
          },
        });
      } catch (e) {
        // Fallback to legacy render if Svelte cannot mount
        this.render();
      }
    }

    await this.refreshData();
  }

  async onClose() {
    if (this.svelteComponent) {
      try {
        this.svelteComponent.$destroy();
      } catch {
        // ignore
      }
      this.svelteComponent = null;
    }
    this.mdComponent.unload();
  }

  public updateSvelteProps() {
    if (this.svelteComponent) {
      try {
        this.svelteComponent.$set({
          settings: this.getSettings(),
          containers: this.containers,
          folders: this.folders,
          feeds: this.feeds,
          containerFilesList: this.containerFilesList,
          containerFoldersList: this.containerFoldersList,
          folderPreviewNotes: this.folderPreviewNotes,
          feedNotesList: this.feedNotesList,
          isLoading: this.isLoading,
        });
      } catch {
        // ignore
      }
    }
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
    if (this.svelteComponent) {
      this.updateSvelteProps();
    } else {
      this.render();
    }

    try {
      const [feeds, folders, taxonomy, containers] = await Promise.all([
        this.apiClient.getFeeds().catch(() => []),
        this.apiClient.getFolders({ scope: 'all' }).catch(() => []),
        this.apiClient.getTaxonomyTree().catch(() => []),
        this.apiClient.listContainers({ fetchAll: true }).catch(() => []),
      ]);

      this.feeds = feeds;
      this.folders = folders;
      this.taxonomy = taxonomy;
      this.containers = containers;

      // Re-fetch notes for currently expanded folder accordions
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

      // Re-fetch files and folders for currently expanded containers
      const containersToFetch = new Set<string>();
      for (const key of this.expandedPreviews) {
        if (key.startsWith('container-')) {
          containersToFetch.add(key.replace('container-', ''));
        }
      }
      await Promise.all(
        Array.from(containersToFetch).map(async (cId) => {
          try {
            const [files, cFolders] = await Promise.all([
              this.apiClient.getContainerFiles(cId).catch(() => []),
              this.apiClient.getFolders({ containerId: cId, scope: 'all' }).catch(() => []),
            ]);
            this.containerFilesList.set(cId, files);
            this.containerFoldersList.set(cId, cFolders);
          } catch {
            this.containerFilesList.set(cId, []);
            this.containerFoldersList.set(cId, []);
          }
        })
      );
    } catch (err: any) {
      new Notice(`Failed to load Lenta data: ${err.message}`);
    } finally {
      this.isLoading = false;
      if (this.svelteComponent) {
        this.updateSvelteProps();
      } else {
        this.render();
      }
    }
  }

  private isMyFolder(folder: LentaFolderDto): boolean {
    if (folder.privacy === 'private' || folder.privacy === 'obsidian') return true;
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

  private isMyFeed(feed: LentaFeedDto): boolean {
    if ((feed as any).privacy === 'private' || (feed as any).visibility === 'private' || (feed as any).isUserOwn === true) {
      return true;
    }
    if ((feed as any).privacy === 'public' || (feed as any).visibility === 'public') {
      return false;
    }
    const slug = (feed.slug || '').toLowerCase();
    const title = (feed.title || '').toLowerCase();
    const defaultSlug = (this.getSettings().defaultFeedSlug || '').toLowerCase();
    if (defaultSlug && (slug === defaultSlug || slug.includes(defaultSlug))) {
      return true;
    }
    const myKeywords = ['my', 'my-', 'my_', 'personal', 'private', 'user', 'own', 'me'];
    return myKeywords.some((kw) => slug.includes(kw) || title.includes(kw));
  }

  private isMyScopeActive(): boolean {
    if (this.sidebarMode === 'notes') {
      if (this.scopeFilter === 'my') return true;
      if (this.scopeFilter === 'public') return false;
      if (this.activeTab === 'folders' && this.selectedFolderId) {
        const f = this.folders.find((x) => x.id === this.selectedFolderId);
        if (f) return this.isMyFolder(f);
      }
      return this.folders.some((f) => this.isMyFolder(f));
    }
    return this.scopeFilter === 'my';
  }

  private getScrollKey(): string {
    if (this.sidebarMode === 'notes') {
      return `notes:${this.activeTab}:${this.scopeFilter}`;
    }
    return `containers:${this.scopeFilter}`;
  }

  private setupContentScroll(content: HTMLElement, targetKey: string) {
    content.addEventListener(
      'scroll',
      () => {
        this.scrollPositions.set(targetKey, content.scrollTop);
      },
      { passive: true }
    );

    const savedScroll = this.scrollPositions.get(targetKey) || 0;
    if (savedScroll > 0) {
      content.scrollTop = savedScroll;
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          if (content && savedScroll > 0 && content.scrollTop !== savedScroll) {
            content.scrollTop = savedScroll;
          }
        });
      }
    }
  }

  private render() {
    const container = this.containerEl.children[1] as HTMLElement;
    if (!container) return;

    // 1. Preserve scroll position of previous content before clearing
    const prevContent = container.querySelector('.lenta-sidebar-content') as HTMLElement | null;
    if (prevContent && !this.isLoading) {
      this.scrollPositions.set(this.currentViewKey, prevContent.scrollTop);
    }
    const prevContainerScrollTop = container.scrollTop;
    const prevLeafScrollTop = this.containerEl.scrollTop;

    const targetKey = this.getScrollKey();
    this.currentViewKey = targetKey;

    container.empty();
    container.addClass('lenta-sidebar-container');
    container.style.minWidth = '300px';

    // ── 1. Toolbar Header ──────────────────────────────────────────────────
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
      badge.title = `Connected containers (${selectedCount}): ${settings.activeContainerIds.join(', ')}`;
    }

    const toolbar = header.createDiv({ cls: 'lenta-sidebar-toolbar' });

    const addBtn = toolbar.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Quick Add Note' } });
    setIcon(addBtn, 'plus');
    addBtn.onclick = () => {
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
      this.expandedContainerFolders.clear();
      this.scrollPositions.clear();
      this.render();
      new Notice('🍋 Все папки и контейнеры свернуты');
    };

    const refreshBtn = toolbar.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': 'Refresh Data' } });
    setIcon(refreshBtn, 'refresh-cw');
    refreshBtn.onclick = () => this.refreshData();

    // ── 2. Top-Level Mode Switcher (Notes vs Containers) ───────────────────
    const modeSwitcher = container.createDiv({ cls: 'lenta-mode-switcher' });
    const notesTab = modeSwitcher.createDiv({
      cls: `lenta-mode-tab ${this.sidebarMode === 'notes' ? 'is-active' : ''}`,
      text: '📝 Notes',
    });
    notesTab.onclick = () => {
      this.sidebarMode = 'notes';
      this.render();
    };

    const containersTab = modeSwitcher.createDiv({
      cls: `lenta-mode-tab ${this.sidebarMode === 'containers' ? 'is-active' : ''}`,
      text: '📦 Containers',
    });
    containersTab.onclick = () => {
      this.sidebarMode = 'containers';
      this.render();
    };

    // ── 3. Mode Content Rendering ──────────────────────────────────────────
    if (this.sidebarMode === 'notes') {
      this.renderNotesMode(container, targetKey);
    } else {
      this.renderContainersMode(container, targetKey);
    }

    if (prevContainerScrollTop > 0) {
      container.scrollTop = prevContainerScrollTop;
    }
    if (prevLeafScrollTop > 0) {
      this.containerEl.scrollTop = prevLeafScrollTop;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Notes Mode: Folders and Feeds
  // ─────────────────────────────────────────────────────────────────────────
  private renderNotesMode(container: HTMLElement, targetKey: string) {
    // Sub-Tabs: Folders vs Feeds (Taxonomy disabled for now)
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

    // Scope Filter Bar (My Folders / Public Folders OR My Feeds / Public Feeds)
    const filterBar = container.createDiv({ cls: 'lenta-scope-filter-bar' });
    const filterOptions: Array<{ id: 'my' | 'public'; label: string; icon: string }> = this.activeTab === 'folders'
      ? [
          { id: 'my', label: 'My Folders', icon: '🔒' },
          { id: 'public', label: 'Public Folders', icon: '🌐' },
        ]
      : [
          { id: 'my', label: 'My Feeds', icon: '🔒' },
          { id: 'public', label: 'Public Feeds', icon: '🌐' },
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

    // Middle Content
    const content = container.createDiv({ cls: 'lenta-sidebar-content' });
    if (this.isLoading) {
      content.createDiv({ cls: 'lenta-loading-text', text: '⏳ Loading hierarchy...' });
    } else if (this.activeTab === 'folders') {
      this.renderFolders(content);
    } else {
      this.renderFeeds(content);
    }

    if (!this.isLoading) {
      this.setupContentScroll(content, targetKey);
    }

    // Sticky Bottom Action Footer
    this.renderQuickAddFooter(container);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Containers Mode: Direct Obsidian Containers Browser with Key Auth
  // ─────────────────────────────────────────────────────────────────────────
  private renderContainersMode(container: HTMLElement, targetKey: string) {
    // 1. Inline Key Authentication Card
    this.renderContainerKeyCard(container);

    // 2. Scope Filter Bar (My Containers / Public Containers)
    const filterBar = container.createDiv({ cls: 'lenta-scope-filter-bar' });
    const filterOptions: Array<{ id: 'my' | 'public'; label: string; icon: string }> = [
      { id: 'my', label: 'My Containers', icon: '🔒' },
      { id: 'public', label: 'Public Containers', icon: '🌐' },
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

    // 3. Middle Content: Containers List
    const content = container.createDiv({ cls: 'lenta-sidebar-content' });
    if (this.isLoading) {
      content.createDiv({ cls: 'lenta-loading-text', text: '⏳ Loading containers...' });
    } else {
      this.renderContainers(content);
    }

    if (!this.isLoading) {
      this.setupContentScroll(content, targetKey);
    }

    // 4. Sticky Bottom Action Footer for Containers
    this.renderContainersFooter(container);
  }

  private renderContainerKeyCard(containerEl: HTMLElement) {
    const keyCard = containerEl.createDiv({ cls: 'lenta-inline-key-card' });
    const settings = this.getSettings();
    const currentKey = settings.containerKey || (settings.activeContainerIds && settings.activeContainerIds[0]) || '';

    if (currentKey) {
      const row = keyCard.createDiv({ cls: 'lenta-key-connected-row' });
      const infoSpan = row.createSpan({ cls: 'lenta-key-badge' });
      infoSpan.setText(`🔑 Connected: ${settings.connectedContainerName || currentKey.slice(0, 18)}`);
      infoSpan.title = `Active container key: ${currentKey}`;

      const disconnectBtn = row.createEl('button', {
        cls: 'lenta-key-action-btn mod-warning',
        text: 'Disconnect Key',
      });
      disconnectBtn.onclick = async () => {
        settings.containerKey = '';
        settings.activeContainerIds = [];
        settings.activeContainerId = '';
        settings.connectedContainerName = '';
        if (this.onSaveSettings) {
          await this.onSaveSettings();
        }
        new Notice('🍋 Container key disconnected');
        await this.refreshData();
      };
    } else {
      const inputWrap = keyCard.createDiv({ cls: 'lenta-key-input-wrap' });
      const input = inputWrap.createEl('input', {
        type: 'text',
        placeholder: '🔑 Enter private container key...',
        value: this.keyInputText,
        cls: 'lenta-key-input',
      });
      input.oninput = (e) => {
        this.keyInputText = (e.target as HTMLInputElement).value;
      };
      input.onkeydown = async (e) => {
        if (e.key === 'Enter') {
          await this.connectKeyAction();
        }
      };

      const connectBtn = inputWrap.createEl('button', {
        cls: 'lenta-btn-lemon lenta-key-connect-btn',
        text: this.isConnectingKey ? 'Connecting...' : 'Connect',
      });
      connectBtn.disabled = this.isConnectingKey;
      connectBtn.onclick = async () => {
        await this.connectKeyAction();
      };
    }
  }

  private async connectKeyAction() {
    const key = this.keyInputText.trim();
    if (!key) {
      new Notice('Please enter a container key');
      return;
    }
    this.isConnectingKey = true;
    this.render();

    try {
      const res = await this.apiClient.connectContainerByKey(key);
      if (res.success && res.container) {
        const settings = this.getSettings();
        settings.containerKey = key;
        if (!settings.activeContainerIds) settings.activeContainerIds = [];
        if (!settings.activeContainerIds.includes(res.container.id)) {
          settings.activeContainerIds.push(res.container.id);
        }
        settings.activeContainerId = res.container.id;
        settings.connectedContainerName = res.container.name;
        settings.connectedContainerType = res.container.type;
        if (this.onSaveSettings) {
          await this.onSaveSettings();
        }
        this.keyInputText = '';
        new Notice(`🍋 Connected to container: ${res.container.name}`);
        await this.refreshData();
      } else {
        new Notice('Could not connect container with provided key');
      }
    } catch (err: any) {
      new Notice(`Connection failed: ${err.message}`);
    } finally {
      this.isConnectingKey = false;
      this.render();
    }
  }

  private renderContainers(container: HTMLElement) {
    if (this.containers.length === 0) {
      container.createDiv({ cls: 'lenta-empty-state', text: 'No containers found on server.' });
      return;
    }

    const myContainers = this.containers.filter((c) => !isContainerPublic(c));
    const publicContainers = this.containers.filter((c) => isContainerPublic(c));
    const displayed = this.scopeFilter === 'my' ? myContainers : publicContainers;

    if (displayed.length === 0) {
      const empty = container.createDiv({ cls: 'lenta-empty-state' });
      if (this.scopeFilter === 'my') {
        empty.createEl('div', { text: '🔒 No private containers found.' });
        empty.createEl('p', {
          cls: 'setting-item-description',
          text: 'Enter your container key above to unlock private user vaults.',
        });
      } else {
        empty.createEl('div', { text: '🌐 No public containers found.' });
      }
      return;
    }

    const list = container.createDiv({ cls: 'lenta-tree-list' });
    for (const item of displayed) {
      this.renderContainerItem(list, item);
    }
  }

  private renderContainerItem(list: HTMLElement, c: LentaContainerSummaryDto) {
    const itemEl = list.createDiv({ cls: 'lenta-tree-item lenta-tree-item-container' });
    const previewKey = `container-${c.id}`;
    const isExpanded = this.expandedPreviews.has(previewKey);
    const settings = this.getSettings();
    const isActiveContainer =
      settings.activeContainerId === c.id ||
      (settings.activeContainerIds && settings.activeContainerIds.includes(c.id));

    // Header row
    const headerRow = itemEl.createDiv({
      cls: `lenta-container-header-row ${isExpanded ? 'is-active' : ''} ${isActiveContainer ? 'is-connected' : ''}`,
    });

    const iconSpan = headerRow.createSpan({ cls: 'lenta-item-icon' });
    setIcon(iconSpan, c.type === 'git' ? 'folder-git' : 'box');

    const nameSpan = headerRow.createSpan({ text: getContainerDisplayTitle(c), cls: 'lenta-item-name' });
    if (isActiveContainer) {
      nameSpan.title = 'Active connected container';
    }

    // Type badge (git / obsidian / simple)
    const typeBadge = headerRow.createSpan({ cls: 'lenta-container-type-badge' });
    typeBadge.setText(c.type || 'obsidian');

    // Count pill
    const countPill = headerRow.createSpan({ cls: 'lenta-count-pill' });
    countPill.setText(`${c.totalNotes ?? 0}`);
    countPill.title = `${c.totalNotes ?? 0} notes/files`;

    // (+) Add Note or Folder to Container button
    const addBtn = headerRow.createEl('span', {
      cls: 'lenta-container-add-btn clickable-icon',
      attr: { 'aria-label': `Create Note or Folder in "${c.name}"` },
    });
    setIcon(addBtn, 'plus');
    addBtn.onclick = (e: MouseEvent) => {
      e.stopPropagation();
      const menu = new Menu();
      menu.addItem((item) => {
        item
          .setTitle('📝 New Note in Container')
          .setIcon('file-plus')
          .onClick(() => {
            this.openQuickAddForContainer(c.id, c.name);
          });
      });
      menu.addItem((item) => {
        item
          .setTitle('📁 New Folder in Container')
          .setIcon('folder-plus')
          .onClick(() => {
            this.openCreateFolderForContainer(c.id, c.name);
          });
      });
      menu.showAtMouseEvent(e);
    };

    // Toggle chevron
    const toggleBtn = headerRow.createEl('span', {
      cls: 'lenta-preview-toggle clickable-icon',
      attr: { 'aria-label': isExpanded ? 'Collapse container' : 'Expand container files' },
    });
    setIcon(toggleBtn, isExpanded ? 'chevron-up' : 'chevron-down');

    headerRow.onclick = async () => {
      if (isExpanded) {
        this.expandedPreviews.delete(previewKey);
        this.render();
      } else {
        this.expandedPreviews.add(previewKey);
        if (!this.containerFilesList.has(c.id) && !this.loadingContainerFilesFor.has(c.id)) {
          this.loadingContainerFilesFor.add(c.id);
          this.render();
          try {
            const [files, cFolders] = await Promise.all([
              this.apiClient.getContainerFiles(c.id).catch(() => []),
              this.apiClient.getFolders({ containerId: c.id, scope: 'all' }).catch(() => []),
            ]);
            this.containerFilesList.set(c.id, files);
            this.containerFoldersList.set(c.id, cFolders);
          } catch {
            this.containerFilesList.set(c.id, []);
            this.containerFoldersList.set(c.id, []);
          } finally {
            this.loadingContainerFilesFor.delete(c.id);
          }
        }
        this.render();
      }
    };

    // Expanded accordion body
    if (isExpanded) {
      const pane = itemEl.createDiv({ cls: 'lenta-markdown-preview-pane lenta-container-tree-pane' });

      // Quick Container Actions Bar
      const actionToolbar = pane.createDiv({ cls: 'lenta-container-action-toolbar' });
      const selectBtn = actionToolbar.createEl('button', {
        cls: `lenta-container-action-btn ${isActiveContainer ? 'is-active' : ''}`,
        text: isActiveContainer ? '✓ Connected' : 'Connect Container',
      });
      selectBtn.onclick = async (e) => {
        e.stopPropagation();
        settings.activeContainerId = c.id;
        if (!settings.activeContainerIds) settings.activeContainerIds = [];
        if (!settings.activeContainerIds.includes(c.id)) {
          settings.activeContainerIds.push(c.id);
        }
        settings.connectedContainerName = c.name;
        settings.connectedContainerType = c.type;
        if (this.onSaveSettings) {
          await this.onSaveSettings();
        }
        new Notice(`🍋 Container "${c.name}" selected as active`);
        this.render();
      };

      const addNoteBtn = actionToolbar.createEl('button', {
        cls: 'lenta-container-action-btn lenta-container-action-btn-add',
        text: '+ Note',
        attr: { 'aria-label': `Create note in "${c.name}"` },
      });
      setIcon(addNoteBtn.createSpan({ cls: 'lenta-btn-inline-icon' }), 'plus');
      addNoteBtn.onclick = (e) => {
        e.stopPropagation();
        this.openQuickAddForContainer(c.id, c.name);
      };

      const addFolderBtn = actionToolbar.createEl('button', {
        cls: 'lenta-container-action-btn lenta-container-action-btn-add',
        text: '+ Folder',
        attr: { 'aria-label': `Create folder in "${c.name}"` },
      });
      setIcon(addFolderBtn.createSpan({ cls: 'lenta-btn-inline-icon' }), 'folder-plus');
      addFolderBtn.onclick = (e) => {
        e.stopPropagation();
        this.openCreateFolderForContainer(c.id, c.name);
      };

      if (this.loadingContainerFilesFor.has(c.id)) {
        pane.createDiv({ cls: 'lenta-preview-loading', text: `⏳ Loading files for "${c.name}"...` });
      } else {
        const files = this.containerFilesList.get(c.id) || [];
        const cFolders = this.containerFoldersList.get(c.id) || [];
        if (files.length === 0 && cFolders.length === 0) {
          pane.createDiv({ cls: 'lenta-preview-empty', text: '📭 No files or folders found in this container.' });
        } else {
          const treeRoot = buildFileTree(files, cFolders);
          const treeContainer = pane.createDiv({ cls: 'lenta-container-tree' });
          this.renderFileTreeNodes(treeContainer, treeRoot, c.id);
        }
      }
    }
  }

  private renderFileTreeNodes(
    parentEl: HTMLElement,
    nodes: ContainerFileTreeNode[],
    containerId: string,
    depth = 0,
    currentFolderPath = ''
  ) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const monthsRu = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    const todayHumanStr = `${now.getDate()} ${monthsRu[now.getMonth()]} ${yyyy} г.`;

    const isTodayMatch = (n: ContainerFileTreeNode): boolean => {
      if (n.type !== 'file') return false;
      if (n.dateStr === todayStr) return true;
      if (n.startDate && n.endDate) {
        const s = n.startDate.slice(0, 10);
        const e = n.endDate.slice(0, 10);
        return todayStr >= s && todayStr <= e;
      }
      return false;
    };

    const hasAnyTodayFile = nodes.some((n) => isTodayMatch(n));
    const datedFileNodes = nodes.filter((n) => n.type === 'file' && n.dateStr);
    let todayMarkerInserted = false;

    const renderTodayMarker = () => {
      if (todayMarkerInserted) return;
      todayMarkerInserted = true;

      const markerEl = parentEl.createDiv({
        cls: 'lenta-tree-today-marker',
        attr: { style: `padding-left: ${depth * 14 + 6}px;` },
      });

      markerEl.createSpan({ cls: 'lenta-today-marker-line' });

      const pill = markerEl.createSpan({ cls: 'lenta-today-marker-pill' });
      const iconSpan = pill.createSpan({ cls: 'lenta-today-pill-icon' });
      setIcon(iconSpan, 'calendar');
      pill.createSpan({ text: `Сегодня: ${todayHumanStr}` });
      pill.createSpan({ cls: 'lenta-today-pill-status', text: '(событий нет)' });

      const addBtn = markerEl.createEl('button', {
        cls: 'lenta-today-marker-add-btn',
        text: '+ Заметка',
        attr: { 'aria-label': `Создать заметку на сегодня (${todayStr}) в этой папке` },
      });
      setIcon(addBtn.createSpan({ cls: 'lenta-btn-inline-icon' }), 'plus');
      addBtn.onclick = (e) => {
        e.stopPropagation();
        this.openQuickAddForContainer(containerId, undefined, currentFolderPath || undefined, todayStr);
      };

      markerEl.createSpan({ cls: 'lenta-today-marker-line' });
    };

    for (const node of nodes) {
      if (!hasAnyTodayFile && datedFileNodes.length > 0 && !todayMarkerInserted) {
        if (node.type === 'file' && node.dateStr && node.dateStr > todayStr) {
          renderTodayMarker();
        }
      }

      if (node.type === 'folder') {
        const folderKey = `${containerId}:${node.path}`;
        const isFolderExpanded = this.expandedContainerFolders.has(folderKey);

        const folderRow = parentEl.createDiv({
          cls: `lenta-tree-node-folder ${isFolderExpanded ? 'is-open' : ''}`,
          attr: { style: `padding-left: ${depth * 14 + 6}px;` },
        });

        const iconEl = folderRow.createSpan({ cls: 'lenta-item-icon' });
        setIcon(iconEl, isFolderExpanded ? 'folder-open' : 'folder');

        folderRow.createSpan({ text: node.name, cls: 'lenta-item-name' });

        if (node.children && node.children.length > 0) {
          folderRow.createSpan({ text: `${node.children.length}`, cls: 'lenta-count-pill' });
        }

        const folderAddBtn = folderRow.createEl('span', {
          cls: 'lenta-folder-add-note clickable-icon',
          attr: { 'aria-label': `Add note or subfolder in ${node.name}` },
        });
        setIcon(folderAddBtn, 'plus');
        folderAddBtn.onclick = (e: MouseEvent) => {
          e.stopPropagation();
          const menu = new Menu();
          menu.addItem((item) => {
            item
              .setTitle(`📝 New Note in "${node.name}"`)
              .setIcon('file-plus')
              .onClick(() => {
                this.openQuickAddForContainer(containerId, undefined, node.path);
              });
          });
          menu.addItem((item) => {
            item
              .setTitle(`📁 New Subfolder in "${node.name}"`)
              .setIcon('folder-plus')
              .onClick(() => {
                this.openCreateFolderForContainer(containerId, undefined, undefined, node.path);
              });
          });
          menu.showAtMouseEvent(e);
        };

        folderRow.onclick = (e) => {
          e.stopPropagation();
          if (isFolderExpanded) {
            this.expandedContainerFolders.delete(folderKey);
          } else {
            this.expandedContainerFolders.add(folderKey);
          }
          this.render();
        };

        if (isFolderExpanded) {
          if (node.children && node.children.length > 0) {
            this.renderFileTreeNodes(parentEl, node.children, containerId, depth + 1, node.path);
          } else {
            const emptyEl = parentEl.createDiv({
              cls: 'lenta-tree-empty-folder',
              attr: { style: `padding-left: ${(depth + 1) * 14 + 10}px; padding-top: 4px; padding-bottom: 4px; font-size: 11px; opacity: 0.7; display: flex; align-items: center; gap: 8px;` },
            });
            emptyEl.createSpan({ text: '📁 (Пустая папка)' });
            const addNoteQuick = emptyEl.createEl('button', {
              cls: 'lenta-container-action-btn lenta-container-action-btn-add',
              text: '+ Заметка',
              attr: { style: 'padding: 2px 6px; font-size: 10px;' },
            });
            addNoteQuick.onclick = (e) => {
              e.stopPropagation();
              this.openQuickAddForContainer(containerId, undefined, node.path);
            };
          }
        }
      } else {
        // File node
        const isToday = isTodayMatch(node);
        const fileRow = parentEl.createDiv({
          cls: `lenta-tree-node-file ${isToday ? 'is-today lenta-tree-node-today' : ''}`,
          attr: { style: `padding-left: ${depth * 14 + 6}px;` },
        });

        const iconEl = fileRow.createSpan({ cls: `lenta-item-icon lenta-note-icon ${isToday ? 'is-today' : ''}` });
        setIcon(iconEl, isToday ? 'calendar-check' : 'file-text');

        const nameSpan = fileRow.createSpan({ text: node.name, cls: `lenta-note-title ${isToday ? 'is-today' : ''}` });
        nameSpan.title = node.path;

        if (isToday) {
          const todayBadge = fileRow.createSpan({ cls: 'lenta-today-badge', text: '📍 СЕГОДНЯ' });
          todayBadge.title = 'Событие сегодняшнего дня';
        }

        if (node.size) {
          const sizeKb = Math.round(node.size / 1024);
          fileRow.createSpan({ text: `${sizeKb || 1} KB`, cls: 'lenta-note-date' });
        }

        fileRow.onclick = async (e) => {
          e.stopPropagation();
          await this.openContainerFileInVault(containerId, node.path, node.name);
        };
      }
    }

    if (!hasAnyTodayFile && datedFileNodes.length > 0 && !todayMarkerInserted) {
      renderTodayMarker();
    }
  }

  private async openContainerFileInVault(containerId: string, filePath: string, fileName: string) {
    const files = this.app.vault.getMarkdownFiles();
    const normalize = (s: string) => s.toLowerCase().replace(/[:\/\\*?"<>|_-]/g, ' ').replace(/\s+/g, ' ').trim();
    const baseWithoutExt = fileName.replace(/\.md$/i, '');
    const normBase = normalize(baseWithoutExt);
    const stripDate = (s: string) => s.replace(/^\d{4}-\d{2}-\d{2}\s*[-–—]?\s*/, '').trim();
    const normNoDate = normalize(stripDate(baseWithoutExt));

    // 1. Exact path ending match or filename match
    let matched = files.find((f) => f.path === filePath || f.path.endsWith('/' + filePath) || f.path.endsWith(filePath));
    if (!matched) {
      matched = files.find((f) => normalize(f.basename) === normBase);
    }
    if (!matched) {
      matched = files.find((f) => normalize(stripDate(f.basename)) === normNoDate);
    }

    if (matched) {
      await this.app.workspace.getLeaf(false).openFile(matched);
      new Notice(`🍋 Opened "${matched.basename}"`);
      return;
    }

    // 2. Not in local vault: check cached content or fetch
    try {
      new Notice(`⏳ Downloading "${fileName}" into vault...`);
      const cachedFiles = this.containerFilesList.get(containerId) || [];
      const fileEntry = cachedFiles.find((f) => f.path === filePath);

      let content = fileEntry?.content;
      if (!content) {
        const fresh = await this.apiClient.getContainerFiles(containerId).catch(() => []);
        const freshEntry = fresh.find((f) => f.path === filePath);
        content = freshEntry?.content;
      }

      if (!content) {
        content = `# ${baseWithoutExt}\n\nDownloaded from container \`${containerId}\`.\n`;
      }

      const root = this.getSettings().vaultRootFolder || 'Lemon-Seasons';
      const cleanRelPath = filePath.replace(/^[\\\/]+/, '');
      const targetPath = `${root}/${cleanRelPath}`;
      const lastSlash = targetPath.lastIndexOf('/');
      if (lastSlash > 0) {
        const parentDir = targetPath.slice(0, lastSlash);
        if (!(await this.app.vault.adapter.exists(parentDir))) {
          await this.app.vault.adapter.mkdir(parentDir);
        }
      }

      const newFile = await this.app.vault.create(targetPath, content);
      await this.app.workspace.getLeaf(false).openFile(newFile);
      new Notice(`🍋 Downloaded & opened "${newFile.basename}"!`);
    } catch (err: any) {
      new Notice(`Failed to open file: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Folders and Feeds Rendering
  // ─────────────────────────────────────────────────────────────────────────
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
    } else {
      if (publicFolders.length === 0) {
        container.createDiv({ cls: 'lenta-empty-state', text: '🌐 No public folders found.' });
        return;
      }
      this.renderFolderList(container, publicFolders, '🌐 Public Folders');
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
    const myFeeds = this.feeds.filter((f) => this.isMyFeed(f));
    const publicFeeds = this.feeds.filter((f) => !this.isMyFeed(f));
    const displayed = this.scopeFilter === 'my' ? myFeeds : publicFeeds;

    if (displayed.length === 0) {
      const empty = container.createDiv({ cls: 'lenta-empty-state' });
      if (this.scopeFilter === 'my') {
        empty.createEl('div', { text: '🔒 No personal (My) feeds found.' });
        empty.createEl('p', {
          cls: 'setting-item-description',
          text: 'Personal feeds let you publish private notes without moderation.',
        });
        const createBtn = empty.createEl('button', {
          cls: 'lenta-btn-lemon',
          text: '+ Create Personal Feed',
        });
        createBtn.style.marginTop = '8px';
        createBtn.onclick = async () => {
          try {
            const newFeed = await this.apiClient.createFeed({
              title: 'My Notes',
              slug: 'my-notes',
              description: 'Personal notes and reflections feed',
            });
            new Notice(`🍋 Created feed: ${newFeed.title}`);
            await this.refreshData();
          } catch (err: any) {
            new Notice(`Failed to create feed: ${err.message}`);
          }
        };
      } else {
        empty.createEl('div', { text: '🌐 No public feeds configured.' });
      }
      return;
    }

    const list = container.createDiv({ cls: 'lenta-tree-list' });
    for (const feed of displayed) {
      this.renderFeedItem(list, feed);
    }
  }

  private renderFeedItem(list: HTMLElement, feed: LentaFeedDto) {
    const item = list.createDiv({ cls: 'lenta-tree-item lenta-tree-item-feed' });
    const previewKey = `feed-${feed.id}`;
    const isExpanded = this.expandedPreviews.has(previewKey);

    // Header row
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

    // Accordion Pane
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

    // 2. Secondary lookup: Normalized title comparison
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

    // 4. If file is not yet in local vault: On-demand download and open
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

      const mdContent = LentaFrontmatterUtil.serializeNoteToMarkdown(note as any);
      const newFile = await this.app.vault.create(targetPath, mdContent);
      await this.app.workspace.getLeaf(false).openFile(newFile);
      new Notice(`🍋 Downloaded & opened "${newFile.basename}"!`);
    } catch (err: any) {
      new Notice(`📄 ${note.title} (${note.startDate ? note.startDate.slice(0, 10) : 'Lenta'})`);
    }
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
      this.onOpenQuickAdd(this.selectedFolderId || undefined, this.selectedFolderPath || undefined);
    };
  }

  private renderContainersFooter(container: HTMLElement) {
    const footer = container.createDiv({ cls: 'lenta-sidebar-footer' });
    const settings = this.getSettings();
    const activeId =
      settings.activeContainerId ||
      (settings.activeContainerIds && settings.activeContainerIds[0]) ||
      this.containers.find((c) => !isContainerPublic(c))?.id ||
      this.containers[0]?.id;

    const activeContainer = this.containers.find((c) => c.id === activeId);
    const containerName = activeContainer?.name || 'Container';

    // 1. Pull / Sync container button
    const syncBtn = footer.createEl('button', {
      cls: 'lenta-footer-btn lenta-footer-btn-secondary',
      text: '⚡ Sync',
      attr: { 'aria-label': `Sync container "${containerName}"` },
    });
    syncBtn.onclick = async () => {
      if (this.onQuickPull) {
        await this.onQuickPull();
      } else {
        this.onOpenSyncModal('pull');
      }
    };

    // 2. Add Folder button
    const addFolderBtn = footer.createEl('button', {
      cls: 'lenta-footer-btn lenta-footer-btn-secondary',
      text: '+ Folder',
      attr: {
        'aria-label': activeId
          ? `Create folder in container "${containerName}"`
          : 'Create folder in container',
      },
    });
    setIcon(addFolderBtn.createSpan(), 'folder-plus');
    addFolderBtn.onclick = () => {
      if (!activeId) {
        new Notice('Please select or connect a container first');
        return;
      }
      this.openCreateFolderForContainer(activeId, containerName);
    };

    // 3. Add Note button
    const addNoteBtn = footer.createEl('button', {
      cls: 'lenta-footer-btn lenta-footer-btn-primary',
      text: '+ Note',
      attr: {
        'aria-label': activeId
          ? `Create note in container "${containerName}"`
          : 'Create note in container',
      },
    });
    setIcon(addNoteBtn.createSpan(), 'plus');
    addNoteBtn.onclick = () => {
      if (!activeId) {
        new Notice('Please select or connect a container first');
        return;
      }
      this.openQuickAddForContainer(activeId, containerName);
    };
  }
}
