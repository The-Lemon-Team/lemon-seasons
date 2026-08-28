import { App, Notice, TFile, TFolder, normalizePath } from 'obsidian';
import { LentaApiClient } from './lenta-api-client';
import { LentaFrontmatterUtil } from './lenta-frontmatter';
import { LentaSyncLedgerManager } from './lenta-sync-ledger';
import {
  LentaPluginSettings,
  LentaNoteDto,
  FileDiffItemDto,
  ConflictStrategy,
  NoteType,
} from '../types';
import { Note } from '@lenta/shared';

export class LentaSyncEngine {
  private ledgerManager: LentaSyncLedgerManager;

  constructor(
    private app: App,
    private apiClient: LentaApiClient,
    private getSettings: () => LentaPluginSettings,
    private saveSettings: () => Promise<void>
  ) {
    this.ledgerManager = new LentaSyncLedgerManager(
      this.app,
      () => this.getSettings().vaultRootFolder || 'Lenta'
    );
  }

  /**
   * Pulls latest delta changes from Lenta server and reconciles local vault Markdown files
   * using field-level Last-Write-Wins (LWW) resolution.
   */
  async pullChanges(): Promise<{
    pulledCount: number;
    deletedCount: number;
    conflicts: FileDiffItemDto[];
  }> {
    const settings = this.getSettings();
    await this.ledgerManager.loadLedger();

    const lastSync = this.ledgerManager.lastSyncTimestamp || settings.lastSyncedAt || undefined;
    const result = await this.apiClient.getSyncChanges(lastSync);

    const conflicts: FileDiffItemDto[] = [];
    let pulledCount = 0;
    let deletedCount = 0;

    const vault = this.app.vault;
    const rootFolder = settings.vaultRootFolder || 'Lenta';

    // Ensure root folder exists
    await this.ensureFolder(rootFolder);

    for (const note of result.notes as Note[]) {
      // Find existing file in ledger or by computed path
      const ledgerEntry = this.ledgerManager.getEntry(note.id);
      const computedPath = normalizePath(LentaFrontmatterUtil.getNoteVaultPath(note, rootFolder));
      const filePath = ledgerEntry?.localPath || computedPath;

      if (note.deletedAt) {
        // Soft-delete handling: remove local file if present
        const existingFile = vault.getAbstractFileByPath(filePath);
        if (existingFile instanceof TFile) {
          await vault.trash(existingFile, true);
          deletedCount++;
        }
        this.ledgerManager.removeEntry(note.id);
        continue;
      }

      const existingFile = vault.getAbstractFileByPath(filePath);

      if (existingFile instanceof TFile) {
        const localContent = await vault.read(existingFile);
        const localParsed = LentaFrontmatterUtil.parseMarkdown(localContent);

        // Verify this local file belongs to the same note (lenta_id is absolute source of truth)
        if (localParsed.lentaId === note.id || !localParsed.lentaId) {
          // Perform Field-Level LWW Resolution
          const mergeResult = this.ledgerManager.resolveFieldLevelMerge(
            localParsed,
            note,
            existingFile.stat.mtime
          );

          if (mergeResult.isConflict && settings.defaultConflictStrategy === 'manual_merge') {
            conflicts.push({
              path: filePath,
              status: 'conflict',
              clientContent: localContent,
              serverContent: LentaFrontmatterUtil.serializeNoteToMarkdown(note),
              metadata: { title: note.title },
              fieldConflicts: mergeResult.conflicts,
            });
          }

          // Build resolved note DTO
          const resolvedNote: Note = {
            ...note,
            title: mergeResult.mergedTitle,
            description: mergeResult.mergedBody,
            type: mergeResult.mergedType as any,
            startDate: mergeResult.mergedStartDate,
            endDate: mergeResult.mergedEndDate,
          };

          const mergedMarkdown = LentaFrontmatterUtil.serializeNoteToMarkdown(resolvedNote);
          await vault.modify(existingFile, mergedMarkdown);

          this.ledgerManager.recordSync(
            note.id,
            filePath,
            note.updatedAt,
            Date.now(),
            resolvedNote,
            mergeResult.mergedBody
          );
          pulledCount++;
        }
      } else {
        // New note from server: create file in computed path
        await this.ensureDirectoryForFile(computedPath);
        const markdownContent = LentaFrontmatterUtil.serializeNoteToMarkdown(note);
        const newFile = await vault.create(computedPath, markdownContent);

        this.ledgerManager.recordSync(
          note.id,
          computedPath,
          note.updatedAt,
          newFile.stat.mtime || Date.now(),
          note,
          note.description || ''
        );
        pulledCount++;
      }
    }

    // Save updated ledger and settings
    this.ledgerManager.lastSyncTimestamp = result.syncedAt;
    settings.lastSyncedAt = result.syncedAt;
    await this.ledgerManager.saveLedger();
    await this.saveSettings();

    return {
      pulledCount,
      deletedCount,
      conflicts,
    };
  }

