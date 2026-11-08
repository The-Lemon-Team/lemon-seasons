import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudHttpBusTransport, createLemonBusTransport } from '../dist/index.mjs';

test('createLemonBusTransport instantiates CloudHttpBusTransport when requested', () => {
  const transport = createLemonBusTransport({
    driver: 'cloud',
    busUrl: 'https://lemon-seasons-bus.fly.dev',
    deviceId: 'test-device',
  });

  assert.equal(transport.driver, 'cloud');
  assert.equal(transport.deviceId, 'test-device');
});

test('CloudHttpBusTransport publishes events, queries status, and supports claim check', async () => {
  const mockDb = {
    events: [],
    sparks: new Map(),
  };

  const mockFetch = async (urlStr, opts = {}) => {
    const url = new URL(urlStr);
    const method = opts.method || 'GET';

    if (url.pathname === '/stats') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          eventsCount: mockDb.events.length,
          maxSeq: mockDb.events.length,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    if (url.pathname === '/events' && method === 'POST') {
      const body = JSON.parse(opts.body);
      const saved = {
        ...body,
        seq: mockDb.events.length + 1,
        timestamp: new Date().toISOString(),
      };
      mockDb.events.push(saved);
      return {
        ok: true,
        status: 200,
        json: async () => saved,
      };
    }

    if (url.pathname === '/events' && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          total: mockDb.events.length,
          page: 1,
          limit: 100,
          totalPages: 1,
          items: mockDb.events,
        }),
      };
    }

    if (url.pathname === '/sparks' && method === 'POST') {
      const body = JSON.parse(opts.body);
      mockDb.sparks.set(body.canonicalPath, body.contentMarkdown);
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, canonicalPath: body.canonicalPath }),
      };
    }

    if (url.pathname.startsWith('/sparks') && method === 'GET') {
      const canonicalPath = url.searchParams.get('canonicalPath');
      if (mockDb.sparks.has(canonicalPath)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            canonicalPath,
            contentMarkdown: mockDb.sparks.get(canonicalPath),
          }),
        };
      }
      return {
        ok: false,
        status: 404,
        statusText: 'Not found',
      };
    }

    return {
      ok: false,
      status: 404,
      statusText: 'Not Found',
    };
  };

  const transport = new CloudHttpBusTransport({
    busUrl: 'https://test-bus.fly.dev',
    deviceId: 'client-node-1',
    fetchImpl: mockFetch,
  });

  await transport.start();

  // Test 1: Publish Event
  const published = await transport.publish({
    entityType: 'NOTE',
    action: 'UPSERT',
    origin: 'DIRECT_API',
    privacy: 'public',
    feedSlug: 'general',
    payload: { id: 'note-1', title: 'Test Note', privacy: 'public', origin: 'DIRECT_API' },
  });

  assert.equal(published.seq, 1);
  assert.equal(published.entityType, 'NOTE');

  // Test 2: Pull since cursor
  const pulled = await transport.pullSince({ lastSeq: 0 });
  assert.equal(pulled.items.length, 1);
  assert.equal(pulled.nextCursor.lastSeq, 1);

  // Test 3: Publish Spark Document and Claim Check retrieval
  await transport.publishSparkDocument({
    virtualPath: 'Spark/general/08.11.26 - Daily Note.md',
    contentMarkdown: '# Daily Note Content\n\nSome body text here.',
    origin: 'SUPABASE_SPARK',
  });

  assert.equal(mockDb.sparks.has('Spark/general/08.11.26 - Daily Note.md'), true);

  const content = await transport.fetchNoteContent({
    canonicalPath: 'Spark/general/08.11.26 - Daily Note.md',
  });
  assert.equal(content, '# Daily Note Content\n\nSome body text here.');

  // Test 4: Status
  const status = await transport.getStatus();
  assert.equal(status.driver, 'cloud');
  assert.equal(status.totalEventsCount, 2);

  await transport.stop();
});
