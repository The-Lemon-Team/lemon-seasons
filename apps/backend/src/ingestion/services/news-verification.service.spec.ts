import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { NewsVerificationService } from './news-verification.service';
import {
  extractDateFromUrl,
  extractDateFromFilename,
  parseHtmlMetadataDate,
} from './date-extraction.util';

describe('DateExtractionUtil', () => {
  it('extracts date from Russian DD.MM.YY filename format', () => {
    const d = extractDateFromFilename('25.10.26 - Релиз Claude Haiku 5.5.md');
    expect(d).not.toBeNull();
    expect(d?.toISOString().slice(0, 10)).toBe('2026-10-25');
  });

  it('extracts date from ISO YYYY-MM-DD filename format', () => {
    const d = extractDateFromFilename('2026-11-01 - Global Summit.md');
    expect(d).not.toBeNull();
    expect(d?.toISOString().slice(0, 10)).toBe('2026-11-01');
  });

  it('extracts date from URL path with ISO format', () => {
    const d = extractDateFromUrl('https://techcrunch.com/2026/10/24/anthropic-funding/');
    expect(d).not.toBeNull();
    expect(d?.toISOString().slice(0, 10)).toBe('2026-10-24');
  });

  it('extracts date from URL path with English month name', () => {
    const d = extractDateFromUrl('https://aitoolsrecap.com/Blog/ai-news-november-01-2026');
    expect(d).not.toBeNull();
    expect(d?.toISOString().slice(0, 10)).toBe('2026-11-01');
  });

  it('extracts date from URL path with reverse month name', () => {
    const d = extractDateFromUrl('https://site.org/news/15-oct-2026/release-notes');
    expect(d).not.toBeNull();
    expect(d?.toISOString().slice(0, 10)).toBe('2026-10-15');
  });

  it('parses publication date from HTML meta tags', () => {
    const html = `
      <html>
        <head>
          <title>News</title>
          <meta property="article:published_time" content="2026-10-28T10:15:00.000Z" />
        </head>
      </html>
    `;
    const d = parseHtmlMetadataDate(html);
    expect(d).not.toBeNull();
    expect(d?.toISOString()).toBe('2026-10-28T10:15:00.000Z');
  });

  it('parses publication date from Schema.org JSON-LD', () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          "headline": "Title",
          "datePublished": "2026-10-29T08:30:00Z"
        }
      </script>
    `;
    const d = parseHtmlMetadataDate(html);
    expect(d).not.toBeNull();
    expect(d?.toISOString()).toBe('2026-10-29T08:30:00.000Z');
  });
});

describe('NewsVerificationService', () => {
  let service: NewsVerificationService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'GEMINI_API_KEY') return 'test-key';
        return undefined;
      }),
    } as any;

    service = new NewsVerificationService(configService);
  });

  it('prioritizes preserved frontmatter date over filename digest date', async () => {
    const result = await service.verifyNote(
      {
        title: 'Breaking news yesterday',
        fileName: '26.10.26 - Breaking news.md',
        frontmatterDate: '2026-10-25T14:00:00.000Z',
      },
      { fetchWeb: false }
    );

    expect(result.confidence).toBe('EXACT_FRONTMATTER');
    expect(result.eventDate.toISOString().slice(0, 10)).toBe('2026-10-25');
    expect(result.digestDate?.toISOString().slice(0, 10)).toBe('2026-10-26');
  });

  it('extracts date from source URL regex when frontmatter matches digest date', async () => {
    const result = await service.verifyNote(
      {
        title: 'Funding Round',
        fileName: '26.10.26 - Funding.md',
        frontmatterDate: '2026-10-26T07:15:00.000Z',
        sourceLink: 'https://techcrunch.com/2026/10/24/anthropic-funding/',
      },
      { fetchWeb: false }
    );

    expect(result.confidence).toBe('URL_REGEX');
    expect(result.eventDate.toISOString().slice(0, 10)).toBe('2026-10-24');
    expect(result.digestDate?.toISOString().slice(0, 10)).toBe('2026-10-26');
  });

  it('falls back to digest date when no external or earlier date is found', async () => {
    const result = await service.verifyNote(
      {
        title: 'Local Note',
        fileName: '30.10.26 - Local note.md',
        frontmatterDate: '2026-10-30T07:15:00.000Z',
        sourceLink: 'https://example.com/item/12345',
      },
      { fetchWeb: false }
    );

    expect(result.confidence).toBe('DIGEST_FALLBACK');
    expect(result.eventDate.toISOString().slice(0, 10)).toBe('2026-10-30');
  });
});
