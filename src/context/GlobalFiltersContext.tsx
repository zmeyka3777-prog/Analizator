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

export type Metric = 'rubles' | 'packages';

export const MONTH_NUM_TO_RU: Record<number, string> = {
  1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель', 5: 'Май', 6: 'Июнь',
  7: 'Июль', 8: 'Август', 9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь',
};

export const MONTH_SHORT_TO_NUM: Record<string, number> = {
  'Янв': 1, 'Фев': 2, 'Мар': 3, 'Апр': 4, 'Май': 5, 'Июн': 6,
  'Июл': 7, 'Авг': 8, 'Сен': 9, 'Окт': 10, 'Ноя': 11, 'Дек': 12,
};

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
    if (month == null) return false;
    let num: number;
    if (typeof month === 'number') num = month;
    else if (typeof month === 'string') num = MONTH_SHORT_TO_NUM[month] ?? parseInt(month, 10);
    else return false;
    if (!Number.isFinite(num) || num < 1 || num > 12) return false;
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
