import { SurveyTimeframe } from '@lenta/shared';
import { ChatMessage, DailyNewsCard } from '../types';
import { CuratorSurveyAgent } from '../curator-survey-agent';
import { SideWorkAgent } from '../side-work-agent';
import { NewsHarvesterAgent } from '../harvester-agent';

export async function handleSurveyCoordinator(ctx: {
  prompt: string;
  date: string;
  contextCards: DailyNewsCard[];
  politicalEvents: any[];
  geminiApiKey?: string;
  timestamp: string;
}): Promise<ChatMessage> {
  const lower = ctx.prompt.toLowerCase();

  // Determine timeframe
  let timeframe: SurveyTimeframe = 'today';
  if (lower.includes('вчера') || lower.includes('yesterday')) {
    timeframe = 'yesterday';
  } else if (lower.includes('недел') || lower.includes('week') || lower.includes('7 дн')) {
    timeframe = 'week';
  } else if (lower.includes('3 дн') || lower.includes('три дня')) {
    timeframe = 'three_days';
  }

  // Determine target curators/group
  let targetCurators: string[] | 'all' = 'all';
  let groupId: string | undefined;

  if (lower.includes('политик') || lower.includes('politics')) {
    groupId = 'political-group';
  } else if (lower.includes('it') || lower.includes('ai') || lower.includes('технолог') || lower.includes('окаци')) {
    groupId = 'tech-group';
  } else if (lower.includes('макро') || lower.includes('рынк')) {
    groupId = 'macro-group';
  } else if (lower.includes('пульс') || lower.includes('breaking') || lower.includes('hot') || lower.includes('быстрого реагирования')) {
    groupId = 'hot-pulse-group';
  } else if (lower.includes('домино') || lower.includes('nexus') || lower.includes('ветвлен') || lower.includes('каскад') || lower.includes('эффект домино')) {
    groupId = 'domino-nexus-group';
  } else if (lower.includes('восток') || lower.includes('mena') || lower.includes('залив') || lower.includes('ирак') || lower.includes('левант')) {
    groupId = 'mena-security-group';
  }

  const surveyResult = await CuratorSurveyAgent.survey({
    request: {
      timeframe,
      groupId,
      targetCurators: groupId ? undefined : targetCurators,
    },
    referenceDate: ctx.date,
    contextCards: ctx.contextCards,
    politicalEvents: ctx.politicalEvents,
    geminiApiKey: ctx.geminiApiKey,
  });

  const markdown = CuratorSurveyAgent.formatToMarkdown(surveyResult);

  return {
    id: `msg-survey-${Date.now()}`,
    sender: 'survey-coordinator',
    senderName: 'Координатор Опросов',
    senderRole: 'Агент-опросчик и диспетчер групп кураторов',
    avatar: '🧭',
    text: markdown,
    timestamp: ctx.timestamp,
    curatorSurvey: surveyResult,
  };
}

export async function handleSideWorkProducer(ctx: {
  prompt: string;
  date: string;
  contextCards: DailyNewsCard[];
  timestamp: string;
  geminiApiKey?: string;
}): Promise<ChatMessage> {
  const lower = ctx.prompt.toLowerCase();

  let taskType: 'content_draft' | 'media_enrichment' | 'expert_commentary' = 'content_draft';
  if (
    lower.includes('медиа') ||
    lower.includes('промпт') ||
    lower.includes('схем') ||
    lower.includes('диаграмм') ||
    lower.includes('картинк')
  ) {
    taskType = 'media_enrichment';
  } else if (lower.includes('коммент')) {
    taskType = 'expert_commentary';
  }

  let targetFormat: 'telegram_post' | 'obsidian_note' | 'longread' = 'telegram_post';
  if (lower.includes('obsidian') || lower.includes('note') || lower.includes('заметк') || lower.includes('done')) {
    targetFormat = 'obsidian_note';
  } else if (lower.includes('лонгрид') || lower.includes('стать')) {
    targetFormat = 'longread';
  }

  const sourceContext =
    ctx.contextCards.slice(0, 5).map((c) => `[${c.suggestedCurator}] ${c.title}`).join('\n') || ctx.prompt;

  const sideWorkResult = await SideWorkAgent.execute({
    request: {
      taskType,
      targetFormat,
      sourceContext,
      mediaPreferences: {
        includeImagePrompts: true,
        includeMermaidDiagrams: true,
      },
    },
    date: ctx.date,
    geminiApiKey: ctx.geminiApiKey,
  });

  const markdown = SideWorkAgent.formatToMarkdown(sideWorkResult);

  return {
    id: `msg-sidework-${Date.now()}`,
    sender: 'sidework-producer',
    senderName: 'Продюсер Сайд-Работы',
    senderRole: 'Агент контент-продакшна и медиа-обогащения',
    avatar: '🎨',
    text: markdown,
    timestamp: ctx.timestamp,
    sideWorkResult,
  };
}

export function handleHarvester(ctx: {
  prompt: string;
  contextCards: DailyNewsCard[];
  timestamp: string;
}): ChatMessage {
  const rawItems = ctx.contextCards.map((c) => ({
    id: c.id,
    date: c.date,
    title: c.title,
    source: c.source,
    url: c.url,
    rawText: c.summary,
  }));

  const harvestResult = NewsHarvesterAgent.harvest(rawItems);
  const markdown = NewsHarvesterAgent.formatToMarkdown(harvestResult);

  return {
    id: `msg-harvest-${Date.now()}`,
    sender: 'harvester-agent',
    senderName: 'Информационный Харвестер',
    senderRole: 'Агент сбора данных и мониторинга первоисточников',
    avatar: '📡',
    text: markdown,
    timestamp: ctx.timestamp,
  };
}
