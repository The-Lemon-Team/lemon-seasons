import { App, Modal, Setting, Notice } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaSyncEngine } from '../services/lenta-sync-engine';
import { LentaPluginSettings, LentaContainerSummaryDto, LentaFolderDto } from '../types';
import { isContainerPublic } from '../utils/container-privacy';

export class LentaContainersFoldersModal extends Modal {
  private apiClient: LentaApiClient;
  private settings: LentaPluginSettings;
  private onSaveSettings: () => Promise<void>;
  private onOpenConnectionsModal?: () => void;
  private syncEngine?: LentaSyncEngine;

  private containers: LentaContainerSummaryDto[] = [];
  private folders: LentaFolderDto[] = [];
  private savedSelectedIds: Set<string> = new Set();
  private stagedSelectedIds: Set<string> = new Set();
  private isLoading = false;
  private isConnecting = false;
  private activeSyncingContainerId: string | null = null;
  private completedSyncContainerIds: Set<string> = new Set();
  private searchQuery = '';
  private categoryTab: 'user' | 'feeds' = 'user';
  private privacyFilter: 'public' | 'private' | 'all' = 'public';
  private customKeyInput = '';

  constructor(
    app: App,
    apiClient: LentaApiClient,
    settings: LentaPluginSettings,
    onSaveSettings: () => Promise<void>,
    onOpenConnectionsModal?: () => void,
    syncEngine?: LentaSyncEngine
  ) {
    super(app);
    this.apiClient = apiClient;
    this.settings = settings;
    this.onSaveSettings = onSaveSettings;
    this.onOpenConnectionsModal = onOpenConnectionsModal;
    this.syncEngine = syncEngine;

    // Initialize selection states from settings
    const initialList = Array.isArray(settings.activeContainerIds) && settings.activeContainerIds.length > 0
      ? settings.activeContainerIds
      : settings.activeContainerId ? [settings.activeContainerId] : [];
    this.savedSelectedIds = new Set(initialList);
    this.stagedSelectedIds = new Set(initialList);
  }

  async onOpen() {
    this.modalEl.addClass('lenta-containers-folders-modal');
    await this.loadData();
  }

  onClose() {
    this.contentEl.empty();
  }

