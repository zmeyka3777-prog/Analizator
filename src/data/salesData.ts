import { PRODUCTS, Product } from '@/types/sales.types';
import { getAllYears, getActiveYears } from './yearsManager';

// Реэкспортируем PRODUCTS для совместимости с существующим кодом
export { PRODUCTS } from '@/types/sales.types';

// Список территорий ПФО
export const TERRITORIES = [
  'Республика Татарстан',
  'Самарская область',
  'Республика Башкортостан',
  'Нижегородская область',
  'Пензенская область',
  'Республика Мордовия',
];

export interface SalesData {
  productId: string;
  territory: string;
  year: number;
  month: number;
  units: number;
  revenue: number;
}

function generateSalesData(): SalesData[] {
  const data: SalesData[] = [];

  const territoryCoef: Record<string, number> = {
    'Республика Татарстан': 0.28,
    'Самарская область': 0.22,
    'Республика Башкортостан': 0.19,
    'Нижегородская область': 0.16,
    'Пензенская область': 0.09,
    'Республика Мордовия': 0.06,
  };

  const seasonality = [0.95, 0.88, 1.02, 1.05, 0.98, 0.92, 0.85, 0.90, 1.08, 1.15, 1.18, 1.04];

  const activeYears = getActiveYears();
  const baseYear = 2025;

  PRODUCTS.forEach(product => {
    const monthlyQuota2025 = product.quota2025 / 12;

    TERRITORIES.forEach(territory => {
      activeYears.forEach(yearData => {
        const year = yearData.year;

        for (let month = 1; month <= 12; month++) {
          let yearCoef = 1.0;
          if (year < baseYear) {
            const yearsBack = baseYear - year;
            yearCoef = Math.pow(0.85, yearsBack);
          } else if (year > baseYear) {
            const yearsForward = year - baseYear;
            yearCoef = Math.pow(1.18, yearsForward);
          }

          const randomFactor = 0.90 + Math.random() * 0.20;

          const units = Math.round(
            monthlyQuota2025 *
            territoryCoef[territory] *
            seasonality[month - 1] *
            yearCoef *
            randomFactor
          );

          const revenue = units * product.price;

          data.push({
            productId: product.id,
            territory,
            year,
            month,
            units,
            revenue,
          });
        }
      });
    });
  });

  return data;
}

// Моковые данные отключены — данные загружаются через файлы
export const SALES_DATA: SalesData[] = [];

export function getSalesData(filters?: {
  productId?: string;
  territory?: string;
  year?: number;
  month?: number;
}): SalesData[] {
  let filtered = SALES_DATA;

  if (filters?.productId) {
    filtered = filtered.filter(d => d.productId === filters.productId);
  }

  if (filters?.territory) {
    filtered = filtered.filter(d => d.territory === filters.territory);
  }

  if (filters?.year) {
    filtered = filtered.filter(d => d.year === filters.year);
  }

  if (filters?.month) {
    filtered = filtered.filter(d => d.month === filters.month);
  }

  return filtered;
}

export function aggregateByProduct(year: number): Array<{
  product: Product;
  totalUnits: number;
  totalRevenue: number;
  avgMonthlyUnits: number;
  avgMonthlyRevenue: number;
}> {
  return PRODUCTS.map(product => {
    const productData = getSalesData({ productId: product.id, year });
    const totalUnits = productData.reduce((sum, d) => sum + d.units, 0);
    const totalRevenue = productData.reduce((sum, d) => sum + d.revenue, 0);

    return {
      product,
      totalUnits,
      totalRevenue,
      avgMonthlyUnits: Math.round(totalUnits / 12),
      avgMonthlyRevenue: Math.round(totalRevenue / 12),
    };
  });
}

export function aggregateByTerritory(year: number): Array<{
  territory: string;
  totalUnits: number;
  totalRevenue: number;
  productCount: number;
}> {
  return TERRITORIES.map(territory => {
    const territoryData = getSalesData({ territory, year });
    const totalUnits = territoryData.reduce((sum, d) => sum + d.units, 0);
    const totalRevenue = territoryData.reduce((sum, d) => sum + d.revenue, 0);

    return {
      territory,
      totalUnits,
      totalRevenue,
      productCount: PRODUCTS.length,
    };
  });
}

