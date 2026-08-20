import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';

export interface TaxonomyTreeNode {
  id: string;
  name: string;
  path: string;
  notesCount: number;
  updatedAt: Date;
  deletedAt: Date | null;
  children: TaxonomyTreeNode[];
}

@Injectable()
export class TaxonomyService {
  constructor(private prisma: PrismaService) {}

  async create(createTaxonomyDto: CreateTaxonomyDto) {
    const path = createTaxonomyDto.path.trim().toLowerCase();

    // Check if node with path exists
    const existing = await this.prisma.taxonomyNode.findFirst({
      where: { path, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Taxonomy node with path '${path}' already exists`);
    }

    return this.prisma.taxonomyNode.create({
      data: {
        name: createTaxonomyDto.name,
        path,
      },
      include: {
        _count: {
          select: {
            notes: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  async findAll(includeDeleted = false, search?: string) {
    return this.prisma.taxonomyNode.findMany({
      where: {
        ...(includeDeleted ? {} : { deletedAt: null }),
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
            notes: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { path: 'asc' },
    });
  }

  async getTree(includeDeleted = false): Promise<TaxonomyTreeNode[]> {
    const nodes = await this.findAll(includeDeleted);

    const nodeMap = new Map<string, TaxonomyTreeNode>();
    const roots: TaxonomyTreeNode[] = [];

    // First, convert all to TaxonomyTreeNode
    for (const node of nodes) {
      nodeMap.set(node.path, {
        id: node.id,
        name: node.name,
        path: node.path,
        notesCount: (node as any)._count?.notes || 0,
        updatedAt: node.updatedAt,
        deletedAt: node.deletedAt,
        children: [],
      });
    }

    // Now organize into hierarchy based on dot path
    for (const node of nodes) {
      const treeNode = nodeMap.get(node.path)!;
      const lastDotIndex = node.path.lastIndexOf('.');
      if (lastDotIndex === -1) {
        // Root node
        roots.push(treeNode);
      } else {
        const parentPath = node.path.substring(0, lastDotIndex);
        const parent = nodeMap.get(parentPath);
        if (parent) {
          parent.children.push(treeNode);
        } else {
          // If parent is missing, treat as top-level root
          roots.push(treeNode);
        }
      }
    }

    return roots;
  }

  async findOne(id: string) {
    const node = await this.prisma.taxonomyNode.findUnique({
      where: { id },
      include: {
        notes: {
          where: { deletedAt: null },
          orderBy: { startDate: 'desc' },
        },
        _count: {
          select: {
            notes: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!node || node.deletedAt) {
      throw new NotFoundException(`Taxonomy node with ID '${id}' not found`);
    }
    return node;
  }

  async update(id: string, updateTaxonomyDto: UpdateTaxonomyDto) {
    const current = await this.findOne(id);
    const newPath = updateTaxonomyDto.path?.trim().toLowerCase();

    if (newPath && newPath !== current.path) {
      const existing = await this.prisma.taxonomyNode.findFirst({
        where: { path: newPath, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`Taxonomy node with path '${newPath}' already exists`);
      }
    }

    return this.prisma.taxonomyNode.update({
      where: { id },
      data: {
        ...(updateTaxonomyDto.name ? { name: updateTaxonomyDto.name } : {}),
        ...(newPath ? { path: newPath } : {}),
      },
      include: {
        _count: {
          select: {
            notes: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.taxonomyNode.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    const node = await this.prisma.taxonomyNode.findUnique({ where: { id } });
    if (!node) {
      throw new NotFoundException(`Taxonomy node with ID '${id}' not found`);
    }
    return this.prisma.taxonomyNode.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
