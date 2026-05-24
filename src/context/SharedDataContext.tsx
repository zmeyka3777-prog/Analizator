import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MedRepData, WMFederalDistrict } from '../types';
import { setSalesDataFromMdlp } from '@/data/salesData';
import { toMonthNum as monthToNum } from '@/utils/months';

export interface MDLPSaleRecord {
  drug: string;
  region: string;
  city?: string;
  contragent?: string;
  sales: number;
  packages: number;
  date?: string;
  year?: number;
  month?: number;
  week?: number;
  disposalType?: string;
  receiverType?: string;
  federalDistrict?: string;
}

export interface WMRussiaSummary {
  totalSales: number;
  totalPackages: number;
  totalPlan: number;
  completionPercent: number;
  byDistrict: Record<WMFederalDistrict, {
    sales: number;
    packages: number;
    plan: number;
    completion: number;
    medReps: MedRepData[];
  }>;
  byProduct: Record<string, {
    plan: number;
    fact: number;
    completion: number;
  }>;
}

interface SharedDataContextType {
  mdlpData: MDLPSaleRecord[];
  wmRussiaData: MedRepData[];
  wmRussiaSummary: WMRussiaSummary | null;
  dataLoaded: boolean;
  lastUploadDate: string | null;
  
  setMdlpData: (data: MDLPSaleRecord[]) => void;
  setWmRussiaData: (data: MedRepData[]) => void;
  addWmRussiaData: (data: MedRepData[], district: WMFederalDistrict, month: number, year: number) => void;
  clearAllData: () => void;
  transformMdlpToWmRussia: (mdlpRecords: MDLPSaleRecord[]) => MedRepData[];
}

const SharedDataContext = createContext<SharedDataContextType | null>(null);

export const WM_PRODUCTS = [
  { key: 'kokarnit', name: 'Кокарнит', color: '#6366F1' },
  { key: 'artoxan', name: 'Артоксан амп.', color: '#EC4899' },
  { key: 'artoxanTabl', name: 'Артоксан табл.', color: '#F97316' },
  { key: 'artoxanGel', name: 'Артоксан гель', color: '#14B8A6' },
  { key: 'seknidox', name: 'Секнидокс', color: '#8B5CF6' },
  { key: 'klodifen', name: 'Клодифен', color: '#EF4444' },
  { key: 'drastop', name: 'Драстоп', color: '#22C55E' },
  { key: 'ortsepol', name: 'Ортсепол', color: '#3B82F6' },
  { key: 'limenda', name: 'Лименда', color: '#F59E0B' },
  { key: 'ronocit', name: 'Роноцит', color: '#06B6D4' },
  { key: 'doramitcin', name: 'Дорамитцин', color: '#A855F7' },
  { key: 'alfecto', name: 'Альфекто', color: '#10B981' },
];

