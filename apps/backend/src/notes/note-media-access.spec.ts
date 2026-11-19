import { describe, expect, it } from 'vitest';
import {
  buildSignedNoteImageUrl,
  canUserReadNoteRecord,
  rewritePrivateNoteImageUrls,
  verifyNoteMediaSignature,
} from './note-media-access.util';

describe('note-media-access.util', () => {
  const owner = { id: 'usr-owner-1', role: 'user' as const, isAdmin: false };
  const agent = { id: 'usr-agent-1', role: 'agent' as const, isAdmin: false };
  const stranger = { id: 'usr-stranger-1', role: 'user' as const, isAdmin: false };
  const guest = { id: 'usr-guest-000', role: 'guest' as const, isAdmin: false };

  it('allows owner and explicit NoteShare grantee to read private note, blocks stranger and guest', () => {
    const privateNote = {
      id: 'note-priv-1',
      privacy: 'private',
      status: 'PUBLISHED',
      ownerUserId: owner.id,
      shares: [{ granteeUserId: agent.id, canReadMedia: true, expiresAt: null }],
    };

    expect(canUserReadNoteRecord(privateNote, owner)).toBe(true);
    expect(canUserReadNoteRecord(privateNote, agent)).toBe(true);
    expect(canUserReadNoteRecord(privateNote, stranger)).toBe(false);
    expect(canUserReadNoteRecord(privateNote, guest)).toBe(false);
  });

  it('rejects expired NoteShare grants', () => {
    const privateNote = {
      id: 'note-priv-2',
      privacy: 'private',
      status: 'PUBLISHED',
      ownerUserId: owner.id,
      shares: [
        {
          granteeUserId: agent.id,
          canReadMedia: true,
          expiresAt: new Date(Date.now() - 60_000),
        },
      ],
    };

    expect(canUserReadNoteRecord(privateNote, agent)).toBe(false);
  });

  it('rewrites local /uploads/ URLs on private notes into viewer-bound HMAC signed URLs', () => {
    const note = {
      id: 'note-priv-3',
      privacy: 'private',
      images: [
        {
          id: 'img-1',
          url: '/uploads/notes/secret.webp',
          thumbnailUrl: '/uploads/notes/secret-thumb.webp',
        },
      ],
    };

    const rewritten = rewritePrivateNoteImageUrls(note, agent);
    expect(rewritten.images[0].url).toContain('/notes/note-priv-3/images/img-1/file');
    const urlObj = new URL(`http://localhost${rewritten.images[0].url}`);
    expect(
      verifyNoteMediaSignature({
        noteId: 'note-priv-3',
        imageId: 'img-1',
        viewerUserId: agent.id,
        exp: urlObj.searchParams.get('exp') || '',
        sig: urlObj.searchParams.get('sig') || '',
        variant: 'full',
      }),
    ).toBe(true);

    // Signature bound to agent must fail for stranger
    expect(
      verifyNoteMediaSignature({
        noteId: 'note-priv-3',
        imageId: 'img-1',
        viewerUserId: stranger.id,
        exp: urlObj.searchParams.get('exp') || '',
        sig: urlObj.searchParams.get('sig') || '',
        variant: 'full',
      }),
    ).toBe(false);
  });
});
