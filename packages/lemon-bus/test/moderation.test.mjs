import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as http from 'node:http';
import { BusDatabase, startServer } from '../dist/server/index.js';

test('ModerationDb handles queue lifecycle, approval and rejection', () => {
  const testDbPath = './test-temp-moderation.db';
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  try {
    const db = new BusDatabase({ dbPath: testDbPath });

    // 1. Propose item
    const proposed = db.moderation.upsertItem({
      id: 'mod-note-1',
      title: 'Breaking AI Model Released',
      summary: 'New open weights model announced.',
      category: 'ai',
      feedSlug: 'spark-ai',
      sourceLink: 'https://example.com/ai',
      origin: 'CODING_AGENT',
      author: 'AI Watcher',
      resonanceScore: 85,
      hashtags: ['ai', 'opensource'],
      privacy: 'public',
      status: 'PENDING',
    });

    assert.equal(proposed.id, 'mod-note-1');
    assert.equal(proposed.status, 'PENDING');
    assert.equal(proposed.category, 'ai');

    // 2. Query items
    const pendingQuery = db.moderation.queryItems({ status: 'PENDING' });
    assert.equal(pendingQuery.total, 1);
    assert.equal(pendingQuery.items[0].title, 'Breaking AI Model Released');

    // 3. Stats
    const stats = db.moderation.getStats();
    assert.equal(stats.totalCount, 1);
    assert.equal(stats.pendingCount, 1);
    assert.equal(stats.approvedCount, 0);

    // 4. Update item patch
    const updated = db.moderation.updateItem('mod-note-1', {
      title: 'Edited AI Title',
      hashtags: ['ai', 'deepmind'],
    });
    assert.equal(updated.title, 'Edited AI Title');
    assert.deepEqual(updated.hashtags, ['ai', 'deepmind']);

    // 5. Approve item
    const approved = db.moderation.approveItem(
      'mod-note-1',
      { title: 'Final Approved AI Title' },
      'moderator-curator'
    );
    assert.equal(approved.status, 'APPROVED');
    assert.equal(approved.title, 'Final Approved AI Title');
    assert.equal(approved.moderatedBy, 'moderator-curator');
    assert.ok(approved.moderatedAt);

    const statsAfterApprove = db.moderation.getStats();
    assert.equal(statsAfterApprove.approvedCount, 1);
    assert.equal(statsAfterApprove.pendingCount, 0);

    // 6. Propose second item and reject it
    db.moderation.upsertItem({
      id: 'mod-note-2',
      title: 'Spam or Duplicate News',
      category: 'crypto',
      feedSlug: 'spark-crypto',
      origin: 'CODING_AGENT',
      hashtags: ['crypto'],
      privacy: 'public',
      status: 'PENDING',
    });

    const rejected = db.moderation.rejectItem(
      'mod-note-2',
      'Irrelevant promotional content',
      'moderator-curator'
    );
    assert.equal(rejected.status, 'REJECTED');
    assert.equal(rejected.rejectReason, 'Irrelevant promotional content');

    const statsAfterReject = db.moderation.getStats();
    assert.equal(statsAfterReject.totalCount, 2);
    assert.equal(statsAfterReject.pendingCount, 0);
    assert.equal(statsAfterReject.approvedCount, 1);
    assert.equal(statsAfterReject.rejectedCount, 1);

    db.close();
  } finally {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  }
});

test('ModerationDb imports WATCHER_ITEM events from lemon_bus_events', () => {
  const testDbPath = './test-temp-mod-import.db';
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  try {
    const db = new BusDatabase({ dbPath: testDbPath });

    // Seed mock WATCHER_ITEM event
    db.insertEvent({
      eventId: 'evt-watcher-1',
      entityType: 'WATCHER_ITEM',
      action: 'COLLECTED',
      origin: 'CODING_AGENT',
      transportVia: 'hybrid',
      deviceId: 'watcher-pc',
      payload: {
        id: 'watcher-article-42',
        title: 'Quantum Leap in Semiconductor Tech',
        summary: 'Researchers demonstrate new lithography.',
        category: 'frontier',
        tags: ['semiconductor', 'hardware'],
        url: 'https://example.com/quantum',
        author: 'Tech Reporter',
        resonanceScore: 92,
      },
      privacy: 'public',
      timestamp: new Date().toISOString(),
    });

    // Run import
    const importRes = db.moderation.importWatcherItems(10);
    assert.equal(importRes.imported, 1);

    const queued = db.moderation.getItem('watcher-article-42');
    assert.ok(queued);
    assert.equal(queued.title, 'Quantum Leap in Semiconductor Tech');
    assert.equal(queued.category, 'frontier');
    assert.equal(queued.feedSlug, 'spark-frontier');
    assert.equal(queued.status, 'PENDING');
    assert.equal(queued.resonanceScore, 92);

    db.close();
  } finally {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  }
});

