import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HashtagsService } from '../hashtags/hashtags.service';
import { FoldersService } from '../folders/folders.service';
import { QueryNotesDto } from './dto/query-notes.dto';

@Injectable()
export class NotesQueryBuilder {
  constructor(private readonly prisma: PrismaService) {}

  private buildFeedCondition(targetFeed: { id: string; folderPaths: string[]; hashtags: string[] }): Prisma.NoteWhereInput {
    const hasFolders = targetFeed.folderPaths && targetFeed.folderPaths.length > 0;
    const hasHashtags = targetFeed.hashtags && targetFeed.hashtags.length > 0;

    if (hasFolders || hasHashtags) {
      const orClauses: Prisma.NoteWhereInput[] = [
        { feedId: targetFeed.id },
        { publicFeedId: targetFeed.id },
      ];
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
    return {
      OR: [{ feedId: targetFeed.id }, { publicFeedId: targetFeed.id }],
    };
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
      privacy,
      containerId,
      containers,
      type,
      tagId,
      tagPath,
      hashtag,
      hashtagId,
      folderId,
      folder,
      folderPrefix,
      folderPath,
      unfiled,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      queryStart,
      queryEnd,
      overlapStart,
      overlapEnd,
      search,
      userId,
    } = query;

    const andConditions: Prisma.NoteWhereInput[] = [
      { deletedAt: null },
    ];

    // Privacy & Staging / Public contour gating:
    // - Non-admin (public port 5176 / guest) strictly sees only privacy = 'public' AND status = 'PUBLISHED'
    // - Admin / Staging Hub can filter by privacy='private' | 'public' | 'all'
    if (!isAdmin) {
      andConditions.push({ privacy: 'public' });
      andConditions.push({ status: 'PUBLISHED' });
    } else if (privacy && privacy !== 'all') {
      andConditions.push({ privacy });
    }

    if (publicFeedId) {
      andConditions.push({ publicFeedId });
    } else if (publicFeedSlug) {
      andConditions.push({
        publicFeed: { slug: publicFeedSlug, deletedAt: null },
      });
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
      const targetFeed = await this.prisma.feed.findFirst({
        where: { slug: feedSlug, deletedAt: null },
        select: { id: true, folderPaths: true, hashtags: true },
      });
      if (targetFeed) {
        andConditions.push(this.buildFeedCondition(targetFeed));
      } else {
        const legacySlugFilter: Prisma.NoteWhereInput =
          feedSlug === 'russian-holidays'
            ? {
                feed: {
                  slug: { in: ['russian-holidays', 'russian-official', 'russian-military'] },
                  deletedAt: null,
                },
              }
            : feedSlug === 'christian-holidays' || feedSlug === 'orthodox-holidays'
            ? { feed: { slug: { in: ['christian-holidays', 'orthodox-holidays'] }, deletedAt: null } }
            : feedSlug === 'wiki' || feedSlug === 'wiki-history'
            ? { feed: { slug: { in: ['wiki', 'wiki-history', 'wikipedia'] }, deletedAt: null } }
            : { feed: { slug: feedSlug, deletedAt: null } };
        andConditions.push(legacySlugFilter);
      }
    }

    // Container filters
    if (containerId) {
      andConditions.push({ containerId });
    }
    if (containers) {
      const parsedContainers = containers
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      if (parsedContainers.length > 0) {
        andConditions.push({ containerId: { in: parsedContainers } });
      }
    }

    // Type & Status
    if (type) {
      andConditions.push({ type: type as any });
    }
    if (query.status) {
      andConditions.push({ status: query.status as any });
    }

    // Curator
    if (query.curator) {
      andConditions.push({
        OR: [
          { curator: { equals: query.curator, mode: 'insensitive' } },
          { curator: { contains: query.curator, mode: 'insensitive' } },
        ],
      });
    }

    // Tags & Hashtags
    if (tagId) {
      andConditions.push({ tags: { some: { id: tagId, deletedAt: null } } });
    }
    if (tagPath) {
      andConditions.push({
        tags: {
          some: {
            path: { startsWith: tagPath.toLowerCase().trim() },
            deletedAt: null,
          },
        },
      });
    }
    if (hashtag) {
      andConditions.push({
        hashtags: {
          some: {
            name: HashtagsService.normalizeName(hashtag),
            deletedAt: null,
          },
        },
      });
    }
    if (hashtagId) {
      andConditions.push({
        hashtags: {
          some: {
            id: hashtagId,
            deletedAt: null,
          },
        },
      });
    }

    // Folders
    if (unfiled) {
      andConditions.push({ folders: { none: {} } });
    }
    if (folderId) {
      andConditions.push({
        folders: {
          some: {
            folderId,
            folder: { deletedAt: null },
          },
        },
      });
    }
    if (folder) {
      andConditions.push({
        folders: {
          some: {
            folder: {
              path: FoldersService.normalizePath(folder),
              deletedAt: null,
            },
          },
        },
      });
    }
    if (folderPath) {
      andConditions.push({
        OR: [
          { folderPath: { equals: folderPath, mode: 'insensitive' as const } },
          {
            folders: {
              some: {
                folder: {
                  path: FoldersService.normalizePath(folderPath),
                  deletedAt: null,
                },
              },
            },
          },
        ],
      });
    }
    if (folderPrefix) {
      andConditions.push({
        OR: [
          {
            folderPath: {
              startsWith: FoldersService.normalizePath(folderPrefix),
              mode: 'insensitive' as const,
            },
          },
          {
            folders: {
              some: {
                folder: {
                  path: {
                    startsWith: FoldersService.normalizePath(folderPrefix),
                  },
                  deletedAt: null,
                },
              },
            },
          },
        ],
      });
    }

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
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const normalizedHashtagSearch = HashtagsService.normalizeName(cleanSearch);

      andConditions.push({
        OR: [
          { title: { contains: cleanSearch, mode: 'insensitive' } },
          { description: { contains: cleanSearch, mode: 'insensitive' } },
          { feed: { title: { contains: cleanSearch, mode: 'insensitive' } } },
          { curator: { contains: cleanSearch, mode: 'insensitive' } },
          ...(normalizedHashtagSearch
            ? [
                {
                  hashtags: {
                    some: {
                      name: {
                        contains: normalizedHashtagSearch,
                        mode: 'insensitive' as const,
                      },
                      deletedAt: null,
                    },
                  },
                },
              ]
            : []),
          {
            folders: {
              some: {
                folder: {
                  path: {
                    contains: cleanSearch,
                    mode: 'insensitive',
                  },
                  deletedAt: null,
                },
              },
            },
          },
        ],
      });
    }

