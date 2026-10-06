import { AgentId, DEFAULT_CHAT_SNIPPETS } from '../types';

export interface CommandResolutionResult {
  resolvedTarget: AgentId | 'all';
  cleanPrompt: string;
}

type CommandHandler = (command: string, args: string[]) => CommandResolutionResult | null;

/**
 * Parses timeframes like today / week / month from command arguments
 */
function extractTimeframe(subArg: string, commandName: string): 'today' | 'week' | 'month' | '' {
  if (
    commandName.endsWith('-today') ||
    subArg === 'today' ||
    subArg.includes('сегодня') ||
    subArg.includes('день')
  ) {
    return 'today';
  }
  if (
    commandName.endsWith('-week') ||
    subArg === 'week' ||
    subArg.includes('недел') ||
    subArg.includes('7 дней')
  ) {
    return 'week';
  }
  if (
    commandName.endsWith('-month') ||
    subArg === 'month' ||
    subArg.includes('месяц') ||
    subArg.includes('30 дней')
  ) {
    return 'month';
  }
  return '';
}

/**
 * Declarative command matchers
 */
const COMMAND_HANDLERS: CommandHandler[] = [
  // 1. Snippet overrides
  (command, args) => {
    const snippet = DEFAULT_CHAT_SNIPPETS.find((s) => s.command === command);
    if (!snippet) return null;
    return {
      resolvedTarget: snippet.targetAgent,
      cleanPrompt: args.join(' ').trim() || snippet.prompt,
    };
  },

  // 2. Telegram / Post formatting commands
  (command, args) => {
    if (!['/post', '/post-today', '/post-week', '/tg', '/tg-today', '/tg-week', '/telegram'].includes(command)) {
      return null;
    }
    const subArg = args.join(' ').trim().toLowerCase();
    const tf = (command === '/post-week' || command === '/tg-week' || subArg.startsWith('week') || subArg.includes('недел'))
      ? 'week'
      : 'today';
    const extraPrompt = args.filter((p) => p.toLowerCase() !== 'today' && p.toLowerCase() !== 'week').join(' ').trim();
    return {
      resolvedTarget: 'all',
      cleanPrompt: `/post ${tf}${extraPrompt ? ' ' + extraPrompt : ''}`,
    };
  },

  // 3. Political Group commands
  (command, args) => {
    if (!['/politics', '/politics-today', '/politics-week', '/politics-month', '/group', '/board'].includes(command)) {
      return null;
    }
    const subArg = args.join(' ').trim().toLowerCase();
    const tf = extractTimeframe(subArg, command);
    return {
      resolvedTarget: 'political-group',
      cleanPrompt: args.join(' ').trim() || (tf ? `/politics ${tf}` : 'today'),
    };
  },

  // 4. Chen Wei / Asia / BRICS
  (command, args) => {
    if (!['/chen', '/asia', '/brics'].includes(command)) return null;
    return {
      resolvedTarget: 'chen-wei',
      cleanPrompt: args.join(' ').trim() || 'Новости и сигналы по АТР, Китаю и БРИКС на сегодня',
    };
  },

  // 5. Alex Vector / Breaking News
  (command, args) => {
    if (![
      '/alex',
      '/breaking',
      '/breaking-news',
      '/breaking-today',
      '/breaking-week',
      '/breaking-month',
      '/hot',
      '/pulse',
    ].includes(command)) return null;

    const subArg = args.join(' ').trim().toLowerCase();
    const tf = extractTimeframe(subArg, command);
    const defaultPrompt =
      tf === 'week'
        ? 'Недельная хроника экстренных мировых новостей и ключевых событий'
        : tf === 'month'
        ? 'Месячная панорама ключевых мировых происшествий и резонансных тем'
        : 'Горячие мировые новости и оперативные молнии на сегодня';

    return {
      resolvedTarget: 'alex-vector',
      cleanPrompt: args.join(' ').trim() || defaultPrompt,
    };
  },

  // 6. Tech Group
  (command, args) => {
    if (!['/tech', '/tech-group', '/it-group', '/it-board'].includes(command)) return null;
    const subArg = args.join(' ').trim().toLowerCase();
    const tf = extractTimeframe(subArg, command);
    return {
      resolvedTarget: 'tech-group',
      cleanPrompt: args.join(' ').trim() || (tf ? `/tech ${tf}` : 'today'),
    };
  },

  // 7. Marcus Vane
  (command, args) => {
    if (!['/marcus', '/nexus', '/domino', '/branch'].includes(command)) return null;
    return {
      resolvedTarget: 'marcus-vane',
      cleanPrompt: args.join(' ').trim() || 'Анализ эффекта домино, вакуума силы и смежных веток событий',
    };
  },

  // 8. Tariq Said
  (command, args) => {
    if (!['/tariq', '/mena', '/mideast', '/gulf'].includes(command)) return null;
    return {
      resolvedTarget: 'tariq-said',
      cleanPrompt: args.join(' ').trim() || 'Сводка по Ближнему Востоку, зоне Залива и безопасности региона',
    };
  },

  // 9. Helena Brandt
  (command, args) => {
    if (!['/helena', '/energy', '/choke', '/logistics', '/oil'].includes(command)) return null;
    return {
      resolvedTarget: 'helena-brandt',
      cleanPrompt: args.join(' ').trim() || 'Анализ сырьевых рынков, нефти Brent и проходимости морских проливов',
    };
  },

  // 10. Okatsiya IT & AI
  (command, args) => {
    const okatsiyaCommands = [
      '/okatsiya', '/akatsiya', '/hitech', '/devices', '/it',
      '/it-today', '/it-week', '/it-month', '/ai', '/models',
      '/agents', '/devops', '/backend', '/bigtech', '/frontend',
      '/mobile', '/infosec', '/cloud', '/hardware', '/gamedev', '/qa',
    ];
    if (!okatsiyaCommands.includes(command)) return null;

    const subSector = command.replace('/', '');
    const subArg = args.join(' ').trim().toLowerCase();
    const tf = extractTimeframe(subArg, command);
    const defaultPrompt =
      tf === 'week'
        ? 'Недельный дайджест Hi-Tech & IT: новые девайсы, анонсы, BigTech'
        : tf === 'month'
        ? 'Месячная панорама Hi-Tech & IT: ключевые релизы, девайсы и BigTech'
        : subSector !== 'it' && subSector !== 'okatsiya' && subSector !== 'akatsiya'
        ? `Новости по направлению ${subSector}`
        : 'Ключевые новости Hi-Tech, IT & AI индустрии, новые девайсы и анонсы на сегодня';

    return {
      resolvedTarget: 'okatsiya',
      cleanPrompt: args.join(' ').trim() || defaultPrompt,
    };
  },

  // 11. Simon Habr
  (command, args) => {
    if (!['/simon', '/саймон', '/habr', '/german', '/xakep'].includes(command)) return null;
    const defaultPrompt =
      command === '/xakep'
        ? 'Разбор материалов журнала «Хакер» (xakep.ru) и подготовка тематической Super Note'
        : command === '/habr'
        ? 'Аналитический разбор публикаций с Habr и инженерных статей от Саймона'
        : 'Разбор публикаций с Хабра (Habr) и инженерных статей от Саймона';

    return {
      resolvedTarget: 'simon-habr',
      cleanPrompt: args.join(' ').trim() || defaultPrompt,
    };
  },

  // 12. Presijo AI & IT
  (command, args) => {
    if (!['/presijo', '/пресижо', '/tools', '/libs', '/libraries', '/tg-content'].includes(command)) return null;
    return {
      resolvedTarget: 'presijo-ai',
      cleanPrompt: args.join(' ').trim() || 'Обзор свежих AI-инструментов, релизов библиотек и трендов в Telegram-каналах от Presijo',
    };
  },

  // 13. Survey Coordinator
  (command, args) => {
    if (![
      '/survey',
      '/survey-today',
      '/survey-yesterday',
      '/survey-week',
      '/survey-breaking',
      '/survey-nexus',
      '/survey-mena',
    ].includes(command)) return null;

    const defaultPrompt =
      command === '/survey-breaking'
        ? 'Проведи опрос группы быстрого реагирования по экстренной повестке'
        : command === '/survey-nexus'
        ? 'Проведи опрос коллегии каскадных рисков по эффекту домино и точкам ветвления'
        : command === '/survey-mena'
        ? 'Проведи опрос консилиума Ближнего Востока и зоны Залива'
        : 'Проведи опрос кураторов по повестке дня';

    return {
      resolvedTarget: 'survey-coordinator',
      cleanPrompt: args.join(' ').trim() || defaultPrompt,
    };
  },

  // 14. SideWork Producer
  (command, args) => {
    if (!['/sidework', '/sidework-post', '/media', '/comment', '/draft'].includes(command)) return null;
    return {
      resolvedTarget: 'sidework-producer',
      cleanPrompt: args.join(' ').trim() || 'Создай публикацию и подготовь медиа-обогащение на основе курированных данных',
    };
  },

  // 15. NotebookLM Producer
  (command, args) => {
    if (!['/notebook', '/notebook-create', '/notebook-eta'].includes(command)) return null;
    return {
      resolvedTarget: 'notebook-producer',
      cleanPrompt: args.join(' ').trim() || 'Фоновая генерация дневника и подкаста NotebookLM с расчетом времени готовности',
    };
  },

  // 16. Harvester Agent
  (command, args) => {
    if (!['/harvest', '/sources'].includes(command)) return null;
    return {
      resolvedTarget: 'harvester-agent',
      cleanPrompt: args.join(' ').trim() || 'Собери свежие данные и проверь входящие источники',
    };
  },
];

