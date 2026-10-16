import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotesModule } from '../notes/notes.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { ContainersModule } from '../containers/containers.module';
import { FoldersModule } from '../folders/folders.module';

import { CommandBusService } from './command-bus.service';
import { CommandBusController } from './command-bus.controller';
import { DriveBusRelayService } from './services/drive-bus-relay.service';

import {
  CreateNoteHandler,
  UpdateContainerHandler,
  AddBookmarkHandler,
  AddLinkHandler,
  IngestAudioHandler,
  AddNotebookLmHandler,
} from './handlers';

@Module({
  imports: [
    PrismaModule,
    NotesModule,
    forwardRef(() => IngestionModule),
    ContainersModule,
    FoldersModule,
  ],
  controllers: [CommandBusController],
  providers: [
    CommandBusService,
    DriveBusRelayService,
    CreateNoteHandler,
    UpdateContainerHandler,
    AddBookmarkHandler,
    AddLinkHandler,
    IngestAudioHandler,
    AddNotebookLmHandler,
  ],
  exports: [CommandBusService, DriveBusRelayService],
})
export class BusModule {}
