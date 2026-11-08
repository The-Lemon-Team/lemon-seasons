import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import {
  DriveBusRelayStatus,
  DriveBusEventsResponse,
  DriveBusEventsFilter,
  BusActionType,
} from '@lenta/shared';
import { DriveBusRelayService } from '../services/drive-bus-relay.service';
import { DriveBusReaderService } from '../services/drive-bus-reader.service';
import { AuthenticatedWriteGuard } from '../../auth/admin-write.guard';

@ApiTags('DriveBus Cloud Relay & P2P Bus')
@Controller(['bus/relay', 'api/bus/relay', 'api/v1/bus/relay'])
export class DriveBusRelayController {
  constructor(
    private readonly driveBusRelay: DriveBusRelayService,
    private readonly driveBusReader: DriveBusReaderService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Получить статус облачной шины LemonBus, активный драйвер и состояние нод/водяных знаков' })
  @ApiResponse({ status: 200, description: 'Статус шины LemonBus' })
  async getStatus(): Promise<DriveBusRelayStatus & { driverKind?: string }> {
    const transportStatus = await this.driveBusRelay.getTransportStatus().catch(() => null);
    if (transportStatus) {
      return {
        ...transportStatus,
        driverKind: transportStatus.driver,
      } as any;
    }

    const busDir = this.driveBusRelay.getBusDirectory();
    const eventsDir = this.driveBusRelay.getEventsDirectory();
    const deviceId = this.driveBusRelay.getDeviceId();
    const isWatching = this.driveBusRelay.isWatching();

    const status = await this.driveBusReader.getStatus(
      busDir,
      eventsDir,
      deviceId,
      isWatching,
    );
    return {
      ...status,
      driverKind: this.driveBusRelay.getDriverKind(),
    };
  }

  @Get('events')
  @ApiOperation({ summary: 'Получить пагинированный список событий шины с фильтрами по устройствам и действиям' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'deviceId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, enum: ['UPSERT', 'STATUS_CHANGE', 'DELETE'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getEvents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('deviceId') deviceId?: string,
    @Query('action') action?: BusActionType,
    @Query('search') search?: string,
  ): Promise<DriveBusEventsResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 25;

    const transportPage = await this.driveBusRelay
      .queryEvents({
        page: pageNum,
        limit: limitNum,
        deviceId,
        action,
        search,
      })
      .catch(() => null);

    if (transportPage) {
      return {
        total: transportPage.total,
        page: transportPage.page,
        limit: transportPage.limit,
        totalPages: transportPage.totalPages,
        items: transportPage.items as any,
      };
    }

    const eventsDir = this.driveBusRelay.getEventsDirectory();
    const filter: DriveBusEventsFilter = {
      page: pageNum,
      limit: limitNum,
      deviceId: deviceId || undefined,
      action: action || undefined,
      search: search || undefined,
    };

    return this.driveBusReader.getEvents(eventsDir, filter);
  }

  @Post('purge-expired')
  @UseGuards(AuthenticatedWriteGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Очистить устаревшие события скользящего 30-дневного буфера шины. ' +
      'ВНИМАНИЕ: Очищает только временный буфер шины; файлы в Google Drive и постоянные Notes в базе данных НЕ удаляются.',
  })
  async purgeExpiredBuffer(
    @Body() body?: { retentionDays?: number },
  ): Promise<{ purgedEvents: number; purgedSparkDocs: number; retentionDays: number }> {
    const days = Math.max(1, body?.retentionDays || 30);
    const result = await this.driveBusRelay.purgeExpiredBuffer(days);
    return {
      ...result,
      retentionDays: days,
    };
  }


  @Post('catch-up')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Запустить ручную догоняющую синхронизацию (catch-up) из шины' })
  async runCatchUp(): Promise<{ processed: number; skipped: number; success: boolean }> {
    const result = await this.driveBusRelay.runCatchUpSync();
    return {
      ...result,
      success: true,
    };
  }

  @Post('spark-document')
  @UseGuards(AuthenticatedWriteGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Опубликовать Markdown Spark-документ напрямую в облачную шину (@lenta/lemon-bus / Supabase / Hybrid) без Google Drive Desktop',
  })
  async publishSparkDocument(
    @Body()
    body: {
      relativePath: string;
      rawMarkdown: string;
      origin?: 'SUPABASE_SPARK' | 'GDRIVE_SPARK';
    },
  ) {
    return this.driveBusRelay.publishSparkDocument(body);
  }

  @Post('test-event')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Сгенерировать контрольное проверочное событие в шину LemonBus' })
  async publishTestEvent(
    @Body() body?: { title?: string; folderPath?: string },
  ) {
    const eventsDir = this.driveBusRelay.getEventsDirectory();
    const deviceId = this.driveBusRelay.getDeviceId();
    return this.driveBusReader.publishTestEvent(
      eventsDir,
      deviceId,
      body?.title,
      body?.folderPath,
    );
  }
}
