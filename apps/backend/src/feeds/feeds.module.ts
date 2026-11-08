import { Module, forwardRef } from '@nestjs/common';
import { FeedsService } from './feeds.service';
import { FeedsController } from './feeds.controller';
import { FoldersModule } from '../folders/folders.module';
import { NotesModule } from '../notes/notes.module';

@Module({
  imports: [FoldersModule, forwardRef(() => NotesModule)],
  controllers: [FeedsController],
  providers: [FeedsService],
  exports: [FeedsService],
})
export class FeedsModule {}
