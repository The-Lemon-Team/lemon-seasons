import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { GeneratePhotoDto, GeneratePodcastDto } from '../dto';

@Injectable()
export class ChatMediaService {
  private readonly logger = new Logger(ChatMediaService.name);
  private readonly geminiApiKey?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
  }

  /**
   * Generates a themed photo using Google Gemini / Imagen and saves it to media storage
   */
  async generatePhoto(threadId: string, dto: GeneratePhotoDto) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { folder: true, curator: true },
    });
    if (!thread || thread.deletedAt) {
      throw new NotFoundException(`Чат с ID ${threadId} не найден.`);
    }

    const folder = thread.folder;
    const stylePrompt = folder?.imageStylePrompt || 'cinematic, highly detailed, realistic lighting, 8k resolution, editorial aesthetic';
    const folderContext = folder?.name ? `Контекст контура: ${folder.name}.` : '';

    // 1. Synthesize professional English image prompt
    let imageSubject = dto.prompt?.trim();
    if (!imageSubject) {
      const recent = await this.prisma.chatMessageRecord.findMany({
        where: { threadId },
        take: 4,
        orderBy: { createdAt: 'desc' },
      });
      imageSubject = recent.map((m) => m.text).join('\n') || thread.title;
    }

    let synthesizedPrompt = `High quality illustration of ${imageSubject}. Style: ${stylePrompt}.`;
    if (this.geminiApiKey) {
      try {
        synthesizedPrompt = await this.synthesizeImagePrompt(imageSubject, stylePrompt, folderContext);
      } catch (err: any) {
        this.logger.warn(`Image prompt synthesis fallback: ${err.message}`);
      }
    }

    // 2. Generate Image via Gemini / Imagen
    let imageUrl = '';
    if (this.geminiApiKey) {
      try {
        imageUrl = await this.requestGeminiImage(synthesizedPrompt, dto.aspectRatio || '16:9');
      } catch (err: any) {
        this.logger.error(`Gemini image generation failed: ${err.message}`);
      }
    }

    // Fallback vector card if Gemini returns empty
    if (!imageUrl) {
      imageUrl = await this.generateFallbackThemedImage(thread.title, folder?.color || '#10b981', imageSubject);
    }

    // 3. Save message record with media
    const reply = await this.prisma.chatMessageRecord.create({
      data: {
        threadId,
        sender: 'gemini-imagen',
        senderType: 'ASSISTANT',
        senderName: folder?.name ? `Фото-генератор [${folder.name}]` : 'Фото-генератор Gemini',
        senderRole: 'Специалист по медиа-генерации (Gemini Imagen)',
        avatar: '🎨',
        text: `🖼️ **Сгенерирована иллюстрация** по тематике контура.\n\n> **Промпт:** *${synthesizedPrompt}*\n> **Стиль контура:** \`${stylePrompt}\``,
        mediaUrls: [imageUrl],
        payload: {
          prompt: synthesizedPrompt,
          aspectRatio: dto.aspectRatio || '16:9',
          imageUrl,
        },
      },
    });

    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    return reply;
  }

  /**
   * Generates a 2-host conversational NotebookLM podcast script from topic context
   */
  async generatePodcast(threadId: string, dto: GeneratePodcastDto) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { folder: true, curator: true },
    });
    if (!thread || thread.deletedAt) {
      throw new NotFoundException(`Чат с ID ${threadId} не найден.`);
    }

    const messages = await this.prisma.chatMessageRecord.findMany({
      where: { threadId },
      take: 15,
      orderBy: { createdAt: 'desc' },
    });
    const topicSummary = messages.reverse().map((m) => `${m.senderName}: ${m.text}`).join('\n\n');

    const host1 = dto.host1Name || (thread.curator?.name ? thread.curator.name : 'Алексей');
    const host2 = dto.host2Name || 'Елена';

    let script;
    if (this.geminiApiKey) {
      try {
        script = await this.generateNotebookLmGeminiScript({
          title: thread.title,
          context: topicSummary,
          host1,
          host2,
          folderName: thread.folder?.name,
        });
      } catch (err: any) {
        this.logger.warn(`Gemini podcast generation fallback: ${err.message}`);
      }
    }

    if (!script) {
      script = {
        title: `Обзор темы: ${thread.title}`,
        tagline: `Экспресс-разбор ключевых тезисов и практических выводов`,
        host1Name: host1,
        host2Name: host2,
        estimatedDurationSec: 180,
        turns: [
          { speaker: host1, role: 'host1', text: `Привет! Сегодня мы подробно разбираем тему: "${thread.title}".` },
          { speaker: host2, role: 'host2', text: `Да, привет! И здесь сразу бросается в глаза несколько важных нюансов, о которых обязательно стоит сказать.` },
          { speaker: host1, role: 'host1', text: `Главный тезис заключается в том, что мы переходим от разрозненных сигналов к единому контуру управления.` },
          { speaker: host2, role: 'host2', text: `И как это повлияет на конечный результат? На что в первую очередь обратить внимание?` },
          { speaker: host1, role: 'host1', text: `В первую очередь — на системную связность данных и оперативное внедрение ИИ-агентов.` },
          { speaker: host2, role: 'host2', text: `Отличный вывод. Продолжаем следить за развитием событий!` },
        ],
      };
    }

    const formattedTranscript = script.turns
      .map((t: any) => `**${t.speaker}**: ${t.text}`)
      .join('\n\n');

    const reply = await this.prisma.chatMessageRecord.create({
      data: {
        threadId,
        sender: 'notebooklm-podcast',
        senderType: 'ASSISTANT',
        senderName: 'NotebookLM Подкастер',
        senderRole: 'Генератор аудио-обзоров и сценариев подкастов',
        avatar: '🎙️',
        text: `### 🎙️ NotebookLM Подкаст: ${script.title}\n\n*${script.tagline}*\n\n${formattedTranscript}`,
        payload: {
          podcastScript: script,
        },
      },
    });

    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    return reply;
  }

  // ---------------------------------------------------------------------------
  // Internal Gemini Helpers
  // ---------------------------------------------------------------------------

  async callGeminiWithSystemPrompt(
    systemPrompt: string,
    userText: string,
    history: any[],
  ): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const contents: any[] = [];
    contents.push({
      role: 'user',
      parts: [{ text: `[SYSTEM INSTRUCTION]\n${systemPrompt}` }],
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Инструкция принята. Готов отвечать в заданной роли.' }],
    });

    for (const h of history) {
      if (h.senderType === 'USER') {
        contents.push({ role: 'user', parts: [{ text: h.text }] });
      } else {
        contents.push({ role: 'model', parts: [{ text: h.text }] });
      }
    }

    contents.push({ role: 'user', parts: [{ text: userText }] });

    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        });

        if (!res.ok) continue;
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      } catch {
        continue;
      }
    }

    throw new Error('Gemini API did not return text');
  }

  private async synthesizeImagePrompt(
    subject: string,
    stylePrompt: string,
    folderContext: string,
  ): Promise<string> {
    const prompt = `You are a prompt engineer for Gemini / Imagen 3.
Convert this subject and style into a single concise English text prompt for high-definition image generation.
Subject: "${subject}"
Visual Style: "${stylePrompt}"
${folderContext}

Return ONLY the final prompt text, no quotes, no markdown, no explanations. Max 60 words.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    }

    return `${subject}, ${stylePrompt}`;
  }

  private async requestGeminiImage(prompt: string, aspectRatio = '16:9'): Promise<string> {
    try {
      const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${this.geminiApiKey}`;
      const res = await fetch(imagenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatio === '1:1' ? '1:1' : aspectRatio === '9:16' ? '9:16' : '16:9',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const b64 = data.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          const buffer = Buffer.from(b64, 'base64');
          const saved = await this.storageService.saveGeneratedBuffer(buffer, 'gemini-imagen.webp');
          return saved.url;
        }
      }
    } catch (err: any) {
      this.logger.warn(`Imagen 3 direct predict failed: ${err.message}`);
    }

    return '';
  }

  private async generateFallbackThemedImage(
    title: string,
    accentColor: string,
    subject: string,
  ): Promise<string> {
    const cleanTitle = title.replace(/[<>&"]/g, '');
    const cleanSub = subject.slice(0, 80).replace(/[<>&"]/g, '');
    const svg = `
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0d1117" />
          <stop offset="50%" stop-color="#161b22" />
          <stop offset="100%" stop-color="#090d13" />
        </linearGradient>
        <radialGradient id="glow" cx="80%" cy="20%" r="50%">
          <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <rect width="100%" height="100%" fill="url(#glow)" />
      
      <!-- Grid pattern -->
      <line x1="80" y1="120" x2="1200" y2="120" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      <line x1="80" y1="600" x2="1200" y2="600" stroke="rgba(255,255,255,0.08)" stroke-width="1" />

      <!-- Accent badge -->
      <rect x="80" y="80" width="160" height="28" rx="6" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-width="1.5" />
      <text x="160" y="99" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="${accentColor}" text-anchor="middle">LEMON MEDIA LAB</text>

      <!-- Main Title -->
      <text x="80" y="240" font-family="system-ui, sans-serif" font-size="44" font-weight="800" fill="#ffffff">${cleanTitle}</text>
      
      <!-- Subtext -->
      <text x="80" y="320" font-family="system-ui, sans-serif" font-size="22" font-weight="400" fill="#9ca3af">${cleanSub}</text>

      <!-- Watermark -->
      <text x="80" y="580" font-family="monospace" font-size="14" fill="#6b7280">AI THEMED ASSET • 1280x720 • GEMINI STUDIO</text>
    </svg>`;

    const buffer = Buffer.from(svg, 'utf-8');
    const saved = await this.storageService.saveGeneratedBuffer(buffer, 'fallback-card.svg', true);
    return saved.url;
  }

  private async generateNotebookLmGeminiScript(opts: {
    title: string;
    context: string;
    host1: string;
    host2: string;
    folderName?: string;
  }): Promise<any> {
    const prompt = `Ты — ведущий режиссер и сценарист в стиле Google NotebookLM Deep Dive Podcast.
Тема: "${opts.title}" (Контур: ${opts.folderName || 'Аналитика'})
Ведущий 1: "${opts.host1}" (глубокий аналитик, эксперт, оперирует фактами).
Ведущий 2: "${opts.host2}" (живой, любознательный собеседник, задает острые вопросы, переводит на понятный язык).

КОНТЕКСТ ДИАЛОГА:
${opts.context.slice(0, 3000)}

ПРАВИЛА NOTEBOOKLM:
1. Живой диалог двух умных друзей за чашкой кофе. Никаких формальных дикторских клише.
2. Естественные перебивки, уточнения ("Погоди, Алексей...", "Именно!", "А что это меняет?").
3. Хронометраж: 8-12 реплик попеременно.
4. В конце — сильный вывод.

ВЕРНИ СТРОГО JSON:
{
  "title": "Броский заголовок подкаста",
  "tagline": "Короткий тизер",
  "turns": [
    { "speaker": "${opts.host1}", "role": "host1", "text": "..." },
    { "speaker": "${opts.host2}", "role": "host2", "text": "..." }
  ]
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (raw) return JSON.parse(raw);
    }
    return null;
  }
}
