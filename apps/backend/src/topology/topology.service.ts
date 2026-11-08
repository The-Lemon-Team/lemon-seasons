import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { SeasonsTopologySnapshot } from '@lenta/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildTopologySnapshot,
  diffTopologySnapshots,
  RawTopologyNoteRow,
} from './topology-aggregator.util';

@Injectable()
export class TopologyService implements OnModuleDestroy {
  private readonly logger = new Logger(TopologyService.name);
  private revision = 1;
  private lastEventId: string | null = null;

  private cachedPublic: SeasonsTopologySnapshot | null = null;
  private cachedAdmin: SeasonsTopologySnapshot | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  onModuleDestroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  @OnEvent('note.published')
  @OnEvent('note.deleted')
  @OnEvent('feed.created')
  @OnEvent('feed.updated')
  @OnEvent('feed.deleted')
  @OnEvent('stream.created')
  @OnEvent('stream.updated')
  @OnEvent('stream.deleted')
  @OnEvent('stream.reordered')
  @OnEvent('stream.tabs.reordered')
  @OnEvent('stream.tab.updated')
  handleDomainMutation() {
    this.scheduleRecompute();
  }

  setLastEventId(eventId: string) {
    this.lastEventId = eventId;
  }

  getCurrentRevision(): number {
    return this.revision;
  }

  async getTopology(options?: {
    isAdmin?: boolean;
    streamSlug?: string;
    privacy?: string;
    days?: number;
  }): Promise<SeasonsTopologySnapshot> {
    const isAdmin = Boolean(options?.isAdmin && options?.privacy !== 'public');
    const contour: 'public' | 'admin' = isAdmin ? 'admin' : 'public';

    let base = contour === 'admin' ? this.cachedAdmin : this.cachedPublic;
    if (!base) {
      await this.recomputeBothContours(options?.days);
      base = (contour === 'admin' ? this.cachedAdmin : this.cachedPublic)!;
    }

    if (options?.streamSlug) {
      const norm = options.streamSlug.toLowerCase().trim();
      const filteredStreams = base.streams.filter(
        (s) => s.slug.toLowerCase() === norm || s.id === options.streamSlug,
      );
      const streamFeedSlugs = new Set(
        filteredStreams.flatMap((s) => s.tabs.map((t) => t.slug.toLowerCase())),
      );
      const filteredFeeds =
        streamFeedSlugs.size > 0
          ? base.feeds.filter((f) => streamFeedSlugs.has(f.slug.toLowerCase()))
          : base.feeds;

      return {
        ...base,
        streams: filteredStreams,
        feeds: filteredFeeds,
      };
    }

    return base;
  }

  async getStreamTopology(
    streamIdOrSlug: string,
    isAdmin = false,
    days = 90,
  ) {
    const snapshot = await this.getTopology({ isAdmin, days });
    const norm = streamIdOrSlug.toLowerCase().trim();
    const stream = snapshot.streams.find(
      (s) => s.slug.toLowerCase() === norm || s.id === streamIdOrSlug,
    );

    if (!stream) {
      throw new NotFoundException(`Stream '${streamIdOrSlug}' not found in topology`);
    }
    if (!isAdmin && stream.privacy !== 'public') {
      throw new ForbiddenException('Access to private stream topology is forbidden');
    }

    const tabFeedSlugs = new Set(stream.tabs.map((t) => t.slug));
    const feeds = snapshot.feeds.filter((f) => tabFeedSlugs.has(f.slug));

    return {
      revision: snapshot.revision,
      contour: snapshot.contour,
      stream,
      feeds,
      dateBuckets: snapshot.facets.dateBuckets,
      authors: snapshot.facets.authors,
      hashtags: snapshot.facets.hashtags,
    };
  }

