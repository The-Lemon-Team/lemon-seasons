import { Module, Global } from '@nestjs/common';
import { AuthContextMiddleware } from './auth-context.middleware';

@Global()
@Module({
  providers: [AuthContextMiddleware],
  exports: [AuthContextMiddleware],
})
export class AuthModule {}
