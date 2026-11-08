import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { SeasonsApiClient } from '../client/seasons-api.client.js';
import { SeasonsSseBus } from '../client/seasons-sse.bus.js';
import {
  cloudDayNoteToIngestInput,
  seasonNoteToCloudDayNote,
} from '../mappers/lemon-party.mapper.js';
import {
  CloudDayNoteModel,
  SeasonsLiveNoteImpulse,
} from '../types/neuron-models.types.js';

export interface CharacterDialogueAxonOptions {
  apiClient: SeasonsApiClient;
  sseBus?: SeasonsSseBus;
  defaultStreamSlug?: string;
  defaultPrivacy?: 'public' | 'private';
}

export interface EnsureCharacterChannelInput {
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  actorTitle?: string;
  streamSlug?: string;
  privacy?: 'public' | 'private';
  feedSlug?: string;
}

export interface RecordDialogueInput {
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  actorTitle?: string;
  text: string;
  type?: 'thought' | 'proposal' | 'action';
  dateKey?: string; // YYYY-MM-DD (defaults to today)
  time?: string; // HH:mm (defaults to now)
  replyToNoteId?: string | null;
  replyToAuthorName?: string | null;
  replyToTextSnippet?: string | null;
  moodEmoji?: string;
  tags?: string[];
  streamSlug?: string;
  feedSlug?: string;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'GM_ONLY';
}

/**
 * Character Dialogue Axon ("Аксон Диалогов Персонажей и Истории Дня").
 * Handles registration and discovery of character streams/feeds in Lemon Seasons,
 * synchronous recording of dialogue lines & thoughts into the day timeline,
 * and live reactive streaming of incoming dialogue turns.
 */
export class CharacterDialogueAxon {
  private readonly apiClient: SeasonsApiClient;
  private readonly sseBus?: SeasonsSseBus;
  private readonly defaultStreamSlug: string;
  private readonly defaultPrivacy: 'public' | 'private';

  constructor(options: CharacterDialogueAxonOptions) {
    this.apiClient = options.apiClient;
    this.sseBus = options.sseBus;
    this.defaultStreamSlug = options.defaultStreamSlug || 'lemon-party';
    this.defaultPrivacy = options.defaultPrivacy || 'public';
  }

