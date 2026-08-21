import { App, Modal, Notice, Setting } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaSyncEngine } from '../services/lenta-sync-engine';
import {
  LentaPluginSettings,
  LentaContainerSummaryDto,
  FileDiffItemDto,
} from '../types';
import { ConflictResolutionModal } from './conflict-modal';

export class LentaSyncModal extends Modal {
  private apiClient: LentaApiClient;
  private syncEngine: LentaSyncEngine;
  private settings: LentaPluginSettings;
  private onSaveSettings: () => Promise<void>;

  private containers: LentaContainerSummaryDto[] = [];
  private activeContainerId = '';
  private isLoading = false;
  private statusMessage = '';
  private lastPullStats: { pulledCount: number; deletedCount: number; conflicts: FileDiffItemDto[] } | null = null;

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

  private render() {
    const { contentEl } = this;
    contentEl.empty();

    // 1. Header
    const header = contentEl.createDiv({ cls: 'lenta-sync-header' });
    const titleRow = header.createDiv({ cls: 'lenta-sync-title-row' });
    titleRow.createEl('h2', { text: '🍋 Lemon Lenta — Sync Hub' });

    const badge = titleRow.createSpan({ cls: 'lenta-badge' });
    badge.setText(this.isLoading ? 'CONNECTING...' : 'ONLINE');

    const desc = header.createEl('p', {
      cls: 'lenta-sync-desc',
      text: 'Synchronize chronological notes, feeds, and taxonomy between Project Lenta server and Obsidian.',
    });

    // 2. Scoped Container / Feed Selector
    const containerSection = contentEl.createDiv({ cls: 'lenta-sync-container-box' });
    new Setting(containerSection)
      .setName('Active Feed / Container Scope')
      .setDesc('Choose which feed or dynamic preset to sync with this vault')
      .addDropdown((dropdown) => {
        for (const c of this.containers) {
          dropdown.addOption(c.id, `${c.name} (${c.totalNotes} notes)`);
        }
        dropdown.setValue(this.activeContainerId);
        dropdown.onChange(async (val) => {
          this.activeContainerId = val;
          this.settings.activeContainerId = val;
          await this.onSaveSettings();
          this.render();
        });
      });

    // 3. Sync Actions Bar
    const actionsBar = contentEl.createDiv({ cls: 'lenta-sync-actions-bar' });

    const pullBtn = actionsBar.createEl('button', {
      text: this.isLoading ? 'Syncing...' : '📥 Pull Delta Changes',
      cls: 'mod-cta lenta-btn-lemon',
    });
    pullBtn.disabled = this.isLoading;
    pullBtn.onclick = async () => {
      this.isLoading = true;
      this.statusMessage = 'Fetching delta changes from Lenta server...';
      this.render();

      try {
        const stats = await this.syncEngine.pullChanges();
        this.lastPullStats = stats;
        this.statusMessage = `✅ Sync complete: ${stats.pulledCount} notes updated, ${stats.deletedCount} soft-deleted.`;
        if (stats.conflicts.length > 0) {
          new Notice(`⚠️ ${stats.conflicts.length} conflict(s) detected.`);
        } else {
          new Notice(`🍋 Pulled ${stats.pulledCount} notes successfully!`);
        }
      } catch (err: any) {
        this.statusMessage = `❌ Sync failed: ${err.message}`;
        new Notice(`Sync failed: ${err.message}`);
      } finally {
        this.isLoading = false;
        this.render();
      }
    };

    const pushActiveBtn = actionsBar.createEl('button', {
      text: '📤 Push Current Active Note',
      cls: 'lenta-action-btn',
    });
    pushActiveBtn.onclick = async () => {
      const activeFile = this.app.workspace.getActiveFile();
      if (!activeFile) {
        new Notice('No active Markdown note open in editor.');
        return;
      }
      try {
        const res = await this.syncEngine.pushLocalNote(activeFile);
        if (res.success) {
          new Notice(`🍋 Pushed note "${res.note?.title}" to Lenta server!`);
        }
      } catch (err: any) {
        new Notice(`Failed to push note: ${err.message}`);
      }
    };

    // 4. Status and Stats View
    if (this.statusMessage) {
      const statusBox = contentEl.createDiv({ cls: 'lenta-sync-status-box' });
      statusBox.createEl('span', { text: this.statusMessage });
    }

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

    // 5. Metadata details footer
    const footer = contentEl.createDiv({ cls: 'lenta-sync-footer' });
    const lastSyncText = this.settings.lastSyncedAt
      ? new Date(this.settings.lastSyncedAt).toLocaleString()
      : 'Never';
    footer.createEl('span', { text: `Last Synced: ${lastSyncText} | Vault Root: /${this.settings.vaultRootFolder}` });
  }
}
