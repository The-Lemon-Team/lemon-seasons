import React, { useMemo } from 'react';
import { Button, Badge, Tooltip } from 'antd';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Clock, Check, MessageSquare, FolderPlus, Palette, Send, Share2, Copy } from 'lucide-react';
import { ChatMessageRecord, TelegramNewsPreview } from '../../../types';
import { CuratorNewsGallery } from './CuratorNewsGallery';

function getNodeText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(getNodeText).join('');
  if (node.props?.children) return getNodeText(node.props.children);
  return '';
}

function findMatchingNewsPost(
  text: string,
  posts: TelegramNewsPreview[]
): TelegramNewsPreview | null {
  if (!posts || posts.length === 0) return null;
  const clean = text.toLowerCase().replace(/[*_#`«»"']/g, '').trim();

  // 1. Direct inclusion
  for (const p of posts) {
    const cleanTitle = p.title.toLowerCase().replace(/[*_#`«»"']/g, '').trim();
    if (clean.includes(cleanTitle) || cleanTitle.includes(clean)) {
      return p;
    }
  }

  // 2. Substring matching (first 25 characters of title)
  for (const p of posts) {
    const cleanTitle = p.title.toLowerCase().replace(/[*_#`«»"']/g, '').trim();
    const prefix = cleanTitle.slice(0, Math.min(25, cleanTitle.length));
    if (prefix.length >= 10 && clean.includes(prefix)) {
      return p;
    }
  }

  // 3. Keyword / word overlap matching
  for (const p of posts) {
    const words = p.title
      .toLowerCase()
      .replace(/[^a-zа-я0-9\s]/gi, '')
      .split(/\s+/)
      .filter((w) => w.length >= 4);
    if (words.length > 0) {
      const matchCount = words.filter((w) => clean.includes(w)).length;
      if (matchCount >= Math.min(3, words.length)) {
        return p;
      }
    }
  }

  return null;
}

function getPostForItem(
  children: any,
  posts: TelegramNewsPreview[],
  msg: ChatMessageRecord
): TelegramNewsPreview | null {
  const text = getNodeText(children).trim();
  if (!text || text.length < 15) return null;

  // 1. Try matching with known newsPostsList
  const matched = findMatchingNewsPost(text, posts);
  if (matched) return matched;

  // 2. If children starts with <strong> / <b> or bold text
  let extractedTitle = '';
  let extractedSummary = '';

  const childArray = React.Children.toArray(children);
  const firstChild: any = childArray[0];
  if (
    firstChild &&
    (firstChild.type === 'strong' ||
      firstChild.type === 'b' ||
      firstChild.props?.node?.tagName === 'strong')
  ) {
    extractedTitle = getNodeText(firstChild).trim();
    extractedSummary = childArray
      .slice(1)
      .map(getNodeText)
      .join('')
      .replace(/^[:—–\s]+/, '')
      .trim();
  } else {
    // Check if text has "Title: Description" or "Title — Description"
    const splitMatch = text.match(/^(.{15,120}?)[:—–]\s+(.+)$/s);
    if (splitMatch) {
      extractedTitle = splitMatch[1].trim();
      extractedSummary = splitMatch[2].trim();
    }
  }

  // Filter out non-news items like "Резюме обозревателя", "Источники", "Выводы"
  const ignorePrefixes = [
    'резюме',
    'выводы',
    'источник',
    'ремарка',
    'формат',
    'оптика',
    'статьи проверены',
    'подготовлены',
  ];
  const lowerTitle = extractedTitle.toLowerCase();
  if (ignorePrefixes.some((p) => lowerTitle.startsWith(p))) {
    return null;
  }

  if (extractedTitle && extractedTitle.length >= 12 && extractedSummary) {
    return {
      id: `dyn-news-${Date.now()}`,
      title: extractedTitle,
      summary: extractedSummary,
      rawText: extractedSummary,
      curatorId: msg.sender,
      curatorName: msg.senderName,
      curatorRole: msg.senderRole,
      curatorEmoji: msg.avatar || '📌',
      sourceName: msg.senderName,
      sourceUrl: (msg.sources && msg.sources[0]) || '',
      tags: ['новости', msg.sender],
      keyPoints: [extractedSummary.slice(0, 150)],
      publishedAt: dayjs(msg.createdAt).format('HH:mm'),
    };
  }

  return null;
}

interface ChatMessageItemProps {
  msg: ChatMessageRecord & { isOptimistic?: boolean };
  onOpenCardDrawer: (msg: ChatMessageRecord) => void;
  onCopyText: (text: string) => void;
  onNavigateToCurator?: (curatorId: string, contextPrompt?: string) => void;
  onSaveNewsPostToCalendar?: (post: TelegramNewsPreview) => void;
  onAddToNote?: (item: any) => void;
  onGenerateMediaPrompt?: (msg: ChatMessageRecord) => void;
  onAskNewsDetails?: (post: TelegramNewsPreview) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(
  ({
    msg,
    onOpenCardDrawer,
    onCopyText,
    onNavigateToCurator,
    onSaveNewsPostToCalendar,
    onAddToNote,
    onGenerateMediaPrompt,
    onAskNewsDetails,
  }) => {
    const isUser = msg.sender === 'user';
    const isOptimistic = Boolean(msg.isOptimistic);
    const isTelegramPost =
      msg.messageType === 'TELEGRAM_POST' ||
      (msg as any).groupSummary?.messageType === 'TELEGRAM_POST' ||
      msg.metadata?.format === 'telegram_post' ||
      (msg as any).groupSummary?.metadata?.format === 'telegram_post';

    const newsPostsList: TelegramNewsPreview[] =
      msg.groupSummary?.newsPosts || (msg as any).newsPosts || [];

    // Convert lines starting with unicode bullet "• " into markdown list items "- " so ReactMarkdown parses them as <li>
    const normalizedMarkdownText = useMemo(() => {
      if (!msg.text) return '';
      return msg.text.replace(/^[ \t]*•[ \t]+/gm, '- ');
    }, [msg.text]);

    // Memoize markdown components to keep onNavigateToCurator and news controls in scope
    const markdownComponents = useMemo(
      () => ({
        p: ({ children }: any) => {
          const text = getNodeText(children).trim();
          if (!isUser && text.includes('Ключевой сюжет:') && newsPostsList && newsPostsList.length > 0) {
            const targetPost = newsPostsList[0];
            return (
              <div className="my-2.5 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 transition-all shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  <div className="flex-1 min-w-0 text-gray-200 text-xs leading-relaxed">
                    {children}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5 select-none self-end sm:self-start">
                    {/* Chip 1: Add to Note / Create Record -> opens sidebar drawer */}
                    <Tooltip title="Открыть сайдбар и создать запись в календаре" mouseEnterDelay={0.2}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSaveNewsPostToCalendar) {
                            onSaveNewsPostToCalendar(targetPost);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 hover:border-amber-400 transition-all cursor-pointer active:scale-95 shadow-sm"
                      >
                        <FolderPlus className="w-3 h-3 text-amber-400" />
                        <span>+ Note</span>
                      </button>
                    </Tooltip>

                    {/* Chip 2: Ask agent details */}
                    <Tooltip title="Спросить у агента подробности этой новости" mouseEnterDelay={0.2}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAskNewsDetails) {
                            onAskNewsDetails(targetPost);
                          } else if (onNavigateToCurator) {
                            onNavigateToCurator(
                              targetPost.curatorId,
                              `Расскажи подробнее про новость: «${targetPost.title}»`
                            );
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-sky-500/10 hover:bg-sky-500/25 text-sky-300 border border-sky-500/35 hover:border-sky-400 transition-all cursor-pointer active:scale-95 shadow-sm"
                      >
                        <MessageSquare className="w-3 h-3 text-sky-400" />
                        <span>Детальнее</span>
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <p className="my-1.5 leading-relaxed text-gray-200">
              {children}
            </p>
          );
        },
        ul: ({ children }: any) => <ul className="list-disc pl-5 my-2 space-y-1 text-gray-200">{children}</ul>,
        ol: ({ children }: any) => <ol className="list-decimal pl-5 my-2 space-y-1 text-gray-200">{children}</ol>,
        li: ({ children }: any) => {
          if (isUser) {
            return <li className="my-1 leading-relaxed">{children}</li>;
          }

          const targetPost = getPostForItem(children, newsPostsList, msg);

          if (!targetPost) {
            return <li className="my-1 leading-relaxed">{children}</li>;
          }

          return (
            <li className="my-2.5 leading-relaxed list-none -ml-5 pl-0 group/news">
              <div className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 transition-all shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  <div className="flex-1 min-w-0 text-gray-200 text-xs">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70 mr-2 align-middle flex-shrink-0" />
                    {children}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5 select-none self-end sm:self-start">
                    {/* Chip 1: Add to Note / Create Record -> opens sidebar drawer */}
                    <Tooltip title="Открыть сайдбар и создать запись в календаре" mouseEnterDelay={0.2}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSaveNewsPostToCalendar) {
                            onSaveNewsPostToCalendar(targetPost);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 hover:border-amber-400 transition-all cursor-pointer active:scale-95 shadow-sm"
                      >
                        <FolderPlus className="w-3 h-3 text-amber-400" />
                        <span>+ Note</span>
                      </button>
                    </Tooltip>

                    {/* Chip 2: Ask agent details */}
                    <Tooltip title="Спросить у агента подробности этой новости" mouseEnterDelay={0.2}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAskNewsDetails) {
                            onAskNewsDetails(targetPost);
                          } else if (onNavigateToCurator) {
                            onNavigateToCurator(
                              targetPost.curatorId,
                              `Расскажи подробнее про новость: «${targetPost.title}»`
                            );
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-sky-500/10 hover:bg-sky-500/25 text-sky-300 border border-sky-500/35 hover:border-sky-400 transition-all cursor-pointer active:scale-95 shadow-sm"
                      >
                        <MessageSquare className="w-3 h-3 text-sky-400" />
                        <span>Детальнее</span>
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </li>
          );
        },
        blockquote: ({ children }: any) => (
          <blockquote className="border-l-4 border-primary/70 bg-white/5 pl-3.5 py-1.5 my-2.5 rounded-r text-gray-300 italic">
            {children}
          </blockquote>
        ),
        h3: ({ children }: any) => (
          <h3 className="text-sm font-bold text-white mt-3 mb-1.5 pb-1 border-b border-white/5">
            {children}
          </h3>
        ),
        h4: ({ children }: any) => {
          const text = getNodeText(children);
          let matchedCuratorId: string | null = null;
          let matchedCuratorName: string | null = null;

          if (text.includes('Иван Белый') || text.includes('Внутренний контур')) {
            matchedCuratorId = 'ivan-bely';
            matchedCuratorName = 'Ивану Белому';
          } else if (text.includes('Kirk Kitten') || text.includes('Международный контур')) {
            matchedCuratorId = 'kirk-kitten';
            matchedCuratorName = 'Kirk Kitten';
          } else if (text.includes('Чэнь Вэй') || text.includes('Восточный контур')) {
            matchedCuratorId = 'chen-wei';
            matchedCuratorName = 'Чэнь Вэй';
          } else if (text.includes('Герман') || text.includes('Habr') || text.includes('Хакер')) {
            matchedCuratorId = 'german-kernel';
            matchedCuratorName = 'Герману';
          } else if (text.includes('Окация') || text.includes('IT')) {
            matchedCuratorId = 'okatsiya';
            matchedCuratorName = 'Окации';
          }

          return (
            <div className="flex items-center justify-between gap-2 mt-3 mb-1.5 select-none">
              <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                {children}
              </h4>
              {matchedCuratorId && onNavigateToCurator && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigateToCurator(matchedCuratorId!, `Обсудить новости контура`)
                  }
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 hover:border-sky-400 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  title={`Перейти в отдельный тред к ${matchedCuratorName}`}
                >
                  <MessageSquare className="w-2.5 h-2.5" />
                  <span>В тред к куратору ↗</span>
                </button>
              )}
            </div>
          );
        },
        a: ({ href, children }: any) => {
          if (href?.startsWith('action:curator:')) {
            const parsed = href.replace('action:curator:', '').split('?');
            const curatorId = parsed[0];
            return (
              <button
                type="button"
                onClick={() =>
                  onNavigateToCurator?.(curatorId, `Обсудить сводку контура за выбранный период`)
                }
                className="inline-flex items-center gap-1.5 px-3 py-1 my-1.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/35 hover:bg-sky-500/25 hover:border-sky-400 transition-all cursor-pointer align-middle shadow-sm active:scale-95 select-none"
              >
                <MessageSquare className="w-3 h-3 text-sky-400" />
                <span>{children}</span>
              </button>
            );
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:underline"
            >
              {children}
            </a>
          );
        },
        pre: ({ children }: any) => (
          <pre className="bg-[#0d1117] p-3 rounded-lg border border-white/10 overflow-x-auto my-2 text-xs font-mono text-gray-300">
            {children}
          </pre>
        ),
        code: ({ inline, children }: any) =>
          inline ? (
            <code className="bg-white/10 px-1 py-0.5 rounded text-[12px] font-mono text-primary">
              {children}
            </code>
          ) : (
            <code className="font-mono text-xs">{children}</code>
          ),
      }),
      [
        isUser,
        msg,
        newsPostsList,
        onNavigateToCurator,
        onSaveNewsPostToCalendar,
        onAskNewsDetails,
      ]
    );

    // Memoize markdown rendering so it only runs when normalized text changes
    const renderedMarkdown = useMemo(() => {
      return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
          {normalizedMarkdownText}
        </ReactMarkdown>
      );
    }, [normalizedMarkdownText, markdownComponents]);

    return (
      <div
        className={`flex gap-3 group animate-in fade-in duration-150 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}
      >
        {/* Agent Avatar */}
        {!isUser && (
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base flex-shrink-0 mt-0.5 select-none">
            {msg.avatar || '🤖'}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`max-w-[85%] rounded-2xl p-4 border transition-all ${
            isUser
              ? isOptimistic
                ? 'bg-primary/20 border-primary/50 text-white rounded-tr-none opacity-90'
                : 'bg-primary/15 border-primary/40 text-white rounded-tr-none'
              : isTelegramPost
              ? 'bg-[#131b26] border-sky-500/30 text-gray-200 rounded-tl-none shadow-xl ring-1 ring-sky-500/10'
              : 'bg-[#161b22] border-white/10 text-gray-200 rounded-tl-none shadow-lg'
          }`}
        >
          {/* Sender Metadata Bar */}
          <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-white/5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-wide">{msg.senderName}</span>
              <span className="text-gray-400 opacity-80">· {msg.senderRole}</span>
              {isTelegramPost && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  <span>✈️</span>
                  <span>TG POST</span>
                  {(msg.metadata?.period === 'week' || (msg as any).groupSummary?.metadata?.period === 'week') && (
                    <span className="text-sky-200">· НЕДЕЛЯ</span>
                  )}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isOptimistic ? (
                <span className="text-[10px] text-primary flex items-center gap-1 font-mono animate-pulse">
                  <Clock className="w-2.5 h-2.5" />
                  <span>Отправка...</span>
                </span>
              ) : (
                <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                  <span>{dayjs(msg.createdAt).format('HH:mm')}</span>
                  {isUser && <Check className="w-2.5 h-2.5 text-primary/70" />}
                </span>
              )}
            </div>
          </div>

          {/* Markdown Content */}
          <div className="prose prose-invert max-w-none text-xs leading-relaxed">
            {renderedMarkdown}
          </div>

          {/* Sources Footnote */}
          {msg.sources && msg.sources.length > 0 && (
            <div className="mt-3 pt-2 border-t border-white/5 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-mono text-gray-400 uppercase">
                Источники:
              </span>
              {msg.sources.map((src, i) => (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-sky-400 hover:underline max-w-[200px] truncate bg-white/5 px-2 py-0.5 rounded"
                >
                  {src}
                </a>
              ))}
            </div>
          )}

          {/* Interactive News Cards Gallery (temporarily commented out) */}
          {/*
          {!isUser && msg.sender !== 'political-group' && newsPostsList && newsPostsList.length > 0 && (
            <CuratorNewsGallery
              posts={newsPostsList}
              onSaveToCalendar={onSaveNewsPostToCalendar}
              onDiscussInChat={(post) =>
                onNavigateToCurator?.(post.curatorId, `Расскажи подробнее про: ${post.title}`)
              }
              onAddToNote={
                onAddToNote
                  ? (post) =>
                      onAddToNote({
                        title: post.title,
                        summary: post.summary,
                        rawText: post.rawText,
                        sourceUrl: post.sourceUrl,
                        curator: post.curatorName,
                        curatorId: post.curatorId,
                        date: (post as any).date || msg.createdAt,
                        tags: post.tags,
                      })
                  : undefined
              }
            />
          )}
          */}

          {/* Action Buttons Bar */}
          {!isUser && (
            <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-[11px] flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {isTelegramPost ? (
                  <>
                    <Button
                      type="text"
                      size="small"
                      onClick={() => onCopyText(msg.text)}
                      className="text-sky-300 hover:text-sky-100 hover:bg-sky-500/15 text-[11px] h-6 px-2 flex items-center gap-1 font-semibold border border-sky-500/30"
                      title="Копировать в буфер обмена для Telegram"
                    >
                      <Share2 className="w-2.5 h-2.5 text-sky-400" />
                      <span>Копировать для TG</span>
                    </Button>

                    <Button
                      type="text"
                      size="small"
                      onClick={() => onOpenCardDrawer(msg)}
                      className="text-primary hover:text-primary/80 hover:bg-primary/10 text-[11px] h-6 px-2 flex items-center gap-1 font-semibold"
                      title="Сохранить в календарь хроники"
                    >
                      <span className="material-symbols-outlined text-[13px]">bookmark_add</span>
                      <span>В календарь</span>
                    </Button>

                    {onGenerateMediaPrompt && (
                      <Button
                        type="text"
                        size="small"
                        onClick={() => onGenerateMediaPrompt(msg)}
                        className="text-purple-300 hover:text-purple-100 hover:bg-purple-500/15 text-[11px] h-6 px-2 flex items-center gap-1 font-semibold border border-purple-500/30"
                        title="Сгенерировать медиа-промпт (DALL-E / Midjourney / Mermaid)"
                      >
                        <Palette className="w-2.5 h-2.5 text-purple-400" />
                        <span>Медиа-промпт</span>
                      </Button>
                    )}

                    {onAddToNote && (
                      <Button
                        type="text"
                        size="small"
                        onClick={() =>
                          onAddToNote({
                            title: msg.suggestedCard?.title || `${msg.senderName}: TG Сводка`,
                            summary: msg.text.substring(0, 240),
                            rawText: msg.text,
                            curator: msg.senderName,
                            curatorId: msg.sender,
                            date: msg.metadata?.dateScope || msg.createdAt,
                            tags: msg.suggestedCard?.hashtags || ['TGPost', 'Сводка'],
                          })
                        }
                        className="text-amber-300 hover:text-amber-100 hover:bg-amber-500/15 text-[11px] h-6 px-2 flex items-center gap-1 font-semibold border border-amber-500/30"
                        title="Добавить в Super Note (для дайджеста / NotebookLM)"
                      >
                        <FolderPlus className="w-2.5 h-2.5 text-amber-400" />
                        <span>+ В Note</span>
                      </Button>
                    )}

                    {onNavigateToCurator && (
                      <Button
                        type="text"
                        size="small"
                        onClick={() =>
                          onNavigateToCurator(msg.sender, `Обсудим эту сводку: ${msg.text.substring(0, 80)}...`)
                        }
                        className="text-gray-400 hover:text-white hover:bg-white/5 text-[11px] h-6 px-1.5 flex items-center gap-1"
                      >
                        <MessageSquare className="w-2.5 h-2.5 text-sky-400" />
                        <span>Обсудить</span>
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      type="text"
                      size="small"
                      onClick={() => onOpenCardDrawer(msg)}
                      className="text-primary hover:text-primary/80 hover:bg-primary/10 text-[11px] h-6 px-2 flex items-center gap-1 font-semibold"
                    >
                      <span className="material-symbols-outlined text-[14px]">bookmark_add</span>
                      <span>В календарь заметок</span>
                    </Button>

                    {onAddToNote && (
                      <Button
                        type="text"
                        size="small"
                        onClick={() =>
                          onAddToNote({
                            title: msg.suggestedCard?.title || `${msg.senderName}: Анализ`,
                            summary: msg.text.substring(0, 240),
                            rawText: msg.text,
                            curator: msg.senderName,
                            curatorId: msg.sender,
                            date: msg.createdAt,
                            tags: msg.suggestedCard?.hashtags,
                          })
                        }
                        className="text-amber-300 hover:text-amber-100 hover:bg-amber-500/15 text-[11px] h-6 px-2 flex items-center gap-1 border border-amber-500/30"
                        title="Добавить в Note +"
                      >
                        <FolderPlus className="w-2.5 h-2.5 text-amber-400" />
                        <span>+ В Note</span>
                      </Button>
                    )}

                    <Button
                      type="text"
                      size="small"
                      onClick={() => onCopyText(msg.text)}
                      className="text-gray-400 hover:text-white text-[11px] h-6 px-1.5"
                    >
                      Копировать
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        {isUser && (
          <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-base flex-shrink-0 mt-0.5 select-none">
            👤
          </div>
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.msg.id === next.msg.id &&
    prev.msg.text === next.msg.text &&
    (prev.msg as any).isOptimistic === (next.msg as any).isOptimistic &&
    prev.msg.groupSummary === next.msg.groupSummary &&
    (prev.msg as any).newsPosts === (next.msg as any).newsPosts &&
    prev.onAskNewsDetails === next.onAskNewsDetails &&
    prev.onSaveNewsPostToCalendar === next.onSaveNewsPostToCalendar &&
    prev.onNavigateToCurator === next.onNavigateToCurator
);

ChatMessageItem.displayName = 'ChatMessageItem';
