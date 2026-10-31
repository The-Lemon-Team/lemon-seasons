import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuickAddMacroDto, UpdateQuickAddMacroDto } from './dto/macro.dto';

@Injectable()
export class MacrosService {
  private readonly logger = new Logger(MacrosService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Получить все сохраненные макросы / пресеты быстрого добавления.
   * Если база пуста, автоматически инициализирует дефолтный пресет JM-Daily.
   */
  async findAll() {
    let macros = await this.prisma.quickAddMacro.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    if (macros.length === 0) {
      await this.seedDefaultJmDailyMacro();
      macros = await this.prisma.quickAddMacro.findMany({
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      });
    }

    // Обогащаем feedTitle без жесткой связи в схеме (инкапсуляция)
    const feedIds = Array.from(
      new Set(macros.map((m) => m.feedId).filter((id): id is string => Boolean(id))),
    );

    let feedsMap = new Map<string, string>();
    if (feedIds.length > 0) {
      const feeds = await this.prisma.feed.findMany({
        where: { id: { in: feedIds } },
        select: { id: true, title: true },
      });
      feedsMap = new Map(feeds.map((f) => [f.id, f.title]));
    }

    return macros.map((macro) => ({
      ...macro,
      feedTitle: macro.feedId ? feedsMap.get(macro.feedId) || null : null,
    }));
  }

  async findOne(id: string) {
    const macro = await this.prisma.quickAddMacro.findUnique({
      where: { id },
    });

    if (!macro) {
      throw new NotFoundException(`Macro with ID "${id}" not found`);
    }

    let feedTitle: string | null = null;
    if (macro.feedId) {
      const feed = await this.prisma.feed.findUnique({
        where: { id: macro.feedId },
        select: { title: true },
      });
      feedTitle = feed?.title || null;
    }

    return {
      ...macro,
      feedTitle,
    };
  }

  async create(dto: CreateQuickAddMacroDto) {
    const folderPaths = dto.folderPaths?.length
      ? dto.folderPaths
      : dto.folderPath
      ? [dto.folderPath]
      : [];

    const primaryFolderPath = dto.folderPath || folderPaths[0] || null;

    if (dto.isDefault) {
      // Сбросить признак default у остальных
      await this.prisma.quickAddMacro.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const macro = await this.prisma.quickAddMacro.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        icon: dto.icon || 'zap',
        color: dto.color || '#f59e0b',
        feedId: dto.feedId || null,
        folderPath: primaryFolderPath,
        folderPaths,
        noteType: dto.noteType || 'SINGLE',
        hashtags: dto.hashtags || [],
        order: dto.order ?? 0,
        isDefault: dto.isDefault ?? false,
        isSystem: false,
      },
    });

    this.logger.log(`Created quick add macro "${macro.name}" (${macro.id})`);
    return macro;
  }

  async update(id: string, dto: UpdateQuickAddMacroDto) {
    await this.findOne(id);

    if (dto.isDefault) {
      await this.prisma.quickAddMacro.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const folderPaths = dto.folderPaths !== undefined
      ? dto.folderPaths
      : dto.folderPath !== undefined
      ? (dto.folderPath ? [dto.folderPath] : [])
      : undefined;

    const data: any = {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
      ...(dto.icon !== undefined && { icon: dto.icon }),
      ...(dto.color !== undefined && { color: dto.color }),
      ...(dto.feedId !== undefined && { feedId: dto.feedId || null }),
      ...(dto.folderPath !== undefined && { folderPath: dto.folderPath || null }),
      ...(folderPaths !== undefined && { folderPaths }),
      ...(dto.noteType !== undefined && { noteType: dto.noteType }),
      ...(dto.hashtags !== undefined && { hashtags: dto.hashtags }),
      ...(dto.order !== undefined && { order: dto.order }),
      ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
    };

    return this.prisma.quickAddMacro.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const macro = await this.findOne(id);
    await this.prisma.quickAddMacro.delete({
      where: { id },
    });
    this.logger.log(`Deleted quick add macro "${macro.name}" (${id})`);
    return { success: true, id };
  }

  /**
   * Инициализация встроенного системного пресета JM-Daily
   */
  private async seedDefaultJmDailyMacro() {
    this.logger.log('Seeding default "JM-Daily" quick-add macro...');

    // Ищем ленту JM Daily
    const jmFeed = await this.prisma.feed.findFirst({
      where: {
        OR: [
          { slug: 'jm-daily' },
          { title: { contains: 'JM Daily', mode: 'insensitive' } },
        ],
      },
    });

    // Ищем папку JM_Daily
    const jmFolder = await this.prisma.folder.findFirst({
      where: {
        OR: [
          { path: 'JM_Daily' },
          { path: 'JM Daily' },
          { name: { contains: 'JM', mode: 'insensitive' } },
        ],
      },
    });

    const folderPath = jmFolder?.path || 'JM_Daily';
    const feedId = jmFeed?.id || null;

    await this.prisma.quickAddMacro.create({
      data: {
        name: 'JM-Daily',
        description: 'Быстрое добавление в ленту и папку JM Daily',
        icon: 'zap',
        color: '#f59e0b',
        feedId,
        folderPath,
        folderPaths: [folderPath],
        noteType: 'SINGLE',
        hashtags: [],
        order: 0,
        isDefault: true,
        isSystem: true,
      },
    });
  }
}
