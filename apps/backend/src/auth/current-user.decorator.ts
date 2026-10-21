import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from './auth.types';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.user || {
        id: 'usr-guest-000',
        role: 'guest',
        isAdmin: false,
        name: 'Гость (Public)',
      }
    );
  },
);
