import { MedRepData, WMUser, WMFederalDistrict } from '../types';

// PFO Sales Data - October 2025 (Real data from requirements)

// All sales data combined
// Моковые данные отключены — данные загружаются через файлы MDLP
export const allSalesData: MedRepData[] = [];

// Mock users with different roles
export const wmMockUsers: WMUser[] = [
  {
    id: 'director1',
    email: 'director@orney.ru',
    name: 'Директор Компании',
    role: 'director',
    avatar: undefined
  },
  {
    id: 'admin1',
    email: 'admin@orney.ru',
    name: 'Системный Администратор',
    role: 'admin',
    avatar: undefined
  },
  {
    id: 'manager1',
    email: 'manager.pfo@orney.ru',
    name: 'Иванова Светлана',
    role: 'manager',
    district: 'ПФО'
  },
  {
    id: 'manager2',
    email: 'manager.cfo@orney.ru',
    name: 'Смирнов Алексей',
    role: 'manager',
    district: 'ЦФО'
  },
  {
    id: 'tm1',
    email: 'tm.samara@orney.ru',
    name: 'Николаев Павел',
    role: 'territory_manager',
    district: 'ПФО',
    territory: 'Самара'
  },
  {
    id: 'tm2',
    email: 'tm.kazan@orney.ru',
    name: 'Егорова Анастасия',
    role: 'territory_manager',
    district: 'ПФО',
    territory: 'Казань'
  },
  {
    id: 'medrep1',
    email: 'shestakova@orney.ru',
    name: 'Шестакова Марина',
    role: 'medrep',
    district: 'ПФО',
    territory: 'Самара',
    medRepId: '1'
  },
  {
    id: 'medrep2',
    email: 'zhmyleva@orney.ru',
    name: 'Жмылева Валерия',
    role: 'medrep',
    district: 'ПФО',
    territory: 'Самара',
    medRepId: '2'
  },
  {
    id: 'medrep3',
    email: 'petrova@orney.ru',
    name: 'Петрова Анна',
    role: 'medrep',
    district: 'ПФО',
    territory: 'Казань',
    medRepId: '3'
  }
];

// Helper function to get sales data by district
export function getSalesDataByDistrict(district: WMFederalDistrict): MedRepData[] {
  return allSalesData.filter(rep => rep.district === district);
}

// Helper function to get sales data by territory
export function getSalesDataByTerritory(territory: string): MedRepData[] {
  return allSalesData.filter(rep => rep.territory === territory);
}

// Helper function to get single medrep data
export function getMedRepDataById(id: string): MedRepData | undefined {
  return allSalesData.find(rep => rep.id === id);
}

// Helper to calculate completion percentage
export function calcCompletionPercent(fact: number, plan: number): number {
  if (plan === 0) return 0;
  return Math.round((fact / plan) * 100 * 100) / 100;
}

// Helper to get status color based on completion percentage
export function getStatusColor(percent: number): 'success' | 'warning' | 'danger' {
  if (percent >= 95) return 'success';
  if (percent >= 85) return 'warning';
  return 'danger';
}

