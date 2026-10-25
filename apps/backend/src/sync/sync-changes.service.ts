import { Injectable } from '@nestjs/common';
import { NoteAttachment, NoteSyncState } from '@lenta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toNoteSyncState } from './note-state.mapper';

export interface SyncChangesResponse {
  notes: Array<NoteSyncState & { deleted: boolean }>;
  attachments: Array<NoteAttachment & { deleted: boolean }>;
  /** Pass back as `since` on the next pull. */
  cursor: string;
  hasMore: boolean;
}

/**
 * Pull side of the LAN sync: returns authority state changed since a cursor (ISO updatedAt).
 * Boundary rows may repeat across pages (`gte`); clients apply them idempotently by version.
 */
@Injectable()
export class SyncChangesService {
  constructor(private readonly prisma: PrismaService) {}

  async getChanges(since?: string, limit = 200): Promise<SyncChangesResponse> {
    const parsed = since ? new Date(since) : new Date(0);
    const from = Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
    const take = Math.min(Math.max(limit, 1), 500);

    const [notes, attachments] = await Promise.all([
      this.prisma.note.findMany({
        where: { updatedAt: { gte: from } },
        orderBy: { updatedAt: 'asc' },
        take: take + 1,
      }),
      this.prisma.noteAttachment.findMany({
        where: { updatedAt: { gte: from } },
        orderBy: { updatedAt: 'asc' },
        take: take + 1,
      }),
    ]);

    const hasMore = notes.length > take || attachments.length > take;
    const pageNotes = notes.slice(0, take);
    const pageAtts = attachments.slice(0, take);

    // When paging, the cursor must not skip rows of the lagging collection.
    const lastNote = notes.length > take ? pageNotes[pageNotes.length - 1].updatedAt : null;
    const lastAtt = attachments.length > take ? pageAtts[pageAtts.length - 1].updatedAt : null;
    const limits = [lastNote, lastAtt].filter((d): d is Date => d !== null);
    const horizon = limits.length ? new Date(Math.min(...limits.map((d) => d.getTime()))) : null;

    const inRange = <T extends { updatedAt: Date }>(rows: T[]) =>
      horizon ? rows.filter((r) => r.updatedAt <= horizon) : rows;

    const outNotes = inRange(pageNotes);
    const outAtts = inRange(pageAtts);
    const all = [...outNotes, ...outAtts].map((r) => r.updatedAt.getTime());
    const cursor = new Date(all.length ? Math.max(...all) : from.getTime()).toISOString();

    return {
      notes: outNotes.map((n) => ({ ...toNoteSyncState(n), deleted: n.deletedAt !== null })),
      attachments: outAtts.map((a) => ({
        id: a.id,
        noteId: a.noteId,
        kind: a.kind as NoteAttachment['kind'],
        title: a.title,
        content: a.content,
        meta: a.meta as unknown as NoteAttachment['meta'],
        deleted: a.deletedAt !== null,
      })),
      cursor,
      hasMore,
    };
  }
}
