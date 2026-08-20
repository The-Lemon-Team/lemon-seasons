import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFeedDto {
  @ApiProperty({ description: 'Title of the feed', example: 'Product Milestones' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Optional description of the feed', example: 'Tracking internal releases and sprint goals' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Unique slug for URL routing', example: 'product-milestones' })
  @IsString()
  @IsOptional()
  slug?: string;
}
