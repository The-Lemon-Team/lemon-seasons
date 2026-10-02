import { App, Modal, Setting, Notice, setIcon } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaSyncEngine } from '../services/lenta-sync-engine';
import {
  LentaPluginSettings,
  SyncSession,
  SyncStatusResponse,
  PendingChange,
} from '../types';

export class LentaSessionCommitModal extends Modal {
  private apiClient: LentaApiClient;
  private syncEngine: LentaSyncEngine;
  private getSettings: () => LentaPluginSettings;
  private onSessionUpdated?: () => Promise<void> | void;

  private syncStatus: SyncStatusResponse | null = null;
  private activeSession: SyncSession | null = null;
  private pendingChanges: PendingChange[] = [];
  private isLoading = true;
  private isCommitting = false;
  private isPulling = false;

  private commitSummary: string = '';
  private autoPush: boolean = true;
  private newSessionTitle: string = '';

  constructor(
    app: App,
    apiClient: LentaApiClient,
    syncEngine: LentaSyncEngine,
    getSettings: () => LentaPluginSettings,
    onSessionUpdated?: () => Promise<void> | void
  ) {
    super(app);
    this.apiClient = apiClient;
    this.syncEngine = syncEngine;
    this.getSettings = getSettings;
    this.onSessionUpdated = onSessionUpdated;
  }

  async onOpen() {
    this.modalEl.addClass('lenta-session-modal');
    this.modalEl.style.cssText =
      'max-width: 680px; width: 90vw; max-height: 85vh; border-radius: 12px; border: 1px solid rgba(201, 205, 88, 0.35); overflow-y: auto;';
    await this.loadData();
  }

  onClose() {
    this.contentEl.empty();
  }

  private async loadData() {
    this.isLoading = true;
    this.render();

    try {
      const settings = this.getSettings();
      const deviceId = settings.deviceId || 'obsidian-workstation';
      const status = await this.apiClient.getSyncStatus(deviceId).catch(() => null);
      this.syncStatus = status;
      this.activeSession = status?.activeSession || null;

      if (this.activeSession) {
        this.commitSummary = this.activeSession.title || '';
        this.pendingChanges = await this.apiClient
          .getPendingSessionChanges(this.activeSession.id, deviceId)
          .catch(() => []);
      } else {
        this.pendingChanges = [];
        this.newSessionTitle = `Сессия Obsidian ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
      }
    } catch (err: any) {
      new Notice(`Ошибка загрузки статуса сессии: ${err.message}`);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  private render() {
    const { contentEl } = this;
    contentEl.empty();

    // ── Header ───────────────────────────────────────────
    const header = contentEl.createDiv({ cls: 'lenta-modal-header' });
    header.style.cssText =
      'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 12px; margin-bottom: 16px;';

    const titleWrap = header.createDiv({ cls: 'lenta-header-title-wrap' });
    const title = titleWrap.createEl('h3', {
      text: '🍋 Сессия рабочей станции & Google Drive',
    });
    title.style.cssText = 'margin: 0; color: #c9cd58; font-size: 1.2em; display: flex; align-items: center; gap: 8px;';

    const deviceSub = titleWrap.createEl('span');
    deviceSub.style.cssText = 'font-size: 0.8em; color: var(--text-muted); font-family: var(--font-monospace);';
    deviceSub.setText(`Устройство: ${this.getSettings().deviceId || 'obsidian-workstation'}`);

    if (this.isLoading) {
      const loadingEl = contentEl.createDiv({ cls: 'lenta-loading' });
      loadingEl.style.cssText = 'padding: 40px; text-align: center; color: var(--text-muted);';
      loadingEl.setText('⏳ Загрузка статуса сессии и коммитов Google Drive...');
      return;
    }

    // ── Cloud Relay Status Card ───────────────────────────
    const relayCard = contentEl.createDiv();
    relayCard.style.cssText =
      'background: var(--background-secondary); border-radius: 8px; border: 1px solid var(--background-modifier-border); padding: 12px 14px; margin-bottom: 16px; font-size: 0.88em;';

    const relayRow = relayCard.createDiv();
    relayRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

    const relayInfo = relayRow.createDiv();
    relayInfo.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    const relayDot = relayInfo.createSpan();
    relayDot.style.cssText =
      'width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block;';

    const relayText = relayInfo.createSpan();
    relayText.innerHTML = `<strong>Google Drive Storage Relay:</strong> <code>C:\\remote</code>`;

    if (this.syncStatus?.lastCommit) {
      const commitInfo = relayCard.createDiv();
      commitInfo.style.cssText =
        'margin-top: 6px; color: var(--text-muted); font-family: var(--font-monospace); font-size: 0.9em;';
      const c = this.syncStatus.lastCommit;
      commitInfo.setText(
        `Последний коммит: #${c.id.slice(0, 10)} (${c.entitiesCount} сущн.) • ${new Date(c.createdAt).toLocaleTimeString()}`
      );
    }

    // ── Active Session / Idle State ───────────────────────
    if (this.activeSession) {
      this.renderActiveSessionView(contentEl);
    } else {
      this.renderIdleSessionView(contentEl);
    }

    // ── Cloud Pull Section ────────────────────────────────
    this.renderCloudPullSection(contentEl);
  }

