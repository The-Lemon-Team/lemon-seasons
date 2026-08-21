import {
  Controller,
  Get,
  Param,
  Delete,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { HashtagsService } from './hashtags.service';
import { QueryHashtagsDto } from './dto/query-hashtags.dto';

@ApiTags('hashtags')
@Controller('hashtags')
export class HashtagsController {
  constructor(private readonly hashtagsService: HashtagsService) {}

  @Get()
  @ApiOperation({ summary: 'List all hashtags with note usage statistics' })
  @ApiResponse({ status: 200, description: 'Return all matching hashtags' })
  findAll(@Query() query: QueryHashtagsDto) {
    return this.hashtagsService.findAll(query);
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Real-time hashtag autocompletion' })
  @ApiResponse({ status: 200, description: 'Return autocomplete hashtag suggestions' })
  suggest(
    @Query('q') query?: string,
    @Query('limit') limit?: number,
  ) {
    return this.hashtagsService.suggest(query || '', limit ? Number(limit) : 10);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific hashtag and its notes' })
  @ApiParam({ name: 'id', description: 'Hashtag UUID' })
  @ApiResponse({ status: 200, description: 'Return the hashtag details' })
  @ApiResponse({ status: 404, description: 'Hashtag not found' })
  findOne(@Param('id') id: string) {
    return this.hashtagsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a hashtag' })
  @ApiParam({ name: 'id', description: 'Hashtag UUID' })
  @ApiResponse({ status: 200, description: 'Hashtag soft-deleted successfully' })
  @ApiResponse({ status: 404, description: 'Hashtag not found' })
  remove(@Param('id') id: string) {
    return this.hashtagsService.softDelete(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted hashtag' })
  @ApiParam({ name: 'id', description: 'Hashtag UUID' })
  @ApiResponse({ status: 200, description: 'Hashtag restored successfully' })
  @ApiResponse({ status: 404, description: 'Hashtag not found' })
  restore(@Param('id') id: string) {
    return this.hashtagsService.restore(id);
  }
}
