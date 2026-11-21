import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { LinkMetadataService } from './link-metadata.service';

describe('LinkMetadataService', () => {
  let service: LinkMetadataService;
  const origHttpsProxy = process.env.HTTPS_PROXY;
  const origHttpProxy = process.env.HTTP_PROXY;

  beforeEach(() => {
    delete process.env.HTTPS_PROXY;
    delete process.env.HTTP_PROXY;
    service = new LinkMetadataService();
  });

  afterEach(() => {
    if (origHttpsProxy !== undefined) process.env.HTTPS_PROXY = origHttpsProxy;
    if (origHttpProxy !== undefined) process.env.HTTP_PROXY = origHttpProxy;
    vi.restoreAllMocks();
  });

  it('rejects empty or invalid URLs', async () => {
    await expect(service.parseLink('')).rejects.toThrow(BadRequestException);
    await expect(service.parseLink('not-a-url')).rejects.toThrow(BadRequestException);
    await expect(service.parseLink('ftp://example.com/file')).rejects.toThrow(BadRequestException);
  });

  it('rejects private/localhost URLs for generic webpage parsing', async () => {
    await expect(service.parseLink('http://localhost:3000/secret')).rejects.toThrow(BadRequestException);
    await expect(service.parseLink('http://127.0.0.1:8080/admin')).rejects.toThrow(BadRequestException);
    await expect(service.parseLink('http://192.168.1.1/')).rejects.toThrow(BadRequestException);
  });

  it('parses YouTube video title, short description, author, duration, and maxres preview', async () => {
    const playerResponse = {
      videoDetails: {
        title: 'Building Modular AI Agents in 2026',
        shortDescription:
          'Deep dive into modular agent architectures and fast tool orchestration.\n\n00:00 Intro\n05:00 Demo',
        author: 'Tech Channel',
        lengthSeconds: '754',
      },
      microformat: {
        playerMicroformatRenderer: {
          publishDate: '2026-10-15',
        },
      },
    };

    const html = `<html><head><title>Building Modular AI Agents in 2026 - YouTube</title></head><script>var ytInitialPlayerResponse = ${JSON.stringify(
      playerResponse,
    )};</script></html>`;

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any, init?: any) => {
      const url = String(input);
      if (url.includes('youtube.com/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Building Modular AI Agents in 2026',
            author_name: 'Tech Channel',
            author_url: 'https://www.youtube.com/@techchannel',
            thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('youtube.com/watch?v=dQw4w9WgXcQ')) {
        return new Response(html, { status: 200 });
      }
      if (url.includes('maxresdefault.jpg') && init?.method === 'HEAD') {
        return new Response(null, { status: 200 });
      }
      return new Response(null, { status: 404 });
    });

    const result = await service.parseLink('https://youtu.be/dQw4w9WgXcQ?t=45');

    expect(fetchMock).toHaveBeenCalled();
    expect(result).toMatchObject({
      kind: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Building Modular AI Agents in 2026',
      author: 'Tech Channel',
      channelUrl: 'https://www.youtube.com/@techchannel',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      durationSeconds: 754,
      suggestedHashtags: ['youtube', 'video'],
    });
    expect(result.shortDescription).toContain('Deep dive into modular agent architectures');
    expect(result.publishedAt).toBe('2026-10-15T00:00:00.000Z');
  });

  it('falls back to oEmbed thumbnail when maxresdefault returns 404 and watch page fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.includes('youtube.com/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Fallback Video Title',
            author_name: 'Fallback Author',
            thumbnail_url: 'https://i.ytimg.com/vi/AbCdEf12345/hqdefault.jpg',
          }),
          { status: 200 },
        );
      }
      return new Response(null, { status: 404 });
    });

    const result = await service.parseLink('https://www.youtube.com/shorts/AbCdEf12345');

    expect(result).toMatchObject({
      kind: 'youtube',
      videoId: 'AbCdEf12345',
      title: 'Fallback Video Title',
      author: 'Fallback Author',
      thumbnailUrl: 'https://i.ytimg.com/vi/AbCdEf12345/hqdefault.jpg',
    });
  });

  it('ignores generic YouTube homepage title/description on bot-gated watch pages and uses oEmbed + youtubei/v1/next', async () => {
    const gatedHtml = `<html><head>
      <title> - YouTube</title>
      <meta name="description" content="Смотрите любимые видео, слушайте любимые песни, загружайте собственные ролики и делитесь ими с друзьями, близкими и целым миром.">
    </head></html>`;

    const nextPayload = {
      contents: {
        twoColumnWatchNextResults: {
          results: {
            results: {
              contents: [
                {
                  videoPrimaryInfoRenderer: {
                    title: { runs: [{ text: 'ЧТО БУДЕТ ЕСЛИ ИИ СЫГРАЕТ В МАРИО?🤯 ' }, { text: '#shorts' }] },
                  },
                },
                {
                  videoSecondaryInfoRenderer: {
                    owner: { videoOwnerRenderer: { title: { runs: [{ text: 'Not Your Life' }] } } },
                    attributedDescription: {
                      content: 'Что будет, если научить ИИ играть в Super Mario? Программист Code Bullet запустил тысячу Марио.',
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.includes('youtube.com/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'ЧТО БУДЕТ ЕСЛИ ИИ СЫГРАЕТ В МАРИО?🤯 #shorts',
            author_name: 'Not Your Life',
            thumbnail_url: 'https://i.ytimg.com/vi/CjQuZplBMzw/hqdefault.jpg',
          }),
          { status: 200 },
        );
      }
      if (url.includes('youtube.com/watch?v=CjQuZplBMzw')) {
        return new Response(gatedHtml, { status: 200 });
      }
      if (url.includes('youtubei/v1/next')) {
        return new Response(JSON.stringify(nextPayload), { status: 200 });
      }
      return new Response(null, { status: 404 });
    });

    const result = await service.parseLink('https://www.youtube.com/watch?v=CjQuZplBMzw');

    expect(result).toMatchObject({
      kind: 'youtube',
      videoId: 'CjQuZplBMzw',
      title: 'ЧТО БУДЕТ ЕСЛИ ИИ СЫГРАЕТ В МАРИО?🤯 #shorts',
      author: 'Not Your Life',
      shortDescription: 'Что будет, если научить ИИ играть в Super Mario? Программист Code Bullet запустил тысячу Марио.',
      thumbnailUrl: 'https://i.ytimg.com/vi/CjQuZplBMzw/hqdefault.jpg',
      previewUrl: '/notes/media/youtube-thumb/CjQuZplBMzw',
    });
  });
});
