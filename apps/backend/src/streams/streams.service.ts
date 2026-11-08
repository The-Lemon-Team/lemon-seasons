import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { UpdateStreamTabDto } from './dto/update-stream-tab.dto';
import { DEFAULT_STREAMS_SEED, DefaultStreamSeedConfig } from './streams.seed';

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
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
  tags: string[];
  folderPaths: string[];
}

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

  /**
   * Initializes StreamTab records from existing streams and their feedIds if StreamTab is empty
   */
  async syncStreamTabsIfEmpty(): Promise<void> {
    const tabCount = await this.prisma.streamTab.count();
    if (tabCount > 0) return;

    this.logger.log('Initializing StreamTab records from existing streams and feed associations...');
    const streams = await this.prisma.stream.findMany({
      where: { deletedAt: null },
    });

    const feeds = await this.prisma.feed.findMany({
      where: { deletedAt: null },
      select: { id: true, slug: true, title: true, icon: true },
    });
    const feedMap = new Map<string, (typeof feeds)[0]>();
    for (const f of feeds) feedMap.set(f.id, f);

    for (const stream of streams) {
      if (stream.feedIds && stream.feedIds.length > 0) {
        for (let i = 0; i < stream.feedIds.length; i++) {
          const feedId = stream.feedIds[i];
          const feed = feedMap.get(feedId);
          if (feed) {
            await this.prisma.streamTab.upsert({
              where: {
                streamId_feedId: {
                  streamId: stream.id,
                  feedId: feed.id,
                },
              },
              create: {
                streamId: stream.id,
                feedId: feed.id,
                type: 'feed',
                targetSlug: feed.slug,
                order: i,
              },
              update: {
                order: i,
              },
            });
          }
        }
      }
    }
    this.logger.log('StreamTab records initialized successfully.');
  }

  /**
   * Synchronizes StreamTab records for a stream to match the given feedIds list.
   * Preserves customTitle, customIcon, badge, and isHidden on existing tabs while updating order,
   * creating missing tabs, and removing tabs whose feeds are no longer in feedIds.
   */
  private async syncStreamTabsForFeedIds(streamId: string, feedIds: string[]): Promise<void> {
    if (!feedIds || feedIds.length === 0) {
      await this.prisma.streamTab.deleteMany({
        where: { streamId },
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
    for (let i = 0; i < feedIds.length; i++) {
      const f = feedMap.get(feedIds[i]);
      if (f && !resolvedFeedIds.includes(f.id)) {
        resolvedFeedIds.push(f.id);
        await this.prisma.streamTab.upsert({
          where: {
            streamId_feedId: {
              streamId,
              feedId: f.id,
            },
          },
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
        feedId: { notIn: resolvedFeedIds },
      },
    });
  }

  /**
   * Seeds default streams if the Stream table is empty.
   * Matches feed slugs with existing feeds to resolve their UUIDs.
   */
  async seedDefaultStreamsIfEmpty(): Promise<void> {
    const existingStreams = await this.prisma.stream.findMany({
      select: { slug: true },
    });
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

    this.logger.log(
      `Seeding default streams (${itemsToSeed.map((i) => i.slug).join(', ')})...`
    );

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
    const where: any = { deletedAt: null };
    if (!includePrivate) {
      where.privacy = 'public';
    }

    const [streams, allFeeds] = await Promise.all([
      this.prisma.stream.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        include: {
          tabs: {
            orderBy: { order: 'asc' },
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
            },
          },
        },
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

    const feedMap = new Map<string, any>();
    for (const f of allFeeds) {
      feedMap.set(f.id, f);
    }

    return streams.map((s) => {
      let feeds: any[] = [];
      if (s.tabs && s.tabs.length > 0) {
        feeds = s.tabs
          .filter((t) => !t.isHidden && t.feed)
          .map((t) => ({
            ...t.feed,
            customTitle: t.customTitle || undefined,
            customIcon: t.customIcon || undefined,
            badge: t.badge || undefined,
            tabId: t.id,
            tabOrder: t.order,
          }));
      } else {
        feeds = (s.feedIds || []).map((id) => feedMap.get(id)).filter(Boolean);
      }

      const totalNotes = feeds.reduce((sum, f) => sum + (f._count?.notes || 0), 0);
      return {
        ...s,
        feeds,
        _count: {
          feeds: feeds.length,
          notes: totalNotes,
        },
      };
    });
  }

  async findOne(idOrSlug: string, includePrivate = false) {
    const stream = await this.prisma.stream.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        deletedAt: null,
      },
      include: {
        tabs: {
          orderBy: { order: 'asc' },
          include: {
            feed: {
              include: { _count: { select: { notes: true } } },
            },
          },
        },
      },
    });

    if (!stream) {
      throw new NotFoundException(`Stream '${idOrSlug}' not found`);
    }

    if (!includePrivate && stream.privacy === 'private') {
      throw new NotFoundException(`Stream '${idOrSlug}' not found`);
    }

    let feeds: any[] = [];
    if (stream.tabs && stream.tabs.length > 0) {
      feeds = stream.tabs
        .filter((t) => !t.isHidden && t.feed)
        .map((t) => ({
          ...t.feed,
          customTitle: t.customTitle || undefined,
          customIcon: t.customIcon || undefined,
          badge: t.badge || undefined,
          tabId: t.id,
          tabOrder: t.order,
        }));
    } else {
      feeds = await this.prisma.feed.findMany({
        where: { id: { in: stream.feedIds }, deletedAt: null },
        include: { _count: { select: { notes: true } } },
      });
    }

    return {
      ...stream,
      feeds,
      _count: {
        feeds: feeds.length,
        notes: feeds.reduce((sum, f) => sum + (f._count?.notes || 0), 0),
      },
    };
  }

  async create(dto: CreateStreamDto) {
    const slug = (dto.slug ? slugifyStream(dto.slug) : slugifyStream(dto.title)) || `stream_${Date.now()}`;

    const existing = await this.prisma.stream.findFirst({
      where: { slug, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Stream with slug '${slug}' already exists`);
    }

    const stream = await this.prisma.stream.create({
      data: {
        slug,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        icon: dto.icon || '📁',
        color: dto.color || '#2481cc',
        badge: dto.badge?.trim() || null,
        privacy: dto.privacy === 'private' ? 'private' : 'public',
        order: dto.order ?? 0,
        isBuiltin: dto.isBuiltin ?? false,
        feedIds: dto.feedIds || [],
        tags: (dto.tags || []).map((t) => t.toLowerCase().replace(/^#/, '').trim()),
        folderPaths: (dto.folderPaths || []).map((f) => f.toLowerCase().trim()),
      },
    });

    if (dto.feedIds && dto.feedIds.length > 0) {
      await this.syncStreamTabsForFeedIds(stream.id, dto.feedIds);
    }

    this.invalidateCache();
    this.eventEmitter.emit('stream.created', stream);
    return this.findOne(stream.id, true);
  }

  async update(id: string, dto: UpdateStreamDto) {
    const stream = await this.prisma.stream.findUnique({
      where: { id },
    });
    if (!stream || stream.deletedAt) {
      throw new NotFoundException(`Stream #${id} not found`);
    }

    if (dto.slug && dto.slug !== stream.slug) {
      const conflict = await this.prisma.stream.findFirst({
        where: { slug: dto.slug, deletedAt: null, id: { not: id } },
      });
      if (conflict) {
        throw new ConflictException(`Stream slug '${dto.slug}' already taken`);
      }
    }

    const updated = await this.prisma.stream.update({
      where: { id },
      data: {
        slug: dto.slug?.trim() || undefined,
        title: dto.title?.trim() || undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        icon: dto.icon || undefined,
        color: dto.color || undefined,
        badge: dto.badge !== undefined ? dto.badge?.trim() || null : undefined,
        privacy: dto.privacy ? (dto.privacy === 'private' ? 'private' : 'public') : undefined,
        order: dto.order ?? undefined,
        isBuiltin: dto.isBuiltin ?? undefined,
        feedIds: dto.feedIds ?? undefined,
        tags: dto.tags ? dto.tags.map((t) => t.toLowerCase().replace(/^#/, '').trim()) : undefined,
        folderPaths: dto.folderPaths ? dto.folderPaths.map((f) => f.toLowerCase().trim()) : undefined,
      },
    });

    if (dto.feedIds !== undefined) {
      await this.syncStreamTabsForFeedIds(id, dto.feedIds);
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
        })
      )
    );

    this.invalidateCache();
    this.eventEmitter.emit('stream.reordered', items);
    return { success: true };
  }

  async attachFeed(streamId: string, feedId: string) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream || stream.deletedAt) throw new NotFoundException('Stream not found');

    const feed = await this.prisma.feed.findUnique({ where: { id: feedId } });
    if (!feed || feed.deletedAt) throw new NotFoundException('Feed not found');

    const currentTabsCount = await this.prisma.streamTab.count({
      where: { streamId },
    });

    await this.prisma.streamTab.upsert({
      where: {
        streamId_feedId: { streamId, feedId },
      },
      create: {
        streamId,
        feedId,
        type: 'feed',
        targetSlug: feed.slug,
        order: currentTabsCount,
      },
      update: {
        isHidden: false,
      },
    });

    if (!stream.feedIds.includes(feedId)) {
      const updated = await this.prisma.stream.update({
        where: { id: streamId },
        data: { feedIds: [...stream.feedIds, feedId] },
      });
      this.invalidateCache();
      this.eventEmitter.emit('stream.updated', updated);
      return updated;
    }
    return stream;
  }

  async detachFeed(streamId: string, feedId: string) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream || stream.deletedAt) throw new NotFoundException('Stream not found');

    await this.prisma.streamTab.deleteMany({
      where: { streamId, feedId },
    });

    const updated = await this.prisma.stream.update({
      where: { id: streamId },
      data: { feedIds: stream.feedIds.filter((id) => id !== feedId) },
    });
    this.invalidateCache();
    this.eventEmitter.emit('stream.updated', updated);
    return updated;
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
              { targetSlug: item.tabId },
            ],
          },
          data: { order: item.order },
        })
      )
    );

    // Re-sync stream.feedIds to preserve deterministic ordering in DB (only if stream had explicit feedIds)
    if (stream.feedIds && stream.feedIds.length > 0) {
      const updatedTabs = await this.prisma.streamTab.findMany({
        where: { streamId: stream.id },
        orderBy: { order: 'asc' },
      });
      const reorderedFeedIds = updatedTabs
        .map((t) => t.feedId)
        .filter((id): id is string => Boolean(id));

      if (reorderedFeedIds.length > 0) {
        const remainingIds = stream.feedIds.filter((id) => !reorderedFeedIds.includes(id));
        await this.prisma.stream.update({
          where: { id: stream.id },
          data: { feedIds: [...reorderedFeedIds, ...remainingIds] },
        });
      }
    }

    this.invalidateCache();
    this.eventEmitter.emit('stream.tabs.reordered', { streamId: stream.id, items });
    return { success: true };
  }

  async updateTab(tabId: string, dto: UpdateStreamTabDto) {
    const tab = await this.prisma.streamTab.findUnique({
      where: { id: tabId },
    });
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
    this.invalidateCache();
    this.eventEmitter.emit('stream.deleted', { streamId: id, slug: stream.slug });
    return deleted;
  }

  /**
   * Fast resolution of criteria (feedIds, feedSlugs, tags, folderPaths) for query builder.
   */
  async resolveCriteriaForStream(streamSlug: string): Promise<StreamResolvedCriteria | null> {
    const norm = streamSlug.toLowerCase().trim().replace(/-/g, '_');
    if (this.resolutionCache.has(norm)) {
      return this.resolutionCache.get(norm)!;
    }

    const stream = await this.prisma.stream.findFirst({
      where: {
        OR: [{ slug: streamSlug }, { slug: norm }, { slug: streamSlug.replace(/_/g, '-') }],
        deletedAt: null,
      },
    });

    if (!stream) return null;

    const feeds = await this.prisma.feed.findMany({
      where: { id: { in: stream.feedIds }, deletedAt: null },
      select: { id: true, slug: true },
    });

    const criteria: StreamResolvedCriteria = {
      streamId: stream.id,
      slug: stream.slug,
      title: stream.title,
      privacy: stream.privacy === 'private' ? 'private' : 'public',
      feedIds: feeds.map((f) => f.id),
      feedSlugs: feeds.map((f) => f.slug.toLowerCase()),
      tags: stream.tags || [],
      folderPaths: stream.folderPaths || [],
    };

    this.resolutionCache.set(norm, criteria);
    this.resolutionCache.set(stream.slug, criteria);
    return criteria;
  }
}
