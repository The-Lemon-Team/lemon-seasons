export interface LiveFeedNoteEvent {
  id: string;
  type: 'NOTE_CREATED' | 'NOTE_UPDATED' | 'NOTE_DELETED' | 'STREAM_UPDATED';
  noteId?: string;
  title: string;
  streamSlug?: string | null;
  feedId?: string | null;
  feedSlug?: string | null;
  feedTitle?: string | null;
  feedIcon?: string | null;
  feedColor?: string | null;
  privacy: 'public' | 'private';
  status?: string;
  publishedAt?: string | null;
  timestamp: number;
  noteType?: string;
  isPromoted?: boolean;
}
