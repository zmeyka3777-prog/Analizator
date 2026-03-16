import React from 'react';
import { FileUp, Database, BarChart3, Info } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'upload' | 'database' | 'chart' | 'info';
  title?: string;
  description?: string;
  compact?: boolean;
}

const ICONS = {
  upload: FileUp,
  database: Database,
  chart: BarChart3,
  info: Info,
};

export function EmptyState({
  icon = 'upload',
  title = 'Нет данных',
  description = 'Загрузите файл MDLP для отображения аналитики',
  compact = false,
}: EmptyStateProps) {
  const Icon = ICONS[icon];

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-6 px-4 text-gray-400">
        <Icon className="h-5 w-5 shrink-0 opacity-50" />
        <span className="text-sm">{title}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm">{description}</p>
    </div>
  );
}

/** Небольшой баннер-подсказка для размещения вверху страницы */
export function NoDataBanner({ message = 'Данные не загружены. Загрузите файл MDLP для отображения аналитики.' }: { message?: string }) {
  return (
    <div className="wm-card flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
      <Info className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
