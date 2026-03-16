import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import type { Pool } from 'pg';

export interface ParsedRow {
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
  'jan': 'Янв', 'feb': 'Фев', 'mar': 'Мар', 'apr': 'Апр',
  'may': 'Май', 'jun': 'Июн', 'jul': 'Июл', 'aug': 'Авг',
  'sep': 'Сен', 'oct': 'Окт', 'nov': 'Ноя', 'dec': 'Дек',
  '01': 'Янв', '02': 'Фев', '03': 'Мар', '04': 'Апр',
  '05': 'Май', '06': 'Июн', '07': 'Июл', '08': 'Авг',
  '09': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек',
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

function findColumnKey(headers: string[], patterns: string[]): string | null {
  const lowerHeaders = Object.keys(headers).length > 0 ? headers : [];
  for (const header of lowerHeaders) {
    const lowerHeader = header.toLowerCase().trim();
    for (const pattern of patterns) {
      if (lowerHeader.includes(pattern.toLowerCase())) {
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
  return {
    month: findColumnKey(headers, ['месяц', 'month', 'период']) || undefined,
    year: findColumnKey(headers, ['год', 'year']) || undefined,
    documentDate: findColumnKey(headers, ['дата', 'date']) || undefined,
    region: findColumnKey(headers, ['субъект федерации', 'регион', 'region', 'область']) || undefined,
    city: findColumnKey(headers, ['город', 'city']) || undefined,
    settlement: findColumnKey(headers, ['населенный пункт', 'settlement']) || undefined,
    district: findColumnKey(headers, ['район', 'district']) || undefined,
    contragent: findColumnKey(headers, ['наименование организации', 'контрагент', 'покупатель']) || undefined,
    drug: findColumnKey(headers, ['название лп', 'препарат', 'drug', 'товар', 'наименование лп']) || undefined,
    complexDrugName: findColumnKey(headers, ['комплексное наименование лп', 'комплексное наименование']) || undefined,
    quantity: findColumnKey(headers, ['количество', 'quantity', 'шт', 'упак']) || undefined,
    amount: findColumnKey(headers, ['сумма', 'amount', 'продажи', 'sales', 'выручка']) || undefined,
    disposalTypeCode: findColumnKey(headers, ['тип выбытия']) || undefined,
    federalDistrict: findColumnKey(headers, ['федеральный округ', 'фо']) || undefined,
    receiverType: findColumnKey(headers, ['мд: тип', 'тип получателя']) || undefined,
    contractorGroup: findColumnKey(headers, ['группа контрагентов']) || undefined,
    address: findColumnKey(headers, ['мд: адрес', 'адрес']) || undefined,
  };
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
  
  if (mapping.region && row[mapping.region]) result.region = row[mapping.region].trim();
  if (mapping.city && row[mapping.city]) result.city = row[mapping.city].trim();
  if (mapping.settlement && row[mapping.settlement]) result.settlement = row[mapping.settlement].trim();
  if (mapping.district && row[mapping.district]) result.district = row[mapping.district].trim();
  if (mapping.contragent && row[mapping.contragent]) result.contragent = row[mapping.contragent].trim();
  if (mapping.drug && row[mapping.drug]) result.drug = row[mapping.drug].trim();
  if (mapping.complexDrugName && row[mapping.complexDrugName]) result.complexDrugName = row[mapping.complexDrugName].trim();
  if (mapping.federalDistrict && row[mapping.federalDistrict]) result.federalDistrict = row[mapping.federalDistrict].trim();
  if (mapping.receiverType && row[mapping.receiverType]) result.receiverType = row[mapping.receiverType].trim();
  if (mapping.contractorGroup && row[mapping.contractorGroup]) result.contractorGroup = row[mapping.contractorGroup].trim();
  if (mapping.address && row[mapping.address]) result.address = row[mapping.address].trim();
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

export async function processCSVFileStreaming(
  filePath: string,
  fileId: string,
  fileName: string,
  fileSize: number,
  pool: Pool,
  userId: number
): Promise<{ totalRows: number; uploadId: string }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let processedRows = 0;
    let processedBytes = 0;
    let headers: string[] = [];
    let mapping: ColumnMapping = {};
    let batchNumber = 0;
    const BATCH_SIZE = 10000;
    let currentBatch: ParsedRow[] = [];
    let pendingFlush: Promise<void> | null = null;
    
    processingJobs.set(fileId, {
      fileId,
      fileName,
      status: 'processing',
      progress: 0,
      totalBytes: fileSize,
      processedBytes: 0,
      totalRows: 0,
      processedRows: 0,
      message: 'Начало потоковой обработки файла...',
      startedAt: new Date(),
    });
    
    const memBefore = process.memoryUsage();
    console.log(`[File Processor] Начало ПОТОКОВОЙ обработки: ${fileName}, размер: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[File Processor] Память до: RSS=${(memBefore.rss / 1024 / 1024).toFixed(0)}MB, Heap=${(memBefore.heapUsed / 1024 / 1024).toFixed(0)}MB`);
    
    const fd = fs.openSync(filePath, 'r');
    const headerBuf = Buffer.alloc(4096);
    const bytesRead = fs.readSync(fd, headerBuf, 0, 4096, 0);
    fs.closeSync(fd);
    const firstChunk = headerBuf.slice(0, bytesRead).toString('utf-8');
    const firstLine = firstChunk.split('\n')[0] || '';
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const detectedSeparator = semicolonCount > commaCount ? ';' : ',';
    console.log(`[File Processor] Определён разделитель: "${detectedSeparator}" (;=${semicolonCount}, ,=${commaCount})`);
    
    const stream = fs.createReadStream(filePath, {
      encoding: 'utf-8',
      highWaterMark: 64 * 1024,
    });
    
    stream.on('data', (chunk: string) => {
      processedBytes += Buffer.byteLength(chunk, 'utf-8');
      const progress = Math.round((processedBytes / fileSize) * 100);
      updateProcessingStatus(fileId, {
        processedBytes,
        progress: Math.min(progress, 95),
        message: `Потоковая обработка: ${processedRows.toLocaleString()} строк (${Math.min(progress, 95)}%)...`,
      });
    });

    const SUB_BATCH_SIZE = 500;
    const COLUMNS = '(user_id, upload_id, year, month, region, city, settlement, district, contragent, drug, complex_drug_name, quantity, amount, disposal_type, disposal_type_code, federal_district, receiver_type, contractor_group, address)';
    const PARAMS_PER_ROW = 19;

    const insertSubBatch = async (rows: ParsedRow[]) => {
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      for (const row of rows) {
        const indices = Array.from({ length: PARAMS_PER_ROW }, () => `$${paramIndex++}`);
        placeholders.push(`(${indices.join(',')})`);
        values.push(
          userId, fileId,
          row.year || null, row.month || null,
          row.region || null, row.city || null,
          row.settlement || null, row.district || null,
          row.contragent || null, row.drug || null,
          row.complexDrugName || null,
          row.quantity || null, row.amount || null,
          row.disposalType || null, row.disposalTypeCode || null,
          row.federalDistrict || null, row.receiverType || null,
          row.contractorGroup || null, row.address || null
        );
      }

      await pool.query(
        `INSERT INTO world_medicine.raw_sales_rows ${COLUMNS} VALUES ${placeholders.join(',')}`,
        values
      );
    };

    const flushBatch = async () => {
      if (currentBatch.length === 0) return;
      batchNumber++;

      for (let i = 0; i < currentBatch.length; i += SUB_BATCH_SIZE) {
        const subBatch = currentBatch.slice(i, i + SUB_BATCH_SIZE);
        await insertSubBatch(subBatch);
      }

      currentBatch = [];
    };
    
    const csvStream = stream
      .pipe(csvParser({ separator: detectedSeparator }))
      .on('headers', (hdrs: string[]) => {
        headers = hdrs.map(h => h.replace(/^\uFEFF/, '').trim());
        mapping = detectColumnMapping(headers);
        console.log(`[File Processor] Заголовки обнаружены: ${headers.length} колонок`);
      })
      .on('data', (row: Record<string, string>) => {
        processedRows++;
        const parsed = parseRow(row, mapping);
        currentBatch.push(parsed);
        
        if (currentBatch.length >= BATCH_SIZE) {
          csvStream.pause();
          pendingFlush = flushBatch().then(() => {
            csvStream.resume();
          }).catch(reject);
        }
        
        if (processedRows % 100000 === 0) {
          const mem = process.memoryUsage();
          console.log(`[File Processor] ${processedRows.toLocaleString()} строк | RSS=${(mem.rss / 1024 / 1024).toFixed(0)}MB Heap=${(mem.heapUsed / 1024 / 1024).toFixed(0)}MB`);
        }
        if (processedRows % 10000 === 0) {
          updateProcessingStatus(fileId, {
            processedRows,
            totalRows: processedRows,
          });
        }
      })
      .on('end', async () => {
        try {
          if (pendingFlush) await pendingFlush;
          await flushBatch();
          
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          const memAfter = process.memoryUsage();
          console.log(`[File Processor] Завершено: ${processedRows.toLocaleString()} строк за ${elapsed} сек`);
          console.log(`[File Processor] Память после: RSS=${(memAfter.rss / 1024 / 1024).toFixed(0)}MB, Heap=${(memAfter.heapUsed / 1024 / 1024).toFixed(0)}MB`);
          
          updateProcessingStatus(fileId, {
            status: 'aggregating',
            progress: 96,
            processedRows,
            totalRows: processedRows,
            message: `Финализация и сохранение данных...`,
          });
          
          resolve({ totalRows: processedRows, uploadId: fileId });
        } catch (e) {
          reject(e);
        }
      })
      .on('error', (error) => {
        console.error(`[File Processor] Ошибка:`, error);
        updateProcessingStatus(fileId, {
          status: 'error',
          error: error.message,
          message: `Ошибка: ${error.message}`,
        });
        reject(error);
      });
  });
}

export function cleanupFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[File Processor] Удалён временный файл: ${filePath}`);
    }
  } catch (e) {
    console.error(`[File Processor] Ошибка удаления файла:`, e);
  }
}

export function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
