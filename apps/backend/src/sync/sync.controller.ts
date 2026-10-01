import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SessionService } from './session.service';
import { SyncOrchestratorService } from './sync-orchestrator.service';
import { GDriveStorageService } from './gdrive-storage.service';
import {
  StartSessionInput,
  CommitSessionInput,
  RecordChangeInput,
} from '@lenta/shared';

@ApiTags('Sync & Sessions')
@Controller('sync')
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly sessionService: SessionService,
    private readonly orchestrator: SyncOrchestratorService,
    private readonly gdriveStorage: GDriveStorageService,
  ) {}

  // ==========================================
  // Workstation Status & Cloud Sync
  // ==========================================

  @Get('status')
  @ApiOperation({ summary: 'Get current workstation sync status, active session, and cloud state' })
  @ApiQuery({ name: 'deviceId', required: false })
  getStatus(@Query('deviceId') deviceId?: string) {
    return this.orchestrator.getStatus(deviceId);
  }

  @Post('push')
  @ApiOperation({ summary: 'Push unpushed local commits to Google Drive storage' })
  @ApiQuery({ name: 'deviceId', required: false })
  push(@Query('deviceId') deviceId?: string) {
    return this.orchestrator.push(deviceId);
  }

  @Post('pull')
  @ApiOperation({ summary: 'Pull remote commits from Google Drive storage and merge into local database' })
  @ApiQuery({ name: 'deviceId', required: false })
  pull(@Query('deviceId') deviceId?: string) {
    return this.orchestrator.pull(deviceId);
  }

  // ==========================================
  // Workstation Live Sessions
  // ==========================================

  @Get('session/active')
  @ApiOperation({ summary: 'Get current active session for this workstation' })
  @ApiQuery({ name: 'deviceId', required: false })
  getActiveSession(@Query('deviceId') deviceId?: string) {
    return this.sessionService.getActiveSession(deviceId);
  }

  @Post('session/start')
  @ApiOperation({ summary: 'Start a new active workstation session' })
  startSession(@Body() body: StartSessionInput) {
    return this.sessionService.startSession(body);
  }

  @Post('session/change')
  @ApiOperation({ summary: 'Record a pending change in the active session' })
  @ApiQuery({ name: 'deviceId', required: false })
  recordChange(
    @Body() body: RecordChangeInput,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.sessionService.recordChange(body, deviceId);
  }

  @Get('session/changes')
  @ApiOperation({ summary: 'Get pending changes for the active session' })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'deviceId', required: false })
  getPendingChanges(
    @Query('sessionId') sessionId?: string,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.sessionService.getPendingChanges(sessionId, deviceId);
  }

  @Post('session/:id/commit')
  @ApiOperation({ summary: 'Seal and commit the session into an immutable SyncCommit' })
  async commitSession(
    @Param('id') sessionId: string,
    @Body() body: CommitSessionInput,
    @Query('deviceId') deviceId?: string,
  ) {
    const result = await this.sessionService.commitSession(sessionId, body);
    if (body.autoPush !== false) {
      await this.orchestrator.push(deviceId);
    }
    return result;
  }

  @Post('session/:id/cancel')
  @ApiOperation({ summary: 'Cancel an active session and discard pending changes' })
  cancelSession(@Param('id') sessionId: string) {
    return this.sessionService.cancelSession(sessionId);
  }

  // ==========================================
  // Google Drive Authentication
  // ==========================================

  @Get('gdrive/auth-url')
  @ApiOperation({ summary: 'Get Google OAuth2 consent URL for Google Drive sync' })
  getGDriveAuthUrl() {
    return { url: this.gdriveStorage.getOAuthConsentUrl() };
  }

  @Post('gdrive/callback')
  @ApiOperation({ summary: 'Exchange OAuth2 authorization code for tokens' })
  handleGDriveCallback(@Body('code') code: string) {
    return this.gdriveStorage.handleOAuthCallback(code);
  }

  @Get('gdrive/status')
  @ApiOperation({ summary: 'Check Google Drive auth status and storage folder' })
  getGDriveStatus() {
    return {
      auth: this.gdriveStorage.getAuthStatus(),
      storagePath: this.gdriveStorage.getSyncFolderPath(),
    };
  }

  // ==========================================
  // Legacy / Obsidian Delta Sync Compatibility
  // ==========================================

  @Get('changes')
  @ApiOperation({ summary: 'Delta sync pull endpoint for Obsidian and legacy clients' })
  @ApiQuery({ name: 'since', required: false, type: String })
  @ApiQuery({ name: 'containerId', required: false, type: String })
  getChanges(
    @Query('since') since?: string,
    @Query('containerId') containerId?: string,
  ) {
    return this.syncService.getChangesSince(since, containerId);
  }
}
