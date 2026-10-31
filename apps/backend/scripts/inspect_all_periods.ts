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

async function main() {
  const periods = await prisma.note.findMany({
    where: { deletedAt: null, type: 'PERIOD' },
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      feed: { select: { slug: true, title: true } }
    },
    orderBy: { startDate: 'desc' }
  });

  console.log(`Total PERIOD notes: ${periods.length}`);
  
  // Categorize
  const ruUa = periods.filter(p => p.title.startsWith('Сводный дайджест: РФ и Украина'));
  const ai = periods.filter(p => p.title.includes('Сводный дайджест AI'));
  const otherDigests = periods.filter(p => !ruUa.includes(p) && !ai.includes(p) && (p.title.toLowerCase().includes('дайджест') || p.title.toLowerCase().includes('сводка')));
  const openEnded = periods.filter(p => !p.endDate);
  const remaining = periods.filter(p => !ruUa.includes(p) && !ai.includes(p) && !otherDigests.includes(p));

  console.log(`\n1. РФ и Украина: ${ruUa.length}`);
  console.log(`2. AI дайджесты: ${ai.length}`);
  console.log(`3. Другие дайджесты/сводки: ${otherDigests.length}`);
  otherDigests.forEach(p => console.log(`   - [${p.feed?.slug}] "${p.title}" (start: ${p.startDate.toISOString().slice(0,10)}, end: ${p.endDate ? p.endDate.toISOString().slice(0,10) : 'OPEN'})`));
  
  console.log(`\n4. Оставшиеся PERIOD (настоящие периоды/тренды/сезоны): ${remaining.length}`);
  remaining.forEach(p => console.log(`   - [${p.feed?.slug}] "${p.title}" (start: ${p.startDate.toISOString().slice(0,10)}, end: ${p.endDate ? p.endDate.toISOString().slice(0,10) : 'OPEN'})`));

  console.log(`\n5. Всего открытых (endDate === null): ${openEnded.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
