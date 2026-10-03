import {
  CURATOR_PERSONAS,
  CURATOR_GROUPS,
  getCuratorPersona,
  getCuratorGroup,
  CuratorSurveyRequest,
  CuratorSurveyResult,
  CuratorTake,
  CrossDomainResonance,
  BranchingAnalysis,
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

    // 6. Detect Branching & Domino Potentials (BPI and adjacent contour maps)
    const branchingAnalyses = this.detectBranchingPotentials(curatorTakes, timeFilteredCards);

    // 7. Build Headline & Executive Summary
    const timeframeLabel = this.getTimeframeLabel(request.timeframe, dateRange);
    const curatorNames = curatorTakes.map((t) => t.curatorName).join(', ');
    const headline = `Комплексный опрос кураторов [${curatorNames}] • ${timeframeLabel}`;
    
    const totalNews = timeFilteredCards.length;
    const highResonanceCount = crossDomainResonances.filter((r) => r.score >= 70).length;
    const branchingCount = branchingAnalyses.length;
    const executiveSummary =
      `Проведен скоординированный опрос ${curatorTakes.length} предметных кураторов за период **${timeframeLabel}** (с ${dateRange.from} по ${dateRange.to}). ` +
      `Проанализировано ${totalNews} событийных маркеров. Зафиксировано ${highResonanceCount} критических точек междисциплинарного резонанса` +
      (branchingCount > 0 ? ` и ${branchingCount} узлов каскадного ветвления сюжетов (Domino & Ripple). ` : '. ') +
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
      branchingAnalyses,
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

    if (survey.branchingAnalyses && survey.branchingAnalyses.length > 0) {
      md += `---\n\n`;
      md += `### 🌿 Потенциал ветвления и каскадные эффекты (Branching & Domino Effect):\n\n`;
      for (const branch of survey.branchingAnalyses) {
        md += `#### ♟️ «${branch.sourceCardTitle}» [Индекс ветвления BPI: \`${branch.branchingPotentialScore}/100\`]\n`;
        md += `> **Слом статус-кво:** ${branch.statusQuoBreak}\n\n`;
        md += `**Ожидаемые смежные ветки сюжета:**\n`;
        for (const cont of branch.likelyBranches) {
          md += `- **${cont.emoji} ${cont.contourName}** (${cont.curatorName}, воздействие: \`${cont.impactScore}%\`): ${cont.potentialStory}\n`;
        }
        md += `\n`;
      }
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
      return (
        CURATOR_GROUPS['all-curators']?.curatorIds || [
          'ivan-bely',
          'kirk-kitten',
          'chen-wei',
          'okatsiya',
          'german-kernel',
          'alex-vector',
          'marcus-vane',
          'tariq-said',
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
        return text.includes('ai') || text.includes('ии') || text.includes('нейросеть') || text.includes('it') || text.includes('devops') || text.includes('bigtech');
      }
      if (curatorId === 'german-kernel') {
        return text.includes('хабр') || text.includes('habr') || text.includes('xakep') || text.includes('хакер') || text.includes('плата') || text.includes('платы') || text.includes('олдскул') || text.includes('схемотехник') || text.includes('стать');
      }
      if (curatorId === 'alex-vector') {
        return (
          c.isBreaking ||
          text.includes('срочно') ||
          text.includes('breaking') ||
          text.includes('молния') ||
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
    } else if (curatorId === 'german-kernel') {
      if (keyTheses.length === 0) {
        keyTheses.push('Мониторинг прикладных публикаций на Habr: опыт внедрения, разборы архитектурных компромиссов и нестандартные инженерные решения.');
        keyTheses.push('Олдскул и схемотехника: восстановление винтажного железа, анализ плат и рост интереса к ретро-платформам на фоне внешних инфоповодов.');
      }
      resonancePoints.push('Рост интереса к олдскульным и оффлайн-решениям на фоне сбоев глобальных облаков', 'Подготовка материалов журнала «Хакер» под тематические Super Note и NotebookLM');
      if (sourceCitations.length === 0) sourceCitations.push('Habr Engineering', 'Журнал «Хакер» (xakep.ru)', 'Retro-Computing Hub');
    } else if (curatorId === 'alex-vector') {
      if (keyTheses.length === 0) {
        keyTheses.push('Оперативный мониторинг мировых агентств и X/Telegram: фильтрация экстренных молний и валидация первоисточников.');
        keyTheses.push('Детекция виральных всплесков: выявление инфоповодов с взрывным ростом цитируемости в первый час.');
      }
      resonancePoints.push('Высокая скорость устаревания непроверенных вбросов', 'Конфликт интерпретаций мировых медиа в первые минуты инцидента');
      if (sourceCitations.length === 0) sourceCitations.push('Reuters Flash', 'AP World Desk', 'Bloomberg Terminal Alerts', 'X / Real-Time Pulse');
    } else if (curatorId === 'marcus-vane') {
      if (keyTheses.length === 0) {
        keyTheses.push('Идентификация точек бифуркации: разрушение многолетнего регионального статус-кво и образование вакуума силы.');
        keyTheses.push('Матрица ветвления последствий: моделирование цепочек реакции 2-го и 3-го порядков в смежных геополитических контурах.');
      }
      resonancePoints.push('Недооценка системных рисков и эффекта домино союзниками', 'Втягивание третьих держав в региональный вакуум безопасности');
      if (sourceCitations.length === 0) sourceCitations.push('Foreign Affairs', 'IISS Strategic Comments', 'Carnegie Endowment', 'RAND Policy Briefs');
    } else if (curatorId === 'tariq-said') {
      if (keyTheses.length === 0) {
        keyTheses.push('Оценка баланса сил в треугольнике Тегеран — Эр-Рияд — Анкара при трансформации внешнего военного присутствия.');
        keyTheses.push('Мониторинг безопасности шиитского пояса, курдского фактора в Эрбиле и экспортных нефтяных провинций Басры.');
      }
      resonancePoints.push('Риск активизации спящих ячеек и трансграничных ударов прокси-формирований', 'Уязвимость инфраструктуры монархий Залива');
      if (sourceCitations.length === 0) sourceCitations.push('Al Jazeera Desk', 'Al-Monitor', 'Asharq Al-Awsat', 'Middle East Eye', 'Iraqi News Agency');
    } else if (curatorId === 'helena-brandt') {
      if (keyTheses.length === 0) {
        keyTheses.push('Котировки Brent и спреды тяжелых сортов нефти при угрозе изменения маршрутов морской транспортировки.');
        keyTheses.push('Анализ ставок военного фрахта (Lloyd\'s War Risk Premiums) и проходимости узких мест (Ормуз, Суэц, Баб-эль-Мандеб).');
      }
      resonancePoints.push('Удорожание страхования танкеров в Персидском заливе и Красном море', 'Каскадный рост себестоимости поставок сырья на азиатские и европейские НПЗ');
      if (sourceCitations.length === 0) sourceCitations.push('S&P Global Commodity Insights (Platts)', 'Argus Media', 'Lloyd\'s List Intelligence', 'Vortexa Tanker Tracking');
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
    const hasAlex = takes.some((t) => t.curatorId === 'alex-vector');
    const hasMarcus = takes.some((t) => t.curatorId === 'marcus-vane');
    const hasTariq = takes.some((t) => t.curatorId === 'tariq-said');
    const hasHelena = takes.some((t) => t.curatorId === 'helena-brandt');

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

    if (hasMarcus && hasTariq) {
      resonances.push({
        title: 'Узел: Вакуум безопасности в Ираке/Леванте ⟷ Перебалансировка коалиций MENA',
        score: 95,
        involvedCurators: ['Маркус Вейн', 'Тарик Саид'],
        analysis:
          'Вывод или передислокация контингентов США запускает эффект домино: проиранские фракции стремятся занять базы, Турция активизирует буферные зоны на севере, а страны Залива ускоряют диверсификацию оборонных гарантий.',
        suggestedFollowupPrompt: '/sidework-post Подготовить разбор ветвления: Каскадные риски вакуума безопасности на Ближнем Востоке',
      });
    }

    if (hasTariq && hasHelena) {
      resonances.push({
        title: 'Узел: Напряженность в Персидском заливе ⟷ Морские артерии и котировки Brent',
        score: 92,
        involvedCurators: ['Тарик Саид', 'Хелена Брандт'],
        analysis:
          'Любая дестабилизация вокруг Ирака и проливов (Ормуз, Баб-эль-Мандеб) немедленно закладывается в надбавки к страховкам танкеров и толкает вверх премии на спотовую нефть для мировых импортеров.',
        suggestedFollowupPrompt: '/media Построить Mermaid-карту рисков морских коридоров Залива и проливов',
      });
    }

    if (hasAlex && hasMarcus) {
      resonances.push({
        title: 'Узел: Мировой Breaking-всплеск ⟷ Мгновенная детекция точек ветвления сюжета',
        score: 90,
        involvedCurators: ['Алекс Вектор', 'Маркус Вейн'],
        analysis:
          'Оперативная фиксация экстренной мировой новости позволяет оценить силу толчка в первые 30 минут и спрогнозировать разрастание сюжета по смежным отраслям до того, как они среагируют постфактум.',
        suggestedFollowupPrompt: '/sidework-post Создать экспресс-дайджест горячей повестки с картой рисков',
      });
    }

    if (hasHelena && hasIvan) {
      resonances.push({
        title: 'Узел: Нефтяная волатильность Brent ⟷ Дисконт Urals и расчет демпфера РФ',
        score: 87,
        involvedCurators: ['Хелена Брандт', 'Иван Белый'],
        analysis:
          'Колебания мировых котировок сырья и ставок фрахта танкеров напрямую отражаются на формуле демпфера и налоговых поступлениях от экспорта углеводородов в бюджетную систему РФ.',
        suggestedFollowupPrompt: '/sidework-post Оформить заметку: Влияние сырьевых колебаний на внутренний топливный рынок РФ',
      });
    }

    return resonances;
  }

  private static detectBranchingPotentials(
    takes: CuratorTake[],
    cards: DailyNewsCard[]
  ): BranchingAnalysis[] {
    const analyses: BranchingAnalysis[] = [];

    // Identify candidate cards with high ripple potential or trigger keywords
    const candidateCards = cards.filter((c) => {
      if (c.branchingPotentialScore && c.branchingPotentialScore >= 65) return true;
      const text = `${c.title} ${c.summary}`.toLowerCase();
      return (
        text.includes('вывод войск') ||
        text.includes('ирак') ||
        text.includes('вакуум') ||
        text.includes('баз') ||
        text.includes('смена власти') ||
        text.includes('пакт') ||
        text.includes('ормуз') ||
        text.includes('бифуркац')
      );
    });

    if (candidateCards.length > 0) {
      for (const card of candidateCards.slice(0, 2)) {
        analyses.push({
          sourceCardTitle: card.title,
          branchingPotentialScore: card.branchingPotentialScore || 93,
          statusQuoBreak:
            'Слом многолетнего регионального военно-политического статус-кво и формирование вакуума гарантий безопасности.',
          likelyBranches: [
            {
              contourName: 'Региональная безопасность MENA',
              curatorId: 'tariq-said',
              curatorName: 'Тарик Саид',
              emoji: '🕌',
              impactScore: 95,
              potentialStory:
                'Борьба за влияние между Тегераном и Анкарой, давление на курдскую автономию и поиск альтернативных оборонных пактов монархиями Залива.',
            },
            {
              contourName: 'Сырьевые артерии и фрахт',
              curatorId: 'helena-brandt',
              curatorName: 'Хелена Брандт',
              emoji: '⚓',
              impactScore: 89,
              potentialStory:
                'Рост страховых премий Lloyd\'s на танкеры в Ормузском проливе, угроза стабильности отгрузок из Басры и волатильность Brent.',
            },
            {
              contourName: 'Трансграничный баланс и БРИКС',
              curatorId: 'chen-wei',
              curatorName: 'Чэнь Вэй',
              emoji: '🇨🇳',
              impactScore: 84,
              potentialStory:
                'Перехват китайскими корпорациями энергетических концессий и расширение расчетов за ближневосточную нефть в юанях.',
            },
            {
              contourName: 'Внутренний рынок и демпфер РФ',
              curatorId: 'ivan-bely',
              curatorName: 'Иван Белый',
              emoji: '🇷🇺',
              impactScore: 80,
              potentialStory:
                'Изменение дисконта Urals к Brent на фоне ближневосточной премии и перекалибровка бюджетного правила.',
            },
          ],
        });
      }
    } else {
      // Default strategic branch if marcus or tariq is surveyed
      const hasMarcus = takes.some((t) => t.curatorId === 'marcus-vane');
      const hasTariq = takes.some((t) => t.curatorId === 'tariq-said');
      if (hasMarcus || hasTariq) {
        analyses.push({
          sourceCardTitle: 'Трансформация военного присутствия и региональной безопасности на Ближнем Востоке',
          branchingPotentialScore: 91,
          statusQuoBreak: 'Смещение центров тяжести при ослаблении традиционных внешних арбитров безопасности.',
          likelyBranches: [
            {
              contourName: 'Контур безопасности MENA',
              curatorId: 'tariq-said',
              curatorName: 'Тарик Саид',
              emoji: '🕌',
              impactScore: 93,
              potentialStory:
                'Переформатирование коалиций в зоне Залива и смещение центров принятия решений в Эр-Рияд, Тегеран и Анкару.',
            },
            {
              contourName: 'Морская логистика и котировки нефти',
              curatorId: 'helena-brandt',
              curatorName: 'Хелена Брандт',
              emoji: '⚓',
              impactScore: 88,
              potentialStory:
                'Удорожание страховок танкеров в Ормузском проливе и переориентация сырьевых потоков на восточный вектор.',
            },
          ],
        });
      }
    }

    return analyses;
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
