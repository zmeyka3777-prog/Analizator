import { Territory } from './federalDistricts';
import { PRODUCTS } from './salesData';

export interface TerritoryProductPlan {
  productId: string;
  productName: string;
  price: number;
  planUnits: number;
  planRevenue: number;
}

export interface TerritoryPlan {
  territoryId: string;
  territoryName: string;
  districtId: string;
  districtName: string;
  regionalManagerId: string;
  regionalManagerName: string;
  year: number;
  budget: number;
  products: TerritoryProductPlan[];
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'submitted' | 'approved';
}

let TERRITORY_PLANS: TerritoryPlan[] = [];

const initializeTestPlans = () => {
  if (TERRITORY_PLANS.length > 0) return;

  const testPlans: TerritoryPlan[] = [
    {
      territoryId: 'pfo-tatarstan',
      territoryName: 'Республика Татарстан',
      districtId: 'pfo',
      districtName: 'Приволжский ФО',
      regionalManagerId: 'rm-pfo-001',
      regionalManagerName: 'Иванов Иван Иванович',
      year: 2026,
      budget: 95000000,
      products: PRODUCTS.map(product => ({
        productId: product.id,
        productName: product.name,
        price: product.price,
        planUnits: Math.round(product.quota2025 * 0.15 * 1.18),
        planRevenue: Math.round(product.quota2025 * 0.15 * 1.18 * product.price),
      })),
      createdAt: new Date('2026-01-15').toISOString(),
      updatedAt: new Date('2026-01-28').toISOString(),
      status: 'submitted',
    },
    {
      territoryId: 'pfo-bashkortostan',
      territoryName: 'Республика Башкортостан',
      districtId: 'pfo',
      districtName: 'Приволжский ФО',
      regionalManagerId: 'rm-pfo-001',
      regionalManagerName: 'Иванов Иван Иванович',
      year: 2026,
      budget: 78000000,
      products: PRODUCTS.map(product => ({
        productId: product.id,
        productName: product.name,
        price: product.price,
        planUnits: Math.round(product.quota2025 * 0.12 * 1.18),
        planRevenue: Math.round(product.quota2025 * 0.12 * 1.18 * product.price),
      })),
      createdAt: new Date('2026-01-15').toISOString(),
      updatedAt: new Date('2026-01-27').toISOString(),
      status: 'submitted',
    },
    {
      territoryId: 'pfo-nizhny',
      territoryName: 'Нижегородская область',
      districtId: 'pfo',
      districtName: 'Приволжский ФО',
      regionalManagerId: 'rm-pfo-001',
      regionalManagerName: 'Иванов Иван Иванович',
      year: 2026,
      budget: 68000000,
      products: PRODUCTS.map(product => ({
        productId: product.id,
        productName: product.name,
        price: product.price,
        planUnits: Math.round(product.quota2025 * 0.10 * 1.18),
        planRevenue: Math.round(product.quota2025 * 0.10 * 1.18 * product.price),
      })),
      createdAt: new Date('2026-01-15').toISOString(),
      updatedAt: new Date('2026-01-26').toISOString(),
      status: 'approved',
    },
    {
      territoryId: 'pfo-samara',
      territoryName: 'Самарская область',
      districtId: 'pfo',
      districtName: 'Приволжский ФО',
      regionalManagerId: 'rm-pfo-001',
      regionalManagerName: 'Иванов Иван Иванович',
      year: 2026,
      budget: 65000000,
      products: PRODUCTS.map(product => ({
        productId: product.id,
        productName: product.name,
        price: product.price,
        planUnits: Math.round(product.quota2025 * 0.09 * 1.18),
        planRevenue: Math.round(product.quota2025 * 0.09 * 1.18 * product.price),
      })),
      createdAt: new Date('2026-01-15').toISOString(),
      updatedAt: new Date('2026-01-25').toISOString(),
      status: 'draft',
    },
  ];

  TERRITORY_PLANS = testPlans;
};

initializeTestPlans();

export const getAllPlans = (): TerritoryPlan[] => [...TERRITORY_PLANS];

export const getPlansByDistrict = (districtId: string, year: number = 2026): TerritoryPlan[] => {
  return TERRITORY_PLANS.filter(plan => plan.districtId === districtId && plan.year === year);
};

