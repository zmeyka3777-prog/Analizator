import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  UserPlus,
  Users,
  Filter,
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
type UserRole = 'admin' | 'director' | 'manager' | 'territory_manager' | 'medrep' | 'analyst';

interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  last_login: string | null;
  created_at: string;
}

interface UserFormData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

const ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Администратор', color: 'bg-red-100 text-red-800' },
  { value: 'director', label: 'Директор', color: 'bg-purple-100 text-purple-800' },
  { value: 'manager', label: 'Региональный менеджер', color: 'bg-blue-100 text-blue-800' },
  { value: 'territory_manager', label: 'Территориальный менеджер', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'medrep', label: 'Медицинский представитель', color: 'bg-green-100 text-green-800' },
  { value: 'analyst', label: 'Аналитик', color: 'bg-amber-100 text-amber-800' },
];

const getRoleInfo = (role: UserRole) =>
  ROLES.find((r) => r.value === role) || { value: role, label: role, color: 'bg-gray-100 text-gray-800' };

const emptyForm: UserFormData = { email: '', password: '', name: '', role: 'medrep' };

// --- Component ---
function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // --- Data loading ---
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('/api/admin/users');
      setUsers(Array.isArray(data) ? data : data.users ?? []);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // --- Filtering ---
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        search === '' ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  // --- Modal handlers ---
  const openAddModal = () => {
    setEditingUser(null);
    setFormData(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({ email: user.email, password: '', name: user.name, role: user.role });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setFormData(emptyForm);
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!formData.email || !formData.name) {
      setFormError('Заполните обязательные поля: email и имя');
      return;
    }
    if (!editingUser && !formData.password) {
      setFormError('Пароль обязателен для нового пользователя');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const body: Record<string, string> = {
          email: formData.email,
          name: formData.name,
          role: formData.role,
        };
        if (formData.password) body.password = formData.password;
        await apiCall(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await apiCall('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      closeModal();
      await fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  // --- Delete handlers ---
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiCall(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Управление пользователями</h2>
          <p className="text-sm text-gray-500">
            {loading ? 'Загрузка...' : `Всего: ${users.length} пользователей`}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#004F9F] text-white text-sm font-medium rounded-lg hover:bg-[#003d7a] transition-colors shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          Добавить пользователя
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по имени или email..."
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
              {ROLES.map((r) => (
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
            <span className="ml-3 text-gray-500">Загрузка пользователей...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Пользователи не найдены</p>
            <p className="text-sm mt-1">Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Имя
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Роль
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Последний вход
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Создан
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => {
                  const roleInfo = getRoleInfo(user.role);
                  return (
                    <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">{user.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}
                        >
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(user.last_login)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-gray-400 hover:text-[#004F9F] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Редактировать"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(user)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                {editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6DB7FF]"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Пароль {editingUser ? '(оставьте пустым, чтобы не менять)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6DB7FF]"
                  placeholder="********"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Имя *</label>
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
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6DB7FF]"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
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
                {editingUser ? 'Сохранить' : 'Создать'}
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
              Вы действительно хотите удалить пользователя{' '}
              <span className="font-medium text-gray-900">{deleteTarget.name}</span> (
              {deleteTarget.email})? Это действие необратимо.
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

export default UserManagement;
