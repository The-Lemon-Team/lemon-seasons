import {
  CURATOR_PERSONAS,
  CURATOR_GROUPS,
  getCuratorPersona,
  getCuratorGroup,
  CuratorSurveyRequest,
  CuratorSurveyResult,
  CuratorTake,
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

    // 5. Build Headline & Executive Summary
    const timeframeLabel = this.getTimeframeLabel(request.timeframe, dateRange);
    const curatorNames = curatorTakes.map((t) => t.curatorName).join(', ');
    const headline = `Комплексный опрос кураторов [${curatorNames}] • ${timeframeLabel}`;
    
    const totalNews = timeFilteredCards.length;
    const executiveSummary =
      `Проведен скоординированный опрос ${curatorTakes.length} предметных кураторов за период **${timeframeLabel}** (с ${dateRange.from} по ${dateRange.to}). ` +
      `Собрано ${totalNews} событийных маркеров. Кураторы зафиксировали ключевые факты и первичные сигналы в своих предметных областях.`;

    const result: CuratorSurveyResult = {
      id: `survey-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timeframe: request.timeframe,
      dateRange,
      requestedCurators: curatorIds,
      headline,
      executiveSummary,
      curatorTakes,
      generatedAt: new Date().toISOString(),
    };

    return result;
  }

  /**
   * Helper to format the survey result into a readable rich Markdown text
   */
  static formatToMarkdown(survey: CuratorSurveyResult): string {
    const { headline, executiveSummary, curatorTakes, dateRange } = survey;

    let md = `## 🧭 ${headline}\n\n`;
    md += `> **Интервал опроса:** \`${dateRange.from}\` ⟷ \`${dateRange.to}\`  \n`;
    md += `> **Статус:** Сводка позиций кураторов собрана. Готово к пользовательской аналитике и сайд-работе.\n\n`;
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
      if (take.focusPoints && take.focusPoints.length > 0) {
        md += `- **Фокусные маркеры:** ${take.focusPoints.join('; ')}\n`;
      }
      if (take.sourceCitations.length > 0) {
        md += `- *Источники:* ${take.sourceCitations.slice(0, 4).join(', ')}\n`;
      }
      md += `\n`;
    }

    md += `---\n`;
    md += `*Сайд-воркер готов упаковать фактуру в черновик (\`/sidework-post\`), инфографику/промпты (\`/media\`) или аудио-подкаст (\`/podcast\`).*`;

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
      return (
        CURATOR_GROUPS['all-curators']?.curatorIds || [
          'ivan-bely',
          'kirk-kitten',
          'tariq-said',
          'alex-vector',
          'okatsiya',
          'simon-habr',
          'presijo-ai',
          'chen-wei',
          'marcus-vane',
          'helena-brandt',
        ]
      );
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
        return (
          text.includes('девайс') ||
          text.includes('гаджет') ||
          text.includes('чип') ||
          text.includes('анонс') ||
          text.includes('hi-tech') ||
          text.includes('hitech') ||
          text.includes('it') ||
          text.includes('ai') ||
          text.includes('apple') ||
          text.includes('nvidia') ||
          text.includes('смартфон') ||
          text.includes('желез')
        );
      }
      if (curatorId === 'simon-habr' || curatorId === 'german-kernel') {
        return (
          text.includes('хабр') ||
          text.includes('habr') ||
          text.includes('xakep') ||
          text.includes('хакер') ||
          text.includes('плата') ||
          text.includes('платы') ||
          text.includes('олдскул') ||
          text.includes('схемотехник') ||
          text.includes('стать') ||
          text.includes('geektimes')
        );
      }
      if (curatorId === 'presijo-ai') {
        return (
          text.includes('инструмент') ||
          text.includes('библиотек') ||
          text.includes('фич') ||
          text.includes('релиз') ||
          text.includes('контент') ||
          text.includes('telegram') ||
          text.includes('тг-канал') ||
          text.includes('тг') ||
          text.includes('тулз') ||
          text.includes('github') ||
          text.includes('hugging face')
        );
      }
      if (curatorId === 'alex-vector') {
        return (
          c.isBreaking ||
          text.includes('срочно') ||
          text.includes('breaking') ||
          text.includes('молния') ||
          text.includes('политик') ||
          text.includes('повестк') ||
          text.includes('саммит') ||
          text.includes('экстрен') ||
          text.includes('удар') ||
          text.includes('катастроф')
        );
      }
      if (curatorId === 'marcus-vane') {
        return (
          (c.branchingPotentialScore !== undefined && c.branchingPotentialScore >= 65) ||
          text.includes('вывод войск') ||
          text.includes('вакуум') ||
          text.includes('альянс') ||
          text.includes('пакт') ||
          text.includes('триггер') ||
          text.includes('бифуркац') ||
          text.includes('смена власти') ||
          text.includes('договор')
        );
      }
      if (curatorId === 'tariq-said') {
        return (
          text.includes('ирак') ||
          text.includes('иран') ||
          text.includes('сири') ||
          text.includes('залив') ||
          text.includes('израил') ||
          text.includes('палестин') ||
          text.includes('хусит') ||
          text.includes('йемен') ||
          text.includes('ливан') ||
          text.includes('багдад') ||
          text.includes('тегеран') ||
          text.includes('эр-рияд') ||
          text.includes('опек') ||
          text.includes('mena')
        );
      }
      if (curatorId === 'helena-brandt') {
        return (
          text.includes('нефть') ||
          text.includes('brent') ||
          text.includes('wti') ||
          text.includes('газ') ||
          text.includes('спг') ||
          text.includes('пролив') ||
          text.includes('ормуз') ||
          text.includes('суэц') ||
          text.includes('баб-эль-мандеб') ||
          text.includes('фрахт') ||
          text.includes('танкер') ||
          text.includes('сырь') ||
          text.includes('металл')
        );
      }
      return false;
    });

    const itemsCount = Math.max(relevantCards.length, 1);
    const sourceCitations = Array.from(new Set(relevantCards.map((c) => c.source).filter(Boolean)));

    // Generate specific theses based on curator domain
    const keyTheses: string[] = [];
    const focusPoints: string[] = [];

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
      focusPoints.push('Ценовые дисбалансы при поставках топлива на Дальний Восток', 'Контроль маржинальности розничных сетей ФАС РФ');
      if (sourceCitations.length === 0) sourceCitations.push('ФАС России', 'Банк России', 'СПбМТСБ');
    } else if (curatorId === 'kirk-kitten') {
      if (keyTheses.length === 0) {
        keyTheses.push('Мониторинг директив OFAC и 16-го пакета санкций ЕС: усиление вторичного комплаенса для морских перевозчиков.');
        keyTheses.push('Динамика фрахтовых ставок в Средиземноморском и Балтийском бассейнах (Baltic Dirty Tanker Index).');
      }
      focusPoints.push('Ограничение страхового покрытия судов P&I клубами', 'Риторика ФРС США по процентной ставке и сырьевой спрос');
      if (sourceCitations.length === 0) sourceCitations.push('OFAC Sanctions Tracker', 'Lloyds List Intelligence', 'Reuters Markets');
    } else if (curatorId === 'chen-wei') {
      if (keyTheses.length === 0) {
        keyTheses.push('Рост объемов клиринга в юанях и альтернативных валютах стран БРИКС+ на трансграничных хабах.');
        keyTheses.push('Загрузка восточного полигона РЖД и расширение пропускной способности морских портов Приморья.');
      }
      focusPoints.push('Задержки вторичных платежей через региональные китайские банки', 'Таможенные пошлины и сырьевой баланс Китая');
      if (sourceCitations.length === 0) sourceCitations.push('Xinhua Economic News', 'Caixin Global', 'BRICS Info Desk');
    } else if (curatorId === 'okatsiya') {
      if (keyTheses.length === 0) {
        keyTheses.push('Мониторинг Hi-Tech и анонсов: презентации новых потребительских девайсов, мобильных платформ, процессоров и VR/AR.');
        keyTheses.push('Громкие анонсы BigTech: стратегические релизы продуктов, архитектурные сдвиги и инфраструктурные платформы.');
      }
      focusPoints.push('Новые девайсы, чипы и флагманские анонсы (Apple, Nvidia, Google, Qualcomm)', 'Стратегические релизы гигантов IT-индустрии');
      if (sourceCitations.length === 0) sourceCitations.push('The Verge', 'TechCrunch', 'Ars Technica', 'Semiconductor Digest');
    } else if (curatorId === 'simon-habr' || curatorId === 'german-kernel') {
      if (keyTheses.length === 0) {
        keyTheses.push('Разбор инженерных статей с Хабра: архитектурные нюансы, опыт рефакторинга и практические уроки разработчиков.');
        keyTheses.push('Олдскул и схемотехника: ретро-компьютинг, аппаратный реверс-инжиниринг и обсуждения в сообществе авторов Habr.');
      }
      focusPoints.push('Прикладной опыт разработки и подводные камни технологий в публикациях Habr', 'Схемотехника, разбор плат и ретро-системы');
      if (sourceCitations.length === 0) sourceCitations.push('Habr Engineering', 'Habr Статьи', 'Retro-Computing Hub');
    } else if (curatorId === 'presijo-ai') {
      if (keyTheses.length === 0) {
        keyTheses.push('Анализ свежих AI-инструментов, утилит и релизов open-source библиотек недели.');
        keyTheses.push('Мониторинг Telegram-каналов: упаковка трендов, новые фичи ИИ-продуктов и готовые промпт-структуры.');
      }
      focusPoints.push('Новые инструменты и сервисы на рынке нейросетей', 'Упаковка инфоповодов и трендов для Telegram и соцсетей');
      if (sourceCitations.length === 0) sourceCitations.push('AI Tools Radar', 'GitHub Trending', 'Hugging Face Hub', 'TG AI Channels', 'ProductHunt AI');
    } else if (curatorId === 'alex-vector') {
      if (keyTheses.length === 0) {
        keyTheses.push('Свежие политические новости и экстренная мировая повестка: фильтрация молний Reuters, Bloomberg, AP и X.');
        keyTheses.push('Детекция виральных всплесков: выявление политических инфоповодов с взрывным ростом цитируемости.');
      }
      focusPoints.push('Оперативная политическая повестка дня и срочные инфоповоды', 'Конфликт интерпретаций мировых медиа в первые минуты инцидента');
      if (sourceCitations.length === 0) sourceCitations.push('Reuters Flash', 'AP World Desk', 'Bloomberg Terminal Alerts', 'X / Real-Time Pulse');
    } else if (curatorId === 'marcus-vane') {
      if (keyTheses.length === 0) {
        keyTheses.push('[Standby] Куратор в режиме ожидания до активации модуля автоматической аналитики.');
      }
      focusPoints.push('События-триггеры слома статус-кво');
      if (sourceCitations.length === 0) sourceCitations.push('Foreign Affairs', 'RAND Policy Briefs');
    } else if (curatorId === 'tariq-said') {
      if (keyTheses.length === 0) {
        keyTheses.push('Оценка баланса сил в треугольнике Тегеран — Эр-Рияд — Анкара при трансформации внешнего военного присутствия.');
        keyTheses.push('Мониторинг безопасности шиитского пояса, курдского фактора в Эрбиле и экспортных нефтяных провинций Басры.');
      }
      focusPoints.push('Риск активизации спящих ячеек и трансграничных ударов прокси-формирований', 'Уязвимость инфраструктуры монархий Залива');
      if (sourceCitations.length === 0) sourceCitations.push('Al Jazeera Desk', 'Al-Monitor', 'Asharq Al-Awsat', 'Middle East Eye', 'Iraqi News Agency');
    } else if (curatorId === 'helena-brandt') {
      if (keyTheses.length === 0) {
        keyTheses.push('Котировки Brent и спреды тяжелых сортов нефти при угрозе изменения маршрутов морской транспортировки.');
        keyTheses.push('Анализ ставок военного фрахта (Lloyd\'s War Risk Premiums) и проходимости узких мест (Ормуз, Суэц, Баб-эль-Мандеб).');
      }
      focusPoints.push('Удорожание страхования танкеров в Персидском заливе и Красном море', 'Каскадный рост себестоимости поставок сырья на азиатские и европейские НПЗ');
      if (sourceCitations.length === 0) sourceCitations.push('S&P Global Commodity Insights (Platts)', 'Argus Media', 'Lloyd\'s List Intelligence', 'Vortexa Tanker Tracking');
    }

    return {
      curatorId,
      curatorName,
      emoji,
      domain,
      itemsCount,
      keyTheses,
      focusPoints,
      sourceCitations,
    };
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
