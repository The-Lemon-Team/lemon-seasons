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

    // ── Quick Workspaces & Modals Banner Card ────────────────────────────────
    const card = containerEl.createDiv({ cls: 'lenta-settings-connections-card' });
    card.style.cssText = [
      'padding: 16px 18px',
      'margin-bottom: 24px',
      'border-radius: 10px',
      'border: 1px solid rgba(201, 205, 88, 0.4)',
      'background: #1b1e1e',
      'box-shadow: 0 4px 14px rgba(0,0,0,0.3)',
    ].join(';');

    const cardTitle = card.createEl('h3', { text: '📦 Containers, Folders & Connections Workspaces' });
    cardTitle.style.cssText = 'margin-top:0; margin-bottom:6px; color:#c9cd58; font-size:1.1em;';

    const selectedCount = Array.isArray(this.plugin.settings.activeContainerIds) && this.plugin.settings.activeContainerIds.length > 0
      ? this.plugin.settings.activeContainerIds.length
      : this.plugin.settings.activeContainerId ? 1 : 0;

    const authUser = this.plugin.settings.userEmail;

    const desc = card.createEl('p', { cls: 'setting-item-description' });
    desc.style.cssText = 'margin-bottom: 14px; color: #aaa; font-size: 0.9em;';
    desc.innerHTML = `Manage container selection, vault folder structures, user authentication, and server endpoints in dedicated workspace modals.<br/><br/>` +
      `<strong>Current Status:</strong> ${selectedCount > 0 ? `✅ Connected to <code>${selectedCount} Container${selectedCount > 1 ? 's' : ''}</code>` : '⚠️ No containers selected'} ` +
      `(${authUser ? `Auth: ${authUser}` : 'Unauthenticated'})`;

    const btnRow = card.createDiv();
    btnRow.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';

    const openWorkspaceBtn = btnRow.createEl('button', {
      cls: 'mod-cta lenta-btn-lemon',
      text: '📦 Containers & Folders Workspace',
    });
    openWorkspaceBtn.style.cssText = 'padding: 8px 16px; font-weight: 600; cursor: pointer;';
    openWorkspaceBtn.onclick = () => {
      this.plugin.openContainersFoldersModal();
    };

    const openConnBtn = btnRow.createEl('button', {
      text: '🔌 Server Connections & Auth',
    });
    openConnBtn.style.cssText = 'padding: 8px 16px; font-weight: 600; cursor: pointer;';
    openConnBtn.onclick = () => {
      this.plugin.openConnectionsModal();
    };

    // ── Core Server & Sync Settings Section ─────────────────────────────────
    containerEl.createEl('h3', { text: '⚙️ Core Server & Sync Settings' });

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
      .setName('Auto-Sync on File Edit')
      .setDesc('Automatically push changes to Lenta server when editing a tracked Markdown file.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoSyncOnEdit || false)
          .onChange(async (val) => {
            this.plugin.settings.autoSyncOnEdit = val;
            await this.plugin.saveSettings();
          })
      );

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
