import { App, Modal, Setting } from 'obsidian';
import { ConflictStrategy, FileDiffItemDto } from '../types';

export class ConflictResolutionModal extends Modal {
  private fileDiff: FileDiffItemDto;
  private onResolve: (strategy: ConflictStrategy) => void;

  constructor(
    app: App,
    fileDiff: FileDiffItemDto,
    onResolve: (strategy: ConflictStrategy) => void
  ) {
    super(app);
    this.fileDiff = fileDiff;
    this.onResolve = onResolve;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass('lenta-conflict-modal');

    contentEl.createEl('h2', { text: `⚠️ Merge Conflict: ${this.fileDiff.path}` });
    contentEl.createEl('p', {
      cls: 'lenta-modal-desc',
      text: 'Both the local Obsidian note and the Lenta server have conflicting changes.',
    });

    const diffContainer = contentEl.createDiv({ cls: 'lenta-diff-preview-container' });

    const localBox = diffContainer.createDiv({ cls: 'lenta-diff-pane local' });
    localBox.createEl('h4', { text: 'Local Obsidian Version' });
    const localPre = localBox.createEl('pre');
    localPre.createEl('code', { text: this.fileDiff.clientContent || '(empty)' });

    const serverBox = diffContainer.createDiv({ cls: 'lenta-diff-pane server' });
    serverBox.createEl('h4', { text: 'Remote Lenta Version' });
    const serverPre = serverBox.createEl('pre');
    serverPre.createEl('code', { text: this.fileDiff.serverContent || '(empty)' });

    contentEl.createEl('h3', { text: 'Choose Resolution Strategy' });

    const actions = contentEl.createDiv({ cls: 'lenta-conflict-actions' });

    const keepLocalBtn = actions.createEl('button', {
      text: 'Keep Local Version (Client Wins)',
      cls: 'mod-cta lenta-action-btn',
    });
    keepLocalBtn.onclick = () => {
      this.onResolve('client_wins');
      this.close();
    };

    const keepServerBtn = actions.createEl('button', {
      text: 'Accept Remote Version (Server Wins)',
      cls: 'mod-warning lenta-action-btn',
    });
    keepServerBtn.onclick = () => {
      this.onResolve('server_wins');
      this.close();
    };

    const forkBtn = actions.createEl('button', {
      text: 'Keep Both (Create .local-backup.md)',
      cls: 'lenta-action-btn',
    });
    forkBtn.onclick = () => {
      this.onResolve('create_backup_fork');
      this.close();
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}
