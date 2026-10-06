import { AgentId, ChatMessage, DailyNewsCard } from '../types';

export interface GeminiGeneratorContext {
  prompt: string;
  resolvedTarget: AgentId | 'all';
  date: string;
  contextCards: DailyNewsCard[];
  politicalEvents: any[];
  apiKey: string;
}

export async function generateViaGemini(
  ctx: GeminiGeneratorContext,
): Promise<ChatMessage[] | null> {
  const systemPrompt = `Ты — координирующий аналитический движок мультиагентной системы Project Lenta.
Текущая дата: ${ctx.date}.
В системе работают ключевые кураторы и группы:
1. 🏛️ Политическая коллегия (political-group): Единая группа кураторов (РФ, США, Ближний Восток, Свежие новости). Если запрос направлен к ней, сформируй МОДУЛЬНОЕ РЕЗЮМЕ по контурам (Иван Белый, Kirk Kitten, Тарик Саид, Алекс Вектор).
2. ⚡ IT & AI Группа (tech-group): Единая технологическая группа. Модульное резюме по специализациям: Акация IT (Hi-Tech, девайсы, анонсы), Саймон (разбор статей с Habr), Presijo AI & IT (AI инструменты, библиотеки, Telegram).
3. 🇷🇺 Иван Белый (ivan-bely): Внутренний контур РФ (законы, Госдума, бюджет, ФАС, ЦБ РФ, топливный демпфер, внутренние цены).
4. 🌐 Kirk Kitten (kirk-kitten): Международный контур и США (OFAC, санкции, Конгресс, фрахт, глобальные рынки).
5. 🕌 Тарик Саид (tariq-said): Ближний Восток (MENA, страны Залива, OPEC+, региональная безопасность).
6. 🔥 Алекс Вектор (alex-vector): Свежие политические новости, общая мировая повестка, breaking news, саммиты.
7. ⚡ Акация IT (okatsiya): Hi-Tech, IT & AI индустрия, новые девайсы, громкие анонсы BigTech.
8. 📟 Саймон (simon-habr): Разбор публикаций и инженерных статей с Habr, опыт сообщества, схемотехника.
9. 🚀 Presijo AI & IT (presijo-ai): AI инструменты, библиотеки, фичи, мониторинг Telegram-каналов, контент.
10. 🇨🇳 Чэнь Вэй (chen-wei): Восточный контур (Китай, АТР, БРИКС, нацвалюты, торговые коридоры).
11. ⚓ Хелена Брандт (helena-brandt): Критические артерии, нефть, сырье, морские проливы.

Контекст новостей на дату:
${JSON.stringify(ctx.contextCards.map((c) => ({ title: c.title, source: c.source, summary: c.summary, curator: c.suggestedCurator })))}

События календаря:
${JSON.stringify(ctx.politicalEvents.map((e) => ({ title: e.title, description: e.description })))}

Запрос пользователя: "${ctx.prompt}"
Целевой агент: "${ctx.resolvedTarget}"

Верни строго JSON массив ответов (без markdown блоков \`\`\`json):
[
  {
    "sender": "political-group" | "tech-group" | "ivan-bely" | "kirk-kitten" | "tariq-said" | "alex-vector" | "okatsiya" | "simon-habr" | "presijo-ai",
    "senderName": "Имя агента или группы",
    "senderRole": "Роль",
    "avatar": "эмодзи",
    "text": "Ответ в Markdown",
    "suggestedCard": {
      "title": "Заголовок для календаря",
      "description": "Markdown текст карточки",
      "type": "SINGLE" | "EVENT" | "PERIOD" | "DONE",
      "folder": "Politics/Daily" | "Politics/Russia",
      "taxonomyPath": "politics.daily_summary" | "politics.russia",
      "hashtags": ["тег1", "тег2"],
      "curator": "Политическая коллегия" | "ivan-bely" | "kirk-kitten"
    }
  }
]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${ctx.apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.6,
      },
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) return null;

  const parsed = JSON.parse(candidateText);
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  return parsed.map((item: any, index: number) => ({
    id: `gemini-reply-${Date.now()}-${index}`,
    sender: item.sender || 'political-group',
    senderName: item.senderName || 'Политическая коллегия',
    senderRole: item.senderRole || 'Аналитический деск',
    avatar: item.avatar || '🏛️',
    text: item.text || '',
    timestamp: new Date().toISOString(),
    suggestedCard: item.suggestedCard,
  }));
}
