export async function runPhase1Tests(harness) {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  🚀 PHASE 1: Session Push, Pull, Edit & Delta Sync Test Suite    ');
  console.log('═══════════════════════════════════════════════════════════════════');

  const createdNoteIds = [];
  const createdLocalPaths = [];

  try {
    // ─────────────────────────────────────────────────────────────────
    // Test 0: Key Validation & Container Connection in Obsidian Runtime
    // ─────────────────────────────────────────────────────────────────
    console.log('\n[TEST 0] Testing Key Validation & Container Connection inside Obsidian...');
    const authCheck = await harness.evalInObsidian(async (userKey) => {
      const plugin = window.app.plugins.plugins['lemon-lenta-sync'];
      const keyValidation = await plugin.apiClient.validateKey(userKey);
      const containerRes = await plugin.apiClient.connectContainerByKey(userKey);
      return {
        keyValidation,
        containerRes,
      };
    }, harness.userKey);

    if (!authCheck.keyValidation.valid) {
      throw new Error(`Key validation inside Obsidian returned invalid for ${harness.userKey}`);
    }
    if (!authCheck.containerRes.success || !authCheck.containerRes.container) {
      throw new Error(`Container connection returned error: ${authCheck.containerRes.error}`);
    }
    console.log(`✅ Key validated: User "${authCheck.keyValidation.userId}" / Name: "${authCheck.keyValidation.name}"`);
    console.log(`✅ Container connected: "${authCheck.containerRes.container.name}" (Type: ${authCheck.containerRes.container.type}, Visibility: ${authCheck.containerRes.container.visibility})`);

    // ─────────────────────────────────────────────────────────────────
    // Test 1.1: Session Push — Create note in Obsidian & push to server
    // ─────────────────────────────────────────────────────────────────
    console.log('\n[TEST 1.1] Session Push: Creating user note in Obsidian and pushing...');
    const pushTitle = `E2E-Push-Note-${Date.now()}`;
    const pushPath = `Lemon-Seasons/01_Daily_Logs/${pushTitle}.md`;
    const pushContent = `---
title: "${pushTitle}"
type: "EVENT"
start_date: "2026-10-01T12:00:00.000Z"
---

# ${pushTitle}

Created locally inside Obsidian vault for Phase 1 session push test.
`;

    await harness.createNoteInVault(pushPath, pushContent);
    createdLocalPaths.push(pushPath);
    console.log(`  📝 Created local note: ${pushPath}`);

    const pushResult = await harness.pushNote(pushPath);
    if (!pushResult.success || !pushResult.note?.id) {
      throw new Error(`pushNote failed: ${JSON.stringify(pushResult)}`);
    }

    const pushedNoteId = pushResult.note.id;
    createdNoteIds.push(pushedNoteId);
    console.log(`  📤 Push succeeded! Assigned lenta_id: ${pushedNoteId}`);

    // Verify local markdown file frontmatter
    const updatedPushMarkdown = await harness.readNoteFromVault(pushPath);
    if (!updatedPushMarkdown.includes(pushedNoteId)) {
      throw new Error(`Local file does not contain assigned lenta_id: ${pushedNoteId}`);
    }
    console.log('  ✅ Local markdown frontmatter updated with lenta_id.');

    // Verify record in NestJS database
    const dbNote1 = await harness.getNoteFromServer(pushedNoteId);
    if (!dbNote1 || dbNote1.title !== pushTitle) {
      throw new Error(`Server DB record mismatch. Expected title "${pushTitle}", got "${dbNote1?.title}"`);
    }
    if (dbNote1.feedId !== null) {
      throw new Error(`Regular user note should have feedId: null, but got: ${dbNote1.feedId}`);
    }
    console.log(`  ✅ Backend verification confirmed: Note exists in DB (feedId: null).`);

    // ─────────────────────────────────────────────────────────────────
    // Test 1.2: Session Pull — Remote note injection & pull in Obsidian
    // ─────────────────────────────────────────────────────────────────
    console.log('\n[TEST 1.2] Session Pull: Creating note on server and pulling into Obsidian...');
    const pullTitle = `E2E-Pull-Note-${Date.now()}`;
    const remoteNote = await harness.createNoteOnServer({
      title: pullTitle,
      description: `# ${pullTitle}\n\nCreated remotely on backend to test Obsidian pullChanges.`,
      type: 'EVENT',
      startDate: '2026-10-02T14:00:00.000Z',
    });
    createdNoteIds.push(remoteNote.id);
    console.log(`  🌐 Created remote note on server: ID ${remoteNote.id} ("${pullTitle}")`);

    const pullResult = await harness.pullChanges();
    console.log(`  📥 pullChanges response: Pulled ${pullResult.pulledCount} notes, Deleted ${pullResult.deletedCount}`);
    if (pullResult.pulledCount < 1) {
      throw new Error(`Expected at least 1 pulled note, got ${pullResult.pulledCount}`);
    }

    // Verify the file was created in vault
    const pulledFileItem = pullResult.downloadedFilesList?.find((f) => f.title === pullTitle)
      || pullResult.downloadedFilesList?.[0];
    const pulledPath = pulledFileItem?.path;
    if (!pulledPath) {
      throw new Error(`Could not find downloaded file path for pulled note: ${pullTitle}`);
    }
    createdLocalPaths.push(pulledPath);

    const pulledMarkdown = await harness.readNoteFromVault(pulledPath);
    if (!pulledMarkdown || !pulledMarkdown.includes(remoteNote.id)) {
      throw new Error(`Pulled file ${pulledPath} does not contain lenta_id: ${remoteNote.id}`);
    }
    console.log(`  ✅ File physically verified in vault: ${pulledPath} with valid frontmatter.`);

    // ─────────────────────────────────────────────────────────────────
    // Test 1.3: Session Edit & Push — Local modification in Obsidian
    // ─────────────────────────────────────────────────────────────────
    console.log('\n[TEST 1.3] Session Edit & Push: Modifying note locally and pushing...');
    const editedPushContent = `---
lenta_id: "${pushedNoteId}"
title: "${pushTitle} (Edited Locally)"
type: "EVENT"
start_date: "2026-10-05T09:00:00.000Z"
---

# ${pushTitle} (Edited Locally)

This note was modified in Obsidian and pushed in the same session.
`;
    // Overwrite local file in vault
    await harness.evalInObsidian(async ({ path, text }) => {
      const file = window.app.vault.getAbstractFileByPath(path);
      await window.app.vault.modify(file, text);
    }, { path: pushPath, text: editedPushContent });

    const editPushResult = await harness.pushNote(pushPath);
    if (!editPushResult.success) {
      throw new Error(`Edit pushNote failed: ${JSON.stringify(editPushResult)}`);
    }
    console.log('  📤 Edit push succeeded!');

    // Verify update on server
    const dbNoteEdited = await harness.getNoteFromServer(pushedNoteId);
    if (!dbNoteEdited.title.includes('(Edited Locally)')) {
      throw new Error(`Server note was not updated. Title: "${dbNoteEdited.title}"`);
    }
    console.log(`  ✅ Backend confirmed updated title: "${dbNoteEdited.title}"`);

    // ─────────────────────────────────────────────────────────────────
    // Test 1.4: Session Edit & Pull — Remote modification on server
    // ─────────────────────────────────────────────────────────────────
    console.log('\n[TEST 1.4] Session Edit & Pull: Modifying note on server and pulling...');
    await harness.updateNoteOnServer(remoteNote.id, {
      description: `# ${pullTitle}\n\nUpdated remotely on server via PATCH /notes/:id.`,
    });
    console.log(`  🌐 Updated note ${remoteNote.id} on backend.`);

    const editPullResult = await harness.pullChanges();
    console.log(`  📥 pullChanges response: Pulled ${editPullResult.pulledCount} notes`);

    const updatedPulledMarkdown = await harness.readNoteFromVault(pulledPath);
    if (!updatedPulledMarkdown.includes('Updated remotely on server via PATCH')) {
      throw new Error(`Vault file was not updated with remote change: ${updatedPulledMarkdown}`);
    }
    console.log('  ✅ Vault file successfully refreshed with remote server update.');

    // ─────────────────────────────────────────────────────────────────
    // Test 1.5: Delta Sync & Idempotency
    // ─────────────────────────────────────────────────────────────────
    console.log('\n[TEST 1.5] Delta Sync Idempotency: Pulling without any changes...');
    const idempotentPull = await harness.pullChanges();
    console.log(`  📥 pullChanges response: Pulled ${idempotentPull.pulledCount} notes`);
    if (idempotentPull.pulledCount !== 0) {
      throw new Error(`Expected 0 pulled notes on idempotent pull, got ${idempotentPull.pulledCount}`);
    }
    console.log('  ✅ Idempotency verified: 0 unnecessary file writes.');

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('  🎉 PHASE 1 COMPLETE: All 5 Session Sync Tests Passed!          ');
    console.log('═══════════════════════════════════════════════════════════════════');
  } finally {
    // Cleanup created notes
    console.log('\n🧹 Cleaning up Phase 1 test artifacts...');
    for (const p of createdLocalPaths) {
      await harness.deleteNoteFromVault(p).catch(() => {});
    }
    for (const id of createdNoteIds) {
      await harness.deleteNoteFromServer(id).catch(() => {});
    }
    console.log('✅ Cleanup finished.');
  }
}
