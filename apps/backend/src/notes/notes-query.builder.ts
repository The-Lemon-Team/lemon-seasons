import { Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HashtagsService } from '../hashtags/hashtags.service';
import { FoldersService } from '../folders/folders.service';
import { QueryNotesDto } from './dto/query-notes.dto';
import { StreamsService } from '../streams/streams.service';

export const STREAM_SOURCE_SLUGS: Record<string, string[]> = {
  entertainment: [
    'marvel', 'mcu', 'mcu-radar', 'marvel-cinematic-universe',
    'cinema', 'movies', 'tmdb', 'films', 'series', 'my-films', 'my-movies',
    'music', 'soundtrack', 'albums', 'музыка', 'my-music',
    'gaming', 'games', 'игры',
  ],
  js_interview: [
    'daily-questions', 'advanced-react', 'advanced-reactx',
    'interesting-questions', 'react', 'javascript', 'interview',
  ],
  'js-interview': [
    'daily-questions', 'advanced-react', 'advanced-reactx',
    'interesting-questions', 'react', 'javascript', 'interview',
  ],
  'it-dev': [
    'spark-ai', 'ai-models', 'ai',
    'spark-habr', 'habr', 'community', 'dev-articles',
    'spark-changelogsfeed', 'changelogs', 'releases', 'changelog',
    'spark-notebooklmai', 'notebooklm-ai', 'notebooklm',
    'spark-xakep', 'xakep', 'hacker',
    'spark-cyber-security', 'cybersec', 'security',
    'spark-youtube-oneday', 'spark-youtube', 'youtube', 'oneday',
  ],
  it_dev: [
    'spark-ai', 'ai-models', 'ai',
    'spark-habr', 'habr', 'community', 'dev-articles',
    'spark-changelogsfeed', 'changelogs', 'releases', 'changelog',
    'spark-notebooklmai', 'notebooklm-ai', 'notebooklm',
    'spark-xakep', 'xakep', 'hacker',
    'spark-cyber-security', 'cybersec', 'security',
    'spark-youtube-oneday', 'spark-youtube', 'youtube', 'oneday',
  ],
  dev: [
    'spark-ai', 'ai-models', 'ai',
    'spark-habr', 'habr', 'community', 'dev-articles',
    'spark-changelogsfeed', 'changelogs', 'releases', 'changelog',
    'spark-notebooklmai', 'notebooklm-ai', 'notebooklm',
    'spark-xakep', 'xakep', 'hacker',
    'spark-cyber-security', 'cybersec', 'security',
    'spark-youtube-oneday', 'spark-youtube', 'youtube', 'oneday',
  ],
  holidays: [
    'russian-holidays', 'russian-official', 'russian-military',
    'orthodox-holidays', 'christian-holidays',
    'world-holidays', 'world-religions', 'catholic-holidays', 'islamic-holidays',
  ],
  seasons: [
    'seasons', 'lemon-seasons', 'seasons-hub', 'diary', 'journal',
  ],
  private_feeds: [
    'private-notes', 'work-vault', 'diary-logs', 'secure-vault',
  ],
  personal_notes: [
    'private-notes', 'diary-logs', 'personal-notes',
  ],
  work_vault: [
    'work-vault', 'confidential',
  ],
  secure_vault: [
    'secure-vault',
  ],
};

export const LEGACY_FEED_SLUG_ALIASES: Record<string, string[]> = {
  'russian-holidays': ['russian-holidays', 'russian-official', 'russian-military'],
  'christian-holidays': ['christian-holidays', 'orthodox-holidays'],
  'orthodox-holidays': ['christian-holidays', 'orthodox-holidays'],
  'world-holidays': ['world-holidays', 'world-religions', 'catholic-holidays', 'islamic-holidays'],
  'wiki': ['wiki', 'wiki-history', 'wikipedia'],
  'wiki-history': ['wiki', 'wiki-history', 'wikipedia'],
  'marvel': ['marvel', 'mcu', 'mcu-radar', 'marvel-cinematic-universe'],
  'cinema': ['cinema', 'movies', 'tmdb', 'films', 'series'],
  'music': ['music', 'soundtrack', 'albums', 'музыка', 'my-music'],
  'gaming': ['gaming', 'games', 'игры'],
  'spark-ai': ['spark-ai', 'ai-models', 'ai'],
  'spark-habr': ['spark-habr', 'habr', 'community', 'dev-articles'],
  'spark-changelogsfeed': ['spark-changelogsfeed', 'changelogs', 'releases', 'changelog'],
  'changelogs': ['spark-changelogsfeed', 'changelogs', 'releases', 'changelog'],
  'spark-notebooklmai': ['spark-notebooklmai', 'notebooklm-ai', 'notebooklm'],
  'notebooklm': ['spark-notebooklmai', 'notebooklm-ai', 'notebooklm'],
  'spark-xakep': ['spark-xakep', 'xakep', 'hacker'],
  'spark-cyber-security': ['spark-cyber-security', 'cybersec', 'security'],
  'spark-youtube-oneday': ['spark-youtube-oneday', 'spark-youtube', 'youtube', 'oneday'],
  'hot-daily': [
    'spark-ai', 'spark-habr', 'spark-changelogsfeed', 'spark-notebooklmai',
    'spark-xakep', 'spark-cyber-security', 'spark-youtube-oneday', 'spark-general',
    'spark-ai-economy', 'spark-news-and-frontier', 'spark-world-of-warcraft',
    'spark-политика', 'spark-рф-и-украина',
  ],
  'it-tech': [
    'spark-ai', 'ai-models', 'ai', 'spark-habr', 'habr', 'spark-changelogsfeed',
    'changelogs', 'spark-notebooklmai', 'spark-xakep', 'spark-cyber-security',
    'spark-youtube-oneday',
  ],
  'seasons-hub': ['seasons', 'lemon-seasons', 'daily-logs', 'tech-strategy', 'product-milestones', 'community-stories'],
  'entertainment-hub': ['marvel', 'mcu', 'mcu-radar', 'cinema', 'movies', 'films', 'my-films', 'music', 'my-music', 'games'],
  'holidays-hub': ['russian-holidays', 'orthodox-holidays', 'world-holidays', 'world-religions', 'christian-holidays'],
};

