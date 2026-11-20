import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedWriteGuard } from '../auth/admin-write.guard';
import { NeuronsBridgeService } from './neurons-bridge.service';

@ApiTags('Neurons & Core Combinator Gateway')
@Controller(['neurons', 'api/v1/neurons'])
export class NeuronsController {
  constructor(private readonly neuronsBridge: NeuronsBridgeService) {}

  @Get('status')
  @ApiOperation({
    summary:
      'Получить статус DB-шлюза Lemon Seasons, ревизии TopologyNeuron, SSE-шины, Core Combinator и Media Hub',
  })
  getStatus() {
    return this.neuronsBridge.getGatewayStatus();
  }

  @Post('sync-combinator')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({
    summary: 'Принудительно синхронизировать композитные нейроны Lemon Seasons в Core Combinator',
  })
  syncCombinator() {
    return this.neuronsBridge.ensureCompositeNeurons();
  }

  @Get('contract')
  @ApiOperation({
    summary: 'Канонический контракт эндпоинтов для @lenta/seasons-neurons и @lemon/seasons-neurons',
  })
  getContract() {
    return {
      sdk: ['@lenta/seasons-neurons', '@lemon/seasons-neurons'],
      endpoints: {
        topology: '/api/v1/topology',
        streamTopology: '/api/v1/topology/streams/:slug',
        feedTopology: '/api/v1/topology/feeds/:slug',
        notesPage: '/api/v1/notes',
        streamNotesPage: '/api/v1/streams/:slug/notes',
        feedNotesPage: '/api/v1/feeds/:slug/notes',
        ingestNote: '/api/v1/notes/ingest',
        attachMediaAssets: '/api/v1/notes/:id/media-assets',
        sseStream: '/api/v1/events/stream',
      },
      combinatorUrl: this.neuronsBridge.combinatorUrl,
      mediaHubUrl: this.neuronsBridge.mediaHubUrl,
    };
  }
}
