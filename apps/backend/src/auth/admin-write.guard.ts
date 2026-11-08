import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RequestUser } from './auth.types';

/**
 * Protects administrative / external app write endpoints (POST/PATCH/DELETE on Streams, Feeds, Notes).
 * Allows Admin tokens (`isAdmin: true`) and authenticated UserKey tokens (`role !== 'guest'`).
 * Blocks unauthenticated public guests from mutating feeds, streams, or notes.
 */
@Injectable()
export class AuthenticatedWriteGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (process.env.ALLOW_ANONYMOUS_WRITES === 'true') {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = req?.user;

    if (user && (user.isAdmin || user.role === 'admin' || user.role === 'user')) {
      return true;
    }

    throw new ForbiddenException(
      'Требуется токен авторизации (Authorization: Bearer <token> или x-api-key) для изменения данных.',
    );
  }
}
