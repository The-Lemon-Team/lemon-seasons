import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const prismaPath = require.resolve('@prisma/client', { paths: [path.join(process.cwd(), 'apps/backend')] });
const { PrismaClient } = require(prismaPath);
const prisma = new PrismaClient();

async function main() {
  const folders = await prisma.folder.findMany({
    orderBy: [{ path: 'asc' }, { createdAt: 'asc' }],
    include: {
      _count: {
        select: { noteFolders: true },
      },
    },
  });

  console.log(`Всего папок в БД: ${folders.length}`);

  const byPath = {};
  for (const f of folders) {
    const key = `${f.path} (container: ${f.containerId || 'null'})`;
    if (!byPath[key]) byPath[key] = [];
    byPath[key].push(f);
  }

  console.log('\n--- Папки с дубликатами: ---');
  let duplicateCount = 0;
  for (const [key, list] of Object.entries(byPath)) {
    if (list.length > 1) {
      duplicateCount++;
      console.log(`\n📁 Путь: "${key}" (${list.length} копий):`);
      list.forEach((item, idx) => {
        console.log(`   [${idx + 1}] ID: ${item.id}, Name: "${item.name}", NotesCount: ${item._count.noteFolders}, CreatedAt: ${item.createdAt.toISOString()}`);
      });
    }
  }

  console.log(`\nИтого дублирующихся путей: ${duplicateCount}`);
}

main().finally(() => prisma.$disconnect());
