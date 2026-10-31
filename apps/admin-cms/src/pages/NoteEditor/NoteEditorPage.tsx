import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { message, Popconfirm } from 'antd';
import {
  useNote,
  useFeeds,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from '../../api/queries';
import { notesApi } from '../../api/client';
import { NoteType, CreateNoteLinkInput, FolderInputItem } from '../../types';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import { NoteTypeBadge } from '../../components/NoteTypeBadge';
import { NoteTypeSelect } from '../../components/NoteTypeSelect';
import { ImageManager } from '../../components/ImageManager';
import { ItContentAssistantBar } from '../../components/cover-studio/ItContentAssistantBar';
import { LinkManager } from '../../components/LinkManager';
import { HashtagInput } from '../../components/HashtagInput';
import { FolderSelect } from '../../components/FolderSelect';
import { AppSelect } from '../../components/common/AppSelect';
import { Radio } from 'lucide-react';
import { useAdminI18n } from '../../i18n';

export const NoteEditorPage: React.FC = () => {
  const { t } = useAdminI18n();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  const { data: note } = useNote(id || '');
  const { data: feeds = [] } = useFeeds();

  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();

  const [searchParams] = useSearchParams();
  const folderParam = searchParams.get('folder') || undefined;

  // Form State
  const [title, setTitle] = useState('');
  const [feedId, setFeedId] = useState('');
  const [type, setType] = useState<NoteType>('SINGLE');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [endDate, setEndDate] = useState('');
  const [icon, setIcon] = useState('');
  const [author, setAuthor] = useState('');
  const [assignedFolders, setAssignedFolders] = useState<FolderInputItem[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [description, setDescription] = useState('');

  // Pending images & links for new note
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingMainIndex, setPendingMainIndex] = useState(0);
  const [pendingLinks, setPendingLinks] = useState<CreateNoteLinkInput[]>([]);
  const [pendingSourceIndex, setPendingSourceIndex] = useState(0);

  // Populate data when editing
  useEffect(() => {
    if (note && !isNew) {
      setTitle(note.title);
      setFeedId(note.feedId);
      setType(note.type);
      setStartDate(new Date(note.startDate).toISOString().slice(0, 16));
      setEndDate(note.endDate ? new Date(note.endDate).toISOString().slice(0, 16) : '');
      setIcon(note.icon || '');
      setAuthor((note as any).author || note.curator || '');
      setDescription(note.description || '');
      setHashtags(note.hashtags?.map((h) => h.name) || []);
      setAssignedFolders(
        note.folders?.map((nf, idx) => ({
          path: nf.folder?.path || '',
          isPrimary: nf.isPrimary ?? idx === 0,
          order: nf.order ?? idx,
        })).filter((item) => Boolean(item.path)) || [],
      );
    } else if (isNew) {
      if (folderParam && assignedFolders.length === 0) {
        setAssignedFolders([{ path: folderParam, isPrimary: true, order: 0 }]);
      }
    }
  }, [note, isNew, feeds, feedId, folderParam]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      message.error(t.titleInputLabel);
      return;
    }
    try {
      if (isNew) {
        const created = await createNoteMutation.mutateAsync({
          feedId: feedId ? feedId : undefined,
          title: title.trim(),
          type,
          startDate: new Date(startDate).toISOString(),
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
          icon: icon.trim() || undefined,
          author: author.trim() || undefined,
            curator: author.trim() || undefined,
          description: description.trim() || undefined,
          hashtags,
          folders: assignedFolders,
          links:
            pendingLinks.length > 0
              ? pendingLinks.map((l, i) => ({
                  ...l,
                  isSource: i === pendingSourceIndex,
                }))
              : undefined,
        });

        // Upload any pending photos that were selected before creating the note
        if (pendingFiles.length > 0) {
          try {
            const uploadedImages = await notesApi.uploadImages(created.id, pendingFiles);
            if (
              pendingMainIndex > 0 &&
              pendingMainIndex < uploadedImages.length
            ) {
              await notesApi.setMainImage(created.id, uploadedImages[pendingMainIndex].id);
            }
          } catch (uploadErr) {
            console.error('Failed to upload pending photos', uploadErr);
          }
        }

        message.success(t.noteSavedSuccess);
        navigate(`/notes/${created.id}`);
      } else {
        await updateNoteMutation.mutateAsync({
          id: id!,
          data: {
            feedId: feedId ? feedId : null,
            title: title.trim(),
            type,
            startDate: new Date(startDate).toISOString(),
            endDate: endDate ? new Date(endDate).toISOString() : undefined,
            icon: icon.trim() || undefined,
            author: author.trim() || undefined,
            curator: author.trim() || undefined,
            description: description.trim() || undefined,
            hashtags,
            folders: assignedFolders,
          },
        });
        message.success(t.noteSavedSuccess);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteNoteMutation.mutateAsync(id);
      message.success(t.noteDeletedSuccess);
      navigate('/notes');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error');
    }
  };

  const handleInsertMarkdownSnippet = (snippet: string) => {
    setDescription((prev) => (prev ? `${prev}\n\n${snippet}` : snippet));
  };

  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto custom-scrollbar pr-1 space-y-3.5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between h-8">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/notes')}
            className="w-7 h-7 rounded-lg hover:bg-white/5 text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-bold text-base text-on-surface">
                {isNew ? t.editorTitleNew : t.editorTitleEdit}
              </h1>
              {!isNew && <NoteTypeBadge type={type} size="sm" />}
            </div>
            <p className="text-[10px] font-mono text-on-surface-variant">
              {isNew ? t.editorSubtitle : `ID: ${id}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isNew && (
            <Popconfirm
              title={t.confirmDeleteNote}
              onConfirm={handleDelete}
              okText={t.delete}
              cancelText={t.cancel}
              okButtonProps={{ danger: true }}
            >
              <button
                type="button"
                className="h-7.5 px-3 border border-error/40 text-error hover:bg-error/10 rounded-lg text-xs font-mono transition-colors cursor-pointer"
              >
                {t.delete}
              </button>
            </Popconfirm>
          )}
          <button
            onClick={handleSave}
            disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
            className="h-7.5 px-4 bg-primary text-on-primary hover:bg-primary-fixed rounded-lg font-semibold text-xs transition-all shadow disabled:opacity-50 cursor-pointer"
          >
            {createNoteMutation.isPending || updateNoteMutation.isPending
              ? t.loading
              : t.saveNoteBtn}
          </button>
        </div>
      </div>

      {/* Main Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Left Column: Title, Markdown Content, Links & Image Gallery (Span 2) */}
        <div className="lg:col-span-2 space-y-3.5">
          {/* Main Content Box */}
          <div className="space-y-3 platform-tile p-3 sm:p-3.5">
            {/* Note Title */}
            <div className="space-y-1">
              <label className="block font-mono text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                {t.titleInputLabel}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.titleInputPlaceholder}
                className="w-full bg-control border border-control-border rounded-lg px-2.5 py-1 text-on-surface font-sans text-xs focus:border-primary outline-none"
              />
            </div>

            {/* IT Content Blueprints (Podcasts, Changelogs, Security, AI) */}
            <ItContentAssistantBar
              currentTitle={title}
              currentDescription={description}
              currentHashtags={hashtags}
              onApplyBlueprint={({ markdown, hashtags: nextTags, icon: nextIcon, noteType }) => {
                setDescription(markdown);
                setHashtags(nextTags);
                if (!icon && nextIcon) setIcon(nextIcon);
                if (noteType) setType(noteType);
              }}
            />

            {/* Description (Raw Markdown Editor + Live Preview) */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                {t.contentLabel}
              </label>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="# Markdown..."
                minHeight={280}
              />
            </div>
          </div>

          {/* Image Manager Section */}
          <div className="platform-tile p-3 sm:p-3.5">
            <ImageManager
              noteId={id}
              noteTitle={title}
              noteDescription={description}
              images={note?.images || []}
              pendingFiles={pendingFiles}
              pendingMainIndex={pendingMainIndex}
              onPendingFilesChange={(files, mainIdx) => {
                setPendingFiles(files);
                setPendingMainIndex(mainIdx);
              }}
              onInsertMarkdown={handleInsertMarkdownSnippet}
            />
          </div>
        </div>

        {/* Right Column: Metadata & Chronological Details (Span 1) */}
        <div className="space-y-3 platform-tile p-3 sm:p-3.5 h-fit">
          <h3 className="font-sans font-bold text-xs text-on-surface border-b border-tile-border pb-1.5">
            {t.datesCol}
          </h3>

          {/* Target Feed */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] font-semibold text-on-surface-variant uppercase">
              {t.feedInputLabel}
            </label>
            <AppSelect
              value={feedId}
              onChange={setFeedId}
              placeholder={t.selectFeedPlaceholder || 'Выберите ленту...'}
              options={[
                {
                  value: '',
                  label: t.noFeedOption || 'Без ленты (общая база)',
                  icon: <Radio className="w-3.5 h-3.5 text-text-muted/60" />,
                },
                ...feeds.map((f) => ({
                  value: f.id,
                  label: `${f.title} (/${f.slug})`,
                  icon: <Radio className="w-3.5 h-3.5 text-primary/80" />,
                })),
              ]}
            />
          </div>

          {/* Note Type */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] font-semibold text-on-surface-variant uppercase">
              {t.typeInputLabel}
            </label>
            <NoteTypeSelect value={type} onChange={setType} />
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] font-semibold text-on-surface-variant uppercase">
              {t.startDateLabel}
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-7 bg-control border border-control-border rounded-lg px-2.5 text-on-surface font-mono text-xs focus:border-primary outline-none [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="block font-mono text-[10px] font-semibold text-on-surface-variant uppercase">
              {t.endDateLabel}
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-7 bg-control border border-control-border rounded-lg px-2.5 text-on-surface font-mono text-xs focus:border-primary outline-none [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          {/* Vault Folders Section */}
          <div className="pt-2 border-t border-tile-border space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase">
                {t.folderInputLabel}
              </label>
              <span className="text-[10px] font-mono text-primary/80">
                Obsidian
              </span>
            </div>
            <FolderSelect
              value={assignedFolders}
              onChange={setAssignedFolders}
              placeholder={t.selectFolderPlaceholder}
            />
          </div>

          {/* Links & Sources Manager */}
          <LinkManager
            noteId={id}
            links={note?.links || []}
            pendingLinks={pendingLinks}
            pendingSourceIndex={pendingSourceIndex}
            onPendingLinksChange={(links, sourceIdx) => {
              setPendingLinks(links);
              setPendingSourceIndex(sourceIdx);
            }}
            onInsertMarkdown={handleInsertMarkdownSnippet}
          />

          {/* Hashtags / Global Mentions */}
          <div className="pt-2 border-t border-tile-border">
            <HashtagInput
              value={hashtags}
              onChange={setHashtags}
              placeholder={t.hashtagsPlaceholder}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
