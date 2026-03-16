import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Employee } from '@/data/employees';
import { PRODUCTS } from '@/data/salesData';
import { getSalesData } from '@/data/salesData';

const MONTHS_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

interface Props {
  employee: Employee;
  onClose: () => void;
}

export function MPDetailModal({ employee, onClose }: Props) {
  const year = 2025;
  const territory = employee.territory;

  // Получаем все продажи по территории МП
  const salesData = useMemo(
    () => getSalesData({ territory, year }),
    [territory, year],
  );

  // Количество МП на территории для пропорционального разделения
  // (упрощённо: берём все данные территории)
  const allMPsOnTerritory = 1; // Для простоты показываем данные территории

  // Таблица план-факт по продуктам и месяцам
  const productMonthlyData = useMemo(() => {
    return PRODUCTS.map(product => {
      const productPlan = employee.productPlans[product.id] || 0;
      const monthlyPlan = productPlan > 0 ? Math.round(productPlan / 12) : 0;

      const months = MONTHS_SHORT.map((_, monthIndex) => {
        // FIX: используем d.month (1-indexed) вместо d.date
        const monthSales = salesData.filter(d => d.month === monthIndex + 1 && d.productId === product.id);
        const fact = monthSales.reduce((s, d) => s + d.units, 0);
        return { plan: monthlyPlan, fact };
      });

      const totalPlan = productPlan;
      const totalFact = months.reduce((s, m) => s + m.fact, 0);
      const pct = totalPlan > 0 ? Math.round((totalFact / totalPlan) * 100) : (totalFact > 0 ? 100 : 0);

      return {
        product,
        months,
        totalPlan,
        totalFact,
        pct,
      };
    });
  }, [salesData, employee]);

  // Данные для графика (суммарные план-факт по месяцам)
  const chartData = useMemo(() => {
    return MONTHS_SHORT.map((month, idx) => {
      let plan = 0;
      let fact = 0;
      productMonthlyData.forEach(p => {
        plan += p.months[idx].plan;
        fact += p.months[idx].fact;
      });
      return { month, plan, fact };
    });
  }, [productMonthlyData]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl border border-white/20 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">
              {employee.lastName} {employee.firstName} {employee.middleName || ''}
            </h2>
            <p className="text-white/50 text-sm">{employee.territory} | {employee.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 transition-all p-2 rounded-lg hover:bg-white/10"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Chart */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-sm font-semibold text-white mb-3">Помесячная динамика (план / факт)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Legend />
                <Bar dataKey="plan" fill="#8b5cf6" name="План" radius={[2, 2, 0, 0]} />
                <Bar dataKey="fact" fill="#3b82f6" name="Факт" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table: products x months */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 overflow-x-auto">
            <h3 className="text-sm font-semibold text-white mb-3">Детализация по препаратам и месяцам</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/60 py-2 pr-3 sticky left-0 bg-gray-900/90">Препарат</th>
                  {MONTHS_SHORT.map(m => (
                    <th key={m} className="text-center text-white/60 py-2 px-2 min-w-[60px]">{m}</th>
                  ))}
                  <th className="text-right text-white/60 py-2 px-2">Итого</th>
                  <th className="text-right text-white/60 py-2 pl-2">%</th>
                </tr>
              </thead>
              <tbody>
                {productMonthlyData.map(({ product, months, totalPlan, totalFact, pct }) => (
                  <React.Fragment key={product.id}>
                    {/* План */}
                    <tr className="border-b border-white/5">
                      <td rowSpan={2} className="text-white py-1.5 pr-3 sticky left-0 bg-gray-900/90 align-middle text-xs">
                        {product.shortName || product.name}
                      </td>
                      {months.map((m, i) => (
                        <td key={i} className="text-center text-white/50 py-1 px-1">{m.plan || '-'}</td>
                      ))}
                      <td className="text-right text-white/50 py-1 px-2">{totalPlan.toLocaleString('ru-RU')}</td>
                      <td rowSpan={2} className={`text-right py-1 pl-2 align-middle font-medium ${pct >= 90 ? 'text-emerald-400' : pct >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {pct}%
                      </td>
                    </tr>
                    {/* Факт */}
                    <tr className="border-b border-white/10">
                      {months.map((m, i) => (
                        <td key={i} className={`text-center py-1 px-1 ${m.fact >= m.plan ? 'text-emerald-400' : 'text-red-400'}`}>
                          {m.fact || '-'}
                        </td>
                      ))}
                      <td className="text-right text-white py-1 px-2 font-medium">{totalFact.toLocaleString('ru-RU')}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all text-sm"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
