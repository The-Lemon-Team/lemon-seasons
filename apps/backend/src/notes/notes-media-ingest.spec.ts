import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotesMediaService } from './notes-media.service';
import { NotesIngestService } from './notes-ingest.service';
import { NotFoundException } from '@nestjs/common';

describe('NotesMediaService.attachMediaAssets & NotesIngestService Media Hub integration', () => {
  let mediaService: NotesMediaService;
  let mockPrisma: any;
  let mockStorageService: any;
  let mockSerperService: any;
  let mockEventEmitter: any;

  beforeEach(() => {
    mockPrisma = {
      note: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      noteImage: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: `img-${Math.random().toString(36).slice(2, 6)}`,
          ...data,
        })),
      },
      feed: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      stream: {
        findFirst: vi.fn(),
      },
    };
    mockStorageService = {};
    mockSerperService = {};
    mockEventEmitter = {
      emit: vi.fn(),
    };

    mediaService = new NotesMediaService(
      mockPrisma as any,
      mockStorageService as any,
      mockSerperService as any,
      mockEventEmitter as any,
    );
  });

  it('throws NotFoundException when attaching media to missing note', async () => {
    mockPrisma.note.findUnique.mockResolvedValueOnce(null);
    await expect(
      mediaService.attachMediaAssets('missing-note', [{ url: 'http://media/a.webp' }]),
    ).rejects.toThrow(NotFoundException);
  });

  it('attaches Media Hub assets without duplicating URLs and persists mediaAssetIds in metadata', async () => {
    mockPrisma.note.findUnique.mockResolvedValueOnce({
      id: 'note-1',
      title: 'Note 1',
      metadata: { origin: 'CODING_AGENT' },
    });
    mockPrisma.noteImage.findMany
      .mockResolvedValueOnce([
        { id: 'existing-1', url: 'http://media/existing.webp', isMain: true, order: 0 },
      ])
      .mockResolvedValueOnce([
        { id: 'existing-1', url: 'http://media/existing.webp', isMain: false, order: 0 },
        { id: 'new-1', url: 'http://media/hero.webp', isMain: true, order: 1 },
      ]);
    mockPrisma.note.update.mockResolvedValueOnce({
      id: 'note-1',
      title: 'Note 1',
      status: 'PUBLISHED',
      publishAt: null,
      feedId: 'feed-1',
      folders: [],
      hashtags: [],
      images: [{ id: 'new-1', url: 'http://media/hero.webp', isMain: true }],
    });

    const result = await mediaService.attachMediaAssets('note-1', [
      { url: 'http://media/existing.webp' },
      {
        url: 'http://media/hero.webp',
        thumbnailUrl: 'http://media/hero-thumb.webp',
        mediaAssetId: 'asset-42',
        isMain: true,
        caption: 'Hero cover',
      },
    ]);

    expect(mockPrisma.noteImage.updateMany).toHaveBeenCalledWith({
      where: { noteId: 'note-1' },
      data: { isMain: false },
    });
    expect(mockPrisma.noteImage.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.note.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'note-1' },
        data: expect.objectContaining({
          metadata: {
            origin: 'CODING_AGENT',
            mediaAssetIds: ['asset-42'],
          },
        }),
      }),
    );
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('note.published', expect.any(Object));
    expect(result).toHaveLength(2);
  });

  it('NotesIngestService attaches mediaAssetIds and imageUrl on ingest', async () => {
    mockPrisma.feed.findUnique.mockResolvedValueOnce({
      id: 'feed-1',
      slug: 'inbox',
      deletedAt: null,
    });
    const mockNotesService = {
      create: vi.fn().mockResolvedValue({ id: 'note-ingested-1', title: 'Media Note' }),
      update: vi.fn(),
      attachMediaAssets: vi.fn().mockResolvedValue([
        { id: 'img-1', url: 'http://media/cover.webp', isMain: true },
      ]),
    };
    const mockKeysService = {
      validateKey: vi.fn().mockResolvedValue({ valid: true }),
    };

    const ingestService = new NotesIngestService(
      mockPrisma as any,
      mockNotesService as any,
      mockKeysService as any,
    );

    const res = await ingestService.ingest({
      title: 'Media Note',
      content: 'Content with media',
      imageUrl: 'http://media/cover.webp',
      mediaAssetIds: ['asset-hub-99'],
    });

    expect(mockNotesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          mediaAssetIds: ['asset-hub-99'],
        }),
      }),
    );
    expect(mockNotesService.attachMediaAssets).toHaveBeenCalledWith(
      'note-ingested-1',
      expect.arrayContaining([
        expect.objectContaining({ url: 'http://media/cover.webp', isMain: true }),
        expect.objectContaining({ mediaAssetId: 'asset-hub-99' }),
      ]),
    );
    expect(res.note.images).toHaveLength(1);
  });
});
