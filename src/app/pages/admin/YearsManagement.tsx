// ==================== УПРАВЛЕНИЕ ГОДАМИ ====================

import React, { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '@/utils/storage';
import { Button } from '@/app/components/ui/button';
import {
  Calendar,
  Plus,
  Trash2,
  Check,
  X,
  Edit2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

export interface YearConfig {
  year: number;
  label: string;
  isActive: boolean;
  isCurrent: boolean;
  createdAt: string;
}

const DEFAULT_YEARS: YearConfig[] = [
  { year: 2024, label: '2024', isActive: true, isCurrent: false, createdAt: '2024-01-01T00:00:00.000Z' },
  { year: 2025, label: '2025', isActive: true, isCurrent: false, createdAt: '2025-01-01T00:00:00.000Z' },
  { year: 2026, label: '2026', isActive: true, isCurrent: true, createdAt: '2026-01-01T00:00:00.000Z' },
];

export default function YearsManagement() {
  const [years, setYears] = useState<YearConfig[]>(() =>
    loadFromStorage<YearConfig[]>(STORAGE_KEYS.YEARS, DEFAULT_YEARS)
  );
  const [newYear, setNewYear] = useState<string>('');
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState<string>('');

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.YEARS, years);
  }, [years]);

  const addYear = () => {
    const yearNum = parseInt(newYear, 10);
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2035) return;
    if (years.some(y => y.year === yearNum)) return;

    const newConfig: YearConfig = {
      year: yearNum,
      label: String(yearNum),
      isActive: true,
      isCurrent: false,
      createdAt: new Date().toISOString(),
    };

    setYears(prev => [...prev, newConfig].sort((a, b) => a.year - b.year));
    setNewYear('');
  };

  const toggleActive = (year: number) => {
    setYears(prev =>
      prev.map(y => (y.year === year ? { ...y, isActive: !y.isActive } : y))
    );
  };

  const setCurrent = (year: number) => {
    setYears(prev =>
      prev.map(y => ({ ...y, isCurrent: y.year === year }))
    );
  };

  const removeYear = (year: number) => {
    if (years.find(y => y.year === year)?.isCurrent) return;
    setYears(prev => prev.filter(y => y.year !== year));
  };

  const startEdit = (year: number) => {
    const config = years.find(y => y.year === year);
    if (config) {
      setEditingYear(year);
      setEditLabel(config.label);
    }
  };

  const saveEdit = () => {
    if (editingYear === null) return;
    setYears(prev =>
      prev.map(y => (y.year === editingYear ? { ...y, label: editLabel } : y))
    );
    setEditingYear(null);
    setEditLabel('');
  };

  const cancelEdit = () => {
    setEditingYear(null);
    setEditLabel('');
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Управление годами</h2>
          <p className="text-sm text-slate-500 mt-1">
            Настройка доступных годов для аналитики и отчётов
          </p>
        </div>
        <div className="flex items-center gap-2 bg-cyan-50 px-3 py-1.5 rounded-lg">
          <Calendar className="w-4 h-4 text-cyan-600" />
          <span className="text-sm font-medium text-cyan-700">
            Всего: {years.length} | Активных: {years.filter(y => y.isActive).length}
          </span>
        </div>
      </div>

      {/* Добавление года */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Добавить год</h3>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={2020}
            max={2035}
            value={newYear}
            onChange={e => setNewYear(e.target.value)}
            placeholder="Например, 2027"
            className="flex-1 max-w-[200px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
            onKeyDown={e => e.key === 'Enter' && addYear()}
          />
          <Button
            onClick={addYear}
            disabled={!newYear || years.some(y => y.year === parseInt(newYear, 10))}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl px-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </Button>
        </div>
      </div>

      {/* Список годов */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Настроенные годы</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {years.map(yearConfig => (
            <div
              key={yearConfig.year}
              className={`flex items-center justify-between px-6 py-4 transition-colors ${
                !yearConfig.isActive ? 'opacity-50 bg-slate-50' : 'hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                    yearConfig.isCurrent
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                      : yearConfig.isActive
                      ? 'bg-cyan-50 text-cyan-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {String(yearConfig.year).slice(-2)}
                </div>
                <div>
                  {editingYear === yearConfig.year ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-cyan-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <button onClick={saveEdit} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold text-slate-800">{yearConfig.label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {yearConfig.isCurrent && (
                          <span className="text-[10px] font-medium bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">
                            Текущий год
                          </span>
                        )}
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          yearConfig.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {yearConfig.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(yearConfig.year)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Редактировать"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleActive(yearConfig.year)}
                  className={`p-2 rounded-lg transition-colors ${
                    yearConfig.isActive
                      ? 'hover:bg-amber-50 text-amber-500'
                      : 'hover:bg-green-50 text-green-500'
                  }`}
                  title={yearConfig.isActive ? 'Деактивировать' : 'Активировать'}
                >
                  {yearConfig.isActive ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
                {!yearConfig.isCurrent && (
                  <button
                    onClick={() => setCurrent(yearConfig.year)}
                    className="p-2 rounded-lg hover:bg-cyan-50 text-slate-400 hover:text-cyan-600 transition-colors"
                    title="Назначить текущим"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => removeYear(yearConfig.year)}
                  disabled={yearConfig.isCurrent}
                  className={`p-2 rounded-lg transition-colors ${
                    yearConfig.isCurrent
                      ? 'text-slate-200 cursor-not-allowed'
                      : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                  }`}
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {years.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Нет настроенных годов</p>
            <p className="text-xs text-slate-400 mt-1">Добавьте первый год для начала работы</p>
          </div>
        )}
      </div>
    </div>
  );
}
