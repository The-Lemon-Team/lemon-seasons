import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RelatedNoteItem, NoteType, LentaFrontmatterUtil } from '@lenta/shared';

export interface NormalizedPoolItem {
  id: string;
  title: string;
  type: NoteType | string;
  startDate: Date | string;
  icon: string | null;
  author: string | null;
  metadata: any;
  externalId: string | null;
  normTitle: string;
  normFile: string;
  titleWords: Set<string>;
}

@Injectable()
export class RelatedNotesResolverService {
  private readonly logger = new Logger(RelatedNotesResolverService.name);
  private cachedNormalizedPool: NormalizedPoolItem[] | null = null;
  private cachedPoolExpiresAt = 0;
  private static readonly POOL_CACHE_TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  public invalidatePoolCache(): void {
    this.cachedNormalizedPool = null;
    this.cachedPoolExpiresAt = 0;
  }

  private toNormalizedPoolItem(other: {
    id: string;
    title: string;
    type: NoteType | string;
    startDate: Date | string;
    icon: string | null;
    author: string | null;
    metadata: any;
    externalId: string | null;
  }): NormalizedPoolItem {
    const normTitle = this.normalize(other.title);
    const otherMeta = (other.metadata as any) || {};
    const otherFile = otherMeta.fileName || '';
    const normFile = this.normalize(otherFile);
    const titleWords = new Set(normTitle.split(' ').filter((w) => w.length > 3));
    return {
      ...other,
      normTitle,
      normFile,
      titleWords,
    };
  }

