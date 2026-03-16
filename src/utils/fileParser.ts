import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ParsedSalesRow {
  month?: string;
  year?: number;
  documentDate?: string;
  region?: string;
  city?: string;
  settlement?: string;
  district?: string;
  cityDistrict?: string;
  contragent?: string;
  drug?: string;
  complexDrugName?: string;
  quantity?: number;
  amount?: number;
  disposalType?: string;
  disposalTypeCode?: string;
  federalDistrict?: string;
  receiverType?: string;
  contractorGroup?: string;
  address?: string;
}

export const DISPOSAL_TYPES: Record<string, string> = {
  '1': 'Продажа',
  '2': 'Выбытие через дистанционную торговлю',
  '3': 'Медицинское использование',
  '4': 'Отпуск ЛП по документам',
  '5': 'Выбытие по иным причинам',
  '6': 'По причине уничтожения',
  '7': 'Отпуск по льготному рецепту',
  '8': 'Экспорт',
};

export interface ParsedData {
  rows: ParsedSalesRow[];
  columns: string[];
  fileName: string;
  rowCount: number;
}

export interface ColumnMappingConfig {
  month?: string;
  year?: string;
  documentDate?: string;
  region?: string;
  city?: string;
  settlement?: string;
  district?: string;
  contragent?: string;
  drug?: string;
  complexDrugName?: string;
  quantity?: string;
  amount?: string;
  disposalType?: string;
  disposalTypeCode?: string;
  federalDistrict?: string;
  receiverType?: string;
  contractorGroup?: string;
  address?: string;
}

export const SYSTEM_FIELDS: { key: keyof ColumnMappingConfig; label: string }[] = [
  { key: 'drug', label: 'Название препарата' },
  { key: 'quantity', label: 'Количество' },
  { key: 'amount', label: 'Сумма продаж' },
  { key: 'region', label: 'Регион' },
  { key: 'city', label: 'Город' },
  { key: 'district', label: 'Район' },
  { key: 'settlement', label: 'Населенный пункт' },
  { key: 'contragent', label: 'Контрагент' },
  { key: 'month', label: 'Месяц' },
  { key: 'year', label: 'Год' },
  { key: 'documentDate', label: 'Дата документа' },
  { key: 'federalDistrict', label: 'Федеральный округ' },
  { key: 'disposalType', label: 'Тип выбытия' },
  { key: 'disposalTypeCode', label: 'Код типа выбытия' },
  { key: 'receiverType', label: 'Тип получателя' },
  { key: 'contractorGroup', label: 'Группа контрагентов' },
  { key: 'address', label: 'Адрес' },
  { key: 'complexDrugName', label: 'Комплексное наименование ЛП' },
];

const MONTH_MAP: Record<string, string> = {
  'январь': 'Янв', 'февраль': 'Фев', 'март': 'Мар', 'апрель': 'Апр',
  'май': 'Май', 'июнь': 'Июн', 'июль': 'Июл', 'август': 'Авг',
  'сентябрь': 'Сен', 'октябрь': 'Окт', 'ноябрь': 'Ноя', 'декабрь': 'Дек',
  'jan': 'Янв', 'feb': 'Фев', 'mar': 'Мар', 'apr': 'Апр',
  'may': 'Май', 'jun': 'Июн', 'jul': 'Июл', 'aug': 'Авг',
  'sep': 'Сен', 'oct': 'Окт', 'nov': 'Ноя', 'dec': 'Дек',
  '1': 'Янв', '2': 'Фев', '3': 'Мар', '4': 'Апр',
  '5': 'Май', '6': 'Июн', '7': 'Июл', '8': 'Авг',
  '9': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек',
  '01': 'Янв', '02': 'Фев', '03': 'Мар', '04': 'Апр',
  '05': 'Май', '06': 'Июн', '07': 'Июл', '08': 'Авг',
  '09': 'Сен',
};

const MONTH_FULL_NAMES: Record<string, string> = {
  'Янв': 'Январь', 'Фев': 'Февраль', 'Мар': 'Март', 'Апр': 'Апрель',
  'Май': 'Май', 'Июн': 'Июнь', 'Июл': 'Июль', 'Авг': 'Август',
  'Сен': 'Сентябрь', 'Окт': 'Октябрь', 'Ноя': 'Ноябрь', 'Дек': 'Декабрь',
};

function normalizeMonth(value: string): string {
  const lower = value.toLowerCase().trim();
  return MONTH_MAP[lower] || MONTH_MAP[value] || value;
}

