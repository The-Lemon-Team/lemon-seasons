import * as crypto from 'crypto';
import { LemonBusNotePayload, PublishSparkInput } from '../types/bus-contract.types.js';
import { parseSparkMarkdown } from './markdown-frontmatter.util.js';

export interface ResolvedSparkFeedTarget {
  slug: string;
  title: string;
  description: string;
  folderPath: string;
  parentFeedSlug?: string;
}

export interface ProcessedSparkDocument {
  canonicalPath: string;
  fileName: string;
  folderPath: string;
  contentHash: string;
  feedTarget: ResolvedSparkFeedTarget;
  notePayload: LemonBusNotePayload;
  frontmatter: Record<string, any>;
}

const FOLDER_FEED_RULES: Array<{
  match: (lowerFolder: string, parts: string[]) => boolean;
  resolve: (parts: string[], folderPath: string) => ResolvedSparkFeedTarget;
}> = [
  {
    match: (lower) => lower.includes('рф и украина') || lower.includes('rf-and-ukraine'),
    resolve: (_parts, folderPath) => ({
      slug: 'spark-рф-и-украина',
      title: 'РФ и Украина (Spark)',
      description: 'Хроника событий, дипломатии и сводок от Spark',
      folderPath,
    }),
  },
  {
    match: (_lower, parts) => parts.length > 1 && parts[1].toLowerCase() === 'youtube',
    resolve: (parts, folderPath) => {
      const sub = parts[2] || 'oneday';
      const cleanSub = sub.charAt(0).toUpperCase() + sub.slice(1);
      return {
        slug: `spark-youtube-${sub.toLowerCase()}`,
        title: `YouTube • ${cleanSub} (Spark)`,
        description: `Аналитические видео-обзоры и выжимки YouTube (${cleanSub})`,
        folderPath,
      };
    },
  },
  {
    match: (_lower, parts) => parts.length > 2 && parts[1].toLowerCase() === 'changelogsfeed',
    resolve: (parts, folderPath) => {
      const subtopic = parts[2];
      const safeSub = subtopic.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '-');
      return {
        slug: `spark-changelogsfeed-${safeSub}`,
        title: `${subtopic.charAt(0).toUpperCase() + subtopic.slice(1)} (Changelogs)`,
        description: `Официальные обновления и релизы ${subtopic} из каталога Changelogs`,
        folderPath,
        parentFeedSlug: 'spark-changelogsfeed',
      };
    },
  },
  {
    match: (_lower, parts) => parts.length > 2 && parts[1].toLowerCase() === 'notebooklmai',
    resolve: (parts, folderPath) => {
      const subtopic = parts[2];
      const safeSub = subtopic.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '-');
      return {
        slug: `spark-notebooklmai-${safeSub}`,
        title: `${subtopic.charAt(0).toUpperCase() + subtopic.slice(1)} (NotebookLM)`,
        description: `Аудио-подкасты и аналитические сводки NotebookLM (${subtopic})`,
        folderPath,
        parentFeedSlug: 'spark-notebooklmai',
      };
    },
  },
];

export function computeContentSha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

export function normalizeCanonicalSparkPath(rawPath: string): {
  canonicalPath: string;
  folderPath: string;
  fileName: string;
} {
  const unified = rawPath.replace(/\\/g, '/').replace(/^\/+/, '').trim();
  const sparkIdx = unified.toLowerCase().indexOf('spark/');
  const relativeFromSpark = sparkIdx >= 0 ? unified.slice(sparkIdx) : `Spark/${unified}`;
  const segments = relativeFromSpark.split('/').filter(Boolean);

  if (segments.length > 0 && segments[0].toLowerCase() === 'spark') {
    segments[0] = 'Spark';
  } else {
    segments.unshift('Spark');
  }

  const fileName = segments[segments.length - 1] || 'Untitled.md';
  const folderSegments = segments.slice(0, -1);
  const folderPath = folderSegments.length > 0 ? folderSegments.join('/') : 'Spark';

  return {
    canonicalPath: `${folderPath}/${fileName}`,
    folderPath,
    fileName,
  };
}

export function resolveSparkFeedTarget(
  folderPath: string,
  channelOverride?: PublishSparkInput['channelOverride'],
): ResolvedSparkFeedTarget {
  if (channelOverride?.slug) {
    return {
      slug: channelOverride.slug,
      title: channelOverride.title || channelOverride.slug,
      description: channelOverride.description || `Канал Spark (${channelOverride.slug})`,
      folderPath,
    };
  }

  const parts = folderPath.split('/').filter(Boolean);
  const lowerFolder = folderPath.toLowerCase();

  const matchedRule = FOLDER_FEED_RULES.find((r) => r.match(lowerFolder, parts));
  if (matchedRule) {
    return matchedRule.resolve(parts, folderPath);
  }

  const subfolder = parts.length > 1 ? parts[1] : null;
  if (subfolder && subfolder.toLowerCase() !== 'spark') {
    const safe = subfolder.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '-');
    return {
      slug: `spark-${safe}`,
      title: `${subfolder} (Spark)`,
      description: `Тематическая новостная лента по категории ${subfolder} от Spark`,
      folderPath,
    };
  }

  return {
    slug: 'spark-general',
    title: 'Spark — Общая лента',
    description: 'Автоматически импортированные новости и дайджесты Spark',
    folderPath,
  };
}

/**
 * Unified, pure Spark Markdown Processor.
 * Enforces SPARK_GENERATION_RULES.md & AGENTS.md:
 * - Preserves event_date / start_date vs filename DD.MM.YY digest prefix
 * - Strips system fields and never emits reserved 'jmdaily' tag automatically
 * - Enforces binary privacy ('public' | 'private')
 * - Sets explicit NoteProvenance ('SUPABASE_SPARK' or 'GDRIVE_SPARK')
 */
