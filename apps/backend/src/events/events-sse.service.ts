import { Injectable, Logger, MessageEvent, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Observable, concat, defer, from, interval, merge } from 'rxjs';
import { finalize, map, share } from 'rxjs/operators';
import { SeasonsTopologyPatch } from '@lenta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TopologyService } from '../topology/topology.service';
import { NotePublishedEvent } from './note-published.event';
import {
  LiveFeedNoteEvent,
  NoteRoutingSnapshot,
  SseSubscriptionQuery,
} from './events.types';
import { SubscriptionRegistry } from './subscription-registry';

@Injectable()
export class EventsSseService {
  private readonly logger = new Logger(EventsSseService.name);
  private readonly registry = new SubscriptionRegistry();
  private readonly recentBuffer: Array<{
    event: LiveFeedNoteEvent;
    snapshot: NoteRoutingSnapshot;
  }> = [];
  private readonly maxBufferSize = 200;

  /**
   * Single shared 25s heartbeat timer across all active SSE connections (zero per-client timer bloat).
   */
  private readonly sharedKeepAlive$: Observable<MessageEvent> = interval(25000).pipe(
    map(
      (): MessageEvent => ({
        type: 'ping',
        data: JSON.stringify({ timestamp: Date.now() }),
      }),
    ),
    share(),
  );

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly topologyService?: TopologyService,
  ) {}

  @OnEvent('note.published')
  async handleNotePublished(event: NotePublishedEvent) {
    try {
      const payload = event.payload || {};
      let feedSlug: string | null = payload.feed?.slug || null;
      let feedTitle: string | null = payload.feed?.title || null;
      let feedIcon: string | null = payload.feed?.icon || null;
      let feedColor: string | null = payload.feed?.color || null;

      if (!feedSlug && event.feedId && this.prisma.feed?.findUnique) {
        const feed = await this.prisma.feed.findUnique({
          where: { id: event.feedId },
          select: { slug: true, title: true, icon: true, color: true },
        });
        if (feed) {
          feedSlug = feed.slug;
          feedTitle = feed.title;
          feedIcon = feed.icon;
          feedColor = feed.color;
        }
      }

      const streamSlugs = await this.resolveStreamsForFeed(
        event.feedId || null,
        payload.metadata?.streamSlug,
      );

      const hashtags: string[] = Array.isArray(payload.hashtags)
        ? payload.hashtags
            .map((h: any) => (typeof h === 'string' ? h : h?.name))
            .filter(Boolean)
        : [];

      const startIso = payload.startDate
        ? new Date(payload.startDate).toISOString()
        : null;

      const origin =
        payload.metadata?.origin ||
        (payload.sourceType === 'GOOGLE_DRIVE' ? 'GDRIVE_SPARK' : payload.sourceType || undefined);

      const prevRaw = event.previousState;
      let prevSnapshot: NoteRoutingSnapshot | null = null;
      if (prevRaw) {
        const prevStreamSlugs = await this.resolveStreamsForFeed(
          prevRaw.feedId || null,
          prevRaw.metadata?.streamSlug,
        );
        prevSnapshot = {
          noteId: event.noteId,
          title: prevRaw.title || event.title,
          privacy: prevRaw.privacy === 'public' ? 'public' : 'private',
          status: prevRaw.status || 'PUBLISHED',
          feedId: prevRaw.feedId || null,
          feedSlug: prevRaw.feed?.slug || prevRaw.feedSlug || null,
          streamSlugs: prevStreamSlugs,
          author: prevRaw.author || null,
          hashtags: Array.isArray(prevRaw.hashtags)
            ? prevRaw.hashtags
                .map((h: any) => (typeof h === 'string' ? h : h?.name))
                .filter(Boolean)
            : [],
          noteType: prevRaw.type || undefined,
          parentNoteId: prevRaw.parentNoteId || null,
        };
      }

      const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      this.topologyService?.setLastEventId(eventId);

      // Strip bulky rawContent before attaching compact note preview
      let compactNote: any = undefined;
      if (payload && payload.id) {
        const { rawContent, ...rest } = payload;
        compactNote = rest;
      }

      const noteEvent: LiveFeedNoteEvent = {
        id: eventId,
        type: event.isNew ? 'NOTE_CREATED' : 'NOTE_UPDATED',
        noteId: event.noteId,
        externalId: payload.externalId || null,
        parentNoteId: payload.parentNoteId || null,
        title: event.title,
        summary: payload.summary || null,
        author: payload.author || null,
        origin,
        noteType: payload.type || undefined,
        isPromoted: Boolean(
          payload.isPromoted ||
            payload.metadata?.isPromoted ||
            payload.metadata?.promoted ||
            payload.metadata?.broadcastToBus,
        ),
        streamSlug: streamSlugs[0] || null,
        streamSlugs,
        feedId: event.feedId || null,
        feedSlug: feedSlug || null,
        previousFeedSlug: prevSnapshot?.feedSlug || null,
        feedTitle: feedTitle || null,
        feedIcon: feedIcon || null,
        feedColor: feedColor || null,
        privacy: payload.privacy === 'public' ? 'public' : 'private',
        status: event.status || 'PUBLISHED',
        publishedAt: event.publishAt ? new Date(event.publishAt).toISOString() : null,
        dateKey: startIso ? startIso.slice(0, 10) : null,
        hashtags,
        timestamp: Date.now(),
        note: compactNote,
      };

      const nextSnapshot: NoteRoutingSnapshot = {
        noteId: event.noteId,
        title: event.title,
        privacy: noteEvent.privacy,
        status: noteEvent.status || 'PUBLISHED',
        feedId: noteEvent.feedId,
        feedSlug: noteEvent.feedSlug,
        streamSlugs,
        author: noteEvent.author,
        hashtags,
        noteType: noteEvent.noteType,
        parentNoteId: noteEvent.parentNoteId,
      };

      this.addToBuffer(noteEvent, nextSnapshot);
      this.registry.dispatchNoteTransition(noteEvent, nextSnapshot, prevSnapshot);
    } catch (err: any) {
      this.logger.warn(`Failed to process note.published event: ${err?.message}`);
    }
  }

  @OnEvent('note.deleted')
  handleNoteDeleted(data: { noteId: string; previousState?: any }) {
    const prev = data.previousState;
    const prevFeedSlug = prev?.feed?.slug || prev?.feedSlug || null;
    const privacy: 'public' | 'private' =
      prev?.privacy === 'public' ? 'public' : 'private';

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.topologyService?.setLastEventId(eventId);

    const noteEvent: LiveFeedNoteEvent = {
      id: eventId,
      type: 'NOTE_DELETED',
      noteId: data.noteId,
      title: prev?.title || 'Заметка удалена',
      feedId: prev?.feedId || null,
      feedSlug: prevFeedSlug,
      previousFeedSlug: prevFeedSlug,
      privacy,
      status: 'ARCHIVED',
      timestamp: Date.now(),
    };

    const prevSnap: NoteRoutingSnapshot | null = prev
      ? {
          noteId: data.noteId,
          title: prev.title,
          privacy,
          status: prev.status || 'PUBLISHED',
          feedId: prev.feedId || null,
          feedSlug: prevFeedSlug,
          streamSlugs: [],
          author: prev.author || null,
          hashtags: Array.isArray(prev.hashtags)
            ? prev.hashtags
                .map((h: any) => (typeof h === 'string' ? h : h?.name))
                .filter(Boolean)
            : [],
          noteType: prev.type || undefined,
          parentNoteId: prev.parentNoteId || null,
        }
      : null;

    this.addToBuffer(
      noteEvent,
      prevSnap || {
        noteId: data.noteId,
        privacy,
        status: 'ARCHIVED',
        streamSlugs: [],
        hashtags: [],
      },
    );
    this.registry.dispatchNoteTransition(
      noteEvent,
      { noteId: data.noteId, privacy, status: 'ARCHIVED', streamSlugs: [], hashtags: [] },
      prevSnap,
    );
  }

  @OnEvent('stream.created')
  @OnEvent('stream.updated')
  @OnEvent('stream.deleted')
  handleStreamChanged(data: any) {
    const streamEvent: LiveFeedNoteEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'STREAM_UPDATED',
      title: `Обновление стрима ${data?.title || data?.slug || ''}`,
      streamSlug: data?.slug,
      privacy: data?.privacy === 'private' ? 'private' : 'public',
      timestamp: Date.now(),
    };
    const snap: NoteRoutingSnapshot = {
      privacy: streamEvent.privacy,
      status: 'PUBLISHED',
      streamSlugs: data?.slug ? [data.slug] : [],
      hashtags: [],
    };
    this.addToBuffer(streamEvent, snap);
    this.registry.dispatchNoteTransition(streamEvent, snap, null);
  }

  @OnEvent('feed.created')
  @OnEvent('feed.updated')
  @OnEvent('feed.deleted')
  handleFeedChanged(data: any) {
    const feedEvent: LiveFeedNoteEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'FEED_UPDATED',
      title: `Обновление ленты ${data?.title || data?.slug || ''}`,
      feedId: data?.id || data?.feedId || null,
      feedSlug: data?.slug || null,
      privacy: data?.privacy === 'private' ? 'private' : 'public',
      timestamp: Date.now(),
    };
    const snap: NoteRoutingSnapshot = {
      privacy: feedEvent.privacy,
      status: 'PUBLISHED',
      feedId: feedEvent.feedId,
      feedSlug: feedEvent.feedSlug,
      streamSlugs: [],
      hashtags: [],
    };
    this.addToBuffer(feedEvent, snap);
    this.registry.dispatchNoteTransition(feedEvent, snap, null);
  }

  @OnEvent('topology.patched')
  handleTopologyPatched(data: {
    publicPatch: SeasonsTopologyPatch;
    adminPatch: SeasonsTopologyPatch;
  }) {
    this.registry.dispatchTopologyPatch(data.publicPatch, data.adminPatch);
  }

  private addToBuffer(event: LiveFeedNoteEvent, snapshot: NoteRoutingSnapshot) {
    this.recentBuffer.unshift({ event, snapshot });
    if (this.recentBuffer.length > this.maxBufferSize) {
      this.recentBuffer.pop();
    }
  }

  getRecentEvents(isAdmin = false, since?: number): LiveFeedNoteEvent[] {
    return this.recentBuffer
      .filter(({ event }) => {
        if (!isAdmin && event.privacy !== 'public') return false;
        if (since && event.timestamp <= since) return false;
        return true;
      })
      .map(({ event }) => event);
  }

  getSubscriberStats() {
    return this.registry.getStats();
  }

  getEventStream(
    isAdmin = false,
    lastEventId?: string,
    query?: SseSubscriptionQuery,
  ): Observable<MessageEvent> {
    return defer(() => {
      const sub = this.registry.register(isAdmin, query);
      const effectiveCursor = lastEventId || query?.since;

      // Replay missed buffer frames if client reconnected with Last-Event-ID / ?since=
      const missedMessages: MessageEvent[] = [];
      if (effectiveCursor) {
        const idx = this.recentBuffer.findIndex(({ event }) => event.id === effectiveCursor);
        if (idx > 0) {
          // recentBuffer is newest-first; replay older -> newer (idx - 1 down to 0)
          for (let i = idx - 1; i >= 0; i--) {
            const entry = this.recentBuffer[i];
            if (this.registry.matchesSnapshot(sub, entry.snapshot)) {
              missedMessages.push({
                id: entry.event.id,
                type: 'note',
                data: JSON.stringify(entry.event),
              });
            }
          }
        }
      }

      const live$ = merge(this.sharedKeepAlive$, sub.subject$.asObservable());
      const fullStream$ =
        missedMessages.length > 0 ? concat(from(missedMessages), live$) : live$;

      return fullStream$.pipe(
        finalize(() => {
          this.registry.unregister(sub.id);
        }),
      );
    });
  }

  private async resolveStreamsForFeed(
    feedId: string | null,
    explicitStreamSlug?: string,
  ): Promise<string[]> {
    const slugs = new Set<string>();
    if (explicitStreamSlug) {
      slugs.add(explicitStreamSlug);
    }
    if (feedId && this.prisma.stream?.findMany) {
      try {
        const streams = await this.prisma.stream.findMany({
          where: {
            deletedAt: null,
            feedIds: { has: feedId },
          },
          select: { slug: true },
        });
        for (const s of streams) {
          if (s.slug) slugs.add(s.slug);
        }
      } catch {
        // ignore if stream relation is mocked or unavailable
      }
    }
    return Array.from(slugs);
  }
}
