import { IsString, IsOptional, IsArray, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NoteType } from '@lenta/shared';

export class QueryDailyNewsDto {
  @ApiPropertyOptional({ description: 'Date in YYYY-MM-DD format (defaults to current date)', example: '2026-09-28' })
  @IsOptional()
  @IsString()
  date?: string;
}

export class TransformNewsDto {
  @ApiPropertyOptional({ description: 'Feed ID to attach note to' })
  @IsOptional()
  @IsString()
  feedId?: string;

  @ApiPropertyOptional({ description: 'Container ID' })
  @IsOptional()
  @IsString()
  containerId?: string;

  @ApiPropertyOptional({ description: 'Folder name or path' })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({ description: 'Overridden note title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Overridden note description / Markdown content' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Note Type', enum: NoteType })
  @IsOptional()
  @IsEnum(NoteType)
  type?: NoteType;

  @ApiPropertyOptional({ description: 'Assigned curator persona' })
  @IsOptional()
  @IsString()
  curator?: string;

  @ApiPropertyOptional({ description: 'Custom hashtags' })
  @IsOptional()
  @IsArray()
  hashtags?: string[];
}

export class GeneratePodcastDto {
  @ApiProperty({ description: 'Target date for podcast YYYY-MM-DD', example: '2026-09-28' })
  @IsString()
  date!: string;

  @ApiPropertyOptional({ description: 'List of DailyNewsCard IDs to ground the podcast on' })
  @IsOptional()
  @IsArray()
  newsIds?: string[];

  @ApiPropertyOptional({ description: 'Host 1 Name', default: 'Алексей' })
  @IsOptional()
  @IsString()
  host1Name?: string;

  @ApiPropertyOptional({ description: 'Host 2 Name', default: 'Елена' })
  @IsOptional()
  @IsString()
  host2Name?: string;

  @ApiPropertyOptional({ description: 'Optional tone of the podcast', default: 'dynamic' })
  @IsOptional()
  @IsString()
  tone?: 'dynamic' | 'analytical' | 'fast';
}

export class PublishPodcastDto {
  @ApiProperty({ description: 'Target date YYYY-MM-DD', example: '2026-09-28' })
  @IsString()
  date!: string;

  @ApiProperty({ description: 'Full podcast script object' })
  podcast!: any;

  @ApiPropertyOptional({ description: 'Feed ID to publish note to' })
  @IsOptional()
  @IsString()
  feedId?: string;

  @ApiPropertyOptional({ description: 'Container ID' })
  @IsOptional()
  @IsString()
  containerId?: string;
}

export class AgentChatDto {
  @ApiProperty({ description: 'User message or slash command prompt', example: '/ivan какие новости на сегодня?' })
  @IsString()
  message!: string;

  @ApiPropertyOptional({ description: 'Target date in YYYY-MM-DD format (defaults to current date)', example: '2026-09-28' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Target agent id or all', example: 'all' })
  @IsOptional()
  @IsString()
  targetAgent?: 'all' | 'ivan-bely' | 'kirk-kitten' | 'independent-analyst' | 'dispatcher';

  @ApiPropertyOptional({ description: 'Previous conversation history for context' })
  @IsOptional()
  @IsArray()
  history?: any[];
}

