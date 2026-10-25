import { compareHlc, maxHlc } from './hlc';
import { diff3Merge } from './diff3';
import {
  NOTE_FIELD_NAMES,
  NoteAttachment,
  NoteFieldName,
  NoteFields,
  NoteSyncState,
  SyncEventEnvelope,
  SyncRole,
} from './events';

export type MergeOutcome =
  | 'APPLIED' // event fully applied (clean merge / fast-forward / LWW)
  | 'NOOP' // nothing changed (duplicate or older than local)
  | 'CONFLICT_ATTACHED' // body collided; remote text saved as attachment, parent untouched
  | 'DEFER' // replica has a colliding local edit: push outbox first, then re-pull
  | 'IGNORED_DELETED' // edit older than the tombstone
  | 'DELETED'; // tombstone applied

export interface MergeContext {
  /** AUTHORITY (backend) resolves conflicts; REPLICA (mobile) defers them to the authority. */
  role: SyncRole;
  /** Description text at `event.baseVersion`; null when unknown. */
  baseDescription: string | null;
}

export interface MergeResult {
  note: NoteSyncState;
  attachments: NoteAttachment[];
  outcome: MergeOutcome;
}

const clone = (n: NoteSyncState): NoteSyncState => ({
  ...n,
  fields: { ...n.fields },
  clocks: { ...n.clocks },
});

const noteLastHlc = (n: NoteSyncState): string | null =>
  Object.values(n.clocks).reduce<string | null>((acc, c) => maxHlc(acc, c), null);

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function buildConflictAttachment(
  local: NoteSyncState,
  event: SyncEventEnvelope<NoteFields>,
  remoteText: string,
): NoteAttachment {
  return {
    id: `conflict-${local.id}-${event.eventId}`,
    noteId: local.id,
    kind: 'CONFLICT_COPY',
    title: `Conflict copy (${event.deviceId})`,
    content: remoteText,
    meta: {
      deviceId: event.deviceId,
      hlc: event.hlc,
      eventId: event.eventId,
      baseVersion: event.baseVersion ?? null,
    },
  };
}

type DescriptionDecision =
  | { kind: 'KEEP' }
  | { kind: 'TAKE'; text: string }
  | { kind: 'CONFLICT' };

function decideDescription(
  local: string,
  remote: string,
  base: string | null,
): DescriptionDecision {
  if (local === remote) return { kind: 'KEEP' };
  if (!local) return { kind: 'TAKE', text: remote };
  if (!remote) return { kind: 'KEEP' };
  if (base !== null) {
    if (local === base) return { kind: 'TAKE', text: remote }; // only remote changed
    if (remote === base) return { kind: 'KEEP' }; // only local changed
    const merged = diff3Merge(base, local, remote);
    return merged.clean ? { kind: 'TAKE', text: merged.text } : { kind: 'CONFLICT' };
  }
  return { kind: 'CONFLICT' };
}

/**
 * Pure merge of one remote NOTE event into the local note state.
 *
 * - Scalar fields: per-field last-writer-wins by HLC.
 * - Deletes: tombstones win only when newer than the latest local write.
 * - Description: 3-way line merge; a true collision never touches the parent text on the
 *   AUTHORITY — the incoming (non-authority) text is returned as a CONFLICT_COPY attachment.
 */
export function mergeNoteEvent(
  local: NoteSyncState,
  event: SyncEventEnvelope<NoteFields | null>,
  ctx: MergeContext,
): MergeResult {
  const note = clone(local);

  if (event.action === 'DELETE') {
    if (compareHlc(event.hlc, noteLastHlc(local)) > 0 && compareHlc(event.hlc, local.deletedHlc) > 0) {
      note.deletedHlc = event.hlc;
      note.version = local.version + 1;
      return { note, attachments: [], outcome: 'DELETED' };
    }
    return { note, attachments: [], outcome: 'NOOP' };
  }

  if (local.deletedHlc) {
    if (compareHlc(event.hlc, local.deletedHlc) <= 0) {
      return { note, attachments: [], outcome: 'IGNORED_DELETED' };
    }
    note.deletedHlc = null; // resurrected by a newer edit
  }

  const incoming = (event.payload ?? {}) as NoteFields;
  const attachments: NoteAttachment[] = [];
  let changed = note.deletedHlc !== local.deletedHlc;
  let outcome: MergeOutcome = 'APPLIED';

  for (const field of NOTE_FIELD_NAMES as readonly NoteFieldName[]) {
    if (!(field in incoming) || incoming[field] === undefined) continue;
    const remoteValue = incoming[field];
    const remoteNewer = compareHlc(event.hlc, local.clocks[field]) > 0;

    if (field === 'description') {
      const decision = decideDescription(
        local.fields.description ?? '',
        (remoteValue as string | null) ?? '',
        ctx.baseDescription,
      );
      if (decision.kind === 'CONFLICT') {
        if (ctx.role === 'REPLICA') {
          return { note: clone(local), attachments: [], outcome: 'DEFER' };
        }
        attachments.push(buildConflictAttachment(local, event as SyncEventEnvelope<NoteFields>, (remoteValue as string) ?? ''));
        outcome = 'CONFLICT_ATTACHED';
        continue;
      }
      if (decision.kind === 'TAKE' && decision.text !== (local.fields.description ?? '')) {
        note.fields.description = decision.text;
        changed = true;
      }
      note.clocks.description = maxHlc(local.clocks.description, event.hlc) ?? event.hlc;
      continue;
    }

    if (remoteNewer && !sameValue(local.fields[field], remoteValue)) {
      (note.fields as Record<string, unknown>)[field] = remoteValue;
      note.clocks[field] = event.hlc;
      changed = true;
    } else if (remoteNewer) {
      note.clocks[field] = event.hlc;
    }
  }

  if (changed) note.version = local.version + 1;
  if (!changed && attachments.length === 0) outcome = 'NOOP';
  return { note, attachments, outcome };
}
