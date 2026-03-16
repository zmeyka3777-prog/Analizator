import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Calculator, Save, FolderOpen, Trash2, RefreshCw,
  TrendingUp, DollarSign, MapPin, Pill, Plus, Download
} from 'lucide-react';

const WM_PRODUCTS = [
  { id: 1, name: 'COCARNIT', category: 'Ноотропы', color: '#3B82F6', pricePerUnit: 890 },
  { id: 2, name: 'RONOCIT', category: 'Ноотропы', color: '#8B5CF6', pricePerUnit: 720 },
  { id: 3, name: 'ARTOXAN LYOF 20MG', category: 'НПВС', color: '#10B981', pricePerUnit: 540 },
  { id: 4, name: 'DORAMYCIN', category: 'Антибиотики', color: '#F59E0B', pricePerUnit: 460 },
  { id: 5, name: 'ORCIPOL', category: 'Антибиотики', color: '#EF4444', pricePerUnit: 380 },
  { id: 6, name: 'DRASTOP ADVANCE', category: 'Хондропротекторы', color: '#06B6D4', pricePerUnit: 650 },
  { id: 7, name: 'LIMENDA', category: 'Анксиолитики', color: '#EC4899', pricePerUnit: 510 },
  { id: 8, name: 'SECNIDOX', category: 'Антибиотики', color: '#84CC16', pricePerUnit: 420 },
  { id: 9, name: 'CLODIFEN NEURO', category: 'НПВС', color: '#F97316', pricePerUnit: 350 },
  { id: 10, name: 'ARTOXAN 20MG', category: 'НПВС', color: '#14B8A6', pricePerUnit: 490 },
  { id: 11, name: 'ARTOXAN GEL', category: 'НПВС', color: '#A855F7', pricePerUnit: 310 },
  { id: 12, name: 'APFECTO', category: 'Кардиология', color: '#6366F1', pricePerUnit: 580 },
];

const FEDERAL_DISTRICTS = [
  { id: 'cfo', name: 'ЦФО', fullName: 'Центральный ФО', share: 0.25 },
  { id: 'szfo', name: 'СЗФО', fullName: 'Северо-Западный ФО', share: 0.12 },
  { id: 'yufo', name: 'ЮФО', fullName: 'Южный ФО', share: 0.10 },
  { id: 'skfo', name: 'СКФО', fullName: 'Северо-Кавказский ФО', share: 0.05 },
  { id: 'pfo', name: 'ПФО', fullName: 'Приволжский ФО', share: 0.18 },
  { id: 'ufo', name: 'УФО', fullName: 'Уральский ФО', share: 0.10 },
  { id: 'sfo', name: 'СФО', fullName: 'Сибирский ФО', share: 0.12 },
  { id: 'dfo', name: 'ДФО', fullName: 'Дальневосточный ФО', share: 0.08 },
];

interface DrugAllocation {
  productId: number;
  planUnits: number;
  budgetShare: number;
}

interface DistrictAllocation {
  districtId: string;
  share: number;
}

interface BudgetScenario {
  id: string;
  name: string;
  date: string;
  totalBudget: number;
  growthPercent: number;
  drugAllocations: DrugAllocation[];
  districtAllocations: DistrictAllocation[];
}

