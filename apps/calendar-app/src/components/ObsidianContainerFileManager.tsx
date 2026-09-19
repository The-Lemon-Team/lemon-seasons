import React, { useState, useMemo, useEffect } from 'react';
import { useObsidianContainers } from '../context/ObsidianContainersContext';
import { useObsidianContainerFilesQuery, useObsidianContainerCommitsQuery, useTimeSliceNotes } from '../api/queries';
import { ContainerFileItemDto } from '../api/containersApi';
import { NoteDetailModal } from './NoteDetailModal';
import { CreateNoteModal } from './CreateNoteModal';
import { Note, LentaFrontmatterUtil } from '@lenta/shared';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import {
  Folder,
  FolderOpen,
  FileText,
  GitCommit,
  GitBranch,
  Clock,
  Search,
  Upload,
  Download,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  X,
  Copy,
  Check,
  Lock,
  Globe,
  Eye,
  ArrowLeft,
  ArrowUpLeft,
  Plus,
  PanelRightClose,
  PanelRightOpen,
  SlidersHorizontal,
} from 'lucide-react';

dayjs.extend(relativeTime);
dayjs.locale('ru');

interface ObsidianContainerFileManagerProps {
  containerId: string;
  initialPath?: string;
  initialFilePath?: string | null;
  onSelectNote?: (note: Note) => void;
  className?: string;
  showBackToContainers?: () => void;
  onNavigatePath?: (folderPath: string, filePath: string | null) => void;
}

interface VirtualItem {
  type: 'folder' | 'file';
  name: string;
  fullPath: string;
  file?: ContainerFileItemDto;
  itemCount?: number;
}

