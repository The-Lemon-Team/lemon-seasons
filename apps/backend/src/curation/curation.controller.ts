import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurationService } from './curation.service';
import {
  QueryDailyNewsDto,
  TransformNewsDto,
  GeneratePodcastDto,
  PublishPodcastDto,
} from './dto/curation.dto';

@ApiTags('Curation & AI Studio')
@Controller('curation')
export class CurationController {
  constructor(private readonly curationService: CurationService) {}

  @Get('daily-news')
  @ApiOperation({ summary: 'Get candidate daily news cards for a date' })
  async getDailyNews(@Query() query: QueryDailyNewsDto) {
    const date = query.date || new Date().toISOString().split('T')[0];
    const news = await this.curationService.getDailyNews(date);
    return {
      date,
      count: news.length,
      news,
    };
  }

  @Post('daily-news/:id/transform')
  @ApiOperation({ summary: 'Transform a daily news candidate into a published calendar Note card' })
  async transformNews(
    @Param('id') id: string,
    @Body() dto: TransformNewsDto,
  ) {
    return this.curationService.transformNewsToNote(id, dto);
  }

  @Post('daily-news/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss a daily news card from pending review' })
  async dismissNews(@Param('id') id: string) {
    return this.curationService.dismissNews(id);
  }

  @Post('podcast/generate')
  @ApiOperation({ summary: 'Generate a 2-host NotebookLM style conversational podcast script using Gemini AI' })
  async generatePodcast(@Body() dto: GeneratePodcastDto) {
    return this.curationService.generatePodcast(dto);
  }

  @Post('podcast/publish')
  @ApiOperation({ summary: 'Publish the generated podcast script as an official calendar Note' })
  async publishPodcast(@Body() dto: PublishPodcastDto) {
    return this.curationService.publishPodcast(dto);
  }

  @Get('daily-summary')
  @ApiOperation({ summary: 'Get clean data daily resume and verified events for calendar view' })
  async getDailySummary(@Query('date') date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.curationService.getDailySummary(targetDate);
  }
}
