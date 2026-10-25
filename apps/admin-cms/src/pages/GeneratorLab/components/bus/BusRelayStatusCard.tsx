import React from 'react';
import { Button, Tooltip, Tag } from 'antd';
import {
  Radio,
  RefreshCw,
  Zap,
  Laptop,
  HardDrive,
  CheckCircle2,
  Share2,
  Clock,
} from 'lucide-react';
import { DriveBusRelayStatus } from '@lenta/shared';
import { getDeviceTheme, formatEventTimestamp, formatRelativeTime } from './bus.utils';

interface BusRelayStatusCardProps {
  status?: DriveBusRelayStatus | null;
  isLoading: boolean;
  isCatchingUp: boolean;
  isPublishingTest: boolean;
  onRefresh: () => void;
  onCatchUp: () => void;
  onPublishTest: () => void;
}

export const BusRelayStatusCard: React.FC<BusRelayStatusCardProps> = ({
  status,
  isLoading,
  isCatchingUp,
  isPublishingTest,
  onRefresh,
  onCatchUp,
  onPublishTest,
}) => {
  const isWatching = status?.isWatching ?? false;
  const currentDev = status?.currentDeviceId || 'local-node';
  const nodes = status?.nodes || [];

  return (
    <div className="platform-tile p-3.5 sm:p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        {/* Left Section: Status & Identity */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-sm text-on-surface">
                  Облачная шина событий LemonBus
                </span>
                <Tag
                  color={isWatching ? 'success' : 'error'}
                  className="font-mono text-[10px] uppercase font-semibold border-none px-1.5 py-0 m-0"
                >
                  {isWatching ? 'ШИНА АКТИВНА' : 'ОСТАНОВЛЕНА'}
                </Tag>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-on-surface-variant">
                <span className="text-outline">Директория:</span>
                <span className="bg-tile-subtle px-1.5 py-0.5 rounded border border-tile-border text-primary break-all">
                  {status?.eventsDir || 'Инициализация шины...'}
                </span>
              </div>
            </div>
          </div>

          {/* Node Breakdown Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono text-outline uppercase font-semibold">Узлы шины:</span>
            {nodes.map((node) => {
              const theme = getDeviceTheme(node.deviceId);
              return (
                <Tooltip
                  key={node.deviceId}
                  title={
                    <div className="space-y-0.5 text-xs font-mono">
                      <div>Узел: <b>{node.deviceId}</b> {node.isCurrentDevice ? '(текущий ПК)' : ''}</div>
                      <div>Событий в шине: <b>{node.eventsCount}</b></div>
                      <div>Последнее: {formatEventTimestamp(node.lastEventTimestamp)}</div>
                      {node.watermarkTimestamp && (
                        <div>Watermark: {formatEventTimestamp(node.watermarkTimestamp)}</div>
                      )}
                    </div>
                  }
                >
                  <div
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-mono transition-all ${
                      theme.badgeBg
                    } ${theme.badgeBorder} ${theme.badgeText} ${
                      node.isCurrentDevice ? 'ring-1 ring-primary/30 shadow-xs' : ''
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
                    <span className="font-semibold">{node.deviceId}</span>
                    <span className="opacity-80 text-[10px]">({node.eventsCount})</span>
                    {node.isCurrentDevice && (
                      <span className="text-[9px] uppercase font-bold bg-primary text-on-primary px-1 rounded-xs">
                        Я
                      </span>
                    )}
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Right Section: Counters & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Total Events Counter Pill */}
          <div className="flex items-center gap-2 bg-tile-subtle border border-tile-border rounded-xl px-3 py-1.5 text-xs font-mono">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant font-medium">
                Всего в шине
              </span>
              <div className="flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-primary" />
                <span className="font-bold text-sm text-on-surface">
                  {status?.totalEventsCount ?? 0}
                </span>
                <span className="text-[10px] text-outline">событий</span>
              </div>
            </div>

            {status?.lastEventTimestamp && (
              <div className="border-l border-tile-border pl-2.5 flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-on-surface-variant font-medium">
                  Крайний пакет
                </span>
                <span className="font-semibold text-xs text-on-surface flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-500" />
                  {formatRelativeTime(status.lastEventTimestamp)}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <Tooltip title="Накатить новые события из облачной папки в локальную базу">
              <Button
                type="default"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isCatchingUp ? 'animate-spin text-primary' : ''}`} />}
                loading={isCatchingUp}
                onClick={onCatchUp}
                className="h-7.5 border-tile-border hover:border-primary text-on-surface font-sans text-xs flex items-center gap-1.5 px-3 rounded-lg"
              >
                Catch-up
              </Button>
            </Tooltip>

            <Tooltip title="Отправить тестовый JSON-пакет в шину для проверки доставки">
              <Button
                type="default"
                icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
                loading={isPublishingTest}
                onClick={onPublishTest}
                className="h-7.5 border-tile-border hover:border-amber-500 text-on-surface font-sans text-xs flex items-center gap-1.5 px-3 rounded-lg"
              >
                Тест шины
              </Button>
            </Tooltip>

            <Tooltip title="Перезапросить актуальный статус">
              <Button
                type="text"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
                onClick={onRefresh}
                className="h-7.5 w-7.5 p-0 flex items-center justify-center text-outline hover:text-on-surface"
              />
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};
