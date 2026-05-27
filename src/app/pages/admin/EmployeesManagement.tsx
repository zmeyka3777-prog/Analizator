// ==================== УПРАВЛЕНИЕ СОТРУДНИКАМИ (ИЕРАРХИЧЕСКИЙ ВИД) ====================
// Группировка по CRM-группе (Moscow 1, PFO Sonin, ...) с иерархией внутри:
// Региональный менеджер → его территориальные → их медпреды.

import React, { useState, useEffect, useMemo } from 'react';
import { adminApi } from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import {
  Users, Plus, Trash2, Edit2, Check, X, Search, Loader2, UserCheck,
  MapPin, Briefcase, ChevronRight, ChevronDown, Mail, Building2, Crown,
} from 'lucide-react';

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

const ROLE_OPTIONS = [
  { value: 'director', label: 'Директор' },
  { value: 'regional_manager', label: 'Региональный менеджер' },
  { value: 'territory_manager', label: 'Территориальный менеджер' },
  { value: 'medrep', label: 'Медпред' },
];

interface EditForm {
  employee_name: string; role: string; manager_name: string; regions: string;
}
const EMPTY_FORM: EditForm = { employee_name: '', role: 'medrep', manager_name: '', regions: '' };

// Иерархия уровней: 1 (РМ) — отступ 0, 2 (ТМ) — 16px, 3 (МП) — 32px
function levelIndent(level: number | null): number {
  if (level == null) return 0;
  if (level === 1) return 0;
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

export default function EmployeesManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<EditForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getEmployees();
      setEmployees(response.employees);
    } catch (err) {
      console.error('[EmployeesManagement] Ошибка загрузки:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmployees(); }, []);

  // Применить поиск (фильтрация по ФИО, городу, email, CRM-группе)
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(e =>
      e.employee_name.toLowerCase().includes(q) ||
      (e.crm_group || '').toLowerCase().includes(q) ||
      (e.city || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.position || '').toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  // Сгруппировать по CRM-группе. Внутри группы порядок уже корректный
  // из API (sort by hierarchy_level + employee_name).
  const grouped = useMemo(() => {
    const map = new Map<string, Employee[]>();
    for (const emp of filtered) {
      const group = emp.crm_group || 'Без группы';
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(emp);
    }
    // Сортировка групп: Руководство первым, потом по алфавиту
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0].includes('Руководство')) return -1;
      if (b[0].includes('Руководство')) return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [filtered]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  // Найти РМ группы для подзаголовка
  const groupRM = (members: Employee[]): string => {
    const rm = members.find(e => e.role === 'regional_manager' || e.role === 'manager' || e.hierarchy_level === 1);
    return rm?.employee_name || '';
  };

  const handleAdd = async () => {
    setFormError('');
    if (!addForm.employee_name.trim()) { setFormError('Введите ФИО'); return; }
    try {
      await adminApi.createEmployee({
        employee_name: addForm.employee_name.trim(),
        role: addForm.role,
        manager_name: addForm.manager_name.trim() || null,
        regions: addForm.regions.trim() || null,
      });
      await loadEmployees();
      setShowAddForm(false);
      setAddForm(EMPTY_FORM);
    } catch (err: any) { setFormError(err.message || 'Ошибка'); }
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditForm({
      employee_name: emp.employee_name, role: emp.role,
      manager_name: emp.manager_name || '', regions: emp.regions || '',
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await adminApi.updateEmployee(editingId, {
        employee_name: editForm.employee_name.trim(),
        role: editForm.role,
        manager_name: editForm.manager_name.trim() || null,
        regions: editForm.regions.trim() || null,
      });
      await loadEmployees();
    } catch (err) { console.error(err); }
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    try {
      await adminApi.deleteEmployee(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
    } catch (err) { console.error(err); }
  };

  // Статистика
  const stats = {
    total: employees.length,
    directors: employees.filter(e => e.role === 'director' || e.hierarchy_level === 0).length,
    managers: employees.filter(e => e.role === 'regional_manager' || e.role === 'manager' || e.hierarchy_level === 1).length,
    tm: employees.filter(e => e.role === 'territory_manager' || e.role === 'territorial_manager' || e.hierarchy_level === 2).length,
    medreps: employees.filter(e => e.role === 'medrep' || e.role === 'med_rep' || e.hierarchy_level === 3).length,
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Сотрудники
            {loading && <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Организационная структура по CRM-группам. Внутри группы — РМ → ТМ → МП.
          </p>
        </div>
        <Button
          onClick={() => { setShowAddForm(true); setAddForm(EMPTY_FORM); setFormError(''); }}
          disabled={showAddForm}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-cyan-600" /><span className="text-xs text-slate-500">Всего</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-purple-600" /><span className="text-xs text-slate-500">Руководство</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.directors}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-4 h-4 text-blue-600" /><span className="text-xs text-slate-500">Региональных</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.managers}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-cyan-600" /><span className="text-xs text-slate-500">Территориальных</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.tm}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-4 h-4 text-green-600" /><span className="text-xs text-slate-500">Медпредов</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.medreps}</p>
        </div>
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

      {/* Форма добавления */}
      {showAddForm && (
        <div className="bg-cyan-50/50 rounded-2xl border border-cyan-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Новый сотрудник</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" value={addForm.employee_name} onChange={e => setAddForm({ ...addForm, employee_name: e.target.value })}
              placeholder="ФИО *" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            <select value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm">
              {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <input type="text" value={addForm.manager_name} onChange={e => setAddForm({ ...addForm, manager_name: e.target.value })}
              placeholder="Руководитель" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            <input type="text" value={addForm.regions} onChange={e => setAddForm({ ...addForm, regions: e.target.value })}
              placeholder="Регионы / Территория" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
          </div>
          {formError && <p className="text-xs text-red-500 mt-2">{formError}</p>}
          <div className="flex gap-2 mt-4">
            <Button onClick={handleAdd} disabled={!addForm.employee_name.trim()}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl">
              <Check className="w-4 h-4 mr-2" />Добавить
            </Button>
            <Button variant="outline" onClick={() => { setShowAddForm(false); setFormError(''); }} className="rounded-xl">
              <X className="w-4 h-4 mr-2" />Отмена
            </Button>
          </div>
        </div>
      )}

      {/* Иерархический список по CRM-группам */}
      <div className="space-y-3">
        {grouped.map(([group, members]) => {
          const isCollapsed = collapsedGroups.has(group);
          const rmName = groupRM(members);
          return (
            <div key={group} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden">
              {/* Заголовок группы */}
              <button
                onClick={() => toggleGroup(group)}
                className="w-full px-5 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200 flex items-center justify-between hover:from-cyan-50 hover:to-blue-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                  <Building2 className="w-4 h-4 text-cyan-600" />
                  <span className="text-sm font-bold text-slate-800">{group}</span>
                  {rmName && (
                    <span className="text-xs text-slate-500">· РМ: <span className="font-medium text-blue-700">{rmName}</span></span>
                  )}
                </div>
                <span className="text-xs text-slate-500 bg-white/70 px-2 py-1 rounded-full border border-slate-200">
                  {members.length} {members.length === 1 ? 'чел.' : 'чел.'}
                </span>
              </button>

              {/* Сотрудники группы */}
              {!isCollapsed && (
                <div className="divide-y divide-slate-100">
                  {members.map(emp => (
                    <div key={emp.id} className="px-5 py-3 hover:bg-slate-50/50 transition-colors">
                      {editingId === emp.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                          <input value={editForm.employee_name} onChange={e => setEditForm({ ...editForm, employee_name: e.target.value })}
                            className="px-2 py-1 rounded-lg border border-cyan-300 text-sm md:col-span-2" />
                          <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                            className="px-2 py-1 rounded-lg border border-cyan-300 text-sm">
                            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                          <input value={editForm.manager_name} onChange={e => setEditForm({ ...editForm, manager_name: e.target.value })}
                            placeholder="Руководитель" className="px-2 py-1 rounded-lg border border-cyan-300 text-sm" />
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={saveEdit} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3" style={{ paddingLeft: levelIndent(emp.hierarchy_level) }}>
                          <div className="flex items-center gap-3 flex-1 min-w-0">
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
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => startEdit(emp)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(emp.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {grouped.length === 0 && !loading && (
          <div className="px-6 py-12 text-center bg-white/80 rounded-2xl border border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {searchQuery ? 'Сотрудники не найдены' : 'Загрузите список сотрудников'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
