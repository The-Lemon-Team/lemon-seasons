import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { SystemStats } from '@lenta/shared';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Get aggregated system statistics, metric counters, and health status' })
  @ApiResponse({ status: 200, description: 'Aggregated system statistics' })
  async getStats(): Promise<SystemStats> {
    return this.statsService.getSystemStats();
  }
}
