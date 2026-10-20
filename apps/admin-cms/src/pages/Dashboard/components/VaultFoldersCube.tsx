import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder } from '@lenta/shared';
import { FolderGit2, Flame, ChevronRight, Copy, Check, BarChart2, ListFilter } from 'lucide-react';
import { isSparkFolder, getSparkFolderTheme } from '../../../utils/sparkThemeUtils';
import { useAdminI18n } from '../../../i18n';

interface VaultFoldersCubeProps {
  folders: Folder[];
  sparkFoldersCount?: number;
  className?: string;
}

export const VaultFoldersCube: React.FC<VaultFoldersCubeProps> = ({
  folders,
  sparkFoldersCount = 7,
  className = '',
}) => {
  const { t } = useAdminI18n();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'all' | 'spark' | 'vault'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Filter folders
  const filteredFolders = useMemo(() => {
    let list = [...folders];
    if (activeFilter === 'spark') {
      list = list.filter((f) => isSparkFolder(f.path));
    } else if (activeFilter === 'vault') {
      list = list.filter((f) => !isSparkFolder(f.path));
    }
    return list.sort(
      (a, b) => (b._count?.noteFolders || 0) - (a._count?.noteFolders || 0),
    );
  }, [folders, activeFilter]);

  const maxFolderNotes = useMemo(() => {
    return Math.max(...folders.map((f) => f._count?.noteFolders || 10), 100);
  }, [folders]);

  const handleCopyPath = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1500);
  };

  return (
    <div
      className={`w-full h-[320px] flex flex-col platform-tile relative p-2.5 space-y-1.5 overflow-hidden shadow-sm hover:border-purple-500/30 transition-all duration-200 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.10),_transparent_70%)] ${className}`}
    >
      {/* Ghost Watermark Icon for instant distant recognition */}
      <FolderGit2 className="absolute -right-3 -top-3 w-28 h-28 text-purple-500/[0.07] pointer-events-none select-none -rotate-12" />

      {/* Distinctive Top Accent Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-purple-500 via-indigo-500 to-transparent" />

      {/* 1. Header (Metric Summary matching screenshot) */}
      <div
        onClick={() => navigate('/notes')}
        className="cursor-pointer group pb-1.5 border-b border-tile-border/60 dark:border-white/[0.05] shrink-0 relative z-10"
      >
        <div className="flex items-center justify-between text-on-surface-variant mb-1">
          <div className="flex items-center gap-1.5">
            <span className="p-1 rounded bg-purple-500/15 text-purple-400 border border-purple-500/25 flex items-center justify-center">
              <FolderGit2 className="w-3 h-3 text-purple-400" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
              {t.vaultFoldersMetric || 'Папки хранилища'}
            </span>
          </div>

          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
            📁 Obsidian Vault
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1">
          <div className="font-sans font-bold text-2xl text-purple-300">
            {folders.length}
          </div>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-500/15 text-purple-300 border border-purple-500/25">
            <Flame className="w-2.5 h-2.5 text-purple-400" />
            <span>{sparkFoldersCount} Spark</span>
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[10px] font-mono text-on-surface-variant/70">
          <span>{t.obsidianPathsSub || 'Физические пути Obsidian'}</span>
          <span className="text-purple-300/90 font-medium">Горячие директории</span>
        </div>
      </div>

      {/* 2. Interactive Filter Pills & View Mode Switcher */}
      <div className="flex items-center justify-between gap-1 shrink-0 pt-0.5">
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'all', label: `Все (${folders.length})` },
              { id: 'spark', label: `⚡ Spark (${sparkFoldersCount})` },
              { id: 'vault', label: '📁 Vault' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium transition-colors cursor-pointer ${
                activeFilter === filter.id
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-tile-subtle'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setViewMode(viewMode === 'list' ? 'analytics' : 'list')}
          className="p-1 rounded text-on-surface-variant/70 hover:text-purple-300 hover:bg-tile-subtle transition-colors cursor-pointer"
          title={viewMode === 'list' ? 'Показать распределение по объему' : 'Показать компактный список'}
        >
          {viewMode === 'list' ? <BarChart2 className="w-3.5 h-3.5" /> : <ListFilter className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 3. High-Density List of Folders */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5 min-h-0">
        {filteredFolders.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-xs font-mono">
            Папки не найдены
          </div>
        ) : (
          filteredFolders.map((folder) => {
            const isSpark = isSparkFolder(folder.path);
            const theme = isSpark ? getSparkFolderTheme(folder.path) : null;
            const count = folder._count?.noteFolders || 0;
            const percentage = Math.round((count / maxFolderNotes) * 100);

            return (
              <div
                key={folder.id}
                onClick={() => navigate(`/notes?folder=${encodeURIComponent(folder.path)}`)}
                className="group h-8 px-2 rounded-lg bg-tile-subtle/50 hover:bg-tile-subtle border border-tile-border dark:border-white/[0.04] hover:border-tile-border-hover dark:hover:border-white/[0.10] transition-colors duration-150 flex items-center justify-between gap-1.5 cursor-pointer relative overflow-hidden"
              >
                {/* Background volume bar if analytics mode */}
                {viewMode === 'analytics' && (
                  <div
                    className="absolute inset-y-0 left-0 opacity-15 pointer-events-none transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: theme ? theme.accentColor : '#a855f7',
                    }}
                  />
                )}

                {/* Left: Folder Icon / Emoji + Path + Copy button */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1 relative z-10">
                  <span className="text-xs shrink-0 leading-none group-hover:scale-110 transition-transform">
                    {theme ? theme.emoji : '📁'}
                  </span>

                  <span
                    className="font-mono text-[11px] font-semibold truncate group-hover:underline"
                    style={{ color: theme ? theme.accentColor : undefined }}
                  >
                    {folder.path}
                  </span>

                  <button
                    onClick={(e) => handleCopyPath(e, folder.path)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-on-surface-variant/50 hover:text-purple-300 transition-opacity"
                    title={`Копировать путь: ${folder.path}`}
                  >
                    {copiedPath === folder.path ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5" />
                    )}
                  </button>
                </div>

                {/* Right: Notes Count in Folder */}
                <div className="flex items-center gap-1.5 shrink-0 relative z-10">
                  <span className="font-mono font-bold text-xs text-on-surface">
                    {count}
                  </span>
                  <span className="text-[9px] font-mono text-on-surface-variant/60 hidden sm:inline">
                    заметок
                  </span>
                  <ChevronRight className="w-3 h-3 text-outline/40 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Mini Footer */}
      <div className="pt-1.5 border-t border-tile-border/50 dark:border-white/[0.04] flex items-center justify-between text-[10px] font-mono shrink-0 text-on-surface-variant/70">
        <span>Obsidian Vault</span>
        <span className="text-purple-400 font-medium">Связь активна</span>
      </div>
    </div>
  );
};
