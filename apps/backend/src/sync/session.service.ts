import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  StartSessionInput,
  CommitSessionInput,
  RecordChangeInput,
  CommitPackage,
  PendingChangeEntityType,
  PendingChangeAction,
} from '@lenta/shared';
import { randomUUID } from 'crypto';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves the current active session for a device, or null if none is open.
   */
  async getActiveSession(deviceId = 'default-device') {
    const session = await this.prisma.syncSession.findFirst({
      where: {
        deviceId,
        status: 'ACTIVE',
      },
      include: {
        _count: {
          select: { changes: true },
        },
        changes: {
          take: 25,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return session;
  }

  /**
   * Ensures an active session exists. Starts one automatically if none is open.
   */
  async ensureActiveSession(deviceId = 'default-device', author = 'Пользователь') {
    const existing = await this.getActiveSession(deviceId);
    if (existing) {
      return existing;
    }

    const title = `Сессия ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    return this.startSession({
      title,
      author,
      deviceId,
    });
  }

  /**
   * Starts a new workstation session. If one is already active, returns it.
   */
  async startSession(input: StartSessionInput) {
    const deviceId = input.deviceId || 'default-device';
    const author = input.author || 'Пользователь';
    const title = input.title?.trim() || `Сессия ${new Date().toLocaleDateString('ru-RU')}`;

    const existing = await this.prisma.syncSession.findFirst({
      where: {
        deviceId,
        status: 'ACTIVE',
      },
    });

    if (existing) {
      this.logger.log(`Using existing active session ${existing.id} for device ${deviceId}`);
      return existing;
    }

    const created = await this.prisma.syncSession.create({
      data: {
        title,
        deviceId,
        author,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Created new active session ${created.id} [${created.title}] on ${deviceId}`);
    return created;
  }

  /**
   * Records a pending change in the current active session.
   */
  async recordChange(input: RecordChangeInput, deviceId = 'default-device') {
    const session = await this.ensureActiveSession(deviceId);

    const pending = await this.prisma.pendingChange.create({
      data: {
        sessionId: session.id,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        payload: input.payload || {},
      },
    });

    return pending;
  }

  /**
   * Lists all pending changes for an active session.
   */
  async getPendingChanges(sessionId?: string, deviceId = 'default-device') {
    let targetSessionId = sessionId;
    if (!targetSessionId) {
      const active = await this.getActiveSession(deviceId);
      if (!active) return [];
      targetSessionId = active.id;
    }

    return this.prisma.pendingChange.findMany({
      where: { sessionId: targetSessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Commits the active session into an immutable SyncCommit / CommitPackage.
   */
  async commitSession(sessionId: string, input: CommitSessionInput = {}) {
    const session = await this.prisma.syncSession.findUnique({
      where: { id: sessionId },
      include: {
        changes: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.status !== 'ACTIVE') {
      throw new BadRequestException(`Session ${sessionId} is already ${session.status}`);
    }

    // Determine parent commit IDs
    const lastCommit = await this.prisma.syncCommit.findFirst({
      where: { deviceId: session.deviceId },
      orderBy: { createdAt: 'desc' },
    });
    const parentCommitIds = lastCommit ? [lastCommit.id] : [];

    // Group pending changes by entity type and ID
    const noteIds = new Set<string>();
    const threadIds = new Set<string>();
    const messageIds = new Set<string>();
    const linkIds = new Set<string>();
    const folderIds = new Set<string>();

    for (const change of session.changes) {
      switch (change.entityType) {
        case 'NOTE':
          noteIds.add(change.entityId);
          break;
        case 'CHAT_THREAD':
          threadIds.add(change.entityId);
          break;
        case 'CHAT_MESSAGE':
          messageIds.add(change.entityId);
          break;
        case 'LINK':
          linkIds.add(change.entityId);
          break;
        case 'FOLDER':
          folderIds.add(change.entityId);
          break;
      }
    }

    // Fetch entity snapshots from database for affected items
    const [notes, threads, messages, links, folders] = await Promise.all([
      noteIds.size > 0
        ? this.prisma.note.findMany({
            where: { id: { in: Array.from(noteIds) } },
            include: {
              tags: true,
              hashtags: true,
              folders: { include: { folder: true } },
              links: true,
            },
          })
        : [],
      threadIds.size > 0
        ? this.prisma.chatThread.findMany({
            where: { id: { in: Array.from(threadIds) } },
          })
        : [],
      messageIds.size > 0
        ? this.prisma.chatMessageRecord.findMany({
            where: { id: { in: Array.from(messageIds) } },
          })
        : [],
      linkIds.size > 0
        ? this.prisma.noteLink.findMany({
            where: { id: { in: Array.from(linkIds) } },
          })
        : [],
      folderIds.size > 0
        ? this.prisma.folder.findMany({
            where: { id: { in: Array.from(folderIds) } },
          })
        : [],
    ]);

    const timestampIso = new Date().toISOString();
    const commitId = `${Date.now()}_${session.deviceId}_${randomUUID().slice(0, 8)}`;

    const commitPackage: CommitPackage = {
      commitId,
      parentCommitIds,
      deviceId: session.deviceId,
      author: session.author,
      timestamp: timestampIso,
      session: {
        sessionId: session.id,
        title: session.title,
        summary: input.summary || session.summary || undefined,
      },
      changes: {
        notes: notes.map((note) => ({
          action: (note.deletedAt ? 'DELETE' : 'UPSERT') as 'DELETE' | 'UPSERT',
          id: note.id,
          version: note.version,
          data: note as any,
        })),
        chatThreads: threads.map((thread) => ({
          action: (thread.deletedAt ? 'DELETE' : 'UPSERT') as 'DELETE' | 'UPSERT',
          id: thread.id,
          data: thread as any,
        })),
        chatMessages: messages.map((msg) => ({
          action: 'INSERT' as const,
          id: msg.id,
          threadId: msg.threadId,
          sender: msg.sender,
          senderName: msg.senderName,
          senderRole: msg.senderRole,
          avatar: msg.avatar,
          text: msg.text,
          createdAt: msg.createdAt.toISOString(),
          resonanceScore: msg.resonanceScore,
          sources: msg.sources,
        })),
        links: links.map((link) => ({
          action: 'INSERT' as const,
          id: link.id,
          url: link.url,
          title: link.title,
          noteId: link.noteId,
        })),
        folders: folders.map((f) => ({
          action: (f.deletedAt ? 'DELETE' : 'UPSERT') as 'DELETE' | 'UPSERT',
          id: f.id,
          path: f.path,
          name: f.name,
        })),
      },
    };


    const totalEntities =
      notes.length + threads.length + messages.length + links.length + folders.length;

    // Atomically create SyncCommit, close session, and clear pending changes
    const [savedCommit] = await this.prisma.$transaction([
      this.prisma.syncCommit.create({
        data: {
          id: commitId,
          parentCommitIds,
          deviceId: session.deviceId,
          author: session.author,
          sessionId: session.id,
          summary: input.summary || session.summary || `Зафиксировано ${totalEntities} изменений`,
          entitiesCount: totalEntities,
          payloadJson: commitPackage as any,
          isPushed: false,
        },
      }),
      this.prisma.syncSession.update({
        where: { id: session.id },
        data: {
          status: 'COMMITTED',
          closedAt: new Date(),
          summary: input.summary || session.summary,
        },
      }),
      this.prisma.pendingChange.deleteMany({
        where: { sessionId: session.id },
      }),
    ]);

    this.logger.log(
      `Committed session ${session.id} -> Commit ${commitId} with ${totalEntities} entities`,
    );

    return {
      commit: savedCommit,
      package: commitPackage,
    };
  }

  /**
   * Cancels an active session, removing all uncommitted pending changes.
   */
  async cancelSession(sessionId: string) {
    const session = await this.prisma.syncSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    await this.prisma.$transaction([
      this.prisma.pendingChange.deleteMany({
        where: { sessionId },
      }),
      this.prisma.syncSession.update({
        where: { id: sessionId },
        data: {
          status: 'CANCELLED',
          closedAt: new Date(),
        },
      }),
    ]);

    this.logger.log(`Cancelled session ${sessionId}`);
    return { cancelled: true, sessionId };
  }
}
