// ==================== ДЕТАЛЬНАЯ КАРТОЧКА ТЕРРИТОРИИ ====================
// План/факт данные, планирование по препаратам с редактированием цен

import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  ArrowLeft,
  Package,
  TrendingUp,
  TrendingDown,
  Edit2,
  Check,
  X,
  DollarSign,
  ShoppingCart,
  Target,
  Activity,
  User,
  Clock,
} from 'lucide-react';
import { PRODUCTS } from '@/data/salesData';
import { getSalesData, aggregateByProduct } from '@/data/salesData';
import { Territory } from '@/data/federalDistricts';
import {
  getPlanByTerritory,
  updateProductPrice as updatePlanPrice,
  TerritoryPlan
} from '@/data/regionalPlansManager';

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
  // Загружаем план территории от регионального менеджера
  const [territoryPlan, setTerritoryPlan] = useState<TerritoryPlan | null>(
    () => getPlanByTerritory(territory.id, 2026)
  );

  // State для редактирования цен препаратов
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);

  // Получение данных продаж по территории (факт)
  const territoryData2025 = getSalesData({ territory: territory.name, year: 2025 });
  const territoryData2026 = getSalesData({ territory: territory.name, year: 2026 });

  // Расчет фактических показателей
  const totalUnits2025 = territoryData2025.reduce((sum, d) => sum + d.units, 0);
  const totalRevenue2025 = territoryData2025.reduce((sum, d) => sum + d.revenue, 0);
  const totalUnits2026 = territoryData2026.reduce((sum, d) => sum + d.units, 0);
  const totalRevenue2026 = territoryData2026.reduce((sum, d) => sum + d.revenue, 0);

  // Плановые показатели берем из плана регионального менеджера
  const planUnits2026 = territoryPlan
    ? territoryPlan.products.reduce((sum, p) => sum + p.planUnits, 0)
    : PRODUCTS.reduce((sum, p) => sum + p.quota2025 * 1.18, 0); // Fallback если плана нет

  const planRevenue2026 = territoryPlan
    ? territoryPlan.products.reduce((sum, p) => sum + p.planRevenue, 0)
    : PRODUCTS.reduce((sum, p) => sum + p.quota2025 * 1.18 * p.price, 0); // Fallback

  // Показатели выполнения плана
  const planCompletionUnits = planUnits2026 > 0 ? (totalUnits2026 / planUnits2026) * 100 : 0;
  const planCompletionRevenue = planRevenue2026 > 0 ? (totalRevenue2026 / planRevenue2026) * 100 : 0;

  // Рост относительно 2025
  const growthUnits = totalUnits2025 > 0 ? ((totalUnits2026 - totalUnits2025) / totalUnits2025) * 100 : 0;
  const growthRevenue = totalRevenue2025 > 0 ? ((totalRevenue2026 - totalRevenue2025) / totalRevenue2025) * 100 : 0;

  // Данные по препаратам
  const productStats = PRODUCTS.map(product => {
    const data2025 = territoryData2025.filter(d => d.productId === product.id);
    const data2026 = territoryData2026.filter(d => d.productId === product.id);

    const units2025 = data2025.reduce((sum, d) => sum + d.units, 0);
    const revenue2025 = data2025.reduce((sum, d) => sum + d.revenue, 0);
    const units2026 = data2026.reduce((sum, d) => sum + d.units, 0);
    const revenue2026 = data2026.reduce((sum, d) => sum + d.revenue, 0);

    // Берем план из данных регионального менеджера или используем fallback
    const planProduct = territoryPlan?.products.find(p => p.productId === product.id);
    const planUnits = planProduct?.planUnits || product.quota2025 * 1.18;
    const planRevenue = planProduct?.planRevenue || planUnits * product.price;
    const price = planProduct?.price || product.price;

    const completionUnits = planUnits > 0 ? (units2026 / planUnits) * 100 : 0;
    const completionRevenue = planRevenue > 0 ? (revenue2026 / planRevenue) * 100 : 0;

    return {
      product,
      units2025,
      revenue2025,
      units2026,
      revenue2026,
      planUnits,
      planRevenue,
      completionUnits,
      completionRevenue,
      price,
    };
  });

  const handleStartEditPrice = (productId: string, currentPrice: number) => {
    setEditingPrice(productId);
    setTempPrice(currentPrice);
  };

  const handleSavePrice = (productId: string) => {
    // Обновляем цену в системе планов регионального менеджера
    const updatedPlan = updatePlanPrice(territory.id, productId, tempPrice, 2026);
    if (updatedPlan) {
      setTerritoryPlan(updatedPlan);
    }
    setEditingPrice(null);
  };

  const handleCancelEdit = () => {
    setEditingPrice(null);
    setTempPrice(0);
  };

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
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: districtColor }}
            />
            <span className="text-sm text-slate-500">{districtName}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{territory.name}</h2>
            <p className="text-sm text-slate-500 mt-1">Детальная аналитика план/факт 2026</p>
            {territoryPlan && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <User className="w-4 h-4" />
                  <span>{territoryPlan.regionalManagerName}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <Clock className="w-4 h-4" />
                  <span>Обновлено: {new Date(territoryPlan.updatedAt).toLocaleDateString('ru-RU')}</span>
                </div>
                <div>
                  {territoryPlan.status === 'approved' && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-lg">
                      ✓ Утвержден
                    </span>
                  )}
                  {territoryPlan.status === 'submitted' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
                      ↑ Отправлен
                    </span>
                  )}
                  {territoryPlan.status === 'draft' && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-lg">
                      ✎ Черновик
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Бюджет {territoryPlan ? '2026' : '2025'}</p>
            <p className="text-xl font-bold text-slate-800">
              {formatCurrency((territoryPlan?.budget || territory.budget2025 * 1000))}
            </p>
            {!territoryPlan && (
              <p className="text-xs text-orange-600 mt-1">⚠️ План не создан РМ</p>
            )}
          </div>
        </div>
      </div>

      {/* KPI карточки план/факт */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* План в упаковках */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-8 h-8 opacity-80" />
            <Target className="w-6 h-6 opacity-60" />
          </div>
          <p className="text-sm opacity-90 mb-1">План 2026 (упак.)</p>
          <p className="text-3xl font-bold">{formatNumber(planUnits2026)}</p>
        </div>

        {/* Факт в упаковках */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <ShoppingCart className="w-8 h-8 opacity-80" />
            <Activity className="w-6 h-6 opacity-60" />
          </div>
          <p className="text-sm opacity-90 mb-1">Факт 2026 (упак.)</p>
          <p className="text-3xl font-bold">{formatNumber(totalUnits2026)}</p>
          <div className="mt-2 flex items-center gap-1">
            {planCompletionUnits >= 90 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-semibold">{planCompletionUnits.toFixed(1)}% плана</span>
          </div>
        </div>

        {/* План в деньгах */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
            <Target className="w-6 h-6 opacity-60" />
          </div>
          <p className="text-sm opacity-90 mb-1">План 2026 (руб.)</p>
          <p className="text-2xl font-bold">{formatCurrency(planRevenue2026)}</p>
        </div>

        {/* Факт в деньгах */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
            <Activity className="w-6 h-6 opacity-60" />
          </div>
          <p className="text-sm opacity-90 mb-1">Факт 2026 (руб.)</p>
          <p className="text-2xl font-bold">{formatCurrency(totalRevenue2026)}</p>
          <div className="mt-2 flex items-center gap-1">
            {planCompletionRevenue >= 90 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-semibold">{planCompletionRevenue.toFixed(1)}% плана</span>
          </div>
        </div>
      </div>

      {/* Таблица планирования по препаратам */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-500" />
          Планирование по препаратам
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Препарат</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Цена</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">План упак.</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Факт упак.</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">% плана</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">План руб.</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Факт руб.</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">% плана</th>
              </tr>
            </thead>
            <tbody>
              {productStats.map((stat) => (
                <tr key={stat.product.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{stat.product.shortName || stat.product.name}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[200px]">{stat.product.name}</div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {editingPrice === stat.product.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          value={tempPrice}
                          onChange={(e) => setTempPrice(Number(e.target.value))}
                          className="w-24 px-2 py-1 border border-blue-500 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSavePrice(stat.product.id)}
                          className="p-1 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-semibold text-slate-800">{formatCurrency(stat.price)}</span>
                        <button
                          onClick={() => handleStartEditPrice(stat.product.id, stat.price)}
                          className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-700">
                    {formatNumber(stat.planUnits)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-800">
                    {formatNumber(stat.units2026)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-1 rounded-lg text-sm font-semibold ${getCompletionColor(stat.completionUnits)}`}>
                      {stat.completionUnits.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-700">
                    {formatCurrency(stat.planRevenue)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-800">
                    {formatCurrency(stat.revenue2026)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-1 rounded-lg text-sm font-semibold ${getCompletionColor(stat.completionRevenue)}`}>
                      {stat.completionRevenue.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-800" colSpan={2}>ИТОГО</td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">{formatNumber(planUnits2026)}</td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">{formatNumber(totalUnits2026)}</td>
                <td className="py-3 px-4 text-right">
                  <span className={`px-2 py-1 rounded-lg text-sm font-bold ${getCompletionColor(planCompletionUnits)}`}>
                    {planCompletionUnits.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">{formatCurrency(planRevenue2026)}</td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">{formatCurrency(totalRevenue2026)}</td>
                <td className="py-3 px-4 text-right">
                  <span className={`px-2 py-1 rounded-lg text-sm font-bold ${getCompletionColor(planCompletionRevenue)}`}>
                    {planCompletionRevenue.toFixed(1)}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
