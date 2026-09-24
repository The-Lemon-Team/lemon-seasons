import { Controller, Post, Get, Param, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { IngestionService, IngestionResult } from './ingestion.service';
import { GeminiService, GeneratedNoteEnrichment } from './services/gemini.service';
import { TmdbService, MovieReleaseItem } from './services/tmdb.service';
import { HolidaysEngineService, HolidayItem } from './services/holidays-engine.service';
import { PoliticalEngineService, PoliticalEventItem } from './services/political-engine.service';
import { NoteType } from '@prisma/client';

export class GenerateNoteAiDto {
  title: string;
  category: string;
  dateStr: string;
  context?: string;
}

export class ImportNoteDto {
  feedSlug: string;
  title: string;
  description: string;
  type: NoteType;
  startDate: string;
  endDate?: string;
  icon?: string;
  sourceLink?: string;
  taxonomyPath: string;
  folders: string[];
  hashtags: string[];
  imageUrl?: string;
  imageCaption?: string;
  trailerUrl?: string;
}

@ApiTags('Data Ingestion & AI Generators')
@Controller('ingestion')
export class IngestionController {
  constructor(
    private readonly ingestionService: IngestionService,
    private readonly geminiService: GeminiService,
    private readonly tmdbService: TmdbService,
    private readonly holidaysEngine: HolidaysEngineService,
    private readonly politicalEngine: PoliticalEngineService,
  ) {}

  @Post('sync-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Синхронизировать все предустановленные тематические фиды',
    description: 'Наполняет базу данных всеми 4-мя темами: Русские праздники (включая военные даты), Христианские праздники, Политика 2026 и Радар Marvel Universe (TMDB).',
  })
  @ApiResponse({ status: 200, description: 'Все фиды успешно синхронизированы.' })
  async syncAll(): Promise<{ success: boolean; results: IngestionResult[] }> {
    const results = await this.ingestionService.syncAllFeeds();
    return {
      success: true,
      results,
    };
  }

  @Post('sync/:feedSlug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Синхронизировать конкретный тематический фид по слагу',
    description: 'Доступные слаги: `mcu-radar`, `russian-holidays`, `christian-holidays`, `politics-2026`.',
  })
  @ApiParam({ name: 'feedSlug', enum: ['mcu-radar', 'russian-holidays', 'christian-holidays', 'politics-2026'] })
  async syncFeed(@Param('feedSlug') feedSlug: string): Promise<{ success: boolean; result: IngestionResult }> {
    const result = await this.ingestionService.syncFeedBySlug(feedSlug);
    return {
      success: true,
      result,
    };
  }

  @Post('ai/generate-content')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Сгенерировать богатое Markdown-описание события через Gemini API',
    description: 'Использует Gemini 2.5 / 1.5 для составления структурированного очерка, подбора хештегов и цитат.',
  })
  async generateAiContent(@Body() dto: GenerateNoteAiDto): Promise<GeneratedNoteEnrichment> {
    return this.geminiService.generateNoteContent(dto.title, dto.category, dto.dateStr, dto.context);
  }

  @Get('tmdb/search')
  @ApiOperation({ summary: 'Поиск фильмов и сериалов через TMDB API или локальный каталог' })
  @ApiQuery({ name: 'query', required: false })
  async searchMovies(@Query('query') query = ''): Promise<MovieReleaseItem[]> {
    return this.tmdbService.searchMovies(query);
  }

  @Get('holidays/preview')
  @ApiOperation({ summary: 'Предпросмотр рассчитанных праздников (Православные, Католические, Исламские, Мировые религии, Русские военные и официальные)' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, enum: ['russian', 'russian-official', 'russian-military', 'christian', 'orthodox', 'catholic', 'islamic', 'world-religions', 'world'] })
  getHolidaysPreview(
    @Query('year') year = 2026,
    @Query('category') category: 'russian' | 'russian-official' | 'russian-military' | 'christian' | 'orthodox' | 'catholic' | 'islamic' | 'world-religions' | 'world' = 'russian',
  ): HolidayItem[] {
    const y = Number(year) || 2026;
    switch (category) {
      case 'orthodox':
        return this.holidaysEngine.getOrthodoxHolidays(y);
      case 'catholic':
        return this.holidaysEngine.getCatholicHolidays(y);
      case 'islamic':
        return this.holidaysEngine.getIslamicHolidays(y);
      case 'world-religions':
        return this.holidaysEngine.getWorldReligionsHolidays(y);
      case 'russian-official':
        return this.holidaysEngine.getRussianOfficialHolidays(y);
      case 'russian-military':
        return this.holidaysEngine.getRussianMilitaryHolidays(y);
      case 'world':
        return this.holidaysEngine.getWorldHolidays(y);
      case 'christian':
        return this.holidaysEngine.getChristianHolidays(y);
      case 'russian':
      default:
        return this.holidaysEngine.getRussianHolidays(y);
    }
  }

  @Get('politics/preview')
  @ApiOperation({ summary: 'Предпросмотр каталога политических событий 2026 года' })
  getPoliticsPreview(): PoliticalEventItem[] {
    return this.politicalEngine.getPoliticalEvents2026();
  }

  @Post('import-note')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Импортировать или сохранить сгенерированную заметку в базу календаря' })
  async importNote(@Body() dto: ImportNoteDto) {
    const feed = await this.ingestionService.ensureFeed(
      dto.feedSlug,
      dto.feedSlug === 'mcu-radar'
        ? 'Marvel Cinematic Universe'
        : dto.feedSlug === 'orthodox-holidays'
        ? 'Православные праздники'
        : dto.feedSlug === 'catholic-holidays'
        ? 'Католические праздники'
        : dto.feedSlug === 'islamic-holidays'
        ? 'Исламский религиозный календарь'
        : dto.feedSlug === 'world-religions'
        ? 'Мировые религии'
        : dto.feedSlug === 'russian-official'
        ? 'Русские праздники (Официальные)'
        : dto.feedSlug === 'russian-military'
        ? 'Дни воинской славы и военные праздники'
        : dto.feedSlug === 'world-holidays'
        ? 'Праздники стран мира'
        : dto.feedSlug === 'russian-holidays'
        ? 'Русские праздники'
        : dto.feedSlug === 'christian-holidays'
        ? 'Христианские праздники'
        : dto.feedSlug === 'politics-2026'
        ? 'Политика 2026'
        : dto.feedSlug,
      'Тематический канал календаря',
    );

    const result = await this.ingestionService.upsertCalendarNote({
      feedId: feed.id,
      title: dto.title,
      description: dto.description,
      type: dto.type || NoteType.EVENT,
      startDate: dto.startDate,
      endDate: dto.endDate,
      icon: dto.icon,
      sourceLink: dto.sourceLink,
      taxonomyPath: dto.taxonomyPath || 'general',
      folders: dto.folders || ['Events'],
      hashtags: dto.hashtags || [],
      imageUrl: dto.imageUrl,
      imageCaption: dto.imageCaption,
      trailerUrl: dto.trailerUrl,
    });

    return {
      success: true,
      isNew: result.isNew,
      feedSlug: dto.feedSlug,
      title: dto.title,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Получить статус провайдеров данных и сервисов генерации' })
  getStatus() {
    return {
      status: 'active',
      geminiActive: Boolean(process.env.GEMINI_API_KEY),
      tmdbActive: Boolean(process.env.TMDB_API_KEY),
      availableFeeds: [
        { slug: 'orthodox-holidays', name: 'Православные праздники', provider: 'Meeus/Computus Пасхалия 2026' },
        { slug: 'catholic-holidays', name: 'Католические праздники', provider: 'Meeus/Jones/Butcher Computus' },
        { slug: 'islamic-holidays', name: 'Исламский календарь & Рамадан', provider: 'Umm al-Qura Hijri Calendar 1447–1448' },
        { slug: 'world-religions', name: 'Мировые религии (Ислам, Иудаизм, Буддизм)', provider: 'Interfaith Liturgical Calendars' },
        { slug: 'russian-official', name: 'Русские праздники (Официальные)', provider: 'Трудовой кодекс РФ ст. 112' },
        { slug: 'russian-military', name: 'Дни воинской славы и военные праздники', provider: '32-ФЗ РФ и Указы Президента' },
        { slug: 'world-holidays', name: 'Праздники стран мира', provider: 'International & National observances' },
        { slug: 'mcu-radar', name: 'Marvel Cinematic Universe', provider: 'TMDB API & Phase 5/6 Dataset' },
        { slug: 'politics-2026', name: 'Политика 2026', provider: '2026 Global & Russian Agenda & Gemini' },
      ],
    };
  }
}
