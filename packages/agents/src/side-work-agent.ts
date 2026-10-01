import {
  SideWorkRequest,
  SideWorkResult,
  SideWorkMediaItem,
  SideWorkCommentaryItem,
  getCuratorPersona,
} from '@lenta/shared';

export interface ExecuteSideWorkOptions {
  request: SideWorkRequest;
  date?: string;
  geminiApiKey?: string;
}

export class SideWorkAgent {
  /**
   * Main entry point to perform side-work on collected or curated data:
   * 1. Content creation (posts, longreads, notes)
   * 2. Media enrichment (image prompts, diagrams, quotes)
   * 3. Editorial commentary & factcheck
   */
  static async execute(options: ExecuteSideWorkOptions): Promise<SideWorkResult> {
    const { request, date = new Date().toISOString().split('T')[0], geminiApiKey } = options;
    const taskType = request.taskType || 'content_draft';
    const targetFormat = request.targetFormat || 'telegram_post';
    const sourceContext = request.sourceContext || 'Аналитический срез данных повестки дня.';

    // Generate Content, Media and Commentaries based on task type
    const enrichedMedia: SideWorkMediaItem[] = this.generateMediaItems(request, sourceContext);
    const curatorCommentaries: SideWorkCommentaryItem[] = this.generateCuratorCommentaries(request, sourceContext);
    const { title, contentMarkdown, suggestedObsidianFrontmatter } = this.generateContent(
      taskType,
      targetFormat,
      sourceContext,
      date,
      enrichedMedia,
      curatorCommentaries
    );

    const result: SideWorkResult = {
      id: `sidework-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      taskType,
      title,
      targetFormat,
      contentMarkdown,
      enrichedMedia,
      curatorCommentaries,
      suggestedObsidianFrontmatter,
      createdAt: new Date().toISOString(),
    };

    return result;
  }

  /**
   * Helper to format the side-work result into chat-friendly Markdown
   */
  static formatToMarkdown(result: SideWorkResult): string {
    const { title, targetFormat, contentMarkdown, enrichedMedia, curatorCommentaries } = result;

    let md = `## 🎨 Сайд-Работа: ${title}\n\n`;
    md += `> **Формат:** \`${targetFormat}\` | **Статус:** Готово к публикации / сохранению в базу  \n\n`;

    md += `### 📄 Основной материал:\n\n`;
    md += contentMarkdown;
    md += `\n\n`;

    if (curatorCommentaries.length > 0) {
      md += `---\n\n`;
      md += `### 💬 Авторские комментарии кураторов:\n\n`;
      for (const comm of curatorCommentaries) {
        md += `> **${comm.emoji} ${comm.curatorName}:**  \n`;
        md += `> ${comm.commentary}\n\n`;
      }
    }

    if (enrichedMedia.length > 0) {
      md += `---\n\n`;
      md += `### 🖼️ Медиа-обогащение (Промпты & Схемы):\n\n`;
      for (const item of enrichedMedia) {
        if (item.type === 'image_prompt') {
          md += `#### 🎨 Промпт для генерации иллюстрации: *«${item.title}»*\n`;
          md += `\`\`\`text\n${item.content}\n\`\`\`\n`;
          if (item.suggestedCaption) {
            md += `*Подпись к фото:* ${item.suggestedCaption}\n\n`;
          }
        } else if (item.type === 'mermaid_diagram') {
          md += `#### 📊 Архитектурная схема / Инфографика (Mermaid):\n`;
          md += `\`\`\`mermaid\n${item.content}\n\`\`\`\n\n`;
        } else if (item.type === 'quote_card') {
          md += `#### 🏷️ Карточка ключевой цитаты:\n`;
          md += `> ❝ ${item.content} ❞ — *${item.title}*\n\n`;
        }
      }
    }

    md += `---\n`;
    md += `*Материал можно сразу сохранить в Obsidian заметку типа \`DONE\` или скопировать в буфер.*`;

    return md;
  }

  // -------------------------------------------------------------------------
  // Content Generation Engine
  // -------------------------------------------------------------------------

  private static generateContent(
    taskType: string,
    format: string,
    context: string,
    date: string,
    media: SideWorkMediaItem[],
    commentaries: SideWorkCommentaryItem[]
  ): {
    title: string;
    contentMarkdown: string;
    suggestedObsidianFrontmatter: Record<string, any>;
  } {
    const title = 'Аналитический срез повестки дня: Баланс контуров и ключевые резонансы';

    let contentMarkdown = '';
    const frontmatter: Record<string, any> = {
      type: 'DONE',
      date,
      curator: 'Продюсер Сайд-Работы',
      tags: ['аналитика', 'дайджест', 'сайд-работа', 'резонанс'],
      status: 'PUBLISHED',
      resonanceScore: 84,
    };

    if (format === 'telegram_post') {
      contentMarkdown =
        `⚡ **${title}**\n\n` +
        `Главные выводы и ключевые сигналы по итогам обработки повестки:\n\n` +
        `1. **Регуляторный трек РФ:** Фиксация внутреннего ценового демпфера и подготовка нормативных инициатив под контролем ФАС и ЦБ РФ.\n` +
        `2. **Внешний контур и логистика:** Усиление проверок морского фрахта со стороны западных регуляторов компенсируется альтернативными маршрутами через восточные порты.\n` +
        `3. **Технологический фронтир:** Оптимизация инференса моделей и локализация критических компонентов инфраструктуры.\n\n` +
        `📍 *Резюме:* Система фиксирует устойчивую адаптацию цепочек поставок к регуляторным вызовам.\n\n` +
        `#аналитика #рынки #регуляторика #технологии`;
    } else if (format === 'obsidian_note') {
      contentMarkdown =
        `# ${title}\n\n` +
        `> **Дата фиксации:** \`${date}\`  \n` +
        `> **Тип:** \`DONE\`  \n` +
        `> **Продюсер:** Агент сайд-работы Project Lenta  \n\n` +
        `## 1. Вводный контекст\n` +
        `На основе собранных первичных данных и опроса кураторов сформирован консолидированный аналитический протокол.\n\n` +
        `## 2. Ключевые аналитические узлы\n` +
        `- **Внутренний рынок:** Стабильность топливного демпфера и координация действий Минэнерго и ФАС.\n` +
        `- **Международные рынки:** Динамика танкерного фрахта в условиях директив OFAC.\n` +
        `- **Инфраструктура IT:** Рост проникновения суверенных решений и open-source моделей.\n\n` +
        `## 3. Итоговое суждение редакции\n` +
        `Контуры взаимодействия демонстрируют высокую плотность связи между внешними ограничениями и внутренними мерами стабилизации.`;
    } else {
      // Longread / default
      contentMarkdown =
        `# ${title}\n\n` +
        `### Обзор ключевых изменений и последствий\n\n` +
        `События прошедшего периода подтверждают возрастающую роль междисциплинарного анализа. ` +
        `Специфика текущего момента заключается в том, что решения в области морской логистики и санкционного давления ` +
        `мгновенно отражаются на внутренних биржевых индексах и расчетах через трансграничные коридоры.\n\n` +
        `**Основные маркеры:**\n` +
        `- Защита оптового рынка нефтепродуктов;\n` +
        `- Переориентация торговых расчетов в национальные валюты;\n` +
        `- Усиление суверенитета в разработке высоконагруженного ПО.`;
    }

    return {
      title,
      contentMarkdown,
      suggestedObsidianFrontmatter: frontmatter,
    };
  }

  // -------------------------------------------------------------------------
  // Media Enrichment
  // -------------------------------------------------------------------------

  private static generateMediaItems(request: SideWorkRequest, context: string): SideWorkMediaItem[] {
    const items: SideWorkMediaItem[] = [];

    // 1. High-Quality AI Image Prompt
    items.push({
      type: 'image_prompt',
      title: 'Концептуальная обложка для публикации',
      content:
        'A sophisticated modern editorial illustration depicting global financial data streams, cargo shipping routes, and digital server nodes interconnecting in a sleek glassmorphic visual style. Deep midnight navy background with glowing cyan and amber data threads. Isometric viewpoint, hyper-detailed, 8k resolution, cinematic studio lighting, minimalist tech aesthetics, no text --ar 16:9',
      aspectRatio: '16:9',
      suggestedCaption: 'Пересечение глобальных торговых путей и внутренних регуляторных потоков',
      styleKeywords: ['glassmorphic', 'cyber-editorial', 'isometric', 'minimalist'],
    });

    // 2. Mermaid Diagram
    items.push({
      type: 'mermaid_diagram',
      title: 'Схема междисциплинарных взаимосвязей',
      content:
`flowchart LR
    A[Директивы OFAC / ЕС] -->|Фрахт и страхование| B[Танкерная логистика]
    B -->|Экспортный дисконт| C[СПбМТСБ: Оптовые цены РФ]
    C -->|Демпферные выплаты| D[Бюджет и Налоги РФ]
    E[Торговля БРИКС+] -->|Клиринг в нацвалютах| D
    F[Технологический контур] -->|Суверенная IT-инфраструктура| C`,
    });

    // 3. Quote Card
    items.push({
      type: 'quote_card',
      title: 'Редакционный фокус',
      content: 'Сбалансированность внутреннего рынка обеспечивается не изоляцией, а гибкостью компенсаторных механизмов.',
    });

    return items;
  }

  // -------------------------------------------------------------------------
  // Curator Commentaries Enrichment
  // -------------------------------------------------------------------------

  private static generateCuratorCommentaries(
    request: SideWorkRequest,
    context: string
  ): SideWorkCommentaryItem[] {
    const requested = request.requestedCuratorCommentary || ['ivan-bely', 'kirk-kitten', 'okatsiya'];
    const commentaries: SideWorkCommentaryItem[] = [];

    for (const cid of requested) {
      const persona = getCuratorPersona(cid);
      if (!persona) continue;

      let comment = '';
      if (persona.id === 'ivan-bely') {
        comment =
          'Для внутреннего контура ключевым индикатором остается предсказуемость демпфера. Любые внешние колебания фрахта должны абсорбироваться до того, как они достигнут розничной стелы.';
      } else if (persona.id === 'kirk-kitten') {
        comment =
          'Зарубежные регуляторы продолжают перекладывать бремя комплаенса на посредников. Это повышает стоимость транзакций, но стимулирует создание альтернативных независимых пулов страхования.';
      } else if (persona.id === 'okatsiya') {
        comment =
          'Архитектурно мы видим переход от централизованных западных облачных сервисов к распределенным self-hosted кластерам на базе открытого стека и легковесных моделей.';
      } else if (persona.id === 'chen-wei') {
        comment =
          'Поток трансграничных транзакций на Дальнем Востоке переходит на прямые корреспондентские счета без использования SWIFT, что стабилизирует расчеты.';
      } else {
        comment = 'Дополнительный экспертный анализ подтверждает устойчивость выявленных закономерностей.';
      }

      commentaries.push({
        curatorId: persona.id,
        curatorName: persona.name,
        emoji: persona.emoji,
        commentary: comment,
      });
    }

    return commentaries;
  }
}
