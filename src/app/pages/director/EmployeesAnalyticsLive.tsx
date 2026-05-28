// ==================== АНАЛИЗ СОТРУДНИКОВ (ДИРЕКТОР, РЕАЛЬНЫЕ ДАННЫЕ) ====================
// Источник: /api/admin/employees (107 реальных сотрудников из CRM xlsx).
// Группировка по CRM-группе (PFO Sonin, PFO Orudjov и т.д.) — точно так же
// как в admin Employees Management. Под каждым РМ — его ТМ → МП с отступами.
//
// Старый EmployeesAnalytics.tsx использовал mock из src/data/employees.ts
// (Смирнов Д., Петров А. с фейковыми телефонами). Этот компонент заменяет
// его в DirectorWMDashboard.

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Crown, Briefcase, MapPin, UserCheck, ChevronRight, ChevronDown,
  Building2, Mail, Search, Loader2,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useSharedData } from '@/context/SharedDataContext';

interface Employee {
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

// Маппинг CRM-группы → ФО для агрегации по округам.
// CRM-группы вида "PFO Sonin", "CFD Samadova" уже содержат код ФО.
function crmGroupToFD(group: string | null): string {
  if (!group) return 'Прочее';
  const upper = group.toUpperCase();
  if (upper.startsWith('PFO')) return 'ПФО';
  if (upper.startsWith('CFD') || upper.startsWith('MOSCOW')) return 'ЦФО';
  if (upper.startsWith('NWD')) return 'СЗФО';
  if (upper.startsWith('NCFD')) return 'СКФО';
  if (upper.startsWith('SFD')) return 'ЮФО';
  if (upper.startsWith('SIBFD')) return 'СФО';
  if (upper.startsWith('UFD')) return 'УФО';
  if (upper.startsWith('DFD')) return 'ДФО';
  return 'Руководство';
}

function levelIndent(level: number | null): number {
  if (level === 2) return 24;
  if (level === 3) return 48;
  return 0;
}

function levelIcon(level: number | null) {
  if (level === 0) return <Crown className="w-4 h-4 text-purple-500" />;
  if (level === 1) return <Briefcase className="w-4 h-4 text-blue-500" />;
  if (level === 2) return <MapPin className="w-4 h-4 text-cyan-500" />;
  if (level === 3) return <UserCheck className="w-4 h-4 text-green-500" />;
  return <Users className="w-4 h-4 text-slate-400" />;
}

const ROLE_LABELS: Record<string, string> = {
  director: 'Директор',
  regional_manager: 'РМ', manager: 'РМ',
  territory_manager: 'ТМ', territorial_manager: 'ТМ',
  medrep: 'МП', med_rep: 'МП',
};

const ROLE_COLORS: Record<string, string> = {
  director: 'bg-purple-100 text-purple-700 border-purple-200',
  regional_manager: 'bg-blue-100 text-blue-700 border-blue-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  territory_manager: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  territorial_manager: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  medrep: 'bg-green-100 text-green-700 border-green-200',
  med_rep: 'bg-green-100 text-green-700 border-green-200',
};

export default function EmployeesAnalyticsLive() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedFD, setSelectedFD] = useState<string>('all');

  // Реактивность к загрузке новых данных
  const { wmRussiaData } = useSharedData();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminApi.getEmployees()
      .then(res => {
        if (cancelled) return;
        setEmployees(res.employees || []);
        setError(null);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err?.message || 'Ошибка загрузки сотрудников');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [wmRussiaData]);

  // Фильтр по ФД и поиску
  const filtered = useMemo(() => {
    let result = employees;
    if (selectedFD !== 'all') {
      result = result.filter(e => crmGroupToFD(e.crm_group) === selectedFD);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.employee_name.toLowerCase().includes(q) ||
        (e.crm_group || '').toLowerCase().includes(q) ||
        (e.city || '').toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [employees, selectedFD, searchQuery]);

  // Группировка по CRM-группе
  const grouped = useMemo(() => {
    const map = new Map<string, Employee[]>();
    for (const emp of filtered) {
      const group = emp.crm_group || 'Без группы';
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(emp);
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0].includes('Руководство')) return -1;
      if (b[0].includes('Руководство')) return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [filtered]);

  // Статистика по ФО (для top панели)
  const statsByFD = useMemo(() => {
    const map = new Map<string, { rm: number; tm: number; mp: number; total: number }>();
    for (const e of employees) {
      const fd = crmGroupToFD(e.crm_group);
      if (!map.has(fd)) map.set(fd, { rm: 0, tm: 0, mp: 0, total: 0 });
      const s = map.get(fd)!;
      s.total++;
      if (e.hierarchy_level === 1 || e.role === 'regional_manager' || e.role === 'manager') s.rm++;
      else if (e.hierarchy_level === 2 || e.role === 'territory_manager') s.tm++;
      else if (e.hierarchy_level === 3 || e.role === 'medrep' || e.role === 'med_rep') s.mp++;
    }
    return map;
  }, [employees]);

  const totalStats = {
    total: employees.length,
    directors: employees.filter(e => e.hierarchy_level === 0 || e.role === 'director').length,
    rm: employees.filter(e => e.hierarchy_level === 1 || e.role === 'regional_manager' || e.role === 'manager').length,
    tm: employees.filter(e => e.hierarchy_level === 2 || e.role === 'territory_manager').length,
    mp: employees.filter(e => e.hierarchy_level === 3 || e.role === 'medrep' || e.role === 'med_rep').length,
  };

  const toggleGroup = (g: string) => {
    setCollapsedGroups(prev => {
      const n = new Set(prev);
      if (n.has(g)) n.delete(g);
      else n.add(g);
      return n;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-red-700 font-semibold">Не удалось загрузить сотрудников</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Анализ сотрудников</h2>
          <p className="text-sm text-slate-500 mt-1">
            Организационная структура из CRM ({totalStats.total} человек в 8 ФО)
          </p>
        </div>
      </div>

      {/* Общие KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white/80 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-cyan-600" /><span className="text-xs text-slate-500">Всего</span></div>
          <p className="text-2xl font-bold text-slate-800">{totalStats.total}</p>
        </div>
        <div className="bg-white/80 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2"><Crown className="w-4 h-4 text-purple-600" /><span className="text-xs text-slate-500">Руководство</span></div>
          <p className="text-2xl font-bold text-slate-800">{totalStats.directors}</p>
        </div>
        <div className="bg-white/80 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2"><Briefcase className="w-4 h-4 text-blue-600" /><span className="text-xs text-slate-500">РМ</span></div>
          <p className="text-2xl font-bold text-slate-800">{totalStats.rm}</p>
        </div>
        <div className="bg-white/80 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-cyan-600" /><span className="text-xs text-slate-500">ТМ</span></div>
          <p className="text-2xl font-bold text-slate-800">{totalStats.tm}</p>
        </div>
        <div className="bg-white/80 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2"><UserCheck className="w-4 h-4 text-green-600" /><span className="text-xs text-slate-500">МП</span></div>
          <p className="text-2xl font-bold text-slate-800">{totalStats.mp}</p>
        </div>
      </div>

      {/* Фильтр по ФО */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedFD('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selectedFD === 'all' ? 'bg-cyan-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Все ФО ({totalStats.total})
        </button>
        {Array.from(statsByFD.entries()).sort((a, b) => b[1].total - a[1].total).map(([fd, s]) => (
          <button
            key={fd}
            onClick={() => setSelectedFD(fd)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedFD === fd ? 'bg-cyan-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title={`РМ: ${s.rm} · ТМ: ${s.tm} · МП: ${s.mp}`}
          >
            {fd} ({s.total})
          </button>
        ))}
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Поиск по ФИО, группе, городу, email..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
        />
      </div>

      {/* Иерархический список */}
      <div className="space-y-3">
        {grouped.map(([group, members]) => {
          const isCollapsed = collapsedGroups.has(group);
          const rm = members.find(e => e.hierarchy_level === 1 || e.role === 'regional_manager' || e.role === 'manager');
          const tmCount = members.filter(e => e.hierarchy_level === 2 || e.role === 'territory_manager').length;
          const mpCount = members.filter(e => e.hierarchy_level === 3 || e.role === 'medrep' || e.role === 'med_rep').length;
          return (
            <div key={group} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleGroup(group)}
                className="w-full px-5 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200 flex items-center justify-between hover:from-cyan-50 hover:to-blue-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                  <Building2 className="w-4 h-4 text-cyan-600" />
                  <span className="text-sm font-bold text-slate-800">{group}</span>
                  {rm && (
                    <span className="text-xs text-slate-500">· РМ: <span className="font-medium text-blue-700">{rm.employee_name}</span></span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-cyan-50 text-cyan-700 px-2 py-1 rounded-full border border-cyan-200">{tmCount} ТМ</span>
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200">{mpCount} МП</span>
                  <span className="bg-white px-2 py-1 rounded-full border border-slate-200">{members.length} чел.</span>
                </div>
              </button>
              {!isCollapsed && (
                <div className="divide-y divide-slate-100">
                  {members.map(emp => (
                    <div key={emp.id} className="px-5 py-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3" style={{ paddingLeft: levelIndent(emp.hierarchy_level) }}>
                        <div className="shrink-0">{levelIcon(emp.hierarchy_level)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-800">{emp.employee_name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${ROLE_COLORS[emp.role] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {ROLE_LABELS[emp.role] || emp.role}
                            </span>
                            {emp.city && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />{emp.city}
                              </span>
                            )}
                          </div>
                          {emp.email && (
                            <a href={`mailto:${emp.email}`} className="text-xs text-cyan-600 hover:text-cyan-800 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" />{emp.email}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {grouped.length === 0 && (
          <div className="px-6 py-12 text-center bg-white/80 rounded-2xl border border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {searchQuery || selectedFD !== 'all' ? 'Сотрудники не найдены' : 'Список пуст'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
