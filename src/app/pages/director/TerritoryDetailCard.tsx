// ==================== ДЕТАЛЬНАЯ КАРТОЧКА ТЕРРИТОРИИ ====================
// План/факт по территории. План — РЕАЛЬНЫЙ из БД regional_plans (то, что РМ
// ввёл во вкладке «Планы»), факт — из загруженной выгрузки МДЛП.
//
// Раньше планы брались из in-memory мока regionalPlansManager с выдуманным
// «Ивановым Иваном Ивановичем» и тест-статусами, fallback выдумывал план
// quota2025×1.18, а редактирование цены писало в тот же мок и терялось при
// перезагрузке. Теперь: нет плана → честное «план не задан», цены — из
// каталога (управление ценами централизовано в админке).

import React, { useMemo } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  ArrowLeft,
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Target,
  Activity,
  User,
  AlertTriangle,
} from 'lucide-react';
import { PRODUCTS, getSalesData } from '@/data/salesData';
import { Territory } from '@/data/federalDistricts';
import { useSharedData } from '@/context/SharedDataContext';
import { useGlobalFilters } from '@/context/GlobalFiltersContext';
import { useRegionalPlans } from '@/hooks/useRegionalPlans';

interface TerritoryDetailCardProps {
  territory: Territory;
  districtName: string;
  districtColor: string;
  onBack: () => void;
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(num));
};

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(num);
};

