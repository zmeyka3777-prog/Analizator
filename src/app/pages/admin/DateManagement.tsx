// ==================== УПРАВЛЕНИЕ ДАТАМИ И ПЕРИОДАМИ ====================

import React, { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '@/utils/storage';
import { Button } from '@/app/components/ui/button';
import {
  CalendarDays,
  Clock,
  Settings2,
  Check,
  RotateCcw,
  Info,
} from 'lucide-react';

export interface DateSettings {
  currentMonth: number; // 1-12
  currentYear: number;
  fiscalYearStart: number; // Месяц начала финансового года (1-12)
  dataStartYear: number; // Год начала доступных данных
  dataEndYear: number; // Год конца доступных данных
  autoUpdateMonth: boolean; // Автоматически обновлять текущий месяц
  displayFormat: 'dd.mm.yyyy' | 'yyyy-mm-dd' | 'mm/dd/yyyy';
  uploadedMonths: UploadedMonth[];
}

export interface UploadedMonth {
  year: number;
  month: number;
  uploadedAt: string;
  recordCount: number;
  status: 'complete' | 'partial' | 'error';
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const DEFAULT_SETTINGS: DateSettings = {
  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear(),
  fiscalYearStart: 1,
  dataStartYear: 2024,
  dataEndYear: 2026,
  autoUpdateMonth: true,
  displayFormat: 'dd.mm.yyyy',
  uploadedMonths: [],
};

export default function DateManagement() {
  const [settings, setSettings] = useState<DateSettings>(() =>
    loadFromStorage<DateSettings>(STORAGE_KEYS.DATE_SETTINGS, DEFAULT_SETTINGS)
  );
  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = <K extends keyof DateSettings>(key: K, value: DateSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = () => {
    saveToStorage(STORAGE_KEYS.DATE_SETTINGS, settings);
    setHasChanges(false);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
  };

  const uploadedMonths = loadFromStorage<UploadedMonth[]>(STORAGE_KEYS.UPLOADED_MONTHS, []);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Управление датами</h2>
          <p className="text-sm text-slate-500 mt-1">
            Настройка периодов, форматов дат и загруженных месяцев
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full animate-pulse">
              Есть несохранённые изменения
            </span>
          )}
          <Button
            variant="outline"
            onClick={resetSettings}
            className="rounded-xl text-sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Сбросить
          </Button>
          <Button
            onClick={saveSettings}
            disabled={!hasChanges}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl"
          >
            <Check className="w-4 h-4 mr-2" />
            Сохранить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Текущий период */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-cyan-600" />
            <h3 className="text-sm font-semibold text-slate-700">Текущий период</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Текущий месяц</label>
              <select
                value={settings.currentMonth}
                onChange={e => updateSetting('currentMonth', parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Текущий год</label>
              <input
                type="number"
                min={2020}
                max={2035}
                value={settings.currentYear}
                onChange={e => updateSetting('currentYear', parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">Автообновление месяца</span>
              </div>
              <button
                onClick={() => updateSetting('autoUpdateMonth', !settings.autoUpdateMonth)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.autoUpdateMonth ? 'bg-cyan-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    settings.autoUpdateMonth ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Настройки периодов */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="w-5 h-5 text-cyan-600" />
            <h3 className="text-sm font-semibold text-slate-700">Настройки периодов</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Начало финансового года</label>
              <select
                value={settings.fiscalYearStart}
                onChange={e => updateSetting('fiscalYearStart', parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Данные с года</label>
                <input
                  type="number"
                  min={2020}
                  max={2035}
                  value={settings.dataStartYear}
                  onChange={e => updateSetting('dataStartYear', parseInt(e.target.value, 10))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Данные по год</label>
                <input
                  type="number"
                  min={2020}
                  max={2035}
                  value={settings.dataEndYear}
                  onChange={e => updateSetting('dataEndYear', parseInt(e.target.value, 10))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Формат отображения дат</label>
              <select
                value={settings.displayFormat}
                onChange={e => updateSetting('displayFormat', e.target.value as DateSettings['displayFormat'])}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
              >
                <option value="dd.mm.yyyy">ДД.ММ.ГГГГ (25.03.2026)</option>
                <option value="yyyy-mm-dd">ГГГГ-ММ-ДД (2026-03-25)</option>
                <option value="mm/dd/yyyy">ММ/ДД/ГГГГ (03/25/2026)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Загруженные месяцы */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-cyan-600" />
          <h3 className="text-sm font-semibold text-slate-700">Загруженные месяцы данных</h3>
        </div>

        {uploadedMonths.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {uploadedMonths.map((um, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-center ${
                  um.status === 'complete'
                    ? 'border-green-200 bg-green-50'
                    : um.status === 'partial'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <p className="text-xs font-medium text-slate-500">{um.year}</p>
                <p className="text-sm font-bold text-slate-800">{MONTH_NAMES[um.month - 1]}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {um.recordCount.toLocaleString('ru-RU')} записей
                </p>
                <div className={`mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full inline-block ${
                  um.status === 'complete'
                    ? 'bg-green-100 text-green-700'
                    : um.status === 'partial'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {um.status === 'complete' ? 'Полные' : um.status === 'partial' ? 'Частичные' : 'Ошибка'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Info className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Данные ещё не загружены</p>
            <p className="text-xs text-slate-400 mt-1">
              Загрузите CSV/Excel файлы через раздел "Данные" для заполнения месяцев
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