  private async getNormalizedPool(): Promise<NormalizedPoolItem[]> {
    const now = Date.now();
    if (this.cachedNormalizedPool && now < this.cachedPoolExpiresAt) {
      return this.cachedNormalizedPool;
    }

    const rawPool = await this.prisma.note.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        title: true,
        type: true,
        startDate: true,
        icon: true,
        author: true,
        metadata: true,
        externalId: true,
      },
    });

    this.cachedNormalizedPool = rawPool.map((item) => this.toNormalizedPoolItem(item));
    this.cachedPoolExpiresAt = now + RelatedNotesResolverService.POOL_CACHE_TTL_MS;
    return this.cachedNormalizedPool;
  }

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
      .replace(/[\s\-_—–\.:,()\[\]«»""''!?]/g, ' ')
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
      author: string | null;
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
        sourceLink: true,
      },
    });

    if (!note) return { resolvedCount: 0, totalCount: 0 };

    const meta = (note.metadata as any) || {};
    let items: RelatedNoteItem[] = Array.isArray(meta.relatedNotes) ? meta.relatedNotes : [];
    let cleanedDesc = note.description;
    let descriptionModified = false;
    let fallbackSourceLink: string | undefined = undefined;

    // Fallback: If metadata doesn't have relatedNotes yet, check if description has related section
    if (items.length === 0 && note.description && LentaFrontmatterUtil.RELATED_SECTION_REGEX.test(note.description)) {
      const extracted = LentaFrontmatterUtil.extractRelatedLinks(note.description);
      if (extracted.richItems && extracted.richItems.length > 0) {
        items = extracted.richItems.map((item) => ({
          ...item,
          resolved: false,
        }));
        cleanedDesc = extracted.cleanedBody;
        descriptionModified = true;
      }
      if (extracted.extractedSourceLink && !note.sourceLink) {
        fallbackSourceLink = extracted.extractedSourceLink;
      }
    }

    if (items.length === 0) return { resolvedCount: 0, totalCount: 0 };

    let resolvedCount = 0;
    let resolvedParentId: string | undefined = undefined;

    // Pre-normalize pool once (and reuse 60s TTL cached pool when allNotesPool is omitted)
    const normalizedPool: NormalizedPoolItem[] = allNotesPool
      ? (allNotesPool as any)._isNormalized
        ? (allNotesPool as NormalizedPoolItem[])
        : allNotesPool.map((other) => this.toNormalizedPoolItem(other))
      : await this.getNormalizedPool();

    const updatedItems: RelatedNoteItem[] = items.map((item) => {
      const link = item.raw || item.cleanTitle;
      const normLink = this.normalize(link);
      const isVaultDoc = item.isVaultDoc || normLink.startsWith('00') || normLink.includes('источники анонсов');

      // Vault doc guard: only match if target specifically contains '00' or 'источники анонсов'
      if (isVaultDoc) {
        const vaultTarget = normalizedPool.find((other) => {
          if (other.id === note.id) return false;
          return other.normTitle.includes('00') || other.normFile.includes('00') || other.normTitle.includes('реестр источников');
        });

        if (vaultTarget) {
          resolvedCount++;
          return {
            ...item,
            resolved: true,
            targetNoteId: vaultTarget.id,
            targetTitle: vaultTarget.title,
            targetType: vaultTarget.type,
            targetIcon: vaultTarget.icon || undefined,
            targetAuthor: vaultTarget.author || undefined,
            targetCurator: vaultTarget.author || undefined,
            targetDate: typeof vaultTarget.startDate === 'string' ? vaultTarget.startDate : vaultTarget.startDate.toISOString(),
            isParent: false,
          };
        }
        return { ...item, resolved: false };
      }

      // Tier 1: Exact normalized title or exact filename match
      let target = normalizedPool.find((other) => {
        if (other.id === note.id) return false;
        return normLink === other.normTitle || (other.normFile && normLink === other.normFile);
      });

      // Tier 2: Substring match (length > 8)
      if (!target) {
        target = normalizedPool.find((other) => {
          if (other.id === note.id) return false;
          if (normLink.length > 8 && other.normTitle.includes(normLink)) return true;
          if (other.normTitle.length > 8 && normLink.includes(other.normTitle)) return true;
          if (other.normFile && normLink.length > 8 && other.normFile.includes(normLink)) return true;
          if (other.normFile && other.normFile.length > 8 && normLink.includes(other.normFile)) return true;
          return false;
        });
      }

      // Tier 3: Keyword overlap match (>= 65% overlap)
      if (!target) {
        const linkWords = normLink.split(' ').filter((w) => w.length > 3);
        if (linkWords.length >= 3) {
          let bestTarget: any = null;
          let bestScore = 0;
          for (const other of normalizedPool) {
            if (other.id === note.id) continue;
            if (other.titleWords.size < 3) continue;

            let common = 0;
            for (const w of linkWords) {
              if (other.titleWords.has(w)) common++;
            }
            const score = common / linkWords.length;
            if (score >= 0.65 && score > bestScore) {
              bestScore = score;
              bestTarget = other;
            }
          }
          if (bestTarget) {
            target = bestTarget;
          }
        }
      }

      if (target) {
        resolvedCount++;
        const isParent =
          Boolean(item.isParent || item.role === 'parent') ||
          ((target.type as any) === NoteType.PERIOD && (note.type as any) !== NoteType.PERIOD);

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
          targetAuthor: target.author || undefined,
          targetCurator: target.author || undefined,
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

    if (descriptionModified && cleanedDesc !== note.description) {
      updateData.description = cleanedDesc;
    }

    if (fallbackSourceLink && !note.sourceLink) {
      updateData.sourceLink = fallbackSourceLink;
    }

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
        author: true,
        metadata: true,
        externalId: true,
        description: true,
        parentNoteId: true,
      },
    });

    let processedNotes = 0;
    let totalLinks = 0;
    let resolvedLinks = 0;

    // Pre-normalize the pool ONCE for the entire batch reconciliation
    const normalizedPool: NormalizedPoolItem[] = allNotes.map((other) => {
      const normTitle = this.normalize(other.title);
      const otherMeta = (other.metadata as any) || {};
      const otherFile = otherMeta.fileName || '';
      const normFile = this.normalize(otherFile);
      const titleWords = new Set(normTitle.split(' ').filter((w) => w.length > 3));
      return {
        ...other,
        normTitle,
        normFile,
        titleWords,
      };
    });
    (normalizedPool as any)._isNormalized = true;

    for (const n of allNotes) {
      const res = await this.resolveNoteRelatedLinks(n.id, normalizedPool);
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
