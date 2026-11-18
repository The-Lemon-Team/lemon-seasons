import React, { useState, useEffect, useCallback } from 'react';
import { FeedWatchersView } from './FeedWatchersView';

const THEME_STORAGE_KEY = 'lemon_watchers_theme';

export const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light') return false;
    if (saved === 'dark') return true;
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const notesFeedUrl = import.meta.env.VITE_NOTES_FEED_URL || 'http://localhost:5180';

  return (
    <FeedWatchersView
      isDarkMode={isDarkMode}
      toggleTheme={toggleTheme}
      notesFeedUrl={notesFeedUrl}
    />
  );
};
