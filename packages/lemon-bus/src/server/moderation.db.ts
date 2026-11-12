import type { DatabaseSync } from 'node:sqlite';
import {
  LemonModerationItem,
  ModerationQueryOptions,
  ModerationStats,
  PaginatedModerationItems,
} from '../types/moderation.types.js';
import {
  MODERATION_SCHEMA_SQL,
  mapRowToModerationItem,
  transformWatcherEventToModerationItem,
} from './moderation.db.mappers.js';

export class ModerationDb {
  constructor(private readonly db: DatabaseSync) {
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(MODERATION_SCHEMA_SQL);
  }

  upsertItem(item: Partial<LemonModerationItem> & { id: string; title: string }): LemonModerationItem {
    const hashtagsJson = JSON.stringify(item.hashtags || []);
    const metadataJson = JSON.stringify(item.metadata || {});

    const stmt = this.db.prepare(`
      INSERT INTO lemon_moderation_items (
        id, title, description, summary, raw_content, folder_path,
        feed_slug, stream_slug, category, type, privacy, start_date,
        end_date, source_link, source_type, origin, author, resonance_score,
        icon, hashtags, status, reject_reason, moderated_at, moderated_by,
        metadata, device_id, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, datetime('now')
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = COALESCE(excluded.description, lemon_moderation_items.description),
        summary = COALESCE(excluded.summary, lemon_moderation_items.summary),
        raw_content = COALESCE(excluded.raw_content, lemon_moderation_items.raw_content),
        folder_path = COALESCE(excluded.folder_path, lemon_moderation_items.folder_path),
        feed_slug = COALESCE(excluded.feed_slug, lemon_moderation_items.feed_slug),
        stream_slug = COALESCE(excluded.stream_slug, lemon_moderation_items.stream_slug),
        category = COALESCE(excluded.category, lemon_moderation_items.category),
        privacy = excluded.privacy,
        source_link = COALESCE(excluded.source_link, lemon_moderation_items.source_link),
        source_type = COALESCE(excluded.source_type, lemon_moderation_items.source_type),
        author = COALESCE(excluded.author, lemon_moderation_items.author),
        resonance_score = COALESCE(excluded.resonance_score, lemon_moderation_items.resonance_score),
        icon = COALESCE(excluded.icon, lemon_moderation_items.icon),
        hashtags = excluded.hashtags,
        metadata = excluded.metadata,
        updated_at = datetime('now')
      RETURNING *;
    `);

    const row = stmt.get(
      item.id,
      item.title,
      item.description || null,
      item.summary || null,
      item.rawContent || null,
      item.folderPath || null,
      item.feedSlug || null,
      item.streamSlug || null,
      item.category || null,
      item.type || 'SINGLE',
      item.privacy || 'private',
      item.startDate || null,
      item.endDate || null,
      item.sourceLink || null,
      item.sourceType || null,
      item.origin || 'CODING_AGENT',
      item.author || null,
      item.resonanceScore ?? 0,
      item.icon || '📰',
      hashtagsJson,
      item.status || 'PENDING',
      item.rejectReason || null,
      item.moderatedAt || null,
      item.moderatedBy || null,
      metadataJson,
      item.deviceId || 'bus-moderation',
      item.createdAt || new Date().toISOString()
    ) as any;

    return mapRowToModerationItem(row);
  }

  getItem(id: string): LemonModerationItem | null {
    const stmt = this.db.prepare(`SELECT * FROM lemon_moderation_items WHERE id = ? LIMIT 1`);
    const row = stmt.get(id) as any;
    return row ? mapRowToModerationItem(row) : null;
  }

