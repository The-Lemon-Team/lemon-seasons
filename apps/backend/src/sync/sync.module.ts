import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { SessionService } from './session.service';
import { GDriveStorageService } from './gdrive-storage.service';
import { MergeService } from './merge.service';
import { SyncOrchestratorService } from './sync-orchestrator.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SyncController],
  providers: [
    SyncService,
    SessionService,
    GDriveStorageService,
    MergeService,
    SyncOrchestratorService,
  ],
  exports: [
    SyncService,
    SessionService,
    GDriveStorageService,
    MergeService,
    SyncOrchestratorService,
  ],
})
export class SyncModule {}
