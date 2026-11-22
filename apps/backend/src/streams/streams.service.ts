import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { UpdateStreamTabDto } from './dto/update-stream-tab.dto';
import { DEFAULT_STREAMS_SEED } from './streams.seed';
import {
  collectReachableStreamTree,
  resolveChildStreamRefs,
  StreamFallbackTarget,
  validateNestedStreamGraph,
} from './stream-graph.util';
import { buildFeedSummaryMap, formatEnrichedStream } from './stream-presenter.util';

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function slugifyStream(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .split('')
    .map((char) => CYRILLIC_MAP[char] || char)
    .join('')
    .replace(/[^a-z0-9_\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export interface StreamResolvedCriteria {
  streamId: string;
  slug: string;
  title: string;
  privacy: 'public' | 'private';
  feedIds: string[];
  feedSlugs: string[];
  childStreamIds: string[];
  tags: string[];
  folderPaths: string[];
  fallbackStreams?: StreamFallbackTarget[];
}

const STREAM_TABS_INCLUDE = {
  orderBy: { order: 'asc' as const },
  include: {
    feed: {
      select: {
        id: true,
        title: true,
        slug: true,
        icon: true,
        color: true,
        privacy: true,
        _count: { select: { notes: { where: { deletedAt: null } } } },
      },
    },
    targetStream: {
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        icon: true,
        color: true,
        privacy: true,
        feedIds: true,
        childStreamIds: true,
        tags: true,
        folderPaths: true,
        deletedAt: true,
      },
    },
  },
};

@Injectable()
export class StreamsService implements OnModuleInit {
  private readonly logger = new Logger(StreamsService.name);
  private resolutionCache = new Map<string, StreamResolvedCriteria>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    try {
      await this.seedDefaultStreamsIfEmpty();
      await this.syncStreamTabsIfEmpty();
    } catch (err: any) {
      this.logger.warn(`Failed to seed default streams or tabs: ${err?.message || err}`);
    }
  }

  @OnEvent('feed.created')
  @OnEvent('feed.updated')
  @OnEvent('feed.deleted')
  handleFeedMutation() {
    this.invalidateCache();
  }

  async syncStreamTabsIfEmpty(): Promise<void> {
    const tabCount = await this.prisma.streamTab.count();
    if (tabCount > 0) return;

    this.logger.log('Initializing StreamTab records from existing streams and feed associations...');
    const [streams, feeds] = await Promise.all([
      this.prisma.stream.findMany({ where: { deletedAt: null } }),
      this.prisma.feed.findMany({
        where: { deletedAt: null },
        select: { id: true, slug: true },
      }),
    ]);

    const feedMap = new Map(feeds.map((f) => [f.id, f]));
    const streamMap = new Map(streams.map((s) => [s.id, s]));

    for (const stream of streams) {
      let order = 0;
      for (const feedId of stream.feedIds || []) {
        const feed = feedMap.get(feedId);
        if (!feed) continue;
        await this.prisma.streamTab.upsert({
          where: { streamId_feedId: { streamId: stream.id, feedId: feed.id } },
          create: {
            streamId: stream.id,
            feedId: feed.id,
            type: 'feed',
            targetSlug: feed.slug,
            order: order++,
          },
          update: { order: order - 1 },
        });
      }
      for (const childId of stream.childStreamIds || []) {
        const child = streamMap.get(childId);
        if (!child || child.id === stream.id) continue;
        await this.prisma.streamTab.upsert({
          where: { streamId_targetStreamId: { streamId: stream.id, targetStreamId: child.id } },
          create: {
            streamId: stream.id,
            targetStreamId: child.id,
            type: 'stream',
            targetSlug: child.slug,
            order: order++,
          },
          update: { order: order - 1 },
        });
      }
    }
    this.logger.log('StreamTab records initialized successfully.');
  }

  private async syncStreamTabsForFeedIds(streamId: string, feedIds: string[]): Promise<void> {
    if (!feedIds || feedIds.length === 0) {
      await this.prisma.streamTab.deleteMany({
        where: { streamId, type: 'feed' },
      });
      return;
    }

    const feeds = await this.prisma.feed.findMany({
      where: {
        OR: [{ id: { in: feedIds } }, { slug: { in: feedIds } }],
        deletedAt: null,
      },
      select: { id: true, slug: true },
    });

    const feedMap = new Map<string, { id: string; slug: string }>();
    for (const f of feeds) {
      feedMap.set(f.id, f);
      feedMap.set(f.slug, f);
    }

    const resolvedFeedIds: string[] = [];
    for (const rawId of feedIds) {
      const f = feedMap.get(rawId);
      if (f && !resolvedFeedIds.includes(f.id)) {
        resolvedFeedIds.push(f.id);
        await this.prisma.streamTab.upsert({
          where: { streamId_feedId: { streamId, feedId: f.id } },
          create: {
            streamId,
            feedId: f.id,
            type: 'feed',
            targetSlug: f.slug,
            order: resolvedFeedIds.length - 1,
          },
          update: {
            targetSlug: f.slug,
            order: resolvedFeedIds.length - 1,
            isHidden: false,
          },
        });
      }
    }

    await this.prisma.streamTab.deleteMany({
      where: {
        streamId,
        type: 'feed',
        feedId: { notIn: resolvedFeedIds },
      },
    });
  }

  private async syncStreamTabsForChildStreams(
    streamId: string,
    childStreamIds: string[],
  ): Promise<void> {
    if (!childStreamIds || childStreamIds.length === 0) {
      await this.prisma.streamTab.deleteMany({
        where: { streamId, type: 'stream' },
      });
      return;
    }

    const childStreams = await this.prisma.stream.findMany({
      where: { id: { in: childStreamIds }, deletedAt: null },
      select: { id: true, slug: true },
    });
    const childMap = new Map(childStreams.map((cs) => [cs.id, cs]));

    const existingFeedTabsCount = await this.prisma.streamTab.count({
      where: { streamId, type: 'feed' },
    });

    const resolvedIds: string[] = [];
    for (const cid of childStreamIds) {
      const child = childMap.get(cid);
      if (!child || child.id === streamId || resolvedIds.includes(child.id)) continue;
      resolvedIds.push(child.id);
      const orderIdx = existingFeedTabsCount + resolvedIds.length - 1;
      await this.prisma.streamTab.upsert({
        where: { streamId_targetStreamId: { streamId, targetStreamId: child.id } },
        create: {
          streamId,
          targetStreamId: child.id,
          type: 'stream',
          targetSlug: child.slug,
          order: orderIdx,
        },
        update: {
          targetSlug: child.slug,
          isHidden: false,
        },
      });
    }

    await this.prisma.streamTab.deleteMany({
      where: {
        streamId,
        type: 'stream',
        targetStreamId: { notIn: resolvedIds },
      },
    });
  }

  async seedDefaultStreamsIfEmpty(): Promise<void> {
    const existingStreams = await this.prisma.stream.findMany({ select: { slug: true } });
    const existingSlugs = new Set(existingStreams.map((s) => s.slug));

    const allFeeds = await this.prisma.feed.findMany({
      where: { deletedAt: null },
      select: { id: true, slug: true },
    });
    const feedMap = new Map<string, string>();
    for (const f of allFeeds) {
      feedMap.set(f.slug.toLowerCase(), f.id);
    }

    const shouldSeedAll = existingStreams.length === 0;
    const itemsToSeed = shouldSeedAll
      ? DEFAULT_STREAMS_SEED
      : DEFAULT_STREAMS_SEED.filter((item) => item.isBuiltin && !existingSlugs.has(item.slug));

    if (itemsToSeed.length === 0) return;

    this.logger.log(`Seeding default streams (${itemsToSeed.map((i) => i.slug).join(', ')})...`);

    for (const item of itemsToSeed) {
      const resolvedFeedIds: string[] = [];
      for (const fs of item.feedSlugs) {
        const id = feedMap.get(fs.toLowerCase());
        if (id && !resolvedFeedIds.includes(id)) {
          resolvedFeedIds.push(id);
        }
      }

      await this.prisma.stream.create({
        data: {
          slug: item.slug,
          title: item.title,
          icon: item.icon,
          color: item.color,
          description: item.description,
          privacy: item.privacy,
          order: item.order,
          isBuiltin: item.isBuiltin,
          feedIds: resolvedFeedIds,
          childStreamIds: [],
          tags: item.tags,
          folderPaths: item.folderPaths,
        },
      });
    }
    this.logger.log('Default streams seeded successfully.');
  }

  invalidateCache() {
    this.resolutionCache.clear();
  }

  async findAll(includePrivate = false) {
    const [allStreams, allFeeds] = await Promise.all([
      this.prisma.stream.findMany({
        where: { deletedAt: null },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        include: { tabs: STREAM_TABS_INCLUDE },
      }),
      this.prisma.feed.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          title: true,
          slug: true,
          icon: true,
          color: true,
          privacy: true,
          _count: { select: { notes: { where: { deletedAt: null } } } },
        },
      }),
    ]);

    const feedMap = buildFeedSummaryMap(allFeeds);
    const streamById = new Map(allStreams.map((s) => [s.id, s]));
    const visibleStreams = includePrivate
      ? allStreams
      : allStreams.filter((s) => s.privacy === 'public');

    return visibleStreams.map((stream) =>
      formatEnrichedStream({
        stream,
        allStreams,
        streamById,
        feedMap,
        includePrivate,
      }),
    );
  }

  async findOne(idOrSlug: string, includePrivate = false) {
    const [allStreams, allFeeds] = await Promise.all([
      this.prisma.stream.findMany({
        where: { deletedAt: null },
        include: { tabs: STREAM_TABS_INCLUDE },
      }),
      this.prisma.feed.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          title: true,
          slug: true,
          icon: true,
          color: true,
          privacy: true,
          _count: { select: { notes: { where: { deletedAt: null } } } },
        },
      }),
    ]);

    const normalized = idOrSlug.toLowerCase().replace(/[\s-]+/g, '_');
    const stream = allStreams.find(
      (s) => s.id === idOrSlug || s.slug === idOrSlug || s.slug === normalized,
    );
    if (!stream) {
      throw new NotFoundException(`Stream '${idOrSlug}' not found`);
    }
    if (!includePrivate && stream.privacy === 'private') {
      throw new NotFoundException(`Stream '${idOrSlug}' not found`);
    }

    return formatEnrichedStream({
      stream,
      allStreams,
      streamById: new Map(allStreams.map((s) => [s.id, s])),
      feedMap: buildFeedSummaryMap(allFeeds),
      includePrivate,
    });
  }

  async create(dto: CreateStreamDto) {
    const slug =
      (dto.slug ? slugifyStream(dto.slug) : slugifyStream(dto.title)) || `stream_${Date.now()}`;

    const allStreams = await this.prisma.stream.findMany({
      where: { deletedAt: null },
      select: { id: true, slug: true, title: true, privacy: true, childStreamIds: true },
    });

    if (allStreams.some((s) => s.slug === slug)) {
      throw new ConflictException(`Stream with slug '${slug}' already exists`);
    }

    const privacy: 'public' | 'private' = dto.privacy === 'private' ? 'private' : 'public';
    const resolvedChildStreamIds = resolveChildStreamRefs(dto.childStreamIds, allStreams);

    validateNestedStreamGraph({
      parentPrivacy: privacy,
      childIds: resolvedChildStreamIds,
      allStreams,
    });

    const stream = await this.prisma.stream.create({
      data: {
        slug,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        icon: dto.icon || '📁',
        color: dto.color || '#2481cc',
        badge: dto.badge?.trim() || null,
        privacy,
        order: dto.order ?? 0,
        isBuiltin: dto.isBuiltin ?? false,
        feedIds: dto.feedIds || [],
        childStreamIds: resolvedChildStreamIds,
        tags: (dto.tags || []).map((t) => t.toLowerCase().replace(/^#/, '').trim()),
        folderPaths: (dto.folderPaths || []).map((f) => f.toLowerCase().trim()),
      },
    });

    if (dto.feedIds && dto.feedIds.length > 0) {
      await this.syncStreamTabsForFeedIds(stream.id, dto.feedIds);
    }
    if (resolvedChildStreamIds.length > 0) {
      await this.syncStreamTabsForChildStreams(stream.id, resolvedChildStreamIds);
    }

    this.invalidateCache();
    this.eventEmitter.emit('stream.created', stream);
    return this.findOne(stream.id, true);
  }

  async update(id: string, dto: UpdateStreamDto) {
    const allStreams = await this.prisma.stream.findMany({
      where: { deletedAt: null },
      select: { id: true, slug: true, title: true, privacy: true, childStreamIds: true },
    });
    const stream = allStreams.find((s) => s.id === id);
    if (!stream) {
      throw new NotFoundException(`Stream #${id} not found`);
    }

    if (dto.slug && dto.slug !== stream.slug) {
      const conflict = allStreams.find((s) => s.slug === dto.slug && s.id !== id);
      if (conflict) {
        throw new ConflictException(`Stream slug '${dto.slug}' already taken`);
      }
    }

    const nextPrivacy = dto.privacy
      ? dto.privacy === 'private'
        ? 'private'
        : 'public'
      : stream.privacy;
    const nextChildStreamIds =
      dto.childStreamIds !== undefined
        ? resolveChildStreamRefs(dto.childStreamIds, allStreams)
        : stream.childStreamIds || [];

    validateNestedStreamGraph({
      parentId: id,
      parentPrivacy: nextPrivacy,
      childIds: nextChildStreamIds,
      allStreams,
    });

    const updated = await this.prisma.stream.update({
      where: { id },
      data: {
        slug: dto.slug?.trim() || undefined,
        title: dto.title?.trim() || undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        icon: dto.icon || undefined,
        color: dto.color || undefined,
        badge: dto.badge !== undefined ? dto.badge?.trim() || null : undefined,
        privacy: dto.privacy ? nextPrivacy : undefined,
        order: dto.order ?? undefined,
        isBuiltin: dto.isBuiltin ?? undefined,
        feedIds: dto.feedIds ?? undefined,
        childStreamIds: dto.childStreamIds !== undefined ? nextChildStreamIds : undefined,
        tags: dto.tags ? dto.tags.map((t) => t.toLowerCase().replace(/^#/, '').trim()) : undefined,
        folderPaths: dto.folderPaths
          ? dto.folderPaths.map((f) => f.toLowerCase().trim())
          : undefined,
      },
    });

    if (dto.feedIds !== undefined) {
      await this.syncStreamTabsForFeedIds(id, dto.feedIds);
    }
    if (dto.childStreamIds !== undefined) {
      await this.syncStreamTabsForChildStreams(id, nextChildStreamIds);
    }

    this.invalidateCache();
    this.eventEmitter.emit('stream.updated', updated);
    return this.findOne(id, true);
  }

  async reorder(items: Array<{ id: string; order: number }>) {
    if (!items || items.length === 0) return { success: true };

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.stream.updateMany({
          where: {
            OR: [{ id: item.id }, { slug: item.id }],
            deletedAt: null,
          },
          data: { order: item.order },
        }),
      ),
    );

    this.invalidateCache();
    this.eventEmitter.emit('stream.reordered', items);
    return { success: true };
  }

  async attachFeed(streamId: string, feedId: string) {
    const stream = await this.prisma.stream.findFirst({
      where: {
        OR: [{ id: streamId }, { slug: streamId }],
        deletedAt: null,
      },
    });
    if (!stream) throw new NotFoundException('Stream not found');

    const feed = await this.prisma.feed.findFirst({
      where: {
        OR: [{ id: feedId }, { slug: feedId }],
        deletedAt: null,
      },
    });
    if (!feed) throw new NotFoundException('Feed not found');

    const currentTabsCount = await this.prisma.streamTab.count({ where: { streamId: stream.id } });

    await this.prisma.streamTab.upsert({
      where: { streamId_feedId: { streamId: stream.id, feedId: feed.id } },
      create: {
        streamId: stream.id,
        feedId: feed.id,
        type: 'feed',
        targetSlug: feed.slug,
        order: currentTabsCount,
      },
      update: { isHidden: false, targetSlug: feed.slug },
    });

    if (!stream.feedIds.includes(feed.id)) {
      const updated = await this.prisma.stream.update({
        where: { id: stream.id },
        data: { feedIds: [...stream.feedIds, feed.id] },
      });
      this.invalidateCache();
      this.eventEmitter.emit('stream.updated', updated);
      return updated;
    }
    return stream;
  }

  async detachFeed(streamId: string, feedId: string) {
    const stream = await this.prisma.stream.findFirst({
      where: {
        OR: [{ id: streamId }, { slug: streamId }],
        deletedAt: null,
      },
    });
    if (!stream) throw new NotFoundException('Stream not found');

    const feed = await this.prisma.feed.findFirst({
      where: {
        OR: [{ id: feedId }, { slug: feedId }],
        deletedAt: null,
      },
    });
    if (!feed) throw new NotFoundException('Feed not found');

    await this.prisma.streamTab.deleteMany({ where: { streamId: stream.id, feedId: feed.id } });

    const updated = await this.prisma.stream.update({
      where: { id: stream.id },
      data: { feedIds: stream.feedIds.filter((id) => id !== feed.id) },
    });
    this.invalidateCache();
    this.eventEmitter.emit('stream.updated', updated);
    return updated;
  }

  async attachChildStream(streamIdOrSlug: string, childIdOrSlug: string) {
    const allStreams = await this.prisma.stream.findMany({
      where: { deletedAt: null },
      select: { id: true, slug: true, title: true, privacy: true, childStreamIds: true },
    });

    const stream = allStreams.find((s) => s.id === streamIdOrSlug || s.slug === streamIdOrSlug);
    if (!stream) throw new NotFoundException('Parent stream not found');

    const child = allStreams.find((s) => s.id === childIdOrSlug || s.slug === childIdOrSlug);
    if (!child) throw new NotFoundException('Child stream not found');

    const nextChildIds = Array.from(new Set([...(stream.childStreamIds || []), child.id]));
    validateNestedStreamGraph({
      parentId: stream.id,
      parentPrivacy: stream.privacy,
      childIds: nextChildIds,
      allStreams,
    });

    const currentTabsCount = await this.prisma.streamTab.count({ where: { streamId: stream.id } });
    await this.prisma.streamTab.upsert({
      where: { streamId_targetStreamId: { streamId: stream.id, targetStreamId: child.id } },
      create: {
        streamId: stream.id,
        targetStreamId: child.id,
        type: 'stream',
        targetSlug: child.slug,
        order: currentTabsCount,
      },
      update: { targetSlug: child.slug, isHidden: false },
    });

    const updated = await this.prisma.stream.update({
      where: { id: stream.id },
      data: { childStreamIds: nextChildIds },
    });
    this.invalidateCache();
    this.eventEmitter.emit('stream.updated', updated);
    return this.findOne(stream.id, true);
  }

  async detachChildStream(streamIdOrSlug: string, childIdOrSlug: string) {
    const allStreams = await this.prisma.stream.findMany({
      where: { deletedAt: null },
      select: { id: true, slug: true, childStreamIds: true },
    });

    const stream = allStreams.find((s) => s.id === streamIdOrSlug || s.slug === streamIdOrSlug);
    if (!stream) throw new NotFoundException('Parent stream not found');

    const child = allStreams.find((s) => s.id === childIdOrSlug || s.slug === childIdOrSlug);
    const targetId = child?.id || childIdOrSlug;

    await this.prisma.streamTab.deleteMany({
      where: { streamId: stream.id, targetStreamId: targetId },
    });

    const updated = await this.prisma.stream.update({
      where: { id: stream.id },
      data: {
        childStreamIds: (stream.childStreamIds || []).filter((id) => id !== targetId),
      },
    });
    this.invalidateCache();
    this.eventEmitter.emit('stream.updated', updated);
    return this.findOne(stream.id, true);
  }

  async reorderTabs(streamIdOrSlug: string, items: Array<{ tabId: string; order: number }>) {
    const stream = await this.prisma.stream.findFirst({
      where: {
        OR: [{ id: streamIdOrSlug }, { slug: streamIdOrSlug }],
        deletedAt: null,
      },
    });

    if (!stream) {
      throw new NotFoundException(`Stream '${streamIdOrSlug}' not found`);
    }

    if (!items || items.length === 0) return { success: true };

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.streamTab.updateMany({
          where: {
            streamId: stream.id,
            OR: [
              { id: item.tabId },
              { feedId: item.tabId },
              { targetStreamId: item.tabId },
              { targetSlug: item.tabId },
            ],
          },
          data: { order: item.order },
        }),
      ),
    );

    const updatedTabs = await this.prisma.streamTab.findMany({
      where: { streamId: stream.id },
      orderBy: { order: 'asc' },
    });

    const updateData: { feedIds?: string[]; childStreamIds?: string[] } = {};
    if (stream.feedIds && stream.feedIds.length > 0) {
      const reorderedFeedIds = updatedTabs
        .map((t) => t.feedId)
        .filter((id): id is string => Boolean(id));
      if (reorderedFeedIds.length > 0) {
        const remaining = stream.feedIds.filter((id) => !reorderedFeedIds.includes(id));
        updateData.feedIds = [...reorderedFeedIds, ...remaining];
      }
    }
    if (stream.childStreamIds && stream.childStreamIds.length > 0) {
      const reorderedChildIds = updatedTabs
        .map((t) => t.targetStreamId)
        .filter((id): id is string => Boolean(id));
      if (reorderedChildIds.length > 0) {
        const remaining = stream.childStreamIds.filter((id) => !reorderedChildIds.includes(id));
        updateData.childStreamIds = [...reorderedChildIds, ...remaining];
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.stream.update({
        where: { id: stream.id },
        data: updateData,
      });
    }

    this.invalidateCache();
    this.eventEmitter.emit('stream.tabs.reordered', { streamId: stream.id, items });
    return { success: true };
  }

  async updateTab(tabId: string, dto: UpdateStreamTabDto) {
    const tab = await this.prisma.streamTab.findUnique({ where: { id: tabId } });
    if (!tab) {
      throw new NotFoundException(`Stream tab #${tabId} not found`);
    }

    const updated = await this.prisma.streamTab.update({
      where: { id: tabId },
      data: {
        customTitle: dto.customTitle !== undefined ? dto.customTitle?.trim() || null : undefined,
        customIcon: dto.customIcon !== undefined ? dto.customIcon?.trim() || null : undefined,
        badge: dto.badge !== undefined ? dto.badge?.trim() || null : undefined,
        order: dto.order ?? undefined,
        isHidden: dto.isHidden ?? undefined,
      },
    });

    this.invalidateCache();
    this.eventEmitter.emit('stream.tab.updated', updated);
    return updated;
  }

  async remove(id: string) {
    const stream = await this.prisma.stream.findUnique({ where: { id } });
    if (!stream || stream.deletedAt) throw new NotFoundException('Stream not found');

    const deleted = await this.prisma.stream.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Clean up stale references in parent streams' childStreamIds arrays
    const referencingParents = await this.prisma.stream.findMany({
      where: { deletedAt: null, childStreamIds: { has: id } },
      select: { id: true, childStreamIds: true },
    });
    for (const parent of referencingParents) {
      await this.prisma.stream.update({
        where: { id: parent.id },
        data: {
          childStreamIds: (parent.childStreamIds || []).filter((cid) => cid !== id),
        },
      });
    }

    this.invalidateCache();
    this.eventEmitter.emit('stream.deleted', { streamId: id, slug: stream.slug });
    return deleted;
  }

  /**
   * Recursively resolves criteria (feedIds, feedSlugs, tags, folderPaths, fallbackStreams)
   * across the stream and all nested child streams with cycle & privacy guards.
   */
  async resolveCriteriaForStream(streamSlug: string): Promise<StreamResolvedCriteria | null> {
    const norm = streamSlug.toLowerCase().trim().replace(/-/g, '_');
    if (this.resolutionCache.has(norm)) {
      return this.resolutionCache.get(norm)!;
    }

    const hyphenSlug = streamSlug.replace(/_/g, '-');
    const allStreams = await this.prisma.stream.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        slug: true,
        title: true,
        privacy: true,
        feedIds: true,
        childStreamIds: true,
        tags: true,
        folderPaths: true,
      },
    });

    const stream = allStreams.find(
      (s) => s.slug === streamSlug || s.slug === norm || s.slug === hyphenSlug,
    );
    if (!stream) return null;

    const tree = collectReachableStreamTree({
      rootStream: stream,
      allStreams,
      includePrivate: stream.privacy === 'private',
    });

    const feeds =
      tree.feedIds.length > 0
        ? await this.prisma.feed.findMany({
            where: { id: { in: tree.feedIds }, deletedAt: null },
            select: { id: true, slug: true },
          })
        : [];

    const criteria: StreamResolvedCriteria = {
      streamId: stream.id,
      slug: stream.slug,
      title: stream.title,
      privacy: stream.privacy === 'private' ? 'private' : 'public',
      feedIds: feeds.map((f) => f.id),
      feedSlugs: feeds.map((f) => f.slug.toLowerCase()),
      childStreamIds: stream.childStreamIds || [],
      tags: tree.tags,
      folderPaths: tree.folderPaths,
      fallbackStreams: tree.fallbackStreams.length > 0 ? tree.fallbackStreams : undefined,
    };

    this.resolutionCache.set(norm, criteria);
    this.resolutionCache.set(stream.slug, criteria);
    return criteria;
  }
}
