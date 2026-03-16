import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import type { Pool, PoolClient } from 'pg';
import { from as pgCopyFrom } from 'pg-copy-streams';
import { normalizeRegionName, normalizeDrugName } from './utils/normalizeRegion';
import { getCopyClient } from './db';

export interface ParsedRow {
  month?: string;
  year?: number;
  day?: number;
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

export interface ProcessingStatus {
  fileId: string;
  fileName: string;
  status: 'uploading' | 'processing' | 'aggregating' | 'saving' | 'completed' | 'error';
  progress: number;
  totalBytes: number;
  processedBytes: number;
  totalRows: number;
  processedRows: number;
  message: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

const processingJobs: Map<string, ProcessingStatus> = new Map();

const MONTH_MAP: Record<string, string> = {
  'январь': 'Янв', 'февраль': 'Фев', 'март': 'Мар', 'апрель': 'Апр',
  'май': 'Май', 'июнь': 'Июн', 'июль': 'Июл', 'август': 'Авг',
  'сентябрь': 'Сен', 'октябрь': 'Окт', 'ноябрь': 'Ноя', 'декабрь': 'Дек',
  'янв': 'Янв', 'фев': 'Фев', 'мар': 'Мар', 'апр': 'Апр',
  'июн': 'Июн', 'июл': 'Июл', 'авг': 'Авг',
  'сен': 'Сен', 'окт': 'Окт', 'ноя': 'Ноя', 'дек': 'Дек',
  'jan': 'Янв', 'feb': 'Фев', 'mar': 'Мар', 'apr': 'Апр',
  'may': 'Май', 'jun': 'Июн', 'jul': 'Июл', 'aug': 'Авг',
  'sep': 'Сен', 'oct': 'Окт', 'nov': 'Ноя', 'dec': 'Дек',
  '01': 'Янв', '02': 'Фев', '03': 'Мар', '04': 'Апр',
  '05': 'Май', '06': 'Июн', '07': 'Июл', '08': 'Авг',
  '09': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек',
  '1': 'Янв', '2': 'Фев', '3': 'Мар', '4': 'Апр',
  '5': 'Май', '6': 'Июн', '7': 'Июл', '8': 'Авг',
  '9': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек',
};

function normalizeMonth(value: string): string {
  const lower = value.toLowerCase().trim();
  return MONTH_MAP[lower] || MONTH_MAP[value] || value;
}

function extractMonthFromDate(dateStr: string): string | null {
  const isoMatch = dateStr.match(/^\d{4}-(\d{2})-\d{2}/);
  if (isoMatch) return MONTH_MAP[isoMatch[1]] || null;
  const ruMatch = dateStr.match(/^\d{2}\.(\d{2})\.\d{4}/);
  if (ruMatch) return MONTH_MAP[ruMatch[1]] || null;
  return null;
}

function extractYearFromDate(dateStr: string): number | null {
  const isoMatch = dateStr.match(/^(\d{4})-\d{2}-\d{2}/);
  if (isoMatch) return parseInt(isoMatch[1], 10);
  const ruMatch = dateStr.match(/^\d{2}\.\d{2}\.(\d{4})/);
  if (ruMatch) return parseInt(ruMatch[1], 10);
  return null;
}

function extractDayFromDate(dateStr: string): number | null {
  const isoMatch = dateStr.match(/^\d{4}-\d{2}-(\d{2})/);
  if (isoMatch) return parseInt(isoMatch[1], 10);
  const ruMatch = dateStr.match(/^(\d{2})\.\d{2}\.\d{4}/);
  if (ruMatch) return parseInt(ruMatch[1], 10);
  return null;
}

function findColumnKey(headers: string[], patterns: string[]): string | null {
  const lowerHeaders = Object.keys(headers).length > 0 ? headers : [];
  for (const pattern of patterns) {
    const lowerPattern = pattern.toLowerCase();
    for (const header of lowerHeaders) {
      const lowerHeader = header.toLowerCase().trim();
      if (lowerHeader.includes(lowerPattern)) {
        return header;
      }
    }
  }
  return null;
}

interface ColumnMapping {
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

function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    month: findColumnKey(headers, ['месяц', 'month', 'период']) || undefined,
    year: findColumnKey(headers, ['год', 'year']) || undefined,
    documentDate: findColumnKey(headers, ['дата документа', 'дата совершения операции', 'дата операции', 'дата отгрузки', 'дата регистрации', 'дата получения', 'documentdate', 'дата', 'date', 'document_date']) || undefined,
    region: findColumnKey(headers, ['субъект федерации', 'мд: субъект федерации', 'регион', 'region', 'область', 'субъект']) || undefined,
    city: findColumnKey(headers, ['город', 'city', 'мд: город', 'населённый пункт']) || undefined,
    settlement: findColumnKey(headers, ['населенный пункт', 'settlement']) || undefined,
    district: findColumnKey(headers, ['район', 'district', 'муниципальный район']) || undefined,
    contragent: findColumnKey(headers, ['наименование организации', 'контрагент', 'покупатель', 'мд: наименование', 'получатель', 'организация']) || undefined,
    drug: findColumnKey(headers, ['название лп', 'препарат', 'drug', 'товар', 'наименование лп', 'торговое наименование', 'лекарственный препарат', 'мнн']) || undefined,
    complexDrugName: findColumnKey(headers, ['комплексное наименование лп', 'комплексное наименование', 'полное наименование']) || undefined,
    quantity: findColumnKey(headers, ['количество', 'кол-во', 'quantity', 'шт', 'упак', 'кол.во', 'количество упаковок', 'кол-во упак']) || undefined,
    amount: findColumnKey(headers, ['сумма', 'стоимость', 'amount', 'продажи', 'sales', 'выручка', 'цена', 'итого', 'сумма продаж']) || undefined,
    disposalType: findColumnKey(headers, ['наименование типа выбытия', 'тип выбытия (текст)', 'тип выбытия', 'вид выбытия', 'тип операции']) || undefined,
    disposalTypeCode: findColumnKey(headers, ['код выбытия', 'код типа выбытия']) || undefined,
    federalDistrict: findColumnKey(headers, ['федеральный округ', 'фо', 'мд: федеральный округ']) || undefined,
    receiverType: findColumnKey(headers, ['мд: тип', 'тип получателя', 'тип организации']) || undefined,
    contractorGroup: findColumnKey(headers, ['группа контрагентов', 'группа']) || undefined,
    address: findColumnKey(headers, ['мд: адрес', 'адрес', 'address']) || undefined,
  };
  console.log(`[COPY] Маппинг колонок: ${JSON.stringify(Object.fromEntries(Object.entries(mapping).filter(([_, v]) => v)))}`);
  const unmapped = Object.entries(mapping).filter(([_, v]) => !v).map(([k]) => k);
  if (unmapped.length > 0) {
    console.log(`[COPY] Не найдены колонки: ${unmapped.join(', ')}`);
  }
  if (!mapping.documentDate) {
    console.log(`[COPY] ⚠️ Колонка с датой не найдена — понедельный анализ будет недоступен. Для понедельного анализа CSV должен содержать колонку "Дата документа" или "Дата совершения операции".`);
  }
  if (!mapping.amount) {
    console.log(`[COPY] ⚠️ Колонка с суммой не найдена — конвертация в рубли будет через прайс-лист.`);
  }
  console.log(`[COPY] Все заголовки CSV: ${headers.join(' | ')}`);

