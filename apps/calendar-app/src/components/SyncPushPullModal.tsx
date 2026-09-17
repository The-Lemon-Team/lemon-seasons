import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Upload,
  Download,
  Check,
  Sparkles,
  GitCommit,
  Clock,
  FileText,
  Folder as FolderIcon,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Modal } from './Modal';
import { useObsidianContainers, SessionChange, PullResult } from '../context/ObsidianContainersContext';
import { useFoldersContext } from '../context/FoldersContext';
import { useObsidianContainerCommitsQuery } from '../api/queries';
import { useI18n } from '../i18n';

interface SyncPushPullModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'push' | 'pull';
  targetContainerId?: string;
}

export const SyncPushPullModal: React.FC<SyncPushPullModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'push',
  targetContainerId,
}) => {
  const { t } = useI18n();
  const {
    containers,
    pushContainer,
    pullContainer,
    isSyncingId,
    syncDirection,
    sessionChanges,
    toggleStageSessionChange,
    stageAllSessionChanges,
    clearSessionChanges,
    lastPullResult,
    isServerConnected,
  } = useObsidianContainers();

  let refreshFolders: (() => Promise<void>) | undefined;
  try {
    const foldersCtx = useFoldersContext();
    refreshFolders = foldersCtx.refreshFolders;
  } catch {}

  // Active tab: 'push' | 'pull'
  const [activeMode, setActiveMode] = useState<'push' | 'pull'>(initialMode);

  // Selected container
  const [selectedContainerId, setSelectedContainerId] = useState<string>(
    targetContainerId || containers[0]?.id || 'main-vault'
  );

  // Sync mode and container on open/prop changes
  useEffect(() => {
    if (isOpen) {
      if (initialMode) setActiveMode(initialMode);
      if (targetContainerId) {
        setSelectedContainerId(targetContainerId);
      } else if (!selectedContainerId && containers.length > 0) {
        setSelectedContainerId(containers[0].id);
      }
    }
  }, [isOpen, initialMode, targetContainerId, containers]);

  // Selected container object
  const selectedContainer = useMemo(() => {
    return (
      containers.find((c) => c.id === selectedContainerId) ||
      containers[0] || {
        id: selectedContainerId || 'main-vault',
        name: 'Основное хранилище (Primary Vault)',
        type: 'obsidian',
        privacy: 'public',
        notesCount: 0,
      }
    );
  }, [containers, selectedContainerId]);

  // Real or cached server commits for this container
  const { data: serverCommits = [], refetch: refetchCommits } =
    useObsidianContainerCommitsQuery(selectedContainer?.id || null);

  // Push state
  const [commitMessage, setCommitMessage] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [pushStep, setPushStep] = useState<number>(0); // 0: idle, 1: staging, 2: uploading, 3: done
  const [pushSuccess, setPushSuccess] = useState<{ commit: string; message: string } | null>(null);
  const [expandedChangeId, setExpandedChangeId] = useState<string | null>(null);

  // Pull state
  const [isPulling, setIsPulling] = useState(false);
  const [pullStep, setPullStep] = useState<number>(0);
  const [pulledFilesView, setPulledFilesView] = useState<PullResult | null>(lastPullResult);
  const [expandedFileIndex, setExpandedFileIndex] = useState<number | null>(null);
  const [copiedFileIndex, setCopiedFileIndex] = useState<number | null>(null);

  // Keep pulled files in sync with context
  useEffect(() => {
    if (lastPullResult) {
      setPulledFilesView(lastPullResult);
    }
  }, [lastPullResult]);

  // Staged session changes for this container or global
  const stagedChanges = useMemo(() => {
    return sessionChanges.filter((chg) => chg.staged);
  }, [sessionChanges]);

  // Filtered session changes for display
  const [changeFilter, setChangeFilter] = useState<'all' | 'staged' | 'notes' | 'folders'>('all');
  const filteredChanges = useMemo(() => {
    return sessionChanges.filter((chg) => {
      if (changeFilter === 'staged') return chg.staged;
      if (changeFilter === 'notes') return chg.entityType === 'note';
      if (changeFilter === 'folders') return chg.entityType === 'folder';
      return true;
    });
  }, [sessionChanges, changeFilter]);

  // Smart Auto-generate commit message
  const handleAutoGenerateCommit = () => {
    const list = stagedChanges.length > 0 ? stagedChanges : sessionChanges;
    if (list.length === 0) {
      setCommitMessage('chore(sync): синхронизация хранилища и папок');
      return;
    }

    const addedNotes = list.filter((c) => c.type === 'add' && c.entityType === 'note');
    const modNotes = list.filter((c) => c.type === 'modify' && c.entityType === 'note');
    const folderChanges = list.filter((c) => c.entityType === 'folder');

    let titlePart = '';
    if (addedNotes.length > 0 && folderChanges.length === 0) {
      const titles = addedNotes.slice(0, 2).map((n) => `"${n.title}"`).join(', ');
      titlePart = `feat(notes): добавлены ${addedNotes.length} заметки (${titles}${addedNotes.length > 2 ? ' и др.' : ''})`;
    } else if (folderChanges.length > 0 && addedNotes.length === 0) {
      titlePart = `feat(folders): обновлена структура каталогов (${folderChanges.map((f) => f.title).slice(0, 2).join(', ')})`;
    } else if (addedNotes.length > 0 && folderChanges.length > 0) {
      titlePart = `feat(vault): синхронизация ${addedNotes.length} заметок и ${folderChanges.length} папок`;
    } else if (modNotes.length > 0) {
      titlePart = `refactor(notes): обновление содержимого ${modNotes.length} заметок`;
    } else {
      titlePart = `chore(sync): обновление файлов контейнера (${list.length} изменений)`;
    }

    setCommitMessage(titlePart);
  };

  // Execute Push
  const handleExecutePush = async () => {
    const finalMsg =
      commitMessage.trim() ||
      `feat(sync): синхронизация ${stagedChanges.length || sessionChanges.length} изменений`;

    setIsPushing(true);
    setPushStep(1); // Staging
    setPushSuccess(null);

    try {
      await new Promise((r) => setTimeout(r, 450));
      setPushStep(2); // Uploading

      const filesToPush = (stagedChanges.length > 0 ? stagedChanges : sessionChanges).map(
        (c) => ({
          path: c.path,
          content: c.contentSnippet || `# ${c.title}\n\nSynced at ${new Date().toISOString()}`,
        })
      );

      const res = await pushContainer(selectedContainer.id, {
        message: finalMsg,
        files: filesToPush,
      });

      setPushStep(3); // Done
      setPushSuccess({
        commit: res.newCommit,
        message: finalMsg,
      });
      setCommitMessage('');
      refetchCommits();
    } catch (err: any) {
      console.error('Push error:', err);
    } finally {
      setIsPushing(false);
    }
  };

  // Execute Pull
  const handleExecutePull = async () => {
    setIsPulling(true);
    setPullStep(1);

    try {
      await new Promise((r) => setTimeout(r, 400));
      setPullStep(2);

      if (refreshFolders) {
        await refreshFolders();
      }

      const res = await pullContainer(selectedContainer.id);
      setPullStep(3);
      setPulledFilesView(res);
      refetchCommits();
    } catch (err: any) {
      console.error('Pull error:', err);
    } finally {
      setIsPulling(false);
    }
  };

  const handleCopyFileContent = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedFileIndex(idx);
    setTimeout(() => setCopiedFileIndex(null), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showDefaultHeader={false}
      maxWidth="max-w-5xl"
    >
      <div className="flex flex-col h-[85vh] max-h-[780px] bg-[#121414] text-[#e2e2e2] font-sans rounded-2xl overflow-hidden shadow-2xl border border-[#262a2a]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242828] bg-[#161818]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                activeMode === 'push'
                  ? 'bg-[#c9cd58]/20 border-[#c9cd58]/40 text-[#e5e971]'
                  : 'bg-[#3b82f6]/20 border-[#3b82f6]/40 text-[#93c5fd]'
              }`}
            >
              {activeMode === 'push' ? (
                <Upload className="w-5 h-5" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base tracking-tight text-white">
                  Синхронизация с сервером
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#202323] border border-[#2d3030] text-[#93927e]">
                  Lemon Calendarium Git Sync
                </span>
              </div>
              <p className="text-xs font-mono text-[#93927e] flex items-center gap-2 mt-0.5">
                <span>Интерактивные операции Push & Pull</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#10b981]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                  {isServerConnected ? 'Сервер подключен' : 'Локальный режим'}
                </span>
              </p>
            </div>
          </div>

          {/* Mode Tabs Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex bg-[#0f1111] p-1 rounded-xl border border-[#242828]">
              <button
                type="button"
                onClick={() => setActiveMode('push')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all ${
                  activeMode === 'push'
                    ? 'bg-[#c9cd58] text-[#121414] shadow-sm'
                    : 'text-[#93927e] hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Push (Отправить)</span>
                {stagedChanges.length > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeMode === 'push'
                        ? 'bg-[#121414] text-[#e5e971]'
                        : 'bg-[#c9cd58]/20 text-[#e5e971]'
                    }`}
                  >
                    {stagedChanges.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('pull')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all ${
                  activeMode === 'pull'
                    ? 'bg-[#3b82f6] text-white shadow-sm'
                    : 'text-[#93927e] hover:text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pull (Получить)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#93927e] hover:text-white hover:bg-[#242828] transition-colors"
              title="Закрыть (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-header: Target Container Selector */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#141616] border-b border-[#202323] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#93927e] font-mono text-[11px]">Хранилище / Контейнер:</span>
            <div className="relative">
              <select
                value={selectedContainerId}
                onChange={(e) => setSelectedContainerId(e.target.value)}
                className="bg-[#1a1d1d] hover:bg-[#202323] text-white text-xs font-mono px-3 py-1 rounded-lg border border-[#2d3030] focus:border-[#c9cd58] focus:outline-none transition-colors cursor-pointer pr-7 appearance-none"
              >
                {containers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({(c as any).type || 'obsidian'}) • {c.notesCount} заметок
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#93927e] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                selectedContainer.privacy === 'private'
                  ? 'bg-[#a855f7]/20 text-[#d8b4fe] border border-[#a855f7]/30'
                  : 'bg-[#10b981]/20 text-[#6ee7b7] border border-[#10b981]/30'
              }`}
            >
              {selectedContainer.privacy}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-[#93927e]">
            {selectedContainer.lastSyncedAt && (
              <span>
                Синхронизировано: {dayjs(selectedContainer.lastSyncedAt).format('HH:mm:ss')}
              </span>
            )}
            <span>•</span>
            <button
              type="button"
              onClick={() => refetchCommits()}
              className="hover:text-white flex items-center gap-1 transition-colors"
              title="Обновить историю коммитов"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Обновить коммиты</span>
            </button>
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
          {activeMode === 'push' ? (
            /* ================= PUSH WORKSPACE ================= */
            <div className="space-y-6">
              {/* Push Success Alert */}
              {pushSuccess && (
                <div className="p-3.5 rounded-xl bg-[#10b981]/15 border border-[#10b981]/40 flex items-start justify-between gap-3 animate-fade-in">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#34d399]">
                        Успешно запушено на сервер!
                      </h4>
                      <p className="text-xs text-[#a7f3d0] font-mono mt-0.5">
                        Создана новая ревизия: <span className="font-bold underline">{pushSuccess.commit}</span>
                      </p>
                      <p className="text-[11px] text-[#93927e] mt-1 italic">
                        «{pushSuccess.message}»
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPushSuccess(null)}
                    className="text-[#93927e] hover:text-white text-xs p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Session Changes (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#242828] pb-2.5">
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>Изменения за сессию</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#1e2222] text-[#c9cd58] text-xs font-mono font-bold">
                          {sessionChanges.length}
                        </span>
                      </h3>
                      <p className="text-[11px] font-mono text-[#93927e]">
                        Готово к коммиту: {stagedChanges.length} из {sessionChanges.length}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => stageAllSessionChanges(true)}
                        className="px-2.5 py-1 rounded-lg bg-[#1a1d1d] hover:bg-[#222626] text-[#c9cd58] border border-[#c9cd58]/40 text-xs font-mono font-semibold transition-all"
                        title="Выбрать все файлы для включения в коммит"
                      >
                        Загрузить все в коммит
                      </button>
                      <button
                        type="button"
                        onClick={() => stageAllSessionChanges(false)}
                        className="px-2 py-1 rounded-lg bg-[#161818] hover:bg-[#202323] text-[#93927e] hover:text-white border border-[#242828] text-xs font-mono transition-all"
                      >
                        Снять выбор
                      </button>
                    </div>
                  </div>

                  {/* Changes Filter Buttons */}
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setChangeFilter('all')}
                      className={`px-2 py-0.5 rounded ${
                        changeFilter === 'all'
                          ? 'bg-[#262a2a] text-white font-bold'
                          : 'text-[#93927e] hover:text-white'
                      }`}
                    >
                      Все ({sessionChanges.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setChangeFilter('staged')}
                      className={`px-2 py-0.5 rounded ${
                        changeFilter === 'staged'
                          ? 'bg-[#c9cd58]/20 text-[#e5e971] font-bold'
                          : 'text-[#93927e] hover:text-white'
                      }`}
                    >
                      К коммиту ({stagedChanges.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setChangeFilter('notes')}
                      className={`px-2 py-0.5 rounded ${
                        changeFilter === 'notes'
                          ? 'bg-[#3b82f6]/20 text-[#93c5fd] font-bold'
                          : 'text-[#93927e] hover:text-white'
                      }`}
                    >
                      Заметки
                    </button>
                    <button
                      type="button"
                      onClick={() => setChangeFilter('folders')}
                      className={`px-2 py-0.5 rounded ${
                        changeFilter === 'folders'
                          ? 'bg-[#a855f7]/20 text-[#d8b4fe] font-bold'
                          : 'text-[#93927e] hover:text-white'
                      }`}
                    >
                      Папки
                    </button>
                  </div>

                  {/* Changes List */}
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredChanges.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-[#242828] rounded-xl">
                        <CheckCircle2 className="w-8 h-8 text-[#10b981]/50 mx-auto mb-2" />
                        <p className="text-xs font-mono text-[#93927e]">
                          Нет локальных изменений для отправки
                        </p>
                        <p className="text-[11px] text-[#5e6363] mt-1">
                          Все созданные и отредактированные заметки уже синхронизированы с сервером.
                        </p>
                      </div>
                    ) : (
                      filteredChanges.map((change) => {
                        const isExpanded = expandedChangeId === change.id;
                        return (
                          <div
                            key={change.id}
                            className={`p-2.5 rounded-xl border transition-all ${
                              change.staged
                                ? 'bg-[#181b1b] border-[#c9cd58]/40 shadow-sm'
                                : 'bg-[#141616] border-[#222626] opacity-70 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={change.staged}
                                  onChange={() => toggleStageSessionChange(change.id)}
                                  className="w-4 h-4 rounded border-[#3d4242] bg-[#121414] text-[#c9cd58] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#c9cd58]"
                                  title="Включить в коммит"
                                />

                                {/* Status Badge */}
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                    change.type === 'add'
                                      ? 'bg-[#10b981]/20 text-[#34d399]'
                                      : change.type === 'modify'
                                      ? 'bg-[#c9cd58]/20 text-[#e5e971]'
                                      : 'bg-[#ef4444]/20 text-[#f87171]'
                                  }`}
                                >
                                  {change.type === 'add'
                                    ? '+ ADD'
                                    : change.type === 'modify'
                                    ? '~ MOD'
                                    : '- DEL'}
                                </span>

                                {/* Entity Icon */}
                                {change.entityType === 'note' ? (
                                  <FileText className="w-3.5 h-3.5 text-[#93c5fd] shrink-0" />
                                ) : (
                                  <FolderIcon className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
                                )}

                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-white truncate">
                                    {change.title}
                                  </div>
                                  <div className="text-[10px] font-mono text-[#93927e] truncate">
                                    {change.path}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-mono text-[#5e6363]">
                                  {change.dateStr}
                                </span>
                                {change.contentSnippet && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedChangeId(isExpanded ? null : change.id)
                                    }
                                    className="p-1 text-[#93927e] hover:text-white transition-colors"
                                    title="Показать превью дельты"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Snippet Preview */}
                            {isExpanded && change.contentSnippet && (
                              <div className="mt-2.5 pt-2 border-t border-[#242828] text-[11px] font-mono bg-[#0e1010] p-2 rounded-lg text-[#c9c8a5] whitespace-pre-wrap overflow-x-auto">
                                {change.contentSnippet}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Column: Commit Composer & Actions (5 cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-[#161818] p-4 rounded-2xl border border-[#242828]">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs font-mono uppercase tracking-wider text-[#c9cd58] flex items-center gap-1.5">
                        <GitCommit className="w-3.5 h-3.5" />
                        <span>Создание коммита</span>
                      </h4>

                      {/* AI / Auto-generate Button */}
                      <button
                        type="button"
                        onClick={handleAutoGenerateCommit}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#c9cd58]/20 to-[#a855f7]/20 hover:from-[#c9cd58]/30 hover:to-[#a855f7]/30 text-[#e5e971] border border-[#c9cd58]/40 hover:border-[#c9cd58] text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm group"
                        title="Сгенерировать информативное сообщение коммита по изменённым файлам"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#e5e971] group-hover:rotate-12 transition-transform" />
                        <span>Автогенерация</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-[#93927e] mb-1.5">
                        Сообщение коммита (Commit Message):
                      </label>
                      <textarea
                        rows={3}
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="feat(notes): добавлены изменения сессии..."
                        className="w-full bg-[#101212] border border-[#2d3030] rounded-xl p-2.5 text-xs font-mono text-white placeholder-[#5e6363] focus:border-[#c9cd58] focus:outline-none transition-colors custom-scrollbar"
                      />
                    </div>

                    {/* Commit payload info */}
                    <div className="p-2.5 rounded-xl bg-[#101212] border border-[#222626] space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between text-[#93927e]">
                        <span>Файлов в коммите:</span>
                        <span className="font-bold text-white">
                          {stagedChanges.length > 0 ? stagedChanges.length : sessionChanges.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[#93927e]">
                        <span>Автор коммита:</span>
                        <span className="text-[#93c5fd]">Ilege (User)</span>
                      </div>
                      <div className="flex items-center justify-between text-[#93927e]">
                        <span>Целевая ветка:</span>
                        <span className="text-[#a855f7]">main (HEAD)</span>
                      </div>
                    </div>
                  </div>

                  {/* Push Button & Progress */}
                  <div className="space-y-2 pt-2 border-t border-[#242828]">
                    {isPushing && (
                      <div className="space-y-1 py-1">
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#c9cd58]">
                          <span>
                            {pushStep === 1
                              ? '1. Сборка дельты и валидация...'
                              : pushStep === 2
                              ? '2. Передача файлов на сервер...'
                              : '3. Фиксация коммита...'}
                          </span>
                          <span>{pushStep}/3</span>
                        </div>
                        <div className="w-full bg-[#101212] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#c9cd58] h-full transition-all duration-300 rounded-full"
                            style={{ width: `${(pushStep / 3) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleExecutePush}
                      disabled={isPushing || (sessionChanges.length === 0 && !commitMessage.trim())}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#c9cd58] to-[#999c36] hover:from-[#d5d95e] hover:to-[#a9ac3d] text-[#121414] font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#c9cd58]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
                      <span>{isPushing ? 'Отправка на сервер...' : 'Запушить на сервер (Push)'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom: Recent Commits on Server */}
              <div className="pt-4 border-t border-[#242828]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-xs font-mono uppercase tracking-wider text-[#93927e] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#c9cd58]" />
                    <span>Последние коммиты контейнера ({selectedContainer.name})</span>
                  </h4>
                  <span className="text-[11px] font-mono text-[#5e6363]">
                    Всего в истории: {serverCommits.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {serverCommits.slice(0, 6).map((commit: any, idx: number) => {
                    const hashStr =
                      commit.shortHash ||
                      commit.commitHash?.slice(0, 7) ||
                      commit.hash?.slice(0, 7) ||
                      'HEAD';
                    return (
                      <div
                        key={commit.hash || commit.commitHash || idx}
                        className="p-3 rounded-xl bg-[#141616] border border-[#242828] hover:border-[#383d3d] transition-all space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-[#202323] text-[#e5e971] font-bold">
                            {hashStr}
                          </span>
                          <span className="text-[#5e6363]">
                            {dayjs(commit.date).format('DD.MM HH:mm')}
                          </span>
                        </div>
                        <div className="text-xs text-white font-medium line-clamp-2">
                          {commit.message}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#93927e] pt-1 border-t border-[#1e2222]">
                          <span>{commit.author || 'System'}</span>
                          <span>{commit.filesChanged || 1} файл(ов)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ================= PULL WORKSPACE ================= */
            <div className="space-y-6">
              {/* Pull Controls Top Bar */}
              <div className="p-4 rounded-2xl bg-[#161818] border border-[#242828] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>Получение дельты с сервера</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#3b82f6]/20 text-[#93c5fd] text-xs font-mono font-bold">
                      Pull Operation
                    </span>
                  </h3>
                  <p className="text-xs font-mono text-[#93927e] mt-1">
                    Синхронизирует последние изменения из Obsidian хранилища и бэкенда Lemon.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleExecutePull}
                    disabled={isPulling}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#60a5fa] hover:to-[#3b82f6] text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#3b82f6]/20 transition-all disabled:opacity-50"
                  >
                    <Download className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
                    <span>{isPulling ? 'Получение данных...' : 'Получить изменения с сервера (Pull)'}</span>
                  </button>
                </div>
              </div>

              {/* Step animation while pulling */}
              {isPulling && (
                <div className="p-4 rounded-xl bg-[#161a22] border border-[#3b82f6]/40 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-mono text-[#93c5fd]">
                    <span>
                      {pullStep === 1
                        ? '1. Опрос сервера и проверка обновлений...'
                        : pullStep === 2
                        ? '2. Загрузка дельта-файлов и метаданных...'
                        : '3. Объединение локальных папок и заметок...'}
                    </span>
                    <span>{pullStep}/3</span>
                  </div>
                  <div className="w-full bg-[#101212] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#3b82f6] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${(pullStep / 3) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Received Changes Section (Pull Delta) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#242828] pb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">
                      Изменения, загруженные с сервера
                    </h3>
                    {pulledFilesView && (
                      <span className="px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#34d399] text-xs font-mono font-bold">
                        {pulledFilesView.files?.length || 0} файлов
                      </span>
                    )}
                  </div>

                  {pulledFilesView && (
                    <span className="text-[11px] font-mono text-[#93927e]">
                      Ревизия: <span className="text-[#3b82f6] font-bold">{pulledFilesView.commit}</span>
                    </span>
                  )}
                </div>

                {/* List of files downloaded from server */}
                {pulledFilesView && pulledFilesView.files && pulledFilesView.files.length > 0 ? (
                  <div className="space-y-2.5">
                    {pulledFilesView.files.map((file, idx) => {
                      const isExpanded = expandedFileIndex === idx;
                      const isCopied = copiedFileIndex === idx;
                      return (
                        <div
                          key={file.path || idx}
                          className="rounded-xl border border-[#282d2d] bg-[#141616] overflow-hidden transition-all"
                        >
                          <div
                            onClick={() => setExpandedFileIndex(isExpanded ? null : idx)}
                            className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#181b1b] transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <FileText className="w-4 h-4 text-[#3b82f6] shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">
                                  {file.path.split('/').pop()}
                                </div>
                                <div className="text-[11px] font-mono text-[#93927e] truncate">
                                  {file.path}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                              <span className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#34d399] text-[10px] font-bold">
                                📥 СИНХРОНИЗИРОВАНО
                              </span>
                              {file.size ? (
                                <span className="text-[#5e6363] text-[11px]">
                                  {(file.size / 1024).toFixed(1)} KB
                                </span>
                              ) : null}
                              <button
                                type="button"
                                className="p-1 text-[#93927e] hover:text-white"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Markdown Preview */}
                          {isExpanded && (
                            <div className="p-3 bg-[#0d0f0f] border-t border-[#202323] space-y-2 animate-fade-in">
                              <div className="flex items-center justify-between text-[11px] font-mono text-[#93927e]">
                                <span>Превью содержимого Markdown:</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyFileContent(file.content, idx);
                                  }}
                                  className="px-2 py-1 rounded bg-[#1a1d1d] hover:bg-[#242828] text-white flex items-center gap-1 transition-colors"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3 h-3 text-[#10b981]" />
                                      <span className="text-[#10b981]">Скопировано</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Скопировать</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <pre className="p-3 rounded-lg bg-[#121414] border border-[#202323] text-xs font-mono text-[#c9c8a5] whitespace-pre-wrap overflow-x-auto max-h-52 custom-scrollbar">
                                {file.content}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed border-[#242828] rounded-xl">
                    <Download className="w-8 h-8 text-[#3b82f6]/50 mx-auto mb-2" />
                    <p className="text-xs font-mono text-[#93927e]">
                      Нажмите «Получить изменения с сервера», чтобы загрузить дельту
                    </p>
                    <p className="text-[11px] text-[#5e6363] mt-1">
                      Здесь отобразятся все файлы и заметки, поступившие из удалённого репозитория.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom: Recent Server Commits timeline */}
              <div className="pt-4 border-t border-[#242828]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-xs font-mono uppercase tracking-wider text-[#93927e] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#3b82f6]" />
                    <span>Последние загруженные коммиты сервера</span>
                  </h4>
                  <span className="text-[11px] font-mono text-[#5e6363]">
                    Актуальная ревизия: {serverCommits[0]?.shortHash || 'HEAD'}
                  </span>
                </div>

                <div className="space-y-2">
                  {serverCommits.slice(0, 5).map((c: any, index: number) => {
                    const hash =
                      c.shortHash || c.commitHash?.slice(0, 7) || c.hash?.slice(0, 7) || 'HEAD';
                    return (
                      <div
                        key={c.hash || c.commitHash || index}
                        className="p-3 rounded-xl bg-[#141616] border border-[#242828] flex items-center justify-between gap-3 hover:border-[#383d3d] transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              index === 0 ? 'bg-[#3b82f6] ring-4 ring-[#3b82f6]/20' : 'bg-[#5e6363]'
                            }`}
                          />
                          <span className="px-2 py-0.5 rounded bg-[#1c2020] text-[#93c5fd] font-mono text-xs font-bold shrink-0">
                            {hash}
                          </span>
                          <span className="text-xs text-white font-medium truncate">
                            {c.message}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 text-[11px] font-mono text-[#93927e]">
                          <span>{c.author || 'obsidian-agent'}</span>
                          <span>{dayjs(c.date).format('DD.MM.YYYY HH:mm')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-2.5 bg-[#141616] border-t border-[#242828] flex items-center justify-between text-[11px] font-mono text-[#5e6363]">
          <div>
            Подключено к Lemon Seasons Backend (REST / SSE)
          </div>
          <div className="flex items-center gap-2">
            <span>Esc для закрытия</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
