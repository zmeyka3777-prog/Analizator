import { PRODUCTS, Product } from '@/types/sales.types';
import { getAllYears, getActiveYears } from './yearsManager';

// Реэкспортируем PRODUCTS для совместимости с существующим кодом
export { PRODUCTS } from '@/types/sales.types';

/**
 * Маппинг drug-имени из MDLP (может быть русское/английское/разнописание)
 * → productId из PRODUCTS каталога. Возвращает null если не найден.
 */
function matchDrugToProductId(drugName: string): string | null {
  if (!drugName) return null;
  const normalized = drugName.toLowerCase().trim();
  // Сначала строгое совпадение с shortName или частью name
  for (const p of PRODUCTS) {
    const short = (p.shortName || '').toLowerCase();
    const full = p.name.toLowerCase();
    if (short && normalized.includes(short)) return p.id;
    if (normalized.includes(full.split(' ')[0].toLowerCase())) return p.id;
  }
  // Русские названия препаратов (MDLP часто на русском)
  const ruMap: Record<string, string> = {
    'кокарнит': 'cocarnit',
    'роноцит': 'ronocit',
    'артоксан лиофилизат': 'artoxan-lyof',
    'артоксан гель': 'artoxan-gel',
    'артоксан таблетки': 'artoxan-tablets',
    'артоксан': 'artoxan-lyof',
    'клодифен': 'clodifen',
    'секнидокс': 'secnidox',
    'драстоп': 'drastop',
    'лименда': 'limenda',
    'орцепол': 'orcipol',
    'дорамитцин': 'doramycin',
    'апфекто': 'apfecto',
  };
  for (const [ru, id] of Object.entries(ruMap)) {
    if (normalized.includes(ru)) return id;
  }
  return null;
}

/**
 * Заполняет SALES_DATA из MDLP-записей (сырые продажи из БД).
 * Вызывается SharedDataProvider при загрузке данных.
 */
export function setSalesDataFromMdlp(records: Array<{
  drug?: string;
  region?: string;
  year?: number;
  month?: number | string;
  packages?: number;
  sales?: number;
}>): void {
  const MONTH_RU_TO_NUM: Record<string, number> = {
    'Янв': 1, 'Фев': 2, 'Мар': 3, 'Апр': 4, 'Май': 5, 'Июн': 6,
    'Июл': 7, 'Авг': 8, 'Сен': 9, 'Окт': 10, 'Ноя': 11, 'Дек': 12,
    'Январь': 1, 'Февраль': 2, 'Март': 3, 'Апрель': 4, 'Июнь': 6,
    'Июль': 7, 'Август': 8, 'Сентябрь': 9, 'Октябрь': 10, 'Ноябрь': 11, 'Декабрь': 12,
  };
  // Кэш цен по productId для расчёта revenue когда МДЛП-выгрузка не содержит сумм
  // (типичная ситуация: МДЛП отдаёт только quantity, amount=0).
  const PRICE_BY_ID: Record<string, number> = {};
  for (const p of PRODUCTS) PRICE_BY_ID[p.id] = p.price || 0;

  const mapped: SalesData[] = [];
  for (const r of records) {
    const productId = matchDrugToProductId(r.drug || '');
    if (!productId) continue;
    const territory = r.region || '';
    if (!territory) continue;
    const year = typeof r.year === 'number' ? r.year : 0;
    if (!year) continue;
    let month: number = 0;
    if (typeof r.month === 'number') month = r.month;
    else if (typeof r.month === 'string') month = MONTH_RU_TO_NUM[r.month] || 0;
    if (!month) continue;
    const units = Number(r.packages) || 0;
    // Revenue из МДЛП обычно = 0 (выгрузка содержит только упаковки).
    // Вычисляем revenue = units * цена из каталога PRODUCTS как fallback.
    const rawRevenue = Number(r.sales) || 0;
    const revenue = rawRevenue > 0 ? rawRevenue : units * (PRICE_BY_ID[productId] || 0);
    mapped.push({ productId, territory, year, month, units, revenue });
  }
  SALES_DATA.length = 0;
  SALES_DATA.push(...mapped);
  console.log(`[SalesData] Заполнено из MDLP: ${mapped.length} записей из ${records.length}`);
}

// Полный список 14 регионов Приволжского ФО
export const TERRITORIES = [
  'Республика Башкортостан',
  'Республика Марий Эл',
  'Республика Мордовия',
  'Республика Татарстан',
  'Удмуртская Республика',
  'Чувашская Республика',
  'Кировская область',
  'Нижегородская область',
  'Оренбургская область',
  'Пензенская область',
  'Пермский край',
  'Самарская область',
  'Саратовская область',
  'Ульяновская область',
];

export interface SalesData {
  productId: string;
  territory: string;
  year: number;
  month: number;
  units: number;
  revenue: number;
}

// Массив заполняется из MDLP-загрузок через setSalesDataFromMdlp().
// Mock-генератор удалён — данные только из реальных загрузок пользователя.
export const SALES_DATA: SalesData[] = [];

export function getSalesData(filters?: {
  productId?: string;
  territory?: string;
  year?: number;
  month?: number;
  /** Массив месяцев (1-12) — для глобального фильтра по месяцам. Пустой/undefined = все. */
  months?: number[];
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

  if (filters?.months && filters.months.length > 0) {
    const monthSet = new Set(filters.months);
    filtered = filtered.filter(d => monthSet.has(d.month));
  }

  return filtered;
}

export function aggregateByProduct(year: number, months?: number[]): Array<{
  product: Product;
  totalUnits: number;
  totalRevenue: number;
  avgMonthlyUnits: number;
  avgMonthlyRevenue: number;
}> {
  return PRODUCTS.map(product => {
    const productData = getSalesData({ productId: product.id, year, months });
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

export function getTotalStats(year: number, months?: number[]): {
  totalRevenue: number;
  totalUnits: number;
  avgCheck: number;
  territoryCount: number;
} {
  const yearData = getSalesData({ year, months });
  const totalRevenue = yearData.reduce((sum, d) => sum + d.revenue, 0);
  const totalUnits = yearData.reduce((sum, d) => sum + d.units, 0);

  return {
    totalRevenue,
    totalUnits,
    avgCheck: totalUnits > 0 ? totalRevenue / totalUnits : 0,
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
