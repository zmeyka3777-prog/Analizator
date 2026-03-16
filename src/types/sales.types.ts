// ==================== ТИПЫ ДАННЫХ ПРОДАЖ ====================

/**
 * Препарат World Medicine
 */
export interface Product {
  id: string;
  name: string;
  shortName?: string;
  price: number; // Цена за упаковку в рублях
  category?: string;
  isActive: boolean;
  quota2025: number; // Квота на 2025 год в упаковках
  budget2025?: number; // Бюджет на 2025 год в рублях
}

/**
 * Список препаратов World Medicine (из скринов)
 * Квоты 2025 рассчитаны на основе бюджета ПФО 580 млн руб
 */
export const PRODUCTS: Product[] = [
  { id: 'apfecto', name: 'APFECTO EYE DROPS, SUSPENSION 0.1% 5ML №1', shortName: 'APFECTO', price: 400, isActive: true, quota2025: 50000 },
  { id: 'artoxan-gel', name: 'ARTOXAN GEL 1% 45G TUBE №1', shortName: 'ARTOXAN GEL', price: 400, isActive: true, quota2025: 60000 },
  { id: 'artoxan-lyof', name: 'ARTOXAN LYOF.POWD.FOR INJ. 20MG 3 VIAL+ 3 SOLVENT', shortName: 'ARTOXAN LYOF 20MG', price: 650, isActive: true, quota2025: 70000 },
  { id: 'artoxan-tablets', name: 'ARTOXAN TABLETS 20MG №10', shortName: 'ARTOXAN 20MG', price: 320, isActive: true, quota2025: 80000 },
  { id: 'clodifen', name: 'CLODIFEN NEURO CAPSULES №30', shortName: 'CLODIFEN NEURO', price: 540, isActive: true, quota2025: 65000 },
  { id: 'cocarnit', name: 'COCARNIT LYOF.POWD.FOR INJ. 3 VIAL + 3 SOLVENT', shortName: 'COCARNIT', price: 740, isActive: true, quota2025: 75000 },
  { id: 'doramycin', name: 'DORAMYCIN TABLETS 3,0 MIU №10', shortName: 'DORAMYCIN', price: 1100, isActive: true, quota2025: 40000 },
  { id: 'drastop', name: 'DRASTOP ADVANCE TABLETS №30', shortName: 'DRASTOP ADVANCE', price: 1176, isActive: true, quota2025: 35000 },
  { id: 'limenda', name: 'LIMENDA VAG. SUPPOSITORY 750MG/200MG №7', shortName: 'LIMENDA', price: 750, isActive: true, quota2025: 55000 },
  { id: 'orcipol', name: 'ORCIPOL TABLETS 500MG/500MG №10', shortName: 'ORCIPOL', price: 700, isActive: true, quota2025: 60000 },
  { id: 'ronocit', name: 'RONOCIT ORAL SOL. 100MG/ML 10ML №10', shortName: 'RONOCIT', price: 1100, isActive: true, quota2025: 45000 },
  { id: 'secnidox', name: 'SECNIDOX TABLETS 1000MG №2', shortName: 'SECNIDOX', price: 750, isActive: true, quota2025: 50000 },
];

/**
 * Данные продаж (упаковки + деньги)
 */
export interface SalesData {
  packages: number; // Количество упаковок
  amount: number;   // Сумма в рублях
}

/**
 * Продажи по месяцам
 */
export interface MonthlySales {
  month: string; // 'Январь', 'Февраль', и т.д.
  sales: SalesData;
}

/**
 * Продажи по препаратам
 */
export interface ProductSales {
  productId: string;
  sales: SalesData;
}

/**
 * Исторические данные (2024, 2025)
 */
export interface HistoricalData {
  year: '2024' | '2025';
  totalSales: SalesData;
  monthlySales: MonthlySales[];
  productSales: ProductSales[];
  isLocked: boolean; // Зафиксированы ли данные
}

/**
 * План на год
 */
export interface YearPlan {
  year: string; // '2026'
  totalPlan: SalesData;
  productPlans: {
    productId: string;
    plan: SalesData;
    monthlyBreakdown?: MonthlySales[];
  }[];
  territoryPlans?: {
    territory: string;
    plan: SalesData;
  }[];
}

/**
 * Текущие продажи (динамические, загружаются из МДЛП)
 */
export interface CurrentSales {
  year: string; // '2026'
  lastUpdate: string; // Дата последней загрузки
  totalSales: SalesData;
  monthlySales: MonthlySales[];
  productSales: ProductSales[];
}

/**
 * Выполнение плана
 */
export interface PlanExecution {
  plan: SalesData;
  fact: SalesData;
  percentage: number; // % выполнения
  status: 'critical' | 'warning' | 'success'; // 🔴 <70%, 🟡 70-90%, 🟢 >90%
}

/**
 * Получить статус выполнения плана
 */
export function getPlanStatus(percentage: number): 'critical' | 'warning' | 'success' {
  if (percentage < 70) return 'critical';
  if (percentage < 90) return 'warning';
  return 'success';
}

/**
 * Получить цвет статуса
 */
export function getStatusColor(status: 'critical' | 'warning' | 'success'): string {
  const colors = {
    critical: '#ef4444',   // 🔴 Красный
    warning: '#f59e0b',    // 🟡 Жёлтый
    success: '#10b981',    // 🟢 Зелёный
  };
  return colors[status];
}

/**
 * Рассчитать выполнение плана
 */
export function calculateExecution(plan: SalesData, fact: SalesData): PlanExecution {
  const percentage = plan.packages > 0 ? (fact.packages / plan.packages) * 100 : 0;
  const status = getPlanStatus(percentage);

  return {
    plan,
    fact,
    percentage: Math.round(percentage * 10) / 10,
    status,
  };
}