// Helper to aggregate territory data
/** Слить массив MedRepData в одну суммарную запись (для режима «Весь файл») */
export function mergeMedRepData(reps: MedRepData[]): MedRepData {
  if (reps.length === 0) {
    return {
      id: 'merged', name: 'Весь файл', territory: 'Все территории', district: 'ПФО',
      kokarnitPlan: 0, kokarnitFact: 0, artoxanPlan: 0, artoxanFact: 0,
      artoxanTablPlan: 0, artoxanTablFact: 0, artoxanGelPlan: 0, artoxanGelFact: 0,
      seknidoxPlan: 0, seknidoxFact: 0, klodifenPlan: 0, klodifenFact: 0,
      drastopPlan: 0, drastopFact: 0, ortsepolPlan: 0, ortsepolFact: 0,
      limendaPlan: 0, limendaFact: 0, ronocitPlan: 0, ronocitFact: 0,
      doramitcinPlan: 0, doramitcinFact: 0, alfectoPlan: 0, alfectoFact: 0,
      totalPackagesPlan: 0, totalPackagesFact: 0, totalMoneyPlan: 0, totalMoneyFact: 0,
    };
  }
  return reps.reduce<MedRepData>((acc, rep) => ({
    ...acc,
    kokarnitPlan: acc.kokarnitPlan + rep.kokarnitPlan,
    kokarnitFact: acc.kokarnitFact + rep.kokarnitFact,
    artoxanPlan: acc.artoxanPlan + rep.artoxanPlan,
    artoxanFact: acc.artoxanFact + rep.artoxanFact,
    artoxanTablPlan: acc.artoxanTablPlan + rep.artoxanTablPlan,
    artoxanTablFact: acc.artoxanTablFact + rep.artoxanTablFact,
    artoxanGelPlan: acc.artoxanGelPlan + rep.artoxanGelPlan,
    artoxanGelFact: acc.artoxanGelFact + rep.artoxanGelFact,
    seknidoxPlan: acc.seknidoxPlan + rep.seknidoxPlan,
    seknidoxFact: acc.seknidoxFact + rep.seknidoxFact,
    klodifenPlan: acc.klodifenPlan + rep.klodifenPlan,
    klodifenFact: acc.klodifenFact + rep.klodifenFact,
    drastopPlan: acc.drastopPlan + rep.drastopPlan,
    drastopFact: acc.drastopFact + rep.drastopFact,
    ortsepolPlan: acc.ortsepolPlan + rep.ortsepolPlan,
    ortsepolFact: acc.ortsepolFact + rep.ortsepolFact,
    limendaPlan: acc.limendaPlan + rep.limendaPlan,
    limendaFact: acc.limendaFact + rep.limendaFact,
    ronocitPlan: acc.ronocitPlan + rep.ronocitPlan,
    ronocitFact: acc.ronocitFact + rep.ronocitFact,
    doramitcinPlan: acc.doramitcinPlan + rep.doramitcinPlan,
    doramitcinFact: acc.doramitcinFact + rep.doramitcinFact,
    alfectoPlan: acc.alfectoPlan + rep.alfectoPlan,
    alfectoFact: acc.alfectoFact + rep.alfectoFact,
    totalPackagesPlan: acc.totalPackagesPlan + rep.totalPackagesPlan,
    totalPackagesFact: acc.totalPackagesFact + rep.totalPackagesFact,
    totalMoneyPlan: acc.totalMoneyPlan + rep.totalMoneyPlan,
    totalMoneyFact: acc.totalMoneyFact + rep.totalMoneyFact,
  }), {
    id: 'merged',
    name: reps.length === 1 ? reps[0].name : 'Выбранные территории',
    territory: reps.length === 1 ? reps[0].territory : 'Несколько территорий',
    district: reps[0].district,
    kokarnitPlan: 0, kokarnitFact: 0, artoxanPlan: 0, artoxanFact: 0,
    artoxanTablPlan: 0, artoxanTablFact: 0, artoxanGelPlan: 0, artoxanGelFact: 0,
    seknidoxPlan: 0, seknidoxFact: 0, klodifenPlan: 0, klodifenFact: 0,
    drastopPlan: 0, drastopFact: 0, ortsepolPlan: 0, ortsepolFact: 0,
    limendaPlan: 0, limendaFact: 0, ronocitPlan: 0, ronocitFact: 0,
    doramitcinPlan: 0, doramitcinFact: 0, alfectoPlan: 0, alfectoFact: 0,
    totalPackagesPlan: 0, totalPackagesFact: 0, totalMoneyPlan: 0, totalMoneyFact: 0,
  });
}

export function aggregateTerritoryData(medReps: MedRepData[]): {
  totalPackagesPlan: number;
  totalPackagesFact: number;
  totalMoneyPlan: number;
  totalMoneyFact: number;
} {
  return medReps.reduce((acc, rep) => ({
    totalPackagesPlan: acc.totalPackagesPlan + rep.totalPackagesPlan,
    totalPackagesFact: acc.totalPackagesFact + rep.totalPackagesFact,
    totalMoneyPlan: acc.totalMoneyPlan + rep.totalMoneyPlan,
    totalMoneyFact: acc.totalMoneyFact + rep.totalMoneyFact
  }), {
    totalPackagesPlan: 0,
    totalPackagesFact: 0,
    totalMoneyPlan: 0,
    totalMoneyFact: 0
  });
}

// Helper to get product sales for a medrep
export function getMedRepProductSales(rep: MedRepData): Array<{
  productId: string;
  productName: string;
  color: string;
  plan: number;
  fact: number;
  completionPercent: number;
}> {
  const products = [
    { id: 'kokarnit', name: 'Кокарнит', color: '#10b981', plan: rep.kokarnitPlan, fact: rep.kokarnitFact },
    { id: 'artoxan', name: 'Артоксан (лиофилизат)', color: '#3b82f6', plan: rep.artoxanPlan, fact: rep.artoxanFact },
    { id: 'artoxanTabl', name: 'Артоксан таблетки', color: '#06b6d4', plan: rep.artoxanTablPlan, fact: rep.artoxanTablFact },
    { id: 'artoxanGel', name: 'Артоксан гель', color: '#14b8a6', plan: rep.artoxanGelPlan, fact: rep.artoxanGelFact },
    { id: 'seknidox', name: 'Секнидокс', color: '#8b5cf6', plan: rep.seknidoxPlan, fact: rep.seknidoxFact },
    { id: 'klodifen', name: 'Клодифен Нейро', color: '#a855f7', plan: rep.klodifenPlan, fact: rep.klodifenFact },
    { id: 'drastop', name: 'Драстоп Адванс', color: '#f59e0b', plan: rep.drastopPlan, fact: rep.drastopFact },
    { id: 'ortsepol', name: 'Орцепол ВМ', color: '#f97316', plan: rep.ortsepolPlan, fact: rep.ortsepolFact },
    { id: 'limenda', name: 'Лименда', color: '#ec4899', plan: rep.limendaPlan, fact: rep.limendaFact },
    { id: 'ronocit', name: 'Роноцит', color: '#ef4444', plan: rep.ronocitPlan, fact: rep.ronocitFact },
    { id: 'doramitcin', name: 'Дорамитцин', color: '#eab308', plan: rep.doramitcinPlan, fact: rep.doramitcinFact },
    { id: 'alfecto', name: 'Апфекто', color: '#64748b', plan: rep.alfectoPlan, fact: rep.alfectoFact },
  ];
  
  return products.map(p => ({
    productId: p.id,
    productName: p.name,
    color: p.color,
    plan: p.plan,
    fact: p.fact,
    completionPercent: calcCompletionPercent(p.fact, p.plan)
  }));
}

