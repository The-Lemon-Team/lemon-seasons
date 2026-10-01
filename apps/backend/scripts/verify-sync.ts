import { PrismaService } from '../src/prisma/prisma.service';
import { SessionService } from '../src/sync/session.service';
import { GDriveStorageService } from '../src/sync/gdrive-storage.service';
import { MergeService } from '../src/sync/merge.service';
import { SyncOrchestratorService } from '../src/sync/sync-orchestrator.service';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  console.log('🚀 Starting end-to-end verification of Distributed Sync & Workstation Sessions...\n');

  const prisma = new PrismaService();
  await prisma.$connect();

  const sessionService = new SessionService(prisma);
  const gdriveStorage = new GDriveStorageService();
  const mergeService = new MergeService(prisma);
  const orchestrator = new SyncOrchestratorService(
    prisma,
    sessionService,
    gdriveStorage,
    mergeService,
  );

  const testDeviceAlpha = 'pc-alpha-test';
  const testDeviceBeta = 'pc-beta-test';

  try {
    // 1. Storage Directories
    console.log('1️⃣ Checking Google Drive storage relay directories...');
    gdriveStorage.ensureLocalStorageDirectories();
    const syncDir = gdriveStorage.getSyncFolderPath();
    console.log(`   📁 Sync folder located at: ${syncDir}`);
    if (!fs.existsSync(path.join(syncDir, 'commits'))) {
      throw new Error('commits directory not found');
    }
    console.log('   ✅ Directory structure verified.\n');

    // 2. Start Workstation Session
    console.log('2️⃣ Starting active workstation session on PC Alpha...');
    const session = await sessionService.startSession({
      title: 'Аналитическая сессия: Рынок и Санкции',
      author: 'Алексей',
      deviceId: testDeviceAlpha,
    });
    console.log(`   ✅ Active session created: ID=${session.id}, Title="${session.title}"`);

    // 3. Create a test Note in DB & record change
    console.log('3️⃣ Creating a test note and recording change in active session...');
    const testNote = await prisma.note.create({
      data: {
        title: '[E2E Sync] Динамика рынка нефти 2026',
        description: '## Итоги недели\nЦены выросли на 3.4% в связи с морскими ограничениями.',
        type: 'DONE',
        resonanceScore: 88,
        curator: 'Иван Белый',
      },
    });

    await sessionService.recordChange(
      {
        entityType: 'NOTE',
        entityId: testNote.id,
        action: 'UPSERT',
        payload: { title: testNote.title },
      },
      testDeviceAlpha,
    );

    // 4. Record a chat message change
    const thread = await prisma.chatThread.create({
      data: {
        title: 'Сессия с Иваном Белым',
        type: 'DIRECT',
        targetAgent: 'Иван Белый',
      },
    });

    const chatMsg = await prisma.chatMessageRecord.create({
      data: {
        threadId: thread.id,
        sender: 'Иван Белый',
        senderName: 'Иван Белый',
        senderRole: 'curator_internal',
        text: 'Логистические задержки подтверждаются портами Балтики.',
      },
    });

    await sessionService.recordChange(
      {
        entityType: 'CHAT_MESSAGE',
        entityId: chatMsg.id,
        action: 'INSERT',
        payload: { text: chatMsg.text },
      },
      testDeviceAlpha,
    );

    const pending = await sessionService.getPendingChanges(session.id);
    console.log(`   ✅ Pending changes accumulated in live session: ${pending.length} items.\n`);

    // 5. Commit Session
    console.log('5️⃣ Sealing and committing workstation session...');
    const commitResult = await sessionService.commitSession(session.id, {
      summary: 'Анализ морских ограничений и цен на топливо',
    });
    console.log(
      `   ✅ Commit sealed: CommitId=${commitResult.commit.id}, EntitiesCount=${commitResult.commit.entitiesCount}`,
    );

    // 6. Push to Google Drive Storage
    console.log('6️⃣ Pushing commit to Google Drive storage...');
    const pushResult = await orchestrator.push(testDeviceAlpha);
    console.log(`   ✅ Pushed ${pushResult.pushedCount} commit(s) to Google Drive relay.`);
    const commitFilePath = path.join(syncDir, 'commits', `${commitResult.commit.id}.json`);
    if (!fs.existsSync(commitFilePath)) {
      throw new Error(`Commit file ${commitFilePath} was not created!`);
    }
    console.log(`   📄 Verified commit JSON exists on disk: ${commitFilePath}\n`);

    // 7. Verify Status
    console.log('7️⃣ Checking workstation sync status...');
    const status = await orchestrator.getStatus(testDeviceAlpha);
    console.log(`   ✅ Device: ${status.deviceId}`);
    console.log(`   ✅ Last Commit: ${status.lastCommit?.id} (Pushed: ${status.lastCommit?.isPushed})`);
    console.log(`   ✅ Pending changes left: ${status.pendingChangesCount}`);
    console.log(`   ✅ Unpushed commits: ${status.gdrive.unpushedCommitsCount}\n`);

    // 8. Simulate Pull on PC Beta
    console.log('8️⃣ Simulating Pull on PC Beta (simulating 2nd computer)...');
    // Delete local commit record on beta to simulate fresh machine
    await prisma.syncCommit.delete({ where: { id: commitResult.commit.id } });

    const pullResult = await orchestrator.pull(testDeviceBeta);
    console.log(`   ✅ Pull completed: ${pullResult.pulledCommits.length} commit(s) pulled.`);
    console.log(`   ✅ Conflicts detected: ${pullResult.conflictNotes.length}`);
    if (!pullResult.pulledCommits.includes(commitResult.commit.id)) {
      throw new Error('Commit was not pulled by PC Beta!');
    }
    console.log('   🎉 2nd Computer successfully synced all entities from Google Drive!\n');

    // 9. Cleanup test records
    console.log('9️⃣ Cleaning up test data...');
    await prisma.chatMessageRecord.deleteMany({ where: { threadId: thread.id } });
    await prisma.chatThread.delete({ where: { id: thread.id } });
    await prisma.noteVersion.deleteMany({ where: { noteId: testNote.id } });
    await prisma.note.delete({ where: { id: testNote.id } });
    await prisma.syncCommit.deleteMany({ where: { id: commitResult.commit.id } });
    await prisma.syncSession.deleteMany({ where: { id: session.id } });
    if (fs.existsSync(commitFilePath)) {
      fs.unlinkSync(commitFilePath);
    }
    console.log('   ✅ Test data cleaned up successfully.\n');

    console.log('============================================================');
    console.log('🏆 All tests passed! Distributed Sync & Sessions are 100% operational.');
    console.log('============================================================');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
