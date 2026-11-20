import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractYouTubeVideoId,
  isYouTubeUrl,
  extractFirstYouTubeUrl,
  getYouTubeThumbnailUrl,
  formatYouTubeDuration,
  NOTE_TEMPLATE_YOUTUBE,
  DEFAULT_NOTE_TEMPLATES,
} from '../dist/index.mjs';

describe('YouTube URL helpers & Note preset', () => {
  it('extracts video ID from standard watch, short, shorts, live, and embed URLs', () => {
    assert.equal(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.equal(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=42'), 'dQw4w9WgXcQ');
    assert.equal(extractYouTubeVideoId('https://youtube.com/shorts/AbCdEf12345?feature=share'), 'AbCdEf12345');
    assert.equal(extractYouTubeVideoId('https://www.youtube.com/live/XyZ98765432?si=abc'), 'XyZ98765432');
    assert.equal(extractYouTubeVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123'), 'dQw4w9WgXcQ');
    assert.equal(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });

  it('returns null for non-YouTube or invalid URLs', () => {
    assert.equal(extractYouTubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ'), null);
    assert.equal(extractYouTubeVideoId('https://www.youtube.com/@channel'), null);
    assert.equal(extractYouTubeVideoId('not a url'), null);
    assert.equal(isYouTubeUrl('https://youtu.be/dQw4w9WgXcQ'), true);
    assert.equal(isYouTubeUrl('https://vimeo.com/123456'), false);
  });

  it('extracts the first YouTube URL from arbitrary copied text', () => {
    const match = extractFirstYouTubeUrl('Посмотри видео: https://youtu.be/dQw4w9WgXcQ?t=10!');
    assert.deepEqual(match, {
      url: 'https://youtu.be/dQw4w9WgXcQ?t=10',
      videoId: 'dQw4w9WgXcQ',
      canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    assert.equal(extractFirstYouTubeUrl('Просто текст без ссылок'), null);
  });

  it('builds thumbnail URLs and formats durations', () => {
    assert.equal(
      getYouTubeThumbnailUrl('dQw4w9WgXcQ', 'maxresdefault'),
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    );
    assert.equal(formatYouTubeDuration(65), '1:05');
    assert.equal(formatYouTubeDuration(3665), '1:01:05');
    assert.equal(formatYouTubeDuration(0), null);
  });

  it('defines NOTE_TEMPLATE_YOUTUBE in DEFAULT_NOTE_TEMPLATES', () => {
    const tpl = DEFAULT_NOTE_TEMPLATES[NOTE_TEMPLATE_YOUTUBE];
    assert.ok(tpl);
    assert.equal(tpl.id, 'youtube');
    assert.ok(tpl.defaultHashtags.includes('youtube'));
  });
});
