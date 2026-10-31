import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
} from 'class-validator';

export class CreateQuickAddMacroDto {
  @ApiProperty({ description: 'Название пресета / макроса', example: 'JM-Daily' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Краткое описание' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Иконка макроса (lucide icon)', default: 'zap' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Цвет плашки / индикатора', default: '#f59e0b' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'ID ленты' })
  @IsOptional()
  @IsString()
  feedId?: string;

  @ApiPropertyOptional({ description: 'Основной путь к папке', example: 'JM_Daily' })
  @IsOptional()
  @IsString()
  folderPath?: string;

  @ApiPropertyOptional({ description: 'Список папок', type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  folderPaths?: string[];

  @ApiPropertyOptional({ description: 'Тип заметки', default: 'SINGLE' })
  @IsOptional()
  @IsString()
  noteType?: string;

  @ApiPropertyOptional({ description: 'Хэштеги по умолчанию', type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({ description: 'Порядок сортировки', default: 0 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ description: 'Является ли пресетом по умолчанию', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateQuickAddMacroDto {
  @ApiPropertyOptional({ description: 'Название пресета' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'Краткое описание' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Иконка' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Цвет' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'ID ленты' })
  @IsOptional()
  @IsString()
  feedId?: string;

  @ApiPropertyOptional({ description: 'Основной путь к папке' })
  @IsOptional()
  @IsString()
  folderPath?: string;

  @ApiPropertyOptional({ description: 'Список папок', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  folderPaths?: string[];

  @ApiPropertyOptional({ description: 'Тип заметки' })
  @IsOptional()
  @IsString()
  noteType?: string;

  @ApiPropertyOptional({ description: 'Хэштеги', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({ description: 'Порядок' })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ description: 'По умолчанию' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
