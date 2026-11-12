import { Prisma } from '@prisma/client';
import { HashtagsService } from '../../hashtags/hashtags.service';
import { FoldersService } from '../../folders/folders.service';
import { QueryNotesDto } from '../dto/query-notes.dto';

export function buildHashtagsCondition(query: QueryNotesDto): Prisma.NoteWhereInput[] {
  const { hashtag, hashtags, hashtagId, tagId, tagPath } = query;
  const conditions: Prisma.NoteWhereInput[] = [];

  if (tagId) {
    conditions.push({ tags: { some: { id: tagId, deletedAt: null } } });
  }

  if (tagPath) {
    conditions.push({
      tags: {
        some: {
          path: { startsWith: tagPath.toLowerCase().trim() },
          deletedAt: null,
        },
      },
    });
  }

  if (hashtags) {
    const parsed = hashtags
      .split(',')
      .map((h) => HashtagsService.normalizeName(h))
      .filter(Boolean);
    if (hashtag) {
      parsed.push(HashtagsService.normalizeName(hashtag));
    }
    const uniqueNames = Array.from(new Set(parsed));
    if (uniqueNames.length === 1) {
      conditions.push({
        hashtags: {
          some: {
            name: uniqueNames[0],
            deletedAt: null,
          },
        },
      });
    } else if (uniqueNames.length > 1) {
      conditions.push({
        hashtags: {
          some: {
            name: { in: uniqueNames },
            deletedAt: null,
          },
        },
      });
    }
  } else if (hashtag) {
    conditions.push({
      hashtags: {
        some: {
          name: HashtagsService.normalizeName(hashtag),
          deletedAt: null,
        },
      },
    });
  }

  if (hashtagId) {
    conditions.push({
      hashtags: {
        some: {
          id: hashtagId,
          deletedAt: null,
        },
      },
    });
  }

  return conditions;
}

export function buildFoldersCondition(query: QueryNotesDto): Prisma.NoteWhereInput[] {
  const { unfiled, folderId, folder, folderPath, folderPrefix } = query;
  const conditions: Prisma.NoteWhereInput[] = [];

  if (unfiled) {
    conditions.push({ folders: { none: {} } });
  }

  if (folderId) {
    conditions.push({
      folders: {
        some: {
          folderId,
          folder: { deletedAt: null },
        },
      },
    });
  }

  if (folder) {
    conditions.push({
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
    conditions.push({
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
    conditions.push({
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

  return conditions;
}

export function buildSearchCondition(search?: string): Prisma.NoteWhereInput | null {
  if (!search || !search.trim()) {
    return null;
  }

  const cleanSearch = search.trim();
  const normalizedHashtagSearch = HashtagsService.normalizeName(cleanSearch);

  return {
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
  };
}

export function buildNotesOrderBy(query: QueryNotesDto): Prisma.NoteOrderByWithRelationInput[] {
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
