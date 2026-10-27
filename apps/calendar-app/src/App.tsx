import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { Note, CalendarViewMode } from '@lenta/shared';
import { I18nProvider } from './i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useCalendarState } from './hooks/useCalendarState';
import { useTimeSliceNotes } from './api/queries';
import { SideNavBar } from './components/SideNavBar';
import { Navbar } from './components/Navbar';
import { FilterSidebar } from './components/FilterSidebar';
import { TimelineView } from './components/TimelineView';
import { AuthModal } from './components/AuthModal';
import { FoldersProvider } from './context/FoldersContext';
import { AppModeProvider, useAppMode } from './context/AppModeContext';
import { UserKeysProvider } from './context/UserKeysContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const MonthGridView = lazy(() => import('./components/MonthGridView').then((m) => ({ default: m.MonthGridView })));
const GanttView = lazy(() => import('./components/GanttView').then((m) => ({ default: m.GanttView })));
const FeedsHubView = lazy(() => import('./components/FeedsHubView').then((m) => ({ default: m.FeedsHubView })));
const FolderManagerView = lazy(() => import('./components/FolderManagerView').then((m) => ({ default: m.FolderManagerView })));
const LandingPage = lazy(() => import('./components/LandingPage').then((m) => ({ default: m.LandingPage })));
const NoteDetailModal = lazy(() => import('./components/NoteDetailModal').then((m) => ({ default: m.NoteDetailModal })));
const CreateNoteModal = lazy(() => import('./components/CreateNoteModal').then((m) => ({ default: m.CreateNoteModal })));
const AiQuickAddModal = lazy(() => import('./components/AiQuickAddModal').then((m) => ({ default: m.AiQuickAddModal })));
const KeyManagementModal = lazy(() => import('./components/KeyManagementModal').then((m) => ({ default: m.KeyManagementModal })));

