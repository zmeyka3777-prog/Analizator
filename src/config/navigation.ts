import { 
  Upload, TrendingUp, Map, Target, FileText, Building2,
  AlertTriangle, Layers, Activity, Database, Home, Navigation
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  gradient: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'upload', label: 'Загрузка', icon: Upload, gradient: 'from-blue-500 to-blue-600' },
  { id: 'dashboard', label: 'Дашборд', icon: Home, gradient: 'from-cyan-500 to-blue-600' },
  { id: 'datamanager', label: 'Управление', icon: Database, gradient: 'from-emerald-500 to-emerald-600' },
  { id: 'problems', label: 'Проблемы', icon: AlertTriangle, gradient: 'from-red-500 to-red-600' },
  { id: 'compare', label: 'Сравнение', icon: Layers, gradient: 'from-purple-500 to-purple-600' },
  { id: 'territory', label: 'Территории', icon: Map, gradient: 'from-indigo-500 to-indigo-600' },
  { id: 'drilldown', label: 'Детализация', icon: Navigation, gradient: 'from-cyan-500 to-cyan-600' },
  { id: 'abc', label: 'ABC', icon: Target, gradient: 'from-amber-500 to-amber-600' },
  { id: 'seasonality', label: 'Сезонность', icon: Activity, gradient: 'from-pink-500 to-pink-600' },
  { id: 'forecast', label: 'Прогноз', icon: TrendingUp, gradient: 'from-teal-500 to-teal-600' },
  { id: 'contragents', label: 'Контрагенты', icon: Building2, gradient: 'from-slate-500 to-slate-600' },
  { id: 'reports', label: 'Отчёты', icon: FileText, gradient: 'from-violet-500 to-violet-600' },
];

export function getNavItem(id: string): NavItem | undefined {
  return NAV_ITEMS.find(item => item.id === id);
}
