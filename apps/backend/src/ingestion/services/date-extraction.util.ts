/**
 * Deterministic date extraction and web metadata scraping utilities
 * for Project Lenta news verification.
 */

const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  // Russian months
  января: 1, февраля: 2, марта: 3, апреля: 4, мая: 5, июня: 6,
  июля: 7, августа: 8, сентября: 9, октября: 10, ноября: 11, декабря: 12,
  янв: 1, фев: 2, мар: 3, апр: 4, июн: 6, июл: 7, авг: 8, сен: 9, окт: 10, ноя: 11, дек: 12,
};

export type VerificationConfidence =
  | 'EXACT_FRONTMATTER'
  | 'URL_REGEX'
  | 'SCRAPED_METADATA'
  | 'AI_VERIFIED'
  | 'DIGEST_FALLBACK';

export interface ExtractedDateInfo {
  eventDate: Date;
  confidence: VerificationConfidence;
  authenticityScore: number;
  sourcePublishedAt?: Date;
  reason: string;
}

/**
 * Extracts a date from a filename in Russian (DD.MM.YY) or ISO format (YYYY-MM-DD).
 */
export function extractDateFromFilename(fileName: string): Date | null {
  if (!fileName) return null;
  const ruMatch = fileName.match(/(\d{2})\.(\d{2})\.(\d{2,4})/);
  if (ruMatch) {
    const day = parseInt(ruMatch[1], 10);
    const month = parseInt(ruMatch[2], 10);
    let year = parseInt(ruMatch[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }

  const isoMatch = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }
  return null;
}

/**
 * Extracts a date embedded in a URL path (e.g. /2026/10/24/ or ai-news-november-01-2026).
 */
export function extractDateFromUrl(url?: string | null): Date | null {
  if (!url) return null;

  // 1. ISO format: 2026/10/24 or 2026-10-24 or 2026_10_24
  const isoMatch = url.match(/(?:^|[^0-9])(202[4-9])[/-](0[1-9]|1[0-2])[/-](0[1-9]|[12]\d|3[01])(?:[^0-9]|$)/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  // 2. Month-DD-YYYY or Month-D-YYYY: november-01-2026, nov-1-2026
  const monthNameMatch = url.match(
    /(?:^|[^a-zа-я0-9])([a-zа-я]{3,9})[-_](0?[1-9]|[12]\d|3[01])[-_](202[4-9])(?:[^0-9]|$)/i
  );
  if (monthNameMatch) {
    const monthKey = monthNameMatch[1].toLowerCase();
    const month = MONTH_MAP[monthKey];
    if (month) {
      const day = parseInt(monthNameMatch[2], 10);
      const year = parseInt(monthNameMatch[3], 10);
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }

  // 3. DD-Month-YYYY: 01-november-2026, 24-oct-2026
  const reverseMonthMatch = url.match(
    /(?:^|[^a-zа-я0-9])(0?[1-9]|[12]\d|3[01])[-_]([a-zа-я]{3,9})[-_](202[4-9])(?:[^0-9]|$)/i
  );
  if (reverseMonthMatch) {
    const monthKey = reverseMonthMatch[2].toLowerCase();
    const month = MONTH_MAP[monthKey];
    if (month) {
      const day = parseInt(reverseMonthMatch[1], 10);
      const year = parseInt(reverseMonthMatch[3], 10);
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }

  return null;
}

/**
 * Parses article publication dates from HTML snippet (meta tags, JSON-LD, time element).
 */
export function parseHtmlMetadataDate(html?: string | null): Date | null {
  if (!html) return null;

  // 1. Meta tags: article:published_time, pubdate, publishdate, og:published_time
  const metaRegexes = [
    /<meta[^>]+(?:property|name)=["'](?:article:published_time|pubdate|publishdate|og:published_time|parsely-pub-date)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:article:published_time|pubdate|publishdate|og:published_time|parsely-pub-date)["']/i,
  ];

  for (const regex of metaRegexes) {
    const m = html.match(regex);
    if (m && m[1]) {
      const d = new Date(m[1].trim());
      if (!isNaN(d.getTime()) && isValidPublicationYear(d)) return d;
    }
  }

  // 2. Schema.org JSON-LD datePublished
  const jsonLdMatch = html.match(/["']datePublished["']\s*:\s*["']([^"']+)["']/i);
  if (jsonLdMatch && jsonLdMatch[1]) {
    const d = new Date(jsonLdMatch[1].trim());
    if (!isNaN(d.getTime()) && isValidPublicationYear(d)) return d;
  }

  // 3. <time datetime="..."> tag
  const timeMatch = html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  if (timeMatch && timeMatch[1]) {
    const d = new Date(timeMatch[1].trim());
    if (!isNaN(d.getTime()) && isValidPublicationYear(d)) return d;
  }

  return null;
}

/**
 * Validates that parsed date is plausible for our catalog (2020 to 2030).
 */
function isValidPublicationYear(date: Date): boolean {
  const year = date.getUTCFullYear();
  return year >= 2020 && year <= 2030;
}

/**
 * Fast web metadata fetcher that downloads only the initial chunk (up to 25KB)
 * to locate <head> meta tags without downloading large images or heavy scripts.
 */
export async function fetchUrlMetadataDate(
  url: string,
  timeoutMs = 4000
): Promise<Date | null> {
  if (!url || !url.startsWith('http')) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    // Check Last-Modified header first
    const lastModified = res.headers.get('last-modified');
    let headerDate: Date | null = null;
    if (lastModified) {
      const parsedHeader = new Date(lastModified);
      if (!isNaN(parsedHeader.getTime()) && isValidPublicationYear(parsedHeader)) {
        headerDate = parsedHeader;
      }
    }

    // Read initial stream chunks (max 30KB)
    if (!res.body) return headerDate;

    const reader = res.body.getReader();
    let accumulated = '';
    const decoder = new TextDecoder('utf-8');

    while (accumulated.length < 32000) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
      // If we crossed </head>, we have all metadata
      if (accumulated.includes('</head>') || accumulated.includes('</HEAD>')) {
        break;
      }
    }

    reader.cancel().catch(() => {});

    const parsedMeta = parseHtmlMetadataDate(accumulated);
    return parsedMeta || headerDate;
  } catch {
    return null;
  }
}
