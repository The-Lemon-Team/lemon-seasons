import { App, Modal } from 'obsidian';
import type { LentaApiClient } from '../services/lenta-api-client';
import type { LentaPluginSettings } from '../types';
import AiQuickAddModalComponent from './svelte/AiQuickAddModal.svelte';

export class LentaAiQuickAddModal extends Modal {
  private component?: AiQuickAddModalComponent;

  constructor(
    app: App,
    private apiClient: LentaApiClient,
    private getSettings: () => LentaPluginSettings,
    private onSuccess: (createdPaths: string[]) => void,
    private containerId?: string,
    private containerName?: string,
    private initialFolder?: string,
    private initialDate?: string,
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass('lenta-ai-quick-add-modal');
    this.modalEl.style.width = '720px';
    this.modalEl.style.maxWidth = '92vw';

    this.component = new (AiQuickAddModalComponent as any)({
      target: contentEl,
      props: {
        app: this.app,
        apiClient: this.apiClient,
        settings: this.getSettings(),
        containerId: this.containerId || this.getSettings().activeContainerId || undefined,
        containerName: this.containerName || this.getSettings().connectedContainerName || undefined,
        initialFolder: this.initialFolder,
        initialDate: this.initialDate,
        onClose: () => this.close(),
        onSuccess: (paths: string[]) => {
          this.onSuccess(paths);
          this.close();
        },
      },
    });
  }

  onClose() {
    if (this.component) {
      (this.component as any).$destroy();
      this.component = undefined;
    }
    this.contentEl.empty();
  }
}
