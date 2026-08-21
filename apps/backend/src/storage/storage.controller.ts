import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import { StorageService, ProcessedImageResult } from './storage.service';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload an image or media asset' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProcessedImageResult> {
    if (!file) {
      throw new BadRequestException('A file binary must be provided');
    }
    return this.storageService.processAndSaveMedia(file);
  }

  @Post()
  @ApiOperation({ summary: 'Upload an image or media asset (root alias)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFileRoot(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProcessedImageResult> {
    if (!file) {
      throw new BadRequestException('A file binary must be provided');
    }
    return this.storageService.processAndSaveMedia(file);
  }
}
