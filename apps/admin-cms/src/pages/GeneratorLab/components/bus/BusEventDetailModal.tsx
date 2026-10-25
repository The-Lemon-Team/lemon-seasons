import React, { useState } from 'react';
import { Modal, Tabs, Button, Tag, message } from 'antd';
import {
  Copy,
  Clock,
  Radio,
  FileText,
  Folder,
  Code,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { BusEventEnvelope, NoteEventPayload } from '@lenta/shared';
import { getDeviceTheme, formatEventTimestamp } from './bus.utils';
import { ACTION_THEMES } from './bus.constants';

interface BusEventDetailModalProps {
  event: BusEventEnvelope<NoteEventPayload> | null;
  open: boolean;
  onClose: () => void;
}

export const BusEventDetailModal: React.FC<BusEventDetailModalProps> = ({
  event,
  open,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'json'>('overview');

  if (!event) return null;

  const p = (event.payload || {}) as Partial<NoteEventPayload>;
  const devTheme = getDeviceTheme(event.deviceId);
  const actionCfg = ACTION_THEMES[event.action] || {
    label: event.action,
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-600',
    border: 'border-zinc-500/30',
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    message.success('JSON события скопирован в буфер обмена');
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="copy" icon={<Copy className="w-3.5 h-3.5" />} onClick={handleCopyJson}>
          Копировать JSON
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          Закрыть
        </Button>,
      ]}
      width={720}
      title={
        <div className="flex items-center gap-2 pr-6">
          <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary">
            <Radio className="w-3.5 h-3.5" />
          </div>
          <span className="font-sans font-bold text-sm text-on-surface">
            Инспектор пакета события шины
          </span>
        </div>
      }
    >
      <div className="space-y-3.5 pt-2">
        {/* Header Badges */}
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-tile-subtle border border-tile-border text-xs font-mono">
          <div className={`px-2 py-0.5 rounded border ${devTheme.badgeBg} ${devTheme.badgeBorder} ${devTheme.badgeText}`}>
            Узел: <b>{event.deviceId}</b>
          </div>
          <div className={`px-2 py-0.5 rounded border ${actionCfg.bg} ${actionCfg.border} ${actionCfg.text} font-bold`}>
            {actionCfg.label}
          </div>
          <div className="px-2 py-0.5 rounded border border-tile-border text-on-surface-variant">
            {event.entityType}
          </div>
          <div className="ml-auto text-outline flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-500" />
            {formatEventTimestamp(event.timestamp)}
          </div>
        </div>

        {/* Tab switch */}
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as any)}
          size="small"
          items={[
            {
              key: 'overview',
              label: (
                <span className="flex items-center gap-1.5 font-sans">
                  <FileText className="w-3.5 h-3.5" /> Обзор полезной нагрузки
                </span>
              ),
              children: (
                <div className="space-y-3 pt-1">
                  {/* Note Title & Folder */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase text-outline">Заголовок:</div>
                    <div className="flex items-center gap-2 font-sans font-bold text-sm text-on-surface">
                      <span>{p.icon || '📄'}</span>
                      <span>{p.title || 'Untitled Note'}</span>
                    </div>
                  </div>

                  {p.folderPath && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono uppercase text-outline">Каталог:</div>
                      <div className="inline-flex items-center gap-1 text-xs font-mono bg-tile-subtle border border-tile-border px-2 py-0.5 rounded text-primary">
                        <Folder className="w-3 h-3" />
                        {p.folderPath}
                      </div>
                    </div>
                  )}

                  {p.summary && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono uppercase text-outline">Краткая выжимка (Summary):</div>
                      <div className="p-2.5 rounded-lg bg-tile-subtle border border-tile-border font-sans text-xs text-on-surface leading-relaxed">
                        {p.summary}
                      </div>
                    </div>
                  )}

                  {/* Metadata key-values */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-tile-subtle border border-tile-border">
                      <div className="text-outline text-[10px]">ID заметки:</div>
                      <div className="text-on-surface font-semibold truncate select-all">{p.id}</div>
                    </div>
                    <div className="p-2 rounded bg-tile-subtle border border-tile-border">
                      <div className="text-outline text-[10px]">ID события шины:</div>
                      <div className="text-on-surface font-semibold truncate select-all">{event.eventId}</div>
                    </div>
                    {p.externalId && (
                      <div className="p-2 rounded bg-tile-subtle border border-tile-border col-span-2">
                        <div className="text-outline text-[10px]">Внешний путь / externalId:</div>
                        <div className="text-primary truncate select-all">{p.externalId}</div>
                      </div>
                    )}
                  </div>

                  {/* Hashtags */}
                  {((p.tags && p.tags.length > 0) || (p.hashtags && p.hashtags.length > 0)) && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono uppercase text-outline">Хэштеги:</div>
                      <div className="flex flex-wrap gap-1">
                        {(p.tags || p.hashtags || []).map((t: any, idx: number) => {
                          const name = typeof t === 'string' ? t : t?.name || '';
                          return (
                            <Tag key={idx} className="font-mono text-[10px] m-0 border-tile-border bg-tile-subtle">
                              #{name}
                            </Tag>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'json',
              label: (
                <span className="flex items-center gap-1.5 font-sans">
                  <Code className="w-3.5 h-3.5" /> Сырой JSON пакета
                </span>
              ),
              children: (
                <pre className="p-3 rounded-lg bg-zinc-950 text-emerald-400 font-mono text-[11px] max-h-96 overflow-auto border border-zinc-800">
                  {JSON.stringify(event, null, 2)}
                </pre>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
};
