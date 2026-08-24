import { App, Modal, Notice, Setting } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaSyncEngine } from '../services/lenta-sync-engine';
import { scanChangedFiles, ChangedLentaFile } from '../services/changed-files-scanner';
import {
  LentaPluginSettings,
  LentaContainerSummaryDto,
  FileDiffItemDto,
} from '../types';
import { ConflictResolutionModal } from './conflict-modal';
import { GitHistoryModal } from './git-history-modal';

export class LentaSyncModal extends Modal {
  private apiClient: LentaApiClient;
  private syncEngine: LentaSyncEngine;
  private settings: LentaPluginSettings;
  private onSaveSettings: () => Promise<void>;

  private containers: LentaContainerSummaryDto[] = [];
  private activeContainerId = '';
  private isLoading = false;
  private isPushing = false;
  private isPulling = false;
  private statusMessage = '';
  private lastPullStats: { pulledCount: number; deletedCount: number; conflicts: FileDiffItemDto[] } | null = null;

  // Local changes since last sync
  private changedFiles: ChangedLentaFile[] = [];
  private isLoadingChanges = false;
  private pushingFilePath: string | null = null;

  constructor(
    app: App,
    apiClient: LentaApiClient,
    syncEngine: LentaSyncEngine,
    settings: LentaPluginSettings,
    onSaveSettings: () => Promise<void>
  ) {
    super(app);
    this.apiClient = apiClient;
    this.syncEngine = syncEngine;
    this.settings = settings;
    this.onSaveSettings = onSaveSettings;
    this.activeContainerId = settings.activeContainerId || 'feed-all';
  }

  async onOpen() {
    this.modalEl.addClass('lenta-sync-modal-frame');
    await this.loadContainers();
    await this.loadChangedFiles();
  }

  onClose() {
    this.contentEl.empty();
  }

