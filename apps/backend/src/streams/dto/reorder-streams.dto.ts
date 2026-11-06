import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class ReorderStreamItemDto {
  @ApiProperty({ description: 'Stream ID or Slug', example: 'it_dev' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Display order priority index', example: 0 })
  @IsInt()
  order: number;
}

export class ReorderStreamsDto {
  @ApiProperty({ type: [ReorderStreamItemDto], description: 'List of stream IDs with their updated order indices' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderStreamItemDto)
  items: ReorderStreamItemDto[];
}
