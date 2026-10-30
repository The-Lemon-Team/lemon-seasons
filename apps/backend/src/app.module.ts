import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuthContextMiddleware } from './auth/auth-context.middleware';
import { FeedsModule } from './feeds/feeds.module';
import { NotesModule } from './notes/notes.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { HashtagsModule } from './hashtags/hashtags.module';
import { FoldersModule } from './folders/folders.module';
import { SyncModule } from './sync/sync.module';
import { StorageModule } from './storage/storage.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { KeysModule } from './keys/keys.module';
import { HealthModule } from './health/health.module';
import { ContainersModule } from './containers/containers.module';
import { StatsModule } from './stats/stats.module';
import { BusModule } from './bus/bus.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
    PrismaModule,
    AuthModule,
    FeedsModule,
    NotesModule,
    TaxonomyModule,
    HashtagsModule,
    FoldersModule,
    SyncModule,
    StorageModule,
    IngestionModule,
    KeysModule,
    HealthModule,
    ContainersModule,
    StatsModule,
    BusModule,
    WorkspacesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthContextMiddleware).forRoutes('*');
  }
}
