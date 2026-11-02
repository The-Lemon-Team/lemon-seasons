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

export const UNIVERSAL_RELATED_SECTION_REGEX =
  /(?:(?:\r?\n|^)---)?\s*(?:\r?\n|^)##\s*🔗?\s*(?:Связанные\s+(?:записи|файлы|заметки|материалы(?:[^\r\n]*)?)|Источники\s+и\s+(?:связи|материалы(?:[^\r\n]*)?)|Связи(?:\s*\(Граф\s+знаний\))?|Полный\s+перечень\s+заметок\s+выпуска)[\s\S]*$/i;

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
      sourceLink: true,
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
    const meta = n.metadata || {};
    let items = Array.isArray(meta.relatedNotes) ? [...meta.relatedNotes] : [];
    let cleanedDesc = n.description;
    let descriptionModified = false;
    let extractedSourceLink = undefined;

    // 1. Check if description has trailing related section
    if (n.description && UNIVERSAL_RELATED_SECTION_REGEX.test(n.description)) {
      const match = n.description.match(UNIVERSAL_RELATED_SECTION_REGEX);
      if (match) {
        const rawSection = match[0].trim();
        cleanedDesc = n.description.replace(UNIVERSAL_RELATED_SECTION_REGEX, '').trim();
        descriptionModified = true;
        cleanedDescriptionsCount++;

        // Extract wikilinks and semantic metadata if items is empty
        if (items.length === 0) {
          const sectionWithoutComments = rawSection.replace(/<!--[\s\S]*?-->/g, '');
          const lines = sectionWithoutComments.split(/\r?\n/);
          const linksSet = new Set();

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;

            // Extract primary source if available
            const sourceMatch = line.match(
              /(?:Первоисточник|Ссылка\s+на\s+первоисточник|Источник):\s*(?:\[(.*?)\]\((https?:\/\/[^\s\)]+)\)|(https?:\/\/[^\s\)]+))/i,
            );
            if (sourceMatch && !extractedSourceLink) {
              extractedSourceLink = sourceMatch[2] || sourceMatch[3];
            }

            const wikiMatches = [...line.matchAll(/\[\[(.*?)\]\]/g)];
            if (wikiMatches.length === 0) continue;

            let role = 'related';
            let relation = undefined;
            let isParent = false;

            if (/Сводный\s+выпуск|Сводка/i.test(line)) {
              role = 'parent';
              isParent = true;
            } else if (/Сценарий\s+подкаста|Подкаст/i.test(line)) {
              role = 'podcast';
            } else {
              const kgMatch = line.match(/Связано\s+с\s+([^:]+):/i);
              if (kgMatch) {
                role = 'knowledge_graph';
                relation = kgMatch[1].trim();
              }
            }

            for (const m of wikiMatches) {
              const link = m[1].trim();
              if (!link || link.toLowerCase().includes('другая заметка') || linksSet.has(link)) continue;
              linksSet.add(link);

              const pipeIdx = link.indexOf('|');
              const targetName = pipeIdx >= 0 ? link.slice(0, pipeIdx).trim() : link;
              const alias = pipeIdx >= 0 ? link.slice(pipeIdx + 1).trim() : undefined;
              const cleanTitle = targetName
                .replace(/^\d{2}\.\d{2}\.\d{2,4}\s*[-_—–]?\s*/, '')
                .replace(/^\d{4}-\d{2}-\d{2}\s*[-_—–]?\s*/, '')
                .trim();

              items.push({
                raw: link,
                cleanTitle: cleanTitle || targetName,
                alias,
                resolved: false,
                role,
                relation,
                isParent,
                isVaultDoc: targetName.startsWith('00 - ') || targetName.toLowerCase().includes('источники'),
              });
            }
          }
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

      // Vault doc guard: only match if target specifically contains '00' or 'источники анонсов'
      if (isVaultDoc) {
        const vaultTarget = allNotes.find((other) => {
          if (other.id === n.id) return false;
          const otherNormTitle = normalize(other.title);
          const otherFile = other.metadata?.fileName || '';
          const otherNormFile = normalize(otherFile);
          return otherNormTitle.includes('00') || otherNormFile.includes('00') || otherNormTitle.includes('реестр источников');
        });

        if (vaultTarget) {
          noteResolvedCount++;
          return {
            ...item,
            resolved: true,
            targetNoteId: vaultTarget.id,
            targetTitle: vaultTarget.title,
            targetType: vaultTarget.type,
            targetIcon: vaultTarget.icon || undefined,
            targetAuthor: vaultTarget.author || undefined,
            targetCurator: vaultTarget.author || undefined,
            targetDate: typeof vaultTarget.startDate === 'string' ? vaultTarget.startDate : vaultTarget.startDate.toISOString(),
            isParent: false,
          };
        }
        return { ...item, resolved: false };
      }

      // Tier 1: Exact normalized title or exact filename match
      let target = allNotes.find((other) => {
        if (other.id === n.id) return false;
        const otherNormTitle = normalize(other.title);
        const otherFile = other.metadata?.fileName || '';
        const otherNormFile = normalize(otherFile);
        return normLink === otherNormTitle || (otherNormFile && normLink === otherNormFile);
      });

      // Tier 2: Substring match (length > 8)
      if (!target) {
        target = allNotes.find((other) => {
          if (other.id === n.id) return false;
          const otherNormTitle = normalize(other.title);
          const otherFile = other.metadata?.fileName || '';
          const otherNormFile = normalize(otherFile);
          if (normLink.length > 8 && otherNormTitle.includes(normLink)) return true;
          if (otherNormTitle.length > 8 && normLink.includes(otherNormTitle)) return true;
          if (otherNormFile && normLink.length > 8 && otherNormFile.includes(normLink)) return true;
          if (otherNormFile && otherNormFile.length > 8 && normLink.includes(otherNormFile)) return true;
          return false;
        });
      }

      // Tier 3: Keyword overlap match (>= 65% overlap)
      if (!target) {
        const linkWords = normLink.split(' ').filter((w) => w.length > 3);
        if (linkWords.length >= 3) {
          let bestTarget = null;
          let bestScore = 0;
          for (const other of allNotes) {
            if (other.id === n.id) continue;
            const otherNormTitle = normalize(other.title);
            const otherTitleWords = new Set(otherNormTitle.split(' ').filter((w) => w.length > 3));
            if (otherTitleWords.size < 3) continue;

            let common = 0;
            for (const w of linkWords) {
              if (otherTitleWords.has(w)) common++;
            }
            const score = common / linkWords.length;
            if (score >= 0.65 && score > bestScore) {
              bestScore = score;
              bestTarget = other;
            }
          }
          if (bestTarget) {
            target = bestTarget;
          }
        }
      }

      if (target) {
        noteResolvedCount++;
        const isParent =
          Boolean(item.isParent || item.role === 'parent') ||
          (target.type === 'PERIOD' && n.type !== 'PERIOD');

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
    const updateData = {
      description: cleanedDesc,
      parentNoteId: assignedParentId || null,
      metadata: {
        ...meta,
        relatedNotes: resolvedItems,
      },
    };

    if (extractedSourceLink && !n.sourceLink) {
      updateData.sourceLink = extractedSourceLink;
    }

    await prisma.note.update({
      where: { id: n.id },
      data: updateData,
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