// Aggregate product sales across multiple medreps
export function aggregateProductSales(medReps: MedRepData[]): Array<{
  productId: string;
  productName: string;
  color: string;
  plan: number;
  fact: number;
  completionPercent: number;
}> {
  const totals: Record<string, { plan: number; fact: number }> = {};
  
  const productDefs = [
    { id: 'kokarnit', name: 'Кокарнит', color: '#10b981' },
    { id: 'artoxan', name: 'Артоксан (лиофилизат)', color: '#3b82f6' },
    { id: 'artoxanTabl', name: 'Артоксан таблетки', color: '#06b6d4' },
    { id: 'artoxanGel', name: 'Артоксан гель', color: '#14b8a6' },
    { id: 'seknidox', name: 'Секнидокс', color: '#8b5cf6' },
    { id: 'klodifen', name: 'Клодифен Нейро', color: '#a855f7' },
    { id: 'drastop', name: 'Драстоп Адванс', color: '#f59e0b' },
    { id: 'ortsepol', name: 'Орцепол ВМ', color: '#f97316' },
    { id: 'limenda', name: 'Лименда', color: '#ec4899' },
    { id: 'ronocit', name: 'Роноцит', color: '#ef4444' },
    { id: 'doramitcin', name: 'Дорамитцин', color: '#eab308' },
    { id: 'alfecto', name: 'Апфекто', color: '#64748b' },
  ];
  
  productDefs.forEach(p => {
    totals[p.id] = { plan: 0, fact: 0 };
  });
  
  medReps.forEach(rep => {
    totals['kokarnit'].plan += rep.kokarnitPlan;
    totals['kokarnit'].fact += rep.kokarnitFact;
    totals['artoxan'].plan += rep.artoxanPlan;
    totals['artoxan'].fact += rep.artoxanFact;
    totals['artoxanTabl'].plan += rep.artoxanTablPlan;
    totals['artoxanTabl'].fact += rep.artoxanTablFact;
    totals['artoxanGel'].plan += rep.artoxanGelPlan;
    totals['artoxanGel'].fact += rep.artoxanGelFact;
    totals['seknidox'].plan += rep.seknidoxPlan;
    totals['seknidox'].fact += rep.seknidoxFact;
    totals['klodifen'].plan += rep.klodifenPlan;
    totals['klodifen'].fact += rep.klodifenFact;
    totals['drastop'].plan += rep.drastopPlan;
    totals['drastop'].fact += rep.drastopFact;
    totals['ortsepol'].plan += rep.ortsepolPlan;
    totals['ortsepol'].fact += rep.ortsepolFact;
    totals['limenda'].plan += rep.limendaPlan;
    totals['limenda'].fact += rep.limendaFact;
    totals['ronocit'].plan += rep.ronocitPlan;
    totals['ronocit'].fact += rep.ronocitFact;
    totals['doramitcin'].plan += rep.doramitcinPlan;
    totals['doramitcin'].fact += rep.doramitcinFact;
    totals['alfecto'].plan += rep.alfectoPlan;
    totals['alfecto'].fact += rep.alfectoFact;
  });
  
  return productDefs.map(p => ({
    productId: p.id,
    productName: p.name,
    color: p.color,
    plan: totals[p.id].plan,
    fact: totals[p.id].fact,
    completionPercent: calcCompletionPercent(totals[p.id].fact, totals[p.id].plan)
  }));
}

// Get ranking position for a medrep in their district
export function getMedRepRanking(medRepId: string, district: WMFederalDistrict): { position: number; total: number } {
  const districtReps = getSalesDataByDistrict(district);
  const sorted = [...districtReps].sort((a, b) => {
    const aPercent = calcCompletionPercent(a.totalPackagesFact, a.totalPackagesPlan);
    const bPercent = calcCompletionPercent(b.totalPackagesFact, b.totalPackagesPlan);
    return bPercent - aPercent;
  });
  
  const position = sorted.findIndex(r => r.id === medRepId) + 1;
  return { position, total: sorted.length };
}
