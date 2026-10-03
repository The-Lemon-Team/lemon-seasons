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
      id: 'alex-vector',
      title: '🔥 Алекс Вектор: Мировой пульс & Breaking News',
      role: 'Шеф мирового пульса и Breaking News',
      emoji: '🔥',
      text: 'Приветствую! Я отслеживаю глобальный оперативный пульс, экстренные мировые молнии и виральные инфоповоды Reuters, Bloomberg, AP и X.\n\nЗадайте вопрос или используйте команду `/alex` для получения оперативной картины прямо сейчас.',
    },
    {
      id: 'marcus-vane',
      title: '♟️ Маркус Вейн: Эффект домино & Каскадные риски',
      role: 'Аналитик эффекта домино и ветвления событий',
      emoji: '♟️',
      text: 'Приветствую. Моя оптика — системные каскады, точки бифуркации и вакуум силы.\n\nКогда происходит масштабное событие (например, вывод войск или падение режима), я строю дерево ветвления последствий (BPI) по смежным контурам.\n\nИспользуйте команду `/marcus` для анализа скрытых рисков.',
    },
    {
      id: 'tariq-said',
      title: '🕌 Тарик Саид: Ближний Восток & Залив (MENA)',
      role: 'Обозреватель Ближнего Востока и зоны Залива',
      emoji: '🕌',
      text: 'Мир вам! Я веду аналитический мониторинг Большого Ближнего Востока: Ирак, Сирия, Иран, монархии Залива, Левант, баланс суннитских и шиитских сил и безопасность баз.\n\nИспользуйте `/tariq` для актуального среза по региону.',
    },
    {
      id: 'helena-brandt',
      title: '⚓ Хелена Брандт: Сырьевые артерии & Логистика',
      role: 'Аналитик критических артерий, сырья и глобальной логистики',
      emoji: '⚓',
      text: 'Приветствую! Геополитика всегда материализуется в физическом мире. Я отслеживаю котировки Brent/WTI, ставки военного фрахта Lloyd\'s War Risk, проходимость Ормузского и Баб-эль-Мандебского проливов и цепочки критического сырья.\n\nИспользуйте `/helena` для сырьевого и логистического среза.',
    },
    {
      id: 'chen-wei',
      title: '🇨🇳 Чэнь Вэй: АТР, Китай & БРИКС',
      role: 'Обозреватель АТР, Китая и глобальных цепочек поставок',
      emoji: '🇨🇳',
      text: 'Приветствую! Я курирую Азиатско-Тихоокеанский регион, торгово-логистические коридоры и расчеты в нацвалютах в рамках БРИКС+.\n\nИспользуйте `/chen` для оперативного анализа восточного контура.',
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
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
