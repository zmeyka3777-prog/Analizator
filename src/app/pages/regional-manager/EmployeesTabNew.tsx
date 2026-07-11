// ==================== СОТРУДНИКИ (КАБИНЕТ РМ, РЕАЛЬНЫЕ ДАННЫЕ) ====================
// Источник: /api/admin/employees (107 реальных сотрудников из CRM xlsx),
// доступ requireMinRole('manager'). РМ видит сотрудников своих PFO-групп
// (PFO Sonin, PFO Orudjov, PFO Samadova, PFO Nechaeva) с иерархией РМ → ТМ → МП.
//
// Заменяет прежний mock-таб на data/employees.ts (Иванов/Петрова/Малина) со
// сломанными Edit/Add модалками (onSave был TODO-заглушкой). Управление
// списком сотрудников — в панели администратора; здесь read-only аналитика.
//
// «Продажи в регионах» сотрудника — честный факт из загруженной выгрузки МДЛП
// по регионам, закреплённым за ним в CRM (поле regions). Это продажи
// территории, а не персональные — делить поровну между людьми не пытаемся.

import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { adminApi } from '@/lib/api';
import { getSalesData } from '@/data/salesData';
import { useSharedData } from '@/context/SharedDataContext';
import { useGlobalFilters } from '@/context/GlobalFiltersContext';

interface CrmEmployee {
  id: number;
  employee_name: string;
  role: string;
  manager_name: string | null;
  regions: string | null;
  crm_group: string | null;
  position: string | null;
  city: string | null;
  email: string | null;
  hierarchy_level: number | null;
}

const ROLE_LABELS: Record<string, string> = {
  director: 'Директор',
  regional_manager: 'РМ', manager: 'РМ',
  territory_manager: 'ТМ', territorial_manager: 'ТМ',
  medrep: 'МП', med_rep: 'МП',
};

