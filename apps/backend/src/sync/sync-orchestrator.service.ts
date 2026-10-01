import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';
import { GDriveStorageService } from './gdrive-storage.service';
import { MergeService } from './merge.service';
import { SyncStatusResponse, GDriveSyncResult, DeviceRef, CommitPackage } from '@lenta/shared';

@Injectable()
export class SyncOrchestratorService {
  private readonly logger = new Logger(SyncOrchestratorService.name);

  constructor(
    private prisma: PrismaService,
    private sessionService: SessionService,
    private gdriveStorage: GDriveStorageService,
    private mergeService: MergeService,
  ) {}

  /**
   * Returns current workstation status: active session, unpushed commits, and cloud status.
   */
  async getStatus(deviceId = 'default-device'): Promise<SyncStatusResponse> {
    const activeSession = (await this.sessionService.getActiveSession(deviceId)) as any;

    const lastCommit = await this.prisma.syncCommit.findFirst({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        entitiesCount: true,
        summary: true,
        isPushed: true,
      },
    });

    const pendingCount = activeSession?._count?.changes ?? 0;

    const unpushedCount = await this.prisma.syncCommit.count({
      where: { isPushed: false },
    });

    const authStatus = await this.gdriveStorage.getAuthStatus();

    // Find remote HEAD for this device
    const deviceRefs = await this.gdriveStorage.getAllDeviceRefs();
    const myRef = deviceRefs.find((r) => r.deviceId === deviceId);

    return {
      deviceId,
      activeSession,
      lastCommit: lastCommit
        ? {
            id: lastCommit.id,
            createdAt: lastCommit.createdAt.toISOString(),
            entitiesCount: lastCommit.entitiesCount,
            summary: lastCommit.summary,
            isPushed: lastCommit.isPushed,
          }
        : null,
      pendingChangesCount: pendingCount,
      gdrive: {
        connected: authStatus.authenticated || true, // local relay is always connected
        userEmail: authStatus.userEmail,
        remoteHeadCommitId: myRef?.headCommitId || null,
        unpushedCommitsCount: unpushedCount,
      },
    };
  }

  /**
   * Pushes all unpushed local commits to Google Drive storage.
   */
  async push(deviceId = 'default-device'): Promise<{ pushedCount: number; commits: string[] }> {
    const unpushed = await this.prisma.syncCommit.findMany({
      where: { isPushed: false },
      orderBy: { createdAt: 'asc' },
    });

    if (unpushed.length === 0) {
      return { pushedCount: 0, commits: [] };
    }

    const pushedCommitIds: string[] = [];
    let lastPushedId = '';

    for (const commit of unpushed) {
      const pkg = commit.payloadJson as unknown as CommitPackage;
      await this.gdriveStorage.uploadCommit(pkg);
      await this.prisma.syncCommit.update({
        where: { id: commit.id },
        data: {
          isPushed: true,
          pushedAt: new Date(),
        },
      });
      pushedCommitIds.push(commit.id);
      lastPushedId = commit.id;
    }

    if (lastPushedId) {
      const ref: DeviceRef = {
        deviceId,
        headCommitId: lastPushedId,
        updatedAt: new Date().toISOString(),
      };
      await this.gdriveStorage.updateDeviceRef(ref);
    }

    this.logger.log(`Successfully pushed ${pushedCommitIds.length} commits to Google Drive`);
    return { pushedCount: pushedCommitIds.length, commits: pushedCommitIds };
  }

  /**
   * Pulls new commits from Google Drive storage and merges them into the local database.
   */
  async pull(deviceId = 'default-device'): Promise<GDriveSyncResult> {
    const remoteCommitFiles = await this.gdriveStorage.listRemoteCommits();
    const localCommits = await this.prisma.syncCommit.findMany({
      select: { id: true },
    });
    const localCommitIds = new Set(localCommits.map((c) => c.id));

    const pulledCommits: string[] = [];
    const conflictNotes: string[] = [];

    // Filter commits that are not yet applied locally
    for (const filename of remoteCommitFiles) {
      const commitId = filename.replace('.json', '');
      if (localCommitIds.has(commitId)) {
        continue;
      }

      this.logger.log(`Found new remote commit to pull: ${commitId}`);
      try {
        const pkg = await this.gdriveStorage.downloadCommit(filename);
        const { conflicts } = await this.mergeService.applyCommit(pkg);

        if (conflicts.length > 0) {
          conflictNotes.push(...conflicts);
        }

        // Record the commit locally so it won't be re-applied
        await this.prisma.syncCommit.upsert({
          where: { id: pkg.commitId },
          create: {
            id: pkg.commitId,
            parentCommitIds: pkg.parentCommitIds || [],
            deviceId: pkg.deviceId,
            author: pkg.author,
            summary: pkg.session.title || 'Импортирован из удаленного хранилища',
            entitiesCount:
              (pkg.changes.notes?.length || 0) +
              (pkg.changes.chatMessages?.length || 0) +
              (pkg.changes.links?.length || 0) +
              (pkg.changes.folders?.length || 0),
            payloadJson: pkg as any,
            isPushed: true,
            pushedAt: new Date(),
          },
          update: {
            isPushed: true,
          },
        });

        pulledCommits.push(pkg.commitId);
      } catch (err) {
        this.logger.error(`Error applying commit ${filename}: ${err.message}`, err.stack);
      }
    }

    const syncedAt = new Date().toISOString();
    return {
      pushedCommits: [],
      pulledCommits,
      conflictNotes: Array.from(new Set(conflictNotes)),
      syncedAt,
    };
  }
}
