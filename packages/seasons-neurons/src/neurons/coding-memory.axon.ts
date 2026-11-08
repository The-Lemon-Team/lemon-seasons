import { SeasonsApiClient } from '../client/seasons-api.client.js';
import {
  CodingSessionMemoryInput,
  PaginatedNotesWindow,
} from '../types/neuron-models.types.js';

export interface CodingMemoryAxonOptions {
  apiClient: SeasonsApiClient;
  defaultStreamSlug?: string;
  thoughtsFeedSlug?: string;
  changelogsFeedSlug?: string;
  defaultPrivacy?: 'public' | 'private';
}

/**
 * Coding Memory Axon ("Аксон Памяти Кодинг-Сессий").
 * Allows coding agents and lemon-actions workflows to persist architectural decisions,
 * session thoughts, and changelogs into Lemon Seasons with NoteOrigin = 'CODING_AGENT',
 * and recall paginated context at the start of a new coding session.
 */
export class CodingMemoryAxon {
  private readonly apiClient: SeasonsApiClient;
  private readonly defaultStreamSlug: string;
  private readonly thoughtsFeedSlug: string;
  private readonly changelogsFeedSlug: string;
  private readonly defaultPrivacy: 'public' | 'private';

  constructor(options: CodingMemoryAxonOptions) {
    this.apiClient = options.apiClient;
    this.defaultStreamSlug = options.defaultStreamSlug || 'coding-memory';
    this.thoughtsFeedSlug = options.thoughtsFeedSlug || 'coding-thoughts';
    this.changelogsFeedSlug = options.changelogsFeedSlug || 'coding-sessions';
    this.defaultPrivacy = options.defaultPrivacy || 'private';
  }

  /**
   * Ensures the coding memory Stream and Feeds exist in Lemon Seasons (Admin API).
   */
  async ensureMemoryTopology(): Promise<{ streamId: string; feedIds: string[] }> {
    const thoughtsFeed = await this.apiClient.ensureFeed({
      slug: this.thoughtsFeedSlug,
      title: 'Coding Thoughts & Decisions',
      icon: '🧠',
      privacy: this.defaultPrivacy,
      hashtags: ['coding-memory', 'agent-thought'],
    });

    const changelogsFeed = await this.apiClient.ensureFeed({
      slug: this.changelogsFeedSlug,
      title: 'Coding Session Changelogs',
      icon: '🛠️',
      privacy: this.defaultPrivacy,
      hashtags: ['coding-memory', 'session-changelog'],
    });

    const feedIds = [thoughtsFeed?.id, changelogsFeed?.id].filter(Boolean);
    const stream = await this.apiClient.ensureStream({
      slug: this.defaultStreamSlug,
      title: 'Agent Coding Memory',
      icon: '⚡',
      privacy: this.defaultPrivacy,
      feedIds,
      tags: ['coding-memory'],
    });

    return {
      streamId: stream?.id || this.defaultStreamSlug,
      feedIds,
    };
  }

  /**
   * Appends a live thought, architectural hypothesis, or intermediate decision during a session.
   */
  async appendSessionThought(input: {
    sessionId: string;
    repoName: string;
    thoughtId?: string;
    title: string;
    markdown: string;
    author?: string;
    parentNoteId?: string;
    tags?: string[];
    filesTouched?: string[];
  }): Promise<{ noteId: string; note: any }> {
    const extKey = input.thoughtId || `${input.sessionId}:${Date.now()}`;
    const res = await this.apiClient.ingestNote({
      externalId: `coding-thought:${extKey}`,
      title: input.title,
      content: input.markdown,
      summary: input.markdown.replace(/\s+/g, ' ').trim().slice(0, 180),
      type: 'SINGLE',
      privacy: this.defaultPrivacy,
      status: 'PUBLISHED',
      feedSlug: this.thoughtsFeedSlug,
      streamSlug: this.defaultStreamSlug,
      author: input.author || 'coding-agent',
      parentNoteId: input.parentNoteId,
      tags: Array.from(
        new Set([
          'coding-memory',
          'agent-thought',
          `repo:${input.repoName}`,
          ...(input.tags || []),
        ]),
      ),
      origin: 'CODING_AGENT',
      metadata: {
        codingMemoryKind: 'SessionThought',
        sessionId: input.sessionId,
        repoName: input.repoName,
        filesTouched: input.filesTouched || [],
      },
    });
    return { noteId: res.noteId, note: res.note };
  }

  /**
   * Commits an idempotent session summary / changelog note (PERIOD or DONE) keyed by sessionId.
   */
  async commitSessionChangelog(
    input: CodingSessionMemoryInput,
  ): Promise<{ noteId: string; note: any; isNew: boolean }> {
    const res = await this.apiClient.ingestNote({
      externalId: `coding-session:${input.sessionId}`,
      title: input.title,
      content: input.summaryMarkdown,
      summary: input.summaryMarkdown.replace(/\s+/g, ' ').trim().slice(0, 200),
      type: input.endedAt ? 'DONE' : 'PERIOD',
      privacy: input.privacy || this.defaultPrivacy,
      status: 'PUBLISHED',
      feedSlug: input.feedSlug || this.changelogsFeedSlug,
      streamSlug: this.defaultStreamSlug,
      author: 'coding-agent',
      parentNoteId: input.parentNoteId,
      startDate: input.startedAt,
      endDate: input.endedAt,
      tags: Array.from(
        new Set([
          'coding-memory',
          'session-changelog',
          `repo:${input.repoName}`,
          ...(input.tags || []),
        ]),
      ),
      origin: 'CODING_AGENT',
      metadata: {
        codingMemoryKind: 'SessionChangelog',
        sessionId: input.sessionId,
        repoName: input.repoName,
        activeFlowSessionIds: input.activeFlowSessionIds || [],
        filesTouched: input.filesTouched || [],
        decisions: input.decisions || [],
      },
    });
    return { noteId: res.noteId, note: res.note, isNew: res.isNew };
  }

  /**
   * Recalls paginated coding memory notes (filtered by repo, search query, or feed).
   */
  async recallMemory(params?: {
    repoName?: string;
    search?: string;
    feedSlug?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedNotesWindow<any>> {
    const hashtag = params?.repoName ? `repo:${params.repoName}` : undefined;
    if (params?.feedSlug) {
      return this.apiClient.getFeedNotesPage(params.feedSlug, {
        hashtag,
        search: params.search,
        privacy: 'all',
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
      });
    }
    return this.apiClient.getStreamNotesPage(this.defaultStreamSlug, {
      hashtag,
      search: params?.search,
      privacy: 'all',
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
    });
  }
}
