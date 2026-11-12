import { LemonModerationItem } from '../types/moderation.types.js';

export const MODERATION_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS lemon_moderation_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    summary TEXT,
    raw_content TEXT,
    folder_path TEXT,
    feed_slug TEXT,
    stream_slug TEXT,
    category TEXT,
    type TEXT NOT NULL DEFAULT 'SINGLE',
    privacy TEXT NOT NULL DEFAULT 'private',
    start_date TEXT,
    end_date TEXT,
    source_link TEXT,
    source_type TEXT,
    origin TEXT NOT NULL DEFAULT 'CODING_AGENT',
    author TEXT,
    resonance_score REAL DEFAULT 0,
    icon TEXT,
    hashtags TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'PENDING',
    reject_reason TEXT,
    moderated_at TEXT,
    moderated_by TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    device_id TEXT NOT NULL DEFAULT 'unknown-device',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_mod_status_created ON lemon_moderation_items (status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_mod_feed ON lemon_moderation_items (feed_slug, status);
  CREATE INDEX IF NOT EXISTS idx_mod_category ON lemon_moderation_items (category, status);
`;

export function mapRowToModerationItem(r: any): LemonModerationItem {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    summary: r.summary,
    rawContent: r.raw_content,
    folderPath: r.folder_path,
    feedSlug: r.feed_slug,
    streamSlug: r.stream_slug,
    category: r.category,
    type: r.type || 'SINGLE',
    privacy: r.privacy || 'private',
    startDate: r.start_date,
    endDate: r.end_date,
    sourceLink: r.source_link,
    sourceType: r.source_type,
    origin: r.origin || 'CODING_AGENT',
    author: r.author,
    resonanceScore: r.resonance_score != null ? Number(r.resonance_score) : null,
    icon: r.icon,
    hashtags: safeJsonArray(r.hashtags),
    status: r.status,
    rejectReason: r.reject_reason,
    moderatedAt: r.moderated_at,
    moderatedBy: r.moderated_by,
    metadata: safeJsonObject(r.metadata),
    deviceId: r.device_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function transformWatcherEventToModerationItem(
  ev: any,
  p: any
): Partial<LemonModerationItem> & { id: string; title: string } {
  const itemId = p.id || ev.external_id || ev.event_id;
  const category = p.category || 'general';
  const feedSlug = `spark-${category}`;

  return {
    id: itemId,
    title: p.title,
    description: p.summary || p.description || p.rawContent || null,
    summary: p.summary || p.description || null,
    rawContent: p.rawContent || p.content || null,
    folderPath: `Spark/${category}`,
    feedSlug,
    category,
    type: 'SINGLE',
    privacy: 'public',
    startDate: p.publishedAt || ev.created_at,
    sourceLink: p.url || null,
    sourceType: 'LEMON_WATCHERS',
    origin: 'CODING_AGENT',
    author: p.author || p.watcherTitle || 'Lemon Watchers',
    resonanceScore: Number(p.resonanceScore ?? 0),
    icon: '📰',
    hashtags: Array.isArray(p.tags) ? p.tags : Array.isArray(p.categories) ? p.categories : [],
    status: 'PENDING',
    deviceId: ev.device_id || 'watcher-import',
    metadata: {
      watcherId: p.watcherId,
      watcherSlug: p.watcherSlug,
      watcherTitle: p.watcherTitle,
      guid: p.guid,
      importedFromSeq: ev.seq,
    },
  };
}

export function safeJsonArray(val: any): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val !== 'string') return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function safeJsonObject(val: any): Record<string, any> {
  if (val && typeof val === 'object' && !Array.isArray(val)) return val;
  if (typeof val !== 'string') return {};
  try {
    const parsed = JSON.parse(val);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}
