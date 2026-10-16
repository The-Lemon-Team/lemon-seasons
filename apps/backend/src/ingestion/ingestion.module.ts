import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotesModule } from '../notes/notes.module';
import { BusModule } from '../bus/bus.module';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { GeminiService } from './services/gemini.service';
import { TmdbService } from './services/tmdb.service';
import { HolidaysEngineService } from './services/holidays-engine.service';
import { PoliticalEngineService } from './services/political-engine.service';
import { SparksParserService } from './services/sparks-parser.service';
import { RelatedNotesResolverService } from './services/related-notes-resolver.service';
import { DriveWatcherService } from './services/drive-watcher.service';
import { WikiEngineService } from './services/wiki-engine.service';
import { SparksIngestListener } from './listeners/sparks-ingest.listener';

@Module({
  imports: [PrismaModule, NotesModule, forwardRef(() => BusModule)],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    GeminiService,
    TmdbService,
    HolidaysEngineService,
    PoliticalEngineService,
    SparksParserService,
    RelatedNotesResolverService,
    DriveWatcherService,
    WikiEngineService,
    SparksIngestListener,
  ],
  exports: [
    IngestionService,
    GeminiService,
    TmdbService,
    HolidaysEngineService,
    PoliticalEngineService,
    SparksParserService,
    RelatedNotesResolverService,
    DriveWatcherService,
    WikiEngineService,
    SparksIngestListener,
  ],
})
export class IngestionModule {}