@Injectable()
export class NotesQueryBuilder {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly streamsService?: StreamsService,
  ) {}

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
      appMode,
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
            if (dynamicCriteria.privacy === 'private') {
              if (query.privacy === 'all') {
                // In 'all' privacy contour, allow both private and public notes that belong to this stream
              } else if (query.privacy === 'public') {
                andConditions.push({ privacy: 'public' });
              } else if (dynamicCriteria.feedIds && dynamicCriteria.feedIds.length > 0) {
                andConditions.push({
                  OR: [
                    { feedId: { in: dynamicCriteria.feedIds } },
                    { publicFeedId: { in: dynamicCriteria.feedIds } },
                    { privacy: 'private' },
                  ],
                });
              } else {
                andConditions.push({ privacy: 'private' });
              }
            }
            const orClauses: Prisma.NoteWhereInput[] = [];
            if (dynamicCriteria.feedIds && dynamicCriteria.feedIds.length > 0) {
              orClauses.push({ feedId: { in: dynamicCriteria.feedIds } });
              orClauses.push({ publicFeedId: { in: dynamicCriteria.feedIds } });
            }
            if (dynamicCriteria.feedSlugs && dynamicCriteria.feedSlugs.length > 0) {
              orClauses.push({ feed: { slug: { in: dynamicCriteria.feedSlugs }, deletedAt: null } });
              orClauses.push({ publicFeed: { slug: { in: dynamicCriteria.feedSlugs }, deletedAt: null } });
              orClauses.push(
                ...dynamicCriteria.feedSlugs.map((s) => ({
                  folderPath: { contains: s, mode: 'insensitive' as const },
                }))
              );
            }
            if (dynamicCriteria.folderPaths && dynamicCriteria.folderPaths.length > 0) {
              for (const fp of dynamicCriteria.folderPaths) {
                orClauses.push({ folderPath: { contains: fp, mode: 'insensitive' as const } });
              }
            }
            if (dynamicCriteria.tags && dynamicCriteria.tags.length > 0) {
              orClauses.push({
                hashtags: {
                  some: {
                    name: { in: dynamicCriteria.tags, mode: 'insensitive' as const },
                  },
                },
              });
            }
            if (orClauses.length > 0) {
              andConditions.push({ OR: orClauses });
            } else {
              // Newly created custom stream with no explicit feeds, tags, or folders attached:
              // Match notes explicitly authored for or tagged with this stream's slug or title
              const normSlug = dynamicCriteria.slug.toLowerCase().trim();
              const normSlugHyphen = normSlug.replace(/_/g, '-');
              const normTitle = dynamicCriteria.title.toLowerCase().trim();
              const candidateTags = Array.from(new Set([normSlug, normSlugHyphen, normTitle].filter(Boolean)));
              const candidateSlugs = Array.from(new Set([normSlug, normSlugHyphen].filter(Boolean)));

              andConditions.push({
                OR: [
                  { feed: { slug: { in: candidateSlugs, mode: 'insensitive' as const }, deletedAt: null } },
                  { publicFeed: { slug: { in: candidateSlugs, mode: 'insensitive' as const }, deletedAt: null } },
                  { folderPath: { contains: normSlug, mode: 'insensitive' as const } },
                  ...(normSlugHyphen !== normSlug
                    ? [{ folderPath: { contains: normSlugHyphen, mode: 'insensitive' as const } }]
                    : []),
                  {
                    hashtags: {
                      some: {
                        name: { in: candidateTags, mode: 'insensitive' as const },
                        deletedAt: null,
                      },
                    },
                  },
                ],
              });
            }
          }
        }

        if (!matchedDynamic) {
          const allowedSlugs = STREAM_SOURCE_SLUGS[query.streamSource];
          if (allowedSlugs && allowedSlugs.length > 0) {
            andConditions.push({
              OR: [
                { feed: { slug: { in: allowedSlugs }, deletedAt: null } },
                { publicFeed: { slug: { in: allowedSlugs }, deletedAt: null } },
                ...allowedSlugs.map((s) => ({
                  folderPath: { contains: s, mode: 'insensitive' as const },
                })),
              ],
            });
          }
        }
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
    if (query.status && !appMode) {
      if (query.status === 'staging' || query.status === 'NOT_PUBLISHED' || query.status === '!PUBLISHED') {
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
          { author: { contains: cleanSearch, mode: 'insensitive' } },
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
