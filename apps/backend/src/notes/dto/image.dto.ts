import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateNoteImageDto {
  @ApiPropertyOptional({ description: 'Image caption' })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional({ description: 'Accessibility alt text' })
  @IsString()
  @IsOptional()
  alt?: string;

  @ApiPropertyOptional({ description: 'Set as main/cover photo' })
  @IsBoolean()
  @IsOptional()
  isMain?: boolean;

  @ApiPropertyOptional({ description: 'Display order index' })
  @IsNumber()
  @IsOptional()
  order?: number;
}

export class ImageOrderItemDto {
  @ApiProperty({ description: 'NoteImage ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'New order index' })
  @IsNumber()
  order: number;
}

export class ReorderNoteImagesDto {
  @ApiProperty({ description: 'Array of image IDs and new order', type: [ImageOrderItemDto] })
  @IsArray()
  @Type(() => ImageOrderItemDto)
  items: ImageOrderItemDto[];
}

export class ExternalImageItemDto {
  @ApiProperty({ description: 'External image URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: 'Image caption / title' })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional({ description: 'Accessibility alt text' })
  @IsString()
  @IsOptional()
  alt?: string;

  @ApiPropertyOptional({ description: 'Set as main/cover photo' })
  @IsBoolean()
  @IsOptional()
  isMain?: boolean;
}

export class AttachImagesFromUrlsDto {
  @ApiProperty({ description: 'List of external image URLs to download and attach', type: [ExternalImageItemDto] })
  @IsArray()
  @Type(() => ExternalImageItemDto)
  items: ExternalImageItemDto[];
}

export class FetchExternalMediaDto {
  @ApiProperty({ description: 'External image URL to download and save' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: 'Optional fallback title/name' })
  @IsString()
  @IsOptional()
  title?: string;
}
