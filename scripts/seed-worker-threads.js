const prismaPath = require.resolve('@prisma/client', { paths: [__dirname + '/../apps/backend'] });
const { PrismaClient, ChatType } = require(prismaPath);
const p = new PrismaClient();

async function main() {
  let f = await p.chatFolder.findFirst({ where: { path: 'operational-agents' } });
  if (!f) {
    f = await p.chatFolder.create({
      data: {
        name: 'Функциональные Агенты & Сайд-Работа',
        path: 'operational-agents',
        icon: 'Sparkles',
        color: '#ec4899',
        order: 0,
      },
    });
    console.log('Created operational-agents folder:', f.id);
  }

  let surveyT = await p.chatThread.findFirst({ where: { targetAgent: 'survey-coordinator' } });
  if (!surveyT) {
    surveyT = await p.chatThread.create({
      data: {
        title: '🧭 Координатор Опросов (Опрос групп кураторов)',
        type: ChatType.GROUP,
        folderId: f.id,
        targetAgent: 'survey-coordinator',
        participantAgents: ['survey-coordinator', 'ivan-bely', 'kirk-kitten', 'chen-wei', 'okatsiya'],
        isPinned: true,
      },
    });
    await p.chatMessageRecord.create({
      data: {
        threadId: surveyT.id,
        sender: 'survey-coordinator',
        senderName: 'Координатор Опросов',
        senderRole: 'Агент-опросчик и диспетчер групп кураторов',
        avatar: '🧭',
        text: 'Добро пожаловать в хаб Координатора Опросов!\n\nК агенту можно обратиться в любой момент, чтобы опросить определенную группу кураторов (или всех кураторов):\n- `/survey-today` — опрос на сегодня\n- `/survey-yesterday` — опрос за вчера\n- `/survey-week` — опрос за неделю',
      },
    });
    console.log('Created survey-coordinator thread:', surveyT.id);
  }

  let sideT = await p.chatThread.findFirst({ where: { targetAgent: 'sidework-producer' } });
  if (!sideT) {
    sideT = await p.chatThread.create({
      data: {
        title: '🎨 Продюсер Сайд-Работы (Контент & Медиа)',
        type: ChatType.GROUP,
        folderId: f.id,
        targetAgent: 'sidework-producer',
        participantAgents: ['sidework-producer', 'independent-analyst'],
        isPinned: true,
      },
    });
    await p.chatMessageRecord.create({
      data: {
        threadId: sideT.id,
        sender: 'sidework-producer',
        senderName: 'Продюсер Сайд-Работы',
        senderRole: 'Агент контент-продакшна и медиа-обогащения',
        avatar: '🎨',
        text: 'Приветствую в мастерской Сайд-Работы!\n\nЗдесь мы превращаем курированные данные и результаты опросов кураторов в готовый контент:\n- `/sidework-post` — публикации\n- `/media` — AI-промпты и схемы\n- `/comment` — экспертные комментарии',
      },
    });
    console.log('Created sidework-producer thread:', sideT.id);
  }

  console.log('Worker threads checked/seeded successfully.');
}

main().catch(console.error).finally(() => p.$disconnect());
