import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { PRODUCTS } from '@/data/salesData';
import { getSalesData, TERRITORIES } from '@/data/salesData';

const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const MONTHS_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
  '#eab308', '#64748b',
];

export function ProductsTab() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const year = 2025;

  // Сводка по всем продуктам
  const productSummary = useMemo(() => {
    return PRODUCTS.map((product, i) => {
      const pData = getSalesData({ productId: product.id, year });
      const totalUnits = pData.reduce((s, d) => s + d.units, 0);
      const totalRevenue = pData.reduce((s, d) => s + d.revenue, 0);
      const plan = product.quota2025;
      const pct = plan > 0 ? Math.round((totalUnits / plan) * 100) : 0;

      return {
        product,
        totalUnits,
        totalRevenue,
        plan,
        pct,
        color: COLORS[i % COLORS.length],
        budget2025: product.budget2025,
      };
    }).sort((a, b) => b.totalUnits - a.totalUnits);
  }, [year]);

  // Данные выбранного продукта: план-факт по месяцам
  const selectedDetail = useMemo(() => {
    if (!selectedProductId) return null;
    const product = PRODUCTS.find(p => p.id === selectedProductId);
    if (!product) return null;

    const monthlyPlan = product.quota2025 / 12;
    const seasonality = [0.95, 0.88, 1.02, 1.05, 0.98, 0.92, 0.85, 0.90, 1.08, 1.15, 1.18, 1.04];

    const months = MONTHS_SHORT.map((month, idx) => {
      const mData = getSalesData({ productId: selectedProductId, year, month: idx + 1 });
      const fact = mData.reduce((s, d) => s + d.units, 0);
      const plan = Math.round(monthlyPlan * seasonality[idx]);
      return { month, plan, fact, delta: fact - plan };
    });

    // По территориям
    const territories = TERRITORIES.map(territory => {
      const tData = getSalesData({ productId: selectedProductId, territory, year });
      const units = tData.reduce((s, d) => s + d.units, 0);
      return { territory, units };
    }).sort((a, b) => b.units - a.units);

    return { product, months, territories };
  }, [selectedProductId, year]);

  return (
    <div className="space-y-6">
      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {productSummary.map(({ product, totalUnits, totalRevenue, plan, pct, color }) => (
          <button
            key={product.id}
            onClick={() => setSelectedProductId(prev => prev === product.id ? null : product.id)}
            className={`wm-card text-left bg-white/10 backdrop-blur-md rounded-2xl p-4 border transition-all hover:bg-white/15 ${
              selectedProductId === product.id ? 'border-blue-500/50 ring-1 ring-blue-500/30' : 'border-white/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-sm font-medium text-white truncate">{product.shortName || product.name}</span>
            </div>
            <p className="text-xl font-bold text-white">{totalUnits.toLocaleString('ru-RU')} <span className="text-sm font-normal text-white/50">уп.</span></p>
            <p className="text-xs text-white/50 mt-1">{(totalRevenue / 1_000_000).toFixed(1)} млн руб.</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/50">Выполнение</span>
                <span className={pct >= 90 ? 'text-emerald-400' : pct >= 70 ? 'text-yellow-400' : 'text-red-400'}>{pct}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444' }}
                />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Детализация выбранного препарата */}
      {selectedDetail && (
        <div className="space-y-6">
          <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">
              {selectedDetail.product.shortName || selectedDetail.product.name} - план/факт по месяцам
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={selectedDetail.months}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" />
                <YAxis stroke="rgba(255,255,255,0.6)" />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Legend />
                <Bar dataKey="plan" fill="#8b5cf6" name="План" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fact" fill="#3b82f6" name="Факт" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Таблица план-факт по месяцам */}
          <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 overflow-x-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Детализация по месяцам</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/60 py-2 pr-4">Месяц</th>
                  <th className="text-right text-white/60 py-2 px-4">План</th>
                  <th className="text-right text-white/60 py-2 px-4">Факт</th>
                  <th className="text-right text-white/60 py-2 px-4">Отклонение</th>
                  <th className="text-right text-white/60 py-2 pl-4">%</th>
                </tr>
              </thead>
              <tbody>
                {selectedDetail.months.map((m, i) => {
                  const pct = m.plan > 0 ? Math.round((m.fact / m.plan) * 100) : 0;
                  return (
                    <tr key={i} className="border-b border-white/5">
                      <td className="text-white py-2 pr-4">{MONTHS_FULL[i]}</td>
                      <td className="text-white/80 text-right py-2 px-4">{m.plan.toLocaleString('ru-RU')}</td>
                      <td className="text-white text-right py-2 px-4">{m.fact.toLocaleString('ru-RU')}</td>
                      <td className={`text-right py-2 px-4 ${m.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {m.delta >= 0 ? '+' : ''}{m.delta.toLocaleString('ru-RU')}
                      </td>
                      <td className={`text-right py-2 pl-4 ${pct >= 90 ? 'text-emerald-400' : pct >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Продажи по территориям */}
          <div className="wm-card bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Продажи по территориям</h3>
            <div className="space-y-2">
              {selectedDetail.territories.map((t, i) => {
                const maxUnits = selectedDetail.territories[0]?.units || 1;
                const width = Math.round((t.units / maxUnits) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-white/80 w-48 text-sm truncate">{t.territory}</span>
                    <div className="flex-1 bg-white/10 rounded-full h-2">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${width}%` }} />
                    </div>
                    <span className="text-white/60 text-sm w-24 text-right">{t.units.toLocaleString('ru-RU')} уп.</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
