import { Controller, Get, Sse, Query, Headers, MessageEvent, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { EventsSseService } from './events-sse.service';
import { SseSubscriptionQuery } from './events.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/auth.types';
import { AuthenticatedWriteGuard } from '../auth/admin-write.guard';

const ADMIN_TOKEN =
  process.env.ADMIN_TOKEN || 'lenta_adm_master_permanent_7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c';

@ApiTags('Events')
@Controller(['events', 'api/v1/events'])
export class EventsSseController {
  constructor(private readonly eventsSseService: EventsSseService) {}

  @Sse('stream')
  @ApiOperation({
    summary:
      'Unified Multiplexed SSE stream with server-side template matching (?streams=...&feeds=...&authors=...&hashtags=...&topology=true)',
  })
  @ApiQuery({ name: 'streams', required: false, description: 'Comma-separated stream slugs' })
  @ApiQuery({ name: 'feeds', required: false, description: 'Comma-separated feed slugs or IDs' })
  @ApiQuery({ name: 'authors', required: false, description: 'Comma-separated author / actor IDs' })
  @ApiQuery({ name: 'hashtags', required: false, description: 'Comma-separated hashtags' })
  @ApiQuery({ name: 'types', required: false, description: 'Comma-separated NoteTypes' })
  @ApiQuery({ name: 'parentNoteId', required: false, description: 'Filter replies to a parent note' })
  @ApiQuery({ name: 'noteId', required: false, description: 'Watch a single note ID' })
  @ApiQuery({ name: 'topology', required: false, description: 'Receive TOPOLOGY_PATCH updates (default: true)' })
  @ApiQuery({ name: 'since', required: false, description: 'Last processed SSE event ID for catch-up replay' })
  stream(
    @Query('token') token?: string,
    @Query('streams') streams?: string,
    @Query('feeds') feeds?: string,
    @Query('authors') authors?: string,
    @Query('hashtags') hashtags?: string,
    @Query('types') types?: string,
    @Query('parentNoteId') parentNoteId?: string,
    @Query('noteId') noteId?: string,
    @Query('topology') topology?: string,
    @Query('since') since?: string,
    @Headers('last-event-id') lastEventId?: string,
    @CurrentUser() user?: RequestUser,
  ): Observable<MessageEvent> {
    const isAdmin = Boolean(user?.isAdmin || (token && token === ADMIN_TOKEN));
    const filterQuery: SseSubscriptionQuery = {
      streams,
      feeds,
      authors,
      hashtags,
      types,
      parentNoteId,
      noteId,
      topology,
      since,
    };
    return this.eventsSseService.getEventStream(isAdmin, lastEventId || since, filterQuery);
  }

  @Sse('sse')
  @ApiOperation({ summary: 'Alias for /stream' })
  sse(
    @Query('token') token?: string,
    @Query('streams') streams?: string,
    @Query('feeds') feeds?: string,
    @Query('authors') authors?: string,
    @Query('hashtags') hashtags?: string,
    @Query('types') types?: string,
    @Query('parentNoteId') parentNoteId?: string,
    @Query('noteId') noteId?: string,
    @Query('topology') topology?: string,
    @Query('since') since?: string,
    @Headers('last-event-id') lastEventId?: string,
    @CurrentUser() user?: RequestUser,
  ): Observable<MessageEvent> {
    return this.stream(
      token,
      streams,
      feeds,
      authors,
      hashtags,
      types,
      parentNoteId,
      noteId,
      topology,
      since,
      lastEventId,
      user,
    );
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
    return this.eventsSseService.getRecentEvents(
      isAdmin,
      Number.isFinite(sinceNum) ? sinceNum : undefined,
    );
  }

  @Get('subscribers')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Inspect active SSE subscribers count and memory footprint' })
  getSubscribers() {
    return this.eventsSseService.getSubscriberStats();
  }
}
