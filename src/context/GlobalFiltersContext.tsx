// ==================== ГЛОБАЛЬНЫЕ ФИЛЬТРЫ ====================
// Хранит сквозные фильтры (месяцы + метрика рубли/упаковки), которые
// применяются ко всем дашбордам — директора, менеджера, ТМ, медпреда и admin.
// Подписан в main.tsx обёрткой <GlobalFiltersProvider>.
//
// Использование:
//   const { selectedMonths, setSelectedMonths, metric, setMetric, isMonthSelected }
//     = useGlobalFilters();
//
//   if (isMonthSelected(record.month)) { ... }
//   const value = metric === 'rubles' ? record.revenue : record.units;

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { MONTH_NUM_TO_RU, toMonthNum } from '@/utils/months';

export type Metric = 'rubles' | 'packages';

// Реэкспорт для совместимости со старыми импортами (GlobalFilterControls).
export { MONTH_NUM_TO_RU };

interface GlobalFiltersContextType {
  /** Выбранные месяцы (1-12). Пустой массив = все месяцы. */
  selectedMonths: number[];
  setSelectedMonths: (months: number[]) => void;
  toggleMonth: (month: number) => void;
  /** Проверка: попадает ли месяц в фильтр (true если фильтр пустой). */
  isMonthSelected: (month: number | string | undefined) => boolean;
  /** Метрика отображения: рубли или упаковки. */
  metric: Metric;
  setMetric: (m: Metric) => void;
  /** Сбросить все фильтры. */
  reset: () => void;
}

const GlobalFiltersContext = createContext<GlobalFiltersContextType | undefined>(undefined);

function loadInitial(): { months: number[]; metric: Metric } {
  try {
    const raw = localStorage.getItem('globalFilters');
    if (raw) {
      const parsed = JSON.parse(raw);
      const months = Array.isArray(parsed?.months) ? parsed.months.filter((m: any) => Number.isInteger(m) && m >= 1 && m <= 12) : [];
      const metric: Metric = parsed?.metric === 'rubles' ? 'rubles' : 'packages';
      return { months, metric };
    }
  } catch { /* битый localStorage — игнор */ }
  return { months: [], metric: 'packages' };
}

export function GlobalFiltersProvider({ children }: { children: ReactNode }) {
  const initial = loadInitial();
  const [selectedMonths, setSelectedMonthsState] = useState<number[]>(initial.months);
  const [metric, setMetricState] = useState<Metric>(initial.metric);

  const persist = useCallback((months: number[], m: Metric) => {
    try {
      localStorage.setItem('globalFilters', JSON.stringify({ months, metric: m }));
    } catch { /* quota — игнор */ }
  }, []);

  const setSelectedMonths = useCallback((months: number[]) => {
    setSelectedMonthsState(months);
    persist(months, metric);
  }, [metric, persist]);

  const setMetric = useCallback((m: Metric) => {
    setMetricState(m);
    persist(selectedMonths, m);
  }, [selectedMonths, persist]);

  const toggleMonth = useCallback((month: number) => {
    setSelectedMonthsState(prev => {
      const next = prev.includes(month) ? prev.filter(x => x !== month) : [...prev, month].sort((a, b) => a - b);
      persist(next, metric);
      return next;
    });
  }, [metric, persist]);

  const isMonthSelected = useCallback((month: number | string | undefined): boolean => {
    if (selectedMonths.length === 0) return true; // фильтр пустой = все
    const num = toMonthNum(month);
    if (num == null) return false;
    return selectedMonths.includes(num);
  }, [selectedMonths]);

  const reset = useCallback(() => {
    setSelectedMonthsState([]);
    setMetricState('packages');
    try {
      localStorage.removeItem('globalFilters');
    } catch { /* quota — игнор */ }
  }, []);

  // Сбрасываем фильтры при смене пользователя — иначе фильтр одного юзера
  // подхватывается следующим, кто залогинится в том же браузере. Событие
  // 'user-changed' диспатчат обе login-формы (App.tsx и WMRussiaApp.tsx) и logout.
  useEffect(() => {
    const handler = () => reset();
    window.addEventListener('user-changed', handler);
    return () => window.removeEventListener('user-changed', handler);
  }, [reset]);

  const value = useMemo<GlobalFiltersContextType>(() => ({
    selectedMonths, setSelectedMonths, toggleMonth, isMonthSelected,
    metric, setMetric, reset,
  }), [selectedMonths, setSelectedMonths, toggleMonth, isMonthSelected, metric, setMetric, reset]);

  return (
    <GlobalFiltersContext.Provider value={value}>
      {children}
    </GlobalFiltersContext.Provider>
  );
}

export function useGlobalFilters(): GlobalFiltersContextType {
  const ctx = useContext(GlobalFiltersContext);
  if (!ctx) {
    // Безопасный fallback — компоненты могут импортироваться вне Provider в тестах.
    return {
      selectedMonths: [],
      setSelectedMonths: () => {},
      toggleMonth: () => {},
      isMonthSelected: () => true,
      metric: 'packages',
      setMetric: () => {},
      reset: () => {},
    };
  }
  return ctx;
}
