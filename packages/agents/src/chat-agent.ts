import {
  AgentId,
  ChatMessage,
  DailyNewsCard,
} from './types';
import {
  isTelegramPostRequested,
  formatTelegramPostContent,
  resolveCommandAndPrompt,
  filterStoriesForCurator,
  filterEventsForDate,
} from './helpers';
import {
  generateIvanResponse,
  generateKirkResponse,
  generateChenResponse,
  generateOkatsiyaResponse,
  generateSimonResponse,
  generatePresijoResponse,
  generatePoliticalGroupSummary,
  generateTechGroupSummary,
  generateNotebookProducerResponse,
  generateGenericCuratorResponse,
  generateViaGemini,
  handleSurveyCoordinator,
  handleSideWorkProducer,
  handleHarvester,
} from './curators';

export { isTelegramPostRequested, formatTelegramPostContent };

export interface ProcessChatOptions {
  message: string;
  targetAgent?: AgentId | 'all';
  date: string;
  contextCards: DailyNewsCard[];
  politicalEvents: any[];
  history?: ChatMessage[];
  geminiApiKey?: string;
}

export class AgentChatEngine {
  /**
   * Main entrypoint to process a chat message and generate agent replies.
   */
  static async process(options: ProcessChatOptions): Promise<ChatMessage[]> {
    const { message, date, contextCards, politicalEvents, geminiApiKey } = options;
    const timestamp = new Date().toISOString();

    // 1. Declaratively resolve command alias, snippet and keywords
    const { resolvedTarget, cleanPrompt } = resolveCommandAndPrompt(
      message,
      options.targetAgent || 'all',
    );

    // 2. Filter context events and stories via functional predicates
    const todayEvents = filterEventsForDate(politicalEvents, date);

    const ivanStories = filterStoriesForCurator('ivan-bely', contextCards);
    const kirkStories = filterStoriesForCurator('kirk-kitten', contextCards);
    const tariqStories = filterStoriesForCurator('tariq-said', contextCards);
    const alexStories = filterStoriesForCurator('alex-vector', contextCards);
    const chenStories = filterStoriesForCurator('chen-wei', contextCards);
    const okatsiyaStories = filterStoriesForCurator('okatsiya', contextCards);
    const simonStories = filterStoriesForCurator('simon-habr', contextCards);
    const presijoStories = filterStoriesForCurator('presijo-ai', contextCards);
    const marcusStories = filterStoriesForCurator('marcus-vane', contextCards);
    const helenaStories = filterStoriesForCurator('helena-brandt', contextCards);

    // 3. Optional Gemini LLM Generation
    if (geminiApiKey) {
      try {
        const geminiReplies = await generateViaGemini({
          prompt: cleanPrompt,
          resolvedTarget,
          date,
          contextCards,
          politicalEvents: todayEvents,
          apiKey: geminiApiKey,
        });
        if (geminiReplies && geminiReplies.length > 0) {
          return geminiReplies;
        }
      } catch {
        // Fallback to deterministic engine
      }
    }

    // 4. Deterministic Worker Agents Dispatch
    if (resolvedTarget === 'survey-coordinator') {
      const surveyMsg = await handleSurveyCoordinator({
        prompt: cleanPrompt,
        date,
        contextCards,
        politicalEvents: todayEvents,
        geminiApiKey,
        timestamp,
      });
      return [surveyMsg];
    }

    if (resolvedTarget === 'sidework-producer') {
      const sideWorkMsg = await handleSideWorkProducer({
        prompt: cleanPrompt,
        date,
        contextCards,
        timestamp,
        geminiApiKey,
      });
      return [sideWorkMsg];
    }

    if (resolvedTarget === 'harvester-agent') {
      return [
        handleHarvester({
          prompt: cleanPrompt,
          contextCards,
          timestamp,
        }),
      ];
    }

    // 5. Consolidated Modular Groups Dispatch
    if (resolvedTarget === 'political-group') {
      return [
        generatePoliticalGroupSummary({
          prompt: cleanPrompt,
          date,
          ivanStories: ivanStories.length > 0 ? ivanStories : contextCards.slice(0, 2),
          kirkStories: kirkStories.length > 0 ? kirkStories : contextCards.slice(1, 3),
          tariqStories: tariqStories.length > 0 ? tariqStories : contextCards.slice(2, 4),
          alexStories: alexStories.length > 0 ? alexStories : contextCards.slice(0, 2),
          events: todayEvents,
          timestamp,
        }),
      ];
    }

    if (resolvedTarget === 'tech-group') {
      return [
        generateTechGroupSummary({
          prompt: cleanPrompt,
          date,
          okatsiyaStories: okatsiyaStories.length > 0 ? okatsiyaStories : contextCards.slice(0, 2),
          simonStories: simonStories.length > 0 ? simonStories : contextCards.slice(1, 3),
          presijoStories: presijoStories.length > 0 ? presijoStories : contextCards.slice(2, 4),
          events: todayEvents,
          timestamp,
        }),
      ];
    }

    if (resolvedTarget === 'notebook-producer') {
      return [
        generateNotebookProducerResponse({
          prompt: cleanPrompt,
          date,
          stories: contextCards.slice(0, 3),
          timestamp,
        }),
      ];
    }

    // 6. Individual Curators Dispatch
    const replies: ChatMessage[] = [];

    if (resolvedTarget === 'okatsiya' || resolvedTarget === 'all') {
      replies.push(
        generateOkatsiyaResponse({
          prompt: cleanPrompt,
          date,
          stories: okatsiyaStories.length > 0 ? okatsiyaStories : contextCards.filter((c) => c.category.includes('IT')),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'ivan-bely' || resolvedTarget === 'all') {
      replies.push(
        generateIvanResponse({
          prompt: cleanPrompt,
          date,
          stories: ivanStories.length > 0 ? ivanStories : contextCards.slice(0, 2),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'kirk-kitten' || resolvedTarget === 'all') {
      replies.push(
        generateKirkResponse({
          prompt: cleanPrompt,
          date,
          stories: kirkStories.length > 0 ? kirkStories : contextCards.slice(1, 3),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'chen-wei' || resolvedTarget === 'all') {
      replies.push(
        generateChenResponse({
          prompt: cleanPrompt,
          date,
          stories: chenStories.length > 0 ? chenStories : contextCards.slice(2, 4),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'alex-vector' || resolvedTarget === 'all') {
      replies.push(
        generateGenericCuratorResponse('alex-vector', {
          prompt: cleanPrompt,
          date,
          stories: alexStories.length > 0 ? alexStories : contextCards.slice(0, 2),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'marcus-vane' || resolvedTarget === 'all') {
      replies.push(
        generateGenericCuratorResponse('marcus-vane', {
          prompt: cleanPrompt,
          date,
          stories: marcusStories.length > 0 ? marcusStories : contextCards.slice(0, 2),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'tariq-said' || resolvedTarget === 'all') {
      replies.push(
        generateGenericCuratorResponse('tariq-said', {
          prompt: cleanPrompt,
          date,
          stories: tariqStories.length > 0 ? tariqStories : contextCards.slice(0, 2),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'helena-brandt' || resolvedTarget === 'all') {
      replies.push(
        generateGenericCuratorResponse('helena-brandt', {
          prompt: cleanPrompt,
          date,
          stories: helenaStories.length > 0 ? helenaStories : contextCards.slice(0, 2),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (
      resolvedTarget === 'simon-habr' ||
      resolvedTarget === 'german-kernel' ||
      (resolvedTarget === 'all' && simonStories.length > 0)
    ) {
      replies.push(
        generateSimonResponse({
          prompt: cleanPrompt,
          date,
          stories: simonStories.length > 0 ? simonStories : contextCards.slice(0, 3),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    if (resolvedTarget === 'presijo-ai' || (resolvedTarget === 'all' && presijoStories.length > 0)) {
      replies.push(
        generatePresijoResponse({
          prompt: cleanPrompt,
          date,
          stories: presijoStories.length > 0 ? presijoStories : contextCards.slice(0, 3),
          events: todayEvents,
          timestamp,
        }),
      );
    }

    return replies;
  }
}
