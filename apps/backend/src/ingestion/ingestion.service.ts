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
   * Syncs all preset channels/feeds into the database.
   */
  async syncAllFeeds(): Promise<IngestionResult[]> {
    const results: IngestionResult[] = [];
    results.push(await this.syncMcuRadar());
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
  public async ensureFolder(path: string, icon?: string) {
    const existing = await this.prisma.folder.findUnique({
      where: { path },
    });
    if (existing) return existing;

    const parts = path.split('/');
    const name = parts[parts.length - 1];

    return this.prisma.folder.create({
      data: {
        path,
        name,
        icon: icon || 'folder',
      },
    });
  }

  /**
   * Helper: Upsert Note with all its relations
   */
  public async upsertCalendarNote(params: {
    feedId: string;
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
        const folder = await this.ensureFolder(folderPath);
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
   * 2. Sync Russian Holidays & Days of Military Glory
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