const CalendarAppInner: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { appMode, setAppMode } = useAppMode();
  const {
    filters,
    setStartDate,
    setView,
    setSearch,
    setAuthor,
    setCurator,
    selectFeed,
    toggleFeed,
    selectOnlyFeed,
    clearFeeds,
    toggleTag,
    selectOnlyTag,
    clearTags,
    toggleHashtag,
    toggleType,
    selectOnlyType,
    clearTypes,
    resetFilters,
    prevMonth,
    nextMonth,
    setToday,
    setMonthAndYear,
    setMonthDate,
  } = useCalendarState();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [isAiQuickAddOpen, setIsAiQuickAddOpen] = useState(false);
  const [isKeysModalOpen, setIsKeysModalOpen] = useState(false);

  const isCalendarView = ['timeline', 'month', 'gantt'].includes(filters.view);

  const handleSetView = (newView: CalendarViewMode) => {
    if (!['timeline', 'month', 'gantt'].includes(newView)) {
      setIsFilterOpen(false);
    }
    setView(newView);
  };

  // Listen for navigation messages from embedded microfrontends (e.g. Feed App toolbar buttons)
  useEffect(() => {
    const handleGlobalMessage = (event: MessageEvent) => {
      if (event.data?.type === 'LENTA_HOST_NAVIGATE') {
        const targetView = event.data.payload?.view;
        if (targetView === 'timeline' || targetView === 'month' || targetView === 'gantt' || targetView === 'feeds' || targetView === 'folders') {
          handleSetView(targetView);
        }
      }
    };
    window.addEventListener('message', handleGlobalMessage);
    return () => window.removeEventListener('message', handleGlobalMessage);
  }, []);

  // Scoped query filters: Calendar filters (tags, hashtags, types) strictly apply to Calendar pages only
  const effectiveQueryFilters = useMemo(() => {
    if (isCalendarView) {
      return {
        ...filters,
        appMode,
      };
    }
    if (filters.view === 'feeds') {
      return {
        start: filters.start,
        end: filters.end,
        view: filters.view,
        feed: undefined, // Cached full notes in memory: instant 0ms tab switches without network flickering
        search: filters.search,
        tags: [],
        hashtags: [],
        types: [],
        appMode,
      };
    }
    return {
      start: filters.start,
      end: filters.end,
      view: filters.view,
      search: filters.search,
      feed: undefined,
      tags: [],
      hashtags: [],
      types: [],
      appMode,
    };
  }, [isCalendarView, filters, appMode]);

  // Queries
  const { data: notesData, isLoading: isNotesLoading } = useTimeSliceNotes(effectiveQueryFilters);

  const notes = notesData?.items || [];

  // Active filter count for badge (strictly for Calendar pages)
  const activeFilterCount = isCalendarView
    ? (filters.feed ? 1 : 0) +
      filters.tags.length +
      filters.hashtags.length +
      filters.types.length +
      ((filters.author || filters.curator) ? 1 : 0) +
      (filters.search ? 1 : 0)
    : 0;

  // Tier 1: Public Users (Not Logged In) -> Presentation Landing Page with Interactive Widget
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<div className="h-screen w-screen bg-[#121414]" />}>
        <LandingPage />
        <AuthModal />
      </Suspense>
    );
  }

  // Tier 2 & 3: Logged In Members & Admins -> Full Workspace Application
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121414] text-[#e2e2e2] transition-colors">
      {/* 1. Left SideNavBar */}
      <SideNavBar
        currentView={filters.view}
        onSetView={handleSetView}
        onOpenQuickAdd={() => setIsCreateNoteOpen(true)}
        onOpenAiQuickAdd={() => setIsAiQuickAddOpen(true)}
        onOpenKeysModal={() => setIsKeysModalOpen(true)}
        onToggleFilters={() => setIsFilterOpen((prev) => !prev)}
        isFilterOpen={isFilterOpen}
        activeFilterCount={activeFilterCount}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col md:ml-64 h-full relative overflow-hidden min-h-0 bg-[#121414]">
        {/* Top App Bar */}
        <Navbar
          startDate={filters.start}
          view={filters.view}
          search={filters.search}
          isFilterOpen={isFilterOpen}
          activeFilterCount={activeFilterCount}
          onSetView={handleSetView}
          onSearchChange={setSearch}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          onSelectMonth={setMonthAndYear}
          onSelectDate={setMonthDate}
          onToday={setToday}
          onToggleFilter={() => setIsFilterOpen((prev) => !prev)}
        />

        {/* View Content Canvas */}
        <main className="flex-1 flex overflow-hidden relative min-h-0 bg-[#121414]">
          <ErrorBoundary fallbackTitle="View Failed to Render">
            <Suspense fallback={<div className="flex-1 bg-[#121414]" />}>
            {filters.view === 'timeline' && (
              <TimelineView
                notes={notes}
                isLoading={isNotesLoading}
                onSelectNote={setSelectedNote}
                filterState={filters}
                onSelectAuthor={setAuthor}
                onSelectCurator={setCurator}
                onToggleFeed={toggleFeed}
                onSelectOnlyFeed={selectOnlyFeed}
                onClearFeeds={clearFeeds}
                onOpenFeedsHub={() => handleSetView('feeds')}
                onToggleType={toggleType}
                onSelectOnlyType={selectOnlyType}
                onClearTypes={clearTypes}
                onToggleTag={toggleTag}
                onSelectOnlyTag={selectOnlyTag}
                onClearTags={clearTags}
                onResetFilters={resetFilters}
              />
            )}

            {filters.view === 'month' && (
              <MonthGridView
                notes={notes}
                startDate={filters.start}
                filterState={filters}
                onSelectNote={setSelectedNote}
                onSelectAuthor={setAuthor}
                onSelectCurator={setCurator}
                onSelectDay={(dateKey) => {
                  setStartDate(dateKey);
                  handleSetView('timeline');
                }}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
                onSelectMonth={setMonthAndYear}
                onToday={setToday}
                onToggleFeed={toggleFeed}
                onSelectOnlyFeed={selectOnlyFeed}
                onClearFeeds={clearFeeds}
                onOpenFeedsHub={() => handleSetView('feeds')}
                onToggleType={toggleType}
                onSelectOnlyType={selectOnlyType}
                onClearTypes={clearTypes}
                onToggleTag={toggleTag}
                onSelectOnlyTag={selectOnlyTag}
                onClearTags={clearTags}
                onToggleHashtag={toggleHashtag}
                onResetFilters={resetFilters}
                onOpenFilterDrawer={() => setIsFilterOpen(true)}
              />
            )}

            {filters.view === 'gantt' && (
              <GanttView
                notes={notes}
                startDate={filters.start}
                endDate={filters.end}
                isLoading={isNotesLoading}
                onSelectNote={setSelectedNote}
              />
            )}

            {filters.view === 'feeds' && (
              <FeedsHubView
                notes={notes}
                isLoading={isNotesLoading}
                appMode={appMode}
                onAppModeChange={setAppMode}
                selectedFeed={filters.feed}
                startDate={filters.start}
                endDate={filters.end}
                onSelectFeed={selectFeed}
                onToggleFeed={toggleFeed}
                onSelectOnlyFeed={selectOnlyFeed}
                onClearFeed={clearFeeds}
                onClearFeeds={clearFeeds}
                onSelectNote={setSelectedNote}
                onNavigateToTimeline={() => handleSetView('timeline')}
                onNavigateToCalendar={() => handleSetView('month')}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
                onSelectMonth={setMonthAndYear}
                onSelectDate={setMonthDate}
                onToday={setToday}
              />
            )}

            {filters.view === 'folders' && (
              <FolderManagerView />
            )}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* 3. Filter Sidebar Drawer (Calendar views only) */}
      {isCalendarView && (
        <FilterSidebar
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          filterState={filters}
          onSelectAuthor={setAuthor}
                onSelectCurator={setCurator}
          onSelectFeed={selectFeed}
          onToggleFeed={toggleFeed}
          onSelectOnlyFeed={selectOnlyFeed}
          onClearFeed={clearFeeds}
          onClearFeeds={clearFeeds}
          onToggleTag={toggleTag}
          onToggleHashtag={toggleHashtag}
          onToggleType={toggleType}
          onResetFilters={resetFilters}
        />
      )}

      {/* 4. Lazy-loaded Modals */}
      <Suspense fallback={null}>
        {selectedNote && (
          <NoteDetailModal
            note={selectedNote}
            onClose={() => setSelectedNote(null)}
          />
        )}

        {isCreateNoteOpen && (
          <CreateNoteModal
            isOpen={isCreateNoteOpen}
            onClose={() => setIsCreateNoteOpen(false)}
          />
        )}

        {isAiQuickAddOpen && (
          <AiQuickAddModal
            isOpen={isAiQuickAddOpen}
            onClose={() => setIsAiQuickAddOpen(false)}
            defaultDate={filters.start}
          />
        )}

        {isKeysModalOpen && (
          <KeyManagementModal
            isOpen={isKeysModalOpen}
            onClose={() => setIsKeysModalOpen(false)}
          />
        )}
      </Suspense>

      {/* 7. Auth Modal */}
      <AuthModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <AuthProvider>
        <UserKeysProvider>
          <AppModeProvider>
            <FoldersProvider>
              <CalendarAppInner />
            </FoldersProvider>
          </AppModeProvider>
        </UserKeysProvider>
      </AuthProvider>
    </I18nProvider>
  );
};

export default App;
