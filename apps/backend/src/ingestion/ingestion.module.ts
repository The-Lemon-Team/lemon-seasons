import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { GeminiService } from './services/gemini.service';
import { TmdbService } from './services/tmdb.service';
import { HolidaysEngineService } from './services/holidays-engine.service';
import { PoliticalEngineService } from './services/political-engine.service';

@Module({
  imports: [PrismaModule],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    GeminiService,
    TmdbService,
    HolidaysEngineService,
    PoliticalEngineService,
  ],
  exports: [
    IngestionService,
    GeminiService,
    TmdbService,
    HolidaysEngineService,
    PoliticalEngineService,
  ],
})
export class IngestionModule {}
