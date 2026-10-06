import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CurationModule } from '../curation/curation.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { NotesModule } from '../notes/notes.module';
import { SyncModule } from '../sync/sync.module';
import { StorageModule } from '../storage/storage.module';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import {
  CuratorsService,
  ChatFoldersService,
  ChatMediaService,
  ChatSeederService,
} from './services';

@Module({
  imports: [PrismaModule, CurationModule, IngestionModule, NotesModule, SyncModule, StorageModule],
  controllers: [ChatsController],
  providers: [
    ChatsService,
    CuratorsService,
    ChatFoldersService,
    ChatMediaService,
    ChatSeederService,
  ],
  exports: [
    ChatsService,
    CuratorsService,
    ChatFoldersService,
    ChatMediaService,
    ChatSeederService,
  ],
})
export class ChatsModule {}
