import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { StorageModule } from '../storage/storage.module';
import { HashtagsModule } from '../hashtags/hashtags.module';
import { FoldersModule } from '../folders/folders.module';
import { AiQuickAddService } from './ai-quick-add.service';
import { NotesIngestService } from './notes-ingest.service';
import { SyncModule } from '../sync/sync.module';
import { KeysModule } from '../keys/keys.module';

@Module({
  imports: [StorageModule, HashtagsModule, FoldersModule, SyncModule, KeysModule],
  controllers: [NotesController],
  providers: [NotesService, AiQuickAddService, NotesIngestService],
  exports: [NotesService, AiQuickAddService, NotesIngestService],
})

export class NotesModule {}

