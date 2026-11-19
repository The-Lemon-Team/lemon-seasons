import { Module, Global } from '@nestjs/common';
import { AuthContextMiddleware } from './auth-context.middleware';
import { AuthController } from './auth.controller';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthContextMiddleware],
  exports: [AuthContextMiddleware],
})
export class AuthModule {}
