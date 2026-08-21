import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

export interface ProcessedImageResult {
  url: string;
  thumbnailUrl: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadsRoot = path.join(process.cwd(), 'uploads');
  private readonly notesDir = path.join(this.uploadsRoot, 'notes');
  private readonly notesThumbsDir = path.join(this.notesDir, 'thumbs');
  private readonly mediaDir = path.join(this.uploadsRoot, 'media');

  async onModuleInit() {
    await this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.notesThumbsDir, { recursive: true });
      await fs.mkdir(this.mediaDir, { recursive: true });
      this.logger.log(`📁 Upload storage directories initialized at: ${this.uploadsRoot}`);
    } catch (err) {
      this.logger.error('Failed to create upload directories', err);
    }
  }

  /**
   * Process and save note image with WebP optimization and thumbnail generation
   */
  async processAndSaveNoteImage(file: Express.Multer.File): Promise<ProcessedImageResult> {
    await this.ensureDirectories();
    const fileId = `${Date.now()}-${randomUUID()}`;
    const filename = `${fileId}.webp`;

    const sharpInstance = sharp(file.buffer).rotate();
    const metadata = await sharpInstance.metadata();

    // 1. Process and save optimized main image
    const optimizedBuffer = await sharpInstance
      .webp({ quality: 85, effort: 4 })
      .toBuffer();

    const mainFilePath = path.join(this.notesDir, filename);
    await fs.writeFile(mainFilePath, optimizedBuffer);

    // 2. Generate and save 400px thumbnail
    const thumbBuffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const thumbFilePath = path.join(this.notesThumbsDir, filename);
    await fs.writeFile(thumbFilePath, thumbBuffer);

    return {
      url: `/uploads/notes/${filename}`,
      thumbnailUrl: `/uploads/notes/thumbs/${filename}`,
      filename: file.originalname || filename,
      mimeType: 'image/webp',
      sizeBytes: optimizedBuffer.length,
      width: metadata.width || null,
      height: metadata.height || null,
    };
  }

  /**
   * Process and save standalone media file (e.g. for Markdown insertion)
   */
  async processAndSaveMedia(file: Express.Multer.File): Promise<ProcessedImageResult> {
    await this.ensureDirectories();
    const fileId = `${Date.now()}-${randomUUID()}`;
    const isImage = file.mimetype.startsWith('image/');

    if (isImage) {
      const filename = `${fileId}.webp`;
      const sharpInstance = sharp(file.buffer).rotate();
      const metadata = await sharpInstance.metadata();

      const optimizedBuffer = await sharpInstance
        .webp({ quality: 85 })
        .toBuffer();

      const filePath = path.join(this.mediaDir, filename);
      await fs.writeFile(filePath, optimizedBuffer);

      return {
        url: `/uploads/media/${filename}`,
        thumbnailUrl: `/uploads/media/${filename}`,
        filename: file.originalname || filename,
        mimeType: 'image/webp',
        sizeBytes: optimizedBuffer.length,
        width: metadata.width || null,
        height: metadata.height || null,
      };
    } else {
      // Generic fallback for non-images
      const ext = path.extname(file.originalname) || '';
      const filename = `${fileId}${ext}`;
      const filePath = path.join(this.mediaDir, filename);
      await fs.writeFile(filePath, file.buffer);

      return {
        url: `/uploads/media/${filename}`,
        thumbnailUrl: '',
        filename: file.originalname || filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        width: null,
        height: null,
      };
    }
  }

  /**
   * Delete image and its thumbnail from disk
   */
  async deleteFile(relativeUrl?: string | null, thumbnailUrl?: string | null): Promise<void> {
    if (relativeUrl && relativeUrl.startsWith('/uploads/')) {
      const cleanPath = relativeUrl.replace(/^\/uploads\//, '');
      const fullPath = path.join(this.uploadsRoot, cleanPath);
      try {
        await fs.unlink(fullPath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          this.logger.warn(`Could not delete file ${fullPath}: ${err.message}`);
        }
      }
    }

    if (thumbnailUrl && thumbnailUrl.startsWith('/uploads/') && thumbnailUrl !== relativeUrl) {
      const cleanThumbPath = thumbnailUrl.replace(/^\/uploads\//, '');
      const fullThumbPath = path.join(this.uploadsRoot, cleanThumbPath);
      try {
        await fs.unlink(fullThumbPath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          this.logger.warn(`Could not delete thumbnail ${fullThumbPath}: ${err.message}`);
        }
      }
    }
  }
}
