import { MonthlyData, SeasonalData, Contragent, ProblemZone, ForecastComment, ABCCategory } from '../types';

export const salesData2024: MonthlyData[] = [
  { month: 'Янв', sales: 15000, name: 'Январь' },
  { month: 'Фев', sales: 14200, name: 'Февраль' },
  { month: 'Мар', sales: 16800, name: 'Март' },
  { month: 'Апр', sales: 15500, name: 'Апрель' },
  { month: 'Май', sales: 17200, name: 'Май' },
  { month: 'Июн', sales: 16100, name: 'Июнь' },
  { month: 'Июл', sales: 14800, name: 'Июль' },
  { month: 'Авг', sales: 15900, name: 'Август' },
  { month: 'Сен', sales: 17500, name: 'Сентябрь' },
  { month: 'Окт', sales: 18200, name: 'Октябрь' },
  { month: 'Ноя', sales: 19100, name: 'Ноябрь' },
  { month: 'Дек', sales: 20500, name: 'Декабрь' },
];

export const combinedData = salesData2024.map((d) => ({
  month: d.month,
  name: d.name,
  '2024': d.sales,
  '2025': Math.round(d.sales * 1.18),
  forecast2026: Math.round(d.sales * 1.35),
}));

export const topContragents: Contragent[] = [
  { name: 'ООО "ПУЛЬС КАЗАНЬ"', sales: 12500, sales2024: 8750, sales2025: 10625, group: 'Пульс', city: 'Казань', region: 'Татарстан', trend: 'up', change: 17.6 },
  { name: 'ООО "БСС"', sales: 11200, sales2024: 7840, sales2025: 9520, group: 'БСС', city: 'Казань', region: 'Татарстан', trend: 'up', change: 17.6 },
  { name: 'АО "АКСИОМА"', sales: 9800, sales2024: 8820, sales2025: 9310, group: null, city: 'Самара', region: 'Самарская обл.', trend: 'up', change: 5.3 },
  { name: 'ООО "ПРОТЕК"', sales: 8900, sales2024: 7120, sales2025: 8010, group: 'Протек', city: 'Казань', region: 'Татарстан', trend: 'up', change: 11.1 },
  { name: 'ООО "СЕЛЕНА"', sales: 7600, sales2024: 6080, sales2025: 6840, group: 'Вита', city: 'Н.Новгород', region: 'Нижегородская обл.', trend: 'up', change: 11.1 },
  { name: 'АО "ФАРМПЕРСПЕКТИВА"', sales: 6800, sales2024: 7480, sales2025: 7140, group: null, city: 'Самара', region: 'Самарская обл.', trend: 'down', change: -4.8 },
];

export const problemZones: ProblemZone[] = [
  { id: 1, type: 'critical', region: 'Республика Мордовия', metric: 'Выполнение плана', value: '84%', target: '100%', recommendation: 'Увеличить количество контрагентов' },
  { id: 2, type: 'warning', region: 'Кировская область', metric: 'Темп роста', value: '5.9%', target: '15%', recommendation: 'Активизировать работу с аптечными сетями' },
  { id: 3, type: 'warning', city: 'г. Тольятти', metric: 'Рост ниже среднего', value: '9.1%', target: '15%', recommendation: 'Провести анализ конкурентов' },
  { id: 4, type: 'critical', district: 'Приволжский р-н (Казань)', metric: 'Нулевой рост', value: '0%', target: '>5%', recommendation: 'Срочно выяснить причины стагнации' },
  { id: 5, type: 'info', contragent: 'АО "ФАРМПЕРСПЕКТИВА"', metric: 'Снижение', value: '-4.8%', target: '>0%', recommendation: 'Встреча с руководством' },
];

export const abcAnalysis: { regions: ABCCategory[] } = {
  regions: [
    { category: 'A', items: ['Самарская область', 'Республика Татарстан'], share: 56.3, color: '#10b981' },
    { category: 'B', items: ['Нижегородская область', 'Республика Мордовия'], share: 31.9, color: '#f59e0b' },
    { category: 'C', items: ['Кировская область', 'Чувашская Республика'], share: 11.8, color: '#ef4444' },
  ],
};

export const seasonalData: SeasonalData[] = [
  { month: 'Янв', index: 0.92 }, { month: 'Фев', index: 0.88 }, { month: 'Мар', index: 1.04 },
  { month: 'Апр', index: 0.96 }, { month: 'Май', index: 1.06 }, { month: 'Июн', index: 1.00 },
  { month: 'Июл', index: 0.92 }, { month: 'Авг', index: 0.98 }, { month: 'Сен', index: 1.08 },
  { month: 'Окт', index: 1.12 }, { month: 'Ноя', index: 1.18 }, { month: 'Дек', index: 1.27 },
];

export const forecastComments: ForecastComment[] = [
  { type: 'success', text: 'Прогнозируемый рост на 17.3% соответствует стратегическим целям компании' },
  { type: 'info', text: 'Сезонные колебания учтены в модели с точностью 91%' },
  { type: 'warning', text: 'Рекомендуется усилить активность в Кировской области для достижения целевых показателей' },
  { type: 'success', text: 'Тренд роста в Самарской и Нижегородской областях сохраняется' },
];
