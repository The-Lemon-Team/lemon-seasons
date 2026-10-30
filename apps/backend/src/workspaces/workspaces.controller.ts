import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/workspace.dto';
import { CreateTrackDto, UpdateTrackDto } from './dto/track.dto';
import { CreatePinDto, UpdatePinDto, BatchLinkNotesDto } from './dto/pin.dto';

@ApiTags('Workspaces')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  // ==========================================
  // WORKSPACES
  // ==========================================

  @Get()
  @ApiOperation({ summary: 'Получить все рабочие пространства с треками и счетчиками' })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  findAll(@Query('includeDeleted') includeDeleted?: string) {
    return this.workspacesService.findAll(includeDeleted === 'true');
  }

  @Get('memberships')
  @ApiOperation({ summary: 'Получить карту привязок всех заметок к воркспейсам' })
  getAllMemberships() {
    return this.workspacesService.getAllMemberships();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить воркспейс по ID со всеми треками и пинами' })
  findOne(@Param('id') id: string) {
    return this.workspacesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать новое рабочее пространство' })
  create(@Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить воркспейс' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkspaceDto) {
    return this.workspacesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить воркспейс (soft delete)' })
  remove(@Param('id') id: string) {
    return this.workspacesService.remove(id);
  }

  // ==========================================
  // TRACKS
  // ==========================================

  @Post(':id/tracks')
  @ApiOperation({ summary: 'Создать трек внутри воркспейса' })
  createTrack(@Param('id') workspaceId: string, @Body() dto: CreateTrackDto) {
    return this.workspacesService.createTrack(workspaceId, dto);
  }

  @Patch(':id/tracks/:trackId')
  @ApiOperation({ summary: 'Обновить трек' })
  updateTrack(
    @Param('id') workspaceId: string,
    @Param('trackId') trackId: string,
    @Body() dto: UpdateTrackDto,
  ) {
    return this.workspacesService.updateTrack(workspaceId, trackId, dto);
  }

  @Delete(':id/tracks/:trackId')
  @ApiOperation({ summary: 'Удалить трек (пины перемещаются в общие)' })
  removeTrack(@Param('id') workspaceId: string, @Param('trackId') trackId: string) {
    return this.workspacesService.removeTrack(workspaceId, trackId);
  }

  // ==========================================
  // PINS
  // ==========================================

  @Get(':id/pins')
  @ApiOperation({ summary: 'Получить пины воркспейса с фильтрацией по треку и статусу' })
  @ApiQuery({ name: 'trackId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  getPins(
    @Param('id') workspaceId: string,
    @Query('trackId') trackId?: string,
    @Query('status') status?: string,
  ) {
    return this.workspacesService.getPins(workspaceId, trackId, status);
  }

  @Post(':id/pins')
  @ApiOperation({ summary: 'Запинить заметку в воркспейс (или обновить существующий пин)' })
  pinNote(@Param('id') workspaceId: string, @Body() dto: CreatePinDto) {
    return this.workspacesService.pinNote(workspaceId, dto);
  }

  @Patch(':id/pins/:pinId')
  @ApiOperation({ summary: 'Обновить пин (смена трека, статуса, комментария)' })
  updatePin(
    @Param('id') workspaceId: string,
    @Param('pinId') pinId: string,
    @Body() dto: UpdatePinDto,
  ) {
    return this.workspacesService.updatePin(workspaceId, pinId, dto);
  }

  @Delete(':id/pins/:pinId')
  @ApiOperation({ summary: 'Открепить заметку от воркспейса (по pinId или noteId)' })
  unpinNote(@Param('id') workspaceId: string, @Param('pinId') pinId: string) {
    return this.workspacesService.unpinNote(workspaceId, pinId);
  }

  // ==========================================
  // BATCH LINKING (SYNTHESIS)
  // ==========================================

  @Post('batch-link')
  @ApiOperation({ summary: 'Связать дочерние заметки с родительской (Period или Note)' })
  batchLink(@Body() dto: BatchLinkNotesDto) {
    return this.workspacesService.batchLinkNotes(dto);
  }
}
