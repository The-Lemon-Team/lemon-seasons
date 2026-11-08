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
import { FeedsService } from './feeds.service';
import { CreateFeedDto } from './dto/create-feed.dto';
import { UpdateFeedDto } from './dto/update-feed.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/auth.types';
import { AuthenticatedWriteGuard } from '../auth/admin-write.guard';
import { NotesService } from '../notes/notes.service';
import { QueryNotesDto } from '../notes/dto/query-notes.dto';

@ApiTags('Feeds')
@Controller(['feeds', 'api/v1/feeds'])
export class FeedsController {
  constructor(
    private readonly feedsService: FeedsService,
    @Inject(forwardRef(() => NotesService))
    private readonly notesService: NotesService,
  ) {}

  @Post()
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Create a new feed' })
  @ApiResponse({ status: 201, description: 'Feed created successfully' })
  create(@Body() createFeedDto: CreateFeedDto) {
    return this.feedsService.create(createFeedDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all feeds (filtered by privacy for public users)' })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('includeDeleted') includeDeleted?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    const isDeleted = includeDeleted === 'true';
    return this.feedsService.findAll(isDeleted, search, user?.isAdmin ?? false);
  }

  @Get(':idOrSlug/notes')
  @ApiOperation({ summary: 'Get paginated notes for a specific feed by ID or slug' })
  async findFeedNotes(
    @Param('idOrSlug') idOrSlug: string,
    @Query() query: QueryNotesDto,
    @CurrentUser() user?: RequestUser,
  ) {
    const isAdmin = user?.isAdmin ?? false;
    const feed = await this.feedsService.findOne(idOrSlug, isAdmin, false);
    return this.notesService.findAll(
      {
        ...query,
        feedId: feed.id,
      },
      isAdmin,
    );
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get a specific feed by ID or slug' })
  @ApiQuery({ name: 'includeNotes', required: false, type: Boolean })
  findOne(
    @Param('idOrSlug') idOrSlug: string,
    @Query('includeNotes') includeNotes?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.feedsService.findOne(
      idOrSlug,
      user?.isAdmin ?? false,
      includeNotes !== 'false',
    );
  }

  @Patch(':id')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Update a feed' })
  update(@Param('id') id: string, @Body() updateFeedDto: UpdateFeedDto) {
    return this.feedsService.update(id, updateFeedDto);
  }

  @Delete(':id')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Soft delete a feed' })
  remove(@Param('id') id: string) {
    return this.feedsService.softDelete(id);
  }

  @Post(':id/restore')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Restore a soft-deleted feed' })
  restore(@Param('id') id: string) {
    return this.feedsService.restore(id);
  }
}
