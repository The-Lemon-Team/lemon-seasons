import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TopologyModule } from '../topology/topology.module';
import { EventsSseService } from './events-sse.service';
import { EventsSseController } from './events-sse.controller';

@Module({
  imports: [PrismaModule, TopologyModule],
  controllers: [EventsSseController],
  providers: [EventsSseService],
  exports: [EventsSseService],
})
export class EventsModule {}
