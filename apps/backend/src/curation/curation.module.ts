import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotesModule } from '../notes/notes.module';
import { CurationController } from './curation.controller';
import { CurationService } from './curation.service';

@Module({
  imports: [PrismaModule, NotesModule],
  controllers: [CurationController],
  providers: [CurationService],
  exports: [CurationService],
})
export class CurationModule {}
