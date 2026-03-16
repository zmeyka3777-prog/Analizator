// ==================== ДАШБОРД АДМИНИСТРАТОРА ====================

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, Role, getRoleLabel } from '@/types/user.types';
import { generateRandomPassword, validateEmail } from '@/utils/auth';
import { adminApi } from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import YearsManagement from './YearsManagement';
import DateManagement from './DateManagement';
import ProductsManagement from './ProductsManagement';
import TerritoriesManagement from './TerritoriesManagement';
import EmployeesManagement from './EmployeesManagement';
import {
  LayoutDashboard,
  Users as UsersIcon,
  Pill,
  MapPin,
  Calendar,
  Database,
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Shield,
  UserPlus,
  Eye,
  EyeOff,
  Copy,
  AlertCircle,
  TrendingUp,
  Activity,
  Loader2,
} from 'lucide-react';

// ==================== ТИПЫ ====================

type AdminTab = 'overview' | 'users' | 'employees' | 'products' | 'territories' | 'years' | 'data' | 'logs';

interface TabConfig {
  id: AdminTab;
  label: string;
  icon: React.ReactNode;
}

interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
  level: 'info' | 'warning' | 'error';
}

// ==================== КОНФИГУРАЦИЯ ВКЛАДОК ====================

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Обзор', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'users', label: 'Пользователи', icon: <UsersIcon className="w-4 h-4" /> },
  { id: 'employees', label: 'Сотрудники', icon: <Shield className="w-4 h-4" /> },
  { id: 'products', label: 'Препараты', icon: <Pill className="w-4 h-4" /> },
  { id: 'territories', label: 'Территории', icon: <MapPin className="w-4 h-4" /> },
  { id: 'years', label: 'Годы', icon: <Calendar className="w-4 h-4" /> },
  { id: 'data', label: 'Данные', icon: <Database className="w-4 h-4" /> },
  { id: 'logs', label: 'Логи', icon: <FileText className="w-4 h-4" /> },
];

const ROLE_OPTIONS: { value: Role; label: string; color: string }[] = [
  { value: 'admin', label: 'Администратор', color: 'bg-red-100 text-red-700' },
  { value: 'director', label: 'Директор', color: 'bg-purple-100 text-purple-700' },
  { value: 'regional_manager', label: 'Региональный менеджер', color: 'bg-blue-100 text-blue-700' },
  { value: 'territorial_manager', label: 'Территориальный менеджер', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'med_rep', label: 'Медицинский представитель', color: 'bg-green-100 text-green-700' },
];

// ==================== КОМПОНЕНТ ====================

// Маппинг sidebar section → внутренняя вкладка
const ADMIN_SECTION_MAP: Record<string, AdminTab> = {
  'admin-panel': 'overview',
  'user-management': 'users',
  'employee-management': 'employees',
  'data-management': 'data',
  'system-settings': 'overview',
  'upload': 'data',
  'activity-log': 'logs',
  'db-stats': 'overview',
};

