/**
 * Sync event envelope v2 — the unit transported over both the LAN backend API and the
 * Google Drive Bus. `eventId` is the idempotency key shared by both transports.
 */

export const SYNC_SCHEMA_VERSION = 2;

export type SyncEntityType = 'NOTE' | 'FOLDER' | 'FEED' | 'ATTACHMENT' | 'ITEM_STATE';
export type SyncAction = 'UPSERT' | 'DELETE' | 'SET_STATE' | 'STATUS_CHANGE';

export interface SyncEventEnvelope<T = unknown> {
  schemaVersion: typeof SYNC_SCHEMA_VERSION;
  eventId: string;
  /** Wall-clock ISO timestamp (informational only; ordering uses `hlc`). */
  timestamp: string;
  hlc: string;
  deviceId: string;
  entityType: SyncEntityType;
  entityId: string;
  action: SyncAction;
  /** Entity version this edit was based on (used to resolve the 3-way merge base). */
  baseVersion?: number | null;
  payload: T;
}

/** Fields of a note that participate in per-field last-writer-wins. */
export interface NoteFields {
  title?: string;
  description?: string | null;
  folderPath?: string | null;
  feedId?: string | null;
  icon?: string | null;
  sourceLink?: string | null;
  tags?: string[];
}

export type NoteFieldName = keyof NoteFields;

export const NOTE_FIELD_NAMES: readonly NoteFieldName[] = [
  'title',
  'description',
  'folderPath',
  'feedId',
  'icon',
  'sourceLink',
  'tags',
];

/** Materialized sync state of one note on a device. */
export interface NoteSyncState {
  id: string;
  version: number;
  fields: NoteFields;
  /** HLC of the last accepted write per field. */
  clocks: Partial<Record<NoteFieldName, string>>;
  /** Tombstone HLC; null/undefined when the note is alive. */
  deletedHlc?: string | null;
}

export type AttachmentKind = 'CONFLICT_COPY';

export interface NoteAttachment {
  /** Deterministic id derived from the originating eventId => idempotent across transports. */
  id: string;
  noteId: string;
  kind: AttachmentKind;
  title: string;
  content: string;
  meta: {
    deviceId: string;
    hlc: string;
    eventId: string;
    baseVersion: number | null;
  };
}

export type SyncRole = 'AUTHORITY' | 'REPLICA';

/** Upgrades a legacy (v1) bus envelope to v2. */
export function upgradeLegacyEnvelope(legacy: {
  eventId: string;
  timestamp: string;
  deviceId: string;
  entityType: string;
  action: string;
  payload: any;
}): SyncEventEnvelope {
  const wallMs = Date.parse(legacy.timestamp) || 0;
  const wall = String(wallMs).padStart(13, '0');
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    eventId: legacy.eventId,
    timestamp: legacy.timestamp,
    hlc: `${wall}-0000-${legacy.deviceId}`,
    deviceId: legacy.deviceId,
    entityType: legacy.entityType as SyncEntityType,
    entityId: legacy.payload?.id ?? legacy.eventId,
    action: legacy.action as SyncAction,
    baseVersion: null,
    payload: legacy.payload,
  };
}
