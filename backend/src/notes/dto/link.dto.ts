import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNoteLinkDto {
  @ApiProperty({ description: 'URL of the link' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: 'Display title or label for the link' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Whether this link is the primary source' })
  @IsBoolean()
  @IsOptional()
  isSource?: boolean;

  @ApiPropertyOptional({ description: 'Display order index' })
  @IsNumber()
  @IsOptional()
  order?: number;
}

export class AddNoteLinksDto {
  @ApiProperty({ description: 'Array of links to add to the note', type: [CreateNoteLinkDto] })
  @IsArray()
  @Type(() => CreateNoteLinkDto)
  links: CreateNoteLinkDto[];
}

export class UpdateNoteLinkDto {
  @ApiPropertyOptional({ description: 'URL of the link' })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ description: 'Display title or label for the link' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Whether this link is the primary source' })
  @IsBoolean()
  @IsOptional()
  isSource?: boolean;

  @ApiPropertyOptional({ description: 'Display order index' })
  @IsNumber()
  @IsOptional()
  order?: number;
}

export class LinkOrderItemDto {
  @ApiProperty({ description: 'NoteLink ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'New order index' })
  @IsNumber()
  order: number;
}

export class ReorderNoteLinksDto {
  @ApiProperty({ description: 'Array of link IDs and new order', type: [LinkOrderItemDto] })
  @IsArray()
  @Type(() => LinkOrderItemDto)
  items: LinkOrderItemDto[];
}
