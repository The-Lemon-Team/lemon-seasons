import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { FeedsService } from './feeds.service';
import { CreateFeedDto } from './dto/create-feed.dto';
import { UpdateFeedDto } from './dto/update-feed.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/auth.types';

@ApiTags('Feeds')
@Controller('feeds')
export class FeedsController {
  constructor(private readonly feedsService: FeedsService) {}

  @Post()
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific feed by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user?: RequestUser) {
    return this.feedsService.findOne(id, user?.isAdmin ?? false);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a feed' })
  update(@Param('id') id: string, @Body() updateFeedDto: UpdateFeedDto) {
    return this.feedsService.update(id, updateFeedDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a feed' })
  remove(@Param('id') id: string) {
    return this.feedsService.softDelete(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted feed' })
  restore(@Param('id') id: string) {
    return this.feedsService.restore(id);
  }
}
