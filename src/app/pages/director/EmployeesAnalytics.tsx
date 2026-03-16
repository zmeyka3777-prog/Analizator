// ==================== АНАЛИЗ СОТРУДНИКОВ ====================

import React, { useState, useMemo } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { getSalesData, PRODUCTS } from '@/data/salesData';
import { 
  EMPLOYEES, 
  Employee, 
  getActiveEmployees, 
  getEmployeeTotalPlan 
} from '@/data/employees';
import { FEDERAL_DISTRICTS, FederalDistrict } from '@/data/federalDistricts';
import { 
  ORGANIZATION_STRUCTURE, 
  DistrictOrganization,
  getDistrictOrganization,
  getTerritoryOrganization,
  getFederalDistrictData
} from '@/data/organizationStructure';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '@/utils/storage';
import {
  Users,
  Building2,
  MapPin,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Home,
  Package,
  Edit,
  X,
  AlertTriangle,
  Mail,
  Phone,
  Briefcase,
  ChevronDown,
  BarChart3,
  DollarSign,
  Save,
  UserPlus,
} from 'lucide-react';

// ==================== УТИЛИТЫ ====================
const formatNumber = (num: number): string => new Intl.NumberFormat('ru-RU').format(Math.round(num));
const formatCurrency = (num: number): string => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(num);
const formatPercent = (num: number): string => `${num > 0 ? '+' : ''}${num.toFixed(1)}%`;

// ==================== ТИПЫ НАВИГАЦИИ ====================
type NavigationLevel = 'DISTRICTS' | 'TERRITORIAL_MANAGERS' | 'MEDREPS';

interface NavigationState {
  level: NavigationLevel;
  districtId?: string;
  territorialManagerId?: string;
}

