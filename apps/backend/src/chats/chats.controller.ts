import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ChatsService } from './chats.service';
import { AssistantSkill } from '@prisma/client';
import {
  CreateChatFolderDto,
  UpdateChatFolderDto,
  CreateChatThreadDto,
  UpdateChatThreadDto,
  CreateCuratorDto,
  UpdateCuratorDto,
  CreateAssistantDto,
  UpdateAssistantDto,
  QueryThreadsDto,
  SendThreadMessageDto,
  GeneratePhotoDto,
  GeneratePodcastDto,
} from './dto';

@ApiTags('Chats, Curators & Topics Workspace')
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  // ---------------------------------------------------------------------------
  // Folders Endpoints
  // ---------------------------------------------------------------------------

  @Get('folders')
  @ApiOperation({ summary: 'List all chat folders with thread and curator counts' })
  getFolders() {
    return this.chatsService.getFolders();
  }

  @Get('folders/:id')
  @ApiOperation({ summary: 'Get single chat folder with curators, assistants and threads' })
  getFolder(@Param('id') id: string) {
    return this.chatsService.getFolder(id);
  }

  @Post('folders')
  @ApiOperation({ summary: 'Create a new chat folder' })
  createFolder(@Body() dto: CreateChatFolderDto) {
    return this.chatsService.createFolder(dto);
  }

  @Patch('folders/:id')
  @ApiOperation({ summary: 'Update chat folder attributes and prompts' })
  updateFolder(@Param('id') id: string, @Body() dto: UpdateChatFolderDto) {
    return this.chatsService.updateFolder(id, dto);
  }

  @Delete('folders/:id')
  @ApiOperation({ summary: 'Soft delete chat folder' })
  deleteFolder(@Param('id') id: string) {
    return this.chatsService.deleteFolder(id);
  }

  // ---------------------------------------------------------------------------
  // Curators Endpoints
  // ---------------------------------------------------------------------------

  @Get('curators')
  @ApiOperation({ summary: 'List all curators or curators for specific folder' })
  getCurators(@Query('folderId') folderId?: string) {
    return this.chatsService.getCurators(folderId);
  }

  @Get('curators/:id')
  @ApiOperation({ summary: 'Get single curator profile' })
  getCurator(@Param('id') id: string) {
    return this.chatsService.getCurator(id);
  }

  @Post('curators')
  @ApiOperation({ summary: 'Create a custom curator with personality and system prompt' })
  createCurator(@Body() dto: CreateCuratorDto) {
    return this.chatsService.createCurator(dto);
  }

  @Patch('curators/:id')
  @ApiOperation({ summary: 'Update curator profile or develop analytical focus' })
  updateCurator(@Param('id') id: string, @Body() dto: UpdateCuratorDto) {
    return this.chatsService.updateCurator(id, dto);
  }

  @Delete('curators/:id')
  @ApiOperation({ summary: 'Soft delete curator' })
  deleteCurator(@Param('id') id: string) {
    return this.chatsService.deleteCurator(id);
  }

  // ---------------------------------------------------------------------------
  // Assistants Endpoints
  // ---------------------------------------------------------------------------

  @Get('assistants')
  @ApiOperation({ summary: 'List assistants, optionally filtered by folder or skill' })
  getAssistants(
    @Query('folderId') folderId?: string,
    @Query('skillType') skillType?: AssistantSkill,
  ) {
    return this.chatsService.getAssistants(folderId, skillType);
  }

  @Get('assistants/:id')
  @ApiOperation({ summary: 'Get single assistant details' })
  getAssistant(@Param('id') id: string) {
    return this.chatsService.getAssistant(id);
  }

  @Post('assistants')
  @ApiOperation({ summary: 'Create a specialized assistant with skill' })
  createAssistant(@Body() dto: CreateAssistantDto) {
    return this.chatsService.createAssistant(dto);
  }

  @Patch('assistants/:id')
  @ApiOperation({ summary: 'Update assistant configuration' })
  updateAssistant(@Param('id') id: string, @Body() dto: UpdateAssistantDto) {
    return this.chatsService.updateAssistant(id, dto);
  }

  @Delete('assistants/:id')
  @ApiOperation({ summary: 'Soft delete assistant' })
  deleteAssistant(@Param('id') id: string) {
    return this.chatsService.deleteAssistant(id);
  }

  // ---------------------------------------------------------------------------
  // Threads / Chats Endpoints (Telegram-style unified list)
  // ---------------------------------------------------------------------------

  @Get('threads')
  @ApiOperation({ summary: 'List chat threads with filtering (folderId=all or specific), search and badges' })
  getThreads(@Query() query: QueryThreadsDto) {
    return this.chatsService.getThreads(query);
  }

  @Post('threads')
  @ApiOperation({ summary: 'Create a new chat thread (TOPIC, CURATOR, ASSISTANT, GROUP)' })
  createThread(@Body() dto: CreateChatThreadDto) {
    return this.chatsService.createThread(dto);
  }

  @Get('threads/:id')
  @ApiOperation({ summary: 'Get single thread details with folder, curator, assistant relations' })
  getThread(@Param('id') id: string) {
    return this.chatsService.getThread(id);
  }

  @Patch('threads/:id')
  @ApiOperation({ summary: 'Update thread properties (rename, move to folder, pin, archive)' })
  updateThread(@Param('id') id: string, @Body() dto: UpdateChatThreadDto) {
    return this.chatsService.updateThread(id, dto);
  }

  @Delete('threads/:id')
  @ApiOperation({ summary: 'Soft delete thread' })
  deleteThread(@Param('id') id: string) {
    return this.chatsService.deleteThread(id);
  }

  // ---------------------------------------------------------------------------
  // Messages & Action Skills Endpoints
  // ---------------------------------------------------------------------------

  @Get('threads/:id/messages')
  @ApiOperation({ summary: 'Get all messages for thread in chronological order' })
  getThreadMessages(@Param('id') id: string) {
    return this.chatsService.getThreadMessages(id);
  }

  @Post('threads/:id/messages')
  @ApiOperation({ summary: 'Send user message, invoke agent engine with context, persist replies' })
  sendMessage(@Param('id') id: string, @Body() dto: SendThreadMessageDto) {
    return this.chatsService.sendMessage(id, dto);
  }

  @Post('threads/:id/generate-photo')
  @ApiOperation({ summary: 'Generate themed photo with Gemini Imagen in thread context' })
  generatePhoto(@Param('id') id: string, @Body() dto: GeneratePhotoDto) {
    return this.chatsService.generatePhoto(id, dto);
  }

  @Post('threads/:id/generate-podcast')
  @ApiOperation({ summary: 'Generate NotebookLM podcast script from topic messages' })
  generatePodcast(@Param('id') id: string, @Body() dto: GeneratePodcastDto) {
    return this.chatsService.generatePodcast(id, dto);
  }

  @Post('seed-defaults')
  @ApiOperation({ summary: 'Re-trigger default chat folders, curators and starter topics seeding' })
  seedDefaults() {
    return this.chatsService.seedDefaultDataIfEmpty();
  }

  @Post('reset-reseed')
  @ApiOperation({ summary: 'Clear legacy chat data and reseed fresh Telegram structure' })
  resetAndReseed() {
    return this.chatsService.resetAndReseedChatData();
  }
}
