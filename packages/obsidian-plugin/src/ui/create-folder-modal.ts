import { App, Modal, Setting, Notice, normalizePath } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaFolderDto, LentaPluginSettings } from '../types';

export class LentaCreateFolderModal extends Modal {
  private apiClient: LentaApiClient;
  private getSettings: () => LentaPluginSettings;
  private onSuccess: (newFolder: LentaFolderDto) => void;
  private initialParentFolderId?: string;
  private initialParentFolderPath?: string;

  private folders: LentaFolderDto[] = [];
  private folderName = '';
  private selectedParentPath = '';
  private privacy: 'private' | 'public' = 'private';
  private icon = 'folder';
  private color = '#c9cd58';
  private previewEl?: HTMLElement;

  constructor(
    app: App,
    apiClient: LentaApiClient,
    getSettings: () => LentaPluginSettings,
    onSuccess: (newFolder: LentaFolderDto) => void,
    initialParentFolderId?: string,
    initialParentFolderPath?: string,
    defaultPrivacy?: 'private' | 'public'
  ) {
    super(app);
    this.apiClient = apiClient;
    this.getSettings = getSettings;
    this.onSuccess = onSuccess;
    this.initialParentFolderId = initialParentFolderId;
    this.initialParentFolderPath = initialParentFolderPath;
    if (initialParentFolderPath) {
      this.selectedParentPath = initialParentFolderPath;
    }
    if (defaultPrivacy) {
      this.privacy = defaultPrivacy;
    }
  }

  async onOpen() {
    this.modalEl.addClass('lenta-create-folder-modal');
    this.renderLoading();

    try {
      this.folders = await this.apiClient.getFolders().catch(() => []);
      this.render();
    } catch (err: any) {
      new Notice(`Failed to load Lenta folders: ${err.message}`);
      this.render();
    }
  }

  onClose() {
    this.contentEl.empty();
  }

