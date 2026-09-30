import { NoteType, resolveItSectorFromText } from '@lenta/shared';
import { DailyNewsCard } from './types';

export class NewsTriageAgent {
  /**
   * Triage an incoming raw news article or headline, producing a structured DailyNewsCard
   */
  static triage(raw: {
    id?: string;
    date: string;
    title: string;
    source: string;
    url?: string;
    rawText?: string;
  }): DailyNewsCard {
    const title = raw.title.trim();
    const text = (raw.rawText || raw.title).toLowerCase();

    // 1. Determine Domain Curator & IT Sector
    const detectedSector = resolveItSectorFromText(text);

    const ivanKeywords = [
      'рф', 'россия', 'правительств', 'фас', 'цб', 'госдум', 'закон', 'рубл',
      'минфин', 'минэнерго', 'внутренн', 'нпз', 'топлив', 'демпфер', 'регион'
    ];
    const kirkKeywords = [
      'сша', 'ес', 'ofac', 'санкци', 'танкер', 'фрс', 'лондон', 'вашингтон',
      'брюссель', 'опек', 'инфляци', 'европ', 'китай', 'юань', 'доллар', 'g7'
    ];
    const itKeywords = [
      'ии', 'ai', 'нейросеть', 'нейросети', 'llm', 'gpt', 'deepseek', 'anthropic', 'openai',
      'gemini', 'devops', 'девопс', 'kubernetes', 'k8s', 'docker', 'ci/cd', 'backend', 'бэкенд',
      'frontend', 'фронтенд', 'bigtech', 'бигтех', 'микросервис', 'база данных', 'уязвимост',
      'cve', 'чип', 'чипы', 'полупроводник', 'дата-центр', 'highload', 'технологи', 'ит'
    ];

    let ivanHits = 0;
    let kirkHits = 0;
    let itHits = detectedSector ? 2 : 0;

    for (const kw of ivanKeywords) {
      if (text.includes(kw)) ivanHits += 1;
    }
    for (const kw of kirkKeywords) {
      if (text.includes(kw)) kirkHits += 1;
    }
    for (const kw of itKeywords) {
      if (text.includes(kw)) itHits += 1;
    }

    let suggestedCurator: 'ivan-bely' | 'kirk-kitten' | 'okatsiya' | 'general' = 'general';
    if (itHits > 0 && itHits >= ivanHits && itHits >= kirkHits) {
      suggestedCurator = 'okatsiya';
    } else if (ivanHits > kirkHits) {
      suggestedCurator = 'ivan-bely';
    } else if (kirkHits > ivanHits) {
      suggestedCurator = 'kirk-kitten';
    } else if (ivanHits > 0 && kirkHits > 0) {
      suggestedCurator = 'ivan-bely'; // cross-boundary defaults to domestic lens
    }

    // 2. Compute Resonance Score (Cross-boundary overlap or high disruption)
    let resonanceScore = 20;
    if (suggestedCurator === 'okatsiya') {
      resonanceScore = Math.min(95, 50 + itHits * 8);
    } else if (ivanHits > 0 && kirkHits > 0) {
      // High cross-boundary friction
      resonanceScore = Math.min(95, 55 + (ivanHits + kirkHits) * 7);
    } else if (ivanHits >= 3 || kirkHits >= 3) {
      resonanceScore = Math.min(75, 40 + Math.max(ivanHits, kirkHits) * 6);
    }

    // 3. Determine NoteType
    let suggestedType: NoteType = NoteType.SINGLE;
    if (text.includes('договорились') || text.includes('приняли') || text.includes('итоги') || text.includes('подписан') || text.includes('выпустил') || text.includes('зарелизил')) {
      suggestedType = NoteType.DONE;
    } else if (text.includes('саммит') || text.includes('встреча') || text.includes('заседание') || text.includes('форум') || text.includes('конференц') || text.includes('митап')) {
      suggestedType = NoteType.EVENT;
    } else if (text.includes('с') && text.includes('по') || text.includes('период') || text.includes('квартал')) {
      suggestedType = NoteType.PERIOD;
    }

    // 4. Extract Suggested Tags
    const suggestedTags: string[] = ['новости'];
    if (suggestedCurator === 'okatsiya') {
      suggestedTags.push('IT');
      if (detectedSector) {
        suggestedTags.push(...detectedSector.hashtags.map((h) => h.replace(/^#/, '')));
      } else {
        suggestedTags.push('технологии');
      }
    } else if (suggestedCurator === 'ivan-bely') {
      suggestedTags.push('внутренний-рынок', 'рф');
    } else if (suggestedCurator === 'kirk-kitten') {
      suggestedTags.push('мировые-рынки', 'геополитика');
    }

    if (text.includes('санкци')) suggestedTags.push('санкции');
    if (text.includes('нефт') || text.includes('топлив') || text.includes('газ')) suggestedTags.push('энергетика');
    if (text.includes('цб') || text.includes('ставк') || text.includes('инфляц')) suggestedTags.push('финансы');

    // 5. Generate Key Takeaway Bullets
    const keyPoints: string[] = [
      `Источник сообщения: ${raw.source}`,
      suggestedCurator === 'okatsiya'
        ? `Технологическая оптика (Окация): ${detectedSector ? `${detectedSector.name} — ` : ''}архитектурные изменения, релизы и влияние на стек индустрии.`
        : suggestedCurator === 'ivan-bely'
        ? 'Оценка фокуса РФ: прямое регуляторное или экономическое воздействие на внутренний сектор.'
        : suggestedCurator === 'kirk-kitten'
        ? 'Оценка внешнего контура: международные ограничения, логистика и макроэкономические последствия.'
        : 'Общественно-политический контекст дня.',
      `Индикатор резонанса: ${resonanceScore}% (${resonanceScore >= 70 ? 'Высокая чувствительность' : 'Стандартный мониторинг'}).`
    ];

    let category = 'Общий мониторинг';
    if (suggestedCurator === 'okatsiya') {
      category = detectedSector ? `IT: ${detectedSector.name}` : 'IT & Искусственный Интеллект';
    } else if (suggestedCurator === 'ivan-bely') {
      category = 'Внутренняя политика и экономика';
    } else if (suggestedCurator === 'kirk-kitten') {
      category = 'Международный контур';
    }

    return {
      id: raw.id || `news-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: raw.date,
      title: raw.title,
      source: raw.source,
      url: raw.url,
      publishedAt: new Date().toISOString(),
      category,
      summary: raw.rawText ? raw.rawText.substring(0, 240) + '...' : raw.title,
      keyPoints,
      suggestedCurator,
      suggestedType,
      resonanceScore,
      suggestedTags,
      status: 'PENDING',
    };
  }
}

