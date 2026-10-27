export interface SparkFolderTheme {
  folderPath: string;
  cleanName: string;
  emoji: string;
  accentColor: string;
  badgeBg: string;
  borderAccent: string;
  feedSlug?: string;
  defaultDelta: number;
}

export const KNOWN_SPARK_THEMES: Record<string, SparkFolderTheme> = {
  'Spark/AI': {
    folderPath: 'Spark/AI',
    cleanName: 'sparks/AI',
    emoji: '🤖',
    accentColor: '#c084fc', // Violet/Purple
    badgeBg: 'rgba(192, 132, 252, 0.12)',
    borderAccent: '#a855f7',
    feedSlug: 'spark-ai',
    defaultDelta: 20,
  },
  'Spark/Habr': {
    folderPath: 'Spark/Habr',
    cleanName: 'sparks/Habr',
    emoji: '📰',
    accentColor: '#22d3ee', // Cyan
    badgeBg: 'rgba(34, 211, 238, 0.12)',
    borderAccent: '#06b6d4',
    feedSlug: 'spark-habr',
    defaultDelta: 2,
  },
  'Spark/РФ и Украина': {
    folderPath: 'Spark/РФ и Украина',
    cleanName: 'sparks/РФ-Украина',
    emoji: '🕊️',
    accentColor: '#60a5fa', // Blue
    badgeBg: 'rgba(96, 165, 250, 0.12)',
    borderAccent: '#3b82f6',
    feedSlug: 'spark-рф-и-украина',
    defaultDelta: 12,
  },
  'Spark/Политика': {
    folderPath: 'Spark/Политика',
    cleanName: 'sparks/Политика',
    emoji: '🌐',
    accentColor: '#f43f5e', // Rose
    badgeBg: 'rgba(244, 63, 94, 0.12)',
    borderAccent: '#e11d48',
    feedSlug: 'spark-политика',
    defaultDelta: 5,
  },
  'Spark/notebooklmAi': {
    folderPath: 'Spark/notebooklmAi',
    cleanName: 'sparks/NotebookLM',
    emoji: '🎙️',
    accentColor: '#a78bfa', // Indigo/Purple
    badgeBg: 'rgba(167, 139, 250, 0.12)',
    borderAccent: '#8b5cf6',
    feedSlug: 'spark-notebooklmai',
    defaultDelta: 4,
  },
  'Spark/notebooklmAi/Regular': {
    folderPath: 'Spark/notebooklmAi/Regular',
    cleanName: 'sparks/NotebookLM/Обычные',
    emoji: '🎙️',
    accentColor: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.12)',
    borderAccent: '#9333ea',
    feedSlug: 'spark-notebooklmai-regular',
    defaultDelta: 2,
  },
  'Spark/notebooklmAi/Telegram': {
    folderPath: 'Spark/notebooklmAi/Telegram',
    cleanName: 'sparks/NotebookLM/Telegram',
    emoji: '✈️',
    accentColor: '#2481cc',
    badgeBg: 'rgba(36, 129, 204, 0.12)',
    borderAccent: '#1e6cb0',
    feedSlug: 'spark-notebooklmai-telegram',
    defaultDelta: 2,
  },
  'Spark/Cyber Security': {
    folderPath: 'Spark/Cyber Security',
    cleanName: 'sparks/CyberSec',
    emoji: '🛡️',
    accentColor: '#34d399', // Emerald
    badgeBg: 'rgba(52, 211, 153, 0.12)',
    borderAccent: '#10b981',
    feedSlug: 'spark-cyber-security',
    defaultDelta: 3,
  },
  'Spark/xakep': {
    folderPath: 'Spark/xakep',
    cleanName: 'sparks/xakep',
    emoji: '👾',
    accentColor: '#22c55e', // Green
    badgeBg: 'rgba(34, 197, 94, 0.12)',
    borderAccent: '#16a34a',
    feedSlug: 'spark-xakep',
    defaultDelta: 4,
  },
  'Spark/changelogsfeed': {
    folderPath: 'Spark/changelogsfeed',
    cleanName: 'sparks/Changelogs',
    emoji: '🚀',
    accentColor: '#f97316', // Orange
    badgeBg: 'rgba(249, 115, 22, 0.12)',
    borderAccent: '#ea580c',
    feedSlug: 'spark-changelogsfeed',
    defaultDelta: 8,
  },
  'Spark/youtube/oneday': {
    folderPath: 'Spark/youtube/oneday',
    cleanName: 'sparks/YouTube-OneDay',
    emoji: '📺',
    accentColor: '#ef4444',
    badgeBg: 'rgba(239, 68, 68, 0.12)',
    borderAccent: '#dc2626',
    feedSlug: 'spark-youtube-oneday',
    defaultDelta: 4,
  },
  'Spark/youtube': {
    folderPath: 'Spark/youtube',
    cleanName: 'sparks/YouTube',
    emoji: '📺',
    accentColor: '#ef4444',
    badgeBg: 'rgba(239, 68, 68, 0.12)',
    borderAccent: '#dc2626',
    feedSlug: 'spark-youtube-oneday',
    defaultDelta: 4,
  },
  'Spark/changelogsfeed/Google': {
    folderPath: 'Spark/changelogsfeed/Google',
    cleanName: 'sparks/Changelogs/Google',
    emoji: '🌐',
    accentColor: '#4285f4', // Google Blue
    badgeBg: 'rgba(66, 133, 244, 0.12)',
    borderAccent: '#1a73e8',
    feedSlug: 'spark-changelogsfeed-google',
    defaultDelta: 3,
  },
  'Spark/changelogsfeed/OpenAI': {
    folderPath: 'Spark/changelogsfeed/OpenAI',
    cleanName: 'sparks/Changelogs/OpenAI',
    emoji: '🧠',
    accentColor: '#10a37f', // OpenAI Green
    badgeBg: 'rgba(16, 163, 127, 0.12)',
    borderAccent: '#0d8c6d',
    feedSlug: 'spark-changelogsfeed-openai',
    defaultDelta: 3,
  },
  'Spark/changelogsfeed/Anthropic': {
    folderPath: 'Spark/changelogsfeed/Anthropic',
    cleanName: 'sparks/Changelogs/Anthropic',
    emoji: '⚡',
    accentColor: '#d97706', // Anthropic Amber
    badgeBg: 'rgba(217, 119, 6, 0.12)',
    borderAccent: '#b45309',
    feedSlug: 'spark-changelogsfeed-anthropic',
    defaultDelta: 2,
  },
  'Spark/World of Warcraft': {
    folderPath: 'Spark/World of Warcraft',
    cleanName: 'sparks/WoW',
    emoji: '🎮',
    accentColor: '#fbbf24', // Amber
    badgeBg: 'rgba(251, 191, 36, 0.12)',
    borderAccent: '#f59e0b',
    feedSlug: 'spark-world-of-warcraft',
    defaultDelta: 1,
  },
  'Spark/Hardware': {
    folderPath: 'Spark/Hardware',
    cleanName: 'sparks/Hardware',
    emoji: '⚡',
    accentColor: '#fb923c', // Orange
    badgeBg: 'rgba(251, 146, 60, 0.12)',
    borderAccent: '#f97316',
    defaultDelta: 6,
  },
  'Spark/Quantum': {
    folderPath: 'Spark/Quantum',
    cleanName: 'sparks/Quantum',
    emoji: '⚛️',
    accentColor: '#38bdf8', // Sky
    badgeBg: 'rgba(56, 189, 248, 0.12)',
    borderAccent: '#0ea5e9',
    defaultDelta: 3,
  },
  'Spark/Robotics': {
    folderPath: 'Spark/Robotics',
    cleanName: 'sparks/Robotics',
    emoji: '🦾',
    accentColor: '#e879f9', // Fuchsia
    badgeBg: 'rgba(232, 121, 249, 0.12)',
    borderAccent: '#d946ef',
    defaultDelta: 5,
  },
  'Spark/BioTech': {
    folderPath: 'Spark/BioTech',
    cleanName: 'sparks/BioTech',
    emoji: '🧬',
    accentColor: '#4ade80', // Green
    badgeBg: 'rgba(74, 222, 128, 0.12)',
    borderAccent: '#22c55e',
    defaultDelta: 2,
  },
  'Spark/Economics': {
    folderPath: 'Spark/Economics',
    cleanName: 'sparks/Economics',
    emoji: '📈',
    accentColor: '#facc15', // Yellow
    badgeBg: 'rgba(250, 204, 21, 0.12)',
    borderAccent: '#eab308',
    defaultDelta: 4,
  },
  'Spark/DevOps': {
    folderPath: 'Spark/DevOps',
    cleanName: 'sparks/DevOps',
    emoji: '🛠️',
    accentColor: '#2dd4bf', // Teal
    badgeBg: 'rgba(45, 212, 191, 0.12)',
    borderAccent: '#14b8a6',
    defaultDelta: 3,
  },
  'Spark/Crypto': {
    folderPath: 'Spark/Crypto',
    cleanName: 'sparks/Crypto',
    emoji: '🪙',
    accentColor: '#f472b6', // Pink
    badgeBg: 'rgba(244, 114, 182, 0.12)',
    borderAccent: '#ec4899',
    defaultDelta: 7,
  },
  'Spark/Mobile': {
    folderPath: 'Spark/Mobile',
    cleanName: 'sparks/Mobile',
    emoji: '📱',
    accentColor: '#818cf8', // Indigo
    badgeBg: 'rgba(129, 140, 248, 0.12)',
    borderAccent: '#6366f1',
    defaultDelta: 2,
  },
};

