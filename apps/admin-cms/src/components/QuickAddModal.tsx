import React, { useState, useEffect } from 'react';
import { message, Modal } from 'antd';
import { useFeeds, useCreateNote } from '../api/queries';
import { notesApi } from '../api/client';
import { NoteType, FolderInputItem, NotePrivacy, PendingPosterItem } from '../types';
import { NoteTemplateDefinition } from '@lenta/shared';
import { MarkdownEditor } from './MarkdownEditor';
import { NoteTypeSelect } from './NoteTypeSelect';
import { HashtagInput } from './HashtagInput';
import { FolderSelect } from './FolderSelect';
import { AppSelect } from './common/AppSelect';
import { NotePrivacySelector } from './notes/NotePrivacySelector';
import { NoteTemplateSelector } from './notes/NoteTemplateSelector';
import { NotePosterPicker } from './notes/NotePosterPicker';
import { Radio, Loader2 } from 'lucide-react';
import { useAdminI18n } from '../i18n';
import { LemonLogo } from './LemonLogo';
import {
  useQuickAddMacros,
  QuickAddMacroBar,
  SaveMacroModal,
} from './quickAdd';

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
  initialFeedId?: string;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ open, onClose, initialFeedId }) => {
  const { t } = useAdminI18n();
  const { data: feeds = [] } = useFeeds();
  const createNoteMutation = useCreateNote();

  const [title, setTitle] = useState('');
  const [feedId, setFeedId] = useState('');
  const [type, setType] = useState<NoteType>('SINGLE');
  const [privacy, setPrivacy] = useState<NotePrivacy>('private');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState('');
  const [folders, setFolders] = useState<FolderInputItem[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [pendingPosters, setPendingPosters] = useState<PendingPosterItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Интеграция пресетов / макросов быстрого добавления
  const {
    macros,
    activeMacroId,
    isDirty,
    saveModalOpen,
    setSaveModalOpen,
    selectMacro,
    saveNewMacro,
    deleteMacro,
    isSaving: isSavingMacro,
  } = useQuickAddMacros({
    currentFeedId: feedId,
    currentFolders: folders,
    currentType: type,
    onApply: (preset) => {
      setFeedId(preset.feedId);
      setFolders(preset.folders);
      setType(preset.type);
    },
    onClear: () => {
      setFeedId(initialFeedId || '');
      setFolders([]);
      setType('SINGLE');
    },
  });

  // Шаблоны заметок
  const handleApplyTemplate = (tpl: NoteTemplateDefinition) => {
    setActiveTemplateId(tpl.id);
    setType(tpl.defaultType as NoteType);
    if (tpl.defaultFolder && folders.length === 0) {
      setFolders([{ path: tpl.defaultFolder, isPrimary: true, order: 0 }]);
    }
    if (tpl.defaultHashtags && tpl.defaultHashtags.length > 0) {
      setHashtags((prev) => Array.from(new Set([...prev, ...tpl.defaultHashtags])));
    }
    if (tpl.defaultMarkdown && !description.trim()) {
      setDescription(tpl.defaultMarkdown);
    }
    setPrivacy((tpl.defaultPrivacy as NotePrivacy) || 'private');
  };

  // Инициализация при открытии модалки
  useEffect(() => {
    if (open) {
      setTitle('');
      setFeedId(initialFeedId || '');
      setType('SINGLE');
      setPrivacy('private');
      setActiveTemplateId(null);
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setFolders([]);
      setHashtags([]);
      setDescription('');
    }
  }, [open, initialFeedId]);

  const currentFeedTitle = feeds.find((f) => f.id === feedId)?.title;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      message.error(t.titleInputLabel);
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const created = await createNoteMutation.mutateAsync({
        feedId: feedId ? feedId : undefined,
        title: title.trim(),
        type,
        privacy,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        description: description.trim() || undefined,
        hashtags,
        folders: folders.length > 0 ? folders : undefined,
      });

      // Attach any selected web posters or local files in parallel
      if (pendingPosters.length > 0) {
        const webItems = pendingPosters
          .filter((p) => !p.file && p.url.startsWith('http'))
          .map((p) => ({
            url: p.url,
            caption: p.title,
            isMain: p.isMain,
          }));

        const localFiles = pendingPosters
          .filter((p) => Boolean(p.file))
          .map((p) => p.file as File);

        await Promise.allSettled([
          webItems.length > 0
            ? notesApi.attachImagesFromUrls(created.id, webItems)
            : Promise.resolve(),
          localFiles.length > 0
            ? notesApi.uploadImages(created.id, localFiles)
            : Promise.resolve(),
        ]);
      }

      message.success(t.quickAddNoteCreated);
      setTitle('');
      setFeedId('');
      setDescription('');
      setEndDate('');
      setFolders([]);
      setHashtags([]);
      setPendingPosters([]);
      setPrivacy('private');
      setActiveTemplateId(null);
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    if (isSubmitting) return;
    if (saveModalOpen) {
      setSaveModalOpen(false);
      return;
    }
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={handleModalClose}
        maskClosable={!isSubmitting}
        footer={null}
        width={640}
        zIndex={1000}
        keyboard={!saveModalOpen && !isSubmitting}
        centered
        destroyOnClose
        styles={{
          content: {
            padding: 0,
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--tile-border)',
            boxShadow: 'var(--tile-shadow)',
            overflow: 'hidden',
          },
        }}
      >
        <div className="relative flex flex-col">
          {isSubmitting && (
            <div className="absolute inset-0 z-30 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 animate-in fade-in duration-150 select-none">
              <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-surface-container border border-primary/40 shadow-2xl">
                <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                <div className="flex flex-col">
                  <span className="font-sans font-bold text-xs text-on-surface">
                    Сохранение записи...
                  </span>
                  <span className="font-mono text-[10px] text-on-surface-variant">
                    Подождите подтверждения от сервера
                  </span>
                </div>
              </div>
            </div>
          )}
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-tile-border flex items-center justify-between bg-tile-subtle">
            <div className="flex items-center gap-2">
              <LemonLogo size={22} />
              <h2 className="font-sans font-bold text-sm text-text-main">
                {t.quickAddModalTitle}
              </h2>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-4 space-y-3 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <fieldset disabled={isSubmitting} className="contents">
            {/* Note Templates Selector */}
            <NoteTemplateSelector
              onSelectTemplate={handleApplyTemplate}
              activeTemplateId={activeTemplateId}
            />

            {/* Macro / Presets Strip */}
            <QuickAddMacroBar
              macros={macros}
              activeMacroId={activeMacroId}
              isDirty={isDirty}
              onSelect={selectMacro}
              onOpenSaveModal={() => setSaveModalOpen(true)}
              onDeleteMacro={deleteMacro}
            />

            {/* Feed & Type Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  {t.feedInputLabel}
                </label>
                <AppSelect
                  value={feedId}
                  onChange={setFeedId}
                  size="sm"
                  placeholder={t.selectFeedPlaceholder || 'Выберите ленту...'}
                  options={[
                    {
                      value: '',
                      label: t.noFeedOption || 'Без ленты (общая база)',
                      icon: <Radio className="w-3.5 h-3.5 text-text-muted/60" />,
                    },
                    ...feeds.map((f) => ({
                      value: f.id,
                      label: f.title,
                      icon: <Radio className="w-3.5 h-3.5 text-primary/80" />,
                    })),
                  ]}
                />
              </div>

              <div className="space-y-1">
                <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  {t.typeInputLabel}
                </label>
                <NoteTypeSelect value={type} onChange={setType} />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {t.titleInputLabel}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.titleInputPlaceholder}
                className="w-full bg-control border border-tile-border rounded px-2.5 py-1 text-text-main font-sans text-xs placeholder:text-text-muted/60 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            {/* Privacy Selector */}
            <NotePrivacySelector
              value={privacy}
              onChange={setPrivacy}
            />

            {/* Date Range */}
            <div className="space-y-1">
              <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {t.datesCol}
              </label>
              <div className="flex items-center gap-2 max-w-sm">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 bg-control border border-tile-border rounded px-2 py-1 text-text-main font-mono text-xs focus:border-primary outline-none [color-scheme:light] dark:[color-scheme:dark]"
                />
                <span className="text-text-muted">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder={t.endDateLabel}
                  className="flex-1 bg-control border border-tile-border rounded px-2 py-1 text-text-main font-mono text-xs focus:border-primary outline-none [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>

            {/* Obsidian Vault Folders */}
            <div className="space-y-1">
              <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {t.folderInputLabel}
              </label>
              <FolderSelect
                value={folders}
                onChange={setFolders}
                placeholder={t.selectFolderPlaceholder}
              />
            </div>

            {/* Hashtags / Global Mentions */}
            <HashtagInput
              value={hashtags}
              onChange={setHashtags}
              placeholder={t.hashtagsPlaceholder}
            />

            {/* Quick Posters & Media */}
            <div className="bg-surface-container/60 border border-white/5 rounded-xl p-2.5">
              <NotePosterPicker
                noteTitle={title}
                pendingPosters={pendingPosters}
                onPendingPostersChange={setPendingPosters}
              />
            </div>

            {/* Markdown Description */}
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder="# Markdown..."
              minHeight={100}
            />

            {/* Footer Actions */}
            <div className="pt-2.5 border-t border-tile-border flex justify-end gap-2">
              <button
                type="button"
                onClick={handleModalClose}
                disabled={isSubmitting}
                className="h-7 px-3 rounded text-xs text-text-muted hover:text-text-main hover:bg-tile-subtle transition-colors font-medium cursor-pointer disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || createNoteMutation.isPending}
                className="inline-flex items-center gap-1.5 h-7 px-4 rounded text-xs font-semibold bg-primary text-on-primary hover:bg-primary-fixed-dim transition-all shadow-xs disabled:opacity-70 cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSubmitting ? t.loading : t.save}</span>
              </button>
            </div>
            </fieldset>
          </form>
        </div>
      </Modal>

      {/* Save Macro Modal */}
      <SaveMacroModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={saveNewMacro}
        isSaving={isSavingMacro}
        currentFeedTitle={currentFeedTitle}
        currentFolders={folders}
        currentType={type}
      />
    </>
  );
};
