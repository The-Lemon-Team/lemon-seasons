import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AppRuntimeMode } from '@lenta/shared';
import { setCalendarAppMode } from '../api/client';

export interface AppModeContextValue {
  appMode: AppRuntimeMode;
  setAppMode: (mode: AppRuntimeMode) => void;
  isDev: boolean;
  isStaging: boolean;
  isPublic: boolean;
  isPublicEnv: boolean;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);

export function isPublicEnvironment(): boolean {
  if (typeof window !== 'undefined') {
    if (window.location.port === '5176') {
      return true;
    }
  }
  const envMode = (
    import.meta.env.VITE_APP_MODE ||
    import.meta.env.MODE ||
    ''
  ).toLowerCase();
  return envMode === 'public';
}

function resolveInitialMode(): AppRuntimeMode {
  let resolved: AppRuntimeMode = isPublicEnvironment() ? 'public' : 'dev';
  if (typeof window !== 'undefined' && !isPublicEnvironment()) {
    const sp = new URLSearchParams(window.location.search);
    const param = (sp.get('appMode') || sp.get('mode') || '').toLowerCase();
    if (param === 'dev' || param === 'admin') resolved = 'dev';
    else if (param === 'staging') resolved = 'staging';
    else if (param === 'public') resolved = 'public';
    else {
      const saved = localStorage.getItem('lenta_app_mode')?.toLowerCase();
      if (saved === 'dev' || saved === 'staging' || saved === 'public') {
        resolved = saved as AppRuntimeMode;
      }
    }
  }
  setCalendarAppMode(resolved);
  return resolved;
}

export const AppModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appMode, setAppModeState] = useState<AppRuntimeMode>(resolveInitialMode);

  const setAppMode = useCallback((newMode: AppRuntimeMode) => {
    setAppModeState(newMode);
    setCalendarAppMode(newMode);
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
      setCalendarAppMode(current);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isPublicEnv = isPublicEnvironment();

  const value = useMemo(
    () => ({
      appMode,
      setAppMode,
      isDev: appMode === 'dev',
      isStaging: appMode === 'staging',
      isPublic: appMode === 'public',
      isPublicEnv,
    }),
    [appMode, setAppMode, isPublicEnv]
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
};

const defaultFallbackValue: AppModeContextValue = {
  appMode: 'dev',
  setAppMode: () => {},
  isDev: true,
  isStaging: false,
  isPublic: false,
  isPublicEnv: false,
};

export const useAppMode = (): AppModeContextValue => {
  const ctx = useContext(AppModeContext);
  return ctx || defaultFallbackValue;
};
