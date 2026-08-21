import React, { useState, useRef } from 'react';
import { message, Popconfirm, Modal, Tooltip, Spin } from 'antd';
import { NoteImage } from '../types';
import {
  useUploadNoteImages,
  useSetMainNoteImage,
  useReorderNoteImages,
  useDeleteNoteImage,
} from '../api/queries';

interface ImageManagerProps {
  noteId?: string;
  images?: NoteImage[];
  pendingFiles?: File[];
  pendingMainIndex?: number;
  onPendingFilesChange?: (files: File[], mainIndex: number) => void;
  onInsertMarkdown?: (markdownSnippet: string) => void;
  readOnly?: boolean;
}

export const ImageManager: React.FC<ImageManagerProps> = ({
  noteId,
  images = [],
  pendingFiles = [],
  pendingMainIndex = 0,
  onPendingFilesChange,
  onInsertMarkdown,
  readOnly = false,
}) => {
  const isExistingNote = Boolean(noteId && noteId !== 'new');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  const uploadMutation = useUploadNoteImages();
  const setMainMutation = useSetMainNoteImage();
  const reorderMutation = useReorderNoteImages();
  const deleteMutation = useDeleteNoteImage();

  const isMutating =
    uploadMutation.isPending ||
    setMainMutation.isPending ||
    reorderMutation.isPending ||
    deleteMutation.isPending;

  // Handle files selected via input or drop
  const handleFilesAdded = async (filesList: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
      } else {
        message.warning(`"${file.name}" is not a recognized image file.`);
      }
    }

    if (validFiles.length === 0) return;

    if (isExistingNote && noteId) {
      try {
        await uploadMutation.mutateAsync({ id: noteId, files: validFiles });
        message.success(`Uploaded ${validFiles.length} photo${validFiles.length > 1 ? 's' : ''}`);
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Failed to upload images');
      }
    } else if (onPendingFilesChange) {
      const updated = [...pendingFiles, ...validFiles];
      onPendingFilesChange(updated, pendingMainIndex);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!readOnly) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (readOnly) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  // Set Main Cover Photo
  const handleSetMain = async (image: NoteImage) => {
    if (!isExistingNote || !noteId) return;
    try {
      await setMainMutation.mutateAsync({ noteId, imageId: image.id });
      message.success('Cover photo updated');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to set cover photo');
    }
  };

  const handleSetPendingMain = (index: number) => {
    if (onPendingFilesChange) {
      onPendingFilesChange(pendingFiles, index);
    }
  };

  // Reorder Images (Move Left / Right)
  const handleMove = async (currentIndex: number, targetIndex: number) => {
    if (!isExistingNote || !noteId) return;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const reordered = [...images];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const items = reordered.map((img, idx) => ({ id: img.id, order: idx }));
    try {
      await reorderMutation.mutateAsync({ noteId, items });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to reorder images');
    }
  };

  // Delete Image
  const handleDelete = async (imageId: string) => {
    if (!isExistingNote || !noteId) return;
    try {
      await deleteMutation.mutateAsync({ noteId, imageId });
      message.success('Image deleted');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete image');
    }
  };

  const handleDeletePending = (index: number) => {
    if (onPendingFilesChange) {
      const updated = pendingFiles.filter((_, i) => i !== index);
      const newMainIndex = pendingMainIndex >= updated.length ? Math.max(0, updated.length - 1) : pendingMainIndex;
      onPendingFilesChange(updated, newMainIndex);
    }
  };

  // Copy Markdown Tag
  const handleCopyMarkdown = (img: NoteImage) => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const fullUrl = img.url.startsWith('http') ? img.url : `${apiBase}${img.url}`;
    const altText = img.caption || img.alt || img.filename || 'Note image';
    const snippet = `![${altText}](${fullUrl})`;

    if (onInsertMarkdown) {
      onInsertMarkdown(snippet);
      message.success('Inserted image snippet into Markdown editor');
    } else {
      navigator.clipboard.writeText(snippet);
      message.success('Copied Markdown snippet to clipboard: ' + snippet);
    }
  };

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  return (
    <div className="space-y-4">
      {/* Header & Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">
            photo_library
          </span>
          <h3 className="font-sans font-semibold text-base text-on-surface">
            Note Gallery
          </h3>
          <span className="bg-surface-container-highest px-2 py-0.5 rounded-full text-xs font-mono text-on-surface-variant">
            {isExistingNote ? images.length : pendingFiles.length} photos
          </span>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isMutating}
            className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high border border-white/10 hover:border-primary/40 text-on-surface rounded text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">
              add_photo_alternate
            </span>
            Add Photos
          </button>
        )}

        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFilesAdded(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Dropzone Area */}
      {!readOnly && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-primary bg-primary/10 scale-[0.99]'
              : 'border-white/10 hover:border-primary/40 bg-surface-container/50 hover:bg-surface-container'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">cloud_upload</span>
            </div>
            <p className="text-sm font-medium text-on-surface">
              Drag and drop multiple photos here, or <span className="text-primary underline">browse</span>
            </p>
            <p className="text-xs text-outline font-mono">
              Supports WebP, PNG, JPG, GIF. Automatically optimized with thumbnails.
            </p>
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isMutating && (
        <div className="flex items-center justify-center py-4 gap-2 text-sm text-primary font-mono bg-surface-container/40 rounded-lg">
          <Spin size="small" />
          <span>Processing & updating images...</span>
        </div>
      )}

      {/* Image Gallery Grid - Existing Note */}
      {isExistingNote && images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, idx) => {
            const fullUrl = img.url.startsWith('http') ? img.url : `${apiBase}${img.url}`;
            const thumbUrl = img.thumbnailUrl
              ? img.thumbnailUrl.startsWith('http')
                ? img.thumbnailUrl
                : `${apiBase}${img.thumbnailUrl}`
              : fullUrl;

            return (
              <div
                key={img.id}
                className={`relative group rounded-lg overflow-hidden border bg-surface-container flex flex-col transition-all shadow-md ${
                  img.isMain
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Thumbnail Image */}
                <div
                  className="relative aspect-video bg-black/40 cursor-pointer overflow-hidden"
                  onClick={() => {
                    setPreviewImageUrl(fullUrl);
                    setPreviewTitle(img.caption || img.filename);
                  }}
                >
                  <img
                    src={thumbUrl}
                    alt={img.alt || img.filename}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Main Cover Badge */}
                  {img.isMain && (
                    <div className="absolute top-2 left-2 bg-primary text-on-primary px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <span className="material-symbols-outlined text-[14px]">star</span>
                      Cover
                    </div>
                  )}

                  {/* Dimensions & Size Tag */}
                  {img.width && img.height && (
                    <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm text-[10px] text-white/80 font-mono px-1.5 py-0.5 rounded">
                      {img.width}×{img.height}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="p-2 flex items-center justify-between gap-1 bg-surface-container-high border-t border-white/5">
                  {/* Set Main Button */}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleSetMain(img)}
                      disabled={img.isMain || isMutating}
                      className={`text-[11px] px-2 py-1 rounded font-medium flex items-center gap-1 transition-all ${
                        img.isMain
                          ? 'text-primary font-bold cursor-default'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {img.isMain ? 'verified' : 'star_border'}
                      </span>
                      {img.isMain ? 'Main Photo' : 'Set Cover'}
                    </button>
                  )}

                  {/* Action Icons */}
                  <div className="flex items-center gap-0.5">
                    {/* Copy / Insert to Markdown */}
                    <Tooltip title="Copy or Insert Markdown ![alt](url)">
                      <button
                        type="button"
                        onClick={() => handleCopyMarkdown(img)}
                        className="p-1 text-on-surface-variant hover:text-primary hover:bg-white/5 rounded transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          content_paste_go
                        </span>
                      </button>
                    </Tooltip>

                    {/* Move Left */}
                    {!readOnly && idx > 0 && (
                      <Tooltip title="Move Left">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, idx - 1)}
                          disabled={isMutating}
                          className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            chevron_left
                          </span>
                        </button>
                      </Tooltip>
                    )}

                    {/* Move Right */}
                    {!readOnly && idx < images.length - 1 && (
                      <Tooltip title="Move Right">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, idx + 1)}
                          disabled={isMutating}
                          className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            chevron_right
                          </span>
                        </button>
                      </Tooltip>
                    )}

                    {/* Delete with Popconfirm */}
                    {!readOnly && (
                      <Popconfirm
                        title="Delete image"
                        description="Are you sure you want to remove this photo?"
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(img.id)}
                      >
                        <button
                          type="button"
                          disabled={isMutating}
                          className="p-1 text-outline hover:text-error hover:bg-error/10 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </Popconfirm>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Gallery Grid - Pending Files (New Note) */}
      {!isExistingNote && pendingFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {pendingFiles.map((file, idx) => {
            const isMain = idx === pendingMainIndex;
            const objectUrl = URL.createObjectURL(file);

            return (
              <div
                key={`${file.name}-${idx}`}
                className={`relative group rounded-lg overflow-hidden border bg-surface-container flex flex-col transition-all shadow-md ${
                  isMain
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div
                  className="relative aspect-video bg-black/40 cursor-pointer overflow-hidden"
                  onClick={() => {
                    setPreviewImageUrl(objectUrl);
                    setPreviewTitle(file.name);
                  }}
                >
                  <img
                    src={objectUrl}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  {isMain && (
                    <div className="absolute top-2 left-2 bg-primary text-on-primary px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <span className="material-symbols-outlined text-[14px]">star</span>
                      Cover
                    </div>
                  )}
                </div>

                <div className="p-2 flex items-center justify-between gap-1 bg-surface-container-high border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => handleSetPendingMain(idx)}
                    className={`text-[11px] px-2 py-1 rounded font-medium flex items-center gap-1 transition-all ${
                      isMain
                        ? 'text-primary font-bold cursor-default'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {isMain ? 'verified' : 'star_border'}
                    </span>
                    {isMain ? 'Main Photo' : 'Set Cover'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePending(idx)}
                    className="p-1 text-outline hover:text-error hover:bg-error/10 rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      <Modal
        open={Boolean(previewImageUrl)}
        title={previewTitle || 'Image Preview'}
        footer={null}
        onCancel={() => setPreviewImageUrl(null)}
        width={800}
        centered
      >
        {previewImageUrl && (
          <div className="flex justify-center items-center max-h-[75vh] overflow-hidden rounded">
            <img
              src={previewImageUrl}
              alt="Preview"
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