function extractMonthFromDate(dateStr: string): string | null {
  const isoMatch = dateStr.match(/^\d{4}-(\d{2})-\d{2}/);
  if (isoMatch) {
    return MONTH_MAP[isoMatch[1]] || null;
  }
  const ruMatch = dateStr.match(/^\d{2}\.(\d{2})\.\d{4}/);
  if (ruMatch) {
    return MONTH_MAP[ruMatch[1]] || null;
  }
  return null;
}

function extractYearFromDate(dateStr: string): number | null {
  const isoMatch = dateStr.match(/^(\d{4})-\d{2}-\d{2}/);
  if (isoMatch) {
    return parseInt(isoMatch[1], 10);
  }
  const ruMatch = dateStr.match(/^\d{2}\.\d{2}\.(\d{4})/);
  if (ruMatch) {
    return parseInt(ruMatch[1], 10);
  }
  return null;
}

function findColumnIndex(headers: string[], patterns: string[]): number {
  const lowerHeaders = headers.map(h => h?.toLowerCase().trim() || '');
  for (const pattern of patterns) {
    const idx = lowerHeaders.findIndex(h => h.includes(pattern.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

function findColumnByName(headers: string[], columnName: string | undefined): number {
  if (!columnName) return -1;
  const lowerHeaders = headers.map(h => h?.toLowerCase().trim() || '');
  const lowerName = columnName.toLowerCase().trim();
  return lowerHeaders.findIndex(h => h === lowerName);
}

function normalizeRow(row: any[], headers: string[], customMapping?: ColumnMappingConfig): ParsedSalesRow {
  // Если есть пользовательский маппинг - используем его
  const useCustom = customMapping && Object.keys(customMapping).length > 0;
  
  const monthIdx = useCustom 
    ? findColumnByName(headers, customMapping?.month) 
    : findColumnIndex(headers, ['месяц', 'month', 'период', 'period']);
  const yearIdx = useCustom 
    ? findColumnByName(headers, customMapping?.year)
    : findColumnIndex(headers, ['год', 'year']);
  const dateIdx = useCustom
    ? findColumnByName(headers, customMapping?.documentDate)
    : findColumnIndex(headers, ['дата', 'date']);
  const regionIdx = useCustom
    ? findColumnByName(headers, customMapping?.region)
    : findColumnIndex(headers, ['субъект федерации', 'регион', 'region', 'область', 'республика']);
  const cityIdx = useCustom
    ? findColumnByName(headers, customMapping?.city)
    : findColumnIndex(headers, ['город', 'city']);
  const settlementIdx = useCustom
    ? findColumnByName(headers, customMapping?.settlement)
    : findColumnIndex(headers, ['населенный пункт', 'населённый пункт', 'нас. пункт', 'settlement', 'село', 'деревня', 'посёлок', 'поселок', 'пгт']);
  const districtIdx = useCustom
    ? findColumnByName(headers, customMapping?.district)
    : findColumnIndex(headers, ['район', 'district', 'муниципальный район', 'р-н', 'мун. район']);
  const contragentIdx = useCustom
    ? findColumnByName(headers, customMapping?.contragent)
    : findColumnIndex(headers, ['наименование организации', 'контрагент', 'contragent', 'покупатель', 'клиент', 'customer', 'организация']);
  const drugIdx = useCustom
    ? findColumnByName(headers, customMapping?.drug)
    : findColumnIndex(headers, ['название лп', 'препарат', 'drug', 'товар', 'product', 'наименование лп', 'лп']);
  const complexDrugIdx = useCustom
    ? findColumnByName(headers, customMapping?.complexDrugName)
    : findColumnIndex(headers, ['комплексное наименование лп', 'комплексное наименование', 'complex drug name']);
  const quantityIdx = useCustom
    ? findColumnByName(headers, customMapping?.quantity)
    : findColumnIndex(headers, ['количество', 'quantity', 'шт', 'упак', 'кол-во']);
  const amountIdx = useCustom
    ? findColumnByName(headers, customMapping?.amount)
    : findColumnIndex(headers, ['сумма', 'amount', 'продажи', 'sales', 'выручка', 'руб']);
  const disposalTypeCodeIdx = useCustom
    ? findColumnByName(headers, customMapping?.disposalTypeCode)
    : findColumnIndex(headers, ['тип выбытия']);
  const disposalTypeIdx = useCustom
    ? findColumnByName(headers, customMapping?.disposalType)
    : findColumnIndex(headers, ['тип выбытия (текст)', 'disposal type', 'выбытие']);
  const federalDistrictIdx = useCustom
    ? findColumnByName(headers, customMapping?.federalDistrict)
    : findColumnIndex(headers, ['федеральный округ', 'фо', 'federal district']);
  const receiverTypeIdx = useCustom
    ? findColumnByName(headers, customMapping?.receiverType)
    : findColumnIndex(headers, ['мд: тип', 'мд: тип получателя', 'тип получателя', 'receiver type', 'тип мд']);
  const contractorGroupIdx = useCustom
    ? findColumnByName(headers, customMapping?.contractorGroup)
    : findColumnIndex(headers, ['группа контрагентов', 'contractor group', 'группа']);
  const addressIdx = useCustom
    ? findColumnByName(headers, customMapping?.address)
    : findColumnIndex(headers, ['мд: адрес', 'адрес', 'address', 'адрес получателя', 'адрес организации']);

  const result: ParsedSalesRow = {};

  if (dateIdx !== -1 && row[dateIdx]) {
    const dateStr = String(row[dateIdx]).trim();
    result.documentDate = dateStr;
  }

  if (monthIdx !== -1 && row[monthIdx]) {
    result.month = normalizeMonth(String(row[monthIdx]));
  } else if (dateIdx !== -1 && row[dateIdx]) {
    const dateStr = String(row[dateIdx]);
    const monthFromDate = extractMonthFromDate(dateStr);
    if (monthFromDate) result.month = monthFromDate;
  }
  
  if (yearIdx !== -1 && row[yearIdx]) {
    result.year = parseInt(String(row[yearIdx]), 10) || undefined;
  } else if (dateIdx !== -1 && row[dateIdx]) {
    const dateStr = String(row[dateIdx]);
    const yearFromDate = extractYearFromDate(dateStr);
    if (yearFromDate) result.year = yearFromDate;
  }
  if (regionIdx !== -1 && row[regionIdx]) {
    result.region = String(row[regionIdx]).trim();
  }
  if (cityIdx !== -1 && row[cityIdx]) {
    result.city = String(row[cityIdx]).trim();
  }
  if (settlementIdx !== -1 && row[settlementIdx]) {
    result.settlement = String(row[settlementIdx]).trim();
  }
  if (districtIdx !== -1 && row[districtIdx]) {
    result.district = String(row[districtIdx]).trim();
  }
  if (contragentIdx !== -1 && row[contragentIdx]) {
    result.contragent = String(row[contragentIdx]).trim();
  }
  if (complexDrugIdx !== -1 && row[complexDrugIdx]) {
    result.complexDrugName = String(row[complexDrugIdx]).trim();
    result.drug = result.complexDrugName;
  } else if (drugIdx !== -1 && row[drugIdx]) {
    result.drug = String(row[drugIdx]).trim();
  }
  if (quantityIdx !== -1 && row[quantityIdx]) {
    const val = String(row[quantityIdx]).replace(/[^\d.-]/g, '');
    result.quantity = parseFloat(val) || undefined;
  }
  if (amountIdx !== -1 && row[amountIdx]) {
    const val = String(row[amountIdx]).replace(/[^\d.-]/g, '');
    result.amount = parseFloat(val) || undefined;
  }
  if (disposalTypeCodeIdx !== -1 && row[disposalTypeCodeIdx]) {
    const code = String(row[disposalTypeCodeIdx]).trim();
    result.disposalTypeCode = code;
    result.disposalType = DISPOSAL_TYPES[code] || String(row[disposalTypeIdx] || code).trim();
  } else if (disposalTypeIdx !== -1 && row[disposalTypeIdx]) {
    result.disposalType = String(row[disposalTypeIdx]).trim();
  }
  if (federalDistrictIdx !== -1 && row[federalDistrictIdx]) {
    result.federalDistrict = String(row[federalDistrictIdx]).trim();
  }
  if (receiverTypeIdx !== -1 && row[receiverTypeIdx]) {
    result.receiverType = String(row[receiverTypeIdx]).trim();
  }
  if (contractorGroupIdx !== -1 && row[contractorGroupIdx]) {
    let groupVal = String(row[contractorGroupIdx]).trim();
    groupVal = groupVal.replace(/^\['|'\]$/g, '').replace(/^"|"$/g, '').trim();
    if (groupVal && groupVal !== '[NULL]' && groupVal !== 'NULL') {
      result.contractorGroup = groupVal;
    }
  }

  if (addressIdx !== -1 && row[addressIdx]) {
    const addressStr = String(row[addressIdx]).trim();
    result.address = addressStr;
    
    // Ищем городские районы с окончаниями: ский/ской/ивский/овский/евский/инский
    // Примеры: Вахитовский район, Ново-Савиновский район, Советский район
    // Regex ищет прилагательные, заканчивающиеся на типичные окончания городских районов
    const cityDistrictMatch = addressStr.match(/\b((?:[А-ЯЁ][а-яё]+-)?[А-ЯЁ][а-яё]+(?:ский|ской|вский|овский|евский|инский))\s+район\b/i);
    if (cityDistrictMatch) {
      const districtName = cityDistrictMatch[0].trim();
      const adjective = cityDistrictMatch[1].toLowerCase();
      
      // Чёрный список слов которые НЕ являются районами городов
      const invalidAdjectives = ['военный', 'трудовой', 'рабочий', 'заводской', 'садовый', 'дачный', 'лесной', 'полевой', 'жилой'];
      const isInvalidAdjective = invalidAdjectives.includes(adjective);
      
      // Проверяем весь адрес на наличие "тер", "тер.", "мкр", "городок" рядом с совпадением (±30 символов)
      const matchIndex = addressStr.toLowerCase().indexOf(districtName.toLowerCase());
      const contextStart = Math.max(0, matchIndex - 30);
      const contextEnd = Math.min(addressStr.length, matchIndex + districtName.length + 30);
      const context = addressStr.substring(contextStart, contextEnd).toLowerCase();
      
      // Если контекст содержит "тер", "тер.", "мкр", "городок" - это НЕ район города
      const hasInvalidContext = /\b(?:тер|тер\.|мкр|мкр\.|пос|дер|сел|городок|территория)\b/.test(context);
      
      // Минимальная длина прилагательного: Советский(9), Кировский(9), Вахитовский(11)
      const isValidLength = adjective.length >= 8;
      
      if (!isInvalidAdjective && !hasInvalidContext && isValidLength) {
        result.cityDistrict = districtName;
      }
    }
  }

  return result;
}

export async function parseFile(file: File, customMapping?: ColumnMappingConfig): Promise<ParsedData> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSV(file, customMapping);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file, customMapping);
  } else if (extension === 'json') {
    return parseJSON(file, customMapping);
  }

  throw new Error(`Неподдерживаемый формат файла: ${extension}`);
}

export async function getFileHeaders(file: File): Promise<string[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        delimiter: '',
        preview: 1,
        complete: (results) => {
          const data = results.data as string[][];
          if (data.length < 1) {
            reject(new Error('Файл пустой'));
            return;
          }
          resolve(data[0].map(h => String(h || '').replace(/^\uFEFF/, '')));
        },
        error: (error: any) => reject(new Error(`Ошибка чтения CSV: ${error.message}`)),
      });
    });
  } else if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    if (data.length < 1) {
      throw new Error('Файл пустой');
    }
    return data[0].map(h => String(h || ''));
  } else if (extension === 'json') {
    const text = await file.text();
    const json = JSON.parse(text);
    let dataArray: any[];
    if (Array.isArray(json)) {
      dataArray = json;
    } else if (json.data && Array.isArray(json.data)) {
      dataArray = json.data;
    } else {
      throw new Error('JSON должен содержать массив данных');
    }
    if (dataArray.length === 0) {
      throw new Error('Файл не содержит данных');
    }
    return Object.keys(dataArray[0]);
  }

  throw new Error(`Неподдерживаемый формат файла: ${extension}`);
}

