// ==================== КОНТЕКСТ УПРАВЛЕНИЯ ДАТАМИ ====================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface DateSettings {
  currentYear: number;
  currentMonth: number; // 0-11 (январь = 0)
  previousYear: number;
  yearBeforePrevious: number;
  nextYear: number;
}

interface DateContextType {
  dateSettings: DateSettings;
  updateCurrentYear: (year: number) => void;
  updateCurrentMonth: (month: number) => void;
  resetToRealDate: () => void;
  applyToAllRoles: () => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

// Получение реальной даты
const getRealDate = (): DateSettings => {
  const now = new Date();
  const currentYear = now.getFullYear();
  return {
    currentYear,
    currentMonth: now.getMonth(),
    previousYear: currentYear - 1,
    yearBeforePrevious: currentYear - 2,
    nextYear: currentYear + 1,
  };
};

// Загрузка сохраненных настроек из localStorage
const loadDateSettings = (): DateSettings => {
  try {
    const saved = localStorage.getItem('dateSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        currentYear: parsed.currentYear,
        currentMonth: parsed.currentMonth,
        previousYear: parsed.currentYear - 1,
        yearBeforePrevious: parsed.currentYear - 2,
        nextYear: parsed.currentYear + 1,
      };
    }
  } catch (error) {
    console.error('Ошибка загрузки настроек дат:', error);
  }
  return getRealDate();
};

export const DateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  console.log('🔵 DateProvider: Mounting...');
  const [dateSettings, setDateSettings] = useState<DateSettings>(loadDateSettings);

  // Сохранение в localStorage при изменении
  useEffect(() => {
    const toSave = {
      currentYear: dateSettings.currentYear,
      currentMonth: dateSettings.currentMonth,
    };
    localStorage.setItem('dateSettings', JSON.stringify(toSave));

    // Логирование изменений для отладки
    console.log('📅 Обновлены настройки дат:', dateSettings);
  }, [dateSettings]);

  const updateCurrentYear = (year: number) => {
    setDateSettings({
      currentYear: year,
      currentMonth: dateSettings.currentMonth,
      previousYear: year - 1,
      yearBeforePrevious: year - 2,
      nextYear: year + 1,
    });
  };

  const updateCurrentMonth = (month: number) => {
    setDateSettings({
      ...dateSettings,
      currentMonth: month,
    });
  };

  const resetToRealDate = () => {
    setDateSettings(getRealDate());
  };

  const applyToAllRoles = () => {
    // Принудительное сохранение и обновление для всех компонентов
    const toSave = {
      currentYear: dateSettings.currentYear,
      currentMonth: dateSettings.currentMonth,
      appliedAt: new Date().toISOString(),
    };
    localStorage.setItem('dateSettings', JSON.stringify(toSave));

    // Создаем событие для оповещения всех компонентов
    window.dispatchEvent(new CustomEvent('dateSettingsUpdated', { detail: dateSettings }));

    console.log('✅ Настройки дат применены ко всем ролям:', dateSettings);
  };

  return (
    <DateContext.Provider
      value={{
        dateSettings,
        updateCurrentYear,
        updateCurrentMonth,
        resetToRealDate,
        applyToAllRoles,
      }}
    >
      {children}
    </DateContext.Provider>
  );
};

// Хук для использования контекста
export const useDateContext = (): DateContextType => {
  const context = useContext(DateContext);
  if (!context) {
    // Безопасный fallback — не бросаем ошибку, возвращаем значения по умолчанию
    return {
      dateSettings: getRealDate(),
      updateCurrentYear: () => {},
      updateCurrentMonth: () => {},
      resetToRealDate: () => {},
      applyToAllRoles: () => {},
    };
  }
  return context;
};

// Экспорт для совместимости со старым кодом
export const getDateSettings = (): DateSettings => {
  try {
    const saved = localStorage.getItem('dateSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        currentYear: parsed.currentYear,
        currentMonth: parsed.currentMonth,
        previousYear: parsed.currentYear - 1,
        yearBeforePrevious: parsed.currentYear - 2,
        nextYear: parsed.currentYear + 1,
      };
    }
  } catch (error) {
    console.error('Ошибка загрузки настроек дат:', error);
  }
  return getRealDate();
};
