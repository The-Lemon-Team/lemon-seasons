import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChatFolderDto, UpdateChatFolderDto } from '../dto';

@Injectable()
export class ChatFoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async getFolders() {
    return this.prisma.chatFolder.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            threads: { where: { deletedAt: null } },
            curators: { where: { deletedAt: null } },
            assistants: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getFolder(id: string) {
    const folder = await this.prisma.chatFolder.findUnique({
      where: { id },
      include: {
        curators: { where: { deletedAt: null } },
        assistants: { where: { deletedAt: null } },
        threads: {
          where: { deletedAt: null },
          orderBy: [{ isPinned: 'desc' }, { lastMessageAt: 'desc' }],
        },
      },
    });

    if (!folder || folder.deletedAt) {
      throw new NotFoundException(`Папка с ID ${id} не найдена.`);
    }

    return folder;
  }

  async createFolder(dto: CreateChatFolderDto) {
    const cleanPath = (dto.path || dto.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9а-яё\-]/gi, '-')
      .replace(/-+/g, '-');

    const uniquePath = `${cleanPath}-${Date.now().toString(36)}`;

    return this.prisma.chatFolder.create({
      data: {
        name: dto.name.trim(),
        path: dto.path ? dto.path.trim().toLowerCase() : uniquePath,
        description: dto.description?.trim() || null,
        icon: dto.icon || 'Folder',
        color: dto.color || '#3b82f6',
        order: dto.order ?? 0,
        parentId: dto.parentId || null,
        imageStylePrompt: dto.imageStylePrompt?.trim() || null,
        contextRules: dto.contextRules?.trim() || null,
      },
      include: {
        _count: {
          select: { threads: true, curators: true, assistants: true },
        },
      },
    });
  }

  async updateFolder(id: string, dto: UpdateChatFolderDto) {
    const existing = await this.prisma.chatFolder.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Папка с ID ${id} не найдена.`);
    }

    return this.prisma.chatFolder.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        icon: dto.icon !== undefined ? dto.icon : undefined,
        color: dto.color !== undefined ? dto.color : undefined,
        order: dto.order !== undefined ? dto.order : undefined,
        parentId: dto.parentId !== undefined ? dto.parentId : undefined,
        imageStylePrompt:
          dto.imageStylePrompt !== undefined ? dto.imageStylePrompt?.trim() || null : undefined,
        contextRules: dto.contextRules !== undefined ? dto.contextRules?.trim() || null : undefined,
      },
      include: {
        _count: {
          select: { threads: true, curators: true, assistants: true },
        },
      },
    });
  }

  async deleteFolder(id: string) {
    const existing = await this.prisma.chatFolder.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Папка с ID ${id} не найдена.`);
    }

    return this.prisma.chatFolder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
