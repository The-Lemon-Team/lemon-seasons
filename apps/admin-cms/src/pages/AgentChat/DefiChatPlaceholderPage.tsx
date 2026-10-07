import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Bot, FileText, Sparkles, Database, Layers, ArrowRight } from 'lucide-react';
import { useAdminI18n } from '../../i18n';

export const DefiChatPlaceholderPage: React.FC = () => {
  const { t } = useAdminI18n();
  const navigate = useNavigate();
  const defiChatUrl = 'http://localhost:3000';

  return (
    <div className="h-full w-full overflow-y-auto bg-background text-on-surface p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Hero */}
        <div className="bg-gradient-to-br from-surface-container-high to-surface-container border border-white/10 rounded-2xl p-8 relative overflow-hidden shadow-xl">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <Bot size={280} className="text-primary" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Инфраструктурное разделение сервисов
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface mb-3">
            AI-чаты перенесены в проект <span className="text-primary">Defi Local Hosted</span>
          </h1>

          <p className="text-on-surface-variant text-base leading-relaxed max-w-2xl">
            Интерактивные диалоги, ролевые кураторы и встраиваемые чат-боты теперь изолированно развиваются
            в специализированном проекте Defi. В Lemon Calendarium сосредоточена работа с контентом,
            хронологическими заметками и автоматической синхронизацией новостей.
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <a
              href={defiChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-sm hover:brightness-110 transition shadow-md group"
            >
              <Bot className="w-4 h-4" />
              <span>Открыть Defi Chat ({defiChatUrl})</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>

            <button
              onClick={() => navigate('/notes')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-container-highest hover:bg-white/10 text-on-surface font-medium text-sm transition border border-white/10"
            >
              <FileText className="w-4 h-4 text-primary" />
              <span>Смотреть сохраненные заметки</span>
            </button>
          </div>
        </div>

        {/* Responsibility Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Defi Chat Scope */}
          <div className="bg-surface-container border border-white/5 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-on-surface">Defi Local Hosted</h3>
                <p className="text-xs text-on-surface-variant font-mono">Интерактивный диалоговый контур</p>
              </div>
            </div>

            <ul className="text-sm text-on-surface-variant space-y-2.5">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Мульти-агентные диалоги и узкоспециализированные кураторы</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Генерация обсуждений, дебаты и интервьюирование</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Встраиваемые (embeddable) виджеты чата для внешних систем</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Экспорт готовых инсайтов в Lemon Calendarium через Ingestion API</span>
              </li>
            </ul>
          </div>

          {/* Lemon Calendarium Scope */}
          <div className="bg-surface-container border border-white/5 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-on-surface">Lemon Calendarium</h3>
                <p className="text-xs text-on-surface-variant font-mono">Ядро контента & Chrono-Hub</p>
              </div>
            </div>

            <ul className="text-sm text-on-surface-variant space-y-2.5">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Хранение структурированных заметок (Notes) в PostgreSQL</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Мониторинг папки на Google Drive и авто-создание заметок из файлов</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Фоновый утилитарный AI (NER, авто-тегирование, датирование)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Хронологические таймлайны, календарные сетки и таксономия</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="bg-surface-container-low border border-white/5 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-semibold text-on-surface flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Генератор контента и событий</span>
            </h4>
            <p className="text-xs text-on-surface-variant">
              Создавайте календарные события, праздники и релизы фильмов через встроенную лабораторию генераторов.
            </p>
          </div>

          <button
            onClick={() => navigate('/generators')}
            className="px-4 py-2 rounded-lg bg-surface-container-highest hover:bg-primary hover:text-on-primary text-on-surface text-sm font-medium transition inline-flex items-center gap-2 shrink-0 border border-white/10"
          >
            <span>В лабораторию</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DefiChatPlaceholderPage;
