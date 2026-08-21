import { Plugin, WorkspaceLeaf, Notice, TFile } from 'obsidian';
import { LentaApiClient } from './services/lenta-api-client';
import { LentaSyncEngine } from './services/lenta-sync-engine';
import { LentaPluginSettings, DEFAULT_SETTINGS } from './types';
import { LentaQuickAddModal } from './ui/quick-add-modal';
import { LentaSyncModal } from './ui/sync-modal';
import { LentaSidebarView, VIEW_TYPE_LENTA_SIDEBAR } from './ui/sidebar-view';
import { LentaSettingTab } from './ui/settings-tab';

export default class WorkspaceLentaPlugin extends Plugin {
  settings: LentaPluginSettings;
  apiClient: LentaApiClient;
  syncEngine: LentaSyncEngine;
  private statusBarItemEl: HTMLElement;

  async onload() {
    await this.loadSettings();

    this.apiClient = new LentaApiClient(() => this.settings.serverUrl);
    this.syncEngine = new LentaSyncEngine(
      this.app,
      this.apiClient,
      () => this.settings,
      () => this.saveSettings()
    );

    // 1. Register Sidebar View
    this.registerView(
      VIEW_TYPE_LENTA_SIDEBAR,
      (leaf: WorkspaceLeaf) =>
        new LentaSidebarView(
          leaf,
          this.apiClient,
          () => this.settings,
          () => this.openQuickAddModal(),
          () => this.openSyncModal()
        )
    );

    // 2. Ribbon Icons
    const syncRibbonIcon = this.addRibbonIcon('zap', '🍋 Lemon Lenta: Sync Hub', () => {
      this.openSyncModal();
    });
    syncRibbonIcon.addClass('lenta-ribbon-btn');

    const addRibbonIcon = this.addRibbonIcon('plus-circle', '🍋 Lemon Lenta: Quick Add Note', () => {
      this.openQuickAddModal();
    });
    addRibbonIcon.addClass('lenta-ribbon-btn');

    // 3. Status Bar Item
    this.statusBarItemEl = this.addStatusBarItem();
    this.updateStatusBar('Ready');
    this.statusBarItemEl.addClass('mod-clickable');
    this.statusBarItemEl.onclick = () => this.openSyncModal();

    // 4. Command Palette Commands
    this.addCommand({
      id: 'lenta-open-sync-hub',
      name: 'Open Sync Hub & Changes Frame',
      callback: () => {
        this.openSyncModal();
      },
    });

    this.addCommand({
      id: 'lenta-quick-add-note',
      name: 'Quick Add Chronological Note',
      callback: () => {
        this.openQuickAddModal();
      },
    });

    this.addCommand({
      id: 'lenta-open-sidebar',
      name: 'Open Lenta Hierarchy Sidebar (Folders / Feeds / Taxonomy)',
      callback: () => {
        this.activateSidebarView();
      },
    });

    this.addCommand({
      id: 'lenta-pull-delta-changes',
      name: 'Pull Delta Changes from Server',
      callback: async () => {
        this.updateStatusBar('Syncing...');
        try {
          const stats = await this.syncEngine.pullChanges();
          new Notice(`🍋 Pulled ${stats.pulledCount} notes (${stats.deletedCount} deleted).`);
          this.updateStatusBar('Synced');
        } catch (err: any) {
          new Notice(`Sync failed: ${err.message}`);
          this.updateStatusBar('Error');
        }
      },
    });

    this.addCommand({
      id: 'lenta-push-active-note',
      name: 'Push Current Open Note to Lenta Server',
      callback: async () => {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
          new Notice('No active markdown file open.');
          return;
        }
        try {
          const res = await this.syncEngine.pushLocalNote(file);
          if (res.success) {
            new Notice(`🍋 Note "${res.note?.title}" pushed to Lenta!`);
          }
        } catch (err: any) {
          new Notice(`Push failed: ${err.message}`);
        }
      },
    });

    // 5. Settings Tab
    this.addSettingTab(new LentaSettingTab(this.app, this));

    // 6. Track File Renames / Moves via Obsidian Vault API
    this.registerEvent(
      this.app.vault.on('rename', async (file, oldPath) => {
        if (file instanceof TFile) {
          await this.syncEngine.handleFileRename(file, oldPath);
        }
      })
    );

    console.log('Project Lenta Obsidian Plugin loaded successfully.');
  }

  onunload() {
    console.log('Project Lenta Obsidian Plugin unloaded.');
  }

  async activateSidebarView() {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_LENTA_SIDEBAR);

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getLeftLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_LENTA_SIDEBAR,
          active: true,
        });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  openQuickAddModal() {
    new LentaQuickAddModal(
      this.app,
      this.apiClient,
      () => this.settings,
      (filePath) => {
        this.app.workspace.openLinkText(filePath, '', false);
      }
    ).open();
  }

  openSyncModal() {
    new LentaSyncModal(
      this.app,
      this.apiClient,
      this.syncEngine,
      this.settings,
      () => this.saveSettings()
    ).open();
  }

  updateStatusBar(text: string) {
    if (this.statusBarItemEl) {
      this.statusBarItemEl.setText(`🍋 Lenta: ${text}`);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
