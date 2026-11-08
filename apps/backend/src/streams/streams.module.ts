import { Module, forwardRef } from '@nestjs/common';
import { StreamsService } from './streams.service';
import { StreamsController } from './streams.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotesModule } from '../notes/notes.module';

@Module({
  imports: [PrismaModule, forwardRef(() => NotesModule)],
  controllers: [StreamsController],
  providers: [StreamsService],
  exports: [StreamsService],
})
export class StreamsModule {}
