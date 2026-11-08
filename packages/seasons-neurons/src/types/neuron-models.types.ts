import {
  NoteOrigin,
  SeasonsTopologyPatch,
  SeasonsTopologySnapshot,
} from '@lenta/shared';

export type PartyVisibilityIsland = 'PUBLIC' | 'PRIVATE' | 'GM_ONLY';

export type CloudDayNoteType = 'thought' | 'proposal' | 'action';

export interface CloudDayNoteModel {
  id: string;
  dateKey: string; // YYYY-MM-DD
  time?: string; // HH:mm
  createdAt: string;
  type: CloudDayNoteType;
  text: string;
  title?: string;
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  actorTitle?: string;
  subActorId?: string | null;
  partyActorIds?: string[];
  replyToNoteId?: string | null;
  replyToAuthorName?: string | null;
  replyToTextSnippet?: string | null;
  visibility: PartyVisibilityIsland;
  likedByActors?: string[];
  supporters?: string[];
  votesCount?: number;
  isPinnedToHero?: boolean;
  isPinnedToCloud?: boolean;
  forkedFromNoteId?: string | null;
  moodEmoji?: string;
  tags?: string[];
  feedSlug?: string;
  streamSlug?: string;
}

export interface ArenaVoiceEntryModel {
  id: string;
  actorId: string;
  actorName: string;
  paradoxId?: string;
  threadId?: string;
  threadTitle?: string;
  intent: 'SUPPORT' | 'COUNTER_PROPOSE' | 'PARADOX_OPINION' | 'ANALYTICS';
  sourceMode: 'MANUAL_PUPPET' | 'AUDIO_VOICE' | 'NEURAL_DRAFT';
  text: string;
  audioDataUrl?: string | null;
  activeNeuronSessions?: string[];
  createdAt: string;
}

export interface CodingSessionMemoryInput {
  sessionId: string;
  repoName: string;
  title: string;
  summaryMarkdown: string;
  startedAt: string;
  endedAt?: string;
  activeFlowSessionIds?: string[];
  filesTouched?: string[];
  decisions?: string[];
  tags?: string[];
  parentNoteId?: string;
  privacy?: 'public' | 'private';
  feedSlug?: string;
}

export interface PaginatedNotesWindow<TNote = any> {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  items: TNote[];
}

export interface SseSubscriptionTemplate {
  streams?: string[];
  feeds?: string[];
  authors?: string[];
  hashtags?: string[];
  noteTypes?: string[];
  parentNoteId?: string;
  noteId?: string;
  includeTopology?: boolean;
  sinceEventId?: string;
}

export interface SeasonsLiveNoteImpulse {
  id: string;
  type:
    | 'NOTE_CREATED'
    | 'NOTE_UPDATED'
    | 'NOTE_DELETED'
    | 'NOTE_ENTERED'
    | 'NOTE_LEFT'
    | 'STREAM_UPDATED'
    | 'FEED_UPDATED'
    | 'TOPOLOGY_CHANGED';
  noteId?: string;
  externalId?: string | null;
  parentNoteId?: string | null;
  title: string;
  summary?: string | null;
  author?: string | null;
  origin?: NoteOrigin;
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
  noteType?: string;
  dateKey?: string | null;
  hashtags?: string[];
  isPromoted?: boolean;
  publishedAt?: string | null;
  timestamp: number;
  note?: any;
}

export type SeasonsSsePacket =
  | { kind: 'note'; event: SeasonsLiveNoteImpulse }
  | { kind: 'topology'; patch: SeasonsTopologyPatch }
  | { kind: 'snapshot'; snapshot: SeasonsTopologySnapshot };
