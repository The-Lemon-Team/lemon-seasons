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
  const eventsByFeed = await prisma.note.groupBy({
    by: ['feedId'],
    where: { deletedAt: null, type: 'EVENT' },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  console.log('=== EVENT NOTES BY FEED ===');
  let newsCount = 0;
  let calendarCount = 0;

  for (const item of eventsByFeed) {
    let feedName = 'No Feed';
    let slug = 'no-slug';
    if (item.feedId) {
      const f = await prisma.feed.findUnique({ where: { id: item.feedId }, select: { slug: true, title: true } });
      if (f) {
        feedName = f.title;
        slug = f.slug;
      }
    }
    const isCalendar = ['catholic-holidays', 'islamic-holidays', 'world-holidays', 'russian-official', 'russian-military', 'orthodox-holidays', 'world-religions', 'politics-2026'].includes(slug);
    if (isCalendar) calendarCount += item._count.id;
    else newsCount += item._count.id;

    console.log(`[${slug}] ${feedName}: ${item._count.id} (${isCalendar ? 'CALENDAR EVENT' : 'NEWS/NOTE'})`);
  }

  console.log(`\nSummary:`);
  console.log(`True Calendar Events: ${calendarCount}`);
  console.log(`News/Informational notes disguised as EVENT: ${newsCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
