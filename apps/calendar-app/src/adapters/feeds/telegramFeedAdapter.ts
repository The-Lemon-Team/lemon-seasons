import { Note } from '@lenta/shared';
import {
  FeedAdapter,
  FeedAdapterContext,
  UnifiedFeedItem,
  UnifiedFeedTab,
} from './types';

export const TelegramFeedAdapter: FeedAdapter = {
  sourceType: 'telegram',
  label: 'Telegram Папки',
  shortLabel: 'Telegram',
  emoji: '✈️',
  description: 'Внешние папки и каналы из telegram-web-reader',

  getTabs(_context: FeedAdapterContext): UnifiedFeedTab[] {
    return [
      {
        id: 'tg-vibes',
        slug: 'tg-vibes',
        title: 'Папка Vibes',
        shortTitle: 'Vibes',
        emoji: '📁',
        category: 'Telegram',
        count: 1,
        accentColor: '#2481cc',
        description: 'Музыкальные релизы и эмбиент из Telegram Web Reader',
      },
      {
        id: 'tg-rf',
        slug: 'tg-rf',
        title: 'Папка РФ',
        shortTitle: 'РФ',
        emoji: '🇷🇺',
        category: 'Telegram',
        count: 272,
        accentColor: '#ef4444',
        description: 'Российские медиаканалы и сводки',
      },
      {
        id: 'tg-it',
        slug: 'tg-it',
        title: 'Папка IT и разработка',
        shortTitle: 'IT',
        emoji: '💻',
        category: 'Telegram',
        count: 149,
        accentColor: '#0ea5e9',
        description: 'Технологические дайджесты и блоги разработчиков',
      },
      {
        id: 'tg-ai',
        slug: 'tg-ai',
        title: 'Папка AI',
        shortTitle: 'AI',
        emoji: '🤖',
        category: 'Telegram',
        count: 78,
        accentColor: '#8b5cf6',
        description: 'Нейросети, модели и инструменты машинного обучения',
      },
      {
        id: 'tg-media',
        slug: 'tg-media',
        title: 'Папка Media',
        shortTitle: 'Media',
        emoji: '📰',
        category: 'Telegram',
        count: 124,
        accentColor: '#10b981',
        description: 'Периодика, редакции и медийные каналы',
      },
    ];
  },

  adaptNotes(_notes: Note[], _activeFeedSlug?: string, _searchQuery?: string): UnifiedFeedItem[] {
    // Note: Live Telegram stream is rendered interactively via TelegramFeedsStream component.
    return [];
  },
};
