import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, cleanDatabase, ADMIN_AUTH_HEADER, TestContext } from './test-context';

describe('Project Lenta Backend - Folders API Integration (PostgreSQL)', () => {
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

  describe('POST /folders - Creation & Path Normalization', () => {
    it('creates a root folder with binary privacy "public" and extracts name', async () => {
      const res = await ctx.req
        .post('/folders')
        .set(ADMIN_AUTH_HEADER)
        .send({
          path: 'Spark',
          privacy: 'public',
          color: '#2481cc',
          icon: 'folder',
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        path: 'Spark',
        name: 'Spark',
        privacy: 'public',
        color: '#2481cc',
        icon: 'folder',
      });
      expect(res.body.id).toBeDefined();
    });

    it('normalizes paths with slashes and whitespace', async () => {
      const res = await ctx.req
        .post('/folders')
        .set(ADMIN_AUTH_HEADER)
        .send({
          path: ' /Spark/AI/LLM/// ',
          privacy: 'private',
        });

      expect(res.status).toBe(201);
      expect(res.body.path).toBe('Spark/AI/LLM');
      expect(res.body.name).toBe('LLM');
      expect(res.body.privacy).toBe('private');
    });

    it('[BUG-004] auto-provisions missing folders when creating a feed', async () => {
      const feedRes = await ctx.req
        .post('/feeds')
        .set(ADMIN_AUTH_HEADER)
        .send({
          title: 'Auto Folder Feed',
          slug: 'auto-folder-feed',
          privacy: 'public',
          folderPaths: ['AutoSpark/SubChannel'],
        });

      expect(feedRes.status).toBe(201);

      // Verify the folder was automatically provisioned in PostgreSQL with matching privacy
      const folder = await ctx.prisma.folder.findFirst({
        where: { path: 'AutoSpark/SubChannel' },
      });
      expect(folder).not.toBeNull();
      expect(folder?.privacy).toBe('public');
    });
  });

  describe('GET /folders/tree - Hierarchical Obsidian Explorer', () => {
    it('builds a nested parent-child tree structure from flat paths', async () => {
      // Create hierarchy
      await ctx.req.post('/folders').set(ADMIN_AUTH_HEADER).send({ path: 'Archive', privacy: 'public' });
      await ctx.req.post('/folders').set(ADMIN_AUTH_HEADER).send({ path: 'Archive/2026', privacy: 'public' });
      await ctx.req.post('/folders').set(ADMIN_AUTH_HEADER).send({ path: 'Archive/2026/Q1', privacy: 'public' });

      const res = await ctx.req.get('/folders/tree').set(ADMIN_AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const archiveNode = res.body.find((n: any) => n.path === 'Archive');
      expect(archiveNode).toBeDefined();
      expect(archiveNode.children).toBeDefined();
      expect(archiveNode.children.length).toBeGreaterThanOrEqual(1);

      const y2026 = archiveNode.children.find((n: any) => n.path === 'Archive/2026');
      expect(y2026).toBeDefined();
      expect(y2026.children.length).toBe(1);
      expect(y2026.children[0].path).toBe('Archive/2026/Q1');
    });
  });

  describe('Binary Privacy & Scoping (AGENTS.md §9)', () => {
    it('enforces privacy visibility: anonymous sees only public folders, admin sees all', async () => {
      await ctx.req.post('/folders').set(ADMIN_AUTH_HEADER).send({ path: 'OpenPublic', privacy: 'public' });
      await ctx.req.post('/folders').set(ADMIN_AUTH_HEADER).send({ path: 'SecretVault', privacy: 'private' });

      // Anonymous list
      const anonRes = await ctx.req.get('/folders');
      expect(anonRes.status).toBe(200);
      const anonPaths = anonRes.body.map((f: any) => f.path);
      expect(anonPaths).toContain('OpenPublic');
      expect(anonPaths).not.toContain('SecretVault');

      // Admin list
      const adminRes = await ctx.req.get('/folders').set(ADMIN_AUTH_HEADER);
      expect(adminRes.status).toBe(200);
      const adminPaths = adminRes.body.map((f: any) => f.path);
      expect(adminPaths).toContain('OpenPublic');
      expect(adminPaths).toContain('SecretVault');
    });
  });

  describe('DELETE & Soft-Deletion Lifecycle', () => {
    it('soft deletes folder and sets deletedAt timestamp', async () => {
      const created = await ctx.req
        .post('/folders')
        .set(ADMIN_AUTH_HEADER)
        .send({ path: 'ToDelete', privacy: 'public' });

      const folderId = created.body.id;

      // Soft delete
      const delRes = await ctx.req.delete(`/folders/${folderId}`).set(ADMIN_AUTH_HEADER);
      expect(delRes.status).toBe(200);

      // Verify excluded from default list
      const listRes = await ctx.req.get('/folders').set(ADMIN_AUTH_HEADER);
      const paths = listRes.body.map((f: any) => f.id);
      expect(paths).not.toContain(folderId);

      // Verify present when includeDeleted=true
      const deletedListRes = await ctx.req
        .get('/folders?includeDeleted=true')
        .set(ADMIN_AUTH_HEADER);
      const delItem = deletedListRes.body.find((f: any) => f.id === folderId);
      expect(delItem).toBeDefined();
      expect(delItem.deletedAt).not.toBeNull();
    });
  });
});
