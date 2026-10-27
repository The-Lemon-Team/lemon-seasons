import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ExternalLink, RefreshCw, Radio, Columns, Maximize2, ShieldCheck } from 'lucide-react';
import { MicrofrontendMessage, MicrofrontendAuthSyncPayload, AppRuntimeMode } from '@lenta/shared';
import { useAuth } from '../../context/AuthContext';
import { useUserKeys } from '../../context/UserKeysContext';

interface FeedAppMicrofrontendProps {
  appMode?: AppRuntimeMode;
  onAppModeChange?: (mode: AppRuntimeMode) => void;
  initialRoute?: string;
  startDate?: string;
  endDate?: string;
  onNavigate?: (payload: {
    url?: string;
    pathname?: string;
    streamSource?: string;
    selectedFeedSlug?: string;
    subtopicSlug?: string;
    noteId?: string;
  }) => void;
  onHostNavigate?: (view: string) => void;
}

function computeFeedAppUrl(
  feedAppBase: string,
  route: string,
  layoutMode: 'split' | 'stream',
  startDate?: string,
  endDate?: string,
  appMode?: string
): string {
  try {
    const cleanRoute = route.startsWith('/') ? route.slice(1) : route;
    const url = new URL(cleanRoute === 'all' || cleanRoute === '' ? '' : cleanRoute, `${feedAppBase.replace(/\/+$/, '')}/`);
    url.searchParams.set('embed', 'true');
    url.searchParams.set('layout', layoutMode);
    if (appMode) url.searchParams.set('appMode', appMode);
    if (startDate) url.searchParams.set('startDate', startDate);
    if (endDate) url.searchParams.set('endDate', endDate);
    return url.toString();
  } catch {
    const cleanPath = route === 'all' ? '' : route;
    const separator = cleanPath.includes('?') ? '&' : '?';
    const modeParam = appMode ? `&appMode=${encodeURIComponent(appMode)}` : '';
    const dateParams = `${startDate ? `&startDate=${encodeURIComponent(startDate)}` : ''}${endDate ? `&endDate=${encodeURIComponent(endDate)}` : ''}`;
    return `${feedAppBase}/${cleanPath}${separator}embed=true&layout=${layoutMode}${modeParam}${dateParams}`;
  }
}

