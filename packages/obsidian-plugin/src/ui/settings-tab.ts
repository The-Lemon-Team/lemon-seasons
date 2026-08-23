import { App, PluginSettingTab, Setting } from 'obsidian';
import type WorkspaceLentaPlugin from '../main';
import { ConflictStrategy } from '../types';

export class LentaSettingTab extends PluginSettingTab {
  plugin: WorkspaceLentaPlugin;

  constructor(app: App, plugin: WorkspaceLentaPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: '🍋 Lemon Lenta Plugin Settings' });

    // --- Authentication & Private Containers Section ---
    containerEl.createEl('h3', { text: '🔐 Authentication & Private Vault Container' });
    const authStatusEl = containerEl.createEl('div', {
      cls: 'lenta-auth-status-box',
    });
    authStatusEl.style.padding = '10px 14px';
    authStatusEl.style.marginBottom = '14px';
    authStatusEl.style.borderRadius = '6px';
    authStatusEl.style.border = '1px solid #333';
    authStatusEl.style.background = this.plugin.settings.authToken ? '#1a291e' : '#222';
    authStatusEl.style.color = this.plugin.settings.authToken ? '#8ee29a' : '#bbb';

    if (this.plugin.settings.authToken) {
      authStatusEl.innerHTML = `<strong>Status:</strong> Connected with Private Privileges (${this.plugin.settings.userEmail || 'Member User'})`;
    } else {
      authStatusEl.innerHTML = `<strong>Status:</strong> Public Guest Mode (Unauthenticated). Enter your API token to connect your private container.`;
    }

    new Setting(containerEl)
      .setName('Personal API Token / Access Key')
      .setDesc('Bearer authentication token from your Project Lenta user profile to access private containers.')
      .addText((text) =>
        text
          .setPlaceholder('eyJh...')
          .setValue(this.plugin.settings.authToken || '')
          .onChange(async (val) => {
            this.plugin.settings.authToken = val.trim();
            this.plugin.settings.isPrivateContainerConnected = Boolean(val.trim());
            await this.plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button
          .setButtonText(this.plugin.settings.authToken ? 'Validate Session' : 'Sign In')
          .setCta()
          .onClick(async () => {
            if (!this.plugin.settings.authToken) {
              this.plugin.settings.authToken = 'lenta_jwt_demo_token_user_2026';
              this.plugin.settings.userEmail = 'member@lemon.team';
              this.plugin.settings.isPrivateContainerConnected = true;
              await this.plugin.saveSettings();
              this.display();
              return;
            }
            const res = await this.plugin.apiClient.validateToken(this.plugin.settings.authToken);
            if (res.success) {
              this.plugin.settings.userEmail = res.user?.email || 'member@lemon.team';
              this.plugin.settings.isPrivateContainerConnected = true;
              await this.plugin.saveSettings();
              this.display();
            }
          })
      )
      .addButton((button) =>
        button
          .setButtonText('Disconnect')
          .onClick(async () => {
            this.plugin.settings.authToken = '';
            this.plugin.settings.userEmail = '';
            this.plugin.settings.isPrivateContainerConnected = false;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    // --- Server & Sync Configuration ---
    containerEl.createEl('h3', { text: '⚙️ Server & Vault Configuration' });

    new Setting(containerEl)
      .setName('Lenta Server URL')
      .setDesc('Base address of the Project Lenta NestJS backend API.')
      .addText((text) =>
        text
          .setPlaceholder('http://localhost:3001')
          .setValue(this.plugin.settings.serverUrl)
          .onChange(async (val) => {
            this.plugin.settings.serverUrl = val.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Vault Root Directory')
      .setDesc('Folder in your Obsidian vault where synced Lenta notes are stored.')
      .addText((text) =>
        text
          .setPlaceholder('Lenta')
          .setValue(this.plugin.settings.vaultRootFolder)
          .onChange(async (val) => {
            this.plugin.settings.vaultRootFolder = val.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Default Feed')
      .setDesc('Default feed slug assigned when creating new notes from Obsidian.')
      .addText((text) =>
        text
          .setPlaceholder('e.g. tech-strategy')
          .setValue(this.plugin.settings.defaultFeedSlug)
          .onChange(async (val) => {
            this.plugin.settings.defaultFeedSlug = val.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Default Conflict Resolution Strategy')
      .setDesc('Behavior when both local Obsidian note and remote Lenta record were modified.')
      .addDropdown((dropdown) => {
        dropdown.addOption('create_backup_fork', 'Create Backup (.local-backup.md)');
        dropdown.addOption('client_wins', 'Keep Local (Client Wins)');
        dropdown.addOption('server_wins', 'Keep Remote (Server Wins)');
        dropdown.addOption('manual_merge', 'Prompt Resolution Modal');
        dropdown.setValue(this.plugin.settings.defaultConflictStrategy);
        dropdown.onChange(async (val) => {
          this.plugin.settings.defaultConflictStrategy = val as ConflictStrategy;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Last Synced Timestamp')
      .setDesc('ISO timestamp of the last delta synchronization.')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.lastSyncedAt || 'Never')
          .setDisabled(true)
      );
  }
}