export const REGION_TO_DISTRICT: Record<string, WMFederalDistrict> = {
  'Самарская область': 'ПФО',
  'Самара': 'ПФО',
  'Республика Татарстан': 'ПФО',
  'Казань': 'ПФО',
  'Нижегородская область': 'ПФО',
  'Нижний Новгород': 'ПФО',
  'Саратовская область': 'ПФО',
  'Саратов': 'ПФО',
  'Пензенская область': 'ПФО',
  'Пенза': 'ПФО',
  'Ульяновская область': 'ПФО',
  'Ульяновск': 'ПФО',
  'Оренбургская область': 'ПФО',
  'Оренбург': 'ПФО',
  'Республика Башкортостан': 'ПФО',
  'Уфа': 'ПФО',
  'Удмуртская Республика': 'ПФО',
  'Ижевск': 'ПФО',
  'Пермский край': 'ПФО',
  'Пермь': 'ПФО',
  'Кировская область': 'ПФО',
  'Киров': 'ПФО',
  'Республика Марий Эл': 'ПФО',
  'Йошкар-Ола': 'ПФО',
  'Республика Мордовия': 'ПФО',
  'Саранск': 'ПФО',
  'Чувашская Республика': 'ПФО',
  'Чебоксары': 'ПФО',
  
  'Москва': 'ЦФО',
  'Московская область': 'ЦФО',
  'Тверская область': 'ЦФО',
  'Ярославская область': 'ЦФО',
  'Владимирская область': 'ЦФО',
  'Ивановская область': 'ЦФО',
  'Костромская область': 'ЦФО',
  'Рязанская область': 'ЦФО',
  'Тульская область': 'ЦФО',
  'Калужская область': 'ЦФО',
  'Брянская область': 'ЦФО',
  'Смоленская область': 'ЦФО',
  'Орловская область': 'ЦФО',
  'Курская область': 'ЦФО',
  'Белгородская область': 'ЦФО',
  'Воронежская область': 'ЦФО',
  'Липецкая область': 'ЦФО',
  'Тамбовская область': 'ЦФО',
  
  'Санкт-Петербург': 'СЗФО',
  'Ленинградская область': 'СЗФО',
  'Калининградская область': 'СЗФО',
  'Псковская область': 'СЗФО',
  'Новгородская область': 'СЗФО',
  'Вологодская область': 'СЗФО',
  'Архангельская область': 'СЗФО',
  'Мурманская область': 'СЗФО',
  'Республика Карелия': 'СЗФО',
  'Республика Коми': 'СЗФО',
  
  'Ростовская область': 'ЮФО',
  'Ростов-на-Дону': 'ЮФО',
  'Краснодарский край': 'ЮФО',
  'Краснодар': 'ЮФО',
  'Волгоградская область': 'ЮФО',
  'Волгоград': 'ЮФО',
  'Астраханская область': 'ЮФО',
  'Республика Крым': 'ЮФО',
  'Севастополь': 'ЮФО',
  'Республика Адыгея': 'ЮФО',
  'Республика Калмыкия': 'ЮФО',
  
  'Ставропольский край': 'СКФО',
  'Ставрополь': 'СКФО',
  'Чеченская Республика': 'СКФО',
  'Республика Дагестан': 'СКФО',
  'Республика Ингушетия': 'СКФО',
  'Кабардино-Балкарская Республика': 'СКФО',
  'Карачаево-Черкесская Республика': 'СКФО',
  'Республика Северная Осетия': 'СКФО',
  
  'Свердловская область': 'УФО',
  'Екатеринбург': 'УФО',
  'Челябинская область': 'УФО',
  'Челябинск': 'УФО',
  'Тюменская область': 'УФО',
  'Тюмень': 'УФО',
  'Курганская область': 'УФО',
  'Ханты-Мансийский АО': 'УФО',
  'Ямало-Ненецкий АО': 'УФО',
  
  'Новосибирская область': 'СФО',
  'Новосибирск': 'СФО',
  'Омская область': 'СФО',
  'Омск': 'СФО',
  'Красноярский край': 'СФО',
  'Красноярск': 'СФО',
  'Иркутская область': 'СФО',
  'Иркутск': 'СФО',
  'Кемеровская область': 'СФО',
  'Алтайский край': 'СФО',
  'Томская область': 'СФО',
  'Забайкальский край': 'СФО',
  'Республика Бурятия': 'СФО',
  'Республика Хакасия': 'СФО',
  'Республика Тыва': 'СФО',
  'Республика Алтай': 'СФО',
  
  'Приморский край': 'ДФО',
  'Владивосток': 'ДФО',
  'Хабаровский край': 'ДФО',
  'Хабаровск': 'ДФО',
  'Амурская область': 'ДФО',
  'Сахалинская область': 'ДФО',
  'Камчатский край': 'ДФО',
  'Магаданская область': 'ДФО',
  'Еврейская АО': 'ДФО',
  'Чукотский АО': 'ДФО',
  'Республика Саха': 'ДФО',
};

