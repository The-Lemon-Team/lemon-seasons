import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as http from 'http';
import * as https from 'https';
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
  ParsedLinkMetadata,
} from '@lenta/shared';

interface OEmbedResult {
  title?: string;
  authorName?: string;
  authorUrl?: string;
  thumbnailUrl?: string;
}

interface WatchPageResult {
  title?: string;
  description?: string;
  author?: string;
  durationSeconds?: number;
  publishedAt?: string;
  thumbnailUrl?: string;
}

interface CachedThumbnail {
  buffer: Buffer;
  contentType: string;
  expiresAt: number;
}

interface HttpResponseResult {
  ok: boolean;
  status: number;
  contentType: string;
  body: Buffer;
}

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const PRIVATE_OR_LOCAL_HOST_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|::1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|.*\.local)$/i;

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

@Injectable()
export class LinkMetadataService {
  private readonly logger = new Logger(LinkMetadataService.name);
  private readonly proxyAgent?: any;
  private readonly thumbCache = new Map<string, CachedThumbnail>();

  constructor(@Optional() private readonly configService?: ConfigService) {
    const rawProxy =
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      this.configService?.get<string>('HTTPS_PROXY') ||
      this.configService?.get<string>('HTTP_PROXY');

    const proxyUrl = rawProxy?.replace(/^["']|["']$/g, '').trim();
    if (proxyUrl) {
      try {
        const { HttpsProxyAgent } = require('https-proxy-agent');
        this.proxyAgent = new HttpsProxyAgent(proxyUrl);
        this.logger.log(`🌐 Proxy agent enabled for LinkMetadataService (${proxyUrl})`);
      } catch (err: any) {
        this.logger.warn(`Could not initialize proxy agent for LinkMetadataService: ${err?.message}`);
      }
    }
  }

  async parseLink(rawUrl: string): Promise<ParsedLinkMetadata> {
    const trimmed = rawUrl?.trim();
    if (!trimmed) {
      throw new BadRequestException('URL не может быть пустым');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      throw new BadRequestException('Некорректный формат ссылки');
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new BadRequestException('Поддерживаются только http и https ссылки');
    }

    const videoId = extractYouTubeVideoId(trimmed);
    if (videoId) {
      return this.parseYouTubeVideo(videoId);
    }

    return this.parseWebPage(parsedUrl.toString(), parsedUrl.hostname);
  }

  async getYouTubeThumbnail(videoId: string): Promise<{ buffer: Buffer; contentType: string }> {
    if (!YOUTUBE_ID_RE.test(videoId)) {
      throw new BadRequestException('Некорректный YouTube videoId');
    }

    const cached = this.thumbCache.get(videoId);
    if (cached && cached.expiresAt > Date.now()) {
      return { buffer: cached.buffer, contentType: cached.contentType };
    }

    const candidates = [
      getYouTubeThumbnailUrl(videoId, 'maxresdefault'),
      getYouTubeThumbnailUrl(videoId, 'hqdefault'),
      `https://wsrv.nl/?url=i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    ];

    for (const candidateUrl of candidates) {
      try {
        const useProxy = !candidateUrl.includes('wsrv.nl');
        const res = await this.httpRequest(candidateUrl, {
          method: 'GET',
          timeoutMs: 4500,
          useProxy,
        });
        if (res.ok && res.body.length > 0 && res.contentType.startsWith('image/')) {
          if (this.thumbCache.size >= 40) {
            const firstKey = this.thumbCache.keys().next().value;
            if (firstKey) this.thumbCache.delete(firstKey);
          }
          this.thumbCache.set(videoId, {
            buffer: res.body,
            contentType: res.contentType,
            expiresAt: Date.now() + 10 * 60 * 1000,
          });
          return { buffer: res.body, contentType: res.contentType };
        }
      } catch {
        // Try next candidate
      }
    }

    throw new BadRequestException('Не удалось загрузить превью YouTube видео');
  }

  private async parseYouTubeVideo(videoId: string): Promise<ParsedLinkMetadata> {
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const [oEmbedRes, noEmbedRes, watchRes, maxResOk] = await Promise.allSettled([
      this.fetchOEmbedJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`, true),
      this.fetchOEmbedJson(`https://noembed.com/embed?url=${encodeURIComponent(canonicalUrl)}`, false),
      this.fetchYouTubeWatchPage(videoId),
      this.checkImageExists(getYouTubeThumbnailUrl(videoId, 'maxresdefault')),
    ]);

    const oEmbed: OEmbedResult = oEmbedRes.status === 'fulfilled' ? oEmbedRes.value : {};
    const noEmbed: OEmbedResult = noEmbedRes.status === 'fulfilled' ? noEmbedRes.value : {};
    const watch: WatchPageResult = watchRes.status === 'fulfilled' ? watchRes.value : {};
    const hasMaxRes = maxResOk.status === 'fulfilled' && maxResOk.value;

    const rawTitle = watch.title || oEmbed.title || noEmbed.title || `YouTube Video (${videoId})`;
    const title = this.decodeHtmlEntities(rawTitle).replace(/\s+-\s+YouTube$/i, '').trim();

    const fullDescription = watch.description ? this.cleanDescription(watch.description, 2000) : undefined;
    const shortDescription = fullDescription
      ? this.buildShortDescription(fullDescription, 280)
      : undefined;

    const thumbnailUrl = hasMaxRes
      ? getYouTubeThumbnailUrl(videoId, 'maxresdefault')
      : oEmbed.thumbnailUrl || noEmbed.thumbnailUrl || watch.thumbnailUrl || getYouTubeThumbnailUrl(videoId, 'hqdefault');

    const author = watch.author || oEmbed.authorName || noEmbed.authorName || undefined;
    const channelUrl = oEmbed.authorUrl || noEmbed.authorUrl;

    return {
      kind: 'youtube',
      url: canonicalUrl,
      canonicalUrl,
      videoId,
      title,
      shortDescription,
      description: fullDescription,
      thumbnailUrl,
      previewUrl: `/notes/media/youtube-thumb/${videoId}`,
      author,
      channelUrl,
      durationSeconds: watch.durationSeconds,
      publishedAt: watch.publishedAt,
      suggestedHashtags: ['youtube', 'video'],
    };
  }

