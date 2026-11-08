import { IngestSeasonNoteInput } from '../client/seasons-api.client.js';
import {
  ArenaVoiceEntryModel,
  CloudDayNoteModel,
  CloudDayNoteType,
  PartyVisibilityIsland,
} from '../types/neuron-models.types.js';

const CLOUD_TYPE_TO_SEASON_TYPE: Record<
  CloudDayNoteType,
  NonNullable<IngestSeasonNoteInput['type']>
> = {
  thought: 'SINGLE',
  proposal: 'EVENT',
  action: 'DONE',
};

const SEASON_TYPE_TO_CLOUD_TYPE: Record<string, CloudDayNoteType> = {
  SINGLE: 'thought',
  EVENT: 'proposal',
  DONE: 'action',
  MENTION: 'thought',
  PERIOD: 'proposal',
  FILM_RELEASE: 'proposal',
};

/**
 * Maps a Lemon Party CloudDayNote (character thought / proposal / action)
 * into a Lemon Seasons IngestNote payload while strictly preserving binary privacy
 * ('public' | 'private') and NoteOrigin = 'NEURON_PARTY'.
 */
export function cloudDayNoteToIngestInput(
  note: CloudDayNoteModel,
  defaults?: { defaultFeedSlug?: string; defaultStreamSlug?: string },
): IngestSeasonNoteInput {
  const binaryPrivacy: 'public' | 'private' =
    note.visibility === 'PUBLIC' ? 'public' : 'private';

  const startIso = note.time
    ? `${note.dateKey}T${note.time.length === 5 ? `${note.time}:00` : note.time}Z`
    : note.createdAt || `${note.dateKey}T12:00:00Z`;

  const tags = Array.from(
    new Set([
      ...(note.tags || []),
      `party:${note.type}`,
      `actor:${note.actorId}`,
    ]),
  );

  const fallbackTitle =
    note.title ||
    `${note.actorName}: ${note.text.replace(/\s+/g, ' ').trim().slice(0, 64)}`;

  return {
    externalId: `party-cloud:${note.id}`,
    title: fallbackTitle,
    content: note.text,
    summary: note.text.slice(0, 180),
    type: CLOUD_TYPE_TO_SEASON_TYPE[note.type] || 'SINGLE',
    privacy: binaryPrivacy,
    status: 'PUBLISHED',
    feedSlug: note.feedSlug || defaults?.defaultFeedSlug || 'party-chrono-diary',
    streamSlug: note.streamSlug || defaults?.defaultStreamSlug || 'lemon-party',
    author: note.actorId,
    parentNoteId: note.replyToNoteId || undefined,
    startDate: startIso,
    icon: note.moodEmoji,
    tags,
    origin: 'NEURON_PARTY',
    metadata: {
      lemonPartyKind: 'CloudDayNote',
      partyNoteId: note.id,
      dateKey: note.dateKey,
      time: note.time,
      cloudType: note.type,
      actorId: note.actorId,
      actorName: note.actorName,
      actorAvatar: note.actorAvatar,
      actorTitle: note.actorTitle,
      subActorId: note.subActorId ?? null,
      partyActorIds: note.partyActorIds || [],
      visibilityTier: note.visibility,
      replyToAuthorName: note.replyToAuthorName ?? null,
      replyToTextSnippet: note.replyToTextSnippet ?? null,
      likedByActors: note.likedByActors || [],
      supporters: note.supporters || [],
      votesCount: note.votesCount ?? 0,
      isPinnedToHero: Boolean(note.isPinnedToHero),
      isPinnedToCloud: Boolean(note.isPinnedToCloud),
      forkedFromNoteId: note.forkedFromNoteId ?? null,
      moodEmoji: note.moodEmoji,
    },
  };
}

/**
 * Reconstructs a Lemon Party CloudDayNoteModel from a Lemon Seasons Note record.
 */
