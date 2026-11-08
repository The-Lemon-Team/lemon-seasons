import { MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';
import { SeasonsTopologyPatch } from '@lenta/shared';
import {
  LiveFeedNoteEvent,
  NoteRoutingSnapshot,
  SseSubscriptionQuery,
} from './events.types';

export interface CompiledSseSubscriber {
  id: string;
  createdAt: number;
  isAdmin: boolean;
  includeTopology: boolean;
  hasCriteria: boolean;
  streams: ReadonlySet<string> | null;
  feeds: ReadonlySet<string> | null;
  authors: ReadonlySet<string> | null;
  hashtags: ReadonlySet<string> | null;
  types: ReadonlySet<string> | null;
  parentNoteId: string | null;
  noteId: string | null;
  subject$: Subject<MessageEvent>;
}

function parseCsvSet(raw?: string): ReadonlySet<string> | null {
  if (!raw || !raw.trim()) return null;
  const items = raw
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/^#/, ''))
    .filter(Boolean);
  return items.length > 0 ? new Set(items) : null;
}

/**
 * Lightweight in-memory SubscriptionRegistry (~512 bytes per active SSE client).
 * Compiles query templates into O(1) ReadonlySet lookups and computes exact
 * Before -> After (`prev -> next`) boundary transitions (NOTE_ENTERED / NOTE_UPDATED / NOTE_LEFT).
 */
export class SubscriptionRegistry {
  private readonly subscribers = new Map<string, CompiledSseSubscriber>();
  private seq = 0;

  register(isAdmin: boolean, query?: SseSubscriptionQuery): CompiledSseSubscriber {
    this.seq += 1;
    const id = `sub_${Date.now()}_${this.seq}`;

    const streams = parseCsvSet(query?.streams);
    const feeds = parseCsvSet(query?.feeds);
    const authors = parseCsvSet(query?.authors);
    const hashtags = parseCsvSet(query?.hashtags);
    const types = parseCsvSet(query?.types);
    const parentNoteId = query?.parentNoteId?.trim() || null;
    const noteId = query?.noteId?.trim() || null;

    const hasCriteria = Boolean(
      streams || feeds || authors || hashtags || types || parentNoteId || noteId,
    );

    const includeTopology = query?.topology !== 'false';

    const sub: CompiledSseSubscriber = {
      id,
      createdAt: Date.now(),
      isAdmin,
      includeTopology,
      hasCriteria,
      streams,
      feeds,
      authors,
      hashtags,
      types,
      parentNoteId,
      noteId,
      subject$: new Subject<MessageEvent>(),
    };

    this.subscribers.set(id, sub);
    return sub;
  }

  unregister(subscriberId: string): void {
    const existing = this.subscribers.get(subscriberId);
    if (existing) {
      existing.subject$.complete();
      this.subscribers.delete(subscriberId);
    }
  }

  matchesSnapshot(sub: CompiledSseSubscriber, snap: NoteRoutingSnapshot): boolean {
    if (!sub.isAdmin) {
      if (snap.privacy !== 'public') return false;
      if (snap.status && snap.status !== 'PUBLISHED') return false;
    }

    if (!sub.hasCriteria) {
      return true;
    }

    if (sub.noteId && snap.noteId !== sub.noteId) {
      return false;
    }

    if (sub.parentNoteId && snap.parentNoteId !== sub.parentNoteId) {
      return false;
    }

    if (sub.feeds) {
      const fSlug = snap.feedSlug?.toLowerCase();
      const fId = snap.feedId?.toLowerCase();
      if ((!fSlug || !sub.feeds.has(fSlug)) && (!fId || !sub.feeds.has(fId))) {
        return false;
      }
    }

    if (sub.streams) {
      const hasStream = snap.streamSlugs.some((s) => sub.streams!.has(s.toLowerCase()));
      if (!hasStream) return false;
    }

    if (sub.authors) {
      const normAuthor = snap.author?.trim().toLowerCase();
      if (!normAuthor || !sub.authors.has(normAuthor)) return false;
    }

    if (sub.hashtags) {
      const hasTag = snap.hashtags.some((t) => sub.hashtags!.has(t.toLowerCase().replace(/^#/, '')));
      if (!hasTag) return false;
    }

    if (sub.types) {
      const normType = snap.noteType?.toLowerCase();
      if (!normType || !sub.types.has(normType)) return false;
    }

    return true;
  }

  dispatchNoteTransition(
    event: LiveFeedNoteEvent,
    nextSnap: NoteRoutingSnapshot,
    prevSnap?: NoteRoutingSnapshot | null,
  ): void {
    for (const sub of this.subscribers.values()) {
      if (event.type === 'STREAM_UPDATED' || event.type === 'FEED_UPDATED') {
        if (!sub.isAdmin && event.privacy !== 'public') continue;
        if (
          sub.streams &&
          event.streamSlug &&
          !sub.streams.has(event.streamSlug.toLowerCase())
        ) {
          continue;
        }
        if (
          sub.feeds &&
          event.feedSlug &&
          !sub.feeds.has(event.feedSlug.toLowerCase())
        ) {
          continue;
        }
        sub.subject$.next({
          id: event.id,
          type: 'note',
          data: JSON.stringify(event),
        });
        continue;
      }

      if (event.type === 'NOTE_DELETED') {
        const shouldDeliver = prevSnap
          ? this.matchesSnapshot(sub, prevSnap)
          : !sub.hasCriteria && (sub.isAdmin || event.privacy === 'public');

        if (shouldDeliver) {
          sub.subject$.next({
            id: event.id,
            type: 'note',
            data: JSON.stringify(event),
          });
        }
        continue;
      }

      const matchedAfter = this.matchesSnapshot(sub, nextSnap);
      const matchedBefore = prevSnap ? this.matchesSnapshot(sub, prevSnap) : false;

      if (!matchedBefore && matchedAfter) {
        const outEvent: LiveFeedNoteEvent = {
          ...event,
          type: prevSnap && event.type === 'NOTE_UPDATED' ? 'NOTE_ENTERED' : event.type,
        };
        sub.subject$.next({
          id: outEvent.id,
          type: 'note',
          data: JSON.stringify(outEvent),
        });
      } else if (matchedBefore && matchedAfter) {
        sub.subject$.next({
          id: event.id,
          type: 'note',
          data: JSON.stringify(event),
        });
      } else if (matchedBefore && !matchedAfter) {
        // Safe boundary tombstone: never leaks private fields if note moved to private contour
        const safeLeftEvent: LiveFeedNoteEvent = {
          id: event.id,
          type: 'NOTE_LEFT',
          noteId: event.noteId,
          title: prevSnap?.title || 'Заметка перемещена из выборки',
          previousFeedSlug: prevSnap?.feedSlug || null,
          feedSlug: sub.isAdmin || event.privacy === 'public' ? event.feedSlug : null,
          privacy: sub.isAdmin ? event.privacy : 'public',
          timestamp: event.timestamp,
        };
        sub.subject$.next({
          id: safeLeftEvent.id,
          type: 'note',
          data: JSON.stringify(safeLeftEvent),
        });
      }
    }
  }

  dispatchTopologyPatch(
    publicPatch: SeasonsTopologyPatch,
    adminPatch: SeasonsTopologyPatch,
  ): void {
    for (const sub of this.subscribers.values()) {
      if (!sub.includeTopology) continue;
      const patch = sub.isAdmin ? adminPatch : publicPatch;
      sub.subject$.next({
        id: `topo_${patch.revision}`,
        type: 'topology',
        data: JSON.stringify(patch),
      });
    }
  }

  getStats() {
    let adminSubscribers = 0;
    let publicSubscribers = 0;
    for (const sub of this.subscribers.values()) {
      if (sub.isAdmin) adminSubscribers++;
      else publicSubscribers++;
    }
    return {
      activeSubscribers: this.subscribers.size,
      adminSubscribers,
      publicSubscribers,
      estimatedMemoryBytes: this.subscribers.size * 512,
    };
  }
}
