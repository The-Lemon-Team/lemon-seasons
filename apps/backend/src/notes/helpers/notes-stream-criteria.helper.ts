import { Prisma } from '@prisma/client';

export interface DynamicStreamCriteria {
  slug: string;
  title: string;
  privacy?: string;
  feedIds?: string[];
  feedSlugs?: string[];
  folderPaths?: string[];
  tags?: string[];
}

/**
 * Builds Prisma where input conditions for a resolved dynamic stream.
 */
export function buildDynamicStreamConditions(
  dynamicCriteria: DynamicStreamCriteria,
  privacy?: string
): Prisma.NoteWhereInput[] {
  const conditions: Prisma.NoteWhereInput[] = [];

  if (dynamicCriteria.privacy === 'private') {
    if (privacy === 'all') {
      // In 'all' privacy contour, allow both private and public notes that belong to this stream
    } else if (privacy === 'public') {
      conditions.push({ privacy: 'public' });
    } else if (dynamicCriteria.feedIds && dynamicCriteria.feedIds.length > 0) {
      conditions.push({
        OR: [
          { feedId: { in: dynamicCriteria.feedIds } },
          { publicFeedId: { in: dynamicCriteria.feedIds } },
          { privacy: 'private' },
        ],
      });
    } else {
      conditions.push({ privacy: 'private' });
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
    conditions.push({ OR: orClauses });
  } else {
    // Newly created custom stream with no explicit feeds, tags, or folders attached:
    const normSlug = dynamicCriteria.slug.toLowerCase().trim();
    const normSlugHyphen = normSlug.replace(/_/g, '-');
    const normTitle = dynamicCriteria.title.toLowerCase().trim();
    const candidateTags = Array.from(new Set([normSlug, normSlugHyphen, normTitle].filter(Boolean)));
    const candidateSlugs = Array.from(new Set([normSlug, normSlugHyphen].filter(Boolean)));

    conditions.push({
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

  return conditions;
}
