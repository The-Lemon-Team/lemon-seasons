import { CoverAspectRatio, IT_WORKFLOW_TEMPLATES, STYLE_PRESETS } from './coverStudio.constants';

export interface ItStyleRecommendation {
  styleId: string;
  templateId?: string;
  aspectRatio: CoverAspectRatio;
  reason: string;
}

interface DetectionRule {
  match: (text: string) => boolean;
  recommendation: ItStyleRecommendation;
}

const DETECTION_RULES: DetectionRule[] = [
  {
    match: (text) =>
      /(подкаст|podcast|аудио|выпуск|эфир|notebooklm|интервью|разговор|слушать)/i.test(text),
    recommendation: {
      styleId: 'podcast-neon',
      templateId: 'ai-podcast',
      aspectRatio: '1:1',
      reason: 'Обнаружена тема подкаста / аудиовыпуска',
    },
  },
  {
    match: (text) =>
      /(cve-|zero-day|0-day|уязвимост|взлом|хакер|атак|безопасност|security|ddos|шифрован|утечк|ransomware|soc|phishing|фишинг|эксплойт|exploit)/i.test(
        text,
      ),
    recommendation: {
      styleId: 'cyber-security',
      templateId: 'security-alert',
      aspectRatio: '16:9',
      reason: 'Обнаружена тематика ИБ / Security / уязвимостей',
    },
  },
  {
    match: (text) =>
      /(changelog|релиз|обновлен|верси| патч|patch|release|v\d+\.\d+|миграц|breaking change|деплой)/i.test(
        text,
      ),
    recommendation: {
      styleId: 'changelog-blueprint',
      templateId: 'changelog',
      aspectRatio: '16:9',
      reason: 'Обнаружен Changelog / релиз версии ПО',
    },
  },
  {
    match: (text) =>
      /(llm|нейросет|искусственн.*интеллект|\bai\b|\bии\b|gemini|gpt|claude|агент|модел|инференс|токен|обучен|machine learning|deep learning)/i.test(
        text,
      ),
    recommendation: {
      styleId: 'ai-neural',
      templateId: 'llm-agents',
      aspectRatio: '16:9',
      reason: 'Обнаружена тематика AI / LLM / нейросетей',
    },
  },
  {
    match: (text) =>
      /(gpu|nvidia|процессор|чип|кремни|квантов|hardware|железо|серверн.*стойк|arm|tpu|литограф)/i.test(
        text,
      ),
    recommendation: {
      styleId: 'silicon-hardware',
      templateId: 'hardware-silicon',
      aspectRatio: '16:9',
      reason: 'Обнаружена тематика Hardware / чипов / GPU',
    },
  },
  {
    match: (text) =>
      /(kubernetes|k8s|docker|cloud|облак|devops|микросервис|архитектур|postgres|баз.*данных|кластер|ci\/cd|бэкенд|инфраструктур)/i.test(
        text,
      ),
    recommendation: {
      styleId: 'isometric-tech',
      templateId: 'cloud-devops',
      aspectRatio: '16:9',
      reason: 'Обнаружена тематика Cloud / DevOps / архитектуры',
    },
  },
  {
    match: (text) => /(linux|cli|терминал|консоль|open source|git|bash|ядро|компилятор)/i.test(text),
    recommendation: {
      styleId: 'terminal-retro',
      aspectRatio: '16:9',
      reason: 'Обнаружена тематика кода / терминала / Open Source',
    },
  },
];

/**
 * Declaratively analyzes note title and description to recommend the best IT visual style & template.
 */
export function detectItStyleRecommendation(
  title?: string,
  description?: string,
): ItStyleRecommendation | null {
  const combined = `${title || ''} ${description || ''}`.trim();
  if (!combined) return null;

  const matched = DETECTION_RULES.find((rule) => rule.match(combined));
  return matched ? matched.recommendation : null;
}

/**
 * Applies an IT workflow template to the user's current topic/title.
 */
export function buildTemplatePrompt(
  templateId: string,
  baseTopic: string,
): { prompt: string; styleId: string; aspectRatio: CoverAspectRatio } | null {
  const template = IT_WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const cleanTopic = baseTopic
    .replace(/^Обложка IT и AI подкаста:\s*/i, '')
    .replace(/^Технологический релиз и обновление системы:\s*/i, '')
    .replace(/^Информационная безопасность и киберзащита:\s*/i, '')
    .replace(/^Искусственный интеллект и автономные агенты:\s*/i, '')
    .replace(/^Облачная инфраструктура и распределённые системы:\s*/i, '')
    .replace(/^Высокотехнологичное железо и микроэлектроника:\s*/i, '')
    .split(' — ')[0]
    .trim();

  const coreSubject = cleanTopic || 'Современные информационные технологии';
  const prompt = `${template.promptPrefix} ${coreSubject} — ${template.promptSuffix}`;

  return {
    prompt,
    styleId: template.styleId,
    aspectRatio: template.aspectRatio,
  };
}

/**
 * Toggles a scene modifier snippet inside the prompt string.
 */
export function toggleModifierInPrompt(currentPrompt: string, snippet: string): string {
  if (currentPrompt.includes(snippet)) {
    return currentPrompt
      .replace(new RegExp(`,?\\s*${escapeRegExp(snippet)}`, 'gi'), '')
      .replace(/^,\s*/, '')
      .trim();
  }
  const base = currentPrompt.trim();
  return base ? `${base}, ${snippet}` : snippet;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getStylePresetById(styleId: string) {
  return STYLE_PRESETS.find((s) => s.id === styleId);
}
