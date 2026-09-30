import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsArray, IsEnum, IsBoolean } from 'class-validator';
import { ChatType } from '@prisma/client';

export class CreateChatThreadDto {
  @ApiProperty({ description: 'Title or topic of the thread' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ enum: ChatType, default: ChatType.DIRECT })
  @IsEnum(ChatType)
  @IsOptional()
  type?: ChatType;

  @ApiPropertyOptional({ description: 'Folder ID for categorizing this chat' })
  @IsString()
  @IsOptional()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Target agent ID for DIRECT chats (e.g. ivan-bely, okatsiya)' })
  @IsString()
  @IsOptional()
  targetAgent?: string;

  @ApiPropertyOptional({ description: 'Array of participating agent IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  participantAgents?: string[];

  @ApiPropertyOptional({ description: 'Anchor date context (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  dateScope?: string;

  @ApiPropertyOptional({ description: 'Whether thread is pinned to top', default: false })
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;
}
