// ==================== АНАЛИТИКА ПО ПРЕПАРАТАМ С РЕДАКТИРОВАНИЕМ ====================

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  Package,
  TrendingUp,
  TrendingDown,
  Search,
  Download,
  Edit2,
  Plus,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  MapPin,
} from 'lucide-react';
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getSalesData, aggregateByProduct, getMonthlyDynamics, TERRITORIES } from '@/data/salesData';
import { Product } from '@/types/product.types';
import { getAllProducts, updateProduct, addProduct, deleteProduct } from '@/data/productsManager';
import EditModal from '@/app/components/modals/EditModal';
import { useDateContext } from '@/contexts/DateContext';

// Форматирование
const formatNumber = (num: number): string => new Intl.NumberFormat('ru-RU').format(Math.round(num));
const formatCurrency = (num: number): string => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(num);
const formatPercent = (num: number): string => `${num > 0 ? '+' : ''}${num.toFixed(1)}%`;

// Категории препаратов
const CATEGORIES = [
  'Офтальмология',
  'НПВС',
  'Нейропротекторы',
  'Метаболики',
  'Иммуномодуляторы',
  'Гастроэнтерология',
  'Гинекология',
  'Антибиотики',
  'Пульмонология',
];

export default function ProductsAnalyticsWithEdit() {
  const { dateSettings } = useDateContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'growth'>('revenue');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Загрузка препаратов
  useEffect(() => {
    setProducts(getAllProducts());
  }, []);

  // Обработчики редактирования
  const handleSaveProduct = (data: any) => {
    if (isAddingNew) {
      const newProduct = addProduct(data);
      setProducts(getAllProducts());
      setIsAddingNew(false);
    } else if (editingProduct) {
      updateProduct(editingProduct.id, data);
      setProducts(getAllProducts());
      setEditingProduct(null);
    }
  };

  const handleDeleteProduct = () => {
    if (editingProduct) {
      deleteProduct(editingProduct.id);
      setProducts(getAllProducts());
      setEditingProduct(null);
    }
  };

  // Поля для формы редактирования
  const productFields = [
    { name: 'name', label: 'Полное название', type: 'textarea' as const, required: true, placeholder: 'ARFECTO EYE DROPS, SUSPENSION 0.1% 5ML №1' },
    { name: 'shortName', label: 'Краткое название', type: 'text' as const, required: true, placeholder: 'Апфекто' },
    { name: 'price', label: 'Цена за упаковку (руб.)', type: 'number' as const, required: true },
    { name: 'category', label: 'Категория', type: 'select' as const, options: CATEGORIES, required: true },
    { name: 'quota2025', label: 'Квота 2025 (упаковок)', type: 'number' as const },
    { name: 'budget2025', label: 'Бюджет 2025 (руб.)', type: 'number' as const },
  ];

  // Получение данных
  const productsData2025 = useMemo(() => aggregateByProduct(2025), [products]);
  const productsData2024 = useMemo(() => aggregateByProduct(2024), [products]);
  const productsData2026 = useMemo(() => aggregateByProduct(2026), [products]);

  // Объединение данных
  const enrichedData = useMemo(() => {
    return productsData2025.map(current => {
      const prev = productsData2024.find(p => p.product.id === current.product.id);
      const next = productsData2026.find(p => p.product.id === current.product.id);
      return {
        product: current.product,
        totalRevenue: current.totalRevenue,
        totalUnits: current.totalUnits,
        prevYearRevenue: prev?.totalRevenue || 0,
        prevYearUnits: prev?.totalUnits || 0,
        nextYearRevenue: next?.totalRevenue || 0,
        nextYearUnits: next?.totalUnits || 0,
      };
    });
  }, [productsData2025, productsData2024, productsData2026]);

  // Категории
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean) as string[]);
    return ['all', ...Array.from(cats)];
  }, [products]);

  // Фильтрация
  const filteredProducts = useMemo(() => {
    let filtered = enrichedData;

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product.shortName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.product.category === selectedCategory);
    }

    if (sortBy === 'name') {
      filtered.sort((a, b) => (a.product.shortName || a.product.name).localeCompare(b.product.shortName || b.product.name));
    } else if (sortBy === 'revenue') {
      filtered.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } else if (sortBy === 'growth') {
      filtered.sort((a, b) => {
        const growthA = a.prevYearRevenue > 0 ? ((a.totalRevenue - a.prevYearRevenue) / a.prevYearRevenue) * 100 : 0;
        const growthB = b.prevYearRevenue > 0 ? ((b.totalRevenue - b.prevYearRevenue) / b.prevYearRevenue) * 100 : 0;
        return growthB - growthA;
      });
    }

    return filtered;
  }, [enrichedData, searchQuery, selectedCategory, sortBy]);

  // Общая статистика
  const totalStats = useMemo(() => {
    const totalRevenue = enrichedData.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalUnits = enrichedData.reduce((sum, item) => sum + item.totalUnits, 0);
    const prevRevenue = enrichedData.reduce((sum, item) => sum + item.prevYearRevenue, 0);
    const growth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    return { totalRevenue, totalUnits, growth };
  }, [enrichedData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Анализ по препаратам</h2>
          <p className="text-slate-500">Детальная аналитика продаж с возможностью редактирования</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsAddingNew(true)}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить препарат
          </Button>
          <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-cyan-100">Общая выручка 2025</p>
            <DollarSign className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalStats.totalRevenue)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100">Продано упаковок</p>
            <Package className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-3xl font-bold">{formatNumber(totalStats.totalUnits)}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-emerald-100">Рост к 2024</p>
            <TrendingUp className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-3xl font-bold">{formatPercent(totalStats.growth)}</p>
        </div>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию препарата..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
          >
            <option value="all">Все категории</option>
            {categories.filter(c => c !== 'all').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
          >
            <option value="revenue">По выручке</option>
            <option value="growth">По росту</option>
            <option value="name">По названию</option>
          </select>
        </div>
      </div>

      {/* Список препаратов */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(item => {
          const growth = item.prevYearRevenue > 0 ? ((item.totalRevenue - item.prevYearRevenue) / item.prevYearRevenue) * 100 : 0;
          const isPositive = growth >= 0;

          return (
            <div
              key={item.product.id}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 group relative"
            >
              {/* Кнопка редактирования */}
              <button
                onClick={() => setEditingProduct(item.product)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-100 hover:bg-cyan-500 hover:text-white text-slate-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              {/* Карточка */}
              <div
                onClick={() => setSelectedProduct(item.product)}
                className="cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 pr-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-cyan-600 transition-colors">
                      {item.product.shortName || item.product.name}
                    </h3>
                    <p className="text-sm text-slate-500">{item.product.category}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                    <Package className="w-6 h-6" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Выручка {dateSettings.currentYear}</p>
                    <p className="text-xl font-bold text-slate-800">{formatCurrency(item.totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Продано упак.</p>
                    <p className="text-xl font-bold text-slate-800">{formatNumber(item.totalUnits)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {isPositive ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(growth)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">vs 2025</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Модальное окно редактирования */}
      <EditModal
        isOpen={!!editingProduct || isAddingNew}
        onClose={() => {
          setEditingProduct(null);
          setIsAddingNew(false);
        }}
        onSave={handleSaveProduct}
        onDelete={!isAddingNew ? handleDeleteProduct : undefined}
        title="препарат"
        fields={productFields}
        initialData={editingProduct || {}}
        isNew={isAddingNew}
      />

      {/* Детальная модалка препарата */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

// Детальная модалка
function ProductDetailModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { dateSettings } = useDateContext();
  const currentYearData = useMemo(() => getSalesData({ productId: product.id, year: dateSettings.currentYear }), [product.id, dateSettings.currentYear]);
  const prevYearData = useMemo(() => getSalesData({ productId: product.id, year: dateSettings.previousYear }), [product.id, dateSettings.previousYear]);
  const monthlyData = useMemo(() => getMonthlyDynamics(product.id), [product.id]);

  const totalRevenue2025 = currentYearData.reduce((sum, d) => sum + d.revenue, 0);
  const totalRevenue2024 = prevYearData.reduce((sum, d) => sum + d.revenue, 0);
  const totalUnits2025 = currentYearData.reduce((sum, d) => sum + d.units, 0);
  const growth = totalRevenue2024 > 0 ? ((totalRevenue2025 - totalRevenue2024) / totalRevenue2024) * 100 : 0;

  const territoryData = useMemo(() => {
    return TERRITORIES.map(territory => {
      const data = getSalesData({ productId: product.id, territory, year: dateSettings.currentYear });
      const revenue = data.reduce((sum, d) => sum + d.revenue, 0);
      const units = data.reduce((sum, d) => sum + d.units, 0);
      return { territory, revenue, units };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [product.id, dateSettings.currentYear]);

  const topTerritory = territoryData[0] || { territory: '—', revenue: 0, units: 0 };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-8 text-white rounded-t-3xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Package className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-1">{product.shortName || product.name}</h2>
                  <p className="text-cyan-100">{product.category} • {formatCurrency(product.price)}/упак</p>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="wm-card bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-cyan-200 text-sm mb-1">Выручка 2025</p>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue2025)}</p>
            </div>
            <div className="wm-card bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-cyan-200 text-sm mb-1">Продано упаковок</p>
              <p className="text-2xl font-bold">{formatNumber(totalUnits2025)}</p>
            </div>
            <div className="wm-card bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-cyan-200 text-sm mb-1">Рост год к году</p>
              <div className="flex items-center gap-2">
                {growth >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                <p className="text-2xl font-bold">{formatPercent(growth)}</p>
              </div>
            </div>
            <div className="wm-card bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-cyan-200 text-sm mb-1">Лучшая территория</p>
              <p className="text-sm font-bold truncate">{topTerritory.territory}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* График */}
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6 text-cyan-600" />
              Динамика продаж 2024-2025-2026
            </h3>
            <div className="bg-slate-50 rounded-2xl p-6">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={monthlyData}>
                  <defs>
                    <linearGradient id="grad2024" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad2025" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad2026" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: any) => formatCurrency(value * 1000)}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="year2024" name="2024" fill="url(#grad2024)" stroke="#94a3b8" strokeWidth={2} />
                  <Area type="monotone" dataKey="year2025" name="2025" fill="url(#grad2025)" stroke="#06b6d4" strokeWidth={3} />
                  <Area type="monotone" dataKey="year2026" name="2026 (прогноз)" fill="url(#grad2026)" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Территории */}
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-cyan-600" />
              Распределение по территориям ПФО
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {territoryData.map((item, index) => {
                const share = totalRevenue2025 > 0 ? (item.revenue / totalRevenue2025) * 100 : 0;
                return (
                  <div key={item.territory} className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                          {index + 1}
                        </div>
                        <span className="font-semibold text-slate-800">{item.territory}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800">{formatCurrency(item.revenue)}</p>
                        <p className="text-sm text-slate-500">{formatNumber(item.units)} упак</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-500" style={{ width: `${share}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 text-right">{share.toFixed(1)}% от общей выручки</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