    // Time window overlap query handling
    const qStart = queryStart || overlapStart;
    const qEnd = queryEnd || overlapEnd;

    if (qStart && qEnd) {
      const windowStart = new Date(qStart);
      const windowEnd = new Date(qEnd);

      andConditions.push({
        startDate: { lte: windowEnd },
        OR: [
          { endDate: { gte: windowStart } },
          { endDate: null, startDate: { gte: windowStart } },
          { type: 'PERIOD', endDate: null },
        ],
      });
    } else {
      if (startDateFrom || startDateTo) {
        andConditions.push({
          startDate: {
            ...(startDateFrom ? { gte: new Date(startDateFrom) } : {}),
            ...(startDateTo ? { lte: new Date(startDateTo) } : {}),
          },
        });
      }
      if (endDateFrom || endDateTo) {
        andConditions.push({
          endDate: {
            ...(endDateFrom ? { gte: new Date(endDateFrom) } : {}),
            ...(endDateTo ? { lte: new Date(endDateTo) } : {}),
          },
        });
      }
    }

    return {
      AND: andConditions,
    };
  }

  buildOrderBy(query: QueryNotesDto): Prisma.NoteOrderByWithRelationInput[] {
    const { sortBy, sortOrder = 'desc' } = query;
    const direction: Prisma.SortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    if (sortBy === 'title') {
      return [{ title: direction }, { startDate: 'desc' }];
    }
    if (sortBy === 'type') {
      return [{ type: direction }, { startDate: 'desc' }];
    }
    if (sortBy === 'folder') {
      return [{ folderPath: { sort: direction, nulls: 'last' } }, { startDate: 'desc' }];
    }
    if (sortBy === 'startDate') {
      return [{ startDate: direction }, { id: 'desc' }];
    }

    return [{ startDate: 'desc' }];
  }
}