export const DRUG_TO_WM_PRODUCT: Record<string, string> = {
  'кокарнит': 'kokarnit',
  'cocarnit': 'kokarnit',
  'kokarнит': 'kokarnit',
  'kokarnit': 'kokarnit',
  'артоксан': 'artoxan',
  'artoxan': 'artoxan',
  'артоксан амп': 'artoxan',
  'артоксан ампулы': 'artoxan',
  'артоксан табл': 'artoxanTabl',
  'артоксан таблетки': 'artoxanTabl',
  'артоксан гель': 'artoxanGel',
  'секнидокс': 'seknidox',
  'seknidox': 'seknidox',
  'клодифен': 'klodifen',
  'klodifen': 'klodifen',
  'драстоп': 'drastop',
  'drastop': 'drastop',
  'ортсепол': 'ortsepol',
  'ortsepol': 'ortsepol',
  'лименда': 'limenda',
  'limenda': 'limenda',
  'роноцит': 'ronocit',
  'ronocit': 'ronocit',
  'дорамитцин': 'doramitcin',
  'doramitcin': 'doramitcin',
  'альфекто': 'alfecto',
  'alfecto': 'alfecto',
};

function getDistrictFromRegion(region: string): WMFederalDistrict {
  const normalized = region?.trim();
  if (REGION_TO_DISTRICT[normalized]) {
    return REGION_TO_DISTRICT[normalized];
  }
  for (const [key, district] of Object.entries(REGION_TO_DISTRICT)) {
    if (normalized?.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(normalized?.toLowerCase() || '')) {
      return district;
    }
  }
  return 'ПФО';
}

function getWmProductKey(drugName: string): string | null {
  const normalized = drugName?.toLowerCase().trim();
  if (DRUG_TO_WM_PRODUCT[normalized]) {
    return DRUG_TO_WM_PRODUCT[normalized];
  }
  for (const [key, product] of Object.entries(DRUG_TO_WM_PRODUCT)) {
    if (normalized?.includes(key) || key.includes(normalized || '')) {
      return product;
    }
  }
  return null;
}

