import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import {
  migrateGDriveHistoryToBus,
  InMemoryBusTransport,
} from '../dist/index.mjs';

function getFileHash(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

test('migrateGDriveHistoryToBus imports sparks and events while guaranteeing ZERO deletion on disk', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lemon-bus-migration-test-'));
  const gdriveSyncFolder = path.join(tempDir, 'LemonCalendarium');
  const sparksDir = path.join(gdriveSyncFolder, 'Sparks', 'tech');
  const eventsDir = path.join(gdriveSyncFolder, 'LemonBus', 'events');

  fs.mkdirSync(sparksDir, { recursive: true });
  fs.mkdirSync(eventsDir, { recursive: true });

  // 1. Create sample Spark notes
  const sparkFile1 = path.join(sparksDir, '08.11.26 - AI Progress.md');
  const sparkContent1 = `---
title: "AI Progress 2026"
privacy: "public"
tags:
  - ai
  - roadmap
---

# AI Progress 2026
Testing cloud migration without touching disk files.`;
  fs.writeFileSync(sparkFile1, sparkContent1, 'utf8');

  const sparkFile2 = path.join(sparksDir, '08.11.26 - Quantum Computing.md');
  const sparkContent2 = `---
title: "Quantum Computing Review"
privacy: "private"
---

# Quantum Computing
Private notes that must be imported.`;
  fs.writeFileSync(sparkFile2, sparkContent2, 'utf8');

  // 2. Create sample Bus JSON event
  const eventFile1 = path.join(eventsDir, '2026-11-08T10-00-00-000Z_dev1_evt1.json');
  const eventPayload1 = {
    eventId: 'evt-test-111',
    timestamp: '2026-11-08T10:00:00.000Z',
    deviceId: 'dev-1',
    entityType: 'NOTE',
    action: 'UPSERT',
    origin: 'DIRECT_UI',
    transportVia: 'gdrive-fs',
    contentHash: 'hash-evt-111',
    privacy: 'public',
    payload: {
      id: 'note-111',
      title: 'Historical Event Note',
      privacy: 'public',
    },
  };
  fs.writeFileSync(eventFile1, JSON.stringify(eventPayload1, null, 2), 'utf8');

  // Record initial state of files
  const initialHash1 = getFileHash(sparkFile1);
  const initialHash2 = getFileHash(sparkFile2);
  const initialEventHash = getFileHash(eventFile1);

  assert.ok(fs.existsSync(sparkFile1));
  assert.ok(fs.existsSync(sparkFile2));
  assert.ok(fs.existsSync(eventFile1));

  // 3. Run migration with InMemoryBusTransport
  const transport = new InMemoryBusTransport({ deviceId: 'migrator-node' });
  await transport.start();

  const summary = await migrateGDriveHistoryToBus({
    gdriveSyncFolder,
    targetTransport: transport,
  });

  // Check migration results
  assert.equal(summary.sparksScanned, 2);
  assert.equal(summary.sparksImported, 2);
  assert.equal(summary.sparksSkipped, 0);
  assert.equal(summary.eventsScanned, 1);
  assert.equal(summary.eventsImported, 1);
  assert.equal(summary.eventsSkipped, 0);
  assert.equal(summary.errors.length, 0);

  // 4. Run second migration pass to verify deduplication
  const secondSummary = await migrateGDriveHistoryToBus({
    gdriveSyncFolder,
    targetTransport: transport,
  });

  assert.equal(secondSummary.sparksScanned, 2);
  assert.equal(secondSummary.sparksImported, 0);
  assert.equal(secondSummary.sparksSkipped, 2, 'Existing sparks must be deduped');
  assert.equal(secondSummary.eventsScanned, 1);
  assert.equal(secondSummary.eventsImported, 0);
  assert.equal(secondSummary.eventsSkipped, 1, 'Existing events must be deduped');

  // 5. CRITICAL INVARIANT: Verify all files still exist on disk untouched
  assert.ok(fs.existsSync(sparkFile1), 'Spark file 1 must still exist on disk');
  assert.ok(fs.existsSync(sparkFile2), 'Spark file 2 must still exist on disk');
  assert.ok(fs.existsSync(eventFile1), 'Event file must still exist on disk');

  assert.equal(getFileHash(sparkFile1), initialHash1, 'Spark file 1 must be byte-for-byte identical');
  assert.equal(getFileHash(sparkFile2), initialHash2, 'Spark file 2 must be byte-for-byte identical');
  assert.equal(getFileHash(eventFile1), initialEventHash, 'Event file must be byte-for-byte identical');

  await transport.stop();
  fs.rmSync(tempDir, { recursive: true, force: true });
});
