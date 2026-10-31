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
  const notes = await prisma.note.findMany({
    where: {
      feed: { slug: 'tech-strategy' }
    },
    select: { id: true, title: true, type: true, startDate: true, endDate: true }
  });
  console.log('tech-strategy notes:', notes);
}

main().catch(console.error).finally(() => prisma.$disconnect());
