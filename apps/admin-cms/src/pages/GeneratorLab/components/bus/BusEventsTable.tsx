import React from 'react';
import { Table, Tag, Input, Select, Pagination, Empty, Tooltip, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Search,
  Zap,
  Clock,
  ExternalLink,
  Tag as TagIcon,
  Folder,
  Layers,
  Eye,
} from 'lucide-react';
import {
  BusEventEnvelope,
  NoteEventPayload,
  BusActionType,
  DriveBusNodeStats,
} from '@lenta/shared';
import { getDeviceTheme, formatEventTimestamp, formatRelativeTime, truncateText } from './bus.utils';
import { ACTION_THEMES } from './bus.constants';

interface BusEventsTableProps {
  events: BusEventEnvelope<NoteEventPayload>[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  nodes: DriveBusNodeStats[];
  selectedDevice?: string;
  selectedAction?: BusActionType;
  searchQuery: string;
  onPageChange: (page: number, pageSize: number) => void;
  onDeviceChange: (device?: string) => void;
  onActionChange: (action?: BusActionType) => void;
  onSearchChange: (search: string) => void;
  onSelectEvent: (event: BusEventEnvelope<NoteEventPayload>) => void;
}

export const BusEventsTable: React.FC<BusEventsTableProps> = ({
  events,
  total,
  page,
  limit,
  isLoading,
  nodes,
  selectedDevice,
  selectedAction,
  searchQuery,
  onPageChange,
  onDeviceChange,
  onActionChange,
  onSearchChange,
  onSelectEvent,
}) => {
  const columns: ColumnsType<BusEventEnvelope<NoteEventPayload>> = [
    {
      title: 'Время',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (timestamp: string) => (
        <div className="space-y-0.5 font-mono text-[11px]">
          <div className="text-on-surface font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-500" />
            <span>{formatRelativeTime(timestamp)}</span>
          </div>
          <div className="text-[10px] text-outline opacity-80">
            {formatEventTimestamp(timestamp)}
          </div>
        </div>
      ),
    },
    {
      title: 'Узел (Устройство)',
      dataIndex: 'deviceId',
      key: 'deviceId',
      width: 140,
      render: (deviceId: string) => {
        const theme = getDeviceTheme(deviceId);
        return (
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-mono font-medium ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
            <span>{deviceId}</span>
          </div>
        );
      },
    },
    {
      title: 'Тип & Действие',
      key: 'action',
      width: 130,
      render: (_, record) => {
        const actionCfg = ACTION_THEMES[record.action] || {
          label: record.action,
          bg: 'bg-zinc-500/10',
          text: 'text-zinc-600',
          border: 'border-zinc-500/30',
        };
        return (
          <div className="flex flex-col gap-1 items-start">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase border ${actionCfg.bg} ${actionCfg.border} ${actionCfg.text}`}
            >
              <Zap className="w-2.5 h-2.5" />
              {actionCfg.label}
            </span>
            <span className="text-[10px] font-mono text-outline uppercase font-semibold">
              {record.entityType}
            </span>
          </div>
        );
      },
    },
    {
      title: 'Содержимое события / Заметка',
      key: 'content',
      render: (_, record) => {
        const p = (record.payload || {}) as Partial<NoteEventPayload>;
        const icon = p.icon || '📄';
        const title = p.title || 'Безымянное событие';
        const folder = p.folderPath;
        const summary = p.summary || p.description;
        const hashtags = p.tags || p.hashtags || [];

        return (
          <div className="space-y-1.5 py-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base select-none leading-none">{icon}</span>
              <span
                onClick={() => onSelectEvent(record)}
                className="font-sans font-semibold text-xs text-on-surface hover:text-primary cursor-pointer transition-colors"
              >
                {title}
              </span>
              {folder && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-tile-subtle border border-tile-border px-1.5 py-0.2 rounded text-outline">
                  <Folder className="w-2.5 h-2.5 text-primary" />
                  {folder}
                </span>
              )}
            </div>

            {summary && (
              <p className="font-sans text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed">
                {truncateText(summary, 180)}
              </p>
            )}

            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center pt-0.5">
                {hashtags.slice(0, 5).map((t: any, idx: number) => {
                  const tagName = typeof t === 'string' ? t : t?.name || '';
                  if (!tagName) return null;
                  return (
                    <span
                      key={idx}
                      className="text-[9px] font-mono bg-tile-subtle text-outline border border-tile-border px-1 py-0 rounded flex items-center gap-0.5"
                    >
                      #{tagName}
                    </span>
                  );
                })}
                {hashtags.length > 5 && (
                  <span className="text-[9px] font-mono text-outline">
                    +{hashtags.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Инспектор',
      key: 'actions',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <Tooltip title="Открыть сырой JSON-пакет события">
          <Button
            type="text"
            size="small"
            icon={<Eye className="w-3.5 h-3.5 text-primary" />}
            onClick={() => onSelectEvent(record)}
            className="h-7 px-2 text-xs font-mono flex items-center gap-1 text-on-surface-variant hover:text-primary rounded-md"
          >
            Инспект
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="platform-tile p-3.5 sm:p-4 space-y-3">
      {/* Table Toolbar: Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Поиск по заголовку, ID или папке..."
            prefix={<Search className="w-3.5 h-3.5 text-outline" />}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            className="h-8 rounded-lg font-mono text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Device filter */}
          <Select
            placeholder="Все устройства"
            allowClear
            value={selectedDevice}
            onChange={onDeviceChange}
            className="w-40 font-mono text-xs"
            options={[
              { label: 'Все узлы шины', value: '' },
              ...nodes.map((n) => ({
                label: `${n.deviceId} (${n.eventsCount})`,
                value: n.deviceId,
              })),
            ]}
          />

          {/* Action filter */}
          <Select
            placeholder="Все действия"
            allowClear
            value={selectedAction}
            onChange={onActionChange}
            className="w-32 font-mono text-xs"
            options={[
              { label: 'Все действия', value: '' },
              { label: '⚡ UPSERT', value: 'UPSERT' },
              { label: '📊 STATUS', value: 'STATUS_CHANGE' },
              { label: '🗑️ DELETE', value: 'DELETE' },
            ]}
          />
        </div>
      </div>

      {/* Events Table */}
      <div className="overflow-x-auto">
        <Table
          columns={columns}
          dataSource={events}
          rowKey={(r) => r.eventId || `${r.timestamp}_${r.deviceId}`}
          loading={isLoading}
          pagination={false}
          size="small"
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Нет событий в шине по выбранным фильтрам"
              />
            ),
          }}
          className="border border-tile-border rounded-lg overflow-hidden"
        />
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
        <div className="text-[11px] font-mono text-on-surface-variant">
          Показано {events.length} из <b>{total}</b> событий шины
        </div>
        <Pagination
          current={page}
          pageSize={limit}
          total={total}
          showSizeChanger
          pageSizeOptions={['15', '25', '50', '100']}
          onChange={onPageChange}
          size="small"
        />
      </div>
    </div>
  );
};
