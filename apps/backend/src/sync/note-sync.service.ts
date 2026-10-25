import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  MergeOutcome,
  NoteAttachment,
  NoteFields,
  SyncEventEnvelope,
  mergeNoteEvent,
} from '@lenta/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SCALAR_NOTE_FIELDS, toNoteSyncState } from './note-state.mapper';

export interface ApplyEventResult {
  eventId: string;
  outcome: MergeOutcome | 'DUPLICATE' | 'UNSUPPORTED';
  attachments: NoteAttachment[];
}

/**
 * Backend (AUTHORITY) applier of v2 sync events, shared by the LAN endpoint and the
 * Google Drive Bus relay. Idempotent by `eventId` (SyncEventLog).
 */
@Injectable()
export class NoteSyncService {
  private readonly logger = new Logger(NoteSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async applyEvents(events: SyncEventEnvelope[]): Promise<ApplyEventResult[]> {
    const ordered = [...events].sort((a, b) => (a.hlc < b.hlc ? -1 : a.hlc > b.hlc ? 1 : 0));
    const results: ApplyEventResult[] = [];
    for (const event of ordered) results.push(await this.applyEvent(event));
    return results;
  }

  async applyEvent(event: SyncEventEnvelope): Promise<ApplyEventResult> {
    const seen = await this.prisma.syncEventLog.findUnique({ where: { eventId: event.eventId } });
    if (seen) return { eventId: event.eventId, outcome: 'DUPLICATE', attachments: [] };

    if (event.entityType === 'ATTACHMENT') return this.applyAttachmentEvent(event);
    if (event.entityType !== 'NOTE') {
      await this.logEvent(event, 'UNSUPPORTED');
      return { eventId: event.eventId, outcome: 'UNSUPPORTED', attachments: [] };
    }
    return this.applyNoteEvent(event as SyncEventEnvelope<NoteFields | null>);
  }

  private async applyNoteEvent(
    event: SyncEventEnvelope<NoteFields | null>,
  ): Promise<ApplyEventResult> {
    const existing = await this.prisma.note.findUnique({ where: { id: event.entityId } });

    if (!existing) {
      if (event.action === 'DELETE') {
        await this.logEvent(event, 'NOOP');
        return { eventId: event.eventId, outcome: 'NOOP', attachments: [] };
      }
      const f = event.payload ?? {};
      await this.prisma.$transaction([
        this.prisma.note.create({
          data: {
            id: event.entityId,
            title: f.title ?? 'Без названия',
            description: f.description ?? null,
            folderPath: f.folderPath ?? null,
            feedId: f.feedId ?? null,
            icon: f.icon ?? null,
            sourceLink: f.sourceLink ?? null,
            version: 1,
            fieldClocks: Object.fromEntries(
              SCALAR_NOTE_FIELDS.filter((k) => f[k] !== undefined).map((k) => [k, event.hlc]),
            ),
          },
        }),
        this.prisma.noteVersion.create({
          data: {
            noteId: event.entityId,
            version: 1,
            content: f.description ?? '',
            commitHash: event.eventId,
            authorName: event.deviceId,
            commitMessage: 'Created from sync',
          },
        }),
        this.logEventOp(event, 'APPLIED'),
      ]);
      return { eventId: event.eventId, outcome: 'APPLIED', attachments: [] };
    }

    const local = toNoteSyncState(existing);
    const baseDescription = await this.resolveBaseDescription(existing.id, event.baseVersion);
    const result = mergeNoteEvent(local, event, { role: 'AUTHORITY', baseDescription });

    const ops: Prisma.PrismaPromise<unknown>[] = [];
    if (result.note.version !== local.version) {
      const f = result.note.fields;
      ops.push(
        this.prisma.note.update({
          where: { id: existing.id },
          data: {
            title: f.title ?? existing.title,
            description: f.description ?? null,
            folderPath: f.folderPath ?? null,
            feedId: f.feedId ?? null,
            icon: f.icon ?? null,
            sourceLink: f.sourceLink ?? null,
            version: result.note.version,
            fieldClocks: result.note.clocks as Prisma.InputJsonValue,
            deletedHlc: result.note.deletedHlc ?? null,
            deletedAt: result.note.deletedHlc ? existing.deletedAt ?? new Date() : null,
          },
        }),
        this.prisma.noteVersion.create({
          data: {
            noteId: existing.id,
            version: result.note.version,
            content: f.description ?? '',
            commitHash: event.eventId,
            authorName: event.deviceId,
            commitMessage: `Sync ${event.action} from ${event.deviceId}`,
          },
        }),
      );
    }
    for (const att of result.attachments) {
      ops.push(
        this.prisma.noteAttachment.upsert({
          where: { id: att.id },
          create: { ...att, meta: att.meta as unknown as Prisma.InputJsonValue },
          update: {},
        }),
      );
    }
    if (result.outcome === 'CONFLICT_ATTACHED') {
      this.logger.warn(`Conflict copy created for note ${existing.id} from ${event.deviceId}`);
    }
    ops.push(this.logEventOp(event, result.outcome));
    await this.prisma.$transaction(ops);
    return { eventId: event.eventId, outcome: result.outcome, attachments: result.attachments };
  }

  /** ATTACHMENT events: resolving a conflict copy arrives as DELETE (soft-delete). */
  private async applyAttachmentEvent(event: SyncEventEnvelope): Promise<ApplyEventResult> {
    if (event.action === 'DELETE') {
      await this.prisma.noteAttachment.updateMany({
        where: { id: event.entityId },
        data: { deletedAt: new Date() },
      });
    }
    await this.logEvent(event, 'APPLIED');
    return { eventId: event.eventId, outcome: 'APPLIED', attachments: [] };
  }

  private async resolveBaseDescription(noteId: string, baseVersion?: number | null) {
    if (baseVersion == null) return null;
    const v = await this.prisma.noteVersion.findFirst({
      where: { noteId, version: baseVersion },
      orderBy: { createdAt: 'desc' },
    });
    return v ? v.content : null;
  }

  private logEventOp(event: SyncEventEnvelope, outcome: string) {
    return this.prisma.syncEventLog.create({
      data: {
        eventId: event.eventId,
        deviceId: event.deviceId,
        entityType: event.entityType,
        entityId: event.entityId,
        hlc: event.hlc,
        outcome,
      },
    });
  }

  private async logEvent(event: SyncEventEnvelope, outcome: string) {
    await this.logEventOp(event, outcome);
  }
}
