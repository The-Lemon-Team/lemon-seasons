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
  const nonSparkEvents = await prisma.note.findMany({
    where: {
      deletedAt: null,
      type: 'EVENT',
      feed: {
        slug: {
          notIn: [
            'catholic-holidays',
            'islamic-holidays',
            'world-holidays',
            'russian-official',
            'russian-military',
            'orthodox-holidays',
            'world-religions',
            'politics-2026'
          ]
        }
      }
    },
    select: {
      id: true,
      title: true,
      feed: { select: { slug: true, title: true } }
    }
  });

  console.log('Non-calendar feeds with EVENT:', nonSparkEvents.length);
  const byFeed: Record<string, string[]> = {};
  for (const n of nonSparkEvents) {
    const slug = n.feed?.slug || 'none';
    if (!byFeed[slug]) byFeed[slug] = [];
    byFeed[slug].push(n.title);
  }
  for (const [slug, titles] of Object.entries(byFeed)) {
    console.log(`\nFeed: ${slug} (${titles.length})`);
    titles.slice(0, 5).forEach(t => console.log('  -', t));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
