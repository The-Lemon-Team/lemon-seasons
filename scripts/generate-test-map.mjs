#!/usr/bin/env node
/**
 * Generates docs/testing/TEST_MAP.md: a navigable tree of every test
 * (Layer → Domain → Component/Module → describe blocks → test).
 *
 * Source of truth is the Vitest JSON report, so the map can never drift from the tests.
 *
 *   pnpm test:map            # run the suites and regenerate the map
 *
 * To place a new test file in the map, add a rule to DOMAIN_RULES (first match wins).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'docs', 'testing', 'TEST_MAP.md');

/** Test suites included in the map. Add e2e/integration entries here as they appear. */
const SUITES = [
  { layer: 'Frontend unit & component tests', package: '@lenta/feed-app', label: 'feed-app', cwd: 'apps/feed-app' },
  { layer: 'Backend unit tests', package: 'lemon-lenta-backend', label: 'backend', cwd: 'apps/backend' },
];

/** Declarative file → domain routing. First match wins. */
const DOMAIN_RULES = [
  { match: /noteFormPayload/, domain: 'Note', area: 'Update payload builder' },
  { match: /FeedCreateNoteModal/, domain: 'Note', area: 'Create modal' },
  { match: /FeedEditNoteModal/, domain: 'Note', area: 'Edit modal' },
  { match: /FeedDetailModal/, domain: 'Note', area: 'Detail (read) modal' },
  { match: /periods\.test/, domain: 'Note', area: 'Periods (PERIOD notes, horizons, badges)' },
  { match: /FeedEntityModal/, domain: 'Feed', area: 'Create / edit / delete feed modal' },
  { match: /adapters[\\/]feeds/, domain: 'Feed', area: 'Feed adapters' },
  { match: /Delete(Track|Workspace)|DeleteModals/, domain: 'Workspace', area: 'Delete track / workspace modals' },
  { match: /PinnedNotesDock/, domain: 'Workspace', area: 'Pinned notes dock' },
  { match: /modalUxContract/, domain: 'Cross-cutting', area: 'Modal UX contract (AGENTS.md §7)' },
  { match: /appMode/, domain: 'App shell', area: 'Runtime mode (dev / staging / public)' },
  { match: /hostNavigation/, domain: 'App shell', area: 'Host navigation (iframe / standalone)' },
  // Backend domains
  { match: /notes-cache\.service/, domain: 'Backend / Note', area: 'Notes cache service' },
  { match: /notes-query\.builder/, domain: 'Backend / Note', area: 'Notes query builder' },
  { match: /auth-context\.middleware/, domain: 'Backend / Auth', area: 'Auth context middleware' },
  { match: /sparks-parser\.service/, domain: 'Backend / Ingestion', area: 'Gemini Sparks parser' },
  { match: /text-helpers\.spec/, domain: 'Backend / Taxonomy', area: 'Hashtags and folders normalization' },
  { match: /note-state\.mapper/, domain: 'Backend / Sync', area: 'Note state mapper (HLC clocks)' },
];

const DOMAIN_ORDER = [
  'Note',
  'Feed',
  'Workspace',
  'App shell',
  'Cross-cutting',
  'Backend / Note',
  'Backend / Auth',
  'Backend / Ingestion',
  'Backend / Taxonomy',
  'Backend / Sync',
  'Other',
];
const ICON = { passed: '✅', failed: '❌', pending: '⏸️', todo: '📝', skipped: '⏭️' };

const classify = (file) =>
  DOMAIN_RULES.find((r) => r.match.test(file)) ?? { domain: 'Other', area: file };

function runSuite(suite) {
  const dir = join(tmpdir(), 'lenta-test-map');
  mkdirSync(dir, { recursive: true });
  const report = join(dir, `${suite.label}.json`);
  if (existsSync(report)) rmSync(report);
  const res = spawnSync(
    'pnpm',
    ['--filter', suite.package, 'exec', 'vitest', 'run', '--reporter=json', `--outputFile=${report}`],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: true },
  );
  if (!existsSync(report)) {
    console.error(`No report produced for ${suite.label} (exit ${res.status}).`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(report, 'utf8'));
}

