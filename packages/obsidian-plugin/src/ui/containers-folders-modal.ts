import { App, Modal, Setting, Notice, setIcon } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaPluginSettings, LentaContainerSummaryDto, LentaFolderDto } from '../types';

export class LentaContainersFoldersModal extends Modal {
  private apiClient: LentaApiClient;
  private settings: LentaPluginSettings;
  private onSaveSettings: () => Promise<void>;
  private onOpenConnectionsModal?: () => void;

  private containers: LentaContainerSummaryDto[] = [];
  private folders: LentaFolderDto[] = [];
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
    } catch (err) {
      console.warn('Failed to load containers or folders:', err);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  private render() {
    const { contentEl } = this;
    contentEl.empty();

    // ── Header ─────────────────────────────────────────────────────────────
    const header = contentEl.createDiv({ cls: 'lenta-modal-header' });
    const titleRow = header.createDiv({ cls: 'lenta-sync-title-row' });
    titleRow.createEl('h2', { text: '📦 Containers & Folders Workspace' });

    const activeId = this.settings.activeContainerId || this.settings.containerKey;
    if (activeId) {
      const badge = titleRow.createSpan({ cls: 'lenta-badge' });
      badge.setText(`ACTIVE: ${this.settings.connectedContainerName || activeId}`);
    } else {
      const badge = titleRow.createSpan({ cls: 'lenta-badge' });
      badge.style.borderColor = '#d97706';
      badge.style.color = '#f59e0b';
      badge.setText('NO CONTAINER CONNECTED');
    }

    header.createEl('p', {
      cls: 'lenta-modal-subtitle',
      text: 'Browse and load all available containers, select a container for active vault work, and configure folder mappings.',
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
    searchWrap.style.cssText = 'flex: 1; min-width: 180px;';
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

    // Load All Containers Button
    const refreshBtn = toolbar.createEl('button', {
      cls: 'mod-cta lenta-btn-lemon',
      text: '🔄 Load All Containers',
    });
    refreshBtn.style.cssText = 'padding: 6px 14px; font-weight: 600; font-size: 0.9em;';
    refreshBtn.onclick = () => this.loadData();

    // Open Connections Modal shortcut button if available
    if (this.onOpenConnectionsModal) {
      const connBtn = toolbar.createEl('button', {
        text: '🔌 Server Settings',
      });
      connBtn.style.cssText = 'padding: 6px 12px; font-size: 0.9em;';
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
    gridContainer.createEl('h3', { text: '📦 Available Obsidian Containers' });

    const gridEl = gridContainer.createDiv({ cls: 'lenta-containers-grid' });
    gridEl.id = 'lenta-containers-grid-list';
    this.renderContainersGrid(gridEl);

    // ── Direct Connect by Key ───────────────────────────────────────────────
    const keySection = contentEl.createDiv({ cls: 'lenta-key-section' });
    keySection.style.cssText = 'margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--background-modifier-border);';
    
    new Setting(keySection)
      .setName('Connect Container by Custom Key')
      .setDesc('Directly input a container or feed key if not listed in default overview.')
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
          .setButtonText('Connect Key')
          .setCta()
          .onClick(async () => {
            if (!this.customKeyInput) {
              new Notice('Please enter a container key');
              return;
            }
            const res = await this.apiClient.connectContainerByKey(this.customKeyInput);
            if (res.success && res.container) {
              this.settings.activeContainerId = res.container.id;
              this.settings.containerKey = res.container.id;
              this.settings.connectedContainerName = res.container.name;
              this.settings.connectedContainerType = res.container.type;
              await this.onSaveSettings();
              new Notice(`Connected to container: ${res.container.name}`);
              await this.loadData();
            } else {
              new Notice(`Failed to connect container: ${res.error || 'Unknown error'}`);
            }
          })
      );

    // ── Vault Root & Folders Workspace ──────────────────────────────────────
    const folderSection = contentEl.createDiv({ cls: 'lenta-folders-workspace-section' });
    folderSection.style.cssText = 'margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--background-modifier-border);';

    folderSection.createEl('h3', { text: '📁 Vault Root & Container Folders Workspace' });

    new Setting(folderSection)
      .setName('Vault Root Directory')
      .setDesc('Base folder in your Obsidian vault where synced Lenta notes are saved.')
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

  private renderFolderMappingInfo(container: HTMLElement) {
    container.empty();
    const rootFolder = this.settings.vaultRootFolder || 'Lenta';
    const activeId = this.settings.activeContainerId || this.settings.containerKey;
    const cName = this.settings.connectedContainerName || activeId || 'Default-Container';

    container.style.cssText = [
      'padding: 12px 14px',
      'margin-bottom: 14px',
      'border-radius: 6px',
      'border: 1px solid #3b4242',
      'background: #181b1b',
      'font-size: 0.88em',
      'color: #d1d5db',
    ].join(';');

    container.innerHTML = `
      <div style="font-weight:600; margin-bottom:4px; color:#c9cd58;">📍 Connected Vault Path:</div>
      <code>${rootFolder}/${cName}</code>
      <div style="font-size:0.85em; margin-top:6px; color:#888;">Synced notes for this container will be organized in this directory inside your Obsidian vault.</div>
    `;
  }

  private renderContainersGrid(targetEl?: HTMLElement) {
    const gridEl = targetEl || this.contentEl.querySelector('#lenta-containers-grid-list');
    if (!gridEl) return;
    gridEl.empty();

    const filtered = this.containers.filter((c) => {
      const matchSearch = !this.searchQuery || c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || c.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      const isPublic = c.isPublic !== false;
      const matchPrivacy = this.privacyFilter === 'all' || (this.privacyFilter === 'public' && isPublic) || (this.privacyFilter === 'private' && !isPublic);
      return matchSearch && matchPrivacy;
    });

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

    const activeId = this.settings.activeContainerId || this.settings.containerKey;

    for (const c of filtered) {
      const isSelected = activeId === c.id;
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
      ].join(';');

      const topRow = card.createDiv({ cls: 'lenta-card-top' });
      const title = topRow.createEl('h4', { text: c.name });
      title.style.cssText = 'margin: 0 0 6px 0; font-size: 1em; color: var(--text-normal); font-weight: 600;';

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
        text: isSelected ? '✓ Active Container' : 'Use Container',
      });
      actionBtn.style.cssText = 'width: 100%; margin-top: 4px; padding: 6px 12px; font-weight: 600; cursor: pointer;';
      actionBtn.disabled = isSelected;

      actionBtn.onclick = async () => {
        this.settings.activeContainerId = c.id;
        this.settings.containerKey = c.id;
        this.settings.connectedContainerName = c.name;
        this.settings.connectedContainerType = c.type;
        await this.onSaveSettings();
        new Notice(`Switched active container to: ${c.name}`);
        this.render();
      };
    }
  }
}
