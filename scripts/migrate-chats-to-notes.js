const path = require('path');
const prismaPath = require.resolve('@prisma/client', { paths: [path.join(__dirname, '../apps/backend')] });
const { PrismaClient } = require(prismaPath);

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Запуск архивации/миграции чатов в Notes...');

  // 1. Ищем дефолтный фид для заметок
  let feed = await prisma.feed.findFirst();
  if (!feed) {
    feed = await prisma.feed.create({
      data: {
        title: 'Архив и Инсайты',
        slug: 'archive-insights',
        description: 'Архивированные обсуждения и инсайты из AI-чатов',
      },
    });
    console.log(`📁 Создан базовый фид: ${feed.title} (${feed.id})`);
  }

  // 2. Получаем все существующие треды чатов вместе с сообщениями и кураторами
  const threads = await prisma.chatThread.findMany({
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      curator: true,
      assistant: true,
    },
  });

  console.log(`📋 Найдено тредов для проверки: ${threads.length}`);

  let migratedCount = 0;

  for (const thread of threads) {
    // Проверяем, мигрирован ли уже этот тред
    const existingNote = await prisma.note.findFirst({
      where: {
        sourceLink: `defi-chat://${thread.id}`,
      },
    });

    if (existingNote) {
      console.log(`⏩ Тред "${thread.title}" уже сохранен как Note (${existingNote.id})`);
      continue;
    }

    // Собираем форматированный markdown-текст диалога
    const authorName = thread.curator?.name || thread.assistant?.name || 'AI Assistant';
    let markdownBody = `## Обсуждение: ${thread.title}\n\n`;
    markdownBody += `**Автор / Агент:** ${authorName}\n`;
    markdownBody += `**Дата создания:** ${thread.createdAt.toISOString()}\n\n`;
    markdownBody += `---\n\n`;

    if (thread.messages.length === 0) {
      markdownBody += `*(Ветка создана без дополнительных сообщений)*\n`;
    } else {
      for (const msg of thread.messages) {
        const sender = msg.senderName || msg.senderRole || msg.sender;
        markdownBody += `### ${sender} (${new Date(msg.createdAt).toLocaleTimeString('ru-RU')}):\n`;
        markdownBody += `${msg.text}\n\n`;
        if (msg.sources && msg.sources.length > 0) {
          markdownBody += `**Источники:**\n` + msg.sources.map(s => `- ${s}`).join('\n') + '\n\n';
        }
      }
    }

    // Создаем Note
    const createdNote = await prisma.note.create({
      data: {
        title: `[Архив Чата] ${thread.title}`,
        description: markdownBody,
        type: 'SINGLE',
        feedId: feed.id,
        author: thread.curator?.name || null,
        curator: thread.curator?.name || null,
        sourceLink: `defi-chat://${thread.id}`,
        icon: thread.curator?.emoji || '💬',
        startDate: thread.lastMessageAt || thread.createdAt,
        hashtags: {
          connectOrCreate: [
            { where: { name: 'ai-discussion' }, create: { name: 'ai-discussion' } },
            { where: { name: 'chat-archive' }, create: { name: 'chat-archive' } },
          ],
        },
      },
    });

    migratedCount++;
    console.log(`✅ Тред "${thread.title}" сохранен в Note: ${createdNote.id}`);
  }

  console.log(`🎉 Завершена архивация! Всего перенесено новых заметок: ${migratedCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка миграции:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
