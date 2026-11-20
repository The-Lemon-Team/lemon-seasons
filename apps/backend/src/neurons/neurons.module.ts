import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TopologyModule } from '../topology/topology.module';
import { EventsModule } from '../events/events.module';
import { NeuronsBridgeService } from './neurons-bridge.service';
import { NeuronsController } from './neurons.controller';

@Module({
  imports: [PrismaModule, TopologyModule, EventsModule],
  controllers: [NeuronsController],
  providers: [NeuronsBridgeService],
  exports: [NeuronsBridgeService],
})
export class NeuronsModule {}
