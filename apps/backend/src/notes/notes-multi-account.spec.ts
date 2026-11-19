import { describe, expect, it, vi } from 'vitest';
import { NotesQueryBuilder } from './notes-query.builder';

describe('NotesQueryBuilder › Multi-account & Group NoteShare isolation', () => {
  const buildBuilder = () => {
    const prisma = {
      feed: {
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async () => null),
      },
    };
    return new NotesQueryBuilder(prisma as any);
  };

  it('allows authenticated human user to read public notes, own private notes, and shared notes', async () => {
    const builder = buildBuilder();
    const where = await builder.buildWhereClause({}, false, {
      id: 'usr-human-1',
      role: 'user',
      isAdmin: false,
    });

    const json = JSON.stringify(where);
    expect(json).toContain('"ownerUserId":"usr-human-1"');
    expect(json).toContain('"granteeUserId":"usr-human-1"');
    expect(json).toContain('"privacy":"public"');
  });

  it('isolates separate agent account to only its own private notes and shares when privacy=private', async () => {
    const builder = buildBuilder();
    const where = await builder.buildWhereClause({ privacy: 'private' } as any, false, {
      id: 'usr-agent-1',
      role: 'agent',
      isAdmin: false,
    });

    const json = JSON.stringify(where);
    expect(json).toContain('"ownerUserId":"usr-agent-1"');
    expect(json).toContain('"granteeUserId":"usr-agent-1"');
    expect(json).not.toContain('"privacy":"public"');
  });
});
