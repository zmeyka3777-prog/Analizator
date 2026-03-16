// ==================== УПРАВЛЕНИЕ СОТРУДНИКАМИ ====================

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Loader2,
  UserCheck,
  MapPin,
  Briefcase,
} from 'lucide-react';

interface Employee {
  id: number;
  employee_name: string;
  role: string;
  manager_name: string | null;
  regions: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  director: 'Директор',
  regional_manager: 'Региональный менеджер',
  manager: 'Региональный менеджер',
  territory_manager: 'Территориальный менеджер',
  territorial_manager: 'Территориальный менеджер',
  medrep: 'Медпред',
  med_rep: 'Медпред',
};

const ROLE_COLORS: Record<string, string> = {
  director: 'bg-purple-100 text-purple-700',
  regional_manager: 'bg-blue-100 text-blue-700',
  manager: 'bg-blue-100 text-blue-700',
  territory_manager: 'bg-cyan-100 text-cyan-700',
  territorial_manager: 'bg-cyan-100 text-cyan-700',
  medrep: 'bg-green-100 text-green-700',
  med_rep: 'bg-green-100 text-green-700',
};

const ROLE_OPTIONS = [
  { value: 'director', label: 'Директор' },
  { value: 'regional_manager', label: 'Региональный менеджер' },
  { value: 'territory_manager', label: 'Территориальный менеджер' },
  { value: 'medrep', label: 'Медпред' },
];

interface EditForm {
  employee_name: string;
  role: string;
  manager_name: string;
  regions: string;
}

const EMPTY_FORM: EditForm = { employee_name: '', role: 'medrep', manager_name: '', regions: '' };

export default function EmployeesManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<EditForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

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

  const filteredEmployees = employees.filter(e => {
    const matchRole = roleFilter === 'all' || e.role === roleFilter;
    const matchSearch = !searchQuery ||
      e.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.manager_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.regions || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchRole && matchSearch;
  });

  const handleAdd = async () => {
    setFormError('');
    if (!addForm.employee_name.trim()) { setFormError('Введите ФИО сотрудника'); return; }
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
    } catch (err: any) {
      setFormError(err.message || 'Ошибка добавления');
    }
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditForm({
      employee_name: emp.employee_name,
      role: emp.role,
      manager_name: emp.manager_name || '',
      regions: emp.regions || '',
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
    } catch (err: any) {
      console.error('[EmployeesManagement] Ошибка сохранения:', err);
    }
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    try {
      await adminApi.deleteEmployee(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      console.error('[EmployeesManagement] Ошибка удаления:', err);
    }
  };

  // Статистика
  const stats = {
    total: employees.length,
    directors: employees.filter(e => e.role === 'director').length,
    managers: employees.filter(e => e.role === 'regional_manager' || e.role === 'manager').length,
    tm: employees.filter(e => e.role === 'territory_manager' || e.role === 'territorial_manager').length,
    medreps: employees.filter(e => e.role === 'medrep' || e.role === 'med_rep').length,
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
          <p className="text-sm text-slate-500 mt-1">Организационная структура и иерархия</p>
        </div>
        <Button
          onClick={() => { setShowAddForm(true); setAddForm(EMPTY_FORM); setFormError(''); }}
          disabled={showAddForm}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить сотрудника
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-cyan-600" />
            <span className="text-xs text-slate-500">Всего</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-slate-500">Региональных</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.managers}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-violet-600" />
            <span className="text-xs text-slate-500">Территориальных</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.tm}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-4 h-4 text-green-600" />
            <span className="text-xs text-slate-500">Медпредов</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.medreps}</p>
        </div>
      </div>

      {/* Поиск и фильтр */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по ФИО, руководителю, регионам..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
        >
          <option value="all">Все роли</option>
          {ROLE_OPTIONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Форма добавления */}
      {showAddForm && (
        <div className="bg-cyan-50/50 rounded-2xl border border-cyan-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Новый сотрудник</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">ФИО *</label>
              <input
                type="text"
                value={addForm.employee_name}
                onChange={e => setAddForm({ ...addForm, employee_name: e.target.value })}
                placeholder="Иванов Иван Иванович"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Роль *</label>
              <select
                value={addForm.role}
                onChange={e => setAddForm({ ...addForm, role: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Руководитель</label>
              <input
                type="text"
                value={addForm.manager_name}
                onChange={e => setAddForm({ ...addForm, manager_name: e.target.value })}
                placeholder="ФИО руководителя"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Регионы / Территория</label>
              <input
                type="text"
                value={addForm.regions}
                onChange={e => setAddForm({ ...addForm, regions: e.target.value })}
                placeholder="Самарская обл., Татарстан"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
          </div>
          {formError && <p className="text-xs text-red-500 mt-2">{formError}</p>}
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleAdd}
              disabled={!addForm.employee_name.trim()}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl"
            >
              <Check className="w-4 h-4 mr-2" />
              Добавить
            </Button>
            <Button variant="outline" onClick={() => { setShowAddForm(false); setFormError(''); }} className="rounded-xl">
              <X className="w-4 h-4 mr-2" />
              Отмена
            </Button>
          </div>
        </div>
      )}

      {/* Таблица */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ФИО</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Роль</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Руководитель</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Регионы</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  {editingId === emp.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editForm.employee_name}
                          onChange={e => setEditForm({ ...editForm, employee_name: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg border border-cyan-300 text-sm focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={editForm.role}
                          onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg border border-cyan-300 text-sm focus:outline-none"
                        >
                          {ROLE_OPTIONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editForm.manager_name}
                          onChange={e => setEditForm({ ...editForm, manager_name: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg border border-cyan-300 text-sm focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editForm.regions}
                          onChange={e => setEditForm({ ...editForm, regions: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg border border-cyan-300 text-sm focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={saveEdit} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-3 text-sm font-medium text-slate-800">{emp.employee_name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${ROLE_COLORS[emp.role] || 'bg-slate-100 text-slate-600'}`}>
                          {ROLE_LABELS[emp.role] || emp.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{emp.manager_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate">{emp.regions || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEdit(emp)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(emp.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && !loading && (
          <div className="px-6 py-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {searchQuery || roleFilter !== 'all' ? 'Сотрудники не найдены' : 'Добавьте первого сотрудника'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
