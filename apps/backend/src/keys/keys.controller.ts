import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { KeysService } from './keys.service';
import { UserKey } from '@lenta/shared';

@Controller('keys')
export class KeysController {
  constructor(private readonly keysService: KeysService) {}

  @Get()
  async getKeys(@Query('userId') userId: string = 'usr-member-001'): Promise<UserKey[]> {
    return this.keysService.getKeysForUser(userId);
  }

  @Post()
  async createKey(
    @Body('userId') userId: string = 'usr-member-001',
    @Body('provider') provider: string = 'obsidian',
    @Body('name') name: string = 'Obsidian Vault Key',
  ): Promise<UserKey> {
    return this.keysService.createKey(userId, provider, name);
  }

  @Delete(':id')
  async revokeKey(
    @Param('id') id: string,
    @Query('userId') userId: string = 'usr-member-001',
  ): Promise<{ success: boolean }> {
    return this.keysService.revokeKey(userId, id);
  }
}
