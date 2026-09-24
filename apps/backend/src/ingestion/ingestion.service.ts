import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './services/gemini.service';
import { TmdbService } from './services/tmdb.service';
import { HolidaysEngineService } from './services/holidays-engine.service';
import { PoliticalEngineService } from './services/political-engine.service';
import { NoteType } from '@prisma/client';

export interface IngestionResult {
  feedSlug: string;
  feedTitle: string;
  notesCount: number;
  created: number;
  updated: number;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly tmdbService: TmdbService,
    private readonly holidaysEngine: HolidaysEngineService,
    private readonly politicalEngine: PoliticalEngineService,
  ) {}

  /**
   * Syncs all preset channels/feeds and containers into the database.
   */
  async syncAllFeeds(): Promise<IngestionResult[]> {
    const results: IngestionResult[] = [];
    results.push(await this.syncMcuRadar());
    results.push(await this.syncRussianOfficialHolidays());
    results.push(await this.syncRussianMilitaryHolidays());
    results.push(await this.syncOrthodoxHolidays());
    results.push(await this.syncCatholicHolidays());
    results.push(await this.syncIslamicHolidays());
    results.push(await this.syncWorldReligionsHolidays());
    results.push(await this.syncWorldHolidays());
    results.push(await this.syncRussianHolidays());
    results.push(await this.syncChristianHolidays());
    results.push(await this.syncPolitics2026());
    return results;
  }

  /**
   * Sync a specific feed by slug.
   */
  async syncFeedBySlug(slug: string): Promise<IngestionResult> {
    switch (slug) {
      case 'mcu-radar':
        return this.syncMcuRadar();
      case 'orthodox-holidays':
        return this.syncOrthodoxHolidays();
      case 'catholic-holidays':
        return this.syncCatholicHolidays();
      case 'islamic-holidays':
        return this.syncIslamicHolidays();
      case 'world-religions':
        return this.syncWorldReligionsHolidays();
      case 'russian-official':
        return this.syncRussianOfficialHolidays();
      case 'russian-military':
        return this.syncRussianMilitaryHolidays();
      case 'world-holidays':
        return this.syncWorldHolidays();
      case 'russian-holidays':
        return this.syncRussianHolidays();
      case 'christian-holidays':
        return this.syncChristianHolidays();
      case 'politics-2026':
        return this.syncPolitics2026();
      default:
        throw new Error(`Unknown feed slug: ${slug}`);
    }
  }

  /**
   * Helper: Ensure Feed exists
   */
  public async ensureFeed(slug: string, title: string, description: string) {
    return this.prisma.feed.upsert({
      where: { slug },
      update: { title, description },
      create: { slug, title, description },
    });
  }

  /**
   * Helper: Ensure Container exists
   */
  public async ensureContainer(id: string, name: string, description: string, visibility = 'public') {
    return this.prisma.container.upsert({
      where: { id },
      update: { name, description, visibility },
      create: { id, name, description, visibility },
    });
  }

  /**
   * Helper: Ensure Taxonomy Node exists
   */
  public async ensureTaxonomyNode(path: string, name?: string, icon?: string) {
    const cleanPath = path.toLowerCase().trim();
    const existing = await this.prisma.taxonomyNode.findUnique({
      where: { path: cleanPath },
    });
    if (existing) return existing;

    const parts = cleanPath.split('.');
    const autoName = name || parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1);

    return this.prisma.taxonomyNode.create({
      data: {
        path: cleanPath,
        name: autoName,
        icon: icon || 'tag',
      },
    });
  }

  /**
   * Helper: Ensure Folder exists
   */
  public async ensureFolder(path: string, icon?: string, containerId?: string) {
    const existing = await this.prisma.folder.findFirst({
      where: { path, containerId: containerId || null, deletedAt: null },
    });
    if (existing) return existing;

    const parts = path.split('/');
    const name = parts[parts.length - 1];

    return this.prisma.folder.create({
      data: {
        path,
        name,
        icon: icon || 'folder',
        containerId: containerId || null,
        privacy: containerId ? 'obsidian' : 'public',
      },
    });
  }

  /**
   * Helper: Upsert Note with all its relations
   */
  public async upsertCalendarNote(params: {
    feedId: string;
    containerId?: string;
    title: string;
    description: string;
    type: NoteType;
    startDate: string | Date;
    endDate?: string | Date;
    icon?: string;
    sourceLink?: string;
    taxonomyPath: string;
    folders: string[];
    hashtags: string[];
    imageUrl?: string;
    imageCaption?: string;
    trailerUrl?: string;
  }): Promise<{ isNew: boolean }> {
    const {
      feedId,
      containerId,
      title,
      description,
      type,
      startDate,
      endDate,
      icon,
      sourceLink,
      taxonomyPath,
      folders,
      hashtags,
      imageUrl,
      imageCaption,
      trailerUrl,
    } = params;

    // 1. Ensure taxonomy tag
    const tagNode = await this.ensureTaxonomyNode(taxonomyPath);

    // 2. Find or create Note
    const existingNote = await this.prisma.note.findFirst({
      where: {
        feedId,
        title,
        deletedAt: null,
      },
      include: {
        images: true,
        links: true,
        folders: true,
      },
    });

    const sDate = new Date(startDate);
    const eDate = endDate ? new Date(endDate) : null;

    let noteId: string;
    let isNew = false;

    if (existingNote) {
      noteId = existingNote.id;
      await this.prisma.note.update({
        where: { id: noteId },
        data: {
          containerId: containerId !== undefined ? containerId : existingNote.containerId,
          description,
          type,
          startDate: sDate,
          endDate: eDate,
          icon,
          sourceLink: sourceLink || existingNote.sourceLink,
          tags: {
            set: [{ id: tagNode.id }],
          },
        },
      });
    } else {
      isNew = true;
      const createdNote = await this.prisma.note.create({
        data: {
          feedId,
          containerId: containerId || null,
          title,
          description,
          type,
          startDate: sDate,
          endDate: eDate,
          icon,
          sourceLink,
          tags: {
            connect: [{ id: tagNode.id }],
          },
        },
      });
      noteId = createdNote.id;
    }

    // 3. Connect Folders
    if (folders && folders.length > 0) {
      for (let i = 0; i < folders.length; i++) {
        const folderPath = folders[i];
        const folder = await this.ensureFolder(folderPath, undefined, containerId);
        await this.prisma.noteFolder.upsert({
          where: {
            noteId_folderId: {
              noteId,
              folderId: folder.id,
            },
          },
          update: {
            isPrimary: i === 0,
            order: i,
          },
          create: {
            noteId,
            folderId: folder.id,
            isPrimary: i === 0,
            order: i,
          },
        });
      }
    }

    // 4. Connect Hashtags
    if (hashtags && hashtags.length > 0) {
      for (const htName of hashtags) {
        const cleanName = htName.replace(/^#/, '').toLowerCase().trim();
        if (!cleanName) continue;
        const tag = await this.prisma.hashtag.upsert({
          where: { name: cleanName },
          update: {},
          create: { name: cleanName },
        });
        await this.prisma.note.update({
          where: { id: noteId },
          data: {
            hashtags: {
              connect: [{ id: tag.id }],
            },
          },
        });
      }
    }

    // 5. Connect NoteImage
    if (imageUrl) {
      const existingImg = await this.prisma.noteImage.findFirst({
        where: { noteId, url: imageUrl },
      });
      if (!existingImg) {
        await this.prisma.noteImage.create({
          data: {
            noteId,
            url: imageUrl,
            filename: `${title.slice(0, 30)}.jpg`,
            mimeType: 'image/jpeg',
            sizeBytes: 102400,
            caption: imageCaption || title,
            isMain: true,
            order: 0,
          },
        });
      }
    }

    // 6. Connect NoteLinks (source & trailer)
    if (sourceLink) {
      const existingLink = await this.prisma.noteLink.findFirst({
        where: { noteId, url: sourceLink },
      });
      if (!existingLink) {
        await this.prisma.noteLink.create({
          data: {
            noteId,
            url: sourceLink,
            title: 'Официальный источник',
            isSource: true,
            order: 0,
          },
        });
      }
    }

    if (trailerUrl) {
      const existingTrailer = await this.prisma.noteLink.findFirst({
        where: { noteId, url: trailerUrl },
      });
      if (!existingTrailer) {
        await this.prisma.noteLink.create({
          data: {
            noteId,
            url: trailerUrl,
            title: 'Официальный трейлер (YouTube)',
            isSource: false,
            order: 1,
          },
        });
      }
    }

    return { isNew };
  }

  /**
   * 1. Sync Marvel Cinematic Universe Radar
   */
  async syncMcuRadar(): Promise<IngestionResult> {
    this.logger.log('🎬 Syncing Marvel Cinematic Universe Radar...');
    const feed = await this.ensureFeed(
      'mcu-radar',
      'Marvel Cinematic Universe',
      'Радар релизов, хронология Фаз 5 и 6 и таймлайн Саги Мультивселенной.',
    );

    const releases = await this.tmdbService.getMcuReleases();
    let created = 0;
    let updated = 0;

    for (const item of releases) {
      const res = await this.upsertCalendarNote({
        feedId: feed.id,
        title: item.title,
        description: item.description,
        type: item.type,
        startDate: item.releaseDate,
        endDate: item.endDate,
        icon: 'movie',
        sourceLink: item.sourceLink,
        taxonomyPath: item.taxonomyPath,
        folders: item.folders,
        hashtags: item.hashtags,
        imageUrl: item.posterUrl,
        imageCaption: `Постер фильма: ${item.title}`,
        trailerUrl: item.trailerUrl,
      });
      if (res.isNew) created++;
      else updated++;
    }

    return {
      feedSlug: feed.slug,
      feedTitle: feed.title,
      notesCount: releases.length,
      created,
      updated,
    };
  }

  /**
   * 2. Sync Russian Official Holidays
   */
  async syncRussianOfficialHolidays(): Promise<IngestionResult> {
    this.logger.log('🇷🇺 Syncing Russian Official Holidays 2026...');
    const container = await this.ensureContainer(
      'cont-russian-official',
      '🇷🇺 Праздники России (Официальные)',
      'Государственные праздники РФ по ТК РФ, общенародные и культурные даты.',
    );
    const feed = await this.ensureFeed(
      'russian-official',
      'Русские праздники (Официальные)',
      'Официальные нерабочие праздничные дни по ст. 112 ТК РФ, государственные торжества и культурные памятные даты России 2026.',
    );

    const holidays = this.holidaysEngine.getRussianOfficialHolidays(2026);
    let created = 0;
    let updated = 0;

    for (const item of holidays) {
      const res = await this.upsertCalendarNote({
        feedId: feed.id,
        containerId: container.id,
        title: item.title,
        description: item.description,
        type: item.type,
        startDate: item.startDate,
        endDate: item.endDate,
        icon: item.icon,
        sourceLink: item.sourceLink,
        taxonomyPath: item.taxonomyPath,
        folders: item.folders,
        hashtags: item.hashtags,
        imageUrl: item.imageUrl,
        imageCaption: item.imageCaption,
      });
      if (res.isNew) created++;
      else updated++;
    }

    return {
      feedSlug: feed.slug,
      feedTitle: feed.title,
      notesCount: holidays.length,
      created,
      updated,
    };
  }

  /**
   * 3. Sync Russian Military Holidays
   */
  async syncRussianMilitaryHolidays(): Promise<IngestionResult> {
    this.logger.log('🎖️ Syncing Russian Military Holidays & Days of Glory 2026...');
    const container = await this.ensureContainer(
      'cont-russian-military',
      '🎖️ Дни воинской славы и военные праздники России',
      'Дни воинской славы и памятные даты России по 32-ФЗ, профессиональные праздники видов и родов войск ВС РФ.',
    );
    const feed = await this.ensureFeed(
      'russian-military',
      'Дни воинской славы и военные праздники',
      'Дни воинской славы и памятные даты России по 32-ФЗ, праздники видов и родов войск Вооруженных Сил РФ.',
    );

    const holidays = this.holidaysEngine.getRussianMilitaryHolidays(2026);
    let created = 0;
    let updated = 0;

    for (const item of holidays) {
      const res = await this.upsertCalendarNote({
        feedId: feed.id,
        containerId: container.id,
        title: item.title,
        description: item.description,
        type: item.type,
        startDate: item.startDate,
        endDate: item.endDate,
        icon: item.icon,
        sourceLink: item.sourceLink,
        taxonomyPath: item.taxonomyPath,
        folders: item.folders,
        hashtags: item.hashtags,
        imageUrl: item.imageUrl,
        imageCaption: item.imageCaption,
      });
      if (res.isNew) created++;
      else updated++;
    }

    return {
      feedSlug: feed.slug,
      feedTitle: feed.title,
      notesCount: holidays.length,
      created,
      updated,
    };
  }

  /**
   * 4. Sync Orthodox Holidays
   */
  async syncOrthodoxHolidays(): Promise<IngestionResult> {
    this.logger.log('☦️ Syncing Orthodox Church Holidays 2026...');
    const container = await this.ensureContainer(
      'cont-orthodox-calendar',
      '☦️ Православный календарь',
      'Двунадесятые праздники, Пасхальный цикл, многодневные посты и памятные дни святых Православной Церкви.',
    );
    const feed = await this.ensureFeed(
      'orthodox-holidays',
      'Православные праздники',
      'Двунадесятые и великие православные праздники, Пасха Христова и ключевые дни литургического года 2026.',
    );

    const feasts = this.holidaysEngine.getOrthodoxHolidays(2026);
    let created = 0;
    let updated = 0;

    for (const item of feasts) {
      const res = await this.upsertCalendarNote({
        feedId: feed.id,
        containerId: container.id,
        title: item.title,
        description: item.description,
        type: item.type,
        startDate: item.startDate,
        endDate: item.endDate,
        icon: item.icon,
        sourceLink: item.sourceLink,
        taxonomyPath: item.taxonomyPath,
        folders: item.folders,
        hashtags: item.hashtags,
        imageUrl: item.imageUrl,
        imageCaption: item.imageCaption,
      });
      if (res.isNew) created++;
      else updated++;
    }

    return {
      feedSlug: feed.slug,
      feedTitle: feed.title,
      notesCount: feasts.length,
      created,
      updated,
    };
  }

  /**
   * 5. Sync Catholic Holidays
   */
  async syncCatholicHolidays(): Promise<IngestionResult> {
    this.logger.log('✝️ Syncing Catholic Liturgical Holidays 2026...');
    const container = await this.ensureContainer(
      'cont-catholic-calendar',
      '✝️ Католический календарь',
      'Литургический год Католической церкви: григорианская Пасха, Рождество, Адвент, Великий пост и дни святых.',
    );
    const feed = await this.ensureFeed(
      'catholic-holidays',
      'Католические праздники',
      'Торжества и праздники Римско-католической церкви, григорианский пасхальный цикл и дни святых 2026.',
    );

    const feasts = this.holidaysEngine.getCatholicHolidays(2026);
    let created = 0;
    let updated = 0;

    for (const item of feasts) {
      const res = await this.upsertCalendarNote({
        feedId: feed.id,
        containerId: container.id,
        title: item.title,
        description: item.description,
        type: item.type,
        startDate: item.startDate,
        endDate: item.endDate,
        icon: item.icon,
        sourceLink: item.sourceLink,
        taxonomyPath: item.taxonomyPath,
        folders: item.folders,
        hashtags: item.hashtags,
        imageUrl: item.imageUrl,
        imageCaption: item.imageCaption,
      });
      if (res.isNew) created++;
      else updated++;
    }

    return {
      feedSlug: feed.slug,
      feedTitle: feed.title,
      notesCount: feasts.length,
      created,
      updated,
    };
  }

  /**
   * 6. Sync Islamic Religious Calendar
   */
  async syncIslamicHolidays(): Promise<IngestionResult> {
    this.logger.log('☪️ Syncing Islamic Religious Calendar 2026...');
    const container = await this.ensureContainer(
      'cont-islamic-calendar',
      '☪️ Исламский религиозный календарь',
      'Календарь Хиджры 1447–1448: Священный месяц Рамадан, Ураза-байрам, Курбан-байрам и памятные даты Ислама.',
    );
    const feed = await this.ensureFeed(
      'islamic-holidays',
      'Исламский религиозный календарь & Рамадан',
      'Календарь Хиджры: пост в месяц Рамадан, Ураза-байрам, Курбан-байрам, Ночь Предопределения и памятные даты Ислама.',
    );

    const feasts = this.holidaysEngine.getIslamicHolidays(2026);
    let created = 0;
    let updated = 0;

    for (const item of feasts) {
      const res = await this.upsertCalendarNote({
        feedId: feed.id,
        containerId: container.id,
        title: item.title,
        description: item.description,
        type: item.type,
        startDate: item.startDate,
        endDate: item.endDate,
        icon: item.icon,
        sourceLink: item.sourceLink,
        taxonomyPath: item.taxonomyPath,
        folders: item.folders,
        hashtags: item.hashtags,
        imageUrl: item.imageUrl,
        imageCaption: item.imageCaption,
      });
      if (res.isNew) created++;
      else updated++;
    }

    return {
      feedSlug: feed.slug,
      feedTitle: feed.title,
      notesCount: feasts.length,
      created,
      updated,
    };
  }

  /**
   * 7. Sync World Religions Calendar
   */
  async syncWorldReligionsHolidays(): Promise<IngestionResult> {
    this.logger.log('🕊️ Syncing World Religions Calendar 2026...');
    const container = await this.ensureContainer(
      'cont-world-religions',
      '🕊️ Мировые религии и духовные традиции',
      'Сводный календарь священных дат, праздников и постов мировых религий: Ислам, Иудаизм, Буддизм.',
    );
    const feed = await this.ensureFeed(
      'world-religions',
      'Мировые религии: Ислам, Иудаизм, Буддизм',
      'Священные даты и праздники мировых духовных традиций: Ислам, Иудаизм (Песах, Ханука), Буддизм (Весак, Сагаалган).',
    );

    const feasts = this.holidaysEngine.getWorldReligionsHolidays(2026);
    let created = 0;
    let updated = 0;

    for (const item of feasts) {
      const res = await this.upsertCalendarNote({
        feedId: feed.id,
        containerId: container.id,
        title: item.title,
        description: item.description,
        type: item.type,
        startDate: item.startDate,
        endDate: item.endDate,
        icon: item.icon,
        sourceLink: item.sourceLink,
        taxonomyPath: item.taxonomyPath,
        folders: item.folders,
        hashtags: item.hashtags,
        imageUrl: item.imageUrl,
        imageCaption: item.imageCaption,
      });
      if (res.isNew) created++;
      else updated++;
    }

    return {
      feedSlug: feed.slug,
      feedTitle: feed.title,
      notesCount: feasts.length,
      created,
      updated,
    };
  }

  /**
   * 8. Sync World Countries Holidays
   */
  async syncWorldHolidays(): Promise<IngestionResult> {
    this.logger.log('🌍 Syncing World Countries Holidays 2026...');
    const container = await this.ensureContainer(
      'cont-world-holidays',
      '🌍 Праздники стран мира',
      'Национальные и культурные праздники стран мира: Китайский Новый год, День благодарения, 4th of July, День взятия Бастилии и другие.',
    );
    const feed = await this.ensureFeed(
      'world-holidays',
      'Праздники стран мира',
      'Знаменитые национальные, исторические и культурные праздники стран мира 2026 года.',
    );

    const feasts = this.holidaysEngine.getWorldHolidays(2026);
    let created = 0;
    let updated = 0;

    for (const item of feasts) {
      const res = await this.upsertCalendarNote({
        feedId: feed.id,
        containerId: container.id,
        title: item.title,
        description: item.description,
        type: item.type,
        startDate: item.startDate,
        endDate: item.endDate,
        icon: item.icon,
        sourceLink: item.sourceLink,
        taxonomyPath: item.taxonomyPath,
        folders: item.folders,
        hashtags: item.hashtags,
        imageUrl: item.imageUrl,
        imageCaption: item.imageCaption,
      });
      if (res.isNew) created++;
      else updated++;
    }

    return {
      feedSlug: feed.slug,
      feedTitle: feed.title,
      notesCount: feasts.length,
      created,
      updated,
    };
  }

  /**
   * 9. Sync Russian Holidays & Days of Military Glory (Combined)
   */
  async syncRussianHolidays(): Promise<IngestionResult> {
    this.logger.log('🇷🇺 Syncing Russian Holidays and Military Glory Days...');
    const feed = await this.ensureFeed(
      'russian-holidays',
      'Русские праздники',
      'Официальные нерабочие праздничные дни, памятные даты и Дни воинской славы России по 32-ФЗ.',
    );

    const holidays = this.holidaysEngine.getRussianHolidays(2026);
    let created = 0;
    let updated = 0;

    for (const item of holidays) {
      const res = await this.upsertCalendarNote({
        feedId: feed.id,
        title: item.title,
        description: item.description,
        type: item.type,
        startDate: item.startDate,
        endDate: item.endDate,
        icon: item.icon,
        sourceLink: item.sourceLink,
        taxonomyPath: item.taxonomyPath,
        folders: item.folders,
        hashtags: item.hashtags,
        imageUrl: item.imageUrl,
        imageCaption: item.imageCaption,
      });
      if (res.isNew) created++;
      else updated++;
    }

    return {
      feedSlug: feed.slug,
      feedTitle: feed.title,
      notesCount: holidays.length,
      created,
      updated,
    };
  }

  /**
   * 3. Sync Christian & Orthodox Holidays
   */
  async syncChristianHolidays(): Promise<IngestionResult> {
    this.logger.log('☦️ Syncing Christian Holidays & Easter Cycle 2026...');
    const feed = await this.ensureFeed(
      'christian-holidays',
      'Христианские праздники',
      'Двунадесятые праздники, Пасха Христова и ключевые дни православного церковного года 2026.',
    );

    const feasts = this.holidaysEngine.getChristianHolidays(2026);
    let created = 0;
    let updated = 0;

    for (const item of feasts) {
      const res = await this.upsertCalendarNote({
        feedId: feed.id,
        title: item.title,
        description: item.description,
        type: item.type,
        startDate: item.startDate,
        endDate: item.endDate,
        icon: item.icon,
        sourceLink: item.sourceLink,
        taxonomyPath: item.taxonomyPath,
        folders: item.folders,
        hashtags: item.hashtags,
        imageUrl: item.imageUrl,
        imageCaption: item.imageCaption,
      });
      if (res.isNew) created++;
      else updated++;
    }

    return {
      feedSlug: feed.slug,
      feedTitle: feed.title,
      notesCount: feasts.length,
      created,
      updated,
    };
  }

  /**
   * 4. Sync Political Events 2026
   */
  async syncPolitics2026(): Promise<IngestionResult> {
    this.logger.log('🌐 Syncing Political Events 2026...');
    const feed = await this.ensureFeed(
      'politics-2026',
      'Политика 2026',
      'Ключевые международные саммиты, парламентские выборы и геополитические события 2026 года.',
    );

    const events = this.politicalEngine.getPoliticalEvents2026();
    let created = 0;
    let updated = 0;

    for (const item of events) {
      const res = await this.upsertCalendarNote({
        feedId: feed.id,
        title: item.title,
        description: item.description,
        type: item.type,
        startDate: item.startDate,
        endDate: item.endDate,
        icon: item.icon,
        sourceLink: item.sourceLink,
        taxonomyPath: item.taxonomyPath,
        folders: item.folders,
        hashtags: item.hashtags,
        imageUrl: item.imageUrl,
        imageCaption: item.imageCaption,
      });
      if (res.isNew) created++;
      else updated++;
    }

    return {
      feedSlug: feed.slug,
      feedTitle: feed.title,
      notesCount: events.length,
      created,
      updated,
    };
  }
}
