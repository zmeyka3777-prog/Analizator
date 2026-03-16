import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Upload,
  ChevronRight,
  ChevronDown,
  Users,
  Filter,
  MapPin,
} from 'lucide-react';

// --- API helper ---
const getToken = () => localStorage.getItem('mdlp_token');
const apiCall = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// --- Types ---
type EmployeeRole = 'director' | 'rm' | 'tm' | 'mp';

interface Employee {
  id: number;
  name: string;
  role: EmployeeRole;
  manager_name: string | null;
  manager_id: number | null;
  regions: string[];
  email?: string;
  phone?: string;
  created_at?: string;
}

interface EmployeeFormData {
  name: string;
  role: EmployeeRole;
  manager_name: string;
  regions: string;
  email: string;
  phone: string;
}

const EMPLOYEE_ROLES: { value: EmployeeRole; label: string; labelShort: string; color: string; level: number }[] = [
  { value: 'director', label: 'Директор', labelShort: 'Директор', color: 'bg-purple-100 text-purple-800', level: 0 },
  { value: 'rm', label: 'Региональный менеджер', labelShort: 'РМ', color: 'bg-blue-100 text-blue-800', level: 1 },
  { value: 'tm', label: 'Территориальный менеджер', labelShort: 'ТМ', color: 'bg-cyan-100 text-cyan-800', level: 2 },
  { value: 'mp', label: 'Медицинский представитель', labelShort: 'МП', color: 'bg-green-100 text-green-800', level: 3 },
];

const getRoleInfo = (role: EmployeeRole) =>
  EMPLOYEE_ROLES.find((r) => r.value === role) || EMPLOYEE_ROLES[3];

const emptyForm: EmployeeFormData = {
  name: '',
  role: 'mp',
  manager_name: '',
  regions: '',
  email: '',
  phone: '',
};

