import { MedRepData, WMUser, WMFederalDistrict } from '../types';

// PFO Sales Data - October 2025 (Real data from requirements)
export const pfoSalesData: MedRepData[] = [
  {
    id: '1',
    name: 'Шестакова Марина',
    territory: 'Самара',
    district: 'ПФО',
    kokarnitPlan: 1120, kokarnitFact: 781,
    artoxanPlan: 2285, artoxanFact: 897,
    artoxanTablPlan: 640, artoxanTablFact: 751,
    artoxanGelPlan: 380, artoxanGelFact: 448,
    seknidoxPlan: 290, seknidoxFact: 170,
    klodifenPlan: 115, klodifenFact: 96,
    drastopPlan: 63, drastopFact: 24,
    ortsepolPlan: 500, ortsepolFact: 458,
    limendaPlan: 445, limendaFact: 576,
    ronocitPlan: 250, ronocitFact: 349,
    doramitcinPlan: 240, doramitcinFact: 54,
    alfectoPlan: 35, alfectoFact: 34,
    totalPackagesPlan: 6363,
    totalPackagesFact: 4638,
    totalMoneyPlan: 4247288,
    totalMoneyFact: 2983974,
    month: 10,
    year: 2025
  },
  {
    id: '2',
    name: 'Жмылева Валерия',
    territory: 'Самара',
    district: 'ПФО',
    kokarnitPlan: 1120, kokarnitFact: 1218,
    artoxanPlan: 2285, artoxanFact: 2215,
    artoxanTablPlan: 640, artoxanTablFact: 946,
    artoxanGelPlan: 380, artoxanGelFact: 606,
    seknidoxPlan: 290, seknidoxFact: 419,
    klodifenPlan: 115, klodifenFact: 204,
    drastopPlan: 63, drastopFact: 24,
    ortsepolPlan: 500, ortsepolFact: 986,
    limendaPlan: 445, limendaFact: 563,
    ronocitPlan: 250, ronocitFact: 352,
    doramitcinPlan: 240, doramitcinFact: 170,
    alfectoPlan: 35, alfectoFact: 10,
    totalPackagesPlan: 6363,
    totalPackagesFact: 7713,
    totalMoneyPlan: 4247288,
    totalMoneyFact: 5025474,
    month: 10,
    year: 2025
  },
  {
    id: '3',
    name: 'Петрова Анна',
    territory: 'Казань',
    district: 'ПФО',
    kokarnitPlan: 980, kokarnitFact: 1050,
    artoxanPlan: 1800, artoxanFact: 1750,
    artoxanTablPlan: 550, artoxanTablFact: 620,
    artoxanGelPlan: 320, artoxanGelFact: 380,
    seknidoxPlan: 250, seknidoxFact: 290,
    klodifenPlan: 100, klodifenFact: 130,
    drastopPlan: 55, drastopFact: 48,
    ortsepolPlan: 420, ortsepolFact: 510,
    limendaPlan: 380, limendaFact: 420,
    ronocitPlan: 200, ronocitFact: 280,
    doramitcinPlan: 180, doramitcinFact: 145,
    alfectoPlan: 30, alfectoFact: 28,
    totalPackagesPlan: 5265,
    totalPackagesFact: 5651,
    totalMoneyPlan: 3512540,
    totalMoneyFact: 3768920,
    month: 10,
    year: 2025
  },
  {
    id: '4',
    name: 'Сидоров Михаил',
    territory: 'Казань',
    district: 'ПФО',
    kokarnitPlan: 980, kokarnitFact: 820,
    artoxanPlan: 1800, artoxanFact: 1560,
    artoxanTablPlan: 550, artoxanTablFact: 480,
    artoxanGelPlan: 320, artoxanGelFact: 290,
    seknidoxPlan: 250, seknidoxFact: 180,
    klodifenPlan: 100, klodifenFact: 75,
    drastopPlan: 55, drastopFact: 35,
    ortsepolPlan: 420, ortsepolFact: 350,
    limendaPlan: 380, limendaFact: 310,
    ronocitPlan: 200, ronocitFact: 165,
    doramitcinPlan: 180, doramitcinFact: 95,
    alfectoPlan: 30, alfectoFact: 18,
    totalPackagesPlan: 5265,
    totalPackagesFact: 4378,
    totalMoneyPlan: 3512540,
    totalMoneyFact: 2920760,
    month: 10,
    year: 2025
  },
  {
    id: '5',
    name: 'Козлова Елена',
    territory: 'Нижний Новгород',
    district: 'ПФО',
    kokarnitPlan: 1050, kokarnitFact: 1180,
    artoxanPlan: 2100, artoxanFact: 2350,
    artoxanTablPlan: 600, artoxanTablFact: 720,
    artoxanGelPlan: 350, artoxanGelFact: 410,
    seknidoxPlan: 270, seknidoxFact: 340,
    klodifenPlan: 110, klodifenFact: 145,
    drastopPlan: 60, drastopFact: 72,
    ortsepolPlan: 470, ortsepolFact: 580,
    limendaPlan: 410, limendaFact: 495,
    ronocitPlan: 230, ronocitFact: 310,
    doramitcinPlan: 210, doramitcinFact: 185,
    alfectoPlan: 32, alfectoFact: 38,
    totalPackagesPlan: 5892,
    totalPackagesFact: 6825,
    totalMoneyPlan: 3931580,
    totalMoneyFact: 4553250,
    month: 10,
    year: 2025
  },
  {
    id: '6',
    name: 'Новикова Ольга',
    territory: 'Нижний Новгород',
    district: 'ПФО',
    kokarnitPlan: 1050, kokarnitFact: 950,
    artoxanPlan: 2100, artoxanFact: 1980,
    artoxanTablPlan: 600, artoxanTablFact: 550,
    artoxanGelPlan: 350, artoxanGelFact: 320,
    seknidoxPlan: 270, seknidoxFact: 240,
    klodifenPlan: 110, klodifenFact: 95,
    drastopPlan: 60, drastopFact: 45,
    ortsepolPlan: 470, ortsepolFact: 420,
    limendaPlan: 410, limendaFact: 380,
    ronocitPlan: 230, ronocitFact: 200,
    doramitcinPlan: 210, doramitcinFact: 160,
    alfectoPlan: 32, alfectoFact: 25,
    totalPackagesPlan: 5892,
    totalPackagesFact: 5365,
    totalMoneyPlan: 3931580,
    totalMoneyFact: 3578550,
    month: 10,
    year: 2025
  },
  {
    id: '7',
    name: 'Иванов Дмитрий',
    territory: 'Уфа',
    district: 'ПФО',
    kokarnitPlan: 900, kokarnitFact: 1020,
    artoxanPlan: 1700, artoxanFact: 1850,
    artoxanTablPlan: 520, artoxanTablFact: 590,
    artoxanGelPlan: 300, artoxanGelFact: 360,
    seknidoxPlan: 230, seknidoxFact: 280,
    klodifenPlan: 95, klodifenFact: 120,
    drastopPlan: 50, drastopFact: 62,
    ortsepolPlan: 390, ortsepolFact: 470,
    limendaPlan: 350, limendaFact: 410,
    ronocitPlan: 190, ronocitFact: 250,
    doramitcinPlan: 170, doramitcinFact: 145,
    alfectoPlan: 28, alfectoFact: 32,
    totalPackagesPlan: 4923,
    totalPackagesFact: 5589,
    totalMoneyPlan: 3284360,
    totalMoneyFact: 3728940,
    month: 10,
    year: 2025
  },
  {
    id: '8',
    name: 'Морозова Татьяна',
    territory: 'Уфа',
    district: 'ПФО',
    kokarnitPlan: 900, kokarnitFact: 780,
    artoxanPlan: 1700, artoxanFact: 1450,
    artoxanTablPlan: 520, artoxanTablFact: 420,
    artoxanGelPlan: 300, artoxanGelFact: 250,
    seknidoxPlan: 230, seknidoxFact: 170,
    klodifenPlan: 95, klodifenFact: 65,
    drastopPlan: 50, drastopFact: 30,
    ortsepolPlan: 390, ortsepolFact: 310,
    limendaPlan: 350, limendaFact: 280,
    ronocitPlan: 190, ronocitFact: 140,
    doramitcinPlan: 170, doramitcinFact: 90,
    alfectoPlan: 28, alfectoFact: 15,
    totalPackagesPlan: 4923,
    totalPackagesFact: 4000,
    totalMoneyPlan: 3284360,
    totalMoneyFact: 2668800,
    month: 10,
    year: 2025
  },
  {
    id: '9',
    name: 'Федорова Наталья',
    territory: 'Пермь',
    district: 'ПФО',
    kokarnitPlan: 850, kokarnitFact: 920,
    artoxanPlan: 1600, artoxanFact: 1720,
    artoxanTablPlan: 480, artoxanTablFact: 540,
    artoxanGelPlan: 280, artoxanGelFact: 320,
    seknidoxPlan: 210, seknidoxFact: 250,
    klodifenPlan: 85, klodifenFact: 105,
    drastopPlan: 45, drastopFact: 55,
    ortsepolPlan: 360, ortsepolFact: 420,
    limendaPlan: 320, limendaFact: 380,
    ronocitPlan: 170, ronocitFact: 210,
    doramitcinPlan: 150, doramitcinFact: 130,
    alfectoPlan: 25, alfectoFact: 28,
    totalPackagesPlan: 4575,
    totalPackagesFact: 5078,
    totalMoneyPlan: 3053250,
    totalMoneyFact: 3387020,
    month: 10,
    year: 2025
  },
  {
    id: '10',
    name: 'Соколов Андрей',
    territory: 'Пермь',
    district: 'ПФО',
    kokarnitPlan: 850, kokarnitFact: 680,
    artoxanPlan: 1600, artoxanFact: 1280,
    artoxanTablPlan: 480, artoxanTablFact: 360,
    artoxanGelPlan: 280, artoxanGelFact: 210,
    seknidoxPlan: 210, seknidoxFact: 150,
    klodifenPlan: 85, klodifenFact: 55,
    drastopPlan: 45, drastopFact: 25,
    ortsepolPlan: 360, ortsepolFact: 270,
    limendaPlan: 320, limendaFact: 240,
    ronocitPlan: 170, ronocitFact: 120,
    doramitcinPlan: 150, doramitcinFact: 70,
    alfectoPlan: 25, alfectoFact: 12,
    totalPackagesPlan: 4575,
    totalPackagesFact: 3472,
    totalMoneyPlan: 3053250,
    totalMoneyFact: 2316640,
    month: 10,
    year: 2025
  }
];

