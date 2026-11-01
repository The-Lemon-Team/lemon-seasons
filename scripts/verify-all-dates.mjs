import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// 1. Load .env
const envPath = path.resolve(process.cwd(), '.env');
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

// 2. Parse command line flags
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || (!args.includes('--save-db') && !args.includes('--save-files'));
const saveDb = args.includes('--save-db');
const saveFiles = args.includes('--save-files');
const useGemini = args.includes('--use-gemini');
const fetchWeb = args.includes('--fetch-web');

const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

const MONTH_MAP = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  января: 1, февраля: 2, марта: 3, апреля: 4, мая: 5, июня: 6,
  июля: 7, августа: 8, сентября: 9, октября: 10, ноября: 11, декабря: 12,
  янв: 1, фев: 2, мар: 3, апр: 4, июн: 6, июл: 7, авг: 8, сен: 9, окт: 10, ноя: 11, дек: 12,
};

function extractDateFromFilename(fileName) {
  if (!fileName) return null;
  const ruMatch = fileName.match(/(\d{2})\.(\d{2})\.(\d{2,4})/);
  if (ruMatch) {
    const day = parseInt(ruMatch[1], 10);
    const month = parseInt(ruMatch[2], 10);
    let year = parseInt(ruMatch[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }

  const isoMatch = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }
  return null;
}

function extractDateFromUrl(url) {
  if (!url) return null;

  // ISO: 2026/10/24 or 2026-10-24
  const isoMatch = url.match(/(?:^|[^0-9])(202[4-9])[/-](0[1-9]|1[0-2])[/-](0[1-9]|[12]\d|3[01])(?:[^0-9]|$)/);
  if (isoMatch) {
    return new Date(Date.UTC(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3], 12, 0, 0));
  }

  // Month-DD-YYYY: november-01-2026
  const monthNameMatch = url.match(
    /(?:^|[^a-zа-я0-9])([a-zа-я]{3,9})[-_](0?[1-9]|[12]\d|3[01])[-_](202[4-9])(?:[^0-9]|$)/i
  );
  if (monthNameMatch) {
    const month = MONTH_MAP[monthNameMatch[1].toLowerCase()];
    if (month) {
      return new Date(Date.UTC(+monthNameMatch[3], month - 1, +monthNameMatch[2], 12, 0, 0));
    }
  }

  // DD-Month-YYYY: 01-november-2026
  const revMatch = url.match(
    /(?:^|[^a-zа-я0-9])(0?[1-9]|[12]\d|3[01])[-_]([a-zа-я]{3,9})[-_](202[4-9])(?:[^0-9]|$)/i
  );
  if (revMatch) {
    const month = MONTH_MAP[revMatch[2].toLowerCase()];
    if (month) {
      return new Date(Date.UTC(+revMatch[3], month - 1, +revMatch[1], 12, 0, 0));
    }
  }
  return null;
}

