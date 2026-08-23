import { PrismaClient, NoteType } from '@prisma/client';
import { GeminiService } from '../src/ingestion/services/gemini.service';
import { TmdbService } from '../src/ingestion/services/tmdb.service';
import { HolidaysEngineService } from '../src/ingestion/services/holidays-engine.service';
import { PoliticalEngineService } from '../src/ingestion/services/political-engine.service';
import { ConfigService } from '@nestjs/config';

const prisma = new PrismaClient();

// Simple mock/wrapper of ConfigService for standalone script execution
const configService = new ConfigService({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  TMDB_API_KEY: process.env.TMDB_API_KEY,
});

const gemini = new GeminiService(configService);
const tmdb = new TmdbService(configService);
const holidays = new HolidaysEngineService();
const politics = new PoliticalEngineService();

async function createOrUpdateCalendar(feedSlug: string, feedTitle: string, feedDesc: string) {
  return prisma.feed.upsert({
    where: { slug: feedSlug },
    update: { title: feedTitle, description: feedDesc },
    create: { slug: feedSlug, title: feedTitle, description: feedDesc },
  });
}

async function addNoteProgrammatically(params: {
  feedId: string;
  title: string;
  category: string;
  dateStr: string;
  endDateStr?: string;
  type?: NoteType;
  taxonomyPath: string;
  folderPath: string;
  customPrompt?: string;
  imageUrl?: string;
  sourceLink?: string;
  trailerUrl?: string;
}) {
  console.log(`\n⏳ Generating note for: "${params.title}" (${params.category})...`);

  // 1. Generate rich text with Gemini AI
  const aiResult = await gemini.generateNoteContent(
    params.title,
    params.category,
    params.dateStr,
    params.customPrompt,
  );

  console.log(`✨ AI Generated (${aiResult.description.length} chars, ${aiResult.hashtags.length} hashtags)`);

  // 2. Ensure Taxonomy node
  const cleanTax = params.taxonomyPath.toLowerCase().trim();
  const taxNode = await prisma.taxonomyNode.upsert({
    where: { path: cleanTax },
    update: {},
    create: {
      path: cleanTax,
      name: params.title,
      icon: 'event',
    },
  });

  // 3. Ensure Folder
  const folder = await prisma.folder.upsert({
    where: { path: params.folderPath },
    update: {},
    create: {
      path: params.folderPath,
      name: params.folderPath.split('/').pop() || 'Calendar',
      icon: 'folder',
    },
  });

  // 4. Create Note
  const note = await prisma.note.create({
    data: {
      feedId: params.feedId,
      title: params.title,
      description: aiResult.description,
      type: params.type || NoteType.EVENT,
      startDate: new Date(params.dateStr),
      endDate: params.endDateStr ? new Date(params.endDateStr) : null,
      sourceLink: params.sourceLink,
      tags: {
        connect: [{ id: taxNode.id }],
      },
      folders: {
        create: [
          {
            folderId: folder.id,
            isPrimary: true,
            order: 0,
          },
        ],
      },
    },
  });

  // 5. Connect Hashtags
  for (const ht of aiResult.hashtags) {
    const clean = ht.replace(/^#/, '').toLowerCase().trim();
    if (!clean) continue;
    const hashtag = await prisma.hashtag.upsert({
      where: { name: clean },
      update: {},
      create: { name: clean },
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

  // 6. Connect Image if provided
  if (params.imageUrl) {
    await prisma.noteImage.create({
      data: {
        noteId: note.id,
        url: params.imageUrl,
        filename: `${params.title.slice(0, 20)}.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 102400,
        caption: params.title,
        isMain: true,
        order: 0,
      },
    });
  }

  // 7. Connect Links
  if (params.sourceLink) {
    await prisma.noteLink.create({
      data: {
        noteId: note.id,
        url: params.sourceLink,
        title: 'Официальный источник',
        isSource: true,
        order: 0,
      },
    });
  }

  if (params.trailerUrl) {
    await prisma.noteLink.create({
      data: {
        noteId: note.id,
        url: params.trailerUrl,
        title: 'Официальный трейлер (YouTube)',
        isSource: false,
        order: 1,
      },
    });
  }

  console.log(`✅ Note created: [ID: ${note.id}] "${note.title}"`);
  return note;
}

async function run() {
  console.log('🚀 Programmatic Calendar Generator Starting...');

  // Example: Programmatically create a curated calendar "Русские военные праздники и Дни воинской славы"
  const militaryFeed = await createOrUpdateCalendar(
    'russian-military',
    'Русские военные праздники',
    'Дни воинской славы, великие битвы и памятные даты Вооруженных Сил России.',
  );
  console.log(`📁 Feed ready: ${militaryFeed.title} [slug: ${militaryFeed.slug}]`);

  // Add key entries with Gemini AI generation
  await addNoteProgrammatically({
    feedId: militaryFeed.id,
    title: 'День победы русских полков в Куликовской битве',
    category: 'Дни воинской славы России',
    dateStr: '2026-09-21T00:00:00.000Z',
    type: NoteType.EVENT,
    taxonomyPath: 'holidays.russia.military.kulikovo',
    folderPath: 'Holidays/Russia/Military',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800',
    sourceLink: 'https://ru.wikipedia.org/wiki/Куликовская_битва',
    customPrompt: 'Подчеркни полководческий гений Дмитрия Донского, благословение Сергия Радонежского, поединок Пересвета с Челубеем и удар Засадного полка Владимира Храброго и Дмитрия Боброка.',
  });

  await addNoteProgrammatically({
    feedId: militaryFeed.id,
    title: 'День Бородинского сражения русской армии',
    category: 'Отечественная война 1812 года',
    dateStr: '2026-09-08T00:00:00.000Z',
    type: NoteType.EVENT,
    taxonomyPath: 'holidays.russia.military.borodino',
    folderPath: 'Holidays/Russia/Military',
    imageUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800',
    sourceLink: 'https://ru.wikipedia.org/wiki/Бородинское_сражение',
    customPrompt: 'Опиши генеральное сражение Отечественной войны 1812 года, мужество батареи Раевского, стойкость кавалерии Платова и Уварова, и знаменитые слова Кутузова.',
  });

  console.log('\n🎉 First programmatic calendar generated and populated successfully!');
}

run()
  .catch((err) => {
    console.error('❌ Error generating calendar:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
