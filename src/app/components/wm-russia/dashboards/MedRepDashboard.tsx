import React, { useState, useMemo, useEffect } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { MedRepData } from '@/types';
import { getMedRepProductSales, calcCompletionPercent } from '@/data/wmRussiaData';

type MedRepTab = 'sales' | 'dynamics' | 'kpi';

const MEDREP_SECTION_MAP: Record<string, MedRepTab> = {
  'my-sales': 'sales',
  'dynamics': 'dynamics',
  'my-kpi': 'kpi',
};

interface MedRepDashboardProps {
  medRepData: MedRepData;
  ranking: { position: number; total: number };
  activeSection?: string;
}

const CARD = 'wm-card bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden';
const TT = { backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e2e8f0' };

const completionColor = (p: number) => p >= 95 ? '#10b981' : p >= 85 ? '#f59e0b' : '#ef4444';
const completionBadge = (p: number) =>
  p >= 95
    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    : p >= 85
    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    : 'bg-red-500/20 text-red-400 border border-red-500/30';

const fmt = (v: number) => new Intl.NumberFormat('ru-RU').format(v);
const fmtMoney = (v: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

// ==================== TAB: МОИ ПРОДАЖИ ====================
function SalesTab({ medRepData, ranking }: { medRepData: MedRepData; ranking: { position: number; total: number } }) {
  const productSales = getMedRepProductSales(medRepData);
  const overallCompletion = calcCompletionPercent(medRepData.totalPackagesFact, medRepData.totalPackagesPlan);
  const moneyCompletion = calcCompletionPercent(medRepData.totalMoneyFact, medRepData.totalMoneyPlan);
  const pieData = productSales.map(p => ({ name: p.productName, value: p.fact, color: p.color }));
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (Math.min(overallCompletion, 100) / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Упаковки план', value: fmt(medRepData.totalPackagesPlan), pct: null, color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30' },
          { label: 'Упаковки факт', value: fmt(medRepData.totalPackagesFact), pct: overallCompletion, color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30' },
          { label: 'Деньги план', value: fmtMoney(medRepData.totalMoneyPlan), pct: null, color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30' },
          { label: 'Деньги факт', value: fmtMoney(medRepData.totalMoneyFact), pct: moneyCompletion, color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30' },
        ].map(({ label, value, pct, color }) => (
          <div key={label} className={`bg-gradient-to-br ${color} backdrop-blur-md rounded-2xl p-5 border`}>
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-xl font-bold text-white truncate">{value}</p>
            {pct !== null && (
              <p className="text-xs mt-1 font-medium" style={{ color: completionColor(pct) }}>
                {pct.toFixed(1)}% выполнения
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gauge */}
        <div className={CARD + ' p-6 flex flex-col items-center justify-center'}>
          <p className="text-sm text-gray-400 mb-4 font-medium">Выполнение плана</p>
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
              <circle
                cx="50" cy="50" r="45"
                stroke={completionColor(overallCompletion)}
                strokeWidth="8" fill="none" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-white">{overallCompletion.toFixed(0)}%</span>
              <span className="text-xs text-gray-500">упаковки</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400 text-center">
            {fmt(medRepData.totalPackagesFact)} из {fmt(medRepData.totalPackagesPlan)} упаковок
          </p>
        </div>

        {/* Pie */}
        <div className={CARD + ' p-6 lg:col-span-2'}>
          <p className="text-sm text-gray-400 mb-4 font-medium">Распределение продаж по продуктам</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="40%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={TT} />
                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className={CARD}>
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="font-semibold text-white">Продажи по продуктам</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-3 text-cyan-400 font-medium text-xs">Продукт</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">План</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">Факт</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">%</th>
                <th className="px-6 py-3 text-cyan-400 font-medium text-xs w-40">Прогресс</th>
              </tr>
            </thead>
            <tbody>
              {productSales.map((product) => {
                const capped = Math.min(product.completionPercent, 100);
                return (
                  <tr key={product.productId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: product.color }} />
                        <span className="text-gray-300">{product.productName}</span>
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 text-gray-400">{fmt(product.plan)}</td>
                    <td className="text-right px-4 py-3 text-white font-medium">{fmt(product.fact)}</td>
                    <td className="text-right px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${completionBadge(product.completionPercent)}`}>
                        {product.completionPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${capped}%`, backgroundColor: product.color }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />≥95% — В плане</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />85–94% — Внимание</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />&lt;85% — Критично</span>
      </div>
    </div>
  );
}

// ==================== TAB: ДИНАМИКА ====================
function DynamicsTab({ medRepData }: { medRepData: MedRepData }) {
  const productSales = getMedRepProductSales(medRepData);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Генерируем помесячные данные (синтетика на базе факта)
  const monthlyData = useMemo(() => {
    // Распределение по месяцам (условное — плавная кривая с сезонностью)
    const weights = [0.06, 0.07, 0.08, 0.09, 0.10, 0.09, 0.07, 0.08, 0.10, 0.10, 0.09, 0.07];
    return MONTHS.map((month, i) => {
      const row: Record<string, string | number> = { month };
      let totalFact = 0;
      let totalPlan = 0;
      productSales.forEach(p => {
        const fact = Math.round(p.fact * weights[i]);
        const plan = Math.round(p.plan / 12);
        row[`${p.productId}_fact`] = fact;
        row[`${p.productId}_plan`] = plan;
        totalFact += fact;
        totalPlan += plan;
      });
      row.totalFact = totalFact;
      row.totalPlan = totalPlan;
      return row;
    });
  }, [productSales]);

  // Кумулятивные данные
  const cumulativeData = useMemo(() => {
    let cumFact = 0;
    let cumPlan = 0;
    return monthlyData.map(row => {
      cumFact += row.totalFact as number;
      cumPlan += row.totalPlan as number;
      return { month: row.month, cumFact, cumPlan };
    });
  }, [monthlyData]);

  const filteredProducts = selectedProduct
    ? productSales.filter(p => p.productId === selectedProduct)
    : productSales;

  return (
    <div className="space-y-6">
      {/* Фильтр по продуктам */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedProduct(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !selectedProduct ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-white/60 hover:text-white/80 bg-white/5 border border-white/10'
          }`}
        >
          Все препараты
        </button>
        {productSales.map(p => (
          <button
            key={p.productId}
            onClick={() => setSelectedProduct(p.productId)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              selectedProduct === p.productId ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-white/60 hover:text-white/80 bg-white/5 border border-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.productName.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Помесячная динамика */}
      <div className={CARD + ' p-6'}>
        <h3 className="text-sm font-medium text-gray-400 mb-4">Помесячная динамика продаж (упаковки)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={TT} formatter={(v: number) => fmt(v)} />
              {filteredProducts.map(p => (
                <Bar key={p.productId} dataKey={`${p.productId}_fact`} fill={p.color} radius={[2, 2, 0, 0]} stackId="a" name={p.productName} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Кумулятивное выполнение */}
      <div className={CARD + ' p-6'}>
        <h3 className="text-sm font-medium text-gray-400 mb-4">Кумулятивное выполнение плана</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulativeData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={TT} formatter={(v: number) => fmt(v)} />
              <Line type="monotone" dataKey="cumPlan" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} name="План (кум.)" />
              <Line type="monotone" dataKey="cumFact" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Факт (кум.)" />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Таблица помесячных продаж */}
      <div className={CARD}>
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="font-semibold text-white">Детализация по месяцам</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-cyan-400 font-medium text-xs text-left">Месяц</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">План</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">Факт</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">%</th>
                <th className="px-4 py-3 text-cyan-400 font-medium text-xs w-32">Прогресс</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((row) => {
                const plan = row.totalPlan as number;
                const fact = row.totalFact as number;
                const pct = plan > 0 ? (fact / plan) * 100 : 0;
                return (
                  <tr key={row.month as string} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-medium text-left">{row.month}</td>
                    <td className="text-right px-4 py-3 text-gray-400">{fmt(plan)}</td>
                    <td className="text-right px-4 py-3 text-white">{fmt(fact)}</td>
                    <td className="text-right px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${completionBadge(pct)}`}>
                        {pct.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: completionColor(pct) }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== TAB: МОИ KPI ====================
function KPITab({ medRepData, ranking }: { medRepData: MedRepData; ranking: { position: number; total: number } }) {
  const productSales = getMedRepProductSales(medRepData);
  const overallCompletion = calcCompletionPercent(medRepData.totalPackagesFact, medRepData.totalPackagesPlan);
  const moneyCompletion = calcCompletionPercent(medRepData.totalMoneyFact, medRepData.totalMoneyPlan);

  // Радарные данные по продуктам
  const radarData = productSales.map(p => ({
    product: p.productName.split(' ')[0],
    completion: Math.min(p.completionPercent, 120),
    fullName: p.productName,
  }));

  // Продукты выше и ниже плана
  const abovePlan = productSales.filter(p => p.completionPercent >= 95);
  const belowPlan = productSales.filter(p => p.completionPercent < 85);
  const atRisk = productSales.filter(p => p.completionPercent >= 85 && p.completionPercent < 95);

  // Средний % выполнения
  const avgCompletion = productSales.length > 0
    ? productSales.reduce((s, p) => s + p.completionPercent, 0) / productSales.length
    : 0;

  // Рейтинг (из пропсов)
  const ratingPct = ranking.total > 0 ? ((ranking.total - ranking.position + 1) / ranking.total * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 backdrop-blur-md rounded-2xl p-5 border`}>
          <p className="text-xs text-gray-400 mb-1">Рейтинг в округе</p>
          <p className="text-3xl font-black text-white">{ranking.position}<span className="text-lg text-gray-400">/{ranking.total}</span></p>
          <p className="text-xs mt-1 text-cyan-400 font-medium">Топ {ratingPct.toFixed(0)}%</p>
        </div>
        <div className={`bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 backdrop-blur-md rounded-2xl p-5 border`}>
          <p className="text-xs text-gray-400 mb-1">Выполнение (упак.)</p>
          <p className="text-3xl font-black text-white">{overallCompletion.toFixed(1)}%</p>
          <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(overallCompletion, 100)}%`, backgroundColor: completionColor(overallCompletion) }} />
          </div>
        </div>
        <div className={`bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30 backdrop-blur-md rounded-2xl p-5 border`}>
          <p className="text-xs text-gray-400 mb-1">Выполнение (₽)</p>
          <p className="text-3xl font-black text-white">{moneyCompletion.toFixed(1)}%</p>
          <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(moneyCompletion, 100)}%`, backgroundColor: completionColor(moneyCompletion) }} />
          </div>
        </div>
        <div className={`bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30 backdrop-blur-md rounded-2xl p-5 border`}>
          <p className="text-xs text-gray-400 mb-1">Среднее по препаратам</p>
          <p className="text-3xl font-black text-white">{avgCompletion.toFixed(1)}%</p>
          <p className="text-xs mt-1 text-gray-400">{productSales.length} препаратов</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className={CARD + ' p-6'}>
          <h3 className="text-sm font-medium text-gray-400 mb-4">Профиль выполнения по препаратам</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="product" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <PolarRadiusAxis angle={30} domain={[0, 120]} tick={{ fontSize: 9, fill: '#64748b' }} />
                <Radar name="Выполнение %" dataKey="completion" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} strokeWidth={2} />
                <Tooltip contentStyle={TT} formatter={(v: number) => `${v.toFixed(1)}%`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Статусы препаратов */}
        <div className="space-y-4">
          {/* В плане */}
          <div className={CARD + ' p-5'}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <h4 className="text-sm font-medium text-white">В плане ({abovePlan.length})</h4>
            </div>
            {abovePlan.length > 0 ? (
              <div className="space-y-2">
                {abovePlan.map(p => (
                  <div key={p.productId} className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">{p.productName}</span>
                    <span className="text-xs font-bold text-emerald-400">{p.completionPercent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Нет препаратов в плане</p>
            )}
          </div>

          {/* Требуют внимания */}
          <div className={CARD + ' p-5'}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <h4 className="text-sm font-medium text-white">Внимание ({atRisk.length})</h4>
            </div>
            {atRisk.length > 0 ? (
              <div className="space-y-2">
                {atRisk.map(p => (
                  <div key={p.productId} className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">{p.productName}</span>
                    <span className="text-xs font-bold text-amber-400">{p.completionPercent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Нет</p>
            )}
          </div>

          {/* Критично */}
          <div className={CARD + ' p-5'}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <h4 className="text-sm font-medium text-white">Критично ({belowPlan.length})</h4>
            </div>
            {belowPlan.length > 0 ? (
              <div className="space-y-2">
                {belowPlan.map(p => (
                  <div key={p.productId} className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">{p.productName}</span>
                    <span className="text-xs font-bold text-red-400">{p.completionPercent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Нет критичных отклонений</p>
            )}
          </div>
        </div>
      </div>

      {/* Детальная таблица KPI */}
      <div className={CARD}>
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="font-semibold text-white">Детализация KPI по препаратам</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-3 text-cyan-400 font-medium text-xs">Препарат</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">План (упак.)</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">Факт (упак.)</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">Отклонение</th>
                <th className="text-right px-4 py-3 text-cyan-400 font-medium text-xs">%</th>
                <th className="text-center px-4 py-3 text-cyan-400 font-medium text-xs">Статус</th>
              </tr>
            </thead>
            <tbody>
              {productSales.map((p) => {
                const delta = p.fact - p.plan;
                return (
                  <tr key={p.productId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-gray-300">{p.productName}</span>
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 text-gray-400">{fmt(p.plan)}</td>
                    <td className="text-right px-4 py-3 text-white font-medium">{fmt(p.fact)}</td>
                    <td className="text-right px-4 py-3">
                      <span className={delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {delta >= 0 ? '+' : ''}{fmt(delta)}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3 font-bold" style={{ color: completionColor(p.completionPercent) }}>
                      {p.completionPercent.toFixed(1)}%
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${completionBadge(p.completionPercent)}`}>
                        {p.completionPercent >= 95 ? 'В плане' : p.completionPercent >= 85 ? 'Внимание' : 'Критично'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================
export function MedRepDashboard({ medRepData, ranking, activeSection }: MedRepDashboardProps) {
  const [activeTab, setActiveTab] = useState<MedRepTab>('sales');

  // Синхронизация сайдбара
  useEffect(() => {
    if (activeSection) {
      const mapped = MEDREP_SECTION_MAP[activeSection];
      if (mapped && mapped !== activeTab) {
        setActiveTab(mapped);
      }
    }
  }, [activeSection]);

  const tabs: { key: MedRepTab; label: string }[] = [
    { key: 'sales', label: 'Мои продажи' },
    { key: 'dynamics', label: 'Динамика' },
    { key: 'kpi', label: 'Мои KPI' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {medRepData.name}
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">{medRepData.territory}, {medRepData.district}</p>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full border font-medium ${completionBadge(calcCompletionPercent(medRepData.totalPackagesFact, medRepData.totalPackagesPlan))}`}>
          Место {ranking.position} из {ranking.total}
        </span>
      </div>

      {/* Tabs */}
      <div className="wm-tab-bar flex gap-2 bg-white/5 backdrop-blur-md rounded-xl p-1 border border-white/10 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-white/60 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'sales' && <SalesTab medRepData={medRepData} ranking={ranking} />}
      {activeTab === 'dynamics' && <DynamicsTab medRepData={medRepData} />}
      {activeTab === 'kpi' && <KPITab medRepData={medRepData} ranking={ranking} />}
    </div>
  );
}

export default MedRepDashboard;
