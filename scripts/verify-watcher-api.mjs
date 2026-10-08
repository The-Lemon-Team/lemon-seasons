import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const prismaPath = require.resolve('@prisma/client', { paths: [path.join(process.cwd(), 'apps/backend')] });
const { PrismaClient } = require(prismaPath);
const prisma = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(' 🔍 ПРОВЕРКА СОСТОЯНИЯ INGESTION В БАЗЕ ДАННЫХ И СТАТИСТИКИ');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const filesCount = await prisma.ingestionFile.count();
  const completedCount = await prisma.ingestionFile.count({ where: { status: 'COMPLETED' } });
  const pendingCount = await prisma.ingestionFile.count({ where: { status: 'PENDING' } });
  const failedCount = await prisma.ingestionFile.count({ where: { status: 'FAILED' } });

  console.log(`📊 Всего файлов в журнале IngestionFile: ${filesCount}`);
  console.log(`   - COMPLETED: ${completedCount}`);
  console.log(`   - PENDING:   ${pendingCount}`);
  console.log(`   - FAILED:    ${failedCount}\n`);

  const recentFiles = await prisma.ingestionFile.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' },
    include: {
      note: {
        select: {
          id: true,
          title: true,
          processingStatus: true,
          startDate: true,
        },
      },
    },
  });

  console.log('📋 Последние записи:');
  recentFiles.forEach((f, idx) => {
    console.log(`  ${idx + 1}. [${f.status}] ${f.fileName}`);
    console.log(`     Note ID: ${f.noteId || 'none'} | Note Title: ${f.note?.title || 'none'}`);
    console.log(`     ProcessingStatus: ${f.note?.processingStatus || 'none'}`);
    console.log(`     Обновлен: ${f.updatedAt.toISOString()}\n`);
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
