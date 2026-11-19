import { createHmac, timingSafeEqual } from 'crypto';
import { RequestUser } from '../auth/auth.types';

function getSigningSecret(): string {
  return (
    process.env.MEDIA_SIGNING_SECRET ||
    process.env.ADMIN_TOKEN ||
    'lemon-seasons-media-signing-secret'
  );
}

export interface NoteShareRecordLike {
  granteeUserId: string;
  canReadMedia?: boolean;
  expiresAt?: Date | string | null;
}

export interface FeedShareRecordLike {
  granteeUserId: string;
  permission?: string;
}

export interface NoteAccessSubject {
  id: string;
  privacy?: string | null;
  status?: string | null;
  ownerUserId?: string | null;
  feed?: { privacy?: string | null; shares?: FeedShareRecordLike[] } | null;
  shares?: NoteShareRecordLike[];
  folders?: Array<{ folder?: { privacy?: string | null } | null }>;
}

export function isNoteShareActive(share: NoteShareRecordLike, now = new Date()): boolean {
  if (!share.expiresAt) return true;
  const exp = share.expiresAt instanceof Date ? share.expiresAt : new Date(share.expiresAt);
  return exp.getTime() > now.getTime();
}

/**
 * Authoritative access check for a Note and its attached files.
 * Never trusts an unverified client-supplied group/board ID:
 * access to private notes requires ownership, admin role, or an explicit NoteShare / FeedShare grant.
 */
export function canUserReadNoteRecord(
  note: NoteAccessSubject,
  viewer?: RequestUser | null,
  options?: { isPrivateFolderPath?: boolean; now?: Date },
): boolean {
  if (viewer?.isAdmin) return true;

  const viewerId = viewer?.id;
  const isAuthenticated = Boolean(viewerId && viewer?.role !== 'guest');

  if (isAuthenticated && note.ownerUserId && note.ownerUserId === viewerId) {
    return true;
  }

  if (isAuthenticated && viewerId) {
    const now = options?.now ?? new Date();
    const hasNoteShare = (note.shares || []).some(
      (s) => s.granteeUserId === viewerId && isNoteShareActive(s, now),
    );
    if (hasNoteShare) return true;

    const hasFeedShare = (note.feed?.shares || []).some((s) => s.granteeUserId === viewerId);
    if (hasFeedShare) return true;
  }

  const isPublicNote = note.privacy === 'public' && note.status === 'PUBLISHED';
  if (!isPublicNote) return false;
  if (note.feed?.privacy && note.feed.privacy !== 'public') return false;
  if (note.folders?.some((f) => f.folder?.privacy === 'private')) return false;
  if (options?.isPrivateFolderPath) return false;

  return true;
}

export function signNoteMediaToken(input: {
  noteId: string;
  imageId: string;
  viewerUserId: string;
  exp: number;
  variant?: 'full' | 'thumb';
}): string {
  const payload = `${input.noteId}:${input.imageId}:${input.viewerUserId}:${input.exp}:${input.variant || 'full'}`;
  return createHmac('sha256', getSigningSecret()).update(payload).digest('hex');
}

export function verifyNoteMediaSignature(input: {
  noteId: string;
  imageId: string;
  viewerUserId?: string;
  exp?: string | number;
  sig?: string;
  variant?: 'full' | 'thumb';
  nowMs?: number;
}): boolean {
  if (!input.viewerUserId || !input.exp || !input.sig) return false;
  const expNum = Number(input.exp);
  if (!Number.isFinite(expNum) || expNum <= (input.nowMs ?? Date.now())) {
    return false;
  }

  const expected = signNoteMediaToken({
    noteId: input.noteId,
    imageId: input.imageId,
    viewerUserId: input.viewerUserId,
    exp: expNum,
    variant: input.variant || 'full',
  });

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(input.sig, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildSignedNoteImageUrl(input: {
  noteId: string;
  imageId: string;
  viewerUserId: string;
  variant?: 'full' | 'thumb';
  ttlMs?: number;
}): string {
  const exp = Date.now() + (input.ttlMs ?? 15 * 60_000);
  const variant = input.variant || 'full';
  const sig = signNoteMediaToken({
    noteId: input.noteId,
    imageId: input.imageId,
    viewerUserId: input.viewerUserId,
    exp,
    variant,
  });
  return `/notes/${encodeURIComponent(input.noteId)}/images/${encodeURIComponent(
    input.imageId,
  )}/file?variant=${variant}&uid=${encodeURIComponent(input.viewerUserId)}&exp=${exp}&sig=${sig}`;
}

export function rewritePrivateNoteImageUrls<T extends { id: string; privacy?: string | null; images?: any[] }>(
  note: T,
  viewer?: RequestUser | null,
): T {
  if (!note || note.privacy !== 'private' || !Array.isArray(note.images) || note.images.length === 0) {
    return note;
  }
  const viewerUserId = viewer?.id || 'usr-guest-000';
  return {
    ...note,
    images: note.images.map((img) => {
      if (!img?.id || !img?.url || !String(img.url).startsWith('/uploads/')) {
        return img;
      }
      return {
        ...img,
        url: buildSignedNoteImageUrl({
          noteId: note.id,
          imageId: img.id,
          viewerUserId,
          variant: 'full',
        }),
        thumbnailUrl: img.thumbnailUrl
          ? buildSignedNoteImageUrl({
              noteId: note.id,
              imageId: img.id,
              viewerUserId,
              variant: 'thumb',
            })
          : undefined,
      };
    }),
  };
}
