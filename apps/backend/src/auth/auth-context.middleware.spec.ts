import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContextMiddleware } from './auth-context.middleware';

const MASTER = 'lenta_adm_master_permanent_7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c';

function setup(opts: { env?: Record<string, string>; dbKey?: unknown; dbError?: boolean } = {}) {
  const config = { get: vi.fn((k: string) => opts.env?.[k]) };
  const findUnique = vi.fn(async () => {
    if (opts.dbError) throw new Error('db down');
    return opts.dbKey ?? null;
  });
  const prisma = { userKey: { findUnique } };
  const mw = new AuthContextMiddleware(config as any, prisma as any);
  const run = async (headers: Record<string, string> = {}) => {
    const req: any = { headers };
    const next = vi.fn();
    await mw.use(req, {}, next);
    return { user: req.user, next };
  };
  return { mw, run, findUnique };
}

describe('AuthContextMiddleware', () => {
  beforeEach(() => {
    delete process.env.ADMIN_TOKEN;
    delete process.env.VITE_ADMIN_TOKEN;
  });

  describe('Auth › guest', () => {
    it('treats requests without credentials as the guest user and calls next()', async () => {
      const { run } = setup();
      const { user, next } = await run();
      expect(user).toMatchObject({ id: 'usr-guest-000', role: 'guest', isAdmin: false });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('falls back to guest for an unknown token that is not in the DB', async () => {
      const { run } = setup();
      const { user } = await run({ authorization: 'Bearer who-is-this' });
      expect(user.role).toBe('guest');
    });
  });

  describe('Auth › token transport', () => {
    it.each([
      ['Authorization: Bearer <token>', { authorization: `Bearer ${MASTER}` }],
      ['Authorization: <token> (no scheme)', { authorization: MASTER }],
      ['x-api-key', { 'x-api-key': MASTER }],
      ['x-user-key', { 'x-user-key': MASTER }],
      ['x-admin-token', { 'x-admin-token': MASTER }],
    ])('accepts the master admin token via %s', async (_name, headers) => {
      const { run } = setup();
      const { user } = await run(headers as Record<string, string>);
      expect(user).toMatchObject({ id: 'usr-admin-master', role: 'admin', isAdmin: true });
    });

    it('trims whitespace around a bearer token', async () => {
      const { run } = setup();
      const { user } = await run({ authorization: `Bearer   ${MASTER}  ` });
      expect(user.isAdmin).toBe(true);
    });
  });

  describe('Auth › admin tokens', () => {
    it('accepts a configured ADMIN_TOKEN from ConfigService', async () => {
      const { run } = setup({ env: { ADMIN_TOKEN: 'custom-secret' } });
      const { user } = await run({ 'x-api-key': 'custom-secret' });
      expect(user).toMatchObject({ id: 'usr-admin-master', isAdmin: true });
    });

    it('accepts any lenta_adm_master_* prefixed token', async () => {
      const { run } = setup();
      const { user } = await run({ 'x-api-key': 'lenta_adm_master_anything' });
      expect(user.isAdmin).toBe(true);
    });

    it.each(['lenta_tok_admin_abc', 'admin-demo-token'])('treats demo admin token %s as admin', async (token) => {
      const { run } = setup();
      const { user } = await run({ 'x-api-key': token });
      expect(user).toMatchObject({ id: 'usr-admin-999', role: 'admin', isAdmin: true });
    });

    it('does not query the database for admin tokens', async () => {
      const { run, findUnique } = setup();
      await run({ 'x-api-key': MASTER });
      expect(findUnique).not.toHaveBeenCalled();
    });
  });

  describe('Auth › user keys (database)', () => {
    const dbKey = { isRevoked: false, user: { id: 'u1', role: 'user', name: 'Alice' } };

    it('resolves a valid, non-revoked key to its user', async () => {
      const { run, findUnique } = setup({ dbKey });
      const { user } = await run({ 'x-user-key': 'key-1' });
      expect(user).toEqual({ id: 'u1', role: 'user', isAdmin: false, name: 'Alice' });
      expect(findUnique).toHaveBeenCalledWith({ where: { key: 'key-1' }, include: { user: true } });
    });

    it('marks users with role=admin as admin', async () => {
      const { run } = setup({ dbKey: { isRevoked: false, user: { id: 'u2', role: 'admin', name: 'Root' } } });
      const { user } = await run({ 'x-user-key': 'key-2' });
      expect(user.isAdmin).toBe(true);
    });

    it('rejects revoked keys (falls back to guest)', async () => {
      const { run } = setup({ dbKey: { ...dbKey, isRevoked: true } });
      const { user } = await run({ 'x-user-key': 'key-1' });
      expect(user.role).toBe('guest');
    });

    it('rejects keys whose user no longer exists', async () => {
      const { run } = setup({ dbKey: { isRevoked: false, user: null } });
      const { user } = await run({ 'x-user-key': 'key-1' });
      expect(user.role).toBe('guest');
    });

    it('caches a resolved key so repeated requests skip the database', async () => {
      const { run, findUnique } = setup({ dbKey });
      await run({ 'x-user-key': 'key-1' });
      await run({ 'x-user-key': 'key-1' });
      expect(findUnique).toHaveBeenCalledTimes(1);
    });

    it('re-queries after the 60s cache TTL', async () => {
      vi.useFakeTimers();
      try {
        const { run, findUnique } = setup({ dbKey });
        await run({ 'x-user-key': 'key-1' });
        vi.advanceTimersByTime(60_001);
        await run({ 'x-user-key': 'key-1' });
        expect(findUnique).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('falls back to guest when the lookup fails', async () => {
      const { run } = setup({ dbError: true });
      const { user, next } = await run({ 'x-user-key': 'key-1' });
      expect(user.role).toBe('guest');
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('still accepts demo lenta_tok_user_* tokens when the DB has no match', async () => {
      const { run } = setup();
      const { user } = await run({ 'x-user-key': 'lenta_tok_user_demo' });
      expect(user).toMatchObject({ id: 'usr-member-001', role: 'user', isAdmin: false });
    });
  });

  describe('Auth › known gaps', () => {
    it.todo(
      'a request must not become admin just because it presents the hard-coded default master token ' +
        '(the token is committed to source and also hard-coded in the feed-app client bundle)',
    );
  });
});