// ==================== КОМПОНЕНТ ====================
export default function EmployeesAnalytics() {
  const [navigation, setNavigation] = useState<NavigationState>({ level: 'DISTRICTS' });
  const [editingDistrictId, setEditingDistrictId] = useState<string | null>(null);
  const [editingTerritorialManagerId, setEditingTerritorialManagerId] = useState<string | null>(null);
  const [editingMedrepId, setEditingMedrepId] = useState<string | null>(null);

  // Навигация
  const goToDistricts = () => setNavigation({ level: 'DISTRICTS' });
  const goToTerritorialManagers = (districtId: string) => setNavigation({ level: 'TERRITORIAL_MANAGERS', districtId });
  const goToMedreps = (districtId: string, territorialManagerId: string) => 
    setNavigation({ level: 'MEDREPS', districtId, territorialManagerId });

  // Получить данные по сотруднику
  const getEmployeeById = (employeeId: string): Employee | undefined => {
    return EMPLOYEES.find(emp => emp.id === employeeId);
  };

  // Получить данные округа
  const currentDistrict = navigation.districtId 
    ? getFederalDistrictData(navigation.districtId)
    : undefined;

  const currentDistrictOrg = navigation.districtId
    ? getDistrictOrganization(navigation.districtId)
    : undefined;

  // Получить данные территориального менеджера
  const currentTerritorialManager = navigation.territorialManagerId
    ? getEmployeeById(navigation.territorialManagerId)
    : undefined;

  return (
    <div className="space-y-6">
      {/* ==================== HEADER С BREADCRUMBS ==================== */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Анализ сотрудников</h2>
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-base flex-wrap">
          <button
            onClick={goToDistricts}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors font-semibold ${
              navigation.level === 'DISTRICTS'
                ? 'bg-cyan-100 text-cyan-700'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Home className="w-5 h-5" />
            Все округа
          </button>

          {currentDistrict && (
            <>
              <ChevronRight className="w-5 h-5 text-slate-400" />
              <button
                onClick={() => goToTerritorialManagers(currentDistrict.id)}
                className={`px-4 py-2 rounded-xl transition-colors font-semibold ${
                  navigation.level === 'TERRITORIAL_MANAGERS'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {currentDistrict.shortName}
              </button>
            </>
          )}

          {currentTerritorialManager && (
            <>
              <ChevronRight className="w-5 h-5 text-slate-400" />
              <span className="px-4 py-2 bg-green-100 text-green-700 font-semibold rounded-xl">
                {currentTerritorialManager.lastName} {currentTerritorialManager.firstName[0]}.
              </span>
            </>
          )}
        </div>
      </div>

      {/* ==================== КОНТЕНТ ПО УРОВНЯМ ==================== */}
      {navigation.level === 'DISTRICTS' && (
        <DistrictsView 
          onSelectDistrict={goToTerritorialManagers}
          onEdit={setEditingDistrictId}
        />
      )}

      {navigation.level === 'TERRITORIAL_MANAGERS' && currentDistrict && currentDistrictOrg && (
        <TerritorialManagersView 
          district={currentDistrict} 
          districtOrg={currentDistrictOrg}
          onSelectManager={(managerId) => goToMedreps(currentDistrict.id, managerId)}
          onEdit={setEditingTerritorialManagerId}
        />
      )}

      {navigation.level === 'MEDREPS' && currentDistrict && currentTerritorialManager && currentDistrictOrg && (
        <MedrepsView 
          district={currentDistrict}
          territorialManager={currentTerritorialManager}
          districtOrg={currentDistrictOrg}
          onEdit={setEditingMedrepId}
        />
      )}

      {/* ==================== МОДАЛЬНЫЕ ОКНА РЕДАКТИРОВАНИЯ ==================== */}
      {editingDistrictId && (
        <EditDistrictModal
          districtId={editingDistrictId}
          onClose={() => setEditingDistrictId(null)}
        />
      )}

      {editingTerritorialManagerId && (
        <EditTerritorialManagerModal
          territorialManagerId={editingTerritorialManagerId}
          onClose={() => setEditingTerritorialManagerId(null)}
        />
      )}

      {editingMedrepId && (
        <EditMedrepModal
          medrepId={editingMedrepId}
          onClose={() => setEditingMedrepId(null)}
        />
      )}
    </div>
  );
}

// ==================== УРОВЕНЬ 1: ОКРУГА ====================
function DistrictsView({ 
  onSelectDistrict,
  onEdit
}: { 
  onSelectDistrict: (districtId: string) => void;
  onEdit: (districtId: string) => void;
}) {
  const totalTerritories = FEDERAL_DISTRICTS.reduce((sum, d) => sum + d.territories.length, 0);
  const totalEmployees = ORGANIZATION_STRUCTURE.reduce((sum, d) => 
    sum + d.territories.reduce((tSum, t) => tSum + t.medrepIds.length + 1, 0), 0
  );

  // Рассчитываем план/факт для каждого округа
  const districtsWithStats = useMemo(() => {
    return FEDERAL_DISTRICTS.map((district) => {
      const districtOrg = getDistrictOrganization(district.id);
      if (!districtOrg) {
        return { district, plan: 0, fact: 0, performance: 0, regionalManager: undefined, totalEmployees: 0, totalMedreps: 0, totalTerritorialManagers: 0 };
      }

      // Получаем всех сотрудников округа (медпредов)
      const allMedrepIds = districtOrg.territories.flatMap((t: any) => t.medrepIds);
      const allMedreps = allMedrepIds.map((id: string) => getEmployeeById(id)).filter(Boolean) as Employee[];

      // Суммируем план и факт
      let totalPlan = 0;
      let totalFact = 0;

      allMedreps.forEach(medrep => {
        const data2025 = getSalesData({ territory: medrep.territory, year: 2025 });
        const territoryEmployees = EMPLOYEES.filter(e => e.territory === medrep.territory && e.status === 'active');
        const territoryTotalPlan = territoryEmployees.reduce((sum, e) => sum + getEmployeeTotalPlan(e.id, 'units'), 0);
        const medrepPlanShare = territoryTotalPlan > 0 ? getEmployeeTotalPlan(medrep.id, 'units') / territoryTotalPlan : 0;

        const medrepPlan = getEmployeeTotalPlan(medrep.id, 'units');
        const medrepFact = data2025.reduce((sum, d) => sum + d.units, 0) * medrepPlanShare;

        totalPlan += medrepPlan;
        totalFact += medrepFact;
      });

      const performance = totalPlan > 0 ? (totalFact / totalPlan) * 100 : 0;
      const regionalManager = getEmployeeById(districtOrg.regionalManagerId);
      const totalEmployees = districtOrg.territories.reduce((sum: number, t: any) => sum + t.medrepIds.length + 1, 0);
      const totalMedreps = districtOrg.territories.reduce((sum: number, t: any) => sum + t.medrepIds.length, 0);
      const totalTerritorialManagers = districtOrg.territories.length;

      return { 
        district, 
        plan: totalPlan, 
        fact: totalFact, 
        performance, 
        regionalManager, 
        totalEmployees, 
        totalMedreps, 
        totalTerritorialManagers 
      };
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-lg font-semibold text-cyan-100">Организационная структура</p>
          <Building2 className="w-10 h-10 text-white/30" />
        </div>
        <p className="text-4xl font-bold mb-3">Российская Федерация</p>
        <p className="text-base font-semibold text-cyan-100">
          Округов: {FEDERAL_DISTRICTS.length} • Территорий: {totalTerritories} • Сотрудников: {totalEmployees}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {districtsWithStats.map(({ district, plan, fact, performance, regionalManager, totalMedreps, totalTerritorialManagers }) => {
          const performanceColor = performance >= 100 ? 'green' : performance >= 80 ? 'yellow' : 'red';

          return (
            <div
              key={district.id}
              className="group bg-white rounded-2xl shadow-lg border-2 border-slate-200 hover:shadow-2xl hover:border-cyan-400 transition-all duration-300 relative overflow-hidden"
            >
              {/* Градиентный фон */}
              <div 
                className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"
                style={{ backgroundColor: district.color }}
              />

              <div className="relative p-6">
                {/* Header с иконкой редактирования */}
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg text-3xl cursor-pointer"
                    style={{ background: `linear-gradient(to bottom right, ${district.color}, ${district.color}dd)` }}
                    onClick={() => onSelectDistrict(district.id)}
                  >
                    {district.icon}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(district.id);
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
                  >
                    <Edit className="w-5 h-5 text-slate-700" />
                  </button>
                </div>

                <div onClick={() => onSelectDistrict(district.id)} className="cursor-pointer">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{district.shortName}</h3>
                  <p className="text-sm font-semibold text-slate-600 mb-4">{district.name}</p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-600 mb-1">Территориалов</p>
                      <p className="text-2xl font-bold text-slate-900">{totalTerritorialManagers}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-600 mb-1">Медпредов</p>
                      <p className="text-2xl font-bold text-slate-900">{totalMedreps}</p>
                    </div>
                  </div>

                  {/* План/Факт блок */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 mb-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-bold text-slate-600 mb-1">План (упак.)</p>
                        <p className="text-lg font-bold text-slate-900">{formatNumber(plan)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-600 mb-1">Факт (упак.)</p>
                        <p className="text-lg font-bold text-slate-900">{formatNumber(fact)}</p>
                      </div>
                    </div>
                    
                    {/* Прогресс-бар */}
                    <div className="mb-2">
                      <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            performanceColor === 'green'
                              ? 'bg-gradient-to-r from-green-500 to-green-600'
                              : performanceColor === 'yellow'
                              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                              : 'bg-gradient-to-r from-red-500 to-red-600'
                          }`}
                          style={{ width: `${Math.min(performance, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Выпо��нение</span>
                      <span 
                        className={`text-sm font-bold ${
                          performanceColor === 'green'
                            ? 'text-green-600'
                            : performanceColor === 'yellow'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {performance.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {regionalManager && (
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                      <p className="text-xs font-bold text-slate-600 mb-2">Региональный менеджер</p>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow"
                          style={{ background: `linear-gradient(to bottom right, ${district.color}, ${district.color}dd)` }}
                        >
                          {regionalManager.lastName[0]}{regionalManager.firstName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {regionalManager.lastName} {regionalManager.firstName[0]}.
                          </p>
                          <p className="text-xs font-semibold text-slate-600 truncate">{regionalManager.phone}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center mt-4 pt-4 border-t border-slate-200">
                  <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Вспомогательная функция для получения сотрудника
function getEmployeeById(id: string): Employee | undefined {
  return EMPLOYEES.find(emp => emp.id === id);
}

// ==================== УРОВЕНЬ 2: ТЕРРИТОРИАЛЬНЫЕ МЕНЕДЖЕРЫ ====================
function TerritorialManagersView({ 
  district,
  districtOrg,
  onSelectManager,
  onEdit
}: { 
  district: FederalDistrict;
  districtOrg: any;
  onSelectManager: (managerId: string) => void;
  onEdit: (managerId: string) => void;
}) {
  const [selectedManagerForDetails, setSelectedManagerForDetails] = useState<string | null>(null);

  // Получаем уникальных территориальных менеджеров с расчетом план/факт
  const territorialManagers = useMemo(() => {
    const managersMap = new Map();
    
    districtOrg.territories.forEach((territoryOrg: any) => {
      const manager = getEmployeeById(territoryOrg.territorialManagerId);
      if (manager && !managersMap.has(manager.id)) {
        // Получаем всех медпредов под этим менеджером
        const medrepIds = districtOrg.territories
          .filter((t: any) => t.territorialManagerId === manager.id)
          .flatMap((t: any) => t.medrepIds);
        
        const medreps = medrepIds.map((id: string) => getEmployeeById(id)).filter(Boolean) as Employee[];
        
        // Рассчитываем план/факт
        let totalPlan = 0;
        let totalFact = 0;
        
        medreps.forEach(medrep => {
          const data2025 = getSalesData({ territory: medrep.territory, year: 2025 });
          const territoryEmployees = EMPLOYEES.filter(e => e.territory === medrep.territory && e.status === 'active');
          const territoryTotalPlan = territoryEmployees.reduce((sum, e) => sum + getEmployeeTotalPlan(e.id, 'units'), 0);
          const medrepPlanShare = territoryTotalPlan > 0 ? getEmployeeTotalPlan(medrep.id, 'units') / territoryTotalPlan : 0;

          const medrepPlan = getEmployeeTotalPlan(medrep.id, 'units');
          const medrepFact = data2025.reduce((sum, d) => sum + d.units, 0) * medrepPlanShare;

          totalPlan += medrepPlan;
          totalFact += medrepFact;
        });
        
        const performance = totalPlan > 0 ? (totalFact / totalPlan) * 100 : 0;
        const medrepCount = medreps.length;
        const territoriesCount = districtOrg.territories
          .filter((t: any) => t.territorialManagerId === manager.id).length;
        
        managersMap.set(manager.id, {
          manager,
          medrepCount,
          territoriesCount,
          plan: totalPlan,
          fact: totalFact,
          performance,
        });
      }
    });
    
    return Array.from(managersMap.values());
  }, [districtOrg]);

  return (
    <>
      <div className="space-y-6">
        <div 
          className="rounded-2xl p-8 text-white shadow-xl"
          style={{ background: `linear-gradient(to bottom right, ${district.color}, ${district.color}dd)` }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-lg font-semibold text-white/90">Территориальные менеджеры</p>
            <Briefcase className="w-10 h-10 text-white/30" />
          </div>
          <p className="text-4xl font-bold mb-3">{district.name}</p>
          <p className="text-base font-semibold text-white/90">
            Территориальных менеджеров: {territorialManagers.length}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {territorialManagers.map(({ manager, medrepCount, territoriesCount, plan, fact, performance }) => {
            const performanceColor = performance >= 100 ? 'green' : performance >= 80 ? 'yellow' : 'red';

            return (
              <div
                key={manager.id}
                className="group bg-white rounded-2xl shadow-lg border-2 border-slate-200 hover:shadow-2xl transition-all duration-300 relative overflow-hidden"
                style={{ borderColor: `${district.color}33` }}
              >
                {/* Градиентный фон */}
                <div 
                  className="absolute top-0 right-0 w-32 h-32 opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"
                  style={{ backgroundColor: district.color }}
                />

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4 p-6 pb-0">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold shadow-lg text-lg"
                        style={{ background: `linear-gradient(to bottom right, ${district.color}, ${district.color}dd)` }}
                      >
                        {manager.lastName[0]}{manager.firstName[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg leading-tight">
                          {manager.lastName}
                        </h3>
                        <p className="font-semibold text-slate-900 text-base">
                          {manager.firstName} {manager.middleName?.[0]}.
                        </p>
                        <p className="text-xs font-bold text-slate-600 mt-1">Территориальный менеджер</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(manager.id);
                        }}
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
                      >
                        <Edit className="w-5 h-5 text-slate-700" />
                      </button>
                      <div 
                        onClick={() => onSelectManager(manager.id)} 
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <ChevronRight 
                          className="w-5 h-5 text-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="px-6">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-slate-600 mb-1">Территорий</p>
                        <p className="text-2xl font-bold text-slate-900">{territoriesCount}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-slate-600 mb-1">Медпредов</p>
                        <p className="text-2xl font-bold text-slate-900">{medrepCount}</p>
                      </div>
                    </div>

                    {/* План/Факт блок - КЛИКАБЕЛЬНЫЙ для детализации по препаратам */}
                    <div 
                      className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 mb-4 border-2 border-slate-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group/planfact"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedManagerForDetails(manager.id);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-purple-600" />
                          <p className="text-xs font-bold text-slate-700">Детализация по препаратам</p>
                        </div>
                        <ChevronDown className="w-5 h-5 text-slate-400 group-hover/planfact:text-purple-600 transition-colors" />
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs font-bold text-slate-600 mb-1">План (упак.)</p>
                          <p className="text-lg font-bold text-slate-900">{formatNumber(plan)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-600 mb-1">Факт (упак.)</p>
                          <p className="text-lg font-bold text-slate-900">{formatNumber(fact)}</p>
                        </div>
                      </div>
                      
                      {/* Прогресс-бар */}
                      <div className="mb-2">
                        <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              performanceColor === 'green'
                                ? 'bg-gradient-to-r from-green-500 to-green-600'
                                : performanceColor === 'yellow'
                                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                                : 'bg-gradient-to-r from-red-500 to-red-600'
                            }`}
                            style={{ width: `${Math.min(performance, 100)}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">Выполнение</span>
                        <span 
                          className={`text-sm font-bold ${
                            performanceColor === 'green'
                              ? 'text-green-600'
                              : performanceColor === 'yellow'
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {performance.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pb-6">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{manager.territory}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{manager.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Phone className="w-4 h-4" />
                        <span>{manager.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Модальное окно с детализацией по препаратам */}
      {selectedManagerForDetails && (
        <TerritorialManagerDetailsModal
          territorialManagerId={selectedManagerForDetails}
          districtColor={district.color}
          onClose={() => setSelectedManagerForDetails(null)}
        />
      )}
    </>
  );
}

// Модальное окно детализации по препаратам для территориального менеджера
function TerritorialManagerDetailsModal({ 
  territorialManagerId, 
  districtColor, 
  onClose 
}: { 
  territorialManagerId: string; 
  districtColor: string;
  onClose: () => void;
}) {
  const manager = getEmployeeById(territorialManagerId);
  
  if (!manager) return null;

  // Получаем план/факт по ВСЕМ 12 препаратам
  const productsAnalytics = useMemo(() => {
    // Находим округ и его организацию
    const districtOrg = ORGANIZATION_STRUCTURE.find(d => 
      d.territories.some(t => t.territorialManagerId === territorialManagerId)
    );
    
    if (!districtOrg) return [];

    // Получаем всех медпредов под этим менеджером
    const medrepIds = districtOrg.territories
      .filter(t => t.territorialManagerId === territorialManagerId)
      .flatMap(t => t.medrepIds);
    
    const medreps = medrepIds.map(id => getEmployeeById(id)).filter(Boolean) as Employee[];

    // Рассчитываем план/факт по КАЖДОМУ препарату (все 12)
    return PRODUCTS.map(product => {
      let totalPlanUnits = 0;
      let totalFactUnits = 0;
      let totalPlanRevenue = 0;
      let totalFactRevenue = 0;

      medreps.forEach(medrep => {
        const data2025 = getSalesData({ territory: medrep.territory, year: 2025 });
        const productData = data2025.filter(d => d.productId === product.id);
        
        const territoryEmployees = EMPLOYEES.filter(e => e.territory === medrep.territory && e.status === 'active');
        const territoryTotalPlan = territoryEmployees.reduce((sum, e) => sum + getEmployeeTotalPlan(e.id, 'units'), 0);
        const medrepPlanShare = territoryTotalPlan > 0 ? getEmployeeTotalPlan(medrep.id, 'units') / territoryTotalPlan : 0;

        const medrepProductPlanUnits = medrep.productPlans[product.id] || 0;
        const medrepProductFactUnits = productData.reduce((sum, d) => sum + d.units, 0) * medrepPlanShare;
        const medrepProductFactRevenue = productData.reduce((sum, d) => sum + d.revenue, 0) * medrepPlanShare;
        const medrepProductPlanRevenue = medrepProductPlanUnits * product.price;

        totalPlanUnits += medrepProductPlanUnits;
        totalFactUnits += medrepProductFactUnits;
        totalPlanRevenue += medrepProductPlanRevenue;
        totalFactRevenue += medrepProductFactRevenue;
      });

      const performanceUnits = totalPlanUnits > 0 ? (totalFactUnits / totalPlanUnits) * 100 : 0;

      return { 
        product, 
        planUnits: totalPlanUnits, 
        factUnits: totalFactUnits, 
        planRevenue: totalPlanRevenue, 
        factRevenue: totalFactRevenue, 
        performance: performanceUnits 
      };
    })
      .sort((a, b) => b.factRevenue - a.factRevenue); // Сортировка по фактической выручке
  }, [territorialManagerId]);

  const totalPlanUnits = productsAnalytics.reduce((sum, p) => sum + p.planUnits, 0);
  const totalFactUnits = productsAnalytics.reduce((sum, p) => sum + p.factUnits, 0);
  const totalPlanRevenue = productsAnalytics.reduce((sum, p) => sum + p.planRevenue, 0);
  const totalFactRevenue = productsAnalytics.reduce((sum, p) => sum + p.factRevenue, 0);
  const totalPerformance = totalPlanUnits > 0 ? (totalFactUnits / totalPlanUnits) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div 
          className="p-8 rounded-t-3xl text-white sticky top-0 z-10"
          style={{ background: `linear-gradient(to right, ${districtColor}, ${districtColor}dd)` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">План/факт по препаратам</h2>
              <p className="text-lg font-semibold text-white/90">
                {manager.lastName} {manager.firstName} {manager.middleName}
              </p>
              <p className="text-sm text-white/80 mt-1">{manager.territory}</p>
            </div>
            <button onClick={onClose} className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Общая статистика */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-slate-900">Упаковки</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-600">План: {formatNumber(totalPlanUnits)}</p>
                    <p className="text-sm font-bold text-slate-600">Факт: {formatNumber(totalFactUnits)}</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-slate-900">Выручка</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-600">План: {formatCurrency(totalPlanRevenue)}</p>
                    <p className="text-sm font-bold text-slate-600">Факт: {formatCurrency(totalFactRevenue)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative w-full h-4 bg-slate-200 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalPerformance >= 100
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : totalPerformance >= 80
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                    : 'bg-gradient-to-r from-red-500 to-red-600'
                }`}
                style={{ width: `${Math.min(totalPerformance, 100)}%` }}
              />
            </div>
            <p className={`text-2xl font-bold ${
              totalPerformance >= 100 ? 'text-green-600' : totalPerformance >= 80 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {totalPerformance.toFixed(1)}% общего выполнения
            </p>
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            Все препараты ({productsAnalytics.length})
          </h3>

          <div className="space-y-2">
            {productsAnalytics.map((item, index) => {
              const performanceColor = item.performance >= 100 ? 'green' : item.performance >= 80 ? 'yellow' : 'red';
              
              return (
                <div key={item.product.id} className="bg-slate-50 rounded-xl p-3 border-2 border-slate-200 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg"
                        style={{ background: `linear-gradient(to bottom right, ${districtColor}, ${districtColor}dd)` }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{item.product.shortName}</h4>
                        <p className="text-xs font-semibold text-slate-500">{item.product.category}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-white rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <Package className="w-3 h-3 text-purple-600" />
                        <p className="text-[10px] font-bold text-slate-600">Упаковки</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{formatNumber(item.factUnits)}</p>
                          <p className="text-[9px] text-slate-500">факт</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-700">{formatNumber(item.planUnits)}</p>
                          <p className="text-[9px] text-slate-500">план</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <DollarSign className="w-3 h-3 text-purple-600" />
                        <p className="text-[10px] font-bold text-slate-600">Выручка</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{formatCurrency(item.factRevenue)}</p>
                          <p className="text-[9px] text-slate-500">факт</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-700">{formatCurrency(item.planRevenue)}</p>
                          <p className="text-[9px] text-slate-500">план</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        performanceColor === 'green'
                          ? 'bg-gradient-to-r from-green-500 to-green-600'
                          : performanceColor === 'yellow'
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                          : 'bg-gradient-to-r from-red-500 to-red-600'
                      }`}
                      style={{ width: `${Math.min(item.performance, 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs font-bold text-right ${
                    performanceColor === 'green' ? 'text-green-600' : performanceColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {item.performance.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>

          <Button onClick={onClose} className="w-full mt-6 bg-gradient-to-r text-white" style={{ background: `linear-gradient(to right, ${districtColor}, ${districtColor}dd)` }}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== УРОВЕНЬ 3: МЕДПРЕДЫ ====================
function MedrepsView({ 
  district,
  territorialManager,
  districtOrg,
  onEdit
}: { 
  district: FederalDistrict;
  territorialManager: Employee;
  districtOrg: any;
  onEdit: (medrepId: string) => void;
}) {
  const [selectedMedrepForDetails, setSelectedMedrepForDetails] = useState<string | null>(null);

  // Получаем всех медпредов под этим территориальным менеджером
  const medrepIds = useMemo(() => {
    return districtOrg.territories
      .filter((t: any) => t.territorialManagerId === territorialManager.id)
      .flatMap((t: any) => t.medrepIds);
  }, [districtOrg, territorialManager]);

  const medreps = medrepIds.map((id: string) => getEmployeeById(id)).filter(Boolean) as Employee[];

  // Аналитика по медпредам
  const medrepsAnalytics = useMemo(() => {
    return medreps.map(medrep => {
      const data2025 = getSalesData({ territory: medrep.territory, year: 2025 });
      const data2024 = getSalesData({ territory: medrep.territory, year: 2024 });

      const territoryEmployees = EMPLOYEES.filter(e => e.territory === medrep.territory && e.status === 'active');
      const territoryTotalPlan = territoryEmployees.reduce((sum, e) => sum + getEmployeeTotalPlan(e.id, 'units'), 0);
      const medrepPlanShare = getEmployeeTotalPlan(medrep.id, 'units') / territoryTotalPlan;

      const revenue2025 = data2025.reduce((sum, d) => sum + d.revenue, 0) * medrepPlanShare;
      const revenue2024 = data2024.reduce((sum, d) => sum + d.revenue, 0) * medrepPlanShare;
      const units2025 = data2025.reduce((sum, d) => sum + d.units, 0) * medrepPlanShare;
      const planRevenue = getEmployeeTotalPlan(medrep.id, 'revenue');
      const planUnits = getEmployeeTotalPlan(medrep.id, 'units');
      const performance = (revenue2025 / planRevenue) * 100;
      const growth = revenue2024 > 0 ? ((revenue2025 - revenue2024) / revenue2024) * 100 : 0;

      return { medrep, revenue2025, units2025, planRevenue, planUnits, performance, growth };
    });
  }, [medreps]);

  return (
    <>
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-lg font-semibold text-green-100">Медицинские представители</p>
            <Users className="w-10 h-10 text-white/30" />
          </div>
          <p className="text-4xl font-bold mb-2">
            {territorialManager.lastName} {territorialManager.firstName}
          </p>
          <p className="text-base font-semibold text-green-100">
            МП в подчинении: {medreps.length}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medrepsAnalytics.map(({ medrep, revenue2025, units2025, planRevenue, planUnits, performance, growth }) => {
            const performanceColor = performance >= 100 ? 'green' : performance >= 80 ? 'yellow' : 'red';

            return (
              <div
                key={medrep.id}
                className="group bg-white rounded-2xl shadow-lg border-2 border-slate-200 hover:shadow-2xl hover:border-green-400 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4 p-6 pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold shadow-lg text-lg">
                        {medrep.lastName[0]}{medrep.firstName[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg leading-tight">
                          {medrep.lastName}
                        </h3>
                        <p className="font-semibold text-slate-900 text-base">
                          {medrep.firstName}
                        </p>
                        <p className="text-xs font-bold text-slate-600">Медицинский представитель</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(medrep.id);
                      }}
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
                    >
                      <Edit className="w-5 h-5 text-slate-700" />
                    </button>
                  </div>

                  <div className="px-6">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-xs font-bold text-slate-600 mb-1">Выручка</p>
                        <p className="text-base font-bold text-slate-900">{formatCurrency(revenue2025)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-600 mb-1">Рост</p>
                        <div className="flex items-center gap-1">
                          {growth >= 0 ? (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-600" />
                          )}
                          <span className={`text-base font-bold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(growth)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* План/Факт блок - КЛИКАБЕЛЬНЫЙ для детализации по препаратам */}
                    <div 
                      className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 mb-4 border-2 border-slate-200 hover:border-green-400 hover:shadow-md transition-all cursor-pointer group/planfact"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMedrepForDetails(medrep.id);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-green-600" />
                          <p className="text-xs font-bold text-slate-700">Детализация по препаратам</p>
                        </div>
                        <ChevronDown className="w-5 h-5 text-slate-400 group-hover/planfact:text-green-600 transition-colors" />
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs font-bold text-slate-600 mb-1">План (упак.)</p>
                          <p className="text-lg font-bold text-slate-900">{formatNumber(planUnits)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-600 mb-1">Факт (упак.)</p>
                          <p className="text-lg font-bold text-slate-900">{formatNumber(units2025)}</p>
                        </div>
                      </div>
                      
                      {/* Прогресс-бар */}
                      <div className="mb-2">
                        <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              performanceColor === 'green'
                                ? 'bg-gradient-to-r from-green-500 to-green-600'
                                : performanceColor === 'yellow'
                                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                                : 'bg-gradient-to-r from-red-500 to-red-600'
                            }`}
                            style={{ width: `${Math.min(performance, 100)}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">Выполнение плана</span>
                        <span className={`text-sm font-bold ${
                          performanceColor === 'green'
                            ? 'text-green-600'
                            : performanceColor === 'yellow'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}>
                          {performance.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="pb-6">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{medrep.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Модальное окно с детализацией по препаратам */}
      {selectedMedrepForDetails && (
        <MedrepDetailsModal
          medrepId={selectedMedrepForDetails}
          onClose={() => setSelectedMedrepForDetails(null)}
        />
      )}
    </>
  );
}

// Модальное окно детализации по препаратам для медпреда
function MedrepDetailsModal({ 
  medrepId, 
  onClose 
}: { 
  medrepId: string;
  onClose: () => void;
}) {
  const medrep = getEmployeeById(medrepId);
  
  if (!medrep) return null;

  // Получаем план/факт по ВСЕМ 12 препаратам
  const productsAnalytics = useMemo(() => {
    const data2025 = getSalesData({ territory: medrep.territory, year: 2025 });
    const territoryEmployees = EMPLOYEES.filter(e => e.territory === medrep.territory && e.status === 'active');
    const territoryTotalPlan = territoryEmployees.reduce((sum, e) => sum + getEmployeeTotalPlan(e.id, 'units'), 0);
    const medrepPlanShare = getEmployeeTotalPlan(medrep.id, 'units') / territoryTotalPlan;

    return PRODUCTS.map(product => {
      const productData = data2025.filter(d => d.productId === product.id);
      const planUnits = medrep.productPlans[product.id] || 0;
      const factUnits = productData.reduce((sum, d) => sum + d.units, 0) * medrepPlanShare;
      const factRevenue = productData.reduce((sum, d) => sum + d.revenue, 0) * medrepPlanShare;
      const planRevenue = planUnits * product.price;
      const performance = planUnits > 0 ? (factUnits / planUnits) * 100 : 0;

      return { product, planUnits, factUnits, planRevenue, factRevenue, performance };
    })
      .sort((a, b) => b.factRevenue - a.factRevenue);
  }, [medrep]);

  const totalPlanUnits = productsAnalytics.reduce((sum, p) => sum + p.planUnits, 0);
  const totalFactUnits = productsAnalytics.reduce((sum, p) => sum + p.factUnits, 0);
  const totalPlanRevenue = productsAnalytics.reduce((sum, p) => sum + p.planRevenue, 0);
  const totalFactRevenue = productsAnalytics.reduce((sum, p) => sum + p.factRevenue, 0);
  const totalPerformance = totalPlanUnits > 0 ? (totalFactUnits / totalPlanUnits) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 rounded-t-3xl text-white bg-gradient-to-r from-green-600 to-green-700 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">План/факт по препаратам</h2>
              <p className="text-lg font-semibold text-white/90">
                {medrep.lastName} {medrep.firstName} {medrep.middleName}
              </p>
              <p className="text-sm text-white/80 mt-1">{medrep.territory} • {medrep.email}</p>
            </div>
            <button onClick={onClose} className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Общая статистика */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-bold text-slate-900">Упаковки</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-600">План: {formatNumber(totalPlanUnits)}</p>
                    <p className="text-sm font-bold text-slate-600">Факт: {formatNumber(totalFactUnits)}</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-bold text-slate-900">Выручка</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-600">План: {formatCurrency(totalPlanRevenue)}</p>
                    <p className="text-sm font-bold text-slate-600">Факт: {formatCurrency(totalFactRevenue)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative w-full h-4 bg-slate-200 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalPerformance >= 100
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : totalPerformance >= 80
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                    : 'bg-gradient-to-r from-red-500 to-red-600'
                }`}
                style={{ width: `${Math.min(totalPerformance, 100)}%` }}
              />
            </div>
            <p className={`text-2xl font-bold ${
              totalPerformance >= 100 ? 'text-green-600' : totalPerformance >= 80 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {totalPerformance.toFixed(1)}% общего выполнения
            </p>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Все препараты ({productsAnalytics.length})
          </h3>

          <div className="space-y-2">
            {productsAnalytics.map((item, index) => {
              const performanceColor = item.performance >= 100 ? 'green' : item.performance >= 80 ? 'yellow' : 'red';
              
              return (
                <div key={item.product.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:border-green-300 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-xs font-bold shadow">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{item.product.shortName}</h4>
                        <p className="text-xs font-semibold text-slate-500">{item.product.category}</p>
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${
                      performanceColor === 'green' ? 'text-green-600' : performanceColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {item.performance.toFixed(0)}%
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-white rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <Package className="w-3 h-3 text-green-600" />
                        <p className="text-xs font-bold text-slate-600">Упаковки</p>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{formatNumber(item.factUnits)}</p>
                          <p className="text-xs text-slate-400">факт</p>
                        </div>
                        <span className="text-xs text-slate-300">/</span>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-700">{formatNumber(item.planUnits)}</p>
                          <p className="text-xs text-slate-400">план</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <DollarSign className="w-3 h-3 text-green-600" />
                        <p className="text-xs font-bold text-slate-600">Выручка</p>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{formatCurrency(item.factRevenue)}</p>
                          <p className="text-xs text-slate-400">факт</p>
                        </div>
                        <span className="text-xs text-slate-300">/</span>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-700">{formatCurrency(item.planRevenue)}</p>
                          <p className="text-xs text-slate-400">план</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        performanceColor === 'green'
                          ? 'bg-gradient-to-r from-green-500 to-green-600'
                          : performanceColor === 'yellow'
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                          : 'bg-gradient-to-r from-red-500 to-red-600'
                      }`}
                      style={{ width: `${Math.min(item.performance, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={onClose} className="w-full mt-6 bg-gradient-to-r from-green-600 to-green-700 text-white">
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== МОДАЛЬНЫЕ ОКНА РЕДАКТИРОВАНИЯ ====================

// Модалка редактирования округа
function EditDistrictModal({ districtId, onClose }: { districtId: string; onClose: () => void }) {
  const district = getFederalDistrictData(districtId);
  const districtOrg = getDistrictOrganization(districtId);
  
  if (!district || !districtOrg) return null;
  
  // Текущий региональный менеджер
  const currentManager = getEmployeeById(districtOrg.regionalManagerId);
  
  // Состояние формы
  const [formData, setFormData] = useState({
    lastName: currentManager?.lastName || '',
    firstName: currentManager?.firstName || '',
    middleName: currentManager?.middleName || '',
    email: currentManager?.email || '',
    phone: currentManager?.phone || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Подсчет количества ТМ и МП
  const territorialManagersCount = new Set(districtOrg.territories.map((t) => t.territorialManagerId)).size;
  const medRepsCount = districtOrg.territories.reduce((sum: number, t: any) => sum + t.medrepIds.length, 0);

  // Сохранить изменения
  const handleSave = () => {
    if (!formData.lastName || !formData.firstName || !formData.email || !formData.phone) {
      alert('Заполните все обязательные поля (фамилия, имя, email, телефон)!');
      return;
    }

    // Простая валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Введите корректный email!');
      return;
    }

    setIsSaving(true);
    
    // Загружаем сотрудников и�� localStorage
    const savedEmployees = loadFromStorage<Employee[]>(STORAGE_KEYS.EMPLOYEES, []);
    const employees = savedEmployees && savedEmployees.length > 0 ? savedEmployees : EMPLOYEES;
    
    // Обновляем данные регионального менеджера
    const updatedEmployees = employees.map((emp) => {
      if (emp.id === districtOrg.regionalManagerId) {
        return {
          ...emp,
          lastName: formData.lastName,
          firstName: formData.firstName,
          middleName: formData.middleName,
          email: formData.email,
          phone: formData.phone,
        };
      }
      return emp;
    });
    
    // Сохраняем в localStorage
    saveToStorage(STORAGE_KEYS.EMPLOYEES, updatedEmployees);
    
    setIsSaving(false);
    alert('✅ Данные регионального менеджера успешно обновлены!');
    onClose();
    
    // Перезагружаем страницу для обновления данных
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div 
          className="p-8 rounded-t-3xl text-white"
          style={{ background: `linear-gradient(to right, ${district.color}, ${district.color}dd)` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Редактирование округа</h2>
              <p className="text-lg font-semibold text-white/90">{district.name} ({district.shortName})</p>
            </div>
            <button onClick={onClose} className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Информация об округе */}
          <div className="bg-slate-50 rounded-2xl p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-600" />
              Статистика округа
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Территорий</p>
                <p className="text-2xl font-bold text-slate-800">{district.territories.length}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">ТМ</p>
                <p className="text-2xl font-bold text-slate-800">{territorialManagersCount}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">МП</p>
                <p className="text-2xl font-bold text-slate-800">{medRepsCount}</p>
              </div>
            </div>
          </div>

          {/* Региональный менеджер */}
          {currentManager && (
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Региональный менеджер
              </h3>
              
              {/* Информация о менеджере */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    {formData.lastName.charAt(0) || currentManager.lastName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-lg">
                      {formData.lastName || currentManager.lastName} {formData.firstName || currentManager.firstName} {formData.middleName || currentManager.middleName || ''}
                    </p>
                    <p className="text-sm text-slate-600">{currentManager.territory}</p>
                    <p className="text-xs text-blue-600 mt-1">ID: {currentManager.id}</p>
                  </div>
                </div>
              </div>

              {/* Форма редактирования */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lastName" className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      Фамилия *
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Иванов"
                      className="text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="firstName" className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      Имя *
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Иван"
                      className="text-base"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="middleName" className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    Отчество
                  </Label>
                  <Input
                    id="middleName"
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    placeholder="Иванович"
                    className="text-base"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="manager@worldmedicine.ru"
                    className="text-base"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600" />
                    Телефон *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+7 (999) 123-45-67"
                    className="text-base"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Кнопки действий */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-6 text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>Сохранение...</>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Сохранить изменения
                </>
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="px-8 py-6 text-lg"
              disabled={isSaving}
            >
              Отмена
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Модалка редактирования территориального менеджера
function EditTerritorialManagerModal({ territorialManagerId, onClose }: { territorialManagerId: string; onClose: () => void }) {
  const manager = getEmployeeById(territorialManagerId);
  const [formData, setFormData] = useState({
    firstName: manager?.firstName || '',
    lastName: manager?.lastName || '',
    middleName: manager?.middleName || '',
    email: manager?.email || '',
    phone: manager?.phone || '',
    territory: manager?.territory || '',
  });

  if (!manager) return null;

  const handleSave = () => {
    alert('Сохранение данных территориального менеджера:\n' + JSON.stringify(formData, null, 2));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 rounded-t-3xl text-white bg-gradient-to-r from-purple-600 to-purple-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Редактирование территориального менеджера</h2>
              <p className="text-lg font-semibold text-white/90">{manager.lastName} {manager.firstName}</p>
            </div>
            <button onClick={onClose} className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="font-semibold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="middleName">Отчество</Label>
            <Input
              id="middleName"
              value={formData.middleName}
              onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
              className="font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="territory">Территория *</Label>
            <Input
              id="territory"
              value={formData.territory}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              className="font-semibold"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              Сохранить изменения
            </Button>
            <Button onClick={onClose} variant="outline" className="px-8">
              Отмена
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Модалка редактирования медпреда
function EditMedrepModal({ medrepId, onClose }: { medrepId: string; onClose: () => void }) {
  const medrep = getEmployeeById(medrepId);
  const [formData, setFormData] = useState({
    firstName: medrep?.firstName || '',
    lastName: medrep?.lastName || '',
    middleName: medrep?.middleName || '',
    email: medrep?.email || '',
    phone: medrep?.phone || '',
    territory: medrep?.territory || '',
  });

  if (!medrep) return null;

  const handleSave = () => {
    alert('Сохранение данных медицинского представителя:\n' + JSON.stringify(formData, null, 2));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 rounded-t-3xl text-white bg-gradient-to-r from-green-600 to-green-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Редактирование медицинского представителя</h2>
              <p className="text-lg font-semibold text-white/90">{medrep.lastName} {medrep.firstName}</p>
            </div>
            <button onClick={onClose} className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="font-semibold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="middleName">Отчество</Label>
            <Input
              id="middleName"
              value={formData.middleName}
              onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
              className="font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="territory">Территория *</Label>
            <Input
              id="territory"
              value={formData.territory}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              className="font-semibold"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              Сохранить изменения
            </Button>
            <Button onClick={onClose} variant="outline" className="px-8">
              Отмена
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
