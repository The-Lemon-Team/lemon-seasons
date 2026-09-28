import { PrismaClient, NoteType } from '@prisma/client';
import { HolidaysEngineService } from '../src/ingestion/services/holidays-engine.service';
import { TmdbService } from '../src/ingestion/services/tmdb.service';
import { PoliticalEngineService } from '../src/ingestion/services/political-engine.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Project Lenta database seed with AI & Ingestion Engines...');

  // Clean existing data
  await prisma.userKey.deleteMany();
  await prisma.user.deleteMany();
  await prisma.noteVersion.deleteMany();
  await prisma.noteFolder.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.noteLink.deleteMany();
  await prisma.noteImage.deleteMany();
  await prisma.note.deleteMany();
  await prisma.container.deleteMany();
  await prisma.hashtag.deleteMany();
  await prisma.taxonomyNode.deleteMany();
  await prisma.feed.deleteMany();

  // 0. Seed Accounts (Guest, User, Admin)
  const guestUser = await prisma.user.create({
    data: {
      id: 'usr-guest-000',
      email: 'guest@lemon.team',
      name: 'Гость (Guest)',
      password: 'guest',
      role: 'guest',
    },
  });

  const memberUser = await prisma.user.create({
    data: {
      id: 'usr-member-001',
      email: 'user@lemon.team',
      name: 'Пользователь (User)',
      password: 'user',
      role: 'user',
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      id: 'usr-admin-999',
      email: 'admin@lemon.team',
      name: 'Администратор (Admin)',
      password: 'admin',
      role: 'admin',
    },
  });

  // Seed default active UserKeys
  await prisma.userKey.createMany({
    data: [
      {
        id: 'key-admin-obs-master',
        userId: 'usr-admin-999',
        name: 'Admin Primary Vault Key',
        provider: 'obsidian',
        key: 'lenta_obs_admin_primary_vault',
      },
      {
        id: 'key-admin-api-secret',
        userId: 'usr-admin-999',
        name: 'Admin Master REST API Key',
        provider: 'api',
        key: 'lenta_api_admin_master_secret',
      },
      {
        id: 'key-obsidian-demo-001',
        userId: 'usr-member-001',
        name: 'Obsidian Main Vault Laptop',
        provider: 'obsidian',
        key: 'lenta_obs_8f7b2c9a1d4e6f30a91b2c4d5e6f7a8b',
      },
    ],
  });

  console.log('✅ Created 3 System Users with Active Keys (Admin: usr-admin-999, Member: usr-member-001, Guest: usr-guest-000)');

  // 1. Create Feeds
  const feedMcu = await prisma.feed.create({
    data: {
      title: 'Marvel Cinematic Universe',
      description: 'Радар релизов, хронология Фаз 5 и 6 и таймлайн Саги Мультивселенной.',
      slug: 'mcu-radar',
    },
  });

  const feedRussianOfficial = await prisma.feed.create({
    data: {
      title: 'Русские праздники (Официальные)',
      description: 'Официальные государственные нерабочие праздничные дни по ст. 112 ТК РФ, памятные даты и торжества России.',
      slug: 'russian-official',
    },
  });

  const feedRussianMilitary = await prisma.feed.create({
    data: {
      title: 'Дни воинской славы и военные праздники России',
      description: 'Дни воинской славы и памятные даты России по 32-ФЗ, профессиональные праздники видов и родов войск ВС РФ.',
      slug: 'russian-military',
    },
  });

  const feedRussianHolidays = await prisma.feed.create({
    data: {
      title: 'Русские праздники (Сводный)',
      description: 'Сводный календарь праздников России: официальные даты и Дни воинской славы.',
      slug: 'russian-holidays',
    },
  });

  const feedOrthodox = await prisma.feed.create({
    data: {
      title: 'Православный календарь',
      description: 'Двунадесятые праздники, Пасха Христова, многодневные посты и дни памяти святых Русской Православной Церкви 2026.',
      slug: 'orthodox-holidays',
    },
  });

  const feedCatholic = await prisma.feed.create({
    data: {
      title: 'Католический календарь',
      description: 'Литургический год Римско-католической церкви: григорианская Пасха, Рождество, Адвент, Великий пост 2026.',
      slug: 'catholic-holidays',
    },
  });

  const feedChristianHolidays = await prisma.feed.create({
    data: {
      title: 'Христианские праздники (Сводный)',
      description: 'Сводный христианский календарь: православные и католические торжества 2026.',
      slug: 'christian-holidays',
    },
  });

  const feedIslamic = await prisma.feed.create({
    data: {
      title: 'Исламский религиозный календарь & Рамадан',
      description: 'Календарь Хиджры 1447–1448: Священный месяц Рамадан, Ураза-байрам, Курбан-байрам и памятные даты Ислама.',
      slug: 'islamic-holidays',
    },
  });

  const feedWorldReligions = await prisma.feed.create({
    data: {
      title: 'Мировые религии: Ислам, Иудаизм, Буддизм',
      description: 'Священные даты и праздники мировых духовных традиций: Ислам, Иудаизм (Песах, Ханука), Буддизм (Весак, Сагаалган).',
      slug: 'world-religions',
    },
  });

  const feedWorldHolidays = await prisma.feed.create({
    data: {
      title: 'Праздники стран мира',
      description: 'Знаменитые национальные и культурные праздники стран мира: Китайский Новый год, День независимости США, День взятия Бастилии, День благодарения.',
      slug: 'world-holidays',
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

  console.log('✅ Created 15 Feeds (including Orthodox, Catholic, Islamic, World Religions, Russian Official & Military, World Holidays)');

  // 1.5 Seed Initial Vault Containers (Public & Private)
  await prisma.container.upsert({
    where: { id: 'cont-orthodox-calendar' },
    update: { ownerUserId: 'usr-admin-999' },
    create: {
      id: 'cont-orthodox-calendar',
      name: '☦️ Православный календарь',
      type: 'obsidian',
      description: 'Двунадесятые праздники, Пасхальный цикл, многодневные посты и памятные дни святых Православной Церкви.',
      visibility: 'public',
      ownerUserId: 'usr-admin-999',
    },
  });

  await prisma.container.upsert({
    where: { id: 'cont-catholic-calendar' },
    update: { ownerUserId: 'usr-admin-999' },
    create: {
      id: 'cont-catholic-calendar',
      name: '✝️ Католический календарь',
      type: 'obsidian',
      description: 'Литургический год Католической церкви: григорианская Пасха, Рождество, Адвент, Великий пост и дни святых.',
      visibility: 'public',
      ownerUserId: 'usr-admin-999',
    },
  });

  await prisma.container.upsert({
    where: { id: 'cont-islamic-calendar' },
    update: { ownerUserId: 'usr-admin-999' },
    create: {
      id: 'cont-islamic-calendar',
      name: '☪️ Исламский религиозный календарь',
      type: 'obsidian',
      description: 'Календарь Хиджры 1447–1448: Священный месяц Рамадан, Ураза-байрам, Курбан-байрам и памятные даты Ислама.',
      visibility: 'public',
      ownerUserId: 'usr-admin-999',
    },
  });

  await prisma.container.upsert({
    where: { id: 'cont-world-religions' },
    update: { ownerUserId: 'usr-admin-999' },
    create: {
      id: 'cont-world-religions',
      name: '🕊️ Мировые религии и духовные традиции',
      type: 'obsidian',
      description: 'Сводный календарь священных дат, праздников и постов мировых религий: Ислам, Иудаизм, Буддизм.',
      visibility: 'public',
      ownerUserId: 'usr-admin-999',
    },
  });

  await prisma.container.upsert({
    where: { id: 'cont-russian-official' },
    update: { ownerUserId: 'usr-admin-999' },
    create: {
      id: 'cont-russian-official',
      name: '🇷🇺 Праздники России (Официальные)',
      type: 'obsidian',
      description: 'Государственные праздники РФ по ТК РФ, общенародные и культурные даты.',
      visibility: 'public',
      ownerUserId: 'usr-admin-999',
    },
  });

  await prisma.container.upsert({
    where: { id: 'cont-russian-military' },
    update: { ownerUserId: 'usr-admin-999' },
    create: {
      id: 'cont-russian-military',
      name: '🎖️ Дни воинской славы и военные праздники России',
      type: 'obsidian',
      description: 'Дни воинской славы и памятные даты России по 32-ФЗ, профессиональные праздники видов и родов войск ВС РФ.',
      visibility: 'public',
      ownerUserId: 'usr-admin-999',
    },
  });

  await prisma.container.upsert({
    where: { id: 'cont-world-holidays' },
    update: { ownerUserId: 'usr-admin-999' },
    create: {
      id: 'cont-world-holidays',
      name: '🌍 Праздники стран мира',
      type: 'obsidian',
      description: 'Национальные и культурные праздники стран мира: Китайский Новый год, День благодарения, 4th of July, День взятия Бастилии и другие.',
      visibility: 'public',
      ownerUserId: 'usr-admin-999',
    },
  });

  await prisma.container.upsert({
    where: { id: 'main-vault' },
    update: {
      ownerUserId: 'usr-admin-999',
    },
    create: {
      id: 'main-vault',
      name: '🍋 Primary Vault Container',
      type: 'obsidian',
      description: 'Primary shared Obsidian vault container for team notes and documentation.',
      visibility: 'public',
      ownerUserId: 'usr-admin-999',
    },
  });

  await prisma.container.upsert({
    where: { id: 'cont-admin-personal' },
    update: {
      ownerUserId: 'usr-admin-999',
    },
    create: {
      id: 'cont-admin-personal',
      name: '🔒 Admin Personal Vault',
      type: 'obsidian',
      description: 'Private encrypted personal vault container for Administrator.',
      visibility: 'private',
      ownerUserId: 'usr-admin-999',
    },
  });

  await prisma.container.upsert({
    where: { id: 'cont-private-user-vault' },
    update: {
      ownerUserId: 'usr-member-001',
    },
    create: {
      id: 'cont-private-user-vault',
      name: '🔒 User Private Key Vault',
      type: 'obsidian',
      description: 'Encrypted private user vault container for personal notes.',
      visibility: 'private',
      ownerUserId: 'usr-member-001',
    },
  });

  console.log('✅ Created 10 Vault Containers with Owners (7 Public Themed Containers + 3 Workspace Containers)');

  // 2. Helper functions for upserting Folder, Taxonomy, Hashtag, Image, Links
  const folderMap = new Map<string, string>();
  async function getOrCreateFolder(
    path: string,
    icon = 'folder',
    containerId: string | null = null,
    privacy: 'public' | 'private' = 'public'
  ): Promise<string> {
    const key = `${path}::${containerId || 'null'}`;
    if (folderMap.has(key)) return folderMap.get(key)!;

    // Ensure parent folders exist
    const parts = path.split('/');
    if (parts.length > 1) {
      let currentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        await getOrCreateFolder(currentPath, 'folder', containerId, privacy);
      }
    }

    const existing = await prisma.folder.findFirst({
      where: { path, containerId: containerId ? containerId : null },
    });
    if (existing) {
      folderMap.set(key, existing.id);
      return existing.id;
    }

    const name = parts[parts.length - 1];
    const created = await prisma.folder.create({
      data: { path, name, icon, containerId, privacy },
    });
    folderMap.set(key, created.id);
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
    curator?: string;
    resonanceScore?: number;
    parentNoteId?: string;
  }) {
    const tagId = await getOrCreateTaxonomy(item.taxonomyPath);
    const sDate = new Date(item.startDate);
    const eDate = item.endDate ? new Date(item.endDate) : null;

    const note = await prisma.note.create({
      data: {
        feedId: item.feedId,
        containerId: item.containerId,
        title: item.title,
        description: item.description,
        type: item.type,
        startDate: sDate,
        endDate: eDate,
        icon: item.icon,
        curator: item.curator,
        resonanceScore: item.resonanceScore,
        parentNoteId: item.parentNoteId,
        sourceLink: item.sourceLink,
        tags: {
          connect: [{ id: tagId }],
        },
      },
    });

    // Folders
    if (item.folders && item.folders.length > 0) {
      for (let i = 0; i < item.folders.length; i++) {
        const folderPath = item.folders[i];
        const isInternal =
          item.containerId === 'cont-private-user-vault' ||
          folderPath.startsWith('04_Archive') ||
          folderPath.startsWith('01_Daily_Logs') ||
          folderPath.startsWith('Bookmarks') ||
          folderPath.startsWith('Core_Strategy') ||
          folderPath.startsWith('Financials');
        const cId = isInternal ? (item.containerId || 'cont-private-user-vault') : item.containerId || null;
        const privacy = isInternal ? 'private' : item.containerId ? 'obsidian' : 'public';
        const folderId = await getOrCreateFolder(folderPath, 'folder', cId, privacy as any);
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

  const holidaysEngine = new HolidaysEngineService();

  // 4. Seed Russian Official & State Holidays
  console.log('🇷🇺 Seeding Russian Official & State Holidays...');
  const russianOfficialHolidays = holidaysEngine.getRussianOfficialHolidays(2026);
  for (const h of russianOfficialHolidays) {
    await seedNoteItem({
      feedId: feedRussianOfficial.id,
      containerId: 'cont-russian-official',
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
      curator: 'Иван Белый',
    });
  }
  console.log(`✅ Seeded ${russianOfficialHolidays.length} Russian Official Holidays (cont-russian-official)`);

  // 5. Seed Russian Military Holidays & Days of Military Glory
  console.log('🎖️ Seeding Russian Military Holidays & Days of Military Glory (32-FZ)...');
  const russianMilitaryHolidays = holidaysEngine.getRussianMilitaryHolidays(2026);
  for (const h of russianMilitaryHolidays) {
    await seedNoteItem({
      feedId: feedRussianMilitary.id,
      containerId: 'cont-russian-military',
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
      curator: 'Иван Белый',
    });
  }
  console.log(`✅ Seeded ${russianMilitaryHolidays.length} Russian Military Glory & Army Days (cont-russian-military)`);

  // 6. Seed Orthodox Christian Holidays & Easter Cycle
  console.log('☦️ Seeding Orthodox Christian Holidays & Easter Cycle 2026...');
  const orthodoxHolidays = holidaysEngine.getOrthodoxHolidays(2026);
  for (const c of orthodoxHolidays) {
    await seedNoteItem({
      feedId: feedOrthodox.id,
      containerId: 'cont-orthodox-calendar',
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
  console.log(`✅ Seeded ${orthodoxHolidays.length} Orthodox Feasts & Fasts (cont-orthodox-calendar)`);

  // 7. Seed Catholic Christian Holidays & Gregorian Liturgical Year
  console.log('✝️ Seeding Catholic Christian Holidays & Gregorian Liturgical Year 2026...');
  const catholicHolidays = holidaysEngine.getCatholicHolidays(2026);
  for (const c of catholicHolidays) {
    await seedNoteItem({
      feedId: feedCatholic.id,
      containerId: 'cont-catholic-calendar',
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
  console.log(`✅ Seeded ${catholicHolidays.length} Catholic Solemnities & Feasts (cont-catholic-calendar)`);

  // 8. Seed Islamic Religious Calendar & Holy Month Ramadan
  console.log('☪️ Seeding Islamic Religious Calendar & Ramadan 2026...');
  const islamicHolidays = holidaysEngine.getIslamicHolidays(2026);
  for (const i of islamicHolidays) {
    await seedNoteItem({
      feedId: feedIslamic.id,
      containerId: 'cont-islamic-calendar',
      title: i.title,
      description: i.description,
      type: i.type,
      startDate: i.startDate,
      endDate: i.endDate,
      icon: i.icon,
      sourceLink: i.sourceLink,
      taxonomyPath: i.taxonomyPath,
      folders: i.folders,
      hashtags: i.hashtags,
      imageUrl: i.imageUrl,
      imageCaption: i.imageCaption,
    });
  }
  console.log(`✅ Seeded ${islamicHolidays.length} Islamic Religious Events & Ramadan (cont-islamic-calendar)`);

  // 9. Seed World Religions Calendar (Judaism & Buddhism)
  console.log('🕊️ Seeding World Religions Calendar: Judaism & Buddhism...');
  const worldReligionsHolidays = holidaysEngine.getWorldReligionsHolidays(2026);
  // Filter out islamic items already seeded above to prevent duplicates
  const nonIslamicWorld = worldReligionsHolidays.filter((w) => !w.taxonomyPath.startsWith('holidays.islam'));
  for (const w of nonIslamicWorld) {
    await seedNoteItem({
      feedId: feedWorldReligions.id,
      containerId: 'cont-world-religions',
      title: w.title,
      description: w.description,
      type: w.type,
      startDate: w.startDate,
      endDate: w.endDate,
      icon: w.icon,
      sourceLink: w.sourceLink,
      taxonomyPath: w.taxonomyPath,
      folders: w.folders,
      hashtags: w.hashtags,
      imageUrl: w.imageUrl,
      imageCaption: w.imageCaption,
    });
  }
  console.log(`✅ Seeded ${nonIslamicWorld.length} Judaism & Buddhism Holidays (cont-world-religions)`);

  // 10. Seed World Countries Holidays
  console.log('🌍 Seeding World Countries Holidays 2026...');
  const worldHolidays = holidaysEngine.getWorldHolidays(2026);
  for (const w of worldHolidays) {
    await seedNoteItem({
      feedId: feedWorldHolidays.id,
      containerId: 'cont-world-holidays',
      title: w.title,
      description: w.description,
      type: w.type,
      startDate: w.startDate,
      endDate: w.endDate,
      icon: w.icon,
      sourceLink: w.sourceLink,
      taxonomyPath: w.taxonomyPath,
      folders: w.folders,
      hashtags: w.hashtags,
      imageUrl: w.imageUrl,
      imageCaption: w.imageCaption,
      curator: 'Kirk Kitten',
    });
  }
  console.log(`✅ Seeded ${worldHolidays.length} World Countries Holidays (cont-world-holidays)`);

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
      curator: p.curator,
      resonanceScore: p.resonanceScore,
    });
  }
  console.log(`✅ Seeded ${politicalEvents.length} Political Events 2026`);

  // 7. Seed Engineering & Design System Notes
  console.log('⚡ Seeding Tech, Design, & DevOps Notes...');
  const techNotes = [
    {
      feedId: feedTech.id,
      containerId: 'main-vault',
      title: 'Q4 Content Strategy Review',
      type: NoteType.PERIOD,
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2026-11-30T23:59:59.000Z',
      sourceLink: 'https://notion.so/strategy/q4-content',
      icon: 'trending_up',
      taxonomyPath: 'strategy.planning',
      folders: ['Strategy/Planning', '02_Projects/Lenta'],
      hashtags: ['Strategy', 'Roadmap', 'Q4'],
      description: `### Strategy Review & Goals\nEvaluating the performance metrics for Q3 and aligning editorial calendars for the upcoming holiday push.\n\n1. **Taxonomy Alignment:** Ensure taxonomy tags are strictly adhered to for cross-referencing across Obsidian and Admin CMS.\n2. **Performance Metrics:** Review read times, syndication reach, and sync latency.`,
    },
    {
      feedId: feedDesign.id,
      containerId: 'main-vault',
      title: 'Design System V2 Tokens & Olive Gold Palette',
      type: NoteType.SINGLE,
      startDate: '2026-10-24T12:00:00.000Z',
      icon: 'palette',
      taxonomyPath: 'design.tokens',
      folders: ['Design/Tokens', '02_Projects/Lenta'],
      hashtags: ['DesignSystem', 'Tokens', 'UI'],
      description: `### New Palette Configuration\n\n\`\`\`json\n{\n  "colors": {\n    "primary": "#c9cd58",\n    "surface": "#121414",\n    "secondary": "#c9c8a5",\n    "tertiary": "#a4d0bf"\n  },\n  "fonts": {\n    "ui": "Inter",\n    "metadata": "JetBrains Mono"\n  }\n}\n\`\`\`\n\nAll components now adhere to the 4px base unit grid and Level 1/Level 2 elevation borders.`,
    },
    {
      feedId: feedDevOps.id,
      containerId: 'cont-private-user-vault',
      title: 'Server Migration & Private User Vault Sync Checklist',
      type: NoteType.SINGLE,
      startDate: '2026-10-23T09:15:00.000Z',
      icon: 'dns',
      taxonomyPath: 'devops.infrastructure',
      folders: ['Operations/Infrastructure'],
      hashtags: ['DevOps', 'Postgres', 'Sync'],
      description: `### Private Vault Infrastructure Checklist\n- [x] PostgreSQL schema synchronized with Prisma ORM\n- [x] Multi-Container support for public & encrypted private vaults\n- [x] Obsidian Plugin sync engine with offline delta ledger`,
    },

    // ── 04_Archive/Thoughts (Internal / Private) ──────────────────────────
    {
      feedId: feedTech.id,
      containerId: 'cont-private-user-vault',
      title: 'Reflections on Dual-Scope Folders & Obsidian Containment',
      type: NoteType.SINGLE,
      startDate: '2026-09-12T15:30:00.000Z',
      icon: 'sparkles',
      taxonomyPath: 'architecture.thoughts',
      folders: ['04_Archive/Thoughts', '04_Archive'],
      hashtags: ['Thoughts', 'Architecture', 'Obsidian'],
      description: `### Dual-Scope Folders: The Core Tradeoff\n\nExternal project folders broadcast globally to all connected vaults, whereas internal container folders are strictly isolated to personal encrypted vaults.\n\nKey takeaways:\n1. Never mix public and private note references in internal logs.\n2. Delta sync must filter by \`containerId\` at the database query level.\n3. The UI must clearly indicate scope badges (EXT vs INT) so users have zero doubt about privacy.`,
    },
    {
      feedId: feedTech.id,
      containerId: 'cont-private-user-vault',
      title: 'Offline-First Note Architecture: Last-Write-Wins vs Vector Clocks',
      type: NoteType.SINGLE,
      startDate: '2026-09-10T11:00:00.000Z',
      icon: 'sparkles',
      taxonomyPath: 'architecture.sync',
      folders: ['04_Archive/Thoughts', '04_Archive'],
      hashtags: ['Thoughts', 'OfflineFirst', 'CRDT'],
      description: `### Offline-First Philosophy\n\nIn client-first applications like Obsidian, files are the ultimate source of truth for the author.\n\n- Field-level Last-Write-Wins (LWW) with hash verification provides predictable merges without heavyweight CRDT overhead.\n- \`lenta_id\` in frontmatter ensures note identity survives file renames and moves across directories.`,
    },
    {
      feedId: feedProduct.id,
      containerId: 'cont-private-user-vault',
      title: 'Mental Models for Chronological Information Systems',
      type: NoteType.SINGLE,
      startDate: '2026-09-08T09:45:00.000Z',
      icon: 'sparkles',
      taxonomyPath: 'product.philosophy',
      folders: ['04_Archive/Thoughts', '04_Archive'],
      hashtags: ['Thoughts', 'Product', 'MentalModels'],
      description: `### Linear vs Branching Time\n\nMost calendar applications treat time as empty slots to fill. Project Lenta treats time as an anchor for evolving documents.\n\n- Events have durations, milestones have moments, releases have cascading dependencies.\n- Organizing by both semantic taxonomy and physical virtual folders mirrors how human memory works.`,
    },

    // ── Bookmarks (Internal / Private) ────────────────────────────────────
    {
      feedId: feedTech.id,
      containerId: 'cont-private-user-vault',
      title: 'Project Lenta Monorepo Architecture & API Reference',
      type: NoteType.SINGLE,
      startDate: '2026-09-14T10:00:00.000Z',
      icon: 'book-open',
      sourceLink: 'https://github.com/The-Lemon-Team/lemon-seasons',
      taxonomyPath: 'docs.architecture',
      folders: ['Bookmarks'],
      hashtags: ['Bookmarks', 'Docs', 'Lenta'],
      description: `### Key System Reference Links\n- REST Delta Sync: \`/sync/changes?since=<ISO>&containerId=<ID>\`\n- Swagger Docs: \`http://localhost:3001/api/docs\`\n- Calendar App: \`http://localhost:3000\`\n- Admin CMS: \`http://localhost:5173\``,
    },
    {
      feedId: feedTech.id,
      containerId: 'cont-private-user-vault',
      title: 'PostgreSQL ltree & GiST Hierarchical Indexing Best Practices',
      type: NoteType.SINGLE,
      startDate: '2026-09-05T14:20:00.000Z',
      icon: 'book-open',
      sourceLink: 'https://www.postgresql.org/docs/current/ltree.html',
      taxonomyPath: 'docs.database',
      folders: ['Bookmarks'],
      hashtags: ['Bookmarks', 'Postgres', 'ltree'],
      description: `### Reference on ltree Operators\n- \`subpath(path, offset, len)\`: Extract subpath slice\n- \`path <@ 'world.europe'\`: Find all children within subtree\n- GiST index ensures sub-millisecond tree traversal even across 100k+ taxonomy nodes.`,
    },

    // ── 01_Daily_Logs (Internal / Private) ────────────────────────────────
    {
      feedId: feedTech.id,
      containerId: 'cont-private-user-vault',
      title: '2026-09-15 Daily Sync: Dual Folder Engine Verification & Push/Pull',
      type: NoteType.EVENT,
      startDate: '2026-09-15T09:00:00.000Z',
      endDate: '2026-09-15T18:00:00.000Z',
      icon: 'book-open',
      taxonomyPath: 'logs.daily',
      folders: ['01_Daily_Logs'],
      hashtags: ['DailyLog', 'Standup', 'Sync'],
      description: `### Daily Standup & Focus Areas\n- [x] Dual-scope folder architecture completed\n- [x] Verified Prisma schema relations for NoteFolder\n- [/] Verifying transparent Push/Pull synchronization between Obsidian test-vault and Web Calendar App\n- [/] Populating real folder files and validating note inspector`,
    },
    {
      feedId: feedTech.id,
      containerId: 'cont-private-user-vault',
      title: '2026-09-14 Daily Sync: Container Privacy & Token Migration',
      type: NoteType.EVENT,
      startDate: '2026-09-14T09:00:00.000Z',
      endDate: '2026-09-14T18:00:00.000Z',
      icon: 'book-open',
      taxonomyPath: 'logs.daily',
      folders: ['01_Daily_Logs'],
      hashtags: ['DailyLog', 'Standup', 'Security'],
      description: `### Daily Standup Summary\n- Fixed authentication tokens across Obsidian plugin and backend.\n- Added container-scoped isolation tests.\n- Cleaned up orphaned Docker containers.`,
    },

    // ── 02_Projects/Lenta (External / Public) ─────────────────────────────
    {
      feedId: feedProduct.id,
      title: 'Dual Folder Engine Architecture & Folder Manager View',
      type: NoteType.SINGLE,
      startDate: '2026-09-13T14:00:00.000Z',
      icon: 'lemon',
      taxonomyPath: 'projects.lenta.architecture',
      folders: ['02_Projects/Lenta', '02_Projects'],
      hashtags: ['Lenta', 'Architecture', 'UI'],
      description: `### Dual Folder Engine Specification\n\nProject Lenta supports two orthogonal hierarchical dimensions:\n1. **Taxonomy Tree (ltree)**: Subject classification for filtering and facet navigation.\n2. **Virtual Folders (NoteFolder)**: Obsidian vault file tree projection for local file explorer parity.\n\nThe Folder Manager View provides a full Obsidian Explorer UI inside the Calendar web application.`,
    },
    {
      feedId: feedProduct.id,
      title: 'Timeline View & Chronological Hub Specifications',
      type: NoteType.PERIOD,
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-09-30T23:59:59.000Z',
      icon: 'calendar',
      taxonomyPath: 'projects.lenta.roadmap',
      folders: ['02_Projects/Lenta', '02_Projects'],
      hashtags: ['Lenta', 'Timeline', 'Roadmap'],
      description: `### September 2026 Milestone: Timeline View\n- High-performance virtualized canvas for multi-feed chronological display.\n- MiniCalendar navigation drawer with quick month jump.\n- Real-time delta sync updates without full page reloads.`,
    },

    // ── 03_Research/AI (External / Public) ────────────────────────────────
    {
      feedId: feedTech.id,
      title: 'Local Embeddings and Vector Search in Obsidian Vaults',
      type: NoteType.SINGLE,
      startDate: '2026-09-11T16:00:00.000Z',
      icon: 'bot',
      taxonomyPath: 'research.ai.vector',
      folders: ['03_Research/AI', '03_Research'],
      hashtags: ['AI', 'Embeddings', 'Research'],
      description: `### Embedding Strategies for Local Markdown Files\n- Exploring ONNX runtime with all-MiniLM-L6-v2 inside Obsidian plugin.\n- Storing 384-dimensional vector embeddings in local IndexedDB.\n- Hybrid semantic + BM25 keyword search for sub-second retrieval.`,
    },
    {
      feedId: feedTech.id,
      title: 'Agentic Workflows in Collaborative Knowledge Management',
      type: NoteType.SINGLE,
      startDate: '2026-09-07T13:30:00.000Z',
      icon: 'bot',
      taxonomyPath: 'research.ai.agents',
      folders: ['03_Research/AI', '03_Research'],
      hashtags: ['AI', 'Agents', 'Workflows'],
      description: `### Pair Programming with Specialized Subagents\nEvaluating autonomous agent architectures for background ledger reconciliation and conflict resolution in distributed note graphs.`,
    },

    // ── Financials/Q3_Q4 (Internal / Private) ─────────────────────────────
    {
      feedId: feedProduct.id,
      containerId: 'cont-private-user-vault',
      title: 'Q3-Q4 2026 Cloud Infrastructure & DevOps Budget Allocation',
      type: NoteType.PERIOD,
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-12-31T23:59:59.000Z',
      icon: 'circle-dollar-sign',
      taxonomyPath: 'financials.budget',
      folders: ['Financials/Q3_Q4', 'Financials'],
      hashtags: ['Financials', 'Budget', 'Cloud'],
      description: `### Financial Summary: Q3-Q4 2026\n- Server instances (PostgreSQL 16 High-Availability): 45%\n- S3 Storage & CDN Media hosting: 25%\n- CI/CD build minutes & staging environments: 15%\n- Contingency fund: 15%`,
    },
    {
      feedId: feedProduct.id,
      containerId: 'cont-private-user-vault',
      title: 'SaaS Monetization & Open Source Licensing Framework',
      type: NoteType.SINGLE,
      startDate: '2026-09-02T10:15:00.000Z',
      icon: 'circle-dollar-sign',
      taxonomyPath: 'financials.monetization',
      folders: ['Financials/Q3_Q4', 'Financials'],
      hashtags: ['Financials', 'SaaS', 'Strategy'],
      description: `### Business Model Strategy\nCore headless CMS and Obsidian plugin remain open source (MIT). Enterprise multi-tenant sync and team access control offered as Lemon Cloud Pro.`,
    },

    // ── Core_Strategy (Internal / Private) ────────────────────────────────
    {
      feedId: feedProduct.id,
      containerId: 'cont-private-user-vault',
      title: 'Core Strategic Principles 2026: Privacy-First & Distributed Ownership',
      type: NoteType.PERIOD,
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T23:59:59.000Z',
      icon: 'lock',
      taxonomyPath: 'strategy.core',
      folders: ['Core_Strategy'],
      hashtags: ['CoreStrategy', 'Principles', 'Privacy'],
      description: `### The Three Non-Negotiable Pillars\n1. **User Owns Their Data**: Notes live as plain text Markdown on the local filesystem.\n2. **Privacy by Design**: Private vaults are physically partitioned by container IDs and never broadcast.\n3. **Frictionless Sync**: Delta-based synchronization with deterministic conflict resolution.`,
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
