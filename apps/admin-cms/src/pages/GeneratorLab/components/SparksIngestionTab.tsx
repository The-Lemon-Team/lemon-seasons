import React, { useState } from 'react';
import { message } from 'antd';
import { IngestionFile } from '@lenta/shared';
import {
  useWatcherStatus,
  useIngestedFiles,
  useTriggerWatcherScan,
  useCreateTestSpark,
} from '../../../api/queries';
import { WatcherStatusCard } from './WatcherStatusCard';
import { IngestedFilesTable } from './IngestedFilesTable';
import { CreateTestSparkModal } from './CreateTestSparkModal';
import { FileDetailsModal } from './FileDetailsModal';

export const SparksIngestionTab: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedFileForDetails, setSelectedFileForDetails] = useState<IngestionFile | null>(null);

  // Queries
  const { data: status, isLoading: isStatusLoading } = useWatcherStatus();
  const { data: files = [], isLoading: isFilesLoading } = useIngestedFiles(
    selectedStatus || undefined,
    50,
  );

  // Mutations
  const triggerScan = useTriggerWatcherScan();
  const createSpark = useCreateTestSpark();

  const handleScanDirectory = async () => {
    try {
      const res = await triggerScan.mutateAsync();
      message.success(`Сканирование завершено: проверено ${res.scanned} .md файлов.`);
    } catch (err: any) {
      message.error(`Ошибка при сканировании: ${err?.message || err}`);
    }
  };

  const handleCreateSpark = async (data: {
    title: string;
    summary: string;
    content: string;
    tags: string[];
  }) => {
    try {
      const res = await createSpark.mutateAsync(data);
      message.success(`Файл "${res.fileName}" записан на диск и принят конвейером!`);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      message.error(`Ошибка создания Spark: ${err?.message || err}`);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* 1. Header & Live Watcher Status */}
      <WatcherStatusCard
        status={status}
        isLoading={isStatusLoading}
        isScanning={triggerScan.isPending}
        onScan={handleScanDirectory}
        onCreateSparkClick={() => setIsCreateModalOpen(true)}
      />

      {/* 2. Pipeline Ingestion Files Table */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-sans font-semibold text-sm text-on-surface">
              Журнал файлов конвейера Ingestion
            </h3>
            <p className="text-[11px] font-mono text-on-surface-variant">
              Статусы этапов: <span className="text-blue-400">PENDING</span> (детекция) ➔{' '}
              <span className="text-amber-400">PROCESSING</span> (парсинг) ➔{' '}
              <span className="text-emerald-400">COMPLETED</span> (Note в БД)
            </p>
          </div>
        </div>

        <IngestedFilesTable
          files={files}
          isLoading={isFilesLoading}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          onSelectFile={setSelectedFileForDetails}
        />
      </div>

      {/* 3. Modals */}
      <CreateTestSparkModal
        open={isCreateModalOpen}
        isSubmitting={createSpark.isPending}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSpark}
      />

      <FileDetailsModal
        file={selectedFileForDetails}
        open={Boolean(selectedFileForDetails)}
        onClose={() => setSelectedFileForDetails(null)}
      />
    </div>
  );
};
