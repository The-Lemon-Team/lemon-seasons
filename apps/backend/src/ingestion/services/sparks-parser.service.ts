import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { LentaFrontmatterUtil, NoteType, NoteStatus, RelatedNoteItem } from '@lenta/shared';
import { CreateNoteDto } from '../../notes/dto/create-note.dto';

export interface ParsedSparkResult {
  noteDto: CreateNoteDto;
  suggestedTags: string[];
  summary: string;
  timeSlot?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ALL_DAY';
}

@Injectable()
export class SparksParserService {
  private readonly logger = new Logger(SparksParserService.name);

  /**
   * Parses raw Markdown from a Gemini Spark file into structured CreateNoteDto.
   */
  public parseSparkFile(
    filePath: string,
    fileContent: string,
    fileStats?: { mtime?: Date; size?: number },
  ): ParsedSparkResult {
    const fileName = path.basename(filePath);
    const parsedMd = LentaFrontmatterUtil.parseMarkdown(fileContent);
    const fm = parsedMd.frontmatter || {};

    // 1. Resolve Title
    let title = parsedMd.title || '';
    if (!title || title === 'Untitled Note') {
      // Try resolving title from filename stripping date prefix and extension
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
      const cleanName = nameWithoutExt
        .replace(/^\d{4}-\d{2}-\d{2}\s*[-_]?\s*/, '')
        .replace(/^\d{2}\.\d{2}\.\d{2,4}\s*[-_]?\s*/, '')
        .trim();
      title = cleanName || 'Gemini Spark Note';
    }

    // 2. Resolve Dates
    const { startDate, endDate } = this.resolveDates(fm, fileName, fileStats?.mtime);

    // 3. Resolve Note Type
    const type = this.resolveNoteType(fm, title, startDate, endDate);

    // 4. Resolve Time Slot (Утро / День / Вечер)
    const timeSlot = this.resolveTimeSlot(title, fileName, startDate);

    // 5. Resolve Tags & Hashtags (including time-slot and digest badges)
    const slotTags: string[] = [];
    if (timeSlot === 'MORNING') slotTags.push('утро');
    if (timeSlot === 'AFTERNOON') slotTags.push('день');
    if (timeSlot === 'EVENING') slotTags.push('вечер');
    if (type === NoteType.PERIOD) slotTags.push('сводка', 'дайджест');

    const tags = Array.from(
      new Set([
        ...(parsedMd.hashtags || []),
        ...(Array.isArray(fm.tags) ? fm.tags : []),
        ...slotTags,
        'gemini-spark',
      ]),
    ).filter(Boolean);

    // 6. Resolve Summary (TL;DR)
    const summary = this.extractSummary(fm, parsedMd.body);

    // 7. Resolve Resonance Score
    const rawScore = fm.resonance_score ?? fm.resonanceScore;
    const resonanceScore =
      typeof rawScore === 'number'
        ? rawScore
        : typeof rawScore === 'string' && !isNaN(parseInt(rawScore, 10))
        ? parseInt(rawScore, 10)
        : undefined;

    // 8. Resolve Links
    const links = Array.isArray(fm.links)
      ? fm.links
          .filter((l: any) => l && typeof l.url === 'string' && l.url.trim().length > 0)
          .map((l: any, idx: number) => ({
            url: l.url.trim(),
            title: l.title || '',
            isSource: Boolean(l.is_source ?? l.isSource ?? (idx === 0)),
            order: idx,
          }))
      : undefined;

    const sourceLink =
      links?.find((l: any) => l.isSource)?.url ||
      (fm.source || fm.sourceLink || fm.url) as string | undefined;

    // 9. Resolve Icon
    const defaultIcon =
      timeSlot === 'MORNING'
        ? '🌅'
        : timeSlot === 'EVENING'
        ? '🌆'
        : timeSlot === 'AFTERNOON'
        ? '☀️'
        : type === NoteType.PERIOD
        ? '📰'
        : '✨';
    const icon = (fm.icon as string) || defaultIcon;

    // 10. Resolve Publication Lifecycle Status & Scheduled Publish Time
    const rawStatus = (fm.status as string)?.toUpperCase();
    const status =
      rawStatus === 'DRAFT'
        ? NoteStatus.DRAFT
        : rawStatus === 'SCHEDULED'
        ? NoteStatus.SCHEDULED
        : rawStatus === 'ARCHIVED'
        ? NoteStatus.ARCHIVED
        : NoteStatus.PUBLISHED;

    const rawPublishAt = fm.publish_at || fm.publishAt;
    let publishAt: string | undefined = undefined;
    if (rawPublishAt) {
      const parsedP = new Date(rawPublishAt);
      if (!isNaN(parsedP.getTime())) publishAt = parsedP.toISOString();
    }

    // 10.5. Extract & Clean Related Notes (Wikilinks)
    const { links: relatedLinks, cleanedBody, rawRelatedSection } =
      LentaFrontmatterUtil.extractRelatedLinks(parsedMd.body, fm);

    const relatedNotesData: RelatedNoteItem[] = relatedLinks.map((link) => {
      const pipeIdx = link.indexOf('|');
      const targetName = pipeIdx >= 0 ? link.slice(0, pipeIdx).trim() : link;
      const alias = pipeIdx >= 0 ? link.slice(pipeIdx + 1).trim() : undefined;
      const cleanTitle = targetName
        .replace(/^\d{2}\.\d{2}\.\d{2,4}\s*[-_—–]?\s*/, '')
        .replace(/^\d{4}-\d{2}-\d{2}\s*[-_—–]?\s*/, '')
        .trim();
      const isVaultDoc = targetName.startsWith('00 - ') || targetName.toLowerCase().includes('источники');

      return {
        raw: link,
        cleanTitle: cleanTitle || targetName,
        alias,
        resolved: false,
        isVaultDoc,
      };
    });

    // 11. Build CreateNoteDto
    const noteDto: CreateNoteDto = {
      title,
      description: cleanedBody, // Cleaned description without the raw trailing markdown block
      type: type as any,
      status: status as any,
      publishAt,
      startDate: startDate.toISOString(),
      endDate: endDate ? endDate.toISOString() : undefined,
      sourceType: 'GOOGLE_DRIVE',
      externalId: filePath,
      sourceLink,
      rawContent: fileContent,
      summary,
      icon,
      curator: (fm.curator as string) || (fm.author as string) || undefined,
      resonanceScore,
      hashtags: tags,
      links,
      processingStatus: 'COMPLETED',
      metadata: {
        generator: 'gemini-spark',
        fileName,
        filePath,
        subtype: (fm.subtype as string) || undefined,
        timeSlot,
        feedSlug: fm.feed || undefined,
        fileSize: fileStats?.size,
        fileMtime: fileStats?.mtime?.toISOString(),
        ingestedAt: new Date().toISOString(),
        relatedNotes: relatedNotesData,
        rawRelatedSection,
      },
    };

    return {
      noteDto,
      suggestedTags: tags,
      summary,
      timeSlot,
    };
  }

