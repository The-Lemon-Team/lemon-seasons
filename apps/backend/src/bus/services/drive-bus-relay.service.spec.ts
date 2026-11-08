import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DriveBusRelayService } from './drive-bus-relay.service';
import { LemonBusEnvelope, LemonBusNotePayload } from '@lenta/lemon-bus';
import { NotePublishedEvent } from '../../events';

describe('DriveBusRelayService & Inbound-to-Database Pipeline', () => {
  let relayService: DriveBusRelayService;
  let mockPrisma: any;
  let mockNotesService: any;
  let mockTransport: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      note: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    mockNotesService = {
      create: vi.fn().mockResolvedValue({ id: 'created-note-1', title: 'Test Note' }),
      update: vi.fn().mockResolvedValue({ id: 'updated-note-1', title: 'Updated Note' }),
      softDelete: vi.fn().mockResolvedValue({ id: 'deleted-note-1' }),
    };

    mockTransport = {
      driver: 'supabase',
      deviceId: 'cloud-server',
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn().mockResolvedValue({}),
      publishSparkDocument: vi.fn().mockResolvedValue({}),
      subscribe: vi.fn().mockReturnValue({
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      }),
      pullSince: vi.fn().mockResolvedValue({ items: [], nextCursor: {} }),
      acknowledgeCursor: vi.fn().mockResolvedValue(undefined),
      hasContentHash: vi.fn().mockResolvedValue(false),
      fetchNoteContent: vi.fn(),
      queryEvents: vi.fn().mockResolvedValue({ total: 0, items: [], page: 1, limit: 25, totalPages: 1 }),
      getStatus: vi.fn().mockResolvedValue({ driver: 'supabase', isWatching: true }),
    };

    relayService = new DriveBusRelayService(mockPrisma, mockNotesService);
    // Inject mock transport directly
    (relayService as any).transport = mockTransport;
    (relayService as any).deviceId = 'local-node-test';
  });

  it('ingests an incoming NOTE envelope from bus directly into local Prisma via NotesService', async () => {
    const envelope: LemonBusEnvelope<LemonBusNotePayload> = {
      eventId: 'evt-100',
      seq: 42,
      timestamp: '2026-11-08T12:00:00.000Z',
      deviceId: 'remote-cloud-bus',
      entityType: 'NOTE',
      action: 'UPSERT',
      origin: 'GDRIVE_SPARK',
      transportVia: 'supabase',
      feedSlug: 'spark-tech-crypto',
      contentHash: 'hash-abc-123',
      privacy: 'public',
      payload: {
        id: 'remote-note-1',
        title: 'Bitcoin Layer 2 Architecture',
        description: 'Detailed analysis of Bitcoin L2 rollups.',
        feedSlug: 'spark-tech-crypto',
        privacy: 'public',
        origin: 'GDRIVE_SPARK',
        provenance: {
          origin: 'GDRIVE_SPARK',
          transportVia: 'supabase',
          deviceId: 'remote-cloud-bus',
        },
        hashtags: ['bitcoin', 'l2', 'crypto'],
        fileHash: 'hash-abc-123',
      },
    };

    await relayService.applyEventToLocalDatabase(envelope);

    expect(mockNotesService.create).toHaveBeenCalledTimes(1);
    const createArg = mockNotesService.create.mock.calls[0][0];
    expect(createArg.title).toBe('Bitcoin Layer 2 Architecture');
    expect(createArg.description).toBe('Detailed analysis of Bitcoin L2 rollups.');
    expect(createArg.feedSlug).toBe('spark-tech-crypto');
    expect(createArg.privacy).toBe('public');
    expect(createArg.origin).toBe('GDRIVE_SPARK');
    expect(createArg.hashtags).toEqual(['bitcoin', 'l2', 'crypto']);
    expect(createArg.metadata.isRemoteSync).toBe(true);
    expect(createArg.metadata.syncedFromDevice).toBe('remote-cloud-bus');
  });

  it('implements Claim Check pattern: fetches missing note content on-demand via transport.fetchNoteContent', async () => {
    mockTransport.fetchNoteContent.mockResolvedValueOnce(
      '# Heavy Note Title\n\nFull markdown payload fetched lazily via Claim Check.',
    );

    const envelope: LemonBusEnvelope<LemonBusNotePayload> = {
      eventId: 'evt-claim-check',
      timestamp: '2026-11-08T12:10:00.000Z',
      deviceId: 'external-agent-node',
      entityType: 'NOTE',
      action: 'UPSERT',
      origin: 'NEURON_PARTY',
      transportVia: 'supabase',
      externalId: 'Sparks/analysis/heavy-digest.md',
      privacy: 'public',
      payload: {
        id: 'note-heavy-1',
        title: 'Heavy Market Digest',
        description: null, // Note body omitted from event log!
        externalId: 'Sparks/analysis/heavy-digest.md',
        privacy: 'public',
        origin: 'NEURON_PARTY',
        provenance: {
          origin: 'NEURON_PARTY',
          transportVia: 'supabase',
          deviceId: 'external-agent-node',
        },
      },
    };

    await relayService.applyEventToLocalDatabase(envelope);

    expect(mockTransport.fetchNoteContent).toHaveBeenCalledWith({
      canonicalPath: 'Sparks/analysis/heavy-digest.md',
      externalId: 'Sparks/analysis/heavy-digest.md',
    });

    expect(mockNotesService.create).toHaveBeenCalledTimes(1);
    const createArg = mockNotesService.create.mock.calls[0][0];
    expect(createArg.description).toBe(
      '# Heavy Note Title\n\nFull markdown payload fetched lazily via Claim Check.',
    );
  });

  it('skips ingestion when note already exists locally with the identical fileHash (O(1) deduplication)', async () => {
    mockPrisma.note.findFirst.mockResolvedValueOnce({
      id: 'existing-note-id',
      metadata: { fileHash: 'hash-matching-123' },
    });

    const envelope: LemonBusEnvelope<LemonBusNotePayload> = {
      eventId: 'evt-dup',
      timestamp: '2026-11-08T12:20:00.000Z',
      deviceId: 'another-device',
      entityType: 'NOTE',
      action: 'UPSERT',
      origin: 'DIRECT_API',
      transportVia: 'supabase',
      privacy: 'public',
      payload: {
        id: 'existing-note-id',
        title: 'Already Known Note',
        privacy: 'public',
        fileHash: 'hash-matching-123',
        origin: 'DIRECT_API',
        provenance: {
          origin: 'DIRECT_API',
          transportVia: 'supabase',
          deviceId: 'another-device',
        },
      },
    };

    await relayService.applyEventToLocalDatabase(envelope);

    expect(mockNotesService.create).not.toHaveBeenCalled();
    expect(mockNotesService.update).not.toHaveBeenCalled();
  });

  it('breaks echo loops: does NOT re-publish inbound remote-synced notes back to the bus', async () => {
    const remoteSyncEvent = new NotePublishedEvent(
      'synced-note-id',
      'Synced Note Title',
      'Spark/Tech',
      'PUBLISHED',
      new Date(),
      'feed-1',
      true,
      {
        id: 'synced-note-id',
        title: 'Synced Note Title',
        metadata: { isRemoteSync: true }, // Marked as incoming remote sync
      },
    );

    await relayService.handleLocalNotePublished(remoteSyncEvent);

    expect(mockTransport.publish).not.toHaveBeenCalled();
  });

  it('publishes genuinely local note creations to the bus transport', async () => {
    const localEvent = new NotePublishedEvent(
      'local-note-id',
      'Locally Created Note',
      'Personal/Notes',
      'PUBLISHED',
      new Date(),
      'feed-123',
      true,
      {
        id: 'local-note-id',
        title: 'Locally Created Note',
        privacy: 'public',
        sourceType: 'MANUAL',
        feed: { slug: 'general-feed' },
        metadata: { isRemoteSync: false }, // Genuinely local note
      },
    );

    await relayService.handleLocalNotePublished(localEvent);

    expect(mockTransport.publish).toHaveBeenCalledTimes(1);
    const pubArg = mockTransport.publish.mock.calls[0][0];
    expect(pubArg.entityType).toBe('NOTE');
    expect(pubArg.action).toBe('UPSERT');
    expect(pubArg.feedSlug).toBe('general-feed');
    expect(pubArg.payload.title).toBe('Locally Created Note');
  });
});
