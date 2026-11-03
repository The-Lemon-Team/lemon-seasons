export interface LiveFeedNoteEvent {
  id: string;
  type: 'NOTE_CREATED' | 'NOTE_UPDATED' | 'NOTE_DELETED';
  noteId: string;
  title: string;
  feedId?: string | null;
  feedSlug?: string | null;
  feedTitle?: string | null;
  feedIcon?: string | null;
  feedColor?: string | null;
  privacy: 'public' | 'private';
  status: string;
  publishedAt?: string | null;
  timestamp: number;
}