async function parseCSV(file: File, customMapping?: ColumnMappingConfig): Promise<ParsedData> {
  const fileSizeMB = file.size / 1024 / 1024;
  console.log(`[CSV Parser] Начало обработки файла: ${file.name}, размер: ${fileSizeMB.toFixed(2)} MB`);
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    Papa.parse(file, {
      delimiter: '',
      skipEmptyLines: true,
      worker: true,
      complete: (results) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[CSV Parser] Файл прочитан за ${elapsed} сек, обработка строк...`);
        
        const data = results.data as string[][];
        if (data.length < 2) {
          reject(new Error('Файл пустой или содержит только заголовки'));
          return;
        }

        const headers = data[0].map(h => String(h || '').replace(/^\uFEFF/, ''));
        console.log(`[CSV Parser] Заголовки: ${headers.length} колонок`);
        
        const rows: ParsedSalesRow[] = [];
        const totalRows = data.length - 1;
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row.some(cell => cell && String(cell).trim())) {
            rows.push(normalizeRow(row, headers, customMapping));
          }
          
          if (rows.length % 50000 === 0) {
            console.log(`[CSV Parser] Обработано ${rows.length}/${totalRows} строк`);
          }
        }
        
        const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[CSV Parser] Завершено! ${rows.length} строк за ${totalElapsed} сек`);

        resolve({
          rows,
          columns: headers,
          fileName: file.name,
          rowCount: rows.length,
        });
      },
      error: (error: any) => {
        console.error(`[CSV Parser] Ошибка:`, error);
        reject(new Error(`Ошибка парсинга CSV: ${error.message}`));
      },
    });
  });
}

