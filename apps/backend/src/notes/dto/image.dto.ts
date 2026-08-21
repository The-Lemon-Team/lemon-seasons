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
