import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { AssistantSkill } from '@prisma/client';

export class CreateAssistantDto {
  @ApiProperty({ description: 'Display name of the assistant (e.g. "Фото-художник контура")' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: AssistantSkill, default: AssistantSkill.IMAGE_GEN })
  @IsEnum(AssistantSkill)
  skillType!: AssistantSkill;

  @ApiPropertyOptional({ description: 'Brief description of assistant role' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Custom prompt rules or guidelines for this assistant' })
  @IsString()
  @IsOptional()
  customPrompt?: string;

  @ApiPropertyOptional({ description: 'JSON configuration for the skill (e.g. style, aspect ratio)' })
  @IsOptional()
  config?: any;

  @ApiPropertyOptional({ description: 'Avatar emoji or icon', default: '🛠️' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ description: 'Folder ID to bind this assistant to (null for global)' })
  @IsString()
  @IsOptional()
  folderId?: string;
}
