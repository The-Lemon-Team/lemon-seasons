import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, cleanDatabase, ADMIN_AUTH_HEADER, TestContext } from './test-context';
import {
  TEST_RESERVED_PREFIX,
  createTestFeedSlug,
  createTestFeedTitle,
  createTestNoteTitle,
} from '@lenta/shared';

describe('Project Lenta Backend - Notes & Feeds Integration (PostgreSQL)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 30000);

  afterAll(async () => {
    if (ctx?.app) {
      await ctx.app.close();
    }
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  describe('GET /health', () => {
    it('[BUG-002] returns 200 OK and status in isolated test environment', async () => {
      const res = await ctx.req.get('/health').expect(200);
      expect(res.body).toHaveProperty('status');
      expect(['ok', 'healthy']).toContain(res.body.status?.toLowerCase?.() || 'ok');
    });
  });

  describe('Feeds API & Binary Privacy Flow', () => {
    it('creates a feed and retrieves it in the list', async () => {
      const createRes = await ctx.req
        .post('/feeds')
        .set(ADMIN_AUTH_HEADER)
        .send({
          title: 'IT & Dev Hub',
          slug: 'it-dev',
          description: 'Developer news and technical articles',
          icon: '💻',
          color: '#2481cc',
          privacy: 'public',
        })
        .expect(201);

      expect(createRes.body).toMatchObject({
        id: expect.any(String),
        title: 'IT & Dev Hub',
        slug: 'it-dev',
        privacy: 'public',
      });

      const listRes = await ctx.req.get('/feeds').expect(200);
      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ slug: 'it-dev' }),
        ]),
      );
    });

    it('updates feed parameters (title, icon, color) and persists them in DB with test prefix isolation', async () => {
      const feedSlug = createTestFeedSlug('stream');
      const initialTitle = createTestFeedTitle('Stream Initial');
      const updatedTitle = createTestFeedTitle('Stream Renamed');

      // 1. Create initial feed with test prefix
      const createRes = await ctx.req
        .post('/feeds')
        .set(ADMIN_AUTH_HEADER)
        .send({
          title: initialTitle,
          slug: feedSlug,
          description: 'Feed before renaming',
          icon: '📁',
          color: '#2481cc',
          privacy: 'public',
        })
        .expect(201);

      const feedId = createRes.body.id;
      expect(feedId).toBeDefined();

      // 2. Create note attached to this feed
      const noteTitle = createTestNoteTitle('Post attached to stream');
      const noteRes = await ctx.req
        .post('/notes')
        .set(ADMIN_AUTH_HEADER)
        .send({
          title: noteTitle,
          description: 'Note body inside stream',
          feedId,
          type: 'SINGLE',
          startDate: new Date().toISOString(),
          privacy: 'public',
          status: 'PUBLISHED',
        })
        .expect(201);

      expect(noteRes.body.feedId).toBe(feedId);

      // 3. Update the feed (title, icon, color) via PATCH /feeds/:id
      const patchRes = await ctx.req
        .patch(`/feeds/${feedId}`)
        .set(ADMIN_AUTH_HEADER)
        .send({
          title: updatedTitle,
          icon: '🚀',
          color: '#f97316',
        })
        .expect(200);

      expect(patchRes.body).toMatchObject({
        id: feedId,
        title: updatedTitle,
        slug: feedSlug,
        icon: '🚀',
        color: '#f97316',
      });

      // 4. Verify list endpoint reflects updated title
      const listRes = await ctx.req.get('/feeds').expect(200);
      const updatedFeedInList = listRes.body.find((f: any) => f.id === feedId);
      expect(updatedFeedInList).toBeDefined();
      expect(updatedFeedInList.title).toBe(updatedTitle);
      expect(updatedFeedInList.icon).toBe('🚀');

      // 5. Verify notes query retains relation to updated feed
      const notesRes = await ctx.req.get(`/notes?feedId=${feedId}`).expect(200);
      expect(notesRes.body.items).toHaveLength(1);
      expect(notesRes.body.items[0].feed.title).toBe(updatedTitle);
    });
  });

  describe('Notes API & Unified Privacy Architecture (AGENTS.md rule 9)', () => {
    let publicFeedId: string;

    beforeEach(async () => {
      const feed = await ctx.prisma.feed.create({
        data: {
          title: 'Public Stream',
          slug: 'public-stream',
          privacy: 'public',
        },
      });
      publicFeedId = feed.id;
    });

    it('creates public and private notes, enforcing privacy visibility filters', async () => {
      // 1. Create a public note
      const publicRes = await ctx.req
        .post('/notes')
        .set(ADMIN_AUTH_HEADER)
        .send({
          title: 'Public Tech Article',
          description: 'A great open article for everyone',
          privacy: 'public',
          status: 'PUBLISHED',
          type: 'SINGLE',
          feedId: publicFeedId,
          startDate: new Date('2026-11-01T12:00:00Z').toISOString(),
        })
        .expect(201);

      expect(publicRes.body.title).toBe('Public Tech Article');
      expect(publicRes.body.privacy).toBe('public');

      // 2. Create a private note
      const privateRes = await ctx.req
        .post('/notes')
        .set(ADMIN_AUTH_HEADER)
        .send({
          title: 'Internal Confidential Roadmap',
          description: 'Private strategy notes for admins only',
          privacy: 'private',
          status: 'PUBLISHED',
          type: 'SINGLE',
          startDate: new Date('2026-11-01T14:00:00Z').toISOString(),
        })
        .expect(201);

      expect(privateRes.body.privacy).toBe('private');

      // 3. Anonymous caller query -> MUST only see the public note!
      const anonList = await ctx.req.get('/notes').expect(200);
      const anonNotes = anonList.body.items || [];
      const anonTitles = anonNotes.map((n: any) => n.title);
      expect(anonTitles).toContain('Public Tech Article');
      expect(anonTitles).not.toContain('Internal Confidential Roadmap');

      // 4. Admin query -> sees both notes!
      const adminList = await ctx.req
        .get('/notes?appMode=dev')
        .set(ADMIN_AUTH_HEADER)
        .expect(200);
      const adminNotes = adminList.body.items || [];
      const adminTitles = adminNotes.map((n: any) => n.title);
      expect(adminTitles).toContain('Public Tech Article');
      expect(adminTitles).toContain('Internal Confidential Roadmap');

      // 5. Public appMode query (dev:public / port 5176) -> strictly public notes
      const publicModeList = await ctx.req
        .get('/notes?appMode=public')
        .set(ADMIN_AUTH_HEADER)
        .expect(200);
      const publicModeNotes = publicModeList.body.items || [];
      const publicModeTitles = publicModeNotes.map((n: any) => n.title);
      expect(publicModeTitles).toContain('Public Tech Article');
      expect(publicModeTitles).not.toContain('Internal Confidential Roadmap');
    });

    it('updates note fields and soft deletes via DELETE', async () => {
      const createRes = await ctx.req
        .post('/notes')
        .set(ADMIN_AUTH_HEADER)
        .send({
          title: 'Draft to Update',
          description: 'Initial description',
          privacy: 'public',
          status: 'DRAFT',
          type: 'SINGLE',
          startDate: new Date('2026-11-01T10:00:00Z').toISOString(),
        })
        .expect(201);

      const noteId = createRes.body.id;

      // Update title and publish
      const updateRes = await ctx.req
        .patch(`/notes/${noteId}`)
        .set(ADMIN_AUTH_HEADER)
        .send({
          title: 'Updated & Published Article',
          status: 'PUBLISHED',
        })
        .expect(200);

      expect(updateRes.body.title).toBe('Updated & Published Article');
      expect(updateRes.body.status).toBe('PUBLISHED');

      // Delete note (soft delete)
      await ctx.req
        .delete(`/notes/${noteId}`)
        .set(ADMIN_AUTH_HEADER)
        .expect(200);

      // Verify soft delete: not returned in listing
      const listRes = await ctx.req.get('/notes').expect(200);
      const notes = listRes.body.items || [];
      expect(notes.some((n: any) => n.id === noteId)).toBe(false);

      // Check DB directly: deletedAt is set
      const dbNote = await ctx.prisma.note.findUnique({ where: { id: noteId } });
      expect(dbNote?.deletedAt).not.toBeNull();
    });

    it('payload projection contract: GET /notes omits rawContent, while GET /notes/:id returns full rawContent', async () => {
      const createRes = await ctx.req
        .post('/notes')
        .set(ADMIN_AUTH_HEADER)
        .send({
          title: 'Article With Massive Raw Content',
          description: 'A brief description',
          rawContent: '# Full Article\n\nThis is a 20KB markdown article body that must not bloat feed list queries.',
          privacy: 'public',
          status: 'PUBLISHED',
          type: 'SINGLE',
          startDate: new Date('2026-11-01T10:00:00Z').toISOString(),
        })
        .expect(201);

      const noteId = createRes.body.id;

      // 1. GET /notes list MUST NOT include rawContent
      const listRes = await ctx.req.get('/notes').expect(200);
      const createdInList = listRes.body.items?.find((n: any) => n.id === noteId);
      expect(createdInList).toBeDefined();
      expect(createdInList.rawContent).toBeUndefined();

      // 2. GET /notes/:id detail MUST include rawContent for reader modals
      const detailRes = await ctx.req
        .get(`/notes/${noteId}`)
        .set(ADMIN_AUTH_HEADER)
        .expect(200);
      expect(detailRes.body.rawContent).toContain('This is a 20KB markdown article body');

      // 3. Validation contract: GET /notes?limit=9999 is rejected by ValidationPipe with 400 Bad Request
      const rejectedList = await ctx.req
        .get('/notes?limit=9999')
        .set(ADMIN_AUTH_HEADER)
        .expect(400);
      expect(JSON.stringify(rejectedList.body)).toContain('limit must not be greater than 500');

      // 4. Valid max limit=500 returns 200 with limit: 500
      const validMaxList = await ctx.req
        .get('/notes?limit=500')
        .set(ADMIN_AUTH_HEADER)
        .expect(200);
      expect(validMaxList.body.limit).toBe(500);
    });
  });
});
