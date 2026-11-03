import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventsSseService } from './events-sse.service';
import { NotePublishedEvent } from './note-published.event';
import { firstValueFrom, take } from 'rxjs';

describe('EventsSseService', () => {
  let service: EventsSseService;
  const mockPrisma = {
    feed: {
      findUnique: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EventsSseService(mockPrisma as any);
  });

  it('records a new note.published event in recent buffer and streams it', async () => {
    mockPrisma.feed.findUnique.mockResolvedValueOnce({
      slug: 'marvel',
      title: 'Marvel Universe',
      icon: '🛡️',
      color: '#ef4444',
    });

    const event = new NotePublishedEvent(
      'note-1',
      'Avengers 5 Title',
      'Entertainment/Marvel',
      'PUBLISHED',
      new Date('2026-11-03'),
      'feed-123',
      true,
      { privacy: 'public' }
    );

    const streamPromise = firstValueFrom(service.getEventStream(false));
    await service.handleNotePublished(event);

    const message = await streamPromise;
    expect(message.type).toBe('note');
    const parsed = JSON.parse(message.data as string);
    expect(parsed.noteId).toBe('note-1');
    expect(parsed.title).toBe('Avengers 5 Title');
    expect(parsed.feedSlug).toBe('marvel');
    expect(parsed.feedTitle).toBe('Marvel Universe');
    expect(parsed.privacy).toBe('public');

    const recent = service.getRecentEvents(false);
    expect(recent).toHaveLength(1);
    expect(recent[0].title).toBe('Avengers 5 Title');
  });

  it('filters private events for anonymous users while showing them to admin', async () => {
    const privateEvent = new NotePublishedEvent(
      'note-priv',
      'Confidential Note',
      'Secret',
      'PUBLISHED',
      new Date(),
      null,
      true,
      { privacy: 'private' }
    );

    await service.handleNotePublished(privateEvent);

    const anonRecent = service.getRecentEvents(false);
    expect(anonRecent).toHaveLength(0);

    const adminRecent = service.getRecentEvents(true);
    expect(adminRecent).toHaveLength(1);
    expect(adminRecent[0].title).toBe('Confidential Note');
  });

  it('buffers note.deleted event', () => {
    service.handleNoteDeleted({ noteId: 'del-1' });
    const adminRecent = service.getRecentEvents(true);
    expect(adminRecent).toHaveLength(1);
    expect(adminRecent[0].type).toBe('NOTE_DELETED');
    expect(adminRecent[0].noteId).toBe('del-1');
  });
});
