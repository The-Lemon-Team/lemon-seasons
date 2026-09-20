import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { StorageModule } from '../storage/storage.module';
import { HashtagsModule } from '../hashtags/hashtags.module';
import { FoldersModule } from '../folders/folders.module';
import { AiQuickAddService } from './ai-quick-add.service';

@Module({
  imports: [StorageModule, HashtagsModule, FoldersModule],
  controllers: [NotesController],
  providers: [NotesService, AiQuickAddService],
  exports: [NotesService, AiQuickAddService],
})
export class NotesModule {}

