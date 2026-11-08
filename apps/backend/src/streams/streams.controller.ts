import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Inject,
  forwardRef,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { StreamsService } from './streams.service';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { ReorderStreamsDto } from './dto/reorder-streams.dto';
import { ReorderTabsDto } from './dto/reorder-tabs.dto';
import { UpdateStreamTabDto } from './dto/update-stream-tab.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/auth.types';
import { AuthenticatedWriteGuard } from '../auth/admin-write.guard';
import { NotesService } from '../notes/notes.service';
import { QueryNotesDto } from '../notes/dto/query-notes.dto';

@ApiTags('Streams')
@Controller(['streams', 'api/v1/streams'])
export class StreamsController {
  constructor(
    private readonly streamsService: StreamsService,
    @Inject(forwardRef(() => NotesService))
    private readonly notesService: NotesService,
  ) {}

  @Post()
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Create a new stream' })
  @ApiResponse({ status: 201, description: 'Stream created successfully' })
  create(@Body() createStreamDto: CreateStreamDto) {
    return this.streamsService.create(createStreamDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all streams (filtered by privacy for public users)' })
  @ApiQuery({ name: 'includePrivate', required: false, type: Boolean })
  findAll(
    @Query('includePrivate') includePrivate?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    const canSeePrivate = Boolean(user?.isAdmin && includePrivate !== 'false');
    return this.streamsService.findAll(canSeePrivate);
  }

  @Get(':slug/notes')
  @ApiOperation({ summary: 'Get paginated notes for a stream by slug or ID' })
  async findStreamNotes(
    @Param('slug') slug: string,
    @Query() query: QueryNotesDto,
    @CurrentUser() user?: RequestUser,
  ) {
    const isAdmin = user?.isAdmin ?? false;
    const stream = await this.streamsService.findOne(slug, isAdmin);
    return this.notesService.findAll(
      {
        ...query,
        streamSource: stream.slug,
      },
      isAdmin,
    );
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a stream by slug or ID with populated feeds' })
  findOne(@Param('slug') slug: string, @CurrentUser() user?: RequestUser) {
    return this.streamsService.findOne(slug, user?.isAdmin ?? false);
  }

  @Patch('reorder')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Reorder streams' })
  reorder(@Body() dto: ReorderStreamsDto) {
    return this.streamsService.reorder(dto.items);
  }

  @Patch('tabs/:tabId')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Update stream tab overlay settings (custom title, icon, badge, isHidden)' })
  updateTab(@Param('tabId') tabId: string, @Body() dto: UpdateStreamTabDto) {
    return this.streamsService.updateTab(tabId, dto);
  }

  @Patch(':id/tabs/reorder')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Reorder tabs inside a stream' })
  reorderTabs(@Param('id') id: string, @Body() dto: ReorderTabsDto) {
    return this.streamsService.reorderTabs(id, dto.items);
  }

  @Patch(':id')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Update a stream' })
  update(@Param('id') id: string, @Body() updateStreamDto: UpdateStreamDto) {
    return this.streamsService.update(id, updateStreamDto);
  }

  @Post(':id/feeds/:feedId')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Attach a feed to a stream' })
  attachFeed(@Param('id') id: string, @Param('feedId') feedId: string) {
    return this.streamsService.attachFeed(id, feedId);
  }

  @Delete(':id/feeds/:feedId')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Detach a feed from a stream' })
  detachFeed(@Param('id') id: string, @Param('feedId') feedId: string) {
    return this.streamsService.detachFeed(id, feedId);
  }

  @Delete(':id')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Soft delete a stream' })
  remove(@Param('id') id: string) {
    return this.streamsService.remove(id);
  }
}
