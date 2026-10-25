import { NoteType } from '../constants';

export type CommandType =
  | 'CREATE_NOTE'
  | 'UPDATE_CONTAINER'
  | 'ADD_BOOKMARK'
  | 'ADD_LINK'
  | 'INGEST_AUDIO'
  | 'ADD_NOTEBOOKLM';

export type CommandStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type CommandPriority = 'LOW' | 'NORMAL' | 'HIGH';

export interface CreateNotePayload {
  title: string;
  description?: string;
  type?: NoteType;
  startDate?: string;
  endDate?: string | null;
  feedSlug?: string;
  containerId?: string | null;
  sourceLink?: string;
  icon?: string;
  curator?: string;
  taxonomyPath?: string;
  folders?: string[];
  hashtags?: string[];
  imageUrl?: string;
  metadata?: Record<string, any>;
}

export interface UpdateContainerPayload {
  containerId: string;
  action?: 'SYNC_SOURCE' | 'REFRESH' | 'VALIDATE';
  sourceType?: 'daily' | 'common' | 'wiki' | 'google-drive' | string;
  targetDate?: string;
  forceRefresh?: boolean;
}

export interface AddBookmarkPayload {
  url: string;
  title?: string;
  description?: string;
  targetDate?: string;
  containerId?: string;
  folders?: string[];
  hashtags?: string[];
  autoEnrichOpenGraph?: boolean;
}

export interface AddLinkPayload {
  noteId?: string;
  noteTitle?: string;
  url: string;
  title?: string;
  isSource?: boolean;
  order?: number;
}

export interface IngestAudioPayload {
  audioUrl?: string;
  audioBase64?: string;
  fileName?: string;
  title?: string;
  durationSeconds?: number;
  targetDate?: string;
  containerId?: string;
  autoTranscribe?: boolean;
  tags?: string[];
}

export interface AddNotebookLmPayload {
  title: string;
  audioPodcastUrl?: string;
  summary?: string;
  transcriptMarkdown?: string;
  sourceDocuments?: string[];
  targetDate?: string;
  containerId?: string;
}

export type CommandPayloadMap = {
  CREATE_NOTE: CreateNotePayload;
  UPDATE_CONTAINER: UpdateContainerPayload;
  ADD_BOOKMARK: AddBookmarkPayload;
  ADD_LINK: AddLinkPayload;
  INGEST_AUDIO: IngestAudioPayload;
  ADD_NOTEBOOKLM: AddNotebookLmPayload;
};

export interface BusCommand<TType extends CommandType = CommandType> {
  id: string;
  type: TType;
  payload: CommandPayloadMap[TType];
  status: CommandStatus;
  priority: CommandPriority;
  clientId?: string;
  targetDate?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string | null;
  result?: any;
}

export interface EnqueueCommandInput<TType extends CommandType = CommandType> {
  type: TType;
  payload: CommandPayloadMap[TType];
  priority?: CommandPriority;
  clientId?: string;
  targetDate?: string;
  executeSync?: boolean;
}

export interface EnqueueCommandResponse {
  success: boolean;
  commandId: string;
  type: CommandType;
  status: CommandStatus;
  enqueuedAt: string;
  result?: any;
  error?: string;
}

export interface BusTasksFilter {
  status?: CommandStatus;
  type?: CommandType;
  clientId?: string;
  limit?: number;
  offset?: number;
}

// ── LemonBus Cloud Relay & P2P Event Types ─────────────────────────────────────

export type BusActionType = 'UPSERT' | 'STATUS_CHANGE' | 'DELETE';
export type BusEntityType = 'NOTE' | 'FOLDER' | 'FEED';

export interface BusEventEnvelope<T = any> {
  eventId: string;
  timestamp: string;
  deviceId: string;
  entityType: BusEntityType;
  action: BusActionType;
  payload: T;
}

export interface NoteEventPayload {
  id: string;
  title: string;
  description?: string | null;
  folderPath?: string | null;
  status?: string;
  publishAt?: string | null;
  feedId?: string | null;
  feedSlug?: string | null;
  type?: string;
  startDate?: string;
  endDate?: string | null;
  sourceLink?: string | null;
  sourceType?: string | null;
  externalId?: string | null;
  summary?: string | null;
  icon?: string | null;
  tags?: any[];
  hashtags?: string[];
  fileHash?: string | null;
  isRemoteSync?: boolean;
}

export interface DriveBusNodeStats {
  deviceId: string;
  eventsCount: number;
  lastEventTimestamp: string | null;
  watermarkTimestamp: string | null;
  isCurrentDevice: boolean;
}

export interface DriveBusRelayStatus {
  isWatching: boolean;
  busDir: string;
  eventsDir: string;
  currentDeviceId: string;
  totalEventsCount: number;
  nodes: DriveBusNodeStats[];
  watermarks: Record<string, string>;
  lastEventTimestamp: string | null;
}

export interface DriveBusEventsFilter {
  page?: number;
  limit?: number;
  deviceId?: string;
  action?: BusActionType;
  search?: string;
}

export interface DriveBusEventsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: BusEventEnvelope<NoteEventPayload>[];
}

