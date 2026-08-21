import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { FeedsModule } from './feeds/feeds.module';
import { NotesModule } from './notes/notes.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { HashtagsModule } from './hashtags/hashtags.module';
import { FoldersModule } from './folders/folders.module';
import { SyncModule } from './sync/sync.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    FeedsModule,
    NotesModule,
    TaxonomyModule,
    HashtagsModule,
    FoldersModule,
    SyncModule,
    StorageModule,
  ],
})
export class AppModule {}
