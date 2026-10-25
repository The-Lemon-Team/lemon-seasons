import { Prisma } from '@prisma/client';
import { NoteFieldName, NoteSyncState, formatHlc } from '@lenta/shared';

export const SCALAR_NOTE_FIELDS: readonly NoteFieldName[] = [
  'title',
  'description',
  'folderPath',
  'feedId',
  'icon',
  'sourceLink',
];

/** Maps a persisted Note row to the shared merge state (unstamped fields fall back to updatedAt). */
export function toNoteSyncState(note: Prisma.NoteGetPayload<object>): NoteSyncState {
  const stored = (note.fieldClocks ?? {}) as Record<string, string>;
  const fallback = formatHlc({ wallMs: note.updatedAt.getTime(), counter: 0, deviceId: 'backend' });
  const clocks: Partial<Record<NoteFieldName, string>> = {};
  for (const k of SCALAR_NOTE_FIELDS) clocks[k] = stored[k] ?? fallback;
  return {
    id: note.id,
    version: note.version,
    fields: {
      title: note.title,
      description: note.description,
      folderPath: note.folderPath,
      feedId: note.feedId,
      icon: note.icon,
      sourceLink: note.sourceLink,
    },
    clocks,
    deletedHlc: note.deletedHlc,
  };
}
