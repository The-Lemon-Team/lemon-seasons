import { App, Modal, Setting, Notice } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaPluginSettings, LentaContainerSummaryDto, LentaFolderDto } from '../types';

export class LentaContainersFoldersModal extends Modal {
  private apiClient: LentaApiClient;
  private settings: LentaPluginSettings;
  private onSaveSettings: () => Promise<void>;
  private onOpenConnectionsModal?: () => void;

  private containers: LentaContainerSummaryDto[] = [];
  private folders: LentaFolderDto[] = [];
  private selectedIds: Set<string> = new Set();
  private isLoading = false;
  private searchQuery = '';
  private privacyFilter: 'all' | 'public' | 'private' = 'all';
  private customKeyInput = '';

  constructor(
    app: App,
    apiClient: LentaApiClient,
    settings: LentaPluginSettings,
    onSaveSettings: () => Promise<void>,
    onOpenConnectionsModal?: () => void
  ) {
    super(app);
    this.apiClient = apiClient;
    this.settings = settings;
    this.onSaveSettings = onSaveSettings;
    this.onOpenConnectionsModal = onOpenConnectionsModal;

    // Initialize selectedIds from settings
    const initialList = Array.isArray(settings.activeContainerIds) && settings.activeContainerIds.length > 0
      ? settings.activeContainerIds
      : settings.activeContainerId ? [settings.activeContainerId] : [];
    this.selectedIds = new Set(initialList);
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

      // Sync activeContainerIds in settings if set
      if (Array.isArray(this.settings.activeContainerIds) && this.settings.activeContainerIds.length > 0) {
        this.selectedIds = new Set(this.settings.activeContainerIds);
      } else if (this.settings.activeContainerId) {
        this.selectedIds = new Set([this.settings.activeContainerId]);
      }
    } catch (err) {
      console.warn('Failed to load containers or folders:', err);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  private async persistSelection() {
    const list = Array.from(this.selectedIds);
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

  private render() {
    const { contentEl } = this;
    contentEl.empty();

    // Calculate selection statistics
    const count = this.selectedIds.size;
    let totalNotesSelected = 0;
    for (const c of this.containers) {
      if (this.selectedIds.has(c.id) && typeof c.totalNotes === 'number') {
        totalNotesSelected += c.totalNotes;
      }
    }

    // ── Header ─────────────────────────────────────────────────────────────
    const header = contentEl.createDiv({ cls: 'lenta-modal-header' });
    const titleRow = header.createDiv({ cls: 'lenta-sync-title-row' });
    titleRow.createEl('h2', { text: '📦 Containers & Folders Workspace' });

    if (count > 0) {
      const badge = titleRow.createSpan({ cls: 'lenta-badge' });
      badge.setText(`CONNECTED: ${count} Container${count > 1 ? 's' : ''} Selected (${totalNotesSelected} Notes)`);
    } else {
      const badge = titleRow.createSpan({ cls: 'lenta-badge' });
      badge.style.borderColor = '#d97706';
      badge.style.color = '#f59e0b';
      badge.setText('NO CONTAINERS SELECTED');
    }

    header.createEl('p', {
      cls: 'lenta-modal-subtitle',
      text: 'Browse and select multiple obsidian containers for active vault work, track note counts, and manage folder structures.',
    });

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
    searchInput.style.cssText = 'width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid #444; background: #1a1d1d; color: #fff;';
    searchInput.oninput = (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.renderContainersGrid();
    };

    // Privacy Filter
    const filterWrap = toolbar.createDiv();
    const filterSelect = filterWrap.createEl('select');
    filterSelect.style.cssText = 'padding: 6px 10px; border-radius: 6px; border: 1px solid #444; background: #1a1d1d; color: #fff;';
    filterSelect.innerHTML = `
      <option value="all" ${this.privacyFilter === 'all' ? 'selected' : ''}>🌐 All Containers</option>
      <option value="public" ${this.privacyFilter === 'public' ? 'selected' : ''}>📰 Public Only</option>
      <option value="private" ${this.privacyFilter === 'private' ? 'selected' : ''}>🔐 Private Only</option>
    `;
    filterSelect.onchange = (e) => {
      this.privacyFilter = (e.target as HTMLSelectElement).value as any;
      this.renderContainersGrid();
    };

    // Bulk Select / Deselect All
    const selectAllBtn = toolbar.createEl('button', {
      text: 'Select All',
    });
    selectAllBtn.style.cssText = 'padding: 6px 12px; font-size: 0.85em; font-weight: 600;';
    selectAllBtn.onclick = async () => {
      const filtered = this.getFilteredContainers();
      for (const c of filtered) {
        this.selectedIds.add(c.id);
      }
      await this.persistSelection();
      this.render();
    };

    const deselectAllBtn = toolbar.createEl('button', {
      text: 'Clear All',
    });
    deselectAllBtn.style.cssText = 'padding: 6px 12px; font-size: 0.85em; font-weight: 600;';
    deselectAllBtn.onclick = async () => {
      this.selectedIds.clear();
      await this.persistSelection();
      this.render();
    };

    // Load All Containers Button
    const refreshBtn = toolbar.createEl('button', {
      cls: 'mod-cta lenta-btn-lemon',
      text: '🔄 Refresh List',
    });
    refreshBtn.style.cssText = 'padding: 6px 14px; font-weight: 600; font-size: 0.85em;';
    refreshBtn.onclick = () => this.loadData();

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

    // Container Cards Grid Container
    const gridContainer = contentEl.createDiv({ cls: 'lenta-containers-grid-section' });
    const gridHeaderRow = gridContainer.createDiv({ cls: 'lenta-grid-header-row' });
    gridHeaderRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';
    
    gridHeaderRow.createEl('h3', { text: '📦 Select Containers to Connect', href: '#' });
    const countSummary = gridHeaderRow.createSpan({ cls: 'lenta-count-pill' });
    countSummary.style.cssText = 'font-weight: 600; font-size: 0.85em; padding: 4px 10px; border-radius: 12px; background: var(--lenta-lemon-glow); color: var(--lenta-lemon);';
    countSummary.setText(`${count} of ${this.containers.length} containers selected`);

    const gridEl = gridContainer.createDiv({ cls: 'lenta-containers-grid' });
    gridEl.id = 'lenta-containers-grid-list';
    this.renderContainersGrid(gridEl);

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
              this.selectedIds.add(res.container.id);
              await this.persistSelection();
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

  private getFilteredContainers(): LentaContainerSummaryDto[] {
    return this.containers.filter((c) => {
      const matchSearch = !this.searchQuery || c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || c.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      const isPublic = c.isPublic !== false;
      const matchPrivacy = this.privacyFilter === 'all' || (this.privacyFilter === 'public' && isPublic) || (this.privacyFilter === 'private' && !isPublic);
      return matchSearch && matchPrivacy;
    });
  }

  private renderFolderMappingInfo(container: HTMLElement) {
    container.empty();
    const rootFolder = this.settings.vaultRootFolder || 'Lenta';
    const selectedList = Array.from(this.selectedIds);

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
      return `<div style="margin-top:2px;">• <code>${rootFolder}/${name}</code></div>`;
    }).join('');

    container.innerHTML = `
      <div style="font-weight:600; margin-bottom:4px; color:#c9cd58;">📍 Active Connected Vault Directory Mappings (${selectedList.length}):</div>
      ${pathsHtml}
      <div style="font-size:0.85em; margin-top:6px; color:#888;">Synced notes for selected containers will be organized in these directories inside your Obsidian vault.</div>
    `;
  }

  private renderContainersGrid(targetEl?: HTMLElement) {
    const gridEl = targetEl || this.contentEl.querySelector('#lenta-containers-grid-list');
    if (!gridEl) return;
    gridEl.empty();

    const filtered = this.getFilteredContainers();

    if (filtered.length === 0) {
      gridEl.createDiv({ cls: 'lenta-empty-state', text: 'No containers match your search or filter.' });
      return;
    }

    gridEl.style.cssText = [
      'display: grid',
      'grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))',
      'gap: 14px',
      'margin-top: 10px',
    ].join(';');

    for (const c of filtered) {
      const isSelected = this.selectedIds.has(c.id);
      const card = gridEl.createDiv({ cls: `lenta-container-card ${isSelected ? 'selected' : ''}` });
      card.style.cssText = [
        'padding: 14px',
        'border-radius: 8px',
        'border: 1px solid ' + (isSelected ? 'var(--lenta-lemon)' : 'var(--background-modifier-border)'),
        'background: ' + (isSelected ? '#1c241d' : 'var(--background-secondary)'),
        'display: flex',
        'flex-direction: column',
        'justify-content: space-between',
        'gap: 10px',
        'transition: all 0.15s ease',
        'cursor: pointer',
      ].join(';');

      const topRow = card.createDiv({ cls: 'lenta-card-top' });
      const titleRow = topRow.createDiv({ cls: 'lenta-card-title-row' });
      titleRow.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;';

      const title = titleRow.createEl('h4', { text: c.name });
      title.style.cssText = 'margin: 0; font-size: 0.98em; color: var(--text-normal); font-weight: 600;';

      const checkBadge = titleRow.createSpan({ cls: 'lenta-check-badge' });
      checkBadge.style.cssText = `font-size: 0.85em; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${isSelected ? 'var(--lenta-lemon)' : '#333'}; color: ${isSelected ? '#121414' : '#888'};`;
      checkBadge.setText(isSelected ? '✓ SELECTED' : '+ ADD');

      const tagsRow = topRow.createDiv({ cls: 'lenta-card-tags' });
      tagsRow.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;';

      const typeTag = tagsRow.createSpan({ cls: 'lenta-badge' });
      typeTag.setText((c.type || 'git').toUpperCase());

      const privacyTag = tagsRow.createSpan({ cls: 'lenta-badge' });
      const isPub = c.isPublic !== false;
      privacyTag.setText(isPub ? 'PUBLIC' : 'PRIVATE');
      privacyTag.style.borderColor = isPub ? 'rgba(74, 222, 128, 0.4)' : 'rgba(248, 113, 113, 0.4)';
      privacyTag.style.color = isPub ? '#4ade80' : '#f87171';

      if (typeof c.totalNotes === 'number') {
        const notesTag = topRow.createDiv({ cls: 'lenta-card-notes' });
        notesTag.style.cssText = 'font-size: 0.82em; color: var(--text-muted);';
        notesTag.setText(`📄 ${c.totalNotes} notes`);
      }

      // Action Button
      const actionBtn = card.createEl('button', {
        cls: isSelected ? 'mod-cta lenta-btn-lemon' : 'lenta-action-btn',
        text: isSelected ? '✓ Selected' : '+ Select Container',
      });
      actionBtn.style.cssText = 'width: 100%; margin-top: 4px; padding: 6px 12px; font-weight: 600; cursor: pointer;';

      const toggleSelection = async () => {
        if (this.selectedIds.has(c.id)) {
          this.selectedIds.delete(c.id);
        } else {
          this.selectedIds.add(c.id);
        }
        await this.persistSelection();
        this.render();
      };

      actionBtn.onclick = (e) => {
        e.stopPropagation();
        toggleSelection();
      };

      card.onclick = () => {
        toggleSelection();
      };
    }
  }
}
