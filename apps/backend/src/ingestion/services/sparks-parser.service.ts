import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { LentaFrontmatterUtil, NoteType } from '@lenta/shared';
import { CreateNoteDto } from '../../notes/dto/create-note.dto';

export interface ParsedSparkResult {
  noteDto: CreateNoteDto;
  suggestedTags: string[];
  summary: string;
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
      const cleanName = nameWithoutExt.replace(/^\d{4}-\d{2}-\d{2}\s*[-_]?\s*/, '').trim();
      title = cleanName || 'Gemini Spark Note';
    }

    // 2. Resolve Dates
    const { startDate, endDate } = this.resolveDates(fm, fileName, fileStats?.mtime);

    // 3. Resolve Note Type
    const type = this.resolveNoteType(fm, title, startDate, endDate);

    // 4. Resolve Tags & Hashtags
    const tags = Array.from(
      new Set([
        ...(parsedMd.hashtags || []),
        ...(Array.isArray(fm.tags) ? fm.tags : []),
        'gemini-spark',
      ]),
    ).filter(Boolean);

    // 5. Resolve Summary (TL;DR)
    const summary = this.extractSummary(fm, parsedMd.body);

    // 6. Build CreateNoteDto
    const noteDto: CreateNoteDto = {
      title,
      description: parsedMd.body,
      type: type as any,
      startDate: startDate.toISOString(),
      endDate: endDate ? endDate.toISOString() : undefined,
      sourceType: 'GOOGLE_DRIVE',
      externalId: filePath,
      sourceLink: (fm.source || fm.sourceLink || fm.url) as string | undefined,
      rawContent: fileContent,
      summary,
      icon: (fm.icon as string) || '✨',
      hashtags: tags,
      processingStatus: 'COMPLETED',
      metadata: {
        generator: 'gemini-spark',
        fileName,
        filePath,
        fileSize: fileStats?.size,
        fileMtime: fileStats?.mtime?.toISOString(),
        ingestedAt: new Date().toISOString(),
      },
    };

    return {
      noteDto,
      suggestedTags: tags,
      summary,
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

    // Check date pattern in filename: YYYY-MM-DD
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

    // Extract first non-heading paragraph from Markdown body
    const paragraphs = body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !p.startsWith('#') && !p.startsWith('---'));

    if (paragraphs.length > 0) {
      const first = paragraphs[0].replace(/[#*`_\[\]]/g, '').trim();
      return first.length > 280 ? `${first.slice(0, 277)}...` : first;
    }

    return '';
  }
}