  private async loadContainers() {
    this.isLoading = true;
    this.render();

    try {
      this.containers = await this.apiClient.listContainers();
      if (!this.containers.find((c) => c.id === this.activeContainerId) && this.containers.length > 0) {
        this.activeContainerId = this.containers[0].id;
        this.settings.activeContainerId = this.activeContainerId;
        await this.onSaveSettings();
      }
    } catch (err: any) {
      this.statusMessage = `Connection error: ${err.message}`;
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  private async loadChangedFiles() {
    this.isLoadingChanges = true;
    this.render();
    try {
      this.changedFiles = await scanChangedFiles(this.app, this.settings);
    } catch {
      this.changedFiles = [];
    } finally {
      this.isLoadingChanges = false;
      this.render();
    }
  }

  private render() {
    const { contentEl } = this;
    contentEl.empty();

    // ── Header ──────────────────────────────────────────────────────────────
    const header = contentEl.createDiv({ cls: 'lenta-sync-header' });
    const titleRow = header.createDiv({ cls: 'lenta-sync-title-row' });
    titleRow.createEl('h2', { text: '🍋 Lemon Lenta — Sync Hub' });

    const badge = titleRow.createSpan({ cls: 'lenta-badge' });
    badge.setText(this.isLoading ? 'CONNECTING...' : 'ONLINE');

    header.createEl('p', {
      cls: 'lenta-sync-desc',
      text: 'Push & pull chronological notes between Project Lenta server and Obsidian vault.',
    });

    // If no container key is connected, show Connect by Key prompt
    if (!this.settings.containerKey) {
      const connectBox = contentEl.createDiv({ cls: 'lenta-sync-container-box' });
      connectBox.createEl('h3', { text: '🔑 Connect Container by Key' });
      connectBox.createEl('p', {
        text: 'No container key connected. Enter your container key below to connect and sync with your container.',
        cls: 'setting-item-description',
      });

      new Setting(connectBox)
        .setName('Container Key')
        .setDesc('Enter secret key assigned to your Obsidian container.')
        .addText((text) =>
          text.setPlaceholder('e.g. cont-personal-vault').onChange((val) => {
            this.settings.containerKey = val.trim();
          })
        )
        .addButton((btn) =>
          btn
            .setButtonText('Connect Container')
            .setCta()
            .onClick(async () => {
              if (!this.settings.containerKey) return;
              await this.onSaveSettings();
              await this.loadContainers();
            })
        );
      return;
    }

    // ── Connected Container Section ─────────────────────────────────────────
    const containerSection = contentEl.createDiv({ cls: 'lenta-sync-container-box' });
    const currentContainer = this.containers.find((c) => c.id === this.activeContainerId) || this.containers[0];
    const containerName = currentContainer?.name || this.settings.connectedContainerName || 'Connected Container';

    const infoBox = containerSection.createDiv({ cls: 'lenta-connected-key-badge' });
    infoBox.style.cssText = 'padding: 8px 12px; background: #1a291e; border: 1px solid #333; border-radius: 6px; color: #8ee29a; font-size: 0.9em; margin-bottom: 10px;';
    infoBox.innerHTML = `<strong>Connected Container:</strong> ${containerName} <span style="opacity:0.75; font-family: monospace;">(Key: ${this.settings.containerKey.slice(0, 14)}...)</span>`;

    // ── Primary Action Bar: Pull | Push Active ────────────────────────────
    const actionsBar = contentEl.createDiv({ cls: 'lenta-sync-actions-bar' });

    // ▸ Pull Button
    const pullBtn = actionsBar.createEl('button', {
      text: this.isPulling ? '⏳ Pulling...' : '📥 Pull from Server',
      cls: 'mod-cta lenta-btn-lemon',
    });
    pullBtn.disabled = this.isLoading || this.isPulling || this.isPushing;
    pullBtn.onclick = async () => {
      this.isPulling = true;
      this.statusMessage = '⏳ Fetching delta changes from Lenta server...';
      this.render();

      try {
        const stats = await this.syncEngine.pullChanges();
        this.lastPullStats = stats;
        this.statusMessage = `✅ Pull complete: ${stats.pulledCount} notes updated, ${stats.deletedCount} soft-deleted.`;
        if (stats.conflicts.length > 0) {
          new Notice(`⚠️ ${stats.conflicts.length} conflict(s) detected.`);
        } else {
          new Notice(`🍋 Pulled ${stats.pulledCount} notes successfully!`);
        }
        await this.loadChangedFiles();
      } catch (err: any) {
        this.statusMessage = `❌ Pull failed: ${err.message}`;
        new Notice(`Pull failed: ${err.message}`);
      } finally {
        this.isPulling = false;
        this.render();
      }
    };

    // ▸ Push Active Note Button
    const pushActiveBtn = actionsBar.createEl('button', {
      text: this.isPushing ? '⏳ Pushing...' : '📤 Push Active Note',
      cls: 'lenta-action-btn',
    });
    pushActiveBtn.disabled = this.isPushing || this.isPulling;
    pushActiveBtn.onclick = async () => {
      const activeFile = this.app.workspace.getActiveFile();
      if (!activeFile) {
        new Notice('No active Markdown note open in editor.');
        return;
      }
      this.isPushing = true;
      this.statusMessage = `⏳ Pushing "${activeFile.basename}"...`;
      this.render();
      try {
        const res = await this.syncEngine.pushLocalNote(activeFile);
        if (res.success) {
          this.statusMessage = `✅ Pushed "${res.note?.title}" to Lenta server!`;
          new Notice(`🍋 Pushed note "${res.note?.title}" to Lenta server!`);
          await this.loadChangedFiles();
        }
      } catch (err: any) {
        this.statusMessage = `❌ Push failed: ${err.message}`;
        new Notice(`Push failed: ${err.message}`);
      } finally {
        this.isPushing = false;
        this.render();
      }
    };

    // ▸ Push All Changed Button
    const pushAllBtn = actionsBar.createEl('button', {
      text: this.changedFiles.length > 0 ? `⚡ Push All (${this.changedFiles.length})` : 'Push All Changed',
      cls: 'lenta-action-btn',
    });
    pushAllBtn.disabled = this.changedFiles.length === 0 || this.isPushing || this.isPulling;
    pushAllBtn.onclick = async () => {
      this.isPushing = true;
      this.statusMessage = `⏳ Pushing ${this.changedFiles.length} changed files...`;
      this.render();

      let pushed = 0;
      for (const item of this.changedFiles) {
        try {
          const res = await this.syncEngine.pushLocalNote(item.file);
          if (res.success) pushed++;
        } catch {
          // continue
        }
      }

      this.statusMessage = `✅ Bulk push complete: ${pushed}/${this.changedFiles.length} notes pushed.`;
      new Notice(`🍋 Pushed ${pushed}/${this.changedFiles.length} modified notes.`);
      this.isPushing = false;
      await this.loadChangedFiles();
    };

    // ▸ Git History & Restore Button (Available for Git containers)
    if (currentContainer?.type === 'git' || this.settings.connectedContainerType === 'git' || this.settings.containerKey) {
      const historyBtn = actionsBar.createEl('button', {
        text: '📜 Git History & Restore',
        cls: 'lenta-action-btn',
      });
      historyBtn.onclick = () => {
        new GitHistoryModal(
          this.app,
          this.apiClient,
          this.activeContainerId || this.settings.containerKey || 'main-git-vault',
          containerName
        ).open();
      };
    }

    // ── Status Box ─────────────────────────────────────────────────────────
    if (this.statusMessage) {
      const statusBox = contentEl.createDiv({ cls: 'lenta-sync-status-box' });
      statusBox.createEl('span', { text: this.statusMessage });
    }

    // ── Conflicts List ─────────────────────────────────────────────────────
    if (this.lastPullStats && this.lastPullStats.conflicts.length > 0) {
      const conflictBox = contentEl.createDiv({ cls: 'lenta-conflict-list-box' });
      conflictBox.createEl('h3', { text: `⚠️ Unresolved Conflicts (${this.lastPullStats.conflicts.length})` });

      for (const conflict of this.lastPullStats.conflicts) {
        const row = conflictBox.createDiv({ cls: 'lenta-conflict-row' });
        row.createSpan({ text: `📄 ${conflict.path}`, cls: 'lenta-conflict-path' });

        const resolveBtn = row.createEl('button', { text: 'Resolve', cls: 'mod-cta' });
        resolveBtn.onclick = () => {
          new ConflictResolutionModal(this.app, conflict, async (strat) => {
            this.settings.defaultConflictStrategy = strat;
            await this.onSaveSettings();
            await this.syncEngine.pullChanges();
            this.render();
          }).open();
        };
      }
    }

    // ── Changes Since Last Sync ────────────────────────────────────────────
    const changesSection = contentEl.createDiv({ cls: 'lenta-changes-section' });
    const changesHeader = changesSection.createDiv({ cls: 'lenta-changes-header' });

    const syncedAtLabel = this.settings.lastSyncedAt
      ? `since ${new Date(this.settings.lastSyncedAt).toLocaleString()}`
      : 'all time';

    changesHeader.createEl('h3', {
      text: this.isLoadingChanges
        ? '🔍 Scanning local changes...'
        : this.changedFiles.length > 0
        ? `📝 ${this.changedFiles.length} local change${this.changedFiles.length > 1 ? 's' : ''} (${syncedAtLabel})`
        : `✅ No local changes ${syncedAtLabel}`,
      cls: 'lenta-changes-title',
    });

    // Refresh changes button
    const refreshBtn = changesHeader.createEl('button', {
      text: '↺ Refresh',
      cls: 'lenta-changes-refresh-btn',
    });
    refreshBtn.onclick = () => this.loadChangedFiles();

    if (!this.isLoadingChanges && this.changedFiles.length > 0) {
      const changesList = changesSection.createDiv({ cls: 'lenta-changes-list' });

      for (const item of this.changedFiles) {
        const row = changesList.createDiv({ cls: 'lenta-change-row' });

        // File info
        const infoDiv = row.createDiv({ cls: 'lenta-change-info' });
        infoDiv.createSpan({ text: '📄 ', cls: 'lenta-change-icon' });
        infoDiv.createSpan({ text: item.title, cls: 'lenta-change-title' });
        const meta = infoDiv.createDiv({ cls: 'lenta-change-meta' });
        meta.createSpan({ text: item.relPath, cls: 'lenta-change-path' });
        meta.createSpan({
          text: `Modified: ${new Date(item.modifiedAt).toLocaleTimeString()}`,
          cls: 'lenta-change-time',
        });

        // Per-file push button
        const filePushBtn = row.createEl('button', {
          text: this.pushingFilePath === item.relPath ? '⏳' : '📤 Push',
          cls: 'lenta-file-push-btn',
        });
        filePushBtn.disabled = this.pushingFilePath !== null || this.isPulling;
        filePushBtn.onclick = async () => {
          this.pushingFilePath = item.relPath;
          this.render();
          try {
            const res = await this.syncEngine.pushLocalNote(item.file);
            if (res.success) {
              new Notice(`🍋 Pushed "${item.title}"`);
              this.statusMessage = `✅ Pushed "${item.title}"`;
            }
          } catch (err: any) {
            new Notice(`Push failed: ${err.message}`);
          } finally {
            this.pushingFilePath = null;
            await this.loadChangedFiles();
          }
        };
      }
    } else if (!this.isLoadingChanges) {
      changesSection.createDiv({
        cls: 'lenta-changes-empty',
        text: 'All Lenta notes are up to date with the server.',
      });
    }

    // ── Footer ─────────────────────────────────────────────────────────────
    const footer = contentEl.createDiv({ cls: 'lenta-sync-footer' });
    const lastSyncText = this.settings.lastSyncedAt
      ? new Date(this.settings.lastSyncedAt).toLocaleString()
      : 'Never';
    footer.createEl('span', {
      text: `Last Synced: ${lastSyncText} | Vault Root: /${this.settings.vaultRootFolder}`,
    });

    // Auto-sync toggle
    const autoSyncLabel = footer.createEl('label', { cls: 'lenta-autosync-toggle' });
    const autoSyncCheck = autoSyncLabel.createEl('input', { type: 'checkbox' });
    autoSyncCheck.checked = this.settings.autoSyncOnEdit || false;
    autoSyncCheck.onchange = async () => {
      this.settings.autoSyncOnEdit = autoSyncCheck.checked;
      await this.onSaveSettings();
    };
    autoSyncLabel.createSpan({ text: ' Auto-push on save' });
  }
}
