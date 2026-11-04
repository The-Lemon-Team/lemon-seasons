import React, { useState, useMemo } from 'react';
import { useAllPeriods } from '../../../api/queries';
import { calculatePeriodMetrics, CalculatedPeriod, PeriodActivityStatus } from '../periods.utils';
import { CalendarRange, Search, Radio, ExternalLink, Edit3, Sparkles, Filter, CheckCircle2, Clock, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { notesApi } from '../../../api/client';

export const PeriodsHubTable: React.FC = () => {
  const navigate = useNavigate();
  const { data: notesData, isLoading, refetch } = useAllPeriods();
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'local'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PeriodActivityStatus>('all');
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);

  const rawNotes = notesData?.items || [];

  // Calculate metrics for all periods
  const calculatedPeriods: CalculatedPeriod[] = useMemo(() => {
    return rawNotes.map(calculatePeriodMetrics);
  }, [rawNotes]);

  // Apply filters
  const filteredPeriods = useMemo(() => {
    return calculatedPeriods.filter((p) => {
      if (scopeFilter !== 'all' && p.scope !== scopeFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.feedTitle?.toLowerCase().includes(q) ||
        p.feedSlug?.toLowerCase().includes(q)
      );
    });
  }, [calculatedPeriods, scopeFilter, statusFilter, searchQuery]);

  // Broadcast period to EventBus / Spotlight
  const handleBroadcast = async (period: CalculatedPeriod) => {
    try {
      setBroadcastingId(period.id);
      // Update note metadata to set isPromoted = true
      const existingMeta = period.note.metadata || {};
      await notesApi.update(period.id, {
        metadata: {
          ...existingMeta,
          isPromoted: true,
          promotedAt: new Date().toISOString(),
        },
      });
      message.success(`Период "${period.title}" успешно транслирован в шину событий!`);
      refetch();
    } catch (err: any) {
      message.error(err.message || 'Ошибка трансляции периода в шину');
    } finally {
      setBroadcastingId(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-3">
      {/* Subheader / Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 platform-tile p-2.5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск периода по названию или ленте..."
            className="w-full bg-control border border-control-border rounded-lg pl-8 pr-7 h-7 text-on-surface text-xs font-mono placeholder:text-text-muted outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Scope Filter */}
          <div className="flex items-center gap-1 bg-control p-0.5 rounded-lg border border-control-border text-xs font-mono">
            <button
              type="button"
              onClick={() => setScopeFilter('all')}
              className={`px-2 py-0.5 rounded ${scopeFilter === 'all' ? 'bg-tile text-primary font-bold shadow-xs' : 'text-text-muted hover:text-on-surface'}`}
            >
              Все
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('global')}
              className={`px-2 py-0.5 rounded ${scopeFilter === 'global' ? 'bg-tile text-blue-400 font-bold shadow-xs' : 'text-text-muted hover:text-on-surface'}`}
            >
              Глобальные
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('local')}
              className={`px-2 py-0.5 rounded ${scopeFilter === 'local' ? 'bg-tile text-emerald-400 font-bold shadow-xs' : 'text-text-muted hover:text-on-surface'}`}
            >
              Локальные
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-control p-0.5 rounded-lg border border-control-border text-xs font-mono">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded ${statusFilter === 'all' ? 'bg-tile text-primary font-bold shadow-xs' : 'text-text-muted hover:text-on-surface'}`}
            >
              Все статусы
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-2 py-0.5 rounded ${statusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-400 font-bold shadow-xs' : 'text-text-muted hover:text-on-surface'}`}
            >
              Активные
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('upcoming')}
              className={`px-2 py-0.5 rounded ${statusFilter === 'upcoming' ? 'bg-blue-500/20 text-blue-400 font-bold shadow-xs' : 'text-text-muted hover:text-on-surface'}`}
            >
              Будущие
            </button>
          </div>
        </div>
      </div>

      {/* Periods Table */}
      <div className="platform-tile flex flex-col flex-1 min-h-0 overflow-hidden shadow-xs border border-tile-border">
        <div className="flex-1 overflow-auto min-h-0 relative custom-scrollbar">
          <div className="min-w-[800px] flex flex-col min-h-full">
            {/* Sticky Table Header */}
            <div className="sticky top-0 z-10 grid grid-cols-[2.5fr_1.1fr_1.8fr_1.8fr_120px] gap-3 px-3.5 py-2 border-b border-tile-border bg-tile-subtle font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold select-none shadow-xs">
              <div>Период / Событие</div>
              <div>Охват (Scope)</div>
              <div>Даты & Прогресс</div>
              <div>Остаток времени</div>
              <div className="text-right">Трансляция</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-tile-border flex-1">
              {filteredPeriods.map((p) => {
                const isOngoing = p.status === 'active';
                const isUpcoming = p.status === 'upcoming';

                return (
                  <div
                    key={p.id}
                    className="grid grid-cols-[2.5fr_1.1fr_1.8fr_1.8fr_120px] gap-3 px-3.5 py-2.5 items-center hover:bg-tile-subtle/70 transition-colors text-xs"
                  >
                    {/* Title & Info */}
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-on-surface truncate">
                          {p.title}
                        </span>
                        {p.isPromoted && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                            BUS LIVE
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-[11px] text-text-muted truncate mt-0.5">
                          {p.description}
                        </p>
                      )}
                    </div>

                    {/* Scope & Feed */}
                    <div>
                      {p.scope === 'global' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Globe className="w-3 h-3" />
                          <span>Глобальный</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 truncate max-w-[130px]">
                          <span>📁</span>
                          <span className="truncate">{p.feedTitle || p.feedSlug}</span>
                        </span>
                      )}
                    </div>

                    {/* Dates & Progress Bar */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-text-muted">
                        {p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'}
                        {p.endDate ? ` — ${new Date(p.endDate).toLocaleDateString()}` : ''}
                      </div>
                      <div className="w-full h-1.5 bg-control rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOngoing ? 'bg-primary' : isUpcoming ? 'bg-blue-400' : 'bg-neutral-500'
                          }`}
                          style={{ width: `${p.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Status & Time Remaining */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          isOngoing
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : isUpcoming
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
                        }`}
                      >
                        {p.status}
                      </span>
                      <span className="text-[11px] font-mono text-text-muted">
                        {p.timeRemainingText}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleBroadcast(p)}
                        disabled={broadcastingId === p.id}
                        title="Транслировать в шину EventBus"
                        className={`px-2 py-1 rounded text-[11px] font-mono font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                          p.isPromoted
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-control text-text-muted hover:text-on-surface hover:border-primary border border-control-border'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>{p.isPromoted ? 'Активен' : 'В шину'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/notes/${p.id}`)}
                        title="Редактировать заметку периода"
                        className="p-1 text-text-muted hover:text-primary rounded cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredPeriods.length === 0 && !isLoading && (
              <div className="p-12 text-center text-text-muted space-y-2 my-auto">
                <CalendarRange className="w-8 h-8 mx-auto stroke-1" />
                <p className="font-sans text-xs">Периоды не найдены</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 px-3.5 border-t border-tile-border bg-tile-subtle flex items-center justify-between text-[11px] font-mono text-on-surface-variant flex-shrink-0">
          <div>Всего периодов: {filteredPeriods.length}</div>
          <div className="text-[10px] text-text-muted">
            Периоды транслируются на общую шину и подсвечиваются в Feed/Calendar Apps
          </div>
        </div>
      </div>
    </div>
  );
};
