import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotesService } from './notes.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NOTE_SELECT_FIELDS } from './notes.constants';

describe('NotesService', () => {
  let service: NotesService;
  let mockPrisma: any;
  let mockHashtagsService: any;
  let mockFoldersService: any;
  let mockAiQuickAddService: any;
  let mockNotesLinksService: any;
  let mockNotesMediaService: any;
  let mockNotesShareService: any;
  let mockNotesCacheService: any;
  let mockNotesQueryBuilder: any;

  beforeEach(() => {
    mockPrisma = {
      note: {
        count: vi.fn().mockResolvedValue(10),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'n-1',
            title: 'Тестовая заметка 1',
            description: 'Короткое описание',
            metadata: {
              rawRelatedSection: '## Связанные\n- [[Скрытый текст]]',
              timeSlot: 'MORNING',
            },
          },
        ]),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      feed: {
        findUnique: vi.fn(),
      },
    };

    mockHashtagsService = {
      resolveHashtags: vi.fn().mockResolvedValue([]),
    };

    mockFoldersService = {
      resolveFolderAssignments: vi.fn().mockResolvedValue([]),
    };

    mockAiQuickAddService = {};
    mockNotesLinksService = {};
    mockNotesMediaService = {};
    mockNotesShareService = {};

    mockNotesCacheService = {
      generateKey: vi.fn().mockReturnValue('findAll:mock-key'),
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      invalidateAll: vi.fn(),
    };

    mockNotesQueryBuilder = {
      buildWhereClause: vi.fn().mockResolvedValue({ deletedAt: null }),
      buildOrderBy: vi.fn().mockReturnValue([{ startDate: 'desc' }]),
    };

    service = new NotesService(
      mockPrisma as any,
      mockHashtagsService as any,
      mockFoldersService as any,
      mockAiQuickAddService as any,
      mockNotesLinksService as any,
      mockNotesMediaService as any,
      mockNotesShareService as any,
      mockNotesCacheService as any,
      mockNotesQueryBuilder as any,
    );
  });

  describe('NOTE_SELECT_FIELDS architectural contract', () => {
    it('MUST NOT include rawContent in list projection fields to prevent multi-megabyte payload bloat', () => {
      expect((NOTE_SELECT_FIELDS as any).rawContent).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('caps limit to max 500 records even if client requests limit=5000', async () => {
      await service.findAll({ limit: 5000, offset: 0 } as any);

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 500,
          skip: 0,
        }),
      );
    });

    it('ensures minimum limit is at least 1', async () => {
      await service.findAll({ limit: 0, offset: -5 } as any);

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1,
          skip: 0,
        }),
      );
    });

    it('strips rawRelatedSection from metadata to protect bandwidth', async () => {
      const res = await service.findAll({ limit: 50 } as any);

      expect(res.items[0].metadata.rawRelatedSection).toBeUndefined();
      expect(res.items[0].metadata.timeSlot).toBe('MORNING');
    });

    it('serves from cache when entry is present and avoids database calls', async () => {
      const cachedPayload = { total: 1, limit: 50, offset: 0, items: [{ id: 'cached-note' }] };
      mockNotesCacheService.get.mockReturnValueOnce(cachedPayload);

      const res = await service.findAll({ limit: 50 } as any);
      expect(res).toBe(cachedPayload);
      expect(mockPrisma.note.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.note.count).not.toHaveBeenCalled();
    });

    it('stores query result into cache with 60s TTL', async () => {
      await service.findAll({ limit: 50 } as any);

      expect(mockNotesCacheService.set).toHaveBeenCalledWith(
        'findAll:mock-key',
        expect.objectContaining({ total: 10 }),
        60_000,
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when note does not exist or is soft-deleted', async () => {
      mockPrisma.note.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);

      mockPrisma.note.findUnique.mockResolvedValueOnce({ id: 'deleted-note', deletedAt: new Date() });
      await expect(service.findOne('deleted-note')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for non-admin when note is private or not published', async () => {
      mockPrisma.note.findUnique.mockResolvedValueOnce({
        id: 'n-private',
        privacy: 'private',
        status: 'PUBLISHED',
      });
      await expect(service.findOne('n-private', false)).rejects.toThrow(ForbiddenException);

      mockPrisma.note.findUnique.mockResolvedValueOnce({
        id: 'n-draft',
        privacy: 'public',
        status: 'DRAFT',
      });
      await expect(service.findOne('n-draft', false)).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to read private or draft notes', async () => {
      const privateNote = {
        id: 'n-private',
        privacy: 'private',
        status: 'DRAFT',
      };
      mockPrisma.note.findUnique.mockResolvedValueOnce(privateNote);

      const res = await service.findOne('n-private', true);
      expect(res).toBe(privateNote);
    });
  });

  describe('create - privacy defaults & binary model', () => {
    it('defaults note privacy to "private" when omitted in DTO', async () => {
      mockPrisma.note.create.mockImplementation(async ({ data }: any) => ({
        id: 'new-note-1',
        ...data,
      }));

      const res = await service.create({
        title: 'Заметка без указания privacy',
        type: 'SINGLE' as any,
        startDate: '2026-11-03T10:00:00.000Z',
      });

      expect(mockPrisma.note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            privacy: 'private',
          }),
        }),
      );
      expect(res.privacy).toBe('private');
    });

    it('honours explicit privacy: "public"', async () => {
      mockPrisma.note.create.mockImplementation(async ({ data }: any) => ({
        id: 'new-note-public',
        ...data,
      }));

      const res = await service.create({
        title: 'Публичная заметка',
        type: 'SINGLE' as any,
        privacy: 'public',
        startDate: '2026-11-03T10:00:00.000Z',
      });

      expect(mockPrisma.note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            privacy: 'public',
          }),
        }),
      );
      expect(res.privacy).toBe('public');
    });

    it('honours explicit privacy: "private"', async () => {
      mockPrisma.note.create.mockImplementation(async ({ data }: any) => ({
        id: 'new-note-private',
        ...data,
      }));

      const res = await service.create({
        title: 'Приватная заметка',
        type: 'SINGLE' as any,
        privacy: 'private',
        startDate: '2026-11-03T10:00:00.000Z',
      });

      expect(mockPrisma.note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            privacy: 'private',
          }),
        }),
      );
      expect(res.privacy).toBe('private');
    });
  });
});
