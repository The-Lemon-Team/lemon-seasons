import { describe, expect, it } from 'vitest';
import { SparksParserService } from './sparks-parser.service';

const parser = new SparksParserService();

const md = (frontmatter: string, body = '# Title\n\nBody text.') => `---\n${frontmatter}\n---\n${body}`;
const parse = (file: string, content: string, stats?: { mtime?: Date; size?: number }) =>
  parser.parseSparkFile(`spark/${file}`, content, stats);

describe('SparksParserService', () => {
  describe('Spark › title', () => {
    it('uses the first heading', () => {
      expect(parse('31.10.26 - File.md', md('type: SINGLE', '# Real heading\n\ntext')).noteDto.title).toBe('Real heading');
    });

    it('falls back to the file name without the DD.MM.YY prefix and extension', () => {
      const { noteDto } = parse('31.10.26 - Хэллоуин.md', md('type: SINGLE', 'no heading, just text'));
      expect(noteDto.title).toBe('Хэллоуин');
    });

    it('also strips ISO date prefixes from file names', () => {
      const { noteDto } = parse('2026-10-31 Release notes.md', md('type: SINGLE', 'text only'));
      expect(noteDto.title).toBe('Release notes');
    });

    it('uses a generic title when nothing else is available', () => {
      expect(parse('31.10.26.md', md('type: SINGLE', 'text only')).noteDto.title).toBe('Gemini Spark Note');
    });
  });

  describe('Spark › dates (filename date is canonical)', () => {
    it('derives the start date from DD.MM.YY in the file name at noon UTC when frontmatter has none', () => {
      const { noteDto } = parse('31.10.26 - A.md', md('type: SINGLE'));
      expect(noteDto.startDate).toBe('2026-10-31T12:00:00.000Z');
    });

    it('supports 4-digit years in the file name', () => {
      expect(parse('31.10.2026 - A.md', md('type: SINGLE')).noteDto.startDate).toBe('2026-10-31T12:00:00.000Z');
    });

    it('supports ISO dates in the file name', () => {
      expect(parse('2026-10-31 - A.md', md('type: SINGLE')).noteDto.startDate).toBe('2026-10-31T12:00:00.000Z');
    });

    it('keeps the frontmatter time but aligns the calendar day with the file name', () => {
      const { noteDto } = parse('31.10.26 - A.md', md('start_date: 2026-10-30T09:15:30.000Z'));
      expect(noteDto.startDate).toBe('2026-10-31T09:15:30.000Z');
    });

    it('shifts late-evening UTC times back 3h so the Moscow calendar day matches the file name', () => {
      const { noteDto } = parse('31.10.26 - A.md', md('start_date: 2026-10-30T22:00:00.000Z'));
      expect(noteDto.startDate).toBe('2026-10-31T19:00:00.000Z');
    });

    it('uses the frontmatter start date as-is when the file name has no date', () => {
      const { noteDto } = parse('Untitled.md', md('start_date: 2026-05-05T10:00:00.000Z'));
      expect(noteDto.startDate).toBe('2026-05-05T10:00:00.000Z');
    });

    it('accepts startDate and date as aliases', () => {
      expect(parse('x.md', md('startDate: 2026-05-05T10:00:00.000Z')).noteDto.startDate).toBe('2026-05-05T10:00:00.000Z');
      expect(parse('x.md', md('date: 2026-05-06T10:00:00.000Z')).noteDto.startDate).toBe('2026-05-06T10:00:00.000Z');
    });

    it('falls back to the file mtime, then to "now", when no date is known', () => {
      const mtime = new Date('2026-01-02T03:04:05.000Z');
      expect(parse('x.md', md('type: SINGLE'), { mtime }).noteDto.startDate).toBe(mtime.toISOString());
      const before = Date.now();
      const t = new Date(parse('x.md', md('type: SINGLE')).noteDto.startDate).getTime();
      expect(t).toBeGreaterThanOrEqual(before);
    });

    it('ignores an invalid frontmatter date', () => {
      const { noteDto } = parse('31.10.26 - A.md', md('start_date: not-a-date'));
      expect(noteDto.startDate).toBe('2026-10-31T12:00:00.000Z');
    });
  });

  describe('Spark › note type', () => {
    it('is SINGLE by default', () => {
      expect(parse('x.md', md('type: SINGLE')).noteDto.type).toBe('SINGLE');
      expect(parse('x.md', md('title: nothing')).noteDto.type).toBe('SINGLE');
    });

    it('is PERIOD only when marked PERIOD AND the span exceeds 24h', () => {
      const fm = (end: string) => `type: PERIOD\nstart_date: 2026-10-01T00:00:00.000Z\nend_date: ${end}`;
      expect(parse('x.md', md(fm('2026-10-05T00:00:00.000Z'))).noteDto.type).toBe('PERIOD');
      expect(parse('x.md', md(fm('2026-10-01T12:00:00.000Z'))).noteDto.type).toBe('SINGLE');
    });

    it('a marked PERIOD without an end date is demoted to SINGLE', () => {
      expect(parse('x.md', md('type: PERIOD\nstart_date: 2026-10-01T00:00:00.000Z')).noteDto.type).toBe('SINGLE');
    });

    it('infers PERIOD from a multi-day end date even without an explicit type', () => {
      const fm = 'start_date: 2026-10-01T00:00:00.000Z\nend_date: 2026-10-10T00:00:00.000Z';
      expect(parse('x.md', md(fm)).noteDto.type).toBe('PERIOD');
    });

    it('honours other valid explicit types', () => {
      expect(parse('x.md', md('type: EVENT')).noteDto.type).toBe('EVENT');
    });

    it.each(['Дайджест недели', 'Сводка дня', 'Weekly Digest'])(
      'digests are always SINGLE, even if marked PERIOD (%s)',
      (title) => {
        const fm = 'type: PERIOD\nstart_date: 2026-10-01T00:00:00.000Z\nend_date: 2026-10-10T00:00:00.000Z';
        expect(parse('x.md', md(fm, `# ${title}\n\ntext`)).noteDto.type).toBe('SINGLE');
      },
    );

    it('guesses EVENT from meetup-like titles', () => {
      expect(parse('x.md', md('tags: [x]', '# Митап по Rust\n\ntext')).noteDto.type).toBe('EVENT');
    });
  });

  describe('Spark › time slot and icon', () => {
    it.each([
      ['Утренний выпуск', 'MORNING', '🌅'],
      ['Вечерний выпуск', 'EVENING', '🌆'],
      ['Дневной выпуск', 'AFTERNOON', '☀️'],
    ])('title "%s" → %s', (title, slot, icon) => {
      const r = parse('x.md', md('type: SINGLE', `# ${title}\n\ntext`));
      expect(r.timeSlot).toBe(slot);
      expect(r.noteDto.icon).toBe(icon);
    });

    it('falls back to the UTC hour of the start date', () => {
      const at = (h: number) => parse('x.md', md(`start_date: 2026-05-05T${String(h).padStart(2, '0')}:00:00.000Z`)).timeSlot;
      expect(at(8)).toBe('MORNING');
      expect(at(13)).toBe('AFTERNOON');
      expect(at(18)).toBe('EVENING');
      expect(at(3)).toBe('ALL_DAY');
    });

    it('frontmatter icon overrides the default', () => {
      expect(parse('x.md', md('icon: 🚀')).noteDto.icon).toBe('🚀');
    });

    it('adds the matching slot hashtag', () => {
      expect(parse('x.md', md('type: SINGLE', '# Утренний выпуск\n\ntext')).noteDto.hashtags).toContain('утро');
    });
  });

  describe('Spark › hashtags (AGENTS.md §6)', () => {
    it('always tags generated notes with gemini-spark', () => {
      expect(parse('x.md', md('type: SINGLE')).noteDto.hashtags).toContain('gemini-spark');
    });

    it('NEVER emits jmdaily, from frontmatter tags (any casing) or from the body', () => {
      const r = parse('x.md', md('tags: [jmdaily, JMDaily, ai]', '# T\n\nText #jmdaily #JMDAILY #news'));
      const tags = r.noteDto.hashtags.map((t: string) => t.toLowerCase());
      expect(tags).not.toContain('jmdaily');
      expect(r.suggestedTags.map((t) => t.toLowerCase())).not.toContain('jmdaily');
      expect(tags).toContain('ai');
    });

    it('de-duplicates tags from frontmatter, body and slot rules', () => {
      const tags = parse('x.md', md('tags: [ai, ai]', '# T\n\ntext #ai')).noteDto.hashtags;
      expect(tags.filter((t: string) => t === 'ai')).toHaveLength(1);
    });

    it('marks digests with the сводка/дайджест tags', () => {
      const tags = parse('x.md', md('type: SINGLE', '# Дайджест недели\n\ntext')).noteDto.hashtags;
      expect(tags).toEqual(expect.arrayContaining(['сводка', 'дайджест']));
    });
  });

  describe('Spark › frontmatter whitelist', () => {
    it('never emits system fields (feed, lenta_id) on the note DTO', () => {
      const { noteDto } = parse('x.md', md('feed: it-news\nlenta_id: abc-123'));
      expect(noteDto).not.toHaveProperty('feed');
      expect(noteDto).not.toHaveProperty('feedId');
      expect(noteDto).not.toHaveProperty('lenta_id');
      expect(noteDto).not.toHaveProperty('lentaId');
    });

    it('defaults privacy to private and honours an explicit privacy', () => {
      expect(parse('x.md', md('type: SINGLE')).noteDto.privacy).toBe('private');
      expect(parse('x.md', md('privacy: public')).noteDto.privacy).toBe('public');
    });

    it.each([
      ['draft', 'DRAFT'],
      ['SCHEDULED', 'SCHEDULED'],
      ['Archived', 'ARCHIVED'],
      ['whatever', 'PUBLISHED'],
    ])('status %s → %s', (raw, expected) => {
      expect(parse('x.md', md(`status: ${raw}`)).noteDto.status).toBe(expected);
    });

    it('parses publish_at and drops invalid values', () => {
      expect(parse('x.md', md('publish_at: 2026-11-01T10:00:00Z')).noteDto.publishAt).toBe('2026-11-01T10:00:00.000Z');
      expect(parse('x.md', md('publish_at: garbage')).noteDto.publishAt).toBeUndefined();
    });

    it('reads resonance_score as number or numeric string', () => {
      expect(parse('x.md', md('resonance_score: 87')).noteDto.resonanceScore).toBe(87);
      expect(parse('x.md', md('resonanceScore: "42"')).noteDto.resonanceScore).toBe(42);
      expect(parse('x.md', md('resonance_score: high')).noteDto.resonanceScore).toBeUndefined();
    });

    it('author falls back to curator', () => {
      expect(parse('x.md', md('curator: Bob')).noteDto.author).toBe('Bob');
      expect(parse('x.md', md('author: Al\ncurator: Bob')).noteDto.author).toBe('Al');
    });
  });

  describe('Spark › links and source', () => {
    it('keeps only links with a url, flags the first as source, and uses it as sourceLink', () => {
      const fm = 'links:\n  - url: https://a.example\n    title: A\n  - url: ""\n  - url: https://b.example';
      const { noteDto } = parse('x.md', md(fm));
      expect(noteDto.links).toEqual([
        { url: 'https://a.example', title: 'A', isSource: true, order: 0 },
        { url: 'https://b.example', title: '', isSource: false, order: 1 },
      ]);
      expect(noteDto.sourceLink).toBe('https://a.example');
    });

    it('falls back to source / sourceLink / url frontmatter', () => {
      expect(parse('x.md', md('source: https://s.example')).noteDto.sourceLink).toBe('https://s.example');
    });
  });

  describe('Spark › summary', () => {
    it('prefers frontmatter summary, then description', () => {
      expect(parse('x.md', md('summary: " From FM "')).summary).toBe('From FM');
      expect(parse('x.md', md('description: From description')).summary).toBe('From description');
    });

    it('extracts the "Суть" section and strips markdown', () => {
      const body = '# T\n\n## 📌 Суть события\n\nЭто **важно** и [ссылка](https://x.y).\n\n## Другое\n\nignored';
      expect(parse('x.md', md('type: SINGLE', body)).summary).toBe('Это важно и ссылка.');
    });

    it('falls back to the first plain paragraph and truncates to 280 chars', () => {
      const long = 'a'.repeat(400);
      const summary = parse('x.md', md('type: SINGLE', `# T\n\n> quote\n\n${long}`)).summary;
      expect(summary).toHaveLength(280);
      expect(summary.endsWith('...')).toBe(true);
    });

    it('returns an empty summary for an empty body', () => {
      expect(parse('x.md', md('type: SINGLE', '# Only heading')).summary).toBe('');
    });
  });

  describe('Spark › provenance metadata', () => {
    it('records source type, external id and file info', () => {
      const mtime = new Date('2026-10-31T10:00:00Z');
      const { noteDto } = parse('31.10.26 - A.md', md('subtype: news'), { mtime, size: 123 });
      expect(noteDto).toMatchObject({
        sourceType: 'GOOGLE_DRIVE',
        externalId: 'spark/31.10.26 - A.md',
        processingStatus: 'COMPLETED',
      });
      expect(noteDto.metadata).toMatchObject({
        generator: 'gemini-spark',
        fileName: '31.10.26 - A.md',
        subtype: 'news',
        fileSize: 123,
        fileMtime: mtime.toISOString(),
      });
    });
  });
});
