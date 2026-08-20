import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  async getChangesSince(sinceIsoString?: string) {
    const sinceDate = sinceIsoString ? new Date(sinceIsoString) : new Date(0);
    const now = new Date();

    const [feeds, notes, taxonomy] = await Promise.all([
      this.prisma.feed.findMany({
        where: {
          updatedAt: { gte: sinceDate },
        },
      }),
      this.prisma.note.findMany({
        where: {
          updatedAt: { gte: sinceDate },
        },
        include: {
          tags: true,
        },
      }),
      this.prisma.taxonomyNode.findMany({
        where: {
          updatedAt: { gte: sinceDate },
        },
      }),
    ]);

    return {
      syncedAt: now.toISOString(),
      since: sinceDate.toISOString(),
      counts: {
        feeds: feeds.length,
        notes: notes.length,
        taxonomy: taxonomy.length,
      },
      feeds,
      notes,
      taxonomy,
    };
  }
}
