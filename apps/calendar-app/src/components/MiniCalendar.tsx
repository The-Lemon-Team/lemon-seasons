import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { useI18n } from '../i18n';

interface MiniCalendarProps {
  startDate: string; // ISO date string or YYYY-MM-DD
  onSelectMonth: (year: number, monthIndex: number) => void;
  onSelectDate?: (dateKey: string) => void;
  compact?: boolean;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  startDate,
  onSelectMonth,
  onSelectDate,
  compact = false,
}) => {
  const { t, lang } = useI18n();

  // Internal view date (allows navigating months locally in mini calendar)
  const [viewDate, setViewDate] = useState(() => dayjs(startDate || undefined));
  const [isYearMonthMode, setIsYearMonthMode] = useState(false);

  // Sync viewDate when startDate prop changes
  useEffect(() => {
    if (startDate) {
      setViewDate(dayjs(startDate));
    }
  }, [startDate]);

  const selectedDateKey = dayjs(startDate || undefined).format('YYYY-MM-DD');
  const todayKey = dayjs().format('YYYY-MM-DD');

  const currentYear = viewDate.year();
  const currentMonthIndex = viewDate.month();

  const prevMonth = () => {
    setViewDate((prev) => prev.subtract(1, 'month'));
  };

  const nextMonth = () => {
    setViewDate((prev) => prev.add(1, 'month'));
  };

  const handleSelectDay = (date: dayjs.Dayjs) => {
    const year = date.year();
    const month = date.month();
    const dateKey = date.format('YYYY-MM-DD');

    onSelectMonth(year, month);
    if (onSelectDate) {
      onSelectDate(dateKey);
    }
  };

  const handleSelectMonthInPicker = (monthIdx: number) => {
    const newDate = viewDate.month(monthIdx);
    setViewDate(newDate);
    onSelectMonth(newDate.year(), monthIdx);
    setIsYearMonthMode(false);
  };

  const handleYearChange = (delta: number) => {
    setViewDate((prev) => prev.add(delta, 'year'));
  };

  // Build 42 grid cells (6 weeks x 7 days)
  const calendarCells = useMemo(() => {
    const startOfMonth = viewDate.startOf('month');
    let cursor = startOfMonth.startOf('week');

    const cells: Array<{
      date: dayjs.Dayjs;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    for (let i = 0; i < 42; i++) {
      const dateKey = cursor.format('YYYY-MM-DD');
      cells.push({
        date: cursor,
        dateKey,
        isCurrentMonth: cursor.isSame(viewDate, 'month'),
        isToday: dateKey === todayKey,
        isSelected: dateKey === selectedDateKey,
      });
      cursor = cursor.add(1, 'day');
    }

    return cells;
  }, [viewDate, todayKey, selectedDateKey]);

  // Weekday abbreviations
  const weekdaysShort = useMemo(() => {
    if (t.weekdays && t.weekdays.length === 7) {
      return t.weekdays.map((w) => w.slice(0, 2));
    }
    return lang === 'ru'
      ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
      : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  }, [t.weekdays, lang]);

  const monthNames = useMemo(() => {
    return lang === 'ru'
      ? ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  }, [lang]);

  return (
    <div className={`bg-[#141616] border border-[#242828] rounded-xl p-3 shadow-xl select-none font-mono ${compact ? 'text-xs' : 'text-xs'}`}>
      {/* Mini Calendar Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#242828]">
        <button
          type="button"
          onClick={() => setIsYearMonthMode((prev) => !prev)}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#242828] text-[#e2e2e2] font-semibold hover:text-[#e5e971] transition-colors"
          title="Выбрать месяц и год"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-[#c9cd58]" />
          <span className="capitalize">
            {monthNames[currentMonthIndex]} {currentYear}
          </span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 rounded text-[#93927e] hover:text-white hover:bg-[#242828] transition-colors"
            title={t.previousMonth}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded text-[#93927e] hover:text-white hover:bg-[#242828] transition-colors"
            title={t.nextMonth}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Year & Month Selection Overlay View */}
      {isYearMonthMode ? (
        <div className="py-2">
          {/* Year selector header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={() => handleYearChange(-1)}
              className="p-1 rounded text-[#93927e] hover:text-white hover:bg-[#242828]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-[#e5e971]">{currentYear}</span>
            <button
              type="button"
              onClick={() => handleYearChange(1)}
              className="p-1 rounded text-[#93927e] hover:text-white hover:bg-[#242828]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 12 Months Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {monthNames.map((name, idx) => {
              const isSelected = idx === currentMonthIndex;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelectMonthInPicker(idx)}
                  className={`py-1.5 px-2 rounded text-[11px] font-semibold text-center transition-all ${
                    isSelected
                      ? 'bg-[#c9cd58] text-[#121414] font-bold shadow-glow-lemon'
                      : 'bg-[#1e2020] text-[#c9c7b2] hover:bg-[#333535] hover:text-white'
                  }`}
                >
                  {name.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {weekdaysShort.map((day, idx) => (
              <span key={`${day}-${idx}`} className="text-[10px] text-[#93927e] font-semibold py-0.5">
                {day}
              </span>
            ))}
          </div>

          {/* 42 Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell) => {
              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => handleSelectDay(cell.date)}
                  className={`h-7 w-full rounded flex items-center justify-center text-[11px] transition-all relative ${
                    cell.isSelected
                      ? 'bg-[#c9cd58] text-[#121414] font-bold shadow-glow-lemon z-10'
                      : cell.isCurrentMonth
                      ? 'text-[#e2e2e2] hover:bg-[#242828] hover:text-[#e5e971]'
                      : 'text-[#484837] hover:bg-[#1e2020] hover:text-[#93927e]'
                  }`}
                >
                  <span>{cell.date.date()}</span>
                  {cell.isToday && !cell.isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#c9cd58]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Today shortcut footer */}
          <div className="mt-2.5 pt-2 border-t border-[#242828] flex items-center justify-between text-[10px]">
            <button
              type="button"
              onClick={() => {
                const now = dayjs();
                setViewDate(now);
                onSelectMonth(now.year(), now.month());
                if (onSelectDate) onSelectDate(now.format('YYYY-MM-DD'));
              }}
              className="text-[#c9cd58] hover:text-[#e5e971] flex items-center gap-1 font-semibold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t.today}</span>
            </button>
            <span className="text-[#93927e]">{dayjs().format('DD.MM.YYYY')}</span>
          </div>
        </>
      )}
    </div>
  );
};
