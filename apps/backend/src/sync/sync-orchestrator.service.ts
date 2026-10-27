import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';
import { GDriveStorageService } from './gdrive-storage.service';
import { MergeService } from './merge.service';
import { DriveWatcherService } from '../ingestion/services/drive-watcher.service';
import { DriveBusRelayService } from '../bus/services/drive-bus-relay.service';
import {
  SyncStatusResponse,
  GDriveSyncResult,
  DeviceRef,
  CommitPackage,
  GDriveUpdateItem,
  GDriveRecentUpdatesResponse,
} from '@lenta/shared';
import * as path from 'path';

@Injectable()
export class SyncOrchestratorService {
  private readonly logger = new Logger(SyncOrchestratorService.name);

  constructor(
    private prisma: PrismaService,
    private sessionService: SessionService,
    private gdriveStorage: GDriveStorageService,
    private mergeService: MergeService,
    @Optional()
    @Inject(forwardRef(() => DriveWatcherService))
    private driveWatcher?: DriveWatcherService,
    @Optional()
    @Inject(forwardRef(() => DriveBusRelayService))
    private driveBusRelay?: DriveBusRelayService,
  ) {}

  /**
   * Returns current workstation sync and cloud status.
   */
  async getStatus(deviceId = 'default-device'): Promise<SyncStatusResponse> {
    const unpushedCount = await this.prisma.syncCommit.count({
      where: { isPushed: false },
    });

    const authStatus = await this.gdriveStorage.getAuthStatus();

    // Find remote HEAD for this device
    const deviceRefs = await this.gdriveStorage.getAllDeviceRefs();
    const myRef = deviceRefs.find((r) => r.deviceId === deviceId);

    // Latest sync timestamp across ingestion and notes
    const [latestIngestion, latestDriveNote] = await Promise.all([
      this.prisma.ingestionFile.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      this.prisma.note.findFirst({
        where: {
          OR: [
            { sourceType: 'GOOGLE_DRIVE' },
            { externalId: { not: null } },
            { metadata: { path: ['isRemoteSync'], equals: true } },
          ],
          deletedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ]);

    const syncDates = [
      latestIngestion?.updatedAt?.getTime(),
      latestDriveNote?.updatedAt?.getTime(),
    ].filter((t): t is number => typeof t === 'number');

    const lastSyncAt = syncDates.length > 0 ? new Date(Math.max(...syncDates)).toISOString() : null;

    return {
      deviceId,
      activeSession: null,
      lastSyncAt,
      pendingChangesCount: 0,
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

    // Also scan incoming GDrive Sparks directory and catch up bus events
    if (this.driveWatcher) {
      try {
        await this.driveWatcher.scanDirectory();
      } catch (scanErr: any) {
        this.logger.warn(`DriveWatcher scan during pull failed: ${scanErr.message}`);
      }
    }

    if (this.driveBusRelay) {
      try {
        await this.driveBusRelay.runCatchUpSync();
      } catch (busErr: any) {
        this.logger.warn(`DriveBusRelay catch-up during pull failed: ${busErr.message}`);
      }
    }

    const recentUpdates = await this.getRecentUpdates(20);
    const syncedAt = new Date().toISOString();

    return {
      pushedCommits: [],
      pulledCommits,
      conflictNotes: Array.from(new Set(conflictNotes)),
      syncedAt,
      newUpdates: recentUpdates.items,
    };
  }

  /**
   * Retrieves recent files and notes synced from Google Drive (Sparks, Commits, Bus).
   */
  async getRecentUpdates(limit = 25): Promise<GDriveRecentUpdatesResponse> {
    const [ingestionFiles, driveNotes] = await Promise.all([
      this.prisma.ingestionFile.findMany({
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          note: {
            select: {
              id: true,
              title: true,
              type: true,
              startDate: true,
              folderPath: true,
              summary: true,
              author: true,
            },
          },
        },
      }),
      this.prisma.note.findMany({
        where: {
          OR: [
            { sourceType: 'GOOGLE_DRIVE' },
            { externalId: { not: null } },
            { metadata: { path: ['isRemoteSync'], equals: true } },
          ],
          deletedAt: null,
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          type: true,
          startDate: true,
          folderPath: true,
          summary: true,
          author: true,
          updatedAt: true,
          externalId: true,
        },
      }),
    ]);

    const items: GDriveUpdateItem[] = [];
    const seenNoteIds = new Set<string>();

    for (const f of ingestionFiles) {
      if (f.noteId) {
        seenNoteIds.add(f.noteId);
      }
      items.push({
        id: f.id,
        fileName: f.fileName,
        title: f.note?.title || f.fileName.replace(/\.md$/i, ''),
        noteId: f.noteId,
        noteType: f.note?.type,
        status: f.status as any,
        action: f.note ? 'CREATE' : 'SYNC',
        updatedAt: f.updatedAt.toISOString(),
        source: 'SPARKS',
        summary: f.note?.summary,
        folderPath: f.note?.folderPath,
        fileSize: f.fileSize,
        author: f.note?.author,
      });
    }

    for (const n of driveNotes) {
      if (seenNoteIds.has(n.id)) continue;
      seenNoteIds.add(n.id);

      const fileName = n.externalId ? path.basename(n.externalId) : `${n.title}.md`;
      items.push({
        id: n.id,
        fileName,
        title: n.title,
        noteId: n.id,
        noteType: n.type,
        status: 'COMPLETED',
        action: 'UPDATE',
        updatedAt: n.updatedAt.toISOString(),
        source: 'BUS',
        summary: n.summary,
        folderPath: n.folderPath,
        author: n.author,
        curator: n.author,
      });
    }

    // Sort all by updatedAt descending
    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const sliced = items.slice(0, limit);

    const lastSyncAt = sliced.length > 0 ? sliced[0].updatedAt : null;

    return {
      totalCount: sliced.length,
      lastSyncAt,
      items: sliced,
    };
  }
}
