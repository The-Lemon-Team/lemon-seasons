import { describe, expect, it } from 'vitest';
import { SCALAR_NOTE_FIELDS, toNoteSyncState } from './note-state.mapper';

const base = {
  id: 'n1',
  version: 3,
  title: 'T',
  description: 'D',
  folderPath: 'a/b',
  feedId: 'f1',
  icon: '✨',
  sourceLink: 'https://x.y',
  fieldClocks: null as any,
  deletedHlc: null as string | null,
  updatedAt: new Date('2026-10-31T10:00:00.000Z'),
};

describe('toNoteSyncState', () => {
  describe('Sync › note state mapper', () => {
    it('maps the scalar fields, id and version', () => {
      const s = toNoteSyncState(base as any);
      expect(s.id).toBe('n1');
      expect(s.version).toBe(3);
      expect(s.fields).toEqual({
        title: 'T',
        description: 'D',
        folderPath: 'a/b',
        feedId: 'f1',
        icon: '✨',
        sourceLink: 'https://x.y',
      });
    });

    it('produces a clock for every scalar field', () => {
      const s = toNoteSyncState(base as any);
      expect(Object.keys(s.clocks).sort()).toEqual([...SCALAR_NOTE_FIELDS].sort());
    });

    it('uses stored field clocks where present', () => {
      const s = toNoteSyncState({ ...base, fieldClocks: { title: 'stored-hlc' } } as any);
      expect(s.clocks.title).toBe('stored-hlc');
    });

    it('stamps unstamped fields with a fallback derived from updatedAt (same for all, deterministic)', () => {
      const a = toNoteSyncState(base as any);
      const b = toNoteSyncState(base as any);
      expect(a.clocks.description).toBe(b.clocks.description);
      expect(a.clocks.description).toBe(a.clocks.icon);
      expect(a.clocks.description).toContain('backend');
    });

    it('the fallback grows with updatedAt so newer rows win over older unstamped ones', () => {
      const older = toNoteSyncState(base as any).clocks.title!;
      const newer = toNoteSyncState({ ...base, updatedAt: new Date('2026-11-01T10:00:00.000Z') } as any).clocks.title!;
      expect(newer > older).toBe(true);
    });

    it('passes the tombstone through', () => {
      expect(toNoteSyncState({ ...base, deletedHlc: 'dead-hlc' } as any).deletedHlc).toBe('dead-hlc');
      expect(toNoteSyncState(base as any).deletedHlc).toBeNull();
    });
  });
});
