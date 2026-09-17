import { App, Modal, Setting, Notice, normalizePath, TFile } from 'obsidian';
import { LentaApiClient } from '../services/lenta-api-client';
import { LentaFrontmatterUtil } from '../services/lenta-frontmatter';
import {
  LentaFeedDto,
  LentaTaxonomyNodeDto,
  LentaFolderDto,
  NoteType,
  LentaPluginSettings,
} from '../types';

export class LentaQuickAddModal extends Modal {
  private apiClient: LentaApiClient;
  private getSettings: () => LentaPluginSettings;
  private onSuccess: (filePath: string) => void;

  private feeds: LentaFeedDto[] = [];
  private folders: LentaFolderDto[] = [];
  private taxonomyNodes: LentaTaxonomyNodeDto[] = [];

  // Form State
  private title = '';
  private feedId = '';
  private type: NoteType = 'EVENT';
  private startDate = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  private endDate = '';
  private selectedFolderId = '';
  private selectedTaxonomyId = '';
  private sourceLink = '';
  private icon = '';
  private description = '';
  private initialFolderId?: string;
  private initialFolderPath?: string;

  constructor(
    app: App,
    apiClient: LentaApiClient,
    getSettings: () => LentaPluginSettings,
    onSuccess: (filePath: string) => void,
    initialFolderId?: string,
    initialFolderPath?: string
  ) {
    super(app);
    this.apiClient = apiClient;
    this.getSettings = getSettings;
    this.onSuccess = onSuccess;
    this.initialFolderId = initialFolderId;
    this.initialFolderPath = initialFolderPath;
    if (initialFolderId) {
      this.selectedFolderId = initialFolderId;
    }
  }

  async onOpen() {
    this.modalEl.addClass('lenta-quick-add-modal');
    this.renderLoading();

    try {
      const [feeds, folders, taxonomy] = await Promise.all([
        this.apiClient.getFeeds().catch(() => []),
        this.apiClient.getFolders().catch(() => []),
        this.apiClient.getTaxonomyTree().catch(() => []),
      ]);

      this.feeds = feeds;
      this.folders = folders;
      this.taxonomyNodes = taxonomy;

      if (this.selectedFolderId) {
        const matched = folders.find((f) => f.id === this.selectedFolderId || f.path === this.selectedFolderId);
        if (matched) {
          this.selectedFolderId = matched.id;
        } else if (this.initialFolderPath) {
          const byPath = folders.find((f) => f.path === this.initialFolderPath || f.name === this.initialFolderPath);
          if (byPath) {
            this.selectedFolderId = byPath.id;
          }
        }
      } else if (this.initialFolderPath) {
        const matched = folders.find((f) => f.path === this.initialFolderPath || f.name === this.initialFolderPath);
        if (matched) {
          this.selectedFolderId = matched.id;
        }
      }

      if (feeds.length > 0 && !this.feedId) {
        const defaultSlug = this.getSettings().defaultFeedSlug;
        const defaultFeed = feeds.find((f) => f.slug === defaultSlug) || feeds[0];
        this.feedId = defaultFeed.id;
      }

      this.render();
    } catch (err: any) {
      new Notice(`Failed to load Lenta options: ${err.message}`);
      this.render();
    }
  }

  onClose() {
    this.contentEl.empty();
  }

