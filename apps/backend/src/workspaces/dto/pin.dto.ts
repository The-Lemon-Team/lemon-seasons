import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsInt,
  IsNotEmpty,
  IsIn,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  ValidateIf,
} from 'class-validator';

export class CreatePinDto {
  @ApiProperty({ description: 'ID заметки для закрепления', example: 'uuid' })
  @IsString()
  @IsNotEmpty()
  noteId: string;

  @ApiPropertyOptional({ description: 'ID трека (если не указан, заметка считается общей в воркспейсе)' })
  @ValidateIf((_, val) => val !== null && val !== undefined)
  @IsString()
  @IsOptional()
  trackId?: string | null;

  @ApiPropertyOptional({ description: 'Закреплена ли заметка в фокусные слоты воркспейса', default: false })
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @ApiPropertyOptional({
    description: 'Статус пина',
    enum: ['ACTIVE', 'NEEDS_ATTENTION', 'REVIEWED', 'ARCHIVED'],
    default: 'ACTIVE',
  })
  @IsIn(['ACTIVE', 'NEEDS_ATTENTION', 'REVIEWED', 'ARCHIVED'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Личный комментарий / заметка к пину' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({ description: 'Порядок сортировки' })
  @IsInt()
  @IsOptional()
  order?: number;
}

export class UpdatePinDto {
  @ApiPropertyOptional({ description: 'ID трека для перемещения (null для переноса в общие)' })
  @ValidateIf((_, val) => val !== null && val !== undefined)
  @IsString()
  @IsOptional()
  trackId?: string | null;

  @ApiPropertyOptional({ description: 'Закреплена ли заметка в фокусные слоты' })
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @ApiPropertyOptional({
    description: 'Статус пина',
    enum: ['ACTIVE', 'NEEDS_ATTENTION', 'REVIEWED', 'ARCHIVED'],
  })
  @IsIn(['ACTIVE', 'NEEDS_ATTENTION', 'REVIEWED', 'ARCHIVED'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Комментарий' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({ description: 'Порядок сортировки' })
  @IsInt()
  @IsOptional()
  order?: number;
}

export class ReorderPinItemDto {
  @ApiProperty({ description: 'ID пина воркспейса' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiPropertyOptional({ description: 'ID целевого трека (null для переноса в общие заметки)', nullable: true })
  @ValidateIf((_, val) => val !== null && val !== undefined)
  @IsString()
  @IsOptional()
  trackId?: string | null;

  @ApiProperty({ description: 'Новый порядок сортировки' })
  @IsInt()
  order: number;
}

export class ReorderPinsDto {
  @ApiProperty({ type: [ReorderPinItemDto], description: 'Пакетное обновление позиций и треков пинов' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderPinItemDto)
  items: ReorderPinItemDto[];
}

export class BatchLinkNotesDto {
  @ApiProperty({ description: 'ID родительской заметки или периода' })
  @IsString()
  @IsNotEmpty()
  parentNoteId: string;

  @ApiProperty({ description: 'Список ID дочерних заметок для привязки', type: [String] })
  @IsNotEmpty()
  childNoteIds: string[];
}
