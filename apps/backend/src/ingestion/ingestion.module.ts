import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotesModule } from '../notes/notes.module';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { GeminiService } from './services/gemini.service';
import { TmdbService } from './services/tmdb.service';
import { HolidaysEngineService } from './services/holidays-engine.service';
import { PoliticalEngineService } from './services/political-engine.service';
import { SparksParserService } from './services/sparks-parser.service';
import { DriveWatcherService } from './services/drive-watcher.service';

@Module({
  imports: [PrismaModule, NotesModule],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    GeminiService,
    TmdbService,
    HolidaysEngineService,
    PoliticalEngineService,
    SparksParserService,
    DriveWatcherService,
  ],
  exports: [
    IngestionService,
    GeminiService,
    TmdbService,
    HolidaysEngineService,
    PoliticalEngineService,
    SparksParserService,
    DriveWatcherService,
  ],
})
export class IngestionModule {}
