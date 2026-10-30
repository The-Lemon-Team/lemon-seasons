import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsNotEmpty } from 'class-validator';

export class CreateTrackDto {
  @ApiProperty({ description: 'Название тематического трека', example: 'Выборы и геополитика' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Цвет акцента трека', example: '#f59e0b' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Иконка трека' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'ID связанной Period Note', example: 'uuid' })
  @IsString()
  @IsOptional()
  periodNoteId?: string;

  @ApiPropertyOptional({ description: 'Порядок сортировки' })
  @IsInt()
  @IsOptional()
  order?: number;
}

export class UpdateTrackDto {
  @ApiPropertyOptional({ description: 'Название тематического трека' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Цвет акцента трека' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Иконка трека' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'ID связанной Period Note' })
  @IsString()
  @IsOptional()
  periodNoteId?: string;

  @ApiPropertyOptional({ description: 'Порядок сортировки' })
  @IsInt()
  @IsOptional()
  order?: number;
}
