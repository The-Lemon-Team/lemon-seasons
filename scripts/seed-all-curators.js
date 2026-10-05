const prismaPath = require.resolve('@prisma/client', { paths: [__dirname + '/../apps/backend'] });
const { PrismaClient, ChatType } = require(prismaPath);
const p = new PrismaClient();

async function main() {
  console.log('Seeding all curators and groups into database...');
  const today = new Date().toISOString().split('T')[0];

  // 1. Folders
  let directFolder = await p.chatFolder.findFirst({ where: { path: 'curators-direct' } });
  if (!directFolder) {
    directFolder = await p.chatFolder.create({
      data: {
        name: 'Персональные кураторы',
        path: 'curators-direct',
        icon: 'UserCheck',
        color: '#10b981',
        order: 4,
      },
    });
    console.log('Created curators-direct folder:', directFolder.id);
  }

  let groupsFolder = await p.chatFolder.findFirst({ where: { path: 'collegiums-groups' } });
  if (!groupsFolder) {
    groupsFolder = await p.chatFolder.create({
      data: {
        name: 'Коллегии & Группы реагирования',
        path: 'collegiums-groups',
        icon: 'Layers',
        color: '#f59e0b',
        order: 5,
      },
    });
    console.log('Created collegiums-groups folder:', groupsFolder.id);
  }

  // 2. Direct Curator Threads
  const curators = [
    {
      id: 'ivan-bely',
      title: '🇷🇺 Иван Белый: Контур РФ & Регуляторика',
      role: 'Специалист по Контуру РФ, законодательству и регуляторике',
      emoji: '🇷🇺',
      text: 'Приветствую! Я курирую внутренний контур РФ: законы, инициативы Государственной Думы, постановления Правительства, параметры бюджета, антимонопольный контроль ФАС и решения ЦБ РФ.\n\nИспользуйте команду `/ivan` для анализа повестки РФ.',
    },
    {
      id: 'kirk-kitten',
      title: '🌐 Kirk Kitten: Контур США, Рынки & Санкции',
      role: 'Специалист по контуру США, международным рынкам и санкциям',
      emoji: '🌐',
      text: 'Приветствую! Мой фокус — контур США, решения Белого дома и Конгресса, директивы OFAC, европейские регуляторы, комплаенс морского фрахта и глобальные рынки.\n\nИспользуйте команду `/kirk` для анализа американского и санкционного контура.',
    },
    {
      id: 'tariq-said',
      title: '🕌 Тарик Саид: Ближний Восток & Залив (MENA)',
      role: 'Специалист по контуру Ближнего Востока и зоны Залива (MENA)',
      emoji: '🕌',
      text: 'Мир вам! Я веду аналитический мониторинг Большого Ближнего Востока: Ирак, Сирия, Иран, монархии Залива, Левант, квоты OPEC+, баланс сил и безопасность инфраструктуры.\n\nИспользуйте `/tariq` для актуального среза по региону.',
    },
    {
      id: 'alex-vector',
      title: '🔥 Алекс Вектор: Свежие новости & Мировой пульс',
      role: 'Специалист по общей политической повестке и свежим мировым новостям',
      emoji: '🔥',
      text: 'Приветствую! Я отслеживаю глобальный оперативный пульс, экстренные мировые молнии, коммюнике саммитов и свежую политическую повестку ведущих мировых агентств.\n\nИспользуйте команду `/alex` или `/breaking` для оперативной картины.',
    },
    {
      id: 'okatsiya',
      title: '⚡ Акация IT: Hi-Tech, Девайсы & Анонсы',
      role: 'Куратор Hi-Tech, IT & AI индустрии, новых девайсов и громких анонсов',
      emoji: '⚡',
      text: 'Привет! Я отслеживаю новинки Hi-Tech, релизы новых девайсов (гаджеты, VR/AR, чипы, флагманы), громкие анонсы BigTech-корпораций и ключевые тренды IT & AI индустрии.\n\nИспользуйте `/okatsiya` или `/akatsiya` для технологического среза.',
    },
    {
      id: 'simon-habr',
      title: '📟 Саймон: Разбор публикаций Habr',
      role: 'Специалист по разбору новостей с Habr',
      emoji: '📟',
      text: 'Приветствую! Меньше корпоративного шума — больше реальной практики. Я разбираю инженерные статьи и публикации с Хабра, олдскул-технологии, схемотехнику и практические кейсы сообщества.\n\nИспользуйте команду `/simon` для разбора статей с Хабра.',
    },
    {
      id: 'presijo-ai',
      title: '🚀 Presijo AI & IT: Инструменты, Библиотеки & Telegram',
      role: 'AI & IT тренд-хантер, контент-мейкер и обозреватель инструментов',
      emoji: '🚀',
      text: 'Салют! Я на острие прикладного AI: новые инструменты и тулзы на рынке, свежие фичи, релизы open-source библиотек, мониторинг топовых Telegram-каналов и контент-мейкинг.\n\nИспользуйте `/presijo` для радара AI-инструментов и трендов.',
    },
    {
      id: 'chen-wei',
      title: '🇨🇳 Чэнь Вэй: АТР, Китай & БРИКС',
      role: 'Обозреватель АТР, Китая и глобальных цепочек поставок',
      emoji: '🇨🇳',
      text: 'Приветствую! Я курирую Азиатско-Тихоокеанский регион, торгово-логистические коридоры и расчеты в нацвалютах в рамках БРИКС+.\n\nИспользуйте `/chen` для оперативного анализа восточного контура.',
    },
    {
      id: 'helena-brandt',
      title: '⚓ Хелена Брандт: Сырьевые артерии & Логистика',
      role: 'Аналитик критических артерий, сырья и глобальной логистики',
      emoji: '⚓',
      text: 'Приветствую! Геополитика всегда материализуется в физическом мире. Я отслеживаю котировки Brent/WTI, ставки военного фрахта Lloyd\'s War Risk, проходимость Ормузского и Баб-эль-Мандебского проливов и цепочки критического сырья.\n\nИспользуйте `/helena` для сырьевого и логистического среза.',
    },
    {
      id: 'marcus-vane',
      title: '♟️ Маркус Вейн: Эффект домино & Каскадные риски',
      role: 'Аналитик эффекта домино и ветвления событий',
      emoji: '♟️',
      text: 'Приветствую. Моя оптика — системные каскады, точки бифуркации и вакуум силы.\n\nКогда происходит масштабное событие, я строю дерево ветвления последствий (BPI) по смежным контурам.\n\nИспользуйте команду `/marcus` для анализа скрытых рисков.',
    },
  ];

  for (const c of curators) {
    let t = await p.chatThread.findFirst({ where: { targetAgent: c.id } });
    if (!t) {
      t = await p.chatThread.create({
        data: {
          title: c.title,
          type: ChatType.DIRECT,
          folderId: directFolder.id,
          targetAgent: c.id,
          participantAgents: [c.id],
          dateScope: today,
          isPinned: false,
        },
      });
      await p.chatMessageRecord.create({
        data: {
          threadId: t.id,
          sender: c.id,
          senderName: c.title.split(':')[0].replace(/^[^\s]+\s+/, ''),
          senderRole: c.role,
          avatar: c.emoji,
          text: c.text,
        },
      });
      console.log(`Created thread for ${c.id}: ${t.id}`);
    } else {
      console.log(`Thread for ${c.id} already exists: ${t.id}`);
    }
  }

  // 3. Curator Group Threads
  const groups = [
    {
      id: 'political-group',
      title: '🏛️ Политическая коллегия (РФ, США, Ближний Восток & Повестка)',
      participants: ['ivan-bely', 'kirk-kitten', 'tariq-said', 'alex-vector'],
      text: 'Добро пожаловать в хаб **Политической коллегии**!\n\nЗдесь объединяются аналитические оптики четырех ключевых контуров:\n- 🇷🇺 **Иван Белый**: Внутренний контур РФ, законодательство и регуляторика\n- 🌐 **Kirk Kitten**: Контур США, международные рынки и санкции OFAC\n- 🕌 **Тарик Саид**: Контур Ближнего Востока и зоны Залива (MENA)\n- 🔥 **Алекс Вектор**: Свежие политические новости и мировая повестка\n\nКоманды: `/politics today`, `/politics week`, `/politics month`',
    },
    {
      id: 'tech-group',
      title: '⚡ IT & AI Группа (Акация IT, Саймон & Presijo)',
      participants: ['okatsiya', 'simon-habr', 'presijo-ai'],
      text: 'Добро пожаловать в хаб **IT & AI Группы**!\n\nЗдесь кураторы формируют технологический срез индустрии:\n- ⚡ **Акация IT**: Hi-Tech, новости IT & AI индустрии, новые девайсы и громкие анонсы BigTech\n- 📟 **Саймон**: Разбор новостей и инженерных статей с Habr, схемотехника и опыт сообщества\n- 🚀 **Presijo AI & IT**: Новости AI, новые инструменты на рынке, свежие фичи, релизы библиотек, Telegram-каналы и контент\n\nКоманды: `/tech today`, `/tech week`, `/tech month`, `/it today`',
    },
    {
      id: 'hot-pulse-group',
      title: '🔥 Группа быстрого реагирования (Мировой пульс)',
      participants: ['alex-vector', 'kirk-kitten', 'marcus-vane'],
      text: 'Добро пожаловать в хаб **Группы быстрого реагирования**!\n\nЗдесь кураторы оперативного пульса мгновенно валидируют горячие мировые новости, фильтруют вбросы и оценивают первичный потенциал резонанса.\n\nКоманда: `/survey-breaking`',
    },
    {
      id: 'domino-nexus-group',
      title: '♟️ Коллегия каскадных рисков и ветвления',
      participants: ['marcus-vane', 'tariq-said', 'helena-brandt', 'chen-wei'],
      text: 'Добро пожаловать в **Коллегию каскадных рисков**!\n\nЗдесь кураторы раскладывают сложные события-триггеры на смежные ветки: слом статус-кво, безопасность регионов, сырьевые рынки и финансовые потоки.\n\nКоманда: `/survey-nexus`',
    },
    {
      id: 'mena-security-group',
      title: '🕌 Консилиум Ближнего Востока и Южного периметра',
      participants: ['tariq-said', 'ivan-bely', 'kirk-kitten', 'helena-brandt'],
      text: 'Добро пожаловать в **Консилиум Ближнего Востока**!\n\nФокус: безопасность зоны Залива, Ормузский пролив, рынок нефти, баланс сил и проекция на внутренний рынок и бюджет РФ.\n\nКоманда: `/survey-mena`',
    },
  ];

  for (const g of groups) {
    let t = await p.chatThread.findFirst({ where: { targetAgent: g.id } });
    if (!t) {
      t = await p.chatThread.create({
        data: {
          title: g.title,
          type: ChatType.GROUP,
          folderId: groupsFolder.id,
          targetAgent: g.id,
          participantAgents: g.participants,
          dateScope: today,
          isPinned: true,
        },
      });
      await p.chatMessageRecord.create({
        data: {
          threadId: t.id,
          sender: 'dispatcher',
          senderName: 'Информационный Диспетчер',
          senderRole: 'Координатор аналитического деска',
          avatar: '🤖',
          text: g.text,
        },
      });
      console.log(`Created group thread for ${g.id}: ${t.id}`);
    } else {
      console.log(`Group thread for ${g.id} already exists: ${t.id}`);
      // Update participants if not set properly
      await p.chatThread.update({
        where: { id: t.id },
        data: {
          title: g.title,
          participantAgents: g.participants,
        },
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