export function SharedDataProvider({ children }: { children: React.ReactNode }) {
  const [mdlpData, setMdlpDataState] = useState<MDLPSaleRecord[]>([]);
  const [wmRussiaData, setWmRussiaDataState] = useState<MedRepData[]>([]);
  const [wmRussiaSummary, setWmRussiaSummary] = useState<WMRussiaSummary | null>(null);
  const [lastUploadDate, setLastUploadDate] = useState<string | null>(null);

  const dataLoaded = mdlpData.length > 0 || wmRussiaData.length > 0;

  const calculateSummary = useCallback((data: MedRepData[]): WMRussiaSummary => {
    const byDistrict: WMRussiaSummary['byDistrict'] = {} as any;
    const byProduct: WMRussiaSummary['byProduct'] = {};
    
    const districts: WMFederalDistrict[] = ['ЦФО', 'СЗФО', 'ЮФО', 'СКФО', 'ПФО', 'УФО', 'СФО', 'ДФО'];
    districts.forEach(d => {
      byDistrict[d] = { sales: 0, packages: 0, plan: 0, completion: 0, medReps: [] };
    });
    
    WM_PRODUCTS.forEach(p => {
      byProduct[p.key] = { plan: 0, fact: 0, completion: 0 };
    });

    let totalSales = 0;
    let totalPackages = 0;
    let totalPlan = 0;

    data.forEach(rep => {
      const district = rep.district;
      if (byDistrict[district]) {
        byDistrict[district].sales += rep.totalMoneyFact || 0;
        byDistrict[district].packages += rep.totalPackagesFact || 0;
        byDistrict[district].plan += rep.totalPackagesPlan || 0;
        byDistrict[district].medReps.push(rep);
      }
      
      totalSales += rep.totalMoneyFact || 0;
      totalPackages += rep.totalPackagesFact || 0;
      totalPlan += rep.totalPackagesPlan || 0;

      byProduct['kokarnit'].plan += rep.kokarnitPlan || 0;
      byProduct['kokarnit'].fact += rep.kokarnitFact || 0;
      byProduct['artoxan'].plan += rep.artoxanPlan || 0;
      byProduct['artoxan'].fact += rep.artoxanFact || 0;
      byProduct['artoxanTabl'].plan += rep.artoxanTablPlan || 0;
      byProduct['artoxanTabl'].fact += rep.artoxanTablFact || 0;
      byProduct['artoxanGel'].plan += rep.artoxanGelPlan || 0;
      byProduct['artoxanGel'].fact += rep.artoxanGelFact || 0;
      byProduct['seknidox'].plan += rep.seknidoxPlan || 0;
      byProduct['seknidox'].fact += rep.seknidoxFact || 0;
      byProduct['klodifen'].plan += rep.klodifenPlan || 0;
      byProduct['klodifen'].fact += rep.klodifenFact || 0;
      byProduct['drastop'].plan += rep.drastopPlan || 0;
      byProduct['drastop'].fact += rep.drastopFact || 0;
      byProduct['ortsepol'].plan += rep.ortsepolPlan || 0;
      byProduct['ortsepol'].fact += rep.ortsepolFact || 0;
      byProduct['limenda'].plan += rep.limendaPlan || 0;
      byProduct['limenda'].fact += rep.limendaFact || 0;
      byProduct['ronocit'].plan += rep.ronocitPlan || 0;
      byProduct['ronocit'].fact += rep.ronocitFact || 0;
      byProduct['doramitcin'].plan += rep.doramitcinPlan || 0;
      byProduct['doramitcin'].fact += rep.doramitcinFact || 0;
      byProduct['alfecto'].plan += rep.alfectoPlan || 0;
      byProduct['alfecto'].fact += rep.alfectoFact || 0;
    });

    districts.forEach(d => {
      if (byDistrict[d].plan > 0) {
        byDistrict[d].completion = (byDistrict[d].packages / byDistrict[d].plan) * 100;
      }
    });

    Object.keys(byProduct).forEach(key => {
      if (byProduct[key].plan > 0) {
        byProduct[key].completion = (byProduct[key].fact / byProduct[key].plan) * 100;
      }
    });

    return {
      totalSales,
      totalPackages,
      totalPlan,
      completionPercent: totalPlan > 0 ? (totalPackages / totalPlan) * 100 : 0,
      byDistrict,
      byProduct,
    };
  }, []);

  const transformMdlpToWmRussia = useCallback((mdlpRecords: MDLPSaleRecord[]): MedRepData[] => {
    const grouped: Record<string, { 
      region: string; 
      district: WMFederalDistrict;
      products: Record<string, { plan: number; fact: number }>;
      totalMoney: number;
    }> = {};

    mdlpRecords.forEach(record => {
      const district = record.federalDistrict as WMFederalDistrict || getDistrictFromRegion(record.region);
      const regionKey = `${record.region || 'Unknown'}_${district}`;
      
      if (!grouped[regionKey]) {
        grouped[regionKey] = {
          region: record.region || 'Unknown',
          district,
          products: {},
          totalMoney: 0,
        };
        WM_PRODUCTS.forEach(p => {
          grouped[regionKey].products[p.key] = { plan: 0, fact: 0 };
        });
      }
      
      const productKey = getWmProductKey(record.drug);
      if (productKey && grouped[regionKey].products[productKey]) {
        grouped[regionKey].products[productKey].fact += record.packages || 0;
        grouped[regionKey].products[productKey].plan += Math.round((record.packages || 0) * 1.1);
      }
      grouped[regionKey].totalMoney += record.sales || 0;
    });

    return Object.entries(grouped).map(([key, data], index) => {
      const totalFact = Object.values(data.products).reduce((sum, p) => sum + p.fact, 0);
      const totalPlan = Object.values(data.products).reduce((sum, p) => sum + p.plan, 0);
      
      return {
        id: `mdlp-${index + 1}`,
        name: `${data.region}`,
        territory: data.region,
        district: data.district,
        kokarnitPlan: data.products['kokarnit']?.plan || 0,
        kokarnitFact: data.products['kokarnit']?.fact || 0,
        artoxanPlan: data.products['artoxan']?.plan || 0,
        artoxanFact: data.products['artoxan']?.fact || 0,
        artoxanTablPlan: data.products['artoxanTabl']?.plan || 0,
        artoxanTablFact: data.products['artoxanTabl']?.fact || 0,
        artoxanGelPlan: data.products['artoxanGel']?.plan || 0,
        artoxanGelFact: data.products['artoxanGel']?.fact || 0,
        seknidoxPlan: data.products['seknidox']?.plan || 0,
        seknidoxFact: data.products['seknidox']?.fact || 0,
        klodifenPlan: data.products['klodifen']?.plan || 0,
        klodifenFact: data.products['klodifen']?.fact || 0,
        drastopPlan: data.products['drastop']?.plan || 0,
        drastopFact: data.products['drastop']?.fact || 0,
        ortsepolPlan: data.products['ortsepol']?.plan || 0,
        ortsepolFact: data.products['ortsepol']?.fact || 0,
        limendaPlan: data.products['limenda']?.plan || 0,
        limendaFact: data.products['limenda']?.fact || 0,
        ronocitPlan: data.products['ronocit']?.plan || 0,
        ronocitFact: data.products['ronocit']?.fact || 0,
        doramitcinPlan: data.products['doramitcin']?.plan || 0,
        doramitcinFact: data.products['doramitcin']?.fact || 0,
        alfectoPlan: data.products['alfecto']?.plan || 0,
        alfectoFact: data.products['alfecto']?.fact || 0,
        totalPackagesPlan: totalPlan,
        totalPackagesFact: totalFact,
        totalMoneyPlan: Math.round(data.totalMoney * 1.1),
        totalMoneyFact: data.totalMoney,
      };
    });
  }, []);

  const setMdlpData = useCallback((data: MDLPSaleRecord[]) => {
    setMdlpDataState(data);
    setLastUploadDate(new Date().toISOString());
    
    const transformed = transformMdlpToWmRussia(data);
    setWmRussiaDataState(prev => {
      const newData = [...prev.filter(d => !d.id.startsWith('mdlp-')), ...transformed];
      return newData;
    });
  }, [transformMdlpToWmRussia]);

  const setWmRussiaData = useCallback((data: MedRepData[]) => {
    setWmRussiaDataState(data);
    setLastUploadDate(new Date().toISOString());
  }, []);

  const addWmRussiaData = useCallback((data: MedRepData[], district: WMFederalDistrict, month: number, year: number) => {
    const dataWithPeriod = data.map(d => ({ ...d, district, month, year }));
    setWmRussiaDataState(prev => [...prev, ...dataWithPeriod]);
    setLastUploadDate(new Date().toISOString());
  }, []);

  const clearAllData = useCallback(() => {
    setMdlpDataState([]);
    setWmRussiaDataState([]);
    setWmRussiaSummary(null);
    setLastUploadDate(null);
  }, []);

  useEffect(() => {
    if (wmRussiaData.length > 0) {
      const summary = calculateSummary(wmRussiaData);
      setWmRussiaSummary(summary);
    } else {
      setWmRussiaSummary(null);
    }
  }, [wmRussiaData, calculateSummary]);

  // ========================================================================
  // Единый источник данных: подтягиваем compact rows из БД и транслируем
  // в MDLPSaleRecord, чтобы все дашборды (medrep/TM/manager) получали
  // актуальные данные после chunked upload без перезагрузки страницы.
  // Загружаем при монтировании (если юзер залогинен) и по событию
  // 'mdlp-data-updated' (App.tsx диспатчит после успеха upload).
  // ========================================================================
  const reloadFromServer = useCallback(async () => {
    const token = localStorage.getItem('wm_auth_token');
    if (!token) return;
    let userId: string | number | null = null;
    try {
      const raw = localStorage.getItem('mdlp_user') || localStorage.getItem('wm_russia_user');
      if (raw) {
        const u = JSON.parse(raw);
        userId = u?.id ?? null;
      }
    } catch {
      return;
    }
    if (!userId) return;

    try {
      const res = await fetch(`/api/yearly-data/${userId}/9999`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const agg = data?.aggregatedData as any;
      const rows: any[] | undefined = agg?.rows;
      if (!Array.isArray(rows) || rows.length === 0) {
        setMdlpDataState([]);
        return;
      }
      // Маппинг месяца: API отдаёт строку ("Мар", "Янв" и т.д.). Используем
      // единый toMonthNum из @/utils/months (один источник правды).
      const mdlpRecords: MDLPSaleRecord[] = rows.map(r => ({
        drug: r.drug || r.complexDrugName || '',
        region: r.region || '',
        city: r.city || undefined,
        contragent: r.contragent || undefined,
        sales: Number(r.amount) || 0,
        packages: Number(r.quantity) || 0,
        year: r.year != null ? Number(r.year) : undefined,
        month: monthToNum(r.month),
        week: r.week != null ? Number(r.week) : undefined,
        disposalType: r.disposalType || undefined,
        receiverType: r.receiverType || undefined,
        federalDistrict: r.federalDistrict || undefined,
      }));
      setMdlpDataState(mdlpRecords);
      setLastUploadDate(new Date().toISOString());
      const transformed = transformMdlpToWmRussia(mdlpRecords);
      setWmRussiaDataState(prev => {
        const kept = prev.filter(d => !d.id.startsWith('mdlp-'));
        return [...kept, ...transformed];
      });
      // Синхронизируем SALES_DATA — чтобы getSalesData()/getTotalStats()/
      // aggregateByProduct() в DirectorWMDashboard возвращали реальные данные.
      setSalesDataFromMdlp(mdlpRecords);
      if (import.meta.env.DEV) {
        console.log(`[SharedData] Обновлено из БД: ${rows.length} строк`);
      }
    } catch (err: any) {
      console.warn('[SharedData] Не удалось подгрузить данные из БД:', err);
      // Показываем пользователю — раньше ошибки молчали в console и юзер
      // думал что просто нет данных.
      window.dispatchEvent(new CustomEvent('app-error', {
        detail: { message: `Не удалось загрузить данные из БД: ${err?.message || 'неизвестная ошибка'}` }
      }));
    }
  }, [transformMdlpToWmRussia]);

  useEffect(() => {
    reloadFromServer(); // первичная загрузка для текущего юзера
    const dataHandler = () => reloadFromServer();
    // Смена пользователя — очищаем старые данные и подтягиваем новые
    const userChangedHandler = () => {
      setMdlpDataState([]);
      setWmRussiaDataState([]);
      setLastUploadDate(null);
      setSalesDataFromMdlp([]); // очистить SALES_DATA
      reloadFromServer();
    };
    window.addEventListener('mdlp-data-updated', dataHandler);
    window.addEventListener('user-changed', userChangedHandler);
    return () => {
      window.removeEventListener('mdlp-data-updated', dataHandler);
      window.removeEventListener('user-changed', userChangedHandler);
    };
  }, [reloadFromServer]);

  return (
    <SharedDataContext.Provider value={{
      mdlpData,
      wmRussiaData,
      wmRussiaSummary,
      dataLoaded,
      lastUploadDate,
      setMdlpData,
      setWmRussiaData,
      addWmRussiaData,
      clearAllData,
      transformMdlpToWmRussia,
    }}>
      {children}
    </SharedDataContext.Provider>
  );
}

export function useSharedData() {
  const context = useContext(SharedDataContext);
  if (!context) {
    throw new Error('useSharedData must be used within SharedDataProvider');
  }
  return context;
}
