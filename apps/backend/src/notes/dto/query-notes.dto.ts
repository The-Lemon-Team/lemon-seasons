import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean, IsDateString, IsNumber } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { NoteType } from './create-note.dto';

export class QueryNotesDto {
  @ApiPropertyOptional({ description: 'Filter by Feed ID' })
  @IsString()
  @IsOptional()
  feedId?: string;

  @ApiPropertyOptional({ description: 'Filter by Feed Slug' })
  @IsString()
  @IsOptional()
  feedSlug?: string;

  @ApiPropertyOptional({ enum: NoteType, description: 'Filter by NoteType' })
  @IsEnum(NoteType)
  @IsOptional()
  type?: NoteType;

  @ApiPropertyOptional({ description: 'Filter notes with startDate on or after this ISO date' })
  @IsDateString()
  @IsOptional()
  startDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter notes with startDate on or before this ISO date' })
  @IsDateString()
  @IsOptional()
  startDateTo?: string;

  @ApiPropertyOptional({ description: 'Filter notes with endDate on or after this ISO date' })
  @IsDateString()
  @IsOptional()
  endDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter notes with endDate on or before this ISO date' })
  @IsDateString()
  @IsOptional()
  endDateTo?: string;

  @ApiPropertyOptional({ description: 'Time slice window start date (handles PERIOD overlaps)' })
  @IsDateString()
  @IsOptional()
  queryStart?: string;

  @ApiPropertyOptional({ description: 'Time slice window end date (handles PERIOD overlaps)' })
  @IsDateString()
  @IsOptional()
  queryEnd?: string;

  @ApiPropertyOptional({ description: 'Time slice overlap window start date' })
  @IsDateString()
  @IsOptional()
  overlapStart?: string;

  @ApiPropertyOptional({ description: 'Time slice overlap window end date' })
  @IsDateString()
  @IsOptional()
  overlapEnd?: string;

  @ApiPropertyOptional({ description: 'Filter by exact TaxonomyNode ID' })
  @IsString()
  @IsOptional()
  tagId?: string;

  @ApiPropertyOptional({ description: 'Filter by TaxonomyNode Ltree path prefix' })
  @IsString()
  @IsOptional()
  tagPath?: string;

  @ApiPropertyOptional({ description: 'Filter by hashtag name (e.g. "keynote" or "#keynote")' })
  @IsString()
  @IsOptional()
  hashtag?: string;

  @ApiPropertyOptional({ description: 'Filter by exact Hashtag UUID' })
  @IsString()
  @IsOptional()
  hashtagId?: string;

  @ApiPropertyOptional({ description: 'Filter by exact folder path (e.g. "News/Tech")' })
  @IsString()
  @IsOptional()
  folder?: string;

  @ApiPropertyOptional({ description: 'Filter by exact Folder UUID' })
  @IsString()
  @IsOptional()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Filter by folder path prefix including subfolders (e.g. "News")' })
  @IsString()
  @IsOptional()
  folderPrefix?: string;

  @ApiPropertyOptional({ description: 'Filter only notes without any folder assigned' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  unfiled?: boolean;

  @ApiPropertyOptional({ description: 'Text search across title and description' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Include soft-deleted notes' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ description: 'Number of records to return', default: 50 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset pagination start', default: 0 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  offset?: number;
}
