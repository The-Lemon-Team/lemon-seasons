import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GeneratePodcastDto {
  @ApiPropertyOptional({ description: 'Host 1 name', default: 'Алексей' })
  @IsString()
  @IsOptional()
  host1Name?: string;

  @ApiPropertyOptional({ description: 'Host 2 name', default: 'Елена' })
  @IsString()
  @IsOptional()
  host2Name?: string;

  @ApiPropertyOptional({ description: 'Tone of dialogue (dynamic, analytical, fast)', default: 'dynamic' })
  @IsString()
  @IsOptional()
  tone?: string;
}
