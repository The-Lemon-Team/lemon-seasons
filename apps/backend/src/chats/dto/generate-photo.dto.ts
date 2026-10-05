import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GeneratePhotoDto {
  @ApiPropertyOptional({ description: 'Specific prompt or topic for image generation' })
  @IsString()
  @IsOptional()
  prompt?: string;

  @ApiPropertyOptional({ description: 'Aspect ratio (e.g. 1:1, 16:9, 9:16)', default: '16:9' })
  @IsString()
  @IsOptional()
  aspectRatio?: string;
}
