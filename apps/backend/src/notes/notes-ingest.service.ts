import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotesService } from './notes.service';
import { KeysService } from '../keys/keys.service';
import { IngestNoteDto } from './dto/ingest-note.dto';
import { CreateNoteDto, NoteType } from './dto/create-note.dto';

export interface IngestResult {
  success: boolean;
  action: 'CREATED' | 'UPDATED';
  isNew: boolean;
  noteId: string;
  note: any;
}

@Injectable()
export class NotesIngestService {
  private readonly logger = new Logger(NotesIngestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notesService: NotesService,
    private readonly keysService: KeysService,
  ) {}

  /**
   * Validates API Key authorization.
   * Checks INGESTION_API_KEY environment variable or UserKey table in database.
   */
  async validateAuthorization(apiKey?: string, headerKey?: string): Promise<void> {
    const rawKey = apiKey || headerKey;
    const envApiKey = process.env.INGESTION_API_KEY;

    // 1. If explicit env key is defined, enforce it
    if (envApiKey) {
      if (!rawKey || rawKey.trim() !== envApiKey.trim()) {
        throw new UnauthorizedException('Неверный или отсутствующий API-ключ для Ingestion API');
      }
      return;
    }

    // 2. If a key was provided, try validating against user keys in database
    if (rawKey && rawKey.trim()) {
      const keyValidation = await this.keysService.validateKey(rawKey.trim());
      if (keyValidation.valid) {
        return;
      }
      // If user supplied key but it is revoked/invalid, deny
      throw new UnauthorizedException('Предоставленный API-ключ недействителен или отозван');
    }

    // 3. In local development or intranet with no key env, allow requests with a debug log
    this.logger.debug('Ingestion запрос принят без строгой аутентификации (INGESTION_API_KEY не задан)');
  }

  /**
   * Main entry point for ingesting external content into core Notes database.
   */
  async ingest(dto: IngestNoteDto, authHeader?: string): Promise<IngestResult> {
    // 1. Authorization check
    await this.validateAuthorization(dto.apiKey, authHeader);

    // 2. Resolve Title
    const title = this.extractTitle(dto.title, dto.content);

    // 3. Resolve Summary
    const summary = this.extractSummary(dto.summary, dto.content);

    // 4. Resolve Dates
    const startDate = new Date(dto.date || dto.startDate || Date.now());
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;

    // 5. Resolve Source Type & Link
    const sourceType = dto.sourceType || 'API';
    const sourceLink = dto.sourceUrl || dto.sourceLink || undefined;

    // 6. Resolve Destination Feed
    const feedId = await this.resolveFeed(dto.feedSlug, dto.feedId, sourceType);

    // 7. Resolve Tags & Folders
    const combinedTags = Array.from(
      new Set([...(dto.tags || []), ...(dto.hashtags || [])].map((t) => t.trim().replace(/^#/, ''))),
    ).filter(Boolean);

    const folder = dto.folder || (sourceType === 'DEFI_CHAT' ? 'Defi/Insights' : undefined);

    // 8. Build target CreateNoteDto
    const noteDto: CreateNoteDto = {
      title,
      description: dto.content,
      type: dto.type || NoteType.SINGLE,
      startDate: startDate.toISOString(),
      endDate: endDate ? endDate.toISOString() : undefined,
      feedId,
      sourceType,
      sourceLink,
      externalId: dto.externalId,
      rawContent: dto.content,
      summary,
      icon: dto.icon || (sourceType === 'DEFI_CHAT' ? '💬' : '📌'),
      hashtags: combinedTags,
      folder,
      processingStatus: 'COMPLETED',
      metadata: dto.metadata || {},
    };

    // 9. Idempotent Deduplication (UPSERT by externalId)
    if (dto.externalId) {
      const existing = await this.prisma.note.findFirst({
        where: {
          externalId: dto.externalId,
          deletedAt: null,
        },
      });

      if (existing) {
        const updated = await this.notesService.update(existing.id, noteDto);
        this.logger.log(`🔄 [Ingest] Обновлена существующая Note '${updated.title}' (externalId: ${dto.externalId})`);
        return {
          success: true,
          action: 'UPDATED',
          isNew: false,
          noteId: existing.id,
          note: updated,
        };
      }
    }

    // 10. Create new Note
    const created = await this.notesService.create(noteDto);
    this.logger.log(`✨ [Ingest] Создана новая Note '${created.title}' (ID: ${created.id}, source: ${sourceType})`);

    return {
      success: true,
      action: 'CREATED',
      isNew: true,
      noteId: created.id,
      note: created,
    };
  }

  /**
   * Deterministically resolves or creates destination feed.
   */
  private async resolveFeed(feedSlug?: string, feedId?: string, sourceType?: string): Promise<string | undefined> {
    if (feedId) {
      const existing = await this.prisma.feed.findUnique({ where: { id: feedId } });
      if (existing && !existing.deletedAt) return existing.id;
    }

    const targetSlug =
      feedSlug ||
      (sourceType === 'DEFI_CHAT' ? 'defi-insights' : sourceType === 'WEB_CLIP' ? 'web-clips' : 'inbox');

    let feed = await this.prisma.feed.findUnique({ where: { slug: targetSlug } });
    if (feed && !feed.deletedAt) {
      return feed.id;
    }

    // Auto-create destination feed if not found
    try {
      const feedTitles: Record<string, string> = {
        'defi-insights': 'Defi AI Инсайты',
        'web-clips': 'Веб-клипы и закладки',
        inbox: 'Входящие заметки',
      };

      feed = await this.prisma.feed.create({
        data: {
          slug: targetSlug,
          title: feedTitles[targetSlug] || targetSlug,
          description: `Канал входящего контента (${targetSlug})`,
        },
      });
      return feed.id;
    } catch {
      // Fallback to first available feed
      const firstFeed = await this.prisma.feed.findFirst({ where: { deletedAt: null } });
      return firstFeed?.id;
    }
  }

  /**
   * Extracts clean title from markdown or first line if title is omitted.
   */
  private extractTitle(providedTitle?: string, content?: string): string {
    if (providedTitle && providedTitle.trim()) {
      return providedTitle.trim();
    }

    if (!content) {
      return `Заметка (${new Date().toLocaleDateString('ru-RU')})`;
    }

    const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const clean = line.replace(/^[#*>\s-]+/, '').trim();
      if (clean.length > 2) {
        return clean.slice(0, 120);
      }
    }

    return `Инсайт (${new Date().toLocaleDateString('ru-RU')})`;
  }

  /**
   * Extracts summary if provided or generates TL;DR preview from first paragraph.
   */
  private extractSummary(providedSummary?: string, content?: string): string | undefined {
    if (providedSummary && providedSummary.trim()) {
      return providedSummary.trim();
    }

    if (!content) return undefined;

    // Search for blockquote > ...
    const quoteMatch = content.match(/^>\s+(.+)$/m);
    if (quoteMatch && quoteMatch[1]) {
      return quoteMatch[1].trim().slice(0, 250);
    }

    // First paragraph
    const paragraphs = content.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => !p.startsWith('#'));
    if (paragraphs.length > 0 && paragraphs[0].length > 10) {
      return paragraphs[0].replace(/^[#*>\s-]+/, '').slice(0, 200).trim();
    }

    return undefined;
  }
}
