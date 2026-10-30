import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsNotEmpty, IsIn, IsBoolean } from 'class-validator';

export class CreatePinDto {
  @ApiProperty({ description: 'ID заметки для закрепления', example: 'uuid' })
  @IsString()
  @IsNotEmpty()
  noteId: string;

  @ApiPropertyOptional({ description: 'ID трека (если не указан, заметка считается общей в воркспейсе)' })
  @IsString()
  @IsOptional()
  trackId?: string;

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
  @IsString()
  @IsOptional()
  trackId?: string;

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

export class BatchLinkNotesDto {
  @ApiProperty({ description: 'ID родительской заметки или периода' })
  @IsString()
  @IsNotEmpty()
  parentNoteId: string;

  @ApiProperty({ description: 'Список ID дочерних заметок для привязки', type: [String] })
  @IsNotEmpty()
  childNoteIds: string[];
}
