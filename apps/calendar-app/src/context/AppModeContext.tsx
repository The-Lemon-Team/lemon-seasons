import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AppRuntimeMode } from '@lenta/shared';

export interface AppModeContextValue {
  appMode: AppRuntimeMode;
  setAppMode: (mode: AppRuntimeMode) => void;
  isDev: boolean;
  isStaging: boolean;
  isPublic: boolean;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);

function resolveInitialMode(): AppRuntimeMode {
  if (typeof window !== 'undefined') {
    const sp = new URLSearchParams(window.location.search);
    const param = (sp.get('appMode') || sp.get('mode') || '').toLowerCase();
    if (param === 'dev' || param === 'admin') return 'dev';
    if (param === 'staging') return 'staging';
    if (param === 'public') return 'public';

    const saved = localStorage.getItem('lenta_app_mode')?.toLowerCase();
    if (saved === 'dev' || saved === 'staging' || saved === 'public') {
      return saved as AppRuntimeMode;
    }
  }
  return 'staging';
}

export const AppModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appMode, setAppModeState] = useState<AppRuntimeMode>(resolveInitialMode);

  const setAppMode = useCallback((newMode: AppRuntimeMode) => {
    setAppModeState(newMode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('lenta_app_mode', newMode);
        const url = new URL(window.location.href);
        url.searchParams.set('appMode', newMode);
        window.history.replaceState({}, '', url.toString());
      } catch (err) {
        console.warn('Failed to persist app mode in URL/storage:', err);
      }
    }
  }, []);

  // Sync state if browser back/forward changes the search params
  useEffect(() => {
    const handlePopState = () => {
      const current = resolveInitialMode();
      setAppModeState((prev) => (prev !== current ? current : prev));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const value = useMemo(
    () => ({
      appMode,
      setAppMode,
      isDev: appMode === 'dev',
      isStaging: appMode === 'staging',
      isPublic: appMode === 'public',
    }),
    [appMode, setAppMode]
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
};

const defaultFallbackValue: AppModeContextValue = {
  appMode: 'staging',
  setAppMode: () => {},
  isDev: false,
  isStaging: true,
  isPublic: false,
};

export const useAppMode = (): AppModeContextValue => {
  const ctx = useContext(AppModeContext);
  return ctx || defaultFallbackValue;
};
