import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { formatHlc, SyncEventEnvelope, NoteFields } from '@lenta/shared';
import { createTestApp, cleanDatabase, ADMIN_AUTH_HEADER, TestContext } from './test-context';

describe('Project Lenta Backend - Sync Engine API Integration (PostgreSQL)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await cleanDatabase(ctx.prisma);
    await ctx.app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  describe('POST /sync/events - Apply Sync Events (Idempotency & Merge)', () => {
    it('applies an UPSERT note event, creating the note with HLC clocks in PostgreSQL', async () => {
      const now = Date.now();
      const hlc = formatHlc({ wallMs: now, counter: 0, deviceId: 'device-alpha' });
      const noteId = '11111111-2222-3333-4444-555555555555';

      const event: SyncEventEnvelope<NoteFields> = {
        schemaVersion: 2,
        eventId: 'evt-create-note-001',
        timestamp: new Date(now).toISOString(),
        hlc,
        deviceId: 'device-alpha',
        entityType: 'NOTE',
        entityId: noteId,
        action: 'UPSERT',
        payload: {
          title: 'Synchronized Note 1',
          description: 'Created through LAN sync engine',
          folderPath: 'Shared/Sync',
          icon: '⚡',
        },
      };

      const res = await ctx.req
        .post('/sync/events')
        .set(ADMIN_AUTH_HEADER)
        .send({ events: [event] });

      expect(res.status).toBe(201);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toMatchObject({
        eventId: 'evt-create-note-001',
        outcome: 'APPLIED',
      });

      // Verify stored directly in Postgres
      const stored = await ctx.prisma.note.findUnique({ where: { id: noteId } });
      expect(stored).not.toBeNull();
      expect(stored?.title).toBe('Synchronized Note 1');
      expect(stored?.description).toBe('Created through LAN sync engine');
    });

    it('guarantees event idempotency by eventId, returning DUPLICATE on re-delivery', async () => {
      const now = Date.now();
      const hlc = formatHlc({ wallMs: now, counter: 0, deviceId: 'device-alpha' });
      const noteId = '22222222-3333-4444-5555-666666666666';

      const event: SyncEventEnvelope<NoteFields> = {
        schemaVersion: 2,
        eventId: 'evt-dup-check-002',
        timestamp: new Date(now).toISOString(),
        hlc,
        deviceId: 'device-alpha',
        entityType: 'NOTE',
        entityId: noteId,
        action: 'UPSERT',
        payload: {
          title: 'Idempotent Sync Note',
        },
      };

      // First delivery
      const firstRes = await ctx.req
        .post('/sync/events')
        .set(ADMIN_AUTH_HEADER)
        .send({ events: [event] });
      expect(firstRes.status).toBe(201);
      expect(firstRes.body[0].outcome).toBe('APPLIED');

      // Duplicate delivery
      const dupRes = await ctx.req
        .post('/sync/events')
        .set(ADMIN_AUTH_HEADER)
        .send({ events: [event] });
      expect(dupRes.status).toBe(201);
      expect(dupRes.body[0].outcome).toBe('DUPLICATE');
    });

    it('resolves concurrent updates using HLC Last-Write-Wins (LWW) per field', async () => {
      const baseMs = Date.now();
      const noteId = '33333333-4444-5555-6666-777777777777';

      // 1. Initial note creation
      await ctx.req.post('/sync/events').set(ADMIN_AUTH_HEADER).send({
        events: [
          {
            schemaVersion: 2,
            eventId: 'evt-base-003',
            timestamp: new Date(baseMs).toISOString(),
            hlc: formatHlc({ wallMs: baseMs, counter: 0, deviceId: 'node-a' }),
            deviceId: 'node-a',
            entityType: 'NOTE',
            entityId: noteId,
            action: 'UPSERT',
            payload: { title: 'Version Initial', description: 'Base description' },
          },
        ],
      });

      // 2. Event with higher HLC updates title
      const newerMs = baseMs + 5000;
      await ctx.req.post('/sync/events').set(ADMIN_AUTH_HEADER).send({
        events: [
          {
            schemaVersion: 2,
            eventId: 'evt-newer-004',
            timestamp: new Date(newerMs).toISOString(),
            hlc: formatHlc({ wallMs: newerMs, counter: 0, deviceId: 'node-b' }),
            deviceId: 'node-b',
            entityType: 'NOTE',
            entityId: noteId,
            action: 'UPSERT',
            payload: { title: 'Title From Future' },
          },
        ],
      });

      // 3. Outdated event with lower HLC attempts to overwrite description
      const olderMs = baseMs - 1000;
      await ctx.req.post('/sync/events').set(ADMIN_AUTH_HEADER).send({
        events: [
          {
            schemaVersion: 2,
            eventId: 'evt-stale-005',
            timestamp: new Date(olderMs).toISOString(),
            hlc: formatHlc({ wallMs: olderMs, counter: 0, deviceId: 'node-c' }),
            deviceId: 'node-c',
            entityType: 'NOTE',
            entityId: noteId,
            action: 'UPSERT',
            payload: { title: 'Old Stale Title' },
          },
        ],
      });

      const updated = await ctx.prisma.note.findUnique({ where: { id: noteId } });
      expect(updated?.title).toBe('Title From Future'); // Won by higher HLC
      expect(updated?.description).toBe('Base description'); // Preserved
    });

    it('soft deletes note on DELETE action and preserves tombstone', async () => {
      const now = Date.now();
      const noteId = '44444444-5555-6666-7777-888888888888';

      // Create note
      await ctx.req.post('/sync/events').set(ADMIN_AUTH_HEADER).send({
        events: [
          {
            schemaVersion: 2,
            eventId: 'evt-create-006',
            timestamp: new Date(now).toISOString(),
            hlc: formatHlc({ wallMs: now, counter: 0, deviceId: 'node-a' }),
            deviceId: 'node-a',
            entityType: 'NOTE',
            entityId: noteId,
            action: 'UPSERT',
            payload: { title: 'Note To Be Tombstoned' },
          },
        ],
      });

      // Delete note via sync event
      const deleteRes = await ctx.req.post('/sync/events').set(ADMIN_AUTH_HEADER).send({
        events: [
          {
            schemaVersion: 2,
            eventId: 'evt-delete-007',
            timestamp: new Date(now + 1000).toISOString(),
            hlc: formatHlc({ wallMs: now + 1000, counter: 0, deviceId: 'node-a' }),
            deviceId: 'node-a',
            entityType: 'NOTE',
            entityId: noteId,
            action: 'DELETE',
            payload: null,
          },
        ],
      });

      expect(deleteRes.status).toBe(201);
      expect(deleteRes.body[0].outcome).toBe('DELETED');

      // Check soft-delete in PostgreSQL
      const deletedRow = await ctx.prisma.note.findUnique({ where: { id: noteId } });
      expect(deletedRow?.deletedAt).not.toBeNull();
    });
  });

  describe('GET /sync/pull - Pull Changes with Cursor', () => {
    it('returns notes changed since cursor with their field clocks and deletion state', async () => {
      const note = await ctx.prisma.note.create({
        data: {
          title: 'Pulled Note',
          description: 'Will be fetched via pull',
          privacy: 'public',
          status: 'PUBLISHED',
        },
      });

      const res = await ctx.req.get('/sync/pull?limit=50').set(ADMIN_AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.notes).toBeDefined();
      expect(Array.isArray(res.body.notes)).toBe(true);

      const found = res.body.notes.find((n: any) => n.id === note.id);
      expect(found).toBeDefined();
      expect(found.fields.title).toBe('Pulled Note');
      expect(found.clocks.title).toBeDefined();
      expect(found.deleted).toBe(false);
      expect(res.body.cursor).toBeDefined();
    });
  });
});