  private renderActiveSessionView(container: HTMLElement) {
    const sessionCard = container.createDiv();
    sessionCard.style.cssText =
      'background: rgba(201, 205, 88, 0.06); border: 1px solid rgba(201, 205, 88, 0.35); border-radius: 8px; padding: 16px; margin-bottom: 16px;';

    const sessionHeader = sessionCard.createDiv();
    sessionHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;';

    const sTitle = sessionHeader.createDiv();
    sTitle.style.cssText = 'font-weight: 600; color: #e5e971; font-size: 1.05em; display: flex; align-items: center; gap: 6px;';
    sTitle.innerHTML = `<span style="color: #c9cd58">⚡</span> ${this.activeSession?.title}`;

    const deltasBadge = sessionHeader.createSpan();
    const count = this.pendingChanges.length || this.syncStatus?.pendingChangesCount || 0;
    deltasBadge.style.cssText =
      'background: rgba(201, 205, 88, 0.2); color: #c9cd58; font-weight: bold; font-family: var(--font-monospace); padding: 2px 8px; border-radius: 12px; font-size: 0.85em;';
    deltasBadge.setText(`+${count} правок`);

    const metaRow = sessionCard.createDiv();
    metaRow.style.cssText =
      'color: var(--text-muted); font-size: 0.85em; margin-bottom: 12px; display: flex; gap: 16px; flex-wrap: wrap;';
    metaRow.innerHTML = `
      <span>Автор: <strong>${this.activeSession?.author || 'Пользователь'}</strong></span>
      <span>Начало: <strong>${new Date(this.activeSession?.startedAt || '').toLocaleTimeString()}</strong></span>
    `;

    // Pending changes list preview
    if (this.pendingChanges.length > 0) {
      const changesListTitle = sessionCard.createEl('div', { text: 'Накопленные дельты сессии:' });
      changesListTitle.style.cssText =
        'font-size: 0.85em; font-weight: 600; margin-bottom: 6px; color: var(--text-normal);';

      const listContainer = sessionCard.createDiv();
      listContainer.style.cssText =
        'max-height: 140px; overflow-y: auto; background: var(--background-primary); border-radius: 6px; border: 1px solid var(--background-modifier-border); padding: 6px 8px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 4px;';

      for (const change of this.pendingChanges) {
        const itemRow = listContainer.createDiv();
        itemRow.style.cssText =
          'display: flex; align-items: center; justify-content: space-between; font-size: 0.8em; font-family: var(--font-monospace); padding: 3px 6px; border-radius: 4px; background: var(--background-secondary);';

        const left = itemRow.createDiv();
        left.style.cssText = 'display: flex; align-items: center; gap: 6px; overflow: hidden;';

        const tagBadge = left.createSpan();
        tagBadge.style.cssText =
          'padding: 1px 4px; border-radius: 3px; font-size: 0.75em; font-weight: bold; background: rgba(59, 130, 246, 0.15); color: #60a5fa;';
        tagBadge.setText(change.entityType);

        const changeName = left.createSpan();
        changeName.style.cssText = 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px;';
        changeName.setText(change.payload?.title || change.entityId);

        const actionBadge = itemRow.createSpan();
        actionBadge.style.cssText =
          'color: #22c55e; font-weight: 600; font-size: 0.75em; flex-shrink: 0;';
        actionBadge.setText(change.action);
      }
    }

    // Commit Message Input
    new Setting(sessionCard)
      .setName('Описание коммита (Summary)')
      .setDesc('Кратко зафиксируйте, какие изменения были внесены в рамках этой сессии.')
      .addText((text) =>
        text
          .setPlaceholder('Например: Добавлены заметки по релизам Marvel и аналитике')
          .setValue(this.commitSummary)
          .onChange((val) => {
            this.commitSummary = val;
          })
      );

    // Auto-push checkbox
    new Setting(sessionCard)
      .setName('Отправить в Google Drive Relay')
      .setDesc('Атомарно запечатать коммит в C:\\remote\\commits и синхронизировать с облаком.')
      .addToggle((toggle) =>
        toggle.setValue(this.autoPush).onChange((val) => {
          this.autoPush = val;
        })
      );

    // Action buttons
    const btnRow = sessionCard.createDiv();
    btnRow.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 14px;';

    const cancelBtn = btnRow.createEl('button', {
      text: 'Сбросить сессию',
      cls: 'mod-warning',
    });
    cancelBtn.style.cssText = 'cursor: pointer; padding: 6px 12px; font-size: 0.85em;';
    cancelBtn.onclick = async () => {
      if (confirm('Вы уверены, что хотите отменить эту сессию и сбросить накопленные дельты?')) {
        await this.handleCancelSession();
      }
    };

    const commitBtn = btnRow.createEl('button', {
      text: this.isCommitting ? 'Фиксация...' : 'Закоммитить сессию ✓',
      cls: 'mod-cta lenta-btn-lemon',
    });
    commitBtn.style.cssText =
      'cursor: pointer; padding: 6px 16px; font-weight: 600; font-size: 0.9em; background: #c9cd58; color: #121414;';
    commitBtn.disabled = this.isCommitting;
    commitBtn.onclick = () => this.handleCommitSession();
  }

