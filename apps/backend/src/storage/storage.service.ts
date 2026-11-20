import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import { randomUUID } from 'crypto';
import * as sharpPkg from 'sharp';

const sharp: any = (sharpPkg as any).default || sharpPkg;

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
    return this.processAndSaveBuffer(file.buffer, file.originalname);
  }

  /**
   * Process and save note image from buffer with WebP optimization and thumbnail generation
   */
  async processAndSaveBuffer(
    buffer: Buffer,
    originalFilename?: string,
  ): Promise<ProcessedImageResult> {
    await this.ensureDirectories();
    const fileId = `${Date.now()}-${randomUUID()}`;
    const filename = `${fileId}.webp`;

    const sharpInstance = sharp(buffer).rotate();
    const metadata = await sharpInstance.metadata();

    // 1. Process and save optimized main image
    const optimizedBuffer = await sharpInstance
      .webp({ quality: 85, effort: 4 })
      .toBuffer();

    const mainFilePath = path.join(this.notesDir, filename);
    await fs.writeFile(mainFilePath, optimizedBuffer);

    // 2. Generate and save 400px thumbnail
    const thumbBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const thumbFilePath = path.join(this.notesThumbsDir, filename);
    await fs.writeFile(thumbFilePath, thumbBuffer);

    return {
      url: `/uploads/notes/${filename}`,
      thumbnailUrl: `/uploads/notes/thumbs/${filename}`,
      filename: originalFilename || filename,
      mimeType: 'image/webp',
      sizeBytes: optimizedBuffer.length,
      width: metadata.width || null,
      height: metadata.height || null,
    };
  }

  /**
   * Download image from a web URL and process into WebP + thumbnail
   */
  async downloadAndSaveImageFromUrl(
    imageUrl: string,
    fallbackName?: string,
  ): Promise<ProcessedImageResult> {
    const buffer = await this.fetchImageBuffer(imageUrl);

    let filename = fallbackName;
    if (!filename) {
      try {
        const parsedPath = new URL(imageUrl).pathname;
        filename = path.basename(parsedPath) || 'downloaded-poster.webp';
      } catch {
        filename = 'downloaded-poster.webp';
      }
    }

    return this.processAndSaveBuffer(buffer, filename);
  }

  private async fetchImageBuffer(imageUrl: string): Promise<Buffer> {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    };

    const rawProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const proxyUrl = rawProxy?.replace(/^["']|["']$/g, '').trim();

    if (proxyUrl) {
      try {
        return await this.fetchBufferWithProxy(imageUrl, proxyUrl, headers, 12000, 3);
      } catch (err: any) {
        this.logger.debug(`Proxied image fetch failed for ${imageUrl}, trying direct: ${err?.message}`);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(imageUrl, { signal: controller.signal, headers });
      if (!res.ok) {
        throw new Error(`Failed to fetch image: HTTP ${res.status} ${res.statusText}`);
      }
      return Buffer.from(await res.arrayBuffer());
    } finally {
      clearTimeout(timeout);
    }
  }

  private fetchBufferWithProxy(
    urlStr: string,
    proxyUrl: string,
    headers: Record<string, string>,
    timeoutMs: number,
    redirectsLeft: number,
  ): Promise<Buffer> {
    const { HttpsProxyAgent } = require('https-proxy-agent');
    const agent = new HttpsProxyAgent(proxyUrl);

    return new Promise((resolve, reject) => {
      const parsed = new URL(urlStr);
      const lib = parsed.protocol === 'http:' ? http : https;
      const req = lib.request(
        parsed,
        {
          method: 'GET',
          headers,
          agent: parsed.protocol === 'https:' ? agent : undefined,
          timeout: timeoutMs,
        },
        (res) => {
          const status = res.statusCode || 0;
          if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
            res.resume();
            const nextUrl = new URL(res.headers.location, parsed).toString();
            this.fetchBufferWithProxy(nextUrl, proxyUrl, headers, timeoutMs, redirectsLeft - 1)
              .then(resolve)
              .catch(reject);
            return;
          }
          if (status < 200 || status >= 300) {
            res.resume();
            reject(new Error(`Failed to fetch image via proxy: HTTP ${status}`));
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        },
      );
      req.on('timeout', () => req.destroy(new Error(`Image download timed out after ${timeoutMs}ms`)));
      req.on('error', reject);
      req.end();
    });
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
   * Save a generated image buffer directly (e.g. from Gemini Imagen or SVG fallback)
   */
  async saveGeneratedBuffer(
    buffer: Buffer,
    originalName = 'generated-image.webp',
    isSvg = false,
  ): Promise<ProcessedImageResult> {
    await this.ensureDirectories();
    const fileId = `${Date.now()}-${randomUUID()}`;

    if (isSvg || originalName.endsWith('.svg')) {
      const filename = `${fileId}.svg`;
      const filePath = path.join(this.mediaDir, filename);
      await fs.writeFile(filePath, buffer);

      return {
        url: `/uploads/media/${filename}`,
        thumbnailUrl: `/uploads/media/${filename}`,
        filename: originalName,
        mimeType: 'image/svg+xml',
        sizeBytes: buffer.length,
        width: 1280,
        height: 720,
      };
    }

    try {
      const filename = `${fileId}.webp`;
      const sharpInstance = sharp(buffer).rotate();
      const metadata = await sharpInstance.metadata();

      const optimizedBuffer = await sharpInstance
        .webp({ quality: 90 })
        .toBuffer();

      const filePath = path.join(this.mediaDir, filename);
      await fs.writeFile(filePath, optimizedBuffer);

      return {
        url: `/uploads/media/${filename}`,
        thumbnailUrl: `/uploads/media/${filename}`,
        filename: originalName,
        mimeType: 'image/webp',
        sizeBytes: optimizedBuffer.length,
        width: metadata.width || null,
        height: metadata.height || null,
      };
    } catch {
      const ext = path.extname(originalName) || '.webp';
      const filename = `${fileId}${ext}`;
      const filePath = path.join(this.mediaDir, filename);
      await fs.writeFile(filePath, buffer);

      return {
        url: `/uploads/media/${filename}`,
        thumbnailUrl: `/uploads/media/${filename}`,
        filename: originalName,
        mimeType: 'image/webp',
        sizeBytes: buffer.length,
        width: 1280,
        height: 720,
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
