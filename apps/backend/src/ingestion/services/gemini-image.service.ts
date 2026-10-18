import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService, ProcessedImageResult } from '../../storage/storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotesMediaService } from '../../notes/notes-media.service';
import { AiMediaLibraryService, AiMediaAsset } from './ai-media-library.service';
import { NoteImage } from '@prisma/client';

export type ImageAspectRatio = '16:9' | '1:1' | '9:16' | '4:3' | '3:4';

export interface GenerateImageOptions {
  prompt: string;
  style?: string;
  aspectRatio?: ImageAspectRatio;
  context?: string;
  originalName?: string;
  noteId?: string;
  count?: number; // 1 to 4
}

export interface GeneratedBatchResult {
  synthesizedPrompt: string;
  model: string;
  isFallback: boolean;
  candidates: AiMediaAsset[];
}

export interface GeneratedImageResult extends ProcessedImageResult {
  synthesizedPrompt: string;
  model: string;
  isFallback: boolean;
}

export interface GenerateNoteCoverOptions {
  style?: string;
  aspectRatio?: ImageAspectRatio;
  customPrompt?: string;
  setAsMain?: boolean;
}

@Injectable()
export class GeminiImageService {
  private readonly logger = new Logger(GeminiImageService.name);
  private readonly apiKey?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
    private readonly notesMediaService: NotesMediaService,
    private readonly aiMediaLibraryService: AiMediaLibraryService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (this.apiKey) {
      this.logger.log('🎨 Gemini Image (Imagen 3) service initialized with API key.');
    } else {
      this.logger.warn('⚠️ GEMINI_API_KEY not configured. Themed SVG fallback will be used for image generation.');
    }
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Transforms a natural language topic or note context into a vivid English prompt
   * and semantic tags optimized for Imagen 3.
   */
  async synthesizePrompt(
    subject: string,
    visualStyle = 'cinematic',
    context?: string,
  ): Promise<{ prompt: string; tags: string[] }> {
    if (!this.apiKey) {
      return {
        prompt: `${subject}, ${visualStyle} style, high quality artwork`,
        tags: [visualStyle, 'calendar'],
      };
    }

    const systemPrompt = `You are an expert art director and prompt engineer for Imagen 3 and digital calendar visuals.
Transform the given calendar event, topic or concept into a single evocative English image generation prompt.

Guidelines by style:
- 'photorealistic' / 'photo': 35mm photography, natural cinematic lighting, authentic textures, sharp focus, hyperdetailed depth of field.
- 'editorial' / 'magazine': Modern editorial photography, high-contrast framing, National Geographic / Vogue aesthetic.
- 'minimalist' / 'flat': Modern flat vector graphic, clean geometry, bold Swiss design layout, balanced negative space.
- 'cyberpunk' / 'scifi': Volumetric neon lighting, rain-slicked surfaces, retro-futuristic interfaces, atmospheric fog.
- 'vintage' / 'historical': Period-accurate archival aesthetic, sepia/matte tones, rich grain, classic oil painting texture.
- 'cinematic' (default): 8k resolution, dramatic anamorphic lighting, photorealistic cinematic film still, atmospheric haze.

Subject: "${subject}"
Requested Visual Style: "${visualStyle}"
${context ? `Event context: "${context.slice(0, 300)}"` : ''}

Output strictly valid JSON (no markdown formatting):
{
  "prompt": "Final prompt in English (max 70 words, no quotes)",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const flashModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    for (const model of flashModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.6,
              maxOutputTokens: 200,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const parsed = JSON.parse(raw);
            return {
              prompt: parsed.prompt?.trim() || `${subject}, ${visualStyle}`,
              tags: Array.isArray(parsed.tags) ? parsed.tags : [visualStyle],
            };
          }
        }
      } catch (err: any) {
        this.logger.debug(`Flash model ${model} prompt synthesis attempt failed: ${err.message}`);
      }
    }

    return {
      prompt: `${subject}, ${visualStyle} style, high definition atmospheric artwork`,
      tags: [visualStyle],
    };
  }

  /**
   * Calls Google Imagen 3 API with support for 1..4 candidate samples.
   */
  async callImagenApi(
    prompt: string,
    aspectRatio: ImageAspectRatio = '16:9',
    sampleCount = 1,
  ): Promise<Buffer[]> {
    if (!this.apiKey) {
      return [];
    }

    const validAspectRatios: ImageAspectRatio[] = ['16:9', '1:1', '9:16', '4:3', '3:4'];
    const chosenAspect = validAspectRatios.includes(aspectRatio) ? aspectRatio : '16:9';
    const count = Math.min(Math.max(sampleCount, 1), 4);
    const imagenModels = ['imagen-3.0-generate-002', 'imagen-3.0-fast-generate-001'];

    for (const model of imagenModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${this.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: count,
              aspectRatio: chosenAspect,
              outputMimeType: 'image/jpeg',
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const predictions = data?.predictions || [];
          const buffers = predictions
            .map((p: any) => (p?.bytesBase64Encoded ? Buffer.from(p.bytesBase64Encoded, 'base64') : null))
            .filter(Boolean) as Buffer[];

          if (buffers.length > 0) {
            return buffers;
          }
        } else {
          const errText = await response.text();
          this.logger.warn(`Imagen model ${model} HTTP ${response.status}: ${errText.slice(0, 160)}`);
        }
      } catch (err: any) {
        this.logger.warn(`Imagen model ${model} call failed: ${err.message}`);
      }
    }

    return [];
  }

  /**
   * Generates a sleek themed SVG card buffer when AI API is unavailable.
   */
  generateFallbackThemedSvg(title: string, subtitle?: string, accentColor = '#f59e0b', variantIdx = 0): Buffer {
    const cleanTitle = (title || 'Project Lenta').replace(/[<>&"]/g, '');
    const cleanSub = (subtitle || 'Chronological Event Archive').slice(0, 100).replace(/[<>&"]/g, '');
    const dateStr = new Date().toISOString().split('T')[0];

    const svg = `<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0f17" />
      <stop offset="55%" stop-color="#141a24" />
      <stop offset="100%" stop-color="#080c12" />
    </linearGradient>
    <radialGradient id="glow" cx="${variantIdx % 2 === 0 ? '82%' : '18%'}" cy="22%" r="55%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="100%" height="100%" fill="url(#bg)" />
  <rect width="100%" height="100%" fill="url(#glow)" />

  <line x1="80" y1="120" x2="1200" y2="120" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
  <line x1="80" y1="600" x2="1200" y2="600" stroke="rgba(255,255,255,0.06)" stroke-width="1" />

  <rect x="80" y="80" width="180" height="30" rx="6" fill="${accentColor}" fill-opacity="0.18" stroke="${accentColor}" stroke-width="1.2" />
  <text x="170" y="100" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" fill="${accentColor}" text-anchor="middle" letter-spacing="1">PROJECT LENTA • AI</text>

  <text x="80" y="270" font-family="system-ui, -apple-system, sans-serif" font-size="46" font-weight="800" fill="#ffffff">${cleanTitle}</text>
  <text x="80" y="340" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" fill="#9ca3af">${cleanSub}</text>

  <text x="80" y="580" font-family="monospace, monospace" font-size="13" fill="#6b7280" letter-spacing="1">CALENDAR ARCHIVE • ${dateStr} • VARIANT #${variantIdx + 1}</text>
</svg>`;

    return Buffer.from(svg, 'utf-8');
  }

  /**
   * Generates a batch of candidates (1..4) and registers all into the AI Media Library.
   */
  async generateBatch(options: GenerateImageOptions): Promise<GeneratedBatchResult> {
    const style = options.style || 'cinematic';
    const count = Math.min(Math.max(options.count || 2, 1), 4);
    const { prompt: synthesizedPrompt, tags } = await this.synthesizePrompt(
      options.prompt,
      style,
      options.context,
    );

    const buffers = await this.callImagenApi(synthesizedPrompt, options.aspectRatio || '16:9', count);
    const candidates: AiMediaAsset[] = [];
    const isFallback = buffers.length === 0;

    if (!isFallback) {
      for (let i = 0; i < buffers.length; i++) {
        const buf = buffers[i];
        const saved = await this.storageService.saveGeneratedBuffer(
          buf,
          `ai-${Date.now()}-${i}.webp`,
          false,
        );

        const asset = await this.aiMediaLibraryService.saveAsset({
          url: saved.url,
          thumbnailUrl: saved.thumbnailUrl,
          filename: saved.filename,
          prompt: synthesizedPrompt,
          userPrompt: options.prompt,
          style,
          aspectRatio: options.aspectRatio || '16:9',
          model: 'imagen-3.0',
          width: saved.width,
          height: saved.height,
          sizeBytes: saved.sizeBytes,
          mimeType: saved.mimeType,
          tags,
          sourceNoteId: options.noteId,
        });

        candidates.push(asset);
      }

      return {
        synthesizedPrompt,
        model: 'imagen-3.0',
        isFallback: false,
        candidates,
      };
    }

    // Fallback: Generate themed SVG variations
    const accentColors = ['#f59e0b', '#38bdf8', '#a855f7', '#10b981'];
    for (let i = 0; i < count; i++) {
      const color = accentColors[i % accentColors.length];
      const svgBuffer = this.generateFallbackThemedSvg(options.prompt, options.context || style, color, i);
      const saved = await this.storageService.saveGeneratedBuffer(
        svgBuffer,
        `fallback-${Date.now()}-${i}.svg`,
        true,
      );

      const asset = await this.aiMediaLibraryService.saveAsset({
        url: saved.url,
        thumbnailUrl: saved.thumbnailUrl,
        filename: saved.filename,
        prompt: synthesizedPrompt,
        userPrompt: options.prompt,
        style,
        aspectRatio: options.aspectRatio || '16:9',
        model: 'svg-fallback',
        width: saved.width,
        height: saved.height,
        sizeBytes: saved.sizeBytes,
        mimeType: saved.mimeType,
        tags: [...tags, 'fallback'],
        sourceNoteId: options.noteId,
      });

      candidates.push(asset);
    }

    return {
      synthesizedPrompt,
      model: 'svg-fallback',
      isFallback: true,
      candidates,
    };
  }

  /**
   * Generates a single image (backward compatibility).
   */
  async generateImage(options: GenerateImageOptions): Promise<GeneratedImageResult> {
    const batch = await this.generateBatch({ ...options, count: 1 });
    const first = batch.candidates[0];

    return {
      url: first.url,
      thumbnailUrl: first.thumbnailUrl,
      filename: first.filename,
      mimeType: first.mimeType,
      sizeBytes: first.sizeBytes,
      width: first.width,
      height: first.height,
      synthesizedPrompt: batch.synthesizedPrompt,
      model: batch.model,
      isFallback: batch.isFallback,
    };
  }

  /**
   * Generates a cover image based on an existing note's metadata and attaches it.
   */
  async generateCoverForNote(
    noteId: string,
    options?: GenerateNoteCoverOptions,
  ): Promise<{ image: NoteImage; meta: GeneratedImageResult }> {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: {
        hashtags: true,
        folders: { include: { folder: true } },
      },
    });

    if (!note) {
      throw new NotFoundException(`Note '${noteId}' not found`);
    }

    const folderNames = note.folders.map((f) => f.folder?.name).filter(Boolean).join(', ');
    const tagNames = note.hashtags.map((h) => h.name).join(' ');
    const context = [folderNames, tagNames, note.description ? note.description.slice(0, 250) : '']
      .filter(Boolean)
      .join(' | ');

    const prompt = options?.customPrompt || note.title;
    const generated = await this.generateImage({
      prompt,
      style: options?.style || 'cinematic',
      aspectRatio: options?.aspectRatio || '16:9',
      context,
      originalName: `note-${noteId}-cover.webp`,
      noteId,
    });

    const setAsMain = options?.setAsMain ?? true;
    const attachedImage = await this.notesMediaService.attachGeneratedImage(
      noteId,
      generated,
      setAsMain,
      `AI Cover: ${note.title}`,
      `Generated by ${generated.model}`,
    );

    return {
      image: attachedImage,
      meta: generated,
    };
  }

  /**
   * Attaches an existing AI asset or URL to a note as its cover or gallery image.
   */
  async attachAssetToNote(
    noteId: string,
    assetUrl: string,
    caption?: string,
    setAsMain = true,
  ): Promise<NoteImage> {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException(`Note '${noteId}' not found`);
    }

    const asset = this.aiMediaLibraryService['assets']?.find((a) => a.url === assetUrl);

    const attached = await this.notesMediaService.attachGeneratedImage(
      noteId,
      {
        url: assetUrl,
        thumbnailUrl: asset?.thumbnailUrl || assetUrl,
        filename: asset?.filename || 'attached-asset.webp',
        mimeType: asset?.mimeType || 'image/webp',
        sizeBytes: asset?.sizeBytes || 1024,
        width: asset?.width || 1280,
        height: asset?.height || 720,
      },
      setAsMain,
      caption || asset?.userPrompt || note.title,
    );

    await this.aiMediaLibraryService.recordUsage(assetUrl);
    return attached;
  }
}
