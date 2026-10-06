import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatType } from '@prisma/client';

@Injectable()
export class ChatSeederService {
  private readonly logger = new Logger(ChatSeederService.name);

  constructor(private readonly prisma: PrismaService) {}

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
