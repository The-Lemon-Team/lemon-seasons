import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SyncService } from './sync.service';

@ApiTags('Sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('changes')
  @ApiOperation({ summary: 'Delta sync pull endpoint for Obsidian and offline apps' })
  @ApiQuery({
    name: 'since',
    required: false,
    type: String,
    description: 'ISO 8601 timestamp to retrieve modified/created/deleted records since',
  })
  getChanges(@Query('since') since?: string) {
    return this.syncService.getChangesSince(since);
  }
}
