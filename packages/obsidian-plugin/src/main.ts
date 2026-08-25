import { Plugin, WorkspaceLeaf, Notice, TFile } from 'obsidian';
import { LentaApiClient } from './services/lenta-api-client';
import { LentaSyncEngine } from './services/lenta-sync-engine';
import { LentaFrontmatterUtil } from './services/lenta-frontmatter';
import { LentaPluginSettings, DEFAULT_SETTINGS } from './types';
import { LentaQuickAddModal } from './ui/quick-add-modal';
import { LentaSyncModal } from './ui/sync-modal';
import { LentaConnectionsModal } from './ui/connections-modal';
import { LentaContainersFoldersModal } from './ui/containers-folders-modal';
import { LentaSidebarView, VIEW_TYPE_LENTA_SIDEBAR } from './ui/sidebar-view';
import { LentaSettingTab } from './ui/settings-tab';

export default class WorkspaceLentaPlugin extends Plugin {
  settings: LentaPluginSettings;
  apiClient: LentaApiClient;
  syncEngine: LentaSyncEngine;
  private statusBarItemEl: HTMLElement;

  // Auto-sync debounce: file path → timeout handle
  private autoSyncTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private readonly AUTO_SYNC_DELAY_MS = 2000;

  async onload() {
    await this.loadSettings();

    this.apiClient = new LentaApiClient(
      () => this.settings.serverUrl,
      () => this.settings.authToken,
      () => this.settings.containerServerUrl,
      () => this.settings.containerApiKey,
      () => this.settings.containerKey
    );
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
          () => this.openSyncModal(),
          () => this.openConnectionsModal(),
          () => this.openContainersFoldersModal()
        )
    );

    // 2. Ribbon Icons
    const containersRibbonIcon = this.addRibbonIcon('box', '🍋 Lemon Lenta: Containers & Folders Manager', () => {
      this.openContainersFoldersModal();
    });
    containersRibbonIcon.addClass('lenta-ribbon-btn');

    const syncRibbonIcon = this.addRibbonIcon('zap', '🍋 Lemon Lenta: Sync Hub', () => {
      this.openSyncModal();
    });
    syncRibbonIcon.addClass('lenta-ribbon-btn');

    const connRibbonIcon = this.addRibbonIcon('link-2', '🍋 Lemon Lenta: Connections & Auth', () => {
      this.openConnectionsModal();
    });
    connRibbonIcon.addClass('lenta-ribbon-btn');

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
      id: 'lenta-open-containers-folders-modal',
      name: 'Open Containers & Folders Workspace Modal',
      callback: () => {
        this.openContainersFoldersModal();
      },
    });

    this.addCommand({
      id: 'lenta-open-connections-modal',
      name: 'Open Connections & Auth Settings Modal',
      callback: () => {
        this.openConnectionsModal();
      },
    });

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

    this.addCommand({
      id: 'lenta-push-all-changed',
      name: 'Push All Modified Notes Since Last Sync',
      callback: async () => {
        await this.pushAllChangedNotes();
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

    // 7. Auto-Sync: Debounce push when a Lenta-tracked file is modified
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (!(file instanceof TFile) || file.extension !== 'md') return;
        if (!this.settings.autoSyncOnEdit) return;

        // Debounce per file path
        const existing = this.autoSyncTimers.get(file.path);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(async () => {
          this.autoSyncTimers.delete(file.path);
          await this.autoSyncFile(file);
        }, this.AUTO_SYNC_DELAY_MS);

        this.autoSyncTimers.set(file.path, timer);
      })
    );

    // 8. Track Vault Deletions: Disconnect Container on Container Folder Deletion
    this.registerEvent(
      this.app.vault.on('delete', async (file) => {
        const activeContainer = this.settings.activeContainerId || this.settings.containerKey;
        const containerName = this.settings.connectedContainerName;
        const rootFolder = this.settings.vaultRootFolder || 'Lenta';

        if (!activeContainer) return;

        const containerFolderPath = `${rootFolder}/${containerName || activeContainer}`;
        const matchPath = file.path;

        if (
          matchPath === containerFolderPath ||
          matchPath === `${rootFolder}/${activeContainer}` ||
          (matchPath.startsWith(rootFolder) && (matchPath.includes(activeContainer) || (containerName && matchPath.includes(containerName))))
        ) {
          this.settings.activeContainerId = '';
          this.settings.containerKey = '';
          this.settings.connectedContainerName = '';
          await this.saveSettings();
          new Notice(`🍋 Container folder "${matchPath}" deleted locally. Container disconnected (remote data safe).`);
        }
      })
    );

    console.log('Project Lenta Obsidian Plugin loaded successfully.');
  }

  onunload() {
    // Clear all pending auto-sync timers
    for (const timer of this.autoSyncTimers.values()) {
      clearTimeout(timer);
    }
    this.autoSyncTimers.clear();
    console.log('Project Lenta Obsidian Plugin unloaded.');
  }

  /**
   * Auto-sync a single file if it is Lenta-tracked (has lenta_id frontmatter).
   */
  private async autoSyncFile(file: TFile): Promise<void> {
    try {
      const content = await this.app.vault.cachedRead(file);
      const parsed = LentaFrontmatterUtil.parseMarkdown(content);
      const lentaId = parsed.lentaId || parsed.frontmatter?.id;
      if (!lentaId) return; // not a Lenta-tracked note

      this.updateStatusBar('Auto-syncing...');
      const res = await this.syncEngine.pushLocalNote(file);
      if (res.success) {
        this.updateStatusBar('Synced ✓');
        setTimeout(() => this.updateStatusBar('Ready'), 3000);
      }
    } catch (err: any) {
      console.warn('🍋 Auto-sync failed for', file.path, err?.message);
      this.updateStatusBar('Auto-sync error');
      setTimeout(() => this.updateStatusBar('Ready'), 4000);
    }
  }

  /**
   * Push all modified Lenta notes since the last sync timestamp.
   */
  async pushAllChangedNotes(): Promise<void> {
    const { scanChangedFiles } = await import('./services/changed-files-scanner');
    const changed = await scanChangedFiles(this.app, this.settings);

    if (changed.length === 0) {
      new Notice('🍋 No local changes since last sync.');
      return;
    }

    this.updateStatusBar(`Pushing ${changed.length} files...`);
    let pushed = 0;

    for (const item of changed) {
      try {
        const res = await this.syncEngine.pushLocalNote(item.file);
        if (res.success) pushed++;
      } catch (err: any) {
        console.warn('Push failed for', item.relPath, err?.message);
      }
    }

    new Notice(`🍋 Pushed ${pushed}/${changed.length} modified notes.`);
    this.updateStatusBar('Synced ✓');
    setTimeout(() => this.updateStatusBar('Ready'), 3000);
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

  openConnectionsModal() {
    new LentaConnectionsModal(
      this.app,
      this.apiClient,
      this.settings,
      () => this.saveSettings(),
      () => this.openContainersFoldersModal()
    ).open();
  }

  openContainersFoldersModal() {
    new LentaContainersFoldersModal(
      this.app,
      this.apiClient,
      this.settings,
      () => this.saveSettings(),
      () => this.openConnectionsModal(),
      this.syncEngine
    ).open();
  }

  updateStatusBar(text: string) {
    if (this.statusBarItemEl) {
      this.statusBarItemEl.setText(`🍋 Lenta: ${text}`);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!Array.isArray(this.settings.activeContainerIds)) {
      this.settings.activeContainerIds = [];
    }
    if (this.settings.activeContainerIds.length === 0 && this.settings.activeContainerId) {
      this.settings.activeContainerIds = [this.settings.activeContainerId];
    } else if (this.settings.activeContainerIds.length > 0 && !this.settings.activeContainerId) {
      this.settings.activeContainerId = this.settings.activeContainerIds[0];
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
