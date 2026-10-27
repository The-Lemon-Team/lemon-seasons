import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export enum NoteType {
  SINGLE = 'SINGLE',
  PERIOD = 'PERIOD',
  EVENT = 'EVENT',
  FILM_RELEASE = 'FILM_RELEASE',
  MENTION = 'MENTION',
  DONE = 'DONE',
}

export enum NoteStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateNoteDto {
  @ApiPropertyOptional({ description: 'Feed ID this note belongs to' })
  @IsString()
  @IsOptional()
  feedId?: string;

  @ApiPropertyOptional({ description: 'Target Public/Staging Feed ID when publishing from Admin to Staging Hub' })
  @IsString()
  @IsOptional()
  publicFeedId?: string | null;

  @ApiPropertyOptional({ description: 'Privacy contour of the note (private | public)', default: 'private' })
  @IsString()
  @IsOptional()
  privacy?: 'private' | 'public';

  @ApiPropertyOptional({ description: 'Container ID this note belongs to' })
  @IsString()
  @IsOptional()
  containerId?: string;

  @ApiPropertyOptional({
    enum: NoteStatus,
    description: 'Publication lifecycle status',
    example: NoteStatus.PUBLISHED,
  })
  @IsEnum(NoteStatus)
  @IsOptional()
  status?: NoteStatus;

  @ApiPropertyOptional({ description: 'Scheduled publication date and time (ISO string)', example: '2026-10-17T09:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  publishAt?: string;

  @ApiPropertyOptional({ description: 'Logical or relative folder path (e.g. Spark/AI)', example: 'Spark/AI' })
  @IsString()
  @IsOptional()
  folderPath?: string;

  @ApiProperty({ description: 'Title of the note', example: 'Marvel Cinematic Universe Phase 5 Overview' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Raw Markdown content of the note',
    example: '### Overview\nThe upcoming phase includes several highly anticipated releases...',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: NoteType,
    description: 'Type of the chronological note',
    example: NoteType.SINGLE,
  })
  @IsEnum(NoteType)
  type: NoteType;

  @ApiProperty({ description: 'Start date and time (ISO string)', example: '2026-08-20T10:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Optional end date and time (ISO string)', example: '2026-08-20T18:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'External source URL', example: 'https://marvel.com' })
  @IsString()
  @IsOptional()
  sourceLink?: string;

  @ApiPropertyOptional({ description: 'Source type (MANUAL, GOOGLE_DRIVE, DEFI_CHAT, WEB_CLIP, API)', example: 'GOOGLE_DRIVE' })
  @IsString()
  @IsOptional()
  sourceType?: string;

  @ApiPropertyOptional({ description: 'External identifier in the source platform', example: '1A2b3C_gdrive_id' })
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiPropertyOptional({ description: 'Raw unparsed content or markdown before LLM processing' })
  @IsString()
  @IsOptional()
  rawContent?: string;

  @ApiPropertyOptional({ description: 'Short summary or TL;DR' })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional({ description: 'Processing status (PENDING, PROCESSING, COMPLETED, FAILED)', example: 'COMPLETED' })
  @IsString()
  @IsOptional()
  processingStatus?: string;

  @ApiPropertyOptional({ description: 'Arbitrary metadata object (file sizes, timestamps, etc.)' })
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({ description: 'Optional icon identifier or emoji', example: 'movie' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Author or creator assigned to this note', example: 'User' })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiPropertyOptional({ description: 'Legacy curator field (deprecated)', example: 'User' })
  @IsString()
  @IsOptional()
  curator?: string;

  @ApiPropertyOptional({ description: 'Parent note ID if this note is a synthesis or child', example: 'uuid-parent' })
  @IsString()
  @IsOptional()
  parentNoteId?: string;

  @ApiPropertyOptional({ description: 'Resonance score percentage (0-100)', example: 88 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  resonanceScore?: number;

  @ApiPropertyOptional({
    description: 'Array of TaxonomyNode IDs or Ltree paths to associate with this note',
    example: ['tech.frontend.react', 'uuid-node-id'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];

  @ApiPropertyOptional({
    description: 'Array of hashtag names or keywords (with or without # prefix)',
    example: ['keynote', 'ai', 'launch2026'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  hashtags?: string[];

  @ApiPropertyOptional({
    description: 'Primary or multi-folder path(s) for Obsidian vault physical location (e.g. ["News/Tech", "Projects/Lenta"])',
    example: ['News/Tech'],
  })
  @IsArray()
  @IsOptional()
  folders?: (string | { path: string; isPrimary?: boolean; order?: number })[];

  @ApiPropertyOptional({
    description: 'Convenience single folder path (e.g. "News/Tech")',
    example: 'News/Tech',
  })
  @IsString()
  @IsOptional()
  folder?: string;

  @ApiPropertyOptional({
    description: 'Array of Folder IDs to associate with this note',
    type: [String],
    example: ['folder-uuid-1'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  folderIds?: string[];

  @ApiPropertyOptional({
    description: 'If true, auto-suggests and provisions a default folder from taxonomy tag path when no folders are provided',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  suggestFolder?: boolean;

  @ApiPropertyOptional({
    description: 'Initial links to create with the note',
    type: 'array',
  })
  @IsArray()
  @IsOptional()
  links?: { url: string; title?: string; isSource?: boolean; order?: number }[];
}