export function getSparkFolderTheme(path: string): SparkFolderTheme {
  const normalized = path.replace(/\\/g, '/');
  
  // Exact match
  if (KNOWN_SPARK_THEMES[normalized]) {
    return KNOWN_SPARK_THEMES[normalized];
  }

  // Case-insensitive or partial match
  for (const [key, theme] of Object.entries(KNOWN_SPARK_THEMES)) {
    if (normalized.toLowerCase() === key.toLowerCase() || normalized.endsWith(key.split('/')[1])) {
      return theme;
    }
  }

  // Fallback dynamic spark theme
  const folderName = normalized.split('/').pop() || normalized;
  return {
    folderPath: normalized,
    cleanName: `sparks/${folderName}`,
    emoji: '⚡',
    accentColor: '#e5c07b',
    badgeBg: 'rgba(229, 192, 123, 0.12)',
    borderAccent: '#e5c07b',
    defaultDelta: 1,
  };
}

export function isSparkFolder(path?: string | null): boolean {
  if (!path) return false;
  const lower = path.toLowerCase().replace(/\\/g, '/');
  return lower.startsWith('spark/') || lower.startsWith('sparks/') || lower.includes('/spark/');
}

export interface FeedThemeItem {
  slug: string;
  title: string;
  shortTitle: string;
  accentColor: string;
  emoji: string;
}

