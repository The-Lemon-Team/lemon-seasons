import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './services/gemini.service';
import { TmdbService } from './services/tmdb.service';
import { HolidaysEngineService, HolidayItem } from './services/holidays-engine.service';
import { PoliticalEngineService, PoliticalEventItem } from './services/political-engine.service';
import { WikiEngineService } from './services/wiki-engine.service';
import { NoteType } from '@prisma/client';
import { PRESET_FEED_DEFINITIONS, PresetFeedDefinition } from './preset-feeds.data';

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
    private readonly wikiEngine: WikiEngineService,
  ) {}

  /**
   * Syncs all preset channels/feeds and containers into the database.
   */
  async syncAllFeeds(): Promise<IngestionResult[]> {
    const results: IngestionResult[] = [];
    results.push(await this.syncMcuRadar());
    for (const def of Object.values(PRESET_FEED_DEFINITIONS)) {
      results.push(await this.syncPreset(def));
    }
    return results;
  }

  /**
   * Sync a specific feed by slug using declarative lookup.
   */
  async syncFeedBySlug(slug: string): Promise<IngestionResult> {
    if (slug === 'mcu-radar') {
      return this.syncMcuRadar();
    }
    if (slug === 'wiki' || slug === 'wiki-history') {
      return this.syncWikiEvents();
    }
    const preset = PRESET_FEED_DEFINITIONS[slug];
    if (preset) {
      return this.syncPreset(preset);
    }
    throw new Error(`Unknown feed slug: ${slug}`);
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
    taxonomyPath?: string;
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

    // 1. (Optional legacy) Ensure taxonomy tag if provided
    let tagNode: any = null;
    if (taxonomyPath) {
      tagNode = await this.ensureTaxonomyNode(taxonomyPath);
    }

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
          ...(tagNode ? { tags: { set: [{ id: tagNode.id }] } } : {}),
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
          ...(tagNode ? { tags: { connect: [{ id: tagNode.id }] } } : {}),
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
   * Generic batch upsert helper for collection of holiday/event items.
   */
  private async upsertNotesBatch(
    feed: { id: string; slug: string; title: string },
    items: (HolidayItem | PoliticalEventItem)[],
    containerId?: string,
  ): Promise<IngestionResult> {
    let created = 0;
    let updated = 0;

    for (const item of items) {
      const res = await this.upsertCalendarNote({
        feedId: feed.id,
        containerId,
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
      notesCount: items.length,
      created,
      updated,
    };
  }

  /**
   * Generic helper executing preset feed sync using declarative definitions.
   */
  private async syncPreset(def: PresetFeedDefinition): Promise<IngestionResult> {
    this.logger.log(`${def.logEmoji} Syncing ${def.logTitle}...`);
    let container: any = null;
    if (def.container) {
      container = await this.ensureContainer(
        def.container.id,
        def.container.name,
        def.container.description,
      );
    }
    const feed = await this.ensureFeed(def.slug, def.title, def.description);
    const items = def.getItems({
      holidays: this.holidaysEngine,
      politics: this.politicalEngine,
    });
    return this.upsertNotesBatch(feed, items, container?.id);
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

  // ==========================================
  // Preset Feed Sync Methods (Backward Compatible)
  // ==========================================

  syncRussianOfficialHolidays(): Promise<IngestionResult> {
    return this.syncPreset(PRESET_FEED_DEFINITIONS['russian-official']);
  }

  syncRussianMilitaryHolidays(): Promise<IngestionResult> {
    return this.syncPreset(PRESET_FEED_DEFINITIONS['russian-military']);
  }

  syncOrthodoxHolidays(): Promise<IngestionResult> {
    return this.syncPreset(PRESET_FEED_DEFINITIONS['orthodox-holidays']);
  }

  syncCatholicHolidays(): Promise<IngestionResult> {
    return this.syncPreset(PRESET_FEED_DEFINITIONS['catholic-holidays']);
  }

  syncIslamicHolidays(): Promise<IngestionResult> {
    return this.syncPreset(PRESET_FEED_DEFINITIONS['islamic-holidays']);
  }

  syncWorldReligionsHolidays(): Promise<IngestionResult> {
    return this.syncPreset(PRESET_FEED_DEFINITIONS['world-religions']);
  }

  syncWorldHolidays(): Promise<IngestionResult> {
    return this.syncPreset(PRESET_FEED_DEFINITIONS['world-holidays']);
  }

  syncRussianHolidays(): Promise<IngestionResult> {
    return this.syncPreset(PRESET_FEED_DEFINITIONS['russian-holidays']);
  }

  syncChristianHolidays(): Promise<IngestionResult> {
    return this.syncPreset(PRESET_FEED_DEFINITIONS['christian-holidays']);
  }

  syncPolitics2026(): Promise<IngestionResult> {
    return this.syncPreset(PRESET_FEED_DEFINITIONS['politics-2026']);
  }

  /**
   * Syncs historical events from Wikipedia for the specified date (defaults to today)
   */
  async syncWikiEvents(date: Date = new Date()): Promise<IngestionResult> {
    this.logger.log('📖 Syncing Wiki Events for date...');
    const feed = await this.ensureFeed(
      'wiki',
      'Этот день в истории (Wiki)',
      'Сводка исторических событий, открытий и вех текущего дня из свободной энциклопедии Wikipedia',
    );
    const container = await this.ensureContainer(
      'wiki-daily-history',
      'Wiki Daily History',
      'Контейнер ежедневных исторических выжимок и хроник из Wikipedia',
    );

    const events = await this.wikiEngine.getEventsForDate(date);
    return this.upsertNotesBatch(feed, events, container.id);
  }
}
