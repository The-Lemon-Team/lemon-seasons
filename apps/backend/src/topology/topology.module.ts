import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TopologyController } from './topology.controller';
import { TopologyService } from './topology.service';

@Module({
  imports: [PrismaModule],
  controllers: [TopologyController],
  providers: [TopologyService],
  exports: [TopologyService],
})
export class TopologyModule {}