  private async fetchOEmbedJson(endpoint: string, useProxy: boolean): Promise<OEmbedResult> {
    try {
      const res = await this.httpRequest(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json', 'User-Agent': DESKTOP_USER_AGENT },
        timeoutMs: 4500,
        useProxy,
      });

      if (!res.ok) return {};
      const data = JSON.parse(res.body.toString('utf-8')) as Record<string, any>;
      return {
        title: typeof data.title === 'string' ? data.title : undefined,
        authorName: typeof data.author_name === 'string' ? data.author_name : undefined,
        authorUrl: typeof data.author_url === 'string' ? data.author_url : undefined,
        thumbnailUrl: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : undefined,
      };
    } catch {
      return {};
    }
  }

  private async fetchYouTubeWatchPage(videoId: string): Promise<WatchPageResult> {
    try {
      const res = await this.httpRequest(`https://www.youtube.com/watch?v=${videoId}`, {
        method: 'GET',
        headers: {
          'User-Agent': DESKTOP_USER_AGENT,
          'Accept-Language': 'ru,en;q=0.9',
        },
        timeoutMs: 6500,
        useProxy: true,
      });

      if (!res.ok) return {};

      const html = res.body.toString('utf-8');
      const playerJson = this.extractPlayerResponse(html);
      const videoDetails = playerJson?.videoDetails;
      const microformat = playerJson?.microformat?.playerMicroformatRenderer;
      const og = this.extractMetaTags(html);

      const lengthSecondsRaw = videoDetails?.lengthSeconds
        ? Number(videoDetails.lengthSeconds)
        : undefined;
      const durationSeconds =
        typeof lengthSecondsRaw === 'number' && Number.isFinite(lengthSecondsRaw) && lengthSecondsRaw > 0
          ? lengthSecondsRaw
          : undefined;

      const rawDate = microformat?.publishDate || microformat?.uploadDate;
      let publishedAt: string | undefined;
      if (typeof rawDate === 'string' && rawDate.trim()) {
        const parsed = new Date(rawDate);
        if (!Number.isNaN(parsed.getTime())) {
          publishedAt = parsed.toISOString();
        }
      }

      return {
        title:
          (typeof videoDetails?.title === 'string' && videoDetails.title) ||
          og.title,
        description:
          (typeof videoDetails?.shortDescription === 'string' && videoDetails.shortDescription) ||
          og.description,
        author:
          (typeof videoDetails?.author === 'string' && videoDetails.author) ||
          undefined,
        durationSeconds,
        publishedAt,
        thumbnailUrl: og.image,
      };
    } catch (err: any) {
      this.logger.debug(`Watch page parse failed for ${videoId}: ${err?.message || err}`);
      return {};
    }
  }

  private async checkImageExists(url: string): Promise<boolean> {
    try {
      const res = await this.httpRequest(url, {
        method: 'HEAD',
        timeoutMs: 2500,
        useProxy: true,
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async parseWebPage(url: string, hostname: string): Promise<ParsedLinkMetadata> {
    if (PRIVATE_OR_LOCAL_HOST_RE.test(hostname)) {
      throw new BadRequestException('Парсинг локальных и приватных адресов запрещён');
    }

    try {
      const res = await this.httpRequest(url, {
        method: 'GET',
        headers: {
          'User-Agent': DESKTOP_USER_AGENT,
          'Accept-Language': 'ru,en;q=0.9',
        },
        timeoutMs: 5000,
        useProxy: true,
      });

      if (!res.ok) {
        return { kind: 'webpage', url, canonicalUrl: url, title: hostname };
      }

      const html = res.body.toString('utf-8');
      const og = this.extractMetaTags(html);
      const cleanDesc = og.description ? this.cleanDescription(og.description, 1500) : undefined;

      return {
        kind: 'webpage',
        url,
        canonicalUrl: url,
        title: og.title || hostname,
        shortDescription: cleanDesc ? this.buildShortDescription(cleanDesc, 280) : undefined,
        description: cleanDesc,
        thumbnailUrl: og.image,
      };
    } catch (err: any) {
      this.logger.debug(`Webpage OG parse failed for ${url}: ${err?.message || err}`);
      return { kind: 'webpage', url, canonicalUrl: url, title: hostname };
    }
  }

  private async httpRequest(
    urlStr: string,
    opts: {
      method?: 'GET' | 'HEAD';
      headers?: Record<string, string>;
      timeoutMs?: number;
      useProxy?: boolean;
    },
  ): Promise<HttpResponseResult> {
    const method = opts.method || 'GET';
    const timeoutMs = opts.timeoutMs || 5000;

    if (opts.useProxy && this.proxyAgent) {
      return this.requestWithNodeAgent(urlStr, method, opts.headers || {}, timeoutMs, 3);
    }

    const res = await fetch(urlStr, {
      method,
      headers: opts.headers,
      signal: AbortSignal.timeout(timeoutMs),
    });

    const contentType = res.headers.get('content-type') || '';
    const body = method === 'HEAD' ? Buffer.alloc(0) : Buffer.from(await res.arrayBuffer());
    return {
      ok: res.ok,
      status: res.status,
      contentType,
      body,
    };
  }

  private requestWithNodeAgent(
    urlStr: string,
    method: 'GET' | 'HEAD',
    headers: Record<string, string>,
    timeoutMs: number,
    redirectsLeft: number,
  ): Promise<HttpResponseResult> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(urlStr);
      const lib = parsed.protocol === 'http:' ? http : https;
      const req = lib.request(
        parsed,
        {
          method,
          headers,
          agent: parsed.protocol === 'https:' ? this.proxyAgent : undefined,
          timeout: timeoutMs,
        },
        (res) => {
          const status = res.statusCode || 0;
          const location = res.headers.location;
          if (status >= 300 && status < 400 && location && redirectsLeft > 0) {
            res.resume();
            const nextUrl = new URL(location, parsed).toString();
            this.requestWithNodeAgent(nextUrl, method, headers, timeoutMs, redirectsLeft - 1)
              .then(resolve)
              .catch(reject);
            return;
          }

          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          res.on('end', () => {
            resolve({
              ok: status >= 200 && status < 300,
              status,
              contentType: String(res.headers['content-type'] || ''),
              body: Buffer.concat(chunks),
            });
          });
        },
      );
      req.on('timeout', () => {
        req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
      });
      req.on('error', reject);
      req.end();
    });
  }

  private extractPlayerResponse(html: string): Record<string, any> | null {
    const markers = ['ytInitialPlayerResponse = ', 'ytInitialPlayerResponse='];
    for (const marker of markers) {
      const idx = html.indexOf(marker);
      if (idx === -1) continue;
      const start = html.indexOf('{', idx + marker.length);
      if (start === -1) continue;

      const jsonSlice = this.sliceBalancedJson(html, start);
      if (!jsonSlice) continue;
      try {
        return JSON.parse(jsonSlice);
      } catch {
        // Try next marker
      }
    }
    return null;
  }

  private sliceBalancedJson(text: string, startIndex: number): string | null {
    let depth = 0;
    let inString = false;
    let escaped = false;
    const maxEnd = Math.min(text.length, startIndex + 500_000);

    for (let i = startIndex; i < maxEnd; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          return text.slice(startIndex, i + 1);
        }
      }
    }
    return null;
  }

  private extractMetaTags(html: string): { title?: string; description?: string; image?: string } {
    const pickMeta = (attr: 'property' | 'name', key: string): string | undefined => {
      const forward = new RegExp(
        `<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["'][^>]*>`,
        'i',
      );
      const reverse = new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["'][^>]*>`,
        'i',
      );
      const match = html.match(forward) || html.match(reverse);
      return match?.[1] ? this.decodeHtmlEntities(match[1].trim()) : undefined;
    };

    const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title =
      pickMeta('property', 'og:title') ||
      pickMeta('name', 'twitter:title') ||
      (titleTagMatch?.[1] ? this.decodeHtmlEntities(titleTagMatch[1].trim()) : undefined);

    const description =
      pickMeta('property', 'og:description') ||
      pickMeta('name', 'description') ||
      pickMeta('name', 'twitter:description');

    const image =
      pickMeta('property', 'og:image') ||
      pickMeta('name', 'twitter:image');

    return { title, description, image };
  }

  private cleanDescription(raw: string, maxLength: number): string {
    const normalized = this.decodeHtmlEntities(raw)
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (normalized.length <= maxLength) {
      return normalized;
    }
    return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
  }

  private buildShortDescription(cleaned: string, maxLength: number): string {
    const singleLine = cleaned.replace(/\s+/g, ' ').trim();
    if (singleLine.length <= maxLength) {
      return singleLine;
    }
    const slice = singleLine.slice(0, maxLength - 1);
    const lastSpace = slice.lastIndexOf(' ');
    const cut = lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice;
    return `${cut.trimEnd()}…`;
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&#x27;|&apos;/gi, "'")
      .replace(/&nbsp;/gi, ' ');
  }
}
