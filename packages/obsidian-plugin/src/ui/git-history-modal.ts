import { App, Modal, Notice, normalizePath } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaSyncEngine } from '../services/lenta-sync-engine';
import { scanChangedFiles, ChangedLentaFile } from '../services/changed-files-scanner';
import { renderContainerHeroCard } from './container-hero-card';
import {
  CommitSummaryDto,
  CommitDetailDto,
  CommitFileDiffDto,
  LentaContainerSummaryDto,
  LentaFolderDto,
  LentaPluginSettings,
  DEFAULT_SETTINGS,
} from '../types';
import { isContainerPublic } from '../utils/container-privacy';

export class GitHistoryModal extends Modal {
  private apiClient: LentaApiClient;
  private containerId: string;
  private containerName: string;
  private settings: LentaPluginSettings;
  private syncEngine?: LentaSyncEngine;

  private containerSummary: LentaContainerSummaryDto | null = null;
  private folders: LentaFolderDto[] = [];
  private changedFiles: ChangedLentaFile[] = [];
  private commits: CommitSummaryDto[] = [];
  private selectedCommitDetail: CommitDetailDto | null = null;
  private expandedCommitHash: string | null = null;
  private isLoading = false;
  private isRestoring = false;
  private statusMessage = '';

  constructor(
    app: App,
    apiClient: LentaApiClient,
    containerId: string,
    containerName?: string,
    settings?: LentaPluginSettings,
    syncEngine?: LentaSyncEngine
  ) {
    super(app);
    this.apiClient = apiClient;
    this.containerId = containerId;
    this.containerName = containerName || containerId;
    this.settings = settings || DEFAULT_SETTINGS;
    this.syncEngine = syncEngine;
  }

  async onOpen() {
    this.modalEl.addClass('lenta-git-history-modal-frame');
    await this.loadData();
  }

  onClose() {
    this.contentEl.empty();
  }

