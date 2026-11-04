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
    } catch (err: any) {
      this.logger.warn(`Failed to seed default streams: ${err?.message || err}`);
    }
  }

  /**
   * Seeds default streams if the Stream table is empty.
   * Matches feed slugs with existing feeds to resolve their UUIDs.
   */
  async seedDefaultStreamsIfEmpty(): Promise<void> {
    const count = await this.prisma.stream.count();
    if (count > 0) return;

    this.logger.log('Seeding initial default streams (all, it_dev, js_interview, entertainment, seasons, holidays)...');
    const allFeeds = await this.prisma.feed.findMany({
      where: { deletedAt: null },
      select: { id: true, slug: true },
    });
    const feedMap = new Map<string, string>();
    for (const f of allFeeds) {
      feedMap.set(f.slug.toLowerCase(), f.id);
    }

    for (const item of DEFAULT_STREAMS_SEED) {
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

    const streams = await this.prisma.stream.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    const allFeeds = await this.prisma.feed.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        icon: true,
        color: true,
        privacy: true,
        _count: { select: { notes: true } },
      },
    });

    const feedMap = new Map<string, any>();
    for (const f of allFeeds) {
      feedMap.set(f.id, f);
    }

    return streams.map((s) => {
      const feeds = (s.feedIds || []).map((id) => feedMap.get(id)).filter(Boolean);
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
    });

    if (!stream) {
      throw new NotFoundException(`Stream '${idOrSlug}' not found`);
    }

    if (!includePrivate && stream.privacy === 'private') {
      throw new NotFoundException(`Stream '${idOrSlug}' not found`);
    }

    const feeds = await this.prisma.feed.findMany({
      where: { id: { in: stream.feedIds }, deletedAt: null },
      include: { _count: { select: { notes: true } } },
    });

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

    this.invalidateCache();
    this.eventEmitter.emit('stream.created', stream);
    return stream;
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

    this.invalidateCache();
    this.eventEmitter.emit('stream.updated', updated);
    return updated;
  }

  async attachFeed(streamId: string, feedId: string) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream || stream.deletedAt) throw new NotFoundException('Stream not found');

    const feed = await this.prisma.feed.findUnique({ where: { id: feedId } });
    if (!feed || feed.deletedAt) throw new NotFoundException('Feed not found');

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

    const updated = await this.prisma.stream.update({
      where: { id: streamId },
      data: { feedIds: stream.feedIds.filter((id) => id !== feedId) },
    });
    this.invalidateCache();
    this.eventEmitter.emit('stream.updated', updated);
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
