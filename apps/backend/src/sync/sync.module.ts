import { Module, forwardRef } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { SessionService } from './session.service';
import { GDriveStorageService } from './gdrive-storage.service';
import { MergeService } from './merge.service';
import { NoteSyncService } from './note-sync.service';
import { SyncChangesService } from './sync-changes.service';
import { SyncOrchestratorService } from './sync-orchestrator.service';
import { PrismaModule } from '../prisma/prisma.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { BusModule } from '../bus/bus.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => IngestionModule),
    forwardRef(() => BusModule),
  ],
  controllers: [SyncController],
  providers: [
    SyncService,
    SessionService,
    GDriveStorageService,
    MergeService,
    NoteSyncService,
    SyncChangesService,
    SyncOrchestratorService,
  ],
  exports: [
    SyncService,
    SessionService,
    GDriveStorageService,
    MergeService,
    NoteSyncService,
    SyncChangesService,
    SyncOrchestratorService,
  ],
})
export class SyncModule {}
