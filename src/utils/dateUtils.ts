// ==================== УТИЛИТЫ ДЛЯ РАБОТЫ С ДАТАМИ И ГОДАМИ ====================

import { getDateSettings } from '@/contexts/DateContext';

/**
 * Получить настройки дат из контекста или localStorage
 */
const getSettings = () => {
  return getDateSettings();
};

/**
 * Получить текущий год (из настроек администратора или реальный)
 */
export const CURRENT_YEAR = getSettings().currentYear;

/**
 * Предыдущий год (для исторических данных)
 */
export const PREVIOUS_YEAR = getSettings().previousYear;

/**
 * Год до предыдущего (для сравнения)
 */
export const YEAR_BEFORE_PREVIOUS = getSettings().yearBeforePrevious;

/**
 * Следующий год (для прогнозов)
 */
export const NEXT_YEAR = getSettings().nextYear;

/**
 * Получить текущий месяц (0-11) из настроек
 */
export const getCurrentMonth = (): number => {
  return getSettings().currentMonth;
};

/**
 * Получить актуальные значения годов (используется в компонентах)
 */
export const getYears = () => {
  const settings = getSettings();
  return {
    current: settings.currentYear,
    previous: settings.previousYear,
    yearBeforePrevious: settings.yearBeforePrevious,
    next: settings.nextYear,
  };
};

/**
 * Получить текущую дату в формате DD.MM.YYYY
 */
export const getCurrentDate = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = getSettings().currentYear;
  return `${day}.${month}.${year}`;
};

/**
 * Проверить, является ли месяц текущим или прошедшим в текущем году
 */
export const isMonthPast = (month: number, year?: number): boolean => {
  const settings = getSettings();
  const checkYear = year ?? settings.currentYear;

  if (checkYear < settings.currentYear) return true;
  if (checkYear > settings.currentYear) return false;
  return month <= settings.currentMonth;
};

/**
 * Названия месяцев
 */
export const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

/**
 * Получить название месяца по индексу (0-11)
 */
export const getMonthName = (monthIndex: number): string => {
  return MONTH_NAMES[monthIndex] || 'Неизвестно';
};
