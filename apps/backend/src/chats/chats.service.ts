import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CurationService } from '../curation/curation.service';
import { PoliticalEngineService } from '../ingestion/services/political-engine.service';
import { StorageService } from '../storage/storage.service';
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
import { PodcastAgent } from '@lemon/agents';

@Injectable()
export class ChatsService implements OnModuleInit {
  private readonly logger = new Logger(ChatsService.name);
  private readonly geminiApiKey?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly curationService: CurationService,
    private readonly politicalEngineService: PoliticalEngineService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly sessionService: SessionService,
  ) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
  }

  async onModuleInit() {
    await this.seedDefaultDataIfEmpty();
  }

  // ---------------------------------------------------------------------------
  // 1. Chat Folders API (Контуры ответственности)
  // ---------------------------------------------------------------------------

  async getFolders() {
    return this.prisma.chatFolder.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            threads: { where: { deletedAt: null } },
            curators: { where: { deletedAt: null } },
            assistants: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getFolder(id: string) {
    const folder = await this.prisma.chatFolder.findUnique({
      where: { id },
      include: {
        curators: { where: { deletedAt: null } },
        assistants: { where: { deletedAt: null } },
        threads: {
          where: { deletedAt: null },
          orderBy: [{ isPinned: 'desc' }, { lastMessageAt: 'desc' }],
        },
      },
    });

    if (!folder || folder.deletedAt) {
      throw new NotFoundException(`Папка с ID ${id} не найдена.`);
    }

    return folder;
  }

  async createFolder(dto: CreateChatFolderDto) {
    const cleanPath = (dto.path || dto.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9а-яё\-]/gi, '-')
      .replace(/-+/g, '-');

    const uniquePath = `${cleanPath}-${Date.now().toString(36)}`;

    return this.prisma.chatFolder.create({
      data: {
        name: dto.name.trim(),
        path: dto.path ? dto.path.trim().toLowerCase() : uniquePath,
        description: dto.description?.trim() || null,
        icon: dto.icon || 'Folder',
        color: dto.color || '#3b82f6',
        order: dto.order ?? 0,
        parentId: dto.parentId || null,
        imageStylePrompt: dto.imageStylePrompt?.trim() || null,
        contextRules: dto.contextRules?.trim() || null,
      },
      include: {
        _count: {
          select: { threads: true, curators: true, assistants: true },
        },
      },
    });
  }

  async updateFolder(id: string, dto: UpdateChatFolderDto) {
    const existing = await this.prisma.chatFolder.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Папка с ID ${id} не найдена.`);
    }

    return this.prisma.chatFolder.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        icon: dto.icon !== undefined ? dto.icon : undefined,
        color: dto.color !== undefined ? dto.color : undefined,
        order: dto.order !== undefined ? dto.order : undefined,
        parentId: dto.parentId !== undefined ? dto.parentId : undefined,
        imageStylePrompt:
          dto.imageStylePrompt !== undefined ? dto.imageStylePrompt?.trim() || null : undefined,
        contextRules: dto.contextRules !== undefined ? dto.contextRules?.trim() || null : undefined,
      },
      include: {
        _count: {
          select: { threads: true, curators: true, assistants: true },
        },
      },
    });
  }

  async deleteFolder(id: string) {
    const existing = await this.prisma.chatFolder.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Папка с ID ${id} не найдена.`);
    }

    return this.prisma.chatFolder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Curators API (Кастомные и системные агенты-кураторы)
  // ---------------------------------------------------------------------------

  async getCurators(folderId?: string) {
    const where: any = { deletedAt: null };

    if (folderId && folderId !== 'all') {
      where.OR = [{ folderId }, { folderId: null }];
    }

    return this.prisma.curator.findMany({
      where,
      include: {
        folder: { select: { id: true, name: true, color: true } },
        _count: { select: { threads: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getCurator(id: string) {
    const curator = await this.prisma.curator.findUnique({
      where: { id },
      include: {
        folder: true,
        threads: { where: { deletedAt: null }, take: 10, orderBy: { lastMessageAt: 'desc' } },
      },
    });

    if (!curator || curator.deletedAt) {
      throw new NotFoundException(`Куратор с ID ${id} не найден.`);
    }

    return curator;
  }

  async createCurator(dto: CreateCuratorDto) {
    return this.prisma.curator.create({
      data: {
        name: dto.name.trim(),
        shortName: dto.shortName?.trim() || dto.name.split(' ')[0],
        roleTitle: dto.roleTitle.trim(),
        personality: dto.personality?.trim() || null,
        systemPrompt: dto.systemPrompt.trim(),
        emoji: dto.emoji || '👤',
        accentColor: dto.accentColor || '#10b981',
        folderId: dto.folderId || null,
        isSystem: false,
      },
      include: {
        folder: true,
      },
    });
  }

  async updateCurator(id: string, dto: UpdateCuratorDto) {
    const existing = await this.prisma.curator.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Куратор с ID ${id} не найден.`);
    }

    return this.prisma.curator.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        shortName: dto.shortName !== undefined ? dto.shortName?.trim() || null : undefined,
        roleTitle: dto.roleTitle !== undefined ? dto.roleTitle.trim() : undefined,
        personality: dto.personality !== undefined ? dto.personality?.trim() || null : undefined,
        systemPrompt: dto.systemPrompt !== undefined ? dto.systemPrompt.trim() : undefined,
        emoji: dto.emoji !== undefined ? dto.emoji : undefined,
        accentColor: dto.accentColor !== undefined ? dto.accentColor : undefined,
        folderId: dto.folderId !== undefined ? dto.folderId : undefined,
      },
      include: {
        folder: true,
      },
    });
  }

  async deleteCurator(id: string) {
    const existing = await this.prisma.curator.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Куратор с ID ${id} не найден.`);
    }

    return this.prisma.curator.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Assistants API (Помощники со скилами: Фото, NotebookLM и др.)
  // ---------------------------------------------------------------------------

  async getAssistants(folderId?: string, skillType?: AssistantSkill) {
    const where: any = { deletedAt: null };

    if (folderId && folderId !== 'all') {
      where.OR = [{ folderId }, { folderId: null }];
    }

    if (skillType) {
      where.skillType = skillType;
    }

    return this.prisma.assistant.findMany({
      where,
      include: {
        folder: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAssistant(id: string) {
    const assistant = await this.prisma.assistant.findUnique({
      where: { id },
      include: { folder: true },
    });

    if (!assistant || assistant.deletedAt) {
      throw new NotFoundException(`Помощник с ID ${id} не найден.`);
    }

    return assistant;
  }

  async createAssistant(dto: CreateAssistantDto) {
    return this.prisma.assistant.create({
      data: {
        name: dto.name.trim(),
        skillType: dto.skillType,
        description: dto.description?.trim() || null,
        customPrompt: dto.customPrompt?.trim() || null,
        config: dto.config || null,
        avatar: dto.avatar || '🛠️',
        folderId: dto.folderId || null,
      },
      include: { folder: true },
    });
  }

  async updateAssistant(id: string, dto: UpdateAssistantDto) {
    const existing = await this.prisma.assistant.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Помощник с ID ${id} не найден.`);
    }

    return this.prisma.assistant.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        skillType: dto.skillType !== undefined ? dto.skillType : undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        customPrompt: dto.customPrompt !== undefined ? dto.customPrompt?.trim() || null : undefined,
        config: dto.config !== undefined ? dto.config : undefined,
        avatar: dto.avatar !== undefined ? dto.avatar : undefined,
        folderId: dto.folderId !== undefined ? dto.folderId : undefined,
      },
      include: { folder: true },
    });
  }

  async deleteAssistant(id: string) {
    const existing = await this.prisma.assistant.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Помощник с ID ${id} не найден.`);
    }

    return this.prisma.assistant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Threads / Chats API (Топики, Кураторы, Агенты в Telegram-стиле)
  // ---------------------------------------------------------------------------

  async getThreads(query: QueryThreadsDto) {
    const where: any = {
      deletedAt: null,
    };

    // Folder filtering: if omitted or 'all', returns all threads across folders
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

    if (query.search?.trim()) {
      where.title = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    if (!query.includeArchived) {
      where.isArchived = false;
    }

    return this.prisma.chatThread.findMany({
      where,
      include: {
        folder: {
          select: { id: true, name: true, color: true, icon: true, imageStylePrompt: true },
        },
        curator: {
          select: { id: true, name: true, roleTitle: true, emoji: true, accentColor: true },
        },
        assistant: {
          select: { id: true, name: true, skillType: true, avatar: true },
        },
        _count: {
          select: { messages: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            sender: true,
            senderType: true,
            senderName: true,
            text: true,
            mediaUrls: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { lastMessageAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async getThread(id: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id },
      include: {
        folder: true,
        curator: true,
        assistant: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!thread || thread.deletedAt) {
      throw new NotFoundException(`Чат с ID ${id} не найден.`);
    }

    return thread;
  }

  async createThread(dto: CreateChatThreadDto) {
    let resolvedType: ChatType = dto.type || ChatType.TOPIC;

    if (!dto.type) {
      if (dto.curatorId) {
        resolvedType = ChatType.CURATOR;
      } else if (dto.assistantId) {
        resolvedType = ChatType.ASSISTANT;
      }
    }

    return this.prisma.chatThread.create({
      data: {
        title: dto.title.trim(),
        type: resolvedType,
        folderId: dto.folderId || null,
        curatorId: dto.curatorId || null,
        assistantId: dto.assistantId || null,
        targetAgent: dto.targetAgent || null,
        participantAgents: dto.participantAgents || [],
        dateScope: dto.dateScope || new Date().toISOString().split('T')[0],
        isPinned: dto.isPinned || false,
      },
      include: {
        folder: true,
        curator: true,
        assistant: true,
      },
    });
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
        type: dto.type !== undefined ? dto.type : undefined,
        folderId: dto.folderId !== undefined ? dto.folderId : undefined,
        curatorId: dto.curatorId !== undefined ? dto.curatorId : undefined,
        assistantId: dto.assistantId !== undefined ? dto.assistantId : undefined,
        targetAgent: dto.targetAgent !== undefined ? dto.targetAgent : undefined,
        participantAgents: dto.participantAgents !== undefined ? dto.participantAgents : undefined,
        dateScope: dto.dateScope !== undefined ? dto.dateScope : undefined,
        isPinned: dto.isPinned !== undefined ? dto.isPinned : undefined,
        isArchived: dto.isArchived !== undefined ? dto.isArchived : undefined,
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
  // 5. Messages API & Agent Response Engine
  // ---------------------------------------------------------------------------

  async getThreadMessages(threadId: string) {
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
    if (lower.startsWith('/photo') || lower.startsWith('/image') || lower.startsWith('/pic') || lower.startsWith('сгенерируй фото') || lower.startsWith('создай фото') || lower.startsWith('сделай обложку')) {
      const promptArg = rawMessage.replace(/^(\/photo|\/image|\/pic|сгенерируй фото|создай фото|сделай обложку)/i, '').trim();
      const photoResult = await this.generatePhoto(threadId, { prompt: promptArg || undefined });
      return {
        threadId,
        userMessage: userMessageRecord,
        replies: [photoResult],
      };
    }

    if (lower.startsWith('/podcast') || lower.startsWith('/notebooklm') || lower.startsWith('сгенерируй подкаст') || lower.startsWith('собери подкаст') || lower.startsWith('запиши подкаст')) {
      const podcastResult = await this.generatePodcast(threadId, {});
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
      // Direct Curator dialogue
      replyMessageRecord = await this.generateCuratorResponse(thread, thread.curator, rawMessage, reversedHistory);
    } else if (thread.assistant) {
      // Assistant service dialogue
      replyMessageRecord = await this.generateAssistantResponse(thread, thread.assistant, rawMessage, reversedHistory);
    } else {
      // Topic dialogue (Domain Topic / Public feed)
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
  // 6. Skill Implementations: Photo (Gemini) & Podcast (NotebookLM)
  // ---------------------------------------------------------------------------

  /**
   * Generates a themed photo using Google Gemini / Imagen and saves it to media storage
   */
  async generatePhoto(threadId: string, dto: GeneratePhotoDto) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { folder: true, curator: true },
    });
    if (!thread || thread.deletedAt) {
      throw new NotFoundException(`Чат с ID ${threadId} не найден.`);
    }

    const folder = thread.folder;
    const stylePrompt = folder?.imageStylePrompt || 'cinematic, highly detailed, realistic lighting, 8k resolution, editorial aesthetic';
    const folderContext = folder?.name ? `Контекст контура: ${folder.name}.` : '';

    // 1. Synthesize professional English image prompt
    let imageSubject = dto.prompt?.trim();
    if (!imageSubject) {
      // Extract from recent chat messages
      const recent = await this.prisma.chatMessageRecord.findMany({
        where: { threadId },
        take: 4,
        orderBy: { createdAt: 'desc' },
      });
      imageSubject = recent.map((m) => m.text).join('\n') || thread.title;
    }

    let synthesizedPrompt = `High quality illustration of ${imageSubject}. Style: ${stylePrompt}.`;
    if (this.geminiApiKey) {
      try {
        synthesizedPrompt = await this.synthesizeImagePrompt(imageSubject, stylePrompt, folderContext);
      } catch (err: any) {
        this.logger.warn(`Image prompt synthesis fallback: ${err.message}`);
      }
    }

    // 2. Generate Image via Gemini / Imagen
    let imageUrl = '';
    if (this.geminiApiKey) {
      try {
        imageUrl = await this.requestGeminiImage(synthesizedPrompt, dto.aspectRatio || '16:9');
      } catch (err: any) {
        this.logger.error(`Gemini image generation failed: ${err.message}`);
      }
    }

    // If Gemini image gen wasn't configured or returned empty, generate a stylized SVG graphic placeholder
    if (!imageUrl) {
      imageUrl = await this.generateFallbackThemedImage(thread.title, folder?.color || '#10b981', imageSubject);
    }

    // 3. Save message record with media
    const reply = await this.prisma.chatMessageRecord.create({
      data: {
        threadId,
        sender: 'gemini-imagen',
        senderType: 'ASSISTANT',
        senderName: folder?.name ? `Фото-генератор [${folder.name}]` : 'Фото-генератор Gemini',
        senderRole: 'Специалист по медиа-генерации (Gemini Imagen)',
        avatar: '🎨',
        text: `🖼️ **Сгенерирована иллюстрация** по тематике контура.\n\n> **Промпт:** *${synthesizedPrompt}*\n> **Стиль контура:** \`${stylePrompt}\``,
        mediaUrls: [imageUrl],
        payload: {
          prompt: synthesizedPrompt,
          aspectRatio: dto.aspectRatio || '16:9',
          imageUrl,
        },
      },
    });

    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    return reply;
  }

  /**
   * Generates a 2-host conversational NotebookLM podcast script from topic context
   */
  async generatePodcast(threadId: string, dto: GeneratePodcastDto) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { folder: true, curator: true },
    });
    if (!thread || thread.deletedAt) {
      throw new NotFoundException(`Чат с ID ${threadId} не найден.`);
    }

    // 1. Gather context from topic
    const messages = await this.prisma.chatMessageRecord.findMany({
      where: { threadId },
      take: 15,
      orderBy: { createdAt: 'desc' },
    });
    const topicSummary = messages.reverse().map((m) => `${m.senderName}: ${m.text}`).join('\n\n');

    const host1 = dto.host1Name || (thread.curator?.name ? thread.curator.name : 'Алексей');
    const host2 = dto.host2Name || 'Елена';

    let script;
    if (this.geminiApiKey) {
      try {
        script = await this.generateNotebookLmGeminiScript({
          title: thread.title,
          context: topicSummary,
          host1,
          host2,
          folderName: thread.folder?.name,
        });
      } catch (err: any) {
        this.logger.warn(`Gemini podcast generation fallback: ${err.message}`);
      }
    }

    if (!script) {
      script = {
        title: `Обзор темы: ${thread.title}`,
        tagline: `Экспресс-разбор ключевых тезисов и практических выводов`,
        host1Name: host1,
        host2Name: host2,
        estimatedDurationSec: 180,
        turns: [
          { speaker: host1, role: 'host1', text: `Привет! Сегодня мы подробно разбираем тему: "${thread.title}".` },
          { speaker: host2, role: 'host2', text: `Да, привет! И здесь сразу бросается в глаза несколько важных нюансов, о которых обязательно стоит сказать.` },
          { speaker: host1, role: 'host1', text: `Главный тезис заключается в том, что мы переходим от разрозненных сигналов к единому контуру управления.` },
          { speaker: host2, role: 'host2', text: `И как это повлияет на конечный результат? На что в первую очередь обратить внимание?` },
          { speaker: host1, role: 'host1', text: `В первую очередь — на системную связность данных и оперативное внедрение ИИ-агентов.` },
          { speaker: host2, role: 'host2', text: `Отличный вывод. Продолжаем следить за развитием событий!` },
        ],
      };
    }

    // 2. Persist message record with podcast payload
    const formattedTranscript = script.turns
      .map((t: any) => `**${t.speaker}**: ${t.text}`)
      .join('\n\n');

    const reply = await this.prisma.chatMessageRecord.create({
      data: {
        threadId,
        sender: 'notebooklm-podcast',
        senderType: 'ASSISTANT',
        senderName: 'NotebookLM Подкастер',
        senderRole: 'Генератор аудио-обзоров и сценариев подкастов',
        avatar: '🎙️',
        text: `### 🎙️ NotebookLM Подкаст: ${script.title}\n\n*${script.tagline}*\n\n${formattedTranscript}`,
        payload: {
          podcastScript: script,
        },
      },
    });

    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    return reply;
  }

  // ---------------------------------------------------------------------------
  // 7. Internal Helpers for AI synthesis
  // ---------------------------------------------------------------------------

  private async generateCuratorResponse(
    thread: any,
    curator: any,
    userText: string,
    history: any[],
  ) {
    const folderRules = thread.folder?.contextRules ? `\nПравила папки (${thread.folder.name}):\n${thread.folder.contextRules}` : '';

    const systemPrompt = `Ты — ИИ-Куратор по имени "${curator.name}" (${curator.roleTitle}).
Характер и стиль: ${curator.personality || 'Уверенный, глубокий эксперт, формулирует емко и точно.'}
Инструкция куратора:
${curator.systemPrompt}
${folderRules}

Отвечай от первого лица, строго в рамках своей роли и аналитической оптики. Используй форматирование Markdown.`;

    let replyText = `Приветствую. По теме «${userText}»: данные зафиксированы в контуре. Я проанализировал сигнал и подготовлю структурированные тезисы.`;

    if (this.geminiApiKey) {
      try {
        replyText = await this.callGeminiWithSystemPrompt(systemPrompt, userText, history);
      } catch (err: any) {
        this.logger.warn(`Curator gemini response error: ${err.message}`);
      }
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

    if (this.geminiApiKey) {
      try {
        replyText = await this.callGeminiWithSystemPrompt(systemPrompt, userText, history);
      } catch (err: any) {
        this.logger.warn(`Assistant gemini response error: ${err.message}`);
      }
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

    if (this.geminiApiKey) {
      try {
        replyText = await this.callGeminiWithSystemPrompt(systemPrompt, userText, history);
      } catch (err: any) {
        this.logger.warn(`Topic gemini response error: ${err.message}`);
      }
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

  private async callGeminiWithSystemPrompt(
    systemPrompt: string,
    userText: string,
    history: any[],
  ): Promise<string> {
    const contents: any[] = [];

    // System instruction
    contents.push({
      role: 'user',
      parts: [{ text: `[SYSTEM INSTRUCTION]\n${systemPrompt}` }],
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Инструкция принята. Готов отвечать в заданной роли.' }],
    });

    // History turns
    for (const h of history) {
      if (h.senderType === 'USER') {
        contents.push({ role: 'user', parts: [{ text: h.text }] });
      } else {
        contents.push({ role: 'model', parts: [{ text: h.text }] });
      }
    }

    // Latest user message
    contents.push({ role: 'user', parts: [{ text: userText }] });

    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        });

        if (!res.ok) continue;
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      } catch {
        continue;
      }
    }

    throw new Error('Gemini API did not return text');
  }

  private async synthesizeImagePrompt(
    subject: string,
    stylePrompt: string,
    folderContext: string,
  ): Promise<string> {
    const prompt = `You are a prompt engineer for Gemini / Imagen 3.
Convert this subject and style into a single concise English text prompt for high-definition image generation.
Subject: "${subject}"
Visual Style: "${stylePrompt}"
${folderContext}

Return ONLY the final prompt text, no quotes, no markdown, no explanations. Max 60 words.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    }

    return `${subject}, ${stylePrompt}`;
  }

  private async requestGeminiImage(prompt: string, aspectRatio = '16:9'): Promise<string> {
    // 1. Try Imagen 3 API endpoint: imagen-3.0-generate-002:predict
    try {
      const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${this.geminiApiKey}`;
      const res = await fetch(imagenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatio === '1:1' ? '1:1' : aspectRatio === '9:16' ? '9:16' : '16:9',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const b64 = data.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          const buffer = Buffer.from(b64, 'base64');
          const saved = await this.storageService.saveGeneratedBuffer(buffer, 'gemini-imagen.webp');
          return saved.url;
        }
      }
    } catch (err: any) {
      this.logger.warn(`Imagen 3 direct predict failed: ${err.message}`);
    }

    return '';
  }

  private async generateFallbackThemedImage(
    title: string,
    accentColor: string,
    subject: string,
  ): Promise<string> {
    // Generate a high quality SVG vector card and save as webp
    const cleanTitle = title.replace(/[<>&"]/g, '');
    const cleanSub = subject.slice(0, 80).replace(/[<>&"]/g, '');
    const svg = `
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0d1117" />
          <stop offset="50%" stop-color="#161b22" />
          <stop offset="100%" stop-color="#090d13" />
        </linearGradient>
        <radialGradient id="glow" cx="80%" cy="20%" r="50%">
          <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <rect width="100%" height="100%" fill="url(#glow)" />
      
      <!-- Grid pattern -->
      <line x1="80" y1="120" x2="1200" y2="120" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      <line x1="80" y1="600" x2="1200" y2="600" stroke="rgba(255,255,255,0.08)" stroke-width="1" />

      <!-- Accent badge -->
      <rect x="80" y="80" width="160" height="28" rx="6" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-width="1.5" />
      <text x="160" y="99" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="${accentColor}" text-anchor="middle">LEMON MEDIA LAB</text>

      <!-- Main Title -->
      <text x="80" y="240" font-family="system-ui, sans-serif" font-size="44" font-weight="800" fill="#ffffff">${cleanTitle}</text>
      
      <!-- Subtext -->
      <text x="80" y="320" font-family="system-ui, sans-serif" font-size="22" font-weight="400" fill="#9ca3af">${cleanSub}</text>

      <!-- Watermark -->
      <text x="80" y="580" font-family="monospace" font-size="14" fill="#6b7280">AI THEMED ASSET • 1280x720 • GEMINI STUDIO</text>
    </svg>`;

    const buffer = Buffer.from(svg, 'utf-8');
    const saved = await this.storageService.saveGeneratedBuffer(buffer, 'fallback-card.svg', true);
    return saved.url;
  }

  private async generateNotebookLmGeminiScript(opts: {
    title: string;
    context: string;
    host1: string;
    host2: string;
    folderName?: string;
  }): Promise<any> {
    const prompt = `Ты — ведущий режиссер и сценарист в стиле Google NotebookLM Deep Dive Podcast.
Тема: "${opts.title}" (Контур: ${opts.folderName || 'Аналитика'})
Ведущий 1: "${opts.host1}" (глубокий аналитик, эксперт, оперирует фактами).
Ведущий 2: "${opts.host2}" (живой, любознательный собеседник, задает острые вопросы, переводит на понятный язык).

КОНТЕКСТ ДИАЛОГА:
${opts.context.slice(0, 3000)}

ПРАВИЛА NOTEBOOKLM:
1. Живой диалог двух умных друзей за чашкой кофе. Никаких формальных дикторских клише.
2. Естественные перебивки, уточнения ("Погоди, Алексей...", "Именно!", "А что это меняет?").
3. Хронометраж: 8-12 реплик попеременно.
4. В конце — сильный вывод.

ВЕРНИ СТРОГО JSON:
{
  "title": "Броский заголовок подкаста",
  "tagline": "Короткий тизер",
  "turns": [
    { "speaker": "${opts.host1}", "role": "host1", "text": "..." },
    { "speaker": "${opts.host2}", "role": "host2", "text": "..." }
  ]
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (raw) return JSON.parse(raw);
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // 8. Starter Data Seeding (Папки контуров, Кураторы, Помощники, Топики)
  // ---------------------------------------------------------------------------

  async seedDefaultDataIfEmpty() {
    try {
      const folderCount = await this.prisma.chatFolder.count({
        where: { deletedAt: null },
      });
      if (folderCount > 0) return;

      this.logger.log('🌱 Seeding initial Chat Folders, Curators, Assistants and Topics...');

      // 1. Folders
      const itFolder = await this.prisma.chatFolder.create({
        data: {
          name: 'IT & Инфраструктура',
          path: 'it-infrastructure',
          description: 'Архитектура систем, Kubernetes, релизы LLM, аппаратное обеспечение и BigTech',
          icon: 'Cpu',
          color: '#10b981',
          order: 1,
          imageStylePrompt: 'cinematic tech photography, high-tech server racks, neon cyan and emerald circuitry, sharp focus, 8k',
          contextRules: 'Фокус на инженерной точности, масштабируемости, безопасности и архитектурных решениях.',
        },
      });

      const politicsFolder = await this.prisma.chatFolder.create({
        data: {
          name: 'Политика & Макроконтур',
          path: 'politics-macro',
          description: 'Внутренний контур РФ, регуляторика, глобальные санкции, макроэкономика и БРИКС',
          icon: 'Landmark',
          color: '#38bdf8',
          order: 2,
          imageStylePrompt: 'editorial documentary photojournalism, realistic natural lighting, Reuters briefing style',
          contextRules: 'Оценка системных рисков, влияние регуляторных актов и каскадные последствия решений.',
        },
      });

      const mediaFolder = await this.prisma.chatFolder.create({
        data: {
          name: 'Медиа & TG-Контент',
          path: 'media-content',
          description: 'Генерация постов, оформление дайджестов, визуальные иллюстрации и NotebookLM подкасты',
          icon: 'Sparkles',
          color: '#ec4899',
          order: 3,
          imageStylePrompt: 'modern minimalist editorial graphic, vibrant aesthetic colors, magazine cover style',
          contextRules: 'Виральность, четкие буллеты, емкие тезисы и качественные иллюстрации.',
        },
      });

      const marketsFolder = await this.prisma.chatFolder.create({
        data: {
          name: 'Рынки & Сырье',
          path: 'markets-crypto',
          description: 'Нефть, СПГ, логистические проливы, валютные коридоры и фондовые индексы',
          icon: 'TrendingUp',
          color: '#f59e0b',
          order: 4,
          imageStylePrompt: 'high-contrast financial trading floor, dark atmosphere, Bloomberg terminal glow, data charts',
          contextRules: 'Фокус на котировках, фрахте, динамике цепочек поставок и ликвидности.',
        },
      });

      // 2. Curators
      const okatsiyaCurator = await this.prisma.curator.create({
        data: {
          name: 'Окация',
          shortName: 'Окация',
          roleTitle: 'Архитектор систем и куратор контура IT & AI',
          personality: 'Глубокий технический эксперт, любит архитектурную ясность, системные бенчмарки и надежность.',
          systemPrompt: 'Анализируй релизы моделей, DevOps-практики, архитектуру распределенных систем и железо. Отвечай структурно.',
          emoji: '⚡',
          accentColor: '#10b981',
          folderId: itFolder.id,
          isSystem: true,
        },
      });

      const germanCurator = await this.prisma.curator.create({
        data: {
          name: 'Герман «Кернел»',
          shortName: 'Герман',
          roleTitle: 'Обозреватель Habr, схемотехники и инженерных комьюнити',
          personality: 'Олдскульный инженер, ценит низкоуровневые детали, ассемблер, микросхемы и глубокий разбор статей.',
          systemPrompt: 'Мониторь Habr, xakep.ru и инженерные публикации. Делай акцент на практической реализации и разборе плат.',
          emoji: '📟',
          accentColor: '#059669',
          folderId: itFolder.id,
          isSystem: true,
        },
      });

      const ivanCurator = await this.prisma.curator.create({
        data: {
          name: 'Иван Белый',
          shortName: 'Иван',
          roleTitle: 'Куратор внутреннего контура РФ и регуляторики',
          personality: 'Сдержанный, внимательный к букве закона юрист-аналитик, оценивает налоговые и правовые последствия.',
          systemPrompt: 'Курируй законодательство, регуляторные меры ЦБ и Минфина РФ, суверенизацию и внутренний рынок.',
          emoji: '🇷🇺',
          accentColor: '#38bdf8',
          folderId: politicsFolder.id,
          isSystem: true,
        },
      });

      const kirkCurator = await this.prisma.curator.create({
        data: {
          name: 'Kirk Kitten',
          shortName: 'Kirk',
          roleTitle: 'Аналитик санкций OFAC/ЕС и глобального сырьевого фрахта',
          personality: 'Холодный международник, отслеживает вторичные санкции, танкерный флот и офшорные структуры.',
          systemPrompt: 'Анализируй санкционные списки, морской фрахт Lloyd\'s, теневой флот и ограничения на торговлю.',
          emoji: '🌐',
          accentColor: '#60a5fa',
          folderId: politicsFolder.id,
          isSystem: true,
        },
      });

      const chenCurator = await this.prisma.curator.create({
        data: {
          name: 'Чэнь Вэй',
          shortName: 'Чэнь',
          roleTitle: 'Обозреватель АТР, Китая и глобальных цепочек поставок',
          personality: 'Стратег из Шанхая, мыслит пятилетками, отслеживает расчеты в юанях и портовые хабы.',
          systemPrompt: 'Курируй торговлю с Китаем, коридоры БРИКС, логистику портов Шанхая и полупроводниковые фабрики.',
          emoji: '🇨🇳',
          accentColor: '#ef4444',
          folderId: marketsFolder.id,
          isSystem: true,
        },
      });

      // 3. Assistants
      const itPhotoAssistant = await this.prisma.assistant.create({
        data: {
          name: 'Фото-художник IT',
          skillType: AssistantSkill.IMAGE_GEN,
          description: 'Генерирует высокотехнологичные иллюстрации, серверные схемы и визуалы в стиле киберпанка',
          customPrompt: 'Используй неоновый изумрудный акцент, серверные стойки и микросхемы.',
          avatar: '🎨',
          folderId: itFolder.id,
        },
      });

      const podcastAssistant = await this.prisma.assistant.create({
        data: {
          name: 'NotebookLM Подкастер',
          skillType: AssistantSkill.NOTEBOOKLM_PODCAST,
          description: 'Синтезирует интерактивные аудио-диалоги и сценарии подкастов двух ведущих по материалам темы',
          customPrompt: 'Два ведущих: аналитик и любознательный интервьюер.',
          avatar: '🎙️',
          folderId: mediaFolder.id,
        },
      });

      // 4. Starter Topics & Direct curator threads
      // IT Folder Topics
      const llmTopic = await this.prisma.chatThread.create({
        data: {
          title: 'Выход моделей нового поколения (Radar & LLM)',
          type: ChatType.TOPIC,
          folderId: itFolder.id,
          isPinned: true,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: llmTopic.id,
          sender: okatsiyaCurator.id,
          senderType: 'CURATOR',
          senderName: 'Окация',
          senderRole: 'Архитектор IT & AI',
          avatar: '⚡',
          text: `### 🧠 Радар моделей нового поколения\n\nВ этом топике мы отслеживаем релизы моделей, тесты рассуждений и новые открытые веса.\n\nЗадавайте вопросы по стеку, используйте кнопку 🎨 **Создать фото** для визуализации архитектуры или 🎙️ **NotebookLM** для генерации аудио-разбора!`,
        },
      });

      // Direct chat with Okatsiya
      const okatsiyaChat = await this.prisma.chatThread.create({
        data: {
          title: 'Окация: Прямой диалог',
          type: ChatType.CURATOR,
          folderId: itFolder.id,
          curatorId: okatsiyaCurator.id,
          isPinned: true,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: okatsiyaChat.id,
          sender: okatsiyaCurator.id,
          senderType: 'CURATOR',
          senderName: 'Окация',
          senderRole: 'Архитектор IT & AI',
          avatar: '⚡',
          text: `Приветствую в персональном канале связи! Я веду контур IT & AI. Готова ответить на любые вопросы по инфраструктуре, Kubernetes и архитектуре нейросетей.`,
        },
      });

      // Politics Folder Topic
      const lawsTopic = await this.prisma.chatThread.create({
        data: {
          title: 'Регуляторика цифровых активов и налогообложение 2026',
          type: ChatType.TOPIC,
          folderId: politicsFolder.id,
          isPinned: true,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: lawsTopic.id,
          sender: ivanCurator.id,
          senderType: 'CURATOR',
          senderName: 'Иван Белый',
          senderRole: 'Куратор контура РФ',
          avatar: '🇷🇺',
          text: `Коллеги, в этом топике аккумулируем все изменения законодательства по цифровым активам, трансграничным платежам и новым налоговым ставкам.`,
        },
      });

      // Media Folder Topic
      const tgMediaTopic = await this.prisma.chatThread.create({
        data: {
          title: 'Генерация постов и обложек для вечернего дайджеста',
          type: ChatType.TOPIC,
          folderId: mediaFolder.id,
          assistantId: itPhotoAssistant.id,
          isPinned: true,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: tgMediaTopic.id,
          sender: 'media-producer',
          senderType: 'ASSISTANT',
          senderName: 'Медиа-лаборатория',
          senderRole: 'Генератор контента',
          avatar: '📱',
          text: `Добро пожаловать в контент-студию! Здесь мы превращаем аналитику в сочные публикации, генерируем визуалы через Gemini и записываем сценарии NotebookLM.`,
        },
      });

      this.logger.log('✅ Seeding completed successfully!');
    } catch (err: any) {
      this.logger.error(`Seeding failed: ${err.message}`, err.stack);
    }
  }

  async resetAndReseedChatData() {
    this.logger.log('🔄 Resetting and reseeding chat workspace data...');
    await this.prisma.chatMessageRecord.deleteMany();
    await this.prisma.chatThread.deleteMany();
    await this.prisma.curator.deleteMany();
    await this.prisma.assistant.deleteMany();
    await this.prisma.chatFolder.deleteMany();
    await this.seedDefaultDataIfEmpty();
    return { success: true, message: 'Chat workspace successfully reset and seeded.' };
  }
}