  private resolveDates(
    fm: Record<string, any>,
    fileName: string,
    fallbackMtime?: Date,
  ): { startDate: Date; endDate?: Date } {
    let start: Date | null = null;
    let end: Date | null = null;

    // Check frontmatter dates
    const rawStart = fm.start_date || fm.startDate || fm.date;
    if (rawStart) {
      const parsed = new Date(rawStart);
      if (!isNaN(parsed.getTime())) start = parsed;
    }

    const rawEnd = fm.end_date || fm.endDate;
    if (rawEnd) {
      const parsed = new Date(rawEnd);
      if (!isNaN(parsed.getTime())) end = parsed;
    }

    // Check Russian date pattern in filename: DD.MM.YY or DD.MM.YYYY
    if (!start) {
      const ruDateMatch = fileName.match(/(\d{2})\.(\d{2})\.(\d{2,4})/);
      if (ruDateMatch) {
        const day = ruDateMatch[1];
        const month = ruDateMatch[2];
        let year = ruDateMatch[3];
        if (year.length === 2) year = `20${year}`;
        const parsed = new Date(`${year}-${month}-${day}T12:00:00.000Z`);
        if (!isNaN(parsed.getTime())) start = parsed;
      }
    }

    // Check ISO date pattern in filename: YYYY-MM-DD
    if (!start) {
      const dateMatch = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const parsed = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T12:00:00.000Z`);
        if (!isNaN(parsed.getTime())) start = parsed;
      }
    }

    // Fallback to file mtime or now
    if (!start) {
      start = fallbackMtime || new Date();
    }

    return {
      startDate: start,
      endDate: end || undefined,
    };
  }

  private resolveTimeSlot(
    title: string,
    fileName: string,
    startDate: Date,
  ): 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ALL_DAY' {
    const text = `${title} ${fileName}`.toLowerCase();
    if (text.includes('утренн') || text.includes('10_00') || text.includes('10:00')) {
      return 'MORNING';
    }
    if (text.includes('вечерн') || text.includes('18_00') || text.includes('18:00')) {
      return 'EVENING';
    }
    if (text.includes('дневн') || text.includes('14_00') || text.includes('14:00') || text.includes('выпуск 1')) {
      return 'AFTERNOON';
    }

    const hour = startDate.getUTCHours();
    if (hour >= 5 && hour < 12) return 'MORNING';
    if (hour >= 12 && hour < 17) return 'AFTERNOON';
    if (hour >= 17) return 'EVENING';

    return 'ALL_DAY';
  }

  private resolveNoteType(
    fm: Record<string, any>,
    title: string,
    start: Date,
    end?: Date,
  ): NoteType {
    if (fm.type && Object.values(NoteType).includes(fm.type as NoteType)) {
      return fm.type as NoteType;
    }

    if (end && end.getTime() > start.getTime()) {
      return NoteType.PERIOD;
    }

    const lower = title.toLowerCase();
    if (lower.includes('дайджест') || lower.includes('сводный') || lower.includes('обзор')) {
      return NoteType.PERIOD;
    }

    if (lower.includes('митап') || lower.includes('конференция') || lower.includes('созвон')) {
      return NoteType.EVENT;
    }

    return NoteType.SINGLE;
  }

  private extractSummary(fm: Record<string, any>, body: string): string {
    if (fm.summary && typeof fm.summary === 'string') {
      return fm.summary.trim();
    }

    if (fm.description && typeof fm.description === 'string') {
      return fm.description.trim();
    }

    // Try extracting content under dedicated summary sections (e.g. "## 📌 Суть события" or "## Суть")
    const sectionMatch = body.match(/##\s*[^\n]*(?:Суть|Главное|Ключевое)[^\n]*\n+([\s\S]*?)(?=\n##|\n---|$)/i);
    if (sectionMatch && sectionMatch[1].trim()) {
      const cleanSection = sectionMatch[1]
        .split(/\n\s*\n/)[0]
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // un-markdown links
        .replace(/[#*`_>]/g, '')
        .trim();
      if (cleanSection.length > 0) {
        return cleanSection.length > 280 ? `${cleanSection.slice(0, 277)}...` : cleanSection;
      }
    }

    // Extract first meaningful non-heading, non-blockquote paragraph from Markdown body
    const paragraphs = body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !p.startsWith('#') && !p.startsWith('---') && !p.startsWith('>'));

    if (paragraphs.length > 0) {
      const first = paragraphs[0]
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[#*`_\[\]]/g, '')
        .trim();
      return first.length > 280 ? `${first.slice(0, 277)}...` : first;
    }

    return '';
  }
}

