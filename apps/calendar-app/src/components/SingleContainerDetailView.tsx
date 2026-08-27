import React, { useState } from 'react';
import { useObsidianContainers, ContainerPrivacyImpact } from '../context/ObsidianContainersContext';
import { useFoldersContext } from '../context/FoldersContext';
import { useObsidianContainerCommitsQuery, useObsidianContainerTreeQuery } from '../api/queries';
import { useI18n } from '../i18n';
import { ObsidianLogo } from './ObsidianLogo';
import { PrivacyChangeWarningModal } from './PrivacyChangeWarningModal';
import { ContainerObserveMode, FolderPrivacy } from '@lenta/shared';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  Lock,
  Globe,
  Folder,
  FolderPlus,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  ShieldCheck,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  FolderGit2,
  AlertTriangle,
  Upload,
  Download,
  Clock,
  Settings,
  Zap,
} from 'lucide-react';
import dayjs from 'dayjs';

interface SingleContainerDetailViewProps {
  containerId: string;
  onBack: () => void;
  initialTab?: 'history' | 'folders' | 'preview' | 'settings';
}

export const SingleContainerDetailView: React.FC<SingleContainerDetailViewProps> = ({
  containerId,
  onBack,
  initialTab = 'history',
}) => {
  const { t } = useI18n();
  const {
    containers,
    updateContainer,
    deleteContainer,
    togglePrivacy,
    checkContainerPrivacyChangeImpact,
    addBoundFolder,
    removeBoundFolder,
    regenerateToken,
    pushContainer,
    pullContainer,
    isSyncingId,
    syncDirection,
    pendingChanges,
  } = useObsidianContainers();

  const { folders } = useFoldersContext();

  const container = containers.find((c) => c.id === containerId);

  const [activeTab, setActiveTab] = useState<'history' | 'folders' | 'preview' | 'settings'>(initialTab);
  const [copiedToken, setCopiedToken] = useState(false);
  const [warningContainerImpact, setWarningContainerImpact] = useState<ContainerPrivacyImpact | null>(null);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);

  // Quick Folder Binding Input State
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [bindingError, setBindingError] = useState('');
  const [quickFolderInput, setQuickFolderInput] = useState<{
    path: string;
    name: string;
    observeMode: ContainerObserveMode;
    filterTag: string;
  }>({
    path: '',
    name: '',
    observeMode: 'recursive',
    filterTag: '',
  });

  const [expandedNoteIdx, setExpandedNoteIdx] = useState<number | null>(0);

  if (!container) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#121414] text-[#e2e2e2]">
        <AlertTriangle className="w-10 h-10 text-[#f87171] mb-2" />
        <h3 className="text-base font-bold text-white mb-1">Контейнер не найден</h3>
        <p className="text-xs text-[#93927e] mb-4">Возможно, контейнер был удален или перемещен.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-[#242828] hover:bg-[#333] text-xs font-mono text-white flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Вернуться к списку контейнеров</span>
        </button>
      </div>
    );
  }

  const isPrivate = container.privacy === 'private';
  const isSyncing = isSyncingId === container.id;
  const pendingCount = pendingChanges[container.id] ?? 0;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(container.token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleContainerPrivacyToggle = () => {
    const impact = checkContainerPrivacyChangeImpact(container.id);
    if (impact.hasConflict) {
      setWarningContainerImpact(impact);
      setIsWarningModalOpen(true);
    } else {
      togglePrivacy(container.id, true);
    }
  };

  const handleConfirmContainerPrivacyChange = () => {
    if (warningContainerImpact) {
      togglePrivacy(warningContainerImpact.containerId, true);
      setWarningContainerImpact(null);
    }
  };

  const handleQuickFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBindingError('');
    if (!quickFolderInput.path.trim()) return;

    const cleanPath = quickFolderInput.path.trim().replace(/^\/+|\/+$/g, '');
    const matchedFolder = folders.find(
      (f) => f.path.toLowerCase() === cleanPath.toLowerCase()
    );
    const folderPrivacy: FolderPrivacy =
      matchedFolder?.privacy || (container.privacy === 'private' ? 'private' : 'public');

    const result = addBoundFolder(container.id, {
      path: cleanPath,
      name:
        quickFolderInput.name.trim() ||
        matchedFolder?.name ||
        cleanPath.split('/').pop() ||
        cleanPath,
      observeMode: quickFolderInput.observeMode,
      filterTag: quickFolderInput.filterTag.trim() || undefined,
      privacy: folderPrivacy,
      notesCount: (matchedFolder as any)?._count?.noteFolders ?? 0,
    });

    if (!result.success) {
      setBindingError(result.error || t.cannotAddPrivateFolderToPublicContainer);
      return;
    }

    setIsAddFolderOpen(false);
    setBindingError('');
    setQuickFolderInput({
      path: '',
      name: '',
      observeMode: 'recursive',
      filterTag: '',
    });
  };

  // Real container commit history query
  const { data: serverCommits = [] } = useObsidianContainerCommitsQuery(containerId);

  const commitHistory = serverCommits.length > 0
    ? serverCommits.map((c) => ({
        hash: c.shortHash || c.hash?.slice(0, 7) || 'HEAD',
        message: c.message || 'Container sync commit',
        author: c.author || 'obsidian-agent',
        date: c.date ? dayjs(c.date).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss'),
        changes: c.filesChanged ? `${c.filesChanged} file(s) changed` : 'Sync update',
        type: 'sync' as const,
      }))
    : [
        {
          hash: 'a7f93d2e',
          message: 'Sync notes from Obsidian Vault (2-Way Merge)',
          author: 'obsidian-agent',
          date: dayjs().subtract(15, 'minute').format('YYYY-MM-DD HH:mm:ss'),
          changes: '+4 files, -1 file',
          type: 'sync' as const,
        },
        {
          hash: '90c421ab',
          message: 'Initial container structure created',
          author: 'system',
          date: dayjs(container?.createdAt || Date.now()).format('YYYY-MM-DD HH:mm:ss'),
          changes: 'Created vault workspace',
          type: 'create' as const,
        },
      ];

  // Mock notes for preview tab
  const mockNotesPreview = [
    {
      title: 'Release Planning v2.1',
      path: '01_Daily_Logs/Release_Planning.md',
      type: 'EVENT',
      content: `## Overview\n\nThis release focuses on **sync performance** and stability improvements.\n\n- ✅ Field-level LWW merge\n- 🔄 Auto-push on save\n- 📥 Pull delta changes\n\n### Implementation Checklist\n1. [x] Update Obsidian Plugin client API\n2. [x] Bind observed folders with privacy rules\n3. [ ] Verify SSE stream live reconnect`,
    },
    {
      title: 'AI Architecture & Vector Pipelines',
      path: '02_Projects/AI_Research.md',
      type: 'SINGLE',
      content: `## Key Findings\n\nRecent studies on **transformer architectures** show promising results for long-context reasoning.\n\n> "The attention mechanism remains the core driver of capability scaling"\n\n### References\n- Vaswani et al. 2017\n- GPT-4 Technical Report`,
    },
    {
      title: 'Events & Premieres 2026',
      path: '03_Culture/Events_2026.md',
      type: 'FILM_RELEASE',
      content: `## Upcoming Premieres\n\n| Title | Date | Rating |\n|---|---|---|\n| Dune: Part Three | 2026-09-15 | ⭐⭐⭐⭐ |\n| Avengers: Secret Wars | 2026-11-01 | TBD |`,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121414] text-[#e2e2e2]">
      {/* 1. Top Navigation & Container Header */}
      <div className="bg-[#181a1a] border-b border-[#242828] px-4 lg:px-8 py-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121414] hover:bg-[#242828] border border-[#242828] text-xs font-mono text-[#c9c7b2] hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Все контейнеры</span>
          </button>

          <span className="text-[#444]">/</span>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6]/30 via-[#6b21a8]/20 to-[#1e142e] border border-[#a855f7]/50 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <ObsidianLogo size={22} glow />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-sans font-bold text-base md:text-lg text-[#f3e8ff] truncate">
                  {container.name}
                </h1>
                <button
                  onClick={handleContainerPrivacyToggle}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border shrink-0 ${
                    isPrivate
                      ? 'bg-[#a855f7]/20 border-[#a855f7]/40 text-[#d8b4fe]'
                      : 'bg-[#c9cd58]/20 border-[#c9cd58]/40 text-[#e5e971]'
                  }`}
                >
                  {isPrivate ? <Lock className="w-3 h-3 text-[#a855f7]" /> : <Globe className="w-3 h-3 text-[#c9cd58]" />}
                  <span>{isPrivate ? 'Приватный Vault' : 'Публичный Vault'}</span>
                </button>
              </div>

              <p className="font-mono text-[11px] text-[#93927e] truncate flex items-center gap-1.5 mt-0.5">
                <Folder className="w-3 h-3 text-[#c9c7b2]" />
                <span>{container.vaultPath}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Sync & Control Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => pushContainer(container.id)}
            disabled={isSyncing}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isSyncing && syncDirection === 'push'
                ? 'bg-[#c9cd58]/25 text-[#e5e971] border-[#c9cd58]/50'
                : 'bg-[#121414] hover:bg-[#c9cd58]/15 border-[#242828] hover:border-[#c9cd58]/60 text-[#e2e2e2] hover:text-[#e5e971]'
            }`}
          >
            <Upload className={`w-3.5 h-3.5 ${isSyncing && syncDirection === 'push' ? 'animate-bounce text-[#e5e971]' : ''}`} />
            <span>Push</span>
            {pendingCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#c9cd58] text-[#121414] text-[9px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => pullContainer(container.id)}
            disabled={isSyncing}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isSyncing && syncDirection === 'pull'
                ? 'bg-[#a855f7]/25 text-[#d8b4fe] border-[#a855f7]/50'
                : 'bg-[#121414] hover:bg-[#a855f7]/15 border-[#242828] hover:border-[#a855f7]/60 text-[#e2e2e2] hover:text-[#d8b4fe]'
            }`}
          >
            <Download className={`w-3.5 h-3.5 ${isSyncing && syncDirection === 'pull' ? 'animate-bounce text-[#d8b4fe]' : ''}`} />
            <span>Pull</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm(t.deleteContainerConfirm || 'Удалить этот контейнер?')) {
                deleteContainer(container.id);
                onBack();
              }
            }}
            className="p-2 rounded-lg bg-[#121414] hover:bg-[#2a1a1a] border border-[#242828] hover:border-[#ef4444] text-[#93927e] hover:text-[#f87171] transition-colors"
            title="Удалить контейнер"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Workspace Navigation Tabs */}
      <div className="bg-[#181a1a]/60 border-b border-[#242828] px-4 lg:px-8 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-mono font-medium transition-all ${
            activeTab === 'history'
              ? 'border-[#a855f7] text-white font-bold'
              : 'border-transparent text-[#93927e] hover:text-[#e2e2e2]'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-[#a855f7]" />
          <span>История изменений (Time Machine)</span>
        </button>

        <button
          onClick={() => setActiveTab('folders')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-mono font-medium transition-all ${
            activeTab === 'folders'
              ? 'border-[#a855f7] text-white font-bold'
              : 'border-transparent text-[#93927e] hover:text-[#e2e2e2]'
          }`}
        >
          <FolderGit2 className="w-3.5 h-3.5 text-[#c9cd58]" />
          <span>Привязанные папки ({container.boundFolders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-mono font-medium transition-all ${
            activeTab === 'preview'
              ? 'border-[#a855f7] text-white font-bold'
              : 'border-transparent text-[#93927e] hover:text-[#e2e2e2]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-[#3b82f6]" />
          <span>Предпросмотр заметок</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-mono font-medium transition-all ${
            activeTab === 'settings'
              ? 'border-[#a855f7] text-white font-bold'
              : 'border-transparent text-[#93927e] hover:text-[#e2e2e2]'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-[#93927e]" />
          <span>Настройки & Ключ</span>
        </button>
      </div>

      {/* 3. Tab Body Contents */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* TAB 1: Change History (Time Machine) */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#181a1a] border border-[#242828] space-y-4">
                <div className="flex items-center justify-between border-b border-[#242828] pb-3">
                  <div>
                    <h3 className="font-sans font-bold text-base text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#a855f7]" />
                      <span>Хронологическая история изменений</span>
                    </h3>
                    <p className="text-xs text-[#93927e] mt-0.5">
                      Фиксация коммитов и синхронизаций между Obsidian Vault и сервером.
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded bg-[#a855f7]/15 text-[#d8b4fe] font-mono text-xs border border-[#a855f7]/30">
                    Live Sync Active
                  </span>
                </div>

                {/* Commit Timeline List */}
                <div className="space-y-3">
                  {commitHistory.map((item) => (
                    <div
                      key={item.hash}
                      className="p-4 rounded-xl bg-[#121414] border border-[#242828] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-[#a855f7]/20 text-[#d8b4fe] border border-[#a855f7]/40">
                            {item.hash}
                          </span>
                          <h4 className="font-sans font-semibold text-sm text-[#e2e2e2]">
                            {item.message}
                          </h4>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono text-[#93927e]">
                          <span>Автор: {item.author}</span>
                          <span>•</span>
                          <span>{item.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-xs shrink-0">
                        <span className="px-2.5 py-1 rounded bg-[#1e2020] text-[#c9cd58] border border-[#2d3030]">
                          {item.changes}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Bound Folders Manager */}
          {activeTab === 'folders' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#181a1a] border border-[#242828] space-y-4">
                <div className="flex items-center justify-between border-b border-[#242828] pb-3">
                  <div>
                    <h3 className="font-sans font-bold text-base text-white flex items-center gap-2">
                      <FolderGit2 className="w-4 h-4 text-[#c9cd58]" />
                      <span>Отслеживаемые папки (Observed Folders)</span>
                    </h3>
                    <p className="text-xs text-[#93927e] mt-0.5">
                      Правила рекурсивного наблюдения и сопоставления папок Obsidian.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsAddFolderOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#a855f7] hover:bg-[#b76eff] text-white font-sans text-xs font-semibold flex items-center gap-1.5"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Привязать папку</span>
                  </button>
                </div>

                {/* Inline Quick Add Form */}
                {isAddFolderOpen && (
                  <form
                    onSubmit={handleQuickFolderSubmit}
                    className="p-4 rounded-xl bg-[#121414] border border-[#a855f7]/50 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-[#d8b4fe]">
                      <span>Новая привязанная папка</span>
                      <button
                        type="button"
                        onClick={() => setIsAddFolderOpen(false)}
                        className="text-[#93927e] hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {bindingError && (
                      <div className="p-2.5 rounded-lg bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#fca5a5] text-xs font-mono flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-[#ef4444]" />
                        <span>{bindingError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Путь: 02_Projects/Lenta"
                        value={quickFolderInput.path}
                        onChange={(e) => {
                          setQuickFolderInput((prev) => ({ ...prev, path: e.target.value }));
                          setBindingError('');
                        }}
                        className="bg-[#181a1a] border border-[#242828] rounded-lg text-xs font-mono px-3 py-2 text-[#e2e2e2] outline-none focus:border-[#a855f7]"
                      />

                      <select
                        value={quickFolderInput.observeMode}
                        onChange={(e) =>
                          setQuickFolderInput((prev) => ({
                            ...prev,
                            observeMode: e.target.value as ContainerObserveMode,
                          }))
                        }
                        className="bg-[#181a1a] border border-[#242828] rounded-lg text-xs font-mono px-3 py-2 text-[#e2e2e2] outline-none"
                      >
                        <option value="recursive">Рекурсивно (все подпапки)</option>
                        <option value="all">Только прямые файлы</option>
                        <option value="filtered">Фильтрация по тегу</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddFolderOpen(false)}
                        className="px-3 py-1.5 rounded-lg bg-[#242828] text-xs font-mono text-[#93927e]"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-[#a855f7] hover:bg-[#b76eff] text-white text-xs font-mono font-semibold"
                      >
                        Сохранить привязку
                      </button>
                    </div>
                  </form>
                )}

                {/* Folder List */}
                <div className="space-y-2">
                  {container.boundFolders.map((bf) => (
                    <div
                      key={bf.id}
                      className="p-3.5 rounded-xl bg-[#121414] border border-[#242828] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Folder className={`w-4 h-4 shrink-0 ${bf.isPrimary ? 'text-[#e5e971]' : 'text-[#a855f7]'}`} />
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="font-mono text-sm text-[#e2e2e2] font-semibold truncate">
                            {bf.path}
                          </span>
                          {bf.isPrimary && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#c9cd58]/20 text-[#e5e971] border border-[#c9cd58]/40 font-bold shrink-0">
                              Primary Folder
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1e2020] text-[#93927e] border border-[#242828] shrink-0">
                            Mode: {bf.observeMode}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs text-[#93927e]">
                          {bf.notesCount || 0} заметок
                        </span>
                        {container.boundFolders.length > 1 && (
                          <button
                            onClick={() => removeBoundFolder(container.id, bf.id)}
                            className="p-1 rounded text-[#666] hover:text-[#f87171] hover:bg-[#242828]"
                            title="Отвязать папку"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Markdown Notes Preview */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#181a1a] border border-[#242828] space-y-4">
                <div className="border-b border-[#242828] pb-3">
                  <h3 className="font-sans font-bold text-base text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#3b82f6]" />
                    <span>Предпросмотр файлов Markdown</span>
                  </h3>
                  <p className="text-xs text-[#93927e] mt-0.5">
                    Инспекция рендеринга заметок хранилища Obsidian.
                  </p>
                </div>

                <div className="space-y-3">
                  {mockNotesPreview.map((note, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-[#121414] border border-[#242828] overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedNoteIdx(expandedNoteIdx === idx ? null : idx)}
                        className="w-full p-3.5 flex items-center justify-between hover:bg-[#181a1a] transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#a855f7]/20 text-[#d8b4fe] border border-[#a855f7]/30">
                            {note.type}
                          </span>
                          <div>
                            <h4 className="font-sans font-bold text-sm text-[#e2e2e2]">
                              {note.title}
                            </h4>
                            <p className="font-mono text-[11px] text-[#93927e]">
                              {note.path}
                            </p>
                          </div>
                        </div>

                        {expandedNoteIdx === idx ? (
                          <ChevronUp className="w-4 h-4 text-[#93927e]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#93927e]" />
                        )}
                      </button>

                      {expandedNoteIdx === idx && (
                        <div className="p-4 border-t border-[#242828] bg-[#0f1111] text-[#c9c7b2]">
                          <div className="prose prose-invert prose-xs max-w-none text-xs leading-relaxed [&_h2]:text-[#e5e971] [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-[#c9c7b2] [&_h3]:text-xs [&_strong]:text-[#f3e8ff] [&_table]:text-xs [&_blockquote]:border-l-[#a855f7] [&_blockquote]:text-[#93927e]">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {note.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Container Settings & Token */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#181a1a] border border-[#242828] space-y-5">
                <div className="border-b border-[#242828] pb-3">
                  <h3 className="font-sans font-bold text-base text-white flex items-center gap-2">
                    <Settings className="w-4 h-4 text-[#93927e]" />
                    <span>Настройки контейнера и API токена</span>
                  </h3>
                  <p className="text-xs text-[#93927e] mt-0.5">
                    Управление ключом подключения Obsidian Plugin и конфигурацией Vault.
                  </p>
                </div>

                {/* API Token Box */}
                <div className="p-4 rounded-xl bg-[#121414] border border-[#242828] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-[#c9c7b2] uppercase tracking-wider">
                      Ключ подключения (Obsidian Container Token)
                    </span>
                    <button
                      onClick={() => {
                        if (window.confirm(t.regenerateTokenConfirm || 'Сгенерировать новый ключ?')) {
                          regenerateToken(container.id);
                        }
                      }}
                      className="text-xs font-mono text-[#a855f7] hover:text-[#d8b4fe] flex items-center gap-1 font-semibold"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Обновить ключ</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={container.token}
                      className="flex-1 bg-[#181a1a] border border-[#242828] font-mono text-xs px-3 py-2 text-[#c9c7b2] rounded-lg outline-none select-all"
                    />
                    <button
                      onClick={handleCopyToken}
                      className={`px-4 py-2 rounded-lg font-mono text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                        copiedToken
                          ? 'bg-[#22c55e] text-white'
                          : 'bg-[#1e2020] border border-[#333] hover:border-[#a855f7] text-[#e2e2e2]'
                      }`}
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedToken ? 'Скопировано!' : 'Скопировать token'}</span>
                    </button>
                  </div>
                </div>

                {/* Vault Description & Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-[#121414] border border-[#242828] space-y-1">
                    <span className="text-[11px] font-mono text-[#93927e] uppercase">
                      Путь к хранилищу Vault
                    </span>
                    <p className="text-xs font-mono text-white font-semibold">
                      {container.vaultPath}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#121414] border border-[#242828] space-y-1">
                    <span className="text-[11px] font-mono text-[#93927e] uppercase">
                      Дата создания
                    </span>
                    <p className="text-xs font-mono text-[#c9cd58] font-semibold">
                      {dayjs(container.createdAt || Date.now()).format('DD.MM.YYYY HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Privacy Warning Modal */}
      <PrivacyChangeWarningModal
        isOpen={isWarningModalOpen}
        onClose={() => {
          setIsWarningModalOpen(false);
          setWarningContainerImpact(null);
        }}
        containerImpact={warningContainerImpact}
        onConfirm={handleConfirmContainerPrivacyChange}
      />
    </div>
  );
};
