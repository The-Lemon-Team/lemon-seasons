import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const prismaPath = require.resolve('@prisma/client', { paths: [path.join(process.cwd(), 'apps/backend')] });
const { PrismaClient } = require(prismaPath);
const prisma = new PrismaClient();

const nestCorePath = require.resolve('@nestjs/core', { paths: [path.join(process.cwd(), 'apps/backend')] });
const { NestFactory } = require(nestCorePath);
const appModulePath = path.join(process.cwd(), 'apps/backend/dist/src/app.module.js');
const { AppModule } = require(appModulePath);

const notesIngestPath = path.join(process.cwd(), 'apps/backend/dist/src/notes/notes-ingest.service.js');
const { NotesIngestService } = require(notesIngestPath);

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(' 🚀 ТЕСТИРОВАНИЕ INGESTION REST API (POST /notes/ingest)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log('⏳ Инициализация NestJS контекста приложения...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const ingestService = app.get(NotesIngestService);

  const testExternalId = `defi-chat-thread-${Date.now()}`;

  // ── ТЕСТ 1: Экспресс-импорт инсайта из Defi Chat ────────────────────────────
  console.log('1️⃣ Тест импорта инсайта из Defi Local Hosted...');
  const res1 = await ingestService.ingest({
    title: 'Defi AI: Анализ доходности концентрированной ликвидности в Arbitrum',
    content: `### Сводка исследования
При текущей волатильности ETH/USDC узкие диапазоны в Uniswap v3 дают годовую доходность 28.4% APR.

> Риск непостоянных потерь (IL) компенсируется высокими комиссионными сборами при ребалансировке раз в 48 часов.

Рекомендовано автоматизировать пулы через смарт-контракты хранилищ.`,
    sourceType: 'DEFI_CHAT',
    sourceUrl: 'http://localhost:3000/chats/defi-curator-ivan',
    externalId: testExternalId,
    tags: ['defi', 'crypto', 'liquidity', 'arbitrum'],
    date: '2026-10-08T08:00:00.000Z',
    summary: 'Узкие диапазоны Uniswap v3 на Arbitrum приносят 28.4% APR при контроле волатильности.',
    icon: '💎',
    metadata: {
      model: 'gemini-2.5-pro',
      curator: 'ivan_white',
      threadId: '42',
      confidence: 0.94,
    },
  });

  console.log(`   ✅ Действие: ${res1.action}`);
  console.log(`   ✅ Note ID:  ${res1.noteId}`);
  console.log(`   ✅ Заголовок: "${res1.note.title}"`);
  console.log(`   ✅ SourceType: ${res1.note.sourceType}`);
  console.log(`   ✅ Status:     ${res1.note.processingStatus}\n`);

  // ── ТЕСТ 2: Идемпотентность (повторный вызов с тем же externalId) ───────────
  console.log('2️⃣ Тест идемпотентности (повторный экспорт того же треда с изменениями)...');
  const res2 = await ingestService.ingest({
    title: 'Defi AI: Анализ доходности ликвидности (ОБНОВЛЕНО: + Базовые риски)',
    content: `### Обновленная сводка
Добавлен анализ проскальзывания при выводе крупных позиций.`,
    sourceType: 'DEFI_CHAT',
    externalId: testExternalId, // Тот же ID!
    tags: ['defi', 'crypto', 'updated'],
  });

  console.log(`   ✅ Действие: ${res2.action} (ожидается UPDATED)`);
  console.log(`   ✅ Note ID:  ${res2.noteId} (должен совпасть с предыдущим: ${res1.noteId === res2.noteId})`);
  console.log(`   ✅ Заголовок обновлен: "${res2.note.title}"\n`);

  if (res1.noteId !== res2.noteId || res2.action !== 'UPDATED') {
    throw new Error('Идемпотентность не сработала: создана новая запись вместо обновления существующей!');
  }

  // ── ТЕСТ 3: Авто-извлечение заголовка из первой строки контента ─────────────
  console.log('3️⃣ Тест авто-извлечения заголовка без явного title...');
  const res3 = await ingestService.ingest({
    content: `# Прорыв в алгоритмах квантовой устойчивости zk-SNARKs\n\nИсследователи представили новый протокол постквантовой криптографии.`,
    sourceType: 'WEB_CLIP',
    tags: ['zk-proofs', 'cryptography'],
  });

  console.log(`   ✅ Авто-заголовок: "${res3.note.title}"`);
  console.log(`   ✅ Feed: ${res3.note.feedId ? 'Привязан' : 'Без фида'}\n`);

  // ── ТЕСТ 4: Проверка записи в базе данных ──────────────────────────────────
  console.log('4️⃣ Проверка данных через прямой запрос Prisma...');
  const noteInDb = await prisma.note.findUnique({
    where: { id: res1.noteId },
    include: {
      hashtags: true,
      feed: true,
    },
  });

  console.log(`   ✅ Найдена Note: "${noteInDb.title}"`);
  console.log(`   ✅ Фид: ${noteInDb.feed?.title} (slug: ${noteInDb.feed?.slug})`);
  console.log(`   ✅ Хэштеги: ${noteInDb.hashtags.map((h) => '#' + h.name).join(', ')}`);
  console.log(`   ✅ ProcessingStatus: ${noteInDb.processingStatus}`);
  console.log(`   ✅ Metadata: ${JSON.stringify(noteInDb.metadata)}`);

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(' 🎉 ВСЕ ТЕСТЫ INGESTION REST API ПРОЙДЕНЫ УСПЕШНО!');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  await app.close();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Ошибка тестирования Ingest API:', e);
  process.exit(1);
});
