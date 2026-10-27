import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const prismaPath = require.resolve('@prisma/client', { paths: [path.join(process.cwd(), 'apps/backend')] });
const { PrismaClient } = require(prismaPath);
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://lemon:lemon_secret@localhost:5435/lemon_calendarium?schema=public',
    },
  },
});

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/^\d{2}\.\d{2}\.\d{2,4}\s*[-_—–]?\s*/, '')
    .replace(/^\d{4}-\d{2}-\d{2}\s*[-_—–]?\s*/, '')
    .replace(/\.md$/i, '')
    .replace(/[\s\-_—–\.:,()\[\]«»""'']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function runResolution() {
  console.log('🚀 [RELOAD] Запуск разрешения связанных заметок и перелинковки в базе данных...');

  const allNotes = await prisma.note.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      type: true,
      startDate: true,
      icon: true,
      author: true,
      description: true,
      rawContent: true,
      parentNoteId: true,
      metadata: true,
      externalId: true,
    },
  });

  console.log(`📊 Всего активных заметок в пуле: ${allNotes.length}`);

  let cleanedDescriptionsCount = 0;
  let totalLinksCount = 0;
  let resolvedLinksCount = 0;
  let parentAssignedCount = 0;
  let notesWithLinksCount = 0;

  for (const n of allNotes) {
    const meta = (n.metadata || {});
    let items = Array.isArray(meta.relatedNotes) ? [...meta.relatedNotes] : [];
    let cleanedDesc = n.description;
    let descriptionModified = false;

    // 1. Check if description has trailing ## 🔗 Связанные записи
    if (n.description && /##\s*🔗?\s*Связанные\s+(?:записи|файлы|заметки)/i.test(n.description)) {
      const sectionRegex = /(?:(?:\r?\n|^)---)?\s*(?:\r?\n|^)##\s*🔗?\s*Связанные\s+(?:записи|файлы|заметки)[\s\S]*$/i;
      const match = n.description.match(sectionRegex);
      if (match) {
        const rawSection = match[0].trim();
        cleanedDesc = n.description.replace(sectionRegex, '').trim();
        descriptionModified = true;
        cleanedDescriptionsCount++;

        // Extract wikilinks from this section if items is empty
        if (items.length === 0) {
          const sectionWithoutComments = rawSection.replace(/<!--[\s\S]*?-->/g, '');
          const wikiMatches = [...sectionWithoutComments.matchAll(/\[\[(.*?)\]\]/g)]
            .map((m) => m[1].trim())
            .filter((l) => l && !l.toLowerCase().includes('другая заметка'));

          items = wikiMatches.map((link) => {
            const pipeIdx = link.indexOf('|');
            const targetName = pipeIdx >= 0 ? link.slice(0, pipeIdx).trim() : link;
            const alias = pipeIdx >= 0 ? link.slice(pipeIdx + 1).trim() : undefined;
            const cleanTitle = targetName
              .replace(/^\d{2}\.\d{2}\.\d{2,4}\s*[-_—–]?\s*/, '')
              .replace(/^\d{4}-\d{2}-\d{2}\s*[-_—–]?\s*/, '')
              .trim();
            return {
              raw: link,
              cleanTitle: cleanTitle || targetName,
              alias,
              resolved: false,
              isVaultDoc: targetName.startsWith('00 - ') || targetName.toLowerCase().includes('источники'),
            };
          });
        }
      }
    }

    if (items.length === 0) {
      if (descriptionModified) {
        await prisma.note.update({
          where: { id: n.id },
          data: { description: cleanedDesc },
        });
      }
      continue;
    }

    notesWithLinksCount++;
    totalLinksCount += items.length;

    let noteResolvedCount = 0;
    let assignedParentId = n.parentNoteId;

    const resolvedItems = items.map((item) => {
      const link = item.raw || item.cleanTitle;
      const normLink = normalize(link);
      const isVaultDoc = item.isVaultDoc || normLink.startsWith('00') || normLink.includes('источники анонсов');

      const target = allNotes.find((other) => {
        if (other.id === n.id) return false;
        const otherNormTitle = normalize(other.title);
        const otherFile = other.metadata?.fileName || '';
        const otherNormFile = normalize(otherFile);

        // Vault doc guard: only match if target specifically contains '00' or 'источники анонсов'
        if (isVaultDoc) {
          return otherNormTitle.includes('00') || otherNormFile.includes('00') || otherNormTitle.includes('реестр источников');
        }

        // 1. Direct file or link substring match
        if (otherFile && otherFile.toLowerCase().includes(link.toLowerCase())) return true;
        if (normLink.length > 5 && otherNormFile.includes(normLink)) return true;
        if (normLink.length > 5 && otherNormFile.length > 8 && normLink.includes(otherNormFile)) return true;

        // 2. Title matching
        if (normLink.length > 5 && otherNormTitle.includes(normLink)) return true;
        if (normLink.length > 5 && otherNormTitle.length > 8 && normLink.includes(otherNormTitle)) return true;

        // 3. Keyword overlap match
        const linkWords = normLink.split(' ').filter((w) => w.length > 3);
        const titleWords = otherNormTitle.split(' ').filter((w) => w.length > 3);
        if (linkWords.length >= 3 && titleWords.length >= 3) {
          const common = linkWords.filter((w) => titleWords.includes(w));
          if (common.length >= Math.min(3, Math.floor(linkWords.length * 0.6))) {
            return true;
          }
        }

        return false;
      });

      if (target) {
        noteResolvedCount++;
        const isParent = target.type === 'PERIOD' && n.type !== 'PERIOD';
        if (isParent && !assignedParentId) {
          assignedParentId = target.id;
          parentAssignedCount++;
        }

        return {
          ...item,
          resolved: true,
          targetNoteId: target.id,
          targetTitle: target.title,
          targetType: target.type,
          targetIcon: target.icon || undefined,
          targetAuthor: target.author || undefined,
          targetCurator: target.author || undefined,
          targetDate: typeof target.startDate === 'string' ? target.startDate : target.startDate.toISOString(),
          isParent,
        };
      }

      return {
        ...item,
        resolved: false,
      };
    });

    resolvedLinksCount += noteResolvedCount;

    // Update note in database
    await prisma.note.update({
      where: { id: n.id },
      data: {
        description: cleanedDesc,
        parentNoteId: assignedParentId || null,
        metadata: {
          ...meta,
          relatedNotes: resolvedItems,
        },
      },
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(' 🎉 РАЗРЕШЕНИЕ СВЯЗАННЫХ ФАЙЛОВ И ЗАМЕТОК ЗАВЕРШЕНО!');
  console.log(` 📝 Обработано заметок со ссылками:       ${notesWithLinksCount}`);
  console.log(` 🧹 Очищено описаний от сырого хвоста:    ${cleanedDescriptionsCount}`);
  console.log(` 🔗 Всего ссылок проверено:               ${totalLinksCount}`);
  console.log(` ✅ Успешно разрезолвлено связей:         ${resolvedLinksCount} (${((resolvedLinksCount / (totalLinksCount || 1)) * 100).toFixed(1)}%)`);
  console.log(` 👨‍👦 Привязано родительских дайджестов:  ${parentAssignedCount}`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');
}

if (process.argv[1] && process.argv[1].endsWith('resolve-db-related-notes.mjs')) {
  runResolution()
    .catch((err) => {
      console.error('❌ Ошибка разрешения ссылок:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
