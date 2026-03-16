// ==================== УЛУЧШЕННЫЙ КАЛЬКУЛЯТОР БЮДЖЕТА ДИРЕКТОРА ====================
// Поддержка всех федеральных округов России, сценарии, экспорт данных

import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  Calculator,
  Package,
  MapPin,
  TrendingUp,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  Save,
  Download,
  Copy,
  Edit2,
  Trash2,
  Eye,
} from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PRODUCTS, aggregateByProduct } from '@/data/salesData';
import { getAllDistricts, updateDistrict, addTerritory, updateTerritory, deleteTerritory, addDistrict, deleteDistrict, updateBudget2026 } from '@/data/districtsManager';
import { FederalDistrict, Territory, getTotalRussiaBudget2025, getDistrictStats } from '@/data/federalDistricts';
import { getAllProducts } from '@/data/productsManager';
import EditModal from '@/app/components/modals/EditModal';
import TerritoryDetailCard from './TerritoryDetailCard';

// Утилиты форматирования
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

export default function BudgetCalculatorEnhanced() {
  // Загрузка округов (с учетом возможных изменений)
  const [FEDERAL_DISTRICTS] = useState(() => getAllDistricts());
  
  // State для выбора округа и сценариев
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [expandedMedicine, setExpandedMedicine] = useState<string | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [showEditTerritories, setShowEditTerritories] = useState(false);
  const [newTerritoryName, setNewTerritoryName] = useState('');
  const [newTerritoryBudget, setNewTerritoryBudget] = useState(50000);
  const [showEditDistrict, setShowEditDistrict] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<FederalDistrict | null>(null);
  const [editBudget2026, setEditBudget2026] = useState<number>(0);
  
  // Сценарии бюджета по округам
  const [districtScenarios, setDistrictScenarios] = useState<Record<string, any>>(() => {
    const scenarios: Record<string, any> = {};
    
    FEDERAL_DISTRICTS.forEach(district => {
      scenarios[district.id] = {
        districtId: district.id,
        districtName: district.name,
        scenarios: [
          {
            id: 1,
            name: `${district.shortName} — Базовый 2026`,
            medicines: PRODUCTS.map((prod) => ({
              ...prod,
              targetVolume: Math.round(prod.quota2025 * 1.15), // +15% к 2025
              targetRevenue: Math.round(prod.quota2025 * 1.15 * prod.price),
            })),
            territories: district.territories.map((terr) => ({
              ...terr,
              budget2026: Math.round(terr.budget2025 * 1.18 * 1000), // Рост 18%, переводим в рубли
            })),
            profitMargin: 25,
            createdAt: new Date().toISOString(),
          },
        ],
        activeScenarioId: 1,
      };
    });
    
    return scenarios;
  });

  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);

  const currentDistrict = selectedDistrict 
    ? FEDERAL_DISTRICTS.find(d => d.id === selectedDistrict) 
    : null;

  const currentDistrictScenarios = selectedDistrict 
    ? districtScenarios[selectedDistrict] 
    : null;

  const activeScenario = currentDistrictScenarios 
    ? currentDistrictScenarios.scenarios.find((s: any) => s.id === currentDistrictScenarios.activeScenarioId)
    : null;

  // Обновление объема препарата
  const updateMedicineVolume = (medicineId: string, volume: number) => {
    if (!selectedDistrict) return;

    setDistrictScenarios(prev => ({
      ...prev,
      [selectedDistrict]: {
        ...prev[selectedDistrict],
        scenarios: prev[selectedDistrict].scenarios.map((scenario: any) =>
          scenario.id === prev[selectedDistrict].activeScenarioId
            ? {
                ...scenario,
                medicines: scenario.medicines.map((med: any) =>
                  med.id === medicineId
                    ? {
                        ...med,
                        targetVolume: volume,
                        targetRevenue: volume * med.price,
                      }
                    : med
                ),
              }
            : scenario
        ),
      },
    }));
  };

  // Обновление цены препарата
  const updateMedicinePrice = (medicineId: string, price: number) => {
    if (!selectedDistrict) return;

    setDistrictScenarios(prev => ({
      ...prev,
      [selectedDistrict]: {
        ...prev[selectedDistrict],
        scenarios: prev[selectedDistrict].scenarios.map((scenario: any) =>
          scenario.id === prev[selectedDistrict].activeScenarioId
            ? {
                ...scenario,
                medicines: scenario.medicines.map((med: any) =>
                  med.id === medicineId
                    ? {
                        ...med,
                        price: price,
                        targetRevenue: med.targetVolume * price,
                      }
                    : med
                ),
              }
            : scenario
        ),
      },
    }));
  };

  // Обновление бюджета территории
  const updateTerritoryBudget = (territoryId: string, budget: number) => {
    if (!selectedDistrict) return;

    setDistrictScenarios(prev => ({
      ...prev,
      [selectedDistrict]: {
        ...prev[selectedDistrict],
        scenarios: prev[selectedDistrict].scenarios.map((scenario: any) =>
          scenario.id === prev[selectedDistrict].activeScenarioId
            ? {
                ...scenario,
                territories: scenario.territories.map((terr: any) =>
                  terr.id === territoryId ? { ...terr, budget2026: budget } : terr
                ),
              }
            : scenario
        ),
      },
    }));
  };

  // Создание нового сценария для округа
  const createNewScenario = () => {
    if (!selectedDistrict || !currentDistrictScenarios) return;

    const newScenario = {
      id: Date.now(),
      name: `${currentDistrict?.shortName} — Сценарий ${currentDistrictScenarios.scenarios.length + 1}`,
      medicines: PRODUCTS.map((prod) => ({
        ...prod,
        targetVolume: 0,
        targetRevenue: 0,
      })),
      territories: currentDistrict!.territories.map((terr) => ({
        ...terr,
        budget2026: Math.round(terr.budget2025 * 1.18 * 1000),
      })),
      profitMargin: 25,
      createdAt: new Date().toISOString(),
    };

    setDistrictScenarios(prev => ({
      ...prev,
      [selectedDistrict]: {
        ...prev[selectedDistrict],
        scenarios: [...prev[selectedDistrict].scenarios, newScenario],
        activeScenarioId: newScenario.id,
      },
    }));
  };

  // Дублирование сценария
  const duplicateScenario = () => {
    if (!selectedDistrict || !activeScenario || !currentDistrictScenarios) return;

    const newScenario = {
      ...activeScenario,
      id: Date.now(),
      name: `${activeScenario.name} (копия)`,
      createdAt: new Date().toISOString(),
    };

    setDistrictScenarios(prev => ({
      ...prev,
      [selectedDistrict]: {
        ...prev[selectedDistrict],
        scenarios: [...prev[selectedDistrict].scenarios, newScenario],
      },
    }));
  };

  // Сохранение сценария
  const saveScenario = () => {
    if (!activeScenario || !selectedDistrict) return;

    // Сохраняем бюджет 2026 в округ
    const totalBudget2026 = calculateTotals().totalTerritoryBudget;
    updateBudget2026(selectedDistrict, totalBudget2026);

    const savedScenario = {
      ...activeScenario,
      districtId: selectedDistrict,
      districtName: currentDistrict?.name,
      savedAt: new Date().toISOString(),
    };

    setSavedScenarios(prev => [...prev, savedScenario]);
    alert(`✅ Бюджет сохранен!\n\nСценарий: "${activeScenario.name}"\nОкруг: ${currentDistrict?.shortName}\nБюджет 2026: ${formatCurrency(totalBudget2026)}`);
    
    // Перезагружаем округа для обновления данных
    window.location.reload();
  };

  // Экспорт в CSV
  const exportToCSV = () => {
    if (!activeScenario) return;

    let csv = 'Калькулятор бюджета World Medicine\n\n';
    csv += `Округ:,${currentDistrict?.name}\n`;
    csv += `Сценарий:,${activeScenario.name}\n`;
    csv += `Дата:,${new Date().toLocaleDateString('ru-RU')}\n\n`;
    
    csv += 'ПРЕПАРАТЫ\n';
    csv += 'Название,Категория,Цена,Объем (уп.),Выручка (руб.)\n';
    activeScenario.medicines.forEach((med: any) => {
      csv += `${med.shortName},${med.category},${med.price},${med.targetVolume},${med.targetRevenue}\n`;
    });
    
    csv += '\nТЕРРИТОРИИ\n';
    csv += 'Регион,Бюджет 2026 (руб.)\n';
    activeScenario.territories.forEach((terr: any) => {
      csv += `${terr.name},${terr.budget2026}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `budget_${currentDistrict?.shortName}_${new Date().getTime()}.csv`;
    link.click();
  };

  // Расчет итогов
  const calculateTotals = () => {
    if (!activeScenario) return { totalRevenue: 0, totalTerritoryBudget: 0, expectedProfit: 0, roi: 0 };

    const totalRevenue = activeScenario.medicines.reduce((sum: number, med: any) => sum + med.targetRevenue, 0);
    const totalTerritoryBudget = activeScenario.territories.reduce((sum: number, terr: any) => sum + terr.budget2026, 0);
    const expectedProfit = totalRevenue * (activeScenario.profitMargin / 100);

    return {
      totalRevenue,
      totalTerritoryBudget,
      expectedProfit,
      roi: totalTerritoryBudget > 0 ? (totalRevenue / totalTerritoryBudget) * 100 : 0,
    };
  };

  const totals = calculateTotals();

  // Данные для графика категорий
  const categoryData = activeScenario
    ? PRODUCTS.reduce((acc, prod) => {
        const medData = activeScenario.medicines.find((m: any) => m.id === prod.id);
        const revenue = medData?.targetRevenue || 0;
        
        const category = prod.category || 'Другое';
        const existing = acc.find((item) => item.name === category);
        if (existing) {
          existing.value += revenue;
        } else {
          acc.push({ name: category, value: revenue });
        }
        return acc;
      }, [] as { name: string; value: number }[])
    : [];

  const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#ef4444', '#3b82f6', '#14b8a6'];

  const productsData2025 = aggregateByProduct(2025);

  // Статистика по округам
  const districtStats = getDistrictStats();

  // РЕНДЕРИНГ: Выбор округа
  if (!selectedDistrict) {
    return (
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Калькулятор бюджета</h2>
              <p className="text-cyan-100">Планирование бюджета по всей России и отдельным округам</p>
            </div>
            <Calculator className="w-12 h-12 opacity-20" />
          </div>
        </div>

        {/* ==================== ОБЩИЙ КАЛЬКУЛЯТОР ПО РОССИИ ==================== */}
        <RussiaCalculator />

        {/* Общая статистика по России */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-500" />
            Общий бюджет России
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl text-white">
              <p className="text-sm opacity-90 mb-1">Всего округов</p>
              <h4 className="text-3xl font-bold">{FEDERAL_DISTRICTS.length}</h4>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl text-white">
              <p className="text-sm opacity-90 mb-1">Всего регионов</p>
              <h4 className="text-3xl font-bold">
                {FEDERAL_DISTRICTS.reduce((sum, d) => sum + d.territories.length, 0)}
              </h4>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl text-white">
              <p className="text-sm opacity-90 mb-1">Общий бюджет</p>
              <h4 className="text-2xl font-bold">{formatCurrency(getTotalRussiaBudget2025() * 1000)}</h4>
            </div>
          </div>
        </div>

        {/* Карточки округов */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEDERAL_DISTRICTS.map((district) => {
            const stat = districtStats.find(s => s.id === district.id)!;
            return (
              <div
                key={district.id}
                onClick={() => {
                  console.log('Card clicked for district:', district.shortName);
                  const stat = districtStats.find(s => s.id === district.id);
                  const budget2025 = stat?.totalBudget2025 || district.totalBudget2025 || 0;
                  const calculatedBudget2026 = district.totalBudget2026 || Math.round(budget2025 * 1.18 * 1000);
                  setEditingDistrict(district);
                  setEditBudget2026(calculatedBudget2026);
                  setShowEditDistrict(true);
                }}
                className="group cursor-pointer bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden relative"
                style={{ borderColor: district.color + '40' }}
              >
                {/* Градиентный фон */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500 pointer-events-none"
                  style={{ background: `linear-gradient(to bottom right, ${district.color}, ${district.color}dd)` }}
                />
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-4xl">{district.icon}</span>
                    <div
                      className="px-3 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: district.color }}
                    >
                      {district.shortName}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2">
                    {district.name}
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Регионов:</span>
                      <span className="font-bold text-slate-800">{district.territories.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Бюджет:</span>
                      <span className="font-bold" style={{ color: district.color }}>
                        {formatCurrency((district.totalBudget2025 || 0) * 1000)}
                      </span>
                    </div>
                    {district.totalBudget2026 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Бюджет 2026:</span>
                        <span className="font-bold text-emerald-600">
                          {formatCurrency(district.totalBudget2026)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Доля РФ:</span>
                      <span className="font-semibold text-slate-700">{stat.share.toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        console.log('Calculator button clicked for district:', district.shortName);
                        setSelectedDistrict(district.id);
                      }}
                      className="w-full mt-4 px-4 py-2 rounded-xl text-white font-medium transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                      style={{ background: `linear-gradient(to right, ${district.color}, ${district.color}dd)` }}
                    >
                      Открыть калькулятор
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Сохраненные сценарии */}
        {savedScenarios.length > 0 && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Save className="w-5 h-5 text-emerald-500" />
              Сохраненные сценарии ({savedScenarios.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedScenarios.map((scenario, idx) => (
                <div key={idx} className="p-4 border border-slate-200 rounded-2xl hover:border-cyan-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-800">{scenario.name}</h4>
                      <p className="text-xs text-slate-500">{scenario.districtName}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(scenario.savedAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    Выручка: <span className="font-bold text-emerald-600">
                      {formatCurrency(scenario.medicines.reduce((sum: number, m: any) => sum + m.targetRevenue, 0))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // РЕНДЕРИНГ: Калькулятор для выбранного округа
  return (
    <div className="space-y-6">
      {/* Если выбрана территория, показываем детальную карточку */}
      {selectedTerritory ? (
        <TerritoryDetailCard
          territory={selectedTerritory}
          districtName={currentDistrict?.name || ''}
          districtColor={currentDistrict?.color || '#06b6d4'}
          onBack={() => setSelectedTerritory(null)}
        />
      ) : (
        <>
      {/* Заголовок с навигацией */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setSelectedDistrict(null)}
              className="bg-white/20 backdrop-blur-xl text-white border-2 border-white/30 hover:bg-white/30"
            >
              <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
              Все округа
            </Button>
            <div>
              <h2 className="text-2xl font-bold mb-1">
                {currentDistrict?.icon} {currentDistrict?.shortName} — Калькулятор бюджета
              </h2>
              <p className="text-cyan-100">{currentDistrict?.name}</p>
            </div>
          </div>
          <Calculator className="w-12 h-12 opacity-20" />
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={currentDistrictScenarios?.activeScenarioId}
            onChange={(e) => {
              setDistrictScenarios(prev => ({
                ...prev,
                [selectedDistrict]: {
                  ...prev[selectedDistrict],
                  activeScenarioId: Number(e.target.value),
                },
              }));
            }}
            className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-xl text-white border-2 border-white/30 focus:outline-none focus:border-white/50 font-medium"
          >
            {currentDistrictScenarios?.scenarios.map((scenario: any) => (
              <option key={scenario.id} value={scenario.id} className="text-slate-800">
                {scenario.name}
              </option>
            ))}
          </select>
          <Button
            onClick={createNewScenario}
            className="bg-white/20 backdrop-blur-xl text-white border-2 border-white/30 hover:bg-white/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Новый
          </Button>
          <Button
            onClick={duplicateScenario}
            className="bg-white/20 backdrop-blur-xl text-white border-2 border-white/30 hover:bg-white/30"
          >
            <Copy className="w-4 h-4 mr-2" />
            Копировать
          </Button>
          <Button
            onClick={saveScenario}
            className="bg-white/20 backdrop-blur-xl text-white border-2 border-white/30 hover:bg-white/30"
          >
            <Save className="w-4 h-4 mr-2" />
            Сохранить
          </Button>
          <Button
            onClick={exportToCSV}
            className="bg-white/20 backdrop-blur-xl text-white border-2 border-white/30 hover:bg-white/30"
          >
            <Download className="w-4 h-4 mr-2" />
            Экспорт CSV
          </Button>
        </div>
      </div>

      {/* Итоговые показатели */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500">Планируемая выручка</p>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totals.totalRevenue)}</h3>
          <p className="text-xs text-slate-400 mt-1">Целевой показатель 2026</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500">Бюджет территорий</p>
            <MapPin className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totals.totalTerritoryBudget)}</h3>
          <p className="text-xs text-slate-400 mt-1">{currentDistrict?.shortName} — {currentDistrict?.territories.length} регионов</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500">Ожидаемая прибыль</p>
            <Zap className="w-5 h-5 text-yellow-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totals.expectedProfit)}</h3>
          <p className="text-xs text-emerald-600 font-medium mt-1">Маржа {activeScenario?.profitMargin}%</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500">ROI</p>
            <Target className="w-5 h-5 text-purple-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{totals.roi.toFixed(1)}%</h3>
          <p className="text-xs text-slate-400 mt-1">Возврат инвестиций</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Планирование по препаратам */}
        <div className="xl:col-span-2 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-500" />
            Планирование по препаратам
          </h3>
          
          <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2">
            {PRODUCTS.map((prod) => {
              const medData = activeScenario.medicines.find((m: any) => m.id === prod.id)!;
              const isExpanded = expandedMedicine === prod.id;
              
              return (
                <div key={prod.id} className="border border-slate-200 rounded-2xl overflow-hidden hover:border-cyan-300 transition-colors">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer bg-slate-50 hover:bg-slate-100"
                    onClick={() => setExpandedMedicine(isExpanded ? null : prod.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/30">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-800">{prod.shortName}</h4>
                          <p className="text-xs text-slate-500">{prod.category} • {formatCurrency(prod.price)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Объем</p>
                        <p className="font-bold text-slate-800">{formatNumber(medData.targetVolume)} уп.</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Выручка</p>
                        <p className="font-bold text-emerald-600">{formatCurrency(medData.targetRevenue)}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="p-4 bg-white border-t border-slate-200">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Целевой объем продаж (упаковок)
                          </label>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMedicineVolume(prod.id, Math.max(0, medData.targetVolume - 100))}
                              className="rounded-xl"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <input
                              type="number"
                              value={medData.targetVolume}
                              onChange={(e) => updateMedicineVolume(prod.id, Number(e.target.value))}
                              className="flex-1 px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-center font-semibold"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMedicineVolume(prod.id, medData.targetVolume + 100)}
                              className="rounded-xl"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Цена за упаковку (₽)
                          </label>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMedicinePrice(prod.id, Math.max(0, medData.price - 100))}
                              className="rounded-xl"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <input
                              type="number"
                              value={medData.price}
                              onChange={(e) => updateMedicinePrice(prod.id, Number(e.target.value))}
                              className="flex-1 px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-center font-semibold"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMedicinePrice(prod.id, medData.price + 100)}
                              className="rounded-xl"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Базовая цена</p>
                            <p className="font-bold text-slate-800">{formatCurrency(prod.price)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Плановая выручка</p>
                            <p className="font-bold text-emerald-600">{formatCurrency(medData.targetRevenue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Продажи 2025</p>
                            <p className="font-medium text-slate-700">{formatCurrency(productsData2025.find(p => p.product.id === prod.id)?.totalRevenue * 1000 || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Прогноз роста</p>
                            <p className="font-medium text-blue-600">
                              {medData.targetRevenue > 0 && productsData2025.find(p => p.product.id === prod.id)
                                ? `+${(((medData.targetRevenue - productsData2025.find(p => p.product.id === prod.id)!.totalRevenue * 1000) / (productsData2025.find(p => p.product.id === prod.id)!.totalRevenue * 1000)) * 100).toFixed(1)}%`
                                : '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Планирование по территориям и визуализация */}
        <div className="space-y-6">
          {/* Территории */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Бюджеты регионов {currentDistrict?.shortName}
            </h3>
            
            <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2">
              {currentDistrict?.territories.map((terr) => {
                const terrData = activeScenario.territories.find((t: any) => t.id === terr.id)!;
                const growth = ((terrData.budget2026 - terr.budget2025 * 1000) / (terr.budget2025 * 1000)) * 100;
                
                return (
                  <div key={terr.id} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-800">{terr.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                        </span>
                        <button
                          onClick={() => setSelectedTerritory(terr)}
                          className="p-1 hover:bg-blue-100 rounded-lg transition-colors group"
                          title="Просмотр детальной информации"
                        >
                          <Eye className="w-4 h-4 text-blue-500 group-hover:text-blue-600" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      value={Math.round(terrData.budget2026)}
                      onChange={(e) => updateTerritoryBudget(terr.id, Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-500">2025: {formatCurrency(terr.budget2025 * 1000)}</span>
                      <span className="text-xs text-slate-500">2026: {formatCurrency(terrData.budget2026)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
        </>
      )}
      
      {/* Модальное окно редактирования округа */}
      {showEditDistrict && editingDistrict && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{editingDistrict.icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{editingDistrict.shortName}</h3>
                  <p className="text-sm text-slate-500">{editingDistrict.name}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Количество регионов</p>
                    <input
                      type="number"
                      value={editingDistrict.territories.length}
                      readOnly
                      className="w-full px-3 py-2 text-lg font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none cursor-not-allowed opacity-60"
                      title="Автоматически рассчитывается"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Доля в РФ (%)</p>
                    <input
                      type="number"
                      value={districtStats.find(s => s.id === editingDistrict.id)?.share.toFixed(1) || 0}
                      readOnly
                      className="w-full px-3 py-2 text-lg font-bold border border-slate-200 rounded-xl focus:outline-none cursor-not-allowed opacity-60"
                      style={{ color: editingDistrict.color }}
                      title="Автоматически рассчитывается"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Бюджет (₽)</p>
                    <input
                      type="number"
                      value={(editingDistrict.totalBudget2025 || 0) * 1000}
                      readOnly
                      className="w-full px-3 py-2 text-lg font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none cursor-not-allowed opacity-60"
                      title="Базовый бюджет"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Рост (%)</p>
                    <input
                      type="text"
                      value={`+${(((editBudget2026 - (editingDistrict.totalBudget2025 || 0) * 1000) / ((editingDistrict.totalBudget2025 || 0) * 1000)) * 100).toFixed(1)}%`}
                      readOnly
                      className="w-full px-3 py-2 text-lg font-bold text-emerald-600 bg-white border border-slate-200 rounded-xl focus:outline-none cursor-not-allowed opacity-60"
                      title="Автоматически рассчитывается"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Бюджет 2026 (₽)
                </label>
                <input
                  type="number"
                  value={editBudget2026}
                  onChange={(e) => setEditBudget2026(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-lg font-semibold"
                  step="1000000"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Введите общий бюджет округа на 2026 год вручную
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  updateBudget2026(editingDistrict.id, editBudget2026);
                  setShowEditDistrict(false);
                  alert(`✅ Бюджет округа обновлен!\n\n${editingDistrict.shortName}\nБюджет 2026: ${formatCurrency(editBudget2026)}`);
                  window.location.reload();
                }}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditDistrict(false)}
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Компонент для общего калькулятора по России
function RussiaCalculator() {
  // State для препаратов с планами по России
  const [russiaProducts, setRussiaProducts] = useState(() =>
    PRODUCTS.map(prod => ({
      ...prod,
      targetUnits: Math.round(prod.quota2025 * 1.15), // +15% к квоте 2025
      targetPrice: prod.price,
      targetRevenue: Math.round(prod.quota2025 * 1.15 * prod.price),
    }))
  );

  const [isExpanded, setIsExpanded] = useState(true);

  // Обновление количества упаковок
  const updateUnits = (productId: string, units: number) => {
    setRussiaProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? {
              ...p,
              targetUnits: units,
              targetRevenue: units * p.targetPrice,
            }
          : p
      )
    );
  };

  // Обновление цены
  const updatePrice = (productId: string, price: number) => {
    setRussiaProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? {
              ...p,
              targetPrice: price,
              targetRevenue: p.targetUnits * price,
            }
          : p
      )
    );
  };

  // Подсчет итогов
  const totalUnits = russiaProducts.reduce((sum, p) => sum + p.targetUnits, 0);
  const totalRevenue = russiaProducts.reduce((sum, p) => sum + p.targetRevenue, 0);
  const avgPrice = totalUnits > 0 ? totalRevenue / totalUnits : 0;

  // Экспорт в CSV
  const exportRussiaToCSV = () => {
    let csv = 'Калькулятор бюджета World Medicine — Россия\\n\\n';
    csv += `Дата:,${new Date().toLocaleDateString('ru-RU')}\\n\\n`;
    
    csv += 'ПРЕПАРАТЫ\\n';
    csv += 'Название,Категория,Цена за уп. (₽),Количество (уп.),Выручка (₽)\\n';
    russiaProducts.forEach(prod => {
      csv += `${prod.shortName},${prod.category},${prod.targetPrice},${prod.targetUnits},${prod.targetRevenue}\\n`;
    });
    
    csv += '\\nИТОГО\\n';
    csv += `Всего упаковок:,${totalUnits}\\n`;
    csv += `Общая выручка:,${totalRevenue}\\n`;
    csv += `Средняя цена:,${avgPrice.toFixed(2)}\\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `budget_russia_${new Date().getTime()}.csv`;
    link.click();
  };

  return (
    <div className="bg-gradient-to-br from-white via-cyan-50/30 to-blue-50/30 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-cyan-200/50 overflow-hidden">
      {/* Заголовок с кнопками */}
      <div 
        className="bg-gradient-to-r from-cyan-500 to-blue-600 p-6 text-white cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">📊 Общий калькулятор по России</h3>
              <p className="text-cyan-100 text-sm">Планирование бюджета по всем препаратам на 2026 год</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                exportRussiaToCSV();
              }}
              className="bg-white/20 backdrop-blur text-white border-2 border-white/30 hover:bg-white/30"
            >
              <Download className="w-4 h-4 mr-2" />
              Экспорт
            </Button>
            {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          {/* KPI карточки */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm opacity-90">Всего упаковок</p>
                <Package className="w-8 h-8 opacity-30" />
              </div>
              <h4 className="text-3xl font-bold">{formatNumber(totalUnits)}</h4>
              <p className="text-xs opacity-80 mt-2">План на 2026 год</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm opacity-90">Общая выручка</p>
                <TrendingUp className="w-8 h-8 opacity-30" />
              </div>
              <h4 className="text-2xl font-bold">{formatCurrency(totalRevenue)}</h4>
              <p className="text-xs opacity-80 mt-2">Планируемый доход</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm opacity-90">Средняя цена</p>
                <Target className="w-8 h-8 opacity-30" />
              </div>
              <h4 className="text-2xl font-bold">{formatCurrency(avgPrice)}</h4>
              <p className="text-xs opacity-80 mt-2">За одну упаковку</p>
            </div>
          </div>

          {/* Таблица препаратов */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-100 to-slate-50">
                    <th className="text-left p-4 font-bold text-slate-700 text-sm">№</th>
                    <th className="text-left p-4 font-bold text-slate-700 text-sm">Препарат</th>
                    <th className="text-left p-4 font-bold text-slate-700 text-sm">Категория</th>
                    <th className="text-center p-4 font-bold text-slate-700 text-sm">Количество (уп.)</th>
                    <th className="text-center p-4 font-bold text-slate-700 text-sm">Цена (₽/уп.)</th>
                    <th className="text-right p-4 font-bold text-slate-700 text-sm">Выручка (₽)</th>
                    <th className="text-center p-4 font-bold text-slate-700 text-sm">Доля (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {russiaProducts.map((prod, index) => {
                    const share = totalRevenue > 0 ? (prod.targetRevenue / totalRevenue) * 100 : 0;
                    
                    return (
                      <tr 
                        key={prod.id} 
                        className="border-t border-slate-100 hover:bg-cyan-50/50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {index + 1}
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{prod.shortName}</p>
                            <p className="text-xs text-slate-500">{prod.name}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                            {prod.category}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateUnits(prod.id, Math.max(0, prod.targetUnits - 100))}
                              className="w-8 h-8 p-0 rounded-lg"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <input
                              type="number"
                              value={prod.targetUnits}
                              onChange={(e) => updateUnits(prod.id, Number(e.target.value))}
                              className="w-24 px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-center font-semibold text-sm"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateUnits(prod.id, prod.targetUnits + 100)}
                              className="w-8 h-8 p-0 rounded-lg"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePrice(prod.id, Math.max(0, prod.targetPrice - 100))}
                              className="w-8 h-8 p-0 rounded-lg"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <input
                              type="number"
                              value={prod.targetPrice}
                              onChange={(e) => updatePrice(prod.id, Number(e.target.value))}
                              className="w-24 px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center font-semibold text-sm"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePrice(prod.id, prod.targetPrice + 100)}
                              className="w-8 h-8 p-0 rounded-lg"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <p className="font-bold text-emerald-600 text-sm">{formatCurrency(prod.targetRevenue)}</p>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-semibold text-slate-700">{share.toFixed(1)}%</span>
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-300"
                                style={{ width: `${share}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gradient-to-r from-slate-50 to-white border-t-2 border-slate-300">
                    <td colSpan={3} className="p-4 font-bold text-slate-800 text-right">ИТОГО:</td>
                    <td className="p-4 text-center">
                      <p className="font-bold text-emerald-600">{formatNumber(totalUnits)}</p>
                    </td>
                    <td className="p-4 text-center">
                      <p className="font-bold text-purple-600">{formatCurrency(avgPrice)}</p>
                    </td>
                    <td className="p-4 text-right">
                      <p className="font-bold text-blue-600 text-lg">{formatCurrency(totalRevenue)}</p>
                    </td>
                    <td className="p-4 text-center">
                      <p className="font-bold text-slate-700">100%</p>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Дополнительная аналитика */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 border border-slate-200">
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Топ-3 по выручке
              </h4>
              <div className="space-y-2">
                {russiaProducts
                  .sort((a, b) => b.targetRevenue - a.targetRevenue)
                  .slice(0, 3)
                  .map((prod, idx) => (
                    <div key={prod.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-700">{prod.shortName}</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">{formatCurrency(prod.targetRevenue)}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 border border-slate-200">
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Топ-3 по объему
              </h4>
              <div className="space-y-2">
                {russiaProducts
                  .sort((a, b) => b.targetUnits - a.targetUnits)
                  .slice(0, 3)
                  .map((prod, idx) => (
                    <div key={prod.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-700">{prod.shortName}</span>
                      </div>
                      <span className="text-sm font-bold text-blue-600">{formatNumber(prod.targetUnits)} уп.</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}