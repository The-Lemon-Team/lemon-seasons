import React, { useState } from 'react';
import { ExternalLink, RefreshCw, Radio, Columns, Maximize2 } from 'lucide-react';

interface FeedAppMicrofrontendProps {
  initialRoute?: string;
}

export const FeedAppMicrofrontend: React.FC<FeedAppMicrofrontendProps> = ({
  initialRoute = 'spark',
}) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'split' | 'stream'>('split');

  // In local browser, feed-app runs on 5175
  const feedAppBase = import.meta.env.VITE_FEED_APP_URL || 'http://localhost:5175';
  const queryParams = new URLSearchParams({
    embed: 'true',
    layout: layoutMode,
  });
  const pathSegment = initialRoute === 'spark' ? '' : initialRoute;
  const feedAppUrl = `${feedAppBase}/${pathSegment}?${queryParams.toString()}`;

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleSelectLayout = (mode: 'split' | 'stream') => {
    if (mode === layoutMode) return;
    setIsLoading(true);
    setLayoutMode(mode);
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
            href={feedAppUrl}
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
          key={iframeKey}
          src={feedAppUrl}
          title="Lenta Feed App Microfrontend"
          className="w-full h-full border-0 min-h-[780px]"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
};