export function getMonthlyDynamics(productId?: string, territory?: string): Array<{
  month: string;
  year2024: number;
  year2025: number;
  year2026: number;
}> {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  return months.map((month, index) => {
    const month2024 = getSalesData({ productId, territory, year: 2024, month: index + 1 });
    const month2025 = getSalesData({ productId, territory, year: 2025, month: index + 1 });
    const month2026 = getSalesData({ productId, territory, year: 2026, month: index + 1 });

    return {
      month,
      year2024: month2024.reduce((sum, d) => sum + d.revenue, 0) / 1000,
      year2025: month2025.reduce((sum, d) => sum + d.revenue, 0) / 1000,
      year2026: month2026.reduce((sum, d) => sum + d.revenue, 0) / 1000,
    };
  });
}

export function getMonthlyDynamicsUnits(productId?: string, territory?: string): Array<{
  month: string;
  year2024: number;
  year2025: number;
  year2026: number;
  plan2025: number;
}> {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  const calculateMonthlyPlan = (monthIndex: number): number => {
    if (productId) {
      const product = PRODUCTS.find(p => p.id === productId);
      if (product) {
        const monthlyQuota = product.quota2025 / 12;
        const seasonality = [0.95, 0.88, 1.02, 1.05, 0.98, 0.92, 0.85, 0.90, 1.08, 1.15, 1.18, 1.04];
        return monthlyQuota * seasonality[monthIndex];
      }
    }
    const totalMonthlyQuota = PRODUCTS.reduce((sum, p) => sum + p.quota2025, 0) / 12;
    const seasonality = [0.95, 0.88, 1.02, 1.05, 0.98, 0.92, 0.85, 0.90, 1.08, 1.15, 1.18, 1.04];
    return totalMonthlyQuota * seasonality[monthIndex];
  };

  return months.map((month, index) => {
    const month2024 = getSalesData({ productId, territory, year: 2024, month: index + 1 });
    const month2025 = getSalesData({ productId, territory, year: 2025, month: index + 1 });
    const month2026 = getSalesData({ productId, territory, year: 2026, month: index + 1 });

    return {
      month,
      year2024: month2024.reduce((sum, d) => sum + d.units, 0),
      year2025: month2025.reduce((sum, d) => sum + d.units, 0),
      year2026: month2026.reduce((sum, d) => sum + d.units, 0),
      plan2025: calculateMonthlyPlan(index),
    };
  });
}

export function getTotalStats(year: number): {
  totalRevenue: number;
  totalUnits: number;
  avgCheck: number;
  territoryCount: number;
} {
  const yearData = getSalesData({ year });
  const totalRevenue = yearData.reduce((sum, d) => sum + d.revenue, 0);
  const totalUnits = yearData.reduce((sum, d) => sum + d.units, 0);

  return {
    totalRevenue,
    totalUnits,
    avgCheck: totalRevenue / totalUnits,
    territoryCount: TERRITORIES.length,
  };
}

export const BUDGET_PFO_2025 = {
  total: 580000000,
  totalQuota: 580000,
  products: PRODUCTS,
};

export function getMonthlyDynamicsDynamic(productId?: string, territory?: string): Array<{
  month: string;
  [key: string]: number | string;
}> {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  const activeYears = getActiveYears().sort((a, b) => a.year - b.year);

  return months.map((month, index) => {
    const result: any = { month };
    activeYears.forEach(yearData => {
      const monthData = getSalesData({ productId, territory, year: yearData.year, month: index + 1 });
      result[`year${yearData.year}`] = monthData.reduce((sum, d) => sum + d.revenue, 0) / 1000;
    });
    return result;
  });
}

export function getMonthlyDynamicsUnitsDynamic(productId?: string, territory?: string): Array<{
  month: string;
  [key: string]: number | string;
}> {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  const activeYears = getActiveYears().sort((a, b) => a.year - b.year);

  return months.map((month, index) => {
    const result: any = { month };
    activeYears.forEach(yearData => {
      const monthData = getSalesData({ productId, territory, year: yearData.year, month: index + 1 });
      result[`year${yearData.year}`] = monthData.reduce((sum, d) => sum + d.units, 0);
    });
    return result;
  });
}

export function getActiveYearsForCharts(): number[] {
  return getActiveYears()
    .sort((a, b) => a.year - b.year)
    .map(y => y.year);
}
