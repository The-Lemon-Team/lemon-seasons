import { Plugin, WorkspaceLeaf, Notice, TFile } from 'obsidian';
import { LentaApiClient } from './services/lenta-api-client';
import { LentaSyncEngine } from './services/lenta-sync-engine';
import { LentaFrontmatterUtil } from './services/lenta-frontmatter';
import { LentaPluginSettings, DEFAULT_SETTINGS } from './types';
import { LentaQuickAddModal } from './ui/quick-add-modal';
import { LentaAiQuickAddModal } from './ui/ai-quick-add-modal';
import { LentaCreateFolderModal } from './ui/create-folder-modal';

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
          (folderId?: string, folderPath?: string) => this.openQuickAddModal(folderId, folderPath),
          (mode?: 'push' | 'pull') => this.openSyncModal(mode || 'push'),
          () => this.openConnectionsModal(),
          () => this.openContainersFoldersModal(),
          async () => {
            this.openSyncModal('pull');
          },
          async () => {
            this.openSyncModal('push');
          },
          (
            folderId?: string,
            folderPath?: string,
            defaultPrivacy?: 'private' | 'public' | 'obsidian',
            targetContainerId?: string
          ) => this.openCreateFolderModal(folderId, folderPath, defaultPrivacy, targetContainerId),
          async () => this.saveSettings()
        )
    );

    // 2. Ribbon Icons
    const sidebarRibbonIcon = this.addRibbonIcon('calendar-range', '🍋 Lemon Lenta: Open Lenta Hub Sidebar', () => {
      const leftSplit = this.app.workspace.leftSplit;
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_LENTA_SIDEBAR);
      const isVisible = leaves.length > 0 && !leftSplit?.collapsed;

      if (leftSplit?.collapsed) {
        leftSplit.expand();
      }
      this.activateSidebarView();

      if (isVisible && leaves[0].view instanceof LentaSidebarView) {
        (leaves[0].view as LentaSidebarView).refreshData();
        new Notice('🍋 Lenta Hub refreshed');
      }
    });
    sidebarRibbonIcon.addClass('lenta-ribbon-btn');

    const pullRibbonIcon = this.addRibbonIcon('download', '🍋 Lemon Lenta: Pull Changes from Server (⬇)', () => {
      this.openSyncModal('pull');
    });
    pullRibbonIcon.addClass('lenta-ribbon-btn');

    const pushRibbonIcon = this.addRibbonIcon('upload', '🍋 Lemon Lenta: Push Changed to Server (⬆)', () => {
      this.openSyncModal('push');
    });
    pushRibbonIcon.addClass('lenta-ribbon-btn');

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
      id: 'lenta-ai-quick-add',
      name: '✨ AI Quick Add Cards (Natural Language Chat)',
      callback: () => {
        this.openAiQuickAddModal();
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
      id: 'lenta-create-folder',
      name: 'Create New Folder in Lenta & Vault',
      callback: () => {
        this.openCreateFolderModal();
      },
    });

    this.addCommand({
      id: 'lenta-open-sidebar',
      name: 'Open Lenta Hub Sidebar (Notes & Containers)',
      callback: () => {
        this.activateSidebarView();
      },
    });

    this.addCommand({
      id: 'lenta-pull-delta-changes',
      name: 'Pull Changes from Server (Interactive Modal)',
      callback: () => {
        this.openSyncModal('pull');
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
      name: 'Push Changes to Server (Interactive Modal)',
      callback: () => {
        this.openSyncModal('push');
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

    this.app.workspace.onLayoutReady(() => {
      this.activateSidebarView();
    });

    console.log('Project Lenta Obsidian Plugin loaded successfully.');
  }

  onunload() {
    console.log('Project Lenta Obsidian Plugin unloaded.');
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

    if (this.app.workspace.leftSplit && this.app.workspace.leftSplit.collapsed) {
      this.app.workspace.leftSplit.expand();
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  openAiQuickAddModal(initialFolder?: string, initialDate?: string) {
    new LentaAiQuickAddModal(
      this.app,
      this.apiClient,
      () => this.settings,
      (createdPaths) => {
        if (createdPaths.length > 0) {
          this.app.workspace.openLinkText(createdPaths[0], '', false);
        }
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_LENTA_SIDEBAR);
        for (const leaf of leaves) {
          if (leaf.view instanceof LentaSidebarView) {
            leaf.view.refreshData();
          }
        }
      },
      this.settings.activeContainerId || undefined,
      this.settings.connectedContainerName || undefined,
      initialFolder,
      initialDate
    ).open();
  }

  openQuickAddModal(initialFolderId?: string, initialFolderPath?: string) {

    new LentaQuickAddModal(
      this.app,
      this.apiClient,
      () => this.settings,
      (filePath) => {
        this.app.workspace.openLinkText(filePath, '', false);
        // Also refresh active sidebar views so newly created note appears in folder accordion
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_LENTA_SIDEBAR);
        for (const leaf of leaves) {
          if (leaf.view instanceof LentaSidebarView) {
            if (initialFolderId) {
              leaf.view.expandFolder(initialFolderId);
            }
            leaf.view.invalidateFolderNotes(initialFolderId);
            leaf.view.refreshData();
          }
        }
      },
      initialFolderId,
      initialFolderPath
    ).open();
  }

  openCreateFolderModal(
    parentFolderId?: string,
    parentFolderPath?: string,
    defaultPrivacy?: 'private' | 'public' | 'obsidian',
    targetContainerId?: string
  ) {
    const settings = this.settings;
    const resolvedContainerId =
      targetContainerId ||
      settings.activeContainerId ||
      (settings.activeContainerIds && settings.activeContainerIds[0]);

    const effectivePrivacy =
      defaultPrivacy ||
      (resolvedContainerId ? 'obsidian' : 'public');

    new LentaCreateFolderModal(
      this.app,
      this.apiClient,
      () => this.settings,
      async (newFolder) => {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_LENTA_SIDEBAR);
        for (const leaf of leaves) {
          if (leaf.view instanceof LentaSidebarView) {
            await leaf.view.refreshData();
            leaf.view.selectFolder(newFolder.id, newFolder.path);
          }
        }
      },
      parentFolderId,
      parentFolderPath,
      effectivePrivacy,
      resolvedContainerId
    ).open();
  }

  openSyncModal(initialMode: 'push' | 'pull' = 'push', targetContainerId?: string) {
    new LentaSyncModal(
      this.app,
      this.apiClient,
      this.syncEngine,
      this.settings,
      () => this.saveSettings(),
      initialMode,
      targetContainerId
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
      this.syncEngine,
      (mode) => this.openSyncModal(mode)
    ).open();
  }

  updateStatusBar(text: string) {
    if (this.statusBarItemEl) {
      this.statusBarItemEl.setText(`🍋 Lenta: ${text}`);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (this.settings.containerServerUrl === 'http://localhost:3000') {
      this.settings.containerServerUrl = 'http://localhost:3001';
    }
    if (this.settings.connectedContainerType === 'git') {
      this.settings.connectedContainerType = 'obsidian';
    }
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
