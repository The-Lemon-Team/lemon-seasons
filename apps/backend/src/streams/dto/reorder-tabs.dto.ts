import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class ReorderTabItemDto {
  @ApiProperty({ description: 'StreamTab ID or Feed ID / slug', example: 'tab-123' })
  @IsString()
  @IsNotEmpty()
  tabId: string;

  @ApiProperty({ description: 'New display order position index', example: 0 })
  @IsInt()
  order: number;
}

export class ReorderTabsDto {
  @ApiProperty({ type: [ReorderTabItemDto], description: 'List of stream tabs with their updated order indices' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderTabItemDto)
  items: ReorderTabItemDto[];
}
