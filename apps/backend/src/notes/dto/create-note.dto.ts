import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export enum NoteType {
  SINGLE = 'SINGLE',
  PERIOD = 'PERIOD',
  EVENT = 'EVENT',
  FILM_RELEASE = 'FILM_RELEASE',
  MENTION = 'MENTION',
  DONE = 'DONE',
}

export class CreateNoteDto {
  @ApiProperty({ description: 'Feed ID this note belongs to' })
  @IsString()
  @IsNotEmpty()
  feedId: string;

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

  @ApiPropertyOptional({ description: 'Optional icon identifier or emoji', example: 'movie' })
  @IsString()
  @IsOptional()
  icon?: string;

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
