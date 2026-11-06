import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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

@ApiTags('Streams')
@Controller('streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Post()
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
    const canSeePrivate = user?.isAdmin || includePrivate === 'true';
    return this.streamsService.findAll(canSeePrivate);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a stream by slug or ID with populated feeds' })
  findOne(@Param('slug') slug: string, @CurrentUser() user?: RequestUser) {
    return this.streamsService.findOne(slug, user?.isAdmin ?? false);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder streams' })
  reorder(@Body() dto: ReorderStreamsDto) {
    return this.streamsService.reorder(dto.items);
  }

  @Patch('tabs/:tabId')
  @ApiOperation({ summary: 'Update stream tab overlay settings (custom title, icon, badge, isHidden)' })
  updateTab(@Param('tabId') tabId: string, @Body() dto: UpdateStreamTabDto) {
    return this.streamsService.updateTab(tabId, dto);
  }

  @Patch(':id/tabs/reorder')
  @ApiOperation({ summary: 'Reorder tabs inside a stream' })
  reorderTabs(@Param('id') id: string, @Body() dto: ReorderTabsDto) {
    return this.streamsService.reorderTabs(id, dto.items);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a stream' })
  update(@Param('id') id: string, @Body() updateStreamDto: UpdateStreamDto) {
    return this.streamsService.update(id, updateStreamDto);
  }

  @Post(':id/feeds/:feedId')
  @ApiOperation({ summary: 'Attach a feed to a stream' })
  attachFeed(@Param('id') id: string, @Param('feedId') feedId: string) {
    return this.streamsService.attachFeed(id, feedId);
  }

  @Delete(':id/feeds/:feedId')
  @ApiOperation({ summary: 'Detach a feed from a stream' })
  detachFeed(@Param('id') id: string, @Param('feedId') feedId: string) {
    return this.streamsService.detachFeed(id, feedId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a stream' })
  remove(@Param('id') id: string) {
    return this.streamsService.remove(id);
  }
}