export function processSparkDocument(input: PublishSparkInput): ProcessedSparkDocument {
  const { canonicalPath, folderPath, fileName } = normalizeCanonicalSparkPath(input.virtualPath);
  const contentHash = computeContentSha256(input.contentMarkdown);
  const parsed = parseSparkMarkdown(input.contentMarkdown);
  const fm = parsed.frontmatter;
  const origin = input.origin || 'SUPABASE_SPARK';

  const cleanFileNameTitle = fileName
    .replace(/\.md$/i, '')
    .replace(/^\d{4}-\d{2}-\d{2}\s*[-_]?\s*/, '')
    .replace(/^\d{2}\.\d{2}\.\d{2,4}\s*[-_]?\s*/, '')
    .trim();

  const title = parsed.title || cleanFileNameTitle || 'Gemini Spark Note';
  const startDate = resolveSparkStartDate(fm, fileName, input.mtime);
  const endDate = typeof fm.end_date === 'string'
    ? safeIsoDate(fm.end_date)
    : typeof fm.endDate === 'string'
    ? safeIsoDate(fm.endDate)
    : null;

  const rawType = String(fm.type || '').toUpperCase();
  const type = ['SINGLE', 'PERIOD', 'EVENT', 'FILM_RELEASE', 'MENTION', 'DONE'].includes(rawType)
    ? rawType
    : endDate
    ? 'PERIOD'
    : 'SINGLE';

  const feedTarget = resolveSparkFeedTarget(folderPath, input.channelOverride);

  const isChangelogNote =
    folderPath.toLowerCase().includes('changelog') ||
    feedTarget.slug.includes('changelog');

  const privacy: 'public' | 'private' =
    input.privacyOverride ||
    (fm.privacy === 'private'
      ? 'private'
      : fm.privacy === 'public' || isChangelogNote
      ? 'public'
      : 'private');

  const status = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'].includes(
    String(fm.status || '').toUpperCase(),
  )
    ? String(fm.status).toUpperCase()
    : 'PUBLISHED';

  // Enforce AGENTS.md §6: never emit 'jmdaily' in automated Spark ingestion
  const hashtags = Array.from(
    new Set([...parsed.hashtags, 'gemini-spark'].map((t) => t.toLowerCase())),
  ).filter((t) => t && t !== 'jmdaily');

  const summary =
    typeof fm.summary === 'string' && fm.summary.trim()
      ? fm.summary.trim()
      : extractFirstParagraphSummary(parsed.body);

  const deterministicId = crypto
    .createHash('sha1')
    .update(`spark:${canonicalPath}`)
    .digest('hex')
    .slice(0, 32);
  const formattedUuid = `${deterministicId.slice(0, 8)}-${deterministicId.slice(8, 12)}-4${deterministicId.slice(13, 16)}-a${deterministicId.slice(17, 20)}-${deterministicId.slice(20, 32)}`;

  const notePayload: LemonBusNotePayload = {
    id: formattedUuid,
    title,
    description: parsed.body || input.contentMarkdown,
    rawContent: input.contentMarkdown,
    summary,
    folderPath,
    status,
    privacy,
    feedSlug: feedTarget.slug,
    type,
    startDate,
    endDate,
    sourceLink: (fm.source || fm.sourceLink || fm.url || null) as string | null,
    sourceType: origin === 'GDRIVE_SPARK' ? 'GOOGLE_DRIVE' : 'SUPABASE_SPARK',
    origin,
    provenance: {
      origin,
      canonicalPath,
      fileHash: contentHash,
      storageProvider: origin === 'GDRIVE_SPARK' ? 'gdrive' : 'supabase',
    },
    author: typeof fm.author === 'string' ? fm.author : null,
    externalId: canonicalPath,
    icon: typeof fm.icon === 'string' ? fm.icon : '✨',
    hashtags,
    fileHash: contentHash,
    metadata: {
      fileHash: contentHash,
      canonicalPath,
      origin,
      parentFeedSlug: feedTarget.parentFeedSlug || null,
    },
  };

  return {
    canonicalPath,
    fileName,
    folderPath,
    contentHash,
    feedTarget,
    notePayload,
    frontmatter: fm,
  };
}

function resolveSparkStartDate(
  fm: Record<string, any>,
  fileName: string,
  mtime?: Date,
): string {
  const candidates = [fm.event_date, fm.start_date, fm.startDate, fm.date];
  for (const c of candidates) {
    if (c) {
      const iso = safeIsoDate(String(c));
      if (iso) return iso;
    }
  }

  // Filename format DD.MM.YY - <Title>.md
  const ddmmyy = fileName.match(/^(\d{2})\.(\d{2})\.(\d{2,4})/);
  if (ddmmyy) {
    const day = Number(ddmmyy[1]);
    const month = Number(ddmmyy[2]) - 1;
    const rawYear = Number(ddmmyy[3]);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const dt = new Date(Date.UTC(year, month, day, 9, 0, 0));
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }

  return (mtime || new Date()).toISOString();
}

function safeIsoDate(raw: string): string | null {
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function extractFirstParagraphSummary(body: string): string | null {
  const quoteMatch = body.match(/^>\s+(.+)$/m);
  if (quoteMatch?.[1]) return quoteMatch[1].trim().slice(0, 240);

  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('#'));

  if (paragraphs[0]) {
    return paragraphs[0].replace(/^[#*>\s-]+/, '').trim().slice(0, 220);
  }
  return null;
}
