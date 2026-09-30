import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendThreadMessageDto {
  @ApiProperty({ description: 'Text of user message or command' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ description: 'Specific agent to route to, overrides default routing' })
  @IsString()
  @IsOptional()
  forcedTarget?: string;

  @ApiPropertyOptional({ description: 'Date override for news context (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  date?: string;
}
