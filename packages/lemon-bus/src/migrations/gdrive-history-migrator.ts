import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  ILemonBusTransport,
  LemonBusEnvelope,
} from '../types/bus-contract.types.js';
import { processSparkDocument } from '../sparks/spark-document.processor.js';

export interface GDriveMigrationOptions {
  /**
   * Root directory of Google Drive sync (e.g. C:\Users\...\Google Drive\LemonCalendarium)
   * If provided, defaults busEventsDir to <gdriveSyncFolder>/LemonBus/events
   * and sparksDir to <gdriveSyncFolder>/Sparks
   */
  gdriveSyncFolder?: string;
  /** Directory containing historical LemonBus JSON events (e.g. LemonBus/events) */
  busEventsDir?: string;
  /** Directory containing Markdown Spark notes (e.g. Sparks) */
  sparksDir?: string;
  /** Target LemonBus transport instance (Supabase, Hybrid, InMemory, etc.) */
  targetTransport: ILemonBusTransport;
  /** Batch size for asynchronous execution */
  batchSize?: number;
  /** Optional progress callback */
  onProgress?: (progress: GDriveMigrationProgress) => void;
}

export interface GDriveMigrationProgress {
  phase: 'BUS_EVENTS' | 'SPARKS';
  processed: number;
  total: number;
  imported: number;
  skipped: number;
  currentPath?: string;
}

export interface GDriveMigrationSummary {
  sparksScanned: number;
  sparksImported: number;
  sparksSkipped: number;
  eventsScanned: number;
  eventsImported: number;
  eventsSkipped: number;
  errors: Array<{ file: string; error: string }>;
  durationMs: number;
}

/**
 * Recursively collects all files matching an extension without mutating any directory or file.
 * Strictly READ-ONLY.
 */
async function collectFilesRecursively(
  dir: string,
  filter: (fileName: string) => boolean,
): Promise<string[]> {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue; // ignore hidden files
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && filter(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  await walk(dir);
  return results;
}

function calculateSha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Safe, strictly READ-ONLY migration tool that imports historical Google Drive Sparks notes
 * and LemonBus JSON envelopes into an active LemonBus transport (e.g. Supabase cloud bus).
 *
 * GUARANTEE: Never unlinks, deletes, renames, or modifies any file in Google Drive.
 * All files remain untouched for external collectors and Obsidian vaults.
 */
export async function migrateGDriveHistoryToBus(
  options: GDriveMigrationOptions,
): Promise<GDriveMigrationSummary> {
  const startTime = Date.now();
  const summary: GDriveMigrationSummary = {
    sparksScanned: 0,
    sparksImported: 0,
    sparksSkipped: 0,
    eventsScanned: 0,
    eventsImported: 0,
    eventsSkipped: 0,
    errors: [],
    durationMs: 0,
  };

  const busEventsDir =
    options.busEventsDir ||
    (options.gdriveSyncFolder ? path.join(options.gdriveSyncFolder, 'LemonBus', 'events') : undefined);

  const sparksDir =
    options.sparksDir ||
    (options.gdriveSyncFolder ? path.join(options.gdriveSyncFolder, 'Sparks') : undefined);

  const transport = options.targetTransport;

  // ── Phase 1: Migrate Historical Bus Event JSON Envelopes ──────────────────
  if (busEventsDir && fs.existsSync(busEventsDir)) {
    const eventFiles = await collectFilesRecursively(busEventsDir, (name) =>
      name.toLowerCase().endsWith('.json'),
    );
    // Sort chronologically by filename (timestamp prefix)
    eventFiles.sort();
    summary.eventsScanned = eventFiles.length;

    for (let i = 0; i < eventFiles.length; i++) {
      const filePath = eventFiles[i];
      try {
        const raw = await fs.promises.readFile(filePath, 'utf8');
        const envelope = JSON.parse(raw) as LemonBusEnvelope;

        if (!envelope || !envelope.eventId) {
          summary.eventsSkipped++;
          continue;
        }

        const hash = envelope.contentHash;
        if (hash) {
          const alreadyExists = await transport.hasContentHash(hash);
          if (alreadyExists) {
            summary.eventsSkipped++;
            continue;
          }
        }

        await transport.publish(envelope);
        summary.eventsImported++;

        options.onProgress?.({
          phase: 'BUS_EVENTS',
          processed: i + 1,
          total: eventFiles.length,
          imported: summary.eventsImported,
          skipped: summary.eventsSkipped,
          currentPath: filePath,
        });
      } catch (err: any) {
        summary.errors.push({
          file: filePath,
          error: `Event import error: ${err?.message || String(err)}`,
        });
      }
    }
  }

  // ── Phase 2: Migrate Historical Sparks Markdown Files ────────────────────
  if (sparksDir && fs.existsSync(sparksDir)) {
    const mdFiles = await collectFilesRecursively(sparksDir, (name) =>
      name.toLowerCase().endsWith('.md'),
    );
    summary.sparksScanned = mdFiles.length;

    for (let i = 0; i < mdFiles.length; i++) {
      const filePath = mdFiles[i];
      try {
        const contentMarkdown = await fs.promises.readFile(filePath, 'utf8');
        const stat = await fs.promises.stat(filePath);
        const hash = calculateSha256(contentMarkdown);

        const alreadyExists = await transport.hasContentHash(hash);
        if (alreadyExists) {
          summary.sparksSkipped++;
          continue;
        }

        // Relative path canonical representation (e.g. Sparks/ai/08.11.26 - Model.md)
        const relPath = path.relative(path.dirname(sparksDir), filePath).replace(/\\/g, '/');
        const virtualPath = relPath.startsWith('Sparks/') ? relPath : `Sparks/${relPath}`;

        await transport.publishSparkDocument({
          virtualPath,
          contentMarkdown,
          origin: 'GDRIVE_SPARK',
          mtime: stat.mtime,
        });

        summary.sparksImported++;

        options.onProgress?.({
          phase: 'SPARKS',
          processed: i + 1,
          total: mdFiles.length,
          imported: summary.sparksImported,
          skipped: summary.sparksSkipped,
          currentPath: filePath,
        });
      } catch (err: any) {
        summary.errors.push({
          file: filePath,
          error: `Spark import error: ${err?.message || String(err)}`,
        });
      }
    }
  }

  summary.durationMs = Date.now() - startTime;
  return summary;
}
