import { Feed } from '@lenta/shared';

export interface FeedThemeConfig {
  slug: string;
  title: string;
  shortTitle: string;
  tagline: string;
  category: 'media' | 'engineering' | 'product' | 'design' | 'operations' | 'general';
  accentColor: string;
  gradient: string;
  borderAccent: string;
  bgLight: string;
  badgeBg: string;
  emoji: string;
  iconName: string;
}

export const KNOWN_FEED_THEMES: Record<string, FeedThemeConfig> = {
  'mcu-radar': {
    slug: 'mcu-radar',
    title: 'Marvel Cinematic Universe',
    shortTitle: 'MCU Radar',
    tagline: 'Film releases, hero arcs & multiverse phases',
    category: 'media',
    accentColor: '#f87171', // Red/Amber
    gradient: 'from-red-500/20 via-amber-500/10 to-transparent',
    borderAccent: '#ef4444',
    bgLight: 'rgba(239, 68, 68, 0.12)',
    badgeBg: 'rgba(239, 68, 68, 0.25)',
    emoji: '🎬',
    iconName: 'Film',
  },
  'tech-strategy': {
    slug: 'tech-strategy',
    title: 'Technical Architecture & Strategy',
    shortTitle: 'Tech Strategy',
    tagline: 'System designs, RFCs & engineering roadmaps',
    category: 'engineering',
    accentColor: '#38bdf8', // Sky/Cyan
    gradient: 'from-sky-500/20 via-cyan-500/10 to-transparent',
    borderAccent: '#0ea5e9',
    bgLight: 'rgba(14, 165, 233, 0.12)',
    badgeBg: 'rgba(14, 165, 233, 0.25)',
    emoji: '⚡',
    iconName: 'Zap',
  },
  'product-milestones': {
    slug: 'product-milestones',
    title: 'Product Milestones',
    shortTitle: 'Product Goals',
    tagline: 'Quarterly OKRs, features & user experience',
    category: 'product',
    accentColor: '#e5e971', // Lemon Gold
    gradient: 'from-[#c9cd58]/20 via-[#535600]/10 to-transparent',
    borderAccent: '#c9cd58',
    bgLight: 'rgba(201, 205, 88, 0.12)',
    badgeBg: 'rgba(201, 205, 88, 0.25)',
    emoji: '🎯',
    iconName: 'Target',
  },
  'design-systems': {
    slug: 'design-systems',
    title: 'Design Systems & UI',
    shortTitle: 'Design UI',
    tagline: 'Lenta tokens, components & UX patterns',
    category: 'design',
    accentColor: '#c084fc', // Purple/Violet
    gradient: 'from-purple-500/20 via-fuchsia-500/10 to-transparent',
    borderAccent: '#a855f7',
    bgLight: 'rgba(168, 85, 247, 0.12)',
    badgeBg: 'rgba(168, 85, 247, 0.25)',
    emoji: '🎨',
    iconName: 'Palette',
  },
  'devops-infra': {
    slug: 'devops-infra',
    title: 'DevOps & Infrastructure',
    shortTitle: 'DevOps & Cloud',
    tagline: 'Uptime ops, migrations & cloud deployments',
    category: 'operations',
    accentColor: '#34d399', // Emerald/Teal
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    borderAccent: '#10b981',
    bgLight: 'rgba(16, 185, 129, 0.12)',
    badgeBg: 'rgba(16, 185, 129, 0.25)',
    emoji: '🛠️',
    iconName: 'Server',
  },
};

// Curated dynamic palette for unmapped feeds
const DYNAMIC_PALETTES = [
  { accent: '#fb923c', border: '#f97316', emoji: '🔥', icon: 'Flame', bg: 'rgba(249, 115, 22, 0.15)' },
  { accent: '#22d3ee', border: '#06b6d4', emoji: '🌐', icon: 'Globe', bg: 'rgba(6, 182, 212, 0.15)' },
  { accent: '#a78bfa', border: '#8b5cf6', emoji: '✨', icon: 'Sparkles', bg: 'rgba(139, 92, 246, 0.15)' },
  { accent: '#4ade80', border: '#22c55e', emoji: '🌱', icon: 'Radio', bg: 'rgba(34, 197, 94, 0.15)' },
  { accent: '#f472b6', border: '#ec4899', emoji: '📰', icon: 'Newspaper', bg: 'rgba(236, 72, 153, 0.15)' },
];

export function getFeedTheme(slug?: string, title?: string): FeedThemeConfig {
  if (slug && KNOWN_FEED_THEMES[slug]) {
    return KNOWN_FEED_THEMES[slug];
  }

  // Deterministic fallback based on slug hash
  const key = slug || title || 'default';
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const palette = DYNAMIC_PALETTES[Math.abs(hash) % DYNAMIC_PALETTES.length];

  return {
    slug: slug || 'custom',
    title: title || 'Custom Feed',
    shortTitle: title ? (title.length > 16 ? title.slice(0, 16) + '...' : title) : 'Custom Feed',
    tagline: 'Custom chronological news stream',
    category: 'general',
    accentColor: palette.accent,
    gradient: 'from-amber-500/20 to-transparent',
    borderAccent: palette.border,
    bgLight: palette.bg,
    badgeBg: palette.bg,
    emoji: palette.emoji,
    iconName: palette.icon,
  };
}

export interface FeedPresetOption {
  id: string;
  name: string;
  emoji: string;
  description: string;
  slug?: string; // undefined means all channels
}

export const FEED_PRESET_OPTIONS: FeedPresetOption[] = [
  {
    id: 'all',
    name: 'All Channels',
    emoji: '📡',
    description: 'All news channels and editorial streams combined',
    slug: undefined,
  },
  {
    id: 'mcu-radar',
    name: 'MCU Radar',
    emoji: '🎬',
    description: 'Marvel MCU radar, film releases & phase timelines',
    slug: 'mcu-radar',
  },
  {
    id: 'tech-strategy',
    name: 'Tech Strategy',
    emoji: '⚡',
    description: 'Technical architecture, RFCs & engineering roadmaps',
    slug: 'tech-strategy',
  },
  {
    id: 'product-milestones',
    name: 'Product Goals',
    emoji: '🎯',
    description: 'Product goals, quarterly OKRs & user experience',
    slug: 'product-milestones',
  },
  {
    id: 'design-systems',
    name: 'Design UI',
    emoji: '🎨',
    description: 'Design UI tokens & component system',
    slug: 'design-systems',
  },
  {
    id: 'devops-infra',
    name: 'DevOps & Infra',
    emoji: '🛠️',
    description: 'DevOps, cloud infra & deployment logs',
    slug: 'devops-infra',
  },
];

