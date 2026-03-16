export interface SavedReport {
  id: string;
  name: string;
  type: string;
  filters: {
    drug: string;
    year: string;
    period: string;
  };
  timestamp: number;
  data: any;
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar?: string;
}

export interface Drug {
  id: string;
  name: string;
  shortName: string;
}

export interface District {
  name: string;
  sales2024: number;
  sales2025: number;
  sales2026: number;
  plan: number;
  growth: number;
}

export interface City {
  sales2024: number;
  sales2025: number;
  sales2026: number;
  plan: number;
  growth: number;
  contragents: number;
  districts: District[];
}

export interface Region {
  sales2024: number;
  sales2025: number;
  sales2026: number;
  plan: number;
  growth: number;
  contragents: number;
  cities: Record<string, City>;
}

export interface FederalDistrict {
  name: string;
  sales2024: number;
  sales2025: number;
  sales2026: number;
  regions: Record<string, Region>;
}

export interface Contragent {
  name: string;
  sales: number;
  sales2024: number;
  sales2025: number;
  group: string | null;
  city: string;
  region: string;
  trend: 'up' | 'down';
  change: number;
}

export interface ProblemZone {
  id: number;
  type: 'critical' | 'warning' | 'info';
  region?: string;
  city?: string;
  district?: string;
  contragent?: string;
  metric: string;
  value: string;
  target: string;
  recommendation: string;
}

export interface MonthlyData {
  month: string;
  sales: number;
  name: string;
}

export interface SeasonalData {
  month: string;
  index: number;
}

export interface ForecastComment {
  type: 'success' | 'info' | 'warning';
  text: string;
}

export interface ABCCategory {
  category: 'A' | 'B' | 'C';
  items: string[];
  share: number;
  color: string;
}

export interface DisposalTypeSale {
  name: string;
  sales: number;
  count: number;
}

export interface FederalDistrictSale {
  name: string;
  sales: number;
}

export interface ReceiverTypeSale {
  name: string;
  sales: number;
  count: number;
}

export interface DrugMonthlySales {
  drug: string;
  month: string;
  sales: number;
  year?: number;
}

export interface DrugRegionSales {
  drug: string;
  region: string;
  sales: number;
}

export interface DrugContragentSales {
  drug: string;
  contragent: string;
  sales: number;
}

export interface DrugAnalytics {
  name: string;
  totalSales: number;
  monthlySales: Array<{ month: string; name: string; sales: number }>;
  regionSales: Array<{ name: string; sales: number }>;
  contragentSales: Array<{ name: string; sales: number }>;
  yearSales: Record<string, number>;
}

export interface TerritoryNode {
  name: string;
  sales: number;
  salesByYear: Record<string, number>;
  children: Record<string, TerritoryNode>;
  contragentCount: number;
  drugSales?: Array<{ name: string; sales: number }>;
  region?: string;
  city?: string;
}

export interface TerritoryHierarchy {
  federalDistricts: Record<string, TerritoryNode>;
  regions: Record<string, TerritoryNode>;
  cities: Record<string, TerritoryNode>;
  districts: Record<string, TerritoryNode>;
}

export interface ContragentAnalytics {
  name: string;
  totalSales: number;
  region?: string;
  city?: string;
  receiverType?: string;
  drugSales: Array<{ name: string; sales: number }>;
  monthlySales: Array<{ month: string; sales: number }>;
  yearSales: Record<string, number>;
}

export interface AggregatedData {
  monthlySales: MonthlyData[];
  combinedData: any[];
  contragentSales: Array<{ name: string; sales: number; city?: string; group?: string; region?: string; receiverType?: string }>;
  regionSales: Array<{ name: string; sales: number }>;
  drugSales: Array<{ name: string; sales: number }>;
  disposalTypeSales?: DisposalTypeSale[];
  federalDistrictSales?: FederalDistrictSale[];
  receiverTypeSales?: ReceiverTypeSale[];
  drugs: string[];
  drugAnalytics: Record<string, DrugAnalytics>;
  territoryHierarchy: TerritoryHierarchy;
  contragentAnalytics: Record<string, ContragentAnalytics>;
  years: string[];
}

// ==========================================
// WM Russia Role-Based Analytics Types
// ==========================================

// 8 Federal Districts of Russia
export type WMFederalDistrict = 'ЦФО' | 'СЗФО' | 'ЮФО' | 'СКФО' | 'ПФО' | 'УФО' | 'СФО' | 'ДФО';

// User roles for WM Russia system
export type WMUserRole = 'medrep' | 'territory_manager' | 'manager' | 'director' | 'admin';

