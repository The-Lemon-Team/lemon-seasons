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
}) => {
  const { t } = useI18n();
  const { user, isAuthenticated, isAdmin, logout, openAuthModal } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 h-16 bg-[#121414]/90 backdrop-blur-md border-b border-[#242828] w-full">
      {/* Left: Search Field & Mobile Brand */}
      <div className="flex items-center gap-3 flex-1 max-w-xs md:max-w-md">
        {/* Mobile Brand Icon */}
        <div className="flex md:hidden items-center gap-2 mr-1 shrink-0">
          <LemonLogo size={28} />
        </div>

        {/* Search Field */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#93927e]" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] focus:ring-1 focus:ring-[#c9cd58] rounded text-xs font-mono pl-8 pr-3 py-1.5 text-[#e2e2e2] placeholder-[#93927e] outline-none transition-all"
          />
        </div>
      </div>

      {/* Right: Language Switcher & Profile / Auth */}
      <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2 bg-[#1e2020] border border-[#242828] py-1 px-2.5 rounded">
              <div className="w-5 h-5 rounded-full bg-[#c9cd58]/30 border border-[#c9cd58] flex items-center justify-center text-[10px] font-bold text-[#e5e971]">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[11px] font-sans font-semibold text-[#e2e2e2] leading-none">
                  {user?.name}
                </span>
                <span className={`text-[9px] font-mono leading-none mt-0.5 ${isAdmin ? 'text-[#ef4444] font-bold' : 'text-[#c9cd58]'}`}>
                  {isAdmin ? t.adminRole : t.memberRole}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title={t.logout}
              className="p-1.5 rounded bg-[#1e2020] border border-[#242828] hover:border-[#ef4444] text-[#93927e] hover:text-[#fca5a5] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal('login')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#c9cd58] text-[#121414] hover:bg-[#dce06b] font-sans font-bold text-xs shadow-glow-lemon transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t.login}</span>
          </button>
        )}

        {/* Language Switcher Button (Disabled - RU only) */}
        <button
          disabled
          title="Английский язык временно отключен / English is disabled"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#1e2020] border border-[#242828] text-[#93927e] opacity-60 cursor-not-allowed font-mono text-xs font-semibold transition-all"
        >
          <Globe className="w-3.5 h-3.5 text-[#93927e]" />
          <span>RU</span>
        </button>
      </div>
    </header>
  );
};