export const ObsidianContainerFileManager: React.FC<ObsidianContainerFileManagerProps> = ({
  containerId,
  initialPath = '',
  initialFilePath = null,
  onSelectNote,
  className = '',
  showBackToContainers,
  onNavigatePath,
}) => {
  const {
    containers,
    isSyncingId,
    syncDirection,
    pendingChanges,
    openSyncModal,
  } = useObsidianContainers();

  const container = containers.find((c) => c.id === containerId);

  // Queries
  const {
    data: files = [],
    isLoading: isFilesLoading,
    refetch: refetchFiles,
  } = useObsidianContainerFilesQuery(containerId);

  const {
    data: serverCommits = [],
    isLoading: isCommitsLoading,
    refetch: refetchCommits,
  } = useObsidianContainerCommitsQuery(containerId);

  // Notes to link files to real Note objects
  const { data: notesData } = useTimeSliceNotes({
    start: '1970-01-01',
    end: '2099-12-31',
    containers: [containerId],
  });
  const allNotes = notesData?.items || [];

  // Normalize path helper
  const normalize = (p: string) =>
    p.trim().replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');

  // State
  const [currentDir, setCurrentDir] = useState<string>(initialPath);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<ContainerFileItemDto | null>(null);
  const [previewTab, setPreviewTab] = useState<'rendered' | 'raw'>('rendered');
  const [showFrontmatter, setShowFrontmatter] = useState<boolean>(true);
  const [showCommitsPanel, setShowCommitsPanel] = useState<boolean>(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [activeNoteModal, setActiveNoteModal] = useState<Note | null>(null);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState<boolean>(false);

  const isSyncing = isSyncingId === containerId;
  const pendingCount = pendingChanges[containerId] ?? 0;
  const isPrivate = container?.privacy === 'private';

  // Sync state when initialFilePath / initialPath prop changes
  useEffect(() => {
    if (initialPath !== undefined && initialPath !== currentDir && !selectedFile) {
      setCurrentDir(initialPath);
    }
  }, [initialPath]);

  useEffect(() => {
    if (initialFilePath && files.length > 0) {
      const target = files.find((f) => normalize(f.path) === normalize(initialFilePath));
      if (target) {
        setSelectedFile(target);
        const parts = normalize(target.path).split('/');
        if (parts.length > 1) {
          setCurrentDir(parts.slice(0, -1).join('/'));
        }
      }
    } else if (initialFilePath === null && selectedFile) {
      setSelectedFile(null);
    }
  }, [initialFilePath, files]);

  // Parse files into current directory listing
  const { currentItems, breadcrumbs } = useMemo(() => {
    const normCurrent = normalize(currentDir);
    const prefix = normCurrent ? `${normCurrent}/` : '';

    const folderMap = new Map<string, number>();
    const fileList: VirtualItem[] = [];

    // All matching files
    for (const f of files) {
      const normPath = normalize(f.path);

      // Search filter bypasses directory hierarchy if active
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        if (normPath.toLowerCase().includes(query)) {
          fileList.push({
            type: 'file',
            name: normPath.split('/').pop() || normPath,
            fullPath: normPath,
            file: f,
          });
        }
        continue;
      }

      // If at root or matching current prefix
      if (!normCurrent) {
        const firstSlash = normPath.indexOf('/');
        if (firstSlash === -1) {
          fileList.push({
            type: 'file',
            name: normPath,
            fullPath: normPath,
            file: f,
          });
        } else {
          const topFolder = normPath.substring(0, firstSlash);
          folderMap.set(topFolder, (folderMap.get(topFolder) || 0) + 1);
        }
      } else if (normPath.startsWith(prefix)) {
        const sub = normPath.substring(prefix.length);
        const firstSlash = sub.indexOf('/');
        if (firstSlash === -1) {
          fileList.push({
            type: 'file',
            name: sub,
            fullPath: normPath,
            file: f,
          });
        } else {
          const subFolder = sub.substring(0, firstSlash);
          const fullSubFolder = `${normCurrent}/${subFolder}`;
          folderMap.set(fullSubFolder, (folderMap.get(fullSubFolder) || 0) + 1);
        }
      }
    }

    const folderItems: VirtualItem[] = Array.from(folderMap.entries()).map(([fPath, count]) => ({
      type: 'folder',
      name: fPath.split('/').pop() || fPath,
      fullPath: fPath,
      itemCount: count,
    }));

    // Sort folders first alphabetically, then files
    folderItems.sort((a, b) => a.name.localeCompare(b.name));
    fileList.sort((a, b) => a.name.localeCompare(b.name));

    // Breadcrumbs
    const crumbs: Array<{ name: string; path: string }> = [{ name: container?.name || 'Vault', path: '' }];
    if (normCurrent) {
      const parts = normCurrent.split('/');
      let acc = '';
      for (const p of parts) {
        acc = acc ? `${acc}/${p}` : p;
        crumbs.push({ name: p, path: acc });
      }
    }

    return {
      currentItems: [...folderItems, ...fileList],
      breadcrumbs: crumbs,
    };
  }, [files, currentDir, searchTerm, container]);

  // Find Note object corresponding to file
  const findNoteForFile = (fileItem: ContainerFileItemDto): Note | null => {
    // 1. Direct match by filePath
    const byFilePath = allNotes.find((n) => n.filePath && normalize(n.filePath) === normalize(fileItem.path));
    if (byFilePath) return byFilePath;

    // 2. Match by title from file name
    const fileName = fileItem.path.split('/').pop() || '';
    const cleanTitle = fileName.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}\s*-\s*/, '').trim();

    const byTitle = allNotes.find((n) => n.title.toLowerCase() === cleanTitle.toLowerCase());
    if (byTitle) return byTitle;

    // 3. Match from content frontmatter lenta_id
    if (fileItem.content) {
      const match = fileItem.content.match(/lenta_id:\s*["']?([a-f0-9-]+)["']?/i);
      if (match && match[1]) {
        const byId = allNotes.find((n) => n.id === match[1]);
        if (byId) return byId;
      }
    }

    return null;
  };

  // Navigations
  const handleSelectFolder = (folderPath: string) => {
    setCurrentDir(folderPath);
    setSelectedFile(null);
    onNavigatePath?.(folderPath, null);
  };

  const handleSelectFile = (fileItem: ContainerFileItemDto) => {
    setSelectedFile(fileItem);
    onNavigatePath?.(currentDir, fileItem.path);
  };

  const handleCloseFileView = () => {
    setSelectedFile(null);
    onNavigatePath?.(currentDir, null);
  };

  const handleOpenNoteModal = (f: ContainerFileItemDto) => {
    const note = findNoteForFile(f);
    if (note) {
      if (onSelectNote) {
        onSelectNote(note);
      } else {
        setActiveNoteModal(note);
      }
    } else {
      setSelectedFile(f);
      onNavigatePath?.(currentDir, f.path);
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Parsed markdown for selected file
  const parsedMarkdown = useMemo(() => {
    if (!selectedFile?.content) {
      return { frontmatter: {} as Record<string, any>, body: '', title: '', hashtags: [] as string[], lentaId: undefined as string | undefined };
    }
    return LentaFrontmatterUtil.parseMarkdown(selectedFile.content);
  }, [selectedFile?.content]);

  const noteForSelectedFile = selectedFile ? findNoteForFile(selectedFile) : null;
  const latestCommit = serverCommits[0] || null;

  return (
    <div className={`flex-1 w-full min-w-0 flex flex-col h-full bg-[#121414] text-[#e2e2e2] overflow-hidden ${className}`}>
      {/* 1. Header Toolbar (Git Repository Header) */}
      <div className="px-5 py-3.5 border-b border-[#242828] bg-[#161818] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {showBackToContainers && (
            <button
              onClick={showBackToContainers}
              className="p-1.5 rounded-lg bg-[#1e2020] hover:bg-[#282b2b] text-[#93927e] hover:text-white border border-[#2d3030] transition-colors shrink-0"
              title="Назад к списку контейнеров"
            >
              <ArrowUpLeft className="w-4 h-4" />
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#a855f7]/30 to-[#6b21a8]/20 border border-[#a855f7]/40 flex items-center justify-center text-base shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            📦
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-sans font-bold text-sm md:text-base text-white truncate">
                {container?.name || 'Obsidian Container'}
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border shrink-0 ${
                  isPrivate
                    ? 'bg-[#a855f7]/15 border-[#a855f7]/30 text-[#d8b4fe]'
                    : 'bg-[#c9cd58]/15 border-[#c9cd58]/30 text-[#e5e971]'
                }`}
              >
                {isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                <span>{isPrivate ? 'Private' : 'Public'}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[#93927e] mt-0.5">
              <span className="flex items-center gap-1 shrink-0">
                <GitBranch className="w-3 h-3 text-[#c9cd58]" />
                <span className="text-[#c9c7b2]">main</span>
              </span>
              <span>•</span>
              <span className="truncate">{container?.vaultPath || 'Vault'}</span>
              <span>•</span>
              <span className="text-[#e5e971] shrink-0">{files.length} файлов</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Search in Container */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#93927e]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск файлов в Vault..."
              className="w-40 sm:w-52 bg-[#121414] border border-[#2d3030] focus:border-[#a855f7] rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-mono text-[#e2e2e2] outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#93927e] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Push Button */}
          <button
            onClick={() => openSyncModal({ mode: 'push', containerId })}
            className="px-3 py-1.5 rounded-lg bg-[#141616] hover:bg-[#202323] text-[#c9cd58] border border-[#c9cd58]/40 hover:border-[#c9cd58] font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            title="Отправить изменения на сервер (Git Push)"
          >
            <Upload className={`w-3.5 h-3.5 ${isSyncing && syncDirection === 'push' ? 'animate-bounce text-[#e5e971]' : ''}`} />
            <span>Push</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#c9cd58] text-[#121414] text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Pull Button */}
          <button
            onClick={() => openSyncModal({ mode: 'pull', containerId })}
            className="px-3 py-1.5 rounded-lg bg-[#141616] hover:bg-[#202323] text-[#a855f7] border border-[#a855f7]/40 hover:border-[#a855f7] font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            title="Затянуть обновления с сервера (Git Pull)"
          >
            <Download className={`w-3.5 h-3.5 ${isSyncing && syncDirection === 'pull' ? 'animate-bounce text-[#d8b4fe]' : ''}`} />
            <span>Pull</span>
          </button>

          {/* Create Note Quick Action */}
          <button
            onClick={() => setIsCreateNoteOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#a855f7] hover:bg-[#b76eff] text-white font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(168,85,247,0.3)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Заметка</span>
          </button>

          {/* Toggle Commits Panel */}
          <button
            onClick={() => setShowCommitsPanel((prev) => !prev)}
            className={`p-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 ${
              showCommitsPanel
                ? 'bg-[#a855f7]/20 border-[#a855f7]/50 text-[#d8b4fe]'
                : 'bg-[#1e2020] border-[#2d3030] text-[#93927e] hover:text-white'
            }`}
            title={showCommitsPanel ? 'Скрыть историю коммитов' : 'Показать историю коммитов'}
          >
            <GitCommit className="w-4 h-4" />
            <span className="hidden sm:inline">Коммиты</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Latest Commit Banner (Git style) */}
      <div className="px-5 py-2.5 bg-[#181a1a] border-b border-[#242828] flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
          <div className="w-5 h-5 rounded-full bg-[#a855f7]/20 text-[#d8b4fe] border border-[#a855f7]/40 flex items-center justify-center shrink-0">
            <GitCommit className="w-3 h-3" />
          </div>

          <div className="flex items-center gap-2 overflow-hidden truncate">
            {latestCommit ? (
              <>
                <span className="font-bold text-[#e2e2e2] truncate">
                  {latestCommit.message}
                </span>
                <span className="text-[#93927e] hidden sm:inline">•</span>
                <span className="text-[#93927e] hidden sm:inline truncate">
                  {latestCommit.author}
                </span>
                <span className="text-[#93927e] hidden sm:inline">•</span>
                <span className="text-[#93927e] shrink-0">
                  {dayjs(latestCommit.date).fromNow()}
                </span>
              </>
            ) : (
              <span className="text-[#93927e]">Синхронизирован с Obsidian Vault</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {latestCommit && (
            <span className="px-2 py-0.5 rounded bg-[#121414] border border-[#2d3030] text-[#d8b4fe] font-mono text-[11px] font-bold">
              {latestCommit.shortHash || latestCommit.hash?.slice(0, 7) || 'HEAD'}
            </span>
          )}

          <button
            onClick={() => {
              refetchFiles();
              refetchCommits();
            }}
            className="p-1 rounded text-[#93927e] hover:text-white hover:bg-[#202323] transition-colors"
            title="Обновить файлы и коммиты"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFilesLoading ? 'animate-spin text-[#c9cd58]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. Main Split View (File Manager / Dedicated File View + Commit History Sidebar) */}
      <div className="flex-1 w-full min-w-0 flex overflow-hidden">
        {/* Dedicated File View (When file is open) */}
        {selectedFile ? (
          <div className="flex-1 w-full min-w-0 flex flex-col overflow-hidden bg-[#121414]">
            {/* File Top Navigation Bar */}
            <div className="px-5 py-3 border-b border-[#242828] bg-[#161818] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 overflow-hidden min-w-0">
                <button
                  type="button"
                  onClick={handleCloseFileView}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1e2020] hover:bg-[#282a2a] text-xs font-mono text-[#c9c7b2] hover:text-white border border-[#2d3030] transition-colors shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">К списку файлов</span>
                </button>

                <span className="text-[#444] shrink-0">/</span>

                {/* File Breadcrumbs */}
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#93927e] overflow-hidden truncate">
                  <button
                    onClick={() => handleSelectFolder('')}
                    className="hover:text-white transition-colors truncate text-[#c9c7b2]"
                  >
                    {container?.name || 'Vault'}
                  </button>
                  {breadcrumbs
                    .filter((c) => c.path)
                    .map((crumb) => (
                      <React.Fragment key={crumb.path}>
                        <span className="text-[#444] shrink-0">/</span>
                        <button
                          onClick={() => handleSelectFolder(crumb.path)}
                          className="hover:text-white transition-colors truncate text-[#c9c7b2]"
                        >
                          {crumb.name}
                        </button>
                      </React.Fragment>
                    ))}
                  <span className="text-[#444] shrink-0">/</span>
                  <span className="font-bold text-[#e5e971] truncate">
                    {selectedFile.path.split('/').pop() || selectedFile.path}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono text-[#93927e] hidden md:inline">
                  {formatBytes(selectedFile.size)}
                </span>

                {noteForSelectedFile?.type && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#a855f7]/20 text-[#d8b4fe] border border-[#a855f7]/30">
                    {noteForSelectedFile.type}
                  </span>
                )}

                {/* Rendered / Raw toggle */}
                <div className="flex items-center bg-[#181a1a] rounded-lg p-0.5 border border-[#2d3030]">
                  <button
                    onClick={() => setPreviewTab('rendered')}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                      previewTab === 'rendered'
                        ? 'bg-[#252828] text-white shadow-sm'
                        : 'text-[#93927e] hover:text-[#e2e2e2]'
                    }`}
                  >
                    Предпросмотр
                  </button>
                  <button
                    onClick={() => setPreviewTab('raw')}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                      previewTab === 'raw'
                        ? 'bg-[#252828] text-white shadow-sm'
                        : 'text-[#93927e] hover:text-[#e2e2e2]'
                    }`}
                  >
                    Raw
                  </button>
                </div>

                {/* Open in Lenta Modal */}
                <button
                  type="button"
                  onClick={() => handleOpenNoteModal(selectedFile)}
                  className="px-2.5 py-1 rounded-lg bg-[#c9cd58]/20 hover:bg-[#c9cd58]/30 text-[#e5e971] border border-[#c9cd58]/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Открыть в Lenta</span>
                </button>

                {/* Copy Path */}
                <button
                  type="button"
                  onClick={() => handleCopyPath(selectedFile.path)}
                  className="p-1.5 rounded-lg bg-[#1e2020] hover:bg-[#282a2a] text-[#93927e] hover:text-white border border-[#2d3030] transition-colors"
                  title="Копировать относительный путь"
                >
                  {copiedPath === selectedFile.path ? (
                    <Check className="w-4 h-4 text-[#22c55e]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* File Body Content Canvas */}
            <div className="flex-1 w-full min-w-0 overflow-y-auto p-4 md:p-8">
              <div className="max-w-4xl mx-auto w-full space-y-6">
                {/* Obsidian / Notion Properties Inspector Block */}
                {parsedMarkdown.frontmatter && Object.keys(parsedMarkdown.frontmatter).length > 0 && (
                  <div className="rounded-xl bg-[#161818] border border-[#262828] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowFrontmatter((prev) => !prev)}
                      className="w-full px-4 py-2.5 bg-[#1a1d1d] hover:bg-[#202323] border-b border-[#262828] flex items-center justify-between text-xs font-mono text-[#93927e] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#a855f7]" />
                        <span className="font-bold text-[#e2e2e2]">Свойства заметки (Frontmatter)</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#a855f7]/20 text-[#d8b4fe]">
                          {Object.keys(parsedMarkdown.frontmatter).length}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showFrontmatter ? 'rotate-180' : ''}`} />
                    </button>

                    {showFrontmatter && (
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                        {parsedMarkdown.lentaId && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-[#121414] border border-[#242828]">
                            <span className="text-[#93927e]">lenta_id:</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[#d8b4fe] truncate max-w-[180px]">
                                {parsedMarkdown.lentaId}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyPath(parsedMarkdown.lentaId!)}
                                className="p-1 hover:text-white"
                                title="Копировать lenta_id"
                              >
                                {copiedPath === parsedMarkdown.lentaId ? (
                                  <Check className="w-3 h-3 text-[#22c55e]" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {parsedMarkdown.frontmatter.title && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-[#121414] border border-[#242828]">
                            <span className="text-[#93927e]">Заголовок:</span>
                            <span className="text-white font-bold truncate max-w-[200px]">
                              {String(parsedMarkdown.frontmatter.title)}
                            </span>
                          </div>
                        )}

                        {parsedMarkdown.frontmatter.type && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-[#121414] border border-[#242828]">
                            <span className="text-[#93927e]">Тип:</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#a855f7]/20 text-[#d8b4fe] border border-[#a855f7]/40">
                              {String(parsedMarkdown.frontmatter.type)}
                            </span>
                          </div>
                        )}

                        {parsedMarkdown.frontmatter.feed && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-[#121414] border border-[#242828]">
                            <span className="text-[#93927e]">Лента (Feed):</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#c9cd58]/20 text-[#e5e971] border border-[#c9cd58]/40">
                              {String(parsedMarkdown.frontmatter.feed)}
                            </span>
                          </div>
                        )}

                        {parsedMarkdown.frontmatter.start_date && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-[#121414] border border-[#242828]">
                            <span className="text-[#93927e]">Дата начала:</span>
                            <span className="text-[#c9c7b2]">
                              {dayjs(String(parsedMarkdown.frontmatter.start_date)).isValid()
                                ? dayjs(String(parsedMarkdown.frontmatter.start_date)).format('DD.MM.YYYY HH:mm')
                                : String(parsedMarkdown.frontmatter.start_date)}
                            </span>
                          </div>
                        )}

                        {parsedMarkdown.frontmatter.updated_at && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-[#121414] border border-[#242828]">
                            <span className="text-[#93927e]">Обновлено:</span>
                            <span className="text-[#93927e]">
                              {dayjs(String(parsedMarkdown.frontmatter.updated_at)).isValid()
                                ? dayjs(String(parsedMarkdown.frontmatter.updated_at)).format('DD.MM.YYYY HH:mm')
                                : String(parsedMarkdown.frontmatter.updated_at)}
                            </span>
                          </div>
                        )}

                        {parsedMarkdown.hashtags.length > 0 && (
                          <div className="sm:col-span-2 flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-[#121414] border border-[#242828]">
                            <span className="text-[#93927e] mr-1">Теги:</span>
                            {parsedMarkdown.hashtags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded text-[10px] bg-[#1e2020] text-[#c9c7b2] border border-[#2e3030]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Rendered Markdown or Raw View */}
                {previewTab === 'rendered' ? (
                  <article className="prose prose-invert max-w-none prose-neutral [&_h1]:text-[#e5e971] [&_h1]:font-bold [&_h1]:text-2xl [&_h2]:text-[#d8b4fe] [&_h2]:font-bold [&_h2]:text-xl [&_h3]:text-[#93c5fd] [&_table]:border-collapse [&_th]:border-b [&_th]:border-[#2d3030] [&_td]:border-b [&_td]:border-[#242828] [&_blockquote]:border-l-4 [&_blockquote]:border-l-[#a855f7] [&_blockquote]:bg-[#181a1a]/50 [&_blockquote]:py-1 [&_blockquote]:px-4 [&_code]:text-[#d8b4fe] [&_code]:bg-[#1e2020] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded text-[#c9c7b2] leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {parsedMarkdown.body || '*(Заметка не содержит дополнительного текста)*'}
                    </ReactMarkdown>
                  </article>
                ) : (
                  <div className="rounded-xl border border-[#242828] bg-[#0d0f0f] overflow-hidden">
                    <div className="px-4 py-2 border-b border-[#242828] bg-[#141616] flex items-center justify-between text-[11px] font-mono text-[#93927e]">
                      <span>Исходный Markdown с frontmatter</span>
                      <span>{formatBytes(selectedFile.size)}</span>
                    </div>
                    <pre className="p-5 font-mono text-xs text-[#c9c7b2] whitespace-pre-wrap leading-relaxed select-text overflow-x-auto">
                      {selectedFile.content || 'Файл пуст'}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Directory Files Table View */
          <div className="flex-1 w-full min-w-0 flex flex-col bg-[#121414] overflow-hidden">
            {/* Breadcrumbs Navigation Bar */}
            <div className="px-5 py-2 border-b border-[#242828] bg-[#141616] flex items-center gap-1.5 text-xs font-mono text-[#93927e] overflow-x-auto shrink-0">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.path}>
                  {idx > 0 && <span className="text-[#444747]">/</span>}
                  <button
                    onClick={() => handleSelectFolder(crumb.path)}
                    className={`hover:text-white transition-colors truncate ${
                      idx === breadcrumbs.length - 1 ? 'text-[#e5e971] font-bold' : 'text-[#c9c7b2]'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* File Table / Explorer List */}
            <div className="flex-1 w-full min-w-0 overflow-y-auto">
              {isFilesLoading ? (
                <div className="p-12 text-center text-xs font-mono text-[#93927e] flex flex-col items-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#c9cd58]" />
                  <span>Загрузка файлов Obsidian контейнера...</span>
                </div>
              ) : currentItems.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-[#93927e] space-y-2">
                  <FolderOpen className="w-10 h-10 mx-auto text-[#333737]" />
                  <p className="font-semibold text-[#e2e2e2]">Папка пуста</p>
                  <p className="text-[11px]">В этой директории контейнера пока нет файлов.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs font-mono table-fixed border-collapse">
                  <thead>
                    <tr className="border-b border-[#242828] text-[#93927e] text-[10px] uppercase tracking-wider bg-[#141616]">
                      <th className="py-2.5 px-5 font-semibold w-auto">Имя</th>
                      <th className="py-2.5 px-4 font-semibold hidden md:table-cell w-28">Тип</th>
                      <th className="py-2.5 px-4 font-semibold hidden sm:table-cell w-24">Размер</th>
                      <th className="py-2.5 px-4 font-semibold hidden lg:table-cell w-36">Изменён</th>
                      <th className="py-2.5 px-5 font-semibold text-right w-24">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2020]">
                    {/* Up One Level Row */}
                    {currentDir && !searchTerm && (
                      <tr
                        onClick={() => {
                          const lastSlash = currentDir.lastIndexOf('/');
                          const parent = lastSlash === -1 ? '' : currentDir.substring(0, lastSlash);
                          handleSelectFolder(parent);
                        }}
                        className="hover:bg-[#181a1a] cursor-pointer text-[#93927e] hover:text-[#e5e971] transition-colors"
                      >
                        <td colSpan={5} className="py-2.5 px-5 flex items-center gap-2 font-bold">
                          <ArrowUpLeft className="w-3.5 h-3.5" />
                          <span>.. (Наверх)</span>
                        </td>
                      </tr>
                    )}

                    {currentItems.map((item) => {
                      const isFolder = item.type === 'folder';
                      const note = !isFolder && item.file ? findNoteForFile(item.file) : null;

                      return (
                        <tr
                          key={item.fullPath}
                          onClick={() => {
                            if (isFolder) {
                              handleSelectFolder(item.fullPath);
                            } else if (item.file) {
                              handleSelectFile(item.file);
                            }
                          }}
                          className="group hover:bg-[#1a1c1c] cursor-pointer transition-colors text-[#c9c7b2]"
                        >
                          {/* Name & Icon */}
                          <td className="py-2.5 px-5 truncate">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              {isFolder ? (
                                <Folder className="w-4 h-4 text-[#c9cd58] shrink-0" />
                              ) : (
                                <FileText className="w-4 h-4 text-[#3b82f6] shrink-0" />
                              )}
                              <span className={`truncate ${isFolder ? 'font-bold text-[#e2e2e2] group-hover:text-white' : ''}`}>
                                {item.name}
                              </span>
                            </div>
                          </td>

                          {/* Note Type Badge */}
                          <td className="py-2.5 px-4 hidden md:table-cell truncate">
                            {isFolder ? (
                              <span className="text-[10px] text-[#93927e]">{item.itemCount} эл.</span>
                            ) : note?.type ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#a855f7]/15 text-[#d8b4fe] border border-[#a855f7]/30">
                                {note.type}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#93927e]">Markdown</span>
                            )}
                          </td>

                          {/* File Size */}
                          <td className="py-2.5 px-4 text-[#93927e] hidden sm:table-cell truncate">
                            {isFolder ? '-' : formatBytes(item.file?.size)}
                          </td>

                          {/* Last Modified Date */}
                          <td className="py-2.5 px-4 text-[#93927e] hidden lg:table-cell truncate">
                            {item.file?.mtime ? dayjs(item.file.mtime).format('DD.MM.YYYY HH:mm') : '-'}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              {!isFolder && item.file && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenNoteModal(item.file!);
                                    }}
                                    className="p-1 rounded hover:bg-[#252828] text-[#93927e] hover:text-[#e5e971]"
                                    title="Открыть карточку заметки"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyPath(item.fullPath);
                                    }}
                                    className="p-1 rounded hover:bg-[#252828] text-[#93927e] hover:text-white"
                                    title="Копировать относительный путь"
                                  >
                                    {copiedPath === item.fullPath ? (
                                      <Check className="w-3.5 h-3.5 text-[#22c55e]" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </>
                              )}
                              {isFolder && (
                                <ChevronRight className="w-3.5 h-3.5 text-[#555] group-hover:text-[#c9cd58]" />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Right Pane: Commit History Stream (Time Machine) */}
        {showCommitsPanel && (
          <aside className="w-80 md:w-96 border-l border-[#242828] bg-[#161818] flex flex-col shrink-0 animate-in slide-in-from-right-2 duration-150">
            {/* Commits Header */}
            <div className="p-3.5 border-b border-[#242828] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#a855f7]" />
                <h3 className="font-sans font-bold text-xs text-white">История коммитов</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#a855f7]/20 text-[#d8b4fe] font-bold">
                  {serverCommits.length}
                </span>
              </div>

              <button
                onClick={() => setShowCommitsPanel(false)}
                className="p-1 rounded text-[#93927e] hover:text-white transition-colors"
                title="Скрыть панель коммитов"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            {/* Commits List Stream */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {isCommitsLoading ? (
                <div className="p-6 text-center text-xs font-mono text-[#93927e]">
                  Загрузка коммитов...
                </div>
              ) : serverCommits.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-[#93927e]">
                  Коммитов пока нет. Выполните Push для первой фиксации.
                </div>
              ) : (
                serverCommits.map((c, idx) => (
                  <div
                    key={c.commitHash || c.hash || idx}
                    className="p-3 rounded-xl bg-[#121414] border border-[#242828] hover:border-[#a855f7]/50 transition-all space-y-1.5 relative group"
                  >
                    {/* Commit Message */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-sans font-semibold text-xs text-[#e2e2e2] leading-snug">
                        {c.message || 'Синхронизация хранилища'}
                      </h4>
                      <span className="px-1.5 py-0.5 rounded bg-[#1e2020] text-[#d8b4fe] font-mono text-[10px] font-bold border border-[#2d3030] shrink-0">
                        {c.shortHash || c.hash?.slice(0, 7) || 'HEAD'}
                      </span>
                    </div>

                    {/* Metadata: Author, Date, Changes */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#93927e]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[#c9c7b2] truncate">{c.author || 'obsidian-agent'}</span>
                        <span>•</span>
                        <span className="shrink-0">{dayjs(c.date).fromNow()}</span>
                      </div>

                      {c.filesChanged !== undefined && c.filesChanged > 0 && (
                        <span className="text-[10px] font-mono text-[#c9cd58] shrink-0">
                          {c.filesChanged} ф.
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Note Detail Modal if opened */}
      {activeNoteModal && (
        <NoteDetailModal
          note={activeNoteModal}
          onClose={() => {
            setActiveNoteModal(null);
            refetchFiles();
          }}
        />
      )}

      {/* Create Note Modal if opened */}
      {isCreateNoteOpen && (
        <CreateNoteModal
          isOpen={isCreateNoteOpen}
          onClose={() => setIsCreateNoteOpen(false)}
          initialFolderPath={currentDir || undefined}
          onSuccess={() => {
            refetchFiles();
            setIsCreateNoteOpen(false);
          }}
        />
      )}
    </div>
  );
};
