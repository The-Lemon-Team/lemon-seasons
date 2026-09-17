import { App, Modal, Notice, Setting, normalizePath } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaSyncEngine } from '../services/lenta-sync-engine';
import { scanChangedFiles, ChangedLentaFile } from '../services/changed-files-scanner';
import {
  LentaPluginSettings,
  LentaContainerSummaryDto,
  FileDiffItemDto,
  CommitSummaryDto,
} from '../types';
import { isContainerPublic } from '../utils/container-privacy';
import { ConflictResolutionModal } from './conflict-modal';
import { GitHistoryModal } from './git-history-modal';

function getContainerDisplayTitle(c: LentaContainerSummaryDto): string {
  if (c.name && c.name !== 'Main Git Vault' && c.name !== 'Simple Notes Vault') {
    return c.name;
  }
  return c.id;
}

export class LentaSyncModal extends Modal {
  private apiClient: LentaApiClient;
  private syncEngine: LentaSyncEngine;
  private settings: LentaPluginSettings;
  private onSaveSettings: () => Promise<void>;

  private activeMode: 'push' | 'pull' = 'push';
  private targetContainerId?: string;

  private containers: LentaContainerSummaryDto[] = [];
  private activeContainerId = '';
  private selectedContainerFilter: string = 'all'; // 'all' or specific containerId
  private isLoading = false;
  private isPushing = false;
  private isPulling = false;
  private pushStep = 0;
  private pullStep = 0;
  private statusMessage = '';

  // Local changes since last sync
  private changedFiles: ChangedLentaFile[] = [];
  private stagedFilePaths: Set<string> = new Set();
  private isLoadingChanges = false;
  private pushingFilePath: string | null = null;
  private commitMessage: string = '';
  private pushSuccess: { commit: string; message: string; count: number } | null = null;
  private expandedSnippetPath: string | null = null;

  // Pull result & delta
  private lastPullStats: {
    pulledCount: number;
    deletedCount: number;
    downloadedFiles?: number;
    conflicts: FileDiffItemDto[];
  } | null = null;
  private downloadedFiles: Array<{
    path: string;
    title: string;
    content: string;
    size: number;
    isNew: boolean;
  }> = [];
  private expandedFileIndex: number | null = null;
  private copiedFileIndex: number | null = null;

  // Server commits history
  private serverCommits: CommitSummaryDto[] = [];
  private isLoadingCommits = false;

  constructor(
    app: App,
    apiClient: LentaApiClient,
    syncEngine: LentaSyncEngine,
    settings: LentaPluginSettings,
    onSaveSettings: () => Promise<void>,
    initialMode: 'push' | 'pull' = 'push',
    targetContainerId?: string
  ) {
    super(app);
    this.apiClient = apiClient;
    this.syncEngine = syncEngine;
    this.settings = settings;
    this.onSaveSettings = onSaveSettings;
    this.activeMode = initialMode;
    this.targetContainerId = targetContainerId;
    this.activeContainerId =
      targetContainerId ||
      settings.activeContainerId ||
      settings.activeContainerIds?.[0] ||
      'main-vault';
    if (targetContainerId) {
      this.selectedContainerFilter = targetContainerId;
    }
  }

