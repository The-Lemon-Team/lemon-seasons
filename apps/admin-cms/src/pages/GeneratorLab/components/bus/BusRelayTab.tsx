import React, { useState } from 'react';
import { message } from 'antd';
import {
  BusEventEnvelope,
  NoteEventPayload,
  BusActionType,
} from '@lenta/shared';
import {
  useDriveBusStatus,
  useDriveBusEvents,
  useTriggerBusCatchUp,
  usePublishTestBusEvent,
} from '../../../../api/queries';
import { BusRelayStatusCard } from './BusRelayStatusCard';
import { BusEventsTable } from './BusEventsTable';
import { BusEventDetailModal } from './BusEventDetailModal';

export const BusRelayTab: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selectedDevice, setSelectedDevice] = useState<string | undefined>(undefined);
  const [selectedAction, setSelectedAction] = useState<BusActionType | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<BusEventEnvelope<NoteEventPayload> | null>(null);

  // Queries
  const {
    data: status,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
  } = useDriveBusStatus();

  const {
    data: eventsData,
    isLoading: isEventsLoading,
    refetch: refetchEvents,
  } = useDriveBusEvents({
    page,
    limit,
    deviceId: selectedDevice,
    action: selectedAction,
    search: searchQuery || undefined,
  });

  // Mutations
  const triggerCatchUp = useTriggerBusCatchUp();
  const publishTestEvent = usePublishTestBusEvent();

  const handleCatchUp = async () => {
    try {
      const res = await triggerCatchUp.mutateAsync();
      message.success(
        `Синхронизация завершена: обработано новых: ${res.processed}, пропущено: ${res.skipped}`,
      );
    } catch (err: any) {
      message.error(`Ошибка при catch-up синхронизации: ${err?.message || err}`);
    }
  };

  const handlePublishTest = async () => {
    try {
      const res = await publishTestEvent.mutateAsync({
        title: `Проверочный пинг LemonBus [${new Date().toLocaleTimeString('ru-RU')}]`,
        folderPath: 'Spark/BusVerification',
      });
      message.success(`Событие "${res.eventId.slice(0, 8)}..." успешно опубликовано в шину!`);
    } catch (err: any) {
      message.error(`Ошибка отправки тестового события: ${err?.message || err}`);
    }
  };

  const handleRefreshAll = () => {
    refetchStatus();
    refetchEvents();
    message.info('Данные шины обновлены');
  };

  return (
    <div className="space-y-3.5">
      {/* 1. Bus Status & Node Metrics Bento Card */}
      <BusRelayStatusCard
        status={status}
        isLoading={isStatusLoading}
        isCatchingUp={triggerCatchUp.isPending}
        isPublishingTest={publishTestEvent.isPending}
        onRefresh={handleRefreshAll}
        onCatchUp={handleCatchUp}
        onPublishTest={handlePublishTest}
      />

      {/* 2. Events Stream Table */}
      <BusEventsTable
        events={eventsData?.items || []}
        total={eventsData?.total || 0}
        page={page}
        limit={limit}
        isLoading={isEventsLoading}
        nodes={status?.nodes || []}
        selectedDevice={selectedDevice}
        selectedAction={selectedAction}
        searchQuery={searchQuery}
        onPageChange={(p, l) => {
          setPage(p);
          setLimit(l);
        }}
        onDeviceChange={(dev) => {
          setSelectedDevice(dev || undefined);
          setPage(1);
        }}
        onActionChange={(act) => {
          setSelectedAction(act || undefined);
          setPage(1);
        }}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        onSelectEvent={setSelectedEvent}
      />

      {/* 3. Deep Inspect Modal */}
      <BusEventDetailModal
        event={selectedEvent}
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
};
