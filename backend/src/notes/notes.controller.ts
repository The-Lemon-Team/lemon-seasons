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
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';
import { UpdateNoteImageDto, ReorderNoteImagesDto } from './dto/image.dto';

@ApiTags('Notes')
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new note' })
  @ApiResponse({ status: 201, description: 'Note created successfully' })
  create(@Body() createNoteDto: CreateNoteDto) {
    return this.notesService.create(createNoteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Query notes with filters (range, type, feed, taxonomy, search)' })
  findAll(@Query() query: QueryNotesDto) {
    return this.notesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific note by ID' })
  findOne(@Param('id') id: string) {
    return this.notesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a note' })
  update(@Param('id') id: string, @Body() updateNoteDto: UpdateNoteDto) {
    return this.notesService.update(id, updateNoteDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a note' })
  remove(@Param('id') id: string) {
    return this.notesService.softDelete(id);
  }

  @Post(':id/restore')
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
}
