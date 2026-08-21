import React, { useState } from 'react';
import { message, Popconfirm, Tooltip, Spin, Modal, Input } from 'antd';
import { NoteLink, CreateNoteLinkInput } from '../types';
import {
  useAddNoteLinks,
  useSetSourceNoteLink,
  useReorderNoteLinks,
  useUpdateNoteLink,
  useDeleteNoteLink,
} from '../api/queries';

interface LinkManagerProps {
  noteId?: string;
  links?: NoteLink[];
  pendingLinks?: CreateNoteLinkInput[];
  pendingSourceIndex?: number;
  onPendingLinksChange?: (links: CreateNoteLinkInput[], sourceIndex: number) => void;
  onInsertMarkdown?: (markdownSnippet: string) => void;
  readOnly?: boolean;
}

export const LinkManager: React.FC<LinkManagerProps> = ({
  noteId,
  links = [],
  pendingLinks = [],
  pendingSourceIndex = 0,
  onPendingLinksChange,
  onInsertMarkdown,
  readOnly = false,
}) => {
  const isExistingNote = Boolean(noteId && noteId !== 'new');

  // Add Link State
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');

  // Edit Modal State
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingPendingIndex, setEditingPendingIndex] = useState<number | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');

  const addLinksMutation = useAddNoteLinks();
  const setSourceMutation = useSetSourceNoteLink();
  const reorderMutation = useReorderNoteLinks();
  const updateMutation = useUpdateNoteLink();
  const deleteMutation = useDeleteNoteLink();

  const isMutating =
    addLinksMutation.isPending ||
    setSourceMutation.isPending ||
    reorderMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const extractDomain = (url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  const handleAddLink = async () => {
    const trimmedUrl = newUrl.trim();
    if (!trimmedUrl) {
      message.warning('Please enter a valid URL');
      return;
    }

    const formattedUrl =
      trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
        ? trimmedUrl
        : `https://${trimmedUrl}`;

    const titleToUse = newTitle.trim() || extractDomain(formattedUrl);

    if (isExistingNote && noteId) {
      try {
        await addLinksMutation.mutateAsync({
          id: noteId,
          links: [
            {
              url: formattedUrl,
              title: titleToUse,
              isSource: links.length === 0,
            },
          ],
        });
        message.success('Link added successfully');
        setNewUrl('');
        setNewTitle('');
        setIsAdding(false);
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Failed to add link');
      }
    } else if (onPendingLinksChange) {
      const isSource = pendingLinks.length === 0;
      const updated = [
        ...pendingLinks,
        {
          url: formattedUrl,
          title: titleToUse,
          isSource,
        },
      ];
      onPendingLinksChange(updated, isSource ? 0 : pendingSourceIndex);
      setNewUrl('');
      setNewTitle('');
      setIsAdding(false);
      message.success('Link added');
    }
  };

  const handleSetSource = async (link: NoteLink) => {
    if (!isExistingNote || !noteId) return;
    try {
      await setSourceMutation.mutateAsync({ noteId, linkId: link.id });
      message.success('Primary source updated');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update source link');
    }
  };

  const handleSetPendingSource = (index: number) => {
    if (onPendingLinksChange) {
      const updated = pendingLinks.map((l, i) => ({
        ...l,
        isSource: i === index,
      }));
      onPendingLinksChange(updated, index);
      message.success('Primary source updated');
    }
  };

  const handleMove = async (currentIndex: number, targetIndex: number) => {
    if (targetIndex < 0) return;

    if (isExistingNote && noteId) {
      if (targetIndex >= links.length) return;
      const reordered = [...links];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      const items = reordered.map((item, idx) => ({ id: item.id, order: idx }));
      try {
        await reorderMutation.mutateAsync({ noteId, items });
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Failed to reorder links');
      }
    } else if (onPendingLinksChange) {
      if (targetIndex >= pendingLinks.length) return;
      const reordered = [...pendingLinks];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      let newSourceIdx = pendingSourceIndex;
      if (currentIndex === pendingSourceIndex) {
        newSourceIdx = targetIndex;
      } else if (currentIndex < pendingSourceIndex && targetIndex >= pendingSourceIndex) {
        newSourceIdx -= 1;
      } else if (currentIndex > pendingSourceIndex && targetIndex <= pendingSourceIndex) {
        newSourceIdx += 1;
      }

      onPendingLinksChange(reordered, newSourceIdx);
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!isExistingNote || !noteId) return;
    try {
      await deleteMutation.mutateAsync({ noteId, linkId });
      message.success('Link removed');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete link');
    }
  };

  const handleDeletePending = (index: number) => {
    if (onPendingLinksChange) {
      const updated = pendingLinks.filter((_, i) => i !== index);
      let newSourceIndex = pendingSourceIndex;
      if (index === pendingSourceIndex) {
        newSourceIndex = 0;
        if (updated.length > 0) {
          updated[0].isSource = true;
        }
      } else if (index < pendingSourceIndex) {
        newSourceIndex = Math.max(0, pendingSourceIndex - 1);
      }
      onPendingLinksChange(updated, newSourceIndex);
      message.success('Link removed');
    }
  };

  const handleStartEdit = (link: NoteLink) => {
    setEditingLinkId(link.id);
    setEditUrl(link.url);
    setEditTitle(link.title || '');
  };

  const handleStartEditPending = (index: number) => {
    const p = pendingLinks[index];
    setEditingPendingIndex(index);
    setEditUrl(p.url);
    setEditTitle(p.title || '');
  };

  const handleSaveEdit = async () => {
    const trimmedUrl = editUrl.trim();
    if (!trimmedUrl) {
      message.warning('URL cannot be empty');
      return;
    }
    const formattedUrl =
      trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
        ? trimmedUrl
        : `https://${trimmedUrl}`;

    if (isExistingNote && noteId && editingLinkId) {
      try {
        await updateMutation.mutateAsync({
          noteId,
          linkId: editingLinkId,
          data: {
            url: formattedUrl,
            title: editTitle.trim() || undefined,
          },
        });
        message.success('Link updated successfully');
        setEditingLinkId(null);
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Failed to update link');
      }
    } else if (onPendingLinksChange && editingPendingIndex !== null) {
      const updated = [...pendingLinks];
      updated[editingPendingIndex] = {
        ...updated[editingPendingIndex],
        url: formattedUrl,
        title: editTitle.trim() || extractDomain(formattedUrl),
      };
      onPendingLinksChange(updated, pendingSourceIndex);
      setEditingPendingIndex(null);
      message.success('Link updated');
    }
  };

  const handleCopyMarkdown = (url: string, title?: string | null) => {
    const label = title || extractDomain(url) || 'Source Link';
    const snippet = `[${label}](${url})`;

    if (onInsertMarkdown) {
      onInsertMarkdown(snippet);
      message.success('Inserted Markdown link into editor');
    } else {
      navigator.clipboard.writeText(snippet);
      message.success('Copied Markdown link to clipboard: ' + snippet);
    }
  };

  const itemsCount = isExistingNote ? links.length : pendingLinks.length;

  return (
    <div className="space-y-2 pt-2 border-t border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
            Links & Sources
          </label>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-container-highest text-on-surface-variant">
            {itemsCount}
          </span>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => setIsAdding((prev) => !prev)}
            disabled={isMutating}
            className="text-[11px] text-primary hover:text-primary-fixed-dim font-mono font-medium inline-flex items-center gap-0.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">
              {isAdding ? 'close' : 'add'}
            </span>
            {isAdding ? 'Cancel' : 'Add Link'}
          </button>
        )}
      </div>

      {/* Add Link Form */}
      {isAdding && !readOnly && (
        <div className="p-2.5 bg-surface-container-lowest border border-primary/30 rounded-lg space-y-2 animate-in fade-in duration-150">
          <div className="space-y-1">
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddLink();
                }
              }}
              placeholder="URL: https://..."
              autoFocus
              className="w-full bg-surface-container border border-white/10 rounded px-2.5 py-1 text-xs text-on-surface focus:border-primary outline-none"
            />
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddLink();
                }
              }}
              placeholder="Title / Label (optional)"
              className="w-full bg-surface-container border border-white/10 rounded px-2.5 py-1 text-xs text-on-surface focus:border-primary outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewUrl('');
                setNewTitle('');
              }}
              className="px-2 py-0.5 text-[11px] text-on-surface-variant hover:text-on-surface rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddLink();
              }}
              disabled={!newUrl.trim() || isMutating}
              className="px-3 py-1 bg-primary text-on-primary rounded text-[11px] font-semibold hover:bg-primary-fixed-dim transition-all shadow disabled:opacity-50 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">add</span>
              Add
            </button>
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isMutating && (
        <div className="flex items-center justify-center py-1.5 gap-1.5 text-[11px] text-primary font-mono bg-surface-container-lowest rounded">
          <Spin size="small" />
          <span>Updating links...</span>
        </div>
      )}

      {/* Empty State */}
      {itemsCount === 0 && !isAdding && (
        <div className="p-3 text-center bg-surface-container-lowest/60 rounded border border-white/5">
          <p className="text-[11px] text-on-surface-variant font-mono">No links attached</p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="mt-1 text-[11px] text-primary hover:underline font-mono inline-flex items-center gap-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">add</span>
              Add Link / Source
            </button>
          )}
        </div>
      )}

      {/* Links List - Existing Note */}
      {isExistingNote && links.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
          {links.map((link, idx) => {
            const domain = extractDomain(link.url);

            return (
              <div
                key={link.id}
                className={`group rounded-lg p-2 border transition-all text-xs ${
                  link.isSource
                    ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/20'
                    : 'bg-surface-container-lowest border-white/5 hover:border-white/20'
                }`}
              >
                {/* Title & Star Toggle */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {!readOnly ? (
                      <Tooltip title={link.isSource ? 'Primary Source' : 'Set as primary source'}>
                        <button
                          type="button"
                          onClick={() => handleSetSource(link)}
                          disabled={link.isSource || isMutating}
                          className={`p-0.5 rounded transition-colors flex-shrink-0 cursor-pointer ${
                            link.isSource
                              ? 'text-primary'
                              : 'text-outline hover:text-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px] leading-none">
                            {link.isSource ? 'star' : 'star_border'}
                          </span>
                        </button>
                      </Tooltip>
                    ) : (
                      <span className={`material-symbols-outlined text-[16px] leading-none ${link.isSource ? 'text-primary' : 'text-outline'}`}>
                        {link.isSource ? 'star' : 'link'}
                      </span>
                    )}

                    <span className="font-medium text-on-surface truncate text-xs" title={link.title || domain}>
                      {link.title || domain}
                    </span>

                    {link.isSource && (
                      <span className="bg-primary text-on-primary text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 rounded flex-shrink-0">
                        Source
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Tooltip title="Insert Markdown [Title](url)">
                      <button
                        type="button"
                        onClick={() => handleCopyMarkdown(link.url, link.title)}
                        className="p-1 text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px] leading-none">
                          content_paste_go
                        </span>
                      </button>
                    </Tooltip>

                    <Tooltip title="Open link">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-on-surface-variant hover:text-primary rounded transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px] leading-none">
                          open_in_new
                        </span>
                      </a>
                    </Tooltip>

                    {!readOnly && (
                      <>
                        <Tooltip title="Edit">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(link)}
                            disabled={isMutating}
                            className="p-1 text-on-surface-variant hover:text-on-surface rounded transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px] leading-none">
                              edit
                            </span>
                          </button>
                        </Tooltip>

                        {idx > 0 && (
                          <Tooltip title="Move Up">
                            <button
                              type="button"
                              onClick={() => handleMove(idx, idx - 1)}
                              disabled={isMutating}
                              className="p-1 text-on-surface-variant hover:text-on-surface rounded transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px] leading-none">
                                arrow_upward
                              </span>
                            </button>
                          </Tooltip>
                        )}

                        {idx < links.length - 1 && (
                          <Tooltip title="Move Down">
                            <button
                              type="button"
                              onClick={() => handleMove(idx, idx + 1)}
                              disabled={isMutating}
                              className="p-1 text-on-surface-variant hover:text-on-surface rounded transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px] leading-none">
                                arrow_downward
                              </span>
                            </button>
                          </Tooltip>
                        )}

                        <Popconfirm
                          title="Remove link?"
                          okText="Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => handleDelete(link.id)}
                        >
                          <button
                            type="button"
                            disabled={isMutating}
                            className="p-1 text-outline hover:text-error rounded transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px] leading-none">
                              delete
                            </span>
                          </button>
                        </Popconfirm>
                      </>
                    )}
                  </div>
                </div>

                {/* Subtitle / URL line */}
                <div className="pl-6 text-[10px] font-mono text-on-surface-variant/70 truncate" title={link.url}>
                  {link.url}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Links List - Pending Links (New Note) */}
      {!isExistingNote && pendingLinks.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
          {pendingLinks.map((link, idx) => {
            const isSource = idx === pendingSourceIndex || link.isSource;
            const domain = extractDomain(link.url);

            return (
              <div
                key={`${link.url}-${idx}`}
                className={`group rounded-lg p-2 border transition-all text-xs ${
                  isSource
                    ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/20'
                    : 'bg-surface-container-lowest border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <Tooltip title={isSource ? 'Primary Source' : 'Set as primary source'}>
                      <button
                        type="button"
                        onClick={() => handleSetPendingSource(idx)}
                        className={`p-0.5 rounded transition-colors flex-shrink-0 cursor-pointer ${
                          isSource ? 'text-primary' : 'text-outline hover:text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px] leading-none">
                          {isSource ? 'star' : 'star_border'}
                        </span>
                      </button>
                    </Tooltip>

                    <span className="font-medium text-on-surface truncate text-xs" title={link.title || domain}>
                      {link.title || domain}
                    </span>

                    {isSource && (
                      <span className="bg-primary text-on-primary text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 rounded flex-shrink-0">
                        Source
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Tooltip title="Insert Markdown [Title](url)">
                      <button
                        type="button"
                        onClick={() => handleCopyMarkdown(link.url, link.title)}
                        className="p-1 text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px] leading-none">
                          content_paste_go
                        </span>
                      </button>
                    </Tooltip>

                    <Tooltip title="Edit">
                      <button
                        type="button"
                        onClick={() => handleStartEditPending(idx)}
                        className="p-1 text-on-surface-variant hover:text-on-surface rounded transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px] leading-none">
                          edit
                        </span>
                      </button>
                    </Tooltip>

                    {idx > 0 && (
                      <Tooltip title="Move Up">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, idx - 1)}
                          className="p-1 text-on-surface-variant hover:text-on-surface rounded transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px] leading-none">
                            arrow_upward
                          </span>
                        </button>
                      </Tooltip>
                    )}

                    {idx < pendingLinks.length - 1 && (
                      <Tooltip title="Move Down">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, idx + 1)}
                          className="p-1 text-on-surface-variant hover:text-on-surface rounded transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px] leading-none">
                            arrow_downward
                          </span>
                        </button>
                      </Tooltip>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeletePending(idx)}
                      className="p-1 text-outline hover:text-error rounded transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px] leading-none">
                        delete
                      </span>
                    </button>
                  </div>
                </div>

                <div className="pl-6 text-[10px] font-mono text-on-surface-variant/70 truncate" title={link.url}>
                  {link.url}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Link Modal */}
      <Modal
        open={Boolean(editingLinkId || editingPendingIndex !== null)}
        title="Edit Link"
        onCancel={() => {
          setEditingLinkId(null);
          setEditingPendingIndex(null);
        }}
        onOk={handleSaveEdit}
        confirmLoading={isMutating}
        okText="Save"
        centered
        width={420}
      >
        <div className="space-y-2.5 pt-2">
          <div className="space-y-1">
            <label className="block text-xs font-mono text-on-surface-variant uppercase">
              URL
            </label>
            <Input
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-mono text-on-surface-variant uppercase">
              Title / Label
            </label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="e.g. Official Website"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
