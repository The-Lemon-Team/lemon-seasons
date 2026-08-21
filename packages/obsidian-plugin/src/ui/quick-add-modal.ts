import { App, Modal, Setting, Notice, normalizePath } from 'obsidian';
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

  constructor(
    app: App,
    apiClient: LentaApiClient,
    getSettings: () => LentaPluginSettings,
    onSuccess: (filePath: string) => void
  ) {
    super(app);
    this.apiClient = apiClient;
    this.getSettings = getSettings;
    this.onSuccess = onSuccess;
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

    const header = contentEl.createDiv({ cls: 'lenta-modal-header' });
    header.createEl('h2', { text: '🍋 Create Lenta Note' });
    header.createEl('p', {
      cls: 'lenta-modal-subtitle',
      text: 'Add a new time-based record to Project Lenta and your local Obsidian vault.',
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

    // 2. Feed Selector
    new Setting(contentEl)
      .setName('Feed')
      .setDesc('Select target Lenta chronological feed')
      .addDropdown((dropdown) => {
        for (const feed of this.feeds) {
          dropdown.addOption(feed.id, `${feed.title} (${feed.slug})`);
        }
        dropdown.setValue(this.feedId);
        dropdown.onChange((val) => {
          this.feedId = val;
        });
      });

    // 3. Note Type
    new Setting(contentEl)
      .setName('Note Type')
      .setDesc('Chronological category classification')
      .addDropdown((dropdown) => {
        const types: NoteType[] = ['EVENT', 'PERIOD', 'SINGLE', 'FILM_RELEASE', 'MENTION', 'DONE'];
        for (const t of types) {
          dropdown.addOption(t, t);
        }
        dropdown.setValue(this.type);
        dropdown.onChange((val) => {
          this.type = val as NoteType;
        });
      });

    // 4. Start Date & End Date
    new Setting(contentEl)
      .setName('Start Date / Time')
      .setDesc('ISO timestamp or datetime')
      .addText((text) => {
        text.inputEl.type = 'datetime-local';
        text.setValue(this.startDate).onChange((val) => {
          this.startDate = val;
        });
      });

    new Setting(contentEl)
      .setName('End Date / Time (Optional)')
      .setDesc('End time for PERIOD and multi-day events')
      .addText((text) => {
        text.inputEl.type = 'datetime-local';
        text.setValue(this.endDate).onChange((val) => {
          this.endDate = val;
        });
      });

    // 5. Folder
    if (this.folders.length > 0) {
      new Setting(contentEl)
        .setName('Folder Placement')
        .setDesc('Organize into Lenta hierarchy folder')
        .addDropdown((dropdown) => {
          dropdown.addOption('', '(No Folder / Root)');
          for (const folder of this.folders) {
            dropdown.addOption(folder.id, `📁 ${folder.path}`);
          }
          dropdown.setValue(this.selectedFolderId);
          dropdown.onChange((val) => {
            this.selectedFolderId = val;
          });
        });
    }

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
      if (!this.feedId) {
        new Notice('Please select a feed.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.setText('Creating...');

      try {
        const startIso = this.startDate ? new Date(this.startDate).toISOString() : new Date().toISOString();
        const endIso = this.endDate ? new Date(this.endDate).toISOString() : undefined;

        const tagIds = this.selectedTaxonomyId ? [this.selectedTaxonomyId] : [];
        const folderIds = this.selectedFolderId ? [this.selectedFolderId] : [];

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
        });

        // 2. Write to Obsidian Vault
        const rootFolder = this.getSettings().vaultRootFolder || 'Lenta';
        const vaultPath = normalizePath(LentaFrontmatterUtil.getNoteVaultPath(created, rootFolder));
        const markdown = LentaFrontmatterUtil.serializeNoteToMarkdown(created);

        // Ensure directory exists
        const dir = vaultPath.substring(0, vaultPath.lastIndexOf('/'));
        if (dir && !this.app.vault.getAbstractFileByPath(dir)) {
          await this.app.vault.createFolder(dir);
        }

        await this.app.vault.create(vaultPath, markdown);
        new Notice(`🍋 Created "${created.title}" successfully!`);
        this.onSuccess(vaultPath);
        this.close();
      } catch (err: any) {
        new Notice(`Failed to create note: ${err.message || err}`);
        submitBtn.disabled = false;
        submitBtn.setText('Create Note in Lenta');
      }
    };
  }
}