  const hasDrug = !!mapping.drug || !!mapping.complexDrugName;
  const hasRegion = !!mapping.region;
  const hasAmount = !!mapping.amount || !!mapping.quantity;
  const missingCols: string[] = [];
  if (!hasDrug) missingCols.push('Наименование ЛП');
  if (!hasRegion) missingCols.push('Субъект РФ');
  if (!hasAmount) missingCols.push('Сумма/Количество');
  if (missingCols.length > 0) {
    const msg = `В файле не найдены необходимые колонки: ${missingCols.join(', ')}. Проверьте что это выгрузка из МДЛП. Найденные заголовки: ${headers.slice(0, 15).join(', ')}`;
    console.error(`[COPY] ОШИБКА: ${msg}`);
    throw new Error(msg);
  }

  return mapping;
}

function parseRow(row: Record<string, string>, mapping: ColumnMapping): ParsedRow {
  const result: ParsedRow = {};
  
  if (mapping.documentDate && row[mapping.documentDate]) {
    result.documentDate = row[mapping.documentDate].trim();
  }
  
  if (mapping.month && row[mapping.month]) {
    result.month = normalizeMonth(row[mapping.month]);
  } else if (result.documentDate) {
    const monthFromDate = extractMonthFromDate(result.documentDate);
    if (monthFromDate) result.month = monthFromDate;
  }
  
  if (mapping.year && row[mapping.year]) {
    result.year = parseInt(row[mapping.year], 10) || undefined;
  } else if (result.documentDate) {
    const yearFromDate = extractYearFromDate(result.documentDate);
    if (yearFromDate) result.year = yearFromDate;
  }
  
  if (result.documentDate) {
    const dayFromDate = extractDayFromDate(result.documentDate);
    if (dayFromDate) result.day = dayFromDate;
  }
  
  if (mapping.region && row[mapping.region]) result.region = normalizeRegionName(row[mapping.region]);
  if (mapping.city && row[mapping.city]) result.city = row[mapping.city].trim();
  if (mapping.settlement && row[mapping.settlement]) result.settlement = row[mapping.settlement].trim();
  if (mapping.district && row[mapping.district]) result.district = row[mapping.district].trim();
  if (mapping.contragent && row[mapping.contragent]) result.contragent = row[mapping.contragent].trim();
  if (mapping.drug && row[mapping.drug]) result.drug = normalizeDrugName(row[mapping.drug]);
  if (mapping.complexDrugName && row[mapping.complexDrugName]) {
    result.complexDrugName = normalizeDrugName(row[mapping.complexDrugName]);
    if (result.complexDrugName) {
      result.drug = result.complexDrugName;
    }
  }
  if (mapping.federalDistrict && row[mapping.federalDistrict]) result.federalDistrict = row[mapping.federalDistrict].trim();
  if (mapping.receiverType && row[mapping.receiverType]) result.receiverType = row[mapping.receiverType].trim();
  if (mapping.contractorGroup && row[mapping.contractorGroup]) result.contractorGroup = row[mapping.contractorGroup].trim();
  if (mapping.address && row[mapping.address]) result.address = row[mapping.address].trim();
  if (mapping.disposalType && row[mapping.disposalType]) result.disposalType = row[mapping.disposalType].trim();
  if (mapping.disposalTypeCode && row[mapping.disposalTypeCode]) result.disposalTypeCode = row[mapping.disposalTypeCode].trim();
  
  if (mapping.quantity && row[mapping.quantity]) {
    const qty = row[mapping.quantity].replace(/\s/g, '').replace(',', '.');
    result.quantity = parseFloat(qty) || 0;
  }
  
  if (mapping.amount && row[mapping.amount]) {
    const amt = row[mapping.amount].replace(/\s/g, '').replace(',', '.');
    result.amount = parseFloat(amt) || 0;
  }
  
  return result;
}

export function getProcessingStatus(fileId: string): ProcessingStatus | undefined {
  return processingJobs.get(fileId);
}

export function getAllProcessingJobs(): ProcessingStatus[] {
  return Array.from(processingJobs.values());
}

export function updateProcessingStatus(fileId: string, update: Partial<ProcessingStatus>) {
  const current = processingJobs.get(fileId);
  if (current) {
    processingJobs.set(fileId, { ...current, ...update });
  }
}

function escapeCopyCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function rowToCopyCSVLine(userId: number, uploadId: string, row: ParsedRow): string {
  const fields = [
    userId,
    uploadId,
    row.year ?? null,
    row.month ?? null,
    row.day ?? null,
    row.region ?? null,
    row.city ?? null,
    row.settlement ?? null,
    row.district ?? null,
    row.contragent ?? null,
    row.drug ?? null,
    row.complexDrugName ?? null,
    row.quantity ?? null,
    row.amount ?? null,
    row.disposalType ?? null,
    row.disposalTypeCode ?? null,
    row.federalDistrict ?? null,
    row.receiverType ?? null,
    row.contractorGroup ?? null,
    row.address ?? null,
  ];
  return fields.map(escapeCopyCSV).join(',') + '\n';
}

export async function processCSVFileStreaming(
  filePath: string,
  fileId: string,
  fileName: string,
  fileSize: number,
  pool: Pool,
  userId: number
): Promise<{ totalRows: number; uploadId: string }> {
  const startTime = Date.now();
  let processedRows = 0;
  let processedBytes = 0;
  let headers: string[] = [];
  let mapping: ColumnMapping = {};
  let lastSpeedLog = Date.now();
  let lastSpeedRows = 0;

  processingJobs.set(fileId, {
    fileId,
    fileName,
    status: 'processing',
    progress: 0,
    totalBytes: fileSize,
    processedBytes: 0,
    totalRows: 0,
    processedRows: 0,
    message: 'Начало потоковой обработки файла (COPY)...',
    startedAt: new Date(),
  });

  const memBefore = process.memoryUsage();
  console.log(`[COPY] Начало обработки: ${fileName}, размер: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`[COPY] Память до: RSS=${(memBefore.rss / 1024 / 1024).toFixed(0)}MB, Heap=${(memBefore.heapUsed / 1024 / 1024).toFixed(0)}MB`);

  const fd = fs.openSync(filePath, 'r');
  const headerBuf = Buffer.alloc(4096);
  const bytesRead = fs.readSync(fd, headerBuf, 0, 4096, 0);
  fs.closeSync(fd);
  const firstChunk = headerBuf.slice(0, bytesRead).toString('utf-8');
  const firstLine = firstChunk.split('\n')[0] || '';
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const detectedSeparator = semicolonCount > commaCount ? ';' : ',';
  console.log(`[COPY] Разделитель: "${detectedSeparator}" (;=${semicolonCount}, ,=${commaCount})`);

  const COPY_SQL = `COPY world_medicine.raw_sales_rows (user_id, upload_id, year, month, day, region, city, settlement, district, contragent, drug, complex_drug_name, quantity, amount, disposal_type, disposal_type_code, federal_district, receiver_type, contractor_group, address) FROM STDIN WITH (FORMAT csv, NULL '')`;

  let client: PoolClient | null = null;

  try {
    client = await getCopyClient();
    const copyStream = client.query(pgCopyFrom(COPY_SQL));

    return await new Promise<{ totalRows: number; uploadId: string }>((resolve, reject) => {
      let copyError: Error | null = null;
      let buffer = '';
      const BUFFER_THRESHOLD = 131072;

      const cleanup = (err?: Error) => {
        if (err && !copyError) {
          copyError = err;
          const errMsg = err.message || String(err);
          const lowerMsg = errMsg.toLowerCase();
          let userMsg: string;
          if (lowerMsg.includes('connect') || lowerMsg.includes('econnrefused') || lowerMsg.includes('pool')) {
            userMsg = 'Ошибка сервера при сохранении данных. Попробуйте ещё раз.';
          } else if (errMsg.includes('не найдены необходимые колонки')) {
            userMsg = errMsg;
          } else {
            const shortMsg = errMsg.length > 200 ? errMsg.substring(0, 200) + '...' : errMsg;
            userMsg = `Ошибка обработки файла: ${shortMsg}. Обратитесь к администратору.`;
          }
          updateProcessingStatus(fileId, {
            status: 'error',
            error: userMsg,
            message: userMsg,
          });
          reject(err);
        }
      };

      copyStream.on('error', (err: Error) => {
        console.error(`[COPY] Ошибка COPY stream:`, err.message);
        cleanup(err);
      });

      copyStream.on('finish', () => {
        if (copyError) return;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        const speed = processedRows / (parseFloat(elapsed) || 1);
        const memAfter = process.memoryUsage();
        console.log(`[COPY] ЗАВЕРШЕНО: ${processedRows.toLocaleString()} строк за ${elapsed} сек (${speed.toFixed(0)} строк/сек)`);
        console.log(`[COPY] Скорость: ${(fileSize / 1024 / 1024 / parseFloat(elapsed)).toFixed(1)} MB/сек`);
        console.log(`[COPY] Память после: RSS=${(memAfter.rss / 1024 / 1024).toFixed(0)}MB, Heap=${(memAfter.heapUsed / 1024 / 1024).toFixed(0)}MB`);

        updateProcessingStatus(fileId, {
          status: 'aggregating',
          progress: 96,
          processedRows,
          totalRows: processedRows,
          message: `Финализация и сохранение данных...`,
        });

        resolve({ totalRows: processedRows, uploadId: fileId });
      });

      const fileStream = fs.createReadStream(filePath, {
        encoding: 'utf-8',
        highWaterMark: 256 * 1024,
      });

      fileStream.on('data', (chunk: string) => {
        processedBytes += Buffer.byteLength(chunk, 'utf-8');
        const progress = Math.round((processedBytes / fileSize) * 100);
        if (processedRows % 5000 < 100) {
          updateProcessingStatus(fileId, {
            processedBytes,
            progress: Math.min(progress, 95),
            message: `COPY загрузка: ${processedRows.toLocaleString()} строк (${Math.min(progress, 95)}%)...`,
          });
        }
      });

      const csvStream = fileStream
        .pipe(csvParser({ separator: detectedSeparator }))
        .on('headers', (hdrs: string[]) => {
          headers = hdrs.map(h => h.replace(/^\uFEFF/, '').replace(/^"|"$/g, '').trim());
          mapping = detectColumnMapping(headers);
          console.log(`[COPY] Заголовки: ${headers.length} колонок`);
          console.log(`[COPY] Первые 5 заголовков: ${headers.slice(0, 5).map(h => JSON.stringify(h)).join(', ')}`);
          console.log(`[COPY] documentDate маппинг: ${mapping.documentDate ? JSON.stringify(mapping.documentDate) : 'НЕ НАЙДЕН'}`);
        })
        .on('data', (row: Record<string, string>) => {
          if (copyError) { csvStream.destroy(); return; }
          processedRows++;
          const cleanRow: Record<string, string> = {};
          for (const [key, value] of Object.entries(row)) {
            const cleanKey = key.replace(/^\uFEFF/, '').replace(/^"|"$/g, '').trim();
            cleanRow[cleanKey] = value;
          }
          const parsed = parseRow(cleanRow, mapping);
          if (processedRows <= 3) {
            console.log(`[COPY] Строка ${processedRows} RAW keys:`, Object.keys(cleanRow).slice(0, 5).map(k => JSON.stringify(k)));
            console.log(`[COPY] Строка ${processedRows} Дата=`, JSON.stringify(cleanRow['Дата']), `documentDate=`, JSON.stringify(parsed.documentDate), `day=`, parsed.day);
            console.log(`[COPY] Строка ${processedRows} PARSED: qty=${parsed.quantity}, amt=${parsed.amount}, year=${parsed.year}, month=${parsed.month}, drug=${parsed.drug?.substring(0, 30)}`);
          }
          const line = rowToCopyCSVLine(userId, fileId, parsed);
          buffer += line;

          if (buffer.length >= BUFFER_THRESHOLD) {
            const canContinue = copyStream.write(buffer);
            buffer = '';
            if (!canContinue) {
              csvStream.pause();
              copyStream.once('drain', () => {
                if (!copyError) csvStream.resume();
              });
            }
          }

          if (processedRows % 50000 === 0) {
            const now = Date.now();
            const intervalSec = (now - lastSpeedLog) / 1000;
            const intervalRows = processedRows - lastSpeedRows;
            const speed = intervalSec > 0 ? (intervalRows / intervalSec).toFixed(0) : '∞';
            const totalSpeed = (processedRows / ((now - startTime) / 1000)).toFixed(0);
            const mem = process.memoryUsage();
            console.log(`[COPY] ${processedRows.toLocaleString()} строк | ${speed} строк/сек (текущ) | ${totalSpeed} строк/сек (общ) | RSS=${(mem.rss / 1024 / 1024).toFixed(0)}MB Heap=${(mem.heapUsed / 1024 / 1024).toFixed(0)}MB`);
            lastSpeedLog = now;
            lastSpeedRows = processedRows;
          }

          if (processedRows % 10000 === 0) {
            updateProcessingStatus(fileId, {
              processedRows,
              totalRows: processedRows,
            });
          }
        })
        .on('end', () => {
          if (copyError) return;
          const finishCopy = () => {
            copyStream.end();
          };
          if (buffer.length > 0) {
            const canWrite = copyStream.write(buffer);
            buffer = '';
            if (!canWrite) {
              copyStream.once('drain', finishCopy);
            } else {
              finishCopy();
            }
          } else {
            finishCopy();
          }
        })
        .on('error', (error: Error) => {
          console.error(`[COPY] Ошибка CSV парсинга:`, error);
          try { copyStream.end(); } catch (_) {}
          cleanup(error);
        });

      fileStream.on('error', (error: Error) => {
        console.error(`[COPY] Ошибка чтения файла:`, error);
        try { copyStream.end(); } catch (_) {}
        cleanup(error);
      });
    });
  } catch (err: any) {
    console.error(`[COPY] Критическая ошибка:`, err.message);
    const errMsg = err.message || String(err);
    const lowerMsg = errMsg.toLowerCase();
    let userMsg: string;
    if (lowerMsg.includes('connect') || lowerMsg.includes('econnrefused') || lowerMsg.includes('pool') || lowerMsg.includes('timeout') && lowerMsg.includes('database')) {
      userMsg = 'Ошибка сервера при сохранении данных. Попробуйте ещё раз.';
    } else if (errMsg.includes('не найдены необходимые колонки')) {
      userMsg = errMsg;
    } else {
      const shortMsg = errMsg.length > 200 ? errMsg.substring(0, 200) + '...' : errMsg;
      userMsg = `Ошибка обработки файла: ${shortMsg}. Обратитесь к администратору.`;
    }
    updateProcessingStatus(fileId, {
      status: 'error',
      error: userMsg,
      message: userMsg,
    });
    throw err;
  } finally {
    if (client) client.release();
  }
}

export function cleanupFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[COPY] Удалён временный файл: ${filePath}`);
    }
  } catch (e) {
    console.error(`[COPY] Ошибка удаления файла:`, e);
  }
}

export function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
