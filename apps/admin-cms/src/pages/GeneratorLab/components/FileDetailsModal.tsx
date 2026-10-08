import React from 'react';
import { Modal, Button, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { FileText, ExternalLink, AlertCircle, Hash, HardDrive, Calendar } from 'lucide-react';
import { IngestionFile } from '@lenta/shared';
import dayjs from 'dayjs';
import { formatBytes, getStatusConfig } from '../utils/ingestion.utils';

interface FileDetailsModalProps {
  file: IngestionFile | null;
  open: boolean;
  onClose: () => void;
}

export const FileDetailsModal: React.FC<FileDetailsModalProps> = ({ file, open, onClose }) => {
  const navigate = useNavigate();

  if (!file) return null;

  const statusConfig = getStatusConfig(file.status);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <span className="font-sans font-bold truncate">{file.fileName}</span>
        </div>
      }
      footer={[
        file.noteId && (
          <Button
            key="open-note"
            type="primary"
            icon={<ExternalLink className="w-4 h-4" />}
            onClick={() => {
              onClose();
              navigate(`/notes/${file.noteId}`);
            }}
            className="bg-primary hover:bg-primary-hover text-on-primary font-semibold"
          >
            Открыть созданную Note
          </Button>
        ),
        <Button key="close" onClick={onClose}>
          Закрыть
        </Button>,
      ]}
      className="max-w-xl"
    >
      <div className="space-y-4 py-3 text-sm">
        {/* Status bar */}
        <div className={`p-3 rounded-lg border ${statusConfig.bgClass} flex items-center justify-between`}>
          <div>
            <span className="text-xs text-on-surface-variant block font-mono">Текущий этап:</span>
            <span className={`font-bold font-mono text-sm ${statusConfig.textClass}`}>
              {file.status} — {statusConfig.label}
            </span>
          </div>
          <Tag color={statusConfig.color} className="font-mono text-xs">
            {file.status}
          </Tag>
        </div>

        {/* Error alert if failed */}
        {file.errorMessage && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-400">
              <AlertCircle className="w-4 h-4" />
              <span>Текст ошибки:</span>
            </div>
            <p className="break-all">{file.errorMessage}</p>
          </div>
        )}

        {/* File Metadata List */}
        <div className="space-y-2 font-mono text-xs text-on-surface-variant bg-black/30 p-3 rounded-lg border border-white/5">
          <div className="flex items-start justify-between gap-2">
            <span className="text-outline shrink-0 flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" /> Полный путь:
            </span>
            <span className="text-on-surface break-all text-right select-all">{file.filePath}</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-outline flex items-center gap-1">
              <Hash className="w-3.5 h-3.5" /> SHA-256 Хэш:
            </span>
            <span className="text-on-surface truncate select-all max-w-[280px]" title={file.fileHash}>
              {file.fileHash}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-outline">Размер:</span>
            <span className="text-on-surface">{formatBytes(file.fileSize)}</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-outline flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Изменен на диске:
            </span>
            <span className="text-on-surface">
              {dayjs(file.mtime).format('YYYY-MM-DD HH:mm:ss')}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-outline">Зафиксирован в БД:</span>
            <span className="text-on-surface">
              {dayjs(file.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </span>
          </div>
        </div>

        {/* Note Link Card */}
        {file.note ? (
          <div className="p-3 rounded-lg bg-surface-container border border-white/10 space-y-1.5">
            <span className="text-xs font-mono text-outline block">Привязанная карточка Note:</span>
            <div className="font-sans font-bold text-base text-primary">{file.note.title}</div>
            <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant">
              <span>Тип: <strong className="text-on-surface">{file.note.type}</strong></span>
              <span>•</span>
              <span>Дата события: {dayjs(file.note.startDate).format('DD.MM.YYYY')}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs font-mono text-outline italic">
            Note еще не создана или ожидает парсинга.
          </div>
        )}
      </div>
    </Modal>
  );
};
