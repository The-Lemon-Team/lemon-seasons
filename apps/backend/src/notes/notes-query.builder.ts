import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HashtagsService } from '../hashtags/hashtags.service';
import { FoldersService } from '../folders/folders.service';
import { QueryNotesDto } from './dto/query-notes.dto';

@Injectable()
export class NotesQueryBuilder {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Constructs the strongly-typed Prisma.NoteWhereInput condition from the HTTP query parameters.
   */
  async buildWhereClause(query: QueryNotesDto): Promise<Prisma.NoteWhereInput> {
    const {
      feedId,
      feedSlug,
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

    const qStart = queryStart || overlapStart;
    const qEnd = queryEnd || overlapEnd;

    let parsedContainers: string[] | undefined = undefined;
    if (containers) {
      parsedContainers = containers
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
    }

    let feedFilter: Prisma.NoteWhereInput | undefined = undefined;
    if (feedId) {
      const targetFeed = await this.prisma.feed.findUnique({
        where: { id: feedId },
        select: { id: true, folderPaths: true },
      });
      if (targetFeed && targetFeed.folderPaths && targetFeed.folderPaths.length > 0) {
        feedFilter = {
          OR: [
            { feedId: targetFeed.id },
            ...targetFeed.folderPaths.map((fp) => ({
              folderPath: { startsWith: fp, mode: 'insensitive' as const },
            })),
          ],
        };
      } else {
        feedFilter = { feedId };
      }
    } else if (feedSlug) {
      const targetFeed = await this.prisma.feed.findFirst({
        where: { slug: feedSlug, deletedAt: null },
        select: { id: true, folderPaths: true },
      });
      if (targetFeed && targetFeed.folderPaths && targetFeed.folderPaths.length > 0) {
        feedFilter = {
          OR: [
            { feedId: targetFeed.id },
            ...targetFeed.folderPaths.map((fp) => ({
              folderPath: { startsWith: fp, mode: 'insensitive' as const },
            })),
          ],
        };
      } else {
        feedFilter =
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
      }
    }

    const where: Prisma.NoteWhereInput = {
      deletedAt: null,
      ...(feedFilter ? feedFilter : {}),
      ...(containerId ? { containerId } : {}),
      ...(parsedContainers && parsedContainers.length > 0
        ? { containerId: { in: parsedContainers } }
        : {}),
      ...(type ? { type: type as any } : {}),
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.curator
        ? {
            OR: [
              { curator: { equals: query.curator, mode: 'insensitive' } },
              { curator: { contains: query.curator, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(tagId ? { tags: { some: { id: tagId, deletedAt: null } } } : {}),
      ...(tagPath
        ? {
            tags: {
              some: {
                path: { startsWith: tagPath.toLowerCase().trim() },
                deletedAt: null,
              },
            },
          }
        : {}),
      ...(hashtag
        ? {
            hashtags: {
              some: {
                name: HashtagsService.normalizeName(hashtag),
                deletedAt: null,
              },
            },
          }
        : {}),
      ...(hashtagId
        ? {
            hashtags: {
              some: {
                id: hashtagId,
                deletedAt: null,
              },
            },
          }
        : {}),
      ...(unfiled ? { folders: { none: {} } } : {}),
      ...(folderId
        ? {
            folders: {
              some: {
                folderId,
                folder: { deletedAt: null },
              },
            },
          }
        : {}),
      ...(folder
        ? {
            folders: {
              some: {
                folder: {
                  path: FoldersService.normalizePath(folder),
                  deletedAt: null,
                },
              },
            },
          }
        : {}),
      ...(query.folderPath
        ? {
            OR: [
              { folderPath: { equals: query.folderPath, mode: 'insensitive' as const } },
              {
                folders: {
                  some: {
                    folder: {
                      path: FoldersService.normalizePath(query.folderPath),
                      deletedAt: null,
                    },
                  },
                },
              },
            ],
          }
        : {}),
      ...(folderPrefix
        ? {
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
          }
        : {}),
    };

    const andConditions: Prisma.NoteWhereInput[] = [];

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
        where.startDate = {
          ...(startDateFrom ? { gte: new Date(startDateFrom) } : {}),
          ...(startDateTo ? { lte: new Date(startDateTo) } : {}),
        };
      }
      if (endDateFrom || endDateTo) {
        where.endDate = {
          ...(endDateFrom ? { gte: new Date(endDateFrom) } : {}),
          ...(endDateTo ? { lte: new Date(endDateTo) } : {}),
        };
      }
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    return where;
  }
}
