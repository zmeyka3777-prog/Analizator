import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { PRODUCTS } from '@/data/salesData';
import { getSalesData, TERRITORIES } from '@/data/salesData';
import { EMPLOYEES, getSubordinates } from '@/data/employees';
import { ProductsTab } from './ProductsTab';
import { EmployeesTabNew } from './EmployeesTabNew';

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
  '#eab308', '#64748b',
];

type Tab = 'overview' | 'products' | 'employees';

// ==================== OverviewTab ====================
function OverviewTab() {
  const year = 2025;

  // KPI: общие продажи за год
  const yearData = useMemo(() => getSalesData({ year }), [year]);

  const totalUnits = useMemo(
    () => yearData.reduce((sum, d) => sum + d.units, 0),
    [yearData],
  );
  const totalRevenue = useMemo(
    () => yearData.reduce((sum, d) => sum + d.revenue, 0),
    [yearData],
  );

  // План = сумма quota2025 по всем продуктам
  const totalPlan = useMemo(
    () => PRODUCTS.reduce((sum, p) => sum + p.quota2025, 0),
    [],
  );
  const completion = totalPlan > 0 ? Math.round((totalUnits / totalPlan) * 100) : 0;

  // Количество сотрудников
  const employeeCount = EMPLOYEES.filter(e => e.status === 'active').length;

  // Продажи по территориям (pie chart)
  const territoryData = useMemo(() => {
    return TERRITORIES.map((territory, i) => {
      const tData = getSalesData({ territory, year });
      const units = tData.reduce((s, d) => s + d.units, 0);
      return { name: territory, value: units, color: COLORS[i % COLORS.length] };
    });
  }, [year]);

  // Помесячная динамика (bar chart)
  const monthlyData = useMemo(() => {
    return MONTHS.map((month, idx) => {
      const mData = getSalesData({ year, month: idx + 1 });
      const units = mData.reduce((s, d) => s + d.units, 0);
      const revenue = mData.reduce((s, d) => s + d.revenue, 0);
      return { month, units, revenue: Math.round(revenue / 1000) };
    });
  }, [year]);

  // Топ-5 препаратов
  const topProducts = useMemo(() => {
    return PRODUCTS.map(product => {
      const pData = getSalesData({ productId: product.id, year });
      const units = pData.reduce((s, d) => s + d.units, 0);
      const plan = product.quota2025;
      const pct = plan > 0 ? Math.round((units / plan) * 100) : 0;
      return { name: product.shortName || product.name, units, plan, pct, budget2025: product.budget2025 };
    })
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [year]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Продажи (упак.)" value={totalUnits.toLocaleString('ru-RU')} subtitle={`План: ${totalPlan.toLocaleString('ru-RU')}`} color="blue" />
        <KPICard title="Выручка" value={`${(totalRevenue / 1_000_000).toFixed(1)} млн`} subtitle={`${year} год`} color="green" />
        <KPICard title="Выполнение плана" value={`${completion}%`} subtitle={completion >= 90 ? 'В норме' : 'Требует внимания'} color={completion >= 90 ? 'green' : completion >= 70 ? 'yellow' : 'red'} />
        <KPICard title="Сотрудники" value={String(employeeCount)} subtitle="Активных" color="purple" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Помесячная динамика */}
        <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Помесячная динамика продаж (упак.)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" />
              <YAxis stroke="rgba(255,255,255,0.6)" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="units" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Упаковки" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Продажи по территориям */}
        <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Продажи по территориям</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={territoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name.split(' ').pop()} ${(percent * 100).toFixed(0)}%`}>
                {territoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Топ-5 препаратов */}
      <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-white mb-4">Топ-5 препаратов по продажам</h3>
        <div className="space-y-3">
          {topProducts.map((p, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="text-white/60 w-6 text-right">{i + 1}.</span>
              <span className="text-white flex-1">{p.name}</span>
              <div className="w-48 bg-white/10 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full"
                  style={{ width: `${Math.min(p.pct, 100)}%`, backgroundColor: p.pct >= 90 ? '#10b981' : p.pct >= 70 ? '#f59e0b' : '#ef4444' }}
                />
              </div>
              <span className="text-white/80 w-16 text-right">{p.pct}%</span>
              <span className="text-white/60 w-28 text-right">{p.units.toLocaleString('ru-RU')} уп.</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== KPICard ====================
function KPICard({ title, value, subtitle, color }: { title: string; value: string; subtitle: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    green: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  };
  return (
    <div className={`wm-card bg-gradient-to-br ${colorMap[color] || colorMap.blue} backdrop-blur-md rounded-2xl p-5 border`}>
      <p className="text-white/60 text-sm">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      <p className="text-white/50 text-xs mt-1">{subtitle}</p>
    </div>
  );
}

// Маппинг sidebar section → внутренняя вкладка
const REGIONAL_SECTION_MAP: Record<string, Tab> = {
  'district-dashboard': 'overview',
  'territories': 'overview',
  'all-medreps': 'employees',
  'analytics': 'products',
  'district-kpi': 'overview',
  'reports': 'overview',
};

// ==================== RegionalManagerDashboard ====================
export default function RegionalManagerDashboard({ activeSection }: { activeSection?: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Синхронизация сайдбара с внутренними вкладками
  React.useEffect(() => {
    if (activeSection) {
      const mapped = REGIONAL_SECTION_MAP[activeSection];
      if (mapped && mapped !== activeTab) {
        setActiveTab(mapped);
      }
    }
  }, [activeSection]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Обзор' },
    { key: 'products', label: 'Препараты' },
    { key: 'employees', label: 'Сотрудники' },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'products' && <ProductsTab />}
      {activeTab === 'employees' && <EmployeesTabNew />}
    </div>
  );
}
