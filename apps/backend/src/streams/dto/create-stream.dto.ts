import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStreamDto {
  @ApiProperty({ description: 'Title of the stream', example: 'Развлечения' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Optional description of the stream', example: 'Киновселенная Marvel, игры, киноновинки' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Unique slug for URL routing', example: 'entertainment' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: 'Visual icon: emoji or symbol name', example: '🍿' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Accent HEX color for badges and UI cards', example: '#2481cc' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Optional badge text', example: 'live' })
  @IsString()
  @IsOptional()
  badge?: string;

  @ApiPropertyOptional({ description: 'Privacy level of the stream', example: 'public', enum: ['public', 'private'] })
  @IsString()
  @IsOptional()
  privacy?: 'public' | 'private';

  @ApiPropertyOptional({ description: 'Display order priority in tab rows', example: 1 })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ description: 'Whether this is a built-in system stream', example: false })
  @IsBoolean()
  @IsOptional()
  isBuiltin?: boolean;

  @ApiPropertyOptional({ description: 'Array of Feed IDs bound to this stream', example: ['feed-1', 'feed-2'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  feedIds?: string[];

  @ApiPropertyOptional({ description: 'Saved hashtags for automatic content inclusion', example: ['marvel', 'cinema'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'List of folder paths bound to this stream', example: ['entertainment/', 'myfilms/'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  folderPaths?: string[];
}
