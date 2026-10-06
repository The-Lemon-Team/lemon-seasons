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

      this.logger.log('🌱 Seeding initial Chat Folders and Curators (7 Curators, 2 Folders, 0 Groups)...');

      // 1. Folders
      const politicsFolder = await this.prisma.chatFolder.create({
        data: {
          name: 'Политика & Макроконтур',
          path: 'politics-macro',
          description: 'Внутренний контур РФ, регуляторика, глобальные санкции, Ближний Восток и мировая повестка',
          icon: 'Landmark',
          color: '#38bdf8',
          order: 1,
          imageStylePrompt: 'editorial documentary photojournalism, realistic natural lighting, Reuters briefing style',
          contextRules: 'Оценка системных рисков, влияние регуляторных актов, каскадные последствия решений и международная безопасность.',
        },
      });

      const itFolder = await this.prisma.chatFolder.create({
        data: {
          name: 'IT & Технологии',
          path: 'it-infrastructure',
          description: 'Hi-Tech, новые девайсы, IT & AI индустрия, публикации на Habr, библиотеки, инструменты и Telegram',
          icon: 'Cpu',
          color: '#a855f7',
          order: 2,
          imageStylePrompt: 'cinematic tech photography, high-tech server racks, neon cyan and emerald circuitry, sharp focus, 8k',
          contextRules: 'Инженерная точность, разбор архитектуры, практическая применимость, новинки инструментов и тренды индустрии.',
        },
      });

      // 2. Curators: Political Contour
      const ivanCurator = await this.prisma.curator.create({
        data: {
          id: 'ivan-bely',
          name: 'Иван Белый',
          shortName: 'Иван',
          roleTitle: 'Специалист по Контуру РФ, законодательству и регуляторике',
          personality: 'Сдержанный, внимательный к букве закона юрист-аналитик. Оценивает налоговые, бюджетные и правовые последствия решений властей РФ.',
          systemPrompt: 'Курируй внутренний контур РФ: законы, инициативы Госдумы, постановления Правительства РФ, налоги, бюджет, решения ЦБ РФ, антимонопольный контроль ФАС и внутренний рынок. Отвечай структурно, аргументированно и объективно.',
          emoji: '🇷🇺',
          accentColor: '#38bdf8',
          folderId: politicsFolder.id,
          isSystem: true,
        },
      });

      const kirkCurator = await this.prisma.curator.create({
        data: {
          id: 'kirk-kitten',
          name: 'Kirk Kitten',
          shortName: 'Kirk',
          roleTitle: 'Специалист по контуру США, международным рынкам и санкциям',
          personality: 'Холодный международник, отслеживает вторичные санкции OFAC, европейские директивы, комплаенс, танкерный флот и мировые биржевые рынки.',
          systemPrompt: 'Анализируй контур США, решения Белого дома и Конгресса, директивы OFAC, регуляторику ЕС, комплаенс морского фрахта Lloyd\'s, теневой флот и ограничения на глобальную торговлю.',
          emoji: '🌐',
          accentColor: '#fbbf24',
          folderId: politicsFolder.id,
          isSystem: true,
        },
      });

      const tariqCurator = await this.prisma.curator.create({
        data: {
          id: 'tariq-said',
          name: 'Тарик Саид',
          shortName: 'Тарик',
          roleTitle: 'Специалист по контуру Ближнего Востока и зоны Залива (MENA)',
          personality: 'Востоковед и стратегический аналитик по Ближнему Востоку. Анализирует закрытые договоренности монархий Залива, влияние проиранских осей, турецкий фактор и безопасность инфраструктуры.',
          systemPrompt: 'Веди аналитический мониторинг Большого Ближнего Востока (MENA): Ирак, Сирия, Иран, монархии Залива, Левант, квоты OPEC+, суннитско-шиитский баланс, морские проливы и безопасность инфраструктуры.',
          emoji: '🕌',
          accentColor: '#eab308',
          folderId: politicsFolder.id,
          isSystem: true,
        },
      });

      const alexCurator = await this.prisma.curator.create({
        data: {
          id: 'alex-vector',
          name: 'Алекс Вектор',
          shortName: 'Алекс',
          roleTitle: 'Специалист по общей политической повестке и свежим мировым новостям',
          personality: 'Динамичный новостной шеф-редактор мирового пула. Моментально валидирует экстренные мировые молнии, коммюнике саммитов, отсекает виральный информационный шум.',
          systemPrompt: 'Отслеживай свежие политические новости, общую мировую повестку, мировые молнии, коммюнике саммитов, оперативные сводки международных агентств. Отделяй фейки от подтвержденных событий.',
          emoji: '🔥',
          accentColor: '#f97316',
          folderId: politicsFolder.id,
          isSystem: true,
        },
      });

      // 2. Curators: IT & AI Contour
      const okatsiyaCurator = await this.prisma.curator.create({
        data: {
          id: 'okatsiya',
          name: 'Акация IT',
          shortName: 'Акация',
          roleTitle: 'Куратор Hi-Tech, IT & AI индустрии, новых девайсов и громких анонсов',
          personality: 'Глубокий технический эксперт потребительской электроники и BigTech. Ценит архитектурную ясность, системные бенчмарки и надежность решений.',
          systemPrompt: 'Отслеживай новости Hi-Tech, IT & AI индустрии, новые девайсы (гаджеты, чипы, флагманы, VR/AR), громкие анонсы BigTech-корпораций и архитектурные сдвиги. Отвечай структурно и емко.',
          emoji: '⚡',
          accentColor: '#a855f7',
          folderId: itFolder.id,
          isSystem: true,
        },
      });

      const simonCurator = await this.prisma.curator.create({
        data: {
          id: 'simon-habr',
          name: 'Саймон',
          shortName: 'Саймон',
          roleTitle: 'Специалист по разбору новостей с Habr',
          personality: 'Олдскульный инженер-практик. Меньше корпоративного шума — больше реального кода, схемотехники, архитектурных грабель и практического опыта IT-сообщества.',
          systemPrompt: 'Разбирай публикации и инженерные статьи с Хабра (Habr), схемотехнику, олдскул-технологии, авторские кейсы сообщества и практические решения. Делай упор на реальный инженерный опыт.',
          emoji: '📟',
          accentColor: '#10b981',
          folderId: itFolder.id,
          isSystem: true,
        },
      });

      const presijoCurator = await this.prisma.curator.create({
        data: {
          id: 'presijo-ai',
          name: 'Presijo AI & IT',
          shortName: 'Presijo',
          roleTitle: 'AI & IT тренд-хантер, контент-мейкер и обозреватель инструментов',
          personality: 'Креативный тренд-хантер и практик прикладного ИИ. Отслеживает новые open-source репозитории, свежие фичи в библиотеках, мониторит Telegram-каналы и упаковывает находки в емкий контент.',
          systemPrompt: 'Анализируй новости индустрии AI, новые инструменты и сервисы на рынке, свежие фичи, релизы библиотек, тренды топовых Telegram-каналов и контент-мейкинг. Подавай материал структурированно с акцентом на пользу.',
          emoji: '🚀',
          accentColor: '#ec4899',
          folderId: itFolder.id,
          isSystem: true,
        },
      });

      // 3. Direct Curator Threads & Greeting Messages (Чистые топики кураторов)
      const curatorSeedConfigs = [
        {
          curator: ivanCurator,
          folderId: politicsFolder.id,
          title: 'Иван Белый: Контур РФ & Регуляторика',
          greeting: 'Приветствую! Я курирую внутренний контур РФ: законы, инициативы Государственной Думы, постановления Правительства, параметры бюджета, антимонопольный контроль ФАС и решения ЦБ РФ.\n\nИспользуйте команду `/ivan` для персонального анализа повестки РФ.',
        },
        {
          curator: kirkCurator,
          folderId: politicsFolder.id,
          title: 'Kirk Kitten: Контур США, Рынки & Санкции',
          greeting: 'Приветствую! Мой фокус — контур США, решения Белого дома и Конгресса, директивы OFAC, европейские регуляторы, комплаенс морского фрахта и глобальные рынки.\n\nИспользуйте команду `/kirk` для анализа американского и санкционного контура.',
        },
        {
          curator: tariqCurator,
          folderId: politicsFolder.id,
          title: 'Тарик Саид: Ближний Восток & Залив (MENA)',
          greeting: 'Мир вам! Я веду аналитический мониторинг Большого Ближнего Востока: Ирак, Сирия, Иран, монархии Залива, Левант, квоты OPEC+, баланс сил и безопасность инфраструктуры.\n\nИспользуйте `/tariq` для актуального среза по региону.',
        },
        {
          curator: alexCurator,
          folderId: politicsFolder.id,
          title: 'Алекс Вектор: Свежие новости & Мировой пульс',
          greeting: 'Приветствую! Я отслеживаю глобальный оперативный пульс, экстренные мировые молнии, коммюнике саммитов и свежую политическую повестку ведущих мировых агентств.\n\nИспользуйте команду `/alex` или `/breaking` для оперативной картины.',
        },
        {
          curator: okatsiyaCurator,
          folderId: itFolder.id,
          title: 'Акация IT: Hi-Tech, Девайсы & Анонсы',
          greeting: 'Привет! Я отслеживаю новинки Hi-Tech, релизы новых девайсов (гаджеты, VR/AR, чипы, флагманы), громкие анонсы BigTech-корпораций и ключевые тренды IT & AI индустрии.\n\nИспользуйте `/okatsiya` или `/akatsiya` для технологического среза.',
        },
        {
          curator: simonCurator,
          folderId: itFolder.id,
          title: 'Саймон: Разбор публикаций Habr',
          greeting: 'Приветствую! Меньше корпоративного шума — больше реальной практики. Я разбираю инженерные статьи и публикации с Хабра, олдскул-технологии, схемотехнику и практические кейсы сообщества.\n\nИспользуйте команду `/simon` для разбора статей с Хабра.',
        },
        {
          curator: presijoCurator,
          folderId: itFolder.id,
          title: 'Presijo AI & IT: Инструменты, Библиотеки & Telegram',
          greeting: 'Салют! Я на острие прикладного AI: новые инструменты и тулзы на рынке, свежие фичи, релизы open-source библиотек, мониторинг топовых Telegram-каналов и контент-мейкинг.\n\nИспользуйте `/presijo` для радара AI-инструментов и трендов.',
        },
      ];

      for (const item of curatorSeedConfigs) {
        const thread = await this.prisma.chatThread.create({
          data: {
            title: item.title,
            type: ChatType.CURATOR,
            folderId: item.folderId,
            curatorId: item.curator.id,
            targetAgent: item.curator.id,
            participantAgents: [item.curator.id],
            isPinned: true,
          },
        });

        await this.prisma.chatMessageRecord.create({
          data: {
            threadId: thread.id,
            sender: item.curator.id,
            senderType: 'CURATOR',
            senderName: item.curator.name,
            senderRole: item.curator.roleTitle,
            avatar: item.curator.emoji,
            text: item.greeting,
          },
        });
      }

      this.logger.log('✅ Seeding completed successfully (7 Curators, 2 Folders, 0 Groups, 0 Mock Topics)!');
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
