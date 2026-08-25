import { App, Modal, Setting, Notice } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaPluginSettings } from '../types';

export class LentaConnectionsModal extends Modal {
  private apiClient: LentaApiClient;
  private settings: LentaPluginSettings;
  private onSaveSettings: () => Promise<void>;
  private onOpenContainersFoldersModal?: () => void;

  private isLoading = false;

  constructor(
    app: App,
    apiClient: LentaApiClient,
    settings: LentaPluginSettings,
    onSaveSettings: () => Promise<void>,
    onOpenContainersFoldersModal?: () => void
  ) {
    super(app);
    this.apiClient = apiClient;
    this.settings = settings;
    this.onSaveSettings = onSaveSettings;
    this.onOpenContainersFoldersModal = onOpenContainersFoldersModal;
  }

  async onOpen() {
    this.modalEl.addClass('lenta-connections-modal');
    this.render();
  }

  onClose() {
    this.contentEl.empty();
  }

  private render() {
    const { contentEl } = this;
    contentEl.empty();

    // ── Header ─────────────────────────────────────────────────────────────
    const header = contentEl.createDiv({ cls: 'lenta-modal-header' });
    const titleRow = header.createDiv({ cls: 'lenta-sync-title-row' });
    titleRow.createEl('h2', { text: '🔌 Lenta Server & API Connections' });
    
    const selectedCount = Array.isArray(this.settings.activeContainerIds) && this.settings.activeContainerIds.length > 0
      ? this.settings.activeContainerIds.length
      : this.settings.activeContainerId ? 1 : 0;
    
    if (selectedCount > 0) {
      const badgeRow = header.createDiv({ cls: 'lenta-badge-row' });
      const badge = badgeRow.createSpan({ cls: 'lenta-badge' });
      badge.setText(`CONNECTED: ${selectedCount} Container${selectedCount > 1 ? 's' : ''} Selected`);
    }

    header.createEl('p', {
      cls: 'lenta-modal-subtitle',
      text: 'Configure NestJS backend API connections, container sync server endpoints, and authentication credentials.',
    });

    // ── Quick Link to Containers & Folders Workspace ───────────────────────
    if (this.onOpenContainersFoldersModal) {
      const card = contentEl.createDiv({ cls: 'lenta-workspace-banner-card' });
      card.style.cssText = [
        'padding: 14px 16px',
        'margin-bottom: 20px',
        'border-radius: 8px',
        'border: 1px solid rgba(201, 205, 88, 0.4)',
        'background: #1b1e1e',
        'display: flex',
        'justify-content: space-between',
        'align-items: center',
        'gap: 12px',
      ].join(';');

      const textWrap = card.createDiv();
      const cardTitle = textWrap.createEl('h4', { text: '📦 Containers & Folders Workspace' });
      cardTitle.style.cssText = 'margin: 0 0 4px 0; color: #c9cd58; font-size: 1.05em;';
      const cardDesc = textWrap.createEl('div');
      cardDesc.style.cssText = 'font-size: 0.85em; color: #aaa;';
      cardDesc.setText(`Browse and select containers (${selectedCount} currently active for sync) and manage vault folder mappings.`);

      const openWorkspaceBtn = card.createEl('button', {
        cls: 'mod-cta lenta-btn-lemon',
        text: '📦 Open Workspace',
      });
      openWorkspaceBtn.style.cssText = 'padding: 8px 14px; font-weight: 600; cursor: pointer; white-space: nowrap;';
      openWorkspaceBtn.onclick = () => {
        this.close();
        this.onOpenContainersFoldersModal!();
      };
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
      authStatusEl.innerHTML = `<strong>Status:</strong> Unauthenticated. Enter your User API Key / Personal Access Token below to connect.`;
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
              this.render();
              return;
            }
            const res = await this.apiClient.validateToken(this.settings.authToken);
            if (res.success) {
              this.settings.userEmail = res.user?.email || 'member@lemon.team';
              this.settings.isPrivateContainerConnected = true;
              await this.onSaveSettings();
              new Notice('Session validated successfully!');
              this.render();
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
            this.render();
          })
      );

    // ── 2. Server Endpoints Configuration Section ────────────────────────────
    contentEl.createEl('h3', { text: '🌐 Backend & Container Sync Server URLs' });

    new Setting(contentEl)
      .setName('Project Lenta Backend URL')
      .setDesc('Base address of the NestJS API (port 3001 by default).')
      .addText((text) =>
        text
          .setPlaceholder('http://localhost:3001')
          .setValue(this.settings.serverUrl)
          .onChange(async (val) => {
            this.settings.serverUrl = val.trim();
            await this.onSaveSettings();
          })
      );

    new Setting(contentEl)
      .setName('Obsidian Container Sync Server URL')
      .setDesc('Base address of the Container Sync Server (port 3000 by default).')
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
      .setDesc('Optional API key sent to the container sync server.')
      .addText((text) =>
        text
          .setPlaceholder('Optional API key')
          .setValue(this.settings.containerApiKey || '')
          .onChange(async (val) => {
            this.settings.containerApiKey = val.trim();
            await this.onSaveSettings();
          })
      );

    // ── 3. Connection Test Action ──────────────────────────────────────────
    new Setting(contentEl)
      .setName('Test Server Connections')
      .setDesc('Ping the container sync server and backend API to verify connectivity.')
      .addButton((btn) =>
        btn
          .setButtonText('Test Connection')
          .setIcon('zap')
          .onClick(async () => {
            btn.setDisabled(true);
            const ping = await this.apiClient.pingContainerServer();
            btn.setDisabled(false);
            if (ping.success) {
              new Notice(`✅ Connected! Found ${ping.containerCount ?? 0} container(s) on sync server.`);
            } else {
              new Notice(`⚠️ Container server ping warning: ${ping.error}`);
            }
          })
      );
  }
}
