import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCuratorDto {
  @ApiProperty({ description: 'Full display name of the curator' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Short/informal name of the curator' })
  @IsString()
  @IsOptional()
  shortName?: string;

  @ApiProperty({ description: 'Title or role description (e.g. "Аналитик аппаратного обеспечения")' })
  @IsString()
  @IsNotEmpty()
  roleTitle!: string;

  @ApiPropertyOptional({ description: 'Personality and style of thinking / communication' })
  @IsString()
  @IsOptional()
  personality?: string;

  @ApiProperty({ description: 'Detailed system prompt and analytical focus instructions' })
  @IsString()
  @IsNotEmpty()
  systemPrompt!: string;

  @ApiPropertyOptional({ description: 'Emoji icon', default: '👤' })
  @IsString()
  @IsOptional()
  emoji?: string;

  @ApiPropertyOptional({ description: 'Accent hex color', default: '#10b981' })
  @IsString()
  @IsOptional()
  accentColor?: string;

  @ApiPropertyOptional({ description: 'Folder ID to bind this curator to (null for global)' })
  @IsString()
  @IsOptional()
  folderId?: string;
}