export default function TerritoryDetailCard({
  territory,
  districtName,
  districtColor,
  onBack
}: TerritoryDetailCardProps) {
  const yearCurrent = new Date().getFullYear();
  const yearPrev = yearCurrent - 1;

  const { wmRussiaData } = useSharedData();
  const { selectedMonths } = useGlobalFilters();

  // Реальные планы РМ за текущий год, отфильтрованные по этой территории.
  const allPlans = useRegionalPlans(yearCurrent, wmRussiaData);
  const monthSet = selectedMonths.length ? new Set(selectedMonths) : null;
  const territoryPlans = useMemo(
    () => allPlans.filter(p =>
      p.region_name === territory.name && (!monthSet || monthSet.has(p.month))
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allPlans, territory.name, selectedMonths],
  );
  const hasPlan = territoryPlans.length > 0;
  const planAuthor = territoryPlans.find(p => p.user_name)?.user_name;

  // Факт из выгрузки (реактивно на загрузку файла и фильтр месяцев).
  const territoryDataPrev = useMemo(
    () => getSalesData({ territory: territory.name, year: yearPrev, months: selectedMonths }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [territory.name, yearPrev, selectedMonths, wmRussiaData],
  );
  const territoryDataCurrent = useMemo(
    () => getSalesData({ territory: territory.name, year: yearCurrent, months: selectedMonths }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [territory.name, yearCurrent, selectedMonths, wmRussiaData],
  );

  const totalUnitsPrev = territoryDataPrev.reduce((sum, d) => sum + d.units, 0);
  const totalUnitsCurrent = territoryDataCurrent.reduce((sum, d) => sum + d.units, 0);
  const totalRevenueCurrent = territoryDataCurrent.reduce((sum, d) => sum + d.revenue, 0);

  // Данные по препаратам: план из regional_plans (сумма месяцев), факт из выгрузки.
  const productStats = PRODUCTS.map(product => {
    const dataCurrent = territoryDataCurrent.filter(d => d.productId === product.id);
    const unitsCurrent = dataCurrent.reduce((sum, d) => sum + d.units, 0);
    const revenueCurrent = dataCurrent.reduce((sum, d) => sum + d.revenue, 0);

    const planUnits = territoryPlans
      .filter(p => p.product_id === product.id)
      .reduce((sum, p) => sum + (p.plan_units || 0), 0);
    const planRevenue = planUnits * product.price;

    const completionUnits = planUnits > 0 ? (unitsCurrent / planUnits) * 100 : null;

    return { product, unitsCurrent, revenueCurrent, planUnits, planRevenue, completionUnits };
  });

  const planUnitsTotal = productStats.reduce((sum, s) => sum + s.planUnits, 0);
  const planRevenueTotal = productStats.reduce((sum, s) => sum + s.planRevenue, 0);
  const planCompletionUnits = planUnitsTotal > 0 ? (totalUnitsCurrent / planUnitsTotal) * 100 : null;
  const growthUnits = totalUnitsPrev > 0 ? ((totalUnitsCurrent - totalUnitsPrev) / totalUnitsPrev) * 100 : null;

  const getCompletionColor = (percent: number) => {
    if (percent >= 90) return 'text-green-600 bg-green-50';
    if (percent >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      {/* Заголовок с кнопкой "Назад" */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={onBack}
            className="flex items-center gap-2 bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white px-4 py-2 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад к калькулятору
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: districtColor }} />
            <span className="text-sm text-slate-500">{districtName}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{territory.name}</h2>
            <p className="text-sm text-slate-500 mt-1">План/факт {yearCurrent} — план из данных РМ, факт из выгрузки МДЛП</p>
            {hasPlan && planAuthor && (
              <div className="flex items-center gap-1 text-sm text-slate-600 mt-2">
                <User className="w-4 h-4" />
                <span>План заполнил: {planAuthor}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            {hasPlan ? (
              <>
                <p className="text-xs text-slate-500">План {yearCurrent} (руб., по каталожным ценам)</p>
                <p className="text-xl font-bold text-slate-800">{formatCurrency(planRevenueTotal)}</p>
              </>
            ) : (
              <p className="text-sm text-orange-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                План не создан РМ на {yearCurrent} год
              </p>
            )}
          </div>
        </div>
      </div>

      {/* KPI карточки план/факт */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-8 h-8 opacity-80" />
            <Target className="w-6 h-6 opacity-60" />
          </div>
          <p className="text-sm opacity-90 mb-1">План {yearCurrent} (упак.)</p>
          <p className="text-3xl font-bold">{hasPlan ? formatNumber(planUnitsTotal) : '—'}</p>
          {!hasPlan && <p className="text-xs opacity-80 mt-1">план не задан</p>}
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <ShoppingCart className="w-8 h-8 opacity-80" />
            <Activity className="w-6 h-6 opacity-60" />
          </div>
          <p className="text-sm opacity-90 mb-1">Факт {yearCurrent} (упак.)</p>
          <p className="text-3xl font-bold">{formatNumber(totalUnitsCurrent)}</p>
          {planCompletionUnits !== null && (
            <div className="mt-2 flex items-center gap-1">
              {planCompletionUnits >= 90 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-sm font-semibold">{planCompletionUnits.toFixed(1)}% плана</span>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
            <Activity className="w-6 h-6 opacity-60" />
          </div>
          <p className="text-sm opacity-90 mb-1">Факт {yearCurrent} (руб.)</p>
          <p className="text-2xl font-bold">{formatCurrency(totalRevenueCurrent)}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <Activity className="w-6 h-6 opacity-60" />
          </div>
          <p className="text-sm opacity-90 mb-1">Рост к {yearPrev} (упак.)</p>
          <p className="text-2xl font-bold">
            {growthUnits !== null ? `${growthUnits >= 0 ? '+' : ''}${growthUnits.toFixed(1)}%` : '— нет данных'}
          </p>
        </div>
      </div>

      {/* Таблица план/факт по препаратам */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-500" />
          План/факт по препаратам
        </h3>
        {!hasPlan && (
          <p className="text-sm text-slate-500 mb-4">
            РМ ещё не заполнил план по этой территории на {yearCurrent} год (вкладка «Планы»
            в кабинете регионального менеджера). Показан только факт из выгрузки.
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Препарат</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Цена (каталог)</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">План упак.</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Факт упак.</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">% плана</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Факт руб.</th>
              </tr>
            </thead>
            <tbody>
              {productStats.map((stat) => (
                <tr key={stat.product.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{stat.product.shortName || stat.product.name}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[200px]">{stat.product.name}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatCurrency(stat.product.price)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-700">
                    {stat.planUnits > 0 ? formatNumber(stat.planUnits) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatNumber(stat.unitsCurrent)}</td>
                  <td className="py-3 px-4 text-right">
                    {stat.completionUnits !== null ? (
                      <span className={`px-2 py-1 rounded-lg text-sm font-semibold ${getCompletionColor(stat.completionUnits)}`}>
                        {stat.completionUnits.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">план не задан</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatCurrency(stat.revenueCurrent)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-800" colSpan={2}>ИТОГО</td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">{hasPlan ? formatNumber(planUnitsTotal) : '—'}</td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">{formatNumber(totalUnitsCurrent)}</td>
                <td className="py-3 px-4 text-right">
                  {planCompletionUnits !== null ? (
                    <span className={`px-2 py-1 rounded-lg text-sm font-bold ${getCompletionColor(planCompletionUnits)}`}>
                      {planCompletionUnits.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">{formatCurrency(totalRevenueCurrent)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
