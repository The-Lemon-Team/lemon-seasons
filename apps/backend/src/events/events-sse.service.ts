import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Observable, Subject, merge, interval } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { NotePublishedEvent } from './note-published.event';
import { LiveFeedNoteEvent } from './events.types';

@Injectable()
export class EventsSseService {
  private readonly logger = new Logger(EventsSseService.name);
  private readonly event$ = new Subject<LiveFeedNoteEvent>();
  private readonly recentBuffer: LiveFeedNoteEvent[] = [];
  private readonly maxBufferSize = 50;

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('note.published')
  async handleNotePublished(event: NotePublishedEvent) {
    try {
      const payload = event.payload || {};
      let feedSlug = payload.feed?.slug;
      let feedTitle = payload.feed?.title;
      let feedIcon = payload.feed?.icon;
      let feedColor = payload.feed?.color;

      if (!feedSlug && event.feedId) {
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

      const noteEvent: LiveFeedNoteEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: event.isNew ? 'NOTE_CREATED' : 'NOTE_UPDATED',
        noteId: event.noteId,
        title: event.title,
        feedId: event.feedId || null,
        feedSlug: feedSlug || null,
        feedTitle: feedTitle || null,
        feedIcon: feedIcon || null,
        feedColor: feedColor || null,
        privacy: payload.privacy === 'public' ? 'public' : 'private',
        status: event.status || 'PUBLISHED',
        publishedAt: event.publishAt ? new Date(event.publishAt).toISOString() : null,
        timestamp: Date.now(),
      };

      this.addToBuffer(noteEvent);
      this.event$.next(noteEvent);
    } catch (err: any) {
      this.logger.warn(`Failed to process note.published event: ${err?.message}`);
    }
  }

  @OnEvent('note.deleted')
  handleNoteDeleted(data: { noteId: string }) {
    const noteEvent: LiveFeedNoteEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'NOTE_DELETED',
      noteId: data.noteId,
      title: 'Заметка удалена',
      privacy: 'private',
      status: 'ARCHIVED',
      timestamp: Date.now(),
    };
    this.addToBuffer(noteEvent);
    this.event$.next(noteEvent);
  }

  private addToBuffer(event: LiveFeedNoteEvent) {
    this.recentBuffer.unshift(event);
    if (this.recentBuffer.length > this.maxBufferSize) {
      this.recentBuffer.pop();
    }
  }

  getRecentEvents(isAdmin = false, since?: number): LiveFeedNoteEvent[] {
    return this.recentBuffer.filter((e) => {
      if (!isAdmin && e.privacy !== 'public') return false;
      if (since && e.timestamp <= since) return false;
      return true;
    });
  }

  getEventStream(isAdmin = false, lastEventId?: string): Observable<MessageEvent> {
    // 25s keep-alive ping to prevent proxy/browser timeout disconnects
    const keepAlive$ = interval(25000).pipe(
      map((): MessageEvent => ({
        type: 'ping',
        data: JSON.stringify({ timestamp: Date.now() }),
      }))
    );

    // Live event stream
    const live$ = this.event$.asObservable().pipe(
      filter((e) => isAdmin || e.privacy === 'public'),
      map((e): MessageEvent => ({
        id: e.id,
        type: 'note',
        data: JSON.stringify(e),
      }))
    );

    return merge(keepAlive$, live$);
  }
}
