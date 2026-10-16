import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RelatedNoteItem, NoteType } from '@lenta/shared';

@Injectable()
export class RelatedNotesResolverService {
  private readonly logger = new Logger(RelatedNotesResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalizes a title or filename string for robust fuzzy matching:
   * Strips date prefixes (DD.MM.YY or YYYY-MM-DD), extensions, and punctuation.
   */
  public normalize(s: string): string {
    return (s || '')
      .toLowerCase()
      .replace(/^\d{2}\.\d{2}\.\d{2,4}\s*[-_—–]?\s*/, '')
      .replace(/^\d{4}-\d{2}-\d{2}\s*[-_—–]?\s*/, '')
      .replace(/\.md$/i, '')
      .replace(/[\s\-_—–\.:,()\[\]«»""'']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Resolves raw related wikilinks for a single note against existing database records.
   */
  public async resolveNoteRelatedLinks(
    noteId: string,
    allNotesPool?: Array<{
      id: string;
      title: string;
      type: NoteType | string;
      startDate: Date | string;
      icon: string | null;
      curator: string | null;
      metadata: any;
      externalId: string | null;
    }>,
  ): Promise<{ resolvedCount: number; totalCount: number; parentNoteId?: string }> {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        title: true,
        type: true,
        parentNoteId: true,
        metadata: true,
        description: true,
      },
    });

    if (!note) return { resolvedCount: 0, totalCount: 0 };

    const meta = (note.metadata as any) || {};
    let items: RelatedNoteItem[] = Array.isArray(meta.relatedNotes) ? meta.relatedNotes : [];

    // Fallback: If metadata doesn't have relatedNotes yet, check if description still has ## Связанные записи
    if (items.length === 0 && note.description && /##\s*🔗?\s*Связанные\s+(?:записи|файлы|заметки)/i.test(note.description)) {
      const match = note.description.match(/##\s*🔗?\s*Связанные\s+(?:записи|файлы|заметки)([\s\S]*?)(?:$|\n##)/i);
      if (match) {
        const rawLinks = [...match[1].matchAll(/\[\[(.*?)\]\]/g)]
          .map((m) => m[1].trim())
          .filter((l) => l && !l.toLowerCase().includes('другая заметка'));

        items = rawLinks.map((link) => {
          const pipeIdx = link.indexOf('|');
          const targetName = pipeIdx >= 0 ? link.slice(0, pipeIdx).trim() : link;
          const alias = pipeIdx >= 0 ? link.slice(pipeIdx + 1).trim() : undefined;
          const cleanTitle = targetName
            .replace(/^\d{2}\.\d{2}\.\d{2,4}\s*[-_—–]?\s*/, '')
            .replace(/^\d{4}-\d{2}-\d{2}\s*[-_—–]?\s*/, '')
            .trim();
          return {
            raw: link,
            cleanTitle: cleanTitle || targetName,
            alias,
            resolved: false,
            isVaultDoc: targetName.startsWith('00 - ') || targetName.toLowerCase().includes('источники'),
          };
        });
      }
    }

    if (items.length === 0) return { resolvedCount: 0, totalCount: 0 };

    // Fetch notes pool if not provided
    const pool =
      allNotesPool ||
      (await this.prisma.note.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          title: true,
          type: true,
          startDate: true,
          icon: true,
          curator: true,
          metadata: true,
          externalId: true,
        },
      }));

    let resolvedCount = 0;
    let resolvedParentId: string | undefined = undefined;

    const updatedItems: RelatedNoteItem[] = items.map((item) => {
      const link = item.raw || item.cleanTitle;
      const normLink = this.normalize(link);
      const isVaultDoc = item.isVaultDoc || normLink.startsWith('00') || normLink.includes('источники анонсов');

      const target = pool.find((other) => {
        if (other.id === note.id) return false;
        const otherNormTitle = this.normalize(other.title);
        const otherFile = other.metadata?.fileName || '';
        const otherNormFile = this.normalize(otherFile);

        // Vault doc guard: only match if target specifically contains '00' or 'источники анонсов'
        if (isVaultDoc) {
          return otherNormTitle.includes('00') || otherNormFile.includes('00') || otherNormTitle.includes('реестр источников');
        }

        // 1. Direct file or link substring match
        if (otherFile && otherFile.toLowerCase().includes(link.toLowerCase())) return true;
        if (normLink.length > 5 && otherNormFile.includes(normLink)) return true;
        if (normLink.length > 5 && otherNormFile.length > 8 && normLink.includes(otherNormFile)) return true;

        // 2. Title matching
        if (normLink.length > 5 && otherNormTitle.includes(normLink)) return true;
        if (normLink.length > 5 && otherNormTitle.length > 8 && normLink.includes(otherNormTitle)) return true;

        // 3. Keyword overlap match
        const linkWords = normLink.split(' ').filter((w) => w.length > 3);
        const titleWords = otherNormTitle.split(' ').filter((w) => w.length > 3);
        if (linkWords.length >= 3 && titleWords.length >= 3) {
          const common = linkWords.filter((w) => titleWords.includes(w));
          if (common.length >= Math.min(3, Math.floor(linkWords.length * 0.6))) {
            return true;
          }
        }

        return false;
      });

      if (target) {
        resolvedCount++;
        const isParent = (target.type as any) === NoteType.PERIOD && (note.type as any) !== NoteType.PERIOD;
        if (isParent && !resolvedParentId) {
          resolvedParentId = target.id;
        }

        return {
          ...item,
          resolved: true,
          targetNoteId: target.id,
          targetTitle: target.title,
          targetType: target.type,
          targetIcon: target.icon || undefined,
          targetCurator: target.curator || undefined,
          targetDate: typeof target.startDate === 'string' ? target.startDate : target.startDate.toISOString(),
          isParent,
        };
      }

      return {
        ...item,
        resolved: false,
      };
    });

    // Update note in database
    const updateData: any = {
      metadata: {
        ...meta,
        relatedNotes: updatedItems,
      },
    };

    if (resolvedParentId && !note.parentNoteId) {
      updateData.parentNoteId = resolvedParentId;
    }

    await this.prisma.note.update({
      where: { id: note.id },
      data: updateData,
    });

    return {
      resolvedCount,
      totalCount: items.length,
      parentNoteId: resolvedParentId || note.parentNoteId || undefined,
    };
  }

  /**
   * Batch reconciles and resolves all notes in the database.
   */
  public async resolveAllNotes(): Promise<{
    processedNotes: number;
    totalLinks: number;
    resolvedLinks: number;
  }> {
    const allNotes = await this.prisma.note.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        title: true,
        type: true,
        startDate: true,
        icon: true,
        curator: true,
        metadata: true,
        externalId: true,
        description: true,
        parentNoteId: true,
      },
    });

    let processedNotes = 0;
    let totalLinks = 0;
    let resolvedLinks = 0;

    for (const n of allNotes) {
      const res = await this.resolveNoteRelatedLinks(n.id, allNotes);
      if (res.totalCount > 0) {
        processedNotes++;
        totalLinks += res.totalCount;
        resolvedLinks += res.resolvedCount;
      }
    }

    this.logger.log(
      `🎯 [RelatedNotesResolver] Завершена пакетная перелинковка: ` +
        `${processedNotes} заметок, ${resolvedLinks}/${totalLinks} связей разрезолвлено.`,
    );

    return { processedNotes, totalLinks, resolvedLinks };
  }
}
