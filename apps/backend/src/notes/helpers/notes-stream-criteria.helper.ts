import { Prisma } from '@prisma/client';
import { getCandidateSlugVariants } from '@lenta/shared';

export interface DynamicStreamCriteria {
  slug: string;
  title: string;
  privacy?: string;
  feedIds?: string[];
  feedSlugs?: string[];
  folderPaths?: string[];
  tags?: string[];
  fallbackStreams?: Array<{ slug: string; title: string }>;
}

/**
 * Builds implicit matching clauses (by slug/title/folder/hashtag) for a stream
 * that has no explicit feeds, tags, or folders attached.
 */
function buildImplicitStreamClauses(slug: string, title: string): Prisma.NoteWhereInput[] {
  const normSlug = slug.toLowerCase().trim();
  const normSlugHyphen = normSlug.replace(/_/g, '-');
  const normSlugUnderscore = normSlug.replace(/-/g, '_');
  const normTitle = title.toLowerCase().trim();
  const candidateTags = Array.from(new Set([normSlug, normSlugHyphen, normSlugUnderscore, normTitle].filter(Boolean)));
  const candidateSlugs = Array.from(new Set([normSlug, normSlugHyphen, normSlugUnderscore].filter(Boolean)));

  const clauses: Prisma.NoteWhereInput[] = [
    { feed: { slug: { in: candidateSlugs, mode: 'insensitive' as const }, deletedAt: null } },
    { publicFeed: { slug: { in: candidateSlugs, mode: 'insensitive' as const }, deletedAt: null } },
    { folderPath: { contains: normSlug, mode: 'insensitive' as const } },
    {
      hashtags: {
        some: {
          name: { in: candidateTags, mode: 'insensitive' as const },
          deletedAt: null,
        },
      },
    },
  ];

  if (normSlugHyphen !== normSlug) {
    clauses.push({ folderPath: { contains: normSlugHyphen, mode: 'insensitive' as const } });
  }
  if (normSlugUnderscore !== normSlug) {
    clauses.push({ folderPath: { contains: normSlugUnderscore, mode: 'insensitive' as const } });
  }

  return clauses;
}

/**
 * Builds Prisma where input conditions for a resolved dynamic stream (including nested child streams).
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
    const candidateSlugs = Array.from(
      new Set(dynamicCriteria.feedSlugs.flatMap((s) => getCandidateSlugVariants(s)))
    );
    orClauses.push({ feed: { slug: { in: candidateSlugs }, deletedAt: null } });
    orClauses.push({ publicFeed: { slug: { in: candidateSlugs }, deletedAt: null } });
    orClauses.push(
      ...candidateSlugs.map((s) => ({
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

  if (dynamicCriteria.fallbackStreams && dynamicCriteria.fallbackStreams.length > 0) {
    for (const fb of dynamicCriteria.fallbackStreams) {
      orClauses.push(...buildImplicitStreamClauses(fb.slug, fb.title));
    }
  }

  if (orClauses.length > 0) {
    conditions.push({ OR: orClauses });
  } else {
    conditions.push({
      OR: buildImplicitStreamClauses(dynamicCriteria.slug, dynamicCriteria.title),
    });
  }

  return conditions;
}
