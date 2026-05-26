// ==================== ОБЪЕДИНЁННЫЙ SIDEBAR ДЛЯ АДМИНА ====================
// Единый sidebar для роли admin, который показывается и в MDLP-mode,
// и в WM-Russia-mode. Три группы: АНАЛИТИКА / УПРАВЛЕНИЕ / СИСТЕМА.
//
// Вызывающий передаёт:
//   - currentMode: 'mdlp' | 'wm-russia' — текущий режим App.tsx
//   - currentMdlpSection, currentAdminSection — текущие активные id для подсветки
//   - onAnalyticsClick(mdlpId) — вызывается для пунктов из АНАЛИТИКА
//   - onAdminClick(sectionId) — вызывается для пунктов из УПРАВЛЕНИЕ/СИСТЕМА
//                              (требует переключения в wm-russia mode)
//   - onLogout — выход
//
// Используется в App.tsx (mdlp mode) и WMRussiaApp.tsx (wm-russia mode для admin)
// чтобы юзер видел один и тот же sidebar независимо от того где он находится.

import React from 'react';
import {
  Home, MapIcon, FileText, Activity, User, Users, Package, Calendar,
  Upload, Settings, Database, LogOut, ChevronRight,
} from 'lucide-react';
import { Logo } from '@/components/common';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ANALYTICS_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Дашборд', icon: Home },
  { id: 'territory', label: 'По территориям', icon: MapIcon },
  { id: 'reports', label: 'Отчёты', icon: FileText },
];

const MANAGEMENT_ITEMS: Array<NavItem & { mdlp?: boolean }> = [
  { id: 'admin-panel', label: 'Панель управления', icon: Activity },
  { id: 'user-management', label: 'Пользователи', icon: User },
  { id: 'employee-management', label: 'Сотрудники', icon: Users },
  { id: 'products-management', label: 'Препараты', icon: Package },
  { id: 'territories-management', label: 'Территории', icon: MapIcon },
  { id: 'data-management', label: 'Управление периодами', icon: Calendar },
  { id: 'upload', label: 'Загрузка файлов МДЛП', icon: Upload, mdlp: true },
];

const SYSTEM_ITEMS: NavItem[] = [
  { id: 'activity-log', label: 'Журнал активности', icon: FileText },
  { id: 'system-settings', label: 'Настройки системы', icon: Settings },
  { id: 'db-stats', label: 'Статистика БД', icon: Database },
];

interface Props {
  userName: string;
  userAvatar?: string;
  currentMode: 'mdlp' | 'wm-russia';
  currentMdlpSection?: string;
  currentAdminSection?: string | null;
  collapsed?: boolean;
  /** Клик по аналитической кнопке — переключение в MDLP mode + setMdlpSection */
  onAnalyticsClick: (mdlpId: string) => void;
  /** Клик по админской кнопке — переключение в wm-russia mode + setAdminTargetSection */
  onAdminClick: (sectionId: string) => void;
  /** Клик по «Загрузка файлов МДЛП» — переключение в MDLP mode на upload */
  onUploadClick: () => void;
  onLogout: () => void;
  onToggleCollapse?: () => void;
}

export function AdminCombinedSidebar({
  userName,
  userAvatar,
  currentMode,
  currentMdlpSection,
  currentAdminSection,
  collapsed = false,
  onAnalyticsClick,
  onAdminClick,
  onUploadClick,
  onLogout,
  onToggleCollapse,
}: Props) {
  const isAnalyticsActive = (id: string) => currentMode === 'mdlp' && currentMdlpSection === id;
  const isAdminActive = (id: string) => currentMode === 'wm-russia' && currentAdminSection === id;
  const isUploadActive = () => currentMode === 'mdlp' && currentMdlpSection === 'upload';

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-64'} bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col transition-all duration-300 relative flex-shrink-0 shadow-2xl`}
    >
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center justify-between mb-4">
          {!collapsed ? (
            <Logo size="normal" showText={true} variant="dark" />
          ) : (
            <div className="mx-auto"><Logo size="normal" showText={false} variant="dark" /></div>
          )}
        </div>
        {!collapsed && (
          <div className="bg-gradient-to-br from-slate-700/50 to-slate-600/30 rounded-xl p-3 flex items-center gap-3 border border-slate-600/30">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-2xl flex-shrink-0">
              {userAvatar || '👤'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate text-white">{userName}</p>
              <p className="text-xs text-cyan-300 truncate">Администратор</p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {/* АНАЛИТИКА */}
        {!collapsed && (
          <div className="px-3 py-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">Аналитика</div>
        )}
        {ANALYTICS_ITEMS.map(item => {
          const active = isAnalyticsActive(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onAnalyticsClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                active
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="flex-1 text-left font-medium">{item.label}</span>}
            </button>
          );
        })}

        {/* УПРАВЛЕНИЕ */}
        <div className="my-3 border-t border-slate-700/50" />
        {!collapsed && (
          <div className="px-3 py-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">Управление</div>
        )}
        {MANAGEMENT_ITEMS.map(item => {
          const active = item.mdlp ? isUploadActive() : isAdminActive(item.id);
          return (
            <button
              key={item.id}
              onClick={() => item.mdlp ? onUploadClick() : onAdminClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                active
                  ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="flex-1 text-left font-medium">{item.label}</span>}
            </button>
          );
        })}

        {/* СИСТЕМА */}
        <div className="my-3 border-t border-slate-700/50" />
        {!collapsed && (
          <div className="px-3 py-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">Система</div>
        )}
        {SYSTEM_ITEMS.map(item => {
          const active = isAdminActive(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onAdminClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                active
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/10 text-purple-400 border border-purple-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="flex-1 text-left font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-slate-700/50 bg-slate-800/30">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm border border-transparent hover:border-red-500/30"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span className="font-medium">Выход</span>}
        </button>
      </div>

      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="hidden md:block absolute -right-3 top-20 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
        >
          <ChevronRight size={14} className={collapsed ? '' : 'rotate-180'} />
        </button>
      )}
    </aside>
  );
}