// Sample data for other districts (smaller sets for demo)
export const cfoSalesData: MedRepData[] = [
  {
    id: 'cfo1',
    name: 'Волкова Мария',
    territory: 'Москва',
    district: 'ЦФО',
    kokarnitPlan: 1500, kokarnitFact: 1680,
    artoxanPlan: 3000, artoxanFact: 3250,
    artoxanTablPlan: 850, artoxanTablFact: 920,
    artoxanGelPlan: 500, artoxanGelFact: 560,
    seknidoxPlan: 380, seknidoxFact: 420,
    klodifenPlan: 150, klodifenFact: 175,
    drastopPlan: 80, drastopFact: 95,
    ortsepolPlan: 650, ortsepolFact: 720,
    limendaPlan: 580, limendaFact: 640,
    ronocitPlan: 320, ronocitFact: 380,
    doramitcinPlan: 300, doramitcinFact: 270,
    alfectoPlan: 45, alfectoFact: 50,
    totalPackagesPlan: 8355,
    totalPackagesFact: 9160,
    totalMoneyPlan: 5575710,
    totalMoneyFact: 6112560,
    month: 10,
    year: 2025
  },
  {
    id: 'cfo2',
    name: 'Кузнецов Сергей',
    territory: 'Москва',
    district: 'ЦФО',
    kokarnitPlan: 1500, kokarnitFact: 1350,
    artoxanPlan: 3000, artoxanFact: 2700,
    artoxanTablPlan: 850, artoxanTablFact: 750,
    artoxanGelPlan: 500, artoxanGelFact: 430,
    seknidoxPlan: 380, seknidoxFact: 320,
    klodifenPlan: 150, klodifenFact: 120,
    drastopPlan: 80, drastopFact: 60,
    ortsepolPlan: 650, ortsepolFact: 550,
    limendaPlan: 580, limendaFact: 490,
    ronocitPlan: 320, ronocitFact: 260,
    doramitcinPlan: 300, doramitcinFact: 200,
    alfectoPlan: 45, alfectoFact: 35,
    totalPackagesPlan: 8355,
    totalPackagesFact: 7265,
    totalMoneyPlan: 5575710,
    totalMoneyFact: 4847770,
    month: 10,
    year: 2025
  }
];

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
