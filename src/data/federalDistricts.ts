export interface Territory {
  id: string;
  name: string;
  budget2025: number;
}

export interface FederalDistrict {
  id: string;
  name: string;
  shortName: string;
  color: string;
  icon: string;
  territories: Territory[];
  totalBudget2025?: number;
  totalBudget2026?: number;
}

export const FEDERAL_DISTRICTS: FederalDistrict[] = [
  {
    id: 'pfo',
    name: 'Приволжский федеральный округ',
    shortName: 'ПФО',
    color: '#06b6d4',
    icon: '🌊',
    territories: [
      { id: 'tatarstan', name: 'Республика Татарстан', budget2025: 162400 },
      { id: 'samara', name: 'Самарская область', budget2025: 127600 },
      { id: 'bashkortostan', name: 'Республика Башкортостан', budget2025: 110200 },
      { id: 'nizhny-novgorod', name: 'Нижегородская область', budget2025: 92800 },
      { id: 'penza', name: 'Пензенская область', budget2025: 52200 },
      { id: 'mordovia', name: 'Республика Мордовия', budget2025: 34800 },
    ],
  },
  {
    id: 'cfo',
    name: 'Центральный федеральный округ',
    shortName: 'ЦФО',
    color: '#8b5cf6',
    icon: '🏛️',
    territories: [
      { id: 'moscow-city', name: 'Москва', budget2025: 350000 },
      { id: 'moscow-region', name: 'Московская область', budget2025: 180000 },
      { id: 'voronezh', name: 'Воронежская область', budget2025: 85000 },
      { id: 'yaroslavl', name: 'Ярославская область', budget2025: 65000 },
      { id: 'tula', name: 'Тульская область', budget2025: 60000 },
      { id: 'ryazan', name: 'Рязанская область', budget2025: 50000 },
      { id: 'belgorod', name: 'Белгородская область', budget2025: 48000 },
      { id: 'kaluga', name: 'Калужская область', budget2025: 42000 },
    ],
  },
  {
    id: 'szfo',
    name: 'Северо-Западный федеральный округ',
    shortName: 'СЗФО',
    color: '#3b82f6',
    icon: '⚓',
    territories: [
      { id: 'spb-city', name: 'Санкт-Петербург', budget2025: 280000 },
      { id: 'leningrad', name: 'Ленинградская область', budget2025: 95000 },
      { id: 'murmansk', name: 'Мурманская область', budget2025: 42000 },
      { id: 'arkhangelsk', name: 'Архангельская область', budget2025: 38000 },
      { id: 'kaliningrad', name: 'Калининградская область', budget2025: 35000 },
      { id: 'vologda', name: 'Вологодская область', budget2025: 32000 },
    ],
  },
  {
    id: 'ufo',
    name: 'Уральский федеральный округ',
    shortName: 'УФО',
    color: '#f59e0b',
    icon: '⛰️',
    territories: [
      { id: 'sverdlovsk', name: 'Свердловская область', budget2025: 145000 },
      { id: 'chelyabinsk', name: 'Челябинская область', budget2025: 120000 },
      { id: 'tyumen', name: 'Тюменская область', budget2025: 95000 },
      { id: 'khmao', name: 'Ханты-Мансийский АО', budget2025: 85000 },
      { id: 'kurgan', name: 'Курганская область', budget2025: 30000 },
    ],
  },
  {
    id: 'sfo',
    name: 'Сибирский федеральный округ',
    shortName: 'СФО',
    color: '#10b981',
    icon: '🌲',
    territories: [
      { id: 'krasnoyarsk', name: 'Красноярский край', budget2025: 110000 },
      { id: 'novosibirsk', name: 'Новосибирская область', budget2025: 105000 },
      { id: 'irkutsk', name: 'Иркутская область', budget2025: 85000 },
      { id: 'kemerovo', name: 'Кемеровская область', budget2025: 75000 },
      { id: 'omsk', name: 'Омская область', budget2025: 65000 },
      { id: 'tomsk', name: 'Томская область', budget2025: 42000 },
    ],
  },
  {
    id: 'yufo',
    name: 'Южный федеральный округ',
    shortName: 'ЮФО',
    color: '#ec4899',
    icon: '☀️',
    territories: [
      { id: 'krasnodar', name: 'Краснодарский край', budget2025: 165000 },
      { id: 'rostov', name: 'Ростовская область', budget2025: 125000 },
      { id: 'volgograd', name: 'Волгоградская область', budget2025: 80000 },
      { id: 'astrakhan', name: 'Астраханская область', budget2025: 38000 },
      { id: 'crimea', name: 'Республика Крым', budget2025: 55000 },
      { id: 'sevastopol', name: 'Севастополь', budget2025: 32000 },
    ],
  },
  {
    id: 'skfo',
    name: 'Северо-Кавказский федеральный округ',
    shortName: 'СКФО',
    color: '#ef4444',
    icon: '🏔️',
    territories: [
      { id: 'stavropol', name: 'Ставропольский край', budget2025: 72000 },
      { id: 'dagestan', name: 'Республика Дагестан', budget2025: 58000 },
      { id: 'north-ossetia', name: 'Республика Северная Осетия', budget2025: 28000 },
      { id: 'kabardino-balkaria', name: 'Кабардино-Балкарская Республика', budget2025: 25000 },
      { id: 'chechnya', name: 'Чеченская Республика', budget2025: 42000 },
    ],
  },
  {
    id: 'dfo',
    name: 'Дальневосточный федеральный округ',
    shortName: 'ДФО',
    color: '#14b8a6',
    icon: '🌅',
    territories: [
      { id: 'primorsky', name: 'Приморский край', budget2025: 95000 },
      { id: 'khabarovsk', name: 'Хабаровский край', budget2025: 72000 },
      { id: 'sakhalin', name: 'Сахалинская область', budget2025: 58000 },
      { id: 'amur', name: 'Амурская область', budget2025: 38000 },
      { id: 'kamchatka', name: 'Камчатский край', budget2025: 32000 },
      { id: 'yakutia', name: 'Республика Саха (Якутия)', budget2025: 55000 },
    ],
  },
];

FEDERAL_DISTRICTS.forEach(district => {
  district.totalBudget2025 = district.territories.reduce((sum, terr) => sum + terr.budget2025, 0);
});

export function getDistrictById(id: string): FederalDistrict | undefined {
  return FEDERAL_DISTRICTS.find(d => d.id === id);
}

export function getTerritoryById(territoryId: string): { district: FederalDistrict; territory: Territory } | undefined {
  for (const district of FEDERAL_DISTRICTS) {
    const territory = district.territories.find(t => t.id === territoryId);
    if (territory) return { district, territory };
  }
  return undefined;
}

export function getTotalRussiaBudget2025(): number {
  return FEDERAL_DISTRICTS.reduce((sum, district) => sum + (district.totalBudget2025 || 0), 0);
}

export function getFederalDistricts(): FederalDistrict[] {
  return FEDERAL_DISTRICTS;
}

export function getDistrictStats() {
  const total = getTotalRussiaBudget2025();
  return FEDERAL_DISTRICTS.map(district => ({
    ...district,
    share: ((district.totalBudget2025 || 0) / total) * 100,
    territoryCount: district.territories.length,
  }));
}