export const getPlanByTerritory = (territoryId: string, year: number = 2026): TerritoryPlan | null => {
  return TERRITORY_PLANS.find(plan => plan.territoryId === territoryId && plan.year === year) || null;
};

export const getPlansByRegionalManager = (regionalManagerId: string, year: number = 2026): TerritoryPlan[] => {
  return TERRITORY_PLANS.filter(plan => plan.regionalManagerId === regionalManagerId && plan.year === year);
};

export const saveTerritoryPlan = (plan: Omit<TerritoryPlan, 'createdAt' | 'updatedAt'>): TerritoryPlan => {
  const existingIndex = TERRITORY_PLANS.findIndex(p => p.territoryId === plan.territoryId && p.year === plan.year);
  if (existingIndex >= 0) {
    TERRITORY_PLANS[existingIndex] = { ...plan, createdAt: TERRITORY_PLANS[existingIndex].createdAt, updatedAt: new Date().toISOString() };
    return TERRITORY_PLANS[existingIndex];
  } else {
    const newPlan: TerritoryPlan = { ...plan, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    TERRITORY_PLANS.push(newPlan);
    return newPlan;
  }
};

export const updateProductPrice = (territoryId: string, productId: string, newPrice: number, year: number = 2026): TerritoryPlan | null => {
  const planIndex = TERRITORY_PLANS.findIndex(p => p.territoryId === territoryId && p.year === year);
  if (planIndex < 0) return null;
  const plan = TERRITORY_PLANS[planIndex];
  const productIndex = plan.products.findIndex(p => p.productId === productId);
  if (productIndex < 0) return null;
  plan.products[productIndex].price = newPrice;
  plan.products[productIndex].planRevenue = plan.products[productIndex].planUnits * newPrice;
  plan.updatedAt = new Date().toISOString();
  return plan;
};

export const updateProductPlan = (territoryId: string, productId: string, planUnits: number, year: number = 2026): TerritoryPlan | null => {
  const planIndex = TERRITORY_PLANS.findIndex(p => p.territoryId === territoryId && p.year === year);
  if (planIndex < 0) return null;
  const plan = TERRITORY_PLANS[planIndex];
  const productIndex = plan.products.findIndex(p => p.productId === productId);
  if (productIndex < 0) return null;
  plan.products[productIndex].planUnits = planUnits;
  plan.products[productIndex].planRevenue = planUnits * plan.products[productIndex].price;
  plan.updatedAt = new Date().toISOString();
  return plan;
};

export const updatePlanStatus = (territoryId: string, status: TerritoryPlan['status'], year: number = 2026): TerritoryPlan | null => {
  const planIndex = TERRITORY_PLANS.findIndex(p => p.territoryId === territoryId && p.year === year);
  if (planIndex < 0) return null;
  TERRITORY_PLANS[planIndex].status = status;
  TERRITORY_PLANS[planIndex].updatedAt = new Date().toISOString();
  return TERRITORY_PLANS[planIndex];
};

export const deleteTerritoryPlan = (territoryId: string, year: number = 2026): boolean => {
  const initialLength = TERRITORY_PLANS.length;
  TERRITORY_PLANS = TERRITORY_PLANS.filter(p => !(p.territoryId === territoryId && p.year === year));
  return TERRITORY_PLANS.length < initialLength;
};

export const getDistrictPlanStats = (districtId: string, year: number = 2026) => {
  const plans = getPlansByDistrict(districtId, year);
  const totalBudget = plans.reduce((sum, plan) => sum + plan.budget, 0);
  const totalPlanRevenue = plans.reduce((sum, plan) => sum + plan.products.reduce((s, p) => s + p.planRevenue, 0), 0);
  const totalPlanUnits = plans.reduce((sum, plan) => sum + plan.products.reduce((s, p) => s + p.planUnits, 0), 0);
  const statusCounts = {
    draft: plans.filter(p => p.status === 'draft').length,
    submitted: plans.filter(p => p.status === 'submitted').length,
    approved: plans.filter(p => p.status === 'approved').length,
  };
  return {
    totalTerritories: plans.length,
    totalBudget,
    totalPlanRevenue,
    totalPlanUnits,
    statusCounts,
    completionRate: plans.length > 0 ? ((statusCounts.submitted + statusCounts.approved) / plans.length) * 100 : 0,
  };
};
