import { Observable } from 'rxjs';
import { BusDriverKind, NoteOrigin, NoteProvenance } from './provenance.types.js';

export type LemonBusAction = 'UPSERT' | 'STATUS_CHANGE' | 'DELETE';
export type LemonBusEntityType = 'NOTE' | 'FEED' | 'STREAM' | 'FOLDER' | 'SPARK_FILE';

export interface NoteContentReference {
  canonicalPath?: string;
  documentId?: string;
  externalId?: string;
  contentHash?: string;
}

export interface LemonBusNotePayload {
  id: string;
  title: string;
  description?: string | null;
  rawContent?: string | null;
  summary?: string | null;
  folderPath?: string | null;
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED' | string;
  privacy: 'public' | 'private';
  publishAt?: string | null;
  feedId?: string | null;
  feedSlug?: string | null;
  publicFeedId?: string | null;
  streamSlug?: string | null;
  type?: string;
  startDate?: string;
  endDate?: string | null;
  sourceLink?: string | null;
  sourceType?: string | null;
  origin: NoteOrigin;
  provenance: NoteProvenance;
  author?: string | null;
  parentNoteId?: string | null;
  resonanceScore?: number | null;
  externalId?: string | null;
  icon?: string | null;
  hashtags?: string[];
  links?: Array<{ url: string; title?: string; isSource?: boolean; order?: number }>;
  fileHash?: string | null;
  metadata?: Record<string, any> | null;
}

export interface LemonBusSparkPayload {
  documentId?: string;
  canonicalPath: string;
  fileName: string;
  folderPath: string;
  feedSlug: string;
  feedTitle?: string;
  feedDescription?: string;
  title: string;
  contentMarkdown: string;
  frontmatter: Record<string, any>;
  contentHash: string;
  privacy: 'public' | 'private';
  origin: 'SUPABASE_SPARK' | 'GDRIVE_SPARK';
  updatedAt: string;
}

export interface LemonBusEnvelope<TPayload = any> {
  eventId: string;
  seq?: number;
  timestamp: string;
  deviceId: string;
  entityType: LemonBusEntityType;
  action: LemonBusAction;
  origin: NoteOrigin;
  transportVia: BusDriverKind;
  streamSlug?: string | null;
  feedSlug?: string | null;
  externalId?: string | null;
  contentHash?: string | null;
  privacy: 'public' | 'private';
  payload: TPayload;
}

export interface BusCursor {
  lastSeq?: number;
  lastTimestamp?: string | null;
}

export interface BusSubscriptionPattern {
  entityTypes?: LemonBusEntityType[];
  actions?: LemonBusAction[];
  origins?: NoteOrigin[];
  streamSlugs?: string[];
  feedSlugs?: string[];
  privacy?: 'public' | 'private' | 'all';
  excludeDeviceId?: string;
}

export interface BusNodeStats {
  deviceId: string;
  eventsCount: number;
  lastEventTimestamp: string | null;
  watermarkTimestamp: string | null;
  lastSeq?: number | null;
  driver: BusDriverKind;
  isCurrentDevice: boolean;
}

export interface BusTransportStatus {
  driver: BusDriverKind;
  isWatching: boolean;
  supabaseConnected: boolean;
  gdriveConnected: boolean;
  currentDeviceId: string;
  busDir: string;
  eventsDir: string;
  totalEventsCount: number;
  lastEventTimestamp: string | null;
  lastSeq: number;
  watermarks: Record<string, string>;
  nodes: BusNodeStats[];
}

export interface BusEventsQuery {
  page?: number;
  limit?: number;
  deviceId?: string;
  action?: LemonBusAction;
  search?: string;
  feedSlug?: string;
}

export interface BusEventsPage<T = any> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: LemonBusEnvelope<T>[];
}

export interface PublishSparkInput {
  virtualPath: string;
  contentMarkdown: string;
  origin?: 'SUPABASE_SPARK' | 'GDRIVE_SPARK';
  channelOverride?: {
    slug?: string;
    title?: string;
    description?: string;
  };
  privacyOverride?: 'public' | 'private';
  mtime?: Date;
}

export interface ILemonBusTransport {
  readonly driver: BusDriverKind;
  readonly deviceId: string;

  start(): Promise<void>;
  stop(): Promise<void>;

  publish<T = any>(
    envelope: Omit<LemonBusEnvelope<T>, 'eventId' | 'timestamp' | 'deviceId' | 'transportVia'> & {
      eventId?: string;
      timestamp?: string;
      deviceId?: string;
    },
  ): Promise<LemonBusEnvelope<T>>;

  publishSparkDocument(input: PublishSparkInput): Promise<LemonBusEnvelope<LemonBusNotePayload>>;

  subscribe(pattern?: BusSubscriptionPattern): Observable<LemonBusEnvelope>;

  pullSince(cursor: BusCursor, limit?: number): Promise<{
    items: LemonBusEnvelope[];
    nextCursor: BusCursor;
  }>;

  acknowledgeCursor(cursor: BusCursor): Promise<void>;

  hasContentHash(contentHash: string): Promise<boolean>;

  queryEvents(query: BusEventsQuery): Promise<BusEventsPage>;

  getStatus(): Promise<BusTransportStatus>;

  /**
   * Cleans up expired transient events from the cloud sliding buffer.
   * Strictly operates on cloud tables/in-memory logs; never touches external files.
   */
  purgeExpiredRecords?(retentionDays?: number): Promise<{ purgedEvents: number; purgedSparkDocs: number }>;

  /**
   * Fetches the full content/markdown for a note or document by reference.
   * Enables the Claim Check pattern for large notes without bloating event logs.
   */
  fetchNoteContent?(ref: NoteContentReference): Promise<string | null>;
}

