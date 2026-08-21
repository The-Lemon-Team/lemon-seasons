import React, { useState } from 'react';
import { useFeeds, useNotes, useTaxonomyFlat, useSyncChanges } from '../../api/queries';
import { NoteTypeBadge } from '../../components/NoteTypeBadge';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [sinceTime, setSinceTime] = useState<string>('');

  const { data: feeds = [] } = useFeeds();
  const { data: notesData } = useNotes({ limit: 6 });
  const { data: tags = [] } = useTaxonomyFlat();
  const { data: syncData, isFetching: isSyncFetching, refetch: refetchSync } = useSyncChanges(
    sinceTime || undefined,
  );

  const notes = notesData?.items || [];
  const totalNotes = notesData?.total || 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-sans font-bold text-2xl text-on-surface mb-1">
            Project Lenta Dashboard
          </h1>
          <p className="text-on-surface-variant text-sm">
            Headless CMS & Chronological Data Hub powering Admin CMS, Calendar App & Obsidian Sync.
          </p>
        </div>

        <button
          onClick={() => navigate('/notes/new')}
          className="px-4 py-2 bg-primary text-on-primary hover:bg-primary-fixed-dim rounded font-semibold text-sm transition-all flex items-center gap-2 shadow"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Note
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/feeds')}
          className="bg-surface-container rounded-lg border border-white/5 p-5 hover:border-primary/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Active Feeds</span>
            <span className="material-symbols-outlined text-primary text-[20px] group-hover:scale-110 transition-transform">
              dynamic_feed
            </span>
          </div>
          <div className="font-sans font-bold text-3xl text-on-surface">{feeds.length}</div>
          <p className="text-xs text-outline mt-1 font-mono">Configured data streams</p>
        </div>

        <div
          onClick={() => navigate('/notes')}
          className="bg-surface-container rounded-lg border border-white/5 p-5 hover:border-primary/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Total Notes</span>
            <span className="material-symbols-outlined text-secondary text-[20px] group-hover:scale-110 transition-transform">
              description
            </span>
          </div>
          <div className="font-sans font-bold text-3xl text-on-surface">{totalNotes}</div>
          <p className="text-xs text-outline mt-1 font-mono">Single truth records</p>
        </div>

        <div
          onClick={() => navigate('/taxonomy')}
          className="bg-surface-container rounded-lg border border-white/5 p-5 hover:border-primary/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Taxonomy Nodes</span>
            <span className="material-symbols-outlined text-tertiary text-[20px] group-hover:scale-110 transition-transform">
              account_tree
            </span>
          </div>
          <div className="font-sans font-bold text-3xl text-on-surface">{tags.length}</div>
          <p className="text-xs text-outline mt-1 font-mono">PostgreSQL Ltree paths</p>
        </div>

        <div className="bg-surface-container rounded-lg border border-white/5 p-5">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Sync State</span>
            <span className="material-symbols-outlined text-[#bfecda] text-[20px]">cloud_sync</span>
          </div>
          <div className="font-sans font-bold text-xl text-on-surface flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Active
          </div>
          <p className="text-xs text-outline mt-1 font-mono">
            {syncData?.syncedAt
              ? `Synced ${new Date(syncData.syncedAt).toLocaleTimeString()}`
              : 'Delta sync ready'}
          </p>
        </div>
      </div>

      {/* Two Columns: Recent Notes & Obsidian Sync Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Notes (Span 2) */}
        <div className="lg:col-span-2 space-y-3 bg-surface-container rounded-lg border border-white/5 p-5">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <h2 className="font-sans font-bold text-base text-on-surface">
              Recent Chronological Notes
            </h2>
            <button
              onClick={() => navigate('/notes')}
              className="text-xs font-mono text-secondary hover:text-primary transition-colors"
            >
              View All →
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {notes.map((note) => {
              const hasImages = Boolean(note.images && note.images.length > 0);
              const mainImage = hasImages
                ? note.images?.find((img) => img.isMain) || note.images?.[0]
                : null;
              const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
              const thumbUrl = mainImage
                ? mainImage.thumbnailUrl
                  ? mainImage.thumbnailUrl.startsWith('http')
                    ? mainImage.thumbnailUrl
                    : `${apiBase}${mainImage.thumbnailUrl}`
                  : mainImage.url.startsWith('http')
                  ? mainImage.url
                  : `${apiBase}${mainImage.url}`
                : null;

              return (
                <div
                  key={note.id}
                  onClick={() => navigate(`/notes/${note.id}`)}
                  className="py-3 flex items-center justify-between hover:bg-white/5 px-2 rounded transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    {thumbUrl && (
                      <div className="relative w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-black/40 border border-white/10 shadow-xs">
                        <img
                          src={thumbUrl}
                          alt={mainImage?.alt || note.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {note.images && note.images.length > 1 && (
                          <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] font-mono text-white/90 px-0.5 rounded-tl">
                            +{note.images.length - 1}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <NoteTypeBadge type={note.type} size="sm" />
                        <span className="font-sans font-semibold text-sm text-on-surface truncate">
                          {note.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant flex-wrap">
                        <span>{new Date(note.startDate).toLocaleDateString()}</span>
                        {note.feed && <span>• feed: {note.feed.title}</span>}
                        {note.sourceLink && (
                          <span className="inline-flex items-center gap-0.5 text-primary/80">
                            • <span className="material-symbols-outlined text-[13px]">link</span>
                            source
                            {note.links && note.links.length > 1 && (
                              <span className="text-[10px] text-on-surface-variant font-mono">
                                (+{note.links.length - 1})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="material-symbols-outlined text-outline text-[18px]">
                    chevron_right
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Obsidian Sync Hub (Span 1) */}
        <div className="space-y-4 bg-surface-container rounded-lg border border-white/5 p-5">
          <h2 className="font-sans font-bold text-base text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">sync</span>
            Obsidian Local Sync Hub
          </h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Project Lenta uses non-destructive soft deletes (<code className="text-secondary font-mono">deletedAt</code>) and timestamp indexing (<code className="text-secondary font-mono">updatedAt</code>) to power offline-first delta synchronization.
          </p>

          <div className="space-y-2 pt-2 border-t border-white/5">
            <label className="block font-mono text-[11px] text-on-surface-variant uppercase">
              Delta Sync Pull Test
            </label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={sinceTime}
                onChange={(e) => setSinceTime(e.target.value)}
                placeholder="Since timestamp..."
                className="flex-1 bg-surface-container-lowest border border-white/10 rounded px-2 py-1 text-xs text-on-surface font-mono outline-none [color-scheme:dark]"
              />
              <button
                onClick={() => refetchSync()}
                disabled={isSyncFetching}
                className="px-3 py-1 bg-surface-container-highest hover:bg-white/10 text-on-surface rounded text-xs font-mono transition-colors"
              >
                {isSyncFetching ? 'Pulling...' : 'Pull'}
              </button>
            </div>

            {syncData && (
              <div className="mt-3 bg-surface-container-lowest rounded p-3 border border-white/5 font-mono text-[11px] space-y-1">
                <div className="text-primary font-semibold">
                  ✓ Synced {syncData.counts.notes} notes, {syncData.counts.feeds} feeds, {syncData.counts.taxonomy} tags
                </div>
                <div className="text-outline text-[10px]">
                  Server Timestamp: {syncData.syncedAt}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
