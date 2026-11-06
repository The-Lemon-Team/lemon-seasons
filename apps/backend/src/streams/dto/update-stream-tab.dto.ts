import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateStreamTabDto {
  @ApiPropertyOptional({ description: 'Custom display title overriding feed title in this stream tab' })
  @IsString()
  @IsOptional()
  customTitle?: string;

  @ApiPropertyOptional({ description: 'Custom emoji or symbol icon' })
  @IsString()
  @IsOptional()
  customIcon?: string;

  @ApiPropertyOptional({ description: 'Custom badge label (e.g. daily, hot)' })
  @IsString()
  @IsOptional()
  badge?: string;

  @ApiPropertyOptional({ description: 'Display order priority index' })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ description: 'Whether this tab is hidden from this stream' })
  @IsBoolean()
  @IsOptional()
  isHidden?: boolean;
}
