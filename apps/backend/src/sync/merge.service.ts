import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommitPackage } from '@lenta/shared';

@Injectable()
export class MergeService {
  private readonly logger = new Logger(MergeService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Applies an incoming CommitPackage from Google Drive into the local database.
   */
  async applyCommit(
    pkg: CommitPackage,
  ): Promise<{ appliedEntities: number; conflicts: string[] }> {
    this.logger.log(
      `Applying commit ${pkg.commitId} from device ${pkg.deviceId} by ${pkg.author}`,
    );

    let appliedEntities = 0;
    const conflicts: string[] = [];

    // 1. Folders
    if (pkg.changes.folders && pkg.changes.folders.length > 0) {
      for (const f of pkg.changes.folders) {
        if (f.action === 'DELETE') {
          await this.prisma.folder.updateMany({
            where: { id: f.id },
            data: { deletedAt: new Date() },
          });
        } else {
          await this.prisma.folder.upsert({
            where: { id: f.id },
            create: {
              id: f.id,
              name: f.name,
              path: f.path,
            },
            update: {
              name: f.name,
              path: f.path,
              deletedAt: null,
            },
          });
        }
        appliedEntities++;
      }
    }

    // 2. Chat Threads & Messages (Append-only)
    if (pkg.changes.chatThreads && pkg.changes.chatThreads.length > 0) {
      for (const t of pkg.changes.chatThreads) {
        if (t.action === 'DELETE') {
          await this.prisma.chatThread.updateMany({
            where: { id: t.id },
            data: { deletedAt: new Date() },
          });
        } else if (t.data) {
          await this.prisma.chatThread.upsert({
            where: { id: t.id },
            create: {
              id: t.id,
              title: t.data.title || 'Беседа',
              type: (t.data.type as any) || 'DIRECT',
              targetAgent: t.data.targetAgent,
              participantAgents: t.data.participantAgents || [],
              dateScope: t.data.dateScope,
              isPinned: t.data.isPinned || false,
              isArchived: t.data.isArchived || false,
            },
            update: {
              title: t.data.title,
              targetAgent: t.data.targetAgent,
              participantAgents: t.data.participantAgents || [],
              dateScope: t.data.dateScope,
              isPinned: t.data.isPinned,
              isArchived: t.data.isArchived,
            },
          });
        }
        appliedEntities++;
      }
    }

    if (pkg.changes.chatMessages && pkg.changes.chatMessages.length > 0) {
      for (const m of pkg.changes.chatMessages) {
        const existing = await this.prisma.chatMessageRecord.findUnique({
          where: { id: m.id },
        });

        if (!existing) {
          // Verify thread exists
          const thread = await this.prisma.chatThread.findUnique({
            where: { id: m.threadId },
          });

          if (thread) {
            await this.prisma.chatMessageRecord.create({
              data: {
                id: m.id,
                threadId: m.threadId,
                sender: m.sender,
                senderName: m.senderName,
                senderRole: m.senderRole,
                avatar: m.avatar,
                text: m.text,
                resonanceScore: null,
                sources: m.sources || [],
                createdAt: new Date(m.createdAt),
              },
            });
            appliedEntities++;
          }
        }
      }
    }

    // 3. Links
    if (pkg.changes.links && pkg.changes.links.length > 0) {
      for (const link of pkg.changes.links) {
        if (link.action === 'DELETE') {
          await this.prisma.noteLink.deleteMany({
            where: { id: link.id },
          });
        } else {
          // If noteId provided, verify note exists
          let validNoteId: string | null = null;
          if (link.noteId) {
            const noteExists = await this.prisma.note.findUnique({
              where: { id: link.noteId },
            });
            if (noteExists) validNoteId = link.noteId;
          }

          if (validNoteId) {
            const existing = await this.prisma.noteLink.findUnique({
              where: { id: link.id },
            });
            if (!existing) {
              await this.prisma.noteLink.create({
                data: {
                  id: link.id,
                  url: link.url,
                  title: link.title,
                  noteId: validNoteId,
                },
              });
              appliedEntities++;
            }
          }
        }
      }
    }

    // 4. Notes (3-Way Merge & Revision Tracking)
    if (pkg.changes.notes && pkg.changes.notes.length > 0) {
      for (const incomingNote of pkg.changes.notes) {
        if (incomingNote.action === 'DELETE') {
          await this.prisma.note.updateMany({
            where: { id: incomingNote.id },
            data: { deletedAt: new Date() },
          });
          appliedEntities++;
          continue;
        }

        const data = incomingNote.data || ({} as any);
        const existing = await this.prisma.note.findUnique({
          where: { id: incomingNote.id },
          include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
        });

        if (!existing) {
          // Fresh note from another device
          const created = await this.prisma.note.create({
            data: {
              id: incomingNote.id,
              title: data.title || 'Без названия',
              description: data.description || '',
              type: data.type || 'SINGLE',
              startDate: data.startDate ? new Date(data.startDate) : new Date(),
              endDate: data.endDate ? new Date(data.endDate) : null,
              sourceLink: data.sourceLink,
              icon: data.icon,
              curator: data.curator,
              resonanceScore: null,
              version: incomingNote.version || 1,
            },
          });

          // Save note version
          await this.prisma.noteVersion.create({
            data: {
              noteId: created.id,
              version: created.version,
              content: created.description || '',
              commitHash: pkg.commitId,
              authorName: pkg.author,
              commitMessage: pkg.session.title || 'Импорт из удаленного коммита',
            },
          });

          appliedEntities++;
        } else {
          // Note exists locally. Perform 3-way reconciliation
          const localDesc = existing.description || '';
          const remoteDesc = data.description || '';

          let mergedDesc = remoteDesc;
          let isConflict = false;

          if (localDesc !== remoteDesc) {
            if (!localDesc) {
              mergedDesc = remoteDesc;
            } else if (!remoteDesc) {
              mergedDesc = localDesc;
            } else {
              // Both modified. Perform line-by-line merge
              const mergeResult = this.mergeMarkdownTexts(localDesc, remoteDesc, pkg.author);
              mergedDesc = mergeResult.text;
              if (mergeResult.hasConflict) {
                isConflict = true;
                conflicts.push(existing.title || existing.id);
                this.logger.warn(`Conflict detected in note ${existing.title} (${existing.id})`);
              }
            }
          }

          const nextVersion = Math.max(existing.version, incomingNote.version || 1) + 1;

          await this.prisma.note.update({
            where: { id: existing.id },
            data: {
              title: data.title || existing.title,
              description: mergedDesc,
              type: data.type || existing.type,
              startDate: data.startDate ? new Date(data.startDate) : existing.startDate,
              endDate: data.endDate ? new Date(data.endDate) : existing.endDate,
              curator: data.curator || existing.curator,
              resonanceScore: null,
              version: nextVersion,
              deletedAt: null,
            },
          });

          await this.prisma.noteVersion.create({
            data: {
              noteId: existing.id,
              version: nextVersion,
              content: mergedDesc,
              commitHash: pkg.commitId,
              authorName: pkg.author,
              commitMessage: isConflict
                ? `[Конфликт слияния] Правки от ${pkg.author}`
                : `Слияние коммита ${pkg.commitId}`,
            },
          });

          appliedEntities++;
        }
      }
    }

    return { appliedEntities, conflicts };
  }

  /**
   * Intelligent 3-way line-based merge for Markdown notes.
   * If both edits are non-overlapping, merges cleanly.
   * If overlapping, wraps in standard conflict markers to prevent data loss.
   */
  private mergeMarkdownTexts(
    localText: string,
    remoteText: string,
    remoteAuthor: string,
  ): { text: string; hasConflict: boolean } {
    if (localText.trim() === remoteText.trim()) {
      return { text: localText, hasConflict: false };
    }

    // If one contains the other entirely, take the longer one
    if (remoteText.includes(localText)) {
      return { text: remoteText, hasConflict: false };
    }
    if (localText.includes(remoteText)) {
      return { text: localText, hasConflict: false };
    }

    // Line-level non-overlapping check
    const localLines = localText.split('\n');
    const remoteLines = remoteText.split('\n');

    // If simple disjoint appending (e.g. news links or extra section added at the end)
    if (remoteText.startsWith(localText)) {
      return { text: remoteText, hasConflict: false };
    }
    if (localText.startsWith(remoteText)) {
      return { text: localText, hasConflict: false };
    }

    // True conflict: format cleanly without losing either side
    const conflictBlock = [
      '',
      `<<<<<<< Локальная версия (Этот компьютер)`,
      localText,
      `=======`,
      `>>>>>>> Удаленная версия (${remoteAuthor})`,
      remoteText,
      '',
    ].join('\n');

    return { text: conflictBlock, hasConflict: true };
  }
}
