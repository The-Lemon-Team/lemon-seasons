import { Controller, Post, Get, Patch, Delete, Param, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { IngestionService, IngestionResult } from './ingestion.service';
import { GeminiService, GeneratedNoteEnrichment } from './services/gemini.service';
import { GeminiImageService, ImageAspectRatio } from './services/gemini-image.service';
import { AiMediaLibraryService } from './services/ai-media-library.service';
import { TmdbService, MovieReleaseItem } from './services/tmdb.service';
import { HolidaysEngineService, HolidayItem } from './services/holidays-engine.service';
import { PoliticalEngineService, PoliticalEventItem } from './services/political-engine.service';
import { DriveWatcherService } from './services/drive-watcher.service';
import { WikiEngineService } from './services/wiki-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { NoteType } from '@prisma/client';

export class GenerateNoteAiDto {
  title: string;
  category: string;
  dateStr: string;
  context?: string;
}

export class GenerateImageAiDto {
  title?: string;
  prompt: string;
  style?: string;
  aspectRatio?: ImageAspectRatio;
  context?: string;
  count?: number;
  noteId?: string;
}

export class GenerateNoteCoverAiDto {
  style?: string;
  aspectRatio?: ImageAspectRatio;
  customPrompt?: string;
  setAsMain?: boolean;
}

export class AttachCoverDto {
  assetUrl: string;
  caption?: string;
  setAsMain?: boolean;
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
  taxonomyPath?: string;
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
    private readonly geminiImageService: GeminiImageService,
    private readonly aiMediaLibrary: AiMediaLibraryService,
    private readonly tmdbService: TmdbService,
    private readonly holidaysEngine: HolidaysEngineService,
    private readonly politicalEngine: PoliticalEngineService,
    private readonly driveWatcher: DriveWatcherService,
    private readonly wikiEngine: WikiEngineService,
    private readonly prisma: PrismaService,
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

  @Post('ai/generate-image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Сгенерировать изображение через Gemini Flash + Imagen 3',
    description: 'Синтезирует детальный промпт через Gemini Flash и генерирует визуальный ассет через Imagen 3 с сохранением в WebP.',
  })
  async generateAiImage(@Body() dto: GenerateImageAiDto) {
    return this.geminiImageService.generateImage({
      prompt: dto.prompt || dto.title || 'Abstract chronological calendar artwork',
      style: dto.style,
      aspectRatio: dto.aspectRatio,
      context: dto.context,
      count: 1,
      noteId: dto.noteId,
    });
  }

  @Post('ai/generate-batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Сгенерировать пакет вариантов (1..4) через Gemini Flash + Imagen 3',
    description: 'Генерирует несколько вариаций изображения, сохраняет все в AI Media Library и возвращает их для выбора лучшего.',
  })
  async generateAiBatch(@Body() dto: GenerateImageAiDto) {
    return this.geminiImageService.generateBatch({
      prompt: dto.prompt || dto.title || 'Abstract chronological calendar artwork',
      style: dto.style,
      aspectRatio: dto.aspectRatio,
      context: dto.context,
      count: dto.count || 2,
      noteId: dto.noteId,
    });
  }

  @Get('ai/assets')
  @ApiOperation({ summary: 'Получить сохраненные ассеты из AI Media Library' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'style', required: false })
  @ApiQuery({ name: 'isFavorite', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getAiAssets(
    @Query('search') search?: string,
    @Query('style') style?: string,
    @Query('isFavorite') isFavorite?: string,
    @Query('limit') limit = '40',
    @Query('offset') offset = '0',
  ) {
    return this.aiMediaLibrary.getAssets({
      search,
      style,
      isFavorite: isFavorite === undefined ? undefined : isFavorite === 'true',
      limit: Number(limit) || 40,
      offset: Number(offset) || 0,
    });
  }

  @Patch('ai/assets/:id/favorite')
  @ApiOperation({ summary: 'Переключить статус "Избранное" у ассета' })
  async toggleAssetFavorite(@Param('id') id: string) {
    return this.aiMediaLibrary.toggleFavorite(id);
  }

  @Delete('ai/assets/:id')
  @ApiOperation({ summary: 'Удалить ассет из медиатеки и диска' })
  async deleteAiAsset(@Param('id') id: string) {
    const success = await this.aiMediaLibrary.deleteAsset(id);
    return { success };
  }

  @Post('ai/notes/:noteId/attach-cover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Прикрепить выбранный URL/ассет как обложку к заметке' })
  async attachCoverToNote(
    @Param('noteId') noteId: string,
    @Body() dto: AttachCoverDto,
  ) {
    const image = await this.geminiImageService.attachAssetToNote(
      noteId,
      dto.assetUrl,
      dto.caption,
      dto.setAsMain ?? true,
    );
    return { success: true, image };
  }

  @Post('ai/notes/:noteId/generate-cover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Сгенерировать обложку для существующей заметки по её метаданным',
    description: 'Анализирует заголовок, папки, теги и описание заметки, генерирует обложку в Imagen 3 и прикрепляет к ней.',
  })
  async generateNoteCover(
    @Param('noteId') noteId: string,
    @Body() dto: GenerateNoteCoverAiDto,
  ) {
    return this.geminiImageService.generateCoverForNote(noteId, dto);
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
      taxonomyPath: dto.taxonomyPath,
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

  @Get('wiki/preview')
  @ApiOperation({ summary: 'Предпросмотр исторических событий дня из Wikipedia' })
  @ApiQuery({ name: 'date', required: false, description: 'ISO date string (YYYY-MM-DD)' })
  async getWikiPreview(@Query('date') dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    return this.wikiEngine.getEventsForDate(targetDate);
  }

  @Post('wiki/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Синхронизировать события дня из Wikipedia в календарь' })
  @ApiQuery({ name: 'date', required: false, description: 'ISO date string (YYYY-MM-DD)' })
  async syncWiki(@Query('date') dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const result = await this.ingestionService.syncWikiEvents(targetDate);
    return {
      success: true,
      result,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Получить статус провайдеров данных и сервисов генерации' })
  getStatus() {
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);
    return {
      status: 'active',
      geminiActive: hasGemini,
      imagenActive: hasGemini,
      tmdbActive: Boolean(process.env.TMDB_API_KEY),
      availableFeeds: [
        { slug: 'russian-holidays', name: 'Российские праздники', provider: 'ТК РФ ст. 112 и 32-ФЗ Дни воинской славы' },
        { slug: 'orthodox-holidays', name: 'Православные праздники', provider: 'Meeus/Computus Пасхалия 2026' },
        { slug: 'wiki', name: 'Этот день в истории (Wiki)', provider: 'Wikimedia REST API (On This Day)' },
        { slug: 'mcu-radar', name: 'Marvel Cinematic Universe', provider: 'TMDB API & Phase 5/6 Dataset' },
        { slug: 'politics-2026', name: 'Политика 2026', provider: '2026 Global & Russian Agenda & Gemini' },
      ],
    };
  }

  @Get('watcher/status')
  @ApiOperation({ summary: 'Получить статус фонового слушателя файлов Gemini Sparks' })
  async getWatcherStatus() {
    return this.driveWatcher.getStatus();
  }

  @Get('watcher/files')
  @ApiOperation({ summary: 'Получить список обработанных файлов и их этапы (PENDING/PROCESSING/COMPLETED/FAILED)' })
  async getIngestedFiles(@Query('status') status?: string, @Query('limit') limit = 50) {
    return this.prisma.ingestionFile.findMany({
      where: status ? { status } : undefined,
      orderBy: { updatedAt: 'desc' },
      take: Number(limit),
      include: {
        note: {
          select: {
            id: true,
            title: true,
            type: true,
            startDate: true,
            processingStatus: true,
          },
        },
      },
    });
  }

  @Post('watcher/scan')
  @ApiOperation({ summary: 'Принудительно просканировать входящую директорию Sparks' })
  async scanIncomingDirectory() {
    return this.driveWatcher.scanDirectory();
  }

  @Post('watcher/test-spark')
  @ApiOperation({ summary: 'Сгенерировать тестовый файл Gemini Spark для проверки конвейера' })
  async createTestSpark(
    @Body()
    body?: {
      title?: string;
      summary?: string;
      content?: string;
      tags?: string[];
    },
  ) {
    return this.driveWatcher.createTestSparkFile(body);
  }
}