export const FeedAppMicrofrontend: React.FC<FeedAppMicrofrontendProps> = ({
  initialRoute = 'all',
  startDate,
  endDate,
  appMode,
  onAppModeChange,
  onNavigate,
  onHostNavigate,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'split' | 'stream'>('split');
  const [isAuthSynced, setIsAuthSynced] = useState(false);

  const { user, token } = useAuth();
  const { keys } = useUserKeys();

  // In local browser, feed-app runs on 5175
  const feedAppBase = import.meta.env.VITE_FEED_APP_URL || 'http://localhost:5175';

  // Last route synchronized between iframe and host to prevent redundant re-renders or infinite loops
  const lastReportedRouteRef = useRef<string>(initialRoute);
  // Stable initial iframe src that does not change on in-iframe navigation (prevents iframe reloads)
  const initialSrcRef = useRef<string>(
    computeFeedAppUrl(feedAppBase, initialRoute, layoutMode, startDate, endDate, appMode)
  );

  const fullscreenUrl = useMemo(() => {
    const currentRoute = lastReportedRouteRef.current || initialRoute;
    return computeFeedAppUrl(feedAppBase, currentRoute, layoutMode, startDate, endDate);
  }, [feedAppBase, initialRoute, layoutMode, startDate, endDate, appMode]);

  const sendAuthSync = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;

    let targetOrigin = '*';
    try {
      targetOrigin = new URL(feedAppBase).origin;
    } catch {
      targetOrigin = '*';
    }

    const activeUserKey = keys.find((k) => !k.isRevoked)?.key || null;

    const message: MicrofrontendMessage<MicrofrontendAuthSyncPayload> = {
      type: 'LENTA_AUTH_SYNC',
      source: 'lenta-calendar-app',
      payload: {
        token: token || (user ? `lenta_tok_${user.role}_${user.id}` : null),
        user: user
          ? {
              id: user.id,
              role: user.role,
              name: user.name,
              email: user.email,
            }
          : null,
        userKey: activeUserKey,
      },
    };

    iframeRef.current.contentWindow.postMessage(message, targetOrigin);
    setIsAuthSynced(true);
  }, [feedAppBase, token, user, keys]);

  // Listen for handshake and navigation events from embedded microfrontend
  useEffect(() => {
    let expectedOrigin = '';
    try {
      expectedOrigin = new URL(feedAppBase).origin;
    } catch {
      expectedOrigin = '';
    }

    const handleMessage = (event: MessageEvent) => {
      if (expectedOrigin && event.origin !== expectedOrigin && event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'LENTA_AUTH_REQUEST') {
        sendAuthSync();
      }

      if (event.data?.type === 'LENTA_FEED_NAVIGATE') {
        const payload = event.data.payload || {};
        const cleanPath = (payload.pathname || '').replace(/^\/+/, '');
        const reported = `${cleanPath}${payload.noteId ? (cleanPath.includes('?') ? '&' : '?') + 'note=' + payload.noteId : ''}`;
        lastReportedRouteRef.current = reported || 'all';
        onNavigate?.(payload);
      }

            if (event.data?.type === 'LENTA_APP_MODE_CHANGED') {
        const newMode = event.data.payload?.appMode;
        if (newMode && onAppModeChange) {
          onAppModeChange(newMode);
        }
      }

      if (event.data?.type === 'LENTA_HOST_NAVIGATE') {
        const targetView = event.data.payload?.view;
        if (targetView && onHostNavigate) {
          onHostNavigate(targetView);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [feedAppBase, sendAuthSync, onNavigate, onHostNavigate, onAppModeChange]);

  // Synchronize changes to initialRoute coming from the host (browser back/forward) to child without iframe reload
  useEffect(() => {
    const cleanRoute = (initialRoute || 'all').replace(/^\/?feeds\/?/i, '').replace(/^\/+/, '');
    const cleanLast = (lastReportedRouteRef.current || 'all').replace(/^\/?feeds\/?/i, '').replace(/^\/+/, '');

    if (cleanRoute !== cleanLast) {
      lastReportedRouteRef.current = cleanRoute;
      if (iframeRef.current?.contentWindow) {
        let targetOrigin = '*';
        try {
          targetOrigin = new URL(feedAppBase).origin;
        } catch {
          targetOrigin = '*';
        }
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'LENTA_NAVIGATE_FEED',
            payload: { route: cleanRoute },
          },
          targetOrigin
        );
      }
    }
  }, [initialRoute, feedAppBase]);

    // Push updated appMode to embedded feed-app
  useEffect(() => {
    if (!iframeRef.current?.contentWindow || !appMode) return;
    let targetOrigin = '*';
    try {
      targetOrigin = new URL(feedAppBase).origin;
    } catch {
      targetOrigin = '*';
    }
    iframeRef.current.contentWindow.postMessage(
      {
        type: 'LENTA_SET_APP_MODE',
        source: 'lenta-calendar-app',
        payload: { appMode },
      },
      targetOrigin
    );
  }, [appMode, feedAppBase]);

  // Push updated auth whenever user or session changes
  useEffect(() => {
    if (!isLoading) {
      sendAuthSync();
    }
  }, [sendAuthSync, isLoading]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    sendAuthSync();
    setTimeout(sendAuthSync, 250);
  };

  const handleReload = () => {
    setIsLoading(true);
    setIsAuthSynced(false);
    initialSrcRef.current = computeFeedAppUrl(
      feedAppBase,
      lastReportedRouteRef.current || initialRoute,
      layoutMode,
      startDate,
      endDate
    );
    setIframeKey((prev) => prev + 1);
  };

  const handleSelectLayout = (mode: 'split' | 'stream') => {
    if (mode === layoutMode) return;
    setIsLoading(true);
    setLayoutMode(mode);
    initialSrcRef.current = computeFeedAppUrl(
      feedAppBase,
      lastReportedRouteRef.current || initialRoute,
      mode,
      startDate,
      endDate
    );
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col min-h-0 bg-[#0e1621] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl">
      {/* Microfrontend Control Header */}
      <div className="px-4 py-2.5 bg-[#131b24] border-b border-white/[0.08] flex items-center justify-between gap-3 text-xs font-mono shrink-0">
        <div className="flex items-center gap-2 text-slate-300">
          <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="font-semibold text-white">Микрофронтенд: Lenta Feed App</span>
          <span className="text-[#8292a2] hidden sm:inline">• :5175</span>

          {isAuthSynced && user && (
            <span
              className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]"
              title={`Токен авторизации передан через postMessage для пользователя ${user.name}`}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Токен синхронизирован ({user.role})</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Layout Mode selector: Split with rail vs Stream-only */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 text-[11px]">
            <button
              onClick={() => handleSelectLayout('split')}
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                layoutMode === 'split'
                  ? 'bg-[#2481cc]/30 text-[#64b5f6] font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Лента с боковым сайдбаром (Сетка)"
            >
              <Columns className="w-3 h-3" />
              <span className="hidden sm:inline">Сетка</span>
            </button>
            <button
              onClick={() => handleSelectLayout('stream')}
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                layoutMode === 'stream'
                  ? 'bg-[#2481cc]/30 text-[#64b5f6] font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Только лента без сайдбара"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden sm:inline">Только лента</span>
            </button>
          </div>

          <button
            onClick={handleReload}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors flex items-center gap-1 text-[11px]"
            title="Перезагрузить микрофронтенд"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Обновить</span>
          </button>

          <a
            href={fullscreenUrl}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-lg bg-[#2481cc]/20 hover:bg-[#2481cc]/30 text-[#64b5f6] border border-[#2481cc]/40 transition-colors flex items-center gap-1.5 text-[11px] font-semibold"
            title="Открыть feed-app в новом окне"
          >
            <span>На весь экран</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Embedded Iframe Container */}
      <div className="flex-1 w-full h-[calc(100vh-180px)] min-h-[780px] relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0e1621] text-slate-400 gap-2">
            <Radio className="w-6 h-6 animate-pulse text-[#2481cc]" />
            <span className="text-xs font-mono">Подключение к микрофронтенду Feed App...</span>
          </div>
        )}
        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={initialSrcRef.current}
          title="Lenta Feed App Microfrontend"
          className="w-full h-full border-0 min-h-[780px]"
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  );
};
