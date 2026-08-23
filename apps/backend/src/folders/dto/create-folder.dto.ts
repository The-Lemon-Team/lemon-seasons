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
    description: 'Folder privacy setting (public or private)',
    example: 'public',
    enum: ['public', 'private'],
  })
  @IsString()
  @IsOptional()
  privacy?: 'public' | 'private';
}