interface KeywordRule {
  target: AgentId;
  match: (text: string) => boolean;
}

const anyOf = (...keywords: string[]) => (text: string) =>
  keywords.some((kw) => text.includes(kw));

const KEYWORD_RULES: KeywordRule[] = [
  {
    target: 'political-group',
    match: (text) =>
      anyOf(
        'политическая группа',
        'политическая коллегия',
        'коллегия кураторов',
        'коллеги',
        'новости на сегодня',
        'сводка на сегодня',
        'панорама дня',
        'сводка дня',
      )(text) || (text.includes('групп') && anyOf('новост', 'повестк', 'резюме')(text)),
  },
  {
    target: 'tech-group',
    match: anyOf(
      'it группа',
      'it коллегия',
      'it совет',
      'технологическая группа',
      'технологический совет',
      'группа it',
      'совет it',
    ),
  },
  {
    target: 'simon-habr',
    match: anyOf('саймон', 'simon'),
  },
  {
    target: 'presijo-ai',
    match: anyOf(
      'presijo',
      'пресижо',
      'ai инструмент',
      'новые тулз',
      'релизы библиотек',
      'библиотеки ai',
      'контент мейкер',
      'контент-мейкер',
    ),
  },
  {
    target: 'okatsiya',
    match: anyOf(
      'окация',
      'акация',
      'okatsiya',
      'девайс',
      'девайсы',
      'гаджет',
      'новые девайсы',
      'громкие анонсы',
      'hi-tech',
      'hitech',
      'новости it',
      'новости ai',
      'новости ит',
      'devops',
      'девопс',
      'бигтех',
      'bigtech',
      'бэкенд',
      'backend',
      'нейросеть',
      'нейросети',
      'llm',
      'ии ',
      ' ai ',
      'инфосек',
      'кибербезопасн',
    ),
  },
  {
    target: 'simon-habr',
    match: anyOf('герман', 'german', 'хабр', 'habr', 'xakep', 'хакер'),
  },
  {
    target: 'notebook-producer',
    match: anyOf('notebooklm', 'создай дневник', 'сделай дневник'),
  },
  {
    target: 'chen-wei',
    match: anyOf('чэнь', 'китай', 'атр', 'брикс', 'юань'),
  },
  {
    target: 'alex-vector',
    match: anyOf(
      'алекс',
      'alex',
      'breaking',
      'горячие новости',
      'пульс',
      'молния',
      'политическая повестка',
      'свежие новости',
      'свежие политические новости',
    ),
  },
  {
    target: 'marcus-vane',
    match: anyOf('маркус', 'marcus', 'домино', 'ветвление', 'nexus', 'каскад'),
  },
  {
    target: 'tariq-said',
    match: anyOf(
      'тарик',
      'tariq',
      'ближний восток',
      'контур ближнего востока',
      'контуру ближнему востоку',
      'mena',
      'залив',
      'ирак',
      'левант',
    ),
  },
  {
    target: 'helena-brandt',
    match: anyOf('хелена', 'helena', 'нефть', 'сырье', 'пролив', 'ормуз', 'суэц', 'фрахт'),
  },
  {
    target: 'ivan-bely',
    match: anyOf('иван', 'контур рф', 'контуру рф', 'рф', 'госдум', 'бюджет'),
  },
  {
    target: 'kirk-kitten',
    match: anyOf('kirk', 'кирк', 'контур сша', 'контуру сша', 'сша', 'оон', 'ofac', 'санкци'),
  },
  {
    target: 'survey-coordinator',
    match: anyOf(
      'опроси',
      'опрос кураторов',
      'опросить группу',
      'опрос за вчера',
      'опрос за неделю',
      'срез за вчера',
      'срез за неделю',
    ),
  },
  {
    target: 'sidework-producer',
    match: anyOf(
      'сайд',
      'сайд-работа',
      'сайдработа',
      'создай пост',
      'подготовь пост',
      'промпт для картин',
      'промпты для ai',
      'добавь медиа',
    ),
  },
  {
    target: 'harvester-agent',
    match: anyOf('харвестер', 'сбор данных', 'собери новости', 'проверь источники'),
  },
];

/**
 * Resolves the target agent and cleans the user prompt based on slash commands and keywords.
 */
export function resolveCommandAndPrompt(
  rawMessage: string,
  initialTarget: AgentId | 'all' = 'all',
): CommandResolutionResult {
  const rawTrimmed = rawMessage.trim();

  // 1. Process slash commands
  if (rawTrimmed.startsWith('/')) {
    const parts = rawTrimmed.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    for (const handler of COMMAND_HANDLERS) {
      const match = handler(command, args);
      if (match) {
        return {
          resolvedTarget: match.resolvedTarget === 'all' && initialTarget !== 'all'
            ? initialTarget
            : match.resolvedTarget,
          cleanPrompt: match.cleanPrompt,
        };
      }
    }
  }

  // 2. Keyword detection if target is 'all'
  let resolvedTarget = initialTarget;
  if (resolvedTarget === 'all' && !rawTrimmed.startsWith('/')) {
    const lower = rawTrimmed.toLowerCase();
    const matchingRule = KEYWORD_RULES.find((rule) => rule.match(lower));
    if (matchingRule) {
      resolvedTarget = matchingRule.target;
    }
  }

  return {
    resolvedTarget,
    cleanPrompt: rawTrimmed,
  };
}
