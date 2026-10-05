import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateChatThreadDto } from './create-chat-thread.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateChatThreadDto extends PartialType(CreateChatThreadDto) {
  @ApiPropertyOptional({ description: 'Archive status of thread' })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
