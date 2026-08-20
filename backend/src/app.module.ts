import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { FeedsModule } from './feeds/feeds.module';
import { NotesModule } from './notes/notes.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    FeedsModule,
    NotesModule,
    TaxonomyModule,
    SyncModule,
  ],
})
export class AppModule {}