  /**
   * Syncs files & structure for multiple active container IDs, then runs delta pull reconciliation.
   */
  async pullAllContainers(
    containerIds: string[],
    containerNameMap?: Map<string, string>
  ): Promise<{
    downloadedFiles: number;
    pulledCount: number;
    deletedCount: number;
    conflicts: FileDiffItemDto[];
  }> {
    let downloadedFiles = 0;
    for (const id of containerIds) {
      try {
        const name = containerNameMap?.get(id) || id;
        const res = await this.syncContainerFiles(id, name);
        downloadedFiles += res.downloadedFiles;
      } catch (err) {
        console.warn(`Failed to sync container ${id}:`, err);
      }
    }
    const deltaRes = await this.pullChanges();
    return {
      downloadedFiles,
      ...deltaRes,
    };
  }

  /**
   * Pushes modified and new local markdown files from vault to Lenta server.
   * Intercepts local image attachments (![[image.png]]), uploads to /storage, and updates links.
   */
  async pushLocalNote(file: TFile): Promise<{ success: boolean; note?: LentaNoteDto }> {
    const vault = this.app.vault;
    const content = await vault.read(file);
    const parsed = LentaFrontmatterUtil.parseMarkdown(content);

    await this.ledgerManager.loadLedger();

    // 1. Attachment Interceptor: Intercept local Obsidian images and upload to /storage
    const processedBody = await this.interceptAndUploadAttachments(parsed.body, file.path);

    // 2. Resolve Feed
    const feeds = await this.apiClient.getFeeds().catch(() => []);
    let feedId = '';

    if (parsed.frontmatter.feed) {
      const match = feeds.find(
        (f) =>
          f.slug === parsed.frontmatter.feed ||
          f.title.toLowerCase() === parsed.frontmatter.feed?.toLowerCase()
      );
      if (match) feedId = match.id;
    }

    if (!feedId && feeds.length > 0) {
      feedId = feeds[0].id;
    }

    const noteType = (parsed.frontmatter.type as NoteType) || 'EVENT';
    const startDate =
      parsed.frontmatter.start_date ||
      parsed.frontmatter.startDate ||
      new Date().toISOString();

    const noteId = parsed.lentaId || parsed.frontmatter.id;

    if (noteId) {
      // Update existing note
      const updated = await this.apiClient.updateNote(noteId, {
        title: parsed.title,
        description: processedBody,
        type: noteType,
        startDate,
        endDate: (parsed.frontmatter.end_date ?? parsed.frontmatter.endDate) || null,
        sourceLink: parsed.frontmatter.sourceLink || parsed.frontmatter.source_link || null,
        icon: parsed.frontmatter.icon || null,
      });

      // Update local file if attachments were converted
      if (processedBody !== parsed.body) {
        const newMarkdown = LentaFrontmatterUtil.serializeNoteToMarkdown(updated as any);
        await vault.modify(file, newMarkdown);
      }

      this.ledgerManager.recordSync(
        updated.id,
        file.path,
        updated.updatedAt,
        Date.now(),
        updated as any,
        processedBody
      );
      await this.ledgerManager.saveLedger();

      return { success: true, note: updated };
    } else {
      // Create new note
      const created = await this.apiClient.createNote({
        title: parsed.title,
        feedId,
        description: processedBody,
        type: noteType,
        startDate,
        endDate: (parsed.frontmatter.end_date ?? parsed.frontmatter.endDate) || undefined,
        sourceLink: parsed.frontmatter.sourceLink || parsed.frontmatter.source_link || undefined,
        icon: parsed.frontmatter.icon || undefined,
      });

      // Update local file with generated lenta_id
      const newMarkdown = LentaFrontmatterUtil.serializeNoteToMarkdown(created as any);
      await vault.modify(file, newMarkdown);

      this.ledgerManager.recordSync(
        created.id,
        file.path,
        created.updatedAt,
        Date.now(),
        created as any,
        processedBody
      );
      await this.ledgerManager.saveLedger();

      return { success: true, note: created };
    }
  }

