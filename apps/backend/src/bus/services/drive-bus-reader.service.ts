import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  BusEventEnvelope,
  NoteEventPayload,
  DriveBusRelayStatus,
  DriveBusNodeStats,
  DriveBusEventsFilter,
  DriveBusEventsResponse,
} from '@lenta/shared';

@Injectable()
export class DriveBusReaderService {
  private readonly logger = new Logger(DriveBusReaderService.name);

  /**
   * Fast scan of the bus directory to aggregate device statistics and watermarks.
   */
  async getStatus(
    busDir: string,
    eventsDir: string,
    currentDeviceId: string,
    isWatching: boolean,
  ): Promise<DriveBusRelayStatus> {
    const watermarks: Record<string, string> = {};
    const nodeStatsMap = new Map<string, { count: number; lastTime: string | null }>();

    // 1. Read watermarks
    if (fs.existsSync(busDir)) {
      try {
        const busFiles = await fs.promises.readdir(busDir);
        for (const f of busFiles) {
          if (f.startsWith('.watermark_') && f.endsWith('.json')) {
            try {
              const full = path.join(busDir, f);
              const data = JSON.parse(await fs.promises.readFile(full, 'utf-8'));
              if (data?.deviceId && data?.lastProcessedTimestamp) {
                watermarks[data.deviceId] = data.lastProcessedTimestamp;
              }
            } catch {
              // ignore malformed watermark
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed reading watermark files: ${err.message}`);
      }
    }

    // 2. Scan event files fast (by filename inspection without parsing all bodies)
    let totalEventsCount = 0;
    let lastEventTimestamp: string | null = null;

    if (fs.existsSync(eventsDir)) {
      try {
        const eventFiles = await fs.promises.readdir(eventsDir);
        const jsonFiles = eventFiles.filter((f) => f.toLowerCase().endsWith('.json') && !f.startsWith('.'));
        totalEventsCount = jsonFiles.length;

        // Sort ascending to find latest easily
        jsonFiles.sort();

        if (jsonFiles.length > 0) {
          const newest = jsonFiles[jsonFiles.length - 1];
          const rawTime = newest.split('_')[0];
          lastEventTimestamp = this.safeTimeToIso(rawTime);
        }

        for (const fileName of jsonFiles) {
          const parts = fileName.split('_');
          const rawTime = parts[0];
          const dev = parts[1] || 'unknown';

          const existing = nodeStatsMap.get(dev) || { count: 0, lastTime: null };
          existing.count += 1;
          const iso = this.safeTimeToIso(rawTime);
          if (!existing.lastTime || (iso && iso > existing.lastTime)) {
            existing.lastTime = iso;
          }
          nodeStatsMap.set(dev, existing);
        }
      } catch (err: any) {
        this.logger.warn(`Failed reading bus events directory: ${err.message}`);
      }
    }

    // Ensure current device is present even if it has 0 events
    if (!nodeStatsMap.has(currentDeviceId)) {
      nodeStatsMap.set(currentDeviceId, { count: 0, lastTime: null });
    }

    const nodes: DriveBusNodeStats[] = Array.from(nodeStatsMap.entries())
      .map(([deviceId, stat]) => ({
        deviceId,
        eventsCount: stat.count,
        lastEventTimestamp: stat.lastTime,
        watermarkTimestamp: watermarks[deviceId] || null,
        isCurrentDevice: deviceId.toLowerCase() === currentDeviceId.toLowerCase(),
      }))
      .sort((a, b) => b.eventsCount - a.eventsCount);

    return {
      isWatching,
      busDir,
      eventsDir,
      currentDeviceId,
      totalEventsCount,
      nodes,
      watermarks,
      lastEventTimestamp,
    };
  }

  /**
   * Returns a paginated and filtered list of recent BusEventEnvelope objects.
   */
  async getEvents(
    eventsDir: string,
    filter: DriveBusEventsFilter,
  ): Promise<DriveBusEventsResponse> {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 25));

    if (!fs.existsSync(eventsDir)) {
      return { total: 0, page, limit, totalPages: 0, items: [] };
    }

    const eventFiles = await fs.promises.readdir(eventsDir);
    // Sort descending (newest first)
    const jsonFiles = eventFiles
      .filter((f) => f.toLowerCase().endsWith('.json') && !f.startsWith('.'))
      .sort()
      .reverse();

    // Fast filter by device if specified in filename
    let candidateFiles = jsonFiles;
    if (filter.deviceId) {
      const targetDev = filter.deviceId.toLowerCase();
      candidateFiles = jsonFiles.filter((f) => {
        const parts = f.split('_');
        return parts[1] && parts[1].toLowerCase() === targetDev;
      });
    }

    const matchedItems: BusEventEnvelope<NoteEventPayload>[] = [];
    const searchLower = filter.search ? filter.search.toLowerCase().trim() : null;
    const actionFilter = filter.action || null;

    // Stream-read envelopes until we satisfy the page window
    const scanLimit = searchLower || actionFilter ? 300 : page * limit + limit;
    const filesToScan = candidateFiles.slice(0, scanLimit);

    const chunkSize = 40;
    for (let i = 0; i < filesToScan.length; i += chunkSize) {
      const chunk = filesToScan.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map(async (fileName) => {
          const fullPath = path.join(eventsDir, fileName);
          try {
            const raw = await fs.promises.readFile(fullPath, 'utf-8');
            return JSON.parse(raw) as BusEventEnvelope<NoteEventPayload>;
          } catch {
            return null;
          }
        }),
      );

      for (const envelope of results) {
        if (!envelope || !envelope.entityType) continue;

        // Apply action filter
        if (actionFilter && envelope.action !== actionFilter) {
          continue;
        }

        // Apply search filter (including tags)
        if (searchLower) {
          const title = envelope.payload?.title?.toLowerCase() || '';
          const summary = envelope.payload?.summary?.toLowerCase() || '';
          const folder = envelope.payload?.folderPath?.toLowerCase() || '';
          const noteId = envelope.payload?.id?.toLowerCase() || '';
          const evtId = envelope.eventId?.toLowerCase() || '';
          const tags = (envelope.payload?.tags || envelope.payload?.hashtags || [])
            .map((t: any) => (typeof t === 'string' ? t.toLowerCase() : (t?.name || '').toLowerCase()))
            .join(' ');

          if (
            !title.includes(searchLower) &&
            !summary.includes(searchLower) &&
            !folder.includes(searchLower) &&
            !noteId.includes(searchLower) &&
            !evtId.includes(searchLower) &&
            !tags.includes(searchLower)
          ) {
            continue;
          }
        }

        matchedItems.push(envelope);
      }

      if (!searchLower && !actionFilter && matchedItems.length >= page * limit) {
        break;
      }
    }

    const total = searchLower || actionFilter ? matchedItems.length : candidateFiles.length;
    const startIndex = (page - 1) * limit;
    const items = matchedItems.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(total / limit);

    return {
      total,
      page,
      limit,
      totalPages,
      items,
    };
  }

  /**
   * Publishes a live test event envelope into the LemonBus directory for verification.
   */
  async publishTestEvent(
    eventsDir: string,
    deviceId: string,
    title = 'Тестовое событие LemonBus UI',
    folderPath = 'Spark/BusVerification',
  ): Promise<BusEventEnvelope<NoteEventPayload>> {
    if (!fs.existsSync(eventsDir)) {
      fs.mkdirSync(eventsDir, { recursive: true });
    }

    const now = new Date();
    const timestampIso = now.toISOString();
    const safeTime = timestampIso.replace(/[:.]/g, '-');
    const testNoteId = crypto.randomUUID();
    const safeNoteId = testNoteId.replace(/[^a-z0-9_-]/gi, '').slice(0, 12);
    const fileName = `${safeTime}_${deviceId}_${safeNoteId}.json`;
    const targetFilePath = path.join(eventsDir, fileName);

    const payload: NoteEventPayload = {
      id: testNoteId,
      title,
      folderPath,
      status: 'PUBLISHED',
      type: 'EVENT',
      startDate: timestampIso,
      sourceType: 'GOOGLE_DRIVE',
      summary: 'Контрольный пинг распределенной шины LemonBus для проверки интерактивного интерфейса.',
      icon: '⚡',
      tags: ['lemon-bus', 'live-test', 'ui-verification'],
    };

    const envelope: BusEventEnvelope<NoteEventPayload> = {
      eventId: crypto.randomUUID(),
      timestamp: timestampIso,
      deviceId,
      entityType: 'NOTE',
      action: 'UPSERT',
      payload,
    };

    await fs.promises.writeFile(targetFilePath, JSON.stringify(envelope, null, 2), 'utf-8');
    this.logger.log(`🧪 Опубликован проверочный пакет в шину: ${fileName}`);
    return envelope;
  }

  private safeTimeToIso(safeTime: string): string | null {
    if (!safeTime) return null;
    // Format: 2026-10-25T07-12-38-473Z -> 2026-10-25T07:12:38.473Z
    const match = safeTime.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
    if (match) {
      return `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`;
    }
    return safeTime;
  }
}