// 12 WM Russia Products with their colors
export const WM_PRODUCTS = [
  { id: 'kokarnit', name: 'Кокарнит', key: 'kokarnit', color: '#10b981' },
  { id: 'artoxan', name: 'Артоксан (лиофилизат)', key: 'artoxan', color: '#3b82f6' },
  { id: 'artoxanTabl', name: 'Артоксан таблетки', key: 'artoxanTabl', color: '#06b6d4' },
  { id: 'artoxanGel', name: 'Артоксан гель', key: 'artoxanGel', color: '#14b8a6' },
  { id: 'seknidox', name: 'Секнидокс', key: 'seknidox', color: '#8b5cf6' },
  { id: 'klodifen', name: 'Клодифен Нейро', key: 'klodifen', color: '#a855f7' },
  { id: 'drastop', name: 'Драстоп Адванс', key: 'drastop', color: '#f59e0b' },
  { id: 'ortsepol', name: 'Орцепол ВМ', key: 'ortsepol', color: '#f97316' },
  { id: 'limenda', name: 'Лименда', key: 'limenda', color: '#ec4899' },
  { id: 'ronocit', name: 'Роноцит', key: 'ronocit', color: '#ef4444' },
  { id: 'doramitcin', name: 'Дорамитцин', key: 'doramitcin', color: '#eab308' },
  { id: 'alfecto', name: 'Апфекто', key: 'alfecto', color: '#64748b' },
] as const;

// Federal districts info
export const WM_FEDERAL_DISTRICTS = [
  { code: 'ЦФО', name: 'Центральный', fullName: 'Центральный федеральный округ' },
  { code: 'СЗФО', name: 'Северо-Западный', fullName: 'Северо-Западный федеральный округ' },
  { code: 'ЮФО', name: 'Южный', fullName: 'Южный федеральный округ' },
  { code: 'СКФО', name: 'Северо-Кавказский', fullName: 'Северо-Кавказский федеральный округ' },
  { code: 'ПФО', name: 'Приволжский', fullName: 'Приволжский федеральный округ' },
  { code: 'УФО', name: 'Уральский', fullName: 'Уральский федеральный округ' },
  { code: 'СФО', name: 'Сибирский', fullName: 'Сибирский федеральный округ' },
  { code: 'ДФО', name: 'Дальневосточный', fullName: 'Дальневосточный федеральный округ' },
] as const;

// Medical Representative Sales Data
export interface MedRepData {
  id: string;
  name: string;
  territory: string;
  district: WMFederalDistrict;
  
  // Plan/Fact for each of 12 products (packages)
  kokarnitPlan: number;
  kokarnitFact: number;
  artoxanPlan: number;
  artoxanFact: number;
  artoxanTablPlan: number;
  artoxanTablFact: number;
  artoxanGelPlan: number;
  artoxanGelFact: number;
  seknidoxPlan: number;
  seknidoxFact: number;
  klodifenPlan: number;
  klodifenFact: number;
  drastopPlan: number;
  drastopFact: number;
  ortsepolPlan: number;
  ortsepolFact: number;
  limendaPlan: number;
  limendaFact: number;
  ronocitPlan: number;
  ronocitFact: number;
  doramitcinPlan: number;
  doramitcinFact: number;
  alfectoPlan: number;
  alfectoFact: number;
  
  // Totals
  totalPackagesPlan: number;
  totalPackagesFact: number;
  totalMoneyPlan: number;
  totalMoneyFact: number;
  
  // Period info
  month?: number;
  year?: number;
}

// WM User with role and territory bindings
export interface WMUser {
  id: string;
  email: string;
  name: string;
  role: WMUserRole;
  district?: WMFederalDistrict;
  territory?: string;
  medRepId?: string;
  avatar?: string;
}

// District aggregate data
export interface DistrictSummary {
  code: WMFederalDistrict;
  name: string;
  totalPackagesPlan: number;
  totalPackagesFact: number;
  totalMoneyPlan: number;
  totalMoneyFact: number;
  medRepCount: number;
  territoryCount: number;
  completionPercent: number;
}

// Territory aggregate data
export interface TerritorySummary {
  name: string;
  district: WMFederalDistrict;
  totalPackagesPlan: number;
  totalPackagesFact: number;
  totalMoneyPlan: number;
  totalMoneyFact: number;
  medRepCount: number;
  completionPercent: number;
}

// Activity log entry
export interface ActivityLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: 'upload' | 'edit_plan' | 'add_medrep' | 'delete_medrep' | 'edit_medrep';
  description: string;
  timestamp: number;
  details?: any;
}

// Product sales summary for charts
export interface ProductSalesSummary {
  productId: string;
  productName: string;
  color: string;
  plan: number;
  fact: number;
  completionPercent: number;
}
