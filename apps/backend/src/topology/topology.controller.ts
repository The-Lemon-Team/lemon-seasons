import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/auth.types';
import { TopologyService } from './topology.service';

@ApiTags('Topology (Каркас Счётчиков и Навигации)')
@Controller(['topology', 'api/v1/topology'])
export class TopologyController {
  constructor(private readonly topologyService: TopologyService) {}

  @Get()
  @ApiOperation({
    summary:
      'Получить авторитетный слепок Каркаса (счётчики стримов, фидов, вкладок, дат Chrono-Cloud, авторов и хэштегов)',
  })
  @ApiQuery({ name: 'streamSlug', required: false, type: String })
  @ApiQuery({ name: 'privacy', required: false, enum: ['public', 'private', 'all'] })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'SeasonsTopologySnapshot' })
  getTopology(
    @Query('streamSlug') streamSlug?: string,
    @Query('privacy') privacy?: string,
    @Query('days') days?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    const parsedDays = days ? Number(days) : undefined;
    return this.topologyService.getTopology({
      isAdmin: user?.isAdmin ?? false,
      streamSlug,
      privacy,
      days: Number.isFinite(parsedDays) ? parsedDays : undefined,
    });
  }

  @Get('streams/:slug')
  @ApiOperation({
    summary: 'Получить изолированный Каркас и фасетные счётчики конкретного Стрима',
  })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getStreamTopology(
    @Param('slug') slug: string,
    @Query('days') days?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    const parsedDays = days ? Number(days) : 90;
    return this.topologyService.getStreamTopology(
      slug,
      user?.isAdmin ?? false,
      Number.isFinite(parsedDays) ? parsedDays : 90,
    );
  }

  @Get('feeds/:idOrSlug')
  @ApiOperation({
    summary: 'Получить изолированный Каркас и фасетные счётчики конкретного Фида',
  })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getFeedTopology(
    @Param('idOrSlug') idOrSlug: string,
    @Query('days') days?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    const parsedDays = days ? Number(days) : 90;
    return this.topologyService.getFeedTopology(
      idOrSlug,
      user?.isAdmin ?? false,
      Number.isFinite(parsedDays) ? parsedDays : 90,
    );
  }
}
