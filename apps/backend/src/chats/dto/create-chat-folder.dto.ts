import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateChatFolderDto {
  @ApiProperty({ description: 'Display name of the chat folder' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Unique path/slug for hierarchy' })
  @IsString()
  @IsOptional()
  path?: string;

  @ApiPropertyOptional({ description: 'Description or domain focus of the folder' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Lucide icon name' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Accent color hex' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Display sort order' })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ description: 'Parent folder ID for nesting' })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Visual style prompt for Gemini image generation in this folder' })
  @IsString()
  @IsOptional()
  imageStylePrompt?: string;

  @ApiPropertyOptional({ description: 'System context rules for curators and agents in this folder' })
  @IsString()
  @IsOptional()
  contextRules?: string;
}