  private async loadData() {
    this.isLoading = true;
    this.render();

    try {
      const [containers, folders] = await Promise.all([
        this.apiClient.listContainers({ fetchAll: true }).catch(() => []),
        this.apiClient.getFolders().catch(() => []),
      ]);
      this.containers = containers;
      this.folders = folders;

      let list: string[] = [];
      if (Array.isArray(this.settings.activeContainerIds) && this.settings.activeContainerIds.length > 0) {
        list = this.settings.activeContainerIds;
      } else if (this.settings.activeContainerId) {
        list = [this.settings.activeContainerId];
      }
      this.savedSelectedIds = new Set(list);
      this.stagedSelectedIds = new Set(list);
    } catch (err) {
      console.warn('Failed to load containers or folders:', err);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  private async persistSelection() {
    const list = Array.from(this.stagedSelectedIds);
    this.settings.activeContainerIds = list;
    this.settings.activeContainerId = list[0] || '';
    
    // Update connected metadata if single or primary matched
    if (list.length > 0) {
      const matched = this.containers.find((c) => c.id === list[0]);
      if (matched) {
        this.settings.connectedContainerName = list.length === 1 ? matched.name : `${list.length} Containers Selected`;
        this.settings.connectedContainerType = matched.type;
        this.settings.containerKey = list.join(',');
      }
    } else {
      this.settings.connectedContainerName = '';
      this.settings.containerKey = '';
    }

    await this.onSaveSettings();
  }

  private getHasStagedChanges(): boolean {
    if (this.savedSelectedIds.size !== this.stagedSelectedIds.size) return true;
    for (const id of this.stagedSelectedIds) {
      if (!this.savedSelectedIds.has(id)) return true;
    }
    return false;
  }

  private toggleStagedSelection = (containerId: string) => {
    const listEl = this.contentEl.querySelector('#lenta-containers-compact-list') as HTMLElement;
    const savedListScrollTop = listEl ? listEl.scrollTop : 0;
    const savedContentScrollTop = this.contentEl ? this.contentEl.scrollTop : 0;

    if (this.stagedSelectedIds.has(containerId)) {
      this.stagedSelectedIds.delete(containerId);
    } else {
      this.stagedSelectedIds.add(containerId);
    }
    this.renderContainersList();
    this.renderHeaderAndMappingInfo();

    if (listEl) {
      listEl.scrollTop = savedListScrollTop;
    }
    if (this.contentEl) {
      this.contentEl.scrollTop = savedContentScrollTop;
    }
  };

  private applyConnectionAndUpdateFiles = async () => {
    if (this.isConnecting) return;
    this.isConnecting = true;
    this.activeSyncingContainerId = null;
    this.completedSyncContainerIds.clear();
    this.render();

    try {
      await this.persistSelection();
      this.savedSelectedIds = new Set(this.stagedSelectedIds);

      let totalDownloaded = 0;
      const rootFolder = this.settings.vaultRootFolder || 'Lenta';

      if (this.syncEngine && this.stagedSelectedIds.size > 0) {
        new Notice(`⏳ Downloading structure & files for ${this.stagedSelectedIds.size} connected container(s)...`);

        for (const containerId of Array.from(this.stagedSelectedIds)) {
          this.activeSyncingContainerId = containerId;
          this.renderContainersList();
          this.renderHeaderAndMappingInfo();

          const matched = this.containers.find((c) => c.id === containerId);
          const name = matched ? matched.name : containerId;
          const result = await this.syncEngine.syncContainerFiles(containerId, name);
          totalDownloaded += result.downloadedFiles;

          this.completedSyncContainerIds.add(containerId);
          this.renderContainersList();
          this.renderHeaderAndMappingInfo();
        }

        this.activeSyncingContainerId = null;
        this.renderContainersList();
        this.renderHeaderAndMappingInfo();

        // Reconcile field-level Last-Write-Wins (LWW) changes
        await this.syncEngine.pullChanges().catch((err) => {
          console.warn('Sync engine pull error:', err);
        });
      }

      const connectedCount = this.savedSelectedIds.size;
      new Notice(
        `🍋 Connected & updated! ${totalDownloaded} file(s) saved into "${rootFolder}" (${connectedCount} container(s) active)`
      );
    } catch (err: any) {
      new Notice(`Failed to update container connection: ${err.message}`);
    } finally {
      this.isConnecting = false;
      this.activeSyncingContainerId = null;
      this.completedSyncContainerIds.clear();
      this.render();
    }
  };

  private render() {
    const { contentEl } = this;
    contentEl.empty();

    // ── Header ─────────────────────────────────────────────────────────────
    const header = contentEl.createDiv({ cls: 'lenta-modal-header' });
    const titleRow = header.createDiv({ cls: 'lenta-sync-title-row' });
    titleRow.createEl('h2', { text: '📦 Containers & Folders Workspace' });

    const badgeRow = header.createDiv({ cls: 'lenta-badge-row' });
    badgeRow.id = 'lenta-modal-header-badge-row';
    this.renderHeaderBadge(badgeRow);

    header.createEl('p', {
      cls: 'lenta-modal-subtitle',
      text: 'Step 1: Select or deselect containers. Step 2: Click Connect & Update Files to apply changes to your vault.',
    });

    // ── Primary Category Tabs (User Containers vs Feeds) ─────────────────────
    const categoryBar = contentEl.createDiv({ cls: 'lenta-category-tabs-bar' });
    categoryBar.style.cssText = [
      'display: flex',
      'gap: 10px',
      'margin-bottom: 14px',
      'border-bottom: 2px solid var(--background-modifier-border, #333)',
      'padding-bottom: 2px',
    ].join(';');

    const isFeedContainer = (c: LentaContainerSummaryDto) => c.isFeed === true || c.id.startsWith('feed-') || c.scope?.type === 'feed';
    const userContainersCount = this.containers.filter((c) => !isFeedContainer(c)).length;
    const feedContainersCount = this.containers.filter((c) => isFeedContainer(c)).length;

    const categoryOptions: Array<{ id: 'user' | 'feeds'; label: string; icon: string; count: number }> = [
      { id: 'user', label: 'User Containers', icon: '👤', count: userContainersCount },
      { id: 'feeds', label: 'Feeds', icon: '📰', count: feedContainersCount },
    ];

    for (const cat of categoryOptions) {
      const isSelected = this.categoryTab === cat.id;
      const catBtn = categoryBar.createEl('button', {
        cls: `lenta-category-tab ${isSelected ? 'is-active' : ''}`,
      });
      catBtn.disabled = this.isConnecting;
      catBtn.style.cssText = `
        padding: 8px 16px;
        font-weight: 700;
        font-size: 0.9em;
        border: none;
        border-bottom: 3px solid ${isSelected ? 'var(--lenta-lemon, #c9cd58)' : 'transparent'};
        background: ${isSelected ? 'var(--background-primary-alt, rgba(255, 255, 255, 0.05))' : 'transparent'};
        color: ${isSelected ? 'var(--text-normal, #fff)' : 'var(--text-muted, #888)'};
        cursor: ${this.isConnecting ? 'not-allowed' : 'pointer'};
        border-radius: 6px 6px 0 0;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;
      `;

      catBtn.innerHTML = `<span>${cat.icon} ${cat.label}</span> <span class="lenta-count-pill" style="font-size:0.8em; padding:2px 7px; border-radius:10px; background:var(--background-secondary-alt);">${cat.count}</span>`;

      catBtn.onclick = () => {
        if (this.isConnecting) return;
        this.categoryTab = cat.id;
        this.privacyFilter = 'public'; // Default to Public privacy filter when switching tabs
        this.render();
      };
    }

    // ── Toolbar Controls Bar ───────────────────────────────────────────────
    const toolbar = contentEl.createDiv({ cls: 'lenta-containers-toolbar' });
    toolbar.style.cssText = [
      'display: flex',
      'gap: 10px',
      'align-items: center',
      'flex-wrap: wrap',
      'margin-bottom: 16px',
      'padding: 10px 14px',
      'background: var(--background-secondary)',
      'border-radius: 8px',
      'border: 1px solid var(--background-modifier-border)',
    ].join(';');

    // Search Input
    const searchWrap = toolbar.createDiv({ cls: 'lenta-search-wrap' });
    searchWrap.style.cssText = 'flex: 1; min-width: 160px;';
    const searchInput = searchWrap.createEl('input', {
      type: 'text',
      placeholder: '🔍 Search containers...',
      value: this.searchQuery,
    });
    searchInput.disabled = this.isConnecting;
    searchInput.style.cssText = `width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid #444; background: #1a1d1d; color: #fff; ${this.isConnecting ? 'opacity: 0.6; cursor: not-allowed;' : ''}`;
    searchInput.oninput = (e) => {
      if (this.isConnecting) return;
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.renderContainersList();
    };

    // Privacy Sub-Filter Segmented Tabs (evaluated within current categoryTab)
    const filterWrap = toolbar.createDiv({ cls: 'lenta-privacy-filter-tabs' });

    const activeCategoryContainers = this.containers.filter((c) =>
      this.categoryTab === 'user' ? !isFeedContainer(c) : isFeedContainer(c)
    );

    const checkContainerPublic = (c: LentaContainerSummaryDto) => isContainerPublic(c);
    const publicContainersCount = activeCategoryContainers.filter((c) => checkContainerPublic(c)).length;
    const privateContainersCount = activeCategoryContainers.filter((c) => !checkContainerPublic(c)).length;
    const allContainersCount = activeCategoryContainers.length;

    const filterOptions: Array<{ id: 'public' | 'private' | 'all'; label: string; icon: string; count: number }> = [
      { id: 'public', label: 'Public', icon: '📰', count: publicContainersCount },
      { id: 'private', label: 'Private', icon: '🔐', count: privateContainersCount },
      { id: 'all', label: 'All', icon: '🌐', count: allContainersCount },
    ];

    for (const opt of filterOptions) {
      const isSelected = this.privacyFilter === opt.id;
      const tabBtn = filterWrap.createEl('button', {
        cls: `lenta-privacy-tab ${isSelected ? 'is-active' : ''}`,
      });
      tabBtn.disabled = this.isConnecting;

      tabBtn.innerHTML = `<span>${opt.icon} ${opt.label}</span> <span class="lenta-privacy-tab-count">${opt.count}</span>`;

      tabBtn.onclick = () => {
        if (this.isConnecting) return;
        this.privacyFilter = opt.id;
        this.render();
      };
    }

    // Bulk Select / Deselect All
    const selectAllBtn = toolbar.createEl('button', {
      text: 'Select All',
    });
    selectAllBtn.disabled = this.isConnecting;
    selectAllBtn.style.cssText = `padding: 6px 12px; font-size: 0.85em; font-weight: 600; ${this.isConnecting ? 'opacity: 0.5; cursor: not-allowed;' : ''}`;
    selectAllBtn.onclick = () => {
      if (this.isConnecting) return;
      const filtered = this.getFilteredContainers();
      for (const c of filtered) {
        this.stagedSelectedIds.add(c.id);
      }
      this.renderContainersList();
      this.renderHeaderAndMappingInfo();
    };

    const deselectAllBtn = toolbar.createEl('button', {
      text: 'Clear All',
    });
    deselectAllBtn.disabled = this.isConnecting;
    deselectAllBtn.style.cssText = `padding: 6px 12px; font-size: 0.85em; font-weight: 600; ${this.isConnecting ? 'opacity: 0.5; cursor: not-allowed;' : ''}`;
    deselectAllBtn.onclick = () => {
      if (this.isConnecting) return;
      this.stagedSelectedIds.clear();
      this.renderContainersList();
      this.renderHeaderAndMappingInfo();
    };

    // Refresh Containers Button
    const refreshBtn = toolbar.createEl('button', {
      cls: 'mod-cta lenta-btn-lemon',
      text: '🔄 Refresh List',
    });
    refreshBtn.disabled = this.isConnecting;
    refreshBtn.style.cssText = `padding: 6px 14px; font-weight: 600; font-size: 0.85em; ${this.isConnecting ? 'opacity: 0.5; cursor: not-allowed;' : ''}`;
    refreshBtn.onclick = () => {
      if (this.isConnecting) return;
      this.loadData();
    };

    // Open Connections Modal shortcut button if available
    if (this.onOpenConnectionsModal) {
      const connBtn = toolbar.createEl('button', {
        text: '🔌 Server Settings',
      });
      connBtn.style.cssText = 'padding: 6px 12px; font-size: 0.85em;';
      connBtn.onclick = () => {
        this.close();
        this.onOpenConnectionsModal!();
      };
    }

    // ── Main Content Area ──────────────────────────────────────────────────
    if (this.isLoading) {
      contentEl.createDiv({ cls: 'lenta-loading-text', text: '⏳ Loading containers and folder structures...' });
      return;
    }

    // Container Selection Compact List Section
    const listSection = contentEl.createDiv({ cls: 'lenta-containers-list-section' });
    const listHeaderRow = listSection.createDiv({ cls: 'lenta-list-header-row' });
    listHeaderRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';
    
    listHeaderRow.createEl('h3', { text: 'Step 1: Select Containers to Connect or Disconnect' });
    const countSummary = listHeaderRow.createSpan({ cls: 'lenta-count-pill' });
    countSummary.id = 'lenta-staged-count-summary';
    countSummary.style.cssText = 'font-weight: 600; font-size: 0.85em; padding: 4px 10px; border-radius: 12px; background: var(--lenta-lemon-glow); color: var(--lenta-lemon);';
    countSummary.setText(`${this.stagedSelectedIds.size} of ${this.containers.length} containers staged`);

    const listEl = listSection.createDiv({ cls: 'lenta-containers-compact-list' });
    listEl.id = 'lenta-containers-compact-list';
    this.renderContainersList(listEl);

    // ── Step 2: Connect & Update Files Action Bar ───────────────────────────
    const actionBar = listSection.createDiv({ cls: 'lenta-connect-action-bar' });
    actionBar.id = 'lenta-connect-action-bar';
    this.renderConnectActionBar(actionBar);

    // ── Direct Connect by Key ───────────────────────────────────────────────
    const keySection = contentEl.createDiv({ cls: 'lenta-key-section' });
    keySection.style.cssText = 'margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--background-modifier-border);';
    
    new Setting(keySection)
      .setName('Connect Container by Custom Key')
      .setDesc('Add a custom container key or feed key to your selected containers list.')
      .addText((text) =>
        text
          .setPlaceholder('e.g. cont-workspace-prod or feed-science')
          .setValue(this.customKeyInput)
          .onChange((val) => {
            this.customKeyInput = val.trim();
          })
      )
      .addButton((btn) =>
        btn
          .setButtonText('+ Add & Connect Key')
          .setCta()
          .onClick(async () => {
            if (!this.customKeyInput) {
              new Notice('Please enter a container key');
              return;
            }
            const res = await this.apiClient.connectContainerByKey(this.customKeyInput);
            if (res.success && res.container) {
              this.stagedSelectedIds.add(res.container.id);
              await this.applyConnectionAndUpdateFiles();
              new Notice(`Added container: ${res.container.name}`);
              await this.loadData();
            } else {
              new Notice(`Failed to connect container: ${res.error || 'Unknown error'}`);
            }
          })
      );

    // ── Vault Root & Folders Workspace ──────────────────────────────────────
    const folderSection = contentEl.createDiv({ cls: 'lenta-folders-workspace-section' });
    folderSection.style.cssText = 'margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--background-modifier-border);';

    folderSection.createEl('h3', { text: '📁 Vault Root & Multi-Container Folders Workspace' });

    new Setting(folderSection)
      .setName('Vault Root Directory')
      .setDesc('Base folder in your Obsidian vault where synced notes are saved.')
      .addText((text) =>
        text
          .setPlaceholder('Lenta')
          .setValue(this.settings.vaultRootFolder || 'Lenta')
          .onChange(async (val) => {
            this.settings.vaultRootFolder = val.trim() || 'Lenta';
            await this.onSaveSettings();
            this.renderFolderMappingInfo(folderMappingEl);
          })
      );

    const folderMappingEl = folderSection.createDiv({ cls: 'lenta-folder-mapping-box' });
    folderMappingEl.id = 'lenta-folder-mapping-box';
    this.renderFolderMappingInfo(folderMappingEl);

    // Remote Folders Overview
    folderSection.createEl('h4', { text: 'Remote Lenta Server Folders' });
    if (this.folders.length === 0) {
      folderSection.createDiv({ cls: 'lenta-empty-state', text: 'No folders found on Lenta server.' });
    } else {
      const folderList = folderSection.createDiv({ cls: 'lenta-tree-list' });
      for (const folder of this.folders) {
        const item = folderList.createDiv({ cls: 'lenta-tree-item lenta-tree-item-folder' });
        item.createSpan({ text: folder.icon ? `${folder.icon} ` : '📁 ', cls: 'lenta-item-icon' });
        item.createSpan({ text: folder.path, cls: 'lenta-item-name' });
        if (folder.noteCount) {
          item.createSpan({ text: `${folder.noteCount} notes`, cls: 'lenta-count-pill' });
        }
      }
    }
  }

  private renderHeaderBadge(container: HTMLElement) {
    container.empty();
    const count = this.savedSelectedIds.size;
    let totalNotesSelected = 0;
    for (const c of this.containers) {
      if (this.savedSelectedIds.has(c.id) && typeof c.totalNotes === 'number') {
        totalNotesSelected += c.totalNotes;
      }
    }

    if (count > 0) {
      const badge = container.createSpan({ cls: 'lenta-badge' });
      badge.setText(`ACTIVE CONNECTED: ${count} Container${count > 1 ? 's' : ''} (${totalNotesSelected} Notes)`);
    } else {
      const badge = container.createSpan({ cls: 'lenta-badge' });
      badge.style.borderColor = '#d97706';
      badge.style.color = '#f59e0b';
      badge.setText('NO CONTAINERS CONNECTED');
    }
  }

  private renderConnectActionBar(container: HTMLElement) {
    container.empty();
    container.style.cssText = [
      'display: flex',
      'justify-content: space-between',
      'align-items: center',
      'gap: 12px',
      'margin-top: 12px',
      'padding: 12px 16px',
      'background: var(--background-secondary)',
      'border-radius: 8px',
      'border: 1px solid var(--lenta-lemon-glow)',
    ].join(';');

    const hasChanges = this.getHasStagedChanges();
    const stagedCount = this.stagedSelectedIds.size;

    const infoWrap = container.createDiv({ cls: 'lenta-connect-info' });
    const infoTitle = infoWrap.createEl('div', { cls: 'lenta-connect-step-title' });
    infoTitle.style.cssText = 'font-weight: 700; font-size: 0.9em; color: var(--lenta-lemon);';
    infoTitle.setText('Step 2: Connect & Update Files');

    const infoDesc = infoWrap.createEl('div', { cls: 'lenta-connect-step-desc' });
    infoDesc.style.cssText = 'font-size: 0.8em; color: var(--text-muted); margin-top: 2px;';

    if (hasChanges) {
      const added = Array.from(this.stagedSelectedIds).filter((id) => !this.savedSelectedIds.has(id)).length;
      const removed = Array.from(this.savedSelectedIds).filter((id) => !this.stagedSelectedIds.has(id)).length;
      infoDesc.setText(`Pending changes: ${added > 0 ? `+${added} connect ` : ''}${removed > 0 ? `-${removed} disconnect` : ''}. Click Connect to update vault files.`);
    } else {
      infoDesc.setText(`${stagedCount} container${stagedCount === 1 ? '' : 's'} connected for active vault work.`);
    }

    const connectBtn = container.createEl('button', {
      cls: 'mod-cta lenta-btn-lemon lenta-connect-main-btn',
      text: this.isConnecting ? '⏳ Connecting & Updating Files...' : (hasChanges ? '🔌 Connect & Update Files' : '🔌 Re-Connect & Refresh Files'),
    });
    connectBtn.disabled = this.isConnecting;
    connectBtn.style.cssText = 'padding: 8px 18px; font-weight: 700; font-size: 0.9em; cursor: pointer; white-space: nowrap;';

    connectBtn.onclick = async () => {
      await this.applyConnectionAndUpdateFiles();
    };
  }

  private renderHeaderAndMappingInfo() {
    const summary = this.contentEl.querySelector('#lenta-staged-count-summary');
    if (summary) {
      if (this.isConnecting) {
        if (this.activeSyncingContainerId) {
          const count = this.completedSyncContainerIds.size + 1;
          summary.setText(`⏳ Loading container ${count} of ${this.stagedSelectedIds.size}...`);
        } else {
          summary.setText('⏳ Connecting & loading files...');
        }
      } else {
        summary.setText(`${this.stagedSelectedIds.size} of ${this.containers.length} containers staged`);
      }
    }

    const actionBar = this.contentEl.querySelector('#lenta-connect-action-bar') as HTMLElement;
    if (actionBar) {
      this.renderConnectActionBar(actionBar);
    }

    const mappingEl = this.contentEl.querySelector('#lenta-folder-mapping-box') as HTMLElement;
    if (mappingEl) {
      this.renderFolderMappingInfo(mappingEl);
    }
  }

  private getFilteredContainers(): LentaContainerSummaryDto[] {
    return this.containers.filter((c) => {
      const isFeed = c.isFeed === true || c.id.startsWith('feed-') || c.scope?.type === 'feed';
      const matchCategory = this.categoryTab === 'user' ? !isFeed : isFeed;

      const matchSearch = !this.searchQuery || c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || c.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      const isPublic = isContainerPublic(c);
      const matchPrivacy = this.privacyFilter === 'all' || (this.privacyFilter === 'public' && isPublic) || (this.privacyFilter === 'private' && !isPublic);
      return matchCategory && matchSearch && matchPrivacy;
    });
  }

  private renderFolderMappingInfo(container: HTMLElement) {
    container.empty();
    const rootFolder = this.settings.vaultRootFolder || 'Lenta';
    const selectedList = Array.from(this.stagedSelectedIds);

    container.style.cssText = [
      'padding: 12px 14px',
      'margin-bottom: 14px',
      'border-radius: 6px',
      'border: 1px solid #3b4242',
      'background: #181b1b',
      'font-size: 0.88em',
      'color: #d1d5db',
    ].join(';');

    if (selectedList.length === 0) {
      container.innerHTML = `
        <div style="font-weight:600; color:#f59e0b;">⚠️ No Containers Selected</div>
        <div style="font-size:0.85em; margin-top:4px; color:#888;">Select one or more containers above to map vault directories.</div>
      `;
      return;
    }

    const pathsHtml = selectedList.map((id) => {
      const matched = this.containers.find((c) => c.id === id);
      const name = matched ? matched.name : id;
      const isSaved = this.savedSelectedIds.has(id);
      return `<div style="margin-top:2px;">• <code>${rootFolder}/${name}</code> ${!isSaved ? '<span style="color:#4ade80; font-size:0.8em; margin-left:6px;">(Staged to connect)</span>' : ''}</div>`;
    }).join('');

    container.innerHTML = `
      <div style="font-weight:600; margin-bottom:4px; color:#c9cd58;">📍 Vault Directory Mappings Preview (${selectedList.length}):</div>
      ${pathsHtml}
      <div style="font-size:0.85em; margin-top:6px; color:#888;">Synced notes for selected containers will be organized in these directories inside your Obsidian vault when you click Connect.</div>
    `;
  }

  private renderContainersList(targetEl?: HTMLElement) {
    const listEl = targetEl || (this.contentEl.querySelector('#lenta-containers-compact-list') as HTMLElement);
    if (!listEl) return;
    const savedListScrollTop = listEl.scrollTop;
    const savedContentScrollTop = this.contentEl ? this.contentEl.scrollTop : 0;

    listEl.empty();

    if (this.isConnecting) {
      listEl.addClass('is-locked');
      listEl.addClass('is-loading-all');
    } else {
      listEl.removeClass('is-locked');
      listEl.removeClass('is-loading-all');
    }

    const filtered = this.getFilteredContainers();

    if (filtered.length === 0) {
      listEl.createDiv({ cls: 'lenta-empty-state', text: 'No containers match your search or filter.' });
      if (this.contentEl) this.contentEl.scrollTop = savedContentScrollTop;
      return;
    }

    for (const c of filtered) {
      const isStaged = this.stagedSelectedIds.has(c.id);
      const isSaved = this.savedSelectedIds.has(c.id);

      let rowClass = 'lenta-container-row';
      if (this.isConnecting) {
        rowClass += ' is-locked';
      }
      if (c.id === this.activeSyncingContainerId) {
        rowClass += ' is-syncing';
      } else if (this.completedSyncContainerIds.has(c.id)) {
        rowClass += ' is-sync-done';
      }

      if (isStaged) {
        rowClass += ' is-selected';
      }
      if (isStaged && !isSaved) {
        rowClass += ' is-pending-connect';
      } else if (!isStaged && isSaved) {
        rowClass += ' is-pending-disconnect';
      }

      const row = listEl.createDiv({ cls: rowClass });

      // Left Column: Checkbox + Icon + Title & ID
      const leftCol = row.createDiv({ cls: 'lenta-container-row-left' });
      
      const checkbox = leftCol.createEl('input', {
        type: 'checkbox',
        cls: 'lenta-container-checkbox',
      });
      checkbox.checked = isStaged;
      checkbox.disabled = this.isConnecting;
      checkbox.onclick = (e) => {
        e.stopPropagation();
        if (this.isConnecting) return;
        this.toggleStagedSelection(c.id);
      };

      leftCol.createSpan({ cls: 'lenta-container-icon', text: '📦' });

      const titleWrap = leftCol.createDiv({ cls: 'lenta-container-title-wrap' });
      titleWrap.createSpan({ cls: 'lenta-container-title', text: c.name });
      titleWrap.createSpan({ cls: 'lenta-container-id', text: c.id });

      // Right Column: Type, Privacy badge, Notes count, Select/Status Button
      const rightCol = row.createDiv({ cls: 'lenta-container-row-right' });

      const typeTag = rightCol.createSpan({ cls: 'lenta-badge' });
      typeTag.setText((c.type || 'git').toUpperCase());

      const isPub = isContainerPublic(c);
      const privacyTag = rightCol.createSpan({ cls: `lenta-badge ${isPub ? 'is-public' : 'is-private'}` });
      privacyTag.setText(isPub ? 'PUBLIC' : 'PRIVATE');

      if (typeof c.totalNotes === 'number') {
        const notesTag = rightCol.createSpan({ cls: 'lenta-count-pill' });
        notesTag.setText(`📄 ${c.totalNotes}`);
      }

      let btnText = isStaged ? '✓ Selected' : '+ Select';
      let btnClass = `lenta-select-btn ${isStaged ? 'is-selected' : ''}`;

      if (this.isConnecting) {
        if (c.id === this.activeSyncingContainerId) {
          btnText = '⏳ Loading...';
          btnClass = 'lenta-select-btn is-loading is-syncing';
        } else if (this.completedSyncContainerIds.has(c.id)) {
          btnText = '✓ Updated';
          btnClass = 'lenta-select-btn is-completed';
        } else if (isStaged) {
          btnText = '⏳ Pending...';
          btnClass = 'lenta-select-btn is-pending-sync';
        }
      } else {
        if (isStaged && !isSaved) {
          btnText = '+ Connect';
          btnClass += ' is-staged-add';
        } else if (!isStaged && isSaved) {
          btnText = '✕ Disconnect';
          btnClass += ' is-staged-remove';
        } else if (isStaged && isSaved) {
          btnText = '✓ Connected';
        }
      }

      const selectBtn = rightCol.createEl('button', {
        cls: btnClass,
        text: btnText,
      });
      selectBtn.disabled = this.isConnecting;
      selectBtn.onclick = (e) => {
        e.stopPropagation();
        if (this.isConnecting) return;
        this.toggleStagedSelection(c.id);
      };

      row.onclick = (e) => {
        if (this.isConnecting) return;
        const targetTag = (e.target as HTMLElement).tagName.toUpperCase();
        if (targetTag !== 'INPUT' && targetTag !== 'BUTTON') {
          this.toggleStagedSelection(c.id);
        }
      };
    }

    listEl.scrollTop = savedListScrollTop;
    if (this.contentEl) {
      this.contentEl.scrollTop = savedContentScrollTop;
    }
  }
}
