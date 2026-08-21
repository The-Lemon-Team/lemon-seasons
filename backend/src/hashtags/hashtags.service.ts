import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryHashtagsDto } from './dto/query-hashtags.dto';

@Injectable()
export class HashtagsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Normalize hashtag string: strip leading '#', lowercase, trim, remove illegal chars
   */
  static normalizeName(raw: string): string {
    if (!raw) return '';
    return raw
      .trim()
      .replace(/^#+/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_\-]/g, '');
  }

  /**
   * Extract hashtags from markdown / text content
   */
  static extractFromText(text?: string): string[] {
    if (!text) return [];
    // Match #tag while ignoring markdown headers like # Header or ## Header (must be preceded by start of line or whitespace)
    // and followed by word characters/digits/hyphens/underscores.
    // Ensure it's not a header by checking that character following # is alphanumeric or underscore/hyphen, not a space.
    const regex = /(?:^|\s)#([a-zA-Z0-9_\-]+)/g;
    const matches: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        const normalized = HashtagsService.normalizeName(match[1]);
        if (normalized) {
          matches.push(normalized);
        }
      }
    }

    return Array.from(new Set(matches));
  }

  /**
   * Resolve an array of hashtag names (and optional text content to extract from),
   * creating any hashtags that do not exist yet, and returning resolved hashtag IDs.
   */
  async resolveHashtags(
    explicitNames?: string[],
    textContent?: string,
    titleContent?: string,
  ): Promise<string[]> {
    const fromContent = [
      ...HashtagsService.extractFromText(titleContent),
      ...HashtagsService.extractFromText(textContent),
    ];

    const rawList = [...(explicitNames || []), ...fromContent];
    const normalizedNames = Array.from(
      new Set(rawList.map((n) => HashtagsService.normalizeName(n)).filter(Boolean)),
    );

    if (normalizedNames.length === 0) {
      return [];
    }

    const resolvedIds: string[] = [];

    for (const name of normalizedNames) {
      const existing = await this.prisma.hashtag.findFirst({
        where: { name, deletedAt: null },
      });

      if (existing) {
        resolvedIds.push(existing.id);
      } else {
        const created = await this.prisma.hashtag.create({
          data: { name },
        });
        resolvedIds.push(created.id);
      }
    }

    return Array.from(new Set(resolvedIds));
  }

  /**
   * Find all hashtags with note counts
   */
  async findAll(query: QueryHashtagsDto) {
    const { search, includeDeleted = false, limit = 50 } = query;

    const where: any = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(search
        ? {
            name: {
              contains: HashtagsService.normalizeName(search),
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const hashtags = await this.prisma.hashtag.findMany({
      where,
      take: Number(limit),
      include: {
        _count: {
          select: {
            notes: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Sort in-memory by note count descending, then name ascending
    return hashtags.sort((a, b) => {
      const countDiff = b._count.notes - a._count.notes;
      if (countDiff !== 0) return countDiff;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Real-time autocomplete suggestions for typing
   */
  async suggest(query: string, limit = 10) {
    const clean = HashtagsService.normalizeName(query);

    return this.prisma.hashtag.findMany({
      where: {
        deletedAt: null,
        ...(clean ? { name: { contains: clean, mode: 'insensitive' } } : {}),
      },
      take: Number(limit),
      include: {
        _count: {
          select: {
            notes: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Find single hashtag with associated notes
   */
  async findOne(id: string) {
    const hashtag = await this.prisma.hashtag.findUnique({
      where: { id },
      include: {
        notes: {
          where: { deletedAt: null },
          orderBy: { startDate: 'desc' },
          include: {
            feed: true,
            tags: { where: { deletedAt: null } },
            images: { orderBy: { order: 'asc' } },
            links: { orderBy: { order: 'asc' } },
          },
        },
        _count: {
          select: {
            notes: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!hashtag || hashtag.deletedAt) {
      throw new NotFoundException(`Hashtag with ID '${id}' not found`);
    }

    return hashtag;
  }

  /**
   * Soft delete a hashtag
   */
  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.hashtag.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restore a soft-deleted hashtag
   */
  async restore(id: string) {
    const hashtag = await this.prisma.hashtag.findUnique({ where: { id } });
    if (!hashtag) {
      throw new NotFoundException(`Hashtag with ID '${id}' not found`);
    }
    return this.prisma.hashtag.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
