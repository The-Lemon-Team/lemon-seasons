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
          .setPlaceholder('e.g. tech-news')
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