// --- Component ---
function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Expanded hierarchy nodes
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  // --- Data loading ---
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('/api/admin/employees');
      setEmployees(Array.isArray(data) ? data : data.employees ?? []);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки сотрудников');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // --- Build hierarchy tree ---
  const hierarchyTree = useMemo(() => {
    const byManager = new Map<number | null, Employee[]>();
    employees.forEach((emp) => {
      const managerId = emp.manager_id ?? null;
      if (!byManager.has(managerId)) byManager.set(managerId, []);
      byManager.get(managerId)!.push(emp);
    });
    return byManager;
  }, [employees]);

  const getChildren = (parentId: number | null): Employee[] => {
    return hierarchyTree.get(parentId) || [];
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- Filtering ---
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        search === '' || emp.name.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [employees, search, roleFilter]);

  // Use hierarchical view when no filters, flat view when filters applied
  const isFiltered = search !== '' || roleFilter !== 'all';

  // --- Modal handlers ---
  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      role: emp.role,
      manager_name: emp.manager_name || '',
      regions: (emp.regions || []).join(', '),
      email: emp.email || '',
      phone: emp.phone || '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEmployee(null);
    setFormData(emptyForm);
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!formData.name) {
      setFormError('Имя обязательно');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: formData.name,
        role: formData.role,
        manager_name: formData.manager_name || null,
        regions: formData.regions
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      };

      if (editingEmployee) {
        await apiCall(`/api/admin/employees/${editingEmployee.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await apiCall('/api/admin/employees', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      closeModal();
      await fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiCall(`/api/admin/employees/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await fetchEmployees();
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleImportExcel = () => {
    alert('Функция импорта из Excel будет доступна в следующей версии.');
  };

  // --- Recursive hierarchy row renderer ---
  const renderHierarchyRow = (emp: Employee, depth: number = 0): React.ReactNode => {
    const roleInfo = getRoleInfo(emp.role);
    const children = getChildren(emp.id);
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(emp.id);

    return (
      <React.Fragment key={emp.id}>
        <tr className="hover:bg-blue-50/30 transition-colors">
          <td className="px-4 py-3 text-sm">
            <div className="flex items-center" style={{ paddingLeft: `${depth * 24}px` }}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(emp.id)}
                  className="p-0.5 mr-2 hover:bg-gray-200 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              ) : (
                <span className="w-6 mr-2" />
              )}
              <span className="font-medium text-gray-900">{emp.name}</span>
            </div>
          </td>
          <td className="px-4 py-3">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}
            >
              {roleInfo.label}
            </span>
          </td>
          <td className="px-4 py-3 text-sm text-gray-500">
            {emp.manager_name || '---'}
          </td>
          <td className="px-4 py-3">
            <div className="flex flex-wrap gap-1">
              {(emp.regions || []).length > 0 ? (
                emp.regions.map((region, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    <MapPin className="h-3 w-3" />
                    {region}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-sm">---</span>
              )}
            </div>
          </td>
          <td className="px-4 py-3 text-right">
            <div className="flex justify-end gap-1">
              <button
                onClick={() => openEditModal(emp)}
                className="p-2 text-gray-400 hover:text-[#004F9F] hover:bg-blue-50 rounded-lg transition-colors"
                title="Редактировать"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeleteTarget(emp)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Удалить"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>
        {hasChildren && isExpanded && children.map((child) => renderHierarchyRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  // Root employees (no manager)
  const rootEmployees = useMemo(() => {
    return employees.filter((e) => !e.manager_id);
  }, [employees]);

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Управление сотрудниками</h2>
          <p className="text-sm text-gray-500">
            {loading
              ? 'Загрузка...'
              : `Всего: ${employees.length} сотрудников (иерархия: Директор \u2192 РМ \u2192 ТМ \u2192 МП)`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleImportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Upload className="h-4 w-4" />
            Импорт из Excel
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#004F9F] text-white text-sm font-medium rounded-lg hover:bg-[#003d7a] transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Добавить сотрудника
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по имени..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6DB7FF] focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6DB7FF] focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="all">Все роли</option>
              {EMPLOYEE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#004F9F]" />
            <span className="ml-3 text-gray-500">Загрузка сотрудников...</span>
          </div>
        ) : (isFiltered ? filteredEmployees : rootEmployees).length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Сотрудники не найдены</p>
            <p className="text-sm mt-1">Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Имя
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Роль
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Руководитель
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Регионы
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isFiltered
                  ? filteredEmployees.map((emp) => {
                      const roleInfo = getRoleInfo(emp.role);
                      return (
                        <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {emp.name}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}
                            >
                              {roleInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {emp.manager_name || '---'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {(emp.regions || []).length > 0 ? (
                                emp.regions.map((region, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                                  >
                                    <MapPin className="h-3 w-3" />
                                    {region}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 text-sm">---</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => openEditModal(emp)}
                                className="p-2 text-gray-400 hover:text-[#004F9F] hover:bg-blue-50 rounded-lg transition-colors"
                                title="Редактировать"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(emp)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Удалить"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  : rootEmployees.map((emp) => renderHierarchyRow(emp, 0))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-2xl border w-full max-w-md mx-4 p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingEmployee ? 'Редактировать сотрудника' : 'Новый сотрудник'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6DB7FF]"
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as EmployeeRole })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6DB7FF]"
                >
                  {EMPLOYEE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имя руководителя
                </label>
                <input
                  type="text"
                  value={formData.manager_name}
                  onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6DB7FF]"
                  placeholder="ФИО руководителя"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Регионы (через запятую)
                </label>
                <input
                  type="text"
                  value={formData.regions}
                  onChange={(e) => setFormData({ ...formData, regions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6DB7FF]"
                  placeholder="Москва, Самара, Казань"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6DB7FF]"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6DB7FF]"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#004F9F] rounded-lg hover:bg-[#003d7a] transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingEmployee ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl border w-full max-w-sm mx-4 p-6 z-10">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Подтверждение удаления</h3>
            <p className="text-sm text-gray-600 mb-6">
              Вы действительно хотите удалить сотрудника{' '}
              <span className="font-medium text-gray-900">{deleteTarget.name}</span> (
              {getRoleInfo(deleteTarget.role).label})? Это действие необратимо.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeManagement;
