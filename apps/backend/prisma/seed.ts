import { PrismaClient, NoteType } from '@prisma/client';
import { HolidaysEngineService } from '../src/ingestion/services/holidays-engine.service';
import { TmdbService } from '../src/ingestion/services/tmdb.service';
import { PoliticalEngineService } from '../src/ingestion/services/political-engine.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Project Lenta database seed with AI & Ingestion Engines...');

  // Clean existing data
  await prisma.noteFolder.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.noteLink.deleteMany();
  await prisma.noteImage.deleteMany();
  await prisma.note.deleteMany();
  await prisma.hashtag.deleteMany();
  await prisma.taxonomyNode.deleteMany();
  await prisma.feed.deleteMany();

  // 1. Create Feeds
  const feedMcu = await prisma.feed.create({
    data: {
      title: 'Marvel Cinematic Universe',
      description: 'Радар релизов, хронология Фаз 5 и 6 и таймлайн Саги Мультивселенной.',
      slug: 'mcu-radar',
    },
  });

  const feedRussianHolidays = await prisma.feed.create({
    data: {
      title: 'Русские праздники',
      description: 'Официальные нерабочие праздничные дни, памятные даты и Дни воинской славы России по 32-ФЗ.',
      slug: 'russian-holidays',
    },
  });

  const feedChristianHolidays = await prisma.feed.create({
    data: {
      title: 'Христианские праздники',
      description: 'Двунадесятые праздники, Пасха Христова и ключевые дни православного церковного года 2026.',
      slug: 'christian-holidays',
    },
  });

  const feedPolitics2026 = await prisma.feed.create({
    data: {
      title: 'Политика 2026',
      description: 'Ключевые международные саммиты, выборы, парламентские сессии и геополитические события 2026 года.',
      slug: 'politics-2026',
    },
  });

  const feedTech = await prisma.feed.create({
    data: {
      title: 'Technical Architecture & Strategy',
      description: 'System designs, RFCs, and engineering roadmap milestones.',
      slug: 'tech-strategy',
    },
  });

  const feedProduct = await prisma.feed.create({
    data: {
      title: 'Product Milestones',
      description: 'Tracking quarterly product goals and user experience initiatives.',
      slug: 'product-milestones',
    },
  });

  const feedDesign = await prisma.feed.create({
    data: {
      title: 'Design Systems & UI',
      description: 'Lenta admin design tokens, component libraries, and style updates.',
      slug: 'design-systems',
    },
  });

  const feedDevOps = await prisma.feed.create({
    data: {
      title: 'DevOps & Infrastructure',
      description: 'Cloud deployments, database migrations, and uptime operations.',
      slug: 'devops-infra',
    },
  });

  console.log('✅ Created 8 Feeds');

  // 2. Helper functions for upserting Folder, Taxonomy, Hashtag, Image, Links
  const folderMap = new Map<string, string>();
  async function getOrCreateFolder(path: string, icon = 'folder'): Promise<string> {
    if (folderMap.has(path)) return folderMap.get(path)!;
    const existing = await prisma.folder.findUnique({ where: { path } });
    if (existing) {
      folderMap.set(path, existing.id);
      return existing.id;
    }
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const created = await prisma.folder.create({
      data: { path, name, icon },
    });
    folderMap.set(path, created.id);
    return created.id;
  }

  const taxonomyMap = new Map<string, string>();
  async function getOrCreateTaxonomy(path: string, name?: string, icon = 'tag'): Promise<string> {
    const clean = path.toLowerCase().trim();
    if (taxonomyMap.has(clean)) return taxonomyMap.get(clean)!;
    const existing = await prisma.taxonomyNode.findUnique({ where: { path: clean } });
    if (existing) {
      taxonomyMap.set(clean, existing.id);
      return existing.id;
    }
    const parts = clean.split('.');
    const autoName = name || parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1);
    const created = await prisma.taxonomyNode.create({
      data: { path: clean, name: autoName, icon },
    });
    taxonomyMap.set(clean, created.id);
    return created.id;
  }

  async function seedNoteItem(item: {
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
  }) {
    const tagId = await getOrCreateTaxonomy(item.taxonomyPath);
    const sDate = new Date(item.startDate);
    const eDate = item.endDate ? new Date(item.endDate) : null;

    const note = await prisma.note.create({
      data: {
        feedId: item.feedId,
        title: item.title,
        description: item.description,
        type: item.type,
        startDate: sDate,
        endDate: eDate,
        icon: item.icon,
        sourceLink: item.sourceLink,
        tags: {
          connect: [{ id: tagId }],
        },
      },
    });

    // Folders
    if (item.folders && item.folders.length > 0) {
      for (let i = 0; i < item.folders.length; i++) {
        const folderId = await getOrCreateFolder(item.folders[i]);
        await prisma.noteFolder.create({
          data: {
            noteId: note.id,
            folderId,
            isPrimary: i === 0,
            order: i,
          },
        });
      }
    }

    // Hashtags
    if (item.hashtags && item.hashtags.length > 0) {
      for (const ht of item.hashtags) {
        const cleanName = ht.replace(/^#/, '').toLowerCase().trim();
        if (!cleanName) continue;
        const hashtag = await prisma.hashtag.upsert({
          where: { name: cleanName },
          update: {},
          create: { name: cleanName },
        });
        await prisma.note.update({
          where: { id: note.id },
          data: {
            hashtags: {
              connect: [{ id: hashtag.id }],
            },
          },
        });
      }
    }

    // Images
    if (item.imageUrl) {
      await prisma.noteImage.create({
        data: {
          noteId: note.id,
          url: item.imageUrl,
          filename: `${item.title.slice(0, 30)}.jpg`,
          mimeType: 'image/jpeg',
          sizeBytes: 102400,
          caption: item.imageCaption || item.title,
          isMain: true,
          order: 0,
        },
      });
    }

    // Links
    if (item.sourceLink) {
      await prisma.noteLink.create({
        data: {
          noteId: note.id,
          url: item.sourceLink,
          title: 'Официальный источник',
          isSource: true,
          order: 0,
        },
      });
    }

    if (item.trailerUrl) {
      await prisma.noteLink.create({
        data: {
          noteId: note.id,
          url: item.trailerUrl,
          title: 'Официальный трейлер (YouTube)',
          isSource: false,
          order: 1,
        },
      });
    }
  }

  // 3. Seed Marvel Releases (TMDB dataset)
  console.log('🎬 Seeding Marvel Cinematic Universe...');
  const tmdbService = new TmdbService({ get: () => undefined } as any);
  const mcuReleases = tmdbService.getCuratedMcuDataset();
  for (const m of mcuReleases) {
    await seedNoteItem({
      feedId: feedMcu.id,
      title: m.title,
      description: m.description,
      type: m.type,
      startDate: m.releaseDate,
      endDate: m.endDate,
      icon: 'movie',
      sourceLink: m.sourceLink,
      taxonomyPath: m.taxonomyPath,
      folders: m.folders,
      hashtags: m.hashtags,
      imageUrl: m.posterUrl,
      imageCaption: `Постер фильма: ${m.title}`,
      trailerUrl: m.trailerUrl,
    });
  }
  console.log(`✅ Seeded ${mcuReleases.length} MCU releases with TMDB posters and trailers`);

  // 4. Seed Russian Holidays & Military Glory Days
  console.log('🇷🇺 Seeding Russian Holidays & Military Glory Days...');
  const holidaysEngine = new HolidaysEngineService();
  const russianHolidays = holidaysEngine.getRussianHolidays(2026);
  for (const h of russianHolidays) {
    await seedNoteItem({
      feedId: feedRussianHolidays.id,
      title: h.title,
      description: h.description,
      type: h.type,
      startDate: h.startDate,
      endDate: h.endDate,
      icon: h.icon,
      sourceLink: h.sourceLink,
      taxonomyPath: h.taxonomyPath,
      folders: h.folders,
      hashtags: h.hashtags,
      imageUrl: h.imageUrl,
      imageCaption: h.imageCaption,
    });
  }
  console.log(`✅ Seeded ${russianHolidays.length} Russian & Military Holidays`);

  // 5. Seed Christian Holidays & Easter Cycle
  console.log('☦️ Seeding Christian Holidays & Easter Cycle 2026...');
  const christianHolidays = holidaysEngine.getChristianHolidays(2026);
  for (const c of christianHolidays) {
    await seedNoteItem({
      feedId: feedChristianHolidays.id,
      title: c.title,
      description: c.description,
      type: c.type,
      startDate: c.startDate,
      endDate: c.endDate,
      icon: c.icon,
      sourceLink: c.sourceLink,
      taxonomyPath: c.taxonomyPath,
      folders: c.folders,
      hashtags: c.hashtags,
      imageUrl: c.imageUrl,
      imageCaption: c.imageCaption,
    });
  }
  console.log(`✅ Seeded ${christianHolidays.length} Christian Feasts & Fasts`);

  // 6. Seed Political Events 2026
  console.log('🌐 Seeding Political Events 2026...');
  const politicalEngine = new PoliticalEngineService();
  const politicalEvents = politicalEngine.getPoliticalEvents2026();
  for (const p of politicalEvents) {
    await seedNoteItem({
      feedId: feedPolitics2026.id,
      title: p.title,
      description: p.description,
      type: p.type,
      startDate: p.startDate,
      endDate: p.endDate,
      icon: p.icon,
      sourceLink: p.sourceLink,
      taxonomyPath: p.taxonomyPath,
      folders: p.folders,
      hashtags: p.hashtags,
      imageUrl: p.imageUrl,
      imageCaption: p.imageCaption,
    });
  }
  console.log(`✅ Seeded ${politicalEvents.length} Political Events 2026`);

  // 7. Seed Engineering & Design System Notes
  console.log('⚡ Seeding Tech, Design, & DevOps Notes...');
  const techNotes = [
    {
      feedId: feedTech.id,
      title: 'Q4 Content Strategy Review',
      type: NoteType.PERIOD,
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2026-11-30T23:59:59.000Z',
      sourceLink: 'https://notion.so/strategy/q4-content',
      icon: 'trending_up',
      taxonomyPath: 'strategy.planning',
      folders: ['Strategy/Planning', 'Projects/Lenta'],
      hashtags: ['Strategy', 'Roadmap', 'Q4'],
      description: `### Strategy Review & Goals\nEvaluating the performance metrics for Q3 and aligning editorial calendars for the upcoming holiday push.\n\n1. **Taxonomy Alignment:** Ensure taxonomy tags are strictly adhered to for cross-referencing across Obsidian and Admin CMS.\n2. **Performance Metrics:** Review read times, syndication reach, and sync latency.`,
    },
    {
      feedId: feedDesign.id,
      title: 'Design System V2 Tokens & Olive Gold Palette',
      type: NoteType.SINGLE,
      startDate: '2026-10-24T12:00:00.000Z',
      icon: 'palette',
      taxonomyPath: 'design.tokens',
      folders: ['Design/Tokens', 'Projects/Lenta'],
      hashtags: ['DesignSystem', 'Tokens', 'UI'],
      description: `### New Palette Configuration\n\n\`\`\`json\n{\n  "colors": {\n    "primary": "#c9cd58",\n    "surface": "#121414",\n    "secondary": "#c9c8a5",\n    "tertiary": "#a4d0bf"\n  },\n  "fonts": {\n    "ui": "Inter",\n    "metadata": "JetBrains Mono"\n  }\n}\n\`\`\`\n\nAll components now adhere to the 4px base unit grid and Level 1/Level 2 elevation borders.`,
    },
    {
      feedId: feedDevOps.id,
      title: 'Server Migration & Ingestion Pipeline Checklist',
      type: NoteType.SINGLE,
      startDate: '2026-10-23T09:15:00.000Z',
      icon: 'dns',
      taxonomyPath: 'devops.infrastructure',
      folders: ['Operations/Infrastructure'],
      hashtags: ['DevOps', 'Postgres', 'Sync'],
      description: `### Infrastructure Step-by-Step\n- [x] Multi-Provider calendar ingestion services initialized\n- [x] TMDB Marvel radar with high-res CDN posters\n- [x] Computus Orthodox Easter & Russian statutory holiday engines`,
    },
  ];

  for (const n of techNotes) {
    await seedNoteItem(n);
  }

  console.log('🎉 Database successfully seeded with all 4 rich calendar channels and technical notes!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
