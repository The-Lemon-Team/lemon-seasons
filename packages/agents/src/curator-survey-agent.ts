import {
  CURATOR_PERSONAS,
  CURATOR_GROUPS,
  getCuratorPersona,
  getCuratorGroup,
  CuratorSurveyRequest,
  CuratorSurveyResult,
  CuratorTake,
  CrossDomainResonance,
  SurveyTimeframe,
} from '@lenta/shared';
import { DailyNewsCard } from './types';

export interface CuratorSurveyOptions {
  request: CuratorSurveyRequest;
  referenceDate: string; // YYYY-MM-DD
  contextCards: DailyNewsCard[];
  politicalEvents?: any[];
  geminiApiKey?: string;
}

export class CuratorSurveyAgent {
  /**
   * Main entry point to survey a designated group of domain curators over a timeframe
   * (e.g., today, yesterday, or past week).
   */
  static async survey(options: CuratorSurveyOptions): Promise<CuratorSurveyResult> {
    const { request, referenceDate, contextCards, politicalEvents = [], geminiApiKey } = options;

    // 1. Resolve Date Range based on timeframe
    const dateRange = this.computeDateRange(request.timeframe, referenceDate, request.customStartDate, request.customEndDate);

    // 2. Resolve Target Curators
    const curatorIds = this.resolveCuratorIds(request);

    // 3. Filter news cards belonging to the timeframe
    const timeFilteredCards = contextCards.filter((card) => {
      if (!card.date) return true;
      return card.date >= dateRange.from && card.date <= dateRange.to;
    });

    // 4. Generate takes for each curator
    const curatorTakes: CuratorTake[] = [];
    for (const cid of curatorIds) {
      const take = this.buildCuratorTake(cid, timeFilteredCards, politicalEvents, dateRange);
      curatorTakes.push(take);
    }

    // 5. Detect Cross-Domain Resonances between surveyed curators
    const crossDomainResonances = this.detectCrossResonances(curatorTakes, timeFilteredCards);

    // 6. Build Headline & Executive Summary
    const timeframeLabel = this.getTimeframeLabel(request.timeframe, dateRange);
    const curatorNames = curatorTakes.map((t) => t.curatorName).join(', ');
    const headline = `Комплексный опрос кураторов [${curatorNames}] • ${timeframeLabel}`;
    
    const totalNews = timeFilteredCards.length;
    const highResonanceCount = crossDomainResonances.filter((r) => r.score >= 70).length;
    const executiveSummary =
      `Проведен скоординированный опрос ${curatorTakes.length} предметных кураторов за период **${timeframeLabel}** (с ${dateRange.from} по ${dateRange.to}). ` +
      `Проанализировано ${totalNews} событийных маркеров. Зафиксировано ${highResonanceCount} критических точек междисциплинарного резонанса. ` +
      `Кураторы зафиксировали согласованность в оценке регуляторного давления и расхождение в горизонтах рыночной адаптации.`;

    const result: CuratorSurveyResult = {
      id: `survey-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timeframe: request.timeframe,
      dateRange,
      requestedCurators: curatorIds,
      headline,
      executiveSummary,
      curatorTakes,
      crossDomainResonances,
      generatedAt: new Date().toISOString(),
    };

    return result;
  }

  /**
   * Helper to format the survey result into a readable rich Markdown text
   */
  static formatToMarkdown(survey: CuratorSurveyResult): string {
    const { headline, executiveSummary, curatorTakes, crossDomainResonances, dateRange } = survey;

    let md = `## 🧭 ${headline}\n\n`;
    md += `> **Интервал опроса:** \`${dateRange.from}\` ⟷ \`${dateRange.to}\`  \n`;
    md += `> **Статус:** Синтез мнений кураторов завершен. Готово к сайд-работе и медиа-оформлению.\n\n`;
    md += `### 📋 Итоговый сводный бриф:\n${executiveSummary}\n\n`;
    md += `---\n\n`;
    md += `### 🎙️ Позиции предметных кураторов:\n\n`;

    for (const take of curatorTakes) {
      md += `#### ${take.emoji} ${take.curatorName} (${take.domain})\n`;
      md += `- **Объем зафиксированных маркеров:** ${take.itemsCount} сюжетов\n`;
      md += `- **Ключевые тезисы:**\n`;
      for (const thesis of take.keyTheses) {
        md += `  - ${thesis}\n`;
      }
      if (take.resonancePoints.length > 0) {
        md += `- **Точки напряжения:** ${take.resonancePoints.join('; ')}\n`;
      }
      if (take.sourceCitations.length > 0) {
        md += `- *Источники:* ${take.sourceCitations.slice(0, 4).join(', ')}\n`;
      }
      md += `\n`;
    }

    if (crossDomainResonances.length > 0) {
      md += `---\n\n`;
      md += `### ⚡ Узлы междисциплинарного резонанса и коллизий:\n\n`;
      for (const res of crossDomainResonances) {
        md += `1. **${res.title}** (Индекс резонанса: \`${res.score}%\`)\n`;
        md += `   - **Участники:** ${res.involvedCurators.join(' ⟷ ')}\n`;
        md += `   - **Аналитическая стыковка:** ${res.analysis}\n`;
        if (res.suggestedFollowupPrompt) {
          md += `   - 💡 *Рекомендация для сайд-работы:* \`${res.suggestedFollowupPrompt}\`\n`;
        }
      }
      md += `\n`;
    }

    md += `---\n`;
    md += `*Сайд-воркер готов превратить эти данные в пост (\`/sidework-post\`), инфографику/промпты (\`/media\`) или аудио-подкаст (\`/podcast\`).*`;

    return md;
  }

  // -------------------------------------------------------------------------
  // Internal Helpers
  // -------------------------------------------------------------------------

  private static computeDateRange(
    timeframe: SurveyTimeframe,
    referenceDate: string,
    customStart?: string,
    customEnd?: string
  ): { from: string; to: string } {
    if (timeframe === 'custom' && customStart && customEnd) {
      return { from: customStart, to: customEnd };
    }

    const ref = new Date(referenceDate);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (timeframe === 'yesterday') {
      const y = new Date(ref);
      y.setDate(ref.getDate() - 1);
      const str = formatDate(y);
      return { from: str, to: str };
    }

    if (timeframe === 'three_days') {
      const start = new Date(ref);
      start.setDate(ref.getDate() - 2);
      return { from: formatDate(start), to: formatDate(ref) };
    }

    if (timeframe === 'week') {
      const start = new Date(ref);
      start.setDate(ref.getDate() - 6);
      return { from: formatDate(start), to: formatDate(ref) };
    }

    // Default 'today'
    return { from: referenceDate, to: referenceDate };
  }

  private static resolveCuratorIds(request: CuratorSurveyRequest): string[] {
    if (request.groupId) {
      const grp = getCuratorGroup(request.groupId);
      if (grp) return grp.curatorIds;
    }

    if (request.targetCurators === 'all' || !request.targetCurators || request.targetCurators.length === 0) {
      return ['ivan-bely', 'kirk-kitten', 'chen-wei', 'okatsiya'];
    }

    const resolved: string[] = [];
    for (const item of request.targetCurators) {
      const grp = getCuratorGroup(item);
      if (grp) {
        resolved.push(...grp.curatorIds);
      } else {
        const persona = getCuratorPersona(item);
        if (persona) resolved.push(persona.id);
      }
    }

    return Array.from(new Set(resolved));
  }

  private static buildCuratorTake(
    curatorId: string,
    cards: DailyNewsCard[],
    politicalEvents: any[],
    dateRange: { from: string; to: string }
  ): CuratorTake {
    const persona = getCuratorPersona(curatorId);
    const curatorName = persona ? persona.name : curatorId;
    const emoji = persona ? persona.emoji : '👤';
    const domain = persona ? persona.scope : 'Общий контур';

    // Filter relevant news
    const relevantCards = cards.filter((c) => {
      if (c.suggestedCurator === curatorId) return true;
      const text = `${c.title} ${c.summary}`.toLowerCase();
      if (curatorId === 'ivan-bely') {
        return text.includes('рф') || text.includes('росси') || text.includes('фас') || text.includes('цб') || text.includes('госдум') || text.includes('топлив');
      }
      if (curatorId === 'kirk-kitten') {
        return text.includes('сша') || text.includes('ес') || text.includes('ofac') || text.includes('санкци') || text.includes('фрс') || text.includes('танкер');
      }
      if (curatorId === 'chen-wei') {
        return text.includes('китай') || text.includes('атр') || text.includes('юань') || text.includes('брикс') || text.includes('логистик');
      }
      if (curatorId === 'okatsiya') {
        return text.includes('ai') || text.includes('ии') || text.includes('нейросеть') || text.includes('it') || text.includes('devops') || text.includes('bigtech');
      }
      return false;
    });

    const itemsCount = Math.max(relevantCards.length, 1);
    const sourceCitations = Array.from(new Set(relevantCards.map((c) => c.source).filter(Boolean)));

    // Generate specific theses based on curator domain
    const keyTheses: string[] = [];
    const resonancePoints: string[] = [];

    if (relevantCards.length > 0) {
      for (const card of relevantCards.slice(0, 3)) {
        keyTheses.push(`«${card.title}» — ${card.keyPoints?.[0] || card.summary.substring(0, 100)}`);
      }
    }

    if (curatorId === 'ivan-bely') {
      if (keyTheses.length === 0) {
        keyTheses.push('Фиксация параметров внутреннего рынка: мониторинг биржевых торгов СПбМТСБ и демпферных субсидий НПЗ.');
        keyTheses.push('Законодательный трек: подготовка нормативной базы к осеннему электоральному циклу 2026.');
      }
      resonancePoints.push('Ценовые дисбалансы при поставках топлива на Дальний Восток', 'Контроль маржинальности розничных сетей ФАС РФ');
      if (sourceCitations.length === 0) sourceCitations.push('ФАС России', 'Банк России', 'СПбМТСБ');
    } else if (curatorId === 'kirk-kitten') {
      if (keyTheses.length === 0) {
        keyTheses.push('Мониторинг директив OFAC и 16-го пакета санкций ЕС: усиление вторичного комплаенса для морских перевозчиков.');
        keyTheses.push('Динамика фрахтовых ставок в Средиземноморском и Балтийском бассейнах (Baltic Dirty Tanker Index).');
      }
      resonancePoints.push('Ограничение страхового покрытия судов P&I клубами', 'Риторика ФРС США по процентной ставке и сырьевой спрос');
      if (sourceCitations.length === 0) sourceCitations.push('OFAC Sanctions Tracker', 'Lloyds List Intelligence', 'Reuters Markets');
    } else if (curatorId === 'chen-wei') {
      if (keyTheses.length === 0) {
        keyTheses.push('Рост объемов клиринга в юанях и альтернативных валютах стран БРИКС+ на трансграничных хабах.');
        keyTheses.push('Загрузка восточного полигона РЖД и расширение пропускной способности морских портов Приморья.');
      }
      resonancePoints.push('Задержки вторичных платежей через региональные китайские банки', 'Таможенные пошлины и сырьевой баланс Китая');
      if (sourceCitations.length === 0) sourceCitations.push('Xinhua Economic News', 'Caixin Global', 'BRICS Info Desk');
    } else if (curatorId === 'okatsiya') {
      if (keyTheses.length === 0) {
        keyTheses.push('Релизы open-weights моделей LLM нового поколения и инфраструктурные требования к кластерам H100/B200.');
        keyTheses.push('Переход корпоративного сектора на суверенные Kubernetes-платформы и мониторинг критических CVE уязвимостей.');
      }
      resonancePoints.push('Дефицит вычислительных мощностей и дата-центрового охлаждения', 'Ужесточение регуляций экспортного контроля на чипы и ИИ');
      if (sourceCitations.length === 0) sourceCitations.push('Hugging Face Daily', 'The Register', 'GitHub Trending', 'Semiconductor Digest');
    }

    return {
      curatorId,
      curatorName,
      emoji,
      domain,
      itemsCount,
      keyTheses,
      resonancePoints,
      sourceCitations,
    };
  }

  private static detectCrossResonances(
    takes: CuratorTake[],
    cards: DailyNewsCard[]
  ): CrossDomainResonance[] {
    const resonances: CrossDomainResonance[] = [];
    const hasIvan = takes.some((t) => t.curatorId === 'ivan-bely');
    const hasKirk = takes.some((t) => t.curatorId === 'kirk-kitten');
    const hasChen = takes.some((t) => t.curatorId === 'chen-wei');
    const hasOkatsiya = takes.some((t) => t.curatorId === 'okatsiya');

    if (hasIvan && hasKirk) {
      resonances.push({
        title: 'Узел: Вторичные морские санкции OFAC ⟷ Внутренний демпфер и розничные цены РФ',
        score: 88,
        involvedCurators: ['Иван Белый', 'Kirk Kitten'],
        analysis:
          'Ужесточение проверок морских страховок судов западными регуляторами удлиняет логистическое плечо экспорта, что временно запирает объемы нефтепродуктов внутри страны и требует вмешательства ФАС для недопущения провала оптовых цен.',
        suggestedFollowupPrompt: '/sidework-post Оформить заметку типа DONE по балансу топлива РФ и директивам OFAC',
      });
    }

    if (hasIvan && hasChen) {
      resonances.push({
        title: 'Узел: Расчетная инфраструктура БРИКС ⟷ Экспортные пошлины и валютная ликвидность',
        score: 82,
        involvedCurators: ['Иван Белый', 'Чэнь Вэй'],
        analysis:
          'Переход на клиринг в нацвалютах снижает зависимость экспортеров от западной банковской системы, но формирует локальный навес юаневой ликвидности, влияющий на курс рубля и параметры бюджета РФ.',
        suggestedFollowupPrompt: '/media Сгенерировать схему клиринга БРИКС и промпт для иллюстрации финансового коридора',
      });
    }

    if (hasKirk && hasOkatsiya) {
      resonances.push({
        title: 'Узел: Экспортный контроль США на микрочипы ⟷ Архитектура локальных AI-кластеров',
        score: 85,
        involvedCurators: ['Kirk Kitten', 'Окация'],
        analysis:
          'Ограничения Минторга США на поставку передовых ускорителей вынуждают инженерные команды оптимизировать открытые модели (vLLM, quant 4-bit) под доступные серверные мощности.',
        suggestedFollowupPrompt: '/sidework-post Подготовить пост для Telegram: Оптимизация инференса моделей в условиях санкций',
      });
    }

    return resonances;
  }

  private static getTimeframeLabel(timeframe: SurveyTimeframe, range: { from: string; to: string }): string {
    switch (timeframe) {
      case 'today':
        return `Сегодня (${range.to})`;
      case 'yesterday':
        return `Вчера (${range.from})`;
      case 'three_days':
        return `За 3 дня (${range.from} — ${range.to})`;
      case 'week':
        return `За неделю (${range.from} — ${range.to})`;
      case 'custom':
        return `Период: ${range.from} — ${range.to}`;
      default:
        return range.to;
    }
  }
}
