import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ChatType } from '@prisma/client';

export class QueryThreadsDto {
  @ApiPropertyOptional({ description: 'Filter by folder ID' })
  @IsString()
  @IsOptional()
  folderId?: string;

  @ApiPropertyOptional({ enum: ChatType, description: 'Filter by type' })
  @IsEnum(ChatType)
  @IsOptional()
  type?: ChatType;

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
