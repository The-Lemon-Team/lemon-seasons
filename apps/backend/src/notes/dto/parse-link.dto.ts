import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ParseLinkDto {
  @ApiProperty({
    description: 'URL ссылки для извлечения метаданных (YouTube или веб-страница)',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  @IsString()
  @IsNotEmpty()
  url: string;
}
