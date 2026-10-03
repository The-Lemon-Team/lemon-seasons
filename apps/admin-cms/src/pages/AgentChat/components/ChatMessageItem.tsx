import React, { useMemo } from 'react';
import { Button, Badge, Tooltip } from 'antd';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Clock, Check, MessageSquare, FolderPlus, Palette, Send, Share2, Copy } from 'lucide-react';
import { ResonanceNodeCandidate } from '@lemon/agents';
import { ChatMessageRecord, TelegramNewsPreview } from '../../../types';
import { CuratorNewsGallery } from './CuratorNewsGallery';

function getNodeText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(getNodeText).join('');
  if (node.props?.children) return getNodeText(node.props.children);
  return '';
}

/**
 * Parses text and converts resonance markers like [⚡ Резонанс: 86%] or [⚡ 86%] into neat badges
 */
function renderWithResonanceChips(node: React.ReactNode): React.ReactNode {
  if (typeof node === 'string') {
    const regex = /\[⚡\s*(?:Резонанс:\s*)?(\d+)%\]/g;
    if (!regex.test(node)) {
      return node;
    }
    const parts = node.split(/(\[⚡\s*(?:Резонанс:\s*)?\d+%\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[⚡\s*(?:Резонанс:\s*)?(\d+)%\]/);
      if (match) {
        const score = parseInt(match[1], 10);
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-1.5 py-0.2 mx-1 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 align-middle select-none shadow-xs"
            title={`Индекс резонанса: ${score}%`}
          >
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            <span>{score}%</span>
          </span>
        );
      }
      return part;
    });
  }

  if (Array.isArray(node)) {
    return node.map((child, idx) => (
      <React.Fragment key={idx}>{renderWithResonanceChips(child)}</React.Fragment>
    ));
  }

  if (React.isValidElement(node) && node.props?.children) {
    return React.cloneElement(node as React.ReactElement<any>, {
      children: renderWithResonanceChips(node.props.children),
    });
  }

  return node;
}

interface ChatMessageItemProps {
  msg: ChatMessageRecord & { isOptimistic?: boolean };
  onOpenCardDrawer: (msg: ChatMessageRecord) => void;
  onCopyText: (text: string) => void;
  onTriggerSynthesis: (node: ResonanceNodeCandidate) => void;
  onTriggerSingleSynthesis?: (msg: ChatMessageRecord) => void;
  onNavigateToCurator?: (curatorId: string, contextPrompt?: string) => void;
  onSaveNewsPostToCalendar?: (post: TelegramNewsPreview) => void;
  onAddToNote?: (item: any) => void;
  onGenerateMediaPrompt?: (msg: ChatMessageRecord) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(
  ({
    msg,
    onOpenCardDrawer,
    onCopyText,
    onTriggerSynthesis,
    onTriggerSingleSynthesis,
    onNavigateToCurator,
    onSaveNewsPostToCalendar,
    onAddToNote,
    onGenerateMediaPrompt,
  }) => {
    // Memoize markdown components to keep onNavigateToCurator in scope
    const markdownComponents = useMemo(
      () => ({
        p: ({ children }: any) => (
          <p className="my-1.5 leading-relaxed text-gray-200">
            {renderWithResonanceChips(children)}
          </p>
        ),
        ul: ({ children }: any) => <ul className="list-disc pl-5 my-2 space-y-1 text-gray-200">{children}</ul>,
        ol: ({ children }: any) => <ol className="list-decimal pl-5 my-2 space-y-1 text-gray-200">{children}</ol>,
        li: ({ children }: any) => (
          <li className="my-1 leading-relaxed">
            {renderWithResonanceChips(children)}
          </li>
        ),
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
      [onNavigateToCurator]
    );

    // Memoize markdown rendering so it only runs when msg.text changes
    const renderedMarkdown = useMemo(() => {
      return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
          {msg.text}
        </ReactMarkdown>
      );
    }, [msg.text, markdownComponents]);

    const isUser = msg.sender === 'user';
    const isOptimistic = Boolean(msg.isOptimistic);
    const isTelegramPost =
      msg.messageType === 'TELEGRAM_POST' ||
      (msg as any).groupSummary?.messageType === 'TELEGRAM_POST' ||
      msg.metadata?.format === 'telegram_post' ||
      (msg as any).groupSummary?.metadata?.format === 'telegram_post';

    const newsPostsList: TelegramNewsPreview[] =
      msg.groupSummary?.newsPosts || (msg as any).newsPosts || [];

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
              {msg.resonanceScore && (
                <Badge
                  count={`${msg.resonanceScore}%`}
                  style={{
                    backgroundColor:
                      msg.resonanceScore > 80
                        ? '#ef4444'
                        : msg.resonanceScore > 60
                        ? '#f59e0b'
                        : '#10b981',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 'bold',
                  }}
                  title="Индекс резонанса"
                />
              )}

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

          {/* Interactive News Cards Gallery (Only in direct curator threads) */}
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
                        resonanceScore: post.resonanceScore,
                      })
                  : undefined
              }
            />
          )}

          {/* Resonance Nodes Candidates */}
          {msg.resonanceNodes && msg.resonanceNodes.length > 0 && (
            <div className="mt-3 pt-2 border-t border-white/5 space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <span>⚡ Точки кросс-контурного резонанса:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {msg.resonanceNodes.map((node: ResonanceNodeCandidate) => (
                  <Tooltip key={node.id} title={node.reasoning}>
                    <button
                      onClick={() => onTriggerSynthesis(node)}
                      className="bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-left"
                    >
                      <span className="font-semibold">{node.title}</span>
                      <span className="bg-amber-500/20 px-1 rounded text-[9px] font-mono">
                        {node.resonanceScore}%
                      </span>
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}

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
                            resonanceScore: msg.resonanceScore || 85,
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
                            resonanceScore: msg.resonanceScore,
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
    prev.msg.resonanceScore === next.msg.resonanceScore &&
    (prev.msg as any).isOptimistic === (next.msg as any).isOptimistic &&
    prev.msg.groupSummary === next.msg.groupSummary &&
    (prev.msg as any).newsPosts === (next.msg as any).newsPosts &&
    prev.msg.resonanceNodes === next.msg.resonanceNodes
);

ChatMessageItem.displayName = 'ChatMessageItem';
