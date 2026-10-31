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
  const feeds = await prisma.feed.findMany({
    where: { deletedAt: null },
    include: {
      _count: { select: { notes: true } }
    }
  });

  console.log('=== FEEDS ===');
  for (const f of feeds) {
    const breakdown = await prisma.note.groupBy({
      by: ['type'],
      where: { feedId: f.id, deletedAt: null },
      _count: { id: true }
    });
    console.log(`Feed: "${f.title}" (slug: ${f.slug}), total notes: ${f._count.notes}`);
    console.log('  Breakdown:', breakdown);
  }

  const noFeed = await prisma.note.groupBy({
    by: ['type'],
    where: { feedId: null, deletedAt: null },
    _count: { id: true }
  });
  console.log('Notes without feed:', noFeed);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
