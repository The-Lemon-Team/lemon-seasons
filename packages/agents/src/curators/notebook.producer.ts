import { NoteType } from '@lenta/shared';
import { ChatMessage, DailyNewsCard } from '../types';

export interface NotebookProducerContext {
  prompt: string;
  date: string;
  stories: DailyNewsCard[];
  timestamp: string;
}

export function generateNotebookProducerResponse(ctx: NotebookProducerContext): ChatMessage {
  const text = `### 📓 Режиссер NotebookLM: Фоновая генерация дневника

Задача на создание дневника принята в конвейер фоновой обработки!

**Пайплайн создания NotebookLM:**
1. **Сборка источников**: Упаковка выбранных статей и ссылок Super Note в единый Markdown Source Bundle (~15–20 сек).
2. **Индексация в ядре NotebookLM**: Анализ связей и подготовка тезисов (~30 сек).
3. **Генерация 2-Host аудио-диалога**: Deep Dive Audio Overview (~160 сек).
4. **Асинхронный коллбэк**: Автоматическое обновление целевой Note с прикрепленным плеером и стенограммой.

⏱️ **Расчетное время готовности (Smart ETA):** ~**3 мин 30 сек** (210 сек).

> *Вы перенаправлены на созданную целевую Note. Она создается в фоне — вы можете свободно отвлечься, страница обновится автоматически по готовности.*`;

  const suggestedCard = {
    title: `🎙️ NotebookLM Дневник: IT & Своя кухня (${ctx.date})`,
    description: `# 🎙️ NotebookLM Дневник: IT & Своя кухня (${ctx.date})

> ⏳ **Статус:** Генерация дневника в процессе...  
> ⏱️ **Расчетное время (ETA):** ~3 мин 30 сек  
> 🔗 **Родительская задача:** Super Note по материалам Habr & Хакер

---
*Дневник создается в фоне агентом notebook-producer. После завершения сюда будет прикреплен аудиоплеер и стенограмма.*`,
    type: NoteType.DONE,
    folder: 'Podcasts',
    taxonomyPath: 'media.podcast.notebooklm',
    hashtags: ['NotebookLM', 'Дневник', 'АудиоДайджест', 'Habr', 'Хакер'],
    curator: 'Герман «Кернел»',
  };

  return {
    id: `msg-notebook-${Date.now()}`,
    sender: 'notebook-producer',
    senderName: 'Режиссер NotebookLM',
    senderRole: 'Агент создания дневников и подкастов NotebookLM',
    avatar: '📓',
    text,
    timestamp: ctx.timestamp,
    sources: ['NotebookLM Engine', 'Google Gemini'],
    suggestedCard,
  };
}
