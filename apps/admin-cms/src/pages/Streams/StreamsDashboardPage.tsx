import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStreams, useFeeds, useCreateStream, useUpdateStream, useDeleteStream } from '../../api/queries';
import { Stream, CreateStreamPayload, UpdateStreamPayload } from '@lenta/shared';
import { useAdminI18n } from '../../i18n';
import { StreamsTable } from './components/StreamsTable';
import { StreamEditorModal } from './components/StreamEditorModal';
import { StreamAnalyticsDrawer } from './components/StreamAnalyticsDrawer';
import { PeriodsHubTable } from './components/PeriodsHubTable';
import { Radio, CalendarRange, Plus, Search, Globe, Lock } from 'lucide-react';
import { message } from 'antd';

export interface StreamsDashboardPageProps {
  initialTab?: 'streams' | 'periods';
}

export const StreamsDashboardPage: React.FC<StreamsDashboardPageProps> = () => {
  const { t } = useAdminI18n();
  const location = useLocation();
  const navigate = useNavigate();

  // Reactive tab resolution from pathname or query param
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');
  const isPeriods = tabParam === 'periods' || location.pathname.startsWith('/periods');
  const activeTab: 'streams' | 'periods' = isPeriods ? 'periods' : 'streams';

  const handleTabChange = (tab: 'streams' | 'periods') => {
    navigate(`/${tab}`);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'public' | 'private'>('all');

  // Modal / Drawer state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);
  const [analyticsStream, setAnalyticsStream] = useState<Stream | null>(null);

  // Queries & mutations
  const { data: streams = [], isLoading: isLoadingStreams } = useStreams(true);
  const { data: allFeeds = [] } = useFeeds(false);

  const createStreamMutation = useCreateStream();
  const updateStreamMutation = useUpdateStream();
  const deleteStreamMutation = useDeleteStream();

  // Counts
  const publicCount = useMemo(
    () => streams.filter((s) => s.privacy === 'public').length,
    [streams]
  );
  const privateCount = useMemo(
    () => streams.filter((s) => s.privacy === 'private').length,
    [streams]
  );

  // Filtered streams
  const filteredStreams = useMemo(() => {
    return streams.filter((s) => {
      if (privacyFilter !== 'all' && s.privacy !== privacyFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        s.title.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      );
    });
  }, [streams, privacyFilter, searchQuery]);

  const handleOpenCreate = () => {
    setEditingStream(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (stream: Stream) => {
    setEditingStream(stream);
    setIsEditorOpen(true);
  };

  const handleSaveStream = async (payload: CreateStreamPayload | UpdateStreamPayload) => {
    try {
      if (editingStream) {
        await updateStreamMutation.mutateAsync({
          id: editingStream.id,
          data: payload,
        });
        message.success(t.streamSavedSuccess);
      } else {
        await createStreamMutation.mutateAsync(payload as CreateStreamPayload);
        message.success(t.streamSavedSuccess);
      }
      setIsEditorOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Ошибка сохранения стрима');
    }
  };

  const handleDeleteStream = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот стрим?')) return;
    try {
      await deleteStreamMutation.mutateAsync(id);
      message.success(t.streamDeletedSuccess);
      if (analyticsStream?.id === id) {
        setAnalyticsStream(null);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Ошибка удаления стрима');
    }
  };

  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto custom-scrollbar pr-1 space-y-3 flex flex-col">
      {/* Top Header Section */}
      <div className="flex items-center justify-between gap-3 h-8 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="font-sans font-bold text-base text-on-surface truncate">
            {activeTab === 'streams' ? t.streamsPageTitle : t.periodsHubTitle}
          </h1>
          {activeTab === 'streams' ? (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hidden sm:inline-block shrink-0">
              {streams.length} стримов
            </span>
          ) : (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline-block shrink-0">
              Глобальные и локальные периоды
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {activeTab === 'streams' && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="h-7 px-3 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.createStreamBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex items-center justify-between gap-2.5 border-b border-tile-border shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleTabChange('streams')}
            className={`py-2 px-3 border-b-2 font-mono text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'streams'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-on-surface'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Стримы контента</span>
            <span className="text-[10px] opacity-70">({streams.length})</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('periods')}
            className={`py-2 px-3 border-b-2 font-mono text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'periods'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-on-surface'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>{t.periodsHubTitle}</span>
          </button>
        </div>

        {/* Global/Local stats chips */}
        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-text-muted">
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3 text-blue-400" />
            <span>Публичных: {publicCount}</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-purple-400" />
            <span>Приватных: {privateCount}</span>
          </span>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'streams' ? (
        <>
          {/* Streams Toolbar: Search & Privacy Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 platform-tile p-2 shrink-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию или слагу стрима..."
                className="w-full bg-control border border-control-border rounded-lg pl-8 pr-7 h-7 text-on-surface text-xs font-mono placeholder:text-text-muted outline-none focus:border-primary"
              />
            </div>

            {/* Privacy Filters */}
            <div className="flex items-center gap-1 bg-control p-0.5 rounded-lg border border-control-border text-xs font-mono">
              <button
                type="button"
                onClick={() => setPrivacyFilter('all')}
                className={`px-2.5 py-0.5 rounded ${
                  privacyFilter === 'all'
                    ? 'bg-tile text-primary font-bold shadow-xs'
                    : 'text-text-muted hover:text-on-surface'
                }`}
              >
                Все ({streams.length})
              </button>
              <button
                type="button"
                onClick={() => setPrivacyFilter('public')}
                className={`px-2.5 py-0.5 rounded flex items-center gap-1 ${
                  privacyFilter === 'public'
                    ? 'bg-blue-500/20 text-blue-400 font-bold shadow-xs'
                    : 'text-text-muted hover:text-on-surface'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>Публичные ({publicCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setPrivacyFilter('private')}
                className={`px-2.5 py-0.5 rounded flex items-center gap-1 ${
                  privacyFilter === 'private'
                    ? 'bg-purple-500/20 text-purple-400 font-bold shadow-xs'
                    : 'text-text-muted hover:text-on-surface'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>Приватные ({privateCount})</span>
              </button>
            </div>
          </div>

          {/* Streams Table */}
          <StreamsTable
            streams={filteredStreams}
            allFeeds={allFeeds}
            isLoading={isLoadingStreams}
            onOpenAnalytics={(s) => setAnalyticsStream(s)}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteStream}
            onCreateNew={handleOpenCreate}
          />
        </>
      ) : (
        <PeriodsHubTable />
      )}

      {/* Editor Modal */}
      <StreamEditorModal
        stream={editingStream}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveStream}
        allFeeds={allFeeds}
      />

      {/* Analytics Slide-over Drawer */}
      <StreamAnalyticsDrawer
        stream={analyticsStream}
        isOpen={Boolean(analyticsStream)}
        onClose={() => setAnalyticsStream(null)}
        onEdit={handleOpenEdit}
        allFeeds={allFeeds}
      />
    </div>
  );
};
