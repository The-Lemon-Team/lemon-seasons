import React, { useState } from 'react';
import { Table, Tag, Button, Input, Tooltip, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  ExternalLink,
  Info,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { IngestionFile, ProcessingStatus } from '@lenta/shared';
import dayjs from 'dayjs';
import { formatBytes, getStatusConfig } from '../utils/ingestion.utils';

interface IngestedFilesTableProps {
  files: IngestionFile[];
  isLoading: boolean;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onSelectFile: (file: IngestionFile) => void;
}

export const IngestedFilesTable: React.FC<IngestedFilesTableProps> = ({
  files,
  isLoading,
  selectedStatus,
  onStatusChange,
  onSelectFile,
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Client-side filter for quick search
  const filteredFiles = files.filter((f) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      f.fileName.toLowerCase().includes(term) ||
      (f.note?.title && f.note.title.toLowerCase().includes(term))
    );
  });

  const columns = [
    {
      title: 'Файл',
      key: 'fileName',
      render: (_: any, record: IngestionFile) => (
        <div className="flex items-center gap-2 max-w-[280px]">
          <span className="p-1.5 rounded bg-primary/10 text-primary">
            <FileText className="w-4 h-4 shrink-0" />
          </span>
          <div className="min-w-0">
            <button
              onClick={() => onSelectFile(record)}
              className="text-left font-mono text-xs font-semibold text-on-surface hover:text-primary truncate block transition-colors cursor-pointer"
              title={record.fileName}
            >
              {record.fileName}
            </button>
            <span className="text-[11px] font-mono text-outline block">
              {formatBytes(record.fileSize)}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Этап обработки',
      key: 'status',
      width: 150,
      render: (_: any, record: IngestionFile) => {
        const config = getStatusConfig(record.status);
        return (
          <Tooltip title={record.errorMessage || `Статус: ${record.status}`}>
            <Tag
              color={config.color}
              className="font-mono text-xs font-medium px-2 py-0.5 inline-flex items-center gap-1.5"
            >
              {record.status === 'PROCESSING' && <RefreshCw className="w-3 h-3 animate-spin" />}
              {record.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
              {record.status === 'PENDING' && <Clock className="w-3 h-3" />}
              {record.status === 'FAILED' && <AlertCircle className="w-3 h-3" />}
              <span>{config.label}</span>
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Созданная Note',
      key: 'note',
      render: (_: any, record: IngestionFile) => {
        if (!record.note) {
          return (
            <span className="text-xs font-mono text-outline italic">
              {record.status === 'FAILED' ? '— (ошибка)' : 'В процессе...'}
            </span>
          );
        }

        return (
          <div className="flex items-center justify-between gap-2 max-w-[360px]">
            <div className="truncate">
              <span className="font-sans font-semibold text-xs text-on-surface truncate block">
                {record.note.title}
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant/70">
                {dayjs(record.note.startDate).format('DD.MM.YYYY')} • {record.note.type}
              </span>
            </div>

            <Button
              size="small"
              type="text"
              icon={<ExternalLink className="w-3.5 h-3.5 text-primary" />}
              onClick={() => navigate(`/notes/${record.note?.id}`)}
              title="Перейти к редактированию заметки"
              className="shrink-0"
            />
          </div>
        );
      },
    },
    {
      title: 'Изменен',
      key: 'mtime',
      width: 140,
      render: (_: any, record: IngestionFile) => (
        <span className="font-mono text-xs text-on-surface-variant block">
          {dayjs(record.mtime).format('DD.MM HH:mm')}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: any, record: IngestionFile) => (
        <Button
          size="small"
          type="text"
          icon={<Info className="w-4 h-4 text-on-surface-variant" />}
          onClick={() => onSelectFile(record)}
          title="Подробные свойства"
        />
      ),
    },
  ];

  const statusFilters = [
    { key: '', label: 'Все файлы' },
    { key: 'COMPLETED', label: 'Готово' },
    { key: 'PENDING', label: 'В очереди' },
    { key: 'PROCESSING', label: 'В обработке' },
    { key: 'FAILED', label: 'Ошибки' },
  ];

  return (
    <div className="space-y-4">
      {/* Filters & Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Pill Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => onStatusChange(f.key)}
              className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                selectedStatus === f.key
                  ? 'bg-primary text-on-primary font-bold shadow-sm'
                  : 'bg-white/5 text-on-surface-variant hover:bg-white/10 hover:text-on-surface'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="w-full sm:w-64">
          <Input
            prefix={<Search className="w-3.5 h-3.5 text-outline" />}
            placeholder="Поиск по имени или Note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            size="small"
            className="font-sans text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/5 bg-surface-container overflow-hidden shadow-sm">
        <Table
          dataSource={filteredFiles}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            className: 'px-4 py-2 font-mono text-xs',
          }}
          locale={{
            emptyText: (
              <div className="py-8 text-center">
                <Empty
                  description={
                    <span className="font-mono text-xs text-on-surface-variant">
                      Входящие файлы Gemini Sparks пока не обнаружены. Поместите .md файл в папку или нажмите «Создать тест Spark».
                    </span>
                  }
                />
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
};
