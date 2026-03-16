import { useState } from 'react';
import { LogOut, Menu, X, BarChart3 } from 'lucide-react';
import { WMUserRole } from '@/types';
import { cn } from '../ui/utils';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
}

interface WMRussiaSidebarProps {
  userRole: WMUserRole;
  userName: string;
  activeSection: string;
  onNavigate: (section: string) => void;
  onLogout: () => void;
  onBackToMDLP?: () => void;
}

const menuItemsByRole: Record<WMUserRole, MenuItem[]> = {
  medrep: [
    { id: 'my-sales', label: 'Мои продажи', icon: '📊' },
    { id: 'dynamics', label: 'Динамика', icon: '📈' },
    { id: 'my-kpi', label: 'Мои KPI', icon: '🎯' },
  ],
  territory_manager: [
    { id: 'my-territory', label: 'Моя территория', icon: '📊' },
    { id: 'team', label: 'Команда', icon: '👥' },
    { id: 'compare', label: 'Сравнительная аналитика', icon: '📈' },
    { id: 'territory-kpi', label: 'KPI территории', icon: '🎯' },
  ],
  manager: [
    { id: 'district-dashboard', label: 'Дашборд округа', icon: '📊' },
    { id: 'territories', label: 'Территории', icon: '🗺️' },
    { id: 'all-medreps', label: 'Все медпреды', icon: '👥' },
    { id: 'analytics', label: 'Аналитика', icon: '📈' },
    { id: 'district-kpi', label: 'KPI округа', icon: '🎯' },
    { id: 'reports', label: 'Отчёты', icon: '📑' },
  ],
  director: [
    { id: 'director-dashboard', label: 'Общая панель', icon: '🏢' },
    { id: 'russia-map', label: 'Карта России', icon: '🗺️' },
    { id: 'federal-districts', label: 'Федеральные округа', icon: '📊' },
    { id: 'compare-analytics', label: 'Сравнительная аналитика', icon: '📈' },
    { id: 'all-employees', label: 'Все сотрудники', icon: '👥' },
    { id: 'budget-calculator', label: 'Бюджетный калькулятор', icon: '🧮' },
    { id: 'products-analytics', label: 'Продуктовая аналитика', icon: '💊' },
    { id: 'territories-tab', label: 'Территории', icon: '🗺️' },
    { id: 'reports', label: 'Отчёты', icon: '📑' },
    { id: 'upload', label: 'Загрузка данных', icon: '⬆️' },
  ],
  admin: [
    { id: 'admin-panel', label: 'Панель управления', icon: '🔧' },
    { id: 'user-management', label: 'Пользователи', icon: '👤' },
    { id: 'employee-management', label: 'Сотрудники', icon: '👥' },
    { id: 'data-management', label: 'Управление данными', icon: '🗄️' },
    { id: 'system-settings', label: 'Настройки системы', icon: '⚙️' },
    { id: 'upload', label: 'Загрузка данных', icon: '⬆️' },
    { id: 'activity-log', label: 'Журнал активности', icon: '📋' },
    { id: 'db-stats', label: 'Статистика БД', icon: '📊' },
  ],
};

const roleLabels: Record<WMUserRole, string> = {
  medrep: 'Медпред',
  territory_manager: 'Территориальный менеджер',
  manager: 'Менеджер округа',
  director: 'Генеральный директор',
  admin: 'Администратор',
};

const roleBadgeColors: Record<WMUserRole, string> = {
  medrep: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  territory_manager: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  manager: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  director: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  admin: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export function WMRussiaSidebar({
  userRole,
  userName,
  activeSection,
  onNavigate,
  onLogout,
  onBackToMDLP,
}: WMRussiaSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuItems = menuItemsByRole[userRole] || [];

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="wm-sidebar-logo p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-white font-black text-sm" style={{ color: '#fff' }}>WM</span>
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">WM Russia</h1>
            <p className="text-xs text-gray-500">Аналитика продаж</p>
          </div>
        </div>
      </div>

      {/* Back to MDLP button */}
      {onBackToMDLP && (
        <div className="px-3 pt-3">
          <button
            onClick={onBackToMDLP}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-cyan-300 hover:bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all"
          >
            <BarChart3 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">← Анализатор МДЛП</span>
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => {
                  onNavigate(item.id);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                  activeSection === item.id
                    ? 'wm-active bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 font-medium shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <span className="text-base">{item.icon}</span>
                <span className="truncate">{item.label}</span>
                {activeSection === item.id && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* User profile */}
      <div className="wm-user-section p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">
              {userName.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-white truncate">{userName}</p>
            <span className={cn('text-xs px-2 py-0.5 rounded-full border', roleBadgeColors[userRole])}>
              {roleLabels[userRole]}
            </span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-xl transition-all hover:bg-red-500/5"
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile burger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900/90 backdrop-blur border border-white/10 rounded-xl shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          'wm-sidebar md:hidden fixed inset-y-0 left-0 z-40 w-72 flex flex-col bg-slate-900/95 backdrop-blur-xl border-r border-white/10 transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="wm-sidebar hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-slate-900/95 backdrop-blur-xl border-r border-white/10">
        {sidebarContent}
      </div>
    </>
  );
}
