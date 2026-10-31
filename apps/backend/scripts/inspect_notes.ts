import * as fs from 'fs';
import * as path from 'path';

// Load .env
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

async function main() {
  const counts = await prisma.note.groupBy({
    by: ['type'],
    _count: { id: true },
    where: { deletedAt: null }
  });
  console.log('=== NOTE COUNTS BY TYPE ===');
  console.log(JSON.stringify(counts, null, 2));

  const totalNotes = await prisma.note.count({ where: { deletedAt: null } });
  console.log('Total active notes:', totalNotes);

  const digestsRuUa = await prisma.note.findMany({
    where: {
      deletedAt: null,
      title: { startsWith: 'Сводный дайджест: РФ и Украина' }
    },
    select: { id: true, title: true, type: true, startDate: true, endDate: true }
  });
  console.log('\n=== RF and UA DIGESTS COUNT:', digestsRuUa.length, '===');
  console.log(JSON.stringify(digestsRuUa, null, 2));

  const digestsAI = await prisma.note.findMany({
    where: {
      deletedAt: null,
      title: { contains: 'Сводный дайджест AI' }
    },
    select: { id: true, title: true, type: true, startDate: true, endDate: true }
  });
  console.log('\n=== AI DIGESTS COUNT:', digestsAI.length, '===');
  console.log(JSON.stringify(digestsAI, null, 2));

  const allPeriods = await prisma.note.findMany({
    where: {
      deletedAt: null,
      type: 'PERIOD'
    },
    select: { id: true, title: true, type: true, startDate: true, endDate: true },
    orderBy: { startDate: 'desc' }
  });
  console.log('\n=== ALL PERIODS COUNT:', allPeriods.length, '===');
  console.log(JSON.stringify(allPeriods, null, 2));

  const sampleEvents = await prisma.note.findMany({
    where: {
      deletedAt: null,
      type: 'EVENT'
    },
    select: { id: true, title: true, type: true, startDate: true, endDate: true, sourceLink: true, sourceType: true },
    take: 15,
    orderBy: { startDate: 'desc' }
  });
  console.log('\n=== SAMPLE EVENTS (take 15) ===');
  console.log(JSON.stringify(sampleEvents, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
