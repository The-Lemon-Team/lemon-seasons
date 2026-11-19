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

export class NoteMediaAttachmentDto {
  @ApiProperty({ description: 'Media asset URL (from Lemon Media Hub or external)' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Original or stored filename' })
  @IsString()
  @IsOptional()
  filename?: string;

  @ApiPropertyOptional({ description: 'MIME type (e.g. image/webp)' })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Size in bytes' })
  @IsNumber()
  @IsOptional()
  sizeBytes?: number;

  @ApiPropertyOptional({ description: 'Image width in pixels' })
  @IsNumber()
  @IsOptional()
  width?: number | null;

  @ApiPropertyOptional({ description: 'Image height in pixels' })
  @IsNumber()
  @IsOptional()
  height?: number | null;

  @ApiPropertyOptional({ description: 'Caption text' })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional({ description: 'Alt text' })
  @IsString()
  @IsOptional()
  alt?: string;

  @ApiPropertyOptional({ description: 'Set as main/cover photo' })
  @IsBoolean()
  @IsOptional()
  isMain?: boolean;

  @ApiPropertyOptional({ description: 'Lemon Media Hub asset ID' })
  @IsString()
  @IsOptional()
  mediaAssetId?: string;
}

export class AttachMediaAssetsDto {
  @ApiProperty({ description: 'Media assets to attach to the note', type: [NoteMediaAttachmentDto] })
  @IsArray()
  @Type(() => NoteMediaAttachmentDto)
  items: NoteMediaAttachmentDto[];
}
