import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CurationService } from '../curation/curation.service';
import { PoliticalEngineService } from '../ingestion/services/political-engine.service';
import { NotesService } from '../notes/notes.service';
import { AgentChatEngine, ChatMessage, AgentId } from '@lemon/agents';
import { ChatType } from '@prisma/client';
import { CreateChatFolderDto } from './dto/create-chat-folder.dto';
import { UpdateChatFolderDto } from './dto/update-chat-folder.dto';
import { CreateChatThreadDto } from './dto/create-chat-thread.dto';
import { UpdateChatThreadDto } from './dto/update-chat-thread.dto';
import { SendThreadMessageDto } from './dto/send-thread-message.dto';
import { QueryThreadsDto } from './dto/query-threads.dto';

import { SessionService } from '../sync/session.service';

@Injectable()
export class ChatsService implements OnModuleInit {
  private readonly logger = new Logger(ChatsService.name);
  private readonly geminiApiKey?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly curationService: CurationService,
    private readonly politicalEngineService: PoliticalEngineService,
    private readonly configService: ConfigService,
    private readonly notesService: NotesService,
    private readonly sessionService: SessionService,
  ) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
  }


  async onModuleInit() {
    await this.seedDefaultDataIfEmpty();
  }

  /**
   * Automatically provisions initial folder structure and default curator/collegium rooms
   */
  async seedDefaultDataIfEmpty() {
    try {
      const folderCount = await this.prisma.chatFolder.count({
        where: { deletedAt: null },
      });
      if (folderCount > 0) return;

      this.logger.log('🌱 Seeding initial Chat Folders and Starter Threads...');

      // 1. Create Default Folders
      const agentsFolder = await this.prisma.chatFolder.create({
        data: {
          name: 'Функциональные Агенты & Сайд-Работа',
          path: 'operational-agents',
          icon: 'Sparkles',
          color: '#ec4899',
          order: 1,
        },
      });

      const politicsFolder = await this.prisma.chatFolder.create({
        data: {
          name: 'Политика & Макроконтур',
          path: 'politics',
          icon: 'Landmark',
          color: '#38bdf8',
          order: 2,
        },
      });

      const techFolder = await this.prisma.chatFolder.create({
        data: {
          name: 'Технологии & IT',
          path: 'tech-it',
          icon: 'Cpu',
          color: '#a855f7',
          order: 3,
        },
      });

      const directFolder = await this.prisma.chatFolder.create({
        data: {
          name: 'Персональные кураторы',
          path: 'curators-direct',
          icon: 'UserCheck',
          color: '#10b981',
          order: 4,
        },
      });

      // 2. Create Starter Threads
      const today = new Date().toISOString().split('T')[0];

      // Thread: Координатор Опросов (Worker Agent)
      const surveyThread = await this.prisma.chatThread.create({
        data: {
          title: '🧭 Координатор Опросов (Опрос групп кураторов)',
          type: ChatType.GROUP,
          folderId: agentsFolder.id,
          targetAgent: 'survey-coordinator',
          participantAgents: ['survey-coordinator', 'ivan-bely', 'kirk-kitten', 'chen-wei', 'okatsiya'],
          dateScope: today,
          isPinned: true,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: surveyThread.id,
          sender: 'survey-coordinator',
          senderName: 'Координатор Опросов',
          senderRole: 'Агент-опросчик и диспетчер групп кураторов',
          avatar: '🧭',
          text: `Добро пожаловать в хаб **Координатора Опросов**! 

К агенту можно обратиться в любой момент, чтобы опросить определенную группу кураторов (или всех кураторов) на:
- **Сегодняшние новости:** \`/survey-today\` или «Опроси кураторов на сегодня»
- **Новости за вчера:** \`/survey-yesterday\` или «Опроси политическую коллегию за вчера»
- **Новости за неделю:** \`/survey-week\` или «Сделай недельный опрос всех кураторов»

Координатор сопоставит позиции кураторов, выявит точки взаимного резонанса и подготовит структурированный брифинг.`,
        },
      });

      // Thread: Продюсер Сайд-Работы (Worker Agent)
      const sideWorkThread = await this.prisma.chatThread.create({
        data: {
          title: '🎨 Продюсер Сайд-Работы (Контент & Медиа)',
          type: ChatType.GROUP,
          folderId: agentsFolder.id,
          targetAgent: 'sidework-producer',
          participantAgents: ['sidework-producer', 'independent-analyst'],
          dateScope: today,
          isPinned: true,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: sideWorkThread.id,
          sender: 'sidework-producer',
          senderName: 'Продюсер Сайд-Работы',
          senderRole: 'Агент контент-продакшна и медиа-обогащения',
          avatar: '🎨',
          text: `Приветствую в мастерской **Сайд-Работы**!

Здесь мы превращаем курированные данные и результаты опросов кураторов в готовый контент:
- **Написание материалов:** \`/sidework-post\` — готовые публикации, статьи или Obsidian заметки \`DONE\`.
- **Медиа-обогащение:** \`/media\` — генерация визуальных AI-промптов (DALL-E / Midjourney), подбор схем и диаграмм Mermaid.
- **Экспертные комментарии:** \`/comment\` — дополнение материалов встречными комментариями кураторов и фактчеком.

*Отправьте сырые тезисы или дайте команду, и мы оформим сайд-продукт!*`,
        },
      });

      // Thread: Политическая коллегия (Group)
      const politicsThread = await this.prisma.chatThread.create({
        data: {
          title: '🏛️ Политическая коллегия (Общий контур)',
          type: ChatType.GROUP,
          folderId: politicsFolder.id,
          targetAgent: 'political-group',
          participantAgents: ['ivan-bely', 'kirk-kitten', 'chen-wei', 'independent-analyst'],
          dateScope: today,
          isPinned: true,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: politicsThread.id,
          sender: 'dispatcher',
          senderName: 'Информационный Диспетчер',
          senderRole: 'Координатор аналитического деска',
          avatar: '🤖',
          text: `Добро пожаловать в **Политическую коллегию** Project Lenta!

Здесь работают кураторы всех геополитических контуров:
- **🇷🇺 Иван Белый** — внутренний контур РФ, регуляторика и налоги.
- **🌐 Kirk Kitten** — внешние рынки, санкции OFAC/ЕС и сырьевой фрахт.
- **🇨🇳 Чэнь Вэй** — АТР, Китай, БРИКС и торговые коридоры.
- **⚖️ Независимый аналитик** — выявление узлов резонанса и беспристрастный арбитраж.

*Задайте любой вопрос или вызовите команду \`/politics\` для модульной сводки дня!*`,
        },
      });

      // Thread: IT & AI Совет (Group)
      const itThread = await this.prisma.chatThread.create({
        data: {
          title: '⚡ IT & AI Совет (Технологии & Инфраструктура)',
          type: ChatType.GROUP,
          folderId: techFolder.id,
          targetAgent: 'okatsiya',
          participantAgents: ['okatsiya', 'independent-analyst'],
          dateScope: today,
          isPinned: true,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: itThread.id,
          sender: 'okatsiya',
          senderName: 'Окация',
          senderRole: 'Архитектор и куратор контура IT & AI',
          avatar: '⚡',
          text: `Приветствую в технологическом хабе! 
Здесь мы отслеживаем архитектуру высоконагруженных систем, Kubernetes, релизы LLM моделей, BigTech и кибербезопасность.

*Используйте команды \`/it\`, \`/ai\`, \`/devops\`, \`/backend\` или задавайте прямые вопросы по стеку!*`,
        },
      });

      // Thread: Иван Белый (Direct 1-on-1)
      const ivanThread = await this.prisma.chatThread.create({
        data: {
          title: '🇷🇺 Иван Белый: Внутренний контур РФ',
          type: ChatType.DIRECT,
          folderId: directFolder.id,
          targetAgent: 'ivan-bely',
          participantAgents: ['ivan-bely'],
          dateScope: today,
          isPinned: false,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: ivanThread.id,
          sender: 'ivan-bely',
          senderName: 'Иван Белый',
          senderRole: 'Обозреватель обстановки и внутреннего контура РФ',
          avatar: '🇷🇺',
          text: `Приветствую! Это ваш персональный диалог со мной. 
Я держу руку на пульсе решений Правительства, Госдумы, проверок ФАС, топливного демпфера и подготовки к ЕДГ-2026. 
О чем хотите узнать подробнее?`,
        },
      });

      // Thread: Окация (Direct 1-on-1)
      const okatsiyaThread = await this.prisma.chatThread.create({
        data: {
          title: '💻 Окация: Архитектурные консультации',
          type: ChatType.DIRECT,
          folderId: directFolder.id,
          targetAgent: 'okatsiya',
          participantAgents: ['okatsiya'],
          dateScope: today,
          isPinned: false,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: okatsiyaThread.id,
          sender: 'okatsiya',
          senderName: 'Окация',
          senderRole: 'Архитектор и куратор контура IT & AI',
          avatar: '⚡',
          text: `Сессия 1-на-1 активирована. Задавайте вопросы по кодовой базе, микросервисам, распределенным базам данных или обучению моделей.`,
        },
      });

      // Thread: Kirk Kitten (Direct 1-on-1)
      const kirkThread = await this.prisma.chatThread.create({
        data: {
          title: '🌐 Kirk Kitten: Санкции и международные рынки',
          type: ChatType.DIRECT,
          folderId: directFolder.id,
          targetAgent: 'kirk-kitten',
          participantAgents: ['kirk-kitten'],
          dateScope: today,
          isPinned: false,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: kirkThread.id,
          sender: 'kirk-kitten',
          senderName: 'Kirk Kitten',
          senderRole: 'Специальный международный корреспондент и обозреватель рынков',
          avatar: '🌐',
          text: `Welcome! В фокусе моего мониторинга: директивы OFAC, пакеты санкций ЕС, фрахтовые ставки на танкеры и решения ФРС США. Чем могу помочь?`,
        },
      });

      // Thread: Чэнь Вэй (Direct 1-on-1)
      const chenThread = await this.prisma.chatThread.create({
        data: {
          title: '🇨🇳 Чэнь Вэй: АТР, Китай и БРИКС',
          type: ChatType.DIRECT,
          folderId: directFolder.id,
          targetAgent: 'chen-wei',
          participantAgents: ['chen-wei'],
          dateScope: today,
          isPinned: false,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: chenThread.id,
          sender: 'chen-wei',
          senderName: 'Чэнь Вэй',
          senderRole: 'Обозреватель АТР, Китая и глобальных цепочек поставок',
          avatar: '🇨🇳',
          text: `Нихао! Держу связь по портам Шанхая и Нинбо, расчетам в юанях, поставкам компонентов и трансграничным коридорам БРИКС.`,
        },
      });

      // Thread: Алекс Вектор (Direct 1-on-1)
      const alexThread = await this.prisma.chatThread.create({
        data: {
          title: '🔥 Алекс Вектор: Мировой пульс & Breaking News',
          type: ChatType.DIRECT,
          folderId: directFolder.id,
          targetAgent: 'alex-vector',
          participantAgents: ['alex-vector'],
          dateScope: today,
          isPinned: false,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: alexThread.id,
          sender: 'alex-vector',
          senderName: 'Алекс Вектор',
          senderRole: 'Шеф мирового пульса и Breaking News',
          avatar: '🔥',
          text: `Приветствую! Мониторю экстренные мировые молнии, виральные тренды и ключевые инфоповоды. Команда \`/alex\` вызовет оперативный срез повестки дня.`,
        },
      });

      // Thread: Маркус Вейн (Direct 1-on-1)
      const marcusThread = await this.prisma.chatThread.create({
        data: {
          title: '♟️ Маркус Вейн: Эффект домино & Каскадные риски',
          type: ChatType.DIRECT,
          folderId: directFolder.id,
          targetAgent: 'marcus-vane',
          participantAgents: ['marcus-vane'],
          dateScope: today,
          isPinned: false,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: marcusThread.id,
          sender: 'marcus-vane',
          senderName: 'Маркус Вейн',
          senderRole: 'Аналитик эффекта домино и ветвления событий',
          avatar: '♟️',
          text: `Приветствую. Моя оптика — слом статус-кво, вакуум силы и расчет эффекта домино по смежным контурам (BPI). Вызывайте команду \`/marcus\` для анализа ветвления.`,
        },
      });

      // Thread: Тарик Саид (Direct 1-on-1)
      const tariqThread = await this.prisma.chatThread.create({
        data: {
          title: '🕌 Тарик Саид: Ближний Восток & Залив (MENA)',
          type: ChatType.DIRECT,
          folderId: directFolder.id,
          targetAgent: 'tariq-said',
          participantAgents: ['tariq-said'],
          dateScope: today,
          isPinned: false,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: tariqThread.id,
          sender: 'tariq-said',
          senderName: 'Тарик Саид',
          senderRole: 'Обозреватель Ближнего Востока и зоны Залива',
          avatar: '🕌',
          text: `Мир вам! Мониторю Ирак, Сирию, Иран, монархии Залива, Левант и безопасность региональных артерий. Используйте команду \`/tariq\`.`,
        },
      });

      // Thread: Хелена Брандт (Direct 1-on-1)
      const helenaThread = await this.prisma.chatThread.create({
        data: {
          title: '⚓ Хелена Брандт: Сырьевые артерии & Логистика',
          type: ChatType.DIRECT,
          folderId: directFolder.id,
          targetAgent: 'helena-brandt',
          participantAgents: ['helena-brandt'],
          dateScope: today,
          isPinned: false,
        },
      });

      await this.prisma.chatMessageRecord.create({
        data: {
          threadId: helenaThread.id,
          sender: 'helena-brandt',
          senderName: 'Хелена Брандт',
          senderRole: 'Аналитик критических артерий, сырья и глобальной логистики',
          avatar: '⚓',
          text: `Приветствую! Анализирую котировки Brent, ставки фрахта Lloyd's War Risk, проходимость Ормузского и Баб-эль-Мандебского проливов. Команда: \`/helena\`.`,
        },
      });

      this.logger.log('✅ Successfully seeded default Chat Folders and Starter Threads!');
    } catch (err) {
      this.logger.error('Error seeding chat defaults:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Folders API
  // ---------------------------------------------------------------------------

  async getFolders() {
    return this.prisma.chatFolder.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            threads: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  async createFolder(dto: CreateChatFolderDto) {
    const slug =
      dto.path?.trim() ||
      dto.name
        .toLowerCase()
        .replace(/[^a-zа-я0-9]+/gi, '-')
        .replace(/^-|-$/g, '') ||
      `folder-${Date.now()}`;

    return this.prisma.chatFolder.create({
      data: {
        name: dto.name.trim(),
        path: slug,
        icon: dto.icon || 'Folder',
        color: dto.color || '#3b82f6',
        order: dto.order ?? 0,
        parentId: dto.parentId || null,
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
        name: dto.name?.trim(),
        path: dto.path?.trim(),
        icon: dto.icon,
        color: dto.color,
        order: dto.order,
        parentId: dto.parentId,
      },
    });
  }

  async deleteFolder(id: string) {
    const existing = await this.prisma.chatFolder.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Папка с ID ${id} не найдена.`);
    }

    // Unlink threads in this folder so they become unassigned rather than lost
    await this.prisma.chatThread.updateMany({
      where: { folderId: id },
      data: { folderId: null },
    });

    return this.prisma.chatFolder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // Threads API
  // ---------------------------------------------------------------------------

  async getThreads(query: QueryThreadsDto) {
    const where: any = {
      deletedAt: null,
    };

    if (query.folderId) {
      where.folderId = query.folderId === 'null' ? null : query.folderId;
    }

    if (query.type) {
      where.type = query.type;
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

    const threads = await this.prisma.chatThread.findMany({
      where,
      include: {
        folder: true,
        _count: {
          select: { messages: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            sender: true,
            senderName: true,
            text: true,
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

    return threads;
  }

  async getThread(id: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id },
      include: {
        folder: true,
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
    return this.prisma.chatThread.create({
      data: {
        title: dto.title.trim(),
        type: dto.type || ChatType.DIRECT,
        folderId: dto.folderId || null,
        targetAgent: dto.targetAgent || null,
        participantAgents: dto.participantAgents || (dto.targetAgent ? [dto.targetAgent] : []),
        dateScope: dto.dateScope || new Date().toISOString().split('T')[0],
        isPinned: dto.isPinned || false,
      },
      include: {
        folder: true,
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
        title: dto.title?.trim(),
        folderId: dto.folderId !== undefined ? dto.folderId : undefined,
        targetAgent: dto.targetAgent,
        participantAgents: dto.participantAgents,
        dateScope: dto.dateScope,
        isPinned: dto.isPinned,
        isArchived: dto.isArchived,
      },
      include: {
        folder: true,
      },
    });
  }

  async deleteThread(id: string) {
    const existing = await this.prisma.chatThread.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Чат с ID ${id} не найден.`);
    }

    return this.prisma.chatThread.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // Messages API & Agent Orchestration
  // ---------------------------------------------------------------------------

  async getThreadMessages(threadId: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
    });
    if (!thread || thread.deletedAt) {
      throw new NotFoundException(`Чат с ID ${threadId} не найден.`);
    }

    const messages = await this.prisma.chatMessageRecord.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((m) => {
      const gs = m.groupSummary as any;
      return {
        ...m,
        messageType: gs?.messageType || 'DEFAULT',
        metadata: gs?.metadata || null,
        newsPosts: gs?.newsPosts || null,
      };
    });
  }

  async sendMessage(threadId: string, dto: SendThreadMessageDto) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
    });

    if (!thread || thread.deletedAt) {
      throw new NotFoundException(`Чат с ID ${threadId} не найден.`);
    }

    const rawMessage = dto.message.trim();
    if (!rawMessage) {
      throw new NotFoundException('Сообщение не может быть пустым.');
    }

    // 1. Save user message to DB
    const userMessageRecord = await this.prisma.chatMessageRecord.create({
      data: {
        threadId,
        sender: 'user',
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

    // 2. Resolve target date and news context

    const targetDate = dto.date || thread.dateScope || new Date().toISOString().split('T')[0];
    const candidateCards = await this.curationService.getDailyNews(targetDate);
    const politicalEvents = this.politicalEngineService.getPoliticalEvents2026();

    // 3. Resolve target agent routing
    let resolvedTarget: AgentId | 'all' = 'all';

    if (dto.forcedTarget) {
      resolvedTarget = dto.forcedTarget as any;
    } else if (thread.type === ChatType.DIRECT && thread.targetAgent) {
      // In 1-on-1 chats, always route directly to the designated curator
      resolvedTarget = thread.targetAgent as any;
    } else {
      // In GROUP chats: check for mentions or route according to question
      const lower = rawMessage.toLowerCase();
      if (lower.startsWith('/survey') || lower.startsWith('@survey') || lower.includes('опроси') || lower.includes('опрос кураторов')) {
        resolvedTarget = 'survey-coordinator';
      } else if (
        lower.startsWith('/sidework') ||
        lower.startsWith('/media') ||
        lower.startsWith('/comment') ||
        lower.startsWith('@sidework') ||
        lower.includes('сайд') ||
        lower.includes('промпт')
      ) {
        resolvedTarget = 'sidework-producer';
      } else if (lower.startsWith('/harvest') || lower.startsWith('@harvest') || lower.includes('харвестер')) {
        resolvedTarget = 'harvester-agent';
      } else if (lower.startsWith('@ivan') || lower.startsWith('/ivan')) {
        resolvedTarget = 'ivan-bely';
      } else if (lower.startsWith('@okatsiya') || lower.startsWith('/it') || lower.startsWith('/ai') || lower.startsWith('/okatsiya')) {
        resolvedTarget = 'okatsiya';
      } else if (lower.startsWith('@german') || lower.startsWith('/german') || lower.startsWith('/habr') || lower.startsWith('/xakep') || lower.includes('герман')) {
        resolvedTarget = 'german-kernel';
      } else if (lower.startsWith('/notebook') || lower.startsWith('@notebook') || lower.includes('notebooklm')) {
        resolvedTarget = 'notebook-producer';
      } else if (lower.startsWith('@kirk') || lower.startsWith('/kirk')) {
        resolvedTarget = 'kirk-kitten';
      } else if (lower.startsWith('@chen') || lower.startsWith('/chen')) {
        resolvedTarget = 'chen-wei';
      } else if (lower.startsWith('@alex') || lower.startsWith('/alex') || lower.startsWith('/breaking') || lower.startsWith('@breaking')) {
        resolvedTarget = 'alex-vector';
      } else if (lower.startsWith('/politics') || lower.startsWith('/group') || lower.includes('коллегия')) {
        resolvedTarget = 'political-group';
      } else if (thread.targetAgent) {
        resolvedTarget = thread.targetAgent as any;
      }
    }

    // 4. Fetch recent history for rolling context window (last 20 messages)
    const recentDbMessages = await this.prisma.chatMessageRecord.findMany({
      where: { threadId },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const formattedHistory: ChatMessage[] = recentDbMessages.reverse().map((m) => {
      const gs = m.groupSummary as any;
      return {
        id: m.id,
        sender: m.sender as any,
        senderName: m.senderName,
        senderRole: m.senderRole,
        avatar: m.avatar || undefined,
        text: m.text,
        timestamp: m.createdAt.toISOString(),
        resonanceScore: m.resonanceScore || undefined,
        sources: m.sources,
        resonanceNodes: m.resonanceNodes as any,
        groupSummary: m.groupSummary as any,
        suggestedCard: m.suggestedCard as any,
        messageType: gs?.messageType || 'DEFAULT',
        metadata: gs?.metadata || undefined,
        newsPosts: gs?.newsPosts || undefined,
      };
    });

    // 5. Invoke Agent Engine
    const generatedReplies = await AgentChatEngine.process({
      message: rawMessage,
      targetAgent: resolvedTarget,
      date: targetDate,
      contextCards: candidateCards,
      politicalEvents,
      history: formattedHistory,
      geminiApiKey: this.geminiApiKey,
    });

    // 6. Persist generated replies
    const savedReplies = [];
    for (const reply of generatedReplies) {
      const groupSummaryPayload = {
        ...(typeof reply.groupSummary === 'object' && reply.groupSummary !== null ? reply.groupSummary : {}),
        messageType: reply.messageType || 'DEFAULT',
        metadata: reply.metadata || null,
        newsPosts: reply.newsPosts || null,
      };

      const saved = await this.prisma.chatMessageRecord.create({
        data: {
          threadId,
          sender: reply.sender,
          senderName: reply.senderName,
          senderRole: reply.senderRole,
          avatar: reply.avatar || null,
          text: reply.text,
          resonanceScore: reply.resonanceScore || null,
          sources: reply.sources || [],
          resonanceNodes: (reply.resonanceNodes as any) || null,
          groupSummary: (groupSummaryPayload as any) || null,
          suggestedCard: (reply.suggestedCard as any) || null,
        },
      });
      savedReplies.push({
        ...saved,
        messageType: reply.messageType || (saved.groupSummary as any)?.messageType || 'DEFAULT',
        metadata: reply.metadata || (saved.groupSummary as any)?.metadata || null,
        newsPosts: reply.newsPosts || (saved.groupSummary as any)?.newsPosts || null,
      });
    }

    // 7. Update thread timestamp
    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: new Date(),
      },
    });

    return {
      threadId,
      date: targetDate,
      userMessage: userMessageRecord,
      replies: savedReplies,
    };
  }
}
