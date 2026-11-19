import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { StreamsService } from './streams.service';

describe('StreamsService (Nested Streams)', () => {
  let service: StreamsService;
  let mockPrisma: any;
  let mockEmitter: any;

  const sampleStreams = [
    {
      id: 's-child',
      slug: 'child_ai',
      title: 'Child AI',
      privacy: 'public',
      feedIds: ['f-ai'],
      childStreamIds: [],
      tags: ['ai'],
      folderPaths: ['spark/ai/'],
      deletedAt: null,
      tabs: [],
    },
    {
      id: 's-parent',
      slug: 'parent_tech',
      title: 'Parent Tech',
      privacy: 'public',
      feedIds: ['f-habr'],
      childStreamIds: ['s-child'],
      tags: ['dev'],
      folderPaths: [],
      deletedAt: null,
      tabs: [],
    },
    {
      id: 's-priv',
      slug: 'priv_notes',
      title: 'Private Notes',
      privacy: 'private',
      feedIds: [],
      childStreamIds: [],
      tags: [],
      folderPaths: [],
      deletedAt: null,
      tabs: [],
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      stream: {
        findMany: vi.fn().mockResolvedValue(sampleStreams),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      feed: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'f-ai', slug: 'spark-ai', title: 'Spark AI', privacy: 'public', _count: { notes: 5 } },
          { id: 'f-habr', slug: 'spark-habr', title: 'Spark Habr', privacy: 'public', _count: { notes: 3 } },
        ]),
      },
      streamTab: {
        count: vi.fn().mockResolvedValue(0),
        upsert: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    mockEmitter = { emit: vi.fn() };
    service = new StreamsService(mockPrisma, mockEmitter);
  });

  it('recursively resolves criteria across nested child streams', async () => {
    const criteria = await service.resolveCriteriaForStream('parent_tech');
    expect(criteria).not.toBeNull();
    expect(criteria!.feedIds).toHaveLength(2);
    expect(criteria!.feedIds).toEqual(expect.arrayContaining(['f-habr', 'f-ai']));
    expect(criteria!.feedSlugs).toHaveLength(2);
    expect(criteria!.feedSlugs).toEqual(expect.arrayContaining(['spark-habr', 'spark-ai']));
    expect(criteria!.tags).toEqual(['dev', 'ai']);
    expect(criteria!.folderPaths).toEqual(['spark/ai/']);
    expect(criteria!.childStreamIds).toEqual(['s-child']);
  });

  it('preserves stream tabs when syncing empty feedIds', async () => {
    mockPrisma.stream.update.mockResolvedValueOnce({ ...sampleStreams[1], feedIds: [] });
    await service.update('s-parent', { feedIds: [] });

    expect(mockPrisma.streamTab.deleteMany).toHaveBeenCalledWith({
      where: { streamId: 's-parent', type: 'feed' },
    });
  });

  it('rejects attaching a child stream that creates a cycle or leaks private stream', async () => {
    await expect(service.attachChildStream('s-child', 's-parent')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.attachChildStream('s-parent', 's-priv')).rejects.toThrow(
      BadRequestException,
    );
  });
});
