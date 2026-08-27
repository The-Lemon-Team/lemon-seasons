import React, { useState, useMemo } from 'react';
import { Note, CalendarViewMode } from '@lenta/shared';
import { I18nProvider } from './i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useCalendarState } from './hooks/useCalendarState';
import { useTimeSliceNotes } from './api/queries';
import { SideNavBar } from './components/SideNavBar';
import { Navbar } from './components/Navbar';
import { FilterSidebar } from './components/FilterSidebar';
import { TimelineView } from './components/TimelineView';
import { MonthGridView } from './components/MonthGridView';
import { GanttView } from './components/GanttView';
import { FeedsHubView } from './components/FeedsHubView';
import { NoteDetailModal } from './components/NoteDetailModal';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { CreateNoteModal } from './components/CreateNoteModal';
import { PrivateContainersModal } from './components/PrivateContainersModal';
import { KeyManagementModal } from './components/KeyManagementModal';
import { ObsidianContainersView } from './components/ObsidianContainersView';
import { FolderManagerView } from './components/FolderManagerView';
import { useObsidianContainers, ObsidianContainersProvider } from './context/ObsidianContainersContext';
import { FoldersProvider } from './context/FoldersContext';
import { UserKeysProvider } from './context/UserKeysContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const CalendarAppInner: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { containers: obsidianContainers = [] } = useObsidianContainers();
  const {
    filters,
    setStartDate,
    setView,
    setSearch,
    selectFeed,
    toggleFeed,
    selectOnlyFeed,
    clearFeeds,
    toggleContainer,
    selectOnlyContainer,
    clearContainers,
    toggleObsidianFolder,
    selectOnlyObsidianFolder,
    setObsidianFolders,
    clearObsidianFolders,
    toggleTag,
    selectOnlyTag,
    setAllTags,
    clearTags,
    toggleHashtag,
    selectOnlyHashtag,
    setAllHashtags,
    clearHashtags,
    toggleType,
    selectOnlyType,
    setAllTypes,
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
  const [isPrivateContainersOpen, setIsPrivateContainersOpen] = useState(false);
  const [isKeysModalOpen, setIsKeysModalOpen] = useState(false);

  const [selectedSingleContainerId, setSelectedSingleContainerId] = useState<string | null>(null);

  const isCalendarView = ['timeline', 'month', 'gantt'].includes(filters.view);

  const handleSetView = (newView: CalendarViewMode) => {
    setSelectedSingleContainerId(null);
    if (!['timeline', 'month', 'gantt'].includes(newView)) {
      setIsFilterOpen(false);
    }
    setView(newView);
  };

  // Scoped query filters: Calendar filters (tags, hashtags, types, containers) strictly apply to Calendar pages only
  const effectiveQueryFilters = useMemo(() => {
    if (isCalendarView) {
      return filters;
    }
    if (filters.view === 'feeds') {
      return {
        start: filters.start,
        end: filters.end,
        view: filters.view,
        feed: filters.feed,
        search: filters.search,
        containers: [],
        tags: [],
        hashtags: [],
        types: [],
      };
    }
    return {
      start: filters.start,
      end: filters.end,
      view: filters.view,
      search: filters.search,
      feed: undefined,
      containers: [],
      tags: [],
      hashtags: [],
      types: [],
    };
  }, [isCalendarView, filters]);

  // Queries
  const { data: notesData, isLoading: isNotesLoading } = useTimeSliceNotes({
    ...effectiveQueryFilters,
    containersList: obsidianContainers,
  });

  const notes = notesData?.items || [];
  const totalNotes = notesData?.total || 0;

  // Active filter count for badge (strictly for Calendar pages)
  const activeFilterCount = isCalendarView
    ? (filters.feed ? 1 : 0) +
      (filters.containers?.length || 0) +
      filters.tags.length +
      filters.hashtags.length +
      filters.types.length +
      (filters.search ? 1 : 0)
    : 0;

  // Tier 1: Public Users (Not Logged In) -> Presentation Landing Page with Interactive Widget
  if (!isAuthenticated) {
    return (
      <>
        <LandingPage />
        <AuthModal />
      </>
    );
  }

  // Tier 2 & 3: Logged In Members & Admins -> Full Workspace Application
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121414] text-[#e2e2e2]">
      {/* 1. Left SideNavBar */}
      <SideNavBar
        currentView={filters.view}
        onSetView={handleSetView}
        onOpenQuickAdd={() => setIsCreateNoteOpen(true)}
        onOpenPrivateContainers={() => setIsPrivateContainersOpen(true)}
        onOpenKeysModal={() => setIsKeysModalOpen(true)}
        onToggleFilters={() => setIsFilterOpen((prev) => !prev)}
        isFilterOpen={isFilterOpen}
        activeFilterCount={activeFilterCount}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col md:ml-64 h-full relative overflow-hidden min-h-0">
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
        <main className="flex-1 flex overflow-hidden relative min-h-0">
          <ErrorBoundary fallbackTitle="View Failed to Render">
            {filters.view === 'timeline' && (
              <TimelineView
                notes={notes}
                isLoading={isNotesLoading}
                onSelectNote={setSelectedNote}
                filterState={filters}
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
                onToggleContainer={toggleContainer}
                onSelectOnlyContainer={selectOnlyContainer}
                onClearContainers={clearContainers}
                onToggleObsidianFolder={toggleObsidianFolder}
                onSelectOnlyObsidianFolder={selectOnlyObsidianFolder}
                onSetObsidianFolders={setObsidianFolders}
                onClearObsidianFolders={clearObsidianFolders}
                onResetFilters={resetFilters}
              />
            )}

            {filters.view === 'month' && (
              <MonthGridView
                notes={notes}
                startDate={filters.start}
                filterState={filters}
                onSelectNote={setSelectedNote}
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
                onToggleContainer={toggleContainer}
                onSelectOnlyContainer={selectOnlyContainer}
                onClearContainers={clearContainers}
                onToggleObsidianFolder={toggleObsidianFolder}
                onSelectOnlyObsidianFolder={selectOnlyObsidianFolder}
                onSetObsidianFolders={setObsidianFolders}
                onClearObsidianFolders={clearObsidianFolders}
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

            {filters.view === 'obsidian' && (
              <ObsidianContainersView
                filterState={filters}
                onToggleContainer={toggleContainer}
                onSelectOnlyContainer={selectOnlyContainer}
                onClearContainers={clearContainers}
                selectedSingleContainerId={selectedSingleContainerId}
                onSelectSingleContainer={setSelectedSingleContainerId}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* 3. Filter Sidebar Drawer (Calendar views only) */}
      {isCalendarView && (
        <FilterSidebar
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          filterState={filters}
          onSelectFeed={selectFeed}
          onToggleFeed={toggleFeed}
          onSelectOnlyFeed={selectOnlyFeed}
          onClearFeed={clearFeeds}
          onClearFeeds={clearFeeds}
          onToggleContainer={toggleContainer}
          onSelectOnlyContainer={selectOnlyContainer}
          onClearContainers={clearContainers}
          onToggleTag={toggleTag}
          onToggleHashtag={toggleHashtag}
          onToggleType={toggleType}
          onResetFilters={resetFilters}
        />
      )}

      {/* 4. Editorial Note Detail Reader Modal */}
      <NoteDetailModal
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
      />

      {/* 5. Create Note Modal for Logged in Users */}
      <CreateNoteModal
        isOpen={isCreateNoteOpen}
        onClose={() => setIsCreateNoteOpen(false)}
      />

      {/* 6. Private Obsidian Containers Modal for Logged in Users */}
      <PrivateContainersModal
        isOpen={isPrivateContainersOpen}
        onClose={() => setIsPrivateContainersOpen(false)}
      />

      {/* 7. Key Management Modal */}
      <KeyManagementModal
        isOpen={isKeysModalOpen}
        onClose={() => setIsKeysModalOpen(false)}
      />

      {/* 8. Auth Modal */}
      <AuthModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <AuthProvider>
        <UserKeysProvider>
          <ObsidianContainersProvider>
            <FoldersProvider>
              <CalendarAppInner />
            </FoldersProvider>
          </ObsidianContainersProvider>
        </UserKeysProvider>
      </AuthProvider>
    </I18nProvider>
  );
};

export default App;