  async getFeedTopology(
    feedIdOrSlug: string,
    isAdmin = false,
    days = 90,
  ) {
    const snapshot = await this.getTopology({ isAdmin, days });
    const norm = feedIdOrSlug.toLowerCase().trim();
    const feed = snapshot.feeds.find(
      (f) => f.slug.toLowerCase() === norm || f.id === feedIdOrSlug,
    );

    if (!feed) {
      throw new NotFoundException(`Feed '${feedIdOrSlug}' not found in topology`);
    }
    if (!isAdmin && feed.privacy !== 'public') {
      throw new ForbiddenException('Access to private feed topology is forbidden');
    }

    // Compute feed-specific dateBuckets, authors & hashtags directly for precision
    const notesWhere: any = {
      deletedAt: null,
      OR: [{ feedId: feed.id }, { publicFeedId: feed.id }],
      ...(isAdmin ? {} : { privacy: 'public', status: 'PUBLISHED' }),
    };

    const feedNotes = await this.prisma.note.findMany({
      where: notesWhere,
      select: {
        startDate: true,
        author: true,
        hashtags: { where: { deletedAt: null }, select: { name: true } },
      },
    });

    const dateMap = new Map<string, number>();
    const authorMap = new Map<string, number>();
    const tagMap = new Map<string, number>();

    for (const n of feedNotes) {
      if (n.startDate) {
        const dk = new Date(n.startDate).toISOString().slice(0, 10);
        dateMap.set(dk, (dateMap.get(dk) || 0) + 1);
      }
      if (n.author?.trim()) {
        authorMap.set(n.author.trim(), (authorMap.get(n.author.trim()) || 0) + 1);
      }
      for (const h of n.hashtags || []) {
        if (h?.name) {
          const tn = h.name.toLowerCase();
          tagMap.set(tn, (tagMap.get(tn) || 0) + 1);
        }
      }
    }

    return {
      revision: snapshot.revision,
      contour: snapshot.contour,
      feed,
      dateBuckets: Array.from(dateMap.entries())
        .map(([dateKey, count]) => ({ dateKey, count }))
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
      authors: Array.from(authorMap.entries())
        .map(([author, count]) => ({ author, count }))
        .sort((a, b) => b.count - a.count),
      hashtags: Array.from(tagMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Coalesces rapid mutations over a 150ms window so batch imports or catch-up waves
   * trigger a single authoritative recomputation + single TOPOLOGY_PATCH broadcast.
   */
  private scheduleRecompute() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.recomputeAndBroadcast().catch((err) => {
        this.logger.warn(`Failed to recompute topology patch: ${err?.message}`);
      });
    }, 150);
  }

  async recomputeAndBroadcast(): Promise<void> {
    const prevPublic = this.cachedPublic;
    const prevAdmin = this.cachedAdmin;
    this.revision += 1;

    await this.recomputeBothContours();

    if (this.eventEmitter && this.cachedPublic && this.cachedAdmin) {
      const publicPatch = diffTopologySnapshots(prevPublic, this.cachedPublic);
      const adminPatch = diffTopologySnapshots(prevAdmin, this.cachedAdmin);

      this.eventEmitter.emit('topology.patched', {
        publicPatch,
        adminPatch,
      });
    }
  }

  private async recomputeBothContours(daysWindow = 90): Promise<void> {
    const [allStreams, allFeeds, allNotesRaw] = await Promise.all([
      this.prisma.stream.findMany({
        where: { deletedAt: null },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        include: {
          tabs: {
            orderBy: { order: 'asc' },
          },
        },
      }),
      this.prisma.feed.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.note.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          privacy: true,
          feedId: true,
          publicFeedId: true,
          folderPath: true,
          author: true,
          sourceType: true,
          startDate: true,
          endDate: true,
          icon: true,
          metadata: true,
          hashtags: {
            where: { deletedAt: null },
            select: { name: true },
          },
        },
      }),
    ]);

    const adminNotes = allNotesRaw as unknown as RawTopologyNoteRow[];
    const publicFeeds = allFeeds.filter((f) => f.privacy === 'public');
    const publicStreams = allStreams.filter((s) => s.privacy === 'public');
    const publicNotes = adminNotes.filter(
      (n) => n.privacy === 'public' && n.status === 'PUBLISHED',
    );

    this.cachedAdmin = buildTopologySnapshot({
      revision: this.revision,
      contour: 'admin',
      lastEventId: this.lastEventId,
      streams: allStreams,
      feeds: allFeeds,
      notes: adminNotes,
      daysWindow,
    });

    this.cachedPublic = buildTopologySnapshot({
      revision: this.revision,
      contour: 'public',
      lastEventId: this.lastEventId,
      streams: publicStreams,
      feeds: publicFeeds,
      notes: publicNotes,
      daysWindow,
    });
  }
}
