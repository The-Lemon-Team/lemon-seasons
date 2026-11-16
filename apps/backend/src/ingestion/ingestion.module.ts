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
import { RelatedNotesResolverService } from './services/related-notes-resolver.service';
import { WikiEngineService } from './services/wiki-engine.service';
import { NewsVerificationService } from './services/news-verification.service';

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
    NewsVerificationService,
    RelatedNotesResolverService,
    WikiEngineService,
  ],
  exports: [
    IngestionService,
    GeminiService,
    GeminiImageService,
    AiMediaLibraryService,
    TmdbService,
    HolidaysEngineService,
    PoliticalEngineService,
    NewsVerificationService,
    RelatedNotesResolverService,
    WikiEngineService,
  ],
})
export class IngestionModule {}
