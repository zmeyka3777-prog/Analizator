// ==================== ГЛОБАЛЬНЫЕ КОНТРОЛЫ ФИЛЬТРОВ ====================
// Два контрола, общие для всех ролей и страниц:
//   1. Multi-select по месяцам (12 чекбоксов) — сужает агрегацию данных
//   2. Toggle "Рубли / Упаковки" — переключает метрику отображения
//
// Состояние живёт в GlobalFiltersContext; этот компонент только рисует UI
// и зовёт setters. Используется в верхней шапке App.tsx (MDLP UI) и в
// AppLayout (директорская навигация).

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Banknote, Package, ChevronDown, Check } from 'lucide-react';
import { useGlobalFilters, MONTH_NUM_TO_RU } from '@/context/GlobalFiltersContext';

interface Props {
  /** Светлая тема (для AppLayout директора) или тёмная (опционально) */
  variant?: 'light' | 'dark';
  /** Компактный режим — без подписей, только иконки */
  compact?: boolean;
}

export function GlobalFilterControls({ variant = 'light', compact = false }: Props) {
  const { selectedMonths, toggleMonth, setSelectedMonths, metric, setMetric } = useGlobalFilters();
  const [monthsOpen, setMonthsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закрытие dropdown при клике вне
  useEffect(() => {
    if (!monthsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMonthsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [monthsOpen]);

  // Семантически разные состояния:
  //   - пустой массив = "Без фильтра" (фильтр выключен)
  //   - 12 выбранных = "Все месяцы" (фильтр включён, отмечены все)
  //   - 1 = название месяца
  //   - 2-11 = "N мес."
  const monthsLabel = selectedMonths.length === 0
    ? 'Без фильтра'
    : selectedMonths.length === 12
      ? 'Все месяцы'
      : selectedMonths.length === 1
        ? MONTH_NUM_TO_RU[selectedMonths[0]]
        : `${selectedMonths.length} мес.`;

  const baseBtn = variant === 'dark'
    ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div className="flex items-center gap-2">
      {/* Месяцы — multi-select dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setMonthsOpen(o => !o)}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm rounded-lg border transition-all ${baseBtn}`}
        >
          <Calendar size={14} className="text-cyan-600" />
          {!compact && <span>{monthsLabel}</span>}
          {selectedMonths.length > 0 && selectedMonths.length < 12 && (
            <span className="ml-1 bg-cyan-500 text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {selectedMonths.length}
            </span>
          )}
          <ChevronDown size={14} className="text-slate-400" />
        </button>

        {monthsOpen && (
          <div className="absolute right-0 sm:left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl min-w-[200px] p-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100 mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">Месяцы</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedMonths(Array.from({ length: 12 }, (_, i) => i + 1))}
                  className="text-[10px] text-cyan-600 hover:text-cyan-800 px-1.5 py-0.5"
                >
                  Все
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMonths([])}
                  className="text-[10px] text-slate-500 hover:text-slate-700 px-1.5 py-0.5"
                >
                  Сбросить
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-0.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                const isSelected = selectedMonths.length === 0 || selectedMonths.includes(m);
                return (
                  <button
                    type="button"
                    key={m}
                    onClick={() => toggleMonth(m)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                      isSelected ? 'bg-cyan-50 text-cyan-800' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedMonths.includes(m) ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300'
                    }`}>
                      {selectedMonths.includes(m) && <Check size={12} className="text-white" />}
                    </span>
                    <span>{MONTH_NUM_TO_RU[m]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Toggle Рубли / Упаковки */}
      <div className={`inline-flex rounded-lg border overflow-hidden ${variant === 'dark' ? 'border-white/20' : 'border-slate-200'}`}>
        <button
          type="button"
          onClick={() => setMetric('rubles')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm transition-colors ${
            metric === 'rubles'
              ? 'bg-emerald-500 text-white'
              : variant === 'dark'
                ? 'bg-transparent text-white/70 hover:bg-white/10'
                : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
          title="Показывать суммы в рублях"
        >
          <Banknote size={14} />
          {!compact && <span>Рубли</span>}
        </button>
        <button
          type="button"
          onClick={() => setMetric('packages')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm transition-colors ${
            metric === 'packages'
              ? 'bg-blue-500 text-white'
              : variant === 'dark'
                ? 'bg-transparent text-white/70 hover:bg-white/10'
                : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
          title="Показывать количество упаковок"
        >
          <Package size={14} />
          {!compact && <span>Упаковки</span>}
        </button>
      </div>
    </div>
  );
}
