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
import { CreateChatFolderDto } from './dto/create-chat-folder.dto';
import { UpdateChatFolderDto } from './dto/update-chat-folder.dto';
import { CreateChatThreadDto } from './dto/create-chat-thread.dto';
import { UpdateChatThreadDto } from './dto/update-chat-thread.dto';
import { SendThreadMessageDto } from './dto/send-thread-message.dto';
import { QueryThreadsDto } from './dto/query-threads.dto';

@ApiTags('Chats & Curators Workspace')
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  // ---------------------------------------------------------------------------
  // Folders Endpoints
  // ---------------------------------------------------------------------------

  @Get('folders')
  @ApiOperation({ summary: 'List all chat folders with thread counts' })
  getFolders() {
    return this.chatsService.getFolders();
  }

  @Post('folders')
  @ApiOperation({ summary: 'Create a new chat folder' })
  createFolder(@Body() dto: CreateChatFolderDto) {
    return this.chatsService.createFolder(dto);
  }

  @Patch('folders/:id')
  @ApiOperation({ summary: 'Update chat folder attributes' })
  updateFolder(@Param('id') id: string, @Body() dto: UpdateChatFolderDto) {
    return this.chatsService.updateFolder(id, dto);
  }

  @Delete('folders/:id')
  @ApiOperation({ summary: 'Soft delete chat folder (threads become unassigned)' })
  deleteFolder(@Param('id') id: string) {
    return this.chatsService.deleteFolder(id);
  }

  // ---------------------------------------------------------------------------
  // Threads Endpoints
  // ---------------------------------------------------------------------------

  @Get('threads')
  @ApiOperation({ summary: 'List chat threads with filtering, search and last message preview' })
  getThreads(@Query() query: QueryThreadsDto) {
    return this.chatsService.getThreads(query);
  }

  @Post('threads')
  @ApiOperation({ summary: 'Create a new chat thread (Direct or Group)' })
  createThread(@Body() dto: CreateChatThreadDto) {
    return this.chatsService.createThread(dto);
  }

  @Get('threads/:id')
  @ApiOperation({ summary: 'Get single thread details' })
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
  // Messages Endpoints
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

  @Post('seed-defaults')
  @ApiOperation({ summary: 'Re-trigger default chat folders and starter threads seeding' })
  seedDefaults() {
    return this.chatsService.seedDefaultDataIfEmpty();
  }
}