const STORAGE_KEY = 'wm_budget_scenarios';

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} млрд ₽`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} млн ₽`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} тыс ₽`;
  return `${value.toLocaleString('ru-RU')} ₽`;
};

const formatNumber = (value: number): string => value.toLocaleString('ru-RU');

export default function BudgetCalculator() {
  const [totalBudget, setTotalBudget] = useState<number>(3_000_000_000);
  const [growthPercent, setGrowthPercent] = useState<number>(15);
  const [scenarioName, setScenarioName] = useState<string>('');
  const [savedScenarios, setSavedScenarios] = useState<BudgetScenario[]>([]);

  const defaultDrugAllocations: DrugAllocation[] = useMemo(() => {
    const shares = [14, 12, 10, 9, 8, 8, 7, 7, 6, 6, 7, 6];
    return WM_PRODUCTS.map((p, i) => ({
      productId: p.id,
      planUnits: Math.round((totalBudget * (shares[i] / 100)) / p.pricePerUnit),
      budgetShare: shares[i],
    }));
  }, [totalBudget]);

  const [drugAllocations, setDrugAllocations] = useState<DrugAllocation[]>(defaultDrugAllocations);

  const defaultDistrictAllocations: DistrictAllocation[] = useMemo(() => {
    return FEDERAL_DISTRICTS.map((d) => ({
      districtId: d.id,
      share: d.share * 100,
    }));
  }, []);

  const [districtAllocations, setDistrictAllocations] = useState<DistrictAllocation[]>(defaultDistrictAllocations);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedScenarios(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const totalDrugSharePercent = useMemo(
    () => drugAllocations.reduce((sum, d) => sum + d.budgetShare, 0),
    [drugAllocations]
  );

  const totalDistrictSharePercent = useMemo(
    () => districtAllocations.reduce((sum, d) => sum + d.share, 0),
    [districtAllocations]
  );

  const handleDrugShareChange = useCallback((productId: number, newShare: number) => {
    setDrugAllocations((prev) =>
      prev.map((a) => {
        if (a.productId === productId) {
          const product = WM_PRODUCTS.find((p) => p.id === productId)!;
          const budgetForProduct = totalBudget * (newShare / 100);
          return {
            ...a,
            budgetShare: newShare,
            planUnits: Math.round(budgetForProduct / product.pricePerUnit),
          };
        }
        return a;
      })
    );
  }, [totalBudget]);

  const handleDistrictShareChange = useCallback((districtId: string, newShare: number) => {
    setDistrictAllocations((prev) =>
      prev.map((a) => (a.districtId === districtId ? { ...a, share: newShare } : a))
    );
  }, []);

  const recalculateUnits = useCallback(() => {
    setDrugAllocations((prev) =>
      prev.map((a) => {
        const product = WM_PRODUCTS.find((p) => p.id === a.productId)!;
        const budgetForProduct = totalBudget * (a.budgetShare / 100);
        return { ...a, planUnits: Math.round(budgetForProduct / product.pricePerUnit) };
      })
    );
  }, [totalBudget]);

  useEffect(() => {
    recalculateUnits();
  }, [totalBudget, recalculateUnits]);

  const saveScenario = useCallback(() => {
    const name = scenarioName.trim() || `Сценарий ${savedScenarios.length + 1}`;
    const scenario: BudgetScenario = {
      id: Date.now().toString(),
      name,
      date: new Date().toLocaleDateString('ru-RU'),
      totalBudget,
      growthPercent,
      drugAllocations: [...drugAllocations],
      districtAllocations: [...districtAllocations],
    };
    const updated = [...savedScenarios, scenario];
    setSavedScenarios(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setScenarioName('');
  }, [scenarioName, savedScenarios, totalBudget, growthPercent, drugAllocations, districtAllocations]);

  const loadScenario = useCallback((scenario: BudgetScenario) => {
    setTotalBudget(scenario.totalBudget);
    setGrowthPercent(scenario.growthPercent);
    setDrugAllocations(scenario.drugAllocations);
    setDistrictAllocations(scenario.districtAllocations);
  }, []);

  const deleteScenario = useCallback((id: string) => {
    const updated = savedScenarios.filter((s) => s.id !== id);
    setSavedScenarios(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [savedScenarios]);

  const pieData = useMemo(() => {
    return drugAllocations.map((a) => {
      const product = WM_PRODUCTS.find((p) => p.id === a.productId)!;
      return {
        name: product.name,
        value: Math.round(totalBudget * (a.budgetShare / 100)),
        color: product.color,
        share: a.budgetShare,
      };
    });
  }, [drugAllocations, totalBudget]);

  const districtBarData = useMemo(() => {
    return districtAllocations.map((a) => {
      const district = FEDERAL_DISTRICTS.find((d) => d.id === a.districtId)!;
      return {
        name: district.name,
        fullName: district.fullName,
        budget: Math.round(totalBudget * (a.share / 100)),
        share: a.share,
      };
    });
  }, [districtAllocations, totalBudget]);

  const projectedBudget = totalBudget * (1 + growthPercent / 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            Калькулятор бюджета
          </h2>
          <p className="text-gray-400 mt-1">Планирование бюджета и распределение ресурсов</p>
        </div>
      </div>

      {/* Budget Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Общий бюджет</h3>
          </div>
          <div className="space-y-3">
            <input
              type="number"
              value={totalBudget}
              onChange={(e) => setTotalBudget(Number(e.target.value) || 0)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 flex-wrap">
              {[1_000_000_000, 2_000_000_000, 3_000_000_000, 5_000_000_000].map((v) => (
                <button
                  key={v}
                  onClick={() => setTotalBudget(v)}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    totalBudget === v
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {formatCurrency(v)}
                </button>
              ))}
            </div>
            <p className="text-gray-400 text-sm">Текущий: <span className="text-white font-bold">{formatCurrency(totalBudget)}</span></p>
          </div>
        </div>

        <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Рост</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={50}
                step={0.5}
                value={growthPercent}
                onChange={(e) => setGrowthPercent(Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-2xl font-bold text-white min-w-[60px] text-right">{growthPercent}%</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[5, 10, 15, 20, 25, 30].map((v) => (
                <button
                  key={v}
                  onClick={() => setGrowthPercent(v)}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    growthPercent === v
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
            <p className="text-gray-400 text-sm">
              Проекция: <span className="text-emerald-400 font-bold">{formatCurrency(projectedBudget)}</span>
            </p>
          </div>
        </div>

        <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Save className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Сценарии</h3>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Название сценария..."
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={saveScenario}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1"
              >
                <Save className="w-4 h-4" />
                Сохранить
              </button>
            </div>
            {savedScenarios.length > 0 && (
              <div className="max-h-[120px] overflow-y-auto space-y-1">
                {savedScenarios.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.date} | {formatCurrency(s.totalBudget)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => loadScenario(s)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-blue-400 transition-colors"
                        title="Загрузить"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteScenario(s.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-red-400 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {savedScenarios.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">Нет сохранённых сценариев</p>
            )}
          </div>
        </div>
      </div>

      {/* Drug Allocation Table */}
      <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-400" />
            Распределение бюджета по препаратам
          </h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            Math.abs(totalDrugSharePercent - 100) < 0.5
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            Итого: {totalDrugSharePercent.toFixed(1)}%
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs text-gray-400 font-medium py-3 px-2">Препарат</th>
                <th className="text-left text-xs text-gray-400 font-medium py-3 px-2">Категория</th>
                <th className="text-center text-xs text-gray-400 font-medium py-3 px-2">Доля (%)</th>
                <th className="text-right text-xs text-gray-400 font-medium py-3 px-2">Бюджет (₽)</th>
                <th className="text-right text-xs text-gray-400 font-medium py-3 px-2">Цена за упак.</th>
                <th className="text-right text-xs text-gray-400 font-medium py-3 px-2">План (упак.)</th>
              </tr>
            </thead>
            <tbody>
              {drugAllocations.map((alloc) => {
                const product = WM_PRODUCTS.find((p) => p.id === alloc.productId)!;
                const budgetForProduct = Math.round(totalBudget * (alloc.budgetShare / 100));
                return (
                  <tr key={alloc.productId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: product.color }} />
                        <span className="text-white font-medium text-sm">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-gray-400 text-sm">{product.category}</span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2 justify-center">
                        <input
                          type="range"
                          min={0}
                          max={30}
                          step={0.5}
                          value={alloc.budgetShare}
                          onChange={(e) => handleDrugShareChange(alloc.productId, Number(e.target.value))}
                          className="w-20 accent-blue-500"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={alloc.budgetShare}
                          onChange={(e) => handleDrugShareChange(alloc.productId, Number(e.target.value) || 0)}
                          className="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="text-emerald-400 font-medium text-sm">{formatCurrency(budgetForProduct)}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="text-gray-300 text-sm">{formatNumber(product.pricePerUnit)} ₽</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="text-blue-400 font-bold text-sm">{formatNumber(alloc.planUnits)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/20">
                <td colSpan={2} className="py-3 px-2 text-white font-bold">Итого</td>
                <td className="py-3 px-2 text-center">
                  <span className={`font-bold ${Math.abs(totalDrugSharePercent - 100) < 0.5 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totalDrugSharePercent.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3 px-2 text-right">
                  <span className="text-emerald-400 font-bold">{formatCurrency(totalBudget)}</span>
                </td>
                <td className="py-3 px-2" />
                <td className="py-3 px-2 text-right">
                  <span className="text-blue-400 font-bold">
                    {formatNumber(drugAllocations.reduce((sum, a) => sum + a.planUnits, 0))}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Budget by Drug */}
        <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Pill className="w-5 h-5 text-purple-400" />
            Распределение бюджета по препаратам
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={130}
                paddingAngle={2}
                dataKey="value"
                label={({ name, share }) => `${name}: ${share}%`}
                labelLine={{ stroke: '#6B7280' }}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: number) => [formatCurrency(value), 'Бюджет']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - District Allocation */}
        <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Распределение по федеральным округам
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={districtBarData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                type="number"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(v) => formatCurrency(v)}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#9CA3AF"
                fontSize={12}
                width={50}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: number, _name: string, entry: any) => [
                  `${formatCurrency(value)} (${entry.payload.share.toFixed(1)}%)`,
                  'Бюджет',
                ]}
                labelFormatter={(label) => {
                  const d = districtBarData.find((dd) => dd.name === label);
                  return d?.fullName || label;
                }}
              />
              <Bar dataKey="budget" fill="#3B82F6" radius={[0, 6, 6, 0]}>
                {districtBarData.map((_, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'][index]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* District Allocation Table */}
      <div className="wm-card bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Распределение по территориям
          </h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            Math.abs(totalDistrictSharePercent - 100) < 0.5
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            Итого: {totalDistrictSharePercent.toFixed(1)}%
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {districtAllocations.map((alloc) => {
            const district = FEDERAL_DISTRICTS.find((d) => d.id === alloc.districtId)!;
            const budgetForDistrict = Math.round(totalBudget * (alloc.share / 100));
            return (
              <div key={alloc.districtId} className="bg-white/5 rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{district.name}</span>
                  <span className="text-xs text-gray-500">{district.fullName}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={0.5}
                    value={alloc.share}
                    onChange={(e) => handleDistrictShareChange(alloc.districtId, Number(e.target.value))}
                    className="flex-1 accent-cyan-500"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={alloc.share}
                    onChange={(e) => handleDistrictShareChange(alloc.districtId, Number(e.target.value) || 0)}
                    className="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <p className="text-emerald-400 font-bold text-sm">{formatCurrency(budgetForDistrict)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
