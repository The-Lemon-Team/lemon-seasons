import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/workspace.dto';
import { CreateTrackDto, UpdateTrackDto } from './dto/track.dto';
import { CreatePinDto, UpdatePinDto, BatchLinkNotesDto } from './dto/pin.dto';
import { seedDefaultWorkspacesIfEmpty } from './workspaces.seed';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

@Injectable()
export class WorkspacesService implements OnModuleInit {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await seedDefaultWorkspacesIfEmpty(this.prisma);
    } catch (err) {
      this.logger.error('Failed to seed default workspaces:', err);
    }
  }

  // ==========================================
  // WORKSPACES
  // ==========================================

  async findAll(includeDeleted = false) {
    return this.prisma.workspace.findMany({
      where: includeDeleted ? undefined : { deletedAt: null },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        tracks: {
          where: includeDeleted ? undefined : { deletedAt: null },
          orderBy: { order: 'asc' },
          include: {
            _count: { select: { pins: true } },
          },
        },
        _count: {
          select: { pins: true, tracks: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        tracks: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          include: {
            _count: { select: { pins: true } },
          },
        },
        pins: {
          orderBy: { order: 'asc' },
          include: {
            note: {
              select: {
                id: true,
                title: true,
                description: true,
                type: true,
                status: true,
                privacy: true,
                startDate: true,
                endDate: true,
                author: true,
                parentNoteId: true,
                feedId: true,
                resonanceScore: true,
                feed: { select: { id: true, title: true, slug: true, icon: true } },
              },
            },
          },
        },
      },
    });

    if (!workspace || workspace.deletedAt) {
      throw new NotFoundException(`Workspace #${id} not found`);
    }

    return workspace;
  }

  async create(dto: CreateWorkspaceDto) {
    const slug = dto.slug?.trim() ? slugify(dto.slug) : slugify(dto.title);
    const existing = await this.prisma.workspace.findFirst({
      where: { slug, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Workspace with slug '${slug}' already exists`);
    }

    if (dto.isDefault) {
      await this.prisma.workspace.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.workspace.create({
      data: {
        title: dto.title.trim(),
        slug,
        icon: dto.icon || 'layout',
        color: dto.color || '#2481cc',
        description: dto.description?.trim(),
        isDefault: dto.isDefault ?? false,
        order: dto.order ?? 0,
      },
      include: { tracks: true },
    });
  }

  async update(id: string, dto: UpdateWorkspaceDto) {
    await this.findOne(id);

    let slug = dto.slug ? slugify(dto.slug) : undefined;
    if (slug) {
      const existing = await this.prisma.workspace.findFirst({
        where: { slug, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`Workspace with slug '${slug}' already exists`);
      }
    }

    if (dto.isDefault) {
      await this.prisma.workspace.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.workspace.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        slug,
        icon: dto.icon,
        color: dto.color,
        description: dto.description?.trim(),
        isDefault: dto.isDefault,
        order: dto.order,
      },
      include: { tracks: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.workspace.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==========================================
  // TRACKS
  // ==========================================

  async createTrack(workspaceId: string, dto: CreateTrackDto) {
    await this.findOne(workspaceId);

    return this.prisma.workspaceTrack.create({
      data: {
        workspaceId,
        title: dto.title.trim(),
        color: dto.color,
        icon: dto.icon,
        periodNoteId: dto.periodNoteId,
        order: dto.order ?? 0,
      },
    });
  }

  async updateTrack(workspaceId: string, trackId: string, dto: UpdateTrackDto) {
    const track = await this.prisma.workspaceTrack.findFirst({
      where: { id: trackId, workspaceId, deletedAt: null },
    });
    if (!track) {
      throw new NotFoundException(`Track #${trackId} not found in workspace #${workspaceId}`);
    }

    return this.prisma.workspaceTrack.update({
      where: { id: trackId },
      data: {
        title: dto.title?.trim(),
        color: dto.color,
        icon: dto.icon,
        periodNoteId: dto.periodNoteId,
        order: dto.order,
      },
    });
  }

  async removeTrack(workspaceId: string, trackId: string) {
    const track = await this.prisma.workspaceTrack.findFirst({
      where: { id: trackId, workspaceId, deletedAt: null },
    });
    if (!track) {
      throw new NotFoundException(`Track #${trackId} not found in workspace #${workspaceId}`);
    }

    // Set trackId to null for pins in this track so pins are preserved in general pins
    await this.prisma.workspacePin.updateMany({
      where: { trackId },
      data: { trackId: null },
    });

    return this.prisma.workspaceTrack.update({
      where: { id: trackId },
      data: { deletedAt: new Date() },
    });
  }

  // ==========================================
  // PINS
  // ==========================================

  async getAllMemberships() {
    return this.prisma.workspacePin.findMany({
      select: {
        workspaceId: true,
        noteId: true,
        isPinned: true,
        status: true,
        trackId: true,
      },
    });
  }

  async getPins(workspaceId: string, trackId?: string, status?: string) {
    return this.prisma.workspacePin.findMany({
      where: {
        workspaceId,
        trackId: trackId !== undefined ? trackId : undefined,
        status: status || undefined,
      },
      orderBy: { order: 'asc' },
      include: {
        track: true,
        note: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            status: true,
            privacy: true,
            startDate: true,
            endDate: true,
            author: true,
            parentNoteId: true,
            feedId: true,
            resonanceScore: true,
            sourceLink: true,
            feed: { select: { id: true, title: true, slug: true, icon: true, color: true } },
          },
        },
      },
    });
  }

  async pinNote(workspaceId: string, dto: CreatePinDto) {
    await this.findOne(workspaceId);

    const note = await this.prisma.note.findUnique({
      where: { id: dto.noteId },
      select: { id: true },
    });
    if (!note) {
      throw new NotFoundException(`Note #${dto.noteId} not found`);
    }

    if (dto.trackId) {
      const track = await this.prisma.workspaceTrack.findFirst({
        where: { id: dto.trackId, workspaceId, deletedAt: null },
      });
      if (!track) {
        throw new NotFoundException(`Track #${dto.trackId} not found in workspace #${workspaceId}`);
      }
    }

    return this.prisma.workspacePin.upsert({
      where: {
        workspaceId_noteId: {
          workspaceId,
          noteId: dto.noteId,
        },
      },
      create: {
        workspaceId,
        noteId: dto.noteId,
        trackId: dto.trackId || null,
        isPinned: dto.isPinned ?? false,
        status: dto.status || 'ACTIVE',
        comment: dto.comment?.trim(),
        order: dto.order ?? 0,
      },
      update: {
        trackId: dto.trackId !== undefined ? dto.trackId : undefined,
        isPinned: dto.isPinned !== undefined ? dto.isPinned : undefined,
        status: dto.status || undefined,
        comment: dto.comment !== undefined ? dto.comment?.trim() : undefined,
        order: dto.order !== undefined ? dto.order : undefined,
      },
      include: {
        track: true,
        note: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });
  }

  async updatePin(workspaceId: string, pinId: string, dto: UpdatePinDto) {
    const pin = await this.prisma.workspacePin.findFirst({
      where: { id: pinId, workspaceId },
    });
    if (!pin) {
      throw new NotFoundException(`Pin #${pinId} not found in workspace #${workspaceId}`);
    }

    if (dto.trackId) {
      const track = await this.prisma.workspaceTrack.findFirst({
        where: { id: dto.trackId, workspaceId, deletedAt: null },
      });
      if (!track) {
        throw new NotFoundException(`Track #${dto.trackId} not found in workspace #${workspaceId}`);
      }
    }

    return this.prisma.workspacePin.update({
      where: { id: pinId },
      data: {
        trackId: dto.trackId !== undefined ? dto.trackId : undefined,
        isPinned: dto.isPinned !== undefined ? dto.isPinned : undefined,
        status: dto.status,
        comment: dto.comment !== undefined ? dto.comment?.trim() : undefined,
        order: dto.order,
      },
      include: { track: true },
    });
  }

  async unpinNote(workspaceId: string, pinIdOrNoteId: string) {
    // Allows unpinning by either pinId or noteId for developer convenience
    const pin = await this.prisma.workspacePin.findFirst({
      where: {
        workspaceId,
        OR: [{ id: pinIdOrNoteId }, { noteId: pinIdOrNoteId }],
      },
    });

    if (!pin) {
      throw new NotFoundException(`Pin not found in workspace #${workspaceId}`);
    }

    return this.prisma.workspacePin.delete({
      where: { id: pin.id },
    });
  }

  // ==========================================
  // BATCH NOTE LINKING (PARENT-CHILD SYNTHESIS)
  // ==========================================

  async batchLinkNotes(dto: BatchLinkNotesDto) {
    const parentNote = await this.prisma.note.findUnique({
      where: { id: dto.parentNoteId },
      select: { id: true, title: true, type: true },
    });
    if (!parentNote) {
      throw new NotFoundException(`Parent note #${dto.parentNoteId} not found`);
    }

    if (!dto.childNoteIds || dto.childNoteIds.length === 0) {
      throw new BadRequestException('childNoteIds cannot be empty');
    }

    // Filter out parentNoteId if included in childNoteIds to avoid self-linking cycle
    const targetChildIds = dto.childNoteIds.filter((id) => id !== dto.parentNoteId);

    const result = await this.prisma.note.updateMany({
      where: { id: { in: targetChildIds } },
      data: { parentNoteId: dto.parentNoteId },
    });

    return {
      success: true,
      parentNote,
      linkedCount: result.count,
    };
  }
}