  private renderIdleSessionView(container: HTMLElement) {
    const idleCard = container.createDiv();
    idleCard.style.cssText =
      'background: var(--background-secondary); border-radius: 8px; border: 1px dashed var(--background-modifier-border); padding: 18px; margin-bottom: 16px; text-align: center;';

    const idleTitle = idleCard.createEl('h4', { text: '🟢 Рабочая станция готова (Live Режим)' });
    idleTitle.style.cssText = 'margin-top: 0; margin-bottom: 6px; color: var(--text-normal);';

    const idleDesc = idleCard.createEl('p');
    idleDesc.style.cssText = 'color: var(--text-muted); font-size: 0.88em; margin-bottom: 16px;';
    idleDesc.setText(
      'Активной сессии сейчас нет. Сессия запустится автоматически при внесении правок в заметки, либо вы можете открыть её вручную с персональным заголовком.'
    );

    const startRow = idleCard.createDiv();
    startRow.style.cssText = 'display: flex; gap: 8px; justify-content: center; max-width: 440px; margin: 0 auto;';

    const input = startRow.createEl('input', {
      type: 'text',
      placeholder: 'Название новой сессии...',
      value: this.newSessionTitle,
    });
    input.style.cssText = 'flex: 1; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--background-modifier-border);';
    input.oninput = (e: any) => {
      this.newSessionTitle = e.target.value;
    };

    const startBtn = startRow.createEl('button', {
      text: 'Начать сессию',
      cls: 'mod-cta',
    });
    startBtn.style.cssText = 'cursor: pointer; font-weight: 600; padding: 6px 14px;';
    startBtn.onclick = () => this.handleStartSession();
  }

