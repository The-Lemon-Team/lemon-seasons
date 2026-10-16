import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ICommandHandler } from '../command-bus.interface';
import { BusCommand, UpdateContainerPayload } from '@lenta/shared';
import { IngestionService } from '../../ingestion/ingestion.service';
import { ContainersService } from '../../containers/containers.service';

@Injectable()
export class UpdateContainerHandler implements ICommandHandler<UpdateContainerPayload> {
  readonly commandType = 'UPDATE_CONTAINER' as const;
  private readonly logger = new Logger(UpdateContainerHandler.name);

  constructor(
    @Inject(forwardRef(() => IngestionService))
    private readonly ingestionService: IngestionService,
    private readonly containersService: ContainersService,
  ) {}

  async execute(payload: UpdateContainerPayload, command: BusCommand): Promise<any> {
    this.logger.log(`Executing UPDATE_CONTAINER: "${payload.containerId}" (command: ${command.id})`);

    const containerId = payload.containerId;
    const targetDate = payload.targetDate ? new Date(payload.targetDate) : new Date();

    // 1. If wiki container, sync today's historical notes
    if (
      containerId === 'wiki-daily-history' ||
      containerId.includes('wiki') ||
      payload.sourceType === 'wiki' ||
      payload.sourceType === 'daily'
    ) {
      const result = await this.ingestionService.syncWikiEvents(targetDate);
      return {
        containerId,
        sourceType: 'wiki',
        syncedNotesCount: result.notesCount,
        created: result.created,
        updated: result.updated,
      };
    }

    // 2. Default: fetch container info
    const container = await this.containersService.getContainerSummary(containerId);
    return {
      containerId,
      name: container?.name,
      status: 'UP_TO_DATE',
      syncedAt: new Date().toISOString(),
    };
  }
}
