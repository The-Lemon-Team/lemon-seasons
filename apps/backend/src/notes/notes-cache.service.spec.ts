import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotesCacheService } from './notes-cache.service';

describe('NotesCacheService', () => {
  let cache: NotesCacheService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T10:00:00Z'));
    cache = new NotesCacheService();
  });
  afterEach(() => vi.useRealTimers());

  describe('Cache › get / set', () => {
    it('returns null for unknown keys', () => {
      expect(cache.get('nope')).toBeNull();
    });

    it('returns stored data until the default 20s TTL elapses', () => {
      cache.set('k', { a: 1 });
      vi.advanceTimersByTime(19_999);
      expect(cache.get('k')).toEqual({ a: 1 });
      vi.advanceTimersByTime(2);
      expect(cache.get('k')).toBeNull();
    });

    it('honours a custom TTL', () => {
      cache.set('k', 'v', 1_000);
      vi.advanceTimersByTime(1_001);
      expect(cache.get('k')).toBeNull();
    });

    it('overwrites and refreshes an existing key', () => {
      cache.set('k', 1, 1_000);
      vi.advanceTimersByTime(900);
      cache.set('k', 2, 1_000);
      vi.advanceTimersByTime(900);
      expect(cache.get('k')).toBe(2);
    });
  });

  describe('Cache › capacity', () => {
    it('evicts the oldest entry once 100 entries are stored', () => {
      for (let i = 0; i < 100; i++) cache.set(`k${i}`, i);
      cache.set('k100', 100);
      expect(cache.get('k0')).toBeNull();
      expect(cache.get('k1')).toBe(1);
      expect(cache.get('k100')).toBe(100);
    });
  });

  describe('Cache › invalidateAll', () => {
    it('clears every entry', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.invalidateAll();
      expect(cache.get('a')).toBeNull();
      expect(cache.get('b')).toBeNull();
    });

    it('is a no-op on an empty cache', () => {
      expect(() => cache.invalidateAll()).not.toThrow();
    });
  });

  describe('Cache › generateKey', () => {
    it('is independent of parameter order', () => {
      expect(cache.generateKey('p', { b: 2, a: 1 })).toBe(cache.generateKey('p', { a: 1, b: 2 }));
    });

    it('ignores undefined, null and empty-string params', () => {
      expect(cache.generateKey('p', { a: 1, b: undefined, c: null, d: '' })).toBe(cache.generateKey('p', { a: 1 }));
    });

    it('keeps falsy-but-meaningful values (0 and false)', () => {
      expect(cache.generateKey('p', { page: 0, flag: false })).not.toBe(cache.generateKey('p', {}));
    });

    it('separates different prefixes and different values', () => {
      expect(cache.generateKey('a', { x: 1 })).not.toBe(cache.generateKey('b', { x: 1 }));
      expect(cache.generateKey('a', { x: 1 })).not.toBe(cache.generateKey('a', { x: 2 }));
    });

    it('distinguishes admin from non-admin queries (no cross-privilege cache leaks)', () => {
      expect(cache.generateKey('findAll', { appMode: 'dev', isAdmin: true })).not.toBe(
        cache.generateKey('findAll', { appMode: 'dev', isAdmin: false }),
      );
    });
  });
});
