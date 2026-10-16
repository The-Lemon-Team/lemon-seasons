import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDefined, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CommandType,
  EnqueueCommandInput,
  EnqueueCommandResponse,
  BusCommand,
  CommandStatus,
} from '@lenta/shared';
import { CommandBusService } from './command-bus.service';

export class EnqueueCommandDto implements EnqueueCommandInput {
  @ApiProperty({ description: 'Тип команды', example: 'CREATE_NOTE' })
  @IsString()
  @IsNotEmpty()
  type: CommandType;

  @ApiProperty({ description: 'Данные команды' })
  @IsDefined()
  payload: any;

  @ApiPropertyOptional({ description: 'Приоритет команды', enum: ['LOW', 'NORMAL', 'HIGH'] })
  @IsString()
  @IsOptional()
  priority?: 'LOW' | 'NORMAL' | 'HIGH';

  @ApiPropertyOptional({ description: 'Идентификатор клиента (mobile, desktop, mcp, etc.)' })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Целевая дата (ISO)' })
  @IsString()
  @IsOptional()
  targetDate?: string;

  @ApiPropertyOptional({ description: 'Выполнить немедленно и синхронно' })
  @IsBoolean()
  @IsOptional()
  executeSync?: boolean;
}

export class BatchCommandsDto {
  @ApiProperty({ description: 'Список команд', type: [EnqueueCommandDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnqueueCommandDto)
  commands: EnqueueCommandDto[];
}

@ApiTags('Command Bus & Remote Queue')
@Controller(['bus', 'api/bus'])
export class CommandBusController {
  constructor(private readonly commandBus: CommandBusService) {}

  @Post('enqueue')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Поставить команду в очередь приложения (Command Bus)',
    description: 'Асинхронная постановка команды (CREATE_NOTE, UPDATE_CONTAINER, ADD_BOOKMARK, ADD_LINK, INGEST_AUDIO, ADD_NOTEBOOKLM).',
  })
  @ApiResponse({ status: 202, description: 'Команда принята в очередь' })
  async enqueue(@Body() dto: EnqueueCommandDto): Promise<EnqueueCommandResponse> {
    return this.commandBus.enqueue(dto);
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Выполнить команду синхронно через шину',
    description: 'Немедленно выполняет обработчик команды и возвращает итоговый результат создания/обновления.',
  })
  async executeSync(@Body() dto: EnqueueCommandDto): Promise<EnqueueCommandResponse> {
    return this.commandBus.enqueue({
      ...dto,
      executeSync: true,
    });
  }

  @Post('batch')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Поставить пакет команд в очередь' })
  async batchEnqueue(@Body() dto: BatchCommandsDto): Promise<EnqueueCommandResponse[]> {
    const results: EnqueueCommandResponse[] = [];
    for (const cmd of dto.commands || []) {
      const res = await this.commandBus.enqueue(cmd);
      results.push(res);
    }
    return results;
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Получить список задач в шине с фильтрацией' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTasks(
    @Query('status') status?: CommandStatus,
    @Query('type') type?: CommandType,
    @Query('limit') limit = 50,
  ) {
    return this.commandBus.listTasks({
      status,
      type,
      limit: Number(limit),
    });
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Получить статус и результат конкретной задачи' })
  @ApiParam({ name: 'id', description: 'ID команды в очереди' })
  getTaskById(@Param('id') id: string): BusCommand {
    return this.commandBus.getTask(id);
  }

  @Post('tasks/:id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Перезапустить сбойную команду' })
  async retryTask(@Param('id') id: string): Promise<EnqueueCommandResponse> {
    return this.commandBus.retry(id);
  }

  @Post('drain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Принудительно запустить обработку всех ожидающих задач в очереди' })
  async drainQueue() {
    return this.commandBus.drainQueue();
  }

  @Get('mcp/tools')
  @ApiOperation({
    summary: 'Экспорт JSON Schema инструментов MCP (Model Context Protocol)',
    description: 'Возвращает готовые декларации MCP Tools для подключения внешних LLM-агентов к шине.',
  })
  getMcpTools() {
    return {
      protocol: 'model-context-protocol/v1',
      tools: [
        {
          name: 'create_calendar_note',
          description: 'Создать событие или заметку в календаре / ленте Lenta',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Заголовок события' },
              description: { type: 'string', description: 'Markdown-описание' },
              startDate: { type: 'string', description: 'ISO дата начала (YYYY-MM-DD)' },
              type: { type: 'string', enum: ['EVENT', 'TREND', 'PERIOD', 'NOTE'], default: 'EVENT' },
              feedSlug: { type: 'string', description: 'Слаг фида (например, russian-holidays, tech-strategy)' },
              containerId: { type: 'string', description: 'ID целевого контейнера' },
              hashtags: { type: 'array', items: { type: 'string' } },
            },
            required: ['title'],
          },
        },
        {
          name: 'update_container',
          description: 'Запустить актуализацию и синхронизацию источника контейнера',
          inputSchema: {
            type: 'object',
            properties: {
              containerId: { type: 'string', description: 'ID контейнера (например, wiki-daily-history)' },
              sourceType: { type: 'string', enum: ['daily', 'common', 'wiki'] },
              targetDate: { type: 'string', description: 'Дата для выборки' },
            },
            required: ['containerId'],
          },
        },
        {
          name: 'add_bookmark',
          description: 'Сохранить закладку или ссылку из браузера/телефона с авто-извлечением OpenGraph',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL ссылка' },
              title: { type: 'string', description: 'Опциональный заголовок' },
              description: { type: 'string', description: 'Заметка или комментарий' },
              containerId: { type: 'string', description: 'ID контейнера' },
            },
            required: ['url'],
          },
        },
        {
          name: 'add_link',
          description: 'Связать внешнюю веб-ссылку с существующей заметкой',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              noteId: { type: 'string' },
              title: { type: 'string' },
            },
            required: ['url', 'noteId'],
          },
        },
        {
          name: 'ingest_audio',
          description: 'Загрузить аудиозапись или голосовую заметку в календарь',
          inputSchema: {
            type: 'object',
            properties: {
              audioUrl: { type: 'string', description: 'URL аудиофайла' },
              title: { type: 'string' },
              autoTranscribe: { type: 'boolean', default: true },
            },
            required: ['audioUrl'],
          },
        },
        {
          name: 'add_notebooklm',
          description: 'Добавить аудио-подкаст или глубокий обзор NotebookLM в специализированный контейнер',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Тема подкаста' },
              audioPodcastUrl: { type: 'string', description: 'Ссылка на mp3 аудио-диалог' },
              summary: { type: 'string', description: 'Ключевые тезисы' },
              transcriptMarkdown: { type: 'string', description: 'Полный текст транскрипта' },
            },
            required: ['title'],
          },
        },
      ],
    };
  }
}