export const KNOWN_FEED_THEMES: Record<string, FeedThemeItem> = {
  'mcu-radar': { slug: 'mcu-radar', title: 'Marvel Cinematic Universe', shortTitle: 'MCU Radar', accentColor: '#f87171', emoji: '🎬' },
  'tech-strategy': { slug: 'tech-strategy', title: 'Technical Architecture', shortTitle: 'Tech Strategy', accentColor: '#38bdf8', emoji: '⚡' },
  'product-milestones': { slug: 'product-milestones', title: 'Product Milestones', shortTitle: 'Product Goals', accentColor: '#34d399', emoji: '🎯' },
  'design-system': { slug: 'design-system', title: 'Design System & UI', shortTitle: 'Design System', accentColor: '#f472b6', emoji: '🎨' },
  'cloud-infrastructure': { slug: 'cloud-infrastructure', title: 'Cloud Infrastructure', shortTitle: 'Cloud Infra', accentColor: '#a78bfa', emoji: '☁️' },
  'russian-history': { slug: 'russian-history', title: 'История России', shortTitle: 'История РФ', accentColor: '#fb923c', emoji: '📜' },
  'world-history': { slug: 'world-history', title: 'Всемирная история', shortTitle: 'История мира', accentColor: '#93c5fd', emoji: '🏛️' },
  'science-discoveries': { slug: 'science-discoveries', title: 'Научные открытия', shortTitle: 'Наука & Космос', accentColor: '#c084fc', emoji: '🔬' },
  'space-exploration': { slug: 'space-exploration', title: 'Космонавтика & NASA', shortTitle: 'Космонавтика', accentColor: '#67e8f9', emoji: '🚀' },
  'ai-machine-learning': { slug: 'ai-machine-learning', title: 'AI & Нейросети', shortTitle: 'AI Research', accentColor: '#e879f9', emoji: '🧠' },
  'spark-ai': { slug: 'spark-ai', title: 'AI & Нейросети (Spark)', shortTitle: 'Spark AI', accentColor: '#a855f7', emoji: '🤖' },
  'spark-habr': { slug: 'spark-habr', title: 'Хабр & IT (Spark)', shortTitle: 'Spark Хабр', accentColor: '#06b6d4', emoji: '📰' },
  'spark-cyber-security': { slug: 'spark-cyber-security', title: 'Cyber Security (Spark)', shortTitle: 'CyberSec', accentColor: '#10b981', emoji: '🛡️' },
  'spark-xakep': { slug: 'spark-xakep', title: 'Журнал «Хакер» (Spark)', shortTitle: 'Журнал «Хакер»', accentColor: '#22c55e', emoji: '👾' },
  'spark-notebooklmai': { slug: 'spark-notebooklmai', title: 'NotebookLM AI (Spark)', shortTitle: 'NotebookLM', accentColor: '#a855f7', emoji: '🎙️' },
  'spark-notebooklmai-regular': { slug: 'spark-notebooklmai-regular', title: 'NotebookLM • Обычные подкасты', shortTitle: 'Обычные', accentColor: '#a855f7', emoji: '🎙️' },
  'spark-notebooklmai-telegram': { slug: 'spark-notebooklmai-telegram', title: 'NotebookLM • Telegram подкасты', shortTitle: 'Telegram', accentColor: '#2481cc', emoji: '✈️' },
  'spark-changelogsfeed': { slug: 'spark-changelogsfeed', title: 'Changelogs & Релизы (Spark)', shortTitle: 'Changelogs', accentColor: '#f97316', emoji: '🚀' },
  'spark-changelogsfeed-google': { slug: 'spark-changelogsfeed-google', title: 'Google Changelogs', shortTitle: 'Google', accentColor: '#4285f4', emoji: '🌐' },
  'spark-changelogsfeed-openai': { slug: 'spark-changelogsfeed-openai', title: 'OpenAI Changelogs', shortTitle: 'OpenAI', accentColor: '#10a37f', emoji: '🧠' },
  'spark-changelogsfeed-anthropic': { slug: 'spark-changelogsfeed-anthropic', title: 'Anthropic Changelogs', shortTitle: 'Anthropic', accentColor: '#d97706', emoji: '⚡' },
  'spark-рф-и-украина': { slug: 'spark-рф-и-украина', title: 'Сводки РФ & Украина', shortTitle: 'РФ-Украина', accentColor: '#60a5fa', emoji: '🕊️' },
  'spark-политика': { slug: 'spark-политика', title: 'Политика & Мир (Spark)', shortTitle: 'Политика', accentColor: '#f43f5e', emoji: '🌐' },
  'spark-youtube-oneday': { slug: 'spark-youtube-oneday', title: 'YouTube • OneDay (Spark)', shortTitle: 'YouTube', accentColor: '#ef4444', emoji: '📺' },
};