  /**
   * Ensures the parent stream and the character-specific feed exist in Lemon Seasons.
   * If they do not exist, they are registered with appropriate icons and hashtags.
   */
  async ensureCharacterChannel(input: EnsureCharacterChannelInput): Promise<{
    streamSlug: string;
    feedSlug: string;
    feedId?: string;
  }> {
    const streamSlug = input.streamSlug || this.defaultStreamSlug;
    const privacy = input.privacy || this.defaultPrivacy;

    const feedSlug =
      input.feedSlug ||
      `party-${input.actorId.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;

    // 1. Ensure parent stream exists
    const stream = await this.apiClient.ensureStream({
      slug: streamSlug,
      title: 'Lemon Party Chronicles',
      icon: '🎭',
      privacy,
      tags: ['lemon-party', 'chronicles', 'day-timeline'],
    });

    // 2. Ensure character feed exists
    const feed = await this.apiClient.ensureFeed({
      slug: feedSlug,
      title: input.actorName,
      description: input.actorTitle || `Персонаж: ${input.actorName}`,
      icon: input.actorAvatar || '👤',
      privacy,
      hashtags: [`actor:${input.actorId}`, 'character-dialogue', 'party'],
    });

    // 3. Attach feed to stream if possible
    if (stream?.id && feed?.id) {
      try {
        await this.apiClient.attachFeedToStream(stream.id, feed.id);
      } catch {
        // Idempotent: already attached or unsupported endpoint
      }
    }

    return {
      streamSlug,
      feedSlug,
      feedId: feed?.id,
    };
  }

  /**
   * Records a character thought, proposal, or dialog turn into Lemon Seasons.
   * Note is saved with NoteOrigin = 'NEURON_PARTY' and strict binary privacy.
   */
  async recordDialogue(input: RecordDialogueInput): Promise<CloudDayNoteModel> {
    const now = new Date();
    const dateKey = input.dateKey || now.toISOString().slice(0, 10);
    const time =
      input.time ||
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const model: CloudDayNoteModel = {
      id: `party-note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dateKey,
      time,
      createdAt: now.toISOString(),
      type: input.type || 'thought',
      text: input.text,
      actorId: input.actorId,
      actorName: input.actorName,
      actorAvatar: input.actorAvatar,
      actorTitle: input.actorTitle,
      replyToNoteId: input.replyToNoteId ?? null,
      replyToAuthorName: input.replyToAuthorName ?? null,
      replyToTextSnippet: input.replyToTextSnippet ?? null,
      visibility: input.visibility || (this.defaultPrivacy === 'private' ? 'PRIVATE' : 'PUBLIC'),
      moodEmoji: input.moodEmoji,
      tags: input.tags || [],
      feedSlug:
        input.feedSlug ||
        `party-${input.actorId.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
      streamSlug: input.streamSlug || this.defaultStreamSlug,
    };

    const ingestPayload = cloudDayNoteToIngestInput(model, {
      defaultStreamSlug: this.defaultStreamSlug,
      defaultFeedSlug: model.feedSlug,
    });

    const response = await this.apiClient.ingestNote(ingestPayload);
    const persistedNote = response?.note || ingestPayload;

    return seasonNoteToCloudDayNote({
      ...persistedNote,
      id: response?.noteId || model.id,
      metadata: {
        ...(persistedNote.metadata || {}),
        actorId: model.actorId,
        actorName: model.actorName,
        actorAvatar: model.actorAvatar,
        dateKey: model.dateKey,
        time: model.time,
        partyNoteId: model.id,
      },
    });
  }

  /**
   * Fetches all character dialogue lines and notes for a specific day timeline,
   * sorted in chronological order (ASC).
   */
  async getDayTimeline(
    dateKey: string,
    options?: {
      streamSlug?: string;
      actorId?: string;
      limit?: number;
    },
  ): Promise<CloudDayNoteModel[]> {
    const startDateFrom = `${dateKey}T00:00:00.000Z`;
    const startDateTo = `${dateKey}T23:59:59.999Z`;

    const result = await this.apiClient.getNotesPage({
      streamSource: options?.streamSlug || this.defaultStreamSlug,
      startDateFrom,
      startDateTo,
      sortBy: 'startDate',
      sortOrder: 'asc',
      limit: options?.limit || 100,
      author: options?.actorId,
    });

    return (result.items || []).map((seasonNote) =>
      seasonNoteToCloudDayNote(seasonNote),
    );
  }

  /**
   * Returns a reactive stream of real-time dialogue impulses from the SSE bus.
   */
  streamLiveDialogue$(actorId?: string): Observable<CloudDayNoteModel> {
    if (!this.sseBus) {
      throw new Error(
        'SeasonsSseBus is required to subscribe to live dialogue stream',
      );
    }

    return this.sseBus.noteEvents$.pipe(
      filter((impulse: SeasonsLiveNoteImpulse) => {
        if (impulse.type !== 'NOTE_CREATED' && impulse.type !== 'NOTE_UPDATED') {
          return false;
        }
        if (actorId) {
          const noteActor =
            impulse.note?.metadata?.actorId ||
            impulse.author ||
            impulse.note?.author;
          return noteActor === actorId;
        }
        return true;
      }),
      map((impulse: SeasonsLiveNoteImpulse) => {
        const rawNote = impulse.note || impulse;
        return seasonNoteToCloudDayNote({
          ...rawNote,
          id: impulse.noteId || rawNote.id,
          title: impulse.title,
          summary: impulse.summary,
          author: impulse.author,
          feedSlug: impulse.feedSlug,
          metadata: {
            ...(rawNote.metadata || {}),
            actorId: impulse.author || rawNote.author,
          },
        });
      }),
    );
  }
}
