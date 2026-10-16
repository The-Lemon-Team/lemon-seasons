export interface BusEventEnvelope<T = any> {
  eventId: string;
  timestamp: string;
  deviceId: string;
  entityType: 'NOTE' | 'FOLDER' | 'FEED';
  action: 'UPSERT' | 'STATUS_CHANGE' | 'DELETE';
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
  tags?: string[];
  hashtags?: string[];
  fileHash?: string | null;
  isRemoteSync?: boolean;
}
