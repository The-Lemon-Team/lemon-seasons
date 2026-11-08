import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotesQueryBuilder } from './notes-query.builder';

/** Returns the AND conditions produced for a query. */
async function build(query: Record<string, any>, isAdmin = false, prismaOver: Record<string, any> = {}) {
  const prisma = {
    feed: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      ...prismaOver,
    },
  };
  const builder = new NotesQueryBuilder(prisma as any);
  const where = await builder.buildWhereClause(query as any, isAdmin);
  return { and: where.AND as any[], prisma, where };
}

const has = (and: any[], cond: unknown) => and.some((c) => JSON.stringify(c) === JSON.stringify(cond));

describe('NotesQueryBuilder', () => {
  describe('Notes query › baseline', () => {
    it('always excludes soft-deleted notes', async () => {
      const { and } = await build({}, true);
      expect(and[0]).toEqual({ deletedAt: null });
    });
  });

  describe('Notes query › privacy / app-mode gating', () => {
    it("'public' mode shows only public + PUBLISHED, even for admins", async () => {
      const { and } = await build({ appMode: 'public' }, true);
      expect(has(and, { privacy: 'public' })).toBe(true);
      expect(has(and, { status: 'PUBLISHED' })).toBe(true);
    });

    it("'staging' mode shows public notes that are not yet PUBLISHED", async () => {
      const { and } = await build({ appMode: 'staging' }, true);
      expect(has(and, { privacy: 'public' })).toBe(true);
      expect(has(and, { status: { not: 'PUBLISHED' } })).toBe(true);
    });

    it("'dev' mode applies no privacy restriction by default and honours an explicit privacy filter", async () => {
      expect(has((await build({ appMode: 'dev' }, true)).and, { privacy: 'public' })).toBe(false);
      expect(has((await build({ appMode: 'dev', privacy: 'private' }, true)).and, { privacy: 'private' })).toBe(true);
      expect(has((await build({ appMode: 'dev', privacy: 'all' }, true)).and, { privacy: 'all' })).toBe(false);
    });

    it('non-admin callers without an app mode only ever see public + PUBLISHED notes', async () => {
      const { and } = await build({}, false);
      expect(has(and, { privacy: 'public' })).toBe(true);
      expect(has(and, { status: 'PUBLISHED' })).toBe(true);
    });

    it('a non-admin cannot widen visibility by requesting privacy=private', async () => {
      const { and } = await build({ privacy: 'private' }, false);
      expect(has(and, { privacy: 'private' })).toBe(false);
      expect(has(and, { privacy: 'public' })).toBe(true);
    });

    it('an admin without app mode may filter by privacy', async () => {
      const { and } = await build({ privacy: 'private' }, true);
      expect(has(and, { privacy: 'private' })).toBe(true);
      expect(has(and, { privacy: 'public' })).toBe(false);
    });
  });

  describe('Notes query › feed filter', () => {
    it('by feedId: matches the feed itself, the public feed, plus folders and hashtags of that feed', async () => {
      const { and, prisma } = await build({ feedId: 'f1' }, true, {
        findUnique: vi.fn(async () => ({ id: 'f1', folderPaths: ['Spark/AI'], hashtags: ['#AI', 'ml'] })),
      });
      expect(prisma.feed.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'f1' } }));
      const feedCond = and.find((c) => Array.isArray(c.OR) && c.OR.some((o: any) => o.feedId === 'f1'));
      expect(feedCond.OR).toContainEqual({ feedId: 'f1' });
      expect(feedCond.OR).toContainEqual({ publicFeedId: 'f1' });
      expect(feedCond.OR).toContainEqual({ folderPath: { startsWith: 'Spark/AI', mode: 'insensitive' } });
      expect(feedCond.OR).toContainEqual({ hashtags: { some: { name: { in: ['ai', 'ml'] }, deletedAt: null } } });
    });

    it('by feedId for an unknown feed falls back to a plain feedId match', async () => {
      const { and } = await build({ feedId: 'ghost' }, true);
      expect(has(and, { feedId: 'ghost' })).toBe(true);
    });

    it('by feedSlug resolves the feed, ignoring soft-deleted ones', async () => {
      const { prisma } = await build({ feedSlug: 'it-news' }, true);
      expect(prisma.feed.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: 'it-news', deletedAt: null } }));
    });

    it.each([
      ['russian-holidays', ['russian-holidays', 'russian-official', 'russian-military']],
      ['christian-holidays', ['christian-holidays', 'orthodox-holidays']],
      ['orthodox-holidays', ['christian-holidays', 'orthodox-holidays']],
      ['wiki', ['wiki', 'wiki-history', 'wikipedia']],
    ])('legacy slug %s expands to its aliases when the feed does not exist', async (slug, aliases) => {
      const { and } = await build({ feedSlug: slug }, true);
      expect(has(and, { feed: { slug: { in: aliases }, deletedAt: null } })).toBe(true);
    });

    it('an unknown slug falls back to an exact slug match', async () => {
      const { and } = await build({ feedSlug: 'whatever' }, true);
      expect(has(and, { feed: { slug: 'whatever', deletedAt: null } })).toBe(true);
    });

    it('scopes by streamSource when no feedId or feedSlug is specified', async () => {
      const { and } = await build({ streamSource: 'entertainment' }, true);
      const streamCond = and.find((c) => Array.isArray(c.OR) && c.OR.some((o: any) => o.feed?.slug?.in));
      expect(streamCond).toBeDefined();
      expect(streamCond.OR[0].feed.slug.in).toContain('marvel');
      expect(streamCond.OR[0].feed.slug.in).toContain('cinema');
    });

    it('prefers explicit feedSlug over streamSource scoping', async () => {
      const { and } = await build({ streamSource: 'entertainment', feedSlug: 'marvel' }, true);
      expect(has(and, { feed: { slug: { in: ['marvel', 'mcu', 'mcu-radar', 'marvel-cinematic-universe'] }, deletedAt: null } })).toBe(true);
    });

    it('matches notes tagged or fed for a clean custom stream (e.g. jm_daily) when no explicit feeds/tags/folders are attached yet', async () => {
      const streamsService = {
        resolveCriteriaForStream: vi.fn(async () => ({
          streamId: 'st-jm',
          slug: 'jm_daily',
          title: 'Jm Daily',
          privacy: 'public' as const,
          feedIds: [],
          feedSlugs: [],
          tags: [],
          folderPaths: [],
        })),
      };
      const prisma = {
        feed: {
          findUnique: vi.fn(async () => null),
          findFirst: vi.fn(async () => null),
        },
      };
      const builder = new NotesQueryBuilder(prisma as any, streamsService as any);
      const where = await builder.buildWhereClause({ streamSource: 'jm_daily' } as any, true);
      const and = where.AND as any[];
      const streamCond = and.find((c) => Array.isArray(c.OR) && c.OR.some((o: any) => o.hashtags?.some));
      expect(streamCond).toBeDefined();
      expect(streamCond.OR).toContainEqual({
        hashtags: {
          some: {
            name: { in: ['jm_daily', 'jm-daily', 'jm daily'], mode: 'insensitive' },
            deletedAt: null,
          },
        },
      });
    });

    it('feedId takes precedence over feedSlug', async () => {
      const { prisma } = await build({ feedId: 'f1', feedSlug: 's' }, true);
      expect(prisma.feed.findFirst).not.toHaveBeenCalled();
    });

    it('publicFeedId takes precedence over publicFeedSlug', async () => {
      const { and } = await build({ publicFeedId: 'pf', publicFeedSlug: 'x' }, true);
      expect(has(and, { publicFeedId: 'pf' })).toBe(true);
      expect(JSON.stringify(and)).not.toContain('"slug":"x"');
    });
  });

  describe('Notes query › type, status, author', () => {
    it('filters by type', async () => {
      expect(has((await build({ type: 'PERIOD' }, true)).and, { type: 'PERIOD' })).toBe(true);
    });

    it.each(['staging', 'NOT_PUBLISHED', '!PUBLISHED'])('status=%s means "anything but PUBLISHED"', async (status) => {
      expect(has((await build({ status }, true)).and, { status: { not: 'PUBLISHED' } })).toBe(true);
    });

    it('passes a concrete status through', async () => {
      expect(has((await build({ status: 'DRAFT' }, true)).and, { status: 'DRAFT' })).toBe(true);
    });

    it('ignores the status param when an appMode already controls status', async () => {
      expect(has((await build({ status: 'DRAFT', appMode: 'public' }, true)).and, { status: 'DRAFT' })).toBe(false);
    });

    it('author and curator both filter on the author column (case-insensitive)', async () => {
      for (const key of ['author', 'curator']) {
        const { and } = await build({ [key]: 'Alice' }, true);
        const cond = and.find((c) => c.OR?.some((o: any) => o.author?.equals));
        expect(cond.OR).toContainEqual({ author: { equals: 'Alice', mode: 'insensitive' } });
        expect(cond.OR).toContainEqual({ author: { contains: 'Alice', mode: 'insensitive' } });
      }
    });
  });

  describe('Notes query › hashtags and folders', () => {
    it('hashtag filter is normalised (# stripped, lower-cased)', async () => {
      const { and } = await build({ hashtag: '#AI' }, true);
      expect(has(and, { hashtags: { some: { name: 'ai', deletedAt: null } } })).toBe(true);
    });

    it('unfiled notes are those without any folder link', async () => {
      expect(has((await build({ unfiled: true }, true)).and, { folders: { none: {} } })).toBe(true);
    });

    it('folder filters normalise paths (slashes, trimming)', async () => {
      const { and } = await build({ folder: '\\Spark//AI/' }, true);
      expect(has(and, { folders: { some: { folder: { path: 'Spark/AI', deletedAt: null } } } })).toBe(true);
    });

    it('folderPrefix matches both the denormalised folderPath and linked folders', async () => {
      const { and } = await build({ folderPrefix: '/Spark/' }, true);
      const cond = and.find((c) => c.OR?.some((o: any) => o.folderPath?.startsWith === 'Spark'));
      expect(cond).toBeDefined();
      expect(cond.OR).toHaveLength(2);
    });
  });

  describe('Notes query › container privacy', () => {
    it('limits other users to global notes, public containers and their own containers', async () => {
      const { and } = await build({ userId: 'u1' }, true);
      expect(and).toContainEqual({
        OR: [{ containerId: null }, { container: { visibility: 'public' } }, { container: { ownerUserId: 'u1' } }],
      });
    });

    it('anonymous callers (no userId) only get global and public-container notes', async () => {
      const { and } = await build({}, true);
      expect(and).toContainEqual({ OR: [{ containerId: null }, { container: { visibility: 'public' } }] });
    });

    it('containers=a,b,,c is parsed into a trimmed list', async () => {
      const { and } = await build({ containers: ' a, b ,,c' }, true);
      expect(has(and, { containerId: { in: ['a', 'b', 'c'] } })).toBe(true);
    });

    it('containers made only of separators adds no filter', async () => {
      const { and } = await build({ containers: ' , ,' }, true);
      expect(JSON.stringify(and)).not.toContain('"in":[]');
    });

    it.todo(
      'container privacy must not be skippable by passing userId=usr-admin-999 in the query string ' +
        '(userId is a client-supplied QueryNotesDto field, and that id disables the container filter)',
    );
  });

  describe('Notes query › search', () => {
    it('ignores blank search text', async () => {
      const { and } = await build({ search: '   ' }, true);
      expect(JSON.stringify(and)).not.toContain('contains');
    });

    it('searches title, description, feed title, author, hashtags and folder paths', async () => {
      const { and } = await build({ search: ' Hello ' }, true);
      const cond = and.find((c) => c.OR?.some((o: any) => o.title?.contains));
      expect(cond.OR).toContainEqual({ title: { contains: 'Hello', mode: 'insensitive' } });
      expect(cond.OR).toContainEqual({ description: { contains: 'Hello', mode: 'insensitive' } });
      expect(cond.OR).toContainEqual({ feed: { title: { contains: 'Hello', mode: 'insensitive' } } });
      expect(cond.OR).toContainEqual({ author: { contains: 'Hello', mode: 'insensitive' } });
      expect(cond.OR.some((o: any) => o.hashtags?.some?.name?.contains === 'hello')).toBe(true);
      expect(cond.OR.some((o: any) => o.folders?.some?.folder?.path?.contains === 'Hello')).toBe(true);
    });

    it('skips the hashtag clause when the search normalises to an empty tag', async () => {
      const { and } = await build({ search: '!!!' }, true);
      const cond = and.find((c) => c.OR?.some((o: any) => o.title?.contains));
      expect(cond.OR.some((o: any) => o.hashtags)).toBe(false);
    });
  });

  describe('Notes query › date windows', () => {
    it('overlap window includes notes spanning it, single-day notes inside it, and open-ended periods', async () => {
      const { and } = await build({ queryStart: '2026-10-01', queryEnd: '2026-10-31' }, true);
      const start = new Date('2026-10-01');
      const end = new Date('2026-10-31');
      expect(and).toContainEqual({
        startDate: { lte: end },
        OR: [
          { endDate: { gte: start } },
          { endDate: null, startDate: { gte: start } },
          { type: 'PERIOD', endDate: null },
        ],
      });
    });

    it('overlapStart/overlapEnd are aliases for queryStart/queryEnd', async () => {
      const a = (await build({ overlapStart: '2026-10-01', overlapEnd: '2026-10-31' }, true)).and;
      const b = (await build({ queryStart: '2026-10-01', queryEnd: '2026-10-31' }, true)).and;
      expect(a).toEqual(b);
    });

    it('overlap wins over explicit start/end ranges', async () => {
      const { and } = await build({ queryStart: '2026-10-01', queryEnd: '2026-10-31', startDateFrom: '2020-01-01' }, true);
      expect(JSON.stringify(and)).not.toContain('2020-01-01');
    });

    it('a half-open overlap window (only a start) falls back to the range filters', async () => {
      const { and } = await build({ queryStart: '2026-10-01', startDateFrom: '2026-01-01' }, true);
      expect(and).toContainEqual({ startDate: { gte: new Date('2026-01-01') } });
    });

    it('builds startDate / endDate ranges independently', async () => {
      const { and } = await build({ startDateFrom: '2026-01-01', startDateTo: '2026-02-01', endDateTo: '2026-03-01' }, true);
      expect(and).toContainEqual({ startDate: { gte: new Date('2026-01-01'), lte: new Date('2026-02-01') } });
      expect(and).toContainEqual({ endDate: { lte: new Date('2026-03-01') } });
    });
  });

  describe('Notes query › ordering', () => {
    const order = (q: Record<string, any>) => new NotesQueryBuilder({} as any).buildOrderBy(q as any);

    it('defaults to newest startDate first', () => {
      expect(order({})).toEqual([{ startDate: 'desc' }]);
    });

    it.each([
      [{ sortBy: 'title', sortOrder: 'asc' }, [{ title: 'asc' }, { startDate: 'desc' }]],
      [{ sortBy: 'type' }, [{ type: 'desc' }, { startDate: 'desc' }]],
      [{ sortBy: 'folder', sortOrder: 'asc' }, [{ folderPath: { sort: 'asc', nulls: 'last' } }, { startDate: 'desc' }]],
      [{ sortBy: 'startDate', sortOrder: 'asc' }, [{ startDate: 'asc' }, { id: 'desc' }]],
    ])('sorts by %j', (q, expected) => {
      expect(order(q)).toEqual(expected);
    });

    it('treats any sortOrder other than asc as desc', () => {
      expect(order({ sortBy: 'title', sortOrder: 'sideways' })).toEqual([{ title: 'desc' }, { startDate: 'desc' }]);
    });

    it('falls back to the default for unknown sort keys', () => {
      expect(order({ sortBy: 'nope' })).toEqual([{ startDate: 'desc' }]);
    });
  });
});
