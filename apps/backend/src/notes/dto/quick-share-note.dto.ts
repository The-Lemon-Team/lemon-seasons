import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class QuickShareNoteDto {
  @ApiProperty({ description: 'URL of the shared content', example: 'https://github.com/trending' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: 'Title of the shared note', example: 'GitHub Trending Repositories' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Markdown description or notes', example: 'Shared from mobile' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Target vault folder path', example: 'Mobile/Shared', default: 'Mobile/Shared' })
  @IsString()
  @IsOptional()
  folder?: string;

  @ApiPropertyOptional({ description: 'Container ID (Obsidian vault container)', example: 'main-vault' })
  @IsString()
  @IsOptional()
  containerId?: string;

  @ApiPropertyOptional({ description: 'Tags or hashtags', example: ['mobile', 'shared'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'User key for authentication/authorization', example: 'lenta_api_...' })
  @IsString()
  @IsOptional()
  userKey?: string;

  @ApiPropertyOptional({ description: 'Template identifier if used', example: 'standard' })
  @IsString()
  @IsOptional()
  template?: string;
}
