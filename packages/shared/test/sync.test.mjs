import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  mergeNoteEvent,
  diff3Merge,
  tickHlc,
  receiveHlc,
  compareHlc,
  upgradeLegacyEnvelope,
} from '../dist/index.mjs';

const vectors = JSON.parse(
  readFileSync(new URL('../test-vectors/note-merge.json', import.meta.url), 'utf-8'),
);

for (const v of vectors) {
  test(`merge vector: ${v.name}`, () => {
    const event = { schemaVersion: 2, timestamp: '', entityType: 'NOTE', entityId: v.local.id, ...v.event };
    const r = mergeNoteEvent(v.local, event, { role: v.role, baseDescription: v.baseDescription });
    const e = v.expect;
    assert.equal(r.outcome, e.outcome);
    assert.equal(r.note.version, e.version);
    assert.equal(r.attachments.length, e.attachments);
    for (const [k, val] of Object.entries(e.fields ?? {})) assert.equal(r.note.fields[k], val);
    if ('deleted' in e) assert.equal(Boolean(r.note.deletedHlc), e.deleted);
    if (e.attachmentContent !== undefined) assert.equal(r.attachments[0].content, e.attachmentContent);
    if (e.attachmentId !== undefined) assert.equal(r.attachments[0].id, e.attachmentId);
  });
}

test('merge is idempotent for a replayed conflict event (deterministic attachment id)', () => {
  const v = vectors.find((x) => x.expect.outcome === 'CONFLICT_ATTACHED');
  const event = { schemaVersion: 2, timestamp: '', entityType: 'NOTE', entityId: v.local.id, ...v.event };
  const ctx = { role: v.role, baseDescription: v.baseDescription };
  const a = mergeNoteEvent(v.local, event, ctx);
  const b = mergeNoteEvent(a.note, event, ctx);
  assert.equal(a.attachments[0].id, b.attachments[0].id);
});

test('diff3: identical edits on both sides merge cleanly', () => {
  const r = diff3Merge('a\nb', 'a\nX', 'a\nX');
  assert.deepEqual(r, { clean: true, text: 'a\nX' });
});

test('diff3: both append different lines => conflict', () => {
  assert.equal(diff3Merge('a', 'a\nL', 'a\nR').clean, false);
});

test('hlc: ordering tolerates drift and counters', () => {
  const a = tickHlc(null, 1000, 'pc');
  const b = tickHlc(a, 1000, 'pc'); // same ms => counter bump
  const c = receiveHlc(b, tickHlc(null, 5000, 'pixel'), 1001, 'pc');
  assert.ok(compareHlc(a, b) < 0);
  assert.ok(compareHlc(b, c) < 0);
});

test('legacy v1 envelope upgrades to v2', () => {
  const up = upgradeLegacyEnvelope({
    eventId: 'x', timestamp: '2026-01-01T00:00:00.000Z', deviceId: 'pc',
    entityType: 'NOTE', action: 'UPSERT', payload: { id: 'n1' },
  });
  assert.equal(up.schemaVersion, 2);
  assert.equal(up.entityId, 'n1');
});