  private renderCloudPullSection(container: HTMLElement) {
    const pullCard = container.createDiv();
    pullCard.style.cssText =
      'background: var(--background-secondary); border-radius: 8px; border: 1px solid var(--background-modifier-border); padding: 14px; display: flex; justify-content: space-between; align-items: center;';

    const pullInfo = pullCard.createDiv();
    const pullTitle = pullInfo.createDiv();
    pullTitle.style.cssText = 'font-weight: 600; font-size: 0.9em; margin-bottom: 2px;';
    pullTitle.setText('Синхронизация с Google Drive (Cloud Pull)');

    const pullDesc = pullInfo.createDiv();
    pullDesc.style.cssText = 'color: var(--text-muted); font-size: 0.82em;';
    pullDesc.setText('Скачивает коммиты с других устройств (Android, ПК 2) и накатывает их в Obsidian.');

    const pullBtn = pullCard.createEl('button', {
      text: this.isPulling ? 'Обновление...' : 'Подтянуть коммиты ⬇',
      cls: 'lenta-pull-btn',
    });
    pullBtn.style.cssText =
      'cursor: pointer; padding: 7px 14px; font-weight: 600; border-radius: 6px; border: 1px solid rgba(201, 205, 88, 0.4); background: rgba(201, 205, 88, 0.12); color: #e5e971;';
    pullBtn.disabled = this.isPulling;
    pullBtn.onclick = () => this.handlePullFromCloud();
  }

  private async handleCommitSession() {
    if (!this.activeSession) return;
    this.isCommitting = true;
    this.render();

    try {
      const summary = this.commitSummary.trim() || this.activeSession.title;
      const res = await this.syncEngine.commitWorkstationSession(summary, this.autoPush);

      new Notice(
        `🍋 Сессия зафиксирована! Коммит #${res.commit?.id?.slice(0, 8)} отправлен в Google Drive.`
      );
      if (this.onSessionUpdated) {
        await this.onSessionUpdated();
      }
      this.close();
    } catch (err: any) {
      new Notice(`Ошибка фиксации сессии: ${err.message}`);
      this.isCommitting = false;
      this.render();
    }
  }

  private async handleCancelSession() {
    if (!this.activeSession) return;
    try {
      await this.apiClient.cancelSession(this.activeSession.id);
      new Notice('🍋 Сессия отменена, несохраненные дельты сброшены.');
      if (this.onSessionUpdated) {
        await this.onSessionUpdated();
      }
      await this.loadData();
    } catch (err: any) {
      new Notice(`Ошибка отмены сессии: ${err.message}`);
    }
  }

  private async handleStartSession() {
    const title = this.newSessionTitle.trim();
    if (!title) {
      new Notice('Пожалуйста, введите название сессии.');
      return;
    }

    try {
      const settings = this.getSettings();
      await this.apiClient.startSession({
        title,
        deviceId: settings.deviceId || 'obsidian-workstation',
        author: settings.sessionAuthor || settings.username || 'Obsidian',
      });
      new Notice(`🍋 Сессия "${title}" запущена!`);
      if (this.onSessionUpdated) {
        await this.onSessionUpdated();
      }
      await this.loadData();
    } catch (err: any) {
      new Notice(`Ошибка запуска сессии: ${err.message}`);
    }
  }

  private async handlePullFromCloud() {
    this.isPulling = true;
    this.render();

    try {
      const res = await this.syncEngine.pullCloudChanges();
      const count = res.cloudResult.pulledCommits?.length || 0;
      if (count > 0) {
        new Notice(
          `🍋 Подтянуто ${count} коммитов из Google Drive! Обновлено ${res.pulledCount} файлов заметок.`
        );
      } else {
        new Notice('🍋 Все данные актуальны. Новых коммитов в Google Drive нет.');
      }

      if (this.onSessionUpdated) {
        await this.onSessionUpdated();
      }
      await this.loadData();
    } catch (err: any) {
      new Notice(`Ошибка синхронизации с облаком: ${err.message}`);
      this.isPulling = false;
      this.render();
    }
  }
}
