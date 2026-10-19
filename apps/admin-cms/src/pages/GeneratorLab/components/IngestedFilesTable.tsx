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
        <div className="flex items-center gap-2.5 min-w-0 w-full overflow-hidden">
          <span className="p-1.5 rounded bg-primary/10 text-primary shrink-0">
            <FileText className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <Tooltip title={record.fileName} placement="topLeft" mouseEnterDelay={0.3}>
              <button
                onClick={() => onSelectFile(record)}
                className="w-full text-left font-mono text-xs font-semibold text-on-surface hover:text-primary truncate block transition-colors cursor-pointer"
              >
                {record.fileName}
              </button>
            </Tooltip>
            <span className="text-[11px] font-mono text-outline block truncate">
              {formatBytes(record.fileSize)}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Этап обработки',
      key: 'status',
      width: 135,
      render: (_: any, record: IngestionFile) => {
        const config = getStatusConfig(record.status);
        return (
          <Tooltip title={record.errorMessage || `Статус: ${record.status}`} placement="top">
            <Tag
              color={config.color}
              className="font-mono text-xs font-medium px-2 py-0.5 inline-flex items-center gap-1.5 max-w-full m-0"
            >
              {record.status === 'PROCESSING' && <RefreshCw className="w-3 h-3 animate-spin shrink-0" />}
              {record.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
              {record.status === 'PENDING' && <Clock className="w-3 h-3 shrink-0" />}
              {record.status === 'FAILED' && <AlertCircle className="w-3 h-3 shrink-0" />}
              <span className="truncate">{config.label}</span>
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
            <span className="text-xs font-mono text-outline italic truncate block">
              {record.status === 'FAILED' ? '— (ошибка)' : 'В процессе...'}
            </span>
          );
        }

        return (
          <div className="flex items-center justify-between gap-2 min-w-0 w-full overflow-hidden">
            <div className="min-w-0 flex-1 overflow-hidden">
              <Tooltip title={record.note.title} placement="topLeft" mouseEnterDelay={0.3}>
                <span className="font-sans font-semibold text-xs text-on-surface truncate block">
                  {record.note.title}
                </span>
              </Tooltip>
              <span className="font-mono text-[10px] text-on-surface-variant/70 truncate block">
                {dayjs(record.note.startDate).format('DD.MM.YYYY')} • {record.note.type}
              </span>
            </div>

            <Tooltip title="Перейти к редактированию заметки">
              <Button
                size="small"
                type="text"
                icon={<ExternalLink className="w-3.5 h-3.5 text-primary" />}
                onClick={() => navigate(`/notes/${record.note?.id}`)}
                className="shrink-0 hover:bg-tile-subtle"
              />
            </Tooltip>
          </div>
        );
      },
    },
    {
      title: 'Изменен',
      key: 'mtime',
      width: 110,
      render: (_: any, record: IngestionFile) => (
        <span className="font-mono text-xs text-on-surface-variant block whitespace-nowrap">
          {dayjs(record.mtime).format('DD.MM HH:mm')}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      align: 'center' as const,
      render: (_: any, record: IngestionFile) => (
        <Tooltip title="Подробные свойства">
          <Button
            size="small"
            type="text"
            icon={<Info className="w-4 h-4 text-on-surface-variant" />}
            onClick={() => onSelectFile(record)}
            className="hover:bg-tile-subtle"
          />
        </Tooltip>
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
    <div className="space-y-2.5">
      {/* Filters & Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Status Pill Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => onStatusChange(f.key)}
              className={`h-6.5 px-2.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer flex items-center border ${
                selectedStatus === f.key
                  ? 'bg-primary text-on-primary font-bold border-primary shadow-xs'
                  : 'bg-control text-on-surface-variant border-control-border hover:bg-tile-subtle hover:text-on-surface'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="w-full sm:w-60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-on-surface-variant/60 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск по имени или Note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-6.5 pl-8 pr-2.5 rounded-lg bg-control border border-control-border text-[11px] font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-tile-border bg-tile overflow-hidden shadow-xs">
        <Table
          dataSource={filteredFiles}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          tableLayout="fixed"
          size="small"
          scroll={{ x: 760 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            className: 'font-mono text-xs',
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