/** Insert a test into a nested { children: Map, tests: [] } tree following its describe path. */
function insert(node, path, test) {
  const next = path.reduce((n, title) => {
    if (!n.children.has(title)) n.children.set(title, { children: new Map(), tests: [] });
    return n.children.get(title);
  }, node);
  next.tests.push(test);
}

const countTests = (n) => n.tests.length + [...n.children.values()].reduce((s, c) => s + countTests(c), 0);

function renderNode(node, depth, lines) {
  const pad = '  '.repeat(depth);
  for (const [title, child] of node.children) {
    lines.push(`${pad}- **${title}** _(${countTests(child)})_`);
    renderNode(child, depth + 1, lines);
  }
  for (const t of node.tests) lines.push(`${pad}- ${ICON[t.status] ?? '❔'} ${t.title}`);
}

function build() {
  const out = [];
  const totals = { passed: 0, failed: 0, other: 0 };
  const sections = [];

  for (const suite of SUITES) {
    const json = runSuite(suite);
    const byDomain = new Map();

    for (const file of json.testResults) {
      const rel = relative(join(ROOT, suite.cwd), file.name).split(sep).join('/');
      const { domain, area } = classify(rel);
      const domainNode = byDomain.get(domain) ?? new Map();
      byDomain.set(domain, domainNode);
      const areaNode = domainNode.get(area) ?? { files: new Set(), root: { children: new Map(), tests: [] } };
      domainNode.set(area, areaNode);
      areaNode.files.add(rel);

      for (const a of file.assertionResults) {
        insert(areaNode.root, a.ancestorTitles, { title: a.title, status: a.status });
        if (a.status === 'passed') totals.passed++;
        else if (a.status === 'failed') totals.failed++;
        else totals.other++;
      }
    }

    const lines = [`## ${suite.layer} — \`${suite.label}\``, ''];
    const domains = [...byDomain.keys()].sort((a, b) => DOMAIN_ORDER.indexOf(a) - DOMAIN_ORDER.indexOf(b));
    for (const domain of domains) {
      const areas = byDomain.get(domain);
      const domainTotal = [...areas.values()].reduce((s, a) => s + countTests(a.root), 0);
      lines.push(`### ${domain} _(${domainTotal})_`, '');
      for (const [area, { files, root }] of areas) {
        lines.push(`#### ${area} _(${countTests(root)})_`, '');
        lines.push(`Files: ${[...files].map((f) => `\`${f}\``).join(', ')}`, '');
        renderNode(root, 0, lines);
        lines.push('');
      }
    }
    sections.push(lines.join('\n'));
  }

  out.push(
    '# Test Map',
    '',
    '> Generated by `pnpm test:map` from the real test results. **Do not edit by hand.**',
    '> Legend: ✅ passing · ❌ failing · 📝 todo (known gap) · ⏭️ skipped',
    '',
    `**Totals:** ${totals.passed} passing, ${totals.failed} failing, ${totals.other} todo/skipped`,
    '',
    '## Layers',
    '',
    '| Layer | Tooling | Status |',
    '|---|---|---|',
    '| Unit & component | Vitest + Testing Library + MSW | active (`feed-app`) |',
    '| Backend unit / integration | Vitest + supertest + Postgres | planned (Phase 3) |',
    '| E2E smoke (UI + backend + DB) | Playwright | planned (Phase 4) |',
    '',
    ...sections,
  );
  return out.join('\n') + '\n';
}

mkdirSync(join(ROOT, 'docs', 'testing'), { recursive: true });
writeFileSync(OUT, build(), 'utf8');
console.log(`Wrote ${relative(ROOT, OUT)}`);
