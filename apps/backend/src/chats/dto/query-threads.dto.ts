import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ChatType } from '@prisma/client';

export class QueryThreadsDto {
  @ApiPropertyOptional({ description: 'Filter by folder ID (or "all" for all folders)' })
  @IsString()
  @IsOptional()
  folderId?: string;

  @ApiPropertyOptional({ enum: ChatType, description: 'Filter by chat type (TOPIC, CURATOR, ASSISTANT, GROUP, DIRECT)' })
  @IsEnum(ChatType)
  @IsOptional()
  type?: ChatType;

  @ApiPropertyOptional({ description: 'Filter by Curator ID' })
  @IsString()
  @IsOptional()
  curatorId?: string;

  @ApiPropertyOptional({ description: 'Filter by Assistant ID' })
  @IsString()
  @IsOptional()
  assistantId?: string;

  @ApiPropertyOptional({ description: 'Search title' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Include archived threads' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  includeArchived?: boolean;
}
