import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { StorageModule } from '../storage/storage.module';
import { HashtagsModule } from '../hashtags/hashtags.module';

@Module({
  imports: [StorageModule, HashtagsModule],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
