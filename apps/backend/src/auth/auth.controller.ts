import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from './current-user.decorator';
import { RequestUser } from './auth.types';

@ApiTags('Auth')
@Controller(['auth', 'api/v1/auth'])
export class AuthController {
  @Get('me')
  @ApiOperation({ summary: 'Return resolved account context for the active token or guest' })
  getMe(@CurrentUser() user?: RequestUser): RequestUser {
    return (
      user || {
        id: 'usr-guest-000',
        role: 'guest',
        isAdmin: false,
        name: 'Гость (Public)',
      }
    );
  }
}
