import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WebImageResult {
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  source: string;
  domain: string;
  link: string;
  width?: number;
  height?: number;
  position?: number;
}

export interface SerperSearchOptions {
  gl?: string;
  hl?: string;
  num?: number;
}

@Injectable()
export class SerperImageSearchService {
  private readonly logger = new Logger(SerperImageSearchService.name);
  private readonly apiKey?: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService
      .get<string>('SERPER_API_KEY')
      ?.replace(/^["']|["']$/g, '');

    if (this.apiKey) {
      this.logger.log('🔍 Serper.dev Google Images search engine initialized.');
    } else {
      this.logger.warn('⚠️ SERPER_API_KEY is not set. Web image search will be unavailable.');
    }
  }

  /**
   * Search Google Images via Serper.dev
   */
  async searchImages(query: string, options?: SerperSearchOptions): Promise<WebImageResult[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const key = this.apiKey || this.configService.get<string>('SERPER_API_KEY')?.replace(/^["']|["']$/g, '');
    if (!key) {
      throw new HttpException(
        'SERPER_API_KEY не настроен в .env бэкенда',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const gl = options?.gl || 'ru';
    const hl = options?.hl || 'ru';
    const num = Math.min(options?.num || 20, 50);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch('https://google.serper.dev/images', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'X-API-KEY': key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query.trim(),
          gl,
          hl,
          num,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Serper API error (HTTP ${response.status}): ${errorText}`);
        throw new HttpException(
          `Ошибка поиска Serper: ${response.status} ${response.statusText}`,
          response.status === 401 ? HttpStatus.UNAUTHORIZED : HttpStatus.BAD_GATEWAY,
        );
      }

      const data = await response.json();
      const images: any[] = data.images || [];

      return images.map((item, index) => ({
        title: item.title || query,
        imageUrl: item.imageUrl,
        thumbnailUrl: item.thumbnailUrl || item.imageUrl,
        source: item.source || item.domain || 'Google',
        domain: item.domain || '',
        link: item.link || item.imageUrl,
        width: item.imageWidth,
        height: item.imageHeight,
        position: item.position ?? index + 1,
      }));
    } catch (err: any) {
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.error(`Failed to query Serper.dev: ${err.message}`, err.stack);
      throw new HttpException(
        `Сбой соединения с Serper.dev: ${err.message}`,
        HttpStatus.GATEWAY_TIMEOUT,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