  /**
   * Track file renames and moves via Obsidian Vault API (on('rename')).
   * Instantly updates primary_folder and folders in the frontmatter while strictly preserving lenta_id.
   */
  async handleFileRename(file: TFile, oldPath: string): Promise<void> {
    if (file.extension !== 'md') return;

    try {
      const content = await this.app.vault.read(file);
      const parsed = LentaFrontmatterUtil.parseMarkdown(content);

      // Check if file is tracked by Lenta (lenta_id is absolute source of truth)
      const lentaId = parsed.lentaId || parsed.frontmatter.id;
      if (!lentaId) return;

      const rootFolder = this.getSettings().vaultRootFolder || 'Lenta';
      const rootNormalized = normalizePath(rootFolder);

      // Compute new folder path relative to rootFolder
      const parts = file.path.split('/');
      parts.pop(); // remove file name
      let relativeFolder = parts.join('/');

      if (relativeFolder.startsWith(rootNormalized)) {
        relativeFolder = relativeFolder.slice(rootNormalized.length).replace(/^\/+/, '');
      }

      // If moved to a feeds folder (e.g. Feeds/cinema/Projects), clean up prefix if needed
      relativeFolder = relativeFolder.replace(/^Feeds\/[^/]+\/?/, '');

      // Update frontmatter with new primary folder
      parsed.frontmatter.primary_folder = relativeFolder || undefined;
      if (relativeFolder) {
        parsed.frontmatter.folders = Array.from(
          new Set([...(parsed.frontmatter.folders || []), relativeFolder])
        );
      }

      // Update ledger entry
      await this.ledgerManager.loadLedger();
      this.ledgerManager.updateLocalPath(lentaId, file.path);
      await this.ledgerManager.saveLedger();

      // Write updated frontmatter to file
      const updatedNote: Note = {
        id: lentaId,
        feedId: '',
        title: parsed.title,
        description: parsed.body,
        type: (parsed.frontmatter.type as any) || 'EVENT',
        startDate: parsed.frontmatter.start_date || parsed.frontmatter.startDate || new Date().toISOString(),
        endDate: parsed.frontmatter.end_date || parsed.frontmatter.endDate || null,
        sourceLink: parsed.frontmatter.sourceLink || null,
        icon: parsed.frontmatter.icon || null,
        tags: (parsed.frontmatter.taxonomy || []).map((p) => ({ id: p, name: p, path: p, icon: null, updatedAt: '', deletedAt: null })),
        hashtags: (parsed.hashtags || []).map((h) => ({ id: h, name: h, createdAt: '', updatedAt: '', deletedAt: null })),
        folders: relativeFolder
          ? [{ id: '', noteId: lentaId, folderId: '', isPrimary: true, order: 0, folder: { id: '', name: relativeFolder, path: relativeFolder, icon: null, color: null, createdAt: '', updatedAt: '', deletedAt: null } }]
          : [],
        createdAt: '',
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      const newMarkdown = LentaFrontmatterUtil.serializeNoteToMarkdown(updatedNote);
      await this.app.vault.modify(file, newMarkdown);
      console.log(`🍋 Lenta: Updated frontmatter for moved/renamed note "${file.name}"`);
    } catch (err) {
      console.error(`🍋 Lenta: Error handling file rename for ${file.path}`, err);
    }
  }

  /**
   * Attachment Interceptor:
   * Scans markdown for local Obsidian image embeds (![[img.png]]) or standard local markdown images,
   * uploads them to Nest.js /storage/upload, and replaces them with absolute server URLs.
   */
  private async interceptAndUploadAttachments(body: string, sourcePath: string): Promise<string> {
    if (!body) return body;

    let updatedBody = body;

    // 1. Wikilink embeds: ![[image.png]] or ![[attachments/image.png|300]]
    const wikilinkRegex = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const matches: Array<{ fullMatch: string; linkPath: string; alias?: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = wikilinkRegex.exec(body)) !== null) {
      matches.push({
        fullMatch: match[0],
        linkPath: match[1].trim(),
        alias: match[2]?.trim(),
      });
    }

    for (const item of matches) {
      const file = this.app.metadataCache.getFirstLinkpathDest(item.linkPath, sourcePath);
      if (file instanceof TFile && this.isImageExtension(file.extension)) {
        try {
          const buffer = await this.app.vault.readBinary(file);
          const mimeType = this.getMimeType(file.extension);
          const uploadResult = await this.apiClient.uploadAttachment(file.name, buffer, mimeType);

          const altText = item.alias || file.basename;
          const markdownEmbed = `![${altText}](${uploadResult.url})`;
          updatedBody = updatedBody.replace(item.fullMatch, markdownEmbed);
          new Notice(`🍋 Uploaded attachment: ${file.name}`);
        } catch (err) {
          console.warn(`Failed to upload attachment ${item.linkPath}:`, err);
        }
      }
    }

    return updatedBody;
  }

