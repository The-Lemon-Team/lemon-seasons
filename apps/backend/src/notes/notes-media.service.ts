import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, ProcessedImageResult } from '../storage/storage.service';
import { UpdateNoteImageDto, ImageOrderItemDto } from './dto/image.dto';
import { NotePublishedEvent } from '../events';

@Injectable()
export class NotesMediaService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    @Optional() private eventEmitter?: EventEmitter2,
  ) {}

  /**
   * Upload multiple images for a note
   */
  async uploadImages(noteId: string, files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const existingImages = await this.prisma.noteImage.findMany({
      where: { noteId },
      orderBy: { order: 'desc' },
    });

    const hasMain = existingImages.some((img) => img.isMain);
    let nextOrder = existingImages.length > 0 ? existingImages[0].order + 1 : 0;

    const createdImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const processed = await this.storageService.processAndSaveNoteImage(file);
      const isMain = !hasMain && i === 0;

      const noteImage = await this.prisma.noteImage.create({
        data: {
          noteId,
          url: processed.url,
          thumbnailUrl: processed.thumbnailUrl,
          filename: processed.filename,
          mimeType: processed.mimeType,
          sizeBytes: processed.sizeBytes,
          width: processed.width,
          height: processed.height,
          isMain,
          order: nextOrder++,
        },
      });

      createdImages.push(noteImage);
    }

    return this.prisma.noteImage.findMany({
      where: { noteId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Set specific image as the main/cover photo for a note
   */
  async setMainImage(noteId: string, imageId: string) {
    const targetImage = await this.prisma.noteImage.findFirst({
      where: { id: imageId, noteId },
    });

    if (!targetImage) {
      throw new NotFoundException(`Image '${imageId}' not found for note '${noteId}'`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.noteImage.updateMany({
        where: { noteId },
        data: { isMain: false },
      });

      return tx.noteImage.update({
        where: { id: imageId },
        data: { isMain: true },
      });
    });
  }

  /**
   * Reorder images for a note
   */
  async reorderImages(noteId: string, items: ImageOrderItemDto[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.noteImage.updateMany({
          where: { id: item.id, noteId },
          data: { order: item.order },
        }),
      ),
    );

    return this.prisma.noteImage.findMany({
      where: { noteId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Update image caption, alt, or metadata
   */
  async updateImage(noteId: string, imageId: string, dto: UpdateNoteImageDto) {
    const image = await this.prisma.noteImage.findFirst({
      where: { id: imageId, noteId },
    });

    if (!image) {
      throw new NotFoundException(`Image '${imageId}' not found for note '${noteId}'`);
    }

    if (dto.isMain) {
      return this.setMainImage(noteId, imageId);
    }

    return this.prisma.noteImage.update({
      where: { id: imageId },
      data: {
        ...(dto.caption !== undefined ? { caption: dto.caption } : {}),
        ...(dto.alt !== undefined ? { alt: dto.alt } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
      },
    });
  }

  /**
   * Delete an image from database and disk. If it was main, promote the next image.
   */
  async deleteImage(noteId: string, imageId: string) {
    const image = await this.prisma.noteImage.findFirst({
      where: { id: imageId, noteId },
    });

    if (!image) {
      throw new NotFoundException(`Image '${imageId}' not found for note '${noteId}'`);
    }

    await this.prisma.noteImage.delete({
      where: { id: imageId },
    });

    await this.storageService.deleteFile(image.url, image.thumbnailUrl);

    let newMainId: string | undefined = undefined;

    if (image.isMain) {
      const remainingImage = await this.prisma.noteImage.findFirst({
        where: { noteId },
        orderBy: { order: 'asc' },
      });

      if (remainingImage) {
        const updated = await this.prisma.noteImage.update({
          where: { id: remainingImage.id },
          data: { isMain: true },
        });
        newMainId = updated.id;
      }
    }

    return {
      success: true,
      newMainId,
    };
  }

  /**
   * Standalone media upload for Markdown inline insertion
   */
  async uploadStandaloneMedia(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.storageService.processAndSaveMedia(file);
  }

  /**
   * Attach a generated/processed image to a note (e.g. from Gemini Imagen)
   */
  async attachGeneratedImage(
    noteId: string,
    processed: ProcessedImageResult,
    isMain = true,
    caption?: string,
    alt?: string,
  ) {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException(`Note '${noteId}' not found`);
    }

    const existingImages = await this.prisma.noteImage.findMany({
      where: { noteId },
      orderBy: { order: 'desc' },
    });

    const hasMain = existingImages.some((img) => img.isMain);
    const shouldBeMain = isMain || !hasMain;
    const nextOrder = existingImages.length > 0 ? existingImages[0].order + 1 : 0;

    if (shouldBeMain && hasMain) {
      await this.prisma.noteImage.updateMany({
        where: { noteId },
        data: { isMain: false },
      });
    }

    const noteImage = await this.prisma.noteImage.create({
      data: {
        noteId,
        url: processed.url,
        thumbnailUrl: processed.thumbnailUrl,
        filename: processed.filename,
        mimeType: processed.mimeType,
        sizeBytes: processed.sizeBytes,
        width: processed.width,
        height: processed.height,
        isMain: shouldBeMain,
        caption,
        alt: alt || caption,
        order: nextOrder,
      },
    });

    // Touch parent Note updatedAt timestamp so live subscribers, sync orchestrator, and bus detect the update
    const updatedNote = await this.prisma.note.update({
      where: { id: noteId },
      data: { updatedAt: new Date() },
      include: {
        folders: {
          include: { folder: true },
        },
      },
    });

    if (this.eventEmitter && updatedNote) {
      const primaryFolder = updatedNote.folders[0]?.folder;
      this.eventEmitter.emit(
        'note.published',
        new NotePublishedEvent(
          updatedNote.id,
          updatedNote.title,
          primaryFolder?.path || '',
          updatedNote.status,
          updatedNote.publishAt,
          updatedNote.feedId,
          false,
          {
            ...updatedNote,
            images: [processed.url],
          },
        ),
      );
    }

    return noteImage;
  }
}