  private async loadData() {
    this.isLoading = true;
    this.render();

    try {
      const [commits, containers, folders, changed] = await Promise.all([
        this.apiClient.getContainerCommits(this.containerId, 50).catch(() => []),
        this.apiClient.listContainers({ fetchAll: true }).catch(() => []),
        this.apiClient.getFolders().catch(() => []),
        scanChangedFiles(this.app, this.settings).catch(() => []),
      ]);

      this.commits = commits;
      this.folders = folders;
      this.changedFiles = changed;

      // Find matching container summary or synthesize one
      const matched = containers.find((c) => c.id === this.containerId);
      if (matched) {
        this.containerSummary = matched;
      } else {
        const isPub = isContainerPublic({ id: this.containerId, name: this.containerName });
        const latestCommit = commits[0];
        this.containerSummary = {
          id: this.containerId,
          name: this.containerName,
          type: 'git',
          scope: { type: 'all' },
          totalNotes: 0,
          currentCommit: latestCommit?.hash,
          lastCommitMessage: latestCommit?.message,
          lastCommitDate: latestCommit?.date,
          isPublic: isPub,
          visibility: isPub ? 'public' : 'private',
          privacy: isPub ? 'public' : 'private',
        };
      }

      if (this.commits.length > 0 && !this.expandedCommitHash) {
        await this.loadCommitDetail(this.commits[0].hash);
      }
    } catch (err: any) {
      this.statusMessage = `Failed to load revision history: ${err.message}`;
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  private async loadCommitDetail(hash: string) {
    this.expandedCommitHash = hash;
    this.render();

    try {
      this.selectedCommitDetail = await this.apiClient.getCommitDetail(this.containerId, hash);
    } catch (err: any) {
      new Notice(`Failed to load commit detail: ${err.message}`);
    } finally {
      this.render();
    }
  }

  private async restoreFileFromCommit(file: CommitFileDiffDto, commit: CommitSummaryDto) {
    this.isRestoring = true;
    this.render();

    try {
      new Notice(`⏳ Restoring "${file.path}" from commit ${commit.shortHash}...`);

      // 1. Get file content at historical commit
      const fileVer = await this.apiClient.getFileVersion(this.containerId, file.path, commit.hash);

      // 2. Write file to local Obsidian vault
      const normPath = normalizePath(file.path);
      const vault = this.app.vault;

      // Ensure directory exists
      const lastSlash = normPath.lastIndexOf('/');
      if (lastSlash !== -1) {
        const dirPath = normPath.substring(0, lastSlash);
        const existingDir = vault.getAbstractFileByPath(dirPath);
        if (!existingDir) {
          await vault.createFolder(dirPath);
        }
      }

      const existingFile = vault.getAbstractFileByPath(normPath);
      if (existingFile) {
        await vault.modify(existingFile as any, fileVer.content);
      } else {
        await vault.create(normPath, fileVer.content);
      }

      // 3. Call server restore endpoint to record commit
      await this.apiClient.restoreFileVersion(
        this.containerId,
        file.path,
        commit.hash,
        `Revert/restore "${file.path}" from commit ${commit.shortHash} via Obsidian plugin`
      );

      new Notice(`✅ Successfully restored "${file.path}" from commit ${commit.shortHash}!`);
      this.statusMessage = `✅ Restored "${file.path}" from ${commit.shortHash}`;
    } catch (err: any) {
      new Notice(`Restore failed: ${err.message}`);
      this.statusMessage = `❌ Revert failed: ${err.message}`;
    } finally {
      this.isRestoring = false;
      await this.loadCommits();
    }
  }

  private render() {
    const { contentEl } = this;
    contentEl.empty();

    // ── Header ──────────────────────────────────────────────────────────────
    const header = contentEl.createDiv({ cls: 'lenta-history-header' });
    const titleRow = header.createDiv({ cls: 'lenta-history-title-row' });
    titleRow.createEl('h2', { text: '📜 Version History & Time Machine' });

    header.createEl('p', {
      cls: 'lenta-history-desc',
      text: 'Inspect container privacy, mapped folders, pending changes, past commits, and revert or restore deleted files.',
    });

    if (this.isLoading) {
      const loader = contentEl.createDiv({ cls: 'lenta-sync-loading-state' });
      loader.createEl('p', { text: 'Loading container details and revision history...' });
      return;
    }

    // ── Enriched Container Dashboard Hero Card ──────────────────────────────
    if (this.containerSummary) {
      const heroContainer = contentEl.createDiv({ cls: 'lenta-hero-container-wrap' });
      renderContainerHeroCard(heroContainer, this.containerSummary, {
        app: this.app,
        settings: this.settings,
        changedFiles: this.changedFiles,
        folders: this.folders,
        onRefresh: async () => {
          await this.loadData();
        },
        onPushPending: async () => {
          if (!this.syncEngine) {
            new Notice('Sync Engine not available');
            return;
          }
          const rootFolder = this.settings.vaultRootFolder || 'Lenta';
          const containerVaultPath = `${rootFolder}/${this.containerSummary?.name || this.containerId}`;
          const pending = this.changedFiles.filter((cf) =>
            cf.relPath.startsWith(containerVaultPath + '/') || cf.relPath.includes(this.containerId)
          );

          let pushed = 0;
          for (const item of pending) {
            try {
              const res = await this.syncEngine.pushLocalNote(item.file);
              if (res.success) pushed++;
            } catch {
              // continue
            }
          }
          new Notice(`🍋 Pushed ${pushed}/${pending.length} pending notes for ${this.containerName}!`);
          await this.loadData();
        },
      });
    }

    if (this.statusMessage) {
      const statusBox = contentEl.createDiv({ cls: 'lenta-sync-status-box' });
      statusBox.createEl('span', { text: this.statusMessage });
    }

    if (this.commits.length === 0) {
      const empty = contentEl.createDiv({ cls: 'lenta-sync-empty-state' });
      empty.createEl('h3', { text: 'No Revisions Found' });
      empty.createEl('p', { text: 'Make modifications or push changes to create snapshot revisions.' });
      return;
    }

    // ── Commit Timeline & Diffs ──────────────────────────────────────────────
    const mainBox = contentEl.createDiv({ cls: 'lenta-history-main-box' });
    mainBox.style.cssText = 'display: flex; gap: 16px; margin-top: 12px; max-height: 450px; overflow: hidden;';

    // Left Column: Commits List
    const commitsList = mainBox.createDiv({ cls: 'lenta-commits-list' });
    commitsList.style.cssText = 'flex: 1; overflow-y: auto; border-right: 1px solid #333; padding-right: 12px;';

    for (const c of this.commits) {
      const isSelected = this.expandedCommitHash === c.hash;
      const card = commitsList.createDiv({ cls: `lenta-commit-card ${isSelected ? 'selected' : ''}` });
      card.style.cssText = `padding: 10px; margin-bottom: 8px; border-radius: 6px; border: 1px solid ${isSelected ? '#a855f7' : '#333'}; background: ${isSelected ? '#1e142e' : '#1e1e1e'}; cursor: pointer; transition: all 0.15s;`;

      const topRow = card.createDiv({ cls: 'lenta-commit-top' });
      topRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 0.85em; font-family: monospace;';

      const hashSpan = topRow.createSpan({ text: c.shortHash });
      hashSpan.style.cssText = 'font-weight: bold; color: #d8b4fe;';

      const dateSpan = topRow.createSpan({ text: c.relativeDate || new Date(c.date).toLocaleDateString() });
      dateSpan.style.cssText = 'color: #888;';

      const msgEl = card.createEl('p', { text: c.message });
      msgEl.style.cssText = 'margin: 4px 0 2px 0; font-size: 0.9em; font-weight: 500; color: #eee;';

      const authorSpan = card.createEl('span', { text: `By ${c.author}` });
      authorSpan.style.cssText = 'font-size: 0.78em; color: #aaa;';

      card.onclick = () => this.loadCommitDetail(c.hash);
    }

    // Right Column: Detail & File Revert Actions
    const detailBox = mainBox.createDiv({ cls: 'lenta-commit-detail-box' });
    detailBox.style.cssText = 'flex: 1.4; overflow-y: auto; padding-left: 4px;';

    if (this.selectedCommitDetail) {
      const detail = this.selectedCommitDetail;
      const detailHeader = detailBox.createDiv();
      detailHeader.style.cssText = 'margin-bottom: 12px; pb-2; border-bottom: 1px solid #333;';

      detailHeader.createEl('h3', { text: `Revision ${detail.shortHash}`, cls: 'lenta-detail-title' });
      detailHeader.createEl('p', { text: detail.message, cls: 'lenta-detail-msg' });

      const filesHeader = detailBox.createDiv({ cls: 'lenta-files-header' });
      filesHeader.createEl('h4', { text: `Files Changed in this Revision (${detail.files?.length || 0}):` });

      if (detail.files && detail.files.length > 0) {
        for (const file of detail.files) {
          const fileRow = detailBox.createDiv({ cls: 'lenta-file-diff-row' });
          fileRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; margin-bottom: 6px; background: #141616; border: 1px solid #242828; border-radius: 6px; font-size: 0.85em; font-family: monospace;';

          const left = fileRow.createDiv();
          left.style.cssText = 'display: flex; align-items: center; gap: 8px; overflow: hidden;';

          const statusBadge = left.createSpan({ text: file.status.toUpperCase() });
          const badgeColor =
            file.status === 'added' ? '#8ee29a' : file.status === 'deleted' ? '#e2928e' : '#e5e971';
          statusBadge.style.cssText = `padding: 2px 6px; border-radius: 4px; font-size: 0.75em; font-weight: bold; background: ${badgeColor}22; color: ${badgeColor}; border: 1px solid ${badgeColor}44;`;

          const pathSpan = left.createSpan({ text: file.path });
          pathSpan.style.cssText = 'color: #e2e2e2; word-break: break-all;';

          // Restore action button
          const restoreBtn = fileRow.createEl('button', {
            text: this.isRestoring ? '⏳' : file.status === 'deleted' ? '↺ Restore Deleted File' : '↺ Revert to this Version',
            cls: file.status === 'deleted' ? 'mod-cta' : '',
          });
          restoreBtn.disabled = this.isRestoring;
          restoreBtn.style.cssText = 'font-size: 0.8em; padding: 4px 8px; white-space: nowrap;';
          restoreBtn.onclick = () => this.restoreFileFromCommit(file, detail);
        }
      } else {
        detailBox.createEl('p', { text: 'No file diff details available for this revision.' });
      }
    } else {
      detailBox.createEl('p', { text: 'Select a revision from the left to inspect file changes.' });
    }
  }
}
