export const STREAM_SOURCE_SLUGS: Record<string, string[]> = {
  entertainment: [
    'marvel', 'mcu', 'mcu-radar', 'marvel-cinematic-universe',
    'cinema', 'movies', 'tmdb', 'films', 'series', 'my-films', 'my-movies',
    'music', 'soundtrack', 'albums', 'музыка', 'my-music',
    'gaming', 'games', 'игры',
  ],
  js_interview: [
    'daily-questions', 'advanced-react', 'advanced-reactx',
    'interesting-questions', 'react', 'javascript', 'interview',
  ],
  'js-interview': [
    'daily-questions', 'advanced-react', 'advanced-reactx',
    'interesting-questions', 'react', 'javascript', 'interview',
  ],
  'it-dev': [
    'spark-ai', 'ai-models', 'ai',
    'spark-habr', 'habr', 'community', 'dev-articles',
    'spark-changelogsfeed', 'changelogs', 'releases', 'changelog',
    'spark-notebooklmai', 'notebooklm-ai', 'notebooklm',
    'spark-xakep', 'xakep', 'hacker',
    'spark-cyber-security', 'cybersec', 'security',
    'spark-youtube-oneday', 'spark-youtube', 'youtube', 'oneday',
  ],
  it_dev: [
    'spark-ai', 'ai-models', 'ai',
    'spark-habr', 'habr', 'community', 'dev-articles',
    'spark-changelogsfeed', 'changelogs', 'releases', 'changelog',
    'spark-notebooklmai', 'notebooklm-ai', 'notebooklm',
    'spark-xakep', 'xakep', 'hacker',
    'spark-cyber-security', 'cybersec', 'security',
    'spark-youtube-oneday', 'spark-youtube', 'youtube', 'oneday',
  ],
  dev: [
    'spark-ai', 'ai-models', 'ai',
    'spark-habr', 'habr', 'community', 'dev-articles',
    'spark-changelogsfeed', 'changelogs', 'releases', 'changelog',
    'spark-notebooklmai', 'notebooklm-ai', 'notebooklm',
    'spark-xakep', 'xakep', 'hacker',
    'spark-cyber-security', 'cybersec', 'security',
    'spark-youtube-oneday', 'spark-youtube', 'youtube', 'oneday',
  ],
  holidays: [
    'russian-holidays', 'russian-official', 'russian-military',
    'orthodox-holidays', 'christian-holidays',
    'world-holidays', 'world-religions', 'catholic-holidays', 'islamic-holidays',
  ],
  seasons: [
    'seasons', 'lemon-seasons', 'seasons-hub', 'diary', 'journal',
  ],
  private_feeds: [
    'private-notes', 'work-vault', 'diary-logs', 'secure-vault',
  ],
  personal_notes: [
    'private-notes', 'diary-logs', 'personal-notes',
  ],
  work_vault: [
    'work-vault', 'confidential',
  ],
  secure_vault: [
    'secure-vault',
  ],
};

export const LEGACY_FEED_SLUG_ALIASES: Record<string, string[]> = {
  'russian-holidays': ['russian-holidays', 'russian-official', 'russian-military'],
  'christian-holidays': ['christian-holidays', 'orthodox-holidays'],
  'orthodox-holidays': ['christian-holidays', 'orthodox-holidays'],
  'world-holidays': ['world-holidays', 'world-religions', 'catholic-holidays', 'islamic-holidays'],
  wiki: ['wiki', 'wiki-history', 'wikipedia'],
  'wiki-history': ['wiki', 'wiki-history', 'wikipedia'],
  marvel: ['marvel', 'mcu', 'mcu-radar', 'marvel-cinematic-universe'],
  cinema: ['cinema', 'movies', 'tmdb', 'films', 'series'],
  music: ['music', 'soundtrack', 'albums', 'музыка', 'my-music'],
  gaming: ['gaming', 'games', 'игры'],
  'spark-ai': ['spark-ai', 'ai-models', 'ai'],
  'spark-habr': ['spark-habr', 'habr', 'community', 'dev-articles'],
  'spark-changelogsfeed': ['spark-changelogsfeed', 'changelogs', 'releases', 'changelog'],
  changelogs: ['spark-changelogsfeed', 'changelogs', 'releases', 'changelog'],
  'spark-notebooklmai': ['spark-notebooklmai', 'notebooklm-ai', 'notebooklm'],
  notebooklm: ['spark-notebooklmai', 'notebooklm-ai', 'notebooklm'],
  'spark-xakep': ['spark-xakep', 'xakep', 'hacker'],
  'spark-cyber-security': ['spark-cyber-security', 'cybersec', 'security'],
  'spark-youtube-oneday': ['spark-youtube-oneday', 'spark-youtube', 'youtube', 'oneday'],
  'hot-daily': [
    'spark-ai', 'spark-habr', 'spark-changelogsfeed', 'spark-notebooklmai',
    'spark-xakep', 'spark-cyber-security', 'spark-youtube-oneday', 'spark-general',
    'spark-ai-economy', 'spark-news-and-frontier', 'spark-world-of-warcraft',
    'spark-политика', 'spark-рф-и-украина',
  ],
  'it-tech': [
    'spark-ai', 'ai-models', 'ai', 'spark-habr', 'habr', 'spark-changelogsfeed',
    'changelogs', 'spark-notebooklmai', 'spark-xakep', 'spark-cyber-security',
    'spark-youtube-oneday',
  ],
  'seasons-hub': ['seasons', 'lemon-seasons', 'daily-logs', 'tech-strategy', 'product-milestones', 'community-stories'],
  'entertainment-hub': ['marvel', 'mcu', 'mcu-radar', 'cinema', 'movies', 'films', 'my-films', 'music', 'my-music', 'games'],
  'holidays-hub': ['russian-holidays', 'orthodox-holidays', 'world-holidays', 'world-religions', 'christian-holidays'],
};
