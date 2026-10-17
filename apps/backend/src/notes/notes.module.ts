import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { StorageModule } from '../storage/storage.module';
import { HashtagsModule } from '../hashtags/hashtags.module';
import { FoldersModule } from '../folders/folders.module';
import { AiQuickAddService } from './ai-quick-add.service';
import { NotesIngestService } from './notes-ingest.service';
import { NotesLinksService } from './notes-links.service';
import { NotesMediaService } from './notes-media.service';
import { NotesShareService } from './notes-share.service';
import { NotesCacheService } from './notes-cache.service';
import { NotesQueryBuilder } from './notes-query.builder';
import { KeysModule } from '../keys/keys.module';

@Module({
  imports: [StorageModule, HashtagsModule, FoldersModule, KeysModule],
  controllers: [NotesController],
  providers: [
    NotesService,
    AiQuickAddService,
    NotesIngestService,
    NotesLinksService,
    NotesMediaService,
    NotesShareService,
    NotesCacheService,
    NotesQueryBuilder,
  ],
  exports: [
    NotesService,
    AiQuickAddService,
    NotesIngestService,
    NotesLinksService,
    NotesMediaService,
    NotesShareService,
    NotesCacheService,
    NotesQueryBuilder,
  ],
})
export class NotesModule {}

