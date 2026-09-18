import { App, Modal, Setting, Notice, normalizePath, TFile, TFolder } from 'obsidian';
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
  public static readonly DEFAULT_OBSIDIAN_FOLDERS = [
    'Notes',
    'Daily',
    'Projects',
    'Archive',
  ];

  private pluginApp: App;
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
  private startDate = '';
  private endDate = '';
  private selectedFolderId = '';
  private isCustomFolder = false;
  private customFolderPath = '';
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
    initialFolderPath?: string,
    private initialContainerId?: string,
    private initialContainerName?: string,
    private cachedContainerFiles?: Array<{ path: string; size?: number; mtime?: number }>,
    private initialDate?: string,
    private initialType?: NoteType
  ) {
    super(app);
    this.pluginApp = app;
    (this as any).app = app;
    this.apiClient = apiClient;
    this.getSettings = getSettings;
    this.onSuccess = onSuccess;
    this.initialFolderId = initialFolderId;
    this.initialFolderPath = initialFolderPath;
    this.initialContainerId = initialContainerId;
    this.initialContainerName = initialContainerName;
    if (initialFolderId) {
      this.selectedFolderId = initialFolderId;
    }
    if (initialDate) {
      this.startDate = initialDate.includes('T') ? initialDate.split('T')[0] : initialDate;
    } else {
      this.startDate = this.formatLocalDate(new Date());
    }
    if (initialType) {
      this.type = initialType;
    }
  }

  private formatLocalDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private getTargetContainerId(): string | undefined {
    return this.initialContainerId || this.getSettings().activeContainerId || undefined;
  }

  private getTargetContainerName(): string | undefined {
    const settings = this.getSettings();
    return (
      this.initialContainerName ||
      settings.connectedContainerName ||
      (this.getTargetContainerId() ? this.getTargetContainerId() : undefined)
    );
  }

  private isObsidianContainerMode(): boolean {
    return Boolean(this.getTargetContainerId());
  }

  async onOpen() {
    this.modalEl.addClass('lenta-quick-add-modal');
    this.renderLoading();

    try {
      const containerId = this.getTargetContainerId();
      const isContainer = this.isObsidianContainerMode();

      // Parallel data loading tailored for container vs global mode
      const [feeds, folders, taxonomy] = await Promise.all([
        this.apiClient.getFeeds().catch(() => []),
        isContainer && containerId
          ? this.loadContainerFolders(containerId).catch(() => [])
          : this.apiClient.getFolders().catch(() => []),
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
        } else {
          this.selectedFolderId = this.initialFolderPath;
        }
      }

      const myFeeds = this.getMyFeeds();
      if (myFeeds.length > 0 && !this.feedId) {
        const defaultSlug = this.getSettings().defaultFeedSlug;
        const defaultFeed = myFeeds.find((f) => f.slug === defaultSlug) || myFeeds[0];
        this.feedId = defaultFeed.id;
      } else if (feeds.length > 0 && !this.feedId) {
        this.feedId = myFeeds[0]?.id || 'feed-my-notes';
      }

      this.render();
    } catch (err: any) {
      new Notice(`Failed to load Lenta options: ${err.message}`);
      this.render();
    }
  }

  /**
   * Resolves a dedicated, comprehensive list of folders for an Obsidian Container:
   * - Preset folders ('Notes', 'Daily', 'Projects', 'Archive')
   * - Folders registered on server with this containerId
   * - Folders extracted from actual container files
   * - Subfolders present in local Obsidian vault for this container
   */
  private async loadContainerFolders(containerId: string): Promise<LentaFolderDto[]> {
    const foldersMap = new Map<string, LentaFolderDto>();

    // 1. Add Default Obsidian Container Presets
    for (const preset of LentaQuickAddModal.DEFAULT_OBSIDIAN_FOLDERS) {
      foldersMap.set(preset, {
        id: preset,
        path: preset,
        name: preset,
        containerId,
      });
    }

    // 2. Fetch server-scoped folders for this container
    try {
      const serverFolders = await this.apiClient.getFolders({ containerId, scope: 'all' });
      for (const sf of serverFolders) {
        if (sf.path) {
          const cleanPath = sf.path.replace(/^\/+|\/+$/g, '');
          foldersMap.set(cleanPath, {
            ...sf,
            path: cleanPath,
          });
        }
      }
    } catch {
      // ignore
    }

    // 3. Extract folders from container files (cached or freshly fetched)
    try {
      const files =
        this.cachedContainerFiles && this.cachedContainerFiles.length > 0
          ? this.cachedContainerFiles
          : await this.apiClient.getContainerFiles(containerId);

      for (const file of files) {
        if (!file.path) continue;
        const norm = normalizePath(file.path).replace(/^\/+/, '');
        const parts = norm.split('/').filter(Boolean);
        let cur = '';
        for (let i = 0; i < parts.length - 1; i++) {
          cur = cur ? `${cur}/${parts[i]}` : parts[i];
          if (!foldersMap.has(cur)) {
            foldersMap.set(cur, {
              id: cur,
              path: cur,
              name: parts[i],
              containerId,
            });
          }
        }
      }
    } catch {
      // ignore
    }

    // 4. Scan local Obsidian Vault folders for this container
    try {
      const settings = this.getSettings();
      const rootFolder = settings.vaultRootFolder || 'Lenta';
      const containerName = this.getTargetContainerName() || containerId;
      const safeName = containerName.replace(/[\\/:*?"<>|]/g, '_');
      const safeUnderscoreName = safeName.replace(/\s+/g, '_');
      const dir1 = normalizePath(`${rootFolder}/${safeName}`);
      const dir2 = normalizePath(`${rootFolder}/${safeUnderscoreName}`);

      const appInstance = this.pluginApp || (this as any).app;
      const allFiles = appInstance?.vault?.getAllLoadedFiles?.() || [];
      for (const f of allFiles) {
        const isFolder = f instanceof TFolder || (f && Array.isArray((f as any).children)) || (f && !(f as any).extension && (f as any).path);
        if (isFolder) {
          const norm = normalizePath(f.path);
          let rel = '';
          if (norm.startsWith(dir1 + '/')) {
            rel = norm.slice(dir1.length + 1).replace(/^\/+|\/+$/g, '');
          } else if (norm.startsWith(dir2 + '/')) {
            rel = norm.slice(dir2.length + 1).replace(/^\/+|\/+$/g, '');
          }
          if (rel && !foldersMap.has(rel)) {
            foldersMap.set(rel, {
              id: rel,
              path: rel,
              name: rel.split('/').pop() || rel,
              containerId,
            });
          }
        }
      }
    } catch {
      // ignore
    }

    // 5. If an initialFolderPath was supplied and not present, add it
    if (this.initialFolderPath) {
      const cleanInit = this.initialFolderPath.replace(/^\/+|\/+$/g, '');
      if (cleanInit && !foldersMap.has(cleanInit)) {
        foldersMap.set(cleanInit, {
          id: cleanInit,
          path: cleanInit,
          name: cleanInit.split('/').pop() || cleanInit,
          containerId,
        });
      }
    }

    return Array.from(foldersMap.values()).sort((a, b) => a.path.localeCompare(b.path));
  }

  private isMyFeed(feed: LentaFeedDto): boolean {
    if ((feed as any).privacy === 'private' || (feed as any).visibility === 'private' || (feed as any).isUserOwn === true) {
      return true;
    }
    if ((feed as any).privacy === 'public' || (feed as any).visibility === 'public') {
      return false;
    }
    const slug = (feed.slug || '').toLowerCase();
    const title = (feed.title || '').toLowerCase();
    const defaultSlug = (this.getSettings().defaultFeedSlug || '').toLowerCase();
    if (defaultSlug && (slug === defaultSlug || slug.includes(defaultSlug))) {
      return true;
    }
    const myKeywords = ['my', 'my-', 'my_', 'personal', 'private', 'user', 'own', 'me'];
    return myKeywords.some((kw) => slug.includes(kw) || title.includes(kw));
  }

  private getMyFeeds(): LentaFeedDto[] {
    return this.feeds.filter((f) => this.isMyFeed(f));
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

    const isContainer = this.isObsidianContainerMode();
    const resolvedContainerName = this.getTargetContainerName() || 'Main Container';

    const targetFolder = this.folders.find((f) => f.id === this.selectedFolderId);
    const folderDisplay = targetFolder ? targetFolder.path : (this.selectedFolderId || this.initialFolderPath);

    const containerDisplay = isContainer ? ` [📦 ${resolvedContainerName}]` : '';

    const header = contentEl.createDiv({ cls: 'lenta-modal-header' });
    header.createEl('h2', { text: `🍋 Create Lenta Note${containerDisplay}` });
    header.createEl('p', {
      cls: 'lenta-modal-subtitle',
      text: folderDisplay
        ? `Target folder: 📁 ${folderDisplay}${isContainer ? ` (in 📦 ${resolvedContainerName})` : ''}`
        : (isContainer
            ? `Target container: 📦 ${resolvedContainerName}. Add a new record.`
            : 'Add a new time-based record to Project Lenta and your local Obsidian vault.'),
    });

    // 1. Title
    new Setting(contentEl)
      .setName('Note Title')
      .setDesc('Headline or milestone name')
      .addText((text) => {
        text.setPlaceholder('e.g. Project Launch v2.0')
          .setValue(this.title)
          .onChange((val) => {
            this.title = val;
          });
      });

    // 2. Note Type
    let endDateComponent: any = null;

    new Setting(contentEl)
      .setName('Note Type')
      .setDesc('Chronological classification of the note (Event, Period, Single note, etc.)')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('EVENT', '📅 Event / Событие')
          .addOption('PERIOD', '⏱️ Period / Период времени')
          .addOption('SINGLE', '📌 Single / Точечная заметка')
          .addOption('DONE', '✅ Milestone / Веха (Done)')
          .addOption('FILM_RELEASE', '🎬 Release / Медиа-релиз')
          .addOption('MENTION', '💬 Mention / Упоминание')
          .setValue(this.type)
          .onChange((val) => {
            this.type = val as NoteType;
            if (this.type === 'PERIOD' && !this.endDate && this.startDate) {
              this.endDate = this.startDate;
              if (endDateComponent && typeof endDateComponent.setValue === 'function') {
                endDateComponent.setValue(this.endDate);
              }
            }
          });
      });

    // 3. Start Date
    new Setting(contentEl)
      .setName('Start Date')
      .setDesc('Start date for this event or period (start_date)')
      .addText((text) => {
        if (text.inputEl) {
          text.inputEl.type = 'date';
          text.inputEl.addClass('lenta-date-input');
        }
        text.setValue(this.startDate || '');
        text.onChange((val) => {
          this.startDate = val;
        });
      });

    // 4. End Date
    new Setting(contentEl)
      .setName('End Date')
      .setDesc('Optional completion date (end_date, recommended for PERIOD)')
      .addText((text) => {
        endDateComponent = text;
        if (text.inputEl) {
          text.inputEl.type = 'date';
          text.inputEl.addClass('lenta-date-input');
        }
        text.setValue(this.endDate || '');
        text.onChange((val) => {
          this.endDate = val;
        });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon('cross')
          .setTooltip('Clear end date')
          .onClick(() => {
            this.endDate = '';
            if (endDateComponent && typeof endDateComponent.setValue === 'function') {
              endDateComponent.setValue('');
            }
          });
      });

    // 5. Publication Feed (My Feeds only)
    const myFeeds = this.getMyFeeds();
    new Setting(contentEl)
      .setName('My Feed')
      .setDesc('🔒 Public feeds are moderated by admin. Only personal feeds (My Feeds) can be selected.')
      .addDropdown((dropdown) => {
        if (myFeeds.length === 0) {
          dropdown.addOption('feed-my-notes', '🔒 My Notes (Personal Feed)');
          this.feedId = 'feed-my-notes';
        } else {
          for (const feed of myFeeds) {
            dropdown.addOption(feed.id, `🔒 ${feed.title}`);
          }
          if (!this.feedId || !myFeeds.some((f) => f.id === this.feedId)) {
            this.feedId = myFeeds[0].id;
          }
          dropdown.setValue(this.feedId);
        }
        dropdown.onChange((val) => {
          this.feedId = val;
        });
      });

    // 3. Target Container Folder (Obsidian rule: limit 1 folder)
    const folderSetting = new Setting(contentEl)
      .setName('Target Container Folder')
      .setDesc(
        isContainer
          ? `Select folder inside 📦 ${resolvedContainerName} (Obsidian rule: limit 1 folder).`
          : 'Select folder for note placement (Obsidian rule: limit 1 folder).'
      );

    if (!this.isCustomFolder) {
      folderSetting.addDropdown((dropdown) => {
        dropdown.addOption('root', `📁 / (Root: ${resolvedContainerName})`);

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

        dropdown.addOption('__custom__', '✏️ + Custom Folder...');

        dropdown.onChange((val) => {
          if (val === '__custom__') {
            this.isCustomFolder = true;
            this.customFolderPath = '';
            this.render();
          } else {
            this.selectedFolderId = val === 'root' ? '' : val;
          }
        });
      });
    } else {
      // Custom folder text input mode
      folderSetting
        .addText((text) => {
          text
            .setPlaceholder('e.g. Work/Sprint-1 or Research')
            .setValue(this.customFolderPath)
            .onChange((val) => {
              this.customFolderPath = val.trim().replace(/^\/+|\/+$/g, '');
            });
          text.inputEl.focus();
        })
        .addExtraButton((btn) => {
          btn
            .setIcon('list')
            .setTooltip('Back to folder list')
            .onClick(() => {
              this.isCustomFolder = false;
              this.render();
            });
        });
    }

    // 4. Taxonomy Tag
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

    // 5. Icon & Source Link
    new Setting(contentEl)
      .setName('Icon & Source Link')
      .setDesc('Optional icon name (e.g. "rocket", "calendar") and external URL')
      .addText((text) => {
        text.setPlaceholder('Icon (e.g. rocket)')
          .setValue(this.icon)
          .onChange((val) => {
            this.icon = val;
          });
      })
      .addText((text) => {
        text.setPlaceholder('https://...')
          .setValue(this.sourceLink)
          .onChange((val) => {
            this.sourceLink = val;
          });
      });

    // 6. Markdown Description Body
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
      if (!this.startDate) {
        new Notice('Please select a start date.');
        return;
      }
      if (this.endDate && this.startDate) {
        const startTimestamp = new Date(this.startDate).getTime();
        const endTimestamp = new Date(this.endDate).getTime();
        if (endTimestamp < startTimestamp) {
          new Notice('⚠️ End date cannot be earlier than start date.');
          return;
        }
      }
      let targetFeedId = this.feedId;
      const matchedFeed = this.feeds.find((f) => f.id === targetFeedId);
      if (!matchedFeed) {
        try {
          const createdFeed = await this.apiClient.createFeed({
            title: 'My Notes',
            slug: 'my-notes',
            description: 'Personal notes and reflections feed',
          });
          targetFeedId = createdFeed.id;
          this.feeds.push(createdFeed);
        } catch {
          const fresh = await this.apiClient.getFeeds().catch(() => []);
          const existing = fresh.find((f) => f.slug === 'my-notes') || fresh[0];
          if (existing) targetFeedId = existing.id;
        }
      }
      this.feedId = targetFeedId;

      submitBtn.disabled = true;
      submitBtn.setText('Creating...');

      try {
        const startIso = this.startDate
          ? (this.startDate.includes('T') ? new Date(this.startDate).toISOString() : new Date(`${this.startDate}T12:00:00.000Z`).toISOString())
          : new Date().toISOString();
        const endIso = this.endDate
          ? (this.endDate.includes('T') ? new Date(this.endDate).toISOString() : new Date(`${this.endDate}T12:00:00.000Z`).toISOString())
          : undefined;

        // Resolve folder path
        let resolvedFolderPath: string | undefined = undefined;
        if (this.isCustomFolder && this.customFolderPath) {
          resolvedFolderPath = this.customFolderPath;
        } else {
          const targetFolder = this.folders.find((f) => f.id === this.selectedFolderId);
          resolvedFolderPath = targetFolder
            ? targetFolder.path
            : (this.selectedFolderId && this.selectedFolderId !== 'root'
              ? this.selectedFolderId
              : (this.initialFolderPath || undefined));
        }

        const tagIds = this.selectedTaxonomyId ? [this.selectedTaxonomyId] : [];
        const folderIds = resolvedFolderPath ? [resolvedFolderPath] : [];
        const folders = resolvedFolderPath ? [resolvedFolderPath] : undefined;
        const targetContainerId = this.getTargetContainerId();

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
          folder: resolvedFolderPath,
          containerId: targetContainerId,
        });

        // 2. Compute local Obsidian Vault file path
        const rootFolder = this.getSettings().vaultRootFolder || 'Lenta';
        let vaultPath: string;

        if (this.isObsidianContainerMode()) {
          const safeContainerName = resolvedContainerName.replace(/[\\/:*?"<>|]/g, '_');
          const cleanTitle = (created.title || this.title).replace(/[\\/:*?"<>|]/g, '-').trim() || 'Untitled';
          if (resolvedFolderPath && resolvedFolderPath !== 'root') {
            const cleanFolder = resolvedFolderPath.replace(/^\/+|\/+$/g, '');
            vaultPath = normalizePath(`${rootFolder}/${safeContainerName}/${cleanFolder}/${cleanTitle}.md`);
          } else {
            vaultPath = normalizePath(`${rootFolder}/${safeContainerName}/${cleanTitle}.md`);
          }
        } else {
          vaultPath = normalizePath(LentaFrontmatterUtil.getNoteVaultPath(created as any, rootFolder));
          if (resolvedFolderPath && (!created.folders || created.folders.length === 0)) {
            const cleanTitle = (created.title || this.title).replace(/[\\/:*?"<>|]/g, '-').trim() || 'Untitled';
            const cleanFolder = resolvedFolderPath.replace(/^\/+|\/+$/g, '');
            vaultPath = normalizePath(`${rootFolder}/${cleanFolder}/${cleanTitle}.md`);
          }
        }

        const markdown = LentaFrontmatterUtil.serializeNoteToMarkdown(created as any);

        // Ensure directory and all parent directories exist
        const dir = vaultPath.substring(0, vaultPath.lastIndexOf('/'));
        if (dir && !this.app.vault.getAbstractFileByPath(dir)) {
          const parts = dir.split('/');
          let cur = '';
          for (const p of parts) {
            cur = cur ? `${cur}/${p}` : p;
            const norm = normalizePath(cur);
            if (!this.app.vault.getAbstractFileByPath(norm)) {
              await this.app.vault.createFolder(norm);
            }
          }
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

        new Notice(`🍋 Created "${created.title}" in 📦 ${resolvedContainerName} successfully!`);
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
