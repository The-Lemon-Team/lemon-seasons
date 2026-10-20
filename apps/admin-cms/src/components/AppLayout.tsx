import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppTopBar } from './AppTopBar';
import { QuickAddModal } from './QuickAddModal';
import { ErrorBoundary } from './common/ErrorBoundary';

export const AppLayout: React.FC = () => {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lenta_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [sidebarVerticalCollapsed, setSidebarVerticalCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lenta_admin_sidebar_vertical_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lenta_admin_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const toggleSidebarVertical = () => {
    setSidebarVerticalCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lenta_admin_sidebar_vertical_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/notes?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  return (
    <div
      className={`bg-platform text-on-surface font-sans antialiased h-screen w-screen overflow-hidden flex p-2 sm:p-2.5 md:p-3 gap-2 sm:gap-2.5 md:gap-3 select-none transition-colors duration-200 ${
        sidebarVerticalCollapsed ? 'flex-col' : 'flex-row'
      }`}
    >
      {/* Top Header Row when Vertically Folded */}
      {sidebarVerticalCollapsed ? (
        <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 shrink-0">
          <AppSidebar
            collapsed={sidebarCollapsed}
            verticalCollapsed={true}
            onToggle={toggleSidebar}
            onToggleVertical={toggleSidebarVertical}
            onOpenQuickAdd={() => setQuickAddOpen(true)}
          />
          <div className="flex-1 min-w-0">
            <AppTopBar
              globalSearch={globalSearch}
              onSearchChange={setGlobalSearch}
              onSearchSubmit={handleSearchSubmit}
            />
          </div>
        </div>
      ) : (
        /* Detached Floating Sidebar (Left Column) */
        <AppSidebar
          collapsed={sidebarCollapsed}
          verticalCollapsed={false}
          onToggle={toggleSidebar}
          onToggleVertical={toggleSidebarVertical}
          onOpenQuickAdd={() => setQuickAddOpen(true)}
        />
      )}

      {/* Main Container */}
      <div className="flex-1 h-full min-h-0 flex flex-col gap-2 sm:gap-2.5 md:gap-3 overflow-hidden">
        {/* Detached Floating TopAppBar (when not in vertical-folded row mode) */}
        {!sidebarVerticalCollapsed && (
          <AppTopBar
            globalSearch={globalSearch}
            onSearchChange={setGlobalSearch}
            onSearchSubmit={handleSearchSubmit}
          />
        )}

        {/* Detached Floating Page Content Canvas */}
        <main className="flex-1 h-full min-h-0 overflow-hidden rounded-2xl bg-canvas border border-panel shadow-panel p-2.5 sm:p-3 flex flex-col relative transition-all duration-200">
          <div className="flex-1 min-h-0 h-full w-full flex flex-col overflow-hidden">
            <ErrorBoundary fallbackTitle="Ошибка отображения страницы">
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Global Quick Add Modal */}
      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
};
