import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KeyProvider, UserKey } from '@lenta/shared';
import { randomBytes } from 'crypto';

const PROVIDER_PREFIXES: Record<string, string> = {
  obsidian: 'lenta_obs_',
  telegram: 'lenta_tg_',
  github: 'lenta_gh_',
  api: 'lenta_api_',
};

@Injectable()
export class KeysService {
  constructor(private readonly prisma: PrismaService) {}

  private generateSecretKey(provider: string): string {
    const prefix = PROVIDER_PREFIXES[provider.toLowerCase()] || `lenta_${provider.toLowerCase()}_`;
    const token = randomBytes(16).toString('hex');
    return `${prefix}${token}`;
  }

  async getKeysForUser(userId: string): Promise<UserKey[]> {
    try {
      const targetUserId = userId || 'usr-member-001';
      const keys = await this.prisma.userKey.findMany({
        where: { userId: targetUserId, isRevoked: false },
        orderBy: { createdAt: 'desc' },
      });

      return keys.map((k) => ({
        id: k.id,
        userId: k.userId,
        name: k.name,
        provider: k.provider as KeyProvider,
        key: k.key,
        createdAt: k.createdAt.toISOString(),
        lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : undefined,
        isRevoked: k.isRevoked,
      }));
    } catch (err) {
      console.warn(`[KeysService] Could not retrieve keys for user '${userId}':`, err instanceof Error ? err.message : err);
      return [];
    }
  }

  async createKey(userId: string, provider: string, name: string): Promise<UserKey> {
    const targetUserId = userId || 'usr-member-001';
    const secretKey = this.generateSecretKey(provider);

    // Ensure parent User record exists in database
    await this.prisma.user.upsert({
      where: { id: targetUserId },
      update: {},
      create: {
        id: targetUserId,
        email: `${targetUserId}@lemon.team`,
        name: 'Member User',
        role: 'user',
      },
    });

    const created = await this.prisma.userKey.create({
      data: {
        userId: targetUserId,
        name: name || `${provider.toUpperCase()} Key`,
        provider: provider.toLowerCase(),
        key: secretKey,
      },
    });

    return {
      id: created.id,
      userId: created.userId,
      name: created.name,
      provider: created.provider as KeyProvider,
      key: created.key,
      createdAt: created.createdAt.toISOString(),
      lastUsedAt: created.lastUsedAt ? created.lastUsedAt.toISOString() : undefined,
      isRevoked: created.isRevoked,
    };
  }

  async revokeKey(userId: string, keyId: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.userKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Key with ID ${keyId} not found`);
    }

    await this.prisma.userKey.update({
      where: { id: keyId },
      data: { isRevoked: true },
    });

    return { success: true };
  }
}
