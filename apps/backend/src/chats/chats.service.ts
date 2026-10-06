import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../sync/session.service';
import { ChatType, AssistantSkill } from '@prisma/client';
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
import {
  CuratorsService,
  ChatFoldersService,
  ChatMediaService,
  ChatSeederService,
} from './services';

@Injectable()
export class ChatsService implements OnModuleInit {
  private readonly logger = new Logger(ChatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly curatorsService: CuratorsService,
    private readonly chatFoldersService: ChatFoldersService,
    private readonly chatMediaService: ChatMediaService,
    private readonly chatSeederService: ChatSeederService,
  ) {}

  async onModuleInit() {
    await this.chatSeederService.seedDefaultDataIfEmpty();
  }

  // ---------------------------------------------------------------------------
  // 1. Delegated Folders API
  // ---------------------------------------------------------------------------
  getFolders() {
    return this.chatFoldersService.getFolders();
  }

  getFolder(id: string) {
    return this.chatFoldersService.getFolder(id);
  }

  createFolder(dto: CreateChatFolderDto) {
    return this.chatFoldersService.createFolder(dto);
  }

  updateFolder(id: string, dto: UpdateChatFolderDto) {
    return this.chatFoldersService.updateFolder(id, dto);
  }

  deleteFolder(id: string) {
    return this.chatFoldersService.deleteFolder(id);
  }

  // ---------------------------------------------------------------------------
  // 2. Delegated Curators API
  // ---------------------------------------------------------------------------
  getCurators(folderId?: string) {
    return this.curatorsService.getCurators(folderId);
  }

  getCurator(id: string) {
    return this.curatorsService.getCurator(id);
  }

  createCurator(dto: CreateCuratorDto) {
    return this.curatorsService.createCurator(dto);
  }

  updateCurator(id: string, dto: UpdateCuratorDto) {
    return this.curatorsService.updateCurator(id, dto);
  }

  deleteCurator(id: string) {
    return this.curatorsService.deleteCurator(id);
  }

  // ---------------------------------------------------------------------------
  // 3. Delegated Assistants API
  // ---------------------------------------------------------------------------
  getAssistants(folderId?: string, skillType?: AssistantSkill) {
    return this.curatorsService.getAssistants(folderId, skillType);
  }

  getAssistant(id: string) {
    return this.curatorsService.getAssistant(id);
  }

  createAssistant(dto: CreateAssistantDto) {
    return this.curatorsService.createAssistant(dto);
  }

  updateAssistant(id: string, dto: UpdateAssistantDto) {
    return this.curatorsService.updateAssistant(id, dto);
  }

  deleteAssistant(id: string) {
    return this.curatorsService.deleteAssistant(id);
  }

