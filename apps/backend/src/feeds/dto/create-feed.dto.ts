import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'List of folder paths bound to this feed', example: ['Spark/AI', 'Spark/Habr'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  folderPaths?: string[];

  @ApiPropertyOptional({ description: 'Visual icon: Material symbol name, emoji or icon id', example: 'dynamic_feed' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Accent HEX color for badges and tree styling', example: '#c9cd58' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Saved hashtags for automatic content inclusion', example: ['ai', 'neuro'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  hashtags?: string[];
}
