import { App, TFile } from 'obsidian';
import { LentaFrontmatterUtil } from './lenta-frontmatter';
import { LentaPluginSettings } from '../types';

export interface ChangedLentaFile {
  file: TFile;
  lentaId: string;
  title: string;
  modifiedAt: number; // ms timestamp
  relPath: string;
}

/**
 * Scans the Obsidian vault for Lenta-tracked markdown files
 * that were modified after `settings.lastSyncedAt`.
 * Only considers files inside the configured `vaultRootFolder`.
 */
export async function scanChangedFiles(
  app: App,
  settings: LentaPluginSettings
): Promise<ChangedLentaFile[]> {
  const rootFolder = settings.vaultRootFolder || 'Lenta';
  const lastSync = settings.lastSyncedAt ? new Date(settings.lastSyncedAt).getTime() : 0;

  const allFiles = app.vault.getMarkdownFiles();
  const changed: ChangedLentaFile[] = [];

  for (const file of allFiles) {
    // Only check files inside the Lenta vault root
    if (!file.path.startsWith(rootFolder + '/') && file.path !== rootFolder) {
      continue;
    }

    // Only pick up files modified after the last sync
    if (file.stat.mtime <= lastSync) {
      continue;
    }

    try {
      const content = await app.vault.cachedRead(file);
      const parsed = LentaFrontmatterUtil.parseMarkdown(content);
      const lentaId = parsed.lentaId || parsed.frontmatter?.id;

      if (!lentaId) continue;

      changed.push({
        file,
        lentaId,
        title: parsed.title || file.basename,
        modifiedAt: file.stat.mtime,
        relPath: file.path,
      });
    } catch {
      // skip unreadable files
    }
  }

  // Most recently modified first
  return changed.sort((a, b) => b.modifiedAt - a.modifiedAt);
}
