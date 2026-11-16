import * as crypto from 'crypto';
import { LemonBusNotePayload, PublishSparkInput } from '../types/bus-contract.types.js';
import { extractSparkRelatedLinks, parseSparkMarkdown } from './markdown-frontmatter.util.js';

export type SparkTimeSlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ALL_DAY';

export interface ResolvedSparkFeedTarget {
  slug: string;
  title: string;
  description: string;
  folderPath: string;
  parentFeedSlug?: string;
  parentFeedTitle?: string;
  parentFeedDescription?: string;
}

export interface ProcessedSparkDocument {
  canonicalPath: string;
  fileName: string;
  folderPath: string;
  contentHash: string;
  timeSlot: SparkTimeSlot;
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
        parentFeedTitle: 'Changelogs & Релизы (Spark)',
        parentFeedDescription: 'Официальные обновления и релизы вендоров: Google, OpenAI, Anthropic',
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
        parentFeedTitle: 'NotebookLM (Spark)',
        parentFeedDescription: 'Аудио-подкасты и аналитические сводки NotebookLM',
      };
    },
  },
];

export function computeContentSha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

export function normalizeCanonicalSparkPath(rawPath: string, watchedDir?: string): {
  canonicalPath: string;
  folderPath: string;
  fileName: string;
} {
  const unified = (rawPath || '').replace(/\\/g, '/').trim();
  let relativeFromSpark: string | null = null;

  if (watchedDir) {
    const normWatched = watchedDir.replace(/\\/g, '/').replace(/\/+$/, '');
    if (unified.toLowerCase().startsWith(normWatched.toLowerCase() + '/')) {
      const rel = unified.slice(normWatched.length + 1).replace(/^\/+/, '');
      relativeFromSpark = `Spark/${rel}`;
    }
  }

  if (!relativeFromSpark) {
    const rootMatch = unified.match(/(?:^|\/)(?:sparks-incoming|sparks|spark)\/(.+)$/i);
    if (rootMatch?.[1]) {
      relativeFromSpark = `Spark/${rootMatch[1].replace(/^\/+/, '')}`;
    } else {
      relativeFromSpark = `Spark/${unified.replace(/^\/+/, '')}`;
    }
  }

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
  frontmatterFeed?: string,
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

  if (frontmatterFeed && frontmatterFeed !== 'news') {
    const safeFeed = frontmatterFeed.toLowerCase().replace(/[^a-z0-9а-яё_-]/gi, '-');
    return {
      slug: `spark-${safeFeed}`,
      title: `Spark — ${frontmatterFeed}`,
      description: `Автоматически импортированные новости и дайджесты (${frontmatterFeed})`,
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
    .replace(/\.[^/.]+$/, '')
    .replace(/^\d{4}-\d{2}-\d{2}\s*[-_]?\s*/, '')
    .replace(/^\d{2}\.\d{2}\.\d{2,4}\s*[-_]?\s*/, '')
    .trim();

  const rawParsedTitle = parsed.title && parsed.title !== 'Untitled Note' ? parsed.title : '';
  const title = rawParsedTitle || cleanFileNameTitle || 'Gemini Spark Note';

  const { startDate, endDate, fileDatePrefix } = resolveSparkDates(fm, fileName, input.mtime);
  const startIso = startDate.toISOString();
  const endIso = endDate ? endDate.toISOString() : null;

  const type = resolveSparkNoteType(fm, title, startDate, endDate);
  const timeSlot = resolveSparkTimeSlot(title, fileName, startDate);

  const slotTags: string[] = [];
  if (timeSlot === 'MORNING') slotTags.push('утро');
  if (timeSlot === 'AFTERNOON') slotTags.push('день');
  if (timeSlot === 'EVENING') slotTags.push('вечер');

  const isDigest =
    title.toLowerCase().includes('дайджест') ||
    title.toLowerCase().includes('свод') ||
    fileName.toLowerCase().includes('digest');
  if (type === 'PERIOD' || isDigest) {
    slotTags.push('сводка', 'дайджест');
  }

  // Enforce AGENTS.md §6: never emit 'jmdaily' in automated Spark ingestion
  const hashtags = Array.from(
    new Set([...parsed.hashtags, ...slotTags, 'gemini-spark'].map((t) => String(t).trim().toLowerCase())),
  ).filter((t) => t && t !== 'jmdaily');

  const summary = extractSparkSummary(fm, parsed.body);

  const rawScore = fm.resonance_score ?? fm.resonanceScore;
  const resonanceScore =
    typeof rawScore === 'number' && !Number.isNaN(rawScore)
      ? rawScore
      : typeof rawScore === 'string' && !Number.isNaN(parseInt(rawScore, 10))
      ? parseInt(rawScore, 10)
      : null;

  const links = Array.isArray(fm.links)
    ? fm.links
        .filter((l: any) => l && typeof l.url === 'string' && l.url.trim().length > 0)
        .map((l: any, idx: number) => ({
          url: l.url.trim(),
          title: l.title || '',
          isSource: Boolean(l.is_source ?? l.isSource ?? idx === 0),
          order: idx,
        }))
    : undefined;

  const relatedResult = extractSparkRelatedLinks(parsed.body, fm);

  const sourceLink =
    links?.find((l) => l.isSource)?.url ||
    ((fm.source || fm.sourceLink || fm.url || relatedResult.extractedSourceLink || null) as string | null);

  const defaultIcon =
    timeSlot === 'MORNING'
      ? '🌅'
      : timeSlot === 'EVENING'
      ? '🌆'
      : timeSlot === 'AFTERNOON'
      ? '☀️'
      : type === 'PERIOD'
      ? '📰'
      : '✨';
  const icon = typeof fm.icon === 'string' && fm.icon.trim() ? fm.icon.trim() : defaultIcon;

  const feedTarget = resolveSparkFeedTarget(
    folderPath,
    input.channelOverride,
    typeof fm.feed === 'string' ? fm.feed : undefined,
  );

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

  const rawPublishAt = fm.publish_at || fm.publishAt;
  const publishAt = rawPublishAt ? safeIsoDate(String(rawPublishAt)) : null;

  const author =
    typeof fm.author === 'string' && fm.author.trim()
      ? fm.author.trim()
      : typeof fm.curator === 'string' && fm.curator.trim()
      ? fm.curator.trim()
      : null;

  const deterministicId = crypto
    .createHash('sha1')
    .update(`spark:${canonicalPath}`)
    .digest('hex')
    .slice(0, 32);
  const formattedUuid = `${deterministicId.slice(0, 8)}-${deterministicId.slice(8, 12)}-4${deterministicId.slice(13, 16)}-a${deterministicId.slice(17, 20)}-${deterministicId.slice(20, 32)}`;

  const notePayload: LemonBusNotePayload = {
    id: formattedUuid,
    title,
    description: relatedResult.cleanedBody || parsed.body || input.contentMarkdown,
    rawContent: input.contentMarkdown,
    summary,
    folderPath,
    status,
    privacy,
    publishAt,
    feedSlug: feedTarget.slug,
    type,
    startDate: startIso,
    endDate: endIso,
    sourceLink,
    sourceType: origin === 'GDRIVE_SPARK' ? 'GOOGLE_DRIVE' : 'SUPABASE_SPARK',
    origin,
    provenance: {
      origin,
      canonicalPath,
      fileHash: contentHash,
      storageProvider: origin === 'GDRIVE_SPARK' ? 'gdrive' : 'supabase',
    },
    author,
    resonanceScore,
    externalId: canonicalPath,
    icon,
    hashtags,
    links,
    fileHash: contentHash,
    metadata: {
      generator: 'gemini-spark',
      fileName,
      filePath: canonicalPath,
      fileHash: contentHash,
      canonicalPath,
      origin,
      subtype: typeof fm.subtype === 'string' ? fm.subtype : undefined,
      timeSlot,
      digestDate: fileDatePrefix || undefined,
      fileSize: input.fileSize,
      fileMtime: input.mtime?.toISOString(),
      relatedNotes: relatedResult.richItems,
      rawRelatedSection: relatedResult.rawRelatedSection,
      feedTitle: feedTarget.title,
      feedDescription: feedTarget.description,
      parentFeedSlug: feedTarget.parentFeedSlug || null,
      parentFeedTitle: feedTarget.parentFeedTitle || null,
      parentFeedDescription: feedTarget.parentFeedDescription || null,
    },
  };

  return {
    canonicalPath,
    fileName,
    folderPath,
    contentHash,
    timeSlot,
    feedTarget,
    notePayload,
    frontmatter: fm,
  };
}

function resolveSparkDates(
  fm: Record<string, any>,
  fileName: string,
  fallbackMtime?: Date,
): { startDate: Date; endDate?: Date; fileDatePrefix?: string } {
  let start: Date | null = null;
  let end: Date | null = null;
  let fileDatePrefix: string | null = null;

  const ruDateMatch = fileName.match(/(\d{2})\.(\d{2})\.(\d{2,4})/);
  if (ruDateMatch) {
    const day = ruDateMatch[1];
    const month = ruDateMatch[2];
    let year = ruDateMatch[3];
    if (year.length === 2) year = `20${year}`;
    fileDatePrefix = `${year}-${month}-${day}`;
  } else {
    const isoDateMatch = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoDateMatch) {
      fileDatePrefix = `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
    }
  }

  const rawEnd = fm.end_date || fm.endDate;
  if (rawEnd) {
    const parsedEnd = new Date(String(rawEnd));
    if (!Number.isNaN(parsedEnd.getTime())) end = parsedEnd;
  }

  const rawEventDate = fm.event_date || fm.eventDate;
  if (rawEventDate) {
    const parsedEvent = new Date(String(rawEventDate));
    if (!Number.isNaN(parsedEvent.getTime())) {
      start = parsedEvent;
    }
  }

  if (!start) {
    const rawStart = fm.start_date || fm.startDate || fm.date;
    if (rawStart) {
      const parsed = new Date(String(rawStart));
      if (!Number.isNaN(parsed.getTime())) {
        if (fileDatePrefix && (!end || end.getTime() <= parsed.getTime())) {
          let hours = parsed.getUTCHours();
          const minutes = String(parsed.getUTCMinutes()).padStart(2, '0');
          const seconds = String(parsed.getUTCSeconds()).padStart(2, '0');
          if (hours >= 21) {
            hours -= 3;
          }
          const hoursStr = String(hours).padStart(2, '0');
          start = new Date(`${fileDatePrefix}T${hoursStr}:${minutes}:${seconds}.000Z`);
        } else {
          start = parsed;
        }
      }
    }
  }

  if (!start && fileDatePrefix) {
    start = new Date(`${fileDatePrefix}T12:00:00.000Z`);
  }

  if (!start) {
    start = fallbackMtime || new Date();
  }

  return {
    startDate: start,
    endDate: end || undefined,
    fileDatePrefix: fileDatePrefix || undefined,
  };
}

function resolveSparkTimeSlot(
  title: string,
  fileName: string,
  startDate: Date,
): SparkTimeSlot {
  const text = `${title} ${fileName}`.toLowerCase();
  if (text.includes('утренн') || text.includes('10_00') || text.includes('10:00')) {
    return 'MORNING';
  }
  if (text.includes('вечерн') || text.includes('18_00') || text.includes('18:00')) {
    return 'EVENING';
  }
  if (
    text.includes('дневн') ||
    text.includes('14_00') ||
    text.includes('14:00') ||
    text.includes('выпуск 1')
  ) {
    return 'AFTERNOON';
  }

  const hour = startDate.getUTCHours();
  if (hour >= 5 && hour < 12) return 'MORNING';
  if (hour >= 12 && hour < 17) return 'AFTERNOON';
  if (hour >= 17) return 'EVENING';
  return 'ALL_DAY';
}

function resolveSparkNoteType(
  fm: Record<string, any>,
  title: string,
  start: Date,
  end?: Date,
): string {
  const lower = title.toLowerCase();
  const isDigest =
    lower.includes('дайджест') ||
    lower.includes('сводка') ||
    lower.includes('сводный') ||
    lower.includes('digest');

  if (isDigest) {
    return 'SINGLE';
  }

  const rawType = String(fm.type || '').toUpperCase();
  if (rawType === 'PERIOD') {
    if (end && end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) {
      return 'PERIOD';
    }
    return 'SINGLE';
  }

  if (['SINGLE', 'EVENT', 'FILM_RELEASE', 'MENTION', 'DONE'].includes(rawType)) {
    return rawType;
  }

  if (end && end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) {
    return 'PERIOD';
  }

  if (
    lower.includes('митап') ||
    lower.includes('конференция') ||
    lower.includes('созвон') ||
    lower.includes('вебинар')
  ) {
    return 'EVENT';
  }

  return 'SINGLE';
}

function safeIsoDate(raw: string): string | null {
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function extractSparkSummary(fm: Record<string, any>, body: string): string {
  if (typeof fm.summary === 'string' && fm.summary.trim()) {
    return fm.summary.trim();
  }
  if (typeof fm.description === 'string' && fm.description.trim()) {
    return fm.description.trim();
  }

  const sectionMatch = body.match(
    /##\s*[^\n]*(?:Суть|Главное|Ключевое)[^\n]*\n+([\s\S]*?)(?=\n##|\n---|$)/i,
  );
  if (sectionMatch?.[1]?.trim()) {
    const cleanSection = sectionMatch[1]
      .split(/\n\s*\n/)[0]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*`_>]/g, '')
      .trim();
    if (cleanSection.length > 0) {
      return cleanSection.length > 280 ? `${cleanSection.slice(0, 277)}...` : cleanSection;
    }
  }

  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.startsWith('#') && !p.startsWith('---') && !p.startsWith('>'));

  if (paragraphs.length > 0) {
    const first = paragraphs[0]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*`_\[\]]/g, '')
      .trim();
    return first.length > 280 ? `${first.slice(0, 277)}...` : first;
  }

  return '';
}
