/**
 * Binds `[[wikilinks]]` in "Связанные записи" sections to real notes for one feed.
 *
 * Usage: npx tsx scripts/resolve_related_notes.ts <feedSlug> [sourceDir]
 *  - sourceDir (optional): folder with the original `.md` files; their file names are stored in
 *    `metadata.fileName` (matched to notes by numeric prefix) so wikilinks can resolve by file name.
 */
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

import { PrismaClient } from '@prisma/client';
import { RelatedNotesResolverService } from '../src/ingestion/services/related-notes-resolver.service';

const prisma = new PrismaClient();

async function main() {
  const [feedSlug, sourceDir] = process.argv.slice(2);
  if (!feedSlug) throw new Error('feedSlug is required');

  const feed = await prisma.feed.findUnique({ where: { slug: feedSlug } });
  if (!feed) throw new Error(`Feed '${feedSlug}' not found`);

  const notes = await prisma.note.findMany({ where: { feedId: feed.id, deletedAt: null }, orderBy: { createdAt: 'asc' } });

  if (sourceDir) {
    const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.md'));
    // Note titles don't carry the numeric prefix; match by order of creation == order of file prefix.
    const sorted = files.sort();
    for (let i = 0; i < notes.length && i < sorted.length; i++) {
      const meta = { ...((notes[i].metadata as any) || {}), fileName: sorted[i] };
      await prisma.note.update({ where: { id: notes[i].id }, data: { metadata: meta } });
    }
  }

  const resolver = new RelatedNotesResolverService(prisma as any);
  for (const n of notes) {
    const res = await resolver.resolveNoteRelatedLinks(n.id);
    console.log(`${n.title}: ${res.resolvedCount}/${res.totalCount} resolved, parent=${res.parentNoteId ?? '-'}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
