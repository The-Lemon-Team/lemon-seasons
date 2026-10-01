import { DailyNewsCard } from './types';
import { NewsTriageAgent } from './triage-agent';

export interface HarvestSource {
  id: string;
  name: string;
  url?: string;
  category: string;
  curatorTarget?: string;
}

export interface HarvestRawItem {
  id?: string;
  date: string;
  title: string;
  source: string;
  url?: string;
  rawText?: string;
}

export interface HarvestResult {
  collectedCount: number;
  triagedCards: DailyNewsCard[];
  sourcesCovered: string[];
  harvestedAt: string;
}

export class NewsHarvesterAgent {
  /**
   * Harvests and normalizes raw items from external feeds or mock streams,
   * triaging them with NewsTriageAgent to prepare them for domain curators.
   */
  static harvest(items: HarvestRawItem[]): HarvestResult {
    const triagedCards: DailyNewsCard[] = [];
    const sources = new Set<string>();

    for (const raw of items) {
      if (!raw.title) continue;
      sources.add(raw.source);
      const card = NewsTriageAgent.triage(raw);
      triagedCards.push(card);
    }

    return {
      collectedCount: triagedCards.length,
      triagedCards,
      sourcesCovered: Array.from(sources),
      harvestedAt: new Date().toISOString(),
    };
  }

  /**
   * Helper to format harvest report for chat display
   */
  static formatToMarkdown(result: HarvestResult): string {
    let md = `## 📡 Информационный Харвестер: Сводка сбора данных\n\n`;
    md += `> **Собрано материалов:** ${result.collectedCount} | **Источников:** ${result.sourcesCovered.length}\n\n`;
    md += `### Охваченные источники:\n`;
    for (const src of result.sourcesCovered) {
      md += `- 🌐 ${src}\n`;
    }
    md += `\n### Первично размеченные материалы на триаж:\n`;
    for (const card of result.triagedCards.slice(0, 5)) {
      md += `- **[${card.suggestedCurator}]** ${card.title} *(Резонанс: ${card.resonanceScore}%)*\n`;
    }
    if (result.triagedCards.length > 5) {
      md += `*... и еще ${result.triagedCards.length - 5} материалов готовы к распределению.*\n`;
    }
    return md;
  }
}
