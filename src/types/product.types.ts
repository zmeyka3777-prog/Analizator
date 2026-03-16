// ==================== ТИПЫ ДЛЯ ПРЕПАРАТОВ ====================

/**
 * Интерфейс препарата
 */
export interface Product {
  id: string;
  name: string;
  shortName?: string; // Краткое название
  fullName?: string; // Полное название
  price: number;
  quantity?: string; // Единица измерения (по умолчанию "упаковка")
  category?: string;
  quota2025?: number; // Квота по упаковкам (прошлый год)
  budget2025?: number; // Бюджет в рублях (прошлый год)
  quotaCurrent?: number; // Квота текущего года (автоматически = quota + currentYear)
  budgetCurrent?: number; // Бюджет текущего года
}

/**
 * Статистика по препарату
 */
export interface ProductStats {
  product: Product;
  sales2024: number;
  sales2025: number;
  plan2026: number;
  actual2026: number;
  growth2025: number; // % роста 2025/2024
  planCompletion: number; // % выполнения плана 2026
  territory: string;
}

/**
 * Детальная аналитика препарата
 */
export interface ProductAnalytics {
  product: Product;
  totalRevenue2024: number;
  totalRevenue2025: number;
  totalUnits2024: number;
  totalUnits2025: number;
  growth: number; // % роста
  topTerritory: string;
  topTerritoryRevenue: number;
  monthlyDynamics: Array<{
    month: string;
    revenue2024: number;
    revenue2025: number;
    units2024: number;
    units2025: number;
  }>;
  territoryBreakdown: Array<{
    territory: string;
    revenue: number;
    units: number;
    share: number; // % от общего
  }>;
}
