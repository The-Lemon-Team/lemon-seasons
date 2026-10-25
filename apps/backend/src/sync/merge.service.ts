import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommitPackage, formatHlc } from '@lenta/shared';
import { NoteSyncService } from './note-sync.service';

@Injectable()
export class MergeService {
  private readonly logger = new Logger(MergeService.name);

  constructor(
    private prisma: PrismaService,
    private noteSync: NoteSyncService,
  ) {}

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

    // 2. Links
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
          // Note exists: delegate to the shared merge (per-field LWW + 3-way body merge).
          // A true body collision keeps the local text and stores the incoming text as a
          // CONFLICT_COPY attachment on the parent note (no inline conflict markers).
          const result = await this.noteSync.applyEvent({
            schemaVersion: 2,
            eventId: `${pkg.commitId}:${incomingNote.id}`,
            timestamp: pkg.timestamp,
            hlc: formatHlc({
              wallMs: Date.parse(pkg.timestamp) || Date.now(),
              counter: 0,
              deviceId: pkg.deviceId,
            }),
            deviceId: pkg.deviceId,
            entityType: 'NOTE',
            entityId: incomingNote.id,
            action: 'UPSERT',
            baseVersion: Math.max(1, (incomingNote.version || 1) - 1),
            payload: {
              title: data.title,
              description: data.description,
              sourceLink: data.sourceLink,
              icon: data.icon,
            },
          });
          if (result.outcome === 'CONFLICT_ATTACHED') {
            conflicts.push(existing.title || existing.id);
          }
          if (result.outcome !== 'DUPLICATE' && result.outcome !== 'NOOP') appliedEntities++;
        }
      }
    }

    return { appliedEntities, conflicts };
  }
}

