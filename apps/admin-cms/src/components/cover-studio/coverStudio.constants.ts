export type CoverAspectRatio = '16:9' | '1:1' | '9:16' | '4:3' | '3:4';

export interface StylePresetItem {
  id: string;
  label: string;
  icon: string;
  category: 'it' | 'general';
  badge?: string;
  description: string;
}

export interface ItWorkflowTemplate {
  id: string;
  label: string;
  icon: string;
  styleId: string;
  aspectRatio: CoverAspectRatio;
  promptPrefix: string;
  promptSuffix: string;
  description: string;
}

export interface ItSceneModifier {
  id: string;
  label: string;
  icon: string;
  snippet: string;
}

export const STYLE_PRESETS: StylePresetItem[] = [
  // IT & Tech Sphere Styles
  {
    id: 'ai-neural',
    label: 'AI / Нейросеть',
    icon: '🧠',
    category: 'it',
    badge: 'IT',
    description: 'Светящиеся нейронные связи, тензорные ядра, глубокий glassmorphism и потоки данных',
  },
  {
    id: 'cyber-security',
    label: 'Security / SOC',
    icon: '🛡️',
    category: 'it',
    badge: 'SEC',
    description: 'Киберзащита, матрица угроз Zero-Day, криптографический щит, красно-синий HUD',
  },
  {
    id: 'changelog-blueprint',
    label: 'Changelog / Релиз',
    icon: '⚙️',
    category: 'it',
    badge: 'DEV',
    description: 'Инженерный CAD-чертёж, модульная сборка релиза, светящаяся архитектурная сетка',
  },
  {
    id: 'podcast-neon',
    label: 'IT Подкаст / Эфир',
    icon: '🎙️',
    category: 'it',
    badge: 'AUDIO',
    description: 'Футуристическая студия подкаста, неоновые звуковые волны, студийный микрофон',
  },
  {
    id: 'isometric-tech',
    label: '3D Изометрия / Cloud',
    icon: '🧊',
    category: 'it',
    badge: '3D',
    description: 'Изометрическая 3D-архитектура серверов, облачных кластеров и микросервисов (Octane Render)',
  },
  {
    id: 'silicon-hardware',
    label: 'Чипы / Hardware',
    icon: '💻',
    category: 'it',
    badge: 'HW',
    description: 'Макросъёмка кремниевых пластин, золотые дорожки GPU-кластеров и квантовых чипов',
  },
  {
    id: 'terminal-retro',
    label: 'Терминал / Код',
    icon: '📟',
    category: 'it',
    badge: 'CLI',
    description: 'Эстетика зелёного/янтарного CRT-терминала, матрица кода и хакерская консоль',
  },
  {
    id: 'abstract-data',
    label: 'Big Data / Граф',
    icon: '📊',
    category: 'it',
    badge: 'DATA',
    description: 'Футуристическая телеметрия, оптоволоконные потоки и сетевые графы в Dark Mode',
  },

  // Classic / General Styles
  {
    id: 'cinematic',
    label: 'Кинематографичный',
    icon: '🎬',
    category: 'general',
    description: 'Широкоформатный кадр из фильма 8K с драматическим анаморфным светом',
  },
  {
    id: 'photorealistic',
    label: 'Фотореализм',
    icon: '📸',
    category: 'general',
    description: 'Детальная 35мм фотография с естественным светом и глубиной резкости',
  },
  {
    id: 'minimalist',
    label: 'Минимализм / Вектор',
    icon: '📐',
    category: 'general',
    description: 'Чистая швейцарская геометрия, плоская векторная графика и баланс форм',
  },
  {
    id: 'cyberpunk',
    label: 'Киберпанк / Неон',
    icon: '🌆',
    category: 'general',
    description: 'Объёмный неоновый свет, отражения на мокром асфальте и атмосфера будущего',
  },
  {
    id: 'vintage',
    label: 'Винтаж / Архив',
    icon: '🏛️',
    category: 'general',
    description: 'Архивная эстетика, тёплое зерно плёнки и классические матовые тона',
  },
  {
    id: 'oil-painting',
    label: 'Живопись / Арт',
    icon: '🎨',
    category: 'general',
    description: 'Выразительный цифровой концепт-арт и фактурная живопись',
  },
];

