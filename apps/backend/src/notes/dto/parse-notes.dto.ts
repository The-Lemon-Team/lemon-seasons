import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateNoteDto } from './create-note.dto';

export class ParseNotesContextDto {
  @ApiPropertyOptional({ description: 'Default date to use if date is omitted in text (ISO string)', example: '2026-09-22T12:00:00.000Z' })
  @IsString()
  @IsOptional()
  defaultDate?: string;

  @ApiPropertyOptional({ description: 'Default Feed ID or slug', example: 'my-notes' })
  @IsString()
  @IsOptional()
  defaultFeedId?: string;

  @ApiPropertyOptional({ description: 'Default container ID for Obsidian context' })
  @IsString()
  @IsOptional()
  defaultContainerId?: string;

  @ApiPropertyOptional({ description: 'Default folder path (e.g. Trends/2026-09)', example: 'Trends/2026-09' })
  @IsString()
  @IsOptional()
  defaultFolder?: string;
}

export class ParseNotesDto {
  @ApiProperty({
    description: 'Natural language text input with notes, trends, events, dates or bullet lists',
    example: 'Тренды 22.09.26:\n- Уборка дома\n- Ремонтные работы\n- Warcraft',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({ description: 'Optional context clues for parsing', type: ParseNotesContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ParseNotesContextDto)
  context?: ParseNotesContextDto;
}

export class BatchCreateNotesDto {
  @ApiProperty({ description: 'Array of notes to create simultaneously', type: [CreateNoteDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNoteDto)
  notes: CreateNoteDto[];
}
