import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { BusDatabase } from '../dist/server/index.js';

test('BusDatabase manages SQLite buffer and purges expired entries', () => {
  const testDbPath = './test-temp-buffer.db';
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  let db = null;
  try {
    db = new BusDatabase({ dbPath: testDbPath, retentionDays: 30 });
    
    // Insert event
    const event = db.insertEvent({
      eventId: 'evt-101',
      entityType: 'NOTE',
      action: 'UPSERT',
      origin: 'CODING_AGENT',
      transportVia: 'hybrid',
      deviceId: 'unit-tester',
      payload: { hello: 'world' },
      privacy: 'private',
      timestamp: new Date().toISOString(),
    });

    assert.equal(event.seq, 1);
    assert.equal(event.eventId, 'evt-101');

    // Query event
    const query = db.queryEvents({ afterSeq: 0 });
    assert.equal(query.items.length, 1);
    assert.equal(query.lastSeq, 1);
    assert.equal(query.items[0].payload.hello, 'world');

    // Upsert spark
    const spark = db.upsertSparkDocument({
      id: 'spk-1',
      canonicalPath: 'spark/test/test.md',
      fileName: 'test.md',
      folderPath: 'spark/test',
      feedSlug: 'daily',
      title: 'Unit Test Spark',
      contentMarkdown: '# Unit Test',
      frontmatter: { category: 'test' },
      contentHash: 'abc123hash',
      privacy: 'public',
      originProvider: 'TEST',
      updatedByDevice: 'unit-tester',
    });

    assert.equal(spark.canonicalPath, 'spark/test/test.md');
    
    // Fetch spark
    const fetched = db.getSparkDocument('spark/test/test.md');
    assert.ok(fetched);
    assert.equal(fetched.title, 'Unit Test Spark');

    // Stats
    const stats = db.getStats();
    assert.equal(stats.totalEvents, 1);
    assert.equal(stats.totalSparks, 1);
  } finally {
    if (db) db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
  }
});
