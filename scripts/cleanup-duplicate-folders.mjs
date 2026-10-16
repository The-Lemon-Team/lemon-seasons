import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const prismaPath = require.resolve('@prisma/client', { paths: [path.join(process.cwd(), 'apps/backend')] });
const { PrismaClient } = require(prismaPath);
const prisma = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(' 🧹 ОЧИСТКА ДУБЛИКАТОВ ПАПОК В БАЗЕ ДАННЫХ (POSTGRES)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const allFolders = await prisma.folder.findMany({
    orderBy: [{ createdAt: 'asc' }],
    include: {
      _count: {
        select: { noteFolders: true },
      },
      noteFolders: true,
    },
  });

  console.log(`Всего записей Folder в БД: ${allFolders.length}`);

  // Группировка по ключу (containerId + path) в нижнем регистре
  const groups = new Map();
  for (const f of allFolders) {
    const key = `${f.containerId || 'root'}::${f.path.toLowerCase().trim()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(f);
  }

  let totalDupsRemoved = 0;

  for (const [key, items] of groups.entries()) {
    if (items.length <= 1) continue;

    console.log(`\n📁 Обнаружены дубликаты для ключа: "${key}" (${items.length} записей):`);

    // Выбираем главную папку: отдаем приоритет той, где есть привязанные заметки, или самой старой
    items.sort((a, b) => {
      if (b._count.noteFolders !== a._count.noteFolders) {
        return b._count.noteFolders - a._count.noteFolders;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const keeper = items[0];
    const duplicates = items.slice(1);

    console.log(`   ⭐ Сохраняем основную папку: ID=${keeper.id}, Name="${keeper.name}", Notes=${keeper._count.noteFolders}`);

    for (const dup of duplicates) {
      console.log(`   ❌ Удаление дубликата: ID=${dup.id}, Name="${dup.name}", Notes=${dup._count.noteFolders}`);

      // Если у дубликата вдруг есть привязанные заметки, переносим их на keeper
      if (dup.noteFolders && dup.noteFolders.length > 0) {
        for (const nf of dup.noteFolders) {
          const existsOnKeeper = await prisma.noteFolder.findUnique({
            where: {
              noteId_folderId: {
                noteId: nf.noteId,
                folderId: keeper.id,
              },
            },
          });

          if (!existsOnKeeper) {
            await prisma.noteFolder.update({
              where: { id: nf.id },
              data: { folderId: keeper.id },
            });
            console.log(`      ↪️ Заметка ${nf.noteId} перепривязана к keeper`);
          } else {
            await prisma.noteFolder.delete({
              where: { id: nf.id },
            });
          }
        }
      }

      // Удаляем дубликат папки
      await prisma.folder.delete({
        where: { id: dup.id },
      });
      totalDupsRemoved++;
    }
  }

  const remainingFolders = await prisma.folder.count();
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(` 🎉 ОЧИСТКА ЗАВЕРШЕНА! Удалено фантомных дубликатов: ${totalDupsRemoved}`);
  console.log(` 📂 Осталось уникальных папок в БД: ${remainingFolders}`);
  console.log('═══════════════════════════════════════════════════════════════════════');
}

main()
  .catch((err) => {
    console.error('Ошибка очистки:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