  // ---------------------------------------------------------------------------
  // 4. Threads / Chats API
  // ---------------------------------------------------------------------------
  async getThreads(query: QueryThreadsDto) {
    const where: any = {
      deletedAt: null,
    };

    if (query.folderId && query.folderId !== 'all') {
      where.folderId = query.folderId === 'null' ? null : query.folderId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.curatorId) {
      where.curatorId = query.curatorId;
    }

    if (query.assistantId) {
      where.assistantId = query.assistantId;
    }

    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { targetAgent: { contains: q, mode: 'insensitive' } },
        { curator: { name: { contains: q, mode: 'insensitive' } } },
        { assistant: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.chatThread.findMany({
      where,
      include: {
        folder: { select: { id: true, name: true, color: true, icon: true } },
        curator: true,
        assistant: true,
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { text: true, senderName: true, createdAt: true },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { lastMessageAt: 'desc' }],
    });
  }

  async getThread(id: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id },
      include: {
        folder: true,
        curator: true,
        assistant: true,
      },
    });

    if (!thread || thread.deletedAt) {
      throw new NotFoundException(`Чат с ID ${id} не найден.`);
    }

    return thread;
  }

  async createThread(dto: CreateChatThreadDto) {
    let targetAgent = dto.targetAgent || null;
    if (!targetAgent && dto.curatorId) {
      const curator = await this.prisma.curator.findUnique({ where: { id: dto.curatorId } });
      if (curator) targetAgent = curator.shortName || curator.name;
    }

    const created = await this.prisma.chatThread.create({
      data: {
        title: dto.title.trim(),
        type: dto.type || ChatType.TOPIC,
        folderId: dto.folderId || null,
        curatorId: dto.curatorId || null,
        assistantId: dto.assistantId || null,
        targetAgent,
        participantAgents: dto.participantAgents || (targetAgent ? [targetAgent] : []),
        dateScope: dto.dateScope || null,
        isPinned: dto.isPinned ?? false,
      },
      include: {
        folder: true,
        curator: true,
        assistant: true,
      },
    });

    try {
      await this.sessionService.recordChange({
        entityType: 'CHAT_THREAD',
        entityId: created.id,
        action: 'INSERT',
        payload: { title: created.title, type: created.type },
      });
    } catch {
      // ignore
    }

    return created;
  }

  async updateThread(id: string, dto: UpdateChatThreadDto) {
    const existing = await this.prisma.chatThread.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Чат с ID ${id} не найден.`);
    }

    return this.prisma.chatThread.update({
      where: { id },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        folderId: dto.folderId !== undefined ? dto.folderId : undefined,
        isPinned: dto.isPinned !== undefined ? dto.isPinned : undefined,
        isArchived: dto.isArchived !== undefined ? dto.isArchived : undefined,
        dateScope: dto.dateScope !== undefined ? dto.dateScope : undefined,
      },
      include: {
        folder: true,
        curator: true,
        assistant: true,
      },
    });
  }

  async deleteThread(id: string) {
    const existing = await this.prisma.chatThread.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Чат с ID ${id} не найден.`);
    }

    return this.prisma.chatThread.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Messages API & Dispatch
  // ---------------------------------------------------------------------------
  async getMessages(threadId: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
    });
    if (!thread || thread.deletedAt) {
      throw new NotFoundException(`Чат с ID ${threadId} не найден.`);
    }

    return this.prisma.chatMessageRecord.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });
  }

  getThreadMessages(threadId: string) {
    return this.getMessages(threadId);
  }

  async sendMessage(threadId: string, dto: SendThreadMessageDto) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { folder: true, curator: true, assistant: true },
    });

    if (!thread || thread.deletedAt) {
      throw new NotFoundException(`Чат с ID ${threadId} не найден.`);
    }

    const rawMessage = dto.message.trim();
    if (!rawMessage) {
      throw new NotFoundException('Сообщение не может быть пустым.');
    }

    // 1. Save user message
    const userMessageRecord = await this.prisma.chatMessageRecord.create({
      data: {
        threadId,
        sender: 'user',
        senderType: 'USER',
        senderName: 'Куратор редакции',
        senderRole: 'Редактор / Пользователь',
        avatar: '👤',
        text: rawMessage,
      },
    });

    try {
      await this.sessionService.recordChange({
        entityType: 'CHAT_MESSAGE',
        entityId: userMessageRecord.id,
        action: 'INSERT',
        payload: { threadId, text: userMessageRecord.text },
      });
    } catch {
      // Continue even if session tracking fails
    }

    // 2. Check for explicit skill trigger commands
    const lower = rawMessage.toLowerCase();
    if (
      lower.startsWith('/photo') ||
      lower.startsWith('/image') ||
      lower.startsWith('/pic') ||
      lower.startsWith('сгенерируй фото') ||
      lower.startsWith('создай фото') ||
      lower.startsWith('сделай обложку')
    ) {
      const promptArg = rawMessage
        .replace(/^(\/photo|\/image|\/pic|сгенерируй фото|создай фото|сделай обложку)/i, '')
        .trim();
      const photoResult = await this.chatMediaService.generatePhoto(threadId, {
        prompt: promptArg || undefined,
      });
      return {
        threadId,
        userMessage: userMessageRecord,
        replies: [photoResult],
      };
    }

    if (
      lower.startsWith('/podcast') ||
      lower.startsWith('/notebooklm') ||
      lower.startsWith('сгенерируй подкаст') ||
      lower.startsWith('собери подкаст') ||
      lower.startsWith('запиши подкаст')
    ) {
      const podcastResult = await this.chatMediaService.generatePodcast(threadId, {});
      return {
        threadId,
        userMessage: userMessageRecord,
        replies: [podcastResult],
      };
    }

    // 3. Dispatch agent reply based on thread type
    const history = await this.prisma.chatMessageRecord.findMany({
      where: { threadId },
      take: 12,
      orderBy: { createdAt: 'desc' },
    });
    const reversedHistory = history.reverse();

    let replyMessageRecord;

    if (thread.curator) {
      replyMessageRecord = await this.generateCuratorResponse(
        thread,
        thread.curator,
        rawMessage,
        reversedHistory,
      );
    } else if (thread.assistant) {
      replyMessageRecord = await this.generateAssistantResponse(
        thread,
        thread.assistant,
        rawMessage,
        reversedHistory,
      );
    } else {
      replyMessageRecord = await this.generateTopicResponse(thread, rawMessage, reversedHistory);
    }

    // 4. Update lastMessageAt on thread
    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    return {
      threadId,
      userMessage: userMessageRecord,
      replies: [replyMessageRecord],
    };
  }

  // ---------------------------------------------------------------------------
  // 6. Media Skills
  // ---------------------------------------------------------------------------
  generatePhoto(threadId: string, dto: GeneratePhotoDto) {
    return this.chatMediaService.generatePhoto(threadId, dto);
  }

  generatePodcast(threadId: string, dto: GeneratePodcastDto) {
    return this.chatMediaService.generatePodcast(threadId, dto);
  }

  // ---------------------------------------------------------------------------
  // 7. Seeder API
  // ---------------------------------------------------------------------------
  seedDefaultDataIfEmpty() {
    return this.chatSeederService.seedDefaultDataIfEmpty();
  }

  resetAndReseedChatData() {
    return this.chatSeederService.resetAndReseedChatData();
  }

  // ---------------------------------------------------------------------------
  // Internal Response Generators
  // ---------------------------------------------------------------------------
  private async generateCuratorResponse(
    thread: any,
    curator: any,
    userText: string,
    history: any[],
  ) {
    const folderRules = thread.folder?.contextRules
      ? `\nПравила папки (${thread.folder.name}):\n${thread.folder.contextRules}`
      : '';

    const systemPrompt = `Ты — ИИ-Куратор по имени "${curator.name}" (${curator.roleTitle}).
Характер и стиль: ${curator.personality || 'Уверенный, глубокий эксперт, формулирует емко и точно.'}
Инструкция куратора:
${curator.systemPrompt}
${folderRules}

Отвечай от первого лица, строго в рамках своей роли и аналитической оптики. Используй форматирование Markdown.`;

    let replyText = `Приветствую. По теме «${userText}»: данные зафиксированы в контуре. Я проанализировал сигнал и подготовлю структурированные тезисы.`;

    try {
      replyText = await this.chatMediaService.callGeminiWithSystemPrompt(
        systemPrompt,
        userText,
        history,
      );
    } catch (err: any) {
      this.logger.warn(`Curator gemini response error: ${err.message}`);
    }

    return this.prisma.chatMessageRecord.create({
      data: {
        threadId: thread.id,
        sender: curator.id,
        senderType: 'CURATOR',
        senderName: curator.name,
        senderRole: curator.roleTitle,
        avatar: curator.emoji,
        text: replyText,
      },
    });
  }

  private async generateAssistantResponse(
    thread: any,
    assistant: any,
    userText: string,
    history: any[],
  ) {
    const systemPrompt = `Ты — сервисный ИИ-ассистент контура "${assistant.name}".
Твой навык: ${assistant.skillType}.
Описание: ${assistant.description || 'Помощь пользователю в решении задач контура.'}
Правила: ${assistant.customPrompt || 'Помогай оперативно, четко и по существу.'}

Отвечай профессионально и структурированно.`;

    let replyText = `Ассистент ${assistant.name} принял запрос: «${userText}». Выполняю задачу...`;

    try {
      replyText = await this.chatMediaService.callGeminiWithSystemPrompt(
        systemPrompt,
        userText,
        history,
      );
    } catch (err: any) {
      this.logger.warn(`Assistant gemini response error: ${err.message}`);
    }

    return this.prisma.chatMessageRecord.create({
      data: {
        threadId: thread.id,
        sender: assistant.id,
        senderType: 'ASSISTANT',
        senderName: assistant.name,
        senderRole: `Ассистент (${assistant.skillType})`,
        avatar: assistant.avatar || '🛠️',
        text: replyText,
      },
    });
  }

  private async generateTopicResponse(thread: any, userText: string, history: any[]) {
    const folderName = thread.folder?.name || 'Общий контур';
    const folderRules = thread.folder?.contextRules || 'Аналитический фокус и объективность.';

    const systemPrompt = `Ты — ведущий интеллектуальный аналитик и координатор рабочего топика «${thread.title}» в контуре «${folderName}».
Правила контура: ${folderRules}.
Твоя задача — помогать пользователю глубоко разбираться в вопросе, синтезировать материалы, формулировать выжимки и генерировать полезный контент.
Отвечай емко, профессионально, с использованием Markdown.`;

    let replyText = `Принято. В топике «${thread.title}» (${folderName}) проанализировал ваш вопрос: ${userText}.`;

    try {
      replyText = await this.chatMediaService.callGeminiWithSystemPrompt(
        systemPrompt,
        userText,
        history,
      );
    } catch (err: any) {
      this.logger.warn(`Topic gemini response error: ${err.message}`);
    }

    return this.prisma.chatMessageRecord.create({
      data: {
        threadId: thread.id,
        sender: 'topic-coordinator',
        senderType: 'SYSTEM',
        senderName: 'Интеллектуальный координатор',
        senderRole: `Координатор контура [${folderName}]`,
        avatar: '🤖',
        text: replyText,
      },
    });
  }
}
