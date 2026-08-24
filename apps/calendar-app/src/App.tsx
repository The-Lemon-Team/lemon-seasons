import React, { useState } from 'react';
import { Note } from '@lenta/shared';
import { I18nProvider } from './i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useCalendarState } from './hooks/useCalendarState';
import { useTimeSliceNotes } from './api/queries';
import { SideNavBar } from './components/SideNavBar';
import { Navbar } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
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
import { ObsidianContainersProvider } from './context/ObsidianContainersContext';
import { FoldersProvider } from './context/FoldersContext';
import { UserKeysProvider } from './context/UserKeysContext';

const CalendarAppInner: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const {
    filters,
    setStartDate,
    setView,
    setSearch,
    selectFeed,
    toggleFeed,
    selectOnlyFeed,
    clearFeeds,
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
  } = useCalendarState();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [isPrivateContainersOpen, setIsPrivateContainersOpen] = useState(false);
  const [isKeysModalOpen, setIsKeysModalOpen] = useState(false);

  // Queries
  const { data: notesData, isLoading: isNotesLoading } = useTimeSliceNotes(filters);

  const notes = notesData?.items || [];
  const totalNotes = notesData?.total || 0;

  // Active filter count for badge
  const activeFilterCount =
    (filters.feed ? 1 : 0) +
    filters.tags.length +
    filters.hashtags.length +
    filters.types.length +
    (filters.search ? 1 : 0);

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
        onSetView={setView}
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
          onSetView={setView}
          onSearchChange={setSearch}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          onToday={setToday}
          onToggleFilter={() => setIsFilterOpen((prev) => !prev)}
        />

        {/* Dynamic Stats Overview Bar */}
        <StatsBar
          notes={notes}
          isLoading={isNotesLoading}
          total={totalNotes}
        />

        {/* View Content Canvas */}
        <main className="flex-1 flex overflow-hidden relative min-h-0">
          {filters.view === 'timeline' && (
            <TimelineView
              notes={notes}
              isLoading={isNotesLoading}
              onSelectNote={setSelectedNote}
              filterState={filters}
              onToggleFeed={toggleFeed}
              onSelectOnlyFeed={selectOnlyFeed}
              onClearFeeds={clearFeeds}
              onOpenFeedsHub={() => setView('feeds')}
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
              onSelectDay={(dateKey) => {
                setStartDate(dateKey);
                setView('timeline');
              }}
              onToggleFeed={toggleFeed}
              onSelectOnlyFeed={selectOnlyFeed}
              onClearFeeds={clearFeeds}
              onOpenFeedsHub={() => setView('feeds')}
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
              selectedFeed={filters.feed}
              onSelectFeed={selectFeed}
              onToggleFeed={toggleFeed}
              onSelectOnlyFeed={selectOnlyFeed}
              onClearFeed={clearFeeds}
              onClearFeeds={clearFeeds}
              onSelectNote={setSelectedNote}
              onNavigateToTimeline={() => setView('timeline')}
              onNavigateToCalendar={() => setView('month')}
            />
          )}

          {filters.view === 'folders' && (
            <FolderManagerView />
          )}

          {filters.view === 'obsidian' && (
            <ObsidianContainersView />
          )}
        </main>
      </div>

      {/* 3. Filter Sidebar Drawer */}
      <FilterSidebar
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filterState={filters}
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