  private isImageExtension(ext: string): boolean {
    return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext.toLowerCase());
  }

  private getMimeType(ext: string): string {
    const map: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      svg: 'image/svg+xml',
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Downloads and syncs actual folder structure and files for a specific connected container into the local Obsidian vault.
   */
  async syncContainerFiles(containerId: string, containerName?: string): Promise<{ downloadedFiles: number; createdFolders: number }> {
    const settings = this.getSettings();
    const vault = this.app.vault;
    const rootFolder = settings.vaultRootFolder || 'Lenta';

    const safeFolderName = (containerName || containerId).replace(/[\\/:*?"<>|]/g, '_');
    const containerFolderPath = normalizePath(`${rootFolder}/${safeFolderName}`);

    await this.ensureFolder(containerFolderPath);

    let downloadedFiles = 0;
    let createdFolders = 0;

    // 1. Try fetching files from Container Sync Server (/containers/:id/files)
    let containerFiles: Array<{ path: string; content?: string; mtime?: number }> = [];
    let fetchSuccess = false;
    try {
      containerFiles = await this.apiClient.getContainerFiles(containerId);
      fetchSuccess = true;
    } catch (err) {
      console.warn(`Could not fetch container files from container server for ${containerId}:`, err);
    }

    if (fetchSuccess) {
      const validPathsInContainer = new Set<string>();

      for (const fileItem of containerFiles) {
        if (!fileItem.path) continue;
        const normalizedRelPath = normalizePath(fileItem.path).replace(/^\/+/, '');
        const targetVaultPath = normalizePath(`${containerFolderPath}/${normalizedRelPath}`);
        validPathsInContainer.add(targetVaultPath);

        await this.ensureDirectoryForFile(targetVaultPath);

        const content = fileItem.content || '';
        const existingFile = vault.getAbstractFileByPath(targetVaultPath);

        if (existingFile instanceof TFile) {
          await vault.modify(existingFile, content);
        } else {
          await vault.create(targetVaultPath, content);
        }
        downloadedFiles++;
      }

      // Clean up any extraneous files in containerFolderPath that are not in validPathsInContainer
      const containerFolderObj = vault.getAbstractFileByPath(containerFolderPath);
      if (containerFolderObj instanceof TFolder) {
        const cleanExtraneous = async (folder: TFolder) => {
          const children = [...folder.children];
          for (const child of children) {
            if (child instanceof TFile) {
              if (!validPathsInContainer.has(child.path)) {
                await vault.delete(child, true);
              }
            } else if (child instanceof TFolder) {
              await cleanExtraneous(child);
              if (child.children.length === 0) {
                await vault.delete(child, true);
              }
            }
          }
        };
        await cleanExtraneous(containerFolderObj);
      }

      return { downloadedFiles, createdFolders };
    }

    // 2. Fallback / Feed Containers: Fetch notes from NestJS Lenta API for this container/feed
    try {
      let notes: LentaNoteDto[] = [];

      if (containerId.startsWith('feed-') && containerId !== 'feed-all') {
        const feedSlug = containerId.replace(/^feed-/, '');
        const feeds = await this.apiClient.getFeeds().catch(() => []);
        const matchedFeed = feeds.find((f) => f.slug === feedSlug || f.id === feedSlug);
        if (matchedFeed) {
          notes = await this.apiClient.getNotes({ feedId: matchedFeed.id });
        }
      }

      if (notes.length === 0 && (!containerId.startsWith('feed-') || containerId === 'feed-all')) {
        const fullSync = await this.apiClient.getSyncChanges();
        const allNotes = (fullSync.notes || []) as LentaNoteDto[];
        if (containerId && containerId !== 'all' && containerId !== 'feed-all') {
          notes = allNotes.filter((n: any) => n.containerId === containerId);
        } else {
          notes = allNotes;
        }
      }

      for (const note of notes) {
        const noteFileName = `${(note.title || 'Untitled Note').replace(/[\\/:*?"<>|]/g, '_')}.md`;
        const noteVaultPath = normalizePath(`${containerFolderPath}/${noteFileName}`);

        await this.ensureDirectoryForFile(noteVaultPath);

        const markdownContent = LentaFrontmatterUtil.serializeNoteToMarkdown(note as any);
        const existingFile = vault.getAbstractFileByPath(noteVaultPath);

        if (existingFile instanceof TFile) {
          await vault.modify(existingFile, markdownContent);
        } else {
          await vault.create(noteVaultPath, markdownContent);
        }
        downloadedFiles++;
      }
    } catch (fallbackErr) {
      console.warn(`Failed to pull notes for container ${containerId}:`, fallbackErr);
    }

    return { downloadedFiles, createdFolders };
  }

  private async ensureFolder(path: string): Promise<void> {
    const norm = normalizePath(path);
    const existing = this.app.vault.getAbstractFileByPath(norm);
    if (!existing) {
      await this.app.vault.createFolder(norm);
    }
  }

  private async ensureDirectoryForFile(filePath: string): Promise<void> {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    if (dir) {
      const parts = dir.split('/');
      let current = '';
      for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        const norm = normalizePath(current);
        const existing = this.app.vault.getAbstractFileByPath(norm);
        if (!existing) {
          await this.app.vault.createFolder(norm);
        }
      }
    }
  }
}
