import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, Edit3, Columns, Sparkles } from 'lucide-react';
import { HashtagBadge } from './HashtagBadge';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  label?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = '# Start typing Markdown content...',
  minHeight = 160,
  label = 'Description',
}) => {
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');

  const renderWithHashtags = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === 'string') {
      const parts = children.split(/(#[a-zA-Z0-9_\-]+)/g);
      if (parts.length === 1) return children;
      return parts.map((part, i) => {
        if (part.startsWith('#') && part.length > 1) {
          const tagName = part.slice(1);
          return (
            <HashtagBadge
              key={i}
              name={tagName}
              size="xs"
              clickable
              className="mx-0.5 inline-flex align-middle"
            />
          );
        }
        return part;
      });
    }
    if (Array.isArray(children)) {
      return React.Children.map(children, (child) => renderWithHashtags(child));
    }
    return children;
  };

  const markdownComponents = {
    p: ({ children }: any) => <p className="mb-2 leading-relaxed">{renderWithHashtags(children)}</p>,
    li: ({ children }: any) => <li className="my-0.5">{renderWithHashtags(children)}</li>,
  };

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="block font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
            {label}
          </label>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-outline bg-surface-container-lowest px-2 py-0.5 rounded border border-white/5">
            <Sparkles className="w-3 h-3 text-primary" /> Markdown Supported
          </span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-surface-container-low border border-white/10 rounded p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${
              viewMode === 'edit'
                ? 'bg-primary text-on-primary font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            title="Raw Markdown Editor"
          >
            <Edit3 className="w-3 h-3" /> Edit
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors hidden sm:flex ${
              viewMode === 'split'
                ? 'bg-primary text-on-primary font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            title="Split Editor & Live Preview"
          >
            <Columns className="w-3 h-3" /> Split
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${
              viewMode === 'preview'
                ? 'bg-primary text-on-primary font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            title="Rendered HTML Preview"
          >
            <Eye className="w-3 h-3" /> Preview
          </button>
        </div>
      </div>

      <div
        className={`rounded-lg border border-white/10 bg-surface-container-lowest overflow-hidden transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40`}
      >
        {viewMode === 'edit' && (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={6}
            style={{ minHeight: `${minHeight}px` }}
            className="w-full bg-transparent border-none py-3 px-3 text-on-surface font-mono text-[13px] leading-relaxed placeholder:text-outline/60 focus:ring-0 focus:outline-none resize-y"
          />
        )}

        {viewMode === 'preview' && (
          <div
            style={{ minHeight: `${minHeight}px` }}
            className="p-4 markdown-body text-sm font-sans overflow-y-auto max-h-[400px]"
          >
            {value.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {value}
              </ReactMarkdown>
            ) : (
              <span className="text-outline-variant italic">No markdown content written yet.</span>
            )}
          </div>
        )}

        {viewMode === 'split' && (
          <div className="grid grid-cols-2 divide-x divide-white/10" style={{ minHeight: `${minHeight}px` }}>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent border-none py-3 px-3 text-on-surface font-mono text-[13px] leading-relaxed placeholder:text-outline/60 focus:ring-0 focus:outline-none resize-none"
            />
            <div className="p-3 markdown-body text-sm font-sans overflow-y-auto max-h-[350px] bg-surface-container-low/50">
              {value.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {value}
                </ReactMarkdown>
              ) : (
                <span className="text-outline-variant text-xs italic">Live preview updates here...</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
