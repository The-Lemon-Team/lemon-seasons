import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
} from 'class-validator';
import { NoteType } from './create-note.dto';

export class IngestNoteDto {
  @ApiPropertyOptional({
    description: 'Заголовок заметки (если не указан, извлекается автоматически из первой строки контента)',
    example: 'Инсайт из диалога с Defi AI',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Текст заметки или Markdown-содержимое',
    example: '### Обсуждение пулов ликвидности\nАнализ TVL и стратегии концентрированной ликвидности...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Тип источника (DEFI_CHAT, WEB_CLIP, API, GOOGLE_DRIVE, MANUAL)',
    example: 'DEFI_CHAT',
    default: 'API',
  })
  @IsString()
  @IsOptional()
  sourceType?: string;

  @ApiPropertyOptional({
    description: 'Ссылка на исходный тред, статью или страницу',
    example: 'http://localhost:3000/chats/42',
  })
  @IsString()
  @IsOptional()
  sourceUrl?: string;

  @ApiPropertyOptional({
    description: 'Алиас для sourceUrl',
    example: 'http://localhost:3000/chats/42',
  })
  @IsString()
  @IsOptional()
  sourceLink?: string;

  @ApiPropertyOptional({
    description: 'Внешний идентификатор во внешней системе для идемпотентного сохранения (UPSERT)',
    example: 'defi-thread-msg-9921',
  })
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiPropertyOptional({
    description: 'Дата и время события (ISO 8601)',
    example: '2026-10-08T10:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({
    description: 'Алиас для date (ISO 8601)',
    example: '2026-10-08T10:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Дата окончания диапазона (ISO 8601)',
    example: '2026-10-08T18:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    enum: NoteType,
    description: 'Тип заметки (SINGLE, PERIOD, EVENT, FILM_RELEASE, MENTION, DONE)',
    default: NoteType.SINGLE,
  })
  @IsEnum(NoteType)
  @IsOptional()
  type?: NoteType;

  @ApiPropertyOptional({
    description: 'Краткое саммари (TL;DR) для таймлайна',
    example: 'Сводка по рискам и доходности кросс-чейн арбитража.',
  })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional({
    description: 'Визуальная иконка или эмодзи',
    example: '💎',
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({
    description: 'Слаг целевого фида (например, defi-insights, news, general)',
    example: 'defi-insights',
  })
  @IsString()
  @IsOptional()
  feedSlug?: string;

  @ApiPropertyOptional({
    description: 'ID целевого фида в БД',
  })
  @IsString()
  @IsOptional()
  feedId?: string;

  @ApiPropertyOptional({
    description: 'Путь к папке в Obsidian Vault',
    example: 'Defi/Insights',
  })
  @IsString()
  @IsOptional()
  folder?: string;

  @ApiPropertyOptional({
    description: 'Список тегов или хэштегов',
    example: ['defi', 'crypto', 'arbitrage'],
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Алиас для tags',
    example: ['defi', 'crypto'],
  })
  @IsArray()
  @IsOptional()
  hashtags?: string[];

  @ApiPropertyOptional({
    description: 'Произвольные метаданные (автор, модель, ID треда и др.)',
    example: { author: 'AI Assistant', model: 'claude-3-7-sonnet' },
  })
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({
    description: 'API-ключ для авторизации (также может быть передан в заголовках x-api-key или Authorization)',
  })
  @IsString()
  @IsOptional()
  apiKey?: string;
}
