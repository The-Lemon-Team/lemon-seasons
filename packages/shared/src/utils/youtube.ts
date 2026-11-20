const YOUTUBE_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

const YOUTUBE_HOSTNAMES = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  'www.youtu.be',
]);

const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

/**
 * Extracts a valid 11-character YouTube video ID from any supported YouTube URL format
 * (watch?v=, youtu.be/, /shorts/, /live/, /embed/, /v/).
 */
export function extractYouTubeVideoId(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTNAMES.has(host)) {
    return null;
  }

  // youtu.be/<id>
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    const firstSegment = parsed.pathname.split('/').filter(Boolean)[0];
    return firstSegment && YOUTUBE_VIDEO_ID_RE.test(firstSegment) ? firstSegment : null;
  }

  // youtube.com/watch?v=<id>
  const vParam = parsed.searchParams.get('v');
  if (vParam && YOUTUBE_VIDEO_ID_RE.test(vParam)) {
    return vParam;
  }

  // youtube.com/(shorts|live|embed|v)/<id>
  const segments = parsed.pathname.split('/').filter(Boolean);
  if (
    segments.length >= 2 &&
    ['shorts', 'live', 'embed', 'v'].includes(segments[0].toLowerCase()) &&
    YOUTUBE_VIDEO_ID_RE.test(segments[1])
  ) {
    return segments[1];
  }

  return null;
}

/**
 * Returns true if the given string is a valid YouTube video URL.
 */
export function isYouTubeUrl(input?: string | null): boolean {
  return extractYouTubeVideoId(input) !== null;
}

export interface ExtractedYouTubeMatch {
  url: string;
  videoId: string;
  canonicalUrl: string;
}

/**
 * Scans arbitrary text (e.g. clipboard contents) and returns the first valid YouTube video URL found.
 */
export function extractFirstYouTubeUrl(text?: string | null): ExtractedYouTubeMatch | null {
  if (!text || typeof text !== 'string') return null;
  const matches = text.match(URL_IN_TEXT_RE);
  if (!matches) return null;

  for (const rawMatch of matches) {
    const cleanUrl = rawMatch.replace(/[),.;!?]+$/, '');
    const videoId = extractYouTubeVideoId(cleanUrl);
    if (videoId) {
      return {
        url: cleanUrl,
        videoId,
        canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    }
  }

  return null;
}

/**
 * Returns a YouTube thumbnail URL for the given video ID and quality level.
 */
export function getYouTubeThumbnailUrl(
  videoId: string,
  quality: 'maxresdefault' | 'sddefault' | 'hqdefault' = 'hqdefault',
): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Formats video duration in seconds as MM:SS or H:MM:SS.
 */
export function formatYouTubeDuration(seconds?: number | null): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
