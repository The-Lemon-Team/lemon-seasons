import { Controller, Get, Sse, Query, Headers, MessageEvent } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { EventsSseService } from './events-sse.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/auth.types';

const ADMIN_TOKEN =
  process.env.ADMIN_TOKEN || 'lenta_adm_master_permanent_7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c';

@ApiTags('Events')
@Controller(['events', 'api/v1/events'])
export class EventsSseController {
  constructor(private readonly eventsSseService: EventsSseService) {}

  @Sse('stream')
  @ApiOperation({ summary: 'Server-Sent Events (SSE) stream for real-time live feed updates' })
  stream(
    @Query('token') token?: string,
    @Headers('last-event-id') lastEventId?: string,
    @CurrentUser() user?: RequestUser,
  ): Observable<MessageEvent> {
    const isAdmin = Boolean(user?.isAdmin || (token && token === ADMIN_TOKEN));
    return this.eventsSseService.getEventStream(isAdmin, lastEventId);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Fetch recent events buffer for quick catch-up or polling fallback' })
  @ApiResponse({ status: 200, description: 'List of recent live feed events' })
  getRecent(
    @Query('token') token?: string,
    @Query('since') since?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    const isAdmin = Boolean(user?.isAdmin || (token && token === ADMIN_TOKEN));
    const sinceNum = since ? Number(since) : undefined;
    return this.eventsSseService.getRecentEvents(isAdmin, Number.isFinite(sinceNum) ? sinceNum : undefined);
  }
}
