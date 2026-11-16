import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  normalizeCanonicalSparkPath,
  processSparkDocument,
} from '../dist/index.mjs';
import {
  BusDatabase,
  SseManager,
  LocalSparksWatcher,
} from '../dist/server/index.js';

const md = (frontmatter, body = '# Title\n\nBody text.') =>
  `---\n${frontmatter}\n---\n${body}`;

const parse = (file, content, opts = {}) =>
  processSparkDocument({
    virtualPath: `spark/${file}`,
    contentMarkdown: content,
    origin: 'GDRIVE_SPARK',
    ...opts,
  });

test('normalizeCanonicalSparkPath normalizes Windows, Docker, and canonical Spark paths', () => {
  assert.equal(
    normalizeCanonicalSparkPath(
      'C:\\Users\\Ilege\\Мой диск\\spark\\AI\\01.11.26 - Digest.md',
      'C:/Users/Ilege/Мой диск/spark',
    ).canonicalPath,
    'Spark/AI/01.11.26 - Digest.md',
  );
  assert.equal(
    normalizeCanonicalSparkPath('/app/sparks/AI/01.11.26 - Digest.md', '/app/sparks').canonicalPath,
    'Spark/AI/01.11.26 - Digest.md',
  );
  assert.equal(
    normalizeCanonicalSparkPath('spark/changelogsfeed/google/02.11.26 - Release.md').canonicalPath,
    'Spark/changelogsfeed/google/02.11.26 - Release.md',
  );
});

test('processSparkDocument aligns dates to filename, shifts Moscow UTC>=21, and preserves event_date', () => {
  assert.equal(
    parse('31.10.26 - A.md', md('type: SINGLE')).notePayload.startDate,
    '2026-10-31T12:00:00.000Z',
  );

  assert.equal(
    parse('31.10.26 - A.md', md('start_date: 2026-10-30T09:15:30.000Z')).notePayload.startDate,
    '2026-10-31T09:15:30.000Z',
  );

  // Shifts late-evening UTC times back 3h so Moscow day matches filename
  assert.equal(
    parse('31.10.26 - A.md', md('start_date: 2026-10-30T22:00:00.000Z')).notePayload.startDate,
    '2026-10-31T19:00:00.000Z',
  );

  const withEventDate = parse(
    '31.10.26 - A.md',
    md('event_date: 2026-10-25T14:00:00.000Z\nstart_date: 2026-10-31T07:15:00.000Z'),
  );
  assert.equal(withEventDate.notePayload.startDate, '2026-10-25T14:00:00.000Z');
  assert.equal(withEventDate.notePayload.metadata.digestDate, '2026-10-31');
});

test('processSparkDocument resolves timeSlot, note type, resonanceScore, links, and relatedNotes', () => {
  const morning = parse('x.md', md('type: SINGLE', '# Утренний выпуск\n\ntext'));
  assert.equal(morning.timeSlot, 'MORNING');
  assert.equal(morning.notePayload.icon, '🌅');
  assert.ok(morning.notePayload.hashtags.includes('утро'));

  const digest = parse(
    'x.md',
    md('type: PERIOD\nstart_date: 2026-10-01T00:00:00.000Z\nend_date: 2026-10-10T00:00:00.000Z', '# Дайджест недели\n\ntext'),
  );
  assert.equal(digest.notePayload.type, 'SINGLE');
  assert.ok(digest.notePayload.hashtags.includes('сводка'));
  assert.ok(digest.notePayload.hashtags.includes('дайджест'));

  const fullBody = [
    '# AI Agents News',
    '',
    '## 📌 Суть события',
    '',
    'Короткое **главное** описание.',
    '',
    '## 🔗 Источники и связи',
    '- Первоисточник: [ExplainX](https://explainx.ai/catch-up)',
    '- Сводный выпуск: [[02.11.26 - Сводный дайджест]]',
    '- Связано с инструментами: [[OpenAI Agents SDK]]',
  ].join('\n');

  const fm = [
    'resonance_score: 87',
    'curator: Bob',
    'links:',
    '  - url: https://a.example',
    '    title: Source A',
    '  - url: ""',
    '  - url: https://b.example',
  ].join('\n');

  const res = parse('02.11.26 - News.md', md(fm, fullBody));
  assert.equal(res.notePayload.resonanceScore, 87);
  assert.equal(res.notePayload.author, 'Bob');
  assert.equal(res.notePayload.summary, 'Короткое главное описание.');
  assert.deepEqual(res.notePayload.links, [
    { url: 'https://a.example', title: 'Source A', isSource: true, order: 0 },
    { url: 'https://b.example', title: '', isSource: false, order: 1 },
  ]);
  assert.equal(res.notePayload.sourceLink, 'https://a.example');
  assert.ok(!res.notePayload.description.includes('## 🔗 Источники и связи'));
  assert.equal(res.notePayload.metadata.relatedNotes.length, 2);
  assert.equal(res.notePayload.metadata.relatedNotes[0].role, 'parent');
  assert.equal(res.notePayload.metadata.relatedNotes[0].isParent, true);
  assert.equal(res.notePayload.metadata.relatedNotes[1].role, 'knowledge_graph');
  assert.equal(res.notePayload.metadata.relatedNotes[1].relation, 'инструментами');
});

test('LocalSparksWatcher scans local folder, ingests markdown files, ignores config/templates, and deduplicates', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lemon-local-watcher-test-'));
  const aiDir = path.join(tempRoot, 'AI');
  fs.mkdirSync(aiDir, { recursive: true });

  fs.writeFileSync(path.join(aiDir, '_channel.md'), '---\nslug: spark-ai-custom\ntitle: Custom AI\n---', 'utf-8');
  fs.writeFileSync(path.join(aiDir, 'config.md'), '# ignore me', 'utf-8');
  fs.writeFileSync(path.join(aiDir, 'note-template.md'), '# ignore me too', 'utf-8');
  fs.writeFileSync(
    path.join(aiDir, '15.11.26 - Local Watcher Note.md'),
    '---\ntags: [ai, jmdaily]\n---\n# Local Watcher Note\n\nBody content.',
    'utf-8',
  );

  const db = new BusDatabase({ dbPath: ':memory:' });
  const sse = new SseManager(5000);
  const watcher = new LocalSparksWatcher({
    watchedDir: tempRoot,
    db,
    sse,
    scanOnStart: false,
  });

  try {
    const first = await watcher.scanDirectory();
    assert.equal(first.scanned, 1);
    assert.equal(first.ingested, 1);

    const status = watcher.getStatus();
    assert.equal(status.filesProcessed, 1);

    const doc = db.getSparkDocument('Spark/AI/15.11.26 - Local Watcher Note.md');
    assert.ok(doc);
    assert.equal(doc.feedSlug, 'spark-ai-custom');

    const events = db.queryEvents({ afterSeq: 0 });
    assert.equal(events.items.length, 1);
    assert.equal(events.items[0].origin, 'GDRIVE_SPARK');
    assert.ok(!events.items[0].payload.hashtags.includes('jmdaily'));

    // Second scan without changes should ingest 0 new items
    const second = await watcher.scanDirectory();
    assert.equal(second.scanned, 1);
    assert.equal(second.ingested, 0);
  } finally {
    await watcher.stop();
    sse.destroy();
    db.close();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
