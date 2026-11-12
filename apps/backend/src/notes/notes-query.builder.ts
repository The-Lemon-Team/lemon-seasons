import { Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryNotesDto } from './dto/query-notes.dto';
import { StreamsService } from '../streams/streams.service';
import {
  STREAM_SOURCE_SLUGS,
  LEGACY_FEED_SLUG_ALIASES,
} from './constants/notes-stream-slugs.constant';
import { buildDateFilterConditions } from './helpers/notes-query-date.helper';
import {
  buildHashtagsCondition,
  buildFoldersCondition,
  buildSearchCondition,
  buildNotesOrderBy,
} from './helpers/notes-query-clauses.helper';
import { buildDynamicStreamConditions } from './helpers/notes-stream-criteria.helper';

// Re-export constants for full backward compatibility
export { STREAM_SOURCE_SLUGS, LEGACY_FEED_SLUG_ALIASES };

@Injectable()
export class NotesQueryBuilder {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly streamsService?: StreamsService,
  ) {}

  private buildFeedCondition(targetFeed: {
    id: string;
    slug?: string;
    folderPaths: string[];
    hashtags: string[];
  }): Prisma.NoteWhereInput {
    const hasFolders = targetFeed.folderPaths && targetFeed.folderPaths.length > 0;
    const hasHashtags = targetFeed.hashtags && targetFeed.hashtags.length > 0;

    const orClauses: Prisma.NoteWhereInput[] = [
      { feedId: targetFeed.id },
      { publicFeedId: targetFeed.id },
    ];
    if (targetFeed.slug) {
      orClauses.push({ feed: { slug: { startsWith: targetFeed.slug }, deletedAt: null } });
    }
    if (hasFolders) {
      orClauses.push(
        ...targetFeed.folderPaths.map((fp) => ({
          folderPath: { startsWith: fp, mode: 'insensitive' as const },
        })),
      );
    }
    if (hasHashtags) {
      const cleanTags = targetFeed.hashtags.map((h) => h.replace(/^#/, '').toLowerCase());
      orClauses.push({
        hashtags: {
          some: {
            name: { in: cleanTags },
            deletedAt: null,
          },
        },
      });
    }
    return { OR: orClauses };
  }

  /**
   * Constructs the strongly-typed Prisma.NoteWhereInput condition from the HTTP query parameters.
   */
  async buildWhereClause(query: QueryNotesDto, isAdmin = false): Promise<Prisma.NoteWhereInput> {
    const {
      feedId,
      feedSlug,
      publicFeedId,
      publicFeedSlug,
      appMode,
      privacy,
      containerId,
      containers,
      type,
      userId,
      publics,
    } = query;

    const andConditions: Prisma.NoteWhereInput[] = [{ deletedAt: null }];

    // Privacy & Staging / Public contour gating:
    if (appMode === 'staging') {
      andConditions.push({ privacy: 'public' });
      andConditions.push({ status: { not: 'PUBLISHED' } });
    } else if (appMode === 'public') {
      andConditions.push({ privacy: 'public' });
      andConditions.push({ status: 'PUBLISHED' });
    } else if (appMode === 'dev') {
      if (privacy && privacy !== 'all') {
        andConditions.push({ privacy });
      }
    } else if (!isAdmin) {
      andConditions.push({ privacy: 'public' });
      andConditions.push({ status: 'PUBLISHED' });
    } else if (privacy && privacy !== 'all') {
      andConditions.push({ privacy });
    }

    // Public feeds filtering
    const publicClauses: Prisma.NoteWhereInput[] = [];
    if (publicFeedId) {
      publicClauses.push({ publicFeedId });
    } else if (publicFeedSlug) {
      publicClauses.push({
        publicFeed: { slug: publicFeedSlug, deletedAt: null },
      });
    }

    if (publics) {
      const parsedPublics = publics
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      if (parsedPublics.length > 0) {
        publicClauses.push({
          OR: [
            { publicFeedId: { in: parsedPublics } },
            { publicFeed: { slug: { in: parsedPublics }, deletedAt: null } },
          ],
        });
      }
    }

    if (publicClauses.length > 0) {
      if (publicClauses.length === 1) {
        andConditions.push(publicClauses[0]);
      } else {
        andConditions.push({ OR: publicClauses });
      }
    }

    // Feed filtering
    if (feedId) {
      const targetFeed = await this.prisma.feed.findUnique({
        where: { id: feedId },
        select: { id: true, folderPaths: true, hashtags: true },
      });
      if (targetFeed) {
        andConditions.push(this.buildFeedCondition(targetFeed));
      } else {
        andConditions.push({ feedId });
      }
    } else if (feedSlug) {
      let targetFeed = await this.prisma.feed.findFirst({
        where: { slug: feedSlug, deletedAt: null },
        select: { id: true, slug: true, folderPaths: true, hashtags: true },
      });
      if (!targetFeed) {
        const aliasSlugs = LEGACY_FEED_SLUG_ALIASES[feedSlug];
        if (aliasSlugs && aliasSlugs.length > 0) {
          targetFeed = await this.prisma.feed.findFirst({
            where: { slug: { in: aliasSlugs }, deletedAt: null },
            select: { id: true, slug: true, folderPaths: true, hashtags: true },
          });
        }
      }
      if (targetFeed) {
        andConditions.push(this.buildFeedCondition(targetFeed));
      } else {
        const matchingSlugs = LEGACY_FEED_SLUG_ALIASES[feedSlug];
        if (matchingSlugs) {
          andConditions.push({ feed: { slug: { in: matchingSlugs }, deletedAt: null } });
        } else {
          andConditions.push({ feed: { slug: feedSlug, deletedAt: null } });
        }
      }
    } else if (query.streamSource && query.streamSource !== 'all') {
      if (query.streamSource === 'private_feeds') {
        if (query.privacy === 'all') {
          andConditions.push({
            OR: [
              { privacy: 'private' },
              { feed: { privacy: 'private', deletedAt: null } },
              { publicFeed: { privacy: 'private', deletedAt: null } },
            ],
          });
        } else if (query.privacy === 'public') {
          andConditions.push({
            privacy: 'public',
            OR: [
              { feed: { privacy: 'private', deletedAt: null } },
              { publicFeed: { privacy: 'private', deletedAt: null } },
            ],
          });
        } else {
          andConditions.push({ privacy: 'private' });
        }
      } else {
        let matchedDynamic = false;
        if (this.streamsService) {
          const dynamicCriteria = await this.streamsService.resolveCriteriaForStream(query.streamSource);
          if (dynamicCriteria) {
            matchedDynamic = true;
            andConditions.push(...buildDynamicStreamConditions(dynamicCriteria, query.privacy));
          }
        }

        if (!matchedDynamic) {
          const streamSlugs = STREAM_SOURCE_SLUGS[query.streamSource];
          if (streamSlugs && streamSlugs.length > 0) {
            andConditions.push({
              OR: [
                { feed: { slug: { in: streamSlugs }, deletedAt: null } },
                { publicFeed: { slug: { in: streamSlugs }, deletedAt: null } },
              ],
            });
          }
        }
      }
    }

    // Type & Status
    if (type) {
      andConditions.push({ type });
    }
    if (query.status && !appMode) {
      if (
        query.status === 'staging' ||
        query.status === 'NOT_PUBLISHED' ||
        query.status === '!PUBLISHED'
      ) {
        andConditions.push({ status: { not: 'PUBLISHED' } });
      } else {
        andConditions.push({ status: query.status as any });
      }
    }

    // Author / Curator
    const authorFilter = query.author || query.curator;
    if (authorFilter) {
      andConditions.push({
        OR: [
          { author: { equals: authorFilter, mode: 'insensitive' } },
          { author: { contains: authorFilter, mode: 'insensitive' } },
        ],
      });
    }

    // Container scope filter
    if (containerId) {
      andConditions.push({ containerId });
    } else if (containers) {
      const containerList = containers
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      if (containerList.length > 0) {
        andConditions.push({ containerId: { in: containerList } });
      }
    }

    // Hashtags & tags conditions
    andConditions.push(...buildHashtagsCondition(query));

    // Folders conditions
    andConditions.push(...buildFoldersCondition(query));

    // Multi-tenancy & Container Privacy Filter
    if (userId !== 'usr-admin-999') {
      andConditions.push({
        OR: [
          { containerId: null },
          { container: { visibility: 'public' } },
          ...(userId ? [{ container: { ownerUserId: userId } }] : []),
        ],
      });
    }

    // Text search filter
    const searchCondition = buildSearchCondition(query.search);
    if (searchCondition) {
      andConditions.push(searchCondition);
    }

    // Time window & date bounds conditions
    andConditions.push(...buildDateFilterConditions(query));

    return {
      AND: andConditions,
    };
  }

  buildOrderBy(query: QueryNotesDto): Prisma.NoteOrderByWithRelationInput[] {
    return buildNotesOrderBy(query);
  }
}
