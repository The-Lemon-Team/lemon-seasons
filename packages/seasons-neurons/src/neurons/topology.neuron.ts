import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  SeasonsTopologyPatch,
  SeasonsTopologySnapshot,
  TopologyDateBucket,
  TopologyFeedNode,
  TopologyStreamNode,
} from '@lenta/shared';
import { SeasonsApiClient } from '../client/seasons-api.client.js';
import { SeasonsSseBus } from '../client/seasons-sse.bus.js';

export interface TopologyNeuronOptions {
  apiClient: SeasonsApiClient;
  sseBus: SeasonsSseBus;
  streamSlug?: string;
  privacy?: 'public' | 'private' | 'all';
  days?: number;
}

/**
 * Reactive Topology Neuron ("Нейрон Каркаса").
 * Maintains exact synchronization with Lemon Seasons server counters:
 * 1. Fetches initial authoritative snapshot from GET /api/v1/topology.
 * 2. Applies server-computed TOPOLOGY_PATCH updates (NEVER performs client-side +1/-1 guesswork).
 * 3. Automatically self-heals by re-fetching GET /api/v1/topology if a revision gap is detected.
 */
export class TopologyNeuron {
  private readonly apiClient: SeasonsApiClient;
  private readonly sseBus: SeasonsSseBus;
  private readonly streamSlug?: string;
  private readonly privacy?: 'public' | 'private' | 'all';
  private readonly days?: number;

  private readonly state$ = new BehaviorSubject<SeasonsTopologySnapshot | null>(null);
  private sub: Subscription | null = null;
  private isRefreshing = false;

  constructor(options: TopologyNeuronOptions) {
    this.apiClient = options.apiClient;
    this.sseBus = options.sseBus;
    this.streamSlug = options.streamSlug;
    this.privacy = options.privacy;
    this.days = options.days;
  }

  async initialize(): Promise<SeasonsTopologySnapshot> {
    const snapshot = await this.refreshSnapshot();
    if (this.sub) {
      this.sub.unsubscribe();
    }
    this.sub = this.sseBus.topologyPatches$.subscribe((patch) => {
      this.applyAuthoritativePatch(patch);
    });
    return snapshot;
  }

  destroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = null;
    }
  }

  async refreshSnapshot(): Promise<SeasonsTopologySnapshot> {
    this.isRefreshing = true;
    try {
      const snapshot = await this.apiClient.getTopology({
        streamSlug: this.streamSlug,
        privacy: this.privacy,
        days: this.days,
      });
      this.state$.next(snapshot);
      return snapshot;
    } finally {
      this.isRefreshing = false;
    }
  }

  getSnapshot(): SeasonsTopologySnapshot | null {
    return this.state$.getValue();
  }

  get snapshot$(): Observable<SeasonsTopologySnapshot | null> {
    return this.state$.asObservable();
  }

  get streams$(): Observable<TopologyStreamNode[]> {
    return this.state$.pipe(map((s) => s?.streams || []));
  }

  get feeds$(): Observable<TopologyFeedNode[]> {
    return this.state$.pipe(map((s) => s?.feeds || []));
  }

  get dateBuckets$(): Observable<TopologyDateBucket[]> {
    return this.state$.pipe(map((s) => s?.facets.dateBuckets || []));
  }

  /**
   * Idempotently applies authoritative server-computed counter values.
   * If a revision gap is detected (patch.previousRevision > current.revision),
   * triggers a full server snapshot sync so counters never drift.
   */
  applyAuthoritativePatch(patch: SeasonsTopologyPatch): void {
    const current = this.state$.getValue();
    if (!current) return;

    // Ignore stale patches
    if (patch.revision <= current.revision) {
      return;
    }

    // Revision gap self-healing: if we missed intermediate revisions while offline, pull fresh truth
    if (
      patch.previousRevision !== undefined &&
      patch.previousRevision > current.revision &&
      !this.isRefreshing
    ) {
      this.refreshSnapshot().catch(() => {});
      return;
    }

    const updatedStreams = current.streams.map((stream) => {
      const sp = patch.streams?.[stream.slug];
      if (!sp) return stream;
      const updatedTabs = stream.tabs.map((tab) => {
        const tp = sp.tabs?.find((t) => t.slug === tab.slug);
        const feedPatch = patch.feeds?.[tab.slug];
        if (tp) return { ...tab, count: tp.count };
        if (feedPatch && tab.type === 'feed') return { ...tab, count: feedPatch.totalNotes };
        return tab;
      });
      return {
        ...stream,
        totalNotes: sp.totalNotes,
        upcomingCount: sp.upcomingCount,
        tabs: updatedTabs,
      };
    });

    const updatedFeeds = current.feeds.map((feed) => {
      const fp = patch.feeds?.[feed.slug];
      if (!fp) return feed;
      return {
        ...feed,
        totalNotes: fp.totalNotes,
        publishedNotes: fp.publishedNotes,
        stagingNotes: fp.stagingNotes,
        byType: fp.byType || feed.byType,
        lastNoteAt: fp.lastNoteAt ?? feed.lastNoteAt,
      };
    });

    const dateBucketMap = new Map<string, number>(
      current.facets.dateBuckets.map((b) => [b.dateKey, b.count]),
    );
    for (const [dateKey, count] of Object.entries(patch.dateBuckets || {})) {
      if (count <= 0) {
        dateBucketMap.delete(dateKey);
      } else {
        dateBucketMap.set(dateKey, count);
      }
    }
    const updatedDateBuckets = Array.from(dateBucketMap.entries())
      .map(([dateKey, count]) => ({ dateKey, count }))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    const authorMap = new Map<string, number>(
      current.facets.authors.map((a) => [a.author, a.count]),
    );
    for (const [author, count] of Object.entries(patch.authors || {})) {
      if (count <= 0) {
        authorMap.delete(author);
      } else {
        authorMap.set(author, count);
      }
    }
    const updatedAuthors = Array.from(authorMap.entries())
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count);

    const hashtagMap = new Map<string, number>(
      current.facets.hashtags.map((h) => [h.name, h.count]),
    );
    for (const [tag, count] of Object.entries(patch.hashtags || {})) {
      if (count <= 0) {
        hashtagMap.delete(tag);
      } else {
        hashtagMap.set(tag, count);
      }
    }
    const updatedHashtags = Array.from(hashtagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    this.state$.next({
      ...current,
      revision: patch.revision,
      syncCursor: {
        ...current.syncCursor,
        revision: patch.revision,
        serverTime: new Date(patch.timestamp).toISOString(),
      },
      totals: patch.totals || current.totals,
      streams: updatedStreams,
      feeds: updatedFeeds,
      facets: {
        ...current.facets,
        dateBuckets: updatedDateBuckets,
        authors: updatedAuthors,
        hashtags: updatedHashtags,
      },
    });
  }
}