test('HTTP Server routes for /moderation API handle full lifecycle', async () => {
  const testDbPath = './test-temp-mod-server.db';
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const port = 3099;
  const server = startServer({
    port,
    host: '127.0.0.1',
    dbPath: testDbPath,
  });

  await new Promise((res) => setTimeout(res, 200));

  try {
    const baseUrl = `http://127.0.0.1:${port}`;

    // 1. GET /moderation/stats
    const statsRes = await fetch(`${baseUrl}/moderation/stats`);
    assert.equal(statsRes.status, 200);
    const stats = await statsRes.json();
    assert.equal(stats.totalCount, 0);

    // 2. POST /moderation/notes (propose note)
    const proposeRes = await fetch(`${baseUrl}/moderation/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'http-note-1',
        title: 'Server Test Candidate Note',
        summary: 'Proposing a note through HTTP route',
        category: 'ai',
        feedSlug: 'spark-ai',
        privacy: 'public',
      }),
    });
    assert.equal(proposeRes.status, 201);
    const proposeBody = await proposeRes.json();
    assert.equal(proposeBody.ok, true);
    assert.equal(proposeBody.item.id, 'http-note-1');
    assert.equal(proposeBody.item.status, 'PENDING');

    // 3. GET /moderation/notes
    const listRes = await fetch(`${baseUrl}/moderation/notes?status=PENDING`);
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.equal(listData.total, 1);
    assert.equal(listData.items[0].id, 'http-note-1');

    // 4. PATCH /moderation/notes/http-note-1
    const patchRes = await fetch(`${baseUrl}/moderation/notes/http-note-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Title via PATCH',
      }),
    });
    assert.equal(patchRes.status, 200);
    const patchBody = await patchRes.json();
    assert.equal(patchBody.item.title, 'Updated Title via PATCH');

    // 5. POST /moderation/notes/http-note-1/approve
    const approveRes = await fetch(`${baseUrl}/moderation/notes/http-note-1/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moderatorId: 'admin-alice',
        overrides: { hashtags: ['verified'] },
      }),
    });
    assert.equal(approveRes.status, 200);
    const approveBody = await approveRes.json();
    assert.equal(approveBody.ok, true);
    assert.equal(approveBody.action, 'APPROVED');
    assert.equal(approveBody.item.status, 'APPROVED');
    assert.equal(approveBody.publishedEvent.entityType, 'NOTE');
    assert.equal(approveBody.publishedEvent.action, 'UPSERT');
    assert.equal(approveBody.publishedEvent.payload.status, 'PUBLISHED');

    // 6. Verify the approved note now appears in the general event log
    const eventsRes = await fetch(`${baseUrl}/events?feedSlug=spark-ai`);
    assert.equal(eventsRes.status, 200);
    const eventsData = await eventsRes.json();
    assert.ok(eventsData.items.some((e) => e.payload.id === 'http-note-1' && e.payload.status === 'PUBLISHED'));

    // 7. Test Reject route on a new item
    await fetch(`${baseUrl}/moderation/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'http-note-reject',
        title: 'To Be Rejected',
        category: 'general',
      }),
    });

    const rejectRes = await fetch(`${baseUrl}/moderation/notes/http-note-reject/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'Out of scope',
        moderatorId: 'admin-bob',
      }),
    });
    assert.equal(rejectRes.status, 200);
    const rejectBody = await rejectRes.json();
    assert.equal(rejectBody.action, 'REJECTED');
    assert.equal(rejectBody.item.status, 'REJECTED');

    // 8. Test batch approve
    await fetch(`${baseUrl}/moderation/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'batch-1', title: 'Batch Note 1' }),
    });
    await fetch(`${baseUrl}/moderation/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'batch-2', title: 'Batch Note 2' }),
    });

    const batchRes = await fetch(`${baseUrl}/moderation/notes/batch-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: ['batch-1', 'batch-2'],
        moderatorId: 'admin-batch',
      }),
    });
    assert.equal(batchRes.status, 200);
    const batchBody = await batchRes.json();
    assert.equal(batchBody.processedCount, 2);
    assert.equal(batchBody.failedCount, 0);

  } finally {
    server.close();
    await new Promise((res) => setTimeout(res, 200));
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {}
    }
  }
});
