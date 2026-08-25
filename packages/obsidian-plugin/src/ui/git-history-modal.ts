import { App, Modal, Notice, normalizePath } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { CommitSummaryDto, CommitDetailDto, CommitFileDiffDto } from '../types';

export class GitHistoryModal extends Modal {
  private apiClient: LentaApiClient;
  private containerId: string;
  private containerName: string;

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
    containerName?: string
  ) {
    super(app);
    this.apiClient = apiClient;
    this.containerId = containerId;
    this.containerName = containerName || containerId;
  }

  async onOpen() {
    this.modalEl.addClass('lenta-git-history-modal-frame');
    await this.loadCommits();
  }

  onClose() {
    this.contentEl.empty();
  }

  private async loadCommits() {
    this.isLoading = true;
    this.render();

    try {
      this.commits = await this.apiClient.getContainerCommits(this.containerId, 50);
      if (this.commits.length > 0 && !this.expandedCommitHash) {
        await this.loadCommitDetail(this.commits[0].hash);
      }
    } catch (err: any) {
      this.statusMessage = `Failed to load Git history: ${err.message}`;
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
    titleRow.createEl('h2', { text: '📜 Git Version History & Time Machine' });

    const badgeRow = header.createDiv({ cls: 'lenta-badge-row' });
    const badge = badgeRow.createSpan({ cls: 'lenta-badge' });
    badge.setText(this.containerName.toUpperCase());

    header.createEl('p', {
      cls: 'lenta-history-desc',
      text: 'Inspect past commits, view diffs of modified/deleted files, and revert or restore deleted files and folders.',
    });

    if (this.isLoading) {
      const loader = contentEl.createDiv({ cls: 'lenta-sync-loading-state' });
      loader.createEl('p', { text: 'Loading Git revision history...' });
      return;
    }

    if (this.statusMessage) {
      const statusBox = contentEl.createDiv({ cls: 'lenta-sync-status-box' });
      statusBox.createEl('span', { text: this.statusMessage });
    }

    if (this.commits.length === 0) {
      const empty = contentEl.createDiv({ cls: 'lenta-sync-empty-state' });
      empty.createEl('h3', { text: 'No Git Commits Found' });
      empty.createEl('p', { text: 'Make modifications or push changes to create Git revisions.' });
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