async function parseExcel(file: File, customMapping?: ColumnMappingConfig): Promise<ParsedData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  if (data.length < 2) {
    throw new Error('Файл пустой или содержит только заголовки');
  }

  const headers = data[0].map(h => String(h || ''));
  const rows = data.slice(1)
    .filter(row => row.some(cell => cell !== undefined && cell !== null && String(cell).trim()))
    .map(row => normalizeRow(row, headers, customMapping));

  return {
    rows,
    columns: headers,
    fileName: file.name,
    rowCount: rows.length,
  };
}

async function parseJSON(file: File, customMapping?: ColumnMappingConfig): Promise<ParsedData> {
  const text = await file.text();
  const json = JSON.parse(text);
  
  let dataArray: any[];
  if (Array.isArray(json)) {
    dataArray = json;
  } else if (json.data && Array.isArray(json.data)) {
    dataArray = json.data;
  } else {
    throw new Error('JSON должен содержать массив данных');
  }

  if (dataArray.length === 0) {
    throw new Error('Файл не содержит данных');
  }

  const headers = Object.keys(dataArray[0]);
  const rows = dataArray.map(item => {
    const row = headers.map(h => item[h]);
    return normalizeRow(row, headers, customMapping);
  });

  return {
    rows,
    columns: headers,
    fileName: file.name,
    rowCount: rows.length,
  };
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
  monthlySales: { month: string; name: string; sales: number; year?: number }[];
  combinedData: { month: string; name: string; [key: string]: any }[];
  contragentSales: { name: string; sales: number; region?: string; city?: string; receiverType?: string; contractorGroup?: string; federalDistrict?: string; district?: string; cityDistrict?: string }[];
  regionSales: { name: string; sales: number }[];
  drugSales: { name: string; sales: number }[];
  disposalTypeSales: { name: string; sales: number; count: number }[];
  federalDistrictSales: { name: string; sales: number }[];
  receiverTypeSales: { name: string; sales: number; count: number }[];
  drugs: string[];
  drugAnalytics: Record<string, DrugAnalytics>;
  territoryHierarchy: TerritoryHierarchy;
  contragentAnalytics: Record<string, ContragentAnalytics>;
  years: string[];
}

