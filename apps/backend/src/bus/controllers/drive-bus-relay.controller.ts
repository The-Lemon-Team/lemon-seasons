import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
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

@ApiTags('DriveBus Cloud Relay & P2P Bus')
@Controller(['bus/relay', 'api/bus/relay'])
export class DriveBusRelayController {
  constructor(
    private readonly driveBusRelay: DriveBusRelayService,
    private readonly driveBusReader: DriveBusReaderService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Получить статус облачной шины LemonBus и состояние нод/водяных знаков' })
  @ApiResponse({ status: 200, description: 'Статус шины LemonBus' })
  async getStatus(): Promise<DriveBusRelayStatus> {
    const busDir = this.driveBusRelay.getBusDirectory();
    const eventsDir = this.driveBusRelay.getEventsDirectory();
    const deviceId = this.driveBusRelay.getDeviceId();
    const isWatching = this.driveBusRelay.isWatching();

    return this.driveBusReader.getStatus(busDir, eventsDir, deviceId, isWatching);
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
    const eventsDir = this.driveBusRelay.getEventsDirectory();
    const filter: DriveBusEventsFilter = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
      deviceId: deviceId || undefined,
      action: action || undefined,
      search: search || undefined,
    };

    return this.driveBusReader.getEvents(eventsDir, filter);
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
