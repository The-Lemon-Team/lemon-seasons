import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { StorageService } from '../../storage/storage.service';

export interface AiMediaAsset {
  id: string;
  url: string;
  thumbnailUrl: string;
  filename: string;
  prompt: string;
  userPrompt?: string;
  style?: string;
  aspectRatio: string;
  model: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  mimeType: string;
  tags: string[];
  sourceNoteId?: string;
  isFavorite: boolean;
  usageCount: number;
  createdAt: string;
}

export interface GetAssetsQuery {
  search?: string;
  style?: string;
  isFavorite?: boolean;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AiMediaLibraryService implements OnModuleInit {
  private readonly logger = new Logger(AiMediaLibraryService.name);
  private readonly indexPath = path.join(process.cwd(), 'uploads', 'ai-assets-index.json');
  private assets: AiMediaAsset[] = [];
  private isLoaded = false;

  constructor(private readonly storageService: StorageService) {}

  async onModuleInit() {
    await this.loadIndex();
  }

  private async loadIndex() {
    try {
      const data = await fs.readFile(this.indexPath, 'utf-8');
      this.assets = JSON.parse(data);
      this.logger.log(`📚 AI Media Library loaded with ${this.assets.length} stored assets.`);
    } catch {
      this.assets = [];
      await this.saveIndex();
      this.logger.log('📁 Created new empty AI Media Library index file.');
    } finally {
      this.isLoaded = true;
    }
  }

  private async saveIndex() {
    try {
      const uploadsDir = path.dirname(this.indexPath);
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(this.indexPath, JSON.stringify(this.assets, null, 2), 'utf-8');
    } catch (err: any) {
      this.logger.error(`Failed to save AI Media Library index: ${err.message}`);
    }
  }

  async saveAsset(
    data: Omit<AiMediaAsset, 'id' | 'createdAt' | 'usageCount' | 'isFavorite'> & {
      isFavorite?: boolean;
    },
  ): Promise<AiMediaAsset> {
    if (!this.isLoaded) await this.loadIndex();

    const asset: AiMediaAsset = {
      id: randomUUID(),
      url: data.url,
      thumbnailUrl: data.thumbnailUrl,
      filename: data.filename,
      prompt: data.prompt,
      userPrompt: data.userPrompt,
      style: data.style,
      aspectRatio: data.aspectRatio,
      model: data.model,
      width: data.width,
      height: data.height,
      sizeBytes: data.sizeBytes,
      mimeType: data.mimeType,
      tags: data.tags || [],
      sourceNoteId: data.sourceNoteId,
      isFavorite: Boolean(data.isFavorite),
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };

    // Prepend to top of list
    this.assets.unshift(asset);
    await this.saveIndex();
    return asset;
  }

  async getAssets(query?: GetAssetsQuery): Promise<{ items: AiMediaAsset[]; total: number }> {
    if (!this.isLoaded) await this.loadIndex();

    let filtered = [...this.assets];

    if (query?.isFavorite !== undefined) {
      filtered = filtered.filter((a) => a.isFavorite === query.isFavorite);
    }

    if (query?.style) {
      filtered = filtered.filter((a) => a.style?.toLowerCase() === query.style?.toLowerCase());
    }

    if (query?.search && query.search.trim()) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.prompt.toLowerCase().includes(s) ||
          (a.userPrompt && a.userPrompt.toLowerCase().includes(s)) ||
          a.tags.some((t) => t.toLowerCase().includes(s)),
      );
    }

    const total = filtered.length;
    const offset = Number(query?.offset) || 0;
    const limit = Number(query?.limit) || 40;
    const items = filtered.slice(offset, offset + limit);

    return { items, total };
  }

  async getAssetById(id: string): Promise<AiMediaAsset | null> {
    if (!this.isLoaded) await this.loadIndex();
    return this.assets.find((a) => a.id === id) || null;
  }

  async toggleFavorite(id: string): Promise<AiMediaAsset> {
    if (!this.isLoaded) await this.loadIndex();
    const asset = this.assets.find((a) => a.id === id);
    if (!asset) {
      throw new NotFoundException(`Asset '${id}' not found`);
    }
    asset.isFavorite = !asset.isFavorite;
    await this.saveIndex();
    return asset;
  }

  async recordUsage(url: string): Promise<void> {
    if (!this.isLoaded) await this.loadIndex();
    const asset = this.assets.find((a) => a.url === url);
    if (asset) {
      asset.usageCount = (asset.usageCount || 0) + 1;
      await this.saveIndex();
    }
  }

  async deleteAsset(id: string): Promise<boolean> {
    if (!this.isLoaded) await this.loadIndex();
    const index = this.assets.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new NotFoundException(`Asset '${id}' not found`);
    }

    const asset = this.assets[index];
    this.assets.splice(index, 1);
    await this.saveIndex();

    try {
      await this.storageService.deleteFile(asset.url, asset.thumbnailUrl);
    } catch (err: any) {
      this.logger.warn(`Failed to remove file from disk during asset delete: ${err.message}`);
    }

    return true;
  }
}