  queryItems(options: ModerationQueryOptions = {}): PaginatedModerationItems {
    const conditions: string[] = [];
    const values: any[] = [];

    const status = options.status || 'PENDING';
    if (status !== 'ALL') {
      conditions.push('status = ?');
      values.push(status);
    }

    if (options.feedSlug) {
      conditions.push('feed_slug = ?');
      values.push(options.feedSlug);
    }

    if (options.category) {
      conditions.push('category = ?');
      values.push(options.category);
    }

    if (options.search) {
      conditions.push('(title LIKE ? OR summary LIKE ? OR description LIKE ?)');
      const pattern = `%${options.search}%`;
      values.push(pattern, pattern, pattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const limit = Math.min(200, Math.max(1, options.limit || 30));
    const offset = Math.max(0, options.offset || 0);

    const countRow = this.db.prepare(`
      SELECT COUNT(*) as total FROM lemon_moderation_items ${whereClause}
    `).get(...values) as any;
    const total = Number(countRow?.total || 0);

    const rows = this.db.prepare(`
      SELECT * FROM lemon_moderation_items
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...values, limit, offset) as any[];

    return {
      items: rows.map(mapRowToModerationItem),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  getStats(): ModerationStats {
    const row = this.db.prepare(`
      SELECT
        COUNT(*) as totalCount,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approvedCount,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejectedCount
      FROM lemon_moderation_items
    `).get() as any;

    return {
      totalCount: Number(row?.totalCount || 0),
      pendingCount: Number(row?.pendingCount || 0),
      approvedCount: Number(row?.approvedCount || 0),
      rejectedCount: Number(row?.rejectedCount || 0),
    };
  }

  approveItem(
    id: string,
    overrides?: Partial<LemonModerationItem>,
    moderatorId?: string
  ): LemonModerationItem | null {
    const existing = this.getItem(id);
    if (!existing) return null;

    const stmt = this.db.prepare(`
      UPDATE lemon_moderation_items SET
        status = 'APPROVED',
        title = COALESCE(?, title),
        summary = COALESCE(?, summary),
        description = COALESCE(?, description),
        raw_content = COALESCE(?, raw_content),
        feed_slug = COALESCE(?, feed_slug),
        category = COALESCE(?, category),
        privacy = COALESCE(?, privacy),
        hashtags = COALESCE(?, hashtags),
        moderated_at = datetime('now'),
        moderated_by = ?,
        updated_at = datetime('now')
      WHERE id = ?
      RETURNING *;
    `);

    const row = stmt.get(
      overrides?.title || null,
      overrides?.summary || null,
      overrides?.description || null,
      overrides?.rawContent || null,
      overrides?.feedSlug || null,
      overrides?.category || null,
      overrides?.privacy || null,
      overrides?.hashtags ? JSON.stringify(overrides.hashtags) : null,
      moderatorId || 'curator',
      id
    ) as any;

    return row ? mapRowToModerationItem(row) : null;
  }

  rejectItem(id: string, reason?: string, moderatorId?: string): LemonModerationItem | null {
    const stmt = this.db.prepare(`
      UPDATE lemon_moderation_items SET
        status = 'REJECTED',
        reject_reason = ?,
        moderated_at = datetime('now'),
        moderated_by = ?,
        updated_at = datetime('now')
      WHERE id = ?
      RETURNING *;
    `);

    const row = stmt.get(reason || null, moderatorId || 'curator', id) as any;
    return row ? mapRowToModerationItem(row) : null;
  }

  updateItem(id: string, patch: Partial<LemonModerationItem>): LemonModerationItem | null {
    const existing = this.getItem(id);
    if (!existing) return null;

    const merged = { ...existing, ...patch };
    return this.upsertItem(merged);
  }

  importWatcherItems(limit = 200): { imported: number; skipped: number } {
    const safeLimit = Math.min(1000, Math.max(1, limit));
    const events = this.db.prepare(`
      SELECT * FROM lemon_bus_events
      WHERE entity_type = 'WATCHER_ITEM'
      ORDER BY seq DESC
      LIMIT ?
    `).all(safeLimit) as any[];

    let imported = 0;
    let skipped = 0;

    for (const ev of events) {
      let p: any = {};
      try {
        p = typeof ev.payload === 'string' ? JSON.parse(ev.payload) : ev.payload;
      } catch {
        skipped++;
        continue;
      }

      const itemId = p.id || ev.external_id || ev.event_id;
      if (!itemId || !p.title) {
        skipped++;
        continue;
      }

      // Check if already in moderation
      const existing = this.getItem(itemId);
      if (existing) {
        skipped++;
        continue;
      }

      this.upsertItem(transformWatcherEventToModerationItem(ev, p));
      imported++;
    }

    return { imported, skipped };
  }
}
