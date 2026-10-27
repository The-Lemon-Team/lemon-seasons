import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://lemon:lemon_secret@localhost:5435/lemon_calendarium?schema=public';
}

const prismaPath = require.resolve('@prisma/client', { paths: [path.join(process.cwd(), 'apps/backend')] });
const { PrismaClient } = require(prismaPath);
const prisma = new PrismaClient();

const sparksParserPath = path.join(process.cwd(), 'apps/backend/dist/src/ingestion/services/sparks-parser.service.js');
const { SparksParserService } = require(sparksParserPath);
const parser = new SparksParserService();

const sparksDir = process.env.SPARKS_INCOMING_DIR || 'C:/Users/Ilege/Мой диск/spark';

async function findMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.')) {
        files.push(...(await findMarkdownFiles(fullPath)));
      }
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      // Exclude template, config files and folder meta-notes
      const lowerName = entry.name.toLowerCase();
      if (!lowerName.includes('template') && !entry.name.startsWith('_') && !lowerName.includes('config')) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

async function resolveFeed(subfolder, baseDir) {
  let targetSlug = 'spark-general';
  let targetTitle = 'Spark — Общая лента';
  let targetDesc = 'Автоматически импортированные новости и дайджесты из Google Drive';

  if (subfolder) {
    const lower = subfolder.toLowerCase();
    targetSlug = `spark-${lower.replace(/[^a-z0-9а-яё]/gi, '-')}`;
    targetTitle = `${subfolder} (Spark)`;
    targetDesc = `Тематическая новостная лента по категории ${subfolder} от Spark`;

    // Динамическое считывание настроек канала из _channel.md
    if (baseDir) {
      const channelConfigPath = path.join(baseDir, subfolder, '_channel.md');
      if (fs.existsSync(channelConfigPath)) {
        try {
          const rawContent = await fs.promises.readFile(channelConfigPath, 'utf-8');
          const fmMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
          if (fmMatch) {
            const yamlLines = fmMatch[1].split(/\r?\n/);
            for (const line of yamlLines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('title:')) {
                targetTitle = trimmed.replace(/^title:\s*["']?/, '').replace(/["']?$/, '').trim() || targetTitle;
              } else if (trimmed.startsWith('slug:')) {
                targetSlug = trimmed.replace(/^slug:\s*["']?/, '').replace(/["']?$/, '').trim() || targetSlug;
              } else if (trimmed.startsWith('description:')) {
                targetDesc = trimmed.replace(/^description:\s*["']?/, '').replace(/["']?$/, '').trim() || targetDesc;
              }
            }
          }
        } catch (err) {
          console.warn(`⚠️ Не удалось прочитать конфиг канала в ${channelConfigPath}: ${err.message}`);
        }
      }
    }
  }

  let feed = await prisma.feed.findUnique({ where: { slug: targetSlug } });
  if (!feed) {
    feed = await prisma.feed.create({
      data: {
        slug: targetSlug,
        title: targetTitle,
        description: targetDesc,
      },
    });
    console.log(`✨ [FEED CREATED] "${targetTitle}" [slug: ${targetSlug}]`);
  } else if (feed.title !== targetTitle || (targetDesc && feed.description !== targetDesc)) {
    feed = await prisma.feed.update({
      where: { id: feed.id },
      data: {
        title: targetTitle,
        description: targetDesc,
      },
    });
    console.log(`🔄 [FEED UPDATED] "${targetTitle}" [slug: ${targetSlug}]`);
  }
  return feed;
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(' 🚀 НАПОЛНЕНИЕ БАЗЫ ДАННЫХ ИЗ GOOGLE DRIVE SPARK (.MD)');
  console.log(` 📂 Директория: ${sparksDir}`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const files = await findMarkdownFiles(sparksDir);
  console.log(`🔍 Найдено .md файлов: ${files.length}\n`);

  if (files.length === 0) {
    console.log('⚠️ Файлов не найдено. Проверьте путь к папке Google Drive.');
    return;
  }

  let insertedCount = 0;
  let updatedCount = 0;
  const feedStats = {};

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const stats = await fs.promises.stat(filePath);

    const rel = path.relative(sparksDir, filePath);
    const parts = rel.split(path.sep);
    const subfolder = parts.length > 1 ? parts[0] : null;

    const parsed = parser.parseSparkFile(filePath, content, {
      mtime: stats.mtime,
      size: stats.size,
    });

    const feed = await resolveFeed(subfolder, sparksDir);
    feedStats[feed.title] = (feedStats[feed.title] || 0) + 1;

    // Check if Note already exists by externalId (filePath) or title
    let existingNote = await prisma.note.findFirst({
      where: {
        OR: [
          { externalId: filePath },
          { title: parsed.noteDto.title },
        ],
      },
    });

    const dto = parsed.noteDto;
    const noteData = {
      title: dto.title,
      description: dto.description,
      type: dto.type,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      sourceType: 'GOOGLE_DRIVE',
      externalId: filePath,
      sourceLink: dto.sourceLink,
      rawContent: dto.rawContent,
      summary: dto.summary,
      icon: dto.icon,
      author: dto.author || dto.curator,
      curator: dto.author || dto.curator,
      resonanceScore: dto.resonanceScore ?? null,
      metadata: dto.metadata,
      processingStatus: 'COMPLETED',
      feedId: feed.id,
    };

    let noteId;
    if (existingNote) {
      const updated = await prisma.note.update({
        where: { id: existingNote.id },
        data: noteData,
      });
      noteId = updated.id;
      updatedCount++;
      console.log(`🔄 [UPDATED] "${dto.title.slice(0, 50)}..." [${parsed.timeSlot}]`);
    } else {
      const created = await prisma.note.create({
        data: {
          ...noteData,
          hashtags: {
            connectOrCreate: dto.hashtags.map((h) => ({
              where: { name: h },
              create: { name: h },
            })),
          },
        },
      });
      noteId = created.id;
      insertedCount++;
      console.log(`✨ [INSERTED] "${dto.title.slice(0, 50)}..." [${parsed.timeSlot}] (${dto.icon})`);
    }

    // Upsert IngestionFile
    await prisma.ingestionFile.upsert({
      where: { filePath },
      create: {
        filePath,
        fileName,
        fileHash: 'sha256-' + stats.size,
        fileSize: stats.size,
        mtime: stats.mtime,
        status: 'COMPLETED',
        noteId,
      },
      update: {
        status: 'COMPLETED',
        noteId,
        mtime: stats.mtime,
      },
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(' 🎉 НАПОЛНЕНИЕ БАЗЫ ЗАВЕРШЕНО УСПЕШНО!');
  console.log(` 📥 Новых создано: ${insertedCount}`);
  console.log(` 🔄 Обновлено:    ${updatedCount}`);
  console.log(' 📊 Распределение по лентам (Feeds):');
  for (const [fTitle, count] of Object.entries(feedStats)) {
    console.log(`    - ${fTitle}: ${count} новостей`);
  }
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Automatic cross-link resolution
  const { runResolution } = await import('./resolve-db-related-notes.mjs');
  await runResolution();
}

run()
  .catch((e) => {
    console.error('❌ Ошибка при наполнении базы:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