export default function AdminDashboard({ activeSection }: { activeSection?: string }) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Синхронизация сайдбара с внутренними вкладками
  useEffect(() => {
    if (activeSection) {
      const mapped = ADMIN_SECTION_MAP[activeSection];
      if (mapped && mapped !== activeTab) {
        setActiveTab(mapped);
      }
    }
  }, [activeSection]);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [logs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: new Date().toISOString(),
      action: 'Вход в систему',
      user: currentUser?.fullName || 'Администратор',
      details: 'Успешная авторизация',
      level: 'info',
    },
  ]);

  // Форма нового пользователя
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    fullName: '',
    role: 'med_rep' as Role,
    phone: '',
    territory: '',
  });
  const [formError, setFormError] = useState('');

  // Маппинг ролей API ↔ фронтенд
  const API_ROLE_MAP: Record<string, Role> = {
    admin: 'admin', director: 'director',
    manager: 'regional_manager', regional_manager: 'regional_manager',
    territory_manager: 'territorial_manager', territorial_manager: 'territorial_manager',
    medrep: 'med_rep', med_rep: 'med_rep', analyst: 'med_rep',
  };
  const ROLE_TO_API: Record<Role, string> = {
    admin: 'admin', director: 'director',
    regional_manager: 'manager', territorial_manager: 'territory_manager', med_rep: 'medrep',
  };

  // Загрузка пользователей из БД
  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await adminApi.getUsers();
      setUsers(response.users.map((u: any) => ({
        id: String(u.id),
        email: u.email,
        fullName: u.name || u.email,
        role: (API_ROLE_MAP[u.role] ?? 'med_rep') as Role,
        territory: u.territory ?? undefined,
        isActive: u.is_active !== false,
        createdAt: u.created_at ?? new Date().toISOString(),
      })));
    } catch (err) {
      console.error('[AdminDashboard] Ошибка загрузки пользователей:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  // Фильтрованные пользователи
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesSearch =
        !searchQuery ||
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  // Статистика по ролям
  const roleStats = useMemo(() => {
    const stats: Record<string, number> = {};
    ROLE_OPTIONS.forEach(r => {
      stats[r.value] = users.filter(u => u.role === r.value).length;
    });
    return stats;
  }, [users]);

  const getRoleColor = (role: Role): string => {
    return ROLE_OPTIONS.find(r => r.value === role)?.color || 'bg-slate-100 text-slate-700';
  };

  // ==================== CRUD пользователей ====================

  const handleAddUser = async () => {
    setFormError('');

    if (!newUserForm.email || !newUserForm.fullName) {
      setFormError('Заполните обязательные поля (email и ФИО)');
      return;
    }

    if (!validateEmail(newUserForm.email)) {
      setFormError('Некорректный email адрес');
      return;
    }

    const password = generateRandomPassword();
    setGeneratedPassword(password);

    try {
      await adminApi.createUser({
        email: newUserForm.email,
        password,
        name: newUserForm.fullName,
        role: ROLE_TO_API[newUserForm.role],
      });
      await loadUsers();
      setNewUserForm({ email: '', fullName: '', role: 'med_rep', phone: '', territory: '' });
    } catch (err: any) {
      setFormError(err.message || 'Ошибка создания пользователя');
      setGeneratedPassword('');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) return;
    try {
      await adminApi.deleteUser(Number(userId));
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      console.error('[AdminDashboard] Ошибка удаления:', err);
    }
  };

  const handleToggleActive = async (userId: string) => {
    if (userId === currentUser?.id) return;
    const user = users.find(u => u.id === userId);
    if (!user) return;
    try {
      await adminApi.updateUser(Number(userId), { is_active: !user.isActive });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
    } catch (err: any) {
      console.error('[AdminDashboard] Ошибка изменения статуса:', err);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: Role) => {
    try {
      await adminApi.updateUser(Number(userId), { role: ROLE_TO_API[newRole] });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      console.error('[AdminDashboard] Ошибка изменения роли:', err);
    }
    setEditingUserId(null);
  };

  const copyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
    }
  };

  // ==================== РЕНДЕР ВКЛАДОК ====================

  const renderOverview = () => (
    <div className="space-y-6">
      {/* KPI карточки */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 flex items-center justify-center">
              <UsersIcon className="w-4 h-4 text-cyan-600" />
            </div>
            <span className="text-xs text-slate-500">Пользователи</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{users.length}</p>
          <p className="text-xs text-green-600 mt-1">
            {users.filter(u => u.isActive).length} активных
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-violet-600" />
            </div>
            <span className="text-xs text-slate-500">Роли</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{Object.keys(roleStats).length}</p>
          <p className="text-xs text-slate-500 mt-1">типов ролей</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs text-slate-500">Активность</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{logs.length}</p>
          <p className="text-xs text-slate-500 mt-1">записей в логе</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
              <Activity className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xs text-slate-500">Система</span>
          </div>
          <p className="text-3xl font-bold text-green-600">OK</p>
          <p className="text-xs text-slate-500 mt-1">все сервисы работают</p>
        </div>
      </div>

      {/* Распределение по ролям */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Распределение пользователей по ролям</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {ROLE_OPTIONS.map(role => (
            <div key={role.value} className="p-3 rounded-xl bg-slate-50 text-center">
              <p className="text-2xl font-bold text-slate-800">{roleStats[role.value] || 0}</p>
              <p className="text-xs text-slate-500 mt-1">{role.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Последние действия */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Последние действия</h3>
        {logs.length > 0 ? (
          <div className="space-y-2">
            {logs.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    log.level === 'error' ? 'bg-red-500' :
                    log.level === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                  }`} />
                  <div>
                    <p className="text-sm text-slate-700">{log.action}</p>
                    <p className="text-xs text-slate-400">{log.user} - {log.details}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(log.timestamp).toLocaleString('ru-RU')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-6">Нет записей</p>
        )}
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      {/* Фильтры */}
      <div className="flex items-center gap-3 flex-wrap">
        {usersLoading && <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени или email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
          />
        </div>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as Role | 'all')}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
        >
          <option value="all">Все роли</option>
          {ROLE_OPTIONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        <Button
          onClick={() => { setShowAddUser(true); setGeneratedPassword(''); setFormError(''); }}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      </div>

      {/* Форма добавления */}
      {showAddUser && (
        <div className="bg-cyan-50/50 rounded-2xl border border-cyan-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Новый пользователь</h3>

          {formError && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{formError}</p>
            </div>
          )}

          {generatedPassword && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-green-50 border border-green-200">
              <Check className="w-4 h-4 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-green-700">Пользователь создан! Пароль:</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm font-mono bg-white px-2 py-1 rounded border border-green-200">
                    {showPassword ? generatedPassword : '********'}
                  </code>
                  <button onClick={() => setShowPassword(!showPassword)} className="p-1 hover:bg-green-100 rounded">
                    {showPassword ? <EyeOff className="w-4 h-4 text-green-600" /> : <Eye className="w-4 h-4 text-green-600" />}
                  </button>
                  <button onClick={copyPassword} className="p-1 hover:bg-green-100 rounded">
                    <Copy className="w-4 h-4 text-green-600" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Email *</label>
              <input
                type="email"
                value={newUserForm.email}
                onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                placeholder="user@orney.ru"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">ФИО *</label>
              <input
                type="text"
                value={newUserForm.fullName}
                onChange={e => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                placeholder="Иванов Иван Иванович"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Роль *</label>
              <select
                value={newUserForm.role}
                onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value as Role })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Телефон</label>
              <input
                type="tel"
                value={newUserForm.phone}
                onChange={e => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Территория</label>
              <input
                type="text"
                value={newUserForm.territory}
                onChange={e => setNewUserForm({ ...newUserForm, territory: e.target.value })}
                placeholder="Самарская область"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button
              onClick={handleAddUser}
              disabled={!newUserForm.email || !newUserForm.fullName}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl"
            >
              <Check className="w-4 h-4 mr-2" />
              Создать пользователя
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowAddUser(false); setFormError(''); setGeneratedPassword(''); }}
              className="rounded-xl"
            >
              <X className="w-4 h-4 mr-2" />
              Отмена
            </Button>
          </div>
        </div>
      )}

      {/* Таблица пользователей */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            Пользователи ({filteredUsers.length})
          </h3>
          <div className="flex items-center gap-2">
            {ROLE_OPTIONS.map(r => (
              <span key={r.value} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${r.color}`}>
                {roleStats[r.value] || 0}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Пользователь</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Роль</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Территория</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Статус</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors ${!user.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{user.fullName}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingUserId === user.id ? (
                      <select
                        defaultValue={user.role}
                        onChange={e => handleUpdateRole(user.id, e.target.value as Role)}
                        onBlur={() => setEditingUserId(null)}
                        className="px-2 py-1 rounded-lg border border-cyan-300 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                        autoFocus
                      >
                        {ROLE_OPTIONS.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600">{user.territory || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${
                      user.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {user.isActive ? 'Активен' : 'Заблокирован'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditingUserId(user.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Изменить роль"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        disabled={user.id === currentUser?.id}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.id === currentUser?.id
                            ? 'text-slate-200 cursor-not-allowed'
                            : user.isActive
                            ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-600'
                            : 'hover:bg-green-50 text-slate-400 hover:text-green-600'
                        }`}
                        title={user.isActive ? 'Заблокировать' : 'Разблокировать'}
                      >
                        {user.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.id === currentUser?.id}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.id === currentUser?.id
                            ? 'text-slate-200 cursor-not-allowed'
                            : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                        }`}
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="px-6 py-12 text-center">
            <UsersIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {searchQuery || roleFilter !== 'all' ? 'Пользователи не найдены' : 'Нет пользователей'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {!searchQuery && roleFilter === 'all' && 'Нажмите "Добавить", чтобы создать первого пользователя'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderData = () => (
    <DateManagement />
  );

  const renderLogs = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Системные логи</h2>
        <p className="text-sm text-slate-500 mt-1">
          Журнал действий пользователей и системных событий
        </p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {logs.map(log => (
            <div key={log.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  log.level === 'error' ? 'bg-red-500' :
                  log.level === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                }`} />
                <div>
                  <p className="text-sm font-medium text-slate-700">{log.action}</p>
                  <p className="text-xs text-slate-400">{log.user} — {log.details}</p>
                </div>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
                {new Date(log.timestamp).toLocaleString('ru-RU')}
              </span>
            </div>
          ))}
        </div>

        {logs.length === 0 && (
          <div className="px-6 py-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Нет записей в логах</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'users':
        return renderUsers();
      case 'employees':
        return <EmployeesManagement />;
      case 'products':
        return <ProductsManagement />;
      case 'territories':
        return <TerritoriesManagement />;
      case 'years':
        return <YearsManagement />;
      case 'data':
        return renderData();
      case 'logs':
        return renderLogs();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Контент вкладки */}
      {renderTabContent()}
    </div>
  );
}