export function seasonNoteToCloudDayNote(seasonNote: any): CloudDayNoteModel {
  const meta = (seasonNote?.metadata as Record<string, any>) || {};
  const startIso = seasonNote?.startDate || seasonNote?.createdAt || new Date().toISOString();
  const dateKey = meta.dateKey || String(startIso).slice(0, 10);

  const visibility: PartyVisibilityIsland =
    meta.visibilityTier === 'GM_ONLY' ||
    meta.visibilityTier === 'PRIVATE' ||
    meta.visibilityTier === 'PUBLIC'
      ? meta.visibilityTier
      : seasonNote?.privacy === 'private'
        ? 'PRIVATE'
        : 'PUBLIC';

  const cloudType: CloudDayNoteType =
    meta.cloudType ||
    SEASON_TYPE_TO_CLOUD_TYPE[String(seasonNote?.type || 'SINGLE')] ||
    'thought';

  const rawHashtags: string[] = Array.isArray(seasonNote?.hashtags)
    ? seasonNote.hashtags.map((h: any) => (typeof h === 'string' ? h : h?.name)).filter(Boolean)
    : [];

  return {
    id: meta.partyNoteId || seasonNote.id,
    dateKey,
    time: meta.time || String(startIso).slice(11, 16),
    createdAt: seasonNote.createdAt || startIso,
    type: cloudType,
    text: seasonNote.content || seasonNote.summary || '',
    title: seasonNote.title,
    actorId: meta.actorId || seasonNote.author || 'unknown-actor',
    actorName: meta.actorName || seasonNote.author || 'Unknown Hero',
    actorAvatar: meta.actorAvatar,
    actorTitle: meta.actorTitle,
    subActorId: meta.subActorId ?? null,
    partyActorIds: meta.partyActorIds || [],
    replyToNoteId: seasonNote.parentNoteId || meta.replyToNoteId || null,
    replyToAuthorName: meta.replyToAuthorName ?? null,
    replyToTextSnippet: meta.replyToTextSnippet ?? null,
    visibility,
    likedByActors: meta.likedByActors || [],
    supporters: meta.supporters || [],
    votesCount: meta.votesCount ?? 0,
    isPinnedToHero: Boolean(meta.isPinnedToHero),
    isPinnedToCloud: Boolean(meta.isPinnedToCloud || seasonNote.isPromoted),
    forkedFromNoteId: meta.forkedFromNoteId ?? null,
    moodEmoji: meta.moodEmoji || seasonNote.icon || undefined,
    tags: rawHashtags,
    feedSlug: seasonNote.feed?.slug || seasonNote.feedSlug || undefined,
  };
}

/**
 * Maps a Lemon Party ArenaVoiceEntry (hero voice / debate turn in Arena)
 * into a Lemon Seasons IngestNote payload.
 */
export function arenaVoiceToIngestInput(
  entry: ArenaVoiceEntryModel,
  options?: { feedSlug?: string; streamSlug?: string; privacy?: 'public' | 'private' },
): IngestSeasonNoteInput {
  return {
    externalId: `party-arena:${entry.id}`,
    title: `[${entry.intent}] ${entry.actorName}${entry.threadTitle ? ` — ${entry.threadTitle}` : ''}`,
    content: entry.text,
    summary: entry.text.slice(0, 180),
    type: entry.intent === 'COUNTER_PROPOSE' || entry.intent === 'SUPPORT' ? 'EVENT' : 'MENTION',
    privacy: options?.privacy || 'public',
    status: 'PUBLISHED',
    feedSlug: options?.feedSlug || 'party-arena-dialogues',
    streamSlug: options?.streamSlug || 'lemon-party',
    author: entry.actorId,
    startDate: entry.createdAt,
    tags: [
      'arena-voice',
      `intent:${entry.intent.toLowerCase()}`,
      `actor:${entry.actorId}`,
      ...(entry.paradoxId ? [`paradox:${entry.paradoxId}`] : []),
    ],
    origin: 'NEURON_PARTY',
    metadata: {
      lemonPartyKind: 'ArenaVoiceEntry',
      arenaEntryId: entry.id,
      actorId: entry.actorId,
      actorName: entry.actorName,
      paradoxId: entry.paradoxId,
      threadId: entry.threadId,
      threadTitle: entry.threadTitle,
      intent: entry.intent,
      sourceMode: entry.sourceMode,
      audioDataUrl: entry.audioDataUrl ?? null,
      activeNeuronSessions: entry.activeNeuronSessions || [],
    },
  };
}
