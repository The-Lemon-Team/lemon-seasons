import React, { useState } from 'react';
import { Note } from '@lenta/shared';
import { useCalendarState } from './hooks/useCalendarState';
import { useTimeSliceNotes } from './api/queries';
import { SideNavBar } from './components/SideNavBar';
import { Navbar } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { FilterSidebar } from './components/FilterSidebar';
import { TimelineView } from './components/TimelineView';
import { MonthGridView } from './components/MonthGridView';
import { GanttView } from './components/GanttView';
import { NoteDetailModal } from './components/NoteDetailModal';

export const App: React.FC = () => {
  const {
    filters,
    setStartDate,
    setView,
    setSearch,
    toggleFeed,
    toggleTag,
    toggleHashtag,
    toggleType,
    resetFilters,
    prevMonth,
    nextMonth,
    setToday,
  } = useCalendarState();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Queries
  const { data: notesData, isLoading: isNotesLoading } = useTimeSliceNotes(filters);

  const notes = notesData?.items || [];
  const totalNotes = notesData?.total || 0;

  // Active filter count for badge
  const activeFilterCount =
    filters.feeds.length +
    filters.tags.length +
    filters.hashtags.length +
    filters.types.length +
    (filters.search ? 1 : 0);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121414] text-[#e2e2e2]">
      {/* 1. Left SideNavBar */}
      <SideNavBar
        currentView={filters.view}
        onSetView={setView}
        onToggleFilters={() => setIsFilterOpen((prev) => !prev)}
        isFilterOpen={isFilterOpen}
        activeFilterCount={activeFilterCount}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col md:ml-64 h-full relative overflow-hidden">
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
        <main className="flex-1 flex overflow-hidden relative">
          {filters.view === 'timeline' && (
            <TimelineView
              notes={notes}
              isLoading={isNotesLoading}
              onSelectNote={setSelectedNote}
            />
          )}

          {filters.view === 'month' && (
            <MonthGridView
              notes={notes}
              startDate={filters.start}
              onSelectNote={setSelectedNote}
              onSelectDay={(dateKey) => {
                setStartDate(dateKey);
                setView('timeline');
              }}
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
        </main>
      </div>

      {/* 3. Filter Sidebar Drawer */}
      <FilterSidebar
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filterState={filters}
        onToggleFeed={toggleFeed}
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
    </div>
  );
};
