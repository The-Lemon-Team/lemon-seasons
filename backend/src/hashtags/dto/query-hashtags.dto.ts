import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryHashtagsDto {
  @ApiPropertyOptional({ description: 'Search hashtags by keyword or prefix' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Include soft-deleted hashtags' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ description: 'Limit number of results', default: 50 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;
}
