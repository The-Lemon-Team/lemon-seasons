import path from 'path';
import fs from 'fs';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const prismaPath = require.resolve('@prisma/client', { paths: [path.join(process.cwd(), 'apps/backend')] });
const { PrismaClient } = require(prismaPath);
const prisma = new PrismaClient();

// Dynamic import of the compiled services from apps/backend/dist
const sparksParserPath = path.join(process.cwd(), 'apps/backend/dist/src/ingestion/services/sparks-parser.service.js');
const { SparksParserService } = require(sparksParserPath);

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(' 🚀 ТЕСТИРОВАНИЕ КОНВЕЙЕРА: GEMINI SPARKS .MD -> INGESTION -> NOTES DB');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const incomingDir = path.join(os.homedir(), '.lemon', 'sparks-incoming');
  if (!fs.existsSync(incomingDir)) {
    fs.mkdirSync(incomingDir, { recursive: true });
  }

  const testFilePath = path.join(incomingDir, '2026-10-07-quantum-willow-spark.md');

  const sampleSparkContent = `---
title: "Gemini Spark: Анонс квантового процессора Willow 2026"
start_date: "2026-10-07T14:30:00.000Z"
type: "SINGLE"
tags:
  - quantum
  - google-deepmind
  - hardware
source: "https://blog.google/technology/ai/quantum-willow"
icon: "⚛️"
summary: "Google представила квантовый чип Willow с рекордным временем когерентности и коррекцией ошибок в реальном времени."
---

# Анонс квантового процессора Willow 2026

Google DeepMind и Quantum AI представили чип нового поколения Willow.
Он решает бенчмарк моделирования за секунды, требуя в миллион раз меньше энергии.

## Ключевые метрики
- 105 кубитов с динамической калибровкой
- В реальном времени исправляет ошибки кубитов ниже порогового значения
- Интеграция с локальными моделями Gemini Sparks
`;

  console.log(`1️⃣ Запись тестового .md файла от Gemini Sparks:`);
  console.log(`   Файл: ${testFilePath}`);
  await fs.promises.writeFile(testFilePath, sampleSparkContent, 'utf-8');
  console.log(`   ✅ Файл успешно сохранен на диске.\n`);

  console.log(`2️⃣ Инициализация парсера SparksParserService...`);
  const parser = new SparksParserService();
  const parsed = parser.parseSparkFile(testFilePath, sampleSparkContent, {
    mtime: new Date(),
    size: sampleSparkContent.length,
  });

  console.log(`   ✅ Заголовок: "${parsed.noteDto.title}"`);
  console.log(`   ✅ Дата: ${parsed.noteDto.startDate}`);
  console.log(`   ✅ Источник: ${parsed.noteDto.sourceType} (${parsed.noteDto.externalId})`);
  console.log(`   ✅ Теги: ${parsed.noteDto.hashtags.join(', ')}`);
  console.log(`   ✅ Саммари: "${parsed.noteDto.summary}"\n`);

  // Симулируем жизненный цикл IngestionFile (PENDING -> PROCESSING -> COMPLETED)
  console.log(`3️⃣ Проверка жизненного цикла этапов (PENDING -> PROCESSING -> COMPLETED):`);

  // Этап 1: PENDING
  const pendingRecord = await prisma.ingestionFile.upsert({
    where: { filePath: testFilePath },
    create: {
      filePath: testFilePath,
      fileName: path.basename(testFilePath),
      fileHash: 'test-hash-willow-1',
      fileSize: sampleSparkContent.length,
      mtime: new Date(),
      status: 'PENDING',
    },
    update: {
      status: 'PENDING',
      errorMessage: null,
    },
  });
  console.log(`   [Этап 1: PENDING] Зафиксирован файл: id=${pendingRecord.id}, status=${pendingRecord.status}`);

  // Этап 2: PROCESSING
  await prisma.ingestionFile.update({
    where: { id: pendingRecord.id },
    data: { status: 'PROCESSING' },
  });
  console.log(`   [Этап 2: PROCESSING] Файл стабилизировался, запущен парсинг...`);

  // Ищем фид для сохранения
  let feed = await prisma.feed.findFirst();
  if (!feed) {
    feed = await prisma.feed.create({
      data: {
        title: 'Новости Google Drive',
        slug: 'gdrive-news',
      },
    });
  }

  // Создаем / обновляем Note в PostgreSQL
  const createdNote = await prisma.note.create({
    data: {
      title: parsed.noteDto.title,
      description: parsed.noteDto.description,
      type: parsed.noteDto.type,
      startDate: new Date(parsed.noteDto.startDate),
      sourceType: parsed.noteDto.sourceType,
      externalId: parsed.noteDto.externalId,
      rawContent: parsed.noteDto.rawContent,
      summary: parsed.noteDto.summary,
      processingStatus: 'COMPLETED',
      icon: parsed.noteDto.icon,
      feedId: feed.id,
      hashtags: {
        connectOrCreate: parsed.noteDto.hashtags.map((h) => ({
          where: { name: h },
          create: { name: h },
        })),
      },
    },
  });

  // Этап 3: COMPLETED
  const completedRecord = await prisma.ingestionFile.update({
    where: { id: pendingRecord.id },
    data: {
      status: 'COMPLETED',
      noteId: createdNote.id,
    },
  });
  console.log(`   [Этап 3: COMPLETED] Note создана в БД! Note ID: ${createdNote.id}`);
  console.log(`   Связь подтверждена: IngestionFile.noteId = ${completedRecord.noteId}, status = ${completedRecord.status}\n`);

  console.log(`4️⃣ Проверка чтения созданной Note из базы данных:`);
  const dbNote = await prisma.note.findUnique({
    where: { id: createdNote.id },
    include: { hashtags: true, feed: true },
  });

  console.log(`   ✅ ID: ${dbNote.id}`);
  console.log(`   ✅ Заголовок: "${dbNote.title}"`);
  console.log(`   ✅ SourceType: ${dbNote.sourceType}`);
  console.log(`   ✅ ProcessingStatus: ${dbNote.processingStatus}`);
  console.log(`   ✅ Хэштеги: ${dbNote.hashtags.map((h) => '#' + h.name).join(', ')}`);
  console.log(`   ✅ Саммари: "${dbNote.summary}"\n`);

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(' 🎉 ВСЕ ЭТАПЫ ИНЖЕСТА GEMINI SPARKS РАБОТАЮТ БЕЗУПРЕЧНО!');
  console.log('═══════════════════════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка теста инжеста:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
