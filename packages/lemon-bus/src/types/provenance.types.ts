export type NoteOrigin =
  | 'DIRECT_API'
  | 'DIRECT_UI'
  | 'NEURON_PARTY'
  | 'CODING_AGENT'
  | 'SUPABASE_SPARK'
  | 'GDRIVE_SPARK'
  | 'OBSIDIAN_CONTAINER';

export type BusDriverKind = 'supabase' | 'gdrive-cloud' | 'gdrive-fs' | 'hybrid' | 'memory' | 'cloud';

export interface NoteProvenance {
  /** Authoritative origin of the note (decoupled from the bus transport). */
  origin: NoteOrigin;
  /** Canonical path only when the note originated from a physical/cloud document. */
  canonicalPath?: string | null;
  /** Content SHA-256 hash when applicable. */
  fileHash?: string | null;
  /** Backing file provider when applicable. */
  storageProvider?: 'supabase' | 'gdrive' | 'obsidian' | 'local' | null;
  /** Bus driver that carried the event (never overwrites origin). */
  transportVia?: BusDriverKind | null;
  /** Originating node/device identifier. */
  deviceId?: string | null;
  /** Optional persona/actor identifier (e.g. actor-hades in lemon-party). */
  actorId?: string | null;
}

const SOURCE_TYPE_TO_ORIGIN_MAP: Record<string, NoteOrigin> = {
  GOOGLE_DRIVE: 'GDRIVE_SPARK',
  GDRIVE_SPARK: 'GDRIVE_SPARK',
  SUPABASE_SPARK: 'SUPABASE_SPARK',
  NEURON_PARTY: 'NEURON_PARTY',
  LEMON_PARTY: 'NEURON_PARTY',
  CODING_AGENT: 'CODING_AGENT',
  LEMON_ACTIONS: 'CODING_AGENT',
  LEMON_WATCHERS: 'CODING_AGENT',
  WATCHER: 'CODING_AGENT',
  OBSIDIAN: 'OBSIDIAN_CONTAINER',
  OBSIDIAN_CONTAINER: 'OBSIDIAN_CONTAINER',
  MANUAL: 'DIRECT_UI',
  DIRECT_UI: 'DIRECT_UI',
  API: 'DIRECT_API',
  DIRECT_API: 'DIRECT_API',
};

/**
 * Resolves the true origin of a note without conflating it with the bus transport.
 */
export function resolveNoteOrigin(input: {
  origin?: string | null;
  sourceType?: string | null;
  metadata?: Record<string, any> | null;
}): NoteOrigin {
  const explicit =
    input.origin ||
    input.metadata?.provenance?.origin ||
    input.metadata?.origin;

  if (explicit && SOURCE_TYPE_TO_ORIGIN_MAP[String(explicit).toUpperCase()]) {
    return SOURCE_TYPE_TO_ORIGIN_MAP[String(explicit).toUpperCase()];
  }

  if (input.sourceType) {
    const mapped = SOURCE_TYPE_TO_ORIGIN_MAP[input.sourceType.toUpperCase()];
    if (mapped) return mapped;
  }

  return 'DIRECT_API';
}

/**
 * Maps NoteOrigin back to a clean sourceType label for Prisma Note persistence
 * so non-Google-Drive notes are never mislabeled as 'GOOGLE_DRIVE'.
 */
export function originToSourceType(origin: NoteOrigin, fallback?: string | null): string {
  const map: Record<NoteOrigin, string> = {
    DIRECT_UI: 'MANUAL',
    DIRECT_API: 'API',
    NEURON_PARTY: 'NEURON_PARTY',
    CODING_AGENT: 'CODING_AGENT',
    SUPABASE_SPARK: 'SUPABASE_SPARK',
    GDRIVE_SPARK: 'GOOGLE_DRIVE',
    OBSIDIAN_CONTAINER: 'OBSIDIAN',
  };
  return map[origin] || fallback || 'API';
}
