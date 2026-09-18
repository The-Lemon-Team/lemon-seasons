import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFolderDto {
  @ApiPropertyOptional({
    description: 'Display name of the folder (if omitted, extracted from path)',
    example: 'Tech',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Slash-separated folder path in Obsidian vault format',
    example: 'News/Tech',
  })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiPropertyOptional({
    description: 'Icon identifier or emoji for the folder',
    example: 'folder_open',
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({
    description: 'Optional hex color or theme token for the folder badge',
    example: '#c9cd58',
  })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({
    description: 'Folder privacy setting (public, private, or obsidian container folder)',
    example: 'public',
    enum: ['public', 'private', 'obsidian'],
  })
  @IsString()
  @IsOptional()
  privacy?: 'public' | 'private' | 'obsidian';

  @ApiPropertyOptional({
    description: 'ID of the Obsidian container for internal/scoped folders (null for global external folders)',
    example: 'cont-personal-vault',
  })
  @IsString()
  @IsOptional()
  containerId?: string | null;

  @ApiPropertyOptional({
    description: 'Folder scope: external (global project folder) or internal (container-specific)',
    example: 'external',
    enum: ['external', 'internal'],
  })
  @IsString()
  @IsOptional()
  scope?: 'external' | 'internal';
}
