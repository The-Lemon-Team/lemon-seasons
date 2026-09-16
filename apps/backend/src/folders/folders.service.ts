import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

export interface FolderTreeNode {
  id: string;
  name: string;
  path: string;
  icon: string | null;
  color: string | null;
  privacy?: 'private' | 'public';
  containerId?: string | null;
  scope?: 'external' | 'internal';
  notesCount: number;
  directNotesCount: number;
  updatedAt: Date;
  deletedAt: Date | null;
  children: FolderTreeNode[];
}

export interface FolderInputItem {
  path: string;
  isPrimary?: boolean;
  order?: number;
}

@Injectable()
export class FoldersService {
  constructor(private prisma: PrismaService) {}

  public static normalizePath(rawPath: string): string {
    if (!rawPath) return '';
    return rawPath
      .trim()
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/^\/|\/$/g, '');
  }

  public static getFolderName(normalizedPath: string): string {
    const parts = normalizedPath.split('/');
    const lastPart = parts[parts.length - 1] || 'Folder';
    return lastPart.trim();
  }

  async create(createFolderDto: CreateFolderDto) {
    const path = FoldersService.normalizePath(createFolderDto.path);
    if (!path) {
      throw new ConflictException('Folder path cannot be empty');
    }

    const targetContainerId = createFolderDto.containerId || null;

    const existing = await this.prisma.folder.findFirst({
      where: {
        path,
        containerId: targetContainerId,
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(`Folder with path '${path}' already exists in this scope`);
    }

    const name = createFolderDto.name?.trim() || FoldersService.getFolderName(path);

    // Auto-create any missing parent folders in the path hierarchy
    await this.ensureParentFolders(path, targetContainerId, createFolderDto.privacy);

    return this.prisma.folder.create({
      data: {
        name,
        path,
        icon: createFolderDto.icon?.trim() || null,
        color: createFolderDto.color?.trim() || null,
        privacy: createFolderDto.privacy || 'public',
        containerId: targetContainerId,
      },
      include: {
        _count: {
          select: {
            noteFolders: { where: { note: { deletedAt: null } } },
          },
        },
      },
    });
  }

  private async ensureParentFolders(
    childPath: string,
    containerId: string | null = null,
    privacy: 'public' | 'private' = 'public',
  ) {
    const parts = childPath.split('/');
    if (parts.length <= 1) return;

    let currentPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      const existing = await this.prisma.folder.findFirst({
        where: {
          path: currentPath,
          containerId,
          deletedAt: null,
        },
      });
      if (!existing) {
        await this.prisma.folder.create({
          data: {
            name: parts[i],
            path: currentPath,
            containerId,
            privacy,
          },
        });
      }
    }
  }

  async findAll(
    includeDeleted = false,
    search?: string,
    containerId?: string,
    scope?: 'external' | 'internal' | 'all',
  ) {
    let containerCondition: any = {};

    if (scope === 'external') {
      containerCondition = { containerId: null };
    } else if (scope === 'internal') {
      containerCondition = containerId ? { containerId } : { containerId: { not: null } };
    } else if (containerId) {
      containerCondition = {
        OR: [{ containerId: null }, { containerId }],
      };
    }

    return this.prisma.folder.findMany({
      where: {
        ...(includeDeleted ? {} : { deletedAt: null }),
        ...containerCondition,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { path: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        _count: {
          select: {
            noteFolders: { where: { note: { deletedAt: null } } },
          },
        },
      },
      orderBy: { path: 'asc' },
    });
  }

  async getTree(
    includeDeleted = false,
    containerId?: string,
    scope?: 'external' | 'internal' | 'all',
  ): Promise<FolderTreeNode[]> {
    const folders = await this.findAll(includeDeleted, undefined, containerId, scope);

    const folderMap = new Map<string, FolderTreeNode>();
    const roots: FolderTreeNode[] = [];

    // 1. Initialize all nodes
    for (const folder of folders) {
      const directCount = folder._count?.noteFolders || 0;
      const folderScope: 'external' | 'internal' = folder.containerId ? 'internal' : 'external';
      folderMap.set(folder.path, {
        id: folder.id,
        name: folder.name,
        path: folder.path,
        icon: folder.icon,
        color: folder.color,
        privacy: (folder.privacy as 'public' | 'private') || 'public',
        containerId: folder.containerId,
        scope: folderScope,
        directNotesCount: directCount,
        notesCount: directCount,
        updatedAt: folder.updatedAt,
        deletedAt: folder.deletedAt,
        children: [],
      });
    }

    // 2. Build tree hierarchy
    for (const folder of folders) {
      const treeNode = folderMap.get(folder.path)!;
      const lastSlashIndex = folder.path.lastIndexOf('/');
      if (lastSlashIndex === -1) {
        roots.push(treeNode);
      } else {
        const parentPath = folder.path.substring(0, lastSlashIndex);
        const parent = folderMap.get(parentPath);
        if (parent) {
          parent.children.push(treeNode);
        } else {
          roots.push(treeNode);
        }
      }
    }

    // 3. Compute total notesCount recursively (including descendants)
    const computeRecursiveCounts = (node: FolderTreeNode): number => {
      let sum = node.directNotesCount;
      for (const child of node.children) {
        sum += computeRecursiveCounts(child);
      }
      node.notesCount = sum;
      return sum;
    };

    roots.forEach((root) => computeRecursiveCounts(root));

    return roots;
  }

  async findOne(idOrPath: string) {
    const folder = await this.prisma.folder.findFirst({
      where: {
        OR: [{ id: idOrPath }, { path: FoldersService.normalizePath(idOrPath) }],
      },
      include: {
        noteFolders: {
          where: { note: { deletedAt: null } },
          include: {
            note: {
              include: {
                feed: true,
                tags: true,
                hashtags: true,
                images: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            noteFolders: { where: { note: { deletedAt: null } } },
          },
        },
      },
    });

    if (!folder || folder.deletedAt) {
      throw new NotFoundException(`Folder '${idOrPath}' not found`);
    }
    return folder;
  }

  async update(id: string, updateFolderDto: UpdateFolderDto) {
    const current = await this.prisma.folder.findUnique({ where: { id } });
    if (!current || current.deletedAt) {
      throw new NotFoundException(`Folder with ID '${id}' not found`);
    }

    const newPath = updateFolderDto.path
      ? FoldersService.normalizePath(updateFolderDto.path)
      : undefined;

    if (newPath && newPath !== current.path) {
      const existing = await this.prisma.folder.findFirst({
        where: { path: newPath, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`Folder with path '${newPath}' already exists`);
      }

      // If path changes, rename prefix on all subfolders too
      const oldPrefix = `${current.path}/`;
      const subfolders = await this.prisma.folder.findMany({
        where: {
          path: { startsWith: oldPrefix },
          deletedAt: null,
        },
      });

      for (const sub of subfolders) {
        const updatedSubPath = `${newPath}/${sub.path.substring(oldPrefix.length)}`;
        await this.prisma.folder.update({
          where: { id: sub.id },
          data: { path: updatedSubPath },
        });
      }
    }

    return this.prisma.folder.update({
      where: { id },
      data: {
        ...(updateFolderDto.name ? { name: updateFolderDto.name } : {}),
        ...(newPath ? { path: newPath } : {}),
        ...(updateFolderDto.icon !== undefined ? { icon: updateFolderDto.icon?.trim() || null } : {}),
        ...(updateFolderDto.color !== undefined ? { color: updateFolderDto.color?.trim() || null } : {}),
        ...(updateFolderDto.privacy !== undefined ? { privacy: updateFolderDto.privacy } : {}),
        ...(updateFolderDto.containerId !== undefined ? { containerId: updateFolderDto.containerId || null } : {}),
      },
      include: {
        _count: {
          select: {
            noteFolders: { where: { note: { deletedAt: null } } },
          },
        },
      },
    });
  }

  async softDelete(id: string) {
    const current = await this.prisma.folder.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException(`Folder with ID '${id}' not found`);
    }

    // Soft delete this folder and its subfolders
    const prefix = `${current.path}/`;
    await this.prisma.folder.updateMany({
      where: {
        OR: [{ id }, { path: { startsWith: prefix } }],
      },
      data: { deletedAt: new Date() },
    });

    return { success: true, message: `Folder '${current.path}' soft-deleted` };
  }

  async restore(id: string) {
    const current = await this.prisma.folder.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException(`Folder with ID '${id}' not found`);
    }

    const prefix = `${current.path}/`;
    await this.prisma.folder.updateMany({
      where: {
        OR: [{ id }, { path: { startsWith: prefix } }],
      },
      data: { deletedAt: null },
    });

    return { success: true, message: `Folder '${current.path}' restored` };
  }

  /**
   * Helper to resolve folder inputs (paths or objects) into NoteFolder creation items.
   * Auto-creates any folder paths that do not exist yet.
   */
  async resolveFolderAssignments(
    folderInputs?: (string | FolderInputItem)[],
    containerId?: string,
  ): Promise<{ folderId: string; isPrimary: boolean; order: number }[]> {
    if (!folderInputs || folderInputs.length === 0) {
      return [];
    }

    const assignments: { folderId: string; isPrimary: boolean; order: number }[] = [];
    const seenFolderIds = new Set<string>();
    let primaryAssigned = false;

    for (let i = 0; i < folderInputs.length; i++) {
      const item = folderInputs[i];
      const rawPath = typeof item === 'string' ? item : item.path;
      if (!rawPath) continue;

      let folder: any = null;

      // 1. If rawPath or item has an ID (e.g. UUID), lookup folder by ID first
      const possibleId = typeof item === 'object' && (item as any).id ? (item as any).id : rawPath;
      if (possibleId && typeof possibleId === 'string' && possibleId.length === 36 && possibleId.includes('-')) {
        folder = await this.prisma.folder.findFirst({
          where: {
            id: possibleId,
            deletedAt: null,
          },
        });
      }

      // 2. If not found by ID, look up by normalized path
      const normalizedPath = FoldersService.normalizePath(rawPath);
      if (!folder && normalizedPath) {
        folder = await this.prisma.folder.findFirst({
          where: {
            path: normalizedPath,
            ...(containerId ? { OR: [{ containerId }, { containerId: null }] } : { containerId: null }),
            deletedAt: null,
          },
          orderBy: { containerId: 'desc' },
        });
      }

      // 3. If still not found and normalizedPath is a real path (not a UUID), auto-create folder hierarchy
      if (!folder && normalizedPath) {
        const isUuid = rawPath.length === 36 && rawPath.includes('-');
        if (!isUuid) {
          await this.ensureParentFolders(normalizedPath, containerId || null);
          folder = await this.prisma.folder.create({
            data: {
              name: FoldersService.getFolderName(normalizedPath),
              path: normalizedPath,
              containerId: containerId || null,
            },
          });
        }
      }

      if (folder && !seenFolderIds.has(folder.id)) {
        seenFolderIds.add(folder.id);
        const isItemPrimary = typeof item === 'object' ? Boolean(item.isPrimary) : i === 0;
        const isPrimary = isItemPrimary && !primaryAssigned;
        if (isPrimary) {
          primaryAssigned = true;
        }

        assignments.push({
          folderId: folder.id,
          isPrimary,
          order: typeof item === 'object' && item.order !== undefined ? item.order : i,
        });
      }
    }

    // Ensure at least one is primary if we have assignments and none were explicitly true
    if (assignments.length > 0 && !primaryAssigned) {
      assignments[0].isPrimary = true;
    }

    return assignments;
  }
}
