// ==================== ЕДИНЫЙ ИСТОЧНИК МАППИНГОВ МЕСЯЦЕВ ====================
// Раньше MONTH_RU_TO_NUM дублировался в трёх файлах (salesData.ts,
// SharedDataContext.tsx, GlobalFiltersContext.tsx). Любое изменение
// формата месяца в API требовало правок в трёх местах.

/** Полные и короткие русские названия месяцев → номер 1-12. */
export const MONTH_RU_TO_NUM: Record<string, number> = {
  'Янв': 1, 'Фев': 2, 'Мар': 3, 'Апр': 4, 'Май': 5, 'Июн': 6,
  'Июл': 7, 'Авг': 8, 'Сен': 9, 'Окт': 10, 'Ноя': 11, 'Дек': 12,
  'Январь': 1, 'Февраль': 2, 'Март': 3, 'Апрель': 4, 'Июнь': 6,
  'Июль': 7, 'Август': 8, 'Сентябрь': 9, 'Октябрь': 10, 'Ноябрь': 11, 'Декабрь': 12,
};

/** Номер месяца 1-12 → полное русское название. */
export const MONTH_NUM_TO_RU: Record<number, string> = {
  1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель', 5: 'Май', 6: 'Июнь',
  7: 'Июль', 8: 'Август', 9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь',
};

/** Номер месяца 1-12 → короткое русское название. */
export const MONTH_NUM_TO_SHORT: Record<number, string> = {
  1: 'Янв', 2: 'Фев', 3: 'Мар', 4: 'Апр', 5: 'Май', 6: 'Июн',
  7: 'Июл', 8: 'Авг', 9: 'Сен', 10: 'Окт', 11: 'Ноя', 12: 'Дек',
};

/**
 * Преобразовать любое представление месяца в число 1-12.
 * Принимает: число, русскую строку ("Мар"/"Март"), строковое число ("3").
 * Возвращает undefined для невалидных значений.
 */
export function toMonthNum(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 1 && value <= 12 ? value : undefined;
  }
  if (typeof value === 'string') {
    if (MONTH_RU_TO_NUM[value] != null) return MONTH_RU_TO_NUM[value];
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 12) return parsed;
  }
  return undefined;
}
