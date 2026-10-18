import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotesModule } from '../notes/notes.module';
import { BusModule } from '../bus/bus.module';
import { StorageModule } from '../storage/storage.module';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { GeminiService } from './services/gemini.service';
import { GeminiImageService } from './services/gemini-image.service';
import { AiMediaLibraryService } from './services/ai-media-library.service';
import { TmdbService } from './services/tmdb.service';
import { HolidaysEngineService } from './services/holidays-engine.service';
import { PoliticalEngineService } from './services/political-engine.service';
import { SparksParserService } from './services/sparks-parser.service';
import { RelatedNotesResolverService } from './services/related-notes-resolver.service';
import { DriveWatcherService } from './services/drive-watcher.service';
import { WikiEngineService } from './services/wiki-engine.service';
import { SparksIngestListener } from './listeners/sparks-ingest.listener';

@Module({
  imports: [PrismaModule, NotesModule, StorageModule, forwardRef(() => BusModule)],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    GeminiService,
    GeminiImageService,
    AiMediaLibraryService,
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
    GeminiImageService,
    AiMediaLibraryService,
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
