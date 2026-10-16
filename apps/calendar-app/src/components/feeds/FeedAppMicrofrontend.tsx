import React, { useState } from 'react';
import { ExternalLink, RefreshCw, Radio } from 'lucide-react';

interface FeedAppMicrofrontendProps {
  initialRoute?: string;
}

export const FeedAppMicrofrontend: React.FC<FeedAppMicrofrontendProps> = ({
  initialRoute = 'spark',
}) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // In local browser, feed-app runs on 5175
  const feedAppUrl = `http://localhost:5175/${initialRoute === 'spark' ? '' : initialRoute}`;

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col min-h-0 bg-[#0e1621] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl">
      {/* Microfrontend Control Header */}
      <div className="px-4 py-2.5 bg-[#131b24] border-b border-white/[0.08] flex items-center justify-between gap-3 text-xs font-mono shrink-0">
        <div className="flex items-center gap-2 text-slate-300">
          <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="font-semibold text-white">Микрофронтенд: Lenta Feed App</span>
          <span className="text-[#8292a2] hidden sm:inline">• standalone на :5175</span>
        </div>

        <div className="flex items-center gap-2">
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
      <div className="flex-1 w-full h-full relative min-h-[600px]">
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
          className="w-full h-full border-0 min-h-[650px]"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
};
