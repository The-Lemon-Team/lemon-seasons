import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { QuickShareNoteDto } from './dto/quick-share-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';
import {
  UpdateNoteImageDto,
  ReorderNoteImagesDto,
  AttachImagesFromUrlsDto,
  FetchExternalMediaDto,
  AttachMediaAssetsDto,
} from './dto/image.dto';
import { AddNoteLinksDto, UpdateNoteLinkDto, ReorderNoteLinksDto } from './dto/link.dto';
import { ParseNotesDto, BatchCreateNotesDto } from './dto/parse-notes.dto';
import { ParseLinkDto } from './dto/parse-link.dto';
import { IngestNoteDto } from './dto/ingest-note.dto';
import { NotesIngestService } from './notes-ingest.service';
import { LinkMetadataService } from './services/link-metadata.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/auth.types';
import { AuthenticatedWriteGuard } from '../auth/admin-write.guard';

@ApiTags('Notes')
@Controller(['notes', 'api/v1/notes'])
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
    private readonly notesIngestService: NotesIngestService,
    private readonly linkMetadataService: LinkMetadataService,
  ) {}

  @Post('ingest')
  @ApiOperation({ summary: 'Express Ingestion API: save notes and insights from external Defi chat, web clipper, and bots' })
  @ApiResponse({ status: 201, description: 'Note ingested successfully' })
  ingest(
    @Body() ingestDto: IngestNoteDto,
    @Headers('x-api-key') apiKeyHeader?: string,
    @Headers('x-user-key') userKeyHeader?: string,
    @Headers('x-account-id') accountIdHeader?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const token =
      apiKeyHeader ||
      userKeyHeader ||
      (authHeader ? authHeader.replace(/^Bearer\s+/i, '') : undefined);
    return this.notesIngestService.ingest(ingestDto, token, accountIdHeader);
  }

  @Post('ai/parse')
  @ApiOperation({ summary: 'Parse natural language text into calendar cards (supports Trend, Event, Period, Done)' })
  @ApiResponse({ status: 200, description: 'Cards parsed successfully' })
  parseAiNotes(@Body() parseNotesDto: ParseNotesDto) {
    return this.notesService.parseAiNotes(parseNotesDto);
  }

  @Post('parse-link')
  @UseGuards(AuthenticatedWriteGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parse metadata (title, short description, thumbnail preview) from YouTube or webpage URL' })
  @ApiResponse({ status: 200, description: 'Link metadata extracted successfully' })
  parseLinkMetadata(@Body() dto: ParseLinkDto) {
    return this.linkMetadataService.parseLink(dto.url);
  }

  @Post('batch')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Batch create multiple calendar notes at once' })
  @ApiResponse({ status: 201, description: 'Notes created successfully' })
  createBatch(@Body() batchDto: BatchCreateNotesDto) {
    return this.notesService.createBatch(batchDto);
  }

  @Post()
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Create a new note' })
  @ApiResponse({ status: 201, description: 'Note created successfully' })
  create(@Body() createNoteDto: CreateNoteDto, @CurrentUser() user?: RequestUser) {
    return this.notesService.create(createNoteDto, user);
  }

  @Post('quick-share')
  @ApiOperation({ summary: 'Save link from mobile Android share intent into designated folder (e.g. Mobile/Shared)' })
  @ApiResponse({ status: 201, description: 'Link note created successfully in folder' })
  quickShare(
    @Body() quickShareNoteDto: QuickShareNoteDto,
    @Headers('x-user-key') headerKey?: string,
  ) {
    if (headerKey && !quickShareNoteDto.userKey) {
      quickShareNoteDto.userKey = headerKey;
    }
    return this.notesService.quickShare(quickShareNoteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Query notes with filters (range, type, feed, taxonomy, search)' })
  findAll(
    @Query() query: QueryNotesDto,
    @CurrentUser() user?: RequestUser,
    @Headers('x-app-mode') appModeHeader?: string,
  ) {
    if (!query.appMode && appModeHeader) {
      query.appMode = appModeHeader;
    }
    return this.notesService.findAll(query, user?.isAdmin ?? false, user);
  }

  @Get('media/search-images')
  @ApiOperation({ summary: 'Search web images via Serper.dev (Google Images)' })
  searchImages(
    @Query('q') q: string,
    @Query('gl') gl?: string,
    @Query('hl') hl?: string,
    @Query('num') num?: number,
  ) {
    if (!q || !q.trim()) {
      return [];
    }
    return this.notesService.searchWebImages(q, {
      gl,
      hl,
      num: num ? Number(num) : 20,
    });
  }

  @Get('media/youtube-thumb/:videoId')
  @ApiOperation({ summary: 'Proxy YouTube video thumbnail preview via backend' })
  async getYouTubeThumbnail(@Param('videoId') videoId: string, @Res() res: Response) {
    const { buffer, contentType } = await this.linkMetadataService.getYouTubeThumbnail(videoId);
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific note by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user?: RequestUser) {
    return this.notesService.findOne(id, user?.isAdmin ?? false, user);
  }

  @Get(':id/shares')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'List explicit shares (users / timeline groups) for a private note' })
  listShares(@Param('id') id: string, @CurrentUser() user?: RequestUser) {
    return this.notesService.listNoteShares(id, user);
  }

  @Post(':id/shares')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Grant explicit read access to a private note and its media for users or a timeline group' })
  shareNote(
    @Param('id') id: string,
    @Body()
    dto: {
      granteeUserIds: string[];
      scopeType?: 'USER' | 'TIMELINE_GROUP';
      scopeRef?: string;
      canReadMedia?: boolean;
      expiresAt?: string;
    },
    @CurrentUser() user?: RequestUser,
  ) {
    return this.notesService.shareNoteWithGrantees(id, dto, user);
  }

  @Delete(':id/shares')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Revoke explicit note share by granteeUserId or timeline scopeRef' })
  revokeShare(
    @Param('id') id: string,
    @Query('granteeUserId') granteeUserId?: string,
    @Query('scopeRef') scopeRef?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.notesService.revokeNoteShare(id, { granteeUserId, scopeRef }, user);
  }

  @Get(':id/images/:imageId/file')
  @ApiOperation({ summary: 'Serve note image binary with ownership, NoteShare, or HMAC signature verification' })
  async serveNoteImageFile(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Query('variant') variant: string | undefined,
    @Query('uid') uid: string | undefined,
    @Query('exp') exp: string | undefined,
    @Query('sig') sig: string | undefined,
    @CurrentUser() user: RequestUser | undefined,
    @Res() res: Response,
  ) {
    const resolved = await this.notesService.resolveAuthorizedNoteImageFile(
      id,
      imageId,
      { variant, uid, exp, sig },
      user,
    );
    res.setHeader('Content-Type', resolved.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.sendFile(resolved.filePath);
  }

  @Patch(':id')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Update a note' })
  update(@Param('id') id: string, @Body() updateNoteDto: UpdateNoteDto) {
    return this.notesService.update(id, updateNoteDto);
  }

  @Delete(':id')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Soft delete a note' })
  remove(@Param('id') id: string) {
    return this.notesService.softDelete(id);
  }

  @Post(':id/restore')
  @UseGuards(AuthenticatedWriteGuard)
  @ApiOperation({ summary: 'Restore a soft-deleted note' })
  restore(@Param('id') id: string) {
    return this.notesService.restore(id);
  }

  // ==========================================
  // Image Endpoints
  // ==========================================

  @Post(':id/images')
  @ApiOperation({ summary: 'Upload one or multiple images for a note' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 20))
  uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file must be provided');
    }
    return this.notesService.uploadImages(id, files);
  }

  @Post(':id/images/from-urls')
  @ApiOperation({ summary: 'Attach multiple external images from URLs to a note' })
  attachImagesFromUrls(
    @Param('id') id: string,
    @Body() dto: AttachImagesFromUrlsDto,
  ) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one image item must be provided');
    }
    return this.notesService.attachImagesFromUrls(id, dto.items);
  }

  @Post(':id/media-assets')
  @ApiOperation({ summary: 'Attach pre-hosted Media Hub assets or media descriptors to a note' })
  attachMediaAssets(
    @Param('id') id: string,
    @Body() dto: AttachMediaAssetsDto,
  ) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one media asset item must be provided');
    }
    return this.notesService.attachMediaAssets(id, dto.items);
  }

  @Patch(':id/images/:imageId/main')
  @ApiOperation({ summary: 'Set an image as the main cover photo for a note' })
  setMainImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.notesService.setMainImage(id, imageId);
  }

  @Put(':id/images/reorder')
  @ApiOperation({ summary: 'Reorder images for a note' })
  reorderImages(
    @Param('id') id: string,
    @Body() dto: ReorderNoteImagesDto,
  ) {
    return this.notesService.reorderImages(id, dto.items);
  }

  @Patch(':id/images/:imageId')
  @ApiOperation({ summary: 'Update image caption or alt text' })
  updateImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body() dto: UpdateNoteImageDto,
  ) {
    return this.notesService.updateImage(id, imageId, dto);
  }

  @Delete(':id/images/:imageId')
  @ApiOperation({ summary: 'Delete an image from a note' })
  deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.notesService.deleteImage(id, imageId);
  }

  // ==========================================
  // Link Endpoints
  // ==========================================

  @Post(':id/links')
  @ApiOperation({ summary: 'Add one or multiple links to a note' })
  addLinks(
    @Param('id') id: string,
    @Body() dto: AddNoteLinksDto,
  ) {
    if (!dto.links || dto.links.length === 0) {
      throw new BadRequestException('At least one link must be provided');
    }
    return this.notesService.addLinks(id, dto.links);
  }

  @Patch(':id/links/:linkId/source')
  @ApiOperation({ summary: 'Set a link as the primary source for a note' })
  setSourceLink(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
  ) {
    return this.notesService.setSourceLink(id, linkId);
  }

  @Put(':id/links/reorder')
  @ApiOperation({ summary: 'Reorder links for a note' })
  reorderLinks(
    @Param('id') id: string,
    @Body() dto: ReorderNoteLinksDto,
  ) {
    return this.notesService.reorderLinks(id, dto.items);
  }

  @Patch(':id/links/:linkId')
  @ApiOperation({ summary: 'Update a note link (title, URL, order, isSource)' })
  updateLink(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Body() dto: UpdateNoteLinkDto,
  ) {
    return this.notesService.updateLink(id, linkId, dto);
  }

  @Delete(':id/links/:linkId')
  @ApiOperation({ summary: 'Delete a link from a note' })
  deleteLink(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
  ) {
    return this.notesService.deleteLink(id, linkId);
  }

  @Post('upload-media')
  @ApiOperation({ summary: 'Upload standalone media file for Markdown insertion' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadMedia(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('A file must be provided');
    }
    return this.notesService.uploadStandaloneMedia(file);
  }

  @Post('media/fetch-external')
  @ApiOperation({ summary: 'Download external image to server storage for preview/draft attachment' })
  fetchExternalMedia(@Body() dto: FetchExternalMediaDto) {
    if (!dto.url) {
      throw new BadRequestException('Image URL must be provided');
    }
    return this.notesService.downloadExternalMedia(dto.url, dto.title);
  }
}
