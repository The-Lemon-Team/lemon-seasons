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
  private selectedContainerFilter: string = 'all'; // 'all' or specific containerId
  private isLoading = false;
  private isPushing = false;
  private isPulling = false;
  private statusMessage = '';
  private lastPullStats: { pulledCount: number; deletedCount: number; downloadedFiles?: number; conflicts: FileDiffItemDto[] } | null = null;

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
    this.activeContainerId = settings.activeContainerId || (settings.activeContainerIds?.[0]) || 'feed-all';
  }

  async onOpen() {
    this.modalEl.addClass('lenta-sync-modal-frame');
    await this.loadContainers();
    await this.loadChangedFiles();
  }

  onClose() {
    this.contentEl.empty();
  }

  private getActiveContainerIds(): string[] {
    if (Array.isArray(this.settings.activeContainerIds) && this.settings.activeContainerIds.length > 0) {
      return this.settings.activeContainerIds;
    }
    if (this.settings.activeContainerId) {
      return [this.settings.activeContainerId];
    }
    return [];
  }

  private async loadContainers() {
    this.isLoading = true;
    this.render();

    try {
      this.containers = await this.apiClient.listContainers({ fetchAll: true }).catch(() => []);
      const activeIds = this.getActiveContainerIds();
      if (activeIds.length > 0 && !activeIds.includes(this.activeContainerId)) {
        this.activeContainerId = activeIds[0];
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

    const activeContainerIds = this.getActiveContainerIds();
    const isMultiContainer = activeContainerIds.length > 1;

    // ── Header ──────────────────────────────────────────────────────────────
    const header = contentEl.createDiv({ cls: 'lenta-sync-header' });
    const titleRow = header.createDiv({ cls: 'lenta-sync-title-row' });
    titleRow.createEl('h2', { text: '🍋 Lemon Lenta — Sync Hub' });

    const badgeRow = header.createDiv({ cls: 'lenta-badge-row' });
    const badge = badgeRow.createSpan({ cls: 'lenta-badge' });
    if (this.isLoading) {
      badge.setText('CONNECTING...');
    } else if (activeContainerIds.length > 0) {
      badge.setText(`CONNECTED: ${activeContainerIds.length} Container${activeContainerIds.length > 1 ? 's' : ''}`);
    } else {
      badge.setText('ONLINE');
    }

    header.createEl('p', {
      cls: 'lenta-sync-desc',
      text: 'Push & pull chronological notes between Project Lenta server and Obsidian vault across connected containers.',
    });

    // If no container key or active container is connected, show prompt
    if (!this.settings.containerKey && activeContainerIds.length === 0) {
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

    // ── Multi-Container Selector & Info Section ──────────────────────────────
    const containerSection = contentEl.createDiv({ cls: 'lenta-sync-container-box' });
    containerSection.style.cssText = 'margin-bottom: 16px; padding: 12px; background: var(--background-secondary); border-radius: 8px; border: 1px solid var(--background-modifier-border);';

    const sectionTitleRow = containerSection.createDiv({ cls: 'lenta-sync-container-header' });
    sectionTitleRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
    sectionTitleRow.createEl('h4', {
      text: isMultiContainer ? `📦 Connected Containers Workspace (${activeContainerIds.length})` : '📦 Connected Container',
      cls: 'lenta-container-section-title',
    });

    // Render selector pills for container context
    const selectorWrap = containerSection.createDiv({ cls: 'lenta-sync-container-selector' });
    selectorWrap.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;';

    // "All Active Containers" tab pill
    const allPill = selectorWrap.createEl('button', {
      text: `🌐 All Active (${activeContainerIds.length})`,
      cls: `lenta-pill-btn ${this.selectedContainerFilter === 'all' ? 'active' : ''}`,
    });
    allPill.style.cssText = `padding: 4px 10px; border-radius: 6px; border: 1px solid #444; font-size: 0.85em; cursor: pointer; ${
      this.selectedContainerFilter === 'all' ? 'background: #2d5a3f; color: #8ee29a; border-color: #8ee29a; font-weight: bold;' : 'background: #1a1d1d; color: #ccc;'
    }`;
    allPill.onclick = () => {
      this.selectedContainerFilter = 'all';
      this.render();
    };

    // Per-container pills
    const containerNameMap = new Map<string, string>();
    for (const cId of activeContainerIds) {
      const matched = this.containers.find((c) => c.id === cId);
      const name = matched?.name || cId;
      containerNameMap.set(cId, name);

      const isSelected = this.selectedContainerFilter === cId;
      const typeTag = matched?.type === 'git' ? '📜 Git' : '📁';
      const pill = selectorWrap.createEl('button', {
        text: `${typeTag} ${name}`,
        cls: `lenta-pill-btn ${isSelected ? 'active' : ''}`,
      });
      pill.style.cssText = `padding: 4px 10px; border-radius: 6px; border: 1px solid #444; font-size: 0.85em; cursor: pointer; ${
        isSelected ? 'background: #2d5a3f; color: #8ee29a; border-color: #8ee29a; font-weight: bold;' : 'background: #1a1d1d; color: #ccc;'
      }`;
      pill.onclick = () => {
        this.selectedContainerFilter = cId;
        this.activeContainerId = cId;
        this.render();
      };
    }

    // Active container details line
    const activeInfo = containerSection.createDiv({ cls: 'lenta-connected-key-badge' });
    activeInfo.style.cssText = 'padding: 8px 12px; background: #1a291e; border: 1px solid #333; border-radius: 6px; color: #8ee29a; font-size: 0.85em;';
    if (this.selectedContainerFilter === 'all') {
      const namesList = activeContainerIds.map((id) => containerNameMap.get(id) || id).join(', ');
      activeInfo.innerHTML = `<strong>Scope:</strong> All Connected Containers <span style="opacity:0.8; font-family: monospace;">[${namesList}]</span>`;
    } else {
      const activeName = containerNameMap.get(this.selectedContainerFilter) || this.selectedContainerFilter;
      const matched = this.containers.find((c) => c.id === this.selectedContainerFilter);
      const typeStr = matched?.type ? ` (${matched.type.toUpperCase()})` : '';
      activeInfo.innerHTML = `<strong>Scope:</strong> ${activeName}${typeStr} <span style="opacity:0.75; font-family: monospace;">(ID: ${this.selectedContainerFilter})</span>`;
    }

    // ── Primary Action Bar ────────────────────────────────────────────────
    const actionsBar = contentEl.createDiv({ cls: 'lenta-sync-actions-bar' });
    actionsBar.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;';

    // ▸ Pull Button (Multi-container or single target container)
    const pullBtnText = this.isPulling
      ? '⏳ Pulling...'
      : this.selectedContainerFilter === 'all'
      ? `📥 Pull All (${activeContainerIds.length})`
      : `📥 Pull "${containerNameMap.get(this.selectedContainerFilter) || 'Container'}"`;

    const pullBtn = actionsBar.createEl('button', {
      text: pullBtnText,
      cls: 'mod-cta lenta-btn-lemon',
    });
    pullBtn.disabled = this.isLoading || this.isPulling || this.isPushing;
    pullBtn.onclick = async () => {
      this.isPulling = true;
      this.statusMessage = '⏳ Fetching changes and syncing files...';
      this.render();

      try {
        if (this.selectedContainerFilter === 'all') {
          const stats = await this.syncEngine.pullAllContainers(activeContainerIds, containerNameMap);
          this.lastPullStats = stats;
          this.statusMessage = `✅ Multi-container pull complete: ${stats.pulledCount} notes updated across ${activeContainerIds.length} container(s).`;
          new Notice(`🍋 Multi-container pull complete (${stats.pulledCount} notes, ${stats.downloadedFiles || 0} files).`);
        } else {
          const targetName = containerNameMap.get(this.selectedContainerFilter) || this.selectedContainerFilter;
          const syncRes = await this.syncEngine.syncContainerFiles(this.selectedContainerFilter, targetName);
          const stats = await this.syncEngine.pullChanges();
          this.lastPullStats = { ...stats, downloadedFiles: syncRes.downloadedFiles };
          this.statusMessage = `✅ Pull complete for "${targetName}": ${stats.pulledCount} notes updated.`;
          new Notice(`🍋 Pulled ${stats.pulledCount} notes for container "${targetName}".`);
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

    // Filter changed files according to active container filter selection
    const filteredChangedFiles = this.changedFiles.filter((item) => {
      if (this.selectedContainerFilter === 'all') return true;
      const targetName = containerNameMap.get(this.selectedContainerFilter) || this.selectedContainerFilter;
      const rootFolder = this.settings.vaultRootFolder || 'Lenta';
      return item.relPath.includes(`${rootFolder}/${targetName}`) || item.relPath.includes(this.selectedContainerFilter);
    });

    // ▸ Push All Changed Button
    const pushAllBtn = actionsBar.createEl('button', {
      text: filteredChangedFiles.length > 0 ? `⚡ Push (${filteredChangedFiles.length})` : 'Push Changed',
      cls: 'lenta-action-btn',
    });
    pushAllBtn.disabled = filteredChangedFiles.length === 0 || this.isPushing || this.isPulling;
    pushAllBtn.onclick = async () => {
      this.isPushing = true;
      this.statusMessage = `⏳ Pushing ${filteredChangedFiles.length} changed files...`;
      this.render();

      let pushed = 0;
      for (const item of filteredChangedFiles) {
        try {
          const res = await this.syncEngine.pushLocalNote(item.file);
          if (res.success) pushed++;
        } catch {
          // continue
        }
      }

      this.statusMessage = `✅ Bulk push complete: ${pushed}/${filteredChangedFiles.length} notes pushed.`;
      new Notice(`🍋 Pushed ${pushed}/${filteredChangedFiles.length} modified notes.`);
      this.isPushing = false;
      await this.loadChangedFiles();
    };

    // ▸ Git History & Restore Button (Multi-Git Container aware)
    const gitContainers = this.containers.filter(
      (c) => c.type === 'git' && (activeContainerIds.length === 0 || activeContainerIds.includes(c.id))
    );
    if (gitContainers.length > 0 || this.settings.connectedContainerType === 'git' || this.settings.containerKey) {
      const historyBtn = actionsBar.createEl('button', {
        text: '📜 Git History & Restore',
        cls: 'lenta-action-btn',
      });
      historyBtn.onclick = () => {
        const targetContainer = gitContainers.find((c) => c.id === this.selectedContainerFilter) || gitContainers[0];
        const gitContainerId = targetContainer?.id || this.activeContainerId || this.settings.containerKey || 'main-git-vault';
        const gitContainerName = targetContainer?.name || containerNameMap.get(gitContainerId) || 'Git Vault';
        new GitHistoryModal(this.app, this.apiClient, gitContainerId, gitContainerName).open();
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

    const filterScopeText = this.selectedContainerFilter !== 'all'
      ? ` in ${containerNameMap.get(this.selectedContainerFilter) || 'selected container'}`
      : '';

    changesHeader.createEl('h3', {
      text: this.isLoadingChanges
        ? '🔍 Scanning local changes...'
        : filteredChangedFiles.length > 0
        ? `📝 ${filteredChangedFiles.length} local change${filteredChangedFiles.length > 1 ? 's' : ''}${filterScopeText} (${syncedAtLabel})`
        : `✅ No local changes${filterScopeText} (${syncedAtLabel})`,
      cls: 'lenta-changes-title',
    });

    // Refresh changes button
    const refreshBtn = changesHeader.createEl('button', {
      text: '↺ Refresh',
      cls: 'lenta-changes-refresh-btn',
    });
    refreshBtn.onclick = () => this.loadChangedFiles();

    if (!this.isLoadingChanges && filteredChangedFiles.length > 0) {
      const changesList = changesSection.createDiv({ cls: 'lenta-changes-list' });

      for (const item of filteredChangedFiles) {
        const row = changesList.createDiv({ cls: 'lenta-change-row' });

        // Match container tag for item
        let containerTag = '';
        for (const [cId, cName] of containerNameMap.entries()) {
          if (item.relPath.includes(cName) || item.relPath.includes(cId)) {
            containerTag = cName;
            break;
          }
        }

        // File info
        const infoDiv = row.createDiv({ cls: 'lenta-change-info' });
        infoDiv.createSpan({ text: '📄 ', cls: 'lenta-change-icon' });
        infoDiv.createSpan({ text: item.title, cls: 'lenta-change-title' });
        if (containerTag) {
          const tagSpan = infoDiv.createSpan({ cls: 'lenta-container-badge-pill' });
          tagSpan.style.cssText = 'margin-left: 8px; padding: 2px 6px; background: #1f3323; border: 1px solid #335c3b; border-radius: 4px; color: #8ee29a; font-size: 0.75em;';
          tagSpan.setText(`📦 ${containerTag}`);
        }

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
