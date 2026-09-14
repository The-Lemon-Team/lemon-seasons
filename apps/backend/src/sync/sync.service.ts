import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  async getChangesSince(sinceIsoString?: string, containerId?: string) {
    const sinceDate = sinceIsoString ? new Date(sinceIsoString) : new Date(0);
    const now = new Date();

    const folderCondition = containerId
      ? {
          updatedAt: { gte: sinceDate },
          OR: [{ containerId: null }, { containerId }],
        }
      : {
          updatedAt: { gte: sinceDate },
          containerId: null,
        };

    const noteCondition = containerId
      ? {
          updatedAt: { gte: sinceDate },
          OR: [
            { containerId: null },
            { containerId },
          ],
        }
      : {
          updatedAt: { gte: sinceDate },
        };

    const [feeds, notes, taxonomy, hashtags, folders] = await Promise.all([
      this.prisma.feed.findMany({
        where: {
          updatedAt: { gte: sinceDate },
        },
      }),
      this.prisma.note.findMany({
        where: noteCondition,
        include: {
          tags: true,
          hashtags: true,
          folders: {
            include: { folder: true },
            orderBy: { order: 'asc' },
          },
          images: {
            orderBy: { order: 'asc' },
          },
          links: {
            orderBy: { order: 'asc' },
          },
        },
      }),
      this.prisma.taxonomyNode.findMany({
        where: {
          updatedAt: { gte: sinceDate },
        },
      }),
      this.prisma.hashtag.findMany({
        where: {
          updatedAt: { gte: sinceDate },
        },
      }),
      this.prisma.folder.findMany({
        where: folderCondition,
      }),
    ]);

    return {
      syncedAt: now.toISOString(),
      since: sinceDate.toISOString(),
      counts: {
        feeds: feeds.length,
        notes: notes.length,
        taxonomy: taxonomy.length,
        hashtags: hashtags.length,
        folders: folders.length,
      },
      feeds,
      notes,
      taxonomy,
      hashtags,
      folders,
    };
  }
}
