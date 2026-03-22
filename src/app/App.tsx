import React, { useState, useCallback, useEffect, useMemo, startTransition, useRef } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  Upload, FileSpreadsheet, TrendingUp, TrendingDown, Map as MapIcon, Target, FileText, Building2,
  ChevronRight, ChevronLeft, Check, X, Plus, Download, Search, Calendar, RefreshCw, 
  ArrowUpRight, ArrowDownRight, BarChart3, MapPin, Users, Package, Zap,
  AlertTriangle, Award, Layers, Activity, Filter, ChevronDown, Eye, EyeOff, Printer, Mail,
  Home, Globe, AlertCircle, CheckCircle, XCircle, Info, ArrowLeft, Navigation,
  Settings, Database, Save, Edit2, Lock, Unlock, Pill, Box, Archive, User, LogOut, Menu, Trash2, Calculator, FolderOpen, Map as MapIcon2, Sun, Moon, DollarSign
} from 'lucide-react';
import loginImage from '../../attached_assets/Gemini_Generated_Image_b1t8s2b1t8s2b1t8_1768657214968.png';

import { SavedReport, UserProfile } from '../types';
import { Logo } from '../components/common';
import { CHART_COLORS, getPerformanceColor } from '../config/chartColors';
import { api, clearAuth, getAuthToken, uploadFileToServer, getFileProcessingStatus, getDatabaseStats, clearDatabaseData, type DatabaseStats, fetchTabData, fetchTabMetadata, type TabMetadata } from '../lib/api';
import { useTabData, invalidateTabCache } from '../hooks/useTabData';
import { parseFile, aggregateData, type ParsedData, type AggregatedData } from '../utils/fileParser';
import { MultiSelect, type MultiSelectOption } from './components/ui/multi-select';
import { WMRussiaApp } from './components/wm-russia/WMRussiaApp';
import { ThemeProvider } from '../contexts/ThemeContext';
import { DirectorDashboard } from './components/director/DirectorDashboard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useSharedData, MDLPSaleRecord } from '../context/SharedDataContext';
import { DrugPriceEntry, findDrugPrice, convertToMoney, formatMoney, formatMoneyFull, formatPackages, formatValue, convertTotal, convertDrugBreakdownToRubles, formatDual, calcRublesRatio } from '../lib/priceUtils';
import { wmMockUsers } from '../data/wmRussiaData';
import type { WMUser, WMUserRole } from '../types';

export default function MDLPAnalyzerPro() {
  const [activeTab, setActiveTab] = useState('upload');
  const [dbStatus, setDbStatus] = useState<string>('connected');
  const [dbMessage, setDbMessage] = useState<string>('');
  const [files, setFiles] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dataSavedByServer, setDataSavedByServer] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);
  
  // Toggle between MDLP, WM Russia, and Director modes
  const [appMode, setAppMode] = useState<'mdlp' | 'wm-russia' | 'director'>('mdlp');
  const [drugPrices, setDrugPrices] = useState<DrugPriceEntry[]>([]);
  
  // Shared data context for syncing between MDLP and WM Russia
  const { setMdlpData, wmRussiaData, wmRussiaSummary } = useSharedData();
  
  const [uploadedData, setUploadedData] = useState<AggregatedData | null>(null);
  const [rawParsedRows, setRawParsedRows] = useState<any[]>([]);
  const [contragentRows, setContragentRows] = useState<any[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [isLoadingDbStats, setIsLoadingDbStats] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isStoragePanelOpen, setIsStoragePanelOpen] = useState(false);
  
  const [selectedContractorGroups, setSelectedContractorGroups] = useState<string[]>([]);
  const [pcSelectedDrug, setPcSelectedDrug] = useState<string | null>(null);
  const [pcSortField, setPcSortField] = useState<string>('coefficient');
  const [pcSortAsc, setPcSortAsc] = useState(false);
  const [percapitaMode, setPercapitaMode] = useState<'percapita' | 'peremployee'>('percapita');
  const [teamMode, setTeamMode] = useState<'all' | 'tm_mp' | 'mp_only'>('all');
  const [perEmployeeData, setPerEmployeeData] = useState<any>(null);
  const [perEmployeeLoading, setPerEmployeeLoading] = useState(false);
  
  const [tabMetadata, setTabMetadata] = useState<TabMetadata | null>(null);
  const [tabData, setTabData] = useState<any>(null);
  const [tabDataLoading, setTabDataLoading] = useState(false);
  const tabDataCacheRef = useRef<Record<string, { data: any; key: string }>>({});
  const cachedDrugSalesRef = useRef<Array<{name: string; sales: number}>>([]);
  const prevTabFetchRef = useRef<string>('');

  const hasRealData = tabMetadata?.hasData || !!(uploadedData?.monthlySales?.length || uploadedData?.combinedData?.length || uploadedData?.contragentSales?.length);
  
  const salesData2024 = useMemo(() => {
    if (tabData?.monthlySales?.length) return tabData.monthlySales;
    return uploadedData?.monthlySales?.length ? uploadedData.monthlySales : [];
  }, [tabData?.monthlySales, uploadedData?.monthlySales]);

  const combinedDataRaw = useMemo(() => {
    const src = tabData?.combinedData?.length ? tabData.combinedData : (uploadedData?.combinedData?.length ? uploadedData.combinedData : []);
    console.log('combinedData:', JSON.stringify(src?.slice(0, 3)));
    return src;
  }, [tabData?.combinedData, uploadedData?.combinedData]);

  const topContragents = useMemo(() => {
    const source = tabData?.contragentSales || uploadedData?.contragentSales;
    if (!source?.length) return [];
    return [...source]
      .sort((a: any, b: any) => b.sales - a.sales)
      .map((c: any) => ({
        name: c.name, sales: c.sales,
        city: c.city || '', region: c.region || '',
        receiverType: c.receiverType || '', contractorGroup: c.contractorGroup || '',
        federalDistrict: c.federalDistrict || '', district: c.district || '',
        cityDistrict: c.cityDistrict || ''
      }));
  }, [tabData?.contragentSales, uploadedData?.contragentSales]);
  
  // Состояние для фильтрации и детализации контрагентов
  const [showContragentDetails, setShowContragentDetails] = useState(false);
  const [contragentSearchQuery, setContragentSearchQuery] = useState('');
  const [selectedReceiverTypes, setSelectedReceiverTypes] = useState<string[]>([]);
  const [selectedContragentCities, setSelectedContragentCities] = useState<string[]>([]);
  const [selectedContragentRegions, setSelectedContragentRegions] = useState<string[]>([]);
  const [selectedContragentFederalDistricts, setSelectedContragentFederalDistricts] = useState<string[]>([]);
  const [selectedContragentDistricts, setSelectedContragentDistricts] = useState<string[]>([]);
  const [selectedContragentCityDistricts, setSelectedContragentCityDistricts] = useState<string[]>([]);
  const [selectedDistrictForDrilldown, setSelectedDistrictForDrilldown] = useState<string | null>(null);
  const [selectedContractorGroupForDrilldown, setSelectedContractorGroupForDrilldown] = useState<string | null>(null);

  const [displayMode] = useState<'packages' | 'money'>('packages');
  const isMoney = false; // Always show both packages + rubles simultaneously

  const MoneySpan = useCallback(({ value }: { value: number | null }) => {
    if (value === null || isNaN(value as number)) return <span>—</span>;
    const short = formatMoney(value);
    const full = formatMoneyFull(value);
    return short !== full ? <span title={full}>{short}</span> : <span>{short}</span>;
  }, []);

  const fmtSales = useCallback((value: number, drugName?: string | null): React.ReactNode => {
    const pkgStr = value.toLocaleString('ru-RU') + ' уп.';
    if (!drugName) return pkgStr;
    const money = convertToMoney(value, drugName, drugPrices);
    if (money === null) return pkgStr;
    return (
      <span className="inline-flex items-center gap-1 flex-wrap">
        <span>{pkgStr}</span>
        <span className="text-emerald-600 text-[0.85em]">| <MoneySpan value={money} /></span>
      </span>
    );
  }, [drugPrices, MoneySpan]);

  const fmtTotal = useCallback((items: Array<{name: string; value: number}>): React.ReactNode => {
    const sum = items.reduce((s, i) => s + i.value, 0);
    const pkgStr = sum.toLocaleString('ru-RU') + ' уп.';
    const total = convertTotal(items, drugPrices);
    if (total === null) return pkgStr;
    return (
      <span className="inline-flex items-center gap-1 flex-wrap">
        <span>{pkgStr}</span>
        <span className="text-emerald-600 text-[0.85em]">| <MoneySpan value={total} /></span>
      </span>
    );
  }, [drugPrices, MoneySpan]);

  const salesValue = useCallback((count: number, _drugName?: string | null): number => {
    return count; // Charts always use packages as primary value
  }, []);

  const rublesRatio = useMemo(() => {
    const ds = tabData?.drugSales || uploadedData?.drugSales || cachedDrugSalesRef.current || [];
    if (ds.length > 0 && cachedDrugSalesRef.current.length === 0) {
      cachedDrugSalesRef.current = ds;
    }
    return calcRublesRatio(ds, drugPrices);
  }, [tabData?.drugSales, uploadedData?.drugSales, drugPrices]);

  const toRubles = useCallback((packages: number): number => {
    return packages; // Charts always use packages as primary axis
  }, []);

  const fmtValue = useCallback((packages: number): React.ReactNode => {
    const money = Math.round(packages * rublesRatio);
    return (
      <span className="inline-flex items-center gap-1 flex-wrap">
        <span>{packages.toLocaleString('ru-RU')} уп.</span>
        <span className="text-emerald-600 text-[0.85em]">| <MoneySpan value={money} /></span>
      </span>
    );
  }, [rublesRatio, MoneySpan]);

  const fmtValueStr = useCallback((packages: number): string => {
    const money = Math.round(packages * rublesRatio);
    return `${packages.toLocaleString('ru-RU')} уп. | ${formatMoney(money)}`;
  }, [rublesRatio]);

  const DisplayModeToggle = (
    <div className="flex items-center bg-gradient-to-r from-indigo-100 to-emerald-100 rounded-lg px-3 py-1.5 text-xs font-medium">
      <span className="text-indigo-700">Уп.</span>
      <span className="mx-1.5 text-slate-400">+</span>
      <span className="text-emerald-700">₽</span>
    </div>
  );

  const NoDataMessage = ({ title }: { title?: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <svg className="w-16 h-16 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-lg font-medium mb-2">{title || 'Для анализа нет данных'}</p>
      <p className="text-sm text-gray-500">Загрузите файл с данными в разделе "Загрузка файлов"</p>
    </div>
  );
  
  // Пользователь
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showUserSelect, setShowUserSelect] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerName, setRegisterName] = useState('');
  
  // Фильтры (массивы для мульти-выбора, пустой массив = все)
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedDisposalTypes, setSelectedDisposalTypes] = useState<string[]>([
    'Продажа',
    'Медицинское использование',
    'Выбытие через дистанционную торговлю',
    'Отпуск ЛП по документам',
    'Отпуск по льготному рецепту',
    'По причине уничтожения',
    'Выбытие по иным причинам',
    'Экспорт'
  ]);
  const [selectedFederalDistricts, setSelectedFederalDistricts] = useState<string[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // WM Russia навигация и фильтры
  const [wmSelectedDistrict, setWmSelectedDistrict] = useState<string | null>(null);
  const [wmSelectedProduct, setWmSelectedProduct] = useState<string | null>(null);
  const [wmSelectedYear, setWmSelectedYear] = useState<string>('Все');
  const [wmSelectedMonth, setWmSelectedMonth] = useState<string>('Все');
  const [wmMedrepDistrictFilter, setWmMedrepDistrictFilter] = useState<string>('Все');
  // Аккордеон для иерархического drill-down
  const [wmExpandedRegions, setWmExpandedRegions] = useState<Set<string>>(new Set());
  const [wmExpandedCities, setWmExpandedCities] = useState<Set<string>>(new Set());
  const [wmShowDrugsFor, setWmShowDrugsFor] = useState<string | null>(null);
  
  // Calculator state
  const [calcCurrentBudget, setCalcCurrentBudget] = useState<number>(3000000000);
  const [calcGrowthPercent, setCalcGrowthPercent] = useState<number>(15);
  const [calcDrugRows, setCalcDrugRows] = useState<Array<{
    id: string;
    name: string;
    pricePerUnit: number;
    quantity: number;
  }>>([
    { id: '1', name: 'Апфекто капли', pricePerUnit: 650, quantity: 0 },
    { id: '2', name: 'Артоксан гель', pricePerUnit: 420, quantity: 0 },
    { id: '3', name: 'Артоксан лиофилизат', pricePerUnit: 850, quantity: 0 },
    { id: '4', name: 'Артоксан таблетки', pricePerUnit: 380, quantity: 0 },
    { id: '5', name: 'Дорамитцин ВМ', pricePerUnit: 720, quantity: 0 },
    { id: '6', name: 'Драстоп адванс', pricePerUnit: 560, quantity: 0 },
    { id: '7', name: 'Клодифен Нейро', pricePerUnit: 490, quantity: 0 },
    { id: '8', name: 'Кокарнит лиофилизат', pricePerUnit: 1200, quantity: 0 },
    { id: '9', name: 'Лименда суппозитории', pricePerUnit: 340, quantity: 0 },
    { id: '10', name: 'Орцепол ВМ', pricePerUnit: 280, quantity: 0 },
    { id: '11', name: 'Роноцит раствор', pricePerUnit: 950, quantity: 0 },
    { id: '12', name: 'Секнидокс таблетки', pricePerUnit: 320, quantity: 0 },
  ]);
  const [calcDistrictShares, setCalcDistrictShares] = useState<Record<string, number>>({
    'ЦФО': 25, 'СЗФО': 12, 'ЮФО': 10, 'СКФО': 6, 
    'ПФО': 18, 'УФО': 10, 'СФО': 12, 'ДФО': 7
  });
  const [calcScenarios, setCalcScenarios] = useState<Array<{
    id: string;
    name: string;
    date: string;
    budget: number;
    growth: number;
    drugs: typeof calcDrugRows;
    districts: typeof calcDistrictShares;
  }>>([]);
  const [calcScenarioName, setCalcScenarioName] = useState<string>('');
  const [calcActiveDistrict, setCalcActiveDistrict] = useState<string | null>(null);
  const [calcDarkMode, setCalcDarkMode] = useState<boolean>(false);
  
  const drugsList = useMemo(() => tabMetadata?.drugs || uploadedData?.drugs || [], [tabMetadata?.drugs, uploadedData?.drugs]);
  const drugAnalytics = useMemo(() => tabData?.drugAnalytics || uploadedData?.drugAnalytics || {}, [tabData?.drugAnalytics, uploadedData?.drugAnalytics]);
  const contragentAnalytics = useMemo(() => tabData?.contragentAnalytics || uploadedData?.contragentAnalytics || {}, [tabData?.contragentAnalytics, uploadedData?.contragentAnalytics]);
  const territoryHierarchy = useMemo(() => tabData?.territoryHierarchy || uploadedData?.territoryHierarchy || { federalDistricts: {}, regions: {}, cities: {}, districts: {} }, [tabData?.territoryHierarchy, uploadedData?.territoryHierarchy]);
  const availableYears = useMemo(() => tabMetadata?.years || uploadedData?.years || [], [tabMetadata?.years, uploadedData?.years]);
  const regionsList = useMemo(() => tabMetadata?.regions || uploadedData?.regionSales?.map(r => r.name) || [], [tabMetadata?.regions, uploadedData?.regionSales]);
  
  // Список регионов для настройки территорий (из данных или стандартный список РФ)
  const defaultRussianRegions = [
    'г. Москва', 'Московская область', 'г. Санкт-Петербург', 'Ленинградская область',
    'Республика Башкортостан', 'Пермский край', 'Оренбургская область',
    'Республика Татарстан', 'Самарская область', 'Саратовская область', 'Нижегородская область',
    'Ульяновская область', 'Пензенская область', 'Кировская область', 'Республика Марий Эл',
    'Республика Мордовия', 'Чувашская Республика', 'Удмуртская Республика',
    'Ростовская область', 'Краснодарский край', 'Республика Адыгея', 
    'Ставропольский край', 'Республика Дагестан',
    'Кабардино-Балкарская Республика', 'Карачаево-Черкесская Республика', 
    'Республика Северная Осетия - Алания', 'Чеченская Республика', 'Республика Ингушетия',
    'Республика Крым', 'г. Севастополь',
    'Белгородская область', 'Брянская область', 'Владимирская область', 'Воронежская область',
    'Ивановская область', 'Калужская область', 'Костромская область', 'Курская область',
    'Липецкая область', 'Орловская область', 'Рязанская область', 'Смоленская область',
    'Тамбовская область', 'Тверская область', 'Тульская область', 'Ярославская область',
    'Архангельская область', 'Вологодская область', 'Калининградская область',
    'Мурманская область', 'Новгородская область', 'Псковская область', 'Республика Карелия', 'Республика Коми',
    'Свердловская область', 'Челябинская область', 'Тюменская область', 'Курганская область',
    'Ханты-Мансийский автономный округ - Югра', 'Ямало-Ненецкий автономный округ',
    'Новосибирская область', 'Омская область', 'Томская область', 'Кемеровская область',
    'Алтайский край', 'Республика Алтай', 'Красноярский край', 'Иркутская область',
    'Забайкальский край', 'Республика Бурятия', 'Республика Тыва', 'Республика Хакасия',
    'Приморский край', 'Хабаровский край', 'Амурская область', 'Сахалинская область',
    'Еврейская автономная область', 'Камчатский край', 'Магаданская область', 'Чукотский автономный округ', 'Республика Саха (Якутия)',
    'Волгоградская область', 'Астраханская область', 'Республика Калмыкия'
  ];
  const allRegions = useMemo(() => regionsList.length > 0 ? regionsList : defaultRussianRegions, [regionsList]);
  
  // Нормализация названий регионов для гибкого сопоставления
  const normalizeRegionName = (name: string): string => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[.,\-—–()]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^г\s+/g, '')
      .replace(/\s+обл\s*/g, ' область ')
      .replace(/\s+респ\s*/g, ' республика ')
      .replace(/^респ\s+/g, 'республика ')
      .replace(/\s+авт\s+окр\s*/g, ' автономный округ ')
      .replace(/\s+а\s+о\s*/g, ' автономный округ ')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  // Извлечение ключевого слова из названия региона (для сопоставления)
  const extractRegionKeyword = (name: string): string => {
    const norm = normalizeRegionName(name);
    return norm
      .replace(/область|край|республика|автономный округ|автономная область/g, '')
      .trim()
      .split(' ')[0] || norm;
  };
  
  // Словарь синонимов регионов (все варианты в нижнем регистре)
  const regionSynonyms: Record<string, string[]> = {
    'москва': ['москва', 'г москва', 'мск', 'moscow'],
    'московская область': ['московская область', 'моск обл', 'мо', 'подмосковье', 'московская'],
    'санкт петербург': ['санкт петербург', 'г санкт петербург', 'спб', 'питер', 'петербург'],
    'ленинградская область': ['ленинградская область', 'лен обл', 'ло', 'ленинградская'],
    'республика татарстан': ['республика татарстан', 'татарстан', 'рт'],
    'республика башкортостан': ['республика башкортостан', 'башкортостан', 'башкирия', 'рб'],
    'самарская область': ['самарская область', 'самарск обл', 'самара', 'самарская'],
    'нижегородская область': ['нижегородская область', 'нижегор обл', 'нижний новгород', 'нижегородская'],
    'свердловская область': ['свердловская область', 'свердл обл', 'екатеринбург', 'свердловская'],
    'челябинская область': ['челябинская область', 'челяб обл', 'челябинск', 'челябинская'],
    'ростовская область': ['ростовская область', 'ростов обл', 'ростов', 'ростовская'],
    'краснодарский край': ['краснодарский край', 'краснодар край', 'кубань', 'краснодар', 'краснодарский'],
    'новосибирская область': ['новосибирская область', 'новосиб обл', 'новосибирск', 'новосибирская'],
    'пермский край': ['пермский край', 'пермь', 'перм край', 'пермский'],
    'волгоградская область': ['волгоградская область', 'волгогр обл', 'волгоград', 'волгоградская'],
    'саратовская область': ['саратовская область', 'сарат обл', 'саратов', 'саратовская'],
    'воронежская область': ['воронежская область', 'ворон обл', 'воронеж', 'воронежская'],
    'красноярский край': ['красноярский край', 'красноярск', 'краснояр край', 'красноярский'],
    'омская область': ['омская область', 'омск обл', 'омск', 'омская'],
    'ханты мансийский автономный округ': ['ханты мансийский автономный округ', 'хмао', 'югра', 'ханты мансийск', 'ханты мансийский'],
    'ямало ненецкий автономный округ': ['ямало ненецкий автономный округ', 'янао', 'ямало ненецкий'],
    'республика крым': ['республика крым', 'крым'],
    'севастополь': ['севастополь', 'г севастополь'],
    'тюменская область': ['тюменская область', 'тюмень', 'тюмен обл', 'тюменская'],
    'иркутская область': ['иркутская область', 'иркутск', 'иркут обл', 'иркутская'],
    'кемеровская область': ['кемеровская область', 'кузбасс', 'кемерово', 'кемеров обл', 'кемеровская'],
    'республика дагестан': ['республика дагестан', 'дагестан'],
    'ставропольский край': ['ставропольский край', 'ставрополь', 'ставроп край', 'ставропольский'],
    'оренбургская область': ['оренбургская область', 'оренбург', 'оренб обл', 'оренбургская'],
    'ульяновская область': ['ульяновская область', 'ульяновск', 'ульян обл', 'ульяновская'],
    'пензенская область': ['пензенская область', 'пенза', 'пенз обл', 'пензенская'],
    'кировская область': ['кировская область', 'киров', 'киров обл', 'кировская'],
    'астраханская область': ['астраханская область', 'астрахань', 'астрах обл', 'астраханская'],
    'республика калмыкия': ['республика калмыкия', 'калмыкия'],
    'республика марий эл': ['республика марий эл', 'марий эл'],
    'республика мордовия': ['республика мордовия', 'мордовия'],
    'удмуртская республика': ['удмуртская республика', 'удмуртия'],
    'чувашская республика': ['чувашская республика', 'чувашия'],
  };
  
  // Функция проверки совпадения региона (гибкое сопоставление)
  const matchesRegion = (managerRegion: string, dataRegion: string): boolean => {
    if (!managerRegion || !dataRegion) return false;
    
    const normManager = normalizeRegionName(managerRegion);
    const normData = normalizeRegionName(dataRegion);
    
    // Прямое совпадение после нормализации
    if (normManager === normData) return true;
    
    // Частичное совпадение (один содержит другой)
    if (normManager.length > 3 && normData.length > 3) {
      if (normManager.includes(normData) || normData.includes(normManager)) return true;
    }
    
    // Совпадение по ключевому слову (первое значимое слово)
    const keywordManager = extractRegionKeyword(managerRegion);
    const keywordData = extractRegionKeyword(dataRegion);
    if (keywordManager.length > 3 && keywordData.length > 3 && keywordManager === keywordData) return true;
    
    // Проверка через синонимы - нормализуем все варианты и сравниваем
    for (const synonyms of Object.values(regionSynonyms)) {
      const normalizedSynonyms = synonyms.map(s => normalizeRegionName(s));
      const managerInGroup = normalizedSynonyms.some(s => 
        s === normManager || 
        (s.length > 3 && normManager.length > 3 && (s.includes(normManager) || normManager.includes(s))) ||
        synonyms.some(orig => orig.toLowerCase() === normManager)
      );
      const dataInGroup = normalizedSynonyms.some(s => 
        s === normData || 
        (s.length > 3 && normData.length > 3 && (s.includes(normData) || normData.includes(s))) ||
        synonyms.some(orig => orig.toLowerCase() === normData)
      );
      if (managerInGroup && dataInGroup) return true;
    }
    
    return false;
  };
  
  const defaultManagerTerritories: Record<string, string[]> = {
    'Оруджов Али': ['Московская область', 'Москва', 'г. Москва', 'Республика Башкортостан', 'Пермский край', 'Оренбургская область'],
    'Самадова Лейла': ['Белгородская область', 'Брянская область', 'Владимирская область', 'Воронежская область', 'Ивановская область', 'Калужская область', 'Костромская область', 'Курская область', 'Липецкая область', 'Орловская область', 'Рязанская область', 'Смоленская область', 'Тамбовская область', 'Тверская область', 'Тульская область', 'Ярославская область', 'Республика Карелия', 'Республика Коми', 'Архангельская область', 'Вологодская область', 'Калининградская область', 'Ленинградская область', 'Мурманская область', 'Новгородская область', 'Псковская область', 'Санкт-Петербург', 'г. Санкт-Петербург', 'Ненецкий автономный округ'],
    'Мильченко Михаил': ['Республика Саха (Якутия)', 'Камчатский край', 'Приморский край', 'Хабаровский край', 'Амурская область', 'Магаданская область', 'Сахалинская область', 'Еврейская автономная область', 'Чукотский автономный округ', 'Республика Алтай', 'Республика Бурятия', 'Республика Тыва', 'Республика Хакасия', 'Алтайский край', 'Забайкальский край', 'Красноярский край', 'Иркутская область', 'Кемеровская область', 'Новосибирская область', 'Омская область', 'Томская область'],
    'Сонин Сергей': ['Республика Марий Эл', 'Республика Мордовия', 'Республика Татарстан', 'Удмуртская Республика', 'Чувашская Республика', 'Кировская область', 'Нижегородская область', 'Пензенская область', 'Самарская область', 'Саратовская область', 'Ульяновская область'],
    'Тагиева Самира': ['Курганская область', 'Свердловская область', 'Тюменская область', 'Челябинская область', 'Ханты-Мансийский автономный округ', 'Ханты-Мансийский автономный округ — Югра', 'Ямало-Ненецкий автономный округ'],
    'Аббасов Эльмир': ['Республика Адыгея', 'Краснодарский край', 'Ростовская область', 'Республика Дагестан', 'Республика Ингушетия', 'Кабардино-Балкарская Республика', 'Карачаево-Черкесская Республика', 'Республика Северная Осетия — Алания', 'Республика Северная Осетия - Алания', 'Чеченская Республика', 'Ставропольский край'],
    'Штефанова Оксана': ['Республика Калмыкия', 'Астраханская область', 'Волгоградская область'],
    'Гусейн У.': ['Республика Крым', 'Севастополь', 'г. Севастополь'],
  };
  const managersList = Object.keys(defaultManagerTerritories);
  
  const disposalTypeSales = useMemo(() => tabData?.disposalTypeSales || uploadedData?.disposalTypeSales || [], [tabData?.disposalTypeSales, uploadedData?.disposalTypeSales]);
  const federalDistrictSales = useMemo(() => tabData?.federalDistrictSales || uploadedData?.federalDistrictSales || [], [tabData?.federalDistrictSales, uploadedData?.federalDistrictSales]);
  const receiverTypeSales = useMemo(() => tabData?.receiverTypeSales || uploadedData?.receiverTypeSales || [], [tabData?.receiverTypeSales, uploadedData?.receiverTypeSales]);
  const federalDistrictsList = useMemo(() => tabMetadata?.federalDistricts || [...new Set(federalDistrictSales.map(fd => fd.name).filter(Boolean))].sort(), [tabMetadata?.federalDistricts, federalDistrictSales]);
  
  const contractorGroupsList = useMemo(() => {
    if (tabData?.contractorGroupNames?.length) return tabData.contractorGroupNames;
    if (tabMetadata?.contractorGroups?.length) return tabMetadata.contractorGroups;
    const groups = new Set<string>();
    rawParsedRows.forEach(row => {
      if (row.contractorGroup) {
        const cleaned = row.contractorGroup.replace(/^\['|'\]$/g, '').replace(/^"|"$/g, '').trim();
        if (cleaned && cleaned !== '[NULL]' && cleaned !== 'NULL') {
          groups.add(cleaned);
        }
      }
    });
    uploadedData?.contragentSales?.forEach((c: any) => {
      if (c.contractorGroup) {
        const cleaned = c.contractorGroup.replace(/^\['|'\]$/g, '').replace(/^"|"$/g, '').trim();
        if (cleaned && cleaned !== '[NULL]' && cleaned !== 'NULL') {
          groups.add(cleaned);
        }
      }
    });
    return Array.from(groups).sort();
  }, [rawParsedRows, uploadedData?.contragentSales, tabData?.contractorGroupNames, tabMetadata?.contractorGroups]);

  // WM Russia constants and memoized data
  const wmProductsList = [
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
  const wmMonths = ['Все', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const monthFullToShort: Record<string, string> = {
    'Январь': 'Янв', 'Февраль': 'Фев', 'Март': 'Мар', 'Апрель': 'Апр',
    'Май': 'Май', 'Июнь': 'Июн', 'Июль': 'Июл', 'Август': 'Авг',
    'Сентябрь': 'Сен', 'Октябрь': 'Окт', 'Ноябрь': 'Ноя', 'Декабрь': 'Дек'
  };

  const isWmTab = activeTab.startsWith('wm-');

  const filteredWmData = useMemo(() => {
    if (!isWmTab) return [];
    if (tabData?.hasData) return [{ _server: true }];
    return [];
  }, [isWmTab, tabData?.hasData]);

  const wmStats = useMemo(() => {
    const emptyStats = { totalPackages: 0, uniqueDrugs: 0, uniqueRegions: 0, uniqueContragents: 0, byDistrict: {} as Record<string, { packages: number; regions: Set<string> }>, byDrug: {} as Record<string, number> };
    if (!isWmTab) return emptyStats;
    if (tabData?.hasData && activeTab === 'wm-dashboard') {
      const byDistrict: Record<string, { packages: number; regions: { size: number } }> = {};
      (tabData.byDistrict || []).forEach((d: any) => {
        byDistrict[d.name] = { packages: d.packages, regions: { size: Array.isArray(d.regions) ? d.regions.length : (d.regions || 0) } };
      });
      const byDrug: Record<string, number> = {};
      (tabData.byDrug || []).forEach((d: any) => { byDrug[d.name] = d.packages; });
      return {
        totalPackages: tabData.totalPackages || 0,
        uniqueDrugs: (tabData.byDrug || []).length,
        uniqueRegions: tabData.totalRegions || 0,
        uniqueContragents: tabData.totalContragents || 0,
        byDistrict,
        byDrug,
      };
    }
    return emptyStats;
  }, [filteredWmData, isWmTab, tabData, activeTab]);

  const wmDistrictStats = useMemo(() => {
    if (activeTab !== 'wm-districts') return { filteredData: [] as any[], stats: {} as any };
    if (tabData?.hasData && tabData.stats) {
      return { filteredData: [{ _server: true }], stats: tabData.stats };
    }
    return { filteredData: [], stats: {} };
  }, [activeTab, tabData]);

  const wmProductStats = useMemo(() => {
    if (activeTab !== 'wm-products') return { filteredData: [] as any[], stats: {} as any };
    if (tabData?.hasData && tabData.byProduct) {
      const stats: Record<string, { packages: number; districts: Record<string, number>; contragents: { size: number } }> = {};
      tabData.byProduct.forEach((p: any) => {
        const districts: Record<string, number> = {};
        (p.districts || []).forEach((d: any) => { districts[d.name] = d.packages; });
        stats[p.name] = { packages: p.packages, districts, contragents: { size: p.contragents || 0 } };
      });
      return { filteredData: [{ _server: true }], stats };
    }
    return { filteredData: [], stats: {} };
  }, [activeTab, tabData]);

  const wmContragentStats = useMemo(() => {
    if (!isWmTab) return { filteredData: [] as any[], stats: {} as any, sortedContragents: [] as any[], districtsSet: new Set<string>() };
    if (tabData?.hasData && tabData.byDistrict) {
      const districtsSet = new Set<string>();
      tabData.byDistrict.forEach((d: any) => districtsSet.add(d.name));
      return { filteredData: [{ _server: true }], stats: {}, sortedContragents: [], districtsSet };
    }
    return { filteredData: [], stats: {}, sortedContragents: [], districtsSet: new Set<string>() };
  }, [isWmTab, tabData]);

  const TAB_TO_ENDPOINT: Record<string, string> = {
    'dashboard': 'dashboard', 'territory': 'territories', 'drilldown': 'drilldown',
    'contragents': 'contragents', 'forecast': 'forecast', 'seasonal': 'seasonal',
    'abc': 'abc', 'compare': 'compare', 'problems': 'problems', 'reports': 'reports',
    'wm-dashboard': 'wm-dashboard', 'wm-districts': 'wm-districts', 'wm-products': 'wm-products',
    'datamanager': 'dashboard', 'percapita': 'percapita', 'peremployee': 'peremployee',
  };

  const selectedFiltersKey = useMemo(() => JSON.stringify({
    drugs: selectedDrugs, regions: selectedRegions, years: selectedYears,
    disposalTypes: selectedDisposalTypes, federalDistricts: selectedFederalDistricts,
    contractorGroups: selectedContractorGroups, managers: selectedManagers,
  }), [selectedDrugs, selectedRegions, selectedYears, selectedDisposalTypes, selectedFederalDistricts, selectedContractorGroups, selectedManagers]);

  const isFetchingTabRef = useRef(false);
  const tabFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        setDbStatus(data.status);
        setDbMessage(data.message || '');
      } catch {
        setDbStatus('error');
        setDbMessage('Сервер недоступен');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const endpoint = TAB_TO_ENDPOINT[activeTab];
    if (!endpoint || !dataLoaded) return;
    const wmKey = isWmTab ? `:${wmSelectedYear}:${wmSelectedMonth}:${wmSelectedDistrict}:${wmSelectedProduct}` : '';
    const fetchKey = `${endpoint}:${selectedFiltersKey}${wmKey}`;
    if (prevTabFetchRef.current === fetchKey) return;

    const cached = tabDataCacheRef.current[endpoint];
    if (cached && cached.key === fetchKey) {
      setTabData(cached.data);
      prevTabFetchRef.current = fetchKey;
      return;
    }

    if (tabFetchTimerRef.current) clearTimeout(tabFetchTimerRef.current);

    prevTabFetchRef.current = fetchKey;

    tabFetchTimerRef.current = setTimeout(() => {
      if (isFetchingTabRef.current) return;
      isFetchingTabRef.current = true;
      setTabDataLoading(true);

      const params: Record<string, any> = {};
      if (selectedDrugs.length > 0) params.drugs = selectedDrugs;
      if (selectedRegions.length > 0) params.regions = selectedRegions;
      if (selectedYears.length > 0) params.years = selectedYears;
      if (selectedDisposalTypes.length > 0 && selectedDisposalTypes.length < defaultDisposalTypes.length) params.disposalTypes = selectedDisposalTypes;
      if (selectedFederalDistricts.length > 0) params.federalDistricts = selectedFederalDistricts;
      if (selectedContractorGroups.length > 0) params.contractorGroups = selectedContractorGroups;
      if (selectedManagers.length > 0) {
        const mgrRegions = getManagerRegions(selectedManagers);
        if (mgrRegions.length > 0) params.managerRegions = mgrRegions;
      }
      if (isWmTab) {
        params.wmYear = wmSelectedYear;
        params.wmMonth = wmSelectedMonth;
        if (activeTab === 'wm-districts') params.wmDistrict = wmSelectedDistrict || '';
        if (activeTab === 'wm-products') params.wmProduct = wmSelectedProduct || '';
      }

      console.log('[DisposalFilter]', {
        selected: selectedDisposalTypes.length,
        default: defaultDisposalTypes.length,
        willSend: selectedDisposalTypes.length > 0 && selectedDisposalTypes.length < defaultDisposalTypes.length,
        selectedTypes: selectedDisposalTypes,
        paramsDisposalTypes: params.disposalTypes,
        endpoint,
      });

      fetchTabData(endpoint, params)
        .then(async (result) => {
          if (endpoint === 'drilldown') {
            const totalSales = (result?.regionSales || []).reduce((s: number, r: any) => s + (r.sales || 0), 0);
            console.log(`[Drilldown] API response: regionSales=${(result?.regionSales || []).length}, totalSales=${totalSales}, contragents=${(result?.contragentSales || []).length}, years_filter=${JSON.stringify(params.years || 'all')}`);
          }
          setTabData(result);
          tabDataCacheRef.current[endpoint] = { data: result, key: fetchKey };
          if (result?.drugSales?.length > 0) {
            cachedDrugSalesRef.current = result.drugSales;
          }
          if (endpoint === 'dashboard' && result?.combinedData?.length > 0) {
            const allZero = result.combinedData.every((c: any) => {
              const yearKeys = Object.keys(c).filter(k => /^\d{4}$/.test(k));
              return yearKeys.every(k => !c[k] || c[k] === 0);
            });
            const hasMonthly = result?.monthlySales?.some((m: any) => m.sales > 0);
            if (allZero) {
              console.log('combinedData все нули, запускаем пересчёт агрегации...');
              try {
                const reaggResult = await api.reaggregate();
                console.log('Пересчёт завершён:', reaggResult);
                tabDataCacheRef.current = {};
                prevTabFetchRef.current = '';
                const freshData = await fetchTabData(endpoint, params);
                setTabData(freshData);
                tabDataCacheRef.current[endpoint] = { data: freshData, key: fetchKey };
              } catch (e) {
                console.warn('Ошибка пересчёта агрегации:', e);
              }
            }
          }
        })
        .catch(err => {
          console.warn('Tab data fetch error:', err);
          prevTabFetchRef.current = '';
        })
        .finally(() => {
          isFetchingTabRef.current = false;
          setTabDataLoading(false);
        });
    }, 50);

    return () => {
      if (tabFetchTimerRef.current) clearTimeout(tabFetchTimerRef.current);
    };
  }, [activeTab, dataLoaded, selectedFiltersKey, isWmTab, wmSelectedYear, wmSelectedMonth, wmSelectedDistrict, wmSelectedProduct]);
  
  useEffect(() => {
    if (activeTab !== 'percapita' || percapitaMode !== 'peremployee' || !dataLoaded) return;
    setPerEmployeeLoading(true);
    const params: Record<string, any> = { teamMode };
    if (selectedDrugs.length > 0) params.drugs = selectedDrugs;
    if (selectedRegions.length > 0) params.regions = selectedRegions;
    if (selectedYears.length > 0) params.years = selectedYears;
    if (selectedDisposalTypes.length > 0 && selectedDisposalTypes.length < defaultDisposalTypes.length) params.disposalTypes = selectedDisposalTypes;
    if (selectedFederalDistricts.length > 0) params.federalDistricts = selectedFederalDistricts;
    if (selectedContractorGroups.length > 0) params.contractorGroups = selectedContractorGroups;
    if (selectedManagers.length > 0) {
      const mgrRegions = getManagerRegions(selectedManagers);
      if (mgrRegions.length > 0) params.managerRegions = mgrRegions;
    }
    fetchTabData('peremployee', params)
      .then((result) => { setPerEmployeeData(result); })
      .catch(err => console.warn('peremployee fetch error:', err))
      .finally(() => setPerEmployeeLoading(false));
  }, [activeTab, percapitaMode, teamMode, dataLoaded, selectedFiltersKey]);

  // AI-генерация комментариев
  const [aiComment, setAiComment] = useState<string | null>(null);
  const [aiCommentLoading, setAiCommentLoading] = useState(false);
  const [aiCommentError, setAiCommentError] = useState<string | null>(null);
  
  // Навигация по территориям
  const [territoryPath, setTerritoryPath] = useState([]);
  const [navHistory, setNavHistory] = useState([]);

  // Управление данными и планами
  const [savedPlans, setSavedPlans] = useState<Record<string, number>>({});
  const [drugPlans, setDrugPlans] = useState<Record<string, number>>({});
  const [historicalDataLocked, setHistoricalDataLocked] = useState<Record<string, boolean>>({ '2024': true, '2025': true });
  const [savedHistoricalData, setSavedHistoricalData] = useState({});
  const [dataManagerTab, setDataManagerTab] = useState(0); // 0 - Понедельный анализ, 1 - Планы по регионам, 2 - Планы по препаратам, 3 - Экспорт/Импорт, 4 - История загрузок, 5 - Маппинг колонок, 6 - Территории РМ
  const [uploadHistoryList, setUploadHistoryList] = useState<Array<{
    id: number;
    userId: number;
    uploadId: string;
    filename: string;
    status: string;
    rowsCount: number | null;
    yearPeriod: number | null;
    monthPeriod: string | null;
    isActive: boolean;
    errorMessage: string | null;
    uploadedAt: string;
  }>>([]);
  
  // Маппинг колонок
  const [columnMappings, setColumnMappings] = useState<Array<{
    id: number;
    profileName: string;
    isDefault: boolean;
    mappings: Record<string, string>;
  }>>([]);
  const [editingMapping, setEditingMapping] = useState<{
    id?: number;
    profileName: string;
    isDefault: boolean;
    mappings: Record<string, string>;
  } | null>(null);
  const [selectedMappingId, setSelectedMappingId] = useState<number | null>(null);
  
  // Территории РМ
  const [salesRepTerritories, setSalesRepTerritories] = useState<Array<{
    id: number;
    name: string;
    regions: string[];
    sortOrder: number;
  }>>([]);
  const [editingTerritory, setEditingTerritory] = useState<{
    id?: number;
    name: string;
    regions: string[];
  } | null>(null);
  const [managerTerritories, setManagerTerritories] = useState<Record<string, string[]>>(() => ({ ...defaultManagerTerritories }));
  const [editingManager, setEditingManager] = useState<string | null>(null);
  const [compareTab, setCompareTab] = useState(0); // 0 - Год к году, 1 - Кварталы, 2 - Месяцы
  const [showPlanEditDialog, setShowPlanEditDialog] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [reportPreviewData, setReportPreviewData] = useState<{ title: string; data: any[]; columns: string[] } | null>(null);
  
  // Понедельный анализ - хранение данных за прошлую неделю для сравнения
  const [previousWeekData, setPreviousWeekData] = useState<Record<string, number>>({});
  const [currentWeekData, setCurrentWeekData] = useState<Record<string, number>>({});
  const [lastUploadDate, setLastUploadDate] = useState<string | null>(null);
  const [weeklyAnalysisMonth, setWeeklyAnalysisMonth] = useState<string>('Январь');
  const [weeklyAnalysisYear, setWeeklyAnalysisYear] = useState<number>(2026);
  
  // Refs для доступа к актуальным значениям в callback
  const currentWeekDataRef = React.useRef<Record<string, number>>({});
  const lastUploadDateRef = React.useRef<string | null>(null);
  const rawParsedRowsRef = React.useRef<any[]>([]);
  
  // Синхронизируем refs со state
  React.useEffect(() => {
    currentWeekDataRef.current = currentWeekData;
  }, [currentWeekData]);
  
  React.useEffect(() => {
    lastUploadDateRef.current = lastUploadDate;
  }, [lastUploadDate]);
  
  React.useEffect(() => {
    rawParsedRowsRef.current = rawParsedRows;
  }, [rawParsedRows]);

  useEffect(() => {
    setChartsReady(false);
    const timer = setTimeout(() => setChartsReady(true), 150);
    return () => clearTimeout(timer);
  }, [activeTab, dataLoaded]);

  // Архив отчетов
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [showSaveReportDialog, setShowSaveReportDialog] = useState(false);
  const [reportName, setReportName] = useState('');
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);
  const [previewDataMap, setPreviewDataMap] = useState<Record<string, any>>({});
  const [previewLoadingMap, setPreviewLoadingMap] = useState<Record<string, boolean>>({});

  // Загрузка сохранённых данных при старте
  useEffect(() => {
    // Все данные теперь загружаются из API при авторизации в loadSavedYearlyDataOnStartup
    
    // Проверяем наличие токена и сохранённого пользователя
    const savedUser = localStorage.getItem('mdlp_user');
    const token = getAuthToken();
    
    if (savedUser && token) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setShowUserSelect(false);
      
      loadSavedYearlyDataOnStartup(user.id);
    } else {
      // Совместимость со старым ключом
      const legacyUser = localStorage.getItem('mdlp_current_user');
      if (legacyUser) {
        localStorage.removeItem('mdlp_current_user');
      }
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      api.drugPrices.getAll().then(prices => setDrugPrices(prices)).catch(e => console.error('[DrugPrices] Ошибка загрузки:', e));
    }
  }, [currentUser]);
  
  const startupLoadingRef = useRef(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  const loadCompactRowsInBackground = async (userId: string, hasSalesData: boolean) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      
      try {
        const { rows: savedRows, contragentRows: savedContragentRows } = await api.yearlyData.getRawRows(userId);
        clearTimeout(timeout);
        
        if (savedRows && Array.isArray(savedRows) && savedRows.length > 0) {
          rawParsedRowsRef.current = savedRows;
          startTransition(() => {
            setRawParsedRows(savedRows);
          });
          console.log(`Восстановлены compact rows: ${savedRows.length} строк`);
        } else if (hasSalesData) {
          console.log('Compact rows отсутствуют, запуск автоматического пересоздания...');
          try {
            const rebuildController = new AbortController();
            const rebuildTimeout = setTimeout(() => rebuildController.abort(), 30000);
            const rebuildResult = await fetch('/api/database/rebuild-compact-rows', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              signal: rebuildController.signal,
            });
            clearTimeout(rebuildTimeout);
            if (rebuildResult.ok) {
              const rebuildData = await rebuildResult.json();
              console.log(`Compact rows пересозданы: ${rebuildData.compactRows} строк, ${rebuildData.contragentRows} контрагентов`);
              const { rows: rebuiltRows, contragentRows: rebuiltContragentRows } = await api.yearlyData.getRawRows(userId);
              if (rebuiltRows && rebuiltRows.length > 0) {
                rawParsedRowsRef.current = rebuiltRows;
                startTransition(() => {
                  setRawParsedRows(rebuiltRows);
                });
              }
              if (rebuiltContragentRows && rebuiltContragentRows.length > 0) {
                startTransition(() => {
                  setContragentRows(rebuiltContragentRows);
                });
              }
            } else {
              console.warn('Не удалось пересоздать compact rows:', await rebuildResult.text());
            }
          } catch (rebuildError: any) {
            if (rebuildError?.name === 'AbortError') {
              console.warn('Пересоздание compact rows превысило таймаут (30с), пропускаем');
            } else {
              console.warn('Ошибка при пересоздании compact rows:', rebuildError);
            }
          }
        }
        if (savedContragentRows && Array.isArray(savedContragentRows) && savedContragentRows.length > 0) {
          startTransition(() => {
            setContragentRows(savedContragentRows);
          });
          console.log(`Восстановлены контрагенты: ${savedContragentRows.length} строк`);
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          console.warn('Загрузка compact rows превысила таймаут (30с), пропускаем');
        } else {
          console.warn('Ошибка загрузки compact rows из базы данных:', e);
        }
      }
    } catch (e) {
      console.warn('Фоновая загрузка compact rows завершилась с ошибкой:', e);
    }
  };

  const loadSavedYearlyDataOnStartup = async (userId: string) => {
    if (startupLoadingRef.current) {
      console.log('loadSavedYearlyDataOnStartup уже выполняется, пропускаем');
      return;
    }
    startupLoadingRef.current = true;
    setIsDataLoading(true);
    try {
      const metadata = await fetchTabMetadata();
      setTabMetadata(metadata);

      setIsDataLoading(false);
      if (metadata.hasData) {
        setDataLoaded(true);
        tabDataCacheRef.current = {};
        prevTabFetchRef.current = '';
      }
      console.log('Метаданные загружены, экран готов. hasData:', metadata.hasData);

      try {
        const scenarios = await api.budgetScenarios.getByUser(userId);
        if (scenarios.length > 0) {
          setCalcScenarios(scenarios.map(s => ({
            id: String(s.id),
            name: s.name,
            date: new Date(s.createdAt).toLocaleDateString('ru-RU'),
            budget: parseFloat(s.targetBudget),
            growth: parseFloat(s.growthPercent),
            drugs: s.drugs,
            districts: s.districtShares
          })));
          console.log('Загружены сценарии бюджета:', scenarios.length);
        }
      } catch (e) {
        console.warn('Ошибка загрузки сценариев бюджета:', e);
      }
      
      try {
        const reports = await api.reports.getByUser(userId);
        if (reports.length > 0) {
          setSavedReports(reports.map(r => ({
            id: String(r.id),
            name: r.name,
            type: r.type,
            filters: r.filters,
            data: r.data,
            timestamp: new Date(r.createdAt).getTime(),
          })));
          console.log('Загружены сохранённые отчёты:', reports.length);
        }
      } catch (e) {
        console.warn('Ошибка загрузки сохранённых отчётов:', e);
      }
      
      try {
        const regionPlans = await api.wmRussia.getRegionPlans(userId);
        if (Object.keys(regionPlans).length > 0) {
          setSavedPlans(regionPlans);
          console.log('Загружены планы регионов:', Object.keys(regionPlans).length);
        }
      } catch (e) {
        console.warn('Ошибка загрузки планов регионов:', e);
      }
      
      try {
        const loadedDrugPlans = await api.wmRussia.getDrugPlans(userId);
        if (Object.keys(loadedDrugPlans).length > 0) {
          setDrugPlans(loadedDrugPlans);
          console.log('Загружены планы препаратов:', Object.keys(loadedDrugPlans).length);
        }
      } catch (e) {
        console.warn('Ошибка загрузки планов препаратов:', e);
      }
      
      try {
        const auxData = await api.wmRussia.getAuxiliaryData(userId);
        if (Object.keys(auxData.historical).length > 0) {
          setSavedHistoricalData(auxData.historical);
        }
        if (Object.keys(auxData.locked).length > 0) {
          setHistoricalDataLocked(auxData.locked);
        }
        if (Object.keys(auxData.previousWeekData).length > 0) {
          setPreviousWeekData(auxData.previousWeekData);
        }
        if (Object.keys(auxData.currentWeekData).length > 0) {
          setCurrentWeekData(auxData.currentWeekData);
        }
        if (auxData.lastUploadDate) {
          setLastUploadDate(auxData.lastUploadDate);
        }
        console.log('Загружены вспомогательные данные');
      } catch (e) {
        console.warn('Ошибка загрузки вспомогательных данных:', e);
      }
      
      try {
        const savedTerritories = await api.auxiliary.get();
        if (savedTerritories?.managerTerritories) {
          setManagerTerritories(prev => ({ ...prev, ...savedTerritories.managerTerritories }));
          console.log('Загружены территории менеджеров');
        }
      } catch (e) {
        console.warn('Ошибка загрузки территорий менеджеров:', e);
      }
    } catch (error) {
      console.error('Ошибка загрузки сохранённых данных при старте:', error);
    } finally {
      setIsDataLoading(false);
      startupLoadingRef.current = false;
    }
  };
  
  const mergeYearlyData = (yearlyData: Array<{ year: number; aggregatedData: any }>): AggregatedData | null => {
    if (yearlyData.length === 0) return null;
    
    const merged: Partial<AggregatedData> & Pick<AggregatedData, 'monthlySales' | 'combinedData' | 'contragentSales' | 'drugSales' | 'regionSales' | 'disposalTypeSales' | 'federalDistrictSales' | 'receiverTypeSales'> = {
      monthlySales: [],
      combinedData: [],
      contragentSales: [],
      drugSales: [],
      regionSales: [],
      disposalTypeSales: [],
      federalDistrictSales: [],
      receiverTypeSales: [],
    };
    
    const monthlyByMonth = new Map<string, any>();
    const combinedByMonth = new Map<string, any>();
    const contragentMap = new Map<string, any>();
    
    for (const yd of yearlyData) {
      const data = yd.aggregatedData as AggregatedData;
      const year = yd.year.toString();
      
      if (data.monthlySales) {
        for (const m of data.monthlySales) {
          const key = m.month;
          if (!monthlyByMonth.has(key)) {
            monthlyByMonth.set(key, { month: m.month, name: m.name, sales: 0 });
          }
          const existing = monthlyByMonth.get(key);
          existing.sales += m.sales || 0;
        }
      }
      
      if (data.combinedData) {
        for (const c of data.combinedData) {
          const key = c.month;
          if (!combinedByMonth.has(key)) {
            combinedByMonth.set(key, { month: c.month, name: c.name });
          }
          const existing = combinedByMonth.get(key);
          existing[year] = c[year] || c[Object.keys(c).find(k => /^\d{4}$/.test(k)) || ''] || 0;
          if (c[`forecast${parseInt(year) + 1}`]) {
            existing[`forecast${parseInt(year) + 1}`] = c[`forecast${parseInt(year) + 1}`];
          }
        }
      }
      
      if (data.contragentSales) {
        for (const cs of data.contragentSales) {
          const key = cs.name;
          if (!contragentMap.has(key)) {
            contragentMap.set(key, { ...cs });
          } else {
            const existing = contragentMap.get(key);
            existing.sales = (existing.sales || 0) + (cs.sales || 0);
          }
        }
      }
      
      if (data.drugSales) {
        merged.drugSales = [...merged.drugSales, ...data.drugSales];
      }
      if (data.regionSales) {
        merged.regionSales = [...merged.regionSales, ...data.regionSales];
      }
      if (data.disposalTypeSales) {
        merged.disposalTypeSales = [...merged.disposalTypeSales, ...data.disposalTypeSales];
      }
      if (data.federalDistrictSales) {
        merged.federalDistrictSales = [...merged.federalDistrictSales, ...data.federalDistrictSales];
      }
      if (data.receiverTypeSales) {
        merged.receiverTypeSales = [...merged.receiverTypeSales, ...data.receiverTypeSales];
      }
    }
    
    merged.monthlySales = Array.from(monthlyByMonth.values());
    merged.combinedData = Array.from(combinedByMonth.values());
    merged.contragentSales = Array.from(contragentMap.values());
    
    return merged.monthlySales.length > 0 || merged.combinedData.length > 0 ? merged as AggregatedData : null;
  };

  // Сохранение данных
  const saveAllData = async () => {
    if (currentUser) {
      const userId = parseInt(currentUser.id);
      try {
        await api.wmRussia.saveRegionPlans(userId, savedPlans);
        await api.wmRussia.saveDrugPlans(userId, drugPlans);
        await api.wmRussia.saveAuxiliaryData(userId, {
          historical: savedHistoricalData,
          locked: historicalDataLocked,
          previousWeekData: previousWeekData,
          currentWeekData: currentWeekData,
          lastUploadDate: lastUploadDate,
        });
        if (uploadedData) {
          const currentYear = new Date().getFullYear();
          await api.yearlyData.save({
            userId,
            year: currentYear,
            dataType: 'sales',
            aggregatedData: uploadedData,
          });
        }
        alert('Данные сохранены в базу!');
      } catch (error) {
        console.error('Ошибка сохранения в базу:', error);
        alert('Ошибка сохранения данных');
      }
    } else {
      alert('Войдите в систему для сохранения данных');
    }
  };
  
  const saveYearlyData = async (year: number) => {
    if (!currentUser || !uploadedData) {
      alert('Нет данных для сохранения');
      return;
    }
    
    try {
      await api.yearlyData.save({
        userId: parseInt(currentUser.id),
        year,
        dataType: 'sales',
        aggregatedData: uploadedData,
      });
      alert(`Данные за ${year} год сохранены!`);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения данных');
    }
  };

  // Сохранение отчета
  const saveCurrentReport = async () => {
    if (!reportName.trim()) {
      alert('Введите название отчета');
      return;
    }
    
    if (!currentUser) {
      alert('Необходимо авторизоваться');
      return;
    }
    
    try {
      const response = await api.reports.create({
        userId: parseInt(currentUser.id),
        name: reportName,
        type: activeTab,
        filters: {
          drug: selectedDrugs.length > 0 ? selectedDrugs.join('|||') : 'all',
          year: selectedYears.length > 0 ? selectedYears.join('|||') : 'all',
          period: selectedPeriods.length > 0 ? selectedPeriods.join('|||') : 'all',
        },
        data: { territoryPath, files },
      });
      
      const newReport: SavedReport = {
        id: String(response.id),
        name: response.name,
        type: response.type,
        filters: response.filters,
        data: response.data,
        timestamp: new Date(response.createdAt).getTime(),
      };
      
      setSavedReports([...savedReports, newReport]);
      setShowSaveReportDialog(false);
      setReportName('');
      alert('Отчет сохранен в архив!');
    } catch (e) {
      console.error('Ошибка сохранения отчёта:', e);
      alert('Не удалось сохранить отчёт');
    }
  };

  // Загрузка отчета
  const loadReport = (report: SavedReport) => {
    const splitSafe = (val: string) => {
      if (val === 'all') return [];
      if (val.includes('|||')) return val.split('|||');
      return [val];
    };
    setSelectedDrugs(splitSafe(report.filters.drug));
    setSelectedYears(splitSafe(report.filters.year));
    setSelectedPeriods(splitSafe(report.filters.period));
    setTerritoryPath(report.data.territoryPath || []);
    setActiveTab(report.type);
    alert(`Отчет "${report.name}" загружен`);
  };

  // Удаление отчета
  const deleteReport = async (reportId: string) => {
    try {
      await api.reports.delete(parseInt(reportId));
      const updatedReports = savedReports.filter(r => r.id !== reportId);
      setSavedReports(updatedReports);
    } catch (e) {
      console.error('Ошибка удаления отчёта:', e);
    }
  };

  const exportReportExcel = async (report: SavedReport) => {
    try {
      const splitSafe = (val: string) => {
        if (val === 'all') return [];
        if (val.includes('|||')) return val.split('|||');
        return [val];
      };
      const params: Record<string, any> = {};
      const drugs = splitSafe(report.filters.drug);
      const years = splitSafe(report.filters.year);
      const periods = splitSafe(report.filters.period);
      if (drugs.length > 0) params.drugs = drugs;
      if (years.length > 0) params.years = years;
      if (periods.length > 0) params.periods = periods;

      const [dashData, terrData, contraData] = await Promise.all([
        fetchTabData('dashboard', params),
        fetchTabData('territories', params),
        fetchTabData('contragents', params),
      ]);
      if (!dashData?.hasData) { alert('Нет данных для экспорта'); return; }

      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const summaryRows: any[][] = [
        ['Отчёт', report.name],
        ['Дата создания', new Date(report.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
        ['Препараты', report.filters.drug === 'all' ? 'Все' : report.filters.drug.replace(/\|\|\|/g, ', ')],
        ['Годы', report.filters.year === 'all' ? 'Все' : report.filters.year.replace(/\|\|\|/g, ', ')],
        ['Периоды', report.filters.period === 'all' ? 'Все' : report.filters.period.replace(/\|\|\|/g, ', ')],
        [''],
        ['Всего продаж (упак.)', dashData.kpi?.totalSales || 0],
        ['Регионов', dashData.kpi?.totalRegions || 0],
        ['Препаратов', dashData.kpi?.totalDrugs || 0],
        ['Контрагентов', dashData.kpi?.totalContragents || 0],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary['!cols'] = [{ wch: 25 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Сводка');

      if (dashData.drugSales?.length > 0) {
        const totalDrugSales = dashData.drugSales.reduce((s: number, d: any) => s + (d.sales || 0), 0);
        const drugRows: any[][] = [['№', 'Препарат', 'Продажи (упак.)', '% от общего']];
        [...dashData.drugSales].sort((a: any, b: any) => (b.sales || 0) - (a.sales || 0)).forEach((d: any, i: number) => {
          const pct = totalDrugSales > 0 ? ((d.sales || 0) / totalDrugSales * 100).toFixed(2) : '0';
          drugRows.push([i + 1, d.name, d.sales || 0, Number(pct)]);
        });
        const wsDrugs = XLSX.utils.aoa_to_sheet(drugRows);
        wsDrugs['!cols'] = [{ wch: 6 }, { wch: 50 }, { wch: 20 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsDrugs, 'Препараты');
      }

      if (dashData.regionSales?.length > 0) {
        const totalRegSales = dashData.regionSales.reduce((s: number, r: any) => s + (r.sales || 0), 0);
        const regionRows: any[][] = [['№', 'Регион', 'Продажи (упак.)', '% от общего']];
        [...dashData.regionSales].sort((a: any, b: any) => (b.sales || 0) - (a.sales || 0)).forEach((r: any, i: number) => {
          const pct = totalRegSales > 0 ? ((r.sales || 0) / totalRegSales * 100).toFixed(2) : '0';
          regionRows.push([i + 1, r.name, r.sales || 0, Number(pct)]);
        });
        const wsRegions = XLSX.utils.aoa_to_sheet(regionRows);
        wsRegions['!cols'] = [{ wch: 6 }, { wch: 45 }, { wch: 20 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsRegions, 'Регионы');
      }

      if (dashData.monthlyDrugSales || dashData.monthlySales?.length > 0) {
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const allDrugs = new Set<string>();
        const monthDrugMap = new Map<string, Map<string, number>>();

        if (dashData.monthlyDrugSales) {
          Object.entries(dashData.monthlyDrugSales).forEach(([monthKey, yearData]: [string, any]) => {
            Object.values(yearData).forEach((drugArr: any) => {
              (drugArr as any[]).forEach((d: any) => {
                allDrugs.add(d.name);
                const key = monthKey;
                if (!monthDrugMap.has(key)) monthDrugMap.set(key, new Map());
                const m = monthDrugMap.get(key)!;
                m.set(d.name, (m.get(d.name) || 0) + d.sales);
              });
            });
          });
        }

        if (allDrugs.size > 0) {
          const drugList = [...allDrugs].sort();
          const header = ['Месяц', ...drugList, 'Итого'];
          const monthRows: any[][] = [header];
          monthNames.forEach((mName, idx) => {
            const mKey = String(idx + 1);
            const mData = monthDrugMap.get(mKey);
            const row: any[] = [mName];
            let rowTotal = 0;
            drugList.forEach(drug => {
              const val = mData?.get(drug) || 0;
              row.push(val);
              rowTotal += val;
            });
            row.push(rowTotal);
            if (rowTotal > 0) monthRows.push(row);
          });
          const totalRow: any[] = ['ИТОГО'];
          let grandTotal = 0;
          drugList.forEach(drug => {
            let drugTotal = 0;
            monthDrugMap.forEach(m => { drugTotal += m.get(drug) || 0; });
            totalRow.push(drugTotal);
            grandTotal += drugTotal;
          });
          totalRow.push(grandTotal);
          monthRows.push(totalRow);
          const wsMonths = XLSX.utils.aoa_to_sheet(monthRows);
          wsMonths['!cols'] = [{ wch: 12 }, ...drugList.map(() => ({ wch: 15 })), { wch: 15 }];
          XLSX.utils.book_append_sheet(wb, wsMonths, 'По месяцам');
        } else if (dashData.monthlySales?.length > 0) {
          const monthRows: any[][] = [['Месяц', 'Продажи (упак.)']];
          dashData.monthlySales.forEach((m: any) => {
            monthRows.push([m.month || m.name, m.sales || 0]);
          });
          const wsMonths = XLSX.utils.aoa_to_sheet(monthRows);
          wsMonths['!cols'] = [{ wch: 15 }, { wch: 20 }];
          XLSX.utils.book_append_sheet(wb, wsMonths, 'По месяцам');
        }
      }

      const allContragents = contraData?.contragentSales || dashData.contragentSales || [];
      if (allContragents.length > 0) {
        const cRows: any[][] = [['№', 'Контрагент', 'Регион', 'Город', 'Группа', 'Федеральный округ', 'Продажи (упак.)']];
        const sorted = [...allContragents].sort((a: any, b: any) => (b.sales || 0) - (a.sales || 0));
        sorted.forEach((c: any, i: number) => {
          cRows.push([i + 1, c.name || '', c.region || '', c.city || '', c.contractorGroup || '', c.federalDistrict || '', c.sales || 0]);
        });
        const wsContra = XLSX.utils.aoa_to_sheet(cRows);
        wsContra['!cols'] = [{ wch: 6 }, { wch: 45 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 22 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, wsContra, 'Контрагенты');
      }

      const th = terrData?.territoryHierarchy;
      if (th) {
        const detailRows: any[][] = [['Федеральный округ', 'Регион', 'Город', 'Район', 'Продажи (упак.)']];
        let hasDetail = false;

        if (th.federalDistricts) {
          Object.entries(th.federalDistricts).forEach(([fdName, fdData]: [string, any]) => {
            if (th.regions) {
              Object.entries(th.regions).forEach(([regName, regData]: [string, any]) => {
                if (regData.federalDistrict === fdName || !regData.federalDistrict) {
                  if (regData.children && Object.keys(regData.children).length > 0) {
                    Object.entries(regData.children).forEach(([cityName, cityData]: [string, any]) => {
                      hasDetail = true;
                      detailRows.push([fdName, regName, cityName, '', cityData.sales || 0]);
                      if (cityData.districts) {
                        Object.entries(cityData.districts).forEach(([distName, distData]: [string, any]) => {
                          detailRows.push([fdName, regName, cityName, distName, (distData as any).sales || 0]);
                        });
                      }
                    });
                  } else {
                    detailRows.push([fdName, regName, '', '', regData.sales || 0]);
                  }
                }
              });
            }
          });
        }

        if (!hasDetail && th.regions) {
          Object.entries(th.regions).forEach(([regName, regData]: [string, any]) => {
            hasDetail = true;
            detailRows.push(['', regName, '', '', regData.sales || 0]);
            if (regData.children) {
              Object.entries(regData.children).forEach(([cityName, cityData]: [string, any]) => {
                detailRows.push(['', regName, cityName, '', cityData.sales || 0]);
              });
            }
          });
        }

        if (hasDetail) {
          const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
          wsDetail['!cols'] = [{ wch: 22 }, { wch: 35 }, { wch: 30 }, { wch: 25 }, { wch: 18 }];
          XLSX.utils.book_append_sheet(wb, wsDetail, 'Детализация');
        }
      }

      XLSX.writeFile(wb, `${report.name.replace(/[/\\?%*:|"<>]/g, '_')}.xlsx`);
    } catch (e) {
      console.error('Ошибка экспорта в Excel:', e);
      alert('Не удалось создать Excel файл');
    }
  };

  const exportReportPdf = async (report: SavedReport) => {
    try {
      const splitSafe = (val: string) => {
        if (val === 'all') return [];
        if (val.includes('|||')) return val.split('|||');
        return [val];
      };
      const params: Record<string, any> = {};
      const drugs = splitSafe(report.filters.drug);
      const years = splitSafe(report.filters.year);
      const periods = splitSafe(report.filters.period);
      if (drugs.length > 0) params.drugs = drugs;
      if (years.length > 0) params.years = years;
      if (periods.length > 0) params.periods = periods;
      const data = await fetchTabData('dashboard', params);
      if (!data?.hasData) { alert('Нет данных для экспорта'); return; }

      const { default: jsPDF } = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = (autoTableModule.default || autoTableModule) as any;
      const { robotoRegular } = await import('../fonts/roboto-regular');
      const { robotoBold } = await import('../fonts/roboto-bold');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.addFileToVFS('Roboto-Regular.ttf', robotoRegular);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.addFileToVFS('Roboto-Bold.ttf', robotoBold);
      doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

      const fontStyles = {
        headStyles: { font: 'Roboto', fontStyle: 'bold' },
        bodyStyles: { font: 'Roboto', fontStyle: 'normal' },
      };

      const pageW = doc.internal.pageSize.getWidth();
      let y = 15;

      doc.setFontSize(16);
      doc.setFont('Roboto', 'bold');
      doc.text(report.name, pageW / 2, y, { align: 'center' });
      y += 10;

      doc.setFontSize(10);
      doc.setFont('Roboto', 'normal');
      const dateStr = new Date(report.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      doc.text(dateStr, pageW / 2, y, { align: 'center' });
      y += 8;

      const filterDrug = report.filters.drug === 'all' ? 'Все препараты' : report.filters.drug.replace(/\|\|\|/g, ', ');
      const filterYear = report.filters.year === 'all' ? 'Все годы' : report.filters.year.replace(/\|\|\|/g, ', ');
      const filterPeriod = report.filters.period === 'all' ? 'Все периоды' : report.filters.period.replace(/\|\|\|/g, ', ');
      doc.setFontSize(9);
      doc.text(`Препараты: ${filterDrug}`, 14, y);
      y += 5;
      doc.text(`Годы: ${filterYear}`, 14, y);
      y += 5;
      doc.text(`Периоды: ${filterPeriod}`, 14, y);
      y += 8;

      doc.setDrawColor(200);
      doc.line(14, y, pageW - 14, y);
      y += 8;

      doc.setFontSize(12);
      doc.setFont('Roboto', 'bold');
      doc.text('Сводные показатели', 14, y);
      y += 7;

      autoTable(doc, {
        startY: y,
        head: [['Показатель', 'Значение']],
        body: [
          ['Всего продаж (упак.)', (data.kpi?.totalSales || 0).toLocaleString('ru-RU')],
          ['Регионов', String(data.kpi?.totalRegions || 0)],
          ['Препаратов', String(data.kpi?.totalDrugs || 0)],
          ['Контрагентов', String(data.kpi?.totalContragents || 0)],
        ],
        theme: 'striped',
        headStyles: { ...fontStyles.headStyles, fillColor: [0, 172, 193], fontSize: 9 },
        bodyStyles: { ...fontStyles.bodyStyles, fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable?.finalY || y + 35;
      y += 10;

      if (data.drugSales?.length > 0) {
        doc.setFontSize(12);
        doc.setFont('Roboto', 'bold');
        doc.text('Продажи по препаратам', 14, y);
        y += 5;
        const drugBody = [...data.drugSales]
          .sort((a: any, b: any) => (b.sales || 0) - (a.sales || 0))
          .slice(0, 20)
          .map((d: any, i: number) => [String(i + 1), d.name || '', (d.sales || 0).toLocaleString('ru-RU')]);
        autoTable(doc, {
          startY: y,
          head: [['№', 'Препарат', 'Продажи (упак.)']],
          body: drugBody,
          theme: 'striped',
          headStyles: { ...fontStyles.headStyles, fillColor: [124, 58, 237], fontSize: 8 },
          bodyStyles: { ...fontStyles.bodyStyles, fontSize: 8 },
          columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 30, halign: 'right' } },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable?.finalY || y + 40;
        y += 10;
      }

      if (data.regionSales?.length > 0) {
        if (y > 240) { doc.addPage(); y = 15; }
        doc.setFontSize(12);
        doc.setFont('Roboto', 'bold');
        doc.text('Продажи по регионам', 14, y);
        y += 5;
        const regionBody = [...data.regionSales]
          .sort((a: any, b: any) => (b.sales || 0) - (a.sales || 0))
          .slice(0, 20)
          .map((r: any, i: number) => [String(i + 1), r.name || '', (r.sales || 0).toLocaleString('ru-RU')]);
        autoTable(doc, {
          startY: y,
          head: [['№', 'Регион', 'Продажи (упак.)']],
          body: regionBody,
          theme: 'striped',
          headStyles: { ...fontStyles.headStyles, fillColor: [16, 185, 129], fontSize: 8 },
          bodyStyles: { ...fontStyles.bodyStyles, fontSize: 8 },
          columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 30, halign: 'right' } },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable?.finalY || y + 40;
        y += 10;
      }

      if (data.monthlySales?.length > 0) {
        if (y > 240) { doc.addPage(); y = 15; }
        doc.setFontSize(12);
        doc.setFont('Roboto', 'bold');
        doc.text('Продажи по месяцам', 14, y);
        y += 5;
        const monthBody = data.monthlySales.map((m: any) => [m.month || m.name || '', (m.sales || 0).toLocaleString('ru-RU')]);
        autoTable(doc, {
          startY: y,
          head: [['Месяц', 'Продажи (упак.)']],
          body: monthBody,
          theme: 'striped',
          headStyles: { ...fontStyles.headStyles, fillColor: [6, 182, 212], fontSize: 8 },
          bodyStyles: { ...fontStyles.bodyStyles, fontSize: 8 },
          columnStyles: { 1: { cellWidth: 30, halign: 'right' } },
          margin: { left: 14, right: 14 },
        });
      }

      if (data.contragentSales?.length > 0) {
        y = (doc as any).lastAutoTable?.finalY || y;
        y += 10;
        if (y > 240) { doc.addPage(); y = 15; }
        doc.setFontSize(12);
        doc.setFont('Roboto', 'bold');
        doc.text('Топ контрагенты', 14, y);
        y += 5;
        const cBody = [...data.contragentSales]
          .sort((a: any, b: any) => (b.sales || 0) - (a.sales || 0))
          .slice(0, 30)
          .map((c: any, i: number) => [String(i + 1), c.name || '', (c.sales || 0).toLocaleString('ru-RU')]);
        autoTable(doc, {
          startY: y,
          head: [['№', 'Контрагент', 'Продажи (упак.)']],
          body: cBody,
          theme: 'striped',
          headStyles: { ...fontStyles.headStyles, fillColor: [245, 158, 11], fontSize: 8 },
          bodyStyles: { ...fontStyles.bodyStyles, fontSize: 8 },
          columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 30, halign: 'right' } },
          margin: { left: 14, right: 14 },
        });
      }

      doc.save(`${report.name.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`);
    } catch (e) {
      console.error('Ошибка экспорта в PDF:', e);
      alert('Не удалось создать PDF файл');
    }
  };

  const fetchReportPreview = async (report: SavedReport) => {
    if (previewReportId === report.id) {
      setPreviewReportId(null);
      return;
    }
    setPreviewReportId(report.id);
    if (previewDataMap[report.id]) return;
    setPreviewLoadingMap(prev => ({ ...prev, [report.id]: true }));
    try {
      const splitSafe = (val: string) => {
        if (val === 'all') return [];
        if (val.includes('|||')) return val.split('|||');
        return [val];
      };
      const params: Record<string, any> = {};
      const drugs = splitSafe(report.filters.drug);
      const years = splitSafe(report.filters.year);
      const periods = splitSafe(report.filters.period);
      if (drugs.length > 0) params.drugs = drugs;
      if (years.length > 0) params.years = years;
      if (periods.length > 0) params.periods = periods;
      const data = await fetchTabData('dashboard', params);
      setPreviewDataMap(prev => ({ ...prev, [report.id]: data }));
    } catch (e) {
      console.error('Ошибка загрузки предпросмотра:', e);
      setPreviewDataMap(prev => ({ ...prev, [report.id]: { error: true } }));
    } finally {
      setPreviewLoadingMap(prev => ({ ...prev, [report.id]: false }));
    }
  };

  // Выбор пользователя - теперь вход по email через API
  const handleLogin = async () => {
    setLoginError('');
    
    // Простая валидация email
    if (!loginEmail.includes('@')) {
      setLoginError('Введите корректный email');
      return;
    }
    
    if (loginPassword.length < 4) {
      setLoginError('Пароль слишком короткий');
      return;
    }
    
    try {
      const response = await api.auth.login(loginEmail, loginPassword);

      const user: UserProfile = {
        id: response.id,
        name: response.name,
        email: response.email,
        role: response.role,
        avatar: response.avatar || '👤'
      };

      setCurrentUser(user);
      localStorage.setItem('mdlp_user', JSON.stringify(user));
      setShowUserSelect(false);

      loadSavedYearlyData(response.id);
    } catch (error: any) {
      // Фолбэк: если сервер недоступен — пробуем mock-пользователей
      const mockUser = wmMockUsers.find(u => u.email === loginEmail);
      if (mockUser) {
        const user: UserProfile = {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          avatar: mockUser.avatar || '👤'
        };
        setCurrentUser(user);
        localStorage.setItem('mdlp_user', JSON.stringify(user));
        setShowUserSelect(false);
      } else {
        setLoginError('Сервер недоступен. Попробуйте позже или проверьте подключение.');
      }
    }
  };
  
  const loadSavedYearlyData = async (userId: string) => {
    try {
      const metadata = await fetchTabMetadata();
      setTabMetadata(metadata);
      tabDataCacheRef.current = {};
      prevTabFetchRef.current = '';
      if (metadata.hasData) {
        setDataLoaded(true);
      }
      console.log('Обновлены метаданные после загрузки. hasData:', metadata.hasData);
    } catch (error) {
      console.error('Ошибка загрузки сохранённых данных:', error);
    }
  };

  // Регистрация нового пользователя
  const handleRegister = async () => {
    setLoginError('');
    
    if (!registerName.trim()) {
      setLoginError('Введите ваше имя');
      return;
    }
    
    if (!loginEmail.includes('@')) {
      setLoginError('Введите корректный email');
      return;
    }
    
    if (loginPassword.length < 6) {
      setLoginError('Пароль должен быть не менее 6 символов');
      return;
    }
    
    try {
      const response = await api.auth.register(loginEmail, loginPassword, registerName.trim());
      
      const user: UserProfile = {
        id: response.id,
        name: response.name,
        email: response.email,
        role: response.role,
        avatar: response.avatar || '👤'
      };
      
      setCurrentUser(user);
      localStorage.setItem('mdlp_user', JSON.stringify(user));
      setShowUserSelect(false);
      
      loadSavedYearlyData(response.id);
    } catch (error: any) {
      setLoginError(error.message || 'Ошибка регистрации');
    }
  };

  // Сброс пароля
  const handlePasswordReset = () => {
    if (!resetEmail.includes('@')) {
      setLoginError('Введите корректный email');
      return;
    }
    
    // Здесь будет реальная отправка письма на backend
    // Пока просто показываем успешное сообщение
    setResetSuccess(true);
    setTimeout(() => {
      setShowPasswordReset(false);
      setResetSuccess(false);
      setResetEmail('');
      setLoginError('');
    }, 3000);
  };

  // Выход из аккаунта
  const logout = () => {
    setCurrentUser(null);
    clearAuth();
    setShowUserSelect(true);
    setDataLoaded(false);
    setActiveTab('upload');
  };

  const navigateTo = (tab) => {
    setNavHistory(prev => [...prev, activeTab]);
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };



  const goBack = () => {
    if (territoryPath.length > 0) {
      setTerritoryPath(territoryPath.slice(0, -1));
    } else if (navHistory.length > 0) {
      const prev = navHistory[navHistory.length - 1];
      setNavHistory(navHistory.slice(0, -1));
      setActiveTab(prev);
    }
  };

  const handleFileDrop = useCallback(async (e: React.DragEvent | React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setParseError(null);

    if (isUploading) {
      setParseError('Загрузка уже идёт. Дождитесь завершения текущей загрузки.');
      return;
    }
    
    const rawFiles = 'dataTransfer' in e 
      ? Array.from(e.dataTransfer?.files || [])
      : Array.from((e.target as HTMLInputElement).files || []);

    if (rawFiles.length === 0) return;
    
    setIsUploading(true);

    const newFiles = rawFiles.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      status: 'uploading' as const,
      progress: 0,
      statusText: 'Подготовка...',
      rawFile: file,
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    
    const LARGE_FILE_THRESHOLD = 1 * 1024 * 1024;
    
    setDataSavedByServer(false);
    try {
      for (const fileInfo of newFiles) {
      try {
        const isLargeFile = fileInfo.rawFile.size > LARGE_FILE_THRESHOLD;
        
        if (isLargeFile && currentUser) {
          console.log(`[Upload] Большой файл (${(fileInfo.rawFile.size / 1024 / 1024).toFixed(2)} MB), используем серверную обработку`);
          
          setFiles(prev => prev.map(f => f.id === fileInfo.id 
            ? { ...f, status: 'uploading' as const, progress: 0, statusText: 'Загрузка на сервер...' } 
            : f
          ));
          
          try {
            const uploadResult = await uploadFileToServer(fileInfo.rawFile, (progress) => {
              const uploadPct = Math.round(progress * 0.7);
              setFiles(prev => prev.map(f => f.id === fileInfo.id 
                ? { ...f, progress: uploadPct, statusText: `Загрузка на сервер... ${progress}%` } 
                : f
              ));
            });
            
            console.log(`[Upload] Файл загружен на сервер: ${uploadResult.fileId}`);
            
            const waitForProcessing = async () => {
              const yieldUI = () => new Promise(resolve => setTimeout(resolve, 50));
              
              for (let checkCount = 0; checkCount < 600; checkCount++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                try {
                  const status = await getFileProcessingStatus(uploadResult.fileId);
                  
                  if (status.status === 'aggregating') {
                    setFiles(prev => prev.map(f => f.id === fileInfo.id 
                      ? { ...f, progress: 92, status: 'uploading' as const, statusText: 'Агрегация и сохранение данных...' } 
                      : f
                    ));
                    continue;
                  }
                  
                  const serverMessage = status.message || '';
                  const isRetrying = serverMessage.includes('повторная попытка') || serverMessage.includes('перезагружается');
                  
                  if (isRetrying) {
                    setFiles(prev => prev.map(f => f.id === fileInfo.id 
                      ? { ...f, status: 'uploading' as const, statusText: serverMessage } 
                      : f
                    ));
                    continue;
                  }
                  
                  const processingProgress = 70 + (status.processedRows / Math.max(status.totalRows, 1)) * 20;
                  
                  setFiles(prev => prev.map(f => f.id === fileInfo.id 
                    ? { ...f, progress: Math.min(processingProgress, 90), status: 'uploading' as const, statusText: `Обработка на сервере... ${status.processedRows.toLocaleString('ru-RU')} из ${status.totalRows.toLocaleString('ru-RU')} строк` } 
                    : f
                  ));
                  
                  if (status.status === 'completed') {
                    const newMetadata = await fetchTabMetadata();
                    setTabMetadata(newMetadata);
                    tabDataCacheRef.current = {};
                    prevTabFetchRef.current = '';
                    isFetchingTabRef.current = false;
                    if (newMetadata.hasData) {
                      setDataLoaded(true);
                    }

                    setFiles(prev => prev.map(f => f.id === fileInfo.id 
                      ? { ...f, status: 'ready' as const, progress: 100, rowCount: status.totalRows, statusText: '' } 
                      : f
                    ));
                    setDataSavedByServer(true);
                    console.log(`[Upload] Обработка завершена: ${status.totalRows} строк (данные сохранены сервером)`);
                    return;
                  } else if (status.status === 'error') {
                    throw new Error(status.error || 'Ошибка обработки файла');
                  }
                } catch (statusError: any) {
                  if (statusError.message !== 'Задача не найдена') {
                    throw statusError;
                  }
                }
              }
              throw new Error('Загрузка прервалась. Попробуйте ещё раз — файл загрузится с того места где остановился.');
            };
            
            await waitForProcessing();
            
            continue;
          } catch (serverError: any) {
            console.error('[Upload] Ошибка серверной загрузки:', serverError);
            const errMsg = serverError.message || 'Неизвестная ошибка';
            setFiles(prev => prev.map(f => f.id === fileInfo.id 
              ? { ...f, status: 'error' as const, progress: 0, error: errMsg, statusText: '' } 
              : f
            ));
            setParseError(errMsg);
            continue;
          }
        }
        
        const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 50));
        
        setFiles(prev => prev.map(f => f.id === fileInfo.id 
          ? { ...f, progress: 10, statusText: 'Чтение файла...' } 
          : f
        ));
        await yieldToUI();
        
        const parsed = await parseFile(fileInfo.rawFile);
        
        setFiles(prev => prev.map(f => f.id === fileInfo.id 
          ? { ...f, progress: 40, statusText: `Обработка ${parsed.rowCount.toLocaleString('ru-RU')} строк...` } 
          : f
        ));
        await yieldToUI();
        
        const rowsWithSource = parsed.rows.map((row: any) => ({
          ...row,
          _sourceFile: fileInfo.rawFile.name
        }));
        
        const previousRows = rawParsedRowsRef.current;
        const combinedRows = [...previousRows, ...rowsWithSource];
        
        rawParsedRowsRef.current = combinedRows;
        
        setFiles(prev => prev.map(f => f.id === fileInfo.id 
          ? { ...f, progress: 55, statusText: 'Сохранение в базу данных...' } 
          : f
        ));
        await yieldToUI();
        
        if (currentUser) {
          try {
            await api.yearlyData.saveRawRows(parseInt(currentUser.id), combinedRows.slice(0, 100000));
            console.log('rawParsedRows сохранены в базу данных:', Math.min(combinedRows.length, 100000), 'строк');
          } catch (e) {
            console.warn('Не удалось сохранить rawParsedRows в базу данных:', e);
          }
        }
        
        setFiles(prev => prev.map(f => f.id === fileInfo.id 
          ? { ...f, progress: 75, statusText: 'Агрегация данных...' } 
          : f
        ));
        await yieldToUI();
        
        const aggregated = aggregateData({ rows: combinedRows, rowCount: combinedRows.length, columns: parsed.columns, fileName: parsed.fileName });
        
        await yieldToUI();
        
        const mdlpRecords: MDLPSaleRecord[] = combinedRows.map((row: any) => ({
          drug: row.drug || row.Препарат || row.препарат || row.МНН || row.Наименование || '',
          region: row.region || row.Регион || row.регион || row.Субъект || row.subject || '',
          city: row.city || row.Город || row.город || '',
          contragent: row.contragent || row.Контрагент || row.контрагент || row.Получатель || row.receiver || '',
          sales: parseFloat(row.sales || row.sum || row.Сумма || row.Продажи || row.totalSum || 0) || 0,
          packages: parseInt(row.packages || row.count || row.Упаковки || row.Количество || row.quantity || 0) || 0,
          year: row.year || row.Год || new Date().getFullYear(),
          month: row.month || row.Месяц,
          disposalType: row.disposalType || row.ТипВыбытия || '',
          receiverType: row.receiverType || row.ТипПолучателя || '',
          federalDistrict: row.federalDistrict || row.ФедеральныйОкруг || '',
        }));
        
        setFiles(prev => prev.map(f => f.id === fileInfo.id 
          ? { ...f, progress: 90, statusText: 'Отображение данных...' } 
          : f
        ));
        await yieldToUI();
        
        startTransition(() => {
          setRawParsedRows(combinedRows);
          setUploadedData(aggregated);
          setMdlpData(mdlpRecords);
        });
        
        await yieldToUI();
        
        setFiles(prev => prev.map(f => f.id === fileInfo.id 
          ? { ...f, status: 'ready', progress: 100, rowCount: parsed.rowCount, statusText: '' } 
          : f
        ));
        
        // Сохраняем запись в историю загрузок
        if (currentUser) {
          try {
            await api.uploadHistory.create({
              filename: fileInfo.name,
              status: 'success',
              rowsCount: parsed.rowCount,
            });
            console.log('История загрузки сохранена:', fileInfo.name);
          } catch (e) {
            console.warn('Не удалось сохранить историю загрузки:', e);
          }
        }
        
        // Обновляем понедельные данные для сравнения
        const today = new Date().toISOString().split('T')[0];
        const drugSalesMap: Record<string, number> = {};
        if (aggregated?.drugSales) {
          aggregated.drugSales.forEach(d => {
            drugSalesMap[d.name] = d.sales;
          });
        }
        
        // Читаем актуальные значения из refs
        const prevDate = lastUploadDateRef.current;
        const prevWeekData = currentWeekDataRef.current;
        
        if (prevDate && prevDate !== today && Object.keys(prevWeekData).length > 0) {
          setPreviousWeekData(prevWeekData);
        }
        setCurrentWeekData(drugSalesMap);
        setLastUploadDate(today);
        
        // Sync data to SharedDataContext for WM Russia integration
        if (combinedRows.length > 0) {
          const mdlpRecords: MDLPSaleRecord[] = combinedRows.map((row: any) => ({
            drug: row.drug || row.Препарат || row.препарат || row.МНН || row.Наименование || '',
            region: row.region || row.Регион || row.регион || row.Субъект || row.subject || '',
            city: row.city || row.Город || row.город || '',
            contragent: row.contragent || row.Контрагент || row.контрагент || row.Получатель || row.receiver || '',
            sales: parseFloat(row.sales || row.sum || row.Сумма || row.Продажи || row.totalSum || 0) || 0,
            packages: parseInt(row.packages || row.count || row.Упаковки || row.Количество || row.quantity || 0) || 0,
            year: row.year || row.Год || new Date().getFullYear(),
            month: row.month || row.Месяц,
            disposalType: row.disposalType || row.ТипВыбытия || '',
            receiverType: row.receiverType || row.ТипПолучателя || '',
            federalDistrict: row.federalDistrict || row.ФедеральныйОкруг || '',
          }));
          setMdlpData(mdlpRecords);
          console.log('WM Russia data synced:', mdlpRecords.length, 'records');
        }
        
        console.log(`Файл ${fileInfo.name} успешно обработан: ${parsed.rowCount} строк`);
      } catch (error: any) {
        setFiles(prev => prev.map(f => f.id === fileInfo.id 
          ? { ...f, status: 'error', progress: 0, error: error.message, statusText: '' } 
          : f
        ));
        setParseError(error.message);
        console.error('Ошибка парсинга файла:', error);
      }
      }
    } finally {
      setIsUploading(false);
    }
  }, [currentUser, setMdlpData, isUploading]);

  const clearAllData = useCallback(() => {
    setFiles([]);
    setParseError(null);
  }, []);

  const loadDbStats = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingDbStats(true);
    try {
      const stats = await getDatabaseStats();
      setDbStats(stats);
    } catch (e: any) {
      console.warn('Не удалось загрузить статистику базы данных:', e);
      if (e?.message?.includes('503') || e?.message?.includes('временно недоступна') || e?.message?.includes('перезагружается')) {
        setTimeout(() => loadDbStats(), 30000);
      }
    } finally {
      setIsLoadingDbStats(false);
    }
  }, [currentUser]);

  const handleClearDatabaseData = useCallback(async (clearType: 'rawRows' | 'all' | 'oldYears') => {
    const messages = {
      rawRows: 'Вы уверены, что хотите удалить загруженные данные МДЛП? Это действие нельзя отменить.',
      all: 'Вы уверены, что хотите удалить ВСЕ ваши данные, включая отчёты? Это действие нельзя отменить.',
      oldYears: 'Вы уверены, что хотите удалить данные старше 2 лет?'
    };
    
    if (!confirm(messages[clearType])) return;
    
    setIsClearingData(true);
    try {
      const result = await clearDatabaseData(clearType);
      alert(result.message);
      
      if (clearType === 'rawRows' || clearType === 'all') {
        setRawParsedRows([]);
        setContragentRows([]);
        rawParsedRowsRef.current = [];
        setUploadedData(null);
        setFiles([]);
      }
      
      loadDbStats();
    } catch (e: any) {
      alert('Ошибка очистки: ' + (e.message || 'Неизвестная ошибка'));
    } finally {
      setIsClearingData(false);
    }
  }, [loadDbStats]);

  useEffect(() => {
    if (currentUser && activeTab === 'upload') {
      loadDbStats();
    }
  }, [currentUser, activeTab, loadDbStats]);

  const startAnalysis = async () => {
    console.log('startAnalysis called', { dataSavedByServer, hasUploadedData: !!uploadedData, hasMetadata: !!tabMetadata?.hasData, dataLoaded });
    setIsAnalyzing(true);
    
    if (dataSavedByServer || tabMetadata?.hasData) {
      console.log('Данные уже сохранены сервером или загружены ранее, переходим к дашборду');
    } else if (uploadedData && currentUser) {
      const detectedYears = new Set<number>();
      uploadedData.monthlySales?.forEach(m => {
        if (m.year) detectedYears.add(m.year);
      });
      
      const yearsToSave = detectedYears.size > 0 
        ? Array.from(detectedYears) 
        : [new Date().getFullYear()];
      
      for (const year of yearsToSave) {
        try {
          await api.yearlyData.save({
            userId: parseInt(currentUser.id),
            year,
            dataType: 'sales',
            aggregatedData: uploadedData,
          });
          console.log(`Данные за ${year} год сохранены (клиентская обработка)`);
        } catch (error) {
          console.error(`Ошибка сохранения данных за ${year}:`, error);
        }
      }
    }
    
    setTimeout(() => {
      setIsAnalyzing(false);
      setDataLoaded(true);
      setDataSavedByServer(false);
      navigateTo('dashboard');
    }, 1000);
  };

  // Функции для скачивания отчетов
  const getReportData = (reportType: string): { data: any[]; columns: string[]; title: string } => {
    const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    
    switch (reportType) {
      case 'Ежемесячный': {
        const monthSales = new Map<string, number>();
        const MONTH_SHORT_TO_IDX: Record<string, number> = {
          'Янв': 0, 'Фев': 1, 'Мар': 2, 'Апр': 3, 'Май': 4, 'Июн': 5,
          'Июл': 6, 'Авг': 7, 'Сен': 8, 'Окт': 9, 'Ноя': 10, 'Дек': 11,
        };
        rawParsedRows.forEach(row => {
          if (row.month && row.year) {
            const mIdx = MONTH_SHORT_TO_IDX[row.month];
            const monthName = mIdx !== undefined ? MONTH_NAMES[mIdx] : row.month;
            const key = `${monthName} ${row.year}`;
            monthSales.set(key, (monthSales.get(key) || 0) + (Number(row.quantity) || 0));
          } else {
            const date = row.date || row.operationDate;
            if (!date) return;
            const d = new Date(date);
            if (isNaN(d.getTime())) return;
            const key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
            monthSales.set(key, (monthSales.get(key) || 0) + (Number(row.quantity) || 0));
          }
        });
        const data = Array.from(monthSales.entries()).map(([period, sales]) => ({ period, sales }));
        return { data, columns: ['Период', 'Продажи (упак.)'], title: 'Ежемесячный отчет' };
      }
      case 'Территориальный': {
        const data = (tabData?.regionSales || []).map(r => ({
          region: r.name,
          sales: r.sales,
          share: ((r.sales / (tabData?.regionSales?.reduce((s, x) => s + x.sales, 0) || 1)) * 100).toFixed(2) + '%'
        }));
        return { data, columns: ['Регион', 'Продажи', 'Доля'], title: 'Территориальный отчет' };
      }
      case 'Детализация региона': {
        const cityData = new Map<string, { region: string; sales: number }>();
        rawParsedRows.forEach(row => {
          const city = row.city || row.receiverCity;
          const region = row.region || row.receiverRegion || '';
          if (!city) return;
          const existing = cityData.get(city);
          if (existing) {
            existing.sales += Number(row.quantity) || 0;
          } else {
            cityData.set(city, { region, sales: Number(row.quantity) || 0 });
          }
        });
        const data = Array.from(cityData.entries()).map(([city, d]) => ({
          city, region: d.region, sales: d.sales
        })).sort((a, b) => b.sales - a.sales);
        return { data, columns: ['Город', 'Регион', 'Продажи'], title: 'Детализация по городам' };
      }
      case 'Выполнение плана': {
        const data = (tabData?.regionSales || []).map(r => {
          const plan = savedPlans[r.name] || 0;
          const fact = r.sales;
          const completion = plan > 0 ? ((fact / plan) * 100).toFixed(1) + '%' : '—';
          return { region: r.name, plan, fact, completion };
        });
        return { data, columns: ['Регион', 'План', 'Факт', 'Выполнение'], title: 'Выполнение плана' };
      }
      case 'Проблемные зоны': {
        const problems: any[] = [];
        (tabData?.regionSales || []).forEach(r => {
          const plan = savedPlans[r.name] || 0;
          if (plan > 0 && r.sales < plan * 0.8) {
            problems.push({
              region: r.name,
              fact: r.sales,
              plan,
              deficit: plan - r.sales,
              level: r.sales < plan * 0.5 ? 'Критический' : 'Предупреждение'
            });
          }
        });
        return { data: problems, columns: ['Регион', 'Факт', 'План', 'Дефицит', 'Уровень'], title: 'Проблемные зоны' };
      }
      case 'ABC-анализ': {
        const drugSales = new Map<string, number>();
        rawParsedRows.forEach(row => {
          const drug = row.drugName || row.complexDrugName || row.drug;
          if (!drug) return;
          drugSales.set(drug, (drugSales.get(drug) || 0) + (Number(row.quantity) || 0));
        });
        const sortedDrugs = Array.from(drugSales.entries())
          .map(([drug, sales]) => ({ drug, sales }))
          .sort((a, b) => b.sales - a.sales);
        const totalSales = sortedDrugs.reduce((s, d) => s + d.sales, 0);
        let cumulative = 0;
        const data = sortedDrugs.map(d => {
          cumulative += d.sales;
          const cumulativeShare = (cumulative / totalSales) * 100;
          const category = cumulativeShare <= 80 ? 'A' : cumulativeShare <= 95 ? 'B' : 'C';
          return {
            drug: d.drug,
            sales: d.sales,
            share: ((d.sales / totalSales) * 100).toFixed(2) + '%',
            cumulative: cumulativeShare.toFixed(1) + '%',
            category
          };
        });
        return { data, columns: ['Препарат', 'Продажи', 'Доля', 'Накоп. доля', 'Категория'], title: 'ABC-анализ' };
      }
      case 'По препаратам': {
        const drugSales = new Map<string, number>();
        rawParsedRows.forEach(row => {
          const drug = row.drugName || row.complexDrugName || row.drug;
          if (!drug) return;
          drugSales.set(drug, (drugSales.get(drug) || 0) + (Number(row.quantity) || 0));
        });
        const totalSales = Array.from(drugSales.values()).reduce((s, v) => s + v, 0);
        const data = Array.from(drugSales.entries())
          .map(([drug, sales]) => ({ drug, sales, share: ((sales / totalSales) * 100).toFixed(2) + '%' }))
          .sort((a, b) => b.sales - a.sales);
        return { data, columns: ['Препарат', 'Продажи', 'Доля'], title: 'Отчет по препаратам' };
      }
      case 'Прогнозный': {
        const yearSales = new Map<number, number>();
        rawParsedRows.forEach(row => {
          const year = row.year || (row.date ? new Date(row.date).getFullYear() : null);
          if (!year) return;
          yearSales.set(year, (yearSales.get(year) || 0) + (Number(row.quantity) || 0));
        });
        const years = [...yearSales.keys()].sort();
        
        const data = years.map(year => {
          const sales = yearSales.get(year) || 0;
          const prevSales = yearSales.get(year - 1) || 0;
          const growth = prevSales > 0 ? ((sales - prevSales) / prevSales * 100).toFixed(1) + '%' : '—';
          return { year: String(year), sales, growth };
        });
        return { data, columns: ['Год', 'Продажи', 'Рост'], title: 'Прогнозный отчет' };
      }
      case 'Сводный годовой': {
        const totalSales = rawParsedRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
        const regionsCount = (tabData?.regionSales || []).length;
        const drugsCount = drugsList.length;
        const contragentsCount = (tabData?.contragentSales || []).length;
        const data = [
          { metric: 'Общие продажи', value: totalSales.toLocaleString() + ' упак.' },
          { metric: 'Регионов', value: String(regionsCount) },
          { metric: 'Препаратов', value: String(drugsCount) },
          { metric: 'Контрагентов', value: String(contragentsCount) },
          { metric: 'Записей обработано', value: String(rawParsedRows.length) }
        ];
        return { data, columns: ['Показатель', 'Значение'], title: 'Сводный годовой отчет' };
      }
      case 'Все данные': {
        const data = rawParsedRows.slice(0, 1000).map(row => ({
          date: row.date || row.operationDate || (row.month && row.year ? `${row.month} ${row.year}` : ''),
          drug: row.drug || row.drugName || row.complexDrugName || '',
          quantity: row.quantity || 0,
          region: row.region || row.receiverRegion || '',
          city: row.city || row.receiverCity || '',
          contragent: row.contragent || row.receiver || ''
        }));
        return { data, columns: ['Дата', 'Препарат', 'Количество', 'Регион', 'Город', 'Контрагент'], title: 'Все данные (первые 1000)' };
      }
      case 'Планы продаж': {
        const data = Object.entries(savedPlans).map(([region, plan]) => {
          const fact = (tabData?.regionSales || []).find(r => r.name === region)?.sales || 0;
          return { region, plan, fact, completion: plan > 0 ? ((fact / plan) * 100).toFixed(1) + '%' : '—' };
        });
        return { data, columns: ['Регион', 'План', 'Факт', 'Выполнение'], title: 'Планы продаж' };
      }
      default:
        return { data: [], columns: [], title: reportType };
    }
  };

  const downloadPDF = (reportType: string) => {
    const { data, columns, title } = getReportData(reportType);
    if (data.length === 0) {
      alert('Нет данных для отчета. Загрузите файлы МДЛП.');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Не удалось открыть окно печати. Разрешите всплывающие окна.');
      return;
    }
    
    const tableRows = data.map(row => 
      `<tr>${Object.values(row).map(v => `<td style="border:1px solid #ddd;padding:8px;">${v}</td>`).join('')}</tr>`
    ).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1e293b; border-bottom: 2px solid #06b6d4; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f1f5f9; border: 1px solid #ddd; padding: 12px; text-align: left; }
          td { border: 1px solid #ddd; padding: 8px; }
          tr:nth-child(even) { background: #f9fafb; }
          .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="meta">Дата формирования: ${new Date().toLocaleDateString('ru-RU')} | Записей: ${data.length}</p>
        <table>
          <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const downloadExcel = (reportType: string) => {
    const { data, columns, title } = getReportData(reportType);
    if (data.length === 0) {
      alert('Нет данных для отчета. Загрузите файлы МДЛП.');
      return;
    }
    
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
      XLSX.utils.sheet_add_aoa(ws, [columns], { origin: 'A1' });
      
      const fileName = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    }).catch(() => {
      alert('Ошибка загрузки библиотеки Excel');
    });
  };

  const previewReport = (reportType: string) => {
    const { data, columns, title } = getReportData(reportType);
    if (data.length === 0) {
      alert('Нет данных для отчета. Загрузите файлы МДЛП.');
      return;
    }
    setReportPreviewData({ title, data: data.slice(0, 100), columns });
    setShowReportPreview(true);
  };

  const allFilesReady = (files.length > 0 && files.every(f => f.status === 'ready')) || (dataLoaded && tabMetadata?.hasData);

  // MDLP Analytics navigation items
  const mdlpNavItems = [
    { id: 'upload', icon: Upload, label: 'Загрузка' },
    { id: 'dashboard', icon: Home, label: 'Дашборд', requiresData: true },
    { id: 'datamanager', icon: Database, label: 'Управление данными', requiresData: true },
    { id: 'problems', icon: AlertTriangle, label: 'Проблемные зоны', requiresData: true },
    { id: 'compare', icon: BarChart3, label: 'Сравнение периодов', requiresData: true },
    { id: 'territory', icon: MapIcon, label: 'Территории', requiresData: true },
    { id: 'drilldown', icon: Navigation, label: 'Детализация региона', requiresData: true },
    { id: 'abc', icon: Layers, label: 'ABC-анализ', requiresData: true },
    { id: 'seasonal', icon: Activity, label: 'Сезонность', requiresData: true },
    { id: 'forecast', icon: Target, label: 'Прогноз', requiresData: true },
    { id: 'contragents', icon: Building2, label: 'Контрагенты', requiresData: true },
    { id: 'reports', icon: FileText, label: 'Отчёты', requiresData: true },
    { id: 'archive', icon: Archive, label: 'Архив отчетов', requiresData: true, badge: savedReports.length || undefined },
  ];
  
  const wmRussiaNavItems = [
    { id: 'wm-dashboard', icon: TrendingUp, label: 'WM Дашборд', section: 'wm-russia', requiresData: true },
    { id: 'wm-districts', icon: Globe, label: 'По округам', section: 'wm-russia', requiresData: true },
    { id: 'wm-products', icon: Package, label: 'По препаратам', section: 'wm-russia', requiresData: true },
    { id: 'percapita', icon: Users, label: 'Аналитика эффективности', section: 'wm-russia', requiresData: true },
    { id: 'calculator', icon: Calculator, label: 'Калькулятор', section: 'wm-russia', requiresData: false },
  ];
  
  // Combined navigation items
  const navItems = [...mdlpNavItems];

  const getStatusColor = (growth) => {
    if (growth >= 18) return 'text-emerald-600 bg-emerald-50';
    if (growth >= 12) return 'text-blue-600 bg-blue-50';
    if (growth >= 5) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  // Компонент кнопки "Назад"
  const BackButton = ({ onClick, label }: { onClick?: () => void; label?: string } = {}) => (
    <button onClick={onClick || goBack} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 rounded-xl text-slate-700 text-sm md:text-base transition-all mb-4 border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md group font-medium">
      <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
      <span>{label || 'Назад'}</span>
    </button>
  );

  // Хлебные крошки для территорий
  const Breadcrumbs = () => (
    <div className="flex items-center gap-2 text-sm mb-4 overflow-x-auto">
      <button onClick={() => setTerritoryPath([])} className="text-cyan-600 hover:underline whitespace-nowrap">ПФО</button>
      {territoryPath.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
          <button 
            onClick={() => setTerritoryPath(territoryPath.slice(0, i + 1))} 
            className={`whitespace-nowrap ${i === territoryPath.length - 1 ? 'text-slate-800 font-medium' : 'text-cyan-600 hover:underline'}`}
          >
            {item}
          </button>
        </React.Fragment>
      ))}
    </div>
  );

  // Получение текущих данных по пути (динамические данные из загруженного файла)
  const getCurrentTerritoryData = () => {
    if (!hasRealData) return { level: 'empty', data: null };
    
    const regions = territoryHierarchy.regions;
    
    if (territoryPath.length === 0) {
      const totalSales = Object.values(regions).reduce((sum: number, r: any) => sum + (r.sales || 0), 0);
      return { 
        level: 'fo', 
        data: { 
          sales: totalSales, 
          regions,
          salesByYear: {}
        } 
      };
    }
    
    const region = regions[territoryPath[0]];
    if (territoryPath.length === 1 && region) {
      return { level: 'region', data: region, name: territoryPath[0] };
    }
    
    const city = region?.children?.[territoryPath[1]];
    if (territoryPath.length === 2 && city) {
      return { level: 'city', data: city, name: territoryPath[1] };
    }
    
    const district = city?.children?.[territoryPath[2]];
    if (territoryPath.length === 3 && district) {
      return { level: 'district', data: district, name: territoryPath[2] };
    }
    
    return { level: 'empty', data: null };
  };

  // Стандартные типы выбытия (полные названия из Excel)
  const defaultDisposalTypes = [
    'Продажа',
    'Медицинское использование', 
    'Выбытие через дистанционную торговлю',
    'Отпуск ЛП по документам',
    'Отпуск по льготному рецепту',
    'По причине уничтожения',
    'Выбытие по иным причинам',
    'Экспорт'
  ];

  // Фиксированные года для фильтра
  const fixedYears = ['2024', '2025', '2026'];
  
  // Опции периодов для MultiSelect
  const periodOptions: MultiSelectOption[] = [
    { value: 'year', label: 'Год' },
    { value: 'quarter', label: 'Квартал' },
    { value: 'month', label: 'Месяц' },
    { value: 'week', label: 'Неделя' }
  ];
  
  // Опции для мульти-селектов
  const drugsOptions: MultiSelectOption[] = drugsList.map(d => ({ value: d, label: d }));
  const yearsOptions: MultiSelectOption[] = fixedYears.map(y => ({ value: y, label: y + ' год' }));
  const regionsOptions: MultiSelectOption[] = regionsList.map(r => ({ value: r, label: r }));
  const disposalTypeOptions: MultiSelectOption[] = defaultDisposalTypes.map(t => ({ value: t, label: t }));
  const contractorGroupsOptions: MultiSelectOption[] = contractorGroupsList.map(g => ({ value: g, label: g }));
  const federalDistrictsOptions: MultiSelectOption[] = federalDistrictsList.map(fd => ({ value: fd, label: fd.replace('федеральный округ', 'ФО').replace('Федеральный округ', 'ФО') }));
  const managersOptions: MultiSelectOption[] = managersList.map(m => ({ value: m, label: m }));
  
  // Получить регионы выбранных менеджеров для фильтрации
  const getManagerRegions = useCallback((managers: string[]): string[] => {
    if (managers.length === 0) return [];
    const regions = new Set<string>();
    managers.forEach(m => {
      (managerTerritories[m] || defaultManagerTerritories[m] || []).forEach(r => regions.add(r));
    });
    return [...regions];
  }, [managerTerritories]);
  
  // Получить название выбранных препаратов
  const getDrugName = () => {
    if (selectedDrugs.length === 0 || selectedDrugs.length === drugsList.length) return 'Все препараты';
    if (selectedDrugs.length === 1) return selectedDrugs[0];
    return `${selectedDrugs.length} препаратов`;
  };
  
  // Получить название выбранных годов
  const getYearName = () => {
    if (selectedYears.length === 0 || selectedYears.length === availableYears.length) return 'Все года';
    return selectedYears.join(', ');
  };
  
  // Функция для получения номера недели месяца из даты
  const getWeekOfMonth = (dateStr: string): number => {
    let date: Date | null = null;
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      date = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    } else {
      const ruMatch = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
      if (ruMatch) {
        date = new Date(parseInt(ruMatch[3]), parseInt(ruMatch[2]) - 1, parseInt(ruMatch[1]));
      }
    }
    if (!date || isNaN(date.getTime())) return 1;
    const day = date.getDate();
    return Math.ceil(day / 7);
  };

  // Получить месяц из даты
  const getMonthFromDate = (dateStr: string): string | null => {
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    let monthIdx = -1;
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      monthIdx = parseInt(isoMatch[2]) - 1;
    } else {
      const ruMatch = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
      if (ruMatch) {
        monthIdx = parseInt(ruMatch[2]) - 1;
      }
    }
    return monthIdx >= 0 && monthIdx < 12 ? monthNames[monthIdx] : null;
  };

  // Получить год из даты
  const getYearFromDate = (dateStr: string): number | null => {
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return parseInt(isoMatch[1]);
    }
    const ruMatch = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    if (ruMatch) {
      return parseInt(ruMatch[3]);
    }
    return null;
  };

  const getWeeklyBreakdown = useCallback(() => {
    const result: Record<string, Record<number, number>> = {};
    const weekTotals: Record<number, number> = {};
    
    const monthFullToShort: Record<string, string> = {
      'Январь': 'Янв', 'Февраль': 'Фев', 'Март': 'Мар', 'Апрель': 'Апр',
      'Май': 'Май', 'Июнь': 'Июн', 'Июль': 'Июл', 'Август': 'Авг',
      'Сентябрь': 'Сен', 'Октябрь': 'Окт', 'Ноябрь': 'Ноя', 'Декабрь': 'Дек'
    };
    const shortMonth = monthFullToShort[weeklyAnalysisMonth] || weeklyAnalysisMonth;
    const yearKey = String(weeklyAnalysisYear);

    const weeklySalesPerYear = tabData?.weeklySalesPerYear || {};
    const yearWeekly: any[] = weeklySalesPerYear[yearKey] || [];
    const monthWeekly = yearWeekly.filter((w: any) => w.month === shortMonth);

    if (monthWeekly.length > 0) {
      const maxWeek = Math.max(...monthWeekly.map((w: any) => w.week));
      const weekCount = Math.min(maxWeek, 5);
      const resultAmt: Record<string, Record<number, number>> = {};
      const weekTotalsAmt: Record<number, number> = {};

      for (const entry of monthWeekly) {
        const drug = entry.drug || 'Не указано';
        if (!result[drug]) result[drug] = {};
        if (!resultAmt[drug]) resultAmt[drug] = {};
        result[drug][entry.week] = (result[drug][entry.week] || 0) + (entry.quantity || 0);
        resultAmt[drug][entry.week] = (resultAmt[drug][entry.week] || 0) + (entry.amount || 0);
        weekTotals[entry.week] = (weekTotals[entry.week] || 0) + (entry.quantity || 0);
        weekTotalsAmt[entry.week] = (weekTotalsAmt[entry.week] || 0) + (entry.amount || 0);
      }

      const drugData = Object.entries(result).map(([drug, weeks]) => {
        const total = Object.values(weeks).reduce((s, v) => s + v, 0);
        const totalAmt = Object.values(resultAmt[drug] || {}).reduce((s, v) => s + v, 0);
        const weekValues: number[] = [];
        const weekValuesAmt: number[] = [];
        for (let w = 1; w <= weekCount; w++) {
          weekValues.push(weeks[w] || 0);
          weekValuesAmt.push(resultAmt[drug]?.[w] || 0);
        }

        let avgGrowth = 0;
        const filledWeeks = weekValues.filter(v => v > 0);
        if (filledWeeks.length >= 2) {
          const growths: number[] = [];
          for (let i = 1; i < weekValues.length; i++) {
            if (weekValues[i - 1] > 0) {
              growths.push(((weekValues[i] - weekValues[i - 1]) / weekValues[i - 1]) * 100);
            }
          }
          avgGrowth = growths.length > 0 ? growths.reduce((s, g) => s + g, 0) / growths.length : 0;
        }
        const forecast = total;
        return { drug, weeks: weekValues, weeksAmt: weekValuesAmt, total, totalAmt, avgGrowth, forecast };
      }).sort((a, b) => b.total - a.total);

      return { drugData, weekTotals, weekTotalsAmt, hasRealData: true, weekCount };
    }

    const srcDrugs = tabData?.drugSales || uploadedData?.drugSales || [];
    const srcCombined = tabData?.combinedData || uploadedData?.combinedData || [];
    const srcMonthly = tabData?.monthlySales || uploadedData?.monthlySales || [];

    const hasCombinedYear = srcCombined.some((c: any) => c[yearKey] > 0);
    let yearTotal = 0;
    let monthSales = 0;
    if (hasCombinedYear) {
      yearTotal = srcCombined.reduce((s: number, c: any) => s + (c[yearKey] || 0), 0);
      const monthEntry = srcCombined.find((c: any) => c.month === shortMonth);
      monthSales = monthEntry?.[yearKey] || 0;
    } else {
      const hasYearField = srcMonthly.some((m: any) => m.year !== undefined);
      const yearMonthly = hasYearField ? srcMonthly.filter((m: any) => m.year === weeklyAnalysisYear) : srcMonthly;
      yearTotal = yearMonthly.reduce((s: number, m: any) => s + (m.sales || 0), 0);
      const monthEntry = yearMonthly.find((m: any) => m.month === shortMonth);
      monthSales = monthEntry?.sales || 0;
    }

    if (yearTotal === 0 || monthSales === 0 || srcDrugs.length === 0) {
      return { drugData: [], weekTotals: {}, weekTotalsAmt: {}, hasRealData: false, weekCount: 4 };
    }

    const monthRatio = monthSales / yearTotal;
    srcDrugs.forEach((d: any) => {
      const drug = d.name || 'Не указано';
      const total = Math.round((d.sales || 0) * monthRatio);
      const weekAvg = Math.round(total / 4);
      result[drug] = { 1: weekAvg, 2: weekAvg, 3: weekAvg, 4: total - weekAvg * 3 };
      for (let w = 1; w <= 4; w++) {
        weekTotals[w] = (weekTotals[w] || 0) + (result[drug][w] || 0);
      }
    });

    const drugData = Object.entries(result).map(([drug, weeks]) => {
      const total = Object.values(weeks).reduce((s, v) => s + v, 0);
      const weekValues = [weeks[1] || 0, weeks[2] || 0, weeks[3] || 0, weeks[4] || 0];
      return { drug, weeks: weekValues, weeksAmt: weekValues, total, totalAmt: total, avgGrowth: 0, forecast: total };
    }).sort((a, b) => b.total - a.total);

    return { drugData, weekTotals, weekTotalsAmt: weekTotals, hasRealData: false, weekCount: 4 };
  }, [tabData?.weeklySalesPerYear, tabData?.drugSales, tabData?.monthlySales, tabData?.combinedData, uploadedData?.drugSales, uploadedData?.monthlySales, uploadedData?.combinedData, weeklyAnalysisMonth, weeklyAnalysisYear]);

  // Маппинг коротких названий месяцев в полные
  const monthShortToFull: Record<string, string> = {
    'Янв': 'Январь', 'Фев': 'Февраль', 'Мар': 'Март', 'Апр': 'Апрель',
    'Май': 'Май', 'Июн': 'Июнь', 'Июл': 'Июль', 'Авг': 'Август',
    'Сен': 'Сентябрь', 'Окт': 'Октябрь', 'Ноя': 'Ноябрь', 'Дек': 'Декабрь'
  };

  // Доступные месяцы из данных
  const availableMonthsForWeekly = useMemo(() => {
    const allMonthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const months = new Set<string>();
    const srcMonthly = tabData?.monthlySales || uploadedData?.monthlySales || [];
    srcMonthly.forEach((m: any) => {
      const fullMonth = monthShortToFull[m.month] || m.name || m.month;
      if (allMonthNames.includes(fullMonth)) months.add(fullMonth);
    });
    if (months.size === 0 && tabMetadata?.hasData) return allMonthNames;
    return allMonthNames.filter(m => months.has(m));
  }, [tabData?.monthlySales, uploadedData?.monthlySales, tabMetadata?.hasData]);

  const availableYearsForWeekly = useMemo(() => {
    const srcYears = (tabMetadata?.years || availableYears || []).map((y: any) => Number(y)).filter((y: number) => y >= 2000 && y <= 2100);
    return srcYears.sort((a: number, b: number) => b - a);
  }, [tabMetadata?.years, availableYears]);

  // Инициализация месяца и года для понедельного анализа при загрузке данных
  React.useEffect(() => {
    if (availableMonthsForWeekly.length > 0 && !availableMonthsForWeekly.includes(weeklyAnalysisMonth)) {
      setWeeklyAnalysisMonth(availableMonthsForWeekly[availableMonthsForWeekly.length - 1]);
    }
    if (availableYearsForWeekly.length > 0 && !availableYearsForWeekly.includes(weeklyAnalysisYear)) {
      setWeeklyAnalysisYear(availableYearsForWeekly[0]);
    }
  }, [availableMonthsForWeekly, availableYearsForWeekly]);

  // Загрузка истории загрузок при переключении на соответствующий таб
  React.useEffect(() => {
    if (dataManagerTab === 4 && currentUser) {
      api.uploadHistory.getAll()
        .then(history => setUploadHistoryList(history))
        .catch(e => console.error('Ошибка загрузки истории:', e));
    }
    // Загрузка маппинга колонок
    if (dataManagerTab === 5 && currentUser) {
      api.columnMappings.getAll()
        .then(mappings => setColumnMappings(mappings))
        .catch(e => console.error('Ошибка загрузки маппингов:', e));
    }
    // Загрузка территорий медпредов
    if (dataManagerTab === 6 && currentUser) {
      api.salesRepTerritories.getAll()
        .then(territories => setSalesRepTerritories(territories))
        .catch(e => console.error('Ошибка загрузки территорий:', e));
    }
  }, [dataManagerTab, currentUser]);

  // Проверка отображения года на графиках (пустой массив = все)
  const shouldShowYear = (year: string) => {
    return selectedYears.length === 0 || selectedYears.includes(year);
  };
  
  // Фильтрация данных по всем выбранным критериям
  const getFilteredData = useCallback(() => {
    if (!uploadedData) return null;
    
    // Проверяем, нужна ли фильтрация
    const noFilter = 
      (selectedDrugs.length === 0 || selectedDrugs.length === drugsList.length) &&
      (selectedRegions.length === 0 || selectedRegions.length === regionsList.length) &&
      (selectedYears.length === 0 || selectedYears.length === availableYears.length) &&
      (selectedDisposalTypes.length === 0 || selectedDisposalTypes.length >= defaultDisposalTypes.length) &&
      (selectedContractorGroups.length === 0 || selectedContractorGroups.length === contractorGroupsList.length) &&
      (selectedManagers.length === 0) &&
      (selectedFederalDistricts.length === 0 || selectedFederalDistricts.length === federalDistrictsList.length);
    
    if (noFilter) {
      return {
        monthlySales: uploadedData.monthlySales,
        regionSales: uploadedData.regionSales,
        contragentSales: uploadedData.contragentSales,
        drugSales: uploadedData.drugSales,
        combinedData: uploadedData.combinedData,
      };
    }
    
    // Если нет сырых данных, используем фильтрацию по агрегированным данным uploadedData
    // Примечание: без сырых данных невозможно фильтровать по годам и типам выбытия на уровне записей,
    // но можно фильтровать агрегированные данные по доступным критериям (регионы, препараты, группы, менеджеры)
    if (rawParsedRows.length === 0) {
      const managerRegions = getManagerRegions(selectedManagers);
      
      const contragentFiltered = uploadedData.contragentSales?.filter((c: any) => {
        const matchesRegionFilter = selectedRegions.length === 0 || selectedRegions.includes(c.region);
        const matchesGroup = selectedContractorGroups.length === 0 || 
          selectedContractorGroups.some((g: string) => (c.contractorGroup || '').includes(g));
        const matchesManagerFilter = selectedManagers.length === 0 || 
          managerRegions.some(r => matchesRegion(r, c.region || ''));
        return matchesRegionFilter && matchesGroup && matchesManagerFilter;
      }) || [];
      
      const regionFiltered = uploadedData.regionSales?.filter((r: any) => {
        const matchesRegionFilter = selectedRegions.length === 0 || selectedRegions.includes(r.name);
        const matchesManagerFilter = selectedManagers.length === 0 || 
          managerRegions.some(mr => matchesRegion(mr, r.name || ''));
        return matchesRegionFilter && matchesManagerFilter;
      }) || [];
      
      const drugFiltered = uploadedData.drugSales?.filter((d: any) => {
        return selectedDrugs.length === 0 || selectedDrugs.includes(d.name);
      }) || [];
      
      // Фильтрация месячных данных по годам если combinedData доступен
      let monthlyFiltered = uploadedData.monthlySales;
      if (selectedYears.length > 0 && uploadedData.combinedData?.length > 0) {
        const monthlyMap: Record<string, { month: string; name: string; sales: number }> = {};
        uploadedData.combinedData.forEach((row: any) => {
          selectedYears.forEach(year => {
            // Годы хранятся как ключи "2024", "2025", а не "sales2024"
            const yearValue = row[year] || row[String(year)];
            if (yearValue) {
              const key = row.month;
              if (!monthlyMap[key]) {
                monthlyMap[key] = { month: row.month, name: row.name, sales: 0 };
              }
              monthlyMap[key].sales += yearValue;
            }
          });
        });
        if (Object.keys(monthlyMap).length > 0) {
          monthlyFiltered = Object.values(monthlyMap);
        }
      }
      
      return {
        monthlySales: monthlyFiltered || uploadedData.monthlySales,
        regionSales: regionFiltered,
        contragentSales: contragentFiltered,
        drugSales: drugFiltered,
        combinedData: uploadedData.combinedData,
      };
    }
    
    // Фильтруем сырые данные по всем критериям
    const managerRegions = getManagerRegions(selectedManagers);
    const filteredRows = rawParsedRows.filter(row => {
      const matchesDrug = selectedDrugs.length === 0 || 
        selectedDrugs.some(d => row.drug?.includes(d) || row.complexDrugName?.includes(d));
      const matchesRegionFilter = selectedRegions.length === 0 || 
        selectedRegions.includes(row.region);
      const matchesFederalDistrict = selectedFederalDistricts.length === 0 || 
        selectedFederalDistricts.includes(row.federalDistrict);
      const matchesManagerFilter = selectedManagers.length === 0 || 
        managerRegions.some(r => matchesRegion(r, row.region || ''));
      const matchesYear = selectedYears.length === 0 || 
        selectedYears.includes(String(row.year));
      const matchesDisposalType = selectedDisposalTypes.length === 0 || 
        selectedDisposalTypes.includes(row.disposalType);
      const matchesContractorGroup = selectedContractorGroups.length === 0 ||
        selectedContractorGroups.some((g: string) => (row.contractorGroup || '').includes(g));
      
      return matchesDrug && matchesRegionFilter && matchesFederalDistrict && matchesManagerFilter && matchesYear && matchesDisposalType && matchesContractorGroup;
    });
    
    if (filteredRows.length === 0) {
      return {
        monthlySales: [],
        regionSales: [],
        contragentSales: [],
        drugSales: [],
        combinedData: uploadedData.combinedData,
      };
    }
    
    // Агрегируем отфильтрованные данные
    const regionSalesMap = new Map<string, number>();
    const contragentSalesMap = new Map<string, { sales: number; region?: string; city?: string; receiverType?: string; contractorGroup?: string }>();
    const drugSalesMap = new Map<string, number>();
    const monthSalesMap = new Map<string, { month: string; name: string; sales: number }>();
    
    const MONTH_NAMES: Record<string, string> = {
      'Янв': 'Январь', 'Фев': 'Февраль', 'Мар': 'Март', 'Апр': 'Апрель',
      'Май': 'Май', 'Июн': 'Июнь', 'Июл': 'Июль', 'Авг': 'Август',
      'Сен': 'Сентябрь', 'Окт': 'Октябрь', 'Ноя': 'Ноябрь', 'Дек': 'Декабрь',
    };
    
    filteredRows.forEach(row => {
      const sales = row.amount || row.quantity || 0;
      
      if (row.region) {
        regionSalesMap.set(row.region, (regionSalesMap.get(row.region) || 0) + sales);
      }
      
      if (row.contragent) {
        const existing = contragentSalesMap.get(row.contragent);
        if (existing) {
          existing.sales += sales;
        } else {
          contragentSalesMap.set(row.contragent, {
            sales,
            region: row.region,
            city: row.city,
            receiverType: row.receiverType,
            contractorGroup: row.contractorGroup,
          });
        }
      }

      if (row.drug) {
        drugSalesMap.set(row.drug, (drugSalesMap.get(row.drug) || 0) + sales);
      }
      
      if (row.month) {
        const existing = monthSalesMap.get(row.month);
        if (existing) {
          existing.sales += sales;
        } else {
          monthSalesMap.set(row.month, { 
            month: row.month, 
            name: MONTH_NAMES[row.month] || row.month,
            sales 
          });
        }
      }
    });
    
    if (contragentSalesMap.size === 0 && contragentRows.length > 0) {
      contragentRows.forEach((crow: any) => {
        const matchesDrug = selectedDrugs.length === 0 || selectedDrugs.includes(crow.drug);
        const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(crow.region);
        const matchesYear = selectedYears.length === 0 || selectedYears.includes(String(crow.year));
        const matchesContractorGroup = selectedContractorGroups.length === 0 ||
          selectedContractorGroups.some((g: string) => (crow.contractorGroup || '').includes(g));
        
        if (matchesDrug && matchesRegion && matchesYear && matchesContractorGroup && crow.contragent) {
          const existing = contragentSalesMap.get(crow.contragent);
          const qty = crow.quantity || 0;
          if (existing) {
            existing.sales += qty;
          } else {
            contragentSalesMap.set(crow.contragent, {
              sales: qty,
              region: crow.region,
              receiverType: crow.receiverType,
              contractorGroup: crow.contractorGroup,
            });
          }
        }
      });
    }

    return {
      monthlySales: Array.from(monthSalesMap.values()),
      regionSales: Array.from(regionSalesMap.entries())
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales),
      contragentSales: Array.from(contragentSalesMap.entries())
        .map(([name, data]) => ({ 
          name, 
          sales: data.sales,
          region: data.region,
          city: data.city,
          receiverType: data.receiverType,
          contractorGroup: data.contractorGroup,
        }))
        .sort((a, b) => b.sales - a.sales),
      drugSales: Array.from(drugSalesMap.entries())
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales),
      combinedData: uploadedData.combinedData,
    };
  }, [uploadedData, rawParsedRows, contragentRows, selectedDrugs, selectedRegions, selectedFederalDistricts, selectedManagers, getManagerRegions, selectedYears, selectedDisposalTypes, selectedContractorGroups, drugsList.length, regionsList.length, federalDistrictsList.length, managersList.length, availableYears.length, disposalTypeSales.length, contractorGroupsList.length]);
  
  const filteredData = useMemo(() => {
    if (tabData && tabData.hasData) {
      return {
        monthlySales: tabData.monthlySales || [],
        regionSales: tabData.regionSales || [],
        contragentSales: tabData.contragentSales || [],
        drugSales: tabData.drugSales || [],
        combinedData: tabData.combinedData || [],
      };
    }
    if (uploadedData) {
      return getFilteredData();
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabData, uploadedData, selectedDrugs, selectedRegions, selectedYears, selectedDisposalTypes, selectedFederalDistricts, selectedContractorGroups]);
  
  // Продажи по менеджерам (на основе их территорий)
  const managerSales = useMemo(() => {
    const regionSalesSource = filteredData?.regionSales || tabData?.regionSales || [];
    if (regionSalesSource.length === 0 && rawParsedRows.length === 0) return [];
    const result: { name: string; sales: number; regions: number; regionsCount: number }[] = [];
    managersList.forEach(manager => {
      const mgrRegions = managerTerritories[manager] || defaultManagerTerritories[manager] || [];
      let totalSales = 0;
      const matchedRegions = new Set<string>();
      if (regionSalesSource.length > 0) {
        regionSalesSource.forEach((r: any) => {
          const isMatch = mgrRegions.some(mr => matchesRegion(mr, r.name));
          if (isMatch) {
            totalSales += r.sales || 0;
            matchedRegions.add(r.name);
          }
        });
      } else {
        rawParsedRows.forEach(row => {
          const rowRegion = row.region || '';
          const isMatch = mgrRegions.some(r => matchesRegion(r, rowRegion));
          if (isMatch) {
            totalSales += row.quantity || 0;
            if (rowRegion) matchedRegions.add(rowRegion);
          }
        });
      }
      result.push({ name: manager, sales: totalSales, regions: matchedRegions.size, regionsCount: mgrRegions.length });
    });
    return result.sort((a, b) => b.sales - a.sales);
  }, [rawParsedRows, managersList, managerTerritories, filteredData?.regionSales, tabData?.regionSales]);
  
  // Определение несопоставленных данных (регионы, препараты, контрагенты)
  const unmatchedData = useMemo(() => {
    const regionSalesSource = filteredData?.regionSales || tabData?.regionSales || [];
    if (rawParsedRows.length === 0 && regionSalesSource.length === 0) return { regions: [], contractors: [], totalUnmatchedSales: 0 };
    
    const allManagerRegions: string[] = [];
    managersList.forEach(manager => {
      const regions = managerTerritories[manager] || defaultManagerTerritories[manager] || [];
      allManagerRegions.push(...regions);
    });
    
    const unmatchedRegions: { region: string; sales: number; count: number }[] = [];
    
    if (regionSalesSource.length > 0) {
      regionSalesSource.forEach((r: any) => {
        const isAssigned = allManagerRegions.some(mr => matchesRegion(mr, r.name));
        if (!isAssigned) {
          unmatchedRegions.push({ region: r.name, sales: r.sales || 0, count: 1 });
        }
      });
    } else {
      const regionSalesMap = new Map<string, { sales: number; count: number }>();
      rawParsedRows.forEach(row => {
        const rowRegion = row.region || '';
        if (!rowRegion) return;
        const isAssigned = allManagerRegions.some(r => matchesRegion(r, rowRegion));
        if (!isAssigned) {
          const existing = regionSalesMap.get(rowRegion) || { sales: 0, count: 0 };
          regionSalesMap.set(rowRegion, { sales: existing.sales + (row.quantity || 0), count: existing.count + 1 });
        }
      });
      regionSalesMap.forEach((data, region) => {
        unmatchedRegions.push({ region, sales: data.sales, count: data.count });
      });
    }
    
    const unmatchedContractors: { contractor: string; sales: number; count: number }[] = [];
    const contractorSalesMap = new Map<string, { sales: number; count: number }>();
    rawParsedRows.forEach(row => {
      const contractorName = row.contragent || row.receiverName || '';
      const contractorGroup = row.contractorGroup || '';
      if (!contractorName) return;
      if (!contractorGroup || contractorGroup === 'Прочие' || contractorGroup === 'Неизвестно') {
        const existing = contractorSalesMap.get(contractorName) || { sales: 0, count: 0 };
        contractorSalesMap.set(contractorName, { sales: existing.sales + (row.quantity || 0), count: existing.count + 1 });
      }
    });
    contractorSalesMap.forEach((data, contractor) => {
      unmatchedContractors.push({ contractor, sales: data.sales, count: data.count });
    });
    
    const totalUnmatchedSales = unmatchedRegions.reduce((sum, r) => sum + r.sales, 0);
    
    return {
      regions: unmatchedRegions.sort((a, b) => b.sales - a.sales),
      contractors: unmatchedContractors.sort((a, b) => b.sales - a.sales).slice(0, 50),
      totalUnmatchedSales
    };
  }, [rawParsedRows, managersList, managerTerritories, filteredData?.regionSales, tabData?.regionSales]);
  
  // Состояние для показа/скрытия блока несопоставленных данных
  const [showUnmatchedAlert, setShowUnmatchedAlert] = useState(false);
  
  // Отфильтрованные данные по годам для графиков
  const combinedData = useMemo(() => {
    if (!combinedDataRaw.length) return [];
    // Если нет фильтра по годам, показываем все
    if (selectedYears.length === 0) return combinedDataRaw;
    // Иначе фильтруем данные - оставляем только выбранные годы в каждой строке
    return combinedDataRaw.map((row: any) => {
      const filteredRow: any = { month: row.month, name: row.name };
      selectedYears.forEach((year: string) => {
        if (row[year] !== undefined) filteredRow[year] = row[year];
        if (row[`forecast${year}`] !== undefined) filteredRow[`forecast${year}`] = row[`forecast${year}`];
      });
      // Также добавляем forecast для следующего года после последнего выбранного
      const maxYear = Math.max(...selectedYears.map(y => parseInt(y)));
      const forecastKey = `forecast${maxYear + 1}`;
      if (row[forecastKey] !== undefined) filteredRow[forecastKey] = row[forecastKey];
      return filteredRow;
    });
  }, [combinedDataRaw, selectedYears]);

  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">Загрузка данных</h2>
          <p className="text-cyan-300/70">Пожалуйста, подождите...</p>
        </div>
      </div>
    );
  }

  // Экран выбора пользователя
  if (showUserSelect) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Футуристичные геометрические фоны в стиле Захи Хадид */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-purple-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl w-full relative z-10 grid md:grid-cols-2 gap-8 items-center">
          {/* Левая часть - Изображение */}
          <div className="hidden md:block">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/40 border border-white/20 group">
              <img 
                src={loginImage}
                alt="Analytics"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="backdrop-blur-sm bg-white/10 rounded-2xl p-6 border border-white/20">
                  <h3 className="text-2xl font-black text-white mb-2 bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                    Мощная аналитика
                  </h3>
                  <p className="text-cyan-100/90 text-sm">
                    Полный контроль над продажами лекарственных препаратов в режиме реального времени
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Правая часть - Форма входа */}
          <div>
            {/* Верхняя часть - Логотип и название */}
            <div className="text-center mb-8">
              <div className="mb-4 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl blur-2xl opacity-50 animate-pulse" />
                  <Logo size="large" showText={false} />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2 tracking-tight">
                Анализатор продаж
              </h1>
              <p className="text-cyan-300/80 font-medium">World Medicine · MDLP Analytics Pro</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-6 md:p-8 shadow-2xl shadow-black/40 relative overflow-hidden">
              {/* Декоративные элементы в стиле Захи Хадид */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-cyan-500/20 to-transparent rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-2xl" />
              
              <div className="relative z-10">
            {!showPasswordReset ? (
              <>
                <h2 className="text-2xl font-black text-white mb-6 text-center bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                  {isRegisterMode ? 'Регистрация' : 'Авторизация'}
                </h2>
                
                <div className="space-y-4">
                  {isRegisterMode && (
                    <div>
                      <label className="block text-sm font-bold text-cyan-300 mb-2">
                        Ваше имя
                      </label>
                      <input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                        placeholder="Иван Иванов"
                        className="w-full px-4 py-4 bg-white/10 backdrop-blur border-2 border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-white placeholder-white/40 transition-all"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-bold text-cyan-300 mb-2">
                      Электронная почта
                    </label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (isRegisterMode ? handleRegister() : handleLogin())}
                      placeholder="email@example.com"
                      className="w-full px-4 py-4 bg-white/10 backdrop-blur border-2 border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-white placeholder-white/40 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-cyan-300 mb-2">
                      Пароль
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (isRegisterMode ? handleRegister() : handleLogin())}
                        placeholder="••••••••"
                        className="w-full px-4 py-4 pr-12 bg-white/10 backdrop-blur border-2 border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-white placeholder-white/40 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors p-1"
                        aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  
                  {loginError && (
                    <div className="p-4 bg-red-500/20 border-2 border-red-400/50 rounded-xl flex items-center gap-3 backdrop-blur">
                      <AlertCircle className="text-red-300" size={20} />
                      <p className="text-sm text-red-200 font-medium">{loginError}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={isRegisterMode ? handleRegister : handleLogin}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white rounded-xl font-bold hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 transition-all shadow-2xl shadow-cyan-500/50 hover:shadow-cyan-500/70 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <User size={20} />
                    {isRegisterMode ? 'Зарегистрироваться' : 'Войти в систему'}
                  </button>
                  
                  {!isRegisterMode && (
                    <div className="text-center">
                      <button
                        onClick={() => {
                          setShowPasswordReset(true);
                          setLoginError('');
                        }}
                        className="text-sm text-cyan-300 hover:text-cyan-200 hover:underline font-medium"
                      >
                        Забыли пароль?
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 pt-4 border-t border-white/10">
                  <p className="text-xs text-cyan-200/60 text-center mb-3">
                    {isRegisterMode 
                      ? 'Введите ваши данные для регистрации'
                      : 'Введите email и пароль для входа'
                    }
                  </p>
                  <button
                    onClick={() => {
                      setIsRegisterMode(!isRegisterMode);
                      setLoginError('');
                      setRegisterName('');
                    }}
                    className="w-full py-2 text-sm text-cyan-300 hover:text-cyan-200 font-medium hover:bg-white/5 rounded-lg transition-all"
                  >
                    {isRegisterMode ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => {
                      setShowPasswordReset(false);
                      setResetEmail('');
                      setLoginError('');
                    }}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all"
                  >
                    <ArrowLeft size={20} className="text-cyan-300" />
                  </button>
                  <h2 className="text-2xl font-black text-white bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">Восстановление пароля</h2>
                </div>
                
                {!resetSuccess ? (
                  <div className="space-y-4">
                    <p className="text-sm text-cyan-200/80 font-medium">
                      Введите корпоративную почту, на которую будет отправлена ссылка для сброса пароля
                    </p>
                    
                    <div>
                      <label className="block text-sm font-bold text-cyan-300 mb-2">
                        Электронная почта
                      </label>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handlePasswordReset()}
                        placeholder="email@example.com"
                        className="w-full px-4 py-4 bg-white/10 backdrop-blur border-2 border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-white placeholder-white/40 transition-all"
                      />
                    </div>
                    
                    {loginError && (
                      <div className="p-4 bg-red-500/20 border-2 border-red-400/50 rounded-xl flex items-center gap-3 backdrop-blur">
                        <AlertCircle className="text-red-300" size={20} />
                        <p className="text-sm text-red-200 font-medium">{loginError}</p>
                      </div>
                    )}
                    
                    <button
                      onClick={handlePasswordReset}
                      className="w-full py-3 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white rounded-xl font-bold hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 transition-all shadow-2xl shadow-cyan-500/50 hover:shadow-cyan-500/70 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      <Mail size={18} />
                      Отправить ссылку для сброса
                    </button>
                  </div>
                ) : (
                  <div className="p-6 bg-emerald-500/20 border-2 border-emerald-400/50 rounded-2xl backdrop-blur">
                    <div className="flex items-start gap-3 mb-3">
                      <CheckCircle className="text-emerald-300 flex-shrink-0 mt-0.5" size={24} />
                      <div>
                        <p className="font-bold text-emerald-200 mb-2 text-lg">Письмо отправлено!</p>
                        <p className="text-sm text-emerald-300/90">
                          Проверьте почту <strong className="text-white">{resetEmail}</strong>. Ссылка для сброса пароля отправлена.
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-300/70 mt-4">
                      Автоматический возврат на форму входа...
                    </p>
                  </div>
                )}
                
                <div className="mt-6 pt-4 border-t border-white/10">
                  <p className="text-xs text-cyan-200/60 text-center">
                    Письмо не пришло? Проверьте папку "Спам"<br />
                    <span className="text-white/40">или обратитесь в IT-отдел</span>
                  </p>
                </div>
              </>
            )}
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // --- WM Russia personal cabinet mode ---
  // WM users can switch to their personal dashboard via sidebar button
  const wmRoles: string[] = ['director', 'admin', 'manager', 'territory_manager', 'medrep'];
  if (appMode === 'wm-russia' && currentUser && wmRoles.includes(currentUser.role)) {
    const wmUser: WMUser | undefined = wmMockUsers.find(u => u.email === currentUser.email);
    const mappedUser: WMUser = wmUser || {
      id: currentUser.id.toString(),
      email: currentUser.email,
      name: currentUser.name,
      role: currentUser.role as WMUserRole,
    };
    return (
      <ThemeProvider>
        <WMRussiaApp
          initialUser={mappedUser}
          mdlpUserId={Number(currentUser.id)}
          onBackToMDLP={() => {
            // Если сессия МДЛП не активна — восстановить из WM Russia сессии
            if (!currentUser) {
              try {
                const wmUser = localStorage.getItem('wm_russia_user');
                const token = localStorage.getItem('wm_auth_token');
                if (wmUser && token) {
                  const u = JSON.parse(wmUser);
                  const mdlpUser = { id: u.id, email: u.email, name: u.name, role: u.role, avatar: u.avatar };
                  setCurrentUser(mdlpUser as any);
                  localStorage.setItem('mdlp_user', JSON.stringify(mdlpUser));
                  setShowUserSelect(false);
                }
              } catch {}
            }
            setAppMode('mdlp');
          }}
          onLogoutToMain={() => {
            setCurrentUser(null);
            localStorage.removeItem('mdlp_user');
            setShowUserSelect(true);
          }}
        />
      </ThemeProvider>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 flex flex-col md:flex-row">
      {dbStatus !== 'connected' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: 'white', padding: '12px 20px', textAlign: 'center',
          fontSize: '14px', fontWeight: 500,
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        }}>
          ⚠️ {dbStatus === 'circuit-open'
            ? `База данных временно недоступна. Попробуйте через 2 минуты.`
            : dbStatus === 'disconnected'
            ? `Соединение с базой данных потеряно. Восстановление...`
            : `Сервер недоступен. Проверьте соединение.`
          }
        </div>
      )}
      {/* Глобальный баннер прогресса загрузки */}
      {isUploading && files.some(f => f.status === 'uploading') && (() => {
        const uploadingFile = files.find(f => f.status === 'uploading');
        const prog = uploadingFile?.progress ?? 0;
        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
            background: 'linear-gradient(135deg, #0e7490, #1d4ed8)',
            color: 'white', padding: '10px 20px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Загрузка файла: {uploadingFile?.name}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700 }}>{prog}%</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
              <div style={{
                background: 'white',
                borderRadius: 99,
                height: '100%',
                width: `${prog}%`,
                transition: 'width 0.4s ease',
              }} />
            </div>
            {uploadingFile?.statusText && (
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{uploadingFile.statusText}</div>
            )}
          </div>
        );
      })()}
      {/* Mobile Header */}
      <div className="md:hidden bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm p-3 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <Menu size={24} className="text-slate-600" />
        </button>
        <Logo size="small" showText={true} />
        <button onClick={logout} className="p-2 hover:bg-red-50 rounded-lg transition-colors group">
          <LogOut size={20} className="text-slate-600 group-hover:text-red-600 transition-colors" />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        ${sidebarCollapsed ? 'w-16' : 'w-64'} 
        bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white 
        flex flex-col transition-all duration-300 relative flex-shrink-0 shadow-2xl
        ${mobileMenuOpen ? 'fixed inset-0 z-40 w-64' : 'hidden md:flex'}
      `}>
        <div className="p-4 border-b border-slate-700/50 bg-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            {!sidebarCollapsed ? (
              <Logo size="normal" showText={true} variant="dark" />
            ) : (
              <div className="mx-auto">
                <Logo size="normal" showText={false} variant="dark" />
              </div>
            )}
            <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-1 hover:bg-slate-700 rounded transition-colors">
              <X size={20} />
            </button>
          </div>
          
          {/* User Info */}
          {currentUser && !sidebarCollapsed && (
            <div className="bg-gradient-to-br from-slate-700/50 to-slate-600/30 rounded-xl p-3 flex items-center gap-3 border border-slate-600/30 hover:border-cyan-500/50 transition-all group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-2xl flex-shrink-0 shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform">
                {currentUser.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-white">{currentUser.name}</p>
                <p className="text-xs text-cyan-300 truncate">{currentUser.role}</p>
              </div>
            </div>
          )}
        </div>
        
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {/* MDLP Analytics Section */}
          {!sidebarCollapsed && (
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              MDLP Аналитика
            </div>
          )}
          {navItems.map(item => {
            const isDisabled = item.requiresData && !dataLoaded;
            return (
              <button
                key={item.id}
                onClick={() => { if (!isDisabled) navigateTo(item.id); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm relative overflow-hidden group ${
                  activeTab === item.id 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20 border border-cyan-500/30' 
                    : isDisabled 
                    ? 'text-slate-600 cursor-not-allowed opacity-50' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50 hover:scale-[1.02]'
                }`}
              >
                {activeTab === item.id && <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 animate-pulse pointer-events-none" />}
                <item.icon size={18} className="flex-shrink-0 relative z-10" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left relative z-10 font-medium">{item.label}</span>
                    {item.badge && <span className="px-2 py-0.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] rounded-full shadow-lg shadow-red-500/50 relative z-10 font-semibold">{item.badge}</span>}
                  </>
                )}
              </button>
            );
          })}
          
          {/* WM Russia Section Divider */}
          <div className="my-3 border-t border-slate-700/50" />
          
          {!sidebarCollapsed && (
            <div className="px-3 py-2 text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              WM Russia
            </div>
          )}
          {wmRussiaNavItems.map(item => {
            const isDisabled = item.requiresData && !dataLoaded;
            return (
              <button
                key={item.id}
                onClick={() => { if (!isDisabled) navigateTo(item.id); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm relative overflow-hidden group ${
                  activeTab === item.id 
                    ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 shadow-lg shadow-blue-500/20 border border-blue-500/30' 
                    : isDisabled 
                    ? 'text-slate-600 cursor-not-allowed opacity-50' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50 hover:scale-[1.02]'
                }`}
              >
                {activeTab === item.id && <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 animate-pulse pointer-events-none" />}
                <item.icon size={18} className="flex-shrink-0 relative z-10" />
                {!sidebarCollapsed && (
                  <span className="flex-1 text-left relative z-10 font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
          
          {/* Personal WM Cabinet — for all WM roles */}
          {currentUser && wmRoles.includes(currentUser.role) && (
            <>
              <div className="my-3 border-t border-slate-700/50" />
              {!sidebarCollapsed && (
                <div className="px-3 py-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  {{
                    medrep: 'Моя аналитика',
                    territory_manager: 'Кабинет ТМ',
                    manager: 'Кабинет РМ',
                    director: 'Кабинет директора',
                    admin: 'Управление WM',
                  }[currentUser.role] ?? 'Личный кабинет'}
                </div>
              )}
              <button
                onClick={() => setAppMode('wm-russia')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm relative overflow-hidden ${
                  appMode === 'wm-russia'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50 hover:scale-[1.02]'
                }`}
              >
                <User size={18} className="flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="flex-1 text-left font-medium">
                    {{
                      medrep: 'Моя динамика',
                      territory_manager: 'Моя территория',
                      manager: 'Мой округ',
                      director: 'Панель директора WM',
                      admin: 'Управление WM',
                    }[currentUser.role] ?? 'Личный кабинет'}
                  </span>
                )}
              </button>
              {currentUser.role === 'director' && (
                <button
                  onClick={() => setAppMode('director')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm relative overflow-hidden ${
                    appMode === 'director'
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/10 text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50 hover:scale-[1.02]'
                  }`}
                >
                  <BarChart3 size={18} className="flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="flex-1 text-left font-medium">Аналитика директора</span>
                  )}
                </button>
              )}
            </>
          )}

        </nav>
        
        {/* Logout Button */}
        <div className="p-2 border-t border-slate-700/50 bg-slate-800/30">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm group border border-transparent hover:border-red-500/30"
          >
            <LogOut size={18} className="flex-shrink-0 group-hover:scale-110 transition-transform" />
            {!sidebarCollapsed && <span className="font-medium">Выход</span>}
          </button>
        </div>
        
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
          className="hidden md:block absolute -right-3 top-20 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
        >
          <ChevronRight size={14} className={sidebarCollapsed ? '' : 'rotate-180'} />
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
      <ErrorBoundary fallbackLabel="содержимого">{/* ErrorBoundary wrap */}
        {/* Director Dashboard Mode */}
        {appMode === 'director' ? (
          <DirectorDashboard 
            onBack={() => setAppMode('mdlp')} 
            userName={currentUser?.name || 'Иванов Иван Иванович'} 
          />
        ) : (
        <>
        {/* Top Bar с фильтрами */}
        {dataLoaded && (
          <div className="sticky top-0 z-[40] bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 md:px-4 py-2">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                {(navHistory.length > 0 || territoryPath.length > 0) && (
                  <button onClick={goBack} className="p-1.5 hover:bg-slate-100 rounded-lg flex-shrink-0">
                    <ArrowLeft size={18} className="text-slate-600" />
                  </button>
                )}
                
                {/* Фильтр по Федеральным округам - MultiSelect */}
                {federalDistrictsOptions.length > 0 && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Globe size={14} className="text-blue-600" />
                    <MultiSelect
                      options={federalDistrictsOptions}
                      selected={selectedFederalDistricts}
                      onChange={setSelectedFederalDistricts}
                      placeholder="Фед. округа"
                      className="border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700"
                    />
                  </div>
                )}

                {/* Фильтр по менеджерам - MultiSelect */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <User size={14} className="text-orange-600" />
                  <MultiSelect
                    options={managersOptions}
                    selected={selectedManagers}
                    onChange={setSelectedManagers}
                    placeholder="Менеджеры"
                    className="border-orange-300 bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700"
                  />
                </div>

                {/* Фильтр по препаратам - MultiSelect */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Pill size={14} className="text-purple-600" />
                  <MultiSelect
                    options={drugsOptions}
                    selected={selectedDrugs}
                    onChange={setSelectedDrugs}
                    placeholder="Препараты"
                    className="border-purple-300 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700"
                  />
                </div>

                {/* Фильтр по регионам - MultiSelect */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <MapPin size={14} className="text-emerald-600" />
                  <MultiSelect
                    options={regionsOptions}
                    selected={selectedRegions}
                    onChange={setSelectedRegions}
                    placeholder="Регионы"
                    className="border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700"
                  />
                </div>

                {/* Фильтр по годам - MultiSelect */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Calendar size={14} className="text-cyan-600" />
                  <MultiSelect
                    options={yearsOptions}
                    selected={selectedYears}
                    onChange={setSelectedYears}
                    placeholder="Года"
                    className="border-cyan-300 bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-700"
                  />
                  {selectedYears.length > 0 && (
                    <button 
                      onClick={() => setSelectedYears([])} 
                      className="text-xs text-cyan-600 hover:text-cyan-800 px-1"
                      title="Не выбирать"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Фильтр по периодам */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <BarChart3 size={14} className="text-blue-600" />
                  <MultiSelect
                    options={periodOptions}
                    selected={selectedPeriods}
                    onChange={setSelectedPeriods}
                    placeholder="Период"
                    className="border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                {/* Кнопка сохранения отчета */}
                <button 
                  onClick={() => setShowSaveReportDialog(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 border border-purple-600 rounded-xl text-white text-xs md:text-sm hover:from-purple-600 hover:to-purple-700 flex-shrink-0 shadow-md hover:shadow-lg transition-all font-medium"
                >
                  <Save size={14} />
                  <span className="hidden sm:inline">Сохранить отчет</span>
                </button>
                
                {/* Кнопка управления данными */}
                <button 
                  onClick={() => navigateTo('datamanager')} 
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 border border-emerald-600 rounded-xl text-white text-xs md:text-sm hover:from-emerald-600 hover:to-emerald-700 flex-shrink-0 shadow-md hover:shadow-lg transition-all font-medium"
                >
                  <Database size={14} />
                  <span className="hidden sm:inline">Данные</span>
                </button>
                
                <button 
                  onClick={() => window.location.reload()}
                  className="p-2 hover:bg-cyan-50 rounded-xl flex-shrink-0 transition-all group"
                  title="Обновить данные"
                >
                  <RefreshCw size={16} className="text-slate-500 group-hover:text-cyan-600 group-hover:rotate-180 transition-all duration-500" />
                </button>
                <button 
                  onClick={() => navigateTo('datamanager')}
                  className="p-2 hover:bg-slate-50 rounded-xl flex-shrink-0 transition-all group"
                  title="Настройки"
                >
                  <Settings size={16} className="text-slate-500 group-hover:text-slate-700 group-hover:rotate-90 transition-all duration-300" />
                </button>
              </div>
            </div>
            
            {/* Показываем текущие фильтры */}
            <div className="mt-2 text-xs text-slate-500 overflow-x-auto">
              <span className="font-medium text-slate-700">{getDrugName()}</span> • Все округа • {getYearName()}
            </div>
          </div>
        )}

        {/* Диалог сохранения отчета */}
        {showSaveReportDialog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                  <Save className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Сохранить текущий отчет</h3>
              </div>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Введите название отчета..."
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
              <div className="flex gap-3">
                <button
                  onClick={saveCurrentReport}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => {
                    setShowSaveReportDialog(false);
                    setReportName('');
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold transition-all"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {showReportPreview && reportPreviewData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border-2 border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-slate-50 to-cyan-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
                    <Eye className="text-white" size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{reportPreviewData.title}</h3>
                    <p className="text-xs text-slate-500">Показано {reportPreviewData.data.length} записей</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadExcel(reportPreviewData.title.replace(' отчет', '').replace('Отчет ', ''))}
                    className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 flex items-center gap-1"
                  >
                    <Download size={14} /> Excel
                  </button>
                  <button
                    onClick={() => downloadPDF(reportPreviewData.title.replace(' отчет', '').replace('Отчет ', ''))}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 flex items-center gap-1"
                  >
                    <Download size={14} /> PDF
                  </button>
                  <button
                    onClick={() => setShowReportPreview(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>
              </div>
              <div className="overflow-auto flex-1 p-4">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      {reportPreviewData.columns.map((col, i) => (
                        <th key={i} className="text-left p-3 font-semibold text-slate-600 border-b">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportPreviewData.data.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-cyan-50/50 transition-colors">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="p-3 text-slate-700">{typeof val === 'number' ? val.toLocaleString() : val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Upload */}
        {activeTab === 'upload' && (
          <div className="p-4 md:p-6 max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/30 mb-4">
                <Upload className="text-white" size={32} />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 via-cyan-700 to-slate-800 bg-clip-text text-transparent mb-2">Загрузка данных МДЛП</h2>
              <p className="text-slate-500 text-sm md:text-base font-medium">Загрузите файлы выгрузки для анализа</p>
            </div>
            {parseError && (
              <div className={`mb-4 p-4 ${parseError.includes('перезагружается') ? 'bg-amber-50 border-2 border-amber-200' : 'bg-red-50 border-2 border-red-200'} rounded-xl flex items-center gap-3`}>
                <AlertCircle className={`${parseError.includes('перезагружается') ? 'text-amber-500' : 'text-red-500'} flex-shrink-0`} size={20} />
                <div>
                  <p className={`text-sm ${parseError.includes('перезагружается') ? 'text-amber-700' : 'text-red-700'} font-medium`}>{parseError}</p>
                  {parseError.includes('перезагружается') && (
                    <p className="text-xs text-amber-600 mt-1">Подождите 1-2 минуты и попробуйте снова.</p>
                  )}
                </div>
                <button onClick={() => setParseError(null)} className={`ml-auto p-1 ${parseError.includes('перезагружается') ? 'hover:bg-amber-100' : 'hover:bg-red-100'} rounded`}>
                  <X size={16} className={parseError.includes('перезагружается') ? 'text-amber-500' : 'text-red-500'} />
                </button>
              </div>
            )}
            <div onDragOver={e => { e.preventDefault(); if (isUploading) e.dataTransfer.dropEffect = 'none'; }} onDrop={isUploading ? (e => e.preventDefault()) : handleFileDrop} className={`border-3 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all shadow-lg group ${isUploading ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60' : 'border-slate-300 bg-gradient-to-br from-white to-cyan-50/30 hover:border-cyan-400 hover:bg-cyan-50/50 cursor-pointer hover:shadow-xl'}`}>
              <input type="file" multiple accept=".xlsx,.xls,.csv" onChange={handleFileDrop} className="hidden" id="file-input" disabled={isUploading} />
              <label htmlFor="file-input" className={isUploading ? 'cursor-not-allowed' : 'cursor-pointer'}>
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform">
                  <Upload className="text-white" size={40} />
                </div>
                <p className="font-bold text-slate-700 text-base md:text-lg mb-2">{isUploading ? 'Идёт загрузка файла...' : 'Перетащите файлы или нажмите для выбора'}</p>
                <p className="text-xs md:text-sm text-slate-500 font-medium">Поддерживаемые форматы: .xlsx, .xls, .csv</p>
              </label>
            </div>
            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                {files.map(f => (
                  <div key={f.id} className="bg-white rounded-xl p-4 flex items-center gap-3 border-2 border-slate-100 shadow-md hover:shadow-lg transition-all">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg flex-shrink-0">
                      <FileSpreadsheet className="text-white" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm gap-2 mb-1">
                        <span className="truncate font-semibold text-slate-700">{f.name}</span>
                        <span className="text-slate-400 flex-shrink-0 font-medium">{f.size}</span>
                      </div>
                      {f.status === 'uploading' ? (
                        <div>
                          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-300 shadow-sm" style={{ width: `${f.progress}%` }} />
                          </div>
                          {f.statusText && (
                            <div className="text-xs text-slate-500 mt-1 font-medium">{f.statusText}</div>
                          )}
                        </div>
                      ) : f.status === 'error' ? (
                        <div className="text-red-600 text-xs flex items-center gap-1 mt-1 font-semibold">
                          <XCircle size={14} />
                          {f.error || 'Ошибка обработки файла'}
                        </div>
                      ) : (
                        <div className="text-emerald-600 text-xs flex items-center gap-1 mt-1 font-semibold">
                          <Check size={14} className="bg-emerald-100 rounded-full p-0.5" />
                          {f.rowCount ? `${f.rowCount} строк загружено` : 'Готов к анализу'}
                        </div>
                      )}
                    </div>
                    <button onClick={() => setFiles(files.filter(x => x.id !== f.id))} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0 transition-all">
                      <X size={18} />
                    </button>
                  </div>
                ))}
                <label htmlFor="file-input" className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-cyan-400 hover:bg-cyan-50/50 transition-all group">
                  <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-cyan-100 transition-colors">
                    <Plus size={18} className="text-slate-500 group-hover:text-cyan-600" />
                  </div>
                  <span className="text-sm text-slate-600 font-medium group-hover:text-cyan-700">Добавить ещё файл</span>
                </label>
              </div>
            )}
            <div className="mt-8 text-center space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={startAnalysis} 
                  disabled={!allFilesReady || isAnalyzing} 
                  className={`px-8 py-4 rounded-xl font-bold text-base md:text-lg shadow-xl transition-all ${
                    allFilesReady 
                      ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white hover:scale-105 shadow-cyan-500/50' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="inline animate-spin mr-2" size={20} />
                      Обработка данных...
                    </>
                  ) : (
                    <>
                      <Zap className="inline mr-2" size={20} />
                      Начать анализ
                    </>
                  )}
                </button>
                {files.length > 0 && (
                  <button 
                    onClick={clearAllData}
                    className="px-6 py-4 rounded-xl font-bold text-base shadow-lg transition-all bg-slate-600 hover:bg-slate-700 text-white hover:scale-105"
                  >
                    <Trash2 className="inline mr-2" size={20} />
                    Очистить очередь
                  </button>
                )}
              </div>
            </div>

            {currentUser && (
              <div className="mt-8">
                <button
                  onClick={() => {
                    if (!isStoragePanelOpen && !dbStats) loadDbStats();
                    setIsStoragePanelOpen(!isStoragePanelOpen);
                  }}
                  className="w-full flex items-center gap-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 rounded-2xl px-5 py-3.5 text-white transition-all group"
                >
                  <Database size={18} className="text-cyan-400 flex-shrink-0" />
                  <span className="text-sm font-medium">Хранилище</span>
                  <div className="flex-1 mx-2">
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          dbStats && dbStats.usagePercent > 80 ? 'bg-red-500' :
                          dbStats && dbStats.usagePercent > 50 ? 'bg-yellow-500' :
                          'bg-gradient-to-r from-cyan-500 to-emerald-500'
                        }`}
                        style={{ width: `${dbStats ? Math.max(dbStats.usagePercent, 1) : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {dbStats ? `${dbStats.usagePercent}%` : '—'}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform flex-shrink-0 ${isStoragePanelOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isStoragePanelOpen && (
                  <div className="mt-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Database size={20} className="text-cyan-400" />
                        Хранилище данных
                      </h3>
                      <button
                        onClick={loadDbStats}
                        disabled={isLoadingDbStats}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <RefreshCw size={16} className={isLoadingDbStats ? 'animate-spin' : ''} />
                      </button>
                    </div>

                    {isLoadingDbStats && !dbStats ? (
                      <div className="text-center py-4 text-slate-400">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                        Загрузка статистики...
                      </div>
                    ) : dbStats ? (
                      <>
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">Всего в БД: {dbStats.totalSize}</span>
                            <span className="text-slate-400">Свободно: {dbStats.freeSize}</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                dbStats.usagePercent > 80 ? 'bg-red-500' :
                                dbStats.usagePercent > 50 ? 'bg-yellow-500' :
                                'bg-gradient-to-r from-cyan-500 to-emerald-500'
                              }`}
                              style={{ width: `${Math.max(dbStats.usagePercent, 1)}%` }}
                            />
                          </div>
                          <div className="text-center mt-2 text-sm text-slate-400">
                            {dbStats.usagePercent}% из 10 ГБ использовано (ваши данные: {dbStats.userUsagePercent}%)
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold text-cyan-400">{(dbStats.rowCount || 0).toLocaleString('ru-RU')}</div>
                            <div className="text-xs text-slate-400">Строк данных</div>
                          </div>
                          <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold text-emerald-400">{dbStats.userDataSize}</div>
                            <div className="text-xs text-slate-400">Ваши данные</div>
                          </div>
                        </div>

                        <div className="border-t border-slate-700 pt-4">
                          <p className="text-xs text-slate-400 mb-3">Очистка хранилища:</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleClearDatabaseData('rawRows')}
                              disabled={isClearingData}
                              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              {isClearingData ? 'Очистка...' : 'Удалить данные МДЛП'}
                            </button>
                            <button
                              onClick={() => handleClearDatabaseData('oldYears')}
                              disabled={isClearingData}
                              className="px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              Удалить старые данные
                            </button>
                            <button
                              onClick={() => handleClearDatabaseData('all')}
                              disabled={isClearingData}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              Удалить всё
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4 text-slate-400">
                        <button onClick={loadDbStats} className="text-cyan-400 hover:underline">
                          Загрузить статистику
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PER CAPITA / PER EMPLOYEE - НА ДУШУ НАСЕЛЕНИЯ / НА СОТРУДНИКА */}
        {activeTab === 'percapita' && (
          <div className="p-4">
            <BackButton label="WM Дашборд" onClick={() => navigateTo('wm-dashboard')} />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <span className="cursor-pointer hover:text-purple-600" onClick={() => navigateTo('wm-dashboard')}>WM Дашборд</span>
                  <span>/</span>
                  <span className="text-slate-700">Аналитика эффективности</span>
                </div>
                <h2 className="text-2xl font-bold text-[#004F9F]">
                  {percapitaMode === 'percapita' ? 'На душу населения' : 'На сотрудника'}
                </h2>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                {DisplayModeToggle}

                <div className="flex bg-slate-100 rounded-xl border border-slate-200 p-1">
                  <button
                    onClick={() => setPercapitaMode('percapita')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${percapitaMode === 'percapita' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-800 hover:bg-white'}`}
                  >
                    <Users className="inline w-4 h-4 mr-1.5" />На душу населения
                  </button>
                  <button
                    onClick={() => setPercapitaMode('peremployee')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${percapitaMode === 'peremployee' ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-800 hover:bg-white'}`}
                  >
                    <Award className="inline w-4 h-4 mr-1.5" />На сотрудника
                  </button>
                </div>
                {percapitaMode === 'peremployee' && (
                  <div className="flex bg-slate-100 rounded-xl border border-slate-200 p-1">
                    {[
                      { value: 'all', label: 'Вся команда' },
                      { value: 'tm_mp', label: 'МП + ТМ' },
                      { value: 'mp_only', label: 'Только МП' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setTeamMode(value as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${teamMode === value ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {percapitaMode === 'percapita' && (() => {
              const pcData = tabData;
              if (!pcData || !pcData.hasData) {
                return (
                  <div className="bg-white rounded-xl border p-8 text-center">
                    <Users className="mx-auto text-slate-300 mb-4" size={64} />
                    <p className="text-slate-500">Нет данных для анализа на душу населения</p>
                  </div>
                );
              }
              const regions = pcData.regions || [];
              const drugBreakdown = pcData.drugBreakdown || [];

              const sortedRegions = [...regions].sort((a: any, b: any) => {
                const va = a[pcSortField] ?? 0;
                const vb = b[pcSortField] ?? 0;
                return pcSortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
              });

              const top10 = regions.slice(0, 10);
              const barColors = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#22C55E', '#EF4444', '#06B6D4', '#F59E0B'];
              const barData = top10.map((r: any, i: number) => ({
                name: r.region.replace(/\s*(область|край|республика|округ)\s*/gi, '').slice(0, 14),
                fullName: r.region,
                value: r.coefficient,
                fill: barColors[i % barColors.length],
              }));

              const selectedDrugData = pcSelectedDrug
                ? drugBreakdown.find((d: any) => d.drug === pcSelectedDrug)
                : null;

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-5 shadow-lg">
                      <p className="text-blue-100 text-sm mb-1">Общий коэффициент</p>
                      <p className="text-3xl font-bold">{pcData.overallCoefficient}</p>
                      <p className="text-blue-200 text-xs mt-1">упак. на 1000 чел.</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-5 shadow-lg">
                      <p className="text-emerald-100 text-sm mb-1">Всего продаж</p>
                      <p className="text-3xl font-bold">{fmtValue(pcData.totalSales || 0)}</p>
                      <p className="text-emerald-200 text-xs mt-1">упак. + руб.</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-xl p-5 shadow-lg">
                      <p className="text-amber-100 text-sm mb-1">Лидер</p>
                      <p className="text-lg font-bold truncate">{pcData.leader?.region || '—'}</p>
                      <p className="text-amber-200 text-xs mt-1">к = {pcData.leader?.coefficient || 0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-rose-500 to-red-500 text-white rounded-xl p-5 shadow-lg">
                      <p className="text-rose-100 text-sm mb-1">Аутсайдер</p>
                      <p className="text-lg font-bold truncate">{pcData.outsider?.region || '—'}</p>
                      <p className="text-rose-200 text-xs mt-1">к = {pcData.outsider?.coefficient || 0}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border p-5 shadow-sm">
                      <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-500" />
                        Топ-10 регионов по коэффициенту
                      </h3>
                      <div className="h-[380px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barData} layout="vertical" margin={{ left: 5, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis type="number" stroke="#94A3B8" tick={{ fill: '#64748B', fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" width={100} stroke="#94A3B8" tick={{ fill: '#334155', fontSize: 11, fontWeight: 500 }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                              formatter={(v: any, _n: any, props: any) => [<span style={{fontWeight: 700, color: '#3B82F6'}}>{Number(v).toFixed(3)}</span>, props.payload.fullName]}
                            />
                            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                              {barData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border p-5 shadow-sm">
                      <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-purple-500" />
                        Коэффициент по препаратам
                      </h3>
                      <select
                        value={pcSelectedDrug || ''}
                        onChange={(e) => setPcSelectedDrug(e.target.value || null)}
                        className="w-full mb-4 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 text-sm font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                      >
                        <option value="">Выберите препарат...</option>
                        {drugBreakdown.map((d: any) => (
                          <option key={d.drug} value={d.drug}>{d.drug}</option>
                        ))}
                      </select>
                      {selectedDrugData ? (
                        <div className="max-h-[300px] overflow-y-auto rounded-lg border border-slate-100">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-50">
                              <tr className="text-slate-500 border-b border-slate-200">
                                <th className="text-left py-2.5 px-3 font-medium">#</th>
                                <th className="text-left py-2.5 px-3 font-medium">Регион</th>
                                <th className="text-right py-2.5 px-3 font-medium">Продажи</th>
                                <th className="text-right py-2.5 px-3 font-medium">Коэфф.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedDrugData.regions.map((r: any, i: number) => (
                                <tr key={r.region} className="border-b border-slate-50 hover:bg-blue-50/50 transition-colors">
                                  <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                                  <td className="py-2 px-3 text-slate-700 font-medium">{r.region}</td>
                                  <td className="py-2 px-3 text-right text-slate-600">{fmtValue(r.sales)}</td>
                                  <td className="py-2 px-3 text-right font-bold text-blue-600">{r.coefficient.toFixed(3)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-slate-400">
                          <Package className="mx-auto mb-3 text-slate-300" size={40} />
                          <p>Выберите препарат для детализации</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                      <MapIcon className="w-5 h-5 text-cyan-500" />
                      Все регионы — коэффициент на 1000 населения
                    </h3>
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {[
                        { field: 'coefficient', label: 'Коэффициент', icon: '📊' },
                        { field: 'sales', label: 'Продажи', icon: '📦' },
                        { field: 'population', label: 'Население', icon: '👥' },
                        { field: 'region', label: 'Регион', icon: '🗺️' },
                      ].map(({ field, label, icon }) => (
                        <button
                          key={field}
                          onClick={() => {
                            if (pcSortField === field) setPcSortAsc(!pcSortAsc);
                            else { setPcSortField(field); setPcSortAsc(false); }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${pcSortField === field ? 'bg-blue-500 text-white border-blue-500 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'}`}
                        >
                          {icon} {label} {pcSortField === field ? (pcSortAsc ? '↑' : '↓') : ''}
                        </button>
                      ))}
                    </div>
                    <div className="max-h-[500px] overflow-y-auto rounded-lg border border-slate-100">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50 z-10">
                          <tr className="text-slate-500 border-b border-slate-200">
                            <th className="text-left py-2.5 px-3 font-medium">#</th>
                            <th className="text-left py-2.5 px-3 font-medium">Регион</th>
                            <th className="text-left py-2.5 px-3 font-medium">Фед. округ</th>
                            <th className="text-left py-2.5 px-3 font-medium">Менеджер</th>
                            <th className="text-right py-2.5 px-3 font-medium">Население</th>
                            <th className="text-right py-2.5 px-3 font-medium">Продажи</th>
                            <th className="text-right py-2.5 px-3 font-medium">Коэффициент</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedRegions.map((r: any, i: number) => {
                            const avg = pcData.overallCoefficient || 1;
                            const ratio = r.coefficient / avg;
                            const bgColor = ratio >= 1.5 ? 'bg-emerald-50' : ratio >= 1 ? 'bg-green-50/50' : ratio >= 0.5 ? 'bg-amber-50/50' : 'bg-red-50/50';
                            return (
                              <tr key={r.region} className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${bgColor}`}>
                                <td className="py-2.5 px-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                                <td className="py-2.5 px-3 text-slate-800 font-medium">{r.region}</td>
                                <td className="py-2.5 px-3 text-slate-500">{r.federalDistrict}</td>
                                <td className="py-2.5 px-3 text-slate-500">{r.manager}</td>
                                <td className="py-2.5 px-3 text-right text-slate-500">{r.population.toLocaleString('ru-RU')}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600 font-medium">{fmtValue(r.sales)}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-blue-600">{r.coefficient.toFixed(3)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {percapitaMode === 'peremployee' && (() => {
              if (perEmployeeLoading) {
                return (
                  <div className="text-center py-16">
                    <RefreshCw className="inline w-6 h-6 animate-spin mr-2 text-purple-500" />
                    <span className="text-slate-500">Загрузка данных...</span>
                  </div>
                );
              }
              const peData = perEmployeeData;
              if (!peData || !peData.hasData) {
                return (
                  <div className="bg-white rounded-xl border p-8 text-center">
                    <Award className="mx-auto text-slate-300 mb-4" size={64} />
                    <p className="text-slate-500">Нет данных о сотрудниках</p>
                  </div>
                );
              }
              const mgrs = peData.managers || [];
              const teamLabel = teamMode === 'all' ? 'Вся команда' : teamMode === 'tm_mp' ? 'МП + ТМ' : 'Только МП';
              const barColors = ['#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#3B82F6', '#14B8A6', '#F97316', '#22C55E'];

              const barData = mgrs.map((m: any, i: number) => ({
                name: m.manager.split(' ').slice(0, 2).join(' '),
                fullName: m.manager,
                value: m.coefficient,
                team: m.activeTeam,
                fill: barColors[i % barColors.length],
              }));

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl p-5 shadow-lg">
                      <p className="text-violet-100 text-sm mb-1">Среднее на сотрудника</p>
                      <p className="text-3xl font-bold">{(peData.overallCoefficient || 0).toLocaleString('ru-RU')}</p>
                      <p className="text-violet-200 text-xs mt-1">упак./сотрудник ({teamLabel})</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-5 shadow-lg">
                      <p className="text-emerald-100 text-sm mb-1">Всего продаж</p>
                      <p className="text-3xl font-bold">{fmtValue(peData.totalSales || 0)}</p>
                      <p className="text-emerald-200 text-xs mt-1">упак. + руб.</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-xl p-5 shadow-lg">
                      <p className="text-amber-100 text-sm mb-1">Лидер</p>
                      <p className="text-lg font-bold truncate">{peData.leader?.manager || '—'}</p>
                      <p className="text-amber-200 text-xs mt-1">{(peData.leader?.coefficient || 0).toLocaleString('ru-RU')} упак./сотр.</p>
                    </div>
                    <div className="bg-gradient-to-br from-rose-500 to-red-500 text-white rounded-xl p-5 shadow-lg">
                      <p className="text-rose-100 text-sm mb-1">Аутсайдер</p>
                      <p className="text-lg font-bold truncate">{peData.outsider?.manager || '—'}</p>
                      <p className="text-rose-200 text-xs mt-1">{(peData.outsider?.coefficient || 0).toLocaleString('ru-RU')} упак./сотр.</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-purple-500" />
                      Продажи на сотрудника по менеджерам
                    </h3>
                    <div className="h-[380px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ left: 10, right: 30, bottom: 50 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="name" stroke="#94A3B8" tick={{ fill: '#334155', fontSize: 11, fontWeight: 500 }} angle={-20} textAnchor="end" />
                          <YAxis stroke="#94A3B8" tick={{ fill: '#64748B', fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            formatter={(v: any, _n: any, props: any) => [<span style={{fontWeight: 700, color: '#7C3AED'}}>{Number(v).toLocaleString('ru-RU')} упак./сотр.</span>, `${props.payload.fullName} (команда: ${props.payload.team})`]}
                          />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {barData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-violet-500" />
                      Детализация по менеджерам — {teamLabel}
                    </h3>
                    <div className="max-h-[500px] overflow-y-auto rounded-lg border border-slate-100">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50 z-10">
                          <tr className="text-slate-500 border-b border-slate-200">
                            <th className="text-left py-2.5 px-3 font-medium">#</th>
                            <th className="text-left py-2.5 px-3 font-medium">Менеджер</th>
                            <th className="text-right py-2.5 px-3 font-medium">Продажи</th>
                            <th className="text-center py-2.5 px-3 font-medium">РМ</th>
                            <th className="text-center py-2.5 px-3 font-medium">ТМ</th>
                            <th className="text-center py-2.5 px-3 font-medium">МП</th>
                            <th className="text-center py-2.5 px-3 font-medium">Всего</th>
                            <th className="text-center py-2.5 px-3 font-medium">Учтено</th>
                            <th className="text-right py-2.5 px-3 font-medium">Упак./сотр.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mgrs.map((m: any, i: number) => {
                            const avg = peData.overallCoefficient || 1;
                            const ratio = m.coefficient / avg;
                            const bgColor = ratio >= 1.5 ? 'bg-emerald-50' : ratio >= 1 ? 'bg-green-50/50' : ratio >= 0.5 ? 'bg-amber-50/50' : 'bg-red-50/50';
                            return (
                              <tr key={m.manager} className={`border-b border-slate-50 hover:bg-purple-50/30 transition-colors ${bgColor}`}>
                                <td className="py-2.5 px-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                                <td className="py-2.5 px-3 text-slate-800 font-medium">{m.manager}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600 font-medium">{fmtValue(m.sales)}</td>
                                <td className="py-2.5 px-3 text-center text-slate-500">{m.rm}</td>
                                <td className="py-2.5 px-3 text-center text-slate-500">{m.tm}</td>
                                <td className="py-2.5 px-3 text-center text-slate-500">{m.mp}</td>
                                <td className="py-2.5 px-3 text-center text-slate-600 font-semibold">{m.totalTeam}</td>
                                <td className="py-2.5 px-3 text-center text-purple-600 font-bold">{m.activeTeam}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-purple-600">{m.coefficient.toLocaleString('ru-RU')}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Archive - АРХИВ ОТЧЕТОВ */}
        {activeTab === 'archive' && (
          <div className="p-4">
            <BackButton />
            <h2 className="text-xl font-bold text-slate-800 mb-4">Архив сохраненных отчетов</h2>
            
            {savedReports.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="mx-auto text-slate-300 mb-4" size={64} />
                <p className="text-slate-500 text-lg mb-2">Архив пуст</p>
                <p className="text-slate-400 text-sm">Сохраните отчет, чтобы вернуться к нему позже</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {savedReports.map(report => (
                  <div key={report.id} className="bg-white rounded-xl border hover:shadow-md transition-all overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 mb-1">{report.name}</h4>
                          <p className="text-xs text-slate-500">
                            {new Date(report.timestamp).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs">
                          <Pill size={12} className="text-purple-600" />
                          <span className="text-slate-600">{report.filters.drug === 'all' ? 'Все препараты' : report.filters.drug.replace(/\|\|\|/g, ', ')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar size={12} className="text-cyan-600" />
                          <span className="text-slate-600">{report.filters.year === 'all' ? 'Все года' : report.filters.year.replace(/\|\|\|/g, ', ')}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          onClick={() => fetchReportPreview(report)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${previewReportId === report.id ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-600'}`}
                        >
                          <Eye size={14} />
                          {previewReportId === report.id ? 'Свернуть' : 'Просмотр'}
                        </button>
                        <button
                          onClick={() => loadReport(report)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-500 text-white rounded-lg text-xs font-medium hover:bg-cyan-600 transition-colors"
                        >
                          <RefreshCw size={14} />
                          Загрузить
                        </button>
                        <button
                          onClick={() => exportReportExcel(report)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors"
                        >
                          <FileSpreadsheet size={14} />
                          Excel
                        </button>
                        <button
                          onClick={() => exportReportPdf(report)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                        >
                          <FileText size={14} />
                          PDF
                        </button>
                      </div>
                    </div>

                    {previewReportId === report.id && (() => {
                      const pData = previewDataMap[report.id];
                      const pLoading = previewLoadingMap[report.id];
                      return (
                      <div className="border-t bg-slate-50 p-4">
                        {pLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw className="animate-spin text-cyan-500 mr-2" size={20} />
                            <span className="text-slate-500 text-sm">Загрузка данных...</span>
                          </div>
                        ) : pData?.error ? (
                          <div className="text-center py-6 text-red-500 text-sm">Ошибка загрузки данных отчёта</div>
                        ) : pData?.hasData === false ? (
                          <div className="text-center py-6 text-slate-400 text-sm">Нет данных по заданным фильтрам</div>
                        ) : pData ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="bg-white rounded-lg p-3 border">
                                <p className="text-xs text-slate-500 mb-1">Всего продаж</p>
                                <p className="text-lg font-bold text-cyan-600">{(pData.kpi?.totalSales || 0).toLocaleString('ru-RU')}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border">
                                <p className="text-xs text-slate-500 mb-1">Регионов</p>
                                <p className="text-lg font-bold text-purple-600">{pData.kpi?.totalRegions || 0}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border">
                                <p className="text-xs text-slate-500 mb-1">Препаратов</p>
                                <p className="text-lg font-bold text-green-600">{pData.kpi?.totalDrugs || 0}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border">
                                <p className="text-xs text-slate-500 mb-1">Контрагентов</p>
                                <p className="text-lg font-bold text-amber-600">{pData.kpi?.totalContragents || 0}</p>
                              </div>
                            </div>

                            {(pData.drugSales || []).length > 0 && (
                              <div className="bg-white rounded-lg p-3 border">
                                <h5 className="text-xs font-semibold text-slate-700 mb-2">Топ-5 препаратов</h5>
                                <div className="space-y-1.5">
                                  {(pData.drugSales || []).slice(0, 5).map((d: any, i: number) => {
                                    const maxSales = pData.drugSales[0]?.sales || 1;
                                    return (
                                      <div key={i} className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-xs text-slate-700 truncate mr-2">{d.name}</span>
                                            <span className="text-xs font-medium text-slate-800 whitespace-nowrap">{(d.sales || 0).toLocaleString('ru-RU')}</span>
                                          </div>
                                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                                            <div className="bg-gradient-to-r from-purple-500 to-cyan-500 h-1.5 rounded-full" style={{ width: `${((d.sales || 0) / maxSales * 100)}%` }}></div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {(pData.regionSales || []).length > 0 && (
                              <div className="bg-white rounded-lg p-3 border">
                                <h5 className="text-xs font-semibold text-slate-700 mb-2">Топ-5 регионов</h5>
                                <div className="space-y-1.5">
                                  {[...(pData.regionSales || [])]
                                    .sort((a: any, b: any) => (b.sales || 0) - (a.sales || 0))
                                    .slice(0, 5).map((r: any, i: number) => {
                                    const maxSales = [...(pData.regionSales || [])].sort((a: any, b: any) => (b.sales || 0) - (a.sales || 0))[0]?.sales || 1;
                                    return (
                                      <div key={i} className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-xs text-slate-700 truncate mr-2">{r.name}</span>
                                            <span className="text-xs font-medium text-slate-800 whitespace-nowrap">{(r.sales || 0).toLocaleString('ru-RU')}</span>
                                          </div>
                                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                                            <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full" style={{ width: `${((r.sales || 0) / maxSales * 100)}%` }}></div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {(pData.monthlySales || []).length > 0 && (
                              <div className="bg-white rounded-lg p-3 border">
                                <h5 className="text-xs font-semibold text-slate-700 mb-2">Продажи по месяцам</h5>
                                <div className="flex items-end gap-1 h-16">
                                  {(pData.monthlySales || []).map((m: any, i: number) => {
                                    const maxM = Math.max(...(pData.monthlySales || []).map((x: any) => x.sales || 0), 1);
                                    const h = Math.max(((m.sales || 0) / maxM * 100), 2);
                                    return (
                                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                        <div className="w-full bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-t" style={{ height: `${h}%` }} title={`${m.month}: ${(m.sales || 0).toLocaleString('ru-RU')}`}></div>
                                        <span className="text-[9px] text-slate-400">{m.month?.slice(0, 3)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Data Manager */}
        {activeTab === 'datamanager' && (
          <div className="p-4">
            <BackButton />
            <h2 className="text-xl font-bold text-slate-800 mb-4">Управление данными и планами</h2>
            
            {/* Табы */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {['Понедельный анализ', 'Планы по регионам', 'Планы по препаратам', 'Экспорт/Импорт', 'История загрузок', 'Маппинг колонок', 'Создать территорию'].map((tab, i) => (
                <button 
                  key={i} 
                  onClick={() => setDataManagerTab(i)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${dataManagerTab === i ? 'bg-cyan-500 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Таб 0: Понедельный анализ */}
            {dataManagerTab === 0 && (
            <>
            <div className="bg-white rounded-2xl border shadow-sm p-5 mb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Понедельный анализ по препаратам</h3>
                    <p className="text-xs text-slate-400">Разбивка продаж по неделям месяца с динамикой</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <select 
                    value={weeklyAnalysisMonth} 
                    onChange={(e) => setWeeklyAnalysisMonth(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white shadow-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition-all"
                  >
                    {availableMonthsForWeekly.length > 0 ? (
                      availableMonthsForWeekly.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))
                    ) : (
                      ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))
                    )}
                  </select>
                  <select 
                    value={weeklyAnalysisYear} 
                    onChange={(e) => setWeeklyAnalysisYear(parseInt(e.target.value))}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white shadow-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition-all"
                  >
                    {availableYearsForWeekly.length > 0 ? (
                      availableYearsForWeekly.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))
                    ) : (
                      [2026, 2025, 2024].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))
                    )}
                  </select>
                  {DisplayModeToggle}
                  <button onClick={saveAllData} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 transition-all">
                    <Save size={16} />
                    Сохранить
                  </button>
                </div>
              </div>

              {(() => {
                const { drugData, weekTotals, weekTotalsAmt, hasRealData, weekCount } = getWeeklyBreakdown();

                const weekTotalsRub: Record<number, number> = {};
                const drugDataWithRub = drugData.map(item => {
                  const price = findDrugPrice(item.drug, drugPrices);
                  const weeksRub = item.weeks.map(v => price !== null ? Math.round(v * price) : v);
                  const totalRub = weeksRub.reduce((s, v) => s + v, 0);
                  weeksRub.forEach((v, idx) => {
                    const w = idx + 1;
                    weekTotalsRub[w] = (weekTotalsRub[w] || 0) + v;
                  });
                  return { ...item, weeksRub, totalRub, forecastRub: totalRub };
                });

                const wt = isMoney ? weekTotalsRub : weekTotals;
                const hasWeeklyData = drugData.length > 0;
                
                if (!hasWeeklyData) {
                  return <NoDataMessage title="Нет данных за выбранный период. Загрузите файл МДЛП с датами документов." />;
                }
                
                const weeksWithData = Array.from({length: weekCount || 4}, (_, i) => i + 1).filter(w => (weekTotals[w] || 0) > 0 || (weekTotalsRub[w] || 0) > 0);
                const weekLabels = weeksWithData.map(w => `Неделя ${w}`);
                
                const alertDrugs = hasRealData ? drugDataWithRub.filter(d => d.avgGrowth < -10).slice(0, 5) : [];
                
                const weekCardGradients = [
                  'from-blue-500 to-blue-600',
                  'from-indigo-500 to-indigo-600',
                  'from-violet-500 to-purple-600',
                  'from-cyan-500 to-teal-600',
                  'from-sky-500 to-blue-600',
                ];
                const weekCardTextLight = [
                  'text-blue-100', 'text-indigo-100', 'text-violet-100', 'text-cyan-100', 'text-sky-100',
                ];
                
                return (
                  <>
                    {!hasRealData && (
                      <div className="flex items-start gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-4 mb-5 shadow-sm">
                        <div className="p-1.5 bg-amber-400/20 rounded-lg flex-shrink-0 mt-0.5">
                          <AlertTriangle size={16} className="text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-amber-800">Приблизительные данные</p>
                          <p className="text-xs text-amber-600 mt-0.5">Продажи распределены по неделям равными долями. Для точного анализа перезагрузите файл МДЛП — новая версия сохраняет даты документов.</p>
                        </div>
                      </div>
                    )}
                    {/* Сводная статистика по неделям */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
                      {weeksWithData.map((weekNum, i) => {
                        const val = wt[weekNum] || 0;
                        const prevVal = i > 0 ? (wt[weeksWithData[i - 1]] || 0) : 0;
                        const pct = prevVal > 0 ? ((val - prevVal) / prevVal * 100) : 0;
                        const grad = weekCardGradients[i % weekCardGradients.length];
                        const lightText = weekCardTextLight[i % weekCardTextLight.length];
                        return (
                        <div key={weekNum} className={`bg-gradient-to-br ${grad} text-white rounded-xl p-5 shadow-lg relative overflow-hidden`}>
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-4 translate-x-4" />
                          <p className={`text-sm ${lightText} mb-1`}>Неделя {weekNum}</p>
                          <p className="text-2xl font-bold">{isMoney ? <MoneySpan value={val} /> : val.toLocaleString()}</p>
                          {i > 0 && prevVal > 0 && (
                            <p className={`text-xs mt-1 font-medium ${pct >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                              {pct >= 0 ? '↑' : '↓'} {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                            </p>
                          )}
                        </div>
                        );
                      })}
                    </div>

                    {/* Алерты о снижении прироста */}
                    {alertDrugs.length > 0 && (
                      <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/60 rounded-xl p-5 mb-5 shadow-sm">
                        <h4 className="text-red-700 font-bold flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-red-500/10 rounded-lg">
                            <AlertTriangle size={16} className="text-red-500" />
                          </div>
                          Требуют внимания: снижение темпа продаж
                        </h4>
                        <div className="grid gap-2">
                          {alertDrugs.map((item, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/80 backdrop-blur rounded-lg p-3 border border-red-100/60 shadow-sm hover:shadow-md transition-shadow">
                              <div>
                                <span className="font-semibold text-slate-800">{item.drug}</span>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Всего: {item.total.toLocaleString()} упак. | Прогноз: {item.forecast.toLocaleString()}
                                </p>
                              </div>
                              <span className="text-red-600 font-bold text-lg bg-red-50 px-3 py-1 rounded-lg">{item.avgGrowth.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Таблица понедельного анализа */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200/60 shadow-sm">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                            <th className="text-left p-3.5 font-bold text-slate-700">Препарат</th>
                            {weeksWithData.map(w => (
                              <th key={w} className="text-right p-3.5 font-bold text-slate-700">Нед. {w}</th>
                            ))}
                            <th className="text-right p-3.5 font-bold text-cyan-700">Итого</th>
                            <th className="text-right p-3.5 font-bold text-slate-700">Ср. темп</th>
                            <th className="text-right p-3.5 font-bold text-purple-700">Прогноз</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(isMoney ? [...drugDataWithRub].sort((a, b) => b.totalRub - a.totalRub) : drugDataWithRub).slice(0, 50).map((item, i) => {
                            const isNegativeGrowth = item.avgGrowth < 0;
                            const wks = isMoney ? item.weeksRub : item.weeks;
                            const tot = isMoney ? item.totalRub : item.total;
                            const frc = isMoney ? item.forecastRub : item.forecast;
                            const fmt = (v: number): React.ReactNode => isMoney ? <MoneySpan value={v} /> : v.toLocaleString();
                            
                            return (
                              <tr key={i} className={`border-b border-slate-100 transition-colors ${isNegativeGrowth ? 'bg-red-50/40 hover:bg-red-50/70' : i % 2 === 0 ? 'bg-white hover:bg-cyan-50/30' : 'bg-slate-50/50 hover:bg-cyan-50/30'}`}>
                                <td className="p-3.5 font-semibold text-slate-800">{item.drug}</td>
                                {weeksWithData.map(w => (
                                  <td key={w} className="p-3.5 text-right text-slate-600 tabular-nums">
                                    {wks[w - 1] > 0 ? fmt(wks[w - 1]) : <span className="text-slate-300">—</span>}
                                  </td>
                                ))}
                                <td className="p-3.5 text-right font-bold text-cyan-600 tabular-nums">{fmt(tot)}</td>
                                <td className="p-3.5 text-right">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${isNegativeGrowth ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {item.avgGrowth > 0 ? '+' : ''}{item.avgGrowth.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="p-3.5 text-right font-semibold text-purple-600 tabular-nums">{fmt(frc)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gradient-to-r from-slate-100 to-slate-50 border-t-2 border-slate-200">
                            <td className="p-3.5 font-bold text-slate-800">ИТОГО</td>
                            {weeksWithData.map(w => (
                              <td key={w} className="p-3.5 text-right font-bold text-slate-700 tabular-nums">{isMoney ? <MoneySpan value={wt[w] || 0} /> : (wt[w] || 0).toLocaleString()}</td>
                            ))}
                            <td className="p-3.5 text-right font-bold text-cyan-700 tabular-nums">
                              {isMoney ? <MoneySpan value={drugDataWithRub.reduce((s, d) => s + d.totalRub, 0)} /> : drugDataWithRub.reduce((s, d) => s + d.total, 0).toLocaleString()}
                            </td>
                            <td className="p-3.5 text-right text-slate-400">—</td>
                            <td className="p-3.5 text-right font-bold text-purple-700 tabular-nums">
                              {isMoney ? <MoneySpan value={drugDataWithRub.reduce((s, d) => s + d.forecastRub, 0)} /> : drugDataWithRub.reduce((s, d) => s + d.forecast, 0).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
            </>
            )}

            {/* Таб 1: Планы продаж */}
            {dataManagerTab === 1 && (
            <>
            {/* Блок планов */}
            <div className="bg-white rounded-xl border p-4 mb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-semibold text-slate-700">Планы продаж на 2026 год</h3>
                  <p className="text-xs text-slate-400">Установите планы по регионам, городам и районам</p>
                </div>
                <button 
                  onClick={() => setShowPlanEditDialog(!showPlanEditDialog)}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600"
                >
                  <Edit2 size={16} />
                  {showPlanEditDialog ? 'Сохранить изменения' : 'Редактировать планы'}
                </button>
              </div>

              {hasRealData && (filteredData?.regionSales?.length || 0) > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 font-semibold text-slate-600">Регион</th>
                      <th className="text-right p-3 font-semibold text-slate-600">Продажи</th>
                      <th className="text-right p-3 font-semibold text-slate-600">План</th>
                      <th className="text-center p-3 font-semibold text-slate-600">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredData?.regionSales || []).map((region, i) => (
                      <tr key={i} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">{region.name}</td>
                        <td className="p-3 text-right font-semibold text-cyan-600">{region.sales.toLocaleString()}</td>
                        <td className="p-3 text-right">
                          <input 
                            type="number" 
                            value={savedPlans[region.name] || ''}
                            placeholder="—"
                            className="w-24 px-2 py-1 border rounded text-right text-sm"
                            onChange={(e) => setSavedPlans({...savedPlans, [region.name]: parseInt(e.target.value) || 0})}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => { setTerritoryPath([region.name]); navigateTo('drilldown'); }}
                            className="text-cyan-600 hover:text-cyan-800 text-xs"
                          >
                            Детали →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-semibold">
                    <tr>
                      <td className="p-3">ИТОГО</td>
                      <td className="p-3 text-right text-cyan-600">{(filteredData?.regionSales || []).reduce((sum, r) => sum + r.sales, 0).toLocaleString()}</td>
                      <td className="p-3 text-right">—</td>
                      <td className="p-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              ) : (
                <NoDataMessage title="Загрузите данные для управления планами" />
              )}
            </div>

            </>
            )}

            {/* Таб 2: Планы по препаратам */}
            {dataManagerTab === 2 && (
            <>
            <div className="bg-white rounded-xl border p-4 mb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-semibold text-slate-700">Планы продаж по препаратам</h3>
                  <p className="text-xs text-slate-400">Установите месячные планы для каждого препарата</p>
                </div>
                <button onClick={saveAllData} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                  <Save size={16} />
                  Сохранить планы
                </button>
              </div>

              {hasRealData && drugsList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 font-semibold text-slate-600">Препарат</th>
                      <th className="text-right p-3 font-semibold text-slate-600">Текущие продажи</th>
                      <th className="text-right p-3 font-semibold text-slate-600">План на месяц</th>
                      <th className="text-right p-3 font-semibold text-slate-600">% выполнения</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drugsList.map((drug, i) => {
                      const sales = currentWeekData[drug] || 0;
                      const plan = drugPlans[drug] || 0;
                      const completion = plan > 0 ? (sales / plan) * 100 : 0;
                      
                      return (
                        <tr key={i} className="border-b hover:bg-slate-50">
                          <td className="p-3 font-medium">{drug}</td>
                          <td className="p-3 text-right font-semibold text-cyan-600">{sales.toLocaleString()}</td>
                          <td className="p-3 text-right">
                            <input 
                              type="number" 
                              value={plan || ''}
                              placeholder="—"
                              className="w-28 px-2 py-1 border rounded text-right text-sm"
                              onChange={(e) => setDrugPlans({...drugPlans, [drug]: parseInt(e.target.value) || 0})}
                            />
                          </td>
                          <td className="p-3 text-right">
                            {plan > 0 ? (
                              <span className={completion >= 100 ? 'text-emerald-600 font-bold' : completion >= 75 ? 'text-amber-600' : 'text-red-600'}>
                                {completion.toFixed(2)}%
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 font-semibold">
                    <tr>
                      <td className="p-3">ИТОГО</td>
                      <td className="p-3 text-right text-cyan-600">
                        {Object.values(currentWeekData).reduce((sum, v) => sum + v, 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-slate-600">
                        {Object.values(drugPlans).reduce((sum, v) => sum + v, 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        {(() => {
                          const totalSales = Object.values(currentWeekData).reduce((sum, v) => sum + v, 0);
                          const totalPlan = Object.values(drugPlans).reduce((sum, v) => sum + v, 0);
                          return totalPlan > 0 ? (
                            <span className={(totalSales / totalPlan) * 100 >= 100 ? 'text-emerald-600' : 'text-red-600'}>
                              {((totalSales / totalPlan) * 100).toFixed(2)}%
                            </span>
                          ) : '—';
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              ) : (
                <NoDataMessage title="Загрузите данные для настройки планов по препаратам" />
              )}
            </div>
            </>
            )}

            {/* Таб 3: Экспорт/Импорт */}
            {dataManagerTab === 3 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-slate-700 mb-4">Экспорт и импорт данных</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Экспорт */}
                <div className="border rounded-xl p-4 bg-gradient-to-br from-cyan-50 to-blue-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-cyan-500 text-white rounded-xl">
                      <Download size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-700">Экспорт данных</h4>
                      <p className="text-xs text-slate-500">Выгрузка в Excel, CSV, JSON</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <button 
                      onClick={() => downloadExcel('Все данные')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-cyan-200 rounded-lg text-sm hover:bg-cyan-50 transition-colors"
                    >
                      <span className="font-medium text-slate-700">📊 Экспорт всех данных (Excel)</span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                    <button 
                      onClick={() => downloadExcel('Планы продаж')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-cyan-200 rounded-lg text-sm hover:bg-cyan-50 transition-colors"
                    >
                      <span className="font-medium text-slate-700">📈 Экспорт планов (CSV)</span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                    <button 
                      onClick={() => downloadExcel('Отчеты')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-cyan-200 rounded-lg text-sm hover:bg-cyan-50 transition-colors"
                    >
                      <span className="font-medium text-slate-700">🗂️ Экспорт отчетов (JSON)</span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Импорт */}
                <div className="border rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-purple-500 text-white rounded-xl">
                      <Upload size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-700">Импорт данных</h4>
                      <p className="text-xs text-slate-500">Загрузка из Excel, CSV</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <button 
                      onClick={() => navigateTo('upload')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-purple-200 rounded-lg text-sm hover:bg-purple-50 transition-colors"
                    >
                      <span className="font-medium text-slate-700">📥 Импорт продаж</span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                    <button 
                      onClick={() => navigateTo('upload')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-purple-200 rounded-lg text-sm hover:bg-purple-50 transition-colors"
                    >
                      <span className="font-medium text-slate-700">📥 Импорт планов</span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                    <button 
                      onClick={() => navigateTo('upload')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border border-purple-200 rounded-lg text-sm hover:bg-purple-50 transition-colors"
                    >
                      <span className="font-medium text-slate-700">📥 Импорт контрагентов</span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* История импорта/экспорта */}
              <div className="mt-4 border rounded-xl p-4">
                <h4 className="font-semibold text-slate-700 mb-3">История операций</h4>
                <div className="space-y-2">
                  {[
                    { date: '15.01.2026 14:30', action: 'Экспорт всех данных', format: 'Excel', status: 'Успешно', size: '2.4 МБ' },
                    { date: '12.01.2026 09:15', action: 'Импорт планов продаж', format: 'CSV', status: 'Успешно', size: '156 КБ' },
                    { date: '10.01.2026 16:45', action: 'Экспорт отчетов', format: 'JSON', status: 'Успешно', size: '892 КБ' },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-xs">
                      <div className="flex-1">
                        <div className="font-medium text-slate-700">{log.action}</div>
                        <div className="text-slate-500">{log.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-slate-600">{log.format}</div>
                        <div className="text-slate-500">{log.size}</div>
                      </div>
                      <div className="ml-4">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-medium">{log.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )}

            {/* Таб 4: История загрузок */}
            {dataManagerTab === 4 && (
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 text-white rounded-lg">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-700">История загруженных файлов</h3>
                    <p className="text-xs text-slate-500">Управляйте загруженными файлами. Активируйте нужные для анализа.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={async () => {
                      try {
                        const history = await api.uploadHistory.getAll();
                        setUploadHistoryList(history);
                      } catch (e) {
                        console.error('Ошибка загрузки истории:', e);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600"
                  >
                    <RefreshCw size={16} />
                    Обновить
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const result = await api.fixDedup();
                        alert(result.message || 'Данные исправлены');
                        tabDataCacheRef.current = {};
                        prevTabFetchRef.current = '';
                        isFetchingTabRef.current = false;
                        const newMeta = await fetchTabMetadata();
                        setTabMetadata(newMeta);
                        const history = await api.uploadHistory.getAll();
                        setUploadHistoryList(history);
                      } catch (e: any) {
                        console.error('Ошибка исправления:', e);
                        const errMsg = e?.message || e?.error || '';
                        if (errMsg.toLowerCase().includes('timeout') || errMsg.toLowerCase().includes('canceling')) {
                          alert('Операция заняла слишком много времени. Попробуйте позже, когда база данных менее загружена.');
                        } else {
                          alert(errMsg || 'Ошибка при исправлении данных');
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"
                  >
                    <RefreshCw size={16} />
                    Исправить задвоение
                  </button>
                  {uploadHistoryList.length > 0 && (
                    <button 
                      onClick={async () => {
                        if (!window.confirm('Вы уверены? Все данные будут удалены: файлы, агрегации, compact rows. Это действие необратимо.')) return;
                        try {
                          const result = await api.uploadHistory.deleteAll();
                          setUploadHistoryList([]);
                          setTabData(null);
                          setTabMetadata(null);
                          tabDataCacheRef.current = {};
                          prevTabFetchRef.current = '';
                          alert(result.message || 'Все данные удалены');
                        } catch (e) {
                          console.error('Ошибка удаления:', e);
                          alert('Ошибка при удалении всех данных');
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                    >
                      <Trash2 size={16} />
                      Удалить все данные
                    </button>
                  )}
                </div>
              </div>

              {uploadHistoryList.filter(h => h.status === 'success' && h.isActive).length > 0 && (
                <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-indigo-700">
                    <CheckCircle size={16} />
                    <span className="font-medium">
                      Активные файлы для анализа: {uploadHistoryList.filter(h => h.status === 'success' && h.isActive).length}
                    </span>
                    <span className="text-indigo-500">
                      ({uploadHistoryList.filter(h => h.isActive).map(h => h.yearPeriod ? `${h.yearPeriod} г.` : h.filename).join(', ')})
                    </span>
                  </div>
                </div>
              )}
              
              {uploadHistoryList.length > 0 ? (
                <div className="space-y-3">
                  {uploadHistoryList.map((item) => (
                    <div key={item.id} className={`p-4 rounded-lg border-2 transition-all ${
                      item.isActive && item.status === 'success'
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : item.status === 'error'
                        ? 'border-red-200 bg-red-50/30'
                        : item.status === 'processing'
                        ? 'border-amber-300 bg-amber-50/30'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${
                            item.isActive && item.status === 'success' ? 'bg-emerald-500 text-white' :
                            item.status === 'error' ? 'bg-red-400 text-white' :
                            item.status === 'processing' ? 'bg-amber-400 text-white' :
                            'bg-slate-300 text-white'
                          }`}>
                            <FileSpreadsheet size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-800 truncate">{item.filename}</span>
                              {item.isActive && item.status === 'success' && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium whitespace-nowrap">
                                  Активен
                                </span>
                              )}
                              {item.status === 'processing' && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium whitespace-nowrap animate-pulse">
                                  Загружается...
                                </span>
                              )}
                              {item.status === 'error' && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium whitespace-nowrap">
                                  Ошибка
                                </span>
                              )}
                              {!item.isActive && item.status === 'success' && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-medium whitespace-nowrap">
                                  Не активен
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>
                                {new Date(item.uploadedAt).toLocaleString('ru-RU', {
                                  day: '2-digit', month: '2-digit', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                              {item.rowsCount && <span>{item.rowsCount.toLocaleString()} строк</span>}
                              {item.yearPeriod && <span>Период: {item.yearPeriod} г.</span>}
                            </div>
                            {item.errorMessage && (
                              <p className="text-xs text-red-500 mt-1">{item.errorMessage}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {item.status === 'success' && (
                            <button
                              onClick={async () => {
                                try {
                                  await api.uploadHistory.toggle(item.id, !item.isActive);
                                  const history = await api.uploadHistory.getAll();
                                  setUploadHistoryList(history);
                                  setTabMetadata(null);
                                  setDataLoaded(false);
                                } catch (e) {
                                  console.error('Ошибка:', e);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                item.isActive
                                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              }`}
                            >
                              {item.isActive ? 'Исключить из анализа' : 'Активировать'}
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (!confirm(`Удалить файл "${item.filename}" из базы данных?`)) return;
                              try {
                                await api.uploadHistory.delete(item.id);
                                const history = await api.uploadHistory.getAll();
                                setUploadHistoryList(history);
                                setTabMetadata(null);
                                setDataLoaded(false);
                              } catch (e) {
                                console.error('Ошибка удаления:', e);
                              }
                            }}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                            title="Удалить из базы"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">История загрузок пуста</p>
                  <p className="text-xs text-slate-400 mt-1">Загрузите файлы МДЛП в разделе "Загрузка файлов"</p>
                </div>
              )}
            </div>
            )}

            {/* Таб 5: Маппинг колонок */}
            {dataManagerTab === 5 && (
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-700">Настройка маппинга колонок</h3>
                  <p className="text-xs text-slate-400">Сопоставьте колонки ваших файлов с системными полями для корректного парсинга</p>
                </div>
                <button
                  onClick={() => setEditingMapping({ profileName: '', isDefault: false, mappings: {} })}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 flex items-center gap-2"
                >
                  <Plus size={16} />
                  Создать профиль
                </button>
              </div>

              {/* Список профилей маппинга */}
              {columnMappings.length > 0 ? (
                <div className="space-y-3">
                  {columnMappings.map((mapping) => (
                    <div key={mapping.id} className="border rounded-lg p-4 hover:bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                            <Settings size={20} className="text-cyan-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">{mapping.profileName}</span>
                              {mapping.isDefault && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">По умолчанию</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">{Object.keys(mapping.mappings).length} полей настроено</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingMapping({ id: mapping.id, ...mapping })}
                            className="p-2 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 rounded-lg"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Удалить этот профиль маппинга?')) {
                                try {
                                  await api.columnMappings.delete(mapping.id);
                                  setColumnMappings(prev => prev.filter(m => m.id !== mapping.id));
                                } catch (e) {
                                  console.error('Ошибка удаления маппинга:', e);
                                }
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings size={48} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Профили маппинга не созданы</p>
                  <p className="text-xs text-slate-400 mt-1">Создайте профиль для загрузки файлов с нестандартными колонками</p>
                </div>
              )}

              {/* Диалог редактирования маппинга */}
              {editingMapping && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingMapping(null)}>
                  <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">
                      {editingMapping.id ? 'Редактирование профиля' : 'Создание профиля маппинга'}
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Название профиля</label>
                        <input
                          type="text"
                          value={editingMapping.profileName}
                          onChange={e => setEditingMapping({ ...editingMapping, profileName: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="Например: Файлы из 1С"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={editingMapping.isDefault}
                          onChange={e => setEditingMapping({ ...editingMapping, isDefault: e.target.checked })}
                          className="rounded"
                        />
                        <label htmlFor="isDefault" className="text-sm text-slate-600">Использовать по умолчанию</label>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Сопоставление полей</label>
                        <p className="text-xs text-slate-400 mb-3">Введите названия колонок из вашего файла для каждого системного поля</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            { key: 'drug', label: 'Название препарата' },
                            { key: 'quantity', label: 'Количество' },
                            { key: 'amount', label: 'Сумма продаж' },
                            { key: 'region', label: 'Регион' },
                            { key: 'city', label: 'Город' },
                            { key: 'district', label: 'Район' },
                            { key: 'contragent', label: 'Контрагент' },
                            { key: 'month', label: 'Месяц' },
                            { key: 'year', label: 'Год' },
                            { key: 'documentDate', label: 'Дата документа' },
                            { key: 'federalDistrict', label: 'Федеральный округ' },
                            { key: 'disposalType', label: 'Тип выбытия' },
                            { key: 'receiverType', label: 'Тип получателя' },
                            { key: 'contractorGroup', label: 'Группа контрагентов' },
                          ].map(field => (
                            <div key={field.key} className="flex items-center gap-2">
                              <span className="text-sm text-slate-600 w-40">{field.label}:</span>
                              <input
                                type="text"
                                value={editingMapping.mappings[field.key] || ''}
                                onChange={e => setEditingMapping({
                                  ...editingMapping,
                                  mappings: { ...editingMapping.mappings, [field.key]: e.target.value }
                                })}
                                className="flex-1 px-2 py-1 border rounded text-sm"
                                placeholder="Название колонки"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-6">
                      <button
                        onClick={() => setEditingMapping(null)}
                        className="px-4 py-2 border text-slate-600 rounded-lg text-sm hover:bg-slate-50"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const cleanMappings = Object.fromEntries(
                              Object.entries(editingMapping.mappings).filter(([_, v]) => v && v.trim())
                            );
                            if (editingMapping.id) {
                              const updated = await api.columnMappings.update(editingMapping.id, {
                                profileName: editingMapping.profileName,
                                isDefault: editingMapping.isDefault,
                                mappings: cleanMappings
                              });
                              setColumnMappings(prev => prev.map(m => m.id === updated.id ? updated : m));
                            } else {
                              const created = await api.columnMappings.create({
                                profileName: editingMapping.profileName,
                                isDefault: editingMapping.isDefault,
                                mappings: cleanMappings
                              });
                              setColumnMappings(prev => [...prev, created]);
                            }
                            setEditingMapping(null);
                          } catch (e) {
                            console.error('Ошибка сохранения маппинга:', e);
                          }
                        }}
                        className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Таб 6: Территории менеджеров и медпредов */}
            {dataManagerTab === 6 && (
            <>
            {/* Блок территорий менеджеров */}
            <div className="bg-white rounded-xl border p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <User size={18} className="text-orange-500" />
                    Территории менеджеров
                  </h3>
                  <p className="text-xs text-slate-400">Настройте регионы для каждого менеджера</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await api.auxiliary.save({ managerTerritories });
                      alert('Территории менеджеров сохранены!');
                    } catch (e) {
                      console.error('Ошибка сохранения:', e);
                      alert('Ошибка сохранения территорий');
                    }
                  }}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 flex items-center gap-2"
                >
                  <Save size={16} />
                  Сохранить изменения
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {managersList.map(manager => {
                  const regions = managerTerritories[manager] || defaultManagerTerritories[manager] || [];
                  return (
                    <div 
                      key={manager}
                      onClick={() => setEditingManager(manager)}
                      className="border rounded-lg p-3 hover:bg-orange-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <User size={16} className="text-orange-600" />
                        </div>
                        <span className="font-medium text-slate-700 text-sm truncate" title={manager}>{manager}</span>
                      </div>
                      <p className="text-xs text-slate-500">{regions.length} регионов</p>
                      <p className="text-[10px] text-slate-400 truncate" title={regions.slice(0, 3).join(', ')}>
                        {regions.slice(0, 2).join(', ')}{regions.length > 2 ? '...' : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Диалог редактирования территорий менеджера */}
            {editingManager && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingManager(null)}>
                <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <User size={20} className="text-orange-500" />
                    Редактирование территорий: {editingManager}
                  </h3>
                  
                  <div className="mb-4">
                    <p className="text-sm text-slate-600 mb-2">Выберите регионы для этого менеджера:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                      {allRegions.map((region) => {
                        const currentRegions = managerTerritories[editingManager] || defaultManagerTerritories[editingManager] || [];
                        const isChecked = currentRegions.some(r => r === region || region.includes(r) || r.includes(region));
                        return (
                          <label key={region} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const newRegions = e.target.checked
                                  ? [...currentRegions, region]
                                  : currentRegions.filter(r => r !== region && !region.includes(r) && !r.includes(region));
                                setManagerTerritories(prev => ({ ...prev, [editingManager]: newRegions }));
                              }}
                              className="rounded border-slate-300"
                            />
                            <span className="text-slate-600 text-xs">{region}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => {
                        setManagerTerritories(prev => ({ ...prev, [editingManager]: defaultManagerTerritories[editingManager] || [] }));
                      }}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                    >
                      Сбросить к исходным
                    </button>
                    <button
                      onClick={() => setEditingManager(null)}
                      className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600"
                    >
                      Готово
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Блок кастомных территорий РМ */}
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-700">Кастомные территории РМ</h3>
                  <p className="text-xs text-slate-400">Создайте дополнительные территории и назначьте регионы</p>
                </div>
                <button
                  onClick={() => setEditingTerritory({ name: '', regions: [] })}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 flex items-center gap-2"
                >
                  <Plus size={16} />
                  Добавить территорию
                </button>
              </div>

              {/* Список территорий */}
              {salesRepTerritories.length > 0 ? (
                <div className="space-y-3">
                  {salesRepTerritories.map((territory) => (
                    <div key={territory.id} className="border rounded-lg p-4 hover:bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                            <MapPin size={20} className="text-violet-600" />
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">{territory.name}</span>
                            <p className="text-xs text-slate-400">
                              {territory.regions.length > 0 
                                ? territory.regions.slice(0, 3).join(', ') + (territory.regions.length > 3 ? ` и ещё ${territory.regions.length - 3}` : '')
                                : 'Регионы не назначены'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingTerritory({ id: territory.id, name: territory.name, regions: territory.regions })}
                            className="p-2 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 rounded-lg"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Удалить эту территорию?')) {
                                try {
                                  await api.salesRepTerritories.delete(territory.id);
                                  setSalesRepTerritories(prev => prev.filter(t => t.id !== territory.id));
                                } catch (e) {
                                  console.error('Ошибка удаления территории:', e);
                                }
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin size={48} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Территории не созданы</p>
                  <p className="text-xs text-slate-400 mt-1">Создайте территории для РМ и назначьте им регионы</p>
                </div>
              )}

              {/* Диалог редактирования территории */}
              {editingTerritory && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingTerritory(null)}>
                  <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">
                      {editingTerritory.id ? 'Редактирование территории' : 'Создание территории'}
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Название территории / РМ</label>
                        <input
                          type="text"
                          value={editingTerritory.name}
                          onChange={e => setEditingTerritory({ ...editingTerritory, name: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="Например: Оруджев Али-1 или Сергей Сонин ПФО"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Регионы</label>
                        <p className="text-xs text-slate-400 mb-3">Выберите регионы, которые входят в эту территорию</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                          {allRegions.map((region) => (
                            <label key={region} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={editingTerritory.regions.includes(region)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setEditingTerritory({ ...editingTerritory, regions: [...editingTerritory.regions, region] });
                                  } else {
                                    setEditingTerritory({ ...editingTerritory, regions: editingTerritory.regions.filter(r => r !== region) });
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-slate-600 truncate">{region}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Выбрано: {editingTerritory.regions.length} регионов</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-6">
                      <button
                        onClick={() => setEditingTerritory(null)}
                        className="px-4 py-2 border text-slate-600 rounded-lg text-sm hover:bg-slate-50"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            if (editingTerritory.id) {
                              const updated = await api.salesRepTerritories.update(editingTerritory.id, {
                                name: editingTerritory.name,
                                regions: editingTerritory.regions
                              });
                              setSalesRepTerritories(prev => prev.map(t => t.id === updated.id ? updated : t));
                            } else {
                              const created = await api.salesRepTerritories.create({
                                name: editingTerritory.name,
                                regions: editingTerritory.regions
                              });
                              setSalesRepTerritories(prev => [...prev, created]);
                            }
                            setEditingTerritory(null);
                          } catch (e) {
                            console.error('Ошибка сохранения территории:', e);
                          }
                        }}
                        className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </>
            )}
          </div>
        )}

        {/* Dashboard */}
        {activeTab === 'dashboard' && (() => {
          console.log('[DASHBOARD IIFE START]');
          const MONTH_SHORT: Record<string, string> = { 'Янв': 'Янв', 'Фев': 'Фев', 'Мар': 'Мар', 'Апр': 'Апр', 'Май': 'Май', 'Июн': 'Июн', 'Июл': 'Июл', 'Авг': 'Авг', 'Сен': 'Сен', 'Окт': 'Окт', 'Ноя': 'Ноя', 'Дек': 'Дек' };
          const MONTH_NAMES_ORDER = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
          const PIE_COLORS = ['#06b6d4','#8b5cf6','#f59e0b','#ef4444','#10b981','#3b82f6','#ec4899','#f97316','#14b8a6','#6366f1','#9ca3af'];

          const dsPerYear: Record<string, {name: string; sales: number}[]> = (tabData as any)?.drugSalesPerYear || {};
          const monthlyDS: Record<string, Record<string, {name: string; sales: number}[]>> = (tabData as any)?.monthlyDrugSales || {};
          const allDrugSales: {name: string; sales: number}[] = filteredData?.drugSales || [];
          const regionsPerYear: Record<string, number> = (tabData as any)?.regionsPerYear || {};
          const contragentsPerYear: Record<string, number> = (tabData as any)?.contragentsPerYear || {};
          const drugsPerYearData: Record<string, number> = (tabData as any)?.drugsPerYear || {};

          console.log('[KPI debug]', {
            tabData: !!tabData,
            regionsPerYear,
            contragentsPerYear,
            drugsPerYear: drugsPerYearData,
            filteredData: !!filteredData,
            regionSalesLen: filteredData?.regionSales?.length,
            contragentSalesLen: filteredData?.contragentSales?.length,
            drugSalesLen: filteredData?.drugSales?.length,
            hasRealData,
            availableYears,
            currentWeekData: typeof currentWeekData,
            drugPlans: typeof drugPlans,
          });

          const getMonthRange = (months: string[]) => {
            if (!months.length) return '';
            const sorted = months.sort((a, b) => MONTH_NAMES_ORDER.indexOf(a) - MONTH_NAMES_ORDER.indexOf(b));
            if (sorted.length === 12) return 'Янв-Дек';
            if (sorted.length === 1) return sorted[0];
            return `${sorted[0]}-${sorted[sorted.length - 1]}`;
          };

          const yearBreakdown = (() => {
            const years = [...(availableYears || [])].map(String).sort();
            return years.map(yr => {
              const drugs = dsPerYear[yr] || [];
              const pkgs = drugs.reduce((s, d) => s + d.sales, 0);
              const rub = convertDrugBreakdownToRubles(drugs, drugPrices);
              const monthsInYear = combinedData.filter((d: any) => d[yr] && d[yr] > 0).map((d: any) => d.month);
              const period = getMonthRange(monthsInYear);
              return { year: yr, pkgs, rub, period };
            });
          })();

          const totalPkgs = yearBreakdown.reduce((s, y) => s + y.pkgs, 0);
          const totalRub = yearBreakdown.reduce((s, y) => s + (y.rub || 0), 0);
          const hasRub = yearBreakdown.some(y => y.rub !== null && y.rub > 0);

          const fullYears = yearBreakdown.filter(y => y.period === 'Янв-Дек');
          let dynamicsPercent: number | null = null;
          if (fullYears.length >= 2) {
            const last = fullYears[fullYears.length - 1];
            const prev = fullYears[fullYears.length - 2];
            if (prev.pkgs > 0) dynamicsPercent = ((last.pkgs - prev.pkgs) / prev.pkgs) * 100;
          }

          const combinedDataRubles = (() => {
            if (!combinedData.length) return [];
            return combinedData.map((row: any) => {
              const newRow: any = { month: row.month, name: row.name };
              const yearKeys = Object.keys(row).filter(k => /^\d{4}$/.test(k));
              for (const yk of yearKeys) {
                newRow[yk] = row[yk] || 0;
                const monthDrugs = monthlyDS[row.month]?.[yk] || [];
                const rubVal = convertDrugBreakdownToRubles(monthDrugs, drugPrices);
                newRow[`${yk}_rub`] = rubVal || 0;
              }
              return newRow;
            });
          })();

          const drugPieData = (() => {
            const drugs = [...allDrugSales].sort((a, b) => b.sales - a.sales);
            const top10 = drugs.slice(0, 10);
            const rest = drugs.slice(10);
            const restPkgs = rest.reduce((s, d) => s + d.sales, 0);
            const pkgData = top10.map(d => ({ name: d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name, fullName: d.name, value: d.sales }));
            if (restPkgs > 0) pkgData.push({ name: 'Остальные', fullName: 'Остальные', value: restPkgs });

            const rubData = top10.map(d => {
              const rub = convertToMoney(d.sales, d.name, drugPrices);
              return { name: d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name, fullName: d.name, value: rub || 0 };
            });
            const restRub = rest.reduce((s, d) => s + (convertToMoney(d.sales, d.name, drugPrices) || 0), 0);
            if (restRub > 0 || restPkgs > 0) rubData.push({ name: 'Остальные', fullName: 'Остальные', value: restRub });

            return { pkgData, rubData };
          })();

          const dynamicYears: string[] = [...new Set(combinedData.flatMap((d: any) => Object.keys(d).filter(k => /^\d{4}$/.test(k))))].sort();
          const yearColors = [CHART_COLORS.year2024, CHART_COLORS.year2025, CHART_COLORS.year2026, CHART_COLORS.forecast, '#8b5cf6', '#f59e0b', '#ef4444'];

          return (
          <div className="p-4">
            <BackButton label="К загрузке" onClick={() => navigateTo('upload')} />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold text-slate-800">Обзор продаж</h2>
              <div className="flex gap-2 flex-wrap items-center">
                <MultiSelect
                  options={disposalTypeOptions}
                  selected={selectedDisposalTypes}
                  onChange={setSelectedDisposalTypes}
                  placeholder="Типы выбытия"
                  className="text-sm border-orange-300 bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div className="md:col-span-2 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-4 border-2 border-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-200/30 to-transparent rounded-bl-full" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                      <Package size={18} className="text-white" />
                    </div>
                    <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">Всего продаж</p>
                  </div>
                  <div className="flex items-baseline gap-4 mb-3">
                    <div>
                      <p className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">{hasRealData ? formatPackages(totalPkgs) : '—'}</p>
                    </div>
                    <div className="border-l-2 border-slate-200 pl-4">
                      <p className="text-2xl font-bold text-emerald-600">{hasRealData && hasRub ? <MoneySpan value={totalRub} /> : '—'}</p>
                    </div>
                  </div>
                  {hasRealData && yearBreakdown.length > 0 && (
                    <div className="space-y-1 border-t border-slate-200/50 pt-2">
                      {yearBreakdown.map((yb, idx) => (
                        <div key={yb.year} className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-slate-700 w-10">{yb.year}:</span>
                          <span className="text-slate-600">{yb.pkgs.toLocaleString('ru-RU')} уп.</span>
                          <span className="text-slate-400">({yb.rub !== null ? <MoneySpan value={yb.rub} /> : '—'})</span>
                          <span className="text-slate-400 ml-auto">{yb.period}</span>
                          {dynamicsPercent !== null && fullYears.length >= 2 && idx === yearBreakdown.indexOf(fullYears[fullYears.length - 1]) && (
                            <span className={`flex items-center gap-0.5 font-semibold ${dynamicsPercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {dynamicsPercent >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                              {dynamicsPercent >= 0 ? '+' : ''}{dynamicsPercent.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {(() => {
                const ts = Object.values(currentWeekData || {}).reduce((s: number, v: number) => s + v, 0);
                const tp = Object.values(drugPlans || {}).reduce((s: number, v: number) => s + v, 0);
                const planVal = tp > 0 ? `${((ts / tp) * 100).toFixed(1)}%` : '—';
                return (
                  <div onClick={() => navigateTo('datamanager')} className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-3 md:p-4 border-2 border-white shadow-lg hover:shadow-xl cursor-pointer transition-all hover:scale-105 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
                          <Target size={14} className="text-white" />
                        </div>
                        <p className="text-[10px] md:text-xs text-slate-600 font-medium uppercase tracking-wide">Выполнение плана</p>
                      </div>
                      <p className="text-lg md:text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">{planVal}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {(() => {
                const sortedYears = [...(availableYears || [])].map(String).sort();
                const kpiCards = [
                  { title: 'Регионов', total: hasRealData ? (filteredData?.regionSales?.length ?? 0) : 0, perYear: regionsPerYear || {}, icon: Globe, onClick: () => navigateTo('territory'), color: 'from-purple-500 to-purple-600', bgColor: 'from-purple-50 to-purple-50', textColor: 'text-purple-600' },
                  { title: 'Контрагентов', total: hasRealData ? (filteredData?.contragentSales?.length ?? 0) : 0, perYear: contragentsPerYear || {}, icon: Users, onClick: () => navigateTo('contragents'), color: 'from-emerald-500 to-emerald-600', bgColor: 'from-emerald-50 to-emerald-50', textColor: 'text-emerald-600' },
                  { title: 'Препаратов', total: hasRealData ? (filteredData?.drugSales?.length ?? 0) : 0, perYear: drugsPerYearData || {}, icon: Pill, onClick: () => navigateTo('drugs'), color: 'from-orange-500 to-red-500', bgColor: 'from-orange-50 to-red-50', textColor: 'text-orange-600' },
                ];
                return kpiCards.map((kpi, i) => (
                  <div key={i} onClick={kpi.onClick} className={`bg-gradient-to-br ${kpi.bgColor} rounded-2xl p-3 md:p-4 border-2 border-white shadow-lg hover:shadow-xl cursor-pointer transition-all hover:scale-105 group relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${kpi.color} shadow-md`}>
                          <kpi.icon size={14} className="text-white" />
                        </div>
                        <p className="text-[10px] md:text-xs text-slate-600 font-medium uppercase tracking-wide">{kpi.title}</p>
                      </div>
                      <p className={`text-lg md:text-2xl font-bold bg-gradient-to-r ${kpi.color} bg-clip-text text-transparent`}>{hasRealData ? (kpi.total ?? 0).toLocaleString('ru-RU') : '—'}</p>
                      {hasRealData && sortedYears.length > 1 && (
                        <div className="space-y-0.5 border-t border-slate-200/50 pt-1.5 mt-1.5">
                          {sortedYears.map(yr => {
                            const val = kpi.perYear?.[yr];
                            if (val == null) return null;
                            return (
                              <div key={yr} className="flex items-center gap-1.5 text-[10px]">
                                <span className="font-bold text-slate-700 w-9">{yr}:</span>
                                <span className={kpi.textColor}>{(val ?? 0).toLocaleString('ru-RU')}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl">
                <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full" />
                  Динамика продаж (упаковки)
                </h3>
                {(() => {
                  if (combinedData.length === 0) return <NoDataMessage title="Нет данных" />;
                  if (!chartsReady) return <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">Загрузка...</div>;
                  return (
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={combinedData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                      <XAxis dataKey="month" fontSize={10} />
                      <YAxis fontSize={10} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                      <Tooltip formatter={(value: number) => [formatPackages(value), '']} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {dynamicYears.map((year, idx) => {
                        if (!shouldShowYear(year)) return null;
                        if (!combinedData.some((d: any) => d[year])) return null;
                        const color = yearColors[idx % yearColors.length];
                        return <Bar key={year} dataKey={year} fill={color} name={`${year} уп.`} opacity={0.85} />;
                      })}
                    </ComposedChart>
                  </ResponsiveContainer>);
                })()}
              </div>
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl">
                <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full" />
                  Динамика продаж (рубли)
                </h3>
                {(() => {
                  if (combinedDataRubles.length === 0) return <NoDataMessage title="Нет данных" />;
                  if (!chartsReady) return <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">Загрузка...</div>;
                  const rubYearKeys = dynamicYears.map(y => `${y}_rub`);
                  return (
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={combinedDataRubles}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                      <XAxis dataKey="month" fontSize={10} />
                      <YAxis fontSize={10} tickFormatter={(v) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                      <Tooltip formatter={(value: number) => [formatMoneyFull(value), '']} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {dynamicYears.map((year, idx) => {
                        if (!shouldShowYear(year)) return null;
                        const rKey = `${year}_rub`;
                        if (!combinedDataRubles.some((d: any) => d[rKey] > 0)) return null;
                        const color = yearColors[idx % yearColors.length];
                        return <Bar key={rKey} dataKey={rKey} fill={color} name={`${year} ₽`} opacity={0.85} />;
                      })}
                    </ComposedChart>
                  </ResponsiveContainer>);
                })()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl">
                <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full" />
                  Доля препаратов (упаковки)
                </h3>
                {drugPieData.pkgData.length === 0 ? <NoDataMessage title="Нет данных" /> : (
                  <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={drugPieData.pkgData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={2} stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
                        {drugPieData.pkgData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => [formatPackages(value), props.payload.fullName || name]}
                        contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', backdropFilter: 'blur(8px)' }}
                        itemStyle={{ color: '#e2e8f0' }}
                        labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-1 gap-1.5 mt-2 max-h-[160px] overflow-y-auto">
                    {drugPieData.pkgData.map((item, idx) => {
                      const total = drugPieData.pkgData.reduce((s, d) => s + d.value, 0);
                      const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                      return (
                        <div key={idx} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50/80 transition-colors">
                          <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          <span className="text-xs text-slate-700 flex-1 min-w-0 leading-tight" title={item.name}>{item.name}</span>
                          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl">
                <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full" />
                  Доля препаратов (рубли)
                </h3>
                {drugPieData.rubData.length === 0 || drugPieData.rubData.every(d => d.value === 0) ? <NoDataMessage title="Нет данных" /> : (() => {
                  const filteredRubData = drugPieData.rubData.filter(d => d.value > 0);
                  const totalRub = filteredRubData.reduce((s, d) => s + d.value, 0);
                  return (
                  <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={filteredRubData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={2} stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
                        {filteredRubData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => [formatMoneyFull(value), props.payload.fullName || name]}
                        contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', backdropFilter: 'blur(8px)' }}
                        itemStyle={{ color: '#e2e8f0' }}
                        labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-1 gap-1.5 mt-2 max-h-[160px] overflow-y-auto">
                    {filteredRubData.map((item, idx) => {
                      const pct = totalRub > 0 ? ((item.value / totalRub) * 100).toFixed(1) : '0';
                      return (
                        <div key={idx} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50/80 transition-colors">
                          <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          <span className="text-xs text-slate-700 flex-1 min-w-0 leading-tight" title={item.name}>{item.name}</span>
                          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                  </>
                  );
                })()}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl">
                <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full" />
                  Регионы
                </h3>
                <div className="space-y-2">
                  {(filteredData?.regionSales || []).slice(0, 6).map((region, i) => (
                    <div key={i} onClick={() => { setTerritoryPath([region.name]); navigateTo('drilldown'); }} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-xs text-slate-700 truncate">{region.name.replace('Республика ', '').replace(' область', '')}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 ml-2">{`${(region.sales/1000).toFixed(0)}K`}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl">
                <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full" />
                  Топ контрагенты
                </h3>
                <div className="space-y-2">
                  {(filteredData?.contragentSales || []).slice(0, 6).map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 truncate">{c.name}</p>
                        <p className="text-[10px] text-slate-400">{c.city || ''}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 ml-2">{c.sales.toLocaleString('ru-RU')}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl">
                <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full" />
                  Быстрые действия
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'Управление данными', icon: Database, gradient: 'from-emerald-500 to-emerald-600', tab: 'datamanager' },
                    { label: 'Проблемные зоны', icon: AlertTriangle, gradient: 'from-red-500 to-red-600', tab: 'problems' },
                    { label: 'Детализация региона', icon: Navigation, gradient: 'from-cyan-500 to-blue-600', tab: 'drilldown' },
                    { label: 'Создать отчёт', icon: FileText, gradient: 'from-blue-500 to-blue-600', tab: 'reports' },
                  ].map((btn, i) => (
                    <button key={i} onClick={() => navigateTo(btn.tab)} className={`w-full flex items-center gap-2 p-3 bg-gradient-to-r ${btn.gradient} text-white rounded-xl text-xs font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all group`}>
                      <btn.icon size={14} className="group-hover:scale-110 transition-transform" />
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>);
        })()}

        {/* Forecast - ОБНОВЛЕННАЯ ВКЛАДКА ПРОГНОЗ */}
        {activeTab === 'forecast' && (() => {
          // Расчёт прогнозных показателей из реальных данных
          // Используем только реальные года из данных, без дефолтов
          const forecastYears = availableYears.length > 0 ? [...availableYears].sort() : [];
          const hasYearData = forecastYears.length > 0 && combinedData.length > 0;
          console.log('forecastData:', { forecastYears, hasYearData, combinedDataLen: combinedData.length, availableYears, sample: combinedData.slice(0, 2) });
          const latestYear = hasYearData ? forecastYears[forecastYears.length - 1] : null;
          const prevYear = forecastYears.length > 1 ? forecastYears[forecastYears.length - 2] : null;
          
          // Суммы по годам (только если есть данные)
          const yearTotals: Record<string, number> = {};
          if (hasYearData) {
            for (const year of forecastYears) {
              yearTotals[year] = combinedData.reduce((sum: number, d: any) => sum + (d[year] || 0), 0);
            }
          }
          
          // Фильтруем месяцы где есть данные (включая нулевые, но исключая undefined)
          const monthsWithDataForYear = latestYear 
            ? combinedData.filter((d: any) => d[latestYear] !== undefined && d[latestYear] !== null)
            : [];
          
          // Последний месяц с данными
          const lastMonthData = monthsWithDataForYear.slice(-1)[0];
          const monthForecast = lastMonthData && latestYear ? (lastMonthData[latestYear] || 0) : 0;
          
          // Квартал (последние 3 месяца с данными)
          const lastThreeMonths = monthsWithDataForYear.slice(-3);
          const quarterForecast = latestYear 
            ? lastThreeMonths.reduce((sum: number, d: any) => sum + (d[latestYear] || 0), 0) 
            : 0;
          
          // Годовой прогноз
          const yearForecast = latestYear ? (yearTotals[latestYear] || 0) : 0;
          const prevYearTotal = prevYear ? (yearTotals[prevYear] || 0) : 0;
          
          // Рост к предыдущему году
          const growthPercent = prevYearTotal > 0 ? ((yearForecast - prevYearTotal) / prevYearTotal * 100) : 0;
          
          // Прогноз на основе тренда (если текущий год неполный)
          const monthsWithData = monthsWithDataForYear.length;
          const projectedYearTotal = monthsWithData > 0 ? (yearForecast / monthsWithData) * 12 : yearForecast;
          
          return (
          <div className="p-4">
            <BackButton />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">
                {hasYearData ? `Прогнозирование на ${latestYear} год` : 'Прогнозирование'}
              </h2>
              {DisplayModeToggle}
            </div>
            
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-4 mb-4 flex items-center gap-4">
              <Zap className="text-cyan-600 flex-shrink-0" size={24} />
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800">Модель: Анализ тренда + экстраполяция</h4>
                <p className="text-xs text-slate-600 mt-1">
                  {hasYearData 
                    ? `Данные: ${forecastYears.join(', ')} гг. • Месяцев с данными: ${monthsWithData} • Источник: загруженные файлы`
                    : 'Загрузите данные для расчёта прогноза'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-xl p-4 border">
                <p className="text-xs text-slate-500 mb-1">Последний месяц</p>
                <p className="text-2xl font-bold text-slate-800">{hasYearData ? fmtValue(monthForecast) : '—'}</p>
                <p className="text-xs text-slate-500 mt-1">{hasYearData && lastMonthData?.name ? lastMonthData.name : 'Нет данных'}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border">
                <p className="text-xs text-slate-500 mb-1">За квартал</p>
                <p className="text-2xl font-bold text-slate-800">{hasYearData ? fmtValue(quarterForecast) : '—'}</p>
                <p className="text-xs text-slate-500 mt-1">{hasYearData ? `Последние ${lastThreeMonths.length} мес.` : 'Нет данных'}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border">
                <p className="text-xs text-slate-500 mb-1">{hasYearData ? (monthsWithData < 12 ? `Прогноз на ${latestYear}` : `Итого за ${latestYear}`) : 'Прогноз на год'}</p>
                <p className="text-2xl font-bold text-cyan-600">{hasYearData ? fmtValue(monthsWithData < 12 ? Math.round(projectedYearTotal) : yearForecast) : '—'}</p>
                <p className="text-xs text-cyan-600 mt-1">{hasYearData ? (monthsWithData < 12 ? `Экстраполяция (${monthsWithData} мес.)` : 'Фактические данные') : 'Нет данных'}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border">
                <p className="text-xs text-slate-500 mb-1">{hasYearData && prevYear ? `Рост к ${prevYear}` : 'Рост к пред. году'}</p>
                <p className={`text-2xl font-bold ${growthPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {hasYearData && prevYearTotal > 0 ? `${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs text-slate-600 mt-1">{hasYearData && prevYearTotal > 0 ? <>База: {fmtValue(prevYearTotal)}</> : 'Нет данных за пред. год'}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border p-4 mb-4">
              <h3 className="font-semibold text-slate-700 mb-3">
                {hasYearData 
                  ? `График: ${forecastYears.map((y, i) => i === forecastYears.length - 1 ? `${y} (текущий)` : `${y} (факт)`).join(' → ')}`
                  : 'График прогноза'}
              </h3>
              {hasYearData && chartsReady ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={isMoney ? combinedData.map((d: any) => { const r: any = { month: d.month, name: d.name }; forecastYears.forEach(y => { r[y] = toRubles(d[y] || 0); }); return r; }) : combinedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={10} />
                    <YAxis fontSize={10} tickFormatter={(v) => isMoney ? (v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v) : (v >= 1000 ? `${(v/1000).toFixed(0)}K` : v)} />
                    <Tooltip formatter={(value: number) => isMoney ? formatMoneyFull(value) : value?.toLocaleString()} />
                    <Legend />
                    {forecastYears.map((year, idx) => {
                      const colors = [CHART_COLORS.year2024, CHART_COLORS.year2025, CHART_COLORS.year2026, CHART_COLORS.forecast];
                      const isLatest = idx === forecastYears.length - 1;
                      return (
                        <Line 
                          key={year}
                          dataKey={year} 
                          stroke={colors[idx % colors.length]} 
                          strokeWidth={isLatest ? 3 : 2} 
                          strokeDasharray={isLatest && monthsWithData < 12 ? "5 5" : undefined}
                          name={`${year} ${isLatest ? '(текущий)' : '(факт)'}`}
                          dot={{ r: 3 }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <NoDataMessage title="Загрузите данные для отображения графика прогноза" />
              )}
            </div>

            {/* AI-генерация комментариев */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Zap className="text-purple-500" size={18} />
                  AI-аналитика (OpenAI)
                </h3>
                <button 
                  onClick={async () => {
                    if (!uploadedData) return;
                    setAiCommentLoading(true);
                    setAiCommentError(null);
                    try {
                      const result = await api.analytics.generateComment(uploadedData);
                      setAiComment(result.comment);
                    } catch (err: any) {
                      setAiCommentError(err.message || 'Ошибка генерации');
                    } finally {
                      setAiCommentLoading(false);
                    }
                  }}
                  disabled={aiCommentLoading || !hasRealData}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                >
                  {aiCommentLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      Сгенерировать комментарий
                    </>
                  )}
                </button>
              </div>
              {aiCommentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-3">
                  {aiCommentError}
                </div>
              )}
              {aiComment && (
                <div className="p-4 bg-white rounded-lg border border-purple-100">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{aiComment}</p>
                </div>
              )}
              {!aiComment && !aiCommentLoading && !aiCommentError && (
                <p className="text-sm text-slate-500">
                  {hasRealData 
                    ? 'Нажмите кнопку для получения AI-аналитики по загруженным данным'
                    : 'Загрузите данные для получения AI-аналитики'
                  }
                </p>
              )}
            </div>

            {/* Комментарии анализа */}
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Info className="text-blue-500" size={18} />
                Комментарии к прогнозу
              </h3>
              {hasRealData ? (
                <div className="text-sm text-slate-600">
                  <p>Используйте AI-аналитику выше для получения комментариев по загруженным данным.</p>
                </div>
              ) : (
                <NoDataMessage title="Нет данных для комментариев" />
              )}
            </div>
          </div>
          );
        })()}

        {/* Reports - ОБНОВЛЕННАЯ ВКЛАДКА С КЛИКАБЕЛЬНЫМИ КНОПКАМИ */}
        {activeTab === 'reports' && (
          <div className="p-4">
            <BackButton />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold text-slate-800">Отчёты</h2>
              <button
                onClick={() => setShowSaveReportDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm"
              >
                <Save size={16} />
                Сохранить текущие настройки
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: 'Ежемесячный', icon: Calendar, desc: 'Статистика за месяц' },
                { title: 'Территориальный', icon: MapIcon, desc: 'Анализ по регионам' },
                { title: 'Детализация региона', icon: Navigation, desc: 'Города и районы' },
                { title: 'Выполнение плана', icon: Target, desc: 'Факт vs План' },
                { title: 'Проблемные зоны', icon: AlertTriangle, desc: 'Области внимания' },
                { title: 'ABC-анализ', icon: Layers, desc: 'Классификация' },
                { title: 'По препаратам', icon: Pill, desc: 'Аналитика по SKU' },
                { title: 'Прогнозный', icon: Target, desc: 'Прогнозы на 2026' },
                { title: 'Сводный годовой', icon: FileText, desc: 'Полный отчёт' },
              ].map((r, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border hover:shadow-lg transition-all">
                  <div className="flex items-start gap-3 mb-4">
                    <r.icon className="text-cyan-500 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="font-semibold text-slate-700">{r.title}</h4>
                      <p className="text-xs text-slate-400">{r.desc}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => previewReport(r.title)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-50 rounded text-xs hover:bg-slate-100 transition-colors"
                    >
                      <Eye size={14} />
                      <span className="hidden sm:inline">Просмотр</span>
                    </button>
                    <button 
                      onClick={() => downloadPDF(r.title)}
                      className="px-3 py-2 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors flex items-center gap-1"
                    >
                      <Download size={14} />
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                    <button 
                      onClick={() => downloadExcel(r.title)}
                      className="px-3 py-2 bg-emerald-500 text-white rounded text-xs hover:bg-emerald-600 transition-colors flex items-center gap-1"
                    >
                      <Download size={14} />
                      <span className="hidden sm:inline">Excel</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROBLEMS - ВКЛАДКА ПРОБЛЕМНЫЕ ЗОНЫ */}
        {activeTab === 'problems' && (() => {
          const regionSales = filteredData?.regionSales || [];
          const drugSalesArr = filteredData?.drugSales || [];

          // Проблемные зоны по регионам (сравниваем с планами)
          const regionProblems = regionSales.map(r => {
            const plan = savedPlans[r.name] || 0;
            const pct = plan > 0 ? (r.sales / plan) * 100 : null;
            const level = pct === null ? null : pct < 50 ? 'critical' : pct < 80 ? 'warning' : null;
            return { ...r, plan, pct, level };
          }).filter(r => r.level !== null);

          // Проблемные зоны по препаратам (нижние 20% от максимальных продаж)
          const maxDrugSales = Math.max(...drugSalesArr.map(d => d.sales), 1);
          const drugProblems = drugSalesArr.filter(d => d.sales < maxDrugSales * 0.2 && d.sales >= 0);

          // Регионы без единой продажи
          const zeroRegions = regionSales.filter(r => r.sales === 0);

          const critCount = regionProblems.filter(r => r.level === 'critical').length;
          const warnCount = regionProblems.filter(r => r.level === 'warning').length + drugProblems.length;
          const infoCount = zeroRegions.length;

          const hasData = regionSales.length > 0 || drugSalesArr.length > 0;

          return (
            <div className="p-4">
              <BackButton />
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Проблемные зоны</h2>
                {DisplayModeToggle}
              </div>

              {/* Счётчики */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><XCircle className="text-red-600" size={18} /><span className="font-semibold text-red-800">Критические</span></div>
                  <p className="text-3xl font-bold text-red-600">{critCount}</p>
                  <p className="text-xs text-red-500 mt-1">Выполнение плана &lt; 50%</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><AlertCircle className="text-amber-600" size={18} /><span className="font-semibold text-amber-800">Предупреждения</span></div>
                  <p className="text-3xl font-bold text-amber-600">{warnCount}</p>
                  <p className="text-xs text-amber-500 mt-1">Выполнение плана 50–80% или слабые препараты</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><Info className="text-blue-600" size={18} /><span className="font-semibold text-blue-800">Информация</span></div>
                  <p className="text-3xl font-bold text-blue-600">{infoCount}</p>
                  <p className="text-xs text-blue-500 mt-1">Регионы без продаж</p>
                </div>
              </div>

              {!hasData ? (
                <div className="bg-white rounded-xl border p-8">
                  <NoDataMessage title="Нет данных для анализа" />
                  <p className="text-center text-sm text-slate-500 mt-2">
                    Загрузите файл с данными — система автоматически выявит проблемные области
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Проблемные регионы */}
                  {regionProblems.length > 0 && (
                    <div className="bg-white rounded-xl border overflow-hidden">
                      <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
                        <AlertCircle size={16} className="text-amber-600" />
                        <span className="font-semibold text-slate-700">Регионы с отставанием от плана</span>
                        <span className="ml-auto text-xs text-slate-400">{regionProblems.length} регионов</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-slate-50 text-left">
                              <th className="px-4 py-2 text-slate-500 font-medium">Регион</th>
                              <th className="px-4 py-2 text-slate-500 font-medium text-right">Факт</th>
                              <th className="px-4 py-2 text-slate-500 font-medium text-right">План</th>
                              <th className="px-4 py-2 text-slate-500 font-medium text-right">Выполнение</th>
                              <th className="px-4 py-2 text-slate-500 font-medium text-right">Дефицит</th>
                              <th className="px-4 py-2 text-slate-500 font-medium">Уровень</th>
                            </tr>
                          </thead>
                          <tbody>
                            {regionProblems.sort((a, b) => (a.pct ?? 100) - (b.pct ?? 100)).map((r, i) => (
                              <tr key={i} className="border-b hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2 font-medium text-slate-700">{r.name}</td>
                                <td className="px-4 py-2 text-right">{r.sales.toLocaleString('ru-RU')}</td>
                                <td className="px-4 py-2 text-right text-slate-500">{r.plan.toLocaleString('ru-RU')}</td>
                                <td className="px-4 py-2 text-right font-semibold" style={{ color: r.level === 'critical' ? '#dc2626' : '#d97706' }}>
                                  {r.pct !== null ? r.pct.toFixed(1) + '%' : '—'}
                                </td>
                                <td className="px-4 py-2 text-right text-red-600">{r.plan > 0 ? (r.plan - r.sales).toLocaleString('ru-RU') : '—'}</td>
                                <td className="px-4 py-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.level === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {r.level === 'critical' ? 'Критический' : 'Предупреждение'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Слабые препараты */}
                  {drugProblems.length > 0 && (
                    <div className="bg-white rounded-xl border overflow-hidden">
                      <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
                        <AlertCircle size={16} className="text-amber-600" />
                        <span className="font-semibold text-slate-700">Препараты с низкими продажами</span>
                        <span className="ml-auto text-xs text-slate-400">{drugProblems.length} препаратов</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-slate-50 text-left">
                              <th className="px-4 py-2 text-slate-500 font-medium">Препарат</th>
                              <th className="px-4 py-2 text-slate-500 font-medium text-right">Продажи</th>
                              <th className="px-4 py-2 text-slate-500 font-medium text-right">% от лидера</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drugProblems.map((d, i) => (
                              <tr key={i} className="border-b hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700">{d.name}</td>
                                <td className="px-4 py-2 text-right">{d.sales.toLocaleString('ru-RU')}</td>
                                <td className="px-4 py-2 text-right text-amber-600 font-semibold">{((d.sales / maxDrugSales) * 100).toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Регионы без продаж */}
                  {zeroRegions.length > 0 && (
                    <div className="bg-white rounded-xl border overflow-hidden">
                      <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
                        <Info size={16} className="text-blue-600" />
                        <span className="font-semibold text-slate-700">Регионы без продаж</span>
                        <span className="ml-auto text-xs text-slate-400">{zeroRegions.length} регионов</span>
                      </div>
                      <div className="flex flex-wrap gap-2 p-4">
                        {zeroRegions.map((r, i) => (
                          <span key={i} className="text-xs px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full">{r.name}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {regionProblems.length === 0 && drugProblems.length === 0 && zeroRegions.length === 0 && (
                    <div className="bg-white rounded-xl border p-8 text-center text-slate-500">
                      ✅ Проблемных зон не обнаружено
                      {Object.keys(savedPlans).length === 0 && (
                        <p className="text-xs mt-2 text-slate-400">Чтобы видеть отставание от плана — добавьте планы в разделе «Управление данными»</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* COMPARE - СРАВНЕНИЕ ПЕРИОДОВ */}
        {activeTab === 'compare' && (() => {
          const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
          const QUARTER_NAMES = ['Q1 (Янв-Мар)', 'Q2 (Апр-Июн)', 'Q3 (Июл-Сен)', 'Q4 (Окт-Дек)'];
          
          const srcCombined = tabData?.combinedData || combinedData || [];
          const srcYears = (tabData?.years || availableYears || []).map((y: any) => Number(y)).filter((y: number) => y >= 2000 && y <= 2100).sort() as number[];
          
          const yearsFromData = srcYears;
          
          let compareData: any[] = [];
          
          if (compareTab === 0) {
            const yearSales = new Map<number, number>();
            srcCombined.forEach((c: any) => {
              yearsFromData.forEach(year => {
                const val = Number(c[String(year)]) || 0;
                yearSales.set(year, (yearSales.get(year) || 0) + val);
              });
            });
            compareData = yearsFromData.map(year => ({
              name: String(year),
              sales: yearSales.get(year) || 0
            }));
          } else if (compareTab === 1) {
            const MONTH_TO_INDEX: Record<string, number> = {
              'Янв': 0, 'Фев': 1, 'Мар': 2, 'Апр': 3, 'Май': 4, 'Июн': 5,
              'Июл': 6, 'Авг': 7, 'Сен': 8, 'Окт': 9, 'Ноя': 10, 'Дек': 11,
              'Январь': 0, 'Февраль': 1, 'Март': 2, 'Апрель': 3, 'Июнь': 5,
              'Июль': 6, 'Август': 7, 'Сентябрь': 8, 'Октябрь': 9, 'Ноябрь': 10, 'Декабрь': 11,
            };
            compareData = QUARTER_NAMES.map((name, qi) => {
              const row: any = { name };
              yearsFromData.forEach(year => { row[String(year)] = 0; });
              srcCombined.forEach((c: any) => {
                const mi = MONTH_TO_INDEX[c.month] ?? MONTH_TO_INDEX[c.name] ?? -1;
                if (mi < 0) return;
                const quarter = Math.floor(mi / 3);
                if (quarter !== qi) return;
                yearsFromData.forEach(year => {
                  row[String(year)] += Number(c[String(year)]) || 0;
                });
              });
              return row;
            });
          } else {
            compareData = MONTH_NAMES.map((name, mi) => {
              const row: any = { name };
              const shortMonth = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'][mi];
              const entry = srcCombined.find((c: any) => c.month === shortMonth || c.name === name);
              yearsFromData.forEach(year => {
                row[String(year)] = entry ? (Number(entry[String(year)]) || 0) : 0;
              });
              return row;
            });
          }
          
          const totalByYear = new Map<number, number>();
          srcCombined.forEach((c: any) => {
            yearsFromData.forEach(year => {
              const val = Number(c[String(year)]) || 0;
              totalByYear.set(year, (totalByYear.get(year) || 0) + val);
            });
          });
          
          const COMPARE_COLORS = ['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6'];
          
          return (
          <div className="p-4">
            <BackButton />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Сравнительный анализ периодов</h2>
              {DisplayModeToggle}

            </div>
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {['Год к году', 'Кварталы', 'Месяцы'].map((t, i) => (
                <button 
                  key={i} 
                  onClick={() => setCompareTab(i)}
                  className={`px-5 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all font-medium ${compareTab === i ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' : 'bg-white/70 backdrop-blur-sm border border-white/30 text-slate-600 hover:bg-white/90 hover:shadow-md'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            
            {(srcCombined.length > 0 || yearsFromData.length > 0) ? (
              <>
                {yearsFromData.length === 1 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-blue-800 text-sm font-medium">
                      Загружены данные только за {yearsFromData[0]} год
                    </p>
                    <p className="text-blue-600 text-xs mt-1">
                      Для сравнения периодов загрузите файлы за другие годы в разделе "Загрузка"
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {yearsFromData.map((year, i) => (
                    <div key={year} className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-white/30 shadow-xl relative overflow-hidden" style={{ borderLeftColor: COMPARE_COLORS[i % COMPARE_COLORS.length], borderLeftWidth: 4 }}>
                      <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10" style={{ background: COMPARE_COLORS[i % COMPARE_COLORS.length], transform: 'translate(30%, -30%)' }} />
                      <p className="text-sm text-slate-500 font-medium">{year} год</p>
                      <p className="text-2xl font-bold" style={{ color: COMPARE_COLORS[i % COMPARE_COLORS.length] }}>
                        {fmtValue(totalByYear.get(year) || 0)}
                      </p>
                      {i > 0 && totalByYear.get(yearsFromData[i - 1]) ? (
                        <p className={`text-xs font-medium ${(totalByYear.get(year) || 0) >= (totalByYear.get(yearsFromData[i - 1]) || 0) ? 'text-emerald-600' : 'text-red-500'}`}>
                          {(((totalByYear.get(year) || 0) - (totalByYear.get(yearsFromData[i - 1]) || 0)) / (totalByYear.get(yearsFromData[i - 1]) || 1) * 100).toFixed(1)}% vs {yearsFromData[i - 1]}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
                
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl mb-4">
                  <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full" />
                    {compareTab === 0 ? 'Сравнение по годам' : compareTab === 1 ? 'Сравнение по кварталам' : 'Сравнение по месяцам'}
                  </h3>
                  <ResponsiveContainer width="100%" height={320}>
                    {compareTab === 0 ? (
                      <BarChart data={isMoney ? compareData.map((d: any) => ({ ...d, sales: toRubles(d.sales || 0) })) : compareData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" />
                        <XAxis dataKey="name" fontSize={12} tick={{ fill: '#64748b' }} />
                        <YAxis fontSize={10} tick={{ fill: '#94a3b8' }} tickFormatter={(v) => isMoney ? (v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`) : `${(v/1000).toFixed(0)}K`} />
                        <Tooltip 
                          formatter={(value: number) => isMoney ? formatMoneyFull(value) : value.toLocaleString() + ' упак.'}
                          contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                          itemStyle={{ color: '#e2e8f0' }}
                        />
                        <Bar dataKey="sales" name="Продажи" radius={[8, 8, 0, 0]}>
                          {compareData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COMPARE_COLORS[index % COMPARE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <BarChart data={isMoney ? compareData.map((d: any) => { const r: any = { name: d.name }; yearsFromData.forEach(y => { r[String(y)] = toRubles(d[String(y)] || 0); }); return r; }) : compareData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" />
                        <XAxis dataKey="name" fontSize={10} angle={compareTab === 2 ? -30 : 0} textAnchor={compareTab === 2 ? 'end' : 'middle'} height={compareTab === 2 ? 60 : 30} tick={{ fill: '#64748b' }} />
                        <YAxis fontSize={10} tick={{ fill: '#94a3b8' }} tickFormatter={(v) => isMoney ? (v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`) : `${(v/1000).toFixed(0)}K`} />
                        <Tooltip 
                          formatter={(value: number) => isMoney ? formatMoneyFull(value) : value.toLocaleString() + ' упак.'}
                          contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                          itemStyle={{ color: '#e2e8f0' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                        {yearsFromData.map((year, i) => (
                          <Bar key={year} dataKey={String(year)} name={String(year)} fill={COMPARE_COLORS[i % COMPARE_COLORS.length]} radius={[6, 6, 0, 0]} />
                        ))}
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 shadow-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-3 font-semibold text-slate-600">
                            {compareTab === 0 ? 'Год' : compareTab === 1 ? 'Квартал' : 'Месяц'}
                          </th>
                          {compareTab === 0 ? (
                            <th className="text-right p-3 font-semibold text-slate-600">Продажи (упак. + ₽)</th>
                          ) : (
                            yearsFromData.map(year => (
                              <th key={year} className="text-right p-3 font-semibold text-slate-600">{year}</th>
                            ))
                          )}
                          {compareTab !== 0 && yearsFromData.length >= 2 && (
                            <th className="text-right p-3 font-semibold text-slate-600">Δ {yearsFromData[yearsFromData.length - 1]}/{yearsFromData[yearsFromData.length - 2]}</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {compareData.map((d, i) => {
                          const lastYear = yearsFromData[yearsFromData.length - 1];
                          const prevYear = yearsFromData[yearsFromData.length - 2];
                          const lastVal = d[String(lastYear)] || 0;
                          const prevVal = d[String(prevYear)] || 0;
                          const delta = prevVal > 0 ? ((lastVal - prevVal) / prevVal * 100) : 0;
                          
                          return (
                            <tr key={i} className="border-b hover:bg-slate-50">
                              <td className="p-3 font-medium text-slate-700">{d.name}</td>
                              {compareTab === 0 ? (
                                <td className="p-3 text-right font-semibold" style={{ color: COMPARE_COLORS[i % COMPARE_COLORS.length] }}>
                                  {d.sales ? fmtValue(d.sales) : '—'}
                                </td>
                              ) : (
                                yearsFromData.map((year, yi) => (
                                  <td key={year} className="p-3 text-right" style={{ color: COMPARE_COLORS[yi % COMPARE_COLORS.length] }}>
                                    {d[String(year)] ? fmtValue(d[String(year)]) : '—'}
                                  </td>
                                ))
                              )}
                              {compareTab !== 0 && yearsFromData.length >= 2 && (
                                <td className={`p-3 text-right font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {prevVal > 0 ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%` : '—'}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                        {compareTab !== 0 && (
                          <tr className="bg-slate-100 font-semibold">
                            <td className="p-3">Итого</td>
                            {yearsFromData.map((year, yi) => (
                              <td key={year} className="p-3 text-right" style={{ color: COMPARE_COLORS[yi % COMPARE_COLORS.length] }}>
                                {fmtValue(totalByYear.get(year) || 0)}
                              </td>
                            ))}
                            {yearsFromData.length >= 2 && (() => {
                              const lastYear = yearsFromData[yearsFromData.length - 1];
                              const prevYear = yearsFromData[yearsFromData.length - 2];
                              const lastVal = totalByYear.get(lastYear) || 0;
                              const prevVal = totalByYear.get(prevYear) || 0;
                              const delta = prevVal > 0 ? ((lastVal - prevVal) / prevVal * 100) : 0;
                              return (
                                <td className={`p-3 text-right ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {prevVal > 0 ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%` : '—'}
                                </td>
                              );
                            })()}
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border p-8">
                <NoDataMessage title="Нет данных для сравнения" />
                <div className="text-center mt-4 space-y-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-amber-800 font-medium">Данные не загружены</p>
                      <p className="text-amber-600 text-sm mt-1">Загрузите файлы МДЛП в разделе "Загрузка"</p>
                    </div>
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* TERRITORY - ТЕРРИТОРИИ */}
        {activeTab === 'territory' && (
          <div className="p-4">
            <BackButton />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold text-slate-800">Территориальный анализ</h2>
              <div className="flex gap-2 items-center">
                {DisplayModeToggle}

                <button onClick={() => navigateTo('drilldown')} className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm">Детализация по региону →</button>
              </div>
            </div>
            
            {/* Федеральные округа из загруженных данных */}
            {federalDistrictSales.length > 0 && (
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl mb-4">
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full" />
                  <Globe size={18} className="text-cyan-500" />
                  Федеральные округа (из загруженных данных)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {federalDistrictSales.slice(0, 8).map((fd, i) => (
                    <div key={i} className="bg-gradient-to-br from-slate-50/80 to-cyan-50/80 backdrop-blur-sm rounded-xl p-3 border border-white/40 shadow-md hover:shadow-lg transition-all hover:scale-[1.02]">
                      <p className="text-sm font-medium text-slate-700 mb-1">{fd.name}</p>
                      <p className="text-lg font-bold text-cyan-600">{fmtValue(fd.sales)}</p>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={federalDistrictSales.slice(0, 10).map(fd => ({ name: fd.name.replace('федеральный округ', 'ФО').replace('Федеральный округ', 'ФО'), sales: toRubles(fd.sales) }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" />
                    <XAxis type="number" fontSize={10} tick={{ fill: '#94a3b8' }} tickFormatter={(v) => isMoney ? (v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`) : `${(v/1000).toFixed(0)}K`} />
                    <YAxis dataKey="name" type="category" fontSize={10} width={120} tick={{ fill: '#64748b' }} />
                    <Tooltip 
                      formatter={(value: number) => isMoney ? formatMoneyFull(value) : value.toLocaleString()}
                      contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="sales" fill={CHART_COLORS.year2025} name="Продажи" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {/* Анализ по менеджерам */}
            {managerSales.length > 0 && managerSales.some(m => m.sales > 0) && (
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl mb-4">
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-orange-500 to-amber-600 rounded-full" />
                  <User size={18} className="text-orange-500" />
                  Анализ по менеджерам (территории)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {managerSales.map((m, i) => {
                    const totalSales = managerSales.reduce((s, x) => s + x.sales, 0);
                    const share = totalSales > 0 ? ((m.sales / totalSales) * 100).toFixed(1) : '0';
                    return (
                      <div 
                        key={i} 
                        onClick={() => setSelectedManagers([m.name])}
                        className="bg-gradient-to-br from-orange-50/80 to-amber-50/80 backdrop-blur-sm rounded-xl p-3 border border-white/40 shadow-md hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
                      >
                        <p className="text-sm font-medium text-slate-700 mb-1 truncate" title={m.name}>{m.name}</p>
                        <p className="text-lg font-bold text-orange-600">{fmtValue(m.sales)}</p>
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span>{share}%</span>
                          <span>{m.regions} рег.</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={managerSales.map(m => ({ name: m.name, sales: toRubles(m.sales) }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" />
                    <XAxis type="number" fontSize={10} tick={{ fill: '#94a3b8' }} tickFormatter={(v) => isMoney ? (v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`) : `${(v/1000).toFixed(0)}K`} />
                    <YAxis dataKey="name" type="category" fontSize={10} width={130} tick={{ fill: '#64748b' }} />
                    <Tooltip 
                      formatter={(value: number) => isMoney ? formatMoneyFull(value) : value.toLocaleString() + ' упак.'}
                      contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="sales" fill="#f97316" name="Продажи" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {/* Блок предупреждений о несопоставленных данных */}
            {(unmatchedData.regions.length > 0 || unmatchedData.contractors.length > 0) && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4 mb-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowUnmatchedAlert(!showUnmatchedAlert)}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-100 rounded-full p-2">
                      <AlertTriangle size={20} className="text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-800">Обнаружены неучтённые данные</h3>
                      <p className="text-sm text-amber-600">
                        {unmatchedData.regions.length > 0 && `${unmatchedData.regions.length} регион(ов) без менеджеров (${unmatchedData.totalUnmatchedSales.toLocaleString()} упак.)`}
                        {unmatchedData.regions.length > 0 && unmatchedData.contractors.length > 0 && ' | '}
                        {unmatchedData.contractors.length > 0 && `${unmatchedData.contractors.length > 50 ? '50+' : unmatchedData.contractors.length} контрагент(ов) без группы`}
                      </p>
                    </div>
                  </div>
                  <ChevronDown size={20} className={`text-amber-600 transition-transform ${showUnmatchedAlert ? 'rotate-180' : ''}`} />
                </div>
                
                {showUnmatchedAlert && (
                  <div className="mt-4 space-y-4">
                    {/* Несопоставленные регионы */}
                    {unmatchedData.regions.length > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-amber-100">
                        <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                          <MapPin size={16} className="text-red-500" />
                          Регионы без менеджеров ({unmatchedData.regions.length})
                        </h4>
                        <div className="max-h-48 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-50">
                              <tr className="text-left text-slate-500">
                                <th className="px-2 py-1">Регион</th>
                                <th className="px-2 py-1 text-right">Продажи</th>
                                <th className="px-2 py-1 text-right">Записей</th>
                              </tr>
                            </thead>
                            <tbody>
                              {unmatchedData.regions.slice(0, 20).map((r, i) => (
                                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                  <td className="px-2 py-1.5 text-slate-700">{r.region}</td>
                                  <td className="px-2 py-1.5 text-right font-medium text-amber-600">{r.sales.toLocaleString()}</td>
                                  <td className="px-2 py-1.5 text-right text-slate-500">{r.count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {unmatchedData.regions.length > 20 && (
                            <p className="text-xs text-slate-400 text-center mt-2">
                              ...и ещё {unmatchedData.regions.length - 20} регион(ов)
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                          <Info size={12} />
                          Добавьте эти регионы в территории менеджеров для полноты анализа
                        </p>
                      </div>
                    )}
                    
                    {/* Несопоставленные контрагенты */}
                    {unmatchedData.contractors.length > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-amber-100">
                        <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                          <Building2 size={16} className="text-orange-500" />
                          Контрагенты без группы ({unmatchedData.contractors.length > 50 ? '50+' : unmatchedData.contractors.length})
                        </h4>
                        <div className="max-h-32 overflow-y-auto">
                          <div className="flex flex-wrap gap-1">
                            {unmatchedData.contractors.slice(0, 20).map((c, i) => (
                              <span key={i} className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-xs">
                                {c.contractor.substring(0, 30)}{c.contractor.length > 30 ? '...' : ''}
                              </span>
                            ))}
                            {unmatchedData.contractors.length > 20 && (
                              <span className="text-xs text-slate-400">+{unmatchedData.contractors.length - 20} ещё</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {hasRealData && (filteredData?.regionSales?.length || 0) > 0 ? (
            <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {(filteredData?.regionSales || []).slice(0, 3).map((region, i) => (
                <div key={i} onClick={() => { setTerritoryPath([region.name]); navigateTo('drilldown'); }} className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-white/30 shadow-xl hover:shadow-2xl cursor-pointer transition-all hover:scale-[1.02]">
                  <h4 className="font-semibold text-slate-700 mb-2">{region.name}</h4>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div><p className="text-[10px] text-slate-400">Продажи</p><p className="font-semibold text-cyan-600">{fmtValue(region.sales)}</p></div>
                    <div><p className="text-[10px] text-slate-400">Доля</p><p className="font-semibold text-purple-600">{((region.sales / (filteredData?.regionSales?.reduce((s, r) => s + r.sales, 0) || 1)) * 100).toFixed(1)}%</p></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl">
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full" />
                Все регионы: продажи
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(filteredData?.regionSales || []).map(r => ({ name: r.name.replace('Республика ', '').replace(' область', ''), sales: toRubles(r.sales) }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" />
                  <XAxis type="number" fontSize={10} tick={{ fill: '#94a3b8' }} tickFormatter={(v) => isMoney ? (v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`) : `${(v/1000).toFixed(0)}K`} />
                  <YAxis dataKey="name" type="category" fontSize={10} width={120} tick={{ fill: '#64748b' }} />
                  <Tooltip 
                    formatter={(value: number) => isMoney ? formatMoneyFull(value) : value.toLocaleString()}
                    contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="sales" fill={CHART_COLORS.year2025} name="Продажи" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            </>
            ) : (
              <NoDataMessage title="Загрузите файл МДЛП для территориального анализа" />
            )}
          </div>
        )}

        {/* DRILLDOWN - ДЕТАЛИЗАЦИЯ РЕГИОНА */}
        {activeTab === 'drilldown' && (
          <div className="p-4">
            <BackButton />
            <Breadcrumbs />
            {(() => {
              const { level, data } = getCurrentTerritoryData();
              
              if (level === 'empty' || !hasRealData) {
                return (
                  <div className="bg-white rounded-xl border p-8">
                    <NoDataMessage title="Загрузите файл МДЛП для детализации территорий" />
                  </div>
                );
              }
              
              const totalSales = (filteredData?.regionSales || []).reduce((sum, r) => sum + r.sales, 0);
              const regionsCount = Object.keys(territoryHierarchy.regions).length;
              const citiesCount = Object.values(territoryHierarchy.regions || {}).reduce((sum: number, r: any) => sum + Object.keys(r.children || {}).length, 0);
              
              if (level === 'fo') {
                return (<>
                  <h2 className="text-xl font-bold text-slate-800 mb-4">Обзор территорий</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-cyan-50/80 to-cyan-100/60 backdrop-blur-sm rounded-2xl p-4 border border-white/40 shadow-md"><p className="text-xs text-cyan-600 font-medium">Всего продаж</p><p className="text-2xl font-bold text-cyan-700">{fmtValue(totalSales)}</p></div>
                    <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/60 backdrop-blur-sm rounded-2xl p-4 border border-white/40 shadow-md"><p className="text-xs text-blue-600 font-medium">Регионов</p><p className="text-2xl font-bold text-blue-700">{regionsCount}</p></div>
                    <div className="bg-gradient-to-br from-purple-50/80 to-purple-100/60 backdrop-blur-sm rounded-2xl p-4 border border-white/40 shadow-md"><p className="text-xs text-purple-600 font-medium">Городов</p><p className="text-2xl font-bold text-purple-700">{citiesCount}</p></div>
                    <div className="bg-gradient-to-br from-emerald-50/80 to-emerald-100/60 backdrop-blur-sm rounded-2xl p-4 border border-white/40 shadow-md"><p className="text-xs text-emerald-600 font-medium">Контрагентов</p><p className="text-2xl font-bold text-emerald-700">{(filteredData?.contragentSales?.length || 0)}</p></div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl mb-4">
                    <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full" />
                      Продажи по регионам
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={(filteredData?.regionSales || []).slice(0, 10).map(r => ({ name: r.name.replace('Республика ', '').replace(' область', ''), sales: toRubles(r.sales) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" />
                        <XAxis dataKey="name" fontSize={9} angle={-20} textAnchor="end" height={60} tick={{ fill: '#64748b' }} />
                        <YAxis fontSize={10} tick={{ fill: '#94a3b8' }} tickFormatter={(v) => isMoney ? (v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`) : `${(v/1000).toFixed(0)}K`} />
                        <Tooltip 
                          formatter={(value: number) => isMoney ? formatMoneyFull(value) : value.toLocaleString()}
                          contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                          itemStyle={{ color: '#e2e8f0' }}
                        />
                        <Bar dataKey="sales" fill={CHART_COLORS.year2025} name="Продажи" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 shadow-xl overflow-hidden">
                    <div className="p-4 border-b border-white/20"><h3 className="font-semibold text-slate-700 flex items-center gap-2"><div className="w-1.5 h-5 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full" /> Все регионы</h3></div>
                    <div className="divide-y">
                      {(filteredData?.regionSales || []).map((region, i) => (
                        <div key={i} onClick={() => setTerritoryPath([region.name])} className="p-4 hover:bg-slate-50 cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-cyan-100 text-cyan-600"><MapPin size={18} /></div>
                            <div>
                              <p className="font-medium text-slate-800">{region.name}</p>
                              <p className="text-xs text-slate-400">{((region.sales / totalSales) * 100).toFixed(1)}% от общего</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 md:gap-6">
                            <div className="text-right">
                              <p className="text-xs text-slate-400">Продажи</p>
                              <p className="font-bold text-cyan-600">{fmtValue(region.sales)}</p>
                            </div>
                            <ChevronRight className="text-slate-400" size={20} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>);
              }
              
              if (level === 'region' && data) {
                const regionName = territoryPath[0];
                const regionData = territoryHierarchy.regions[regionName];
                const regionCities = Object.entries(regionData?.children || {}).sort((a: any, b: any) => (b[1]?.sales || 0) - (a[1]?.sales || 0));
                const drugsList = regionData?.drugSales || [];
                
                return (<>
                  <h2 className="text-xl font-bold text-slate-800 mb-4">{regionName}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-cyan-50/80 to-cyan-100/60 backdrop-blur-sm rounded-2xl p-3 border border-white/40 shadow-md"><p className="text-[10px] text-cyan-600 font-medium">Продажи</p><p className="text-xl font-bold text-cyan-700">{fmtValue(regionData?.sales || 0)}</p></div>
                    <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/60 backdrop-blur-sm rounded-2xl p-3 border border-white/40 shadow-md"><p className="text-[10px] text-blue-600 font-medium">Городов</p><p className="text-xl font-bold text-blue-700">{regionCities.length}</p></div>
                    <div className="bg-gradient-to-br from-purple-50/80 to-purple-100/60 backdrop-blur-sm rounded-2xl p-3 border border-white/40 shadow-md"><p className="text-[10px] text-purple-600 font-medium">Препаратов</p><p className="text-xl font-bold text-purple-700">{drugsList.length}</p></div>
                    <div className="bg-gradient-to-br from-emerald-50/80 to-emerald-100/60 backdrop-blur-sm rounded-2xl p-3 border border-white/40 shadow-md"><p className="text-[10px] text-emerald-600 font-medium">Контрагентов</p><p className="text-xl font-bold text-emerald-700">{regionData?.contragentCount || 0}</p></div>
                  </div>
                  
                  {drugsList.length > 0 && (
                    <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl mb-4">
                      <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full" />
                        <Package size={18} className="text-cyan-500" />
                        Препараты в регионе
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left p-2 font-semibold text-slate-600">Препарат</th>
                              <th className="text-right p-2 font-semibold text-slate-600">Продажи</th>
                              <th className="text-right p-2 font-semibold text-slate-600">Доля</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drugsList.slice(0, 15).map((drug, i) => (
                              <tr key={i} className="border-b hover:bg-slate-50">
                                <td className="p-2 font-medium text-slate-800">{drug.name}</td>
                                <td className="p-2 text-right font-semibold text-cyan-600">{fmtValue(drug.sales)}</td>
                                <td className="p-2 text-right text-slate-500">{((drug.sales / (regionData?.sales || 1)) * 100).toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {regionCities.length > 0 && (
                    <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl mb-4">
                      <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full" />
                        Города региона
                      </h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={regionCities.slice(0, 8).map(([name, c]) => ({ name: name.replace('г. ', ''), sales: toRubles(c.sales) }))} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" />
                          <XAxis type="number" fontSize={10} tick={{ fill: '#94a3b8' }} tickFormatter={(v) => isMoney ? (v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`) : `${(v/1000).toFixed(0)}K`} />
                          <YAxis dataKey="name" type="category" fontSize={10} width={100} tick={{ fill: '#64748b' }} />
                          <Tooltip 
                            formatter={(value: number) => isMoney ? formatMoneyFull(value) : value.toLocaleString()}
                            contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                            itemStyle={{ color: '#e2e8f0' }}
                          />
                          <Bar dataKey="sales" fill={CHART_COLORS.year2025} radius={[0, 6, 6, 0]} name="Продажи" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 shadow-xl overflow-hidden">
                    <div className="p-4 border-b border-white/20"><h3 className="font-semibold text-slate-700 flex items-center gap-2"><div className="w-1.5 h-5 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full" /> Города и районы: {regionName}</h3></div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left p-3 font-semibold text-slate-600">Город/Район</th>
                            <th className="text-right p-3 font-semibold text-slate-600">Продажи</th>
                            <th className="text-right p-3 font-semibold text-slate-600">Препаратов</th>
                            <th className="text-right p-3 font-semibold text-slate-600">Доля</th>
                            <th className="text-center p-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {regionCities.map(([cityName, cityData], i) => (
                            <tr key={i} onClick={() => setTerritoryPath([...territoryPath, cityName])} className="border-b hover:bg-slate-50 cursor-pointer">
                              <td className="p-3 font-medium text-slate-800">{cityName}</td>
                              <td className="p-3 text-right font-semibold text-cyan-600">{fmtValue(cityData.sales)}</td>
                              <td className="p-3 text-right text-slate-500">{cityData.drugSales?.length || 0}</td>
                              <td className="p-3 text-right text-slate-500">{((cityData.sales / (regionData?.sales || 1)) * 100).toFixed(1)}%</td>
                              <td className="p-3 text-center"><ChevronRight className="text-slate-400" size={16} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>);
              }
              
              if (level === 'city' && data) {
                const cityName = territoryPath[1];
                const regionForCity = territoryHierarchy.regions[territoryPath[0]];
                const cityData = regionForCity?.children?.[cityName];
                const cityDistricts = Object.entries(cityData?.children || {});
                const cityDrugs = cityData?.drugSales || [];
                
                return (<>
                  <h2 className="text-xl font-bold text-slate-800 mb-4">{cityName}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-cyan-50/80 to-cyan-100/60 backdrop-blur-sm rounded-2xl p-3 border border-white/40 shadow-md"><p className="text-[10px] text-cyan-600 font-medium">Продажи</p><p className="text-xl font-bold text-cyan-700">{fmtValue(cityData?.sales || 0)}</p></div>
                    <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/60 backdrop-blur-sm rounded-2xl p-3 border border-white/40 shadow-md"><p className="text-[10px] text-blue-600 font-medium">Районов</p><p className="text-xl font-bold text-blue-700">{cityDistricts.length}</p></div>
                    <div className="bg-gradient-to-br from-purple-50/80 to-purple-100/60 backdrop-blur-sm rounded-2xl p-3 border border-white/40 shadow-md"><p className="text-[10px] text-purple-600 font-medium">Препаратов</p><p className="text-xl font-bold text-purple-700">{cityDrugs.length}</p></div>
                    <div className="bg-gradient-to-br from-emerald-50/80 to-emerald-100/60 backdrop-blur-sm rounded-2xl p-3 border border-white/40 shadow-md"><p className="text-[10px] text-emerald-600 font-medium">Контрагентов</p><p className="text-xl font-bold text-emerald-700">{cityData?.contragentCount || 0}</p></div>
                  </div>
                  
                  {cityDrugs.length > 0 && (
                    <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl mb-4">
                      <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full" />
                        <Package size={18} className="text-cyan-500" />
                        Препараты в городе
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left p-2 font-semibold text-slate-600">Препарат</th>
                              <th className="text-right p-2 font-semibold text-slate-600">Продажи</th>
                              <th className="text-right p-2 font-semibold text-slate-600">Доля</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cityDrugs.slice(0, 15).map((drug, i) => (
                              <tr key={i} className="border-b hover:bg-slate-50">
                                <td className="p-2 font-medium text-slate-800">{drug.name}</td>
                                <td className="p-2 text-right font-semibold text-cyan-600">{fmtValue(drug.sales)}</td>
                                <td className="p-2 text-right text-slate-500">{((drug.sales / (cityData?.sales || 1)) * 100).toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {cityDistricts.length > 0 && (
                    <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 shadow-xl overflow-hidden mb-4">
                      <div className="p-4 border-b border-white/20"><h3 className="font-semibold text-slate-700 flex items-center gap-2"><div className="w-1.5 h-5 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full" /> Районы: {cityName}</h3></div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left p-3 font-semibold text-slate-600">Район</th>
                              <th className="text-right p-3 font-semibold text-slate-600">Продажи</th>
                              <th className="text-right p-3 font-semibold text-slate-600">Препаратов</th>
                              <th className="text-right p-3 font-semibold text-slate-600">Доля</th>
                              <th className="text-center p-3"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {cityDistricts.map(([districtName, districtData], i) => (
                              <tr key={i} onClick={() => setTerritoryPath([...territoryPath, districtName])} className="border-b hover:bg-slate-50 cursor-pointer">
                                <td className="p-3 font-medium text-slate-800">{districtName}</td>
                                <td className="p-3 text-right font-semibold text-cyan-600">{fmtValue(districtData.sales)}</td>
                                <td className="p-3 text-right text-slate-500">{districtData.drugSales?.length || 0}</td>
                                <td className="p-3 text-right text-slate-500">{((districtData.sales / (cityData?.sales || 1)) * 100).toFixed(1)}%</td>
                                <td className="p-3 text-center"><ChevronRight className="text-slate-400" size={16} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>);
              }
              
              if (level === 'district' && data) {
                const districtName = territoryPath[2];
                const regionForDistrict = territoryHierarchy.regions[territoryPath[0]];
                const cityForDistrict = regionForDistrict?.children?.[territoryPath[1]];
                const districtData = cityForDistrict?.children?.[districtName];
                const districtDrugs = districtData?.drugSales || [];
                
                return (<>
                  <h2 className="text-xl font-bold text-slate-800 mb-4">{districtName}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3"><p className="text-[10px] text-cyan-600">Продажи</p><p className="text-xl font-bold text-cyan-700">{fmtValue(districtData?.sales || 0)}</p></div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3"><p className="text-[10px] text-purple-600">Препаратов</p><p className="text-xl font-bold text-purple-700">{districtDrugs.length}</p></div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><p className="text-[10px] text-emerald-600">Контрагентов</p><p className="text-xl font-bold text-emerald-700">{districtData?.contragentCount || 0}</p></div>
                  </div>
                  
                  {districtDrugs.length > 0 && (
                    <div className="bg-white rounded-xl border p-4 mb-4">
                      <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Package size={18} className="text-cyan-500" />
                        Препараты в районе
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left p-2 font-semibold text-slate-600">Препарат</th>
                              <th className="text-right p-2 font-semibold text-slate-600">Продажи</th>
                              <th className="text-right p-2 font-semibold text-slate-600">Доля</th>
                            </tr>
                          </thead>
                          <tbody>
                            {districtDrugs.map((drug, i) => (
                              <tr key={i} className="border-b hover:bg-slate-50">
                                <td className="p-2 font-medium text-slate-800">{drug.name}</td>
                                <td className="p-2 text-right font-semibold text-cyan-600">{fmtValue(drug.sales)}</td>
                                <td className="p-2 text-right text-slate-500">{((drug.sales / (districtData?.sales || 1)) * 100).toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>);
              }
              
              return null;
            })()}
          </div>
        )}

        {/* ABC */}
        {activeTab === 'abc' && (
          <div className="p-4">
            <BackButton />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">ABC-анализ</h2>
              {DisplayModeToggle}

            </div>
            {hasRealData && filteredData?.regionSales?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {(() => {
                  const regions = filteredData.regionSales;
                  const total = regions.reduce((sum, r) => sum + r.sales, 0);
                  let cumulative = 0;
                  const abcData = regions.map(r => {
                    cumulative += r.sales;
                    const pct = (cumulative / total) * 100;
                    return {
                      ...r,
                      category: pct <= 70 ? 'A' : pct <= 90 ? 'B' : 'C',
                      share: ((r.sales / total) * 100).toFixed(1)
                    };
                  });
                  const categories = [
                    { cat: 'A', color: '#10b981', items: abcData.filter(d => d.category === 'A') },
                    { cat: 'B', color: '#f59e0b', items: abcData.filter(d => d.category === 'B') },
                    { cat: 'C', color: '#ef4444', items: abcData.filter(d => d.category === 'C') },
                  ];
                  return categories.map((c, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 border">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: c.color }}>{c.cat}</span>
                        <div><h4 className="font-semibold">Категория {c.cat}</h4><p className="text-xs text-slate-400">{c.items.reduce((s, x) => s + parseFloat(x.share), 0).toFixed(1)}% продаж</p></div>
                      </div>
                      <div className="space-y-2">
                        {c.items.slice(0, 5).map((item, j) => (
                          <div key={j} onClick={() => { setTerritoryPath([item.name]); navigateTo('drilldown'); }} className="p-2 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100">
                            <span className="text-sm">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="bg-white rounded-xl border p-8">
                <NoDataMessage title="Нет данных для ABC-анализа" />
                <p className="text-center text-sm text-slate-500 mt-2">
                  Загрузите файл с данными по регионам для построения ABC-анализа
                </p>
              </div>
            )}
          </div>
        )}

        {/* Seasonal */}
        {activeTab === 'seasonal' && (
          <div className="p-4">
            <BackButton />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Сезонность продаж</h2>
              {DisplayModeToggle}

            </div>
            {hasRealData && filteredData?.monthlySales?.length ? (
              <>
                {(() => {
                  const monthlyData = filteredData.monthlySales as any[];
                  const avg = monthlyData.reduce((s: number, m: any) => s + m.sales, 0) / monthlyData.length;
                  const dataWithIndex = monthlyData.map(m => ({
                    ...m,
                    index: avg > 0 ? parseFloat((m.sales / avg).toFixed(2)) : 1
                  }));
                  const maxMonth = dataWithIndex.reduce((max, m) => m.index > max.index ? m : max, dataWithIndex[0]);
                  const minMonth = dataWithIndex.reduce((min, m) => m.index < min.index ? m : min, dataWithIndex[0]);
                  const amplitude = maxMonth.index - minMonth.index;
                  
                  return (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                          <p className="text-xs text-emerald-600">Пиковый месяц</p>
                          <p className="text-xl font-bold text-emerald-700">{maxMonth.name || maxMonth.month}</p>
                          <p className="text-xs text-emerald-600">индекс {maxMonth.index.toFixed(2)}</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                          <p className="text-xs text-red-600">Минимум</p>
                          <p className="text-xl font-bold text-red-700">{minMonth.name || minMonth.month}</p>
                          <p className="text-xs text-red-600">индекс {minMonth.index.toFixed(2)}</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <p className="text-xs text-blue-600">Средний</p>
                          <p className="text-xl font-bold text-blue-700">1.00</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                          <p className="text-xs text-purple-600">Амплитуда</p>
                          <p className="text-xl font-bold text-purple-700">{(amplitude * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                      <div className="bg-white rounded-xl border p-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <ComposedChart data={isMoney ? dataWithIndex.map((d: any) => ({ ...d, sales: toRubles(d.sales) })) : dataWithIndex}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" fontSize={10} />
                            <YAxis yAxisId="left" fontSize={10} tickFormatter={(v) => isMoney ? (v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`) : `${(v/1000).toFixed(0)}K`} />
                            <YAxis yAxisId="right" orientation="right" fontSize={10} domain={[0.5, 1.5]} />
                            <Tooltip formatter={(value: number, name: string) => name === 'Продажи' ? (isMoney ? formatMoneyFull(toRubles(value)) : value.toLocaleString() + ' уп.') : value} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="sales" fill={CHART_COLORS.year2026} name="Продажи" />
                            <Line yAxisId="right" dataKey="index" stroke={CHART_COLORS.plan} strokeWidth={2} name="Индекс" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <div className="bg-white rounded-xl border p-8">
                <NoDataMessage title="Нет данных для анализа сезонности" />
                <p className="text-center text-sm text-slate-500 mt-2">
                  Загрузите файл с помесячными данными о продажах
                </p>
              </div>
            )}
          </div>
        )}

        {/* Contragents */}
        {activeTab === 'contragents' && (() => {
          // Расчёт данных по группам контрагентов
          const contragentsWithGroups = filteredData?.contragentSales || topContragents;
          const groupSalesMap = new Map<string, { sales: number; count: number; contragents: any[] }>();
          
          contragentsWithGroups.forEach((c: any) => {
            const group = c.contractorGroup || 'Без группы';
            const existing = groupSalesMap.get(group);
            if (existing) {
              existing.sales += c.sales || 0;
              existing.count += 1;
              existing.contragents.push(c);
            } else {
              groupSalesMap.set(group, { sales: c.sales || 0, count: 1, contragents: [c] });
            }
          });
          
          const groupSalesData = Array.from(groupSalesMap.entries())
            .map(([name, data]) => ({ name, sales: data.sales, count: data.count, contragents: data.contragents }))
            .sort((a, b) => b.sales - a.sales);
          
          const totalGroupSales = groupSalesData.reduce((sum, g) => sum + g.sales, 0);
          const GROUP_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6', '#6366f1', '#f97316', '#94a3b8'];
          
          // Данные для детализации выбранной группы
          const selectedGroupData = selectedContractorGroupForDrilldown 
            ? groupSalesData.find(g => g.name === selectedContractorGroupForDrilldown)
            : null;
          
          // Расчёт продаж по препаратам для выбранной группы
          const drugSalesInGroup = new Map<string, number>();
          const regionSalesInGroup = new Map<string, number>();
          
          if (selectedGroupData && tabData?.groupDrilldown?.[selectedContractorGroupForDrilldown]) {
            const serverDrilldown = tabData.groupDrilldown[selectedContractorGroupForDrilldown];
            (serverDrilldown.drugs || []).forEach((d: any) => drugSalesInGroup.set(d.drug, d.sales));
            (serverDrilldown.regions || []).forEach((r: any) => regionSalesInGroup.set(r.region, r.sales));
          } else {
            const drilldownSource = contragentRows.length > 0 ? contragentRows : rawParsedRows;
            if (selectedGroupData && drilldownSource.length > 0) {
              const groupContragentNames = new Set(selectedGroupData.contragents.map((c: any) => c.name));
              drilldownSource.forEach((row: any) => {
                if (row.contractorGroup === selectedContractorGroupForDrilldown || groupContragentNames.has(row.contragent)) {
                  const drug = row.complexDrugName || row.drug;
                  if (drug) {
                    const amount = row.amount || row.quantity || 0;
                    drugSalesInGroup.set(drug, (drugSalesInGroup.get(drug) || 0) + amount);
                  }
                  const region = row.region || row.city;
                  if (region) {
                    const amount = row.amount || row.quantity || 0;
                    regionSalesInGroup.set(region, (regionSalesInGroup.get(region) || 0) + amount);
                  }
                }
              });
            }
          }
          
          const drugListInGroup = Array.from(drugSalesInGroup.entries())
            .map(([drug, sales]) => ({ drug, sales }))
            .sort((a, b) => b.sales - a.sales);
          
          const regionListInGroup = Array.from(regionSalesInGroup.entries())
            .map(([region, sales]) => ({ region, sales }))
            .sort((a, b) => b.sales - a.sales);
          
          return (
          <div className="p-4">
            <BackButton />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Группы контрагентов</h2>
              {DisplayModeToggle}

            </div>
            
            {hasRealData && contractorGroupsList.length > 0 ? (
              <>
                {/* Основной блок: Группы контрагентов */}
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full" />
                      <Layers size={18} className="text-emerald-500" />
                      Доля рынка по группам контрагентов
                    </h3>
                    <button
                      onClick={() => setShowContragentDetails(!showContragentDetails)}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-cyan-600 hover:to-blue-600 transition-all flex items-center gap-2"
                    >
                      <Filter size={16} />
                      {showContragentDetails ? 'Скрыть фильтры' : 'Фильтры и таблица'}
                    </button>
                  </div>
                  
                  {/* Статистика */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-emerald-50/80 to-green-50/80 backdrop-blur-sm rounded-xl p-3 border border-white/40 shadow-md">
                      <p className="text-xs text-slate-500 font-medium">Групп контрагентов</p>
                      <p className="text-2xl font-bold text-emerald-600">{contractorGroupsList.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50/80 to-cyan-50/80 backdrop-blur-sm rounded-xl p-3 border border-white/40 shadow-md">
                      <p className="text-xs text-slate-500 font-medium">Всего контрагентов</p>
                      <p className="text-2xl font-bold text-blue-600">{topContragents.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50/80 to-yellow-50/80 backdrop-blur-sm rounded-xl p-3 border border-white/40 shadow-md">
                      <p className="text-xs text-slate-500 font-medium">Общие продажи</p>
                      <p className="text-2xl font-bold text-amber-600">{fmtValue(totalGroupSales)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50/80 to-indigo-50/80 backdrop-blur-sm rounded-xl p-3 border border-white/40 shadow-md">
                      <p className="text-xs text-slate-500 font-medium">Средние на группу</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {contractorGroupsList.length > 0 ? fmtValue(Math.round(totalGroupSales / contractorGroupsList.length)) : '0'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Круговая диаграмма БЕЗ ЛЕЙБЛОВ + Легенда справа */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie
                            data={groupSalesData.slice(0, 10)}
                            dataKey="sales"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={110}
                            paddingAngle={2}
                            onClick={(data) => {
                              setSelectedContractorGroupForDrilldown(
                                selectedContractorGroupForDrilldown === data.name ? null : data.name
                              );
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {groupSalesData.slice(0, 10).map((_, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={GROUP_COLORS[index % GROUP_COLORS.length]}
                                stroke={selectedContractorGroupForDrilldown === groupSalesData[index]?.name ? '#1e293b' : 'transparent'}
                                strokeWidth={selectedContractorGroupForDrilldown === groupSalesData[index]?.name ? 3 : 0}
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [isMoney ? formatMoneyFull(toRubles(value)) : value.toLocaleString() + ' упак.', 'Продажи']}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <p className="text-xs text-center text-slate-500 mt-2">Кликните на сегмент для детализации</p>
                    </div>
                    
                    {/* Легенда: список групп */}
                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                      <h4 className="text-sm font-semibold text-slate-600 mb-2 sticky top-0 bg-white pb-2">
                        Группы контрагентов (Топ-15)
                      </h4>
                      {groupSalesData.slice(0, 15).map((g, i) => {
                        const percent = totalGroupSales > 0 ? (g.sales / totalGroupSales) * 100 : 0;
                        const isSelected = selectedContractorGroupForDrilldown === g.name;
                        return (
                          <div 
                            key={i} 
                            onClick={() => setSelectedContractorGroupForDrilldown(isSelected ? null : g.name)}
                            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-slate-800 text-white shadow-lg' 
                                : 'bg-slate-50 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: GROUP_COLORS[i % GROUP_COLORS.length] }}
                              />
                              <span className={`text-sm font-medium truncate max-w-[140px] ${isSelected ? 'text-white' : 'text-slate-700'}`} title={g.name}>
                                {g.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{g.count} орг.</span>
                              <span className={`text-sm font-semibold ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`}>
                                {fmtValue(g.sales)}
                              </span>
                              <span className={`text-xs w-12 text-right ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                {percent.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {/* ДЕТАЛИЗАЦИЯ ВЫБРАННОЙ ГРУППЫ */}
                {selectedContractorGroupForDrilldown && selectedGroupData && (
                  <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-xl border-2 border-emerald-200 p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Building2 size={20} className="text-emerald-600" />
                        Группа: {selectedContractorGroupForDrilldown}
                      </h3>
                      <button
                        onClick={() => setSelectedContractorGroupForDrilldown(null)}
                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    {/* KPI группы */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-white rounded-xl p-3 border shadow-sm">
                        <p className="text-xs text-slate-500">Продажи группы</p>
                        <p className="text-xl font-bold text-emerald-600">{fmtValue(selectedGroupData.sales)}</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 border shadow-sm">
                        <p className="text-xs text-slate-500">Доля рынка</p>
                        <p className="text-xl font-bold text-blue-600">
                          {totalGroupSales > 0 ? ((selectedGroupData.sales / totalGroupSales) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-3 border shadow-sm">
                        <p className="text-xs text-slate-500">Аптек в группе</p>
                        <p className="text-xl font-bold text-amber-600">{selectedGroupData.count}</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 border shadow-sm">
                        <p className="text-xs text-slate-500">Препаратов</p>
                        <p className="text-xl font-bold text-purple-600">{drugListInGroup.length}</p>
                      </div>
                    </div>
                    
                    {/* Препараты и Территории */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                      {/* Препараты */}
                      <div className="bg-white rounded-xl p-4 border shadow-sm">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <Pill size={16} className="text-purple-500" />
                          Продажи по препаратам
                        </h4>
                        {drugListInGroup.length > 0 ? (
                          <div className="max-h-[200px] overflow-y-auto space-y-2">
                            {drugListInGroup.slice(0, 10).map((d, i) => {
                              const drugTotal = drugListInGroup.reduce((s, x) => s + x.sales, 0);
                              const pct = drugTotal > 0 ? (d.sales / drugTotal) * 100 : 0;
                              return (
                                <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                  <span className="text-sm text-slate-700 truncate max-w-[180px]" title={d.drug}>{d.drug}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-700">{fmtValue(d.sales)}</span>
                                    <span className="text-xs text-purple-600 w-12 text-right">{pct.toFixed(1)}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 text-center py-4">Нет данных</p>
                        )}
                      </div>
                      
                      {/* Территории */}
                      <div className="bg-white rounded-xl p-4 border shadow-sm">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <MapIcon size={16} className="text-amber-500" />
                          Продажи по территориям
                        </h4>
                        {regionListInGroup.length > 0 ? (
                          <div className="max-h-[200px] overflow-y-auto space-y-2">
                            {regionListInGroup.slice(0, 10).map((r, i) => {
                              const regTotal = regionListInGroup.reduce((s, x) => s + x.sales, 0);
                              const pct = regTotal > 0 ? (r.sales / regTotal) * 100 : 0;
                              return (
                                <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                  <span className="text-sm text-slate-700 truncate max-w-[180px]" title={r.region}>{r.region}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-700">{fmtValue(r.sales)}</span>
                                    <span className="text-xs text-amber-600 w-12 text-right">{pct.toFixed(1)}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 text-center py-4">Нет данных</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Аптечные сети в группе */}
                    <div className="bg-white rounded-xl p-4 border shadow-sm">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Building2 size={16} className="text-blue-500" />
                        Аптечные сети в группе ({selectedGroupData.count})
                      </h4>
                      <div className="max-h-[200px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="text-left p-2 text-slate-600">#</th>
                              <th className="text-left p-2 text-slate-600">Название</th>
                              <th className="text-left p-2 text-slate-600">Город</th>
                              <th className="text-right p-2 text-slate-600">Продажи</th>
                              <th className="text-right p-2 text-slate-600">Доля</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedGroupData.contragents
                              .sort((a: any, b: any) => (b.sales || 0) - (a.sales || 0))
                              .slice(0, 20)
                              .map((c: any, i: number) => {
                                const pct = selectedGroupData.sales > 0 ? ((c.sales || 0) / selectedGroupData.sales) * 100 : 0;
                                return (
                                  <tr key={i} className="border-b hover:bg-slate-50">
                                    <td className="p-2 text-slate-500">{i + 1}</td>
                                    <td className="p-2 font-medium text-slate-700 truncate max-w-[200px]" title={c.name}>{c.name}</td>
                                    <td className="p-2 text-slate-600">{c.city || c.region || '—'}</td>
                                    <td className="p-2 text-right font-semibold text-slate-700">{fmtValue(c.sales || 0)}</td>
                                    <td className="p-2 text-right">
                                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{pct.toFixed(1)}%</span>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Детализация с фильтрами */}
                {showContragentDetails && (() => {
                  const contragentsWithGroups = filteredData?.contragentSales || topContragents;
                  
                  // Списки для фильтров
                  const citiesList = [...new Set(contragentsWithGroups.map((c: any) => c.city).filter(Boolean))].sort();
                  const regionsListContragents = [...new Set(contragentsWithGroups.map((c: any) => c.region).filter(Boolean))].sort();
                  const federalDistrictsList = [...new Set(contragentsWithGroups.map((c: any) => c.federalDistrict).filter(Boolean))].sort();
                  const districtsList = [...new Set(contragentsWithGroups.map((c: any) => c.district).filter(Boolean))].sort();
                  const cityDistrictsList = [...new Set(contragentsWithGroups.map((c: any) => c.cityDistrict).filter(Boolean))].sort();
                  
                  // Фильтрованные контрагенты
                  const filteredContragents = contragentsWithGroups.filter((c: any) => {
                    const matchesSearch = !contragentSearchQuery || 
                      c.name?.toLowerCase().includes(contragentSearchQuery.toLowerCase()) ||
                      (c.city || '').toLowerCase().includes(contragentSearchQuery.toLowerCase()) ||
                      (c.region || '').toLowerCase().includes(contragentSearchQuery.toLowerCase());
                    const matchesType = selectedReceiverTypes.length === 0 || 
                      selectedReceiverTypes.includes(c.receiverType);
                    const matchesGroup = selectedContractorGroups.length === 0 ||
                      selectedContractorGroups.some((g: string) => (c.contractorGroup || '').includes(g));
                    const matchesCity = selectedContragentCities.length === 0 ||
                      selectedContragentCities.includes(c.city);
                    const matchesRegion = selectedContragentRegions.length === 0 ||
                      selectedContragentRegions.includes(c.region);
                    const matchesFederalDistrict = selectedContragentFederalDistricts.length === 0 ||
                      selectedContragentFederalDistricts.includes(c.federalDistrict);
                    const matchesDistrict = selectedContragentDistricts.length === 0 ||
                      selectedContragentDistricts.includes(c.district);
                    const matchesCityDistrict = selectedContragentCityDistricts.length === 0 ||
                      selectedContragentCityDistricts.includes(c.cityDistrict);
                    return matchesSearch && matchesType && matchesGroup && matchesCity && matchesRegion && matchesFederalDistrict && matchesDistrict && matchesCityDistrict;
                  });
                  
                  const totalSales = filteredContragents.reduce((sum: number, c: any) => sum + (c.sales || 0), 0);
                  
                  // Данные для графика топ-15 отфильтрованных
                  const chartData = filteredContragents.slice(0, 15).map((c: any) => ({
                    name: c.name.length > 20 ? c.name.slice(0, 17) + '...' : c.name,
                    fullName: c.name,
                    sales: c.sales || 0,
                    percent: totalSales > 0 ? ((c.sales || 0) / totalSales) * 100 : 0
                  }));
                  
                  return (
                  <div className="bg-white rounded-xl border p-4 mb-4">
                    <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                      <Database size={18} className="text-blue-500" />
                      Детализация по контрагентам
                      <span className="ml-auto text-sm font-normal text-slate-500">
                        Найдено: {filteredContragents.length} из {contragentsWithGroups.length}
                      </span>
                    </h3>
                    
                    {/* Панель фильтров */}
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 mb-4 border">
                      <div className="flex items-center gap-2 mb-3">
                        <Filter size={16} className="text-cyan-600" />
                        <span className="text-sm font-semibold text-slate-700">Фильтры</span>
                        {(contragentSearchQuery || selectedReceiverTypes.length > 0 || selectedContractorGroups.length > 0 || selectedContragentCities.length > 0 || selectedContragentRegions.length > 0 || selectedContragentFederalDistricts.length > 0 || selectedContragentDistricts.length > 0 || selectedContragentCityDistricts.length > 0) && (
                          <button
                            onClick={() => {
                              setContragentSearchQuery('');
                              setSelectedReceiverTypes([]);
                              setSelectedContractorGroups([]);
                              setSelectedContragentCities([]);
                              setSelectedContragentRegions([]);
                              setSelectedContragentFederalDistricts([]);
                              setSelectedContragentDistricts([]);
                              setSelectedContragentCityDistricts([]);
                              setSelectedDistrictForDrilldown(null);
                            }}
                            className="ml-auto px-3 py-1 text-xs bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1"
                          >
                            <X size={12} /> Сбросить всё
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
                        {/* Поиск по организации */}
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Организация</label>
                          <input
                            type="text"
                            placeholder="Поиск..."
                            value={contragentSearchQuery}
                            onChange={(e) => setContragentSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                          />
                        </div>
                        
                        {/* Федеральный округ */}
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Фед. округ</label>
                          {federalDistrictsList.length > 0 ? (
                            <MultiSelect
                              options={federalDistrictsList.map((fd: string) => ({ value: fd, label: fd }))}
                              selected={selectedContragentFederalDistricts}
                              onChange={setSelectedContragentFederalDistricts}
                              placeholder="Все округа"
                              className="w-full"
                            />
                          ) : (
                            <span className="text-xs text-slate-400">Нет данных</span>
                          )}
                        </div>
                        
                        {/* Субъект федерации */}
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Субъект РФ</label>
                          {regionsListContragents.length > 0 ? (
                            <MultiSelect
                              options={regionsListContragents.map((region: string) => ({ value: region, label: region }))}
                              selected={selectedContragentRegions}
                              onChange={setSelectedContragentRegions}
                              placeholder="Все субъекты"
                              className="w-full"
                            />
                          ) : (
                            <span className="text-xs text-slate-400">Нет данных</span>
                          )}
                        </div>
                        
                        {/* Город */}
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Город</label>
                          {citiesList.length > 0 ? (
                            <MultiSelect
                              options={citiesList.map((city: string) => ({ value: city, label: city }))}
                              selected={selectedContragentCities}
                              onChange={setSelectedContragentCities}
                              placeholder="Все города"
                              className="w-full"
                            />
                          ) : (
                            <span className="text-xs text-slate-400">Нет данных</span>
                          )}
                        </div>
                        
                        {/* Муниципальный район */}
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Муницип. район</label>
                          {districtsList.length > 0 ? (
                            <MultiSelect
                              options={districtsList.map((d: string) => ({ value: d, label: d }))}
                              selected={selectedContragentDistricts}
                              onChange={setSelectedContragentDistricts}
                              placeholder="Все районы"
                              className="w-full"
                            />
                          ) : (
                            <span className="text-xs text-slate-400">Нет данных</span>
                          )}
                        </div>
                        
                        {/* Район города */}
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Район города</label>
                          {cityDistrictsList.length > 0 ? (
                            <MultiSelect
                              options={cityDistrictsList.map((cd: string) => ({ value: cd, label: cd }))}
                              selected={selectedContragentCityDistricts}
                              onChange={setSelectedContragentCityDistricts}
                              placeholder="Все районы"
                              className="w-full"
                            />
                          ) : (
                            <span className="text-xs text-slate-400">Нет данных</span>
                          )}
                        </div>
                        
                        {/* Тип получателя */}
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Тип получателя</label>
                          {receiverTypeSales.length > 0 ? (
                            <MultiSelect
                              options={receiverTypeSales.map(rt => ({ value: rt.name, label: rt.name }))}
                              selected={selectedReceiverTypes}
                              onChange={setSelectedReceiverTypes}
                              placeholder="Все типы"
                              className="w-full"
                            />
                          ) : (
                            <span className="text-xs text-slate-400">Нет данных</span>
                          )}
                        </div>
                        
                        {/* Группа контрагентов */}
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Группа</label>
                          {contractorGroupsList.length > 0 ? (
                            <MultiSelect
                              options={contractorGroupsOptions}
                              selected={selectedContractorGroups}
                              onChange={setSelectedContractorGroups}
                              placeholder="Все группы"
                              className="w-full"
                            />
                          ) : (
                            <span className="text-xs text-slate-400">Нет данных</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* График отфильтрованных данных */}
                    {filteredContragents.length > 0 && (
                      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 mb-4 border">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <BarChart3 size={16} className="text-cyan-600" />
                          Топ-15 отфильтрованных контрагентов
                        </h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={isMoney ? chartData.map((d: any) => ({ ...d, sales: toRubles(d.sales) })) : chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" tickFormatter={(v) => isMoney ? (v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`) : v.toLocaleString()} />
                            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(value: number, name: string) => [isMoney ? formatMoneyFull(value) : value.toLocaleString(), 'Продажи']}
                              labelFormatter={(label: string, payload: any) => payload?.[0]?.payload?.fullName || label}
                            />
                            <Bar dataKey="sales" fill="#06b6d4" radius={[0, 4, 4, 0]}>
                              {chartData.map((_, i) => (
                                <Cell key={i} fill={i < 3 ? '#f59e0b' : '#06b6d4'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    
                    {/* Статистика отфильтрованных */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3 border">
                        <p className="text-xs text-slate-500">Контрагентов</p>
                        <p className="text-xl font-bold text-blue-600">{filteredContragents.length}</p>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 border">
                        <p className="text-xs text-slate-500">Общие продажи</p>
                        <p className="text-xl font-bold text-emerald-600">{fmtValue(totalSales)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border">
                        <p className="text-xs text-slate-500">Средние продажи</p>
                        <p className="text-xl font-bold text-amber-600">
                          {filteredContragents.length > 0 ? fmtValue(Math.round(totalSales / filteredContragents.length)) : '0'}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border">
                        <p className="text-xs text-slate-500">Городов</p>
                        <p className="text-xl font-bold text-purple-600">
                          {new Set(filteredContragents.map((c: any) => c.city).filter(Boolean)).size}
                        </p>
                      </div>
                    </div>
                    
                    {/* Аналитика по районам */}
                    {(() => {
                      const allDistricts = [...districtsList, ...cityDistrictsList];
                      if (allDistricts.length === 0) return null;
                      
                      const districtSalesMap = new Map<string, { sales: number; count: number; type: 'municipal' | 'city'; drugs: Map<string, number> }>();
                      
                      filteredContragents.forEach((c: any) => {
                        if (c.district) {
                          if (!districtSalesMap.has(c.district)) {
                            districtSalesMap.set(c.district, { sales: 0, count: 0, type: 'municipal', drugs: new Map() });
                          }
                          const d = districtSalesMap.get(c.district)!;
                          d.sales += c.sales || 0;
                          d.count += 1;
                        }
                        if (c.cityDistrict) {
                          if (!districtSalesMap.has(c.cityDistrict)) {
                            districtSalesMap.set(c.cityDistrict, { sales: 0, count: 0, type: 'city', drugs: new Map() });
                          }
                          const d = districtSalesMap.get(c.cityDistrict)!;
                          d.sales += c.sales || 0;
                          d.count += 1;
                        }
                      });
                      
                      const districtAnalytics = Array.from(districtSalesMap.entries())
                        .map(([name, data]) => ({
                          name,
                          sales: data.sales,
                          count: data.count,
                          type: data.type,
                          percent: totalSales > 0 ? (data.sales / totalSales) * 100 : 0
                        }))
                        .sort((a, b) => b.sales - a.sales)
                        .slice(0, 15);
                      
                      const districtChartData = districtAnalytics.map(d => ({
                        name: d.name.length > 20 ? d.name.slice(0, 17) + '...' : d.name,
                        fullName: d.name,
                        sales: d.sales,
                        type: d.type
                      }));
                      
                      return (
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 mb-4 border">
                          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <MapIcon size={16} className="text-amber-600" />
                            Аналитика по районам
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              (клик для детализации по препаратам)
                            </span>
                          </h4>
                          
                          {districtChartData.length > 0 && (
                            <ResponsiveContainer width="100%" height={Math.max(200, districtChartData.length * 28)}>
                              <BarChart data={isMoney ? districtChartData.map((d: any) => ({ ...d, sales: toRubles(d.sales) })) : districtChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" tickFormatter={(v) => isMoney ? (v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`) : v.toLocaleString()} />
                                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                                <Tooltip 
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-white p-2 border rounded shadow-lg text-xs">
                                          <p className="font-semibold">{data.fullName}</p>
                                          <p>Продажи: {isMoney ? <MoneySpan value={data.sales} /> : data.sales.toLocaleString()}</p>
                                          <p>Тип: {data.type === 'municipal' ? 'Муницип. район' : 'Район города'}</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar 
                                  dataKey="sales" 
                                  fill="#f59e0b" 
                                  radius={[0, 4, 4, 0]}
                                  onClick={(data) => {
                                    setSelectedDistrictForDrilldown(
                                      selectedDistrictForDrilldown === data.fullName ? null : data.fullName
                                    );
                                  }}
                                  cursor="pointer"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                          
                          {/* Детализация по препаратам для выбранного района */}
                          {selectedDistrictForDrilldown && (() => {
                            const drugSalesInDistrict = new Map<string, number>();
                            
                            if (rawParsedRows && rawParsedRows.length > 0) {
                              rawParsedRows.forEach((row: any) => {
                                const matchesDistrict = row.district === selectedDistrictForDrilldown || 
                                  row.cityDistrict === selectedDistrictForDrilldown;
                                if (matchesDistrict && row.drug) {
                                  const drug = row.complexDrugName || row.drug;
                                  const amount = row.amount || row.quantity || 0;
                                  drugSalesInDistrict.set(drug, (drugSalesInDistrict.get(drug) || 0) + amount);
                                }
                              });
                            }
                            
                            const drugList = Array.from(drugSalesInDistrict.entries())
                              .map(([drug, sales]) => ({ drug, sales }))
                              .sort((a, b) => b.sales - a.sales);
                            
                            const districtTotalSales = drugList.reduce((sum, d) => sum + d.sales, 0);
                            
                            return (
                              <div className="mt-4 bg-white rounded-lg p-3 border">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                                    <Pill size={14} />
                                    Препараты в районе: {selectedDistrictForDrilldown}
                                  </h5>
                                  <button
                                    onClick={() => setSelectedDistrictForDrilldown(null)}
                                    className="text-xs text-slate-500 hover:text-red-500"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                                {drugList.length > 0 ? (
                                  <div className="max-h-48 overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead className="bg-amber-50 sticky top-0">
                                        <tr>
                                          <th className="text-left p-2">#</th>
                                          <th className="text-left p-2">Препарат</th>
                                          <th className="text-right p-2">Количество</th>
                                          <th className="text-right p-2">Доля</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {drugList.map((d, i) => (
                                          <tr key={i} className="border-b hover:bg-amber-50/50">
                                            <td className="p-2 text-slate-500">{i + 1}</td>
                                            <td className="p-2 font-medium">{d.drug}</td>
                                            <td className="p-2 text-right font-semibold">{fmtValue(d.sales)}</td>
                                            <td className="p-2 text-right">
                                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                                                {districtTotalSales > 0 ? ((d.sales / districtTotalSales) * 100).toFixed(1) : 0}%
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 text-center py-4">
                                    Нет данных о препаратах для этого района
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}
                    
                    {/* Таблица с фильтрацией */}
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0">
                          <tr>
                            <th className="text-left p-3 font-semibold text-slate-600">#</th>
                            <th className="text-left p-3 font-semibold text-slate-600">Организация</th>
                            <th className="text-left p-3 font-semibold text-slate-600">ФО</th>
                            <th className="text-left p-3 font-semibold text-slate-600">Субъект РФ</th>
                            <th className="text-left p-3 font-semibold text-slate-600">Муницип. район</th>
                            <th className="text-left p-3 font-semibold text-slate-600">Город</th>
                            <th className="text-left p-3 font-semibold text-slate-600">Район города</th>
                            <th className="text-left p-3 font-semibold text-slate-600">Тип</th>
                            <th className="text-left p-3 font-semibold text-slate-600">Группа</th>
                            <th className="text-right p-3 font-semibold text-slate-600">Продажи</th>
                            <th className="text-right p-3 font-semibold text-slate-600">Доля</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredContragents.map((c: any, i: number) => {
                            const percent = totalSales > 0 ? (c.sales / totalSales) * 100 : 0;
                            return (
                              <tr key={i} className="border-b hover:bg-cyan-50/50 transition-colors">
                                <td className="p-3 text-slate-500">{i + 1}</td>
                                <td className="p-3 font-medium text-slate-700" title={c.name}>{c.name}</td>
                                <td className="p-3">
                                  {c.federalDistrict ? (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{c.federalDistrict}</span>
                                  ) : '—'}
                                </td>
                                <td className="p-3 text-slate-600">{c.region || '—'}</td>
                                <td className="p-3">
                                  {c.district ? (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">{c.district}</span>
                                  ) : '—'}
                                </td>
                                <td className="p-3 text-slate-600">{c.city || '—'}</td>
                                <td className="p-3">
                                  {c.cityDistrict ? (
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">{c.cityDistrict}</span>
                                  ) : '—'}
                                </td>
                                <td className="p-3">
                                  {c.receiverType ? (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">{c.receiverType}</span>
                                  ) : '—'}
                                </td>
                                <td className="p-3">
                                  {c.contractorGroup ? (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">{c.contractorGroup}</span>
                                  ) : '—'}
                                </td>
                                <td className="p-3 text-right font-semibold text-slate-700">{fmtValue(c.sales || 0)}</td>
                                <td className="p-3 text-right">
                                  <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs font-medium">{percent.toFixed(2)}%</span>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredContragents.length === 0 && (
                            <tr>
                              <td colSpan={11} className="p-8 text-center text-slate-400">
                                Нет контрагентов по выбранным фильтрам
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  );
                })()}
                
                {/* По типу получателя */}
                {receiverTypeSales.length > 0 && (
                  <div className="bg-white rounded-xl border p-4">
                    <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Building2 size={18} className="text-purple-500" />
                      По типу получателя
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {receiverTypeSales.map((rt, i) => {
                        const totalSales = receiverTypeSales.reduce((sum, x) => sum + x.sales, 0);
                        const percent = totalSales > 0 ? (rt.sales / totalSales) * 100 : 0;
                        return (
                          <div key={i} className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border hover:shadow-md transition-shadow">
                            <p className="text-sm font-medium text-slate-700 mb-1 truncate" title={rt.name}>{rt.name}</p>
                            <p className="text-lg font-bold text-purple-600">{fmtValue(rt.sales)}</p>
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>{rt.count} контрагентов</span>
                              <span className="text-purple-600 font-medium">{percent.toFixed(2)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
              </>
            ) : (
              <div className="bg-white rounded-xl border p-8">
                <NoDataMessage title="Нет данных о группах контрагентов" />
                <p className="text-center text-sm text-slate-500 mt-2">
                  Загрузите файл МДЛП с данными о контрагентах
                </p>
              </div>
            )}
          </div>
          );
        })()}

        {/* WM Russia Dashboard */}
        {activeTab === 'wm-dashboard' && (
          <div className="p-4">
              <BackButton label="К анализатору" onClick={() => navigateTo('dashboard')} />
              
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#004F9F] mb-1">WM Russia Дашборд</h2>
                  <p className="text-slate-500 text-sm">Аналитика продаж World Medicine на основе данных MDLP</p>
                </div>
                
                <div className="flex gap-2 flex-wrap items-center">
                  {DisplayModeToggle}
  
                  <select 
                    value={wmSelectedYear} 
                    onChange={(e) => setWmSelectedYear(e.target.value)}
                    className="px-3 py-2 border border-blue-300 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium"
                  >
                    <option value="Все">Все года</option>
                    {['2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select 
                    value={wmSelectedMonth} 
                    onChange={(e) => setWmSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-cyan-300 rounded-lg bg-cyan-50 text-cyan-700 text-sm font-medium"
                  >
                    {wmMonths.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              
              {(!tabData?.hasData && !dataLoaded) ? (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <Package className="mx-auto text-slate-300 mb-4" size={64} />
                  <p className="text-slate-500 text-lg mb-2">Нет загруженных данных</p>
                  <p className="text-slate-400 text-sm mb-4">Загрузите файлы MDLP в разделе Анализатора</p>
                  <button 
                    onClick={() => navigateTo('upload')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Перейти к загрузке
                  </button>
                </div>
              ) : (tabData?.hasData || filteredWmData.length > 0) ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
                      <p className="text-blue-100 text-sm">Упак. + Руб.</p>
                      <p className="text-3xl font-bold">{fmtValue(wmStats.totalPackages)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-lg">
                      <p className="text-purple-100 text-sm">Препаратов</p>
                      <p className="text-3xl font-bold">{wmStats.uniqueDrugs}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-4 shadow-lg">
                      <p className="text-emerald-100 text-sm">Регионов</p>
                      <p className="text-3xl font-bold">{wmStats.uniqueRegions}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl p-4 shadow-lg">
                      <p className="text-amber-100 text-sm">Контрагентов</p>
                      <p className="text-3xl font-bold">{wmStats.uniqueContragents.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <Globe size={18} className="text-blue-500" />
                        По федеральным округам
                      </h3>
                      <button 
                        onClick={() => navigateTo('wm-districts')}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Подробнее →
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(wmStats.byDistrict)
                        .sort((a, b) => b[1].packages - a[1].packages)
                        .slice(0, 8)
                        .map(([district, data]) => (
                        <div 
                          key={district} 
                          onClick={() => { setWmSelectedDistrict(district); navigateTo('wm-districts'); }}
                          className="bg-slate-50 rounded-lg p-3 border cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all"
                        >
                          <p className="font-medium text-slate-700 text-sm truncate">{district}</p>
                          <p className="text-2xl font-bold text-blue-600">{fmtValue(data.packages)}</p>
                          <p className="text-xs text-slate-500">{data.regions.size} регионов</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <Package size={18} className="text-purple-500" />
                        Топ препаратов
                      </h3>
                      <button 
                        onClick={() => navigateTo('wm-products')}
                        className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                      >
                        Все препараты →
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {Object.entries(wmStats.byDrug)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 12)
                        .map(([drug, packages]) => {
                        const productInfo = wmProductsList.find(p => drug.toLowerCase().includes(p.name.toLowerCase().split(' ')[0]));
                        return (
                          <div 
                            key={drug} 
                            onClick={() => { setWmSelectedProduct(drug); navigateTo('wm-products'); }}
                            className="bg-slate-50 rounded-lg p-3 border cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition-all"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: productInfo?.color || '#6B7280' }} />
                              <p className="font-medium text-slate-700 text-xs truncate">{drug.slice(0, 20)}</p>
                            </div>
                            <p className="text-lg font-bold text-purple-600">{fmtValue(packages as number)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-blue-700 text-sm">
                      <strong>Источник данных:</strong> Загруженные файлы MDLP ({(tabData?.totalRows || filteredWmData.length || 0).toLocaleString()} записей)
                      {wmSelectedYear !== 'Все' && ` за ${wmSelectedYear} год`}
                      {wmSelectedMonth !== 'Все' && `, ${wmSelectedMonth}`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <Package className="mx-auto text-slate-300 mb-4" size={64} />
                  <p className="text-slate-500 text-lg mb-2">Нет данных за выбранный период</p>
                  <p className="text-slate-400 text-sm">
                    Попробуйте изменить фильтры года или месяца
                  </p>
                </div>
              )}
            </div>
        )}

        {/* WM Russia Districts */}
        {activeTab === 'wm-districts' && (
          <div className="p-4">
            <BackButton label="WM Дашборд" onClick={() => { setWmSelectedDistrict(null); navigateTo('wm-dashboard'); }} />
              
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <span className="cursor-pointer hover:text-blue-600" onClick={() => navigateTo('wm-dashboard')}>WM Дашборд</span>
                    <span>/</span>
                    <span className="text-slate-700">По округам</span>
                    {wmSelectedDistrict && (
                      <>
                        <span>/</span>
                        <span className="text-blue-600">{wmSelectedDistrict}</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-[#004F9F]">
                    {wmSelectedDistrict || 'Аналитика по округам'}
                  </h2>
                </div>
                
                <div className="flex gap-2 flex-wrap items-center">
                  {DisplayModeToggle}
                  {wmSelectedDistrict && (
                    <button 
                      onClick={() => setWmSelectedDistrict(null)}
                      className="px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 text-sm font-medium hover:bg-slate-100"
                    >
                      ✕ Сбросить округ
                    </button>
                  )}
                  <select 
                    value={wmSelectedYear} 
                    onChange={(e) => setWmSelectedYear(e.target.value)}
                    className="px-3 py-2 border border-blue-300 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium"
                  >
                    <option value="Все">Все года</option>
                    {['2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select 
                    value={wmSelectedMonth} 
                    onChange={(e) => setWmSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-cyan-300 rounded-lg bg-cyan-50 text-cyan-700 text-sm font-medium"
                  >
                    {wmMonths.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              
              {wmDistrictStats.filteredData.length > 0 ? (
                <div className="space-y-6">
                  {wmSelectedDistrict ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4">
                          <p className="text-blue-100 text-sm">Упак. + Руб.</p>
                          <p className="text-2xl font-bold">{fmtValue(wmDistrictStats.stats[wmSelectedDistrict]?.packages || 0)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-4">
                          <p className="text-emerald-100 text-sm">Регионов</p>
                          <p className="text-2xl font-bold">{Object.keys(wmDistrictStats.stats[wmSelectedDistrict]?.regions || {}).length}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4">
                          <p className="text-purple-100 text-sm">Препаратов</p>
                          <p className="text-2xl font-bold">{Object.keys(wmDistrictStats.stats[wmSelectedDistrict]?.drugs || {}).length}</p>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl border p-4">
                        <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                          Иерархия территорий
                          <span className="text-xs text-slate-400 font-normal">(кликните для детализации)</span>
                        </h3>
                        <div className="space-y-1">
                          {Object.entries(wmDistrictStats.stats[wmSelectedDistrict]?.regions || {})
                            .sort((a, b) => b[1].packages - a[1].packages)
                            .map(([region, regionData]) => {
                              const isRegionExpanded = wmExpandedRegions.has(region);
                              return (
                                <div key={region} className="border rounded-lg overflow-hidden">
                                  <div className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 transition-colors">
                                    <button
                                      onClick={() => {
                                        const newSet = new Set(wmExpandedRegions);
                                        if (isRegionExpanded) newSet.delete(region);
                                        else newSet.add(region);
                                        setWmExpandedRegions(newSet);
                                      }}
                                      className="flex items-center gap-2 text-left flex-1"
                                    >
                                      <span className={`text-slate-400 transition-transform ${isRegionExpanded ? 'rotate-90' : ''}`}>▶</span>
                                      <span className="font-medium text-slate-700">{region}</span>
                                      <span className="text-xs text-slate-400">({Object.keys(regionData.cities).length} городов)</span>
                                    </button>
                                    <button
                                      onClick={() => setWmShowDrugsFor(wmShowDrugsFor === `region:${region}` ? null : `region:${region}`)}
                                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold hover:bg-blue-200 transition-colors"
                                    >
                                      {fmtValue(regionData.packages)}
                                    </button>
                                  </div>
                                  
                                  {wmShowDrugsFor === `region:${region}` && (
                                    <div className="p-3 bg-purple-50 border-t">
                                      <p className="text-xs font-medium text-purple-700 mb-2">Препараты в {region}:</p>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {Object.entries(regionData.drugs).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([drug, qty]) => (
                                          <div key={drug} className="bg-white p-2 rounded text-xs">
                                            <p className="text-slate-600 truncate">{drug}</p>
                                            <p className="font-bold text-purple-600">{fmtValue(qty)}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {isRegionExpanded && (
                                    <div className="pl-6 border-t bg-white">
                                      {Object.entries(regionData.cities)
                                        .sort((a, b) => b[1].packages - a[1].packages)
                                        .map(([city, cityData]) => {
                                          const cityKey = `${region}:${city}`;
                                          const isCityExpanded = wmExpandedCities.has(cityKey);
                                          const hasDistricts = Object.keys(cityData.districts).length > 0;
                                          return (
                                            <div key={city} className="border-b last:border-b-0">
                                              <div className="flex items-center justify-between p-2 hover:bg-emerald-50 transition-colors">
                                                <button
                                                  onClick={() => {
                                                    if (hasDistricts) {
                                                      const newSet = new Set(wmExpandedCities);
                                                      if (isCityExpanded) newSet.delete(cityKey);
                                                      else newSet.add(cityKey);
                                                      setWmExpandedCities(newSet);
                                                    }
                                                  }}
                                                  className="flex items-center gap-2 text-left flex-1"
                                                  disabled={!hasDistricts}
                                                >
                                                  {hasDistricts ? (
                                                    <span className={`text-slate-400 transition-transform text-xs ${isCityExpanded ? 'rotate-90' : ''}`}>▶</span>
                                                  ) : (
                                                    <span className="text-slate-300 text-xs">○</span>
                                                  )}
                                                  <span className="text-slate-600 text-sm">{city}</span>
                                                  {hasDistricts && <span className="text-xs text-slate-400">({Object.keys(cityData.districts).length} р-нов)</span>}
                                                </button>
                                                <button
                                                  onClick={() => setWmShowDrugsFor(wmShowDrugsFor === `city:${cityKey}` ? null : `city:${cityKey}`)}
                                                  className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold hover:bg-emerald-200"
                                                >
                                                  {fmtValue(cityData.packages)}
                                                </button>
                                              </div>
                                              
                                              {wmShowDrugsFor === `city:${cityKey}` && (
                                                <div className="p-2 bg-purple-50 border-t mx-2 mb-2 rounded">
                                                  <p className="text-xs font-medium text-purple-700 mb-1">Препараты в {city}:</p>
                                                  <div className="flex flex-wrap gap-1">
                                                    {Object.entries(cityData.drugs).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([drug, qty]) => (
                                                      <span key={drug} className="bg-white px-2 py-1 rounded text-xs">
                                                        <span className="text-slate-500">{drug.slice(0, 15)}:</span> <span className="font-bold text-purple-600">{fmtValue(qty)}</span>
                                                      </span>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                              
                                              {isCityExpanded && hasDistricts && (
                                                <div className="pl-6 bg-slate-50">
                                                  {Object.entries(cityData.districts)
                                                    .sort((a, b) => b[1].packages - a[1].packages)
                                                    .map(([dist, distData]) => {
                                                      const distKey = `${cityKey}:${dist}`;
                                                      return (
                                                        <div key={dist}>
                                                          <div className="flex items-center justify-between p-2 border-b last:border-b-0 hover:bg-amber-50">
                                                            <span className="text-slate-500 text-xs flex items-center gap-1">
                                                              <span className="text-slate-300">└</span> {dist}
                                                            </span>
                                                            <button
                                                              onClick={() => setWmShowDrugsFor(wmShowDrugsFor === `dist:${distKey}` ? null : `dist:${distKey}`)}
                                                              className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold hover:bg-amber-200"
                                                            >
                                                              {fmtValue(distData.packages)}
                                                            </button>
                                                          </div>
                                                          {wmShowDrugsFor === `dist:${distKey}` && (
                                                            <div className="p-2 bg-purple-50 border-t mx-2 mb-2 rounded">
                                                              <p className="text-xs font-medium text-purple-700 mb-1">Препараты в {dist}:</p>
                                                              <div className="flex flex-wrap gap-1">
                                                                {Object.entries(distData.drugs).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([drug, qty]) => (
                                                                  <span key={drug} className="bg-white px-2 py-1 rounded text-xs">
                                                                    <span className="text-slate-500">{drug.slice(0, 15)}:</span> <span className="font-bold text-purple-600">{fmtValue(qty)}</span>
                                                                  </span>
                                                                ))}
                                                              </div>
                                                            </div>
                                                          )}
                                                        </div>
                                                      );
                                                    })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl border p-4">
                        <h3 className="font-semibold text-slate-700 mb-4">Все препараты в округе</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(wmDistrictStats.stats[wmSelectedDistrict]?.drugs || {})
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 12)
                            .map(([drug, packages]) => (
                            <div 
                              key={drug} 
                              onClick={() => { setWmSelectedProduct(drug); navigateTo('wm-products'); }}
                              className="p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-purple-50 transition-all"
                            >
                              <p className="text-sm text-slate-700 truncate">{drug}</p>
                              <p className="font-bold text-purple-600">{fmtValue(packages)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(wmDistrictStats.stats)
                        .sort((a, b) => b[1].packages - a[1].packages)
                        .map(([district, data]) => (
                        <div 
                          key={district} 
                          onClick={() => setWmSelectedDistrict(district)}
                          className="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-slate-800">{district}</h3>
                            <span className="text-blue-600">→</span>
                          </div>
                          <p className="text-3xl font-bold text-blue-600 mb-2">{fmtValue(data.packages)}</p>
                          <p className="text-sm text-slate-500">{Object.keys(data.regions).length} регионов · {Object.keys(data.drugs).length} препаратов</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <Globe className="mx-auto text-slate-300 mb-4" size={64} />
                  <p className="text-slate-500">Нет данных для выбранных фильтров</p>
                </div>
              )}
            </div>
        )}

        {/* WM Russia Products */}
        {activeTab === 'wm-products' && (
          <div className="p-4">
            <BackButton label="WM Дашборд" onClick={() => { setWmSelectedProduct(null); navigateTo('wm-dashboard'); }} />
              
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <span className="cursor-pointer hover:text-purple-600" onClick={() => navigateTo('wm-dashboard')}>WM Дашборд</span>
                    <span>/</span>
                    <span className="text-slate-700">По препаратам</span>
                    {wmSelectedProduct && (
                      <>
                        <span>/</span>
                        <span className="text-purple-600 truncate max-w-[200px]">{wmSelectedProduct}</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-[#004F9F]">
                    {wmSelectedProduct ? wmSelectedProduct.slice(0, 40) : 'Аналитика по препаратам'}
                  </h2>
                </div>
                
                <div className="flex gap-2 flex-wrap items-center">
                  {DisplayModeToggle}
                  {wmSelectedProduct && (
                    <button 
                      onClick={() => setWmSelectedProduct(null)}
                      className="px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 text-sm font-medium hover:bg-slate-100"
                    >
                      ✕ Сбросить препарат
                    </button>
                  )}
                  <select 
                    value={wmSelectedYear} 
                    onChange={(e) => setWmSelectedYear(e.target.value)}
                    className="px-3 py-2 border border-blue-300 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium"
                  >
                    <option value="Все">Все года</option>
                    {['2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select 
                    value={wmSelectedMonth} 
                    onChange={(e) => setWmSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-cyan-300 rounded-lg bg-cyan-50 text-cyan-700 text-sm font-medium"
                  >
                    {wmMonths.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              
              {wmProductStats.filteredData.length > 0 ? (
                <div className="space-y-6">
                  {wmSelectedProduct ? (() => {
                    const prodPkgs = wmProductStats.stats[wmSelectedProduct]?.packages || 0;
                    const prodRubles = convertToMoney(prodPkgs, wmSelectedProduct, drugPrices);
                    return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4">
                          <p className="text-purple-100 text-sm">Упаковок</p>
                          <p className="text-2xl font-bold">{prodPkgs.toLocaleString()}</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-4">
                          <p className="text-emerald-100 text-sm">Рубли</p>
                          <p className="text-2xl font-bold"><MoneySpan value={prodRubles} /></p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4">
                          <p className="text-blue-100 text-sm">Округов</p>
                          <p className="text-2xl font-bold">{Object.keys(wmProductStats.stats[wmSelectedProduct]?.districts || {}).length}</p>
                        </div>
                        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-xl p-4">
                          <p className="text-cyan-100 text-sm">Контрагентов</p>
                          <p className="text-2xl font-bold">{wmProductStats.stats[wmSelectedProduct]?.contragents.size || 0}</p>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl border p-4">
                        <h3 className="font-semibold text-slate-700 mb-4">Продажи по округам</h3>
                        <div className="space-y-2">
                          {Object.entries(wmProductStats.stats[wmSelectedProduct]?.districts || {})
                            .sort((a, b) => b[1] - a[1])
                            .map(([district, packages]) => {
                            const distRubles = convertToMoney(packages as number, wmSelectedProduct, drugPrices);
                            return (
                            <div 
                              key={district} 
                              onClick={() => { setWmSelectedDistrict(district); navigateTo('wm-districts'); }}
                              className="flex justify-between items-center p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-blue-50"
                            >
                              <span className="text-slate-700">{district}</span>
                              <div className="flex gap-4">
                                <span className="font-bold text-purple-600">{(packages as number).toLocaleString()} уп.</span>
                                <span className="font-bold text-emerald-600"><MoneySpan value={distRubles} /></span>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    );
                  })() : (() => {
                    const PIE_COLORS_WM = ['#06b6d4','#8b5cf6','#f59e0b','#ef4444','#10b981','#3b82f6','#ec4899','#f97316','#14b8a6','#6366f1','#9ca3af'];
                    const sortedProducts = Object.entries(wmProductStats.stats).sort((a, b) => b[1].packages - a[1].packages);
                    const pkgPieData = sortedProducts.map(([drug, data]) => ({ name: drug, value: data.packages }));
                    const rubPieData = sortedProducts.map(([drug, data]) => {
                      const rub = convertToMoney(data.packages, drug, drugPrices);
                      return { name: drug, value: rub ?? 0 };
                    }).filter(d => d.value > 0);
                    return (
                    <>
                      {sortedProducts.length > 1 && (() => {
                        const totalPkg = pkgPieData.reduce((s, d) => s + d.value, 0);
                        const totalRub2 = rubPieData.reduce((s, d) => s + d.value, 0);
                        return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl">
                            <h3 className="font-semibold text-slate-700 mb-2 text-center flex items-center justify-center gap-2">
                              <div className="w-1.5 h-5 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full" />
                              Доля по упаковкам
                            </h3>
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie data={pkgPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={2} stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
                                  {pkgPieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS_WM[idx % PIE_COLORS_WM.length]} />)}
                                </Pie>
                                <Tooltip 
                                  formatter={(v: number) => v.toLocaleString('ru-RU') + ' уп.'}
                                  contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                                  itemStyle={{ color: '#e2e8f0' }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-1 gap-1 mt-2 max-h-[140px] overflow-y-auto">
                              {pkgPieData.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50/80 transition-colors">
                                  <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: PIE_COLORS_WM[idx % PIE_COLORS_WM.length] }} />
                                  <span className="text-xs text-slate-700 flex-1 min-w-0 leading-tight" title={item.name}>{item.name}</span>
                                  <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{totalPkg > 0 ? ((item.value / totalPkg) * 100).toFixed(1) : '0'}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/30 shadow-xl">
                            <h3 className="font-semibold text-slate-700 mb-2 text-center flex items-center justify-center gap-2">
                              <div className="w-1.5 h-5 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full" />
                              Доля по рублям
                            </h3>
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie data={rubPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={2} stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
                                  {rubPieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS_WM[idx % PIE_COLORS_WM.length]} />)}
                                </Pie>
                                <Tooltip 
                                  formatter={(v: number) => formatMoneyFull(v)}
                                  contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                                  itemStyle={{ color: '#e2e8f0' }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-1 gap-1 mt-2 max-h-[140px] overflow-y-auto">
                              {rubPieData.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50/80 transition-colors">
                                  <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: PIE_COLORS_WM[idx % PIE_COLORS_WM.length] }} />
                                  <span className="text-xs text-slate-700 flex-1 min-w-0 leading-tight" title={item.name}>{item.name}</span>
                                  <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{totalRub2 > 0 ? ((item.value / totalRub2) * 100).toFixed(1) : '0'}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        );
                      })()}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedProducts.map(([drug, data]) => {
                          const drugRubles = convertToMoney(data.packages, drug, drugPrices);
                          return (
                          <div 
                            key={drug} 
                            onClick={() => setWmSelectedProduct(drug)}
                            className="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-lg hover:border-purple-300 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-800 truncate">{drug}</h3>
                                <p className="text-sm text-slate-500">{Object.keys(data.districts).length} округов · {data.contragents.size} контрагентов</p>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <p className="text-lg font-bold text-purple-600">{data.packages.toLocaleString()} уп.</p>
                                <p className="text-sm font-semibold text-emerald-600"><MoneySpan value={drugRubles} /></p>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <Package className="mx-auto text-slate-300 mb-4" size={64} />
                  <p className="text-slate-500">Нет данных для выбранных фильтров</p>
                </div>
              )}
            </div>
        )}

        {/* Калькулятор бюджета */}
        {activeTab === 'calculator' && (() => {
          const targetBudget = calcCurrentBudget * (1 + calcGrowthPercent / 100);
          const totalDrugSum = calcDrugRows.reduce((sum, d) => sum + d.pricePerUnit * d.quantity, 0);
          const remaining = targetBudget - totalDrugSum;
          const completionPercent = targetBudget > 0 ? (totalDrugSum / targetBudget) * 100 : 0;
          
          const updateDrugPrice = (id: string, price: number) => {
            setCalcDrugRows(prev => prev.map(d => d.id === id ? { ...d, pricePerUnit: price } : d));
          };
          const updateDrugQuantity = (id: string, qty: number) => {
            setCalcDrugRows(prev => prev.map(d => d.id === id ? { ...d, quantity: qty } : d));
          };
          const addDrug = () => {
            const newId = String(Date.now());
            setCalcDrugRows(prev => [...prev, { id: newId, name: 'Новый препарат', pricePerUnit: 500, quantity: 0 }]);
          };
          const removeDrug = (id: string) => {
            setCalcDrugRows(prev => prev.filter(d => d.id !== id));
          };
          const autoDistribute = () => {
            if (calcDrugRows.length === 0 || targetBudget <= 0) return;
            const perDrug = Math.floor(targetBudget / calcDrugRows.length);
            setCalcDrugRows(prev => prev.map(d => ({
              ...d,
              quantity: Math.floor(perDrug / d.pricePerUnit)
            })));
          };
          const saveScenario = async () => {
            if (!calcScenarioName.trim() || !currentUser) return;
            try {
              const saved = await api.budgetScenarios.create({
                userId: parseInt(currentUser.id),
                name: calcScenarioName,
                currentBudget: calcCurrentBudget,
                growthPercent: calcGrowthPercent,
                targetBudget,
                drugs: calcDrugRows,
                districtShares: calcDistrictShares
              });
              setCalcScenarios(prev => [...prev, {
                id: String(saved.id),
                name: saved.name,
                date: new Date(saved.createdAt).toLocaleDateString('ru-RU'),
                budget: parseFloat(saved.targetBudget),
                growth: parseFloat(saved.growthPercent),
                drugs: saved.drugs,
                districts: saved.districtShares
              }]);
              setCalcScenarioName('');
            } catch (e) {
              console.error('Ошибка сохранения сценария:', e);
            }
          };
          const loadScenario = (scenario: typeof calcScenarios[0]) => {
            setCalcCurrentBudget(scenario.budget / (1 + scenario.growth / 100));
            setCalcGrowthPercent(scenario.growth);
            setCalcDrugRows(scenario.drugs);
            setCalcDistrictShares(scenario.districts);
          };
          const deleteScenario = async (id: string) => {
            try {
              await api.budgetScenarios.delete(parseInt(id));
              setCalcScenarios(prev => prev.filter(s => s.id !== id));
            } catch (e) {
              console.error('Ошибка удаления сценария:', e);
            }
          };
          
          const dark = calcDarkMode;
          const theme = {
            bg: dark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-slate-100 via-slate-50 to-white',
            card: dark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-300 shadow-xl ring-1 ring-slate-200',
            cardHover: dark ? 'hover:border-cyan-500/50' : 'hover:border-cyan-400 hover:shadow-2xl hover:ring-cyan-200',
            text: dark ? 'text-white' : 'text-slate-900',
            textMuted: dark ? 'text-slate-400' : 'text-slate-600',
            textAccent: dark ? 'text-cyan-400' : 'text-cyan-700',
            input: dark ? 'bg-slate-900/50 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900',
            inputFocus: dark ? 'focus:border-cyan-500' : 'focus:border-cyan-500 focus:ring-cyan-200',
            tableRow: dark ? 'border-white/5 hover:bg-white/5' : 'border-slate-200 hover:bg-cyan-50/50',
            tableHeader: dark ? 'border-white/10' : 'border-slate-300 bg-slate-100',
            glow: dark ? 'blur-xl' : 'blur-none opacity-0',
          };
          
          const addTerritory = () => {
            const newName = `Регион ${Object.keys(calcDistrictShares).length + 1}`;
            setCalcDistrictShares(prev => ({ ...prev, [newName]: 5 }));
          };
          
          const removeTerritory = (name: string) => {
            setCalcDistrictShares(prev => {
              const updated = { ...prev };
              delete updated[name];
              return updated;
            });
          };
          
          const renameTerritory = (oldName: string, newName: string) => {
            if (!newName.trim() || newName === oldName) return;
            setCalcDistrictShares(prev => {
              const entries = Object.entries(prev);
              const updated: Record<string, number> = {};
              entries.forEach(([key, val]) => {
                updated[key === oldName ? newName : key] = val;
              });
              return updated;
            });
          };
          
          return (
            <div className={`min-h-screen ${theme.bg} p-6 transition-colors duration-300`}>
              <BackButton label="WM Дашборд" onClick={() => navigateTo('wm-dashboard')} />
              
              <div className="flex items-center justify-between mb-2">
                <div className={`flex items-center gap-2 text-sm ${theme.textMuted}`}>
                  <span className="cursor-pointer hover:text-cyan-500 transition-colors" onClick={() => navigateTo('wm-dashboard')}>WM Дашборд</span>
                  <span>/</span>
                  <span className={theme.textAccent}>Калькулятор бюджета</span>
                </div>
                <button
                  onClick={() => setCalcDarkMode(!calcDarkMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${dark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                >
                  {dark ? <Sun size={18} /> : <Moon size={18} />}
                  <span className="text-sm">{dark ? 'Светлая' : 'Тёмная'}</span>
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-1 h-12 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full"></div>
                <div>
                  <h2 className={`text-3xl font-light tracking-wide ${theme.text}`}>Калькулятор</h2>
                  <p className={`${theme.textAccent} text-sm tracking-widest uppercase`}>годового бюджета</p>
                </div>
              </div>
              
              {/* Целевой бюджет */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl ${theme.glow} group-hover:blur-2xl transition-all`}></div>
                  <div className={`relative backdrop-blur-xl ${theme.card} border rounded-2xl p-6 ${theme.cardHover} transition-all`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                      <label className={`text-sm ${theme.textMuted} uppercase tracking-wider`}>Текущий бюджет</label>
                    </div>
                    <input
                      type="number"
                      value={calcCurrentBudget}
                      onChange={(e) => setCalcCurrentBudget(Number(e.target.value))}
                      className={`w-full px-4 py-3 ${theme.input} border rounded-xl text-2xl font-light ${theme.inputFocus} focus:ring-1 transition-all`}
                    />
                    <p className={`${theme.textAccent} mt-3 text-lg`}>{(calcCurrentBudget / 1e9).toFixed(2)} <span className={`text-sm ${theme.textMuted}`}>млрд ₽</span></p>
                  </div>
                </div>
                
                <div className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl ${theme.glow} group-hover:blur-2xl transition-all`}></div>
                  <div className={`relative backdrop-blur-xl ${theme.card} border rounded-2xl p-6 ${theme.cardHover} transition-all`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      <label className={`text-sm ${theme.textMuted} uppercase tracking-wider`}>Прирост</label>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="-50"
                        max="100"
                        value={calcGrowthPercent}
                        onChange={(e) => setCalcGrowthPercent(Number(e.target.value))}
                        className={`flex-1 h-2 ${dark ? 'bg-slate-700' : 'bg-slate-200'} rounded-full appearance-none cursor-pointer accent-emerald-500`}
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={calcGrowthPercent}
                          onChange={(e) => setCalcGrowthPercent(Number(e.target.value))}
                          className={`w-20 px-3 py-2 ${theme.input} border rounded-xl text-center text-xl font-light focus:border-emerald-500`}
                        />
                        <span className="text-emerald-500 text-xl">%</span>
                      </div>
                    </div>
                    <div className={`mt-4 h-1 ${dark ? 'bg-slate-700' : 'bg-slate-200'} rounded-full overflow-hidden`}>
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all" style={{ width: `${Math.max(0, Math.min(100, calcGrowthPercent + 50))}%` }}></div>
                    </div>
                  </div>
                </div>
                
                <div className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-2xl ${theme.glow} group-hover:blur-2xl transition-all`}></div>
                  <div className={`relative overflow-hidden backdrop-blur-xl ${dark ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/30' : 'bg-gradient-to-br from-blue-500 to-purple-600'} border rounded-2xl p-6`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-400/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-300 animate-pulse"></div>
                      <p className={`text-sm ${dark ? 'text-blue-300' : 'text-blue-100'} uppercase tracking-wider`}>Целевой бюджет</p>
                    </div>
                    <p className="text-4xl font-light text-white mb-2">{(targetBudget / 1e9).toFixed(2)} <span className={`text-lg ${dark ? 'text-blue-300' : 'text-blue-100'}`}>млрд ₽</span></p>
                    <div className={`flex items-center gap-2 ${dark ? 'text-emerald-400' : 'text-emerald-300'}`}>
                      <TrendingUp size={16} />
                      <span className="text-sm">+{((targetBudget - calcCurrentBudget) / 1e6).toFixed(1)} млн ₽</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Прогресс выполнения */}
              <div className="relative mb-8">
                <div className={`absolute inset-0 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-2xl ${theme.glow}`}></div>
                <div className={`relative backdrop-blur-xl ${theme.card} border rounded-2xl p-6`}>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                        <Target size={20} className="text-white" />
                      </div>
                      <div>
                        <span className={`text-sm ${theme.textMuted} uppercase tracking-wider`}>Распределено</span>
                        <p className={`text-2xl font-light ${theme.text}`}>{totalDrugSum.toLocaleString()} <span className={`text-sm ${theme.textMuted}`}>₽</span></p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-3xl font-light ${completionPercent >= 100 ? 'text-emerald-500' : completionPercent >= 75 ? 'text-blue-500' : 'text-amber-500'}`}>
                        {completionPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className={`w-full ${dark ? 'bg-slate-800' : 'bg-slate-200'} rounded-full h-3 mb-4 overflow-hidden`}>
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${completionPercent >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : completionPercent >= 75 ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'}`}
                      style={{ width: `${Math.min(completionPercent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${remaining >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
                      {remaining >= 0 ? `Осталось: ${remaining.toLocaleString()} ₽` : `Превышение: ${Math.abs(remaining).toLocaleString()} ₽`}
                    </span>
                    <button
                      onClick={autoDistribute}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-lg shadow-violet-500/25"
                    >
                      <Zap size={16} />
                      Авто-распределение
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Таблица препаратов */}
              <div className="relative mb-8">
                <div className={`absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl ${theme.glow}`}></div>
                <div className={`relative backdrop-blur-xl ${theme.card} border rounded-2xl overflow-hidden`}>
                  <div className={`flex justify-between items-center p-5 border-b ${dark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                        <Package size={20} className="text-white" />
                      </div>
                      <h3 className={`text-lg font-light ${theme.text} tracking-wide`}>Препараты</h3>
                    </div>
                    <button
                      onClick={addDrug}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl text-sm hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25"
                    >
                      <Plus size={16} /> Добавить
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`border-b ${theme.tableHeader}`}>
                          <th className={`text-left px-5 py-4 text-xs font-medium ${theme.textMuted} uppercase tracking-wider`}>Препарат</th>
                          <th className={`text-right px-5 py-4 text-xs font-medium ${theme.textMuted} uppercase tracking-wider`}>Цена/уп.</th>
                          <th className={`text-right px-5 py-4 text-xs font-medium ${theme.textMuted} uppercase tracking-wider`}>Количество</th>
                          <th className={`text-right px-5 py-4 text-xs font-medium ${theme.textMuted} uppercase tracking-wider`}>Сумма</th>
                          <th className={`text-right px-5 py-4 text-xs font-medium ${theme.textMuted} uppercase tracking-wider`}>Доля</th>
                          <th className="px-5 py-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {calcDrugRows.map((drug, i) => {
                          const drugSum = drug.pricePerUnit * drug.quantity;
                          const drugShare = totalDrugSum > 0 ? (drugSum / totalDrugSum) * 100 : 0;
                          return (
                            <tr key={drug.id} className={`border-b ${theme.tableRow} transition-colors`}>
                              <td className="px-5 py-4">
                                <input
                                  type="text"
                                  value={drug.name}
                                  onChange={(e) => setCalcDrugRows(prev => prev.map(d => d.id === drug.id ? { ...d, name: e.target.value } : d))}
                                  className={`font-medium ${theme.text} bg-transparent border-0 focus:ring-1 focus:ring-cyan-500 rounded px-2 py-1 w-full`}
                                />
                              </td>
                              <td className="px-5 py-4 text-right">
                                <input
                                  type="number"
                                  value={drug.pricePerUnit}
                                  onChange={(e) => updateDrugPrice(drug.id, Number(e.target.value))}
                                  className={`w-28 text-right ${theme.input} border rounded-lg px-3 py-1.5 focus:border-cyan-500`}
                                />
                              </td>
                              <td className="px-5 py-4 text-right">
                                <input
                                  type="number"
                                  value={drug.quantity}
                                  onChange={(e) => updateDrugQuantity(drug.id, Number(e.target.value))}
                                  className={`w-32 text-right ${theme.input} border rounded-lg px-3 py-1.5 focus:border-cyan-500`}
                                />
                              </td>
                              <td className="px-5 py-4 text-right">
                                <span className={`text-lg font-light ${dark ? 'text-cyan-400' : 'text-cyan-600'}`}>{drugSum.toLocaleString()}</span>
                                <span className={`text-sm ${theme.textMuted} ml-1`}>₽</span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className={`w-16 h-1.5 ${dark ? 'bg-slate-700' : 'bg-slate-200'} rounded-full overflow-hidden`}>
                                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${drugShare}%` }}></div>
                                  </div>
                                  <span className={`text-sm ${theme.textMuted} w-12 text-right`}>{drugShare.toFixed(1)}%</span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <button
                                  onClick={() => removeDrug(drug.id)}
                                  className={`p-2 ${theme.textMuted} hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className={dark ? 'bg-white/5' : 'bg-slate-50'}>
                          <td className={`px-5 py-4 font-medium ${theme.text}`}>Итого</td>
                          <td className={`px-5 py-4 text-right ${theme.textMuted}`}>—</td>
                          <td className={`px-5 py-4 text-right font-medium ${theme.text}`}>
                            {calcDrugRows.reduce((s, d) => s + d.quantity, 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className={`text-xl font-light ${dark ? 'text-cyan-400' : 'text-cyan-600'}`}>{totalDrugSum.toLocaleString()}</span>
                            <span className={`text-sm ${theme.textMuted} ml-1`}>₽</span>
                          </td>
                          <td className={`px-5 py-4 text-right ${theme.textMuted}`}>100%</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Распределение по округам */}
              <div className="relative mb-8">
                <div className={`absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5 rounded-2xl ${theme.glow}`}></div>
                <div className={`relative backdrop-blur-xl ${theme.card} border rounded-2xl p-6`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <MapIcon2 size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className={`text-lg font-light ${theme.text} tracking-wide`}>Территории</h3>
                        <p className={`text-xs ${theme.textMuted}`}>Округа, регионы или города</p>
                      </div>
                    </div>
                    <button
                      onClick={addTerritory}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/25"
                    >
                      <Plus size={16} /> Добавить территорию
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(calcDistrictShares).map(([district, share]) => {
                      const districtBudget = totalDrugSum * (share / 100);
                      const colors = {
                        'ЦФО': 'from-red-500 to-rose-500',
                        'СЗФО': 'from-blue-500 to-indigo-500',
                        'ЮФО': 'from-amber-500 to-orange-500',
                        'СКФО': 'from-emerald-500 to-teal-500',
                        'ПФО': 'from-violet-500 to-purple-500',
                        'УФО': 'from-cyan-500 to-blue-500',
                        'СФО': 'from-fuchsia-500 to-pink-500',
                        'ДФО': 'from-lime-500 to-green-500'
                      };
                      const gradient = colors[district as keyof typeof colors] || 'from-slate-500 to-slate-600';
                      return (
                        <div
                          key={district}
                          className={`relative group transition-all duration-300 ${calcActiveDistrict === district ? 'scale-105' : 'hover:scale-102'}`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-xl ${dark ? 'opacity-20' : 'opacity-15'} group-hover:opacity-30 transition-opacity`}></div>
                          <div className={`relative p-4 rounded-xl border-2 ${calcActiveDistrict === district ? (dark ? 'border-white/30 bg-white/10' : 'border-amber-400 bg-amber-50 shadow-lg') : (dark ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-white shadow-md')} transition-all`}>
                            <div className="flex justify-between items-start mb-2">
                              <input
                                type="text"
                                value={district}
                                onChange={(e) => renameTerritory(district, e.target.value)}
                                onBlur={(e) => renameTerritory(district, e.target.value)}
                                className={`font-medium ${theme.text} bg-transparent border-0 w-full focus:ring-1 focus:ring-amber-500 rounded px-1 -ml-1`}
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); removeTerritory(district); }}
                                className={`p-1 ${theme.textMuted} hover:text-red-500 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-all`}
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <div className="flex items-center gap-1 mb-3">
                              <input
                                type="number"
                                value={share}
                                onChange={(e) => setCalcDistrictShares(prev => ({ ...prev, [district]: Number(e.target.value) }))}
                                className={`w-14 text-right ${theme.input} border rounded px-1 py-0.5 text-sm focus:border-amber-500`}
                              />
                              <span className={`text-xs ${theme.textMuted}`}>%</span>
                            </div>
                            <p className={`text-lg font-light ${dark ? 'text-amber-400' : 'text-amber-700'}`}>{(districtBudget / 1e6).toFixed(1)} <span className={`text-xs ${theme.textMuted}`}>млн ₽</span></p>
                            <div className={`mt-2 h-1.5 ${dark ? 'bg-slate-700' : 'bg-slate-200'} rounded-full overflow-hidden`}>
                              <div className={`h-full bg-gradient-to-r ${gradient}`} style={{ width: `${Math.min(share, 100)}%` }}></div>
                            </div>
                            <button
                              onClick={() => setCalcActiveDistrict(calcActiveDistrict === district ? null : district)}
                              className={`mt-3 w-full text-xs ${dark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'} flex items-center justify-center gap-1 py-1 rounded hover:bg-black/5 transition-all`}
                            >
                              {calcActiveDistrict === district ? 'Скрыть детали' : 'Показать детали'}
                              <ChevronDown size={12} className={calcActiveDistrict === district ? 'rotate-180 transition-transform' : 'transition-transform'} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {calcActiveDistrict && (
                    <div className={`mt-6 p-5 ${dark ? 'bg-slate-800/50 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-xl`}>
                      <h4 className={`font-medium ${theme.text} mb-4 flex items-center gap-2`}>
                        <MapPin size={16} className={dark ? 'text-amber-400' : 'text-amber-600'} />
                        Детализация по {calcActiveDistrict}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className={`border-b ${dark ? 'border-white/10' : 'border-slate-200'}`}>
                              <th className={`text-left py-3 ${theme.textMuted} uppercase tracking-wider text-xs`}>Препарат</th>
                              <th className={`text-right py-3 ${theme.textMuted} uppercase tracking-wider text-xs`}>Упаковок</th>
                              <th className={`text-right py-3 ${theme.textMuted} uppercase tracking-wider text-xs`}>Сумма</th>
                            </tr>
                          </thead>
                          <tbody>
                            {calcDrugRows.map(drug => {
                              const share = calcDistrictShares[calcActiveDistrict] || 0;
                              const districtQty = Math.round(drug.quantity * share / 100);
                              const districtSum = districtQty * drug.pricePerUnit;
                              return (
                                <tr key={drug.id} className={`border-b ${theme.tableRow}`}>
                                  <td className={`py-3 ${theme.text}`}>{drug.name}</td>
                                  <td className={`text-right py-3 ${theme.textMuted}`}>{districtQty.toLocaleString()}</td>
                                  <td className={`text-right py-3 font-medium ${dark ? 'text-amber-400' : 'text-amber-600'}`}>{districtSum.toLocaleString()} ₽</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Сохранение сценариев */}
              <div className="relative">
                <div className={`absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 rounded-2xl ${theme.glow}`}></div>
                <div className={`relative backdrop-blur-xl ${theme.card} border rounded-2xl p-6`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <Layers size={20} className="text-white" />
                    </div>
                    <h3 className={`text-lg font-light ${theme.text} tracking-wide`}>Сценарии</h3>
                  </div>
                  <div className="flex gap-3 mb-6">
                    <input
                      type="text"
                      value={calcScenarioName}
                      onChange={(e) => setCalcScenarioName(e.target.value)}
                      placeholder="Название сценария..."
                      className={`flex-1 px-4 py-3 ${theme.input} border rounded-xl ${dark ? 'placeholder-slate-500' : 'placeholder-slate-400'} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all`}
                    />
                    <button
                      onClick={saveScenario}
                      disabled={!calcScenarioName.trim()}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25"
                    >
                      <Save size={18} /> Сохранить
                    </button>
                  </div>
                  {calcScenarios.length > 0 ? (
                    <div className="space-y-3">
                      {calcScenarios.map(scenario => (
                        <div key={scenario.id} className={`flex items-center justify-between p-4 ${dark ? 'bg-slate-800/50 border-white/5 hover:border-white/10' : 'bg-slate-50 border-slate-200 hover:border-slate-300'} border rounded-xl transition-all group`}>
                          <div>
                            <p className={`font-medium ${theme.text}`}>{scenario.name}</p>
                            <p className={`text-sm ${theme.textMuted} mt-1`}>
                              {scenario.date} <span className={dark ? 'text-slate-600' : 'text-slate-400'}>|</span> {(scenario.budget / 1e9).toFixed(2)} млрд ₽ 
                              <span className="text-emerald-500 ml-2">+{scenario.growth}%</span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => loadScenario(scenario)}
                              className={`px-4 py-2 ${dark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'} rounded-lg text-sm transition-all`}
                            >
                              Загрузить
                            </button>
                            <button
                              onClick={() => deleteScenario(scenario.id)}
                              className={`p-2 ${theme.textMuted} hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${dark ? 'bg-slate-800' : 'bg-slate-100'} flex items-center justify-center`}>
                        <FolderOpen size={24} className={theme.textMuted} />
                      </div>
                      <p className={theme.textMuted}>Нет сохранённых сценариев</p>
                      <p className={`text-sm ${dark ? 'text-slate-600' : 'text-slate-400'} mt-1`}>Создайте первый сценарий выше</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        </>
        )}
      </ErrorBoundary>
      </main>
    </div>
  );
}
