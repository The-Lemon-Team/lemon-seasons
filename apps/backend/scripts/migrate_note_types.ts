import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const GENUINE_PERIOD_IDS = new Set([
  // Religious periods
  'Ханука',
  'Период Адвента',
  'XXI Саммит',
  'Конференция ООН по климату COP31',
  'Q4 Content Strategy Review',
  'Суккот',
  '81-я сессия Генеральной Ассамблеи ООН',
  'Рош ха-Шана',
  'Timeline View & Chronological Hub Specifications',
  'Q3-Q4 2026 Cloud Infrastructure',
  'XVIII Саммит БРИКС 2026',
  'Курбан-байрам',
  'Шавуот',
  'Песах',
  'Ураза-байрам',
  'Великий пост 2026',
  'Католический Великий пост 2026',
  'Священный месяц Рамадан 2026',
  'Китайский Новый год',
  'Всемирный экономический форум в Давосе',
  'Новогодние каникулы и Рождество в России',
  'Core Strategic Principles 2026',
  'Сорвиголова: Рожденный заново'
]);

async function main() {
  const execute = process.argv.includes('--execute');
  console.log(`=== MIGRATION SCRIPT (MODE: ${execute ? 'EXECUTE' : 'DRY RUN'}) ===\n`);

  // 1. Fetch all active notes
  const allNotes = await prisma.note.findMany({
    where: { deletedAt: null },
    include: {
      feed: { select: { slug: true, title: true } }
    }
  });
  console.log(`Total active notes in DB: ${allNotes.length}`);

  // 2. Identify candidates for PERIOD -> SINGLE
  const periodsToMigrate: typeof allNotes = [];
  const periodsToKeep: typeof allNotes = [];

  for (const n of allNotes) {
    if (n.type !== 'PERIOD') continue;

    const isGenuine = Array.from(GENUINE_PERIOD_IDS).some(kw => n.title.includes(kw));
    if (isGenuine) {
      periodsToKeep.push(n);
    } else {
      periodsToMigrate.push(n);
    }
  }

  console.log(`\n--- PERIOD EVALUATION ---`);
  console.log(`Genuine PERIODs to keep: ${periodsToKeep.length}`);
  periodsToKeep.forEach(p => console.log(`  [KEEP] "${p.title}" (${p.startDate.toISOString().slice(0,10)} - ${p.endDate?.toISOString().slice(0,10)})`));

  console.log(`\nDigest/Single PERIODs to migrate to SINGLE: ${periodsToMigrate.length}`);
  const ruUaMigrate = periodsToMigrate.filter(p => p.title.startsWith('Сводный дайджест: РФ и Украина'));
  const aiMigrate = periodsToMigrate.filter(p => p.title.includes('Сводный дайджест AI'));
  const otherMigrate = periodsToMigrate.filter(p => !ruUaMigrate.includes(p) && !aiMigrate.includes(p));

  console.log(`  - "Сводный дайджест: РФ и Украина": ${ruUaMigrate.length}`);
  console.log(`  - "Сводный дайджест AI": ${aiMigrate.length}`);
  console.log(`  - Прочие дайджесты/сводки в Spark: ${otherMigrate.length}`);

  // 3. Identify candidates for EVENT -> SINGLE
  const CALENDAR_FEED_SLUGS = new Set([
    'catholic-holidays',
    'islamic-holidays',
    'world-holidays',
    'russian-official',
    'russian-military',
    'orthodox-holidays',
    'world-religions',
    'politics-2026'
  ]);

  const eventsToMigrate: typeof allNotes = [];
  const eventsToKeep: typeof allNotes = [];

  for (const n of allNotes) {
    if (n.type !== 'EVENT') continue;

    const slug = n.feed?.slug;
    const isCalendarFeed = slug && CALENDAR_FEED_SLUGS.has(slug);
    // Also keep meetings in tech-strategy if Daily Sync
    const isMeeting = slug === 'tech-strategy' && n.title.includes('Daily Sync');

    if (isCalendarFeed || isMeeting) {
      eventsToKeep.push(n);
    } else {
      eventsToMigrate.push(n);
    }
  }

  console.log(`\n--- EVENT EVALUATION ---`);
  console.log(`Genuine EVENTs to keep: ${eventsToKeep.length}`);
  console.log(`News/informational EVENTs to migrate to SINGLE: ${eventsToMigrate.length}`);

  if (!execute) {
    console.log(`\n[DRY RUN SUMMARY]`);
    console.log(`- Will convert ${periodsToMigrate.length} PERIOD notes to SINGLE (clearing endDate)`);
    console.log(`- Will convert ${eventsToMigrate.length} EVENT notes to SINGLE`);
    console.log(`- Will keep ${periodsToKeep.length} authentic PERIOD notes`);
    console.log(`- Will keep ${eventsToKeep.length} authentic calendar/meeting EVENT notes`);
    console.log(`\nRun with '--execute' to perform backup and database update.`);
    return;
  }

  // --- EXECUTION BLOCK ---
  console.log(`\nCreating temporary backup before migration...`);
  const backupDir = path.resolve(__dirname, '../../../scratch');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `notes_backup_before_migration_${timestamp}.json`);

  const backupData = allNotes.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    startDate: n.startDate,
    endDate: n.endDate,
    feedId: n.feedId,
    feedSlug: n.feed?.slug
  }));
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`Backup saved to: ${backupPath} (${backupData.length} notes)`);

  console.log(`\nApplying database updates in transaction...`);
  const periodIds = periodsToMigrate.map(p => p.id);
  const eventIds = eventsToMigrate.map(e => e.id);

  await prisma.$transaction([
    // Update periods to SINGLE and nullify endDate for single point-in-time notes
    prisma.note.updateMany({
      where: { id: { in: periodIds } },
      data: { type: 'SINGLE', endDate: null }
    }),
    // Update news events to SINGLE
    prisma.note.updateMany({
      where: { id: { in: eventIds } },
      data: { type: 'SINGLE' }
    })
  ]);

  console.log(`Transaction successfully committed!`);

  // Verification counts
  const finalCounts = await prisma.note.groupBy({
    by: ['type'],
    _count: { id: true },
    where: { deletedAt: null }
  });
  console.log(`\n=== FINAL NOTE COUNTS BY TYPE ===`);
  console.log(JSON.stringify(finalCounts, null, 2));

  // Check remaining open periods
  const openPeriods = await prisma.note.findMany({
    where: { deletedAt: null, type: 'PERIOD', endDate: null },
    select: { id: true, title: true, feed: { select: { slug: true } } }
  });
  console.log(`Remaining open-ended PERIOD notes (should be 0 or intentional): ${openPeriods.length}`);
  openPeriods.forEach(p => console.log(`  - [${p.feed?.slug}] "${p.title}"`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
