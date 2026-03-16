import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, X, Check, AlertCircle, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { MedRepData, WMFederalDistrict, WM_FEDERAL_DISTRICTS, WM_PRODUCTS } from '@/types';
import { api } from '@/lib/api';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface WMRussiaFileUploaderProps {
  onDataLoaded: (data: MedRepData[], district: WMFederalDistrict, month: number, year: number) => void;
  userId?: string;
}

interface UploadHistoryItem {
  id: string;
  fileName: string;
  district: WMFederalDistrict;
  month: number;
  year: number;
  rowCount: number;
  timestamp: number;
}

interface ParsedRow {
  [key: string]: string | number | undefined;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const MONTHS = [
  { value: 1, label: 'Январь' },
  { value: 2, label: 'Февраль' },
  { value: 3, label: 'Март' },
  { value: 4, label: 'Апрель' },
  { value: 5, label: 'Май' },
  { value: 6, label: 'Июнь' },
  { value: 7, label: 'Июль' },
  { value: 8, label: 'Август' },
  { value: 9, label: 'Сентябрь' },
  { value: 10, label: 'Октябрь' },
  { value: 11, label: 'Ноябрь' },
  { value: 12, label: 'Декабрь' },
];

const YEARS = [2024, 2025, 2026];

const REQUIRED_COLUMNS = ['name', 'territory', 'имя', 'территория', 'медпредставитель'];

export function WMRussiaFileUploader({ onDataLoaded, userId }: WMRussiaFileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [district, setDistrict] = useState<WMFederalDistrict | ''>('');
  const [month, setMonth] = useState<number | ''>('');
  const [year, setYear] = useState<number | ''>('');
  const [previewData, setPreviewData] = useState<ParsedRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [parsedMedRepData, setParsedMedRepData] = useState<MedRepData[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadHistory = async () => {
      if (!userId) return;
      try {
        const uploads = await api.uploads.getByUser(userId);
        const historyItems: UploadHistoryItem[] = uploads.map(u => ({
          id: u.id.toString(),
          fileName: u.filename,
          district: 'ПФО' as WMFederalDistrict,
          month: 1,
          year: 2025,
          rowCount: u.rowsCount || 0,
          timestamp: new Date(u.uploadedAt).getTime(),
        }));
        setUploadHistory(historyItems.slice(0, 10));
      } catch {
        setUploadHistory([]);
      }
    };
    loadHistory();
  }, [userId]);

  const saveHistory = async (history: UploadHistoryItem[]) => {
    setUploadHistory(history.slice(0, 10));
    if (!userId) return;
    const lastItem = history[0];
    if (lastItem) {
      try {
        await api.uploads.create({
          userId: parseInt(userId),
          filename: lastItem.fileName,
          status: 'success',
          rowsCount: lastItem.rowCount,
        });
      } catch (e) {
        console.error('Failed to save upload history:', e);
      }
    }
  };

  const validateFileStructure = (cols: string[], rows: ParsedRow[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const lowerCols = cols.map(c => c.toLowerCase());

    const hasNameColumn = REQUIRED_COLUMNS.some(req => 
      lowerCols.some(col => col.includes(req))
    );
    
    if (!hasNameColumn) {
      errors.push('Отсутствует обязательная колонка с именем медпредставителя');
    }

    if (rows.length === 0) {
      errors.push('Файл не содержит данных');
    }

    const productColumns = WM_PRODUCTS.flatMap(p => [`${p.key}plan`, `${p.key}fact`]);
    const hasProductData = productColumns.some(prod => 
      lowerCols.some(col => col.toLowerCase().replace(/\s+/g, '').includes(prod.toLowerCase()))
    );
    
    if (!hasProductData) {
      warnings.push('Не найдены колонки с данными по продуктам. Данные будут заполнены нулями.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const parseExcelOrCsv = async (file: File): Promise<{ columns: string[]; rows: ParsedRow[] }> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv') {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data as ParsedRow[];
            const columns = results.meta.fields || [];
            resolve({ columns, rows: data });
          },
          error: (error: Error) => reject(new Error(`Ошибка парсинга CSV: ${error.message}`)),
        });
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json<ParsedRow>(worksheet);
      const columns = data.length > 0 ? Object.keys(data[0]) : [];
      return { columns, rows: data };
    }
    
