import { NoteOrigin } from '@lenta/shared';

export interface LiveFeedNoteEvent {
  id: string;
  type:
    | 'NOTE_CREATED'
    | 'NOTE_UPDATED'
    | 'NOTE_DELETED'
    | 'NOTE_ENTERED'
    | 'NOTE_LEFT'
    | 'STREAM_UPDATED'
    | 'FEED_UPDATED';
  noteId?: string;
  externalId?: string | null;
  parentNoteId?: string | null;
  title: string;
  summary?: string | null;
  author?: string | null;
  origin?: NoteOrigin | string;
  streamSlug?: string | null;
  streamSlugs?: string[];
  feedId?: string | null;
  feedSlug?: string | null;
  previousFeedSlug?: string | null;
  feedTitle?: string | null;
  feedIcon?: string | null;
  feedColor?: string | null;
  privacy: 'public' | 'private';
  status?: string;
  publishedAt?: string | null;
  dateKey?: string | null;
  hashtags?: string[];
  timestamp: number;
  noteType?: string;
  isPromoted?: boolean;
  note?: any;
}

export interface SseSubscriptionQuery {
  streams?: string;
  feeds?: string;
  authors?: string;
  hashtags?: string;
  types?: string;
  parentNoteId?: string;
  noteId?: string;
  topology?: string;
  since?: string;
}

export interface NoteRoutingSnapshot {
  noteId?: string;
  title?: string;
  privacy: 'public' | 'private';
  status: string;
  feedId?: string | null;
  feedSlug?: string | null;
  streamSlugs: string[];
  author?: string | null;
  hashtags: string[];
  noteType?: string;
  parentNoteId?: string | null;
}
