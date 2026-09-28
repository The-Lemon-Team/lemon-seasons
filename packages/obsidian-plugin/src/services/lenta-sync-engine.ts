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
    downloadedFilesList: Array<{
      path: string;
      title: string;
      content: string;
      size: number;
      isNew: boolean;
    }>;
  }> {
    const settings = this.getSettings();
    await this.ledgerManager.loadLedger();

    const lastSync = this.ledgerManager.lastSyncTimestamp || settings.lastSyncedAt || undefined;
    const result = await this.apiClient.getSyncChanges(lastSync, settings.containerId);

    const conflicts: FileDiffItemDto[] = [];
    const downloadedFilesList: Array<{
      path: string;
      title: string;
      content: string;
      size: number;
      isNew: boolean;
    }> = [];
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
          downloadedFilesList.push({
            path: filePath,
            title: resolvedNote.title,
            content: mergedMarkdown,
            size: mergedMarkdown.length,
            isNew: false,
          });
          pulledCount++;
        }
      } else {
        // New note from server: create file in computed path (or modify if existing file on disk)
        await this.ensureDirectoryForFile(computedPath);
        const markdownContent = LentaFrontmatterUtil.serializeNoteToMarkdown(note);
        const existing = vault.getAbstractFileByPath(computedPath);
        let fileMtime = Date.now();
        if (existing instanceof TFile) {
          await vault.modify(existing, markdownContent);
          fileMtime = existing.stat?.mtime || Date.now();
        } else if (await vault.adapter.exists(computedPath)) {
          await vault.adapter.write(computedPath, markdownContent);
          try {
            const stat = await vault.adapter.stat(computedPath);
            fileMtime = stat?.mtime || Date.now();
          } catch {
            fileMtime = Date.now();
          }
        } else {
          try {
            const newFile = await vault.create(computedPath, markdownContent);
            fileMtime = newFile.stat?.mtime || Date.now();
          } catch (err: any) {
            if (err?.message?.includes('already exists') || err?.message?.includes('EEXIST')) {
              await vault.adapter.write(computedPath, markdownContent);
              fileMtime = Date.now();
            } else {
              throw err;
            }
          }
        }

        this.ledgerManager.recordSync(
          note.id,
          computedPath,
          note.updatedAt,
          fileMtime,
          note,
          note.description || ''
        );
        downloadedFilesList.push({
          path: computedPath,
          title: note.title,
          content: markdownContent,
          size: markdownContent.length,
          isNew: true,
        });
        pulledCount++;
      }
    }

    // Save updated ledger and settings
    this.ledgerManager.lastSyncTimestamp = result.syncedAt;

    // Ensure lastSyncedAt is recorded after all files have been written to disk.
    // We compute the maximum mtime of all written files and add a 1000ms buffer,
    // ensuring disk I/O latency does not cause downloaded files to appear as local edits.
    let maxMtime = Date.now();
    for (const item of downloadedFilesList) {
      const abstractFile = vault.getAbstractFileByPath(item.path);
      if (abstractFile instanceof TFile && abstractFile.stat?.mtime > maxMtime) {
        maxMtime = abstractFile.stat.mtime;
      }
    }
    const safeLastSyncedAt = new Date(Math.max(Date.now(), maxMtime) + 1000).toISOString();
    settings.lastSyncedAt = safeLastSyncedAt;

    await this.ledgerManager.saveLedger();
    await this.saveSettings();

    return {
      pulledCount,
      deletedCount,
      conflicts,
      downloadedFilesList,
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
    downloadedFilesList?: Array<{
      path: string;
      title: string;
      content: string;
      size: number;
      isNew: boolean;
    }>;
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
      downloadedFilesList: deltaRes.downloadedFilesList,
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
    // If no feed is explicitly specified, leave feedId empty so note belongs to user's private container

    const noteType = (parsed.frontmatter.type as NoteType) || 'EVENT';
    const startDate =
      parsed.frontmatter.start_date ||
      parsed.frontmatter.startDate ||
      new Date().toISOString();

    const noteId = parsed.lentaId || parsed.frontmatter.id;
    const curatorVal = parsed.frontmatter.curator || undefined;
    const resonanceVal =
      typeof parsed.frontmatter.resonance_score === 'number'
        ? parsed.frontmatter.resonance_score
        : typeof parsed.frontmatter.resonanceScore === 'number'
        ? parsed.frontmatter.resonanceScore
        : undefined;

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
        curator: curatorVal || null,
        resonanceScore: resonanceVal ?? null,
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
      const settings = this.getSettings();
      let containerId: string | undefined = undefined;
      if (settings.activeContainerId && !settings.activeContainerId.startsWith('feed-')) {
        containerId = settings.activeContainerId;
      }
      const created = await this.apiClient.createNote({
        title: parsed.title,
        feedId: feedId || undefined,
        containerId,
        folder: parsed.frontmatter.primary_folder || undefined,
        folders: parsed.frontmatter.folders || (parsed.frontmatter.primary_folder ? [parsed.frontmatter.primary_folder] : undefined),
        description: processedBody,
        type: noteType,
        startDate,
        endDate: (parsed.frontmatter.end_date ?? parsed.frontmatter.endDate) || undefined,
        sourceLink: parsed.frontmatter.sourceLink || parsed.frontmatter.source_link || undefined,
        icon: parsed.frontmatter.icon || undefined,
        curator: curatorVal,
        resonanceScore: resonanceVal,
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
        curator: parsed.frontmatter.curator || null,
        resonanceScore: typeof parsed.frontmatter.resonance_score === 'number' ? parsed.frontmatter.resonance_score : null,
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
  async syncContainerFiles(
    containerId: string,
    containerName?: string
  ): Promise<{
    downloadedFiles: number;
    createdFolders: number;
    files: Array<{
      path: string;
      title: string;
      content: string;
      size: number;
      isNew: boolean;
    }>;
  }> {
    const settings = this.getSettings();
    const vault = this.app.vault;
    const rootFolder = settings.vaultRootFolder || 'Lenta';

    const safeFolderName = (containerName || containerId).replace(/[\\/:*?"<>|]/g, '_');
    const containerFolderPath = normalizePath(`${rootFolder}/${safeFolderName}`);

    await this.ensureFolder(containerFolderPath);

    let downloadedFiles = 0;
    let createdFolders = 0;
    const downloadedList: Array<{
      path: string;
      title: string;
      content: string;
      size: number;
      isNew: boolean;
    }> = [];

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
        const isNew = !(existingFile instanceof TFile);

        if (existingFile instanceof TFile) {
          await vault.modify(existingFile, content);
        } else {
          await vault.create(targetVaultPath, content);
        }
        downloadedFiles++;
        downloadedList.push({
          path: targetVaultPath,
          title: fileItem.path.split('/').pop() || fileItem.path,
          content,
          size: content.length,
          isNew,
        });
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

      if (downloadedFiles > 0) {
        let maxMtime = Date.now();
        for (const item of downloadedList) {
          const abstractFile = vault.getAbstractFileByPath(item.path);
          if (abstractFile instanceof TFile && abstractFile.stat?.mtime > maxMtime) {
            maxMtime = abstractFile.stat.mtime;
          }
        }
        settings.lastSyncedAt = new Date(Math.max(Date.now(), maxMtime) + 1000).toISOString();
        await this.saveSettings();
      }

      return { downloadedFiles, createdFolders, files: downloadedList };
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
        const isNew = !(existingFile instanceof TFile);

        if (existingFile instanceof TFile) {
          await vault.modify(existingFile, markdownContent);
        } else if (await vault.adapter.exists(noteVaultPath)) {
          await vault.adapter.write(noteVaultPath, markdownContent);
        } else {
          try {
            await vault.create(noteVaultPath, markdownContent);
          } catch (err: any) {
            if (err?.message?.includes('already exists') || err?.message?.includes('EEXIST')) {
              await vault.adapter.write(noteVaultPath, markdownContent);
            } else {
              throw err;
            }
          }
        }
        downloadedFiles++;
        downloadedList.push({
          path: noteVaultPath,
          title: note.title || 'Untitled Note',
          content: markdownContent,
          size: markdownContent.length,
          isNew,
        });
      }
    } catch (fallbackErr) {
      console.warn(`Failed to pull notes for container ${containerId}:`, fallbackErr);
    }

    if (downloadedFiles > 0) {
      let maxMtime = Date.now();
      for (const item of downloadedList) {
        const abstractFile = vault.getAbstractFileByPath(item.path);
        if (abstractFile instanceof TFile && abstractFile.stat?.mtime > maxMtime) {
          maxMtime = abstractFile.stat.mtime;
        }
      }
      settings.lastSyncedAt = new Date(Math.max(Date.now(), maxMtime) + 1000).toISOString();
      await this.saveSettings();
    }

    return { downloadedFiles, createdFolders, files: downloadedList };
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