export const IT_WORKFLOW_TEMPLATES: ItWorkflowTemplate[] = [
  {
    id: 'ai-podcast',
    label: 'IT & AI Подкаст',
    icon: '🎙️',
    styleId: 'podcast-neon',
    aspectRatio: '1:1',
    promptPrefix: 'Обложка IT и AI подкаста:',
    promptSuffix: 'студийный микрофон с неоновыми звуковыми волнами, голографический нейроинтерфейс, тёмный фон',
    description: 'Идеально для сводных аудиовыпусков и NotebookLM подкастов (квадрат 1:1 или 16:9)',
  },
  {
    id: 'changelog',
    label: 'Changelog / Релиз',
    icon: '🚀',
    styleId: 'changelog-blueprint',
    aspectRatio: '16:9',
    promptPrefix: 'Технологический релиз и обновление системы:',
    promptSuffix: 'модульная 3D-архитектура, светящиеся инженерные чертежи, сборка нового ядра',
    description: 'Для дайджестов обновлений, релиз-ноутов, патчей и новых версий ПО',
  },
  {
    id: 'security-alert',
    label: 'Security / CVE Дайджест',
    icon: '🛡️',
    styleId: 'cyber-security',
    aspectRatio: '16:9',
    promptPrefix: 'Информационная безопасность и киберзащита:',
    promptSuffix: 'цифровая крепость, голографический щит, анализ уязвимостей Zero-Day, мониторы SOC-центра',
    description: 'Для новостей ИБ, разборов уязвимостей (CVE), инцидентов и отчётов по безопасности',
  },
  {
    id: 'llm-agents',
    label: 'AI Модели & Агенты',
    icon: '🧠',
    styleId: 'ai-neural',
    aspectRatio: '16:9',
    promptPrefix: 'Искусственный интеллект и автономные агенты:',
    promptSuffix: 'светящаяся нейронная сеть, потоки токенов и кристаллическое ядро ИИ',
    description: 'Для новостей про LLM, нейросети, мультиагентные системы и исследования ИИ',
  },
  {
    id: 'cloud-devops',
    label: 'Cloud & Инфраструктура',
    icon: '☁️',
    styleId: 'isometric-tech',
    aspectRatio: '16:9',
    promptPrefix: 'Облачная инфраструктура и распределённые системы:',
    promptSuffix: 'изометрический 3D-кластер серверов, светящиеся потоки данных и контейнеры',
    description: 'Для заметок по DevOps, Kubernetes, базам данных и системной архитектуре',
  },
  {
    id: 'hardware-silicon',
    label: 'Чипы & Квантовый Tech',
    icon: '🔬',
    styleId: 'silicon-hardware',
    aspectRatio: '16:9',
    promptPrefix: 'Высокотехнологичное железо и микроэлектроника:',
    promptSuffix: 'макросъёмка кремниевого кристалла, золотые микросхемы, лазерная литография',
    description: 'Для обзоров GPU, процессоров, дата-центров и квантовых компьютеров',
  },
];

export const IT_SCENE_MODIFIERS: ItSceneModifier[] = [
  {
    id: 'dark-glass',
    label: 'Dark Glassmorphism',
    icon: '🪟',
    snippet: 'полупрозрачные тёмные стеклянные панели (dark mode glassmorphism UI)',
  },
  {
    id: 'audio-waves',
    label: 'Аудиоволны',
    icon: '〰️',
    snippet: 'светящиеся неоновые звуковые волны и эквалайзер',
  },
  {
    id: 'hud-telemetry',
    label: 'Голографический HUD',
    icon: '🎯',
    snippet: 'голографический интерфейс телеметрии и системной аналитики',
  },
  {
    id: 'threat-shield',
    label: 'Кибер-щит / Red-Blue',
    icon: '🔐',
    snippet: 'криптографический защитный купол с контрастным красно-синим свечением',
  },
  {
    id: 'code-matrix',
    label: 'Фрагменты кода',
    icon: '💻',
    snippet: 'парящие строки исходного кода и терминальные команды в расфокусе',
  },
  {
    id: 'server-cluster',
    label: 'Дата-центр',
    icon: '🖧',
    snippet: 'высокотехнологичный серверный зал с оптоволоконной подсветкой',
  },
  {
    id: 'octane-3d',
    label: 'Octane 3D Render',
    icon: '✨',
    snippet: 'студийный 3D-рендер Octane, трассировка лучей, мягкое глобальное освещение',
  },
];

export const REMIX_PRESETS: string[] = [
  'В стиле кибербезопасности (SOC): красный тревожный HUD, цифровая защита и матрица кода',
  'В стиле обложки IT-подкаста: неоновые звуковые волны, студийный свет и технологичный фон',
  'В стиле 3D-изометрии облачной архитектуры, микросервисов и светящихся дата-пайплайнов',
  'В виде инженерного чертежа (Blueprint) для релиза / Changelog с модульной сеткой',
  'В стиле AI / Нейросети: светящиеся синапсы, тензорные кристаллы и Dark Glassmorphism',
  'В стиле киберпанк с неоновым светом, дождём и ретро-терминалами',
  'Минималистичная плоская векторная графика в швейцарском стиле',
];