const DYNAMIC_FEED_PALETTES = [
  { accent: '#fb923c', emoji: '🔥' },
  { accent: '#22d3ee', emoji: '🌐' },
  { accent: '#a78bfa', emoji: '✨' },
  { accent: '#4ade80', emoji: '🌱' },
  { accent: '#f472b6', emoji: '📰' },
  { accent: '#e5c07b', emoji: '⚡' },
];

export function getFeedTheme(slug?: string, title?: string): FeedThemeItem {
  if (slug && KNOWN_FEED_THEMES[slug]) {
    return KNOWN_FEED_THEMES[slug];
  }

  const key = (slug || title || 'default').toLowerCase();
  for (const [s, theme] of Object.entries(KNOWN_FEED_THEMES)) {
    if (key.includes(s) || (theme.title && key.includes(theme.title.toLowerCase()))) {
      return theme;
    }
  }

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const palette = DYNAMIC_FEED_PALETTES[Math.abs(hash) % DYNAMIC_FEED_PALETTES.length];

  return {
    slug: slug || 'custom',
    title: title || 'Custom Feed',
    shortTitle: title ? (title.length > 18 ? title.slice(0, 18) + '...' : title) : 'Канал',
    accentColor: palette.accent,
    emoji: palette.emoji,
  };
}
