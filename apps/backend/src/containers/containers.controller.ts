import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ContainersService, ContainerSummaryDto, FileItemDto, CommitSummaryDto, FileVersionDto } from './containers.service';

@Controller('containers')
export class ContainersController {
  constructor(private readonly containersService: ContainersService) {}

  @Get()
  async listContainers(
    @Query('userId') userId?: string,
    @Query('includePrivate') includePrivate?: string,
  ): Promise<ContainerSummaryDto[]> {
    const showPrivate = includePrivate === undefined ? true : (includePrivate === 'true' || includePrivate === '1');
    return this.containersService.listContainers(userId, showPrivate);
  }

  @Get('by-key/:key')
  async getContainerByKey(@Param('key') key: string): Promise<ContainerSummaryDto> {
    return this.containersService.getContainerSummary(key);
  }

  @Post('connect')
  async connectContainerByKey(@Body() body: { key: string }): Promise<ContainerSummaryDto> {
    if (!body.key) {
      throw new BadRequestException('Container key is required.');
    }
    return this.containersService.getContainerSummary(body.key);
  }

  @Post('register')
  async registerContainer(@Body() body: { name: string; type?: string; description?: string; visibility?: 'private' | 'public' }): Promise<ContainerSummaryDto> {
    return this.containersService.registerContainer(body);
  }

  @Get(':id')
  async getContainerSummary(@Param('id') id: string): Promise<ContainerSummaryDto> {
    return this.containersService.getContainerSummary(id);
  }

  @Post(':id/privacy')
  async updateContainerPrivacy(
    @Param('id') id: string,
    @Body() body: { visibility?: 'private' | 'public' }
  ): Promise<{ success: boolean; visibility: 'private' | 'public' }> {
    const visibility = body.visibility ?? 'public';
    return this.containersService.updateContainerPrivacy(id, visibility);
  }

  @Get(':id/files')
  async listFiles(@Param('id') id: string): Promise<FileItemDto[]> {
    return this.containersService.getContainerFiles(id);
  }

  @Get(':id/commits')
  async getCommits(
    @Param('id') id: string,
    @Query('limit') limit?: string
  ): Promise<CommitSummaryDto[]> {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.containersService.getContainerCommits(id, parsedLimit);
  }

  @Get(':id/file-version')
  async getFileVersion(
    @Param('id') id: string,
    @Query('path') filePath: string,
    @Query('commit') commitHash: string
  ): Promise<FileVersionDto> {
    if (!filePath || !commitHash) {
      throw new BadRequestException('Query parameters "path" and "commit" are required.');
    }
    return this.containersService.getFileVersion(id, filePath, commitHash);
  }

  @Post(':id/push')
  async pushContainer(
    @Param('id') id: string,
    @Body() body: { baseCommit?: string; message?: string; files?: Array<{ path: string; content: string }> }
  ) {
    return this.containersService.pushContainer(id, body);
  }

  @Post(':id/pull')
  async pullContainer(
    @Param('id') id: string,
    @Body() body: { sinceCommit?: string; paths?: string[] }
  ) {
    return this.containersService.pullContainer(id, body);
  }
}