function parseHtmlMetadataDate(html) {
  if (!html) return null;

  const metaRegexes = [
    /<meta[^>]+(?:property|name)=["'](?:article:published_time|pubdate|publishdate|og:published_time|parsely-pub-date)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:article:published_time|pubdate|publishdate|og:published_time|parsely-pub-date)["']/i,
  ];

  for (const regex of metaRegexes) {
    const m = html.match(regex);
    if (m && m[1]) {
      const d = new Date(m[1].trim());
      if (!isNaN(d.getTime()) && d.getUTCFullYear() >= 2020 && d.getUTCFullYear() <= 2030) return d;
    }
  }

  const jsonLdMatch = html.match(/["']datePublished["']\s*:\s*["']([^"']+)["']/i);
  if (jsonLdMatch && jsonLdMatch[1]) {
    const d = new Date(jsonLdMatch[1].trim());
    if (!isNaN(d.getTime()) && d.getUTCFullYear() >= 2020 && d.getUTCFullYear() <= 2030) return d;
  }

  const timeMatch = html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  if (timeMatch && timeMatch[1]) {
    const d = new Date(timeMatch[1].trim());
    if (!isNaN(d.getTime()) && d.getUTCFullYear() >= 2020 && d.getUTCFullYear() <= 2030) return d;
  }

  return null;
}

async function fetchUrlMetadata(url, timeoutMs = 3500) {
  if (!url || !url.startsWith('http')) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    if (!res.body) return null;
    const reader = res.body.getReader();
    let accumulated = '';
    const decoder = new TextDecoder('utf-8');

    while (accumulated.length < 32000) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
      if (accumulated.includes('</head>') || accumulated.includes('</HEAD>')) break;
    }
    reader.cancel().catch(() => {});

    return parseHtmlMetadataDate(accumulated);
  } catch {
    return null;
  }
}

async function callGeminiBatch(batch, apiKey) {
  if (!apiKey || batch.length === 0) return [];

  const prompt = `Ты — экспертный хронолог новостей Project Lenta.
Для каждой новости определи честную дату события / публикации в ISO 8601 (ГГГГ-ММ-ДДTHH:mm:ssZ).
Если новость произошла до даты дайджеста (digestDate), укажи реальную более раннюю дату.
Верни строго валидный JSON массив без Markdown:
[
  {
    "id": 1,
    "eventDate": "2026-10-24T00:00:00.000Z",
    "confidence": 95,
    "reason": "..."
  }
]

Новости:
${JSON.stringify(batch, null, 2)}`;

  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {}
  }
  return [];
}

async function main() {
  console.log('=== 🛰️ PROJECT LENTA: NEWS DATE VERIFICATION ENGINE ===');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (read-only)' : '💾 PERSISTING CHANGES'}`);
  console.log(`Flags: limit=${limit}, saveDb=${saveDb}, saveFiles=${saveFiles}, useGemini=${useGemini}, fetchWeb=${fetchWeb}`);

  const sparkDir = process.env.SPARKS_INCOMING_DIR || 'C:/Users/Ilege/Мой диск/spark';
  if (!fs.existsSync(sparkDir)) {
    console.error(`Directory not found: ${sparkDir}`);
    process.exit(1);
  }

  // Find all markdown files
  function findFiles(dir) {
    const res = [];
    for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, it.name);
      if (it.isDirectory() && !it.name.startsWith('.')) {
        res.push(...findFiles(full));
      } else if (it.isFile() && it.name.endsWith('.md') && !it.name.startsWith('00 - ')) {
        res.push(full);
      }
    }
    return res;
  }

  const allFiles = findFiles(sparkDir).slice(0, limit);
  console.log(`Found ${allFiles.length} candidate news files in ${sparkDir}`);

  let stats = {
    exactFrontmatter: 0,
    urlRegex: 0,
    scrapedMeta: 0,
    aiVerified: 0,
    digestFallback: 0,
    differencesFound: 0,
  };

  const pendingAi = [];
  const verifiedList = [];

  for (let i = 0; i < allFiles.length; i++) {
    const fp = allFiles[i];
    const fileName = path.basename(fp);
    const content = fs.readFileSync(fp, 'utf-8');

    // Parse minimal frontmatter
    const titleM = content.match(/title:\s*["']?([^"\n\r]+)/);
    const title = titleM ? titleM[1].trim() : fileName.replace(/\.md$/, '');

    const eventDateM = content.match(/event_date:\s*["']?([^"\n\r]+)/);
    const startDateM = content.match(/start_date:\s*["']?([^"\n\r]+)/);
    const dateM = content.match(/date:\s*["']?([^"\n\r]+)/);
    const fmStart = startDateM ? startDateM[1].trim() : dateM ? dateM[1].trim() : null;
    const explicitEventDate = eventDateM ? eventDateM[1].trim() : null;

    // Source link
    const urlM = content.match(/url:\s*["']?(https?:\/\/[^\s"'#]+)/i);
    const sourceLink = urlM ? urlM[1] : null;

    const digestDate = extractDateFromFilename(fileName) || new Date();
    const digestDay = digestDate.toISOString().slice(0, 10);

    let eventDate = null;
    let confidence = 'DIGEST_FALLBACK';
    let reason = '';

    // 1. Explicit event_date already set
    if (explicitEventDate) {
      const d = new Date(explicitEventDate);
      if (!isNaN(d.getTime())) {
        eventDate = d;
        confidence = 'EXACT_FRONTMATTER';
        reason = 'Preserved from frontmatter event_date';
      }
    }

    // 2. Frontmatter start_date differs from filename prefix
    if (!eventDate && fmStart) {
      const d = new Date(fmStart);
      if (!isNaN(d.getTime())) {
        const fmDay = d.toISOString().slice(0, 10);
        if (fmDay !== digestDay) {
          eventDate = d;
          confidence = 'EXACT_FRONTMATTER';
          reason = `Frontmatter start_date (${fmDay}) differs from filename digest (${digestDay})`;
        }
      }
    }

    // 3. Extract from source URL regex
    if (!eventDate && sourceLink) {
      const urlDate = extractDateFromUrl(sourceLink);
      if (urlDate) {
        eventDate = urlDate;
        confidence = 'URL_REGEX';
        reason = `Extracted from URL slug (${urlDate.toISOString().slice(0, 10)})`;
      }
    }

    // 4. Web scraping if enabled
    if (!eventDate && fetchWeb && sourceLink) {
      const scraped = await fetchUrlMetadata(sourceLink, 3000);
      if (scraped) {
        eventDate = scraped;
        confidence = 'SCRAPED_METADATA';
        reason = `Scraped from web page metadata (${scraped.toISOString().slice(0, 10)})`;
      }
    }

    // If still unresolved and Gemini is enabled, queue for batching
    if (!eventDate && useGemini && process.env.GEMINI_API_KEY) {
      pendingAi.push({
        id: i,
        filePath: fp,
        fileName,
        title,
        sourceUrl: sourceLink,
        digestDate: digestDay,
        contextSnippet: content.slice(0, 400),
      });
      continue;
    }

    if (!eventDate) {
      eventDate = digestDate;
      confidence = 'DIGEST_FALLBACK';
      reason = 'No earlier source date detected; kept digest issue date';
    }

    if (confidence === 'EXACT_FRONTMATTER') stats.exactFrontmatter++;
    else if (confidence === 'URL_REGEX') stats.urlRegex++;
    else if (confidence === 'SCRAPED_METADATA') stats.scrapedMeta++;
    else stats.digestFallback++;

    const isDifferent = eventDate.toISOString().slice(0, 10) !== digestDay;
    if (isDifferent) stats.differencesFound++;

    verifiedList.push({
      filePath: fp,
      fileName,
      title,
      eventDate,
      digestDate,
      confidence,
      reason,
      isDifferent,
    });
  }

  // Process Gemini batches if any
  if (pendingAi.length > 0) {
    console.log(`\n🤖 Processing ${pendingAi.length} notes via Gemini Flash batching...`);
    const batchSize = 15;
    for (let i = 0; i < pendingAi.length; i += batchSize) {
      const chunk = pendingAi.slice(i, i + batchSize);
      const aiResults = await callGeminiBatch(
        chunk.map((c) => ({
          id: c.id,
          title: c.title,
          sourceUrl: c.sourceUrl,
          digestDate: c.digestDate,
          context: c.contextSnippet,
        })),
        process.env.GEMINI_API_KEY
      );

      for (const item of chunk) {
        const found = aiResults.find((r) => r.id === item.id);
        const digestDate = extractDateFromFilename(item.fileName) || new Date();
        const digestDay = digestDate.toISOString().slice(0, 10);
        let eventDate = digestDate;
        let confidence = 'DIGEST_FALLBACK';
        let reason = 'AI uncertain';

        if (found && found.eventDate) {
          const d = new Date(found.eventDate);
          if (!isNaN(d.getTime())) {
            eventDate = d;
            confidence = 'AI_VERIFIED';
            reason = found.reason || 'Verified via Gemini Chrono Agent';
            stats.aiVerified++;
          }
        }
        if (confidence === 'DIGEST_FALLBACK') stats.digestFallback++;

        const isDifferent = eventDate.toISOString().slice(0, 10) !== digestDay;
        if (isDifferent) stats.differencesFound++;

        verifiedList.push({
          filePath: item.filePath,
          fileName: item.fileName,
          title: item.title,
          eventDate,
          digestDate,
          confidence,
          reason,
          isDifferent,
        });
      }
      process.stdout.write(`Batch ${Math.min(i + batchSize, pendingAi.length)} / ${pendingAi.length} processed...\r`);
    }
    console.log('\n');
  }

  console.log('\n=== 📊 VERIFICATION RESULTS ===');
  console.log(`Total Notes Analyzed: ${verifiedList.length}`);
  console.log(`- Exact Frontmatter Preserved: ${stats.exactFrontmatter}`);
  console.log(`- Extracted from URL Regex:    ${stats.urlRegex}`);
  console.log(`- Scraped from Web Metadata:   ${stats.scrapedMeta}`);
  console.log(`- AI (Gemini Flash) Verified:  ${stats.aiVerified}`);
  console.log(`- Digest Fallback (Same day):  ${stats.digestFallback}`);
  console.log(`\n📅 Notes with Historical Date Differences: ${stats.differencesFound} (${Math.round((stats.differencesFound / verifiedList.length) * 100)}%)`);

  // Show sample of differences found
  const diffSamples = verifiedList.filter((v) => v.isDifferent).slice(0, 8);
  if (diffSamples.length > 0) {
    console.log('\n📌 Samples of Historical Date Differences Found:');
    for (const s of diffSamples) {
      console.log(`  • "${s.title.slice(0, 55)}..."`);
      console.log(`    Digest: ${s.digestDate.toISOString().slice(0, 10)} ➔ Real Event: ${s.eventDate.toISOString().slice(0, 10)} [${s.confidence}] (${s.reason})`);
    }
  }

  // If save-db is set, update PostgreSQL database
  if (saveDb) {
    console.log('\n💾 Updating database records in PostgreSQL...');
    const prismaPath = require.resolve('@prisma/client', { paths: [path.join(process.cwd(), 'apps/backend')] });
    const { PrismaClient } = require(prismaPath);
    const prisma = new PrismaClient();

    let updatedDbCount = 0;
    for (const v of verifiedList) {
      if (!v.isDifferent) continue;
      try {
        const updated = await prisma.note.updateMany({
          where: {
            OR: [
              { externalId: v.filePath },
              { title: v.title },
            ],
          },
          data: {
            startDate: v.eventDate,
          },
        });
        if (updated.count > 0) updatedDbCount += updated.count;
      } catch (err) {
        console.warn(`Failed to update DB for ${v.title}: ${err.message}`);
      }
    }
    console.log(`✅ Successfully updated ${updatedDbCount} notes in PostgreSQL.`);
    await prisma.$disconnect();
  }

  // If save-files is set, inject event_date into markdown frontmatter
  if (saveFiles) {
    console.log('\n📝 Injecting event_date into markdown files on Google Drive...');
    let updatedFilesCount = 0;
    for (const v of verifiedList) {
      if (!v.isDifferent) continue;
      try {
        let content = fs.readFileSync(v.filePath, 'utf-8');
        const iso = v.eventDate.toISOString();
        if (content.includes('event_date:')) {
          content = content.replace(/event_date:\s*["'][^"']+["']/, `event_date: "${iso}"`);
        } else if (content.startsWith('---')) {
          content = content.replace(/^---\r?\n/, `---\nevent_date: "${iso}"\n`);
        }
        fs.writeFileSync(v.filePath, content, 'utf-8');
        updatedFilesCount++;
      } catch (err) {
        console.warn(`Failed to update file ${v.filePath}: ${err.message}`);
      }
    }
    console.log(`✅ Successfully updated ${updatedFilesCount} markdown files with event_date.`);
  }

  console.log('\n✨ Done!');
}

main().catch(console.error);
