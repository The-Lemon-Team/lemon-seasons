import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { QuickAddModal } from './QuickAddModal';
import { useSyncChanges } from '../api/queries';

export const AppLayout: React.FC = () => {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const { data: syncData, isFetching: isSyncing } = useSyncChanges();

  const getPageTitle = () => {
    if (location.pathname.startsWith('/feeds')) return 'Feeds';
    if (location.pathname.startsWith('/notes')) return 'All Notes';
    if (location.pathname.startsWith('/taxonomy')) return 'Taxonomy Tree';
    if (location.pathname.startsWith('/sync')) return 'Sync Hub';
    return 'Lenta Dashboard';
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/notes?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  return (
    <div className="bg-background text-on-surface font-sans antialiased min-h-screen flex">
      {/* SideNavBar (Fixed 240px) */}
      <aside className="bg-surface-container border-r border-white/5 fixed h-full w-[240px] left-0 top-0 flex flex-col py-6 z-50 select-none">
        {/* Brand Header */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <img
              alt="Lemon Seasons Logo"
              className="w-9 h-9 rounded-full object-cover border border-outline-variant/60 shadow-sm"
              src="/logo.png"
            />
            <div>
              <h2 className="font-sans font-bold text-[15px] text-primary leading-tight tracking-tight">
                Lemon Seasons
              </h2>
              <p className="font-mono text-[11px] text-on-surface-variant/80">Technical Admin</p>
            </div>
          </div>

          {/* Quick Add Button */}
          <button
            onClick={() => setQuickAddOpen(true)}
            className="w-full bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary rounded py-2 px-4 font-sans text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] group-hover:rotate-90 transition-transform duration-200">
              add
            </span>
            Quick Add
          </button>
        </div>

        {/* Primary Navigation Links */}
        <nav className="flex-1 px-3 space-y-1">
          <NavLink
            to="/feeds"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded text-sm transition-all duration-200 ${
                isActive
                  ? 'text-primary font-bold bg-white/5 scale-[0.98]'
                  : 'text-on-surface-variant font-normal hover:bg-white/5 hover:text-on-surface'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">dynamic_feed</span>
            Feeds
          </NavLink>

          <NavLink
            to="/notes"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded text-sm transition-all duration-200 ${
                isActive
                  ? 'text-primary font-bold bg-white/5 scale-[0.98]'
                  : 'text-on-surface-variant font-normal hover:bg-white/5 hover:text-on-surface'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">description</span>
            All Notes
          </NavLink>

          <NavLink
            to="/taxonomy"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded text-sm transition-all duration-200 ${
                isActive
                  ? 'text-primary font-bold bg-white/5 scale-[0.98]'
                  : 'text-on-surface-variant font-normal hover:bg-white/5 hover:text-on-surface'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">account_tree</span>
            Taxonomy
          </NavLink>

          <NavLink
            to="/sync"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded text-sm transition-all duration-200 ${
                isActive
                  ? 'text-primary font-bold bg-white/5 scale-[0.98]'
                  : 'text-on-surface-variant font-normal hover:bg-white/5 hover:text-on-surface'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">sync</span>
            Sync Hub
          </NavLink>
        </nav>

        {/* Sync Status Widget in Sidebar */}
        <div className="px-4 py-3 mx-3 mb-4 rounded bg-surface-container-low border border-white/5 text-xs font-mono">
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="flex items-center gap-1.5 text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSyncing ? 'bg-secondary animate-pulse' : 'bg-tertiary'
                }`}
              />
              Obsidian Sync
            </span>
            <span className="text-[10px] text-outline">v1.0</span>
          </div>
          <p className="text-[11px] text-outline/80 truncate">
            {syncData?.counts
              ? `${syncData.counts.notes} notes synced`
              : 'Sync ready'}
          </p>
        </div>

        {/* Footer Navigation Links */}
        <div className="px-3 border-t border-white/5 pt-3 space-y-1">
          <a
            href="http://localhost:3001/api/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-3.5 py-2 rounded text-sm text-on-surface-variant font-normal hover:bg-white/5 hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            API Docs
          </a>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 ml-[240px] flex flex-col min-h-screen">
        {/* TopAppBar */}
        <header className="fixed top-0 right-0 w-[calc(100%-240px)] z-40 bg-background/80 backdrop-blur-md border-b border-white/5 flex justify-between items-center h-16 px-8">
          <div className="flex items-center gap-4">
            <h1 className="font-sans font-bold text-lg text-primary tracking-tight">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-5">
            {/* Global Search */}
            <form onSubmit={handleSearchSubmit} className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[18px]">
                search
              </span>
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search notes, feeds..."
                className="bg-surface-container-high border border-outline-variant/50 rounded pl-9 pr-3 py-1.5 text-xs font-sans text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-56 transition-all"
              />
            </form>

            <button
              onClick={() => navigate('/sync')}
              className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-white/5 relative"
              title="Sync Status"
            >
              <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </button>

            {/* Profile Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <img
                className="w-8 h-8 rounded-full border border-outline-variant/60 object-cover"
                src="/logo.png"
                alt="Profile"
              />
              <span className="font-mono text-xs text-on-surface-variant hidden md:inline">
                admin
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Canvas */}
        <main className="mt-16 p-6 flex-1 w-full max-w-[1440px] mx-auto overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Quick Add Modal */}
      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
};