const ROLE_BADGES: Record<string, string> = {
  regional_manager: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  manager: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  territory_manager: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  territorial_manager: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  medrep: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  med_rep: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const isTM = (e: CrmEmployee) => e.hierarchy_level === 2 || e.role === 'territory_manager' || e.role === 'territorial_manager';
const isMP = (e: CrmEmployee) => e.hierarchy_level === 3 || e.role === 'medrep' || e.role === 'med_rep';
const isRM = (e: CrmEmployee) => e.hierarchy_level === 1 || e.role === 'regional_manager' || e.role === 'manager';

function levelIndent(e: CrmEmployee): number {
  if (isTM(e)) return 20;
  if (isMP(e)) return 40;
  return 0;
}

export function EmployeesTabNew() {
  const [employees, setEmployees] = useState<CrmEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const year = new Date().getFullYear();
  // Реактивность: после загрузки файла продажи по регионам пересчитаются.
  const { wmRussiaData } = useSharedData();
  const { selectedMonths } = useGlobalFilters();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminApi.getEmployees()
      .then(res => {
        if (cancelled) return;
        setEmployees((res.employees || []) as CrmEmployee[]);
        setError(null);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err?.message || 'Ошибка загрузки сотрудников');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [wmRussiaData]);

  // РМ ПФО видит только PFO-группы CRM.
  const pfoEmployees = useMemo(
    () => employees.filter(e => (e.crm_group || '').toUpperCase().startsWith('PFO')),
    [employees],
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return pfoEmployees;
    const q = searchQuery.toLowerCase();
    return pfoEmployees.filter(e =>
      e.employee_name.toLowerCase().includes(q) ||
      (e.crm_group || '').toLowerCase().includes(q) ||
      (e.city || '').toLowerCase().includes(q) ||
      (e.regions || '').toLowerCase().includes(q)
    );
  }, [pfoEmployees, searchQuery]);

  // Группировка по CRM-группе (PFO Sonin, PFO Orudjov, ...).
  const grouped = useMemo(() => {
    const map = new Map<string, CrmEmployee[]>();
    for (const emp of filtered) {
      const group = emp.crm_group || 'Без группы';
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(emp);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  // KPI
  const tmCount = pfoEmployees.filter(isTM).length;
  const mpCount = pfoEmployees.filter(isMP).length;
  const groupCount = new Set(pfoEmployees.map(e => e.crm_group || '')).size;

  const roleData = [
    { name: 'ТМ', value: tmCount, color: '#06b6d4' },
    { name: 'МП', value: mpCount, color: '#10b981' },
  ];

  // Факт продаж (упаковки) по регионам сотрудника из реальной выгрузки.
  // Регион из CRM матчится по точному имени территории в данных; если
  // название не совпало с выгрузкой — вклад 0 (не выдумываем).
  const salesByEmployee = useMemo(() => {
    const cache = new Map<string, number>();
    const map = new Map<number, number>();
    for (const emp of filtered) {
      if (!emp.regions) continue;
      let total = 0;
      for (const raw of emp.regions.split(',')) {
        const territory = raw.trim();
        if (!territory) continue;
        if (!cache.has(territory)) {
          const data = getSalesData({ territory, year, months: selectedMonths });
          cache.set(territory, data.reduce((s, d) => s + d.units, 0));
        }
        total += cache.get(territory) || 0;
      }
      map.set(emp.id, total);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, year, selectedMonths, wmRussiaData]);

  const toggleGroup = (g: string) => {
    setCollapsedGroups(prev => {
      const n = new Set(prev);
      if (n.has(g)) n.delete(g); else n.add(g);
      return n;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="wm-card bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
        <p className="text-red-300 font-semibold">Не удалось загрузить сотрудников</p>
        <p className="text-red-400/80 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
          <p className="text-white/60 text-sm">Всего сотрудников ПФО</p>
          <p className="text-2xl font-bold text-white mt-1">{pfoEmployees.length}</p>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
          <p className="text-white/60 text-sm">Территориальных менеджеров</p>
          <p className="text-2xl font-bold text-white mt-1">{tmCount}</p>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
          <p className="text-white/60 text-sm">Медицинских представителей</p>
          <p className="text-2xl font-bold text-white mt-1">{mpCount}</p>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
          <p className="text-white/60 text-sm">CRM-групп</p>
          <p className="text-2xl font-bold text-cyan-300 mt-1">{groupCount}</p>
        </div>
      </div>

      {/* Структура по ролям + подсказка */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Структура по ролям</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`}>
                {roleData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 flex flex-col justify-center">
          <h3 className="text-lg font-semibold text-white mb-2">Данные из CRM</h3>
          <p className="text-white/60 text-sm leading-relaxed">
            Оргструктура загружена из CRM (реальные сотрудники ПФО, {groupCount} групп).
            «Продажи в регионах» — факт упаковок из вашей выгрузки МДЛП по регионам,
            закреплённым за сотрудником.
          </p>
          <p className="text-white/40 text-xs mt-3">
            Добавление и редактирование сотрудников — в панели администратора.
          </p>
        </div>
      </div>

      {/* Поиск */}
      <input
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Поиск по ФИО, группе, городу, региону..."
        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
      />

      {/* Иерархический список по CRM-группам */}
      <div className="space-y-3">
        {grouped.map(([group, members]) => {
          const isCollapsed = collapsedGroups.has(group);
          const rm = members.find(isRM);
          const gTm = members.filter(isTM).length;
          const gMp = members.filter(isMP).length;
          return (
            <div key={group} className="wm-card bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
              <button
                onClick={() => toggleGroup(group)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/10"
              >
                <div className="flex items-center gap-3 text-left">
                  <span className="text-white/50 text-xs">{isCollapsed ? '▶' : '▼'}</span>
                  <span className="text-sm font-bold text-white">{group}</span>
                  {rm && <span className="text-xs text-white/50">· РМ: <span className="text-blue-300 font-medium">{rm.employee_name}</span></span>}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-cyan-500/15 text-cyan-300 px-2 py-1 rounded-full border border-cyan-500/25">{gTm} ТМ</span>
                  <span className="bg-emerald-500/15 text-emerald-300 px-2 py-1 rounded-full border border-emerald-500/25">{gMp} МП</span>
                  <span className="bg-white/10 text-white/70 px-2 py-1 rounded-full border border-white/15">{members.length} чел.</span>
                </div>
              </button>
              {!isCollapsed && (
                <div className="divide-y divide-white/5">
                  {members.map(emp => {
                    const sales = salesByEmployee.get(emp.id);
                    return (
                      <div key={emp.id} className="px-5 py-3 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3" style={{ paddingLeft: levelIndent(emp) }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-white">{emp.employee_name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${ROLE_BADGES[emp.role] || 'bg-white/10 text-white/60 border-white/15'}`}>
                                {ROLE_LABELS[emp.role] || emp.role}
                              </span>
                              {emp.city && <span className="text-xs text-white/40">{emp.city}</span>}
                            </div>
                            {emp.regions && (
                              <p className="text-xs text-white/40 mt-0.5 truncate" title={emp.regions}>{emp.regions}</p>
                            )}
                          </div>
                          {sales !== undefined && sales > 0 && (
                            <div className="text-right shrink-0">
                              <p className="text-sm text-white font-medium">{sales.toLocaleString('ru-RU')} уп.</p>
                              <p className="text-[10px] text-white/40">в регионах</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {grouped.length === 0 && (
          <div className="wm-card bg-white/10 rounded-2xl border border-white/20 px-6 py-12 text-center">
            <p className="text-white/50 text-sm">
              {searchQuery ? 'Сотрудники не найдены' : 'Список сотрудников ПФО пуст'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