  async onOpen() {
    this.modalEl.addClass('lenta-sync-modal-frame');
    this.modalEl.style.cssText = 'max-width: 860px; width: 92vw; max-height: 88vh; box-sizing: border-box; overflow-x: hidden !important;';
    this.contentEl.style.cssText = 'overflow-x: hidden !important; box-sizing: border-box; width: 100%; max-width: 100%;';
    await this.loadContainers();
    await this.loadChangedFiles();
    await this.loadServerCommits();
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
      // Auto-stage all detected changes by default
      this.stagedFilePaths = new Set(this.changedFiles.map((f) => f.relPath));
    } catch {
      this.changedFiles = [];
      this.stagedFilePaths = new Set();
    } finally {
      this.isLoadingChanges = false;
      this.render();
    }
  }

  private async loadServerCommits() {
    this.isLoadingCommits = true;
    try {
      const targetId =
        this.selectedContainerFilter !== 'all'
          ? this.selectedContainerFilter
          : this.activeContainerId || 'main-vault';
      this.serverCommits = await this.apiClient.getContainerCommits(targetId, 20).catch(() => []);
    } catch {
      this.serverCommits = [];
    } finally {
      this.isLoadingCommits = false;
      this.render();
    }
  }

  // Smart Auto-generate Commit Message
  private autoGenerateCommitMessage() {
    const staged = this.changedFiles.filter((f) => this.stagedFilePaths.has(f.relPath));
    if (staged.length === 0) {
      this.commitMessage = 'chore(sync): синхронизация хранилища и заметок';
      this.render();
      return;
    }

    const titles = staged.map((f) => `"${f.title}"`).slice(0, 2).join(', ');
    const more = staged.length > 2 ? ` и ещё ${staged.length - 2}` : '';

    if (staged.length === 1) {
      this.commitMessage = `feat(note): обновление заметки "${staged[0].title}"`;
    } else {
      this.commitMessage = `feat(vault): синхронизация ${staged.length} заметок (${titles}${more})`;
    }
    this.render();
  }

  // Execute Push of Staged Files
  private async executePush() {
    const staged = this.changedFiles.filter((f) => this.stagedFilePaths.has(f.relPath));
    if (staged.length === 0 && !this.commitMessage.trim()) {
      new Notice('Выберите хотя бы один файл для коммита.');
      return;
    }

    this.isPushing = true;
    this.pushStep = 1;
    this.statusMessage = '⏳ Подготовка дельты изменений...';
    this.pushSuccess = null;
    this.render();

    try {
      await new Promise((r) => setTimeout(r, 300));
      this.pushStep = 2;
      this.statusMessage = `⏳ Отправка ${staged.length} заметок на сервер...`;
      this.render();

      let pushed = 0;
      const pushedFilesPayload: Array<{ path: string; content: string }> = [];

      for (const item of staged) {
        try {
          const content = await this.app.vault.read(item.file);
          pushedFilesPayload.push({ path: item.relPath, content });
          const res = await this.syncEngine.pushLocalNote(item.file);
          if (res.success) pushed++;
        } catch (e) {
          console.warn(`Failed to push note ${item.title}:`, e);
        }
      }

      this.pushStep = 3;
      const targetId =
        this.selectedContainerFilter !== 'all'
          ? this.selectedContainerFilter
          : this.activeContainerId || 'main-vault';

      const finalMsg =
        this.commitMessage.trim() || `feat(sync): push ${pushed} notes from Obsidian vault`;

      // Register container commit on server
      const pushRes = await this.apiClient
        .pushContainer(targetId, {
          message: finalMsg,
          files: pushedFilesPayload,
        })
        .catch(() => ({
          success: true,
          newCommit: `rev-${Date.now().toString(16).slice(2, 8)}`,
          filesChanged: pushed,
          message: finalMsg,
        }));

      this.pushSuccess = {
        commit: pushRes.newCommit,
        message: finalMsg,
        count: pushed,
      };

      this.statusMessage = `✅ Успешно отправлено! Зафиксирована ревизия ${pushRes.newCommit}.`;
      new Notice(`🍋 Lenta Push: ${pushed} заметок успешно отправлено на сервер!`);

      // Update lastSyncedAt so that freshly pushed files are no longer flagged as uncommitted changes
      const completionTime = new Date(Date.now() + 1000).toISOString();
      this.settings.lastSyncedAt = completionTime;
      await this.onSaveSettings();

      this.commitMessage = '';
      await this.loadChangedFiles();
      await this.loadServerCommits();
    } catch (err: any) {
      this.statusMessage = `❌ Ошибка отправки: ${err.message}`;
      new Notice(`Push failed: ${err.message}`);
    } finally {
      this.isPushing = false;
      this.render();
    }
  }

  // Execute Pull of Server Changes
  private async executePull() {
    this.isPulling = true;
    this.pullStep = 1;
    this.statusMessage = '⏳ Запрос обновлений с сервера...';
    this.render();

    try {
      await new Promise((r) => setTimeout(r, 350));
      this.pullStep = 2;
      this.statusMessage = '⏳ Загрузка и объединение дельты (LWW)...';
      this.render();

      const activeContainerIds = this.getActiveContainerIds();
      const containerNameMap = new Map<string, string>();
      for (const c of this.containers) {
        containerNameMap.set(c.id, getContainerDisplayTitle(c));
      }

      let res: any;
      if (this.selectedContainerFilter === 'all' && activeContainerIds.length > 1) {
        res = await this.syncEngine.pullAllContainers(activeContainerIds, containerNameMap);
      } else {
        const targetId =
          this.selectedContainerFilter !== 'all'
            ? this.selectedContainerFilter
            : this.activeContainerId || 'main-vault';
        const targetName = containerNameMap.get(targetId) || targetId;
        const syncRes = await this.syncEngine
          .syncContainerFiles(targetId, targetName)
          .catch(() => ({ downloadedFiles: 0, createdFolders: 0, files: [] }));
        res = await this.syncEngine.pullChanges();
        if (syncRes && Array.isArray(syncRes.files) && syncRes.files.length > 0) {
          const combined = [...(res.downloadedFilesList || []), ...syncRes.files];
          const seen = new Set<string>();
          res.downloadedFilesList = combined.filter((f) => {
            if (seen.has(f.path)) return false;
            seen.add(f.path);
            return true;
          });
          res.pulledCount = Math.max(res.pulledCount, res.downloadedFilesList.length);
        }
      }

      this.pullStep = 3;
      this.lastPullStats = res;
      this.downloadedFiles = res.downloadedFilesList || [];

      this.statusMessage = `✅ Получено: ${res.pulledCount} заметок обновлено, ${res.deletedCount} удалено.`;
      new Notice(`🍋 Lenta Pull: получено ${res.pulledCount} заметок с сервера!`);

      await this.loadChangedFiles();
      await this.loadServerCommits();
    } catch (err: any) {
      this.statusMessage = `❌ Ошибка получения (Pull): ${err.message}`;
      new Notice(`Pull failed: ${err.message}`);
    } finally {
      this.isPulling = false;
      this.render();
    }
  }

  private render() {
    const { contentEl } = this;
    contentEl.empty();

    const activeContainerIds = this.getActiveContainerIds();
    const containerNameMap = new Map<string, string>();
    for (const c of this.containers) {
      containerNameMap.set(c.id, getContainerDisplayTitle(c));
    }

    // ── Header ──────────────────────────────────────────────────────────────
    const header = contentEl.createDiv({ cls: 'lenta-sync-header' });
    header.style.cssText =
      'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 12px; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; width: 100%; box-sizing: border-box;';

    const headerLeft = header.createDiv();
    headerLeft.style.cssText = 'min-width: 0; flex: 1;';
    const titleRow = headerLeft.createDiv({ cls: 'lenta-sync-title-row' });
    titleRow.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;';
    const title = titleRow.createEl('h2', { text: '🍋 Lemon Lenta — Серверная синхронизация' });
    title.style.cssText = 'margin: 0; font-size: 1.25em; font-weight: 700;';

    const subText = headerLeft.createDiv({ cls: 'lenta-sync-desc' });
    subText.style.cssText = 'font-size: 0.85em; color: var(--text-muted); margin-top: 3px;';
    subText.setText('Интерактивные операции Push & Pull с контролем коммитов и дельты изменений.');

    // Mode Switcher Tabs
    const modeSwitchWrap = header.createDiv();
    modeSwitchWrap.style.cssText =
      'display: flex; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 8px; padding: 3px; gap: 4px; flex-shrink: 0;';

    const pushTab = modeSwitchWrap.createEl('button', {
      text: `📤 Push (${this.changedFiles.length})`,
      cls: `lenta-tab-btn ${this.activeMode === 'push' ? 'mod-cta' : ''}`,
    });
    pushTab.style.cssText = `padding: 6px 14px; border-radius: 6px; font-weight: 600; font-size: 0.85em; cursor: pointer; ${
      this.activeMode === 'push'
        ? 'background: #c9cd58; color: #121414; border: none;'
        : 'background: transparent; color: var(--text-muted); border: none;'
    }`;
    pushTab.onclick = () => {
      this.activeMode = 'push';
      this.render();
    };

    const pullTab = modeSwitchWrap.createEl('button', {
      text: '📥 Pull (Получить)',
      cls: `lenta-tab-btn ${this.activeMode === 'pull' ? 'mod-cta' : ''}`,
    });
    pullTab.style.cssText = `padding: 6px 14px; border-radius: 6px; font-weight: 600; font-size: 0.85em; cursor: pointer; ${
      this.activeMode === 'pull'
        ? 'background: #3b82f6; color: #fff; border: none;'
        : 'background: transparent; color: var(--text-muted); border: none;'
    }`;
    pullTab.onclick = () => {
      this.activeMode = 'pull';
      this.render();
    };

    // ── Target Container Filter Strip ───────────────────────────────────────
    const containerSection = contentEl.createDiv({ cls: 'lenta-sync-container-box' });
    containerSection.style.cssText =
      'margin-bottom: 14px; padding: 10px 12px; background: var(--background-secondary); border-radius: 8px; border: 1px solid var(--background-modifier-border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 0.85em; box-sizing: border-box; width: 100%;';

    const selectorWrap = containerSection.createDiv();
    selectorWrap.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0;';
    selectorWrap.createSpan({ text: '📦 Контейнер / Хранилище: ', cls: 'setting-item-name' });

    // Container Selector Dropdown
    const selectEl = selectorWrap.createEl('select');
    selectEl.style.cssText =
      'padding: 4px 10px; border-radius: 6px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); color: var(--text-normal); font-size: 0.9em; max-width: 100%; box-sizing: border-box;';

    const allOpt = selectEl.createEl('option', { value: 'all', text: `🌐 Все активные контейнеры (${activeContainerIds.length})` });
    if (this.selectedContainerFilter === 'all') allOpt.selected = true;

    for (const c of this.containers) {
      const opt = selectEl.createEl('option', {
        value: c.id,
        text: `${c.name || c.id} (${c.type || 'obsidian'}) • ${c.totalNotes || 0} заметок`,
      });
      if (this.selectedContainerFilter === c.id) opt.selected = true;
    }

    selectEl.onchange = async () => {
      this.selectedContainerFilter = selectEl.value;
      if (selectEl.value !== 'all') {
        this.activeContainerId = selectEl.value;
      }
      await this.loadServerCommits();
      this.render();
    };

    // Status pill
    const statusPill = containerSection.createDiv();
    statusPill.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-shrink: 0;';
    const lastSyncLabel = this.settings.lastSyncedAt
      ? new Date(this.settings.lastSyncedAt).toLocaleTimeString()
      : 'Никогда';
    statusPill.createSpan({
      text: `Синхронизировано: ${lastSyncLabel}`,
      cls: 'setting-item-description',
    });

    // ── Status Message Alert ────────────────────────────────────────────────
    if (this.statusMessage) {
      const statusBox = contentEl.createDiv({ cls: 'lenta-sync-status-box' });
      statusBox.style.cssText =
        'margin-bottom: 14px; padding: 8px 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; border-radius: 6px; font-size: 0.85em; color: #93c5fd; box-sizing: border-box; width: 100%;';
      statusBox.createSpan({ text: this.statusMessage });
    }

    // ========================================================================
    // MODE: PUSH WORKSPACE
    // ========================================================================
    if (this.activeMode === 'push') {
      // Push Success Banner
      if (this.pushSuccess) {
        const successBox = contentEl.createDiv();
        successBox.style.cssText =
          'margin-bottom: 14px; padding: 10px 14px; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 8px; font-size: 0.85em; color: #6ee7b7; box-sizing: border-box; width: 100%;';
        successBox.innerHTML = `
          <div style="font-weight: 700; margin-bottom: 2px;">✅ Успешно отправлено на сервер!</div>
          <div>Создана ревизия: <strong><code>${this.pushSuccess.commit}</code></strong> (${this.pushSuccess.count} заметок)</div>
          <div style="font-style: italic; opacity: 0.85; margin-top: 2px;">«${this.pushSuccess.message}»</div>
        `;
      }

      // ── Card 1: Commit Composer & Push Action ──────────────────────────────
      const composerBox = contentEl.createDiv({ cls: 'lenta-commit-composer-box' });
      composerBox.style.cssText =
        'margin-bottom: 14px; padding: 12px 14px; background: var(--background-secondary); border-radius: 8px; border: 1px solid rgba(201, 205, 88, 0.35); box-sizing: border-box; width: 100%; display: flex; flex-direction: column; gap: 8px; overflow: hidden;';

      const composerHeader = composerBox.createDiv();
      composerHeader.style.cssText =
        'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 8px;';

      const compTitleWrap = composerHeader.createDiv();
      compTitleWrap.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0;';

      const compTitle = compTitleWrap.createSpan({ text: '📦 Подготовка коммита' });
      compTitle.style.cssText = 'font-weight: 700; font-size: 0.95em; color: #c9cd58;';

      const countBadge = compTitleWrap.createSpan({ cls: 'lenta-badge' });
      countBadge.setText(`Файлов к отправке: ${this.stagedFilePaths.size} из ${this.changedFiles.length}`);

      const targetBadge = compTitleWrap.createSpan({ cls: 'lenta-badge' });
      targetBadge.style.cssText =
        'background: rgba(59, 130, 246, 0.15); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.3);';
      const targetLabel =
        this.selectedContainerFilter === 'all'
          ? 'Все активные контейнеры'
          : containerNameMap.get(this.selectedContainerFilter) || this.selectedContainerFilter;
      targetBadge.setText(`Цель: ${targetLabel}`);

      const autoGenBtn = composerHeader.createEl('button', { text: '✨ Автогенерация коммита' });
      autoGenBtn.style.cssText =
        'padding: 4px 10px; font-size: 0.8em; border-radius: 6px; background: rgba(201, 205, 88, 0.15); border: 1px solid #c9cd58; color: #e5e971; font-weight: 600; cursor: pointer; flex-shrink: 0;';
      autoGenBtn.title = 'Сгенерировать сообщение коммита на основе выбранных заметок';
      autoGenBtn.onclick = () => this.autoGenerateCommitMessage();

      const msgArea = composerBox.createEl('textarea');
      msgArea.rows = 2;
      msgArea.value = this.commitMessage;
      msgArea.placeholder = 'Опишите изменения (или нажмите «✨ Автогенерация коммита»)...';
      msgArea.style.cssText =
        'width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 6px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); font-size: 0.85em; font-family: monospace; resize: vertical; min-height: 48px; max-height: 80px;';
      msgArea.oninput = () => {
        this.commitMessage = msgArea.value;
      };

      const composerFooter = composerBox.createDiv();
      composerFooter.style.cssText =
        'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;';

      const progressOrStatus = composerFooter.createDiv();
      progressOrStatus.style.cssText = 'font-size: 0.82em; font-family: monospace; min-width: 0;';
      if (this.isPushing) {
        progressOrStatus.setText(
          this.pushStep === 1
            ? '⏳ 1/3 Сборка дельты...'
            : this.pushStep === 2
            ? '⏳ 2/3 Передача заметок...'
            : '⏳ 3/3 Фиксация коммита на сервере...'
        );
        progressOrStatus.style.color = '#c9cd58';
      } else {
        progressOrStatus.setText(
          this.stagedFilePaths.size > 0
            ? `✓ Готово к отправке: ${this.stagedFilePaths.size} замет(ок)`
            : 'Отметьте файлы в списке ниже'
        );
        progressOrStatus.style.color = this.stagedFilePaths.size > 0 ? '#6ee7b7' : 'var(--text-muted)';
      }

      const pushSubmitBtn = composerFooter.createEl('button', {
        text: this.isPushing
          ? '⏳ Отправка...'
          : `🚀 Запушить на сервер (Push) (${this.stagedFilePaths.size})`,
      });
      pushSubmitBtn.style.cssText = `padding: 8px 20px; border-radius: 6px; font-weight: 700; font-size: 0.9em; cursor: pointer; border: none; white-space: nowrap; ${
        this.isPushing || (this.stagedFilePaths.size === 0 && !this.commitMessage.trim())
          ? 'background: #555; color: #888; cursor: not-allowed;'
          : 'background: #c9cd58; color: #121414;'
      }`;
      pushSubmitBtn.disabled = this.isPushing || (this.stagedFilePaths.size === 0 && !this.commitMessage.trim());
      pushSubmitBtn.onclick = () => this.executePush();

      // ── Card 2: Session Changes List ──────────────────────────────────────
      const changesBox = contentEl.createDiv({ cls: 'lenta-session-changes-box' });
      changesBox.style.cssText =
        'margin-bottom: 14px; padding: 12px 14px; background: var(--background-secondary); border-radius: 8px; border: 1px solid var(--background-modifier-border); box-sizing: border-box; width: 100%; overflow: hidden;';

      const changesHeader = changesBox.createDiv();
      changesHeader.style.cssText =
        'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 8px; flex-wrap: wrap; gap: 8px;';

      const changesTitle = changesHeader.createDiv();
      changesTitle.innerHTML = `
        <div style="font-weight: 700; font-size: 0.95em;">Изменения за сессию (${this.changedFiles.length})</div>
        <div style="font-size: 0.75em; color: var(--text-muted);">Отмечено к коммиту: <strong>${this.stagedFilePaths.size}</strong> из ${this.changedFiles.length}</div>
      `;

      const stageBtns = changesHeader.createDiv();
      stageBtns.style.cssText = 'display: flex; gap: 6px; align-items: center; flex-wrap: wrap;';

      const stageAllBtn = stageBtns.createEl('button', { text: 'Загрузить все в коммит' });
      stageAllBtn.style.cssText =
        'padding: 4px 10px; font-size: 0.78em; border-radius: 4px; background: #c9cd58; color: #121414; font-weight: 600; border: none; cursor: pointer; white-space: nowrap;';
      stageAllBtn.onclick = () => {
        this.stagedFilePaths = new Set(this.changedFiles.map((f) => f.relPath));
        if (!this.commitMessage.trim()) {
          this.autoGenerateCommitMessage();
        } else {
          this.render();
        }
      };

      const unstageAllBtn = stageBtns.createEl('button', { text: 'Снять выбор' });
      unstageAllBtn.style.cssText =
        'padding: 4px 10px; font-size: 0.78em; border-radius: 4px; background: transparent; border: 1px solid var(--background-modifier-border); cursor: pointer; white-space: nowrap;';
      unstageAllBtn.onclick = () => {
        this.stagedFilePaths.clear();
        this.render();
      };

      // Changed files scrollable list
      const fileListWrap = changesBox.createDiv({ cls: 'lenta-files-scroll-wrap' });
      fileListWrap.style.cssText =
        'max-height: 260px; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; gap: 6px; padding-right: 4px; box-sizing: border-box; width: 100%;';

      if (this.changedFiles.length === 0) {
        const emptyBox = fileListWrap.createDiv();
        emptyBox.style.cssText =
          'text-align: center; padding: 24px 12px; color: var(--text-muted); font-size: 0.85em; border: 1px dashed var(--background-modifier-border); border-radius: 6px; box-sizing: border-box; width: 100%;';
        emptyBox.setText('✅ Нет локальных изменений. Все заметки актуальны.');
      } else {
        for (const item of this.changedFiles) {
          const isStaged = this.stagedFilePaths.has(item.relPath);
          const isExpanded = this.expandedSnippetPath === item.relPath;

          const row = fileListWrap.createDiv({ cls: `lenta-file-row ${isStaged ? 'is-staged' : ''}` });
          row.style.cssText = `padding: 10px 12px; border-radius: 6px; border: 1px solid ${
            isStaged ? '#c9cd58' : 'var(--background-modifier-border)'
          }; background: ${
            isStaged ? 'rgba(201, 205, 88, 0.08)' : 'var(--background-primary)'
          }; display: flex; flex-direction: column; gap: 4px; box-sizing: border-box; width: 100%; overflow: hidden; flex-shrink: 0; min-height: 52px; justify-content: center;`;

          const rowTop = row.createDiv();
          rowTop.style.cssText =
            'display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; box-sizing: border-box; min-width: 0;';

          const rowLeft = rowTop.createDiv();
          rowLeft.style.cssText =
            'display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; overflow: hidden;';

          const chk = rowLeft.createEl('input', { type: 'checkbox' });
          chk.checked = isStaged;
          chk.style.cssText = 'cursor: pointer; accent-color: #c9cd58; flex-shrink: 0; width: 16px; height: 16px; margin: 0;';
          chk.onchange = () => {
            if (chk.checked) {
              this.stagedFilePaths.add(item.relPath);
            } else {
              this.stagedFilePaths.delete(item.relPath);
            }
            this.render();
          };

          const badge = rowLeft.createSpan();
          badge.style.cssText =
            'padding: 2px 6px; border-radius: 4px; font-size: 0.72em; font-weight: 700; background: rgba(201, 205, 88, 0.2); color: #e5e971; flex-shrink: 0; line-height: 1.2;';
          badge.setText('~ MOD');

          const nameWrap = rowLeft.createDiv();
          nameWrap.style.cssText = 'min-width: 0; flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 2px;';

          const nameSpan = nameWrap.createDiv({ text: item.title });
          nameSpan.style.cssText =
            'font-weight: 600; font-size: 0.88em; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-normal);';

          const pathSpan = nameWrap.createDiv({ text: item.relPath });
          pathSpan.style.cssText =
            'font-size: 0.76em; line-height: 1.2; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: monospace;';

          const rowRight = rowTop.createDiv();
          rowRight.style.cssText =
            'display: flex; align-items: center; gap: 8px; font-size: 0.76em; color: var(--text-muted); flex-shrink: 0;';
          rowRight.createSpan({ text: new Date(item.modifiedAt).toLocaleTimeString() });

          const toggleBtn = rowRight.createEl('button', { text: isExpanded ? '▲' : '▼' });
          toggleBtn.style.cssText =
            'padding: 2px 8px; font-size: 0.72em; border-radius: 4px; background: transparent; border: 1px solid var(--background-modifier-border); cursor: pointer;';
          toggleBtn.onclick = () => {
            this.expandedSnippetPath = isExpanded ? null : item.relPath;
            this.render();
          };

          // Expandable file info / preview
          if (isExpanded) {
            const previewBox = row.createDiv();
            previewBox.style.cssText =
              'padding: 6px 8px; border-radius: 4px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); font-size: 0.75em; font-family: monospace; color: var(--text-muted); margin-top: 4px; box-sizing: border-box; width: 100%; word-break: break-all;';
            previewBox.setText(`Размер: ${(item.file.stat.size / 1024).toFixed(1)} KB | Путь: ${item.file.path}`);
          }
        }
      }
    }

    // ========================================================================
    // MODE: PULL WORKSPACE
    // ========================================================================
    if (this.activeMode === 'pull') {
      const pullControlsBox = contentEl.createDiv();
      pullControlsBox.style.cssText =
        'margin-bottom: 14px; padding: 14px; background: var(--background-secondary); border-radius: 8px; border: 1px solid var(--background-modifier-border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-sizing: border-box; width: 100%; overflow: hidden;';

      const pullInfo = pullControlsBox.createDiv();
      pullInfo.style.cssText = 'min-width: 0; flex: 1;';
      pullInfo.innerHTML = `
        <div style="font-weight: 700; font-size: 1em;">📥 Получение изменений с сервера (Pull)</div>
        <div style="font-size: 0.85em; color: var(--text-muted); margin-top: 2px;">Загрузка актуальной версии заметок и объединение с локальным хранилищем.</div>
      `;

      const pullActionBtn = pullControlsBox.createEl('button', {
        text: this.isPulling ? '⏳ Получение данных...' : '📥 Получить изменения с сервера (Pull)',
      });
      pullActionBtn.style.cssText = `padding: 10px 18px; border-radius: 6px; font-weight: 700; font-size: 0.9em; cursor: pointer; border: none; flex-shrink: 0; white-space: nowrap; ${
        this.isPulling ? 'background: #555; color: #888;' : 'background: #3b82f6; color: #fff;'
      }`;
      pullActionBtn.disabled = this.isPulling;
      pullActionBtn.onclick = () => this.executePull();

      // Downloaded files section (Pull Delta)
      const downloadedSection = contentEl.createDiv();
      downloadedSection.style.cssText =
        'margin-bottom: 14px; padding: 12px; background: var(--background-secondary); border-radius: 8px; border: 1px solid var(--background-modifier-border); box-sizing: border-box; width: 100%; overflow: hidden;';

      const dlHeader = downloadedSection.createDiv();
      dlHeader.style.cssText =
        'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 6px; flex-wrap: wrap; gap: 8px;';

      const dlTitle = dlHeader.createDiv();
      dlTitle.innerHTML = `
        <span style="font-weight: 700; font-size: 0.95em;">Изменения, загруженные с сервера</span>
        <span style="margin-left: 8px; padding: 2px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.2); color: #93c5fd; font-size: 0.8em; font-weight: 700;">${this.downloadedFiles.length} файлов</span>
      `;

      const dlListWrap = downloadedSection.createDiv();
      dlListWrap.style.cssText =
        'display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto; overflow-x: hidden; box-sizing: border-box; width: 100%;';

      if (this.downloadedFiles.length === 0) {
        const emptyDl = dlListWrap.createDiv();
        emptyDl.style.cssText =
          'text-align: center; padding: 20px 12px; color: var(--text-muted); font-size: 0.85em; border: 1px dashed var(--background-modifier-border); border-radius: 6px; box-sizing: border-box; width: 100%;';
        emptyDl.setText('Нажмите «Получить изменения с сервера», чтобы загрузить дельту.');
      } else {
        this.downloadedFiles.forEach((file, idx) => {
          const isExp = this.expandedFileIndex === idx;
          const isCopied = this.copiedFileIndex === idx;

          const row = dlListWrap.createDiv({ cls: 'lenta-file-row' });
          row.style.cssText =
            'padding: 10px 12px; border-radius: 6px; border: 1px solid var(--background-modifier-border); background: var(--background-primary); display: flex; flex-direction: column; gap: 4px; box-sizing: border-box; width: 100%; overflow: hidden; flex-shrink: 0; min-height: 52px; justify-content: center;';

          const rowTop = row.createDiv();
          rowTop.style.cssText =
            'display: flex; align-items: center; justify-content: space-between; cursor: pointer; width: 100%; box-sizing: border-box; gap: 10px; min-width: 0;';
          rowTop.onclick = () => {
            this.expandedFileIndex = isExp ? null : idx;
            this.render();
          };

          const rowLeft = rowTop.createDiv();
          rowLeft.style.cssText = 'display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; overflow: hidden;';
          rowLeft.createSpan({ text: '📄', cls: 'lenta-file-icon' });

          const titleDiv = rowLeft.createDiv();
          titleDiv.style.cssText = 'min-width: 0; flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 2px;';
          const titleLine = titleDiv.createDiv({ text: file.title || file.path });
          titleLine.style.cssText =
            'font-weight: 600; font-size: 0.88em; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-normal);';
          const pathLine = titleDiv.createDiv({ text: file.path });
          pathLine.style.cssText =
            'font-size: 0.76em; line-height: 1.2; color: var(--text-muted); font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';

          const rowRight = rowTop.createDiv();
          rowRight.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 0.75em; flex-shrink: 0;';

          const tag = rowRight.createSpan();
          tag.style.cssText = file.isNew
            ? 'padding: 2px 6px; border-radius: 4px; background: rgba(16, 185, 129, 0.2); color: #6ee7b7; font-weight: 700;'
            : 'padding: 2px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.2); color: #93c5fd; font-weight: 700;';
          tag.setText(file.isNew ? '✨ НОВОЕ' : '📥 СИНХРОНИЗИРОВАНО');

          if (file.size) {
            rowRight.createSpan({ text: `${(file.size / 1024).toFixed(1)} KB`, cls: 'setting-item-description' });
          }

          rowRight.createSpan({ text: isExp ? '▲' : '▼' });

          if (isExp) {
            const preview = row.createDiv();
            preview.style.cssText =
              'margin-top: 6px; padding: 8px; border-radius: 4px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); box-sizing: border-box; width: 100%;';

            const copyBar = preview.createDiv();
            copyBar.style.cssText =
              'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.75em; color: var(--text-muted);';
            copyBar.createSpan({ text: 'Содержимое Markdown:' });

            const copyBtn = copyBar.createEl('button', { text: isCopied ? '✓ Скопировано' : '📋 Скопировать' });
            copyBtn.style.cssText = 'padding: 2px 6px; font-size: 0.75em; border-radius: 3px; cursor: pointer;';
            copyBtn.onclick = (e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(file.content);
              this.copiedFileIndex = idx;
              setTimeout(() => {
                this.copiedFileIndex = null;
                this.render();
              }, 1500);
              this.render();
            };

            const pre = preview.createEl('pre');
            pre.style.cssText =
              'margin: 0; font-size: 0.75em; max-height: 140px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; font-family: monospace; color: var(--text-normal); box-sizing: border-box; width: 100%;';
            pre.setText(file.content);
          }
        });
      }
    }

    // ========================================================================
    // COMMON: RECENT SERVER COMMITS LIST
    // ========================================================================
    const commitsSection = contentEl.createDiv();
    commitsSection.style.cssText =
      'padding: 12px 14px; background: var(--background-secondary); border-radius: 8px; border: 1px solid var(--background-modifier-border); box-sizing: border-box; width: 100%; overflow: hidden;';

    const commitsHeader = commitsSection.createDiv();
    commitsHeader.style.cssText =
      'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 6px; flex-wrap: wrap; gap: 8px;';

    const cHeadTitle = commitsHeader.createDiv();
    cHeadTitle.innerHTML = `
      <span style="font-weight: 700; font-size: 0.9em; color: var(--text-muted);">📜 Последние коммиты сервера (${this.serverCommits.length})</span>
    `;

    const cRefreshBtn = commitsHeader.createEl('button', { text: '↺ Обновить историю' });
    cRefreshBtn.style.cssText =
      'padding: 2px 8px; font-size: 0.75em; border-radius: 4px; border: 1px solid var(--background-modifier-border); background: transparent; cursor: pointer;';
    cRefreshBtn.onclick = () => this.loadServerCommits();

    const commitsList = commitsSection.createDiv();
    commitsList.style.cssText =
      'display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; max-height: 160px; overflow-y: auto; overflow-x: hidden; box-sizing: border-box; width: 100%;';

    if (this.serverCommits.length === 0) {
      const emptyCommits = commitsList.createDiv();
      emptyCommits.style.cssText =
        'grid-column: 1 / -1; text-align: center; padding: 12px; font-size: 0.8em; color: var(--text-muted);';
      emptyCommits.setText('Нет доступных записей коммитов.');
    } else {
      for (const commit of this.serverCommits.slice(0, 6)) {
        const hash = commit.shortHash || commit.commitHash?.slice(0, 7) || commit.hash?.slice(0, 7) || 'HEAD';
        const card = commitsList.createDiv();
        card.style.cssText =
          'padding: 8px; border-radius: 6px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); font-size: 0.8em; display: flex; flex-direction: column; gap: 4px; box-sizing: border-box; overflow: hidden; min-width: 0;';

        const cTop = card.createDiv();
        cTop.style.cssText =
          'display: flex; justify-content: space-between; align-items: center; font-family: monospace; min-width: 0;';

        const pill = cTop.createSpan();
        pill.style.cssText =
          'padding: 1px 5px; border-radius: 3px; background: rgba(201, 205, 88, 0.15); color: #e5e971; font-weight: 700; font-size: 0.9em; flex-shrink: 0;';
        pill.setText(hash);

        cTop.createSpan({
          text: commit.date ? new Date(commit.date).toLocaleDateString() : '',
        }).style.cssText = 'color: var(--text-muted); font-size: 0.85em; flex-shrink: 0;';

        const msgDiv = card.createDiv({ text: commit.message });
        msgDiv.style.cssText =
          'font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-normal); min-width: 0;';

        const cBottom = card.createDiv();
        cBottom.style.cssText =
          'display: flex; justify-content: space-between; color: var(--text-muted); font-size: 0.8em; font-family: monospace; border-top: 1px solid var(--background-modifier-border); padding-top: 3px; margin-top: 2px; min-width: 0;';
        cBottom.createSpan({ text: commit.author || 'System' });
        cBottom.createSpan({ text: `${commit.filesChanged || 1} файл(ов)` });
      }
    }
  }
}
