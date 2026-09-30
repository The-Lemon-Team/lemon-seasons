import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateChatThreadDto } from './create-chat-thread.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateChatThreadDto extends PartialType(CreateChatThreadDto) {
  @ApiPropertyOptional({ description: 'Archive status' })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
