import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { BusDatabase, SseManager, UpstreamBusRelay } from '../dist/server/index.js';

test('UpstreamBusRelay synchronizes upstream events into local BusDatabase and broadcasts SSE', async () => {
  const dbPath = './test-upstream-relay.db';
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const db = new BusDatabase({ dbPath });
  const sse = new SseManager(15000);

  const mockUpstreamEvents = [
    {
      seq: 1,
      eventId: 'upstream-evt-1',
      entityType: 'NOTE',
      action: 'UPSERT',
      origin: 'GDRIVE_SPARK',
      transportVia: 'cloud',
      deviceId: 'fly-cloud',
      feedSlug: 'spark-ai',
      externalId: 'Spark/AI/test.md',
      contentHash: 'hash-abc',
      privacy: 'private',
      payload: { title: 'Test AI Spark from Cloud' },
      timestamp: new Date().toISOString(),
    },
  ];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/events/stream')) {
      return {
        ok: true,
        status: 200,
        body: new ReadableStream({
          start(controller) {
            // No events pushed immediately
          },
        }),
      };
    }
    if (urlStr.includes('/events')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: mockUpstreamEvents,
          lastSeq: 1,
          total: 1,
        }),
        text: async () => '',
      };
    }
    if (urlStr.includes('/sparks')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'upstream-doc-1',
          canonicalPath: 'Spark/AI/test.md',
          fileName: 'test.md',
          folderPath: 'Spark/AI',
          feedSlug: 'spark-ai',
          title: 'Test AI Spark from Cloud',
          contentMarkdown: '# Test AI Spark\n\nContent from cloud',
          frontmatter: {},
          contentHash: 'hash-abc',
          privacy: 'private',
          originProvider: 'GDRIVE_SPARK',
          updatedByDevice: 'fly-cloud',
        }),
      };
    }
    return { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
  };

  const broadcasted = [];
  sse.broadcast = (envelope) => {
    broadcasted.push(envelope);
  };

  const relay = new UpstreamBusRelay({
    upstreamUrl: 'https://mock-cloud-bus.fly.dev',
    db,
    sse,
    deviceId: 'local-test-node',
  });

  try {
    await relay.start();
    await relay.runCatchUp();

    // Verify event is in local DB
    assert.equal(db.hasEvent('upstream-evt-1'), true);
    assert.equal(db.hasSparkDocumentByHash('hash-abc'), true);

    const queried = db.queryEvents({ afterSeq: 0 });
    assert.equal(queried.items.length, 1);
    assert.equal(queried.items[0].payload.title, 'Test AI Spark from Cloud');
    assert.equal(broadcasted.length, 1);
  } finally {
    await relay.stop();
    db.close();
    globalThis.fetch = originalFetch;
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  }
});
