import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
} from 'class-validator';
import { NoteType } from '@prisma/client';
import { ImageAspectRatio } from '../services/gemini-image.service';

export class GenerateNoteAiDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  dateStr: string;

  @IsString()
  @IsOptional()
  context?: string;
}

export class GenerateImageAiDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  prompt?: string;

  @IsString()
  @IsOptional()
  style?: string;

  @IsString()
  @IsOptional()
  aspectRatio?: ImageAspectRatio;

  @IsString()
  @IsOptional()
  context?: string;

  @IsNumber()
  @IsOptional()
  count?: number;

  @IsString()
  @IsOptional()
  noteId?: string;
}

export class RemixImageAiDto {
  @IsString()
  @IsNotEmpty()
  sourceAssetId: string;

  @IsString()
  @IsNotEmpty()
  instruction: string;

  @IsString()
  @IsOptional()
  style?: string;

  @IsString()
  @IsOptional()
  aspectRatio?: ImageAspectRatio;

  @IsNumber()
  @IsOptional()
  count?: number;
}

export class GenerateNoteCoverAiDto {
  @IsString()
  @IsOptional()
  style?: string;

  @IsString()
  @IsOptional()
  aspectRatio?: ImageAspectRatio;

  @IsString()
  @IsOptional()
  customPrompt?: string;

  @IsBoolean()
  @IsOptional()
  setAsMain?: boolean;
}

export class AttachCoverDto {
  @IsString()
  @IsNotEmpty()
  assetUrl: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsBoolean()
  @IsOptional()
  setAsMain?: boolean;
}

export class ImportNoteDto {
  @IsString()
  @IsNotEmpty()
  feedSlug: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(NoteType)
  type: NoteType;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  sourceLink?: string;

  @IsString()
  @IsOptional()
  taxonomyPath?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  folders?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  hashtags?: string[];

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  imageCaption?: string;

  @IsString()
  @IsOptional()
  trailerUrl?: string;
}
