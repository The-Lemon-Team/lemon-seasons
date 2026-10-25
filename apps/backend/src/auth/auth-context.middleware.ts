import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from './auth.types';

@Injectable()
export class AuthContextMiddleware implements NestMiddleware {
  private readonly keyCache = new Map<string, { user: RequestUser; expiresAt: number }>();
  private readonly KEY_CACHE_TTL_MS = 60_000;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: any, res: any, next: () => void) {
    const adminToken =
      this.configService.get<string>('ADMIN_TOKEN') ||
      process.env.ADMIN_TOKEN ||
      this.configService.get<string>('VITE_ADMIN_TOKEN') ||
      process.env.VITE_ADMIN_TOKEN;

    const authHeader = req.headers['authorization'];
    const apiKey = req.headers['x-api-key'];
    const userKey = req.headers['x-user-key'];
    const adminHeader = req.headers['x-admin-token'];

    const bearerToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : typeof authHeader === 'string'
        ? authHeader.trim()
        : undefined;

    const token = bearerToken || apiKey || userKey || adminHeader;

    if (token) {
      // 1. Permanent Master Admin Token check
      if (adminToken && token === adminToken) {
        req.user = {
          id: 'usr-admin-master',
          role: 'admin',
          isAdmin: true,
          name: 'Master Admin',
        } satisfies RequestUser;
        return next();
      }

      // 2. Demo Admin Token pattern (e.g. lenta_tok_admin_...)
      if (token.startsWith('lenta_tok_admin_') || token === 'admin-demo-token') {
        req.user = {
          id: 'usr-admin-999',
          role: 'admin',
          isAdmin: true,
          name: 'Администратор (Admin)',
        } satisfies RequestUser;
        return next();
      }

      // 3. UserKey lookup in database (with 60s TTL cache)
      const cached = this.keyCache.get(token);
      if (cached && cached.expiresAt > Date.now()) {
        req.user = cached.user;
        return next();
      }

      try {
        const dbKey = await this.prisma.userKey.findUnique({
          where: { key: token },
          include: { user: true },
        });

        if (dbKey && !dbKey.isRevoked && dbKey.user) {
          const resolvedUser: RequestUser = {
            id: dbKey.user.id,
            role: dbKey.user.role as any,
            isAdmin: dbKey.user.role === 'admin',
            name: dbKey.user.name,
          };
          if (this.keyCache.size > 200) {
            const firstKey = this.keyCache.keys().next().value;
            if (firstKey) this.keyCache.delete(firstKey);
          }
          this.keyCache.set(token, {
            user: resolvedUser,
            expiresAt: Date.now() + this.KEY_CACHE_TTL_MS,
          });
          req.user = resolvedUser;
          return next();
        }
      } catch {
        // Fallback silently to guest on DB lookup error
      }

      // 4. Regular demo user token (e.g. lenta_tok_user_...)
      if (token.startsWith('lenta_tok_user_')) {
        req.user = {
          id: 'usr-member-001',
          role: 'user',
          isAdmin: false,
          name: 'Пользователь (User)',
        } satisfies RequestUser;
        return next();
      }
    }

    // Default: unauthenticated guest / public user
    req.user = {
      id: 'usr-guest-000',
      role: 'guest',
      isAdmin: false,
      name: 'Гость (Public)',
    } satisfies RequestUser;

    next();
  }
}