export function aggregateData(parsedData: ParsedData): AggregatedData {
  const rows = parsedData.rows;
  const monthOrder = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  const monthlyMap = new Map<string, { month: string; sales: number; year?: number }>();
  const contragentMap = new Map<string, { name: string; sales: number; region?: string; city?: string; receiverType?: string; contractorGroup?: string; federalDistrict?: string; district?: string; cityDistrict?: string }>();
  const regionMap = new Map<string, number>();
  const drugMap = new Map<string, number>();
  const yearMonthMap = new Map<string, Map<string, number>>();
  const disposalTypeMap = new Map<string, { sales: number; count: number }>();
  const federalDistrictMap = new Map<string, number>();
  const receiverTypeMap = new Map<string, { sales: number; count: number }>();
  const allYears = new Set<string>();

  const drugMonthlyMap = new Map<string, Map<string, number>>();
  const drugRegionMap = new Map<string, Map<string, number>>();
  const drugContragentMap = new Map<string, Map<string, number>>();
  const drugYearMap = new Map<string, Map<string, number>>();

  const contragentDrugMap = new Map<string, Map<string, number>>();
  const contragentMonthlyMap = new Map<string, Map<string, number>>();
  const contragentYearMap = new Map<string, Map<string, number>>();
  const contragentInfoMap = new Map<string, { region?: string; city?: string; receiverType?: string; contractorGroup?: string; federalDistrict?: string; district?: string; cityDistrict?: string }>();

  const territoryRegionMap = new Map<string, { sales: number; salesByYear: Map<string, number>; contragents: Set<string>; drugSales: Map<string, number> }>();
  const territoryCityMap = new Map<string, { sales: number; salesByYear: Map<string, number>; contragents: Set<string>; region?: string; drugSales: Map<string, number> }>();
  const territoryDistrictMap = new Map<string, { sales: number; salesByYear: Map<string, number>; contragents: Set<string>; city?: string; region?: string; drugSales: Map<string, number> }>();
  const territoryFOMap = new Map<string, { sales: number; salesByYear: Map<string, number>; contragents: Set<string>; drugSales: Map<string, number> }>();

  for (const row of rows) {
    const amount = row.amount || row.quantity || 0;
    const yearStr = row.year ? String(row.year) : String(new Date().getFullYear());
    allYears.add(yearStr);
    
    if (row.month) {
      const key = row.month;
      const existing = monthlyMap.get(key);
      if (existing) {
        existing.sales += amount;
      } else {
        monthlyMap.set(key, { month: key, sales: amount, year: row.year });
      }

      if (!yearMonthMap.has(yearStr)) {
        yearMonthMap.set(yearStr, new Map());
      }
      const monthMap = yearMonthMap.get(yearStr)!;
      monthMap.set(key, (monthMap.get(key) || 0) + amount);
    }

    if (row.contragent) {
      const existing = contragentMap.get(row.contragent);
      if (existing) {
        existing.sales += amount;
      } else {
        contragentMap.set(row.contragent, {
          name: row.contragent,
          sales: amount,
          region: row.region,
          city: row.city,
          receiverType: row.receiverType,
          contractorGroup: row.contractorGroup,
          federalDistrict: row.federalDistrict,
          district: row.district,
          cityDistrict: row.cityDistrict,
        });
      }

      if (!contragentInfoMap.has(row.contragent)) {
        contragentInfoMap.set(row.contragent, { region: row.region, city: row.city, receiverType: row.receiverType, contractorGroup: row.contractorGroup, federalDistrict: row.federalDistrict, district: row.district, cityDistrict: row.cityDistrict });
      }

      if (row.drug) {
        if (!contragentDrugMap.has(row.contragent)) contragentDrugMap.set(row.contragent, new Map());
        const drugM = contragentDrugMap.get(row.contragent)!;
        drugM.set(row.drug, (drugM.get(row.drug) || 0) + amount);
      }
      if (row.month) {
        if (!contragentMonthlyMap.has(row.contragent)) contragentMonthlyMap.set(row.contragent, new Map());
        const monthM = contragentMonthlyMap.get(row.contragent)!;
        monthM.set(row.month, (monthM.get(row.month) || 0) + amount);
      }
      if (!contragentYearMap.has(row.contragent)) contragentYearMap.set(row.contragent, new Map());
      const yearM = contragentYearMap.get(row.contragent)!;
      yearM.set(yearStr, (yearM.get(yearStr) || 0) + amount);
    }

    if (row.region) {
      regionMap.set(row.region, (regionMap.get(row.region) || 0) + amount);
      
      if (!territoryRegionMap.has(row.region)) {
        territoryRegionMap.set(row.region, { sales: 0, salesByYear: new Map(), contragents: new Set(), drugSales: new Map() });
      }
      const tr = territoryRegionMap.get(row.region)!;
      tr.sales += amount;
      tr.salesByYear.set(yearStr, (tr.salesByYear.get(yearStr) || 0) + amount);
      if (row.contragent) tr.contragents.add(row.contragent);
      if (row.drug) tr.drugSales.set(row.drug, (tr.drugSales.get(row.drug) || 0) + amount);
    }

    if (row.city) {
      if (!territoryCityMap.has(row.city)) {
        territoryCityMap.set(row.city, { sales: 0, salesByYear: new Map(), contragents: new Set(), region: row.region, drugSales: new Map() });
      }
      const tc = territoryCityMap.get(row.city)!;
      tc.sales += amount;
      tc.salesByYear.set(yearStr, (tc.salesByYear.get(yearStr) || 0) + amount);
      if (row.contragent) tc.contragents.add(row.contragent);
      if (row.drug) tc.drugSales.set(row.drug, (tc.drugSales.get(row.drug) || 0) + amount);
    }

    if (row.district || row.settlement) {
      const districtKey = row.district || row.settlement || '';
      if (!territoryDistrictMap.has(districtKey)) {
        territoryDistrictMap.set(districtKey, { sales: 0, salesByYear: new Map(), contragents: new Set(), city: row.city, region: row.region, drugSales: new Map() });
      }
      const td = territoryDistrictMap.get(districtKey)!;
      td.sales += amount;
      td.salesByYear.set(yearStr, (td.salesByYear.get(yearStr) || 0) + amount);
      if (row.contragent) td.contragents.add(row.contragent);
      if (row.drug) td.drugSales.set(row.drug, (td.drugSales.get(row.drug) || 0) + amount);
    }

    if (row.federalDistrict) {
      federalDistrictMap.set(row.federalDistrict, (federalDistrictMap.get(row.federalDistrict) || 0) + amount);
      
      if (!territoryFOMap.has(row.federalDistrict)) {
        territoryFOMap.set(row.federalDistrict, { sales: 0, salesByYear: new Map(), contragents: new Set(), drugSales: new Map() });
      }
      const tfo = territoryFOMap.get(row.federalDistrict)!;
      tfo.sales += amount;
      tfo.salesByYear.set(yearStr, (tfo.salesByYear.get(yearStr) || 0) + amount);
      if (row.contragent) tfo.contragents.add(row.contragent);
      if (row.drug) tfo.drugSales.set(row.drug, (tfo.drugSales.get(row.drug) || 0) + amount);
    }

    if (row.drug) {
      drugMap.set(row.drug, (drugMap.get(row.drug) || 0) + amount);
      
      if (row.month) {
        if (!drugMonthlyMap.has(row.drug)) drugMonthlyMap.set(row.drug, new Map());
        const dm = drugMonthlyMap.get(row.drug)!;
        dm.set(row.month, (dm.get(row.month) || 0) + amount);
      }
      if (row.region) {
        if (!drugRegionMap.has(row.drug)) drugRegionMap.set(row.drug, new Map());
        const dr = drugRegionMap.get(row.drug)!;
        dr.set(row.region, (dr.get(row.region) || 0) + amount);
      }
      if (row.contragent) {
        if (!drugContragentMap.has(row.drug)) drugContragentMap.set(row.drug, new Map());
        const dc = drugContragentMap.get(row.drug)!;
        dc.set(row.contragent, (dc.get(row.contragent) || 0) + amount);
      }
      if (!drugYearMap.has(row.drug)) drugYearMap.set(row.drug, new Map());
      const dy = drugYearMap.get(row.drug)!;
      dy.set(yearStr, (dy.get(yearStr) || 0) + amount);
    }

    if (row.disposalType) {
      const existing = disposalTypeMap.get(row.disposalType);
      if (existing) {
        existing.sales += amount;
        existing.count += 1;
      } else {
        disposalTypeMap.set(row.disposalType, { sales: amount, count: 1 });
      }
    }

    if (row.receiverType) {
      const existing = receiverTypeMap.get(row.receiverType);
      if (existing) {
        existing.sales += amount;
        existing.count += 1;
      } else {
        receiverTypeMap.set(row.receiverType, { sales: amount, count: 1 });
      }
    }
  }

  const monthlySales = Array.from(monthlyMap.values())
    .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month))
    .map(m => ({ ...m, name: MONTH_FULL_NAMES[m.month] || m.month }));

  const years = Array.from(allYears).sort();
  let combinedData: any[];
  
  if (yearMonthMap.size > 0) {
    combinedData = monthOrder.map(month => {
      const result: any = { month, name: MONTH_FULL_NAMES[month] || month };
      for (const year of years) {
        const monthMap = yearMonthMap.get(year);
        result[year] = monthMap?.get(month) || 0;
      }
      const lastYear = years[years.length - 1];
      const lastYearValue = result[lastYear] || 0;
      result[`forecast${parseInt(lastYear) + 1}`] = Math.round(lastYearValue * 1.15);
      return result;
    });
  } else {
    const currentYear = new Date().getFullYear().toString();
    combinedData = monthlySales.map(m => ({
      month: m.month,
      name: m.name,
      [currentYear]: m.sales,
      [`forecast${parseInt(currentYear) + 1}`]: Math.round(m.sales * 1.15),
    }));
  }

  const contragentSales = Array.from(contragentMap.values())
    .sort((a, b) => b.sales - a.sales);

  const regionSales = Array.from(regionMap.entries())
    .map(([name, sales]) => ({ name, sales }))
    .sort((a, b) => b.sales - a.sales);

  const drugSales = Array.from(drugMap.entries())
    .map(([name, sales]) => ({ name, sales }))
    .sort((a, b) => b.sales - a.sales);

  const disposalTypeSales = Array.from(disposalTypeMap.entries())
    .map(([name, data]) => ({ name, sales: data.sales, count: data.count }))
    .sort((a, b) => b.sales - a.sales);

  const federalDistrictSales = Array.from(federalDistrictMap.entries())
    .map(([name, sales]) => ({ name, sales }))
    .sort((a, b) => b.sales - a.sales);

  const receiverTypeSales = Array.from(receiverTypeMap.entries())
    .map(([name, data]) => ({ name, sales: data.sales, count: data.count }))
    .sort((a, b) => b.sales - a.sales);

  const drugs = Array.from(drugMap.keys()).sort();

  const drugAnalytics: Record<string, DrugAnalytics> = {};
  for (const drug of drugs) {
    const monthlyData = drugMonthlyMap.get(drug) || new Map();
    const regionData = drugRegionMap.get(drug) || new Map();
    const contragentData = drugContragentMap.get(drug) || new Map();
    const yearData = drugYearMap.get(drug) || new Map();

    drugAnalytics[drug] = {
      name: drug,
      totalSales: drugMap.get(drug) || 0,
      monthlySales: monthOrder
        .filter(m => monthlyData.has(m))
        .map(m => ({ month: m, name: MONTH_FULL_NAMES[m] || m, sales: monthlyData.get(m) || 0 })),
      regionSales: Array.from(regionData.entries())
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales),
      contragentSales: Array.from(contragentData.entries())
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 20),
      yearSales: Object.fromEntries(yearData),
    };
  }

  const contragentAnalytics: Record<string, ContragentAnalytics> = {};
  for (const [name, info] of contragentInfoMap) {
    const drugData = contragentDrugMap.get(name) || new Map();
    const monthlyData = contragentMonthlyMap.get(name) || new Map();
    const yearData = contragentYearMap.get(name) || new Map();
    const totalSales = contragentMap.get(name)?.sales || 0;

    contragentAnalytics[name] = {
      name,
      totalSales,
      region: info.region,
      city: info.city,
      receiverType: info.receiverType,
      drugSales: Array.from(drugData.entries())
        .map(([n, sales]) => ({ name: n, sales }))
        .sort((a, b) => b.sales - a.sales),
      monthlySales: monthOrder
        .filter(m => monthlyData.has(m))
        .map(m => ({ month: m, sales: monthlyData.get(m) || 0 })),
      yearSales: Object.fromEntries(yearData),
    };
  }

  const createTerritoryNode = (
    name: string, 
    data: { sales: number; salesByYear: Map<string, number>; contragents: Set<string>; drugSales: Map<string, number> },
    opts?: { region?: string; city?: string }
  ): TerritoryNode => ({
    name,
    sales: data.sales,
    salesByYear: Object.fromEntries(data.salesByYear),
    children: {},
    contragentCount: data.contragents.size,
    drugSales: Array.from(data.drugSales.entries())
      .map(([n, s]) => ({ name: n, sales: s }))
      .sort((a, b) => b.sales - a.sales),
    region: opts?.region,
    city: opts?.city,
  });

  const territoryHierarchy: TerritoryHierarchy = {
    federalDistricts: {},
    regions: {},
    cities: {},
    districts: {},
  };

  for (const [name, data] of territoryFOMap) {
    territoryHierarchy.federalDistricts[name] = createTerritoryNode(name, data);
  }
  for (const [name, data] of territoryRegionMap) {
    territoryHierarchy.regions[name] = createTerritoryNode(name, data);
  }
  for (const [name, data] of territoryCityMap) {
    const node = createTerritoryNode(name, data, { region: data.region });
    territoryHierarchy.cities[name] = node;
    if (data.region && territoryHierarchy.regions[data.region]) {
      territoryHierarchy.regions[data.region].children[name] = node;
    }
  }
  for (const [name, data] of territoryDistrictMap) {
    const node = createTerritoryNode(name, data, { region: data.region, city: data.city });
    territoryHierarchy.districts[name] = node;
    if (data.city && territoryHierarchy.cities[data.city]) {
      territoryHierarchy.cities[data.city].children[name] = node;
    }
  }

  return {
    monthlySales,
    combinedData: combinedData.filter(d => Object.keys(d).length > 2),
    contragentSales,
    regionSales,
    drugSales,
    disposalTypeSales,
    federalDistrictSales,
    receiverTypeSales,
    drugs,
    drugAnalytics,
    territoryHierarchy,
    contragentAnalytics,
    years,
  };
}