    throw new Error('Неподдерживаемый формат файла');
  };

  const convertToMedRepData = (rows: ParsedRow[], selectedDistrict: WMFederalDistrict, selectedMonth: number, selectedYear: number): MedRepData[] => {
    return rows.map((row, index) => {
      const findColumn = (patterns: string[]): string | number | undefined => {
        for (const pattern of patterns) {
          for (const key of Object.keys(row)) {
            if (key.toLowerCase().includes(pattern.toLowerCase())) {
              return row[key];
            }
          }
        }
        return undefined;
      };

      const getNumericValue = (patterns: string[]): number => {
        const val = findColumn(patterns);
        if (val === undefined || val === null || val === '') return 0;
        const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
        return isNaN(num) ? 0 : num;
      };

      const getStringValue = (patterns: string[]): string => {
        const val = findColumn(patterns);
        return val ? String(val).trim() : '';
      };

      return {
        id: `imported_${Date.now()}_${index}`,
        name: getStringValue(['name', 'имя', 'медпредставитель', 'фио', 'сотрудник']),
        territory: getStringValue(['territory', 'территория', 'город', 'регион']),
        district: selectedDistrict,
        kokarnitPlan: getNumericValue(['кокарнит план', 'kokarnit plan', 'kokarnitplan']),
        kokarnitFact: getNumericValue(['кокарнит факт', 'kokarnit fact', 'kokarnitfact']),
        artoxanPlan: getNumericValue(['артоксан план', 'artoxan plan', 'artoxanplan']),
        artoxanFact: getNumericValue(['артоксан факт', 'artoxan fact', 'artoxanfact']),
        artoxanTablPlan: getNumericValue(['артоксан табл план', 'artoxantabl plan']),
        artoxanTablFact: getNumericValue(['артоксан табл факт', 'artoxantabl fact']),
        artoxanGelPlan: getNumericValue(['артоксан гель план', 'artoxangel plan']),
        artoxanGelFact: getNumericValue(['артоксан гель факт', 'artoxangel fact']),
        seknidoxPlan: getNumericValue(['секнидокс план', 'seknidox plan']),
        seknidoxFact: getNumericValue(['секнидокс факт', 'seknidox fact']),
        klodifenPlan: getNumericValue(['клодифен план', 'klodifen plan']),
        klodifenFact: getNumericValue(['клодифен факт', 'klodifen fact']),
        drastopPlan: getNumericValue(['драстоп план', 'drastop plan']),
        drastopFact: getNumericValue(['драстоп факт', 'drastop fact']),
        ortsepolPlan: getNumericValue(['орцепол план', 'ortsepol plan']),
        ortsepolFact: getNumericValue(['орцепол факт', 'ortsepol fact']),
        limendaPlan: getNumericValue(['лименда план', 'limenda plan']),
        limendaFact: getNumericValue(['лименда факт', 'limenda fact']),
        ronocitPlan: getNumericValue(['роноцит план', 'ronocit plan']),
        ronocitFact: getNumericValue(['роноцит факт', 'ronocit fact']),
        doramitcinPlan: getNumericValue(['дорамитцин план', 'doramitcin plan']),
        doramitcinFact: getNumericValue(['дорамитцин факт', 'doramitcin fact']),
        alfectoPlan: getNumericValue(['апфекто план', 'alfecto plan']),
        alfectoFact: getNumericValue(['апфекто факт', 'alfecto fact']),
        totalPackagesPlan: getNumericValue(['всего упаковок план', 'total packages plan', 'план упаковок']),
        totalPackagesFact: getNumericValue(['всего упаковок факт', 'total packages fact', 'факт упаковок']),
        totalMoneyPlan: getNumericValue(['сумма план', 'total money plan', 'план сумма']),
        totalMoneyFact: getNumericValue(['сумма факт', 'total money fact', 'факт сумма']),
        month: selectedMonth,
        year: selectedYear,
      };
    });
  };

  const handleFile = useCallback(async (selectedFile: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const extension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      setValidation({
        isValid: false,
        errors: ['Неподдерживаемый формат файла. Допустимые форматы: Excel (.xlsx, .xls) или CSV (.csv)'],
        warnings: []
      });
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setProgress(10);
    setValidation(null);
    setParsedMedRepData([]);

    try {
      setProgress(30);
      const { columns: cols, rows } = await parseExcelOrCsv(selectedFile);
      setProgress(60);
      
      setColumns(cols);
      setPreviewData(rows.slice(0, 5));
      
      setProgress(80);
      const validationResult = validateFileStructure(cols, rows);
      setValidation(validationResult);
      
      if (validationResult.isValid && district && month && year) {
        const medRepData = convertToMedRepData(rows, district as WMFederalDistrict, month as number, year as number);
        setParsedMedRepData(medRepData);
      }
      
      setProgress(100);
    } catch (error) {
      setValidation({
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Ошибка при обработке файла'],
        warnings: []
      });
    } finally {
      setIsProcessing(false);
    }
  }, [district, month, year]);

  useEffect(() => {
    if (file && validation?.isValid && district && month && year && previewData.length > 0) {
      const parseData = async () => {
        const { rows } = await parseExcelOrCsv(file);
        const medRepData = convertToMedRepData(rows, district as WMFederalDistrict, month as number, year as number);
        setParsedMedRepData(medRepData);
      };
      parseData();
    }
  }, [district, month, year, file, validation, previewData.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  }, [handleFile]);

  const handleConfirm = () => {
    if (!file || !district || !month || !year || !validation?.isValid || parsedMedRepData.length === 0) {
      return;
    }

    const historyItem: UploadHistoryItem = {
      id: `upload_${Date.now()}`,
      fileName: file.name,
      district: district as WMFederalDistrict,
      month: month as number,
      year: year as number,
      rowCount: parsedMedRepData.length,
      timestamp: Date.now(),
    };

    saveHistory([historyItem, ...uploadHistory]);
    onDataLoaded(parsedMedRepData, district as WMFederalDistrict, month as number, year as number);
    handleClear();
  };

  const handleClear = () => {
    setFile(null);
    setPreviewData([]);
    setColumns([]);
    setValidation(null);
    setProgress(0);
    setParsedMedRepData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteHistory = (id: string) => {
    const updated = uploadHistory.filter(item => item.id !== id);
    saveHistory(updated);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canConfirm = file && district && month && year && validation?.isValid && parsedMedRepData.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Загрузка данных медпредставителей
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Федеральный округ</label>
              <Select value={district} onValueChange={(val) => setDistrict(val as WMFederalDistrict)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите округ" />
                </SelectTrigger>
                <SelectContent>
                  {WM_FEDERAL_DISTRICTS.map((fd) => (
                    <SelectItem key={fd.code} value={fd.code}>
                      {fd.code} - {fd.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Месяц</label>
              <Select value={month ? String(month) : ''} onValueChange={(val) => setMonth(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите месяц" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Год</label>
              <Select value={year ? String(year) : ''} onValueChange={(val) => setYear(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите год" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            
            {file ? (
              <div className="space-y-2">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} КБ
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-medium">Перетащите файл сюда</p>
                <p className="text-sm text-muted-foreground">
                  или нажмите кнопку ниже для выбора файла
                </p>
                <p className="text-xs text-muted-foreground">
                  Поддерживаемые форматы: Excel (.xlsx, .xls) или CSV (.csv)
                </p>
              </div>
            )}
            
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
            >
              Выбрать файл
            </Button>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Обработка файла...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {validation && (
            <div className="space-y-2">
              {validation.errors.map((error, idx) => (
                <Alert key={`error-${idx}`} variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}
              {validation.warnings.map((warning, idx) => (
                <Alert key={`warning-${idx}`}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              ))}
              {validation.isValid && validation.errors.length === 0 && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    Файл успешно проверен. Найдено {previewData.length > 0 ? `${parsedMedRepData.length || 'несколько'} записей` : 'данные'}.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {previewData.length > 0 && columns.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Предпросмотр данных (первые 5 строк)</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.slice(0, 6).map((col, idx) => (
                        <TableHead key={idx} className="text-xs">
                          {col}
                        </TableHead>
                      ))}
                      {columns.length > 6 && (
                        <TableHead className="text-xs text-muted-foreground">
                          +{columns.length - 6} колонок
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        {columns.slice(0, 6).map((col, colIdx) => (
                          <TableCell key={colIdx} className="text-xs">
                            {row[col] !== undefined ? String(row[col]).substring(0, 30) : '-'}
                          </TableCell>
                        ))}
                        {columns.length > 6 && (
                          <TableCell className="text-xs text-muted-foreground">...</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClear} disabled={!file}>
              <X className="h-4 w-4 mr-2" />
              Отмена
            </Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              <Check className="h-4 w-4 mr-2" />
              Сохранить данные
            </Button>
          </div>
        </CardContent>
      </Card>

      {uploadHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              История загрузок
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uploadHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.district} • {MONTHS.find(m => m.value === item.month)?.label} {item.year} • 
                      {item.rowCount} записей • {formatDate(item.timestamp)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteHistory(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default WMRussiaFileUploader;
