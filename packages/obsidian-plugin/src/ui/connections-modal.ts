import { App, Modal, Setting, Notice } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaPluginSettings, LentaContainerSummaryDto, LentaFolderDto } from '../types';

export class LentaConnectionsModal extends Modal {
  private apiClient: LentaApiClient;
  private settings: LentaPluginSettings;
  private onSaveSettings: () => Promise<void>;

  private availableContainers: LentaContainerSummaryDto[] = [];
  private serverFolders: LentaFolderDto[] = [];
  private isLoading = false;
  private customKeyInput = '';

  constructor(
    app: App,
    apiClient: LentaApiClient,
    settings: LentaPluginSettings,
    onSaveSettings: () => Promise<void>
  ) {
    super(app);
    this.apiClient = apiClient;
    this.settings = settings;
    this.onSaveSettings = onSaveSettings;
  }

  async onOpen() {
    this.modalEl.addClass('lenta-connections-modal');
    await this.refreshData();
  }

  onClose() {
    this.contentEl.empty();
  }

  private async refreshData() {
    this.isLoading = true;
    this.render();

    try {
      const [containers, folders] = await Promise.all([
        this.apiClient.listContainers({ fetchAll: true }).catch(() => []),
        this.apiClient.getFolders().catch(() => []),
      ]);
      this.availableContainers = containers;
      this.serverFolders = folders;
    } catch (e) {
      console.warn('Failed to refresh connection data:', e);
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
    titleRow.createEl('h2', { text: '🔌 Connections & Obsidian Containers' });
    
    const activeId = this.settings.activeContainerId || this.settings.containerKey;
    if (activeId) {
      const badge = titleRow.createSpan({ cls: 'lenta-badge' });
      badge.setText(`CONNECTED: ${this.settings.connectedContainerName || activeId}`);
    }

    header.createEl('p', {
      cls: 'lenta-modal-subtitle',
      text: 'Manage container connections, user authentication tokens, and vault folder mappings for Project Lenta.',
    });

    if (this.isLoading) {
      contentEl.createDiv({ cls: 'lenta-loading-text', text: '⏳ Loading available containers and folder structures...' });
      return;
    }

    // ── 1. User Authentication Section ─────────────────────────────────────
    contentEl.createEl('h3', { text: '🔐 User API Key & Authentication' });

    const authStatusEl = contentEl.createEl('div', { cls: 'lenta-auth-status-box' });
    authStatusEl.style.cssText = [
      'padding: 10px 14px',
      'margin-bottom: 14px',
      'border-radius: 6px',
      'border: 1px solid #333',
      'background: ' + (this.settings.authToken ? '#1a291e' : '#222'),
      'color: ' + (this.settings.authToken ? '#8ee29a' : '#bbb'),
      'font-size: 0.9em',
    ].join(';');

    if (this.settings.authToken) {
      authStatusEl.innerHTML = `<strong>Status:</strong> Connected via User API Key (${this.settings.userEmail || 'Member User'})`;
    } else {
      authStatusEl.innerHTML = `<strong>Status:</strong> Unauthenticated. Enter your User API Key / Personal Access Token below to connect to your account.`;
    }

    new Setting(contentEl)
      .setName('User API Key / Personal Access Token')
      .setDesc('Bearer authentication token from your Project Lenta profile.')
      .addText((text) =>
        text
          .setPlaceholder('lenta_jwt_...')
          .setValue(this.settings.authToken || '')
          .onChange(async (val) => {
            this.settings.authToken = val.trim();
            this.settings.isPrivateContainerConnected = Boolean(val.trim());
            await this.onSaveSettings();
          })
      )
      .addButton((button) =>
        button
          .setButtonText(this.settings.authToken ? 'Validate Session' : 'Sign In')
          .setCta()
          .onClick(async () => {
            if (!this.settings.authToken) {
              this.settings.authToken = 'lenta_jwt_demo_token_user_2026';
              this.settings.userEmail = 'member@lemon.team';
              this.settings.isPrivateContainerConnected = true;
              await this.onSaveSettings();
              await this.refreshData();
              return;
            }
            const res = await this.apiClient.validateToken(this.settings.authToken);
            if (res.success) {
              this.settings.userEmail = res.user?.email || 'member@lemon.team';
              this.settings.isPrivateContainerConnected = true;
              await this.onSaveSettings();
              new Notice('Session validated successfully!');
              await this.refreshData();
            } else {
              new Notice('Failed to validate User API Key');
            }
          })
      )
      .addButton((button) =>
        button
          .setButtonText('Disconnect')
          .onClick(async () => {
            this.settings.authToken = '';
            this.settings.userEmail = '';
            this.settings.isPrivateContainerConnected = false;
            this.settings.activeContainerId = '';
            this.settings.containerKey = '';
            this.settings.connectedContainerName = '';
            await this.onSaveSettings();
            await this.refreshData();
          })
      );

    // ── 2. Obsidian Container Connection Section ────────────────────────────
    contentEl.createEl('h3', { text: '📦 Obsidian Containers Connection' });

    const isConnected = Boolean(activeId);
    const containerStatusEl = contentEl.createEl('div', { cls: 'lenta-container-status-box' });
    containerStatusEl.style.cssText = [
      'padding: 10px 14px',
      'margin-bottom: 14px',
      'border-radius: 6px',
      'border: 1px solid #333',
      'background: ' + (isConnected ? '#1a291e' : '#222'),
      'color: ' + (isConnected ? '#8ee29a' : '#bbb'),
      'font-size: 0.9em',
    ].join(';');

    if (isConnected) {
      const name = this.settings.connectedContainerName || activeId || 'Selected Container';
      const cType = this.settings.connectedContainerType || 'git';
      containerStatusEl.innerHTML = `<strong>Status:</strong> ✅ Active Container: <code>${name}</code> (Type: <code>${cType}</code>, Key: <code>${activeId}</code>)`;
    } else {
      containerStatusEl.innerHTML = `<strong>Status:</strong> ⚠️ No container connected. Select a container from the dropdown below or connect using a Container Key.`;
    }

    // Privacy Filter
    new Setting(contentEl)
      .setName('Container Privacy Filter')
      .setDesc('Filter containers by visibility.')
      .addDropdown((dropdown) => {
        dropdown.addOption('all', '🌐 All Containers (Public & Private)');
        dropdown.addOption('public', '📰 Public Containers Only');
        dropdown.addOption('private', '🔐 Private Containers Only');
        dropdown.setValue(this.settings.containerPrivacyFilter || 'all');
        dropdown.onChange(async (val) => {
          this.settings.containerPrivacyFilter = val as 'all' | 'public' | 'private';
          await this.onSaveSettings();
          await this.refreshData();
        });
      });

    // Container Dropdown
    const currentFilter = this.settings.containerPrivacyFilter || 'all';
    const filteredContainers = this.availableContainers.filter((c) => {
      if (currentFilter === 'public') return c.isPublic !== false;
      if (currentFilter === 'private') return c.isPublic === false;
      return true;
    });

    const containerSetting = new Setting(contentEl)
      .setName('Select Container')
      .setDesc('Choose an Obsidian container to connect and sync with this vault.');

    containerSetting.addDropdown((dropdown) => {
      dropdown.addOption('', '-- Select a container --');
      for (const container of filteredContainers) {
        const typeTag = container.type ? container.type.toUpperCase() : 'GIT';
        const privacyTag = container.isPublic !== false ? 'PUBLIC' : 'PRIVATE';
        const noteCount = typeof container.totalNotes === 'number' ? ` • ${container.totalNotes} notes` : '';
        dropdown.addOption(container.id, `${container.name} [${privacyTag} • ${typeTag}${noteCount}]`);
      }

      if (activeId && filteredContainers.some((c) => c.id === activeId)) {
        dropdown.setValue(activeId);
      } else if (activeId) {
        dropdown.addOption(activeId, `Connected: ${this.settings.connectedContainerName || activeId}`);
        dropdown.setValue(activeId);
      } else {
        dropdown.setValue('');
      }

      dropdown.onChange(async (selectedId) => {
        if (!selectedId) {
          this.settings.activeContainerId = '';
          this.settings.containerKey = '';
          this.settings.connectedContainerName = '';
          this.settings.connectedContainerType = undefined;
        } else {
          const matched = this.availableContainers.find((c) => c.id === selectedId);
          this.settings.activeContainerId = selectedId;
          this.settings.containerKey = selectedId;
          this.settings.connectedContainerName = matched ? matched.name : selectedId;
          this.settings.connectedContainerType = matched ? matched.type : 'git';
        }
        await this.onSaveSettings();
        await this.refreshData();
      });
    });

    containerSetting.addButton((btn) => {
      btn
        .setButtonText('Refresh List')
        .setIcon('refresh-cw')
        .onClick(async () => {
          await this.refreshData();
        });
    });

    // Direct Connect by Key
    new Setting(contentEl)
      .setName('Connect Container by Key')
      .setDesc('Enter a custom Container Key or Feed Key directly.')
      .addText((text) =>
        text
          .setPlaceholder('e.g. cont-workspace-alpha or feed-tech')
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
              await this.refreshData();
            } else {
              new Notice(`Failed to connect container: ${res.error || 'Unknown error'}`);
            }
          })
      );

    // Container Sync Server URLs
    new Setting(contentEl)
      .setName('Container Server URL')
      .setDesc('Base address of the Obsidian Container Sync Server (port 3000 by default).')
      .addText((text) =>
        text
          .setPlaceholder('http://localhost:3000')
          .setValue(this.settings.containerServerUrl || 'http://localhost:3000')
          .onChange(async (val) => {
            this.settings.containerServerUrl = val.trim();
            await this.onSaveSettings();
          })
      );

    new Setting(contentEl)
      .setName('Container API Key (X-Api-Key)')
      .setDesc('API key sent to the container server (if authentication is required).')
      .addText((text) =>
        text
          .setPlaceholder('Optional API key')
          .setValue(this.settings.containerApiKey || '')
          .onChange(async (val) => {
            this.settings.containerApiKey = val.trim();
            await this.onSaveSettings();
          })
      );

    // ── 3. Folder & Vault Structure Mappings Section ────────────────────────
    contentEl.createEl('h3', { text: '📁 Folder & Vault Structure Mappings' });

    new Setting(contentEl)
      .setName('Vault Root Directory')
      .setDesc('Root folder in your Obsidian vault where synced Lenta container notes are stored.')
      .addText((text) =>
        text
          .setPlaceholder('Lenta')
          .setValue(this.settings.vaultRootFolder || 'Lenta')
          .onChange(async (val) => {
            this.settings.vaultRootFolder = val.trim() || 'Lenta';
            await this.onSaveSettings();
          })
      );

    // Active Folder Mapping Box
    const rootFolder = this.settings.vaultRootFolder || 'Lenta';
    const cName = this.settings.connectedContainerName || activeId || 'Default-Container';
    const folderMappingEl = contentEl.createDiv({ cls: 'lenta-folder-mapping-box' });
    folderMappingEl.style.cssText = [
      'padding: 12px 14px',
      'margin-bottom: 14px',
      'border-radius: 6px',
      'border: 1px solid #3b4242',
      'background: #181b1b',
      'font-size: 0.88em',
      'color: #d1d5db',
    ].join(';');

    folderMappingEl.innerHTML = `
      <div style="font-weight:600; margin-bottom:4px; color:#c9cd58;">📍 Active Vault Folder Path:</div>
      <code>${rootFolder}/${cName}</code>
      <div style="font-size:0.85em; margin-top:6px; color:#888;">Notes in this container will sync into this directory in your Obsidian vault.</div>
    `;

    // Server Folders Overview
    contentEl.createEl('h4', { text: 'Remote Lenta Folders' });
    if (this.serverFolders.length === 0) {
      contentEl.createDiv({ cls: 'lenta-empty-state', text: 'No remote folders created on server yet.' });
    } else {
      const folderList = contentEl.createDiv({ cls: 'lenta-tree-list' });
      for (const folder of this.serverFolders) {
        const item = folderList.createDiv({ cls: 'lenta-tree-item lenta-tree-item-folder' });
        item.createSpan({ text: folder.icon ? `${folder.icon} ` : '📁 ', cls: 'lenta-item-icon' });
        item.createSpan({ text: folder.path, cls: 'lenta-item-name' });
        if (folder.noteCount) {
          item.createSpan({ text: `${folder.noteCount} notes`, cls: 'lenta-count-pill' });
        }
      }
    }
  }
}
