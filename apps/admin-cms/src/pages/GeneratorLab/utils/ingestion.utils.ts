import { ProcessingStatus } from '@lenta/shared';

export function formatBytes(bytes?: number | null): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getStatusConfig(status: ProcessingStatus | string): {
  color: string;
  label: string;
  bgClass: string;
  textClass: string;
  iconName: string;
} {
  switch (status) {
    case 'COMPLETED':
      return {
        color: 'success',
        label: 'Готово',
        bgClass: 'bg-emerald-500/10 border-emerald-500/30',
        textClass: 'text-emerald-400',
        iconName: 'check_circle',
      };
    case 'PROCESSING':
      return {
        color: 'processing',
        label: 'Обработка...',
        bgClass: 'bg-amber-500/10 border-amber-500/30',
        textClass: 'text-amber-400',
        iconName: 'sync',
      };
    case 'PENDING':
      return {
        color: 'warning',
        label: 'Ожидание',
        bgClass: 'bg-blue-500/10 border-blue-500/30',
        textClass: 'text-blue-400',
        iconName: 'schedule',
      };
    case 'FAILED':
      return {
        color: 'error',
        label: 'Ошибка',
        bgClass: 'bg-rose-500/10 border-rose-500/30',
        textClass: 'text-rose-400',
        iconName: 'error',
      };
    default:
      return {
        color: 'default',
        label: String(status),
        bgClass: 'bg-white/5 border-white/10',
        textClass: 'text-on-surface-variant',
        iconName: 'help_outline',
      };
  }
}
