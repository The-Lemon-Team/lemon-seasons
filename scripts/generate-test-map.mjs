#!/usr/bin/env node
/**
 * Generates docs/testing/TEST_MAP.md: a navigable tree of every test
 * (Layer → Domain → Component/Module → describe blocks → test).
 *
 * Source of truth is the Vitest / Playwright JSON reports, so the map can never drift from the tests.
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

/** Test suites included in the map. */
const SUITES = [
  { layer: 'Frontend unit & component tests', package: '@lenta/feed-app', label: 'feed-app', cwd: 'apps/feed-app', runner: 'vitest' },
  { layer: 'Backend unit tests', package: 'lemon-lenta-backend', label: 'backend', cwd: 'apps/backend', runner: 'vitest' },
  {
    layer: 'Backend integration tests (PostgreSQL)',
    package: 'lemon-lenta-backend',
    label: 'backend-int',
    cwd: 'apps/backend',
    runner: 'vitest',
    commandArgs: ['--config', 'vitest.integration.config.mts'],
  },
  {
    layer: 'End-to-End smoke tests (Frontend + Backend + PostgreSQL)',
    package: '@lenta/e2e',
    label: 'e2e-smoke',
    cwd: 'e2e',
    runner: 'playwright',
  },
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
  { match: /useFeedFilters/, domain: 'Feed', area: 'Feed filters hook' },
  { match: /FeedCategoriesSheet/, domain: 'Navigation', area: 'Mobile categories bottom sheet' },
  { match: /Delete(Track|Workspace)|DeleteModals/, domain: 'Workspace', area: 'Delete track / workspace modals' },
  { match: /PinnedNotesDock/, domain: 'Workspace', area: 'Pinned notes dock' },
  { match: /modalUxContract/, domain: 'Cross-cutting', area: 'Modal UX contract (AGENTS.md §7)' },
  { match: /useFeedModalsState/, domain: 'Cross-cutting', area: 'Modals coordination hook' },
  { match: /appMode/, domain: 'App shell', area: 'Runtime mode (dev / staging / public)' },
  { match: /useFeedAppModeSync/, domain: 'App shell', area: 'App mode sync hook' },
  { match: /useFeedTheme/, domain: 'App shell', area: 'Theme hook (light / dark / system)' },
  { match: /hostNavigation/, domain: 'App shell', area: 'Host navigation (iframe / standalone)' },
  // Backend domains
  { match: /notes-cache\.service/, domain: 'Backend / Note', area: 'Notes cache service' },
  { match: /notes-query\.builder/, domain: 'Backend / Note', area: 'Notes query builder' },
  { match: /auth-context\.middleware/, domain: 'Backend / Auth', area: 'Auth context middleware' },
  { match: /sparks-parser\.service/, domain: 'Backend / Ingestion', area: 'Gemini Sparks parser' },
  { match: /text-helpers\.spec/, domain: 'Backend / Taxonomy', area: 'Hashtags and folders normalization' },
  { match: /note-state\.mapper/, domain: 'Backend / Sync', area: 'Note state mapper (HLC clocks)' },
  { match: /notes-api\.int/, domain: 'Backend / Integration', area: 'Notes, feeds & privacy API' },
  // E2E domains
  { match: /smoke\.spec/, domain: 'E2E / Smoke', area: 'Full-stack smoke tests' },
];

const DOMAIN_ORDER = [
  'Note',
  'Feed',
  'Navigation',
  'Workspace',
  'App shell',
  'Cross-cutting',
  'Backend / Note',
  'Backend / Auth',
  'Backend / Ingestion',
  'Backend / Taxonomy',
  'Backend / Sync',
  'Backend / Integration',
  'E2E / Smoke',
  'Other',
];
const ICON = { passed: '✅', failed: '❌', pending: '⏸️', todo: '📝', skipped: '⏭️' };

const classify = (file) =>
  DOMAIN_RULES.find((r) => r.match.test(file)) ?? { domain: 'Other', area: file };

function normalizePlaywrightReport(pwJson) {
  const testResults = [];
  function walkSuite(suiteNode, ancestors = []) {
    const isFileRoot = suiteNode.file && suiteNode.title === suiteNode.file;
    const currentAncestors = isFileRoot || !suiteNode.title ? ancestors : [...ancestors, suiteNode.title];

    if (suiteNode.specs) {
      for (const spec of suiteNode.specs) {
        const file = spec.file;
        let entry = testResults.find((r) => r.name === file);
        if (!entry) {
          entry = { name: file, assertionResults: [] };
          testResults.push(entry);
        }
        for (const test of spec.tests) {
          const status = test.results?.[0]?.status === 'passed' ? 'passed' :
                         test.results?.[0]?.status === 'failed' ? 'failed' : 'skipped';
          entry.assertionResults.push({
            title: spec.title,
            ancestorTitles: currentAncestors,
            status,
          });
        }
      }
    }
    if (suiteNode.suites) {
      for (const s of suiteNode.suites) {
        walkSuite(s, currentAncestors);
      }
    }
  }
  for (const s of pwJson.suites || []) {
    walkSuite(s, []);
  }
  return { testResults };
}

function runSuite(suite) {
  const dir = join(tmpdir(), 'lenta-test-map');
  mkdirSync(dir, { recursive: true });
  const report = join(dir, `${suite.label}.json`);
  if (existsSync(report)) rmSync(report);

  if (suite.runner === 'playwright') {
    const res = spawnSync(
      'pnpm',
      ['--filter', suite.package, 'exec', 'playwright', 'test', '--reporter=json'],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'], shell: true },
    );
    try {
      const parsed = JSON.parse(res.stdout.toString('utf8'));
      return normalizePlaywrightReport(parsed);
    } catch (e) {
      console.error(`Failed to parse Playwright report for ${suite.label}:`, e);
      process.exit(1);
    }
  }

  const extraArgs = suite.commandArgs || [];
  const res = spawnSync(
    'pnpm',
    ['--filter', suite.package, 'exec', 'vitest', 'run', ...extraArgs, '--reporter=json', `--outputFile=${report}`],
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

    const sortedDomains = [...byDomain.keys()].sort((a, b) => {
      const ia = DOMAIN_ORDER.indexOf(a);
      const ib = DOMAIN_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.localeCompare(b);
    });

    for (const domain of sortedDomains) {
      lines.push(`### Domain: ${domain}`);
      lines.push('');
      const areas = byDomain.get(domain);
      for (const [area, data] of areas) {
        const fileList = [...data.files].map((f) => `\`${f}\``).join(', ');
        lines.push(`#### ${area} (${countTests(data.root)})`);
        lines.push(`_Source: ${fileList}_`);
        lines.push('');
        renderNode(data.root, 0, lines);
        lines.push('');
      }
    }
    sections.push(lines.join('\n'));
  }

  out.push('# Project Lenta — Test Map');
  out.push('');
  out.push('> Generated automatically from test suite execution reports.');
  out.push(`> Regenerate anytime with \`pnpm test:map\`. Do not edit by hand.`);
  out.push('');
  out.push(
    `**Totals:** ${totals.passed} passed, ${totals.failed} failed, ${totals.other} todo/skipped ` +
      `(${totals.passed + totals.failed + totals.other} total across all suites)`,
  );
  out.push('');
  out.push(sections.join('\n\n'));
  out.push('');

  writeFileSync(OUT, out.join('\n'), 'utf8');
  console.log(`Wrote ${OUT}`);
  console.log(`Totals: ${totals.passed} passed, ${totals.failed} failed, ${totals.other} other.`);
}

build();
