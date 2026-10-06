import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssistantSkill } from '@prisma/client';
import {
  CreateCuratorDto,
  UpdateCuratorDto,
  CreateAssistantDto,
  UpdateAssistantDto,
} from '../dto';

@Injectable()
export class CuratorsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Curators CRUD
  // ---------------------------------------------------------------------------

  async getCurators(folderId?: string) {
    const where: any = { deletedAt: null };

    if (folderId && folderId !== 'all') {
      where.OR = [{ folderId }, { folderId: null }];
    }

    return this.prisma.curator.findMany({
      where,
      include: {
        folder: { select: { id: true, name: true, color: true } },
        _count: { select: { threads: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getCurator(id: string) {
    const curator = await this.prisma.curator.findUnique({
      where: { id },
      include: {
        folder: true,
        threads: { where: { deletedAt: null }, take: 10, orderBy: { lastMessageAt: 'desc' } },
      },
    });

    if (!curator || curator.deletedAt) {
      throw new NotFoundException(`Куратор с ID ${id} не найден.`);
    }

    return curator;
  }

  async createCurator(dto: CreateCuratorDto) {
    return this.prisma.curator.create({
      data: {
        name: dto.name.trim(),
        shortName: dto.shortName?.trim() || dto.name.split(' ')[0],
        roleTitle: dto.roleTitle.trim(),
        personality: dto.personality?.trim() || null,
        systemPrompt: dto.systemPrompt.trim(),
        emoji: dto.emoji || '👤',
        accentColor: dto.accentColor || '#10b981',
        folderId: dto.folderId || null,
        isSystem: false,
      },
      include: {
        folder: true,
      },
    });
  }

  async updateCurator(id: string, dto: UpdateCuratorDto) {
    const existing = await this.prisma.curator.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Куратор с ID ${id} не найден.`);
    }

    return this.prisma.curator.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        shortName: dto.shortName !== undefined ? dto.shortName?.trim() || null : undefined,
        roleTitle: dto.roleTitle !== undefined ? dto.roleTitle.trim() : undefined,
        personality: dto.personality !== undefined ? dto.personality?.trim() || null : undefined,
        systemPrompt: dto.systemPrompt !== undefined ? dto.systemPrompt.trim() : undefined,
        emoji: dto.emoji !== undefined ? dto.emoji : undefined,
        accentColor: dto.accentColor !== undefined ? dto.accentColor : undefined,
        folderId: dto.folderId !== undefined ? dto.folderId : undefined,
      },
      include: {
        folder: true,
      },
    });
  }

  async deleteCurator(id: string) {
    const existing = await this.prisma.curator.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Куратор с ID ${id} не найден.`);
    }

    return this.prisma.curator.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // Assistants CRUD
  // ---------------------------------------------------------------------------

  async getAssistants(folderId?: string, skillType?: AssistantSkill) {
    const where: any = { deletedAt: null };

    if (folderId && folderId !== 'all') {
      where.OR = [{ folderId }, { folderId: null }];
    }

    if (skillType) {
      where.skillType = skillType;
    }

    return this.prisma.assistant.findMany({
      where,
      include: {
        folder: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAssistant(id: string) {
    const assistant = await this.prisma.assistant.findUnique({
      where: { id },
      include: { folder: true },
    });

    if (!assistant || assistant.deletedAt) {
      throw new NotFoundException(`Помощник с ID ${id} не найден.`);
    }

    return assistant;
  }

  async createAssistant(dto: CreateAssistantDto) {
    return this.prisma.assistant.create({
      data: {
        name: dto.name.trim(),
        skillType: dto.skillType,
        description: dto.description?.trim() || null,
        customPrompt: dto.customPrompt?.trim() || null,
        config: dto.config || null,
        avatar: dto.avatar || '🛠️',
        folderId: dto.folderId || null,
      },
      include: { folder: true },
    });
  }

  async updateAssistant(id: string, dto: UpdateAssistantDto) {
    const existing = await this.prisma.assistant.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Помощник с ID ${id} не найден.`);
    }

    return this.prisma.assistant.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        skillType: dto.skillType !== undefined ? dto.skillType : undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        customPrompt: dto.customPrompt !== undefined ? dto.customPrompt?.trim() || null : undefined,
        config: dto.config !== undefined ? dto.config : undefined,
        avatar: dto.avatar !== undefined ? dto.avatar : undefined,
        folderId: dto.folderId !== undefined ? dto.folderId : undefined,
      },
      include: { folder: true },
    });
  }

  async deleteAssistant(id: string) {
    const existing = await this.prisma.assistant.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Помощник с ID ${id} не найден.`);
    }

    return this.prisma.assistant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
