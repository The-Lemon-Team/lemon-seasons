import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TopologyService } from './topology.service';
import { diffTopologySnapshots } from './topology-aggregator.util';

describe('TopologyService (Authoritative Каркас)', () => {
  let service: TopologyService;
  let mockPrisma: any;
  let mockEmitter: any;

  beforeEach(() => {
    mockPrisma = {
      stream: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 's-party',
            slug: 'lemon-party',
            title: 'Lemon Party',
            privacy: 'public',
            order: 1,
            isBuiltin: false,
            feedIds: ['f-diary', 'f-gm-secret'],
            tabs: [
              { id: 't1', feedId: 'f-diary', targetSlug: 'party-chrono-diary', type: 'feed', isHidden: false },
              { id: 't2', feedId: 'f-gm-secret', targetSlug: 'party-gm-vault', type: 'feed', isHidden: false },
            ],
          },
        ]),
      },
      feed: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'f-diary',
            slug: 'party-chrono-diary',
            title: 'Hero Diary',
            privacy: 'public',
          },
          {
            id: 'f-gm-secret',
            slug: 'party-gm-vault',
            title: 'GM Vault',
            privacy: 'private',
          },
        ]),
      },
      note: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'n1',
            title: 'Public Hero Thought',
            type: 'SINGLE',
            status: 'PUBLISHED',
            privacy: 'public',
            feedId: 'f-diary',
            publicFeedId: null,
            folderPath: null,
            author: 'earl-lemongrab',
            sourceType: 'NEURON_PARTY',
            startDate: new Date(),
            endDate: null,
            icon: '🍋',
            isPromoted: false,
            metadata: { origin: 'NEURON_PARTY' },
            hashtags: [{ name: 'party:thought' }],
          },
          {
            id: 'n2',
            title: 'Secret GM Plot',
            type: 'EVENT',
            status: 'PUBLISHED',
            privacy: 'private',
            feedId: 'f-gm-secret',
            publicFeedId: null,
            folderPath: null,
            author: 'gm-master',
            sourceType: 'NEURON_PARTY',
            startDate: new Date(),
            endDate: null,
            icon: '🔒',
            isPromoted: false,
            metadata: { origin: 'NEURON_PARTY' },
            hashtags: [{ name: 'gm:plot' }],
          },
        ]),
      },
    };

    mockEmitter = {
      emit: vi.fn(),
    };

    service = new TopologyService(mockPrisma as any, mockEmitter as any);
  });

  it('computes strict public vs admin topology contours without leaking private feeds or notes', async () => {
    const publicSnap = await service.getTopology({ isAdmin: false });
    expect(publicSnap.contour).toBe('public');
    expect(publicSnap.totals.notes).toBe(1);
    expect(publicSnap.feeds).toHaveLength(1);
    expect(publicSnap.feeds[0].slug).toBe('party-chrono-diary');
    expect(publicSnap.streams[0].tabs).toHaveLength(1);
    expect(publicSnap.streams[0].totalNotes).toBe(1);
    expect(publicSnap.facets.authors).toEqual([{ author: 'earl-lemongrab', count: 1 }]);

    const adminSnap = await service.getTopology({ isAdmin: true });
    expect(adminSnap.contour).toBe('admin');
    expect(adminSnap.totals.notes).toBe(2);
    expect(adminSnap.feeds).toHaveLength(2);
    expect(adminSnap.streams[0].tabs).toHaveLength(2);
    expect(adminSnap.streams[0].totalNotes).toBe(2);
    expect(adminSnap.facets.byOrigin.NEURON_PARTY).toBe(2);
  });

  it('emits minimal authoritative TOPOLOGY_PATCH when notes change', async () => {
    const snap1 = await service.getTopology({ isAdmin: true });
    expect(snap1.revision).toBe(1);

    // Add a second note to f-diary
    mockPrisma.note.findMany.mockResolvedValueOnce([
      ...(await mockPrisma.note.findMany()),
      {
        id: 'n3',
        title: 'Another Hero Thought',
        type: 'SINGLE',
        status: 'PUBLISHED',
        privacy: 'public',
        feedId: 'f-diary',
        publicFeedId: null,
        folderPath: null,
        author: 'earl-lemongrab',
        sourceType: 'NEURON_PARTY',
        startDate: new Date(),
        endDate: null,
        icon: '🍋',
        isPromoted: false,
        metadata: { origin: 'NEURON_PARTY' },
        hashtags: [{ name: 'party:thought' }],
      },
    ]);

    await service.recomputeAndBroadcast();
    expect(mockEmitter.emit).toHaveBeenCalledWith(
      'topology.patched',
      expect.objectContaining({
        publicPatch: expect.objectContaining({
          type: 'TOPOLOGY_PATCH',
          revision: 2,
          previousRevision: 1,
          feeds: expect.objectContaining({
            'party-chrono-diary': expect.objectContaining({ totalNotes: 2 }),
          }),
        }),
      }),
    );

    const diff = diffTopologySnapshots(snap1, await service.getTopology({ isAdmin: true }));
    expect(diff.feeds['party-gm-vault']).toBeUndefined(); // Unchanged feed is omitted from delta patch!
    expect(diff.feeds['party-chrono-diary'].totalNotes).toBe(2);
  });
});
