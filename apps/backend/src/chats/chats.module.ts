import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CurationModule } from '../curation/curation.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { NotesModule } from '../notes/notes.module';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';

@Module({
  imports: [PrismaModule, CurationModule, IngestionModule, NotesModule],
  controllers: [ChatsController],
  providers: [ChatsService],
  exports: [ChatsService],
})
export class ChatsModule {}