  private renderLoading() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: '📁 Create Lenta Folder' });
    contentEl.createEl('p', { text: 'Loading existing folders from Lenta server...' });
  }

  private getFullComputedPath(): string {
    const cleanName = this.folderName.trim().replace(/^\/+|\/+$/g, '');
    if (!cleanName) return this.selectedParentPath ? `${this.selectedParentPath}/...` : '...';
    if (!this.selectedParentPath) return cleanName;
    return `${this.selectedParentPath}/${cleanName}`;
  }

  private updatePreview() {
    if (this.previewEl) {
      this.previewEl.setText(`📁 Path: ${this.getFullComputedPath()}`);
    }
  }

  private render() {
    const { contentEl } = this;
    contentEl.empty();

    const header = contentEl.createDiv({ cls: 'lenta-modal-header' });
    header.createEl('h2', { text: '📁 Create New Folder' });
    header.createEl('p', {
      cls: 'lenta-modal-subtitle',
      text: 'Add a new structured folder in Project Lenta and your local Obsidian vault.',
    });

    // 1. Folder Name Setting
    new Setting(contentEl)
      .setName('Folder Name')
      .setDesc('Enter the name for the new folder (e.g. "Projects", "Sprint-24", "Research")')
      .addText((text) => {
        text
          .setPlaceholder('e.g. 02_Projects or Research')
          .setValue(this.folderName)
          .onChange((val) => {
            this.folderName = val;
            this.updatePreview();
          });
        text.inputEl.focus();
      });

    // 2. Parent Folder Setting
    new Setting(contentEl)
      .setName('Parent Folder')
      .setDesc('Choose whether to place at root (/) or nest inside an existing folder')
      .addDropdown((dropdown) => {
        dropdown.addOption('', '📁 / (Root)');
        for (const f of this.folders) {
          dropdown.addOption(f.path, `📁 ${f.path}`);
        }
        dropdown.setValue(this.selectedParentPath);
        dropdown.onChange((val) => {
          this.selectedParentPath = val;
          this.updatePreview();
        });
      });

    // 3. Privacy & Scope Setting
    new Setting(contentEl)
      .setName('Privacy & Scope')
      .setDesc('Personal folders stay private in your vault; Public folders can be shared across feeds')
      .addDropdown((dropdown) => {
        dropdown.addOption('private', '🔒 Private (My Folders / Personal Vault)');
        dropdown.addOption('public', '🌐 Public (Shared Folders / Feeds)');
        dropdown.setValue(this.privacy);
        dropdown.onChange((val: 'private' | 'public') => {
          this.privacy = val;
        });
      });

    // 4. Icon & Color Setting
    new Setting(contentEl)
      .setName('Icon & Color')
      .setDesc('Optional Lucide icon name (e.g. "folder", "archive", "calendar", "star") and hex color')
      .addText((text) => {
        text
          .setPlaceholder('Icon (default: folder)')
          .setValue(this.icon)
          .onChange((val) => {
            this.icon = val.trim() || 'folder';
          });
      })
      .addColorPicker((picker) => {
        picker.setValue(this.color).onChange((val) => {
          this.color = val;
        });
      });

    // 5. Live Path Preview Box
    const previewBox = contentEl.createDiv({
      cls: 'lenta-sync-status-box',
      attr: { style: 'margin-top: 14px; font-weight: 500;' },
    });
    this.previewEl = previewBox.createDiv({
      cls: 'lenta-folder-path-preview',
      text: `📁 Path: ${this.getFullComputedPath()}`,
    });

    // 6. Footer Actions
    const footer = contentEl.createDiv({ cls: 'lenta-modal-footer' });
    const cancelBtn = footer.createEl('button', { text: 'Cancel', cls: 'mod-cancel' });
    cancelBtn.onclick = () => this.close();

    const submitBtn = footer.createEl('button', {
      text: 'Create Folder',
      cls: 'mod-cta lenta-btn-lemon',
    });

    submitBtn.onclick = async () => {
      const cleanName = this.folderName.trim().replace(/^\/+|\/+$/g, '');
      if (!cleanName) {
        new Notice('Please specify a folder name.');
        return;
      }
      if (
        cleanName.includes(':') ||
        cleanName.includes('*') ||
        cleanName.includes('?') ||
        cleanName.includes('"') ||
        cleanName.includes('<') ||
        cleanName.includes('>') ||
        cleanName.includes('|')
      ) {
        new Notice('Folder name contains illegal characters (: * ? " < > |)');
        return;
      }

      const fullPath = this.selectedParentPath
        ? `${this.selectedParentPath}/${cleanName}`
        : cleanName;

      submitBtn.disabled = true;
      submitBtn.setText('Creating...');

      try {
        const settings = this.getSettings();
        const activeContainerId =
          settings.activeContainerId ||
          (settings.activeContainerIds && settings.activeContainerIds[0]) ||
          null;

        // 1. Create on Lenta server
        const created = await this.apiClient.createFolder({
          path: fullPath,
          name: cleanName.split('/').pop() || cleanName,
          icon: this.icon,
          color: this.color,
          privacy: this.privacy,
          containerId: activeContainerId,
          scope: this.privacy === 'private' ? 'internal' : 'external',
        });

        // 2. Create in local Obsidian vault
        const rootFolder = settings.vaultRootFolder || 'Lemon-Seasons';
        const vaultFolderPath = normalizePath(`${rootFolder}/${fullPath}`);
        const parts = vaultFolderPath.split('/');
        let cur = '';
        for (const p of parts) {
          cur = cur ? `${cur}/${p}` : p;
          const norm = normalizePath(cur);
          if (!this.app.vault.getAbstractFileByPath(norm)) {
            await this.app.vault.createFolder(norm);
          }
        }

        new Notice(`🍋 Folder "${created.path}" created successfully!`);
        this.onSuccess(created);
        this.close();
      } catch (err: any) {
        new Notice(`Failed to create folder: ${err.message || err}`);
        submitBtn.disabled = false;
        submitBtn.setText('Create Folder');
      }
    };
  }
}
