import React from 'react';
import { CalendarViewMode } from '@lenta/shared';
import {
  Search,
  Globe,
  ShieldCheck,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { LemonLogo } from './LemonLogo';
import { WorkstationSyncBar } from './WorkstationSyncBar';

interface NavbarProps {
  startDate?: string;
  view?: CalendarViewMode;
  search: string;
  isFilterOpen?: boolean;
  activeFilterCount?: number;
  onSetView?: (view: CalendarViewMode) => void;
  onSearchChange: (search: string) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onSelectMonth?: (year: number, monthIndex: number) => void;
  onSelectDate?: (dateKey: string) => void;
  onToday?: () => void;
  onToggleFilter?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  search,
  onSearchChange,
  onSetView,
  view,
}) => {
  const { t } = useI18n();
  const { user, isAuthenticated, isAdmin, logout, openAuthModal } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 lg:px-6 h-14 sm:h-16 bg-white/95 dark:bg-[#121414]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-[#242828] w-full transition-colors">
      {/* Left: Search Field & Mobile Brand */}
      <div className="flex items-center gap-3 flex-1 max-w-xs md:max-w-md">
        {/* Mobile Brand Icon */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onSetView?.('timeline');
          }}
          className="flex md:hidden items-center gap-2 mr-1 shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
          title={t.timeline || "Главная"}
        >
          <LemonLogo size={28} />
        </a>

        {/* Search Field (Hidden in feeds view to prevent redundant double search) */}
        {view !== 'feeds' && (
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#93927e]" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-100/90 dark:bg-[#121414] border border-slate-200/80 dark:border-[#242828] focus:border-[#2481cc] dark:focus:border-[#c9cd58] focus:ring-1 focus:ring-[#2481cc] dark:focus:ring-[#c9cd58] rounded text-xs font-mono pl-8 pr-3 py-1.5 text-slate-800 dark:text-[#e2e2e2] placeholder-slate-400 dark:placeholder-[#93927e] outline-none transition-all"
            />
          </div>
        )}
      </div>

      {/* Right: Sync Status / Viewer Bar, Admin CMS Launcher & Profile */}
      <div className="flex items-center gap-2">
        <WorkstationSyncBar />

        {/* Admin CMS Direct Launcher (Admin Role Only) */}
        {isAdmin && (
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#ef4444]/15 border border-[#ef4444]/60 text-[#fca5a5] hover:bg-[#ef4444]/25 text-xs font-mono text-semibold transition-all shadow-sm"
            title="Перейти в административную панель Admin CMS"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#ef4444]" />
            <span>Admin CMS</span>
          </a>
        )}

        {/* User Profile & Auth Trigger */}
        {isAuthenticated ? (
          <div className="flex items-center gap-2 pl-1">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#1e2020] border border-slate-200/80 dark:border-[#242828] py-1 px-2.5 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-[#2481cc]/15 dark:bg-[#c9cd58]/30 border border-[#2481cc]/30 dark:border-[#c9cd58] flex items-center justify-center text-[10px] font-bold text-[#2481cc] dark:text-[#e5e971]">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[11px] font-sans font-semibold text-slate-800 dark:text-[#e2e2e2] leading-none">
                  {user?.name}
                </span>
                <span className={`text-[9px] font-mono leading-none mt-0.5 ${isAdmin ? 'text-[#ef4444] font-bold' : 'text-[#2481cc] dark:text-[#c9cd58]'}`}>
                  {isAdmin ? t.adminRole : t.memberRole}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title={t.logout}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#1e2020] border border-slate-200/80 dark:border-[#242828] hover:border-[#ef4444] text-slate-500 dark:text-[#93927e] hover:text-[#ef4444] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal('login')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2481cc] dark:bg-[#c9cd58] text-white dark:text-[#121414] hover:bg-[#1e6cb0] dark:hover:bg-[#dce06b] font-sans font-bold text-xs shadow-xs transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t.login}</span>
          </button>
        )}

        {/* Language Switcher Button (Disabled - RU only) */}
        <button
          disabled
          title="Английский язык временно отключен / English is disabled"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1e2020] border border-slate-200/80 dark:border-[#242828] text-slate-400 dark:text-[#93927e] opacity-60 cursor-not-allowed font-mono text-xs font-semibold transition-all"
        >
          <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-[#93927e]" />
          <span>RU</span>
        </button>
      </div>
    </header>
  );
};