  private renderLoading() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: '🍋 Lenta Quick Add Note' });
    contentEl.createEl('p', { text: 'Loading feeds and taxonomy from Lenta server...' });
  }

  private render() {
    const { contentEl } = this;
    contentEl.empty();

    const targetFolder = this.folders.find((f) => f.id === this.selectedFolderId);
    const folderDisplay = targetFolder ? targetFolder.path : this.initialFolderPath;

    const header = contentEl.createDiv({ cls: 'lenta-modal-header' });
    header.createEl('h2', { text: '🍋 Create Lenta Note' });
    header.createEl('p', {
      cls: 'lenta-modal-subtitle',
      text: folderDisplay
        ? `Target folder: 📁 ${folderDisplay}`
        : 'Add a new time-based record to Project Lenta and your local Obsidian vault.',
    });

    // 1. Title
    new Setting(contentEl)
      .setName('Note Title')
      .setDesc('Headline or milestone name')
      .addText((text) => {
        text.setPlaceholder('e.g. Project Launch v2.0').onChange((val) => {
          this.title = val;
        });
      });

    // 2. Target Container Folder (replaces separate Feed dropdown, limited to 1 folder)
    new Setting(contentEl)
      .setName('Target Container Folder')
      .setDesc('Select the container folder for note placement (Obsidian rule: limit 1 folder).')
      .addDropdown((dropdown) => {
        const settings = this.getSettings();
        const activeContainerName = settings.connectedContainerName || settings.activeContainerId || 'Main Container';
        dropdown.addOption('root', `📁 / (Root: ${activeContainerName})`);
        
        for (const folder of this.folders) {
          dropdown.addOption(folder.id, `📁 ${folder.path}`);
        }

        const hasFolder = this.folders.some((f) => f.id === this.selectedFolderId);
        if (!hasFolder && (this.selectedFolderId || this.initialFolderPath)) {
          const fallbackId = this.selectedFolderId || this.initialFolderPath!;
          const fallbackPath = this.initialFolderPath || this.selectedFolderId;
          dropdown.addOption(fallbackId, `📁 ${fallbackPath}`);
          dropdown.setValue(fallbackId);
        } else {
          dropdown.setValue(this.selectedFolderId || 'root');
        }

        dropdown.onChange((val) => {
          this.selectedFolderId = val === 'root' ? '' : val;
        });
      });

    // 6. Taxonomy Tag
    if (this.taxonomyNodes.length > 0) {
      new Setting(contentEl)
        .setName('Taxonomy Tag')
        .setDesc('Hierarchical classification node')
        .addDropdown((dropdown) => {
          dropdown.addOption('', '(No Taxonomy)');
          for (const tag of this.taxonomyNodes) {
            dropdown.addOption(tag.id, `🏷️ ${tag.path}`);
          }
          dropdown.setValue(this.selectedTaxonomyId);
          dropdown.onChange((val) => {
            this.selectedTaxonomyId = val;
          });
        });
    }

    // 7. Icon & Source Link
    new Setting(contentEl)
      .setName('Icon & Source Link')
      .setDesc('Optional icon name (e.g. "rocket", "calendar") and external URL')
      .addText((text) => {
        text.setPlaceholder('Icon (e.g. rocket)').onChange((val) => {
          this.icon = val;
        });
      })
      .addText((text) => {
        text.setPlaceholder('https://...').onChange((val) => {
          this.sourceLink = val;
        });
      });

    // 8. Markdown Description Body
    new Setting(contentEl)
      .setName('Markdown Body')
      .setDesc('Detailed markdown description')
      .addTextArea((ta) => {
        ta.setPlaceholder('Write description or note details here...')
          .setValue(this.description)
          .onChange((val) => {
            this.description = val;
          });
        ta.inputEl.rows = 5;
        ta.inputEl.style.width = '100%';
      });

    // Footer Actions
    const footer = contentEl.createDiv({ cls: 'lenta-modal-footer' });
    const cancelBtn = footer.createEl('button', { text: 'Cancel', cls: 'mod-cancel' });
    cancelBtn.onclick = () => this.close();

    const submitBtn = footer.createEl('button', {
      text: 'Create Note in Lenta',
      cls: 'mod-cta lenta-btn-lemon',
    });

    submitBtn.onclick = async () => {
      if (!this.title.trim()) {
        new Notice('Please enter a note title.');
        return;
      }
      if (!this.feedId && this.feeds.length > 0) {
        this.feedId = this.feeds[0].id;
      }
      if (!this.feedId) {
        this.feedId = 'feed-default';
      }

      submitBtn.disabled = true;
      submitBtn.setText('Creating...');

      try {
        const startIso = this.startDate ? new Date(this.startDate).toISOString() : new Date().toISOString();
        const endIso = this.endDate ? new Date(this.endDate).toISOString() : undefined;

        const targetFolder = this.folders.find((f) => f.id === this.selectedFolderId);
        const folderPath = targetFolder
          ? targetFolder.path
          : (this.selectedFolderId && this.selectedFolderId !== 'root'
            ? this.selectedFolderId
            : (this.initialFolderPath || undefined));

        const tagIds = this.selectedTaxonomyId ? [this.selectedTaxonomyId] : [];
        const folderIds = targetFolder
          ? [targetFolder.id]
          : (this.selectedFolderId && this.selectedFolderId !== 'root' ? [this.selectedFolderId] : []);
        const folders = folderPath ? [folderPath] : undefined;
        const targetContainerId = targetFolder?.containerId || this.getSettings().activeContainerId || undefined;

        // 1. Create on server
        const created = await this.apiClient.createNote({
          title: this.title.trim(),
          feedId: this.feedId,
          type: this.type,
          startDate: startIso,
          endDate: endIso,
          sourceLink: this.sourceLink.trim() || undefined,
          icon: this.icon.trim() || undefined,
          description: this.description.trim() || undefined,
          tagIds,
          folderIds,
          folders,
          folder: folderPath,
          containerId: targetContainerId,
        });

        // 2. Write to Obsidian Vault
        const rootFolder = this.getSettings().vaultRootFolder || 'Lenta';
        let vaultPath = normalizePath(LentaFrontmatterUtil.getNoteVaultPath(created, rootFolder));

        // If backend returned without folder but a folder was targeted, ensure vault path uses the targeted folder
        if (folderPath && (!created.folders || created.folders.length === 0)) {
          const cleanTitle = created.title.replace(/[\\/:*?"<>|]/g, '-').trim() || 'Untitled';
          const cleanFolder = folderPath.replace(/^\/+|\/+$/g, '');
          vaultPath = normalizePath(`${rootFolder}/${cleanFolder}/${cleanTitle}.md`);
        }

        const markdown = LentaFrontmatterUtil.serializeNoteToMarkdown(created);

        // Ensure directory exists
        const dir = vaultPath.substring(0, vaultPath.lastIndexOf('/'));
        if (dir && !this.app.vault.getAbstractFileByPath(dir)) {
          await this.app.vault.createFolder(dir);
        }

        // Avoid "File already exists" error when creating notes with similar or identical titles
        let finalVaultPath = vaultPath;
        const existingFile = this.app.vault.getAbstractFileByPath(finalVaultPath);

        if (existingFile instanceof TFile) {
          let isSameNote = false;
          try {
            const content = await this.app.vault.read(existingFile);
            const parsed = LentaFrontmatterUtil.parseMarkdown(content);
            if (parsed.lentaId === created.id) {
              isSameNote = true;
            }
          } catch {
            // ignore error reading
          }

          if (isSameNote) {
            await this.app.vault.modify(existingFile, markdown);
          } else {
            // A different file with this filename exists. Auto-increment filename to prevent Obsidian collision error.
            const dirPath = finalVaultPath.substring(0, finalVaultPath.lastIndexOf('/'));
            const baseWithExt = finalVaultPath.substring(finalVaultPath.lastIndexOf('/') + 1);
            const dotIdx = baseWithExt.lastIndexOf('.');
            const baseName = dotIdx !== -1 ? baseWithExt.substring(0, dotIdx) : baseWithExt;
            const ext = dotIdx !== -1 ? baseWithExt.substring(dotIdx) : '.md';

            let counter = 1;
            let candidate = `${dirPath}/${baseName} (${counter})${ext}`;
            while (this.app.vault.getAbstractFileByPath(candidate)) {
              counter++;
              candidate = `${dirPath}/${baseName} (${counter})${ext}`;
            }
            finalVaultPath = normalizePath(candidate);
            await this.app.vault.create(finalVaultPath, markdown);
          }
        } else {
          await this.app.vault.create(finalVaultPath, markdown);
        }

        new Notice(`🍋 Created "${created.title}" successfully!`);
        this.onSuccess(finalVaultPath);
        this.close();
      } catch (err: any) {
        new Notice(`Failed to create note: ${err.message || err}`);
        submitBtn.disabled = false;
        submitBtn.setText('Create Note in Lenta');
      }
    };
  }
}
