import { chromium } from 'playwright';
import { spawn } from 'child_process';
import http from 'http';

const WEB_CALENDAR_PORT = 5174;
const WEB_CALENDAR_URL = `http://localhost:${WEB_CALENDAR_PORT}`;

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureWebCalendarRunning() {
  const isRunning = await checkUrl(WEB_CALENDAR_URL);
  if (isRunning) {
    console.log(`✅ Web Calendar is already running at ${WEB_CALENDAR_URL}`);
    return null;
  }

  console.log(`🌐 Launching Web Calendar dev server on port ${WEB_CALENDAR_PORT}...`);
  const webProcess = spawn('pnpm', ['calendar:dev', '--port', String(WEB_CALENDAR_PORT)], {
    shell: true,
    cwd: process.cwd(),
    stdio: 'ignore',
  });

  // Poll until reachable
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await checkUrl(WEB_CALENDAR_URL)) {
      console.log(`✅ Web Calendar dev server ready at ${WEB_CALENDAR_URL}!`);
      return webProcess;
    }
  }

  throw new Error(`Web Calendar server failed to start at ${WEB_CALENDAR_URL} within 30s`);
}

export async function runPhase2Tests(harness) {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  🚀 PHASE 2: End-to-End Loop (Obsidian ⟷ Backend ⟷ Web Calendar)  ');
  console.log('═══════════════════════════════════════════════════════════════════');

  const webProcess = await ensureWebCalendarRunning();
  let browser = null;
  let page = null;

  const createdNoteIds = [];
  const createdLocalPaths = [];

  try {
    console.log('\n🖥️ Launching Playwright browser for Web Calendar UI (native Edge channel)...');
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    page = await context.newPage();

    // 1. Authenticate user in Web Calendar
    console.log(`🔗 Navigating to Web Calendar at ${WEB_CALENDAR_URL}...`);
    await page.goto(WEB_CALENDAR_URL, { waitUntil: 'domcontentloaded' });

    // Set auth session in localStorage and reload
    await page.evaluate(() => {
      localStorage.setItem(
        'lemon_lenta_auth_session_v1',
        JSON.stringify({
          id: 'usr-member-001',
          name: 'Пользователь (User)',
          email: 'user@lemon.team',
          role: 'user',
        })
      );
    });
    await page.goto(WEB_CALENDAR_URL, { waitUntil: 'networkidle' });
    console.log('✅ Web Calendar authenticated as usr-member-001');

    // ─────────────────────────────────────────────────────────────────
    // Test 2.1: Obsidian Push ➔ Visible in Web Calendar UI
    // ─────────────────────────────────────────────────────────────────
    console.log('\n[TEST 2.1] Obsidian Push ➔ Verifying appearance in Web Calendar UI...');
    const now = Date.now();
    const obsNoteTitle = `E2E-Phase2-Obsidian-${now}`;
    const obsNotePath = `Lemon-Seasons/01_Daily_Logs/${obsNoteTitle}.md`;
    const obsContent = `---
title: "${obsNoteTitle}"
type: "EVENT"
start_date: "2026-09-19T14:00:00.000Z"
---

# ${obsNoteTitle}

Pushed from Obsidian desktop to be verified in Web Calendar UI.
`;

    await harness.createNoteInVault(obsNotePath, obsContent);
    createdLocalPaths.push(obsNotePath);
    console.log(`  📝 Created local note: ${obsNotePath}`);

    const pushResult = await harness.pushNote(obsNotePath);
    if (!pushResult.success || !pushResult.note?.id) {
      throw new Error(`Obsidian push failed: ${JSON.stringify(pushResult)}`);
    }
    const pushedNoteId = pushResult.note.id;
    createdNoteIds.push(pushedNoteId);
    console.log(`  📤 Push succeeded! Note ID: ${pushedNoteId}`);

    // Verify in Web Calendar UI
    await page.reload({ waitUntil: 'networkidle' });

    // Filter using Navbar search input to reliably locate note in virtualized view
    const searchInput = page.locator('header input[type="text"]').first();
    await searchInput.fill(obsNoteTitle);
    await page.waitForTimeout(600);

    const noteCard = page.locator(`text="${obsNoteTitle}"`).first();
    await noteCard.waitFor({ state: 'visible', timeout: 8000 });
    console.log(`  ✅ Note card found and visible in Web Calendar UI! (${obsNoteTitle})`);

    // Click on note to inspect NoteDetailModal
    await noteCard.click();
    await page.waitForSelector(`text="${obsNoteTitle}"`, { timeout: 5000 });
    console.log('  ✅ NoteDetailModal opened with correct content!');

    // Close modal & clear search
    const closeButton = page.locator('[data-testid="close-modal-btn"]');
    if (await closeButton.count() > 0) {
      await closeButton.first().click();
    } else {
      await page.keyboard.press('Escape');
    }
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // ─────────────────────────────────────────────────────────────────
    // Test 2.2: Web Calendar UI Note Creation ➔ Pull in Obsidian
    // ─────────────────────────────────────────────────────────────────
    console.log('\n[TEST 2.2] Web Calendar UI Creation ➔ Pulling into Obsidian...');
    const webNoteTitle = `E2E-Phase2-Web-${now}`;
    const webNoteDesc = `# ${webNoteTitle}\n\nCreated directly from Web Calendar UI.`;

    // Click Quick Add button to open CreateNoteModal
    const quickAddBtn = page.locator('[data-testid="quick-add-btn"]').first();
    await quickAddBtn.click();
    await page.waitForSelector('[data-testid="note-title-input"]', { timeout: 5000 });

    // Fill form fields
    await page.locator('[data-testid="note-title-input"]').fill(webNoteTitle);
    await page.locator('[data-testid="note-desc-input"]').fill(webNoteDesc);
    await page.locator('[data-testid="note-submit-btn"]').click();
    console.log(`  📝 Submitted note via Web Calendar UI form ("${webNoteTitle}")`);
    await page.waitForTimeout(1000);

    // Verify note was created on backend and retrieve its ID
    const backendNotesRes = await fetch(`http://localhost:3001/notes?search=${encodeURIComponent(webNoteTitle)}`);
    const backendNotesData = await backendNotesRes.json();
    const createdWebNote = backendNotesData.items?.find((n) => n.title === webNoteTitle);

    if (!createdWebNote?.id) {
      throw new Error(`Failed to find note created via Web UI on backend: ${JSON.stringify(backendNotesData)}`);
    }
    createdNoteIds.push(createdWebNote.id);
    console.log(`  🌐 Backend confirmed note created: ID ${createdWebNote.id}`);

    // In Obsidian: call pullChanges
    console.log('  📥 Calling pullChanges() in Obsidian...');
    const pullResult = await harness.pullChanges();
    console.log(`  📥 pullChanges response: Pulled ${pullResult.pulledCount} notes`);

    const expectedVaultPath = `Lemon-Seasons/${webNoteTitle}.md`;
    createdLocalPaths.push(expectedVaultPath);

    const pulledContent = await harness.readNoteFromVault(expectedVaultPath);
    if (!pulledContent) {
      throw new Error(`File ${expectedVaultPath} was not created in Obsidian vault after pull!`);
    }
    if (!pulledContent.includes(createdWebNote.id)) {
      throw new Error(`File ${expectedVaultPath} missing lenta_id ${createdWebNote.id}!`);
    }
    console.log(`  ✅ File physically verified in Obsidian vault: ${expectedVaultPath}`);

    // ─────────────────────────────────────────────────────────────────
    // Test 2.3: Web Calendar UI Note Edit ➔ Pull in Obsidian
    // ─────────────────────────────────────────────────────────────────
    console.log('\n[TEST 2.3] Web Calendar UI Note Edit ➔ Pulling into Obsidian...');
    const editedWebTitle = `${webNoteTitle} (Edited in Web UI)`;
    const editedWebDesc = `${webNoteDesc}\n\n[Edited in Web Calendar at ${new Date().toISOString()}]`;

    // Locate note in Web Calendar, open modal, click edit, save edit
    await searchInput.fill(webNoteTitle);
    await page.waitForTimeout(600);
    const webNoteCard = page.locator(`text="${webNoteTitle}"`).first();
    await webNoteCard.click();

    await page.waitForSelector('[data-testid="edit-note-btn"]', { timeout: 5000 });
    await page.locator('[data-testid="edit-note-btn"]').click();
    await page.waitForSelector('[data-testid="edit-note-title-input"]', { timeout: 5000 });

    await page.locator('[data-testid="edit-note-title-input"]').fill(editedWebTitle);
    await page.locator('[data-testid="edit-note-description-input"]').fill(editedWebDesc);
    await page.locator('[data-testid="save-note-btn"]').click();
    await page.waitForTimeout(1000);
    console.log(`  🌐 Saved note edit via Web UI ("${editedWebTitle}")`);

    // Close detail modal & clear search
    const closeEditModalBtn = page.locator('[data-testid="close-modal-btn"]');
    if (await closeEditModalBtn.count() > 0) {
      await closeEditModalBtn.first().click();
    } else {
      await page.keyboard.press('Escape');
    }
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // In Obsidian: call pullChanges
    console.log('  📥 Calling pullChanges() in Obsidian to fetch edit...');
    const editPullRes = await harness.pullChanges();
    console.log(`  📥 pullChanges response: Pulled ${editPullRes.pulledCount} notes`);

    const updatedVaultContent = await harness.readNoteFromVault(expectedVaultPath);
    if (!updatedVaultContent || !updatedVaultContent.includes('Edited in Web Calendar')) {
      throw new Error(`File ${expectedVaultPath} did not reflect the remote edit after pull!`);
    }
    console.log('  ✅ Obsidian vault file successfully refreshed with Web Calendar edit!');

    // ─────────────────────────────────────────────────────────────────
    // Test 2.4: Web Key Generation ➔ Obsidian Container Connection
    // ─────────────────────────────────────────────────────────────────
    console.log('\n[TEST 2.4] Web Key Generation ➔ Obsidian Container Connect...');
    const newWebKey = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3001/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'usr-member-001',
          provider: 'obsidian',
          name: 'Web UI Generated Obsidian Key',
        }),
      });
      return res.json();
    });

    if (!newWebKey.key || !newWebKey.key.startsWith('lenta_obs_')) {
      throw new Error(`Web key generation failed: ${JSON.stringify(newWebKey)}`);
    }
    console.log(`  🔑 Generated key in Web context: ${newWebKey.key} (Name: "${newWebKey.name}")`);

    // Verify key on backend
    const keyValidation = await harness.evalInObsidian(async (token) => {
      const plugin = window.app.plugins.plugins['lemon-lenta-sync'];
      const val = await plugin.apiClient.validateKey(token);
      const conn = await plugin.apiClient.connectContainerByKey(token);
      return { val, conn };
    }, newWebKey.key);

    if (!keyValidation.val.valid) {
      throw new Error(`Key generated in Web was rejected by Obsidian apiClient: ${JSON.stringify(keyValidation.val)}`);
    }
    if (!keyValidation.conn.success) {
      throw new Error(`Container connection failed for Web generated key: ${keyValidation.conn.error}`);
    }
    console.log(`  ✅ Key validated and container connected inside Obsidian runtime: "${keyValidation.conn.container.name}"`);

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('  🎉 PHASE 2 COMPLETE: All 4 End-to-End Loop Tests Passed!       ');
    console.log('═══════════════════════════════════════════════════════════════════');
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up Phase 2 test artifacts...');
    for (const noteId of createdNoteIds) {
      try {
        await fetch(`http://localhost:3001/notes/${noteId}`, { method: 'DELETE' });
      } catch {}
    }
    for (const localPath of createdLocalPaths) {
      try {
        await harness.deleteNoteFromVault(localPath);
      } catch {}
    }
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (webProcess) {
      try {
        webProcess.kill();
      } catch {}
    }
    console.log('✅ Phase 2 cleanup finished.');
  }
}
