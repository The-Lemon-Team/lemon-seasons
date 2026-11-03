import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelatedNotesResolverService } from './related-notes-resolver.service';
import { NoteType } from '@lenta/shared';

describe('RelatedNotesResolverService', () => {
  let service: RelatedNotesResolverService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      note: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'note-1' }),
      },
    };
    service = new RelatedNotesResolverService(mockPrisma as any);
  });

  describe('normalize', () => {
    it('strips date prefixes (DD.MM.YY and YYYY-MM-DD) and .md extensions', () => {
      expect(service.normalize('28.10.26 - Sony выпустила обновление.md')).toBe('sony выпустила обновление');
      expect(service.normalize('2026-10-28_Anthropic Claude 3.7.md')).toBe('anthropic claude 3 7');
      expect(service.normalize('01.11.2026 — Новостной дайджест.MD')).toBe('новостной дайджест');
    });

    it('removes punctuation, quotes, brackets and normalizes whitespace', () => {
      expect(service.normalize('«Apple» анонсировала (M4 Pro) [чип]: новинки!')).toBe('apple анонсировала m4 pro чип новинки');
      expect(service.normalize('  Много   пробелов   и   дефисов - тест  ')).toBe('много пробелов и дефисов тест');
    });
  });

  describe('resolveNoteRelatedLinks', () => {
    it('returns 0 counts when note has no related links', async () => {
      mockPrisma.note.findUnique.mockResolvedValueOnce({
        id: 'note-1',
        title: 'Заметка без связей',
        metadata: {},
        description: 'Просто текст',
      });

      const res = await service.resolveNoteRelatedLinks('note-1');
      expect(res.totalCount).toBe(0);
      expect(res.resolvedCount).toBe(0);
      expect(mockPrisma.note.update).not.toHaveBeenCalled();
    });

    it('resolves Tier 1 exact normalized title match', async () => {
      mockPrisma.note.findUnique.mockResolvedValueOnce({
        id: 'note-1',
        title: 'Заметка источниковая',
        metadata: {
          relatedNotes: [
            { raw: '[[01.11.26 - Релиз Next.js 16.md]]', cleanTitle: 'Релиз Next.js 16', resolved: false },
          ],
        },
      });

      const pool = [
        {
          id: 'note-target-1',
          title: '01.11.26 - Релиз Next.js 16',
          type: NoteType.SINGLE,
          startDate: new Date('2026-11-01'),
          icon: '⚡',
          author: 'Vercel',
          metadata: { fileName: '01.11.26 - Релиз Next.js 16.md' },
          externalId: null,
        },
      ];

      const res = await service.resolveNoteRelatedLinks('note-1', pool);
      expect(res.totalCount).toBe(1);
      expect(res.resolvedCount).toBe(1);

      expect(mockPrisma.note.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: {
          metadata: {
            relatedNotes: [
              expect.objectContaining({
                resolved: true,
                targetNoteId: 'note-target-1',
                targetTitle: '01.11.26 - Релиз Next.js 16',
                targetIcon: '⚡',
              }),
            ],
          },
        },
      });
    });

    it('resolves Tier 2 substring match when titles share significant length', async () => {
      mockPrisma.note.findUnique.mockResolvedValueOnce({
        id: 'note-1',
        title: 'Обзор платформы',
        metadata: {
          relatedNotes: [
            { raw: '[[Крупное обновление архитектуры безопасности]]', cleanTitle: 'Крупное обновление архитектуры безопасности' },
          ],
        },
      });

      const pool = [
        {
          id: 'note-target-sec',
          title: '02.11.26 - Крупное обновление архитектуры безопасности в Kubernetes',
          type: NoteType.SINGLE,
          startDate: new Date('2026-11-02'),
          icon: '🛡️',
          author: 'K8s Team',
          metadata: {},
          externalId: null,
        },
      ];

      const res = await service.resolveNoteRelatedLinks('note-1', pool);
      expect(res.totalCount).toBe(1);
      expect(res.resolvedCount).toBe(1);
      expect(mockPrisma.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: {
              relatedNotes: [
                expect.objectContaining({
                  targetNoteId: 'note-target-sec',
                  resolved: true,
                }),
              ],
            },
          }),
        }),
      );
    });

    it('resolves Tier 3 keyword overlap match (>= 65% overlap)', async () => {
      mockPrisma.note.findUnique.mockResolvedValueOnce({
        id: 'note-1',
        title: 'Инфраструктура',
        metadata: {
          relatedNotes: [
            { raw: '[[Глобальная оптимизация энергопотребления датацентров Microsoft]]', cleanTitle: 'Глобальная оптимизация энергопотребления датацентров Microsoft' },
          ],
        },
      });

      const pool = [
        {
          id: 'note-target-msft',
          title: 'Оптимизация энергопотребления глобальных датацентров корпорации Microsoft',
          type: NoteType.SINGLE,
          startDate: new Date('2026-10-30'),
          icon: '☁️',
          author: 'MSFT',
          metadata: {},
          externalId: null,
        },
      ];

      const res = await service.resolveNoteRelatedLinks('note-1', pool);
      expect(res.totalCount).toBe(1);
      expect(res.resolvedCount).toBe(1);
    });

    it('honors vault doc guard: only matches docs with 00 or реестр источников', async () => {
      mockPrisma.note.findUnique.mockResolvedValueOnce({
        id: 'note-1',
        title: 'Дайджест',
        metadata: {
          relatedNotes: [
            { raw: '[[00 - Реестр источников анонсов.md]]', cleanTitle: 'Реестр источников' },
          ],
        },
      });

      const pool = [
        {
          id: 'target-vault',
          title: '00 — Реестр источников анонсов',
          type: NoteType.SINGLE,
          startDate: new Date('2026-01-01'),
          icon: '📚',
          author: 'Curator',
          metadata: { fileName: '00 - Реестр источников.md' },
          externalId: null,
        },
        {
          id: 'random-note',
          title: 'Обычный анонс',
          type: NoteType.SINGLE,
          startDate: new Date('2026-01-01'),
          icon: '📄',
          author: 'Author',
          metadata: {},
          externalId: null,
        },
      ];

      const res = await service.resolveNoteRelatedLinks('note-1', pool);
      expect(res.resolvedCount).toBe(1);
      expect(mockPrisma.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: {
              relatedNotes: [
                expect.objectContaining({
                  targetNoteId: 'target-vault',
                  resolved: true,
                }),
              ],
            },
          }),
        }),
      );
    });

    it('sets parentNoteId when related note is a PERIOD', async () => {
      mockPrisma.note.findUnique.mockResolvedValueOnce({
        id: 'note-child',
        title: 'Утренний дайджест',
        parentNoteId: null,
        metadata: {
          relatedNotes: [
            { raw: '[[Неделя ИИ]]', cleanTitle: 'Неделя ИИ' },
          ],
        },
      });

      const pool = [
        {
          id: 'period-parent',
          title: 'Неделя ИИ',
          type: NoteType.PERIOD,
          startDate: new Date('2026-11-01'),
          icon: '📅',
          author: 'Admin',
          metadata: {},
          externalId: null,
        },
      ];

      const res = await service.resolveNoteRelatedLinks('note-child', pool);
      expect(res.parentNoteId).toBe('period-parent');
      expect(mockPrisma.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parentNoteId: 'period-parent',
          }),
        }),
      );
    });
  });
});
