import test from 'node:test';
import assert from 'node:assert/strict';
import { firstValueFrom } from 'rxjs';
import {
  processSparkDocument,
  resolveNoteOrigin,
  originToSourceType,
  InMemoryBusTransport,
  SupabaseBusTransport,
  HybridBusTransport,
} from '../dist/index.mjs';

test('provenance separation: non-GDrive notes keep their true origin when transported over bus', () => {
  const partyOrigin = resolveNoteOrigin({ origin: 'NEURON_PARTY' });
  assert.equal(partyOrigin, 'NEURON_PARTY');
  assert.equal(originToSourceType(partyOrigin), 'NEURON_PARTY');

  const directOrigin = resolveNoteOrigin({ sourceType: 'MANUAL' });
  assert.equal(directOrigin, 'DIRECT_UI');
  assert.equal(originToSourceType(directOrigin), 'MANUAL');

  const gdriveOrigin = resolveNoteOrigin({ sourceType: 'GOOGLE_DRIVE' });
  assert.equal(gdriveOrigin, 'GDRIVE_SPARK');
  assert.equal(originToSourceType(gdriveOrigin), 'GOOGLE_DRIVE');
});

test('SparkDocumentProcessor parses DD.MM.YY filename, frontmatter, strips jmdaily, and maps feed', () => {
  const md = `---
title: "Google Gemini 2.5 Deep Dive"
event_date: "2026-11-05T10:00:00.000Z"
type: "SINGLE"
privacy: "public"
tags:
  - ai
  - jmdaily
  - gemini
summary: "Обзор новой модели Gemini."
---

# Google Gemini 2.5 Deep Dive

Подробный разбор архитектуры #llm и возможностей.`;

  const res = processSparkDocument({
    virtualPath: 'Spark/changelogsfeed/google/08.11.26 - Google Gemini 2.5.md',
    contentMarkdown: md,
    origin: 'SUPABASE_SPARK',
  });

  assert.equal(res.canonicalPath, 'Spark/changelogsfeed/google/08.11.26 - Google Gemini 2.5.md');
  assert.equal(res.feedTarget.slug, 'spark-changelogsfeed-google');
  assert.equal(res.feedTarget.parentFeedSlug, 'spark-changelogsfeed');
  assert.equal(res.notePayload.origin, 'SUPABASE_SPARK');
  assert.equal(res.notePayload.sourceType, 'SUPABASE_SPARK');
  assert.equal(res.notePayload.privacy, 'public');
  assert.equal(res.notePayload.startDate, '2026-11-05T10:00:00.000Z');
  assert.ok(!res.notePayload.hashtags.includes('jmdaily'), 'jmdaily must be stripped');
  assert.ok(res.notePayload.hashtags.includes('ai'));
  assert.ok(res.notePayload.hashtags.includes('llm'));
});

test('InMemoryBusTransport supports pattern subscription, seq cursor pullSince, and hash dedup', async () => {
  const bus = new InMemoryBusTransport({ deviceId: 'node-test-1' });
  await bus.start();

  const subPromise = firstValueFrom(
    bus.subscribe({ feedSlugs: ['party-chronicle'], privacy: 'public' }),
  );

  // Publish private note (should be filtered out by subscriber)
  await bus.publish({
    entityType: 'NOTE',
    action: 'UPSERT',
    origin: 'NEURON_PARTY',
    feedSlug: 'party-lore-vault',
    privacy: 'private',
    payload: { id: 'n-priv', title: 'Secret Lore' },
  });

  // Publish matching public note
  const pubEnv = await bus.publish({
    entityType: 'NOTE',
    action: 'UPSERT',
    origin: 'NEURON_PARTY',
    feedSlug: 'party-chronicle',
    contentHash: 'hash-123',
    privacy: 'public',
    payload: { id: 'n-pub', title: 'Hero Chronicle' },
  });

  const received = await subPromise;
  assert.equal(received.eventId, pubEnv.eventId);
  assert.equal(received.seq, 2);
  assert.equal(await bus.hasContentHash('hash-123'), true);

  const delta = await bus.pullSince({ lastSeq: 1 });
  assert.equal(delta.items.length, 1);
  assert.equal(delta.items[0].payload.id, 'n-pub');

  await bus.stop();
});

test('HybridBusTransport bridges secondary events into primary Supabase transport', async () => {
  const postedRows = [];
  const mockFetch = async (url, init) => {
    if (init?.method === 'POST' && String(url).includes('lemon_bus_events')) {
      const body = JSON.parse(init.body);
      const row = {
        seq: postedRows.length + 1,
        ...body,
        created_at: new Date().toISOString(),
      };
      postedRows.push(row);
      return new Response(JSON.stringify([row]), { status: 201 });
    }
    return new Response(JSON.stringify([]), { status: 200 });
  };

  const primary = new SupabaseBusTransport({
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'test-key',
    deviceId: 'cloud-node',
    realtimeEnabled: false,
    fetchImpl: mockFetch,
  });

  const secondary = new InMemoryBusTransport({ deviceId: 'gdrive-bridge-node' });
  const hybrid = new HybridBusTransport({
    deviceId: 'hybrid-node',
    primary,
    secondary,
    mirrorOutboundToSecondary: false,
  });

  await hybrid.start();

  // Simulate file event arriving on secondary (Google Drive bridge)
  await secondary.publishSparkDocument({
    virtualPath: 'Spark/AI/08.11.26 - Instant Supabase Sync.md',
    contentMarkdown: '# Instant Supabase Sync\n\nBody text #fast',
    origin: 'GDRIVE_SPARK',
  });

  // Give async bridge microtask a tick
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(postedRows.length, 1);
  assert.equal(postedRows[0].origin, 'GDRIVE_SPARK');
  assert.equal(postedRows[0].feed_slug, 'spark-ai');

  await hybrid.stop();
});
