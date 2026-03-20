import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { parseFile } from '@/utils/fileParser';
import { useSharedData, MDLPSaleRecord } from '@/context/SharedDataContext';

interface WMDataUploadPanelProps {
  /** Компактный режим — маленькая кнопка со счётчиком */
  compact?: boolean;
  /** Светлая тема для встройки в светлые шапки */
  lightTheme?: boolean;
}

type UploadStatus = 'idle' | 'parsing' | 'done' | 'error';

export function WMDataUploadPanel({ compact = false, lightTheme = false }: WMDataUploadPanelProps) {
  const { setMdlpData, clearAllData, wmRussiaData, dataLoaded } = useSharedData();
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setStatus('parsing');
    setMessage(`Обрабатываем ${file.name}…`);
    try {
      const parsed = await parseFile(file);
      if (!parsed.rows.length) {
        setStatus('error');
        setMessage('Файл пустой — строки не найдены');
        return;
      }

      // Конвертируем ParsedSalesRow → MDLPSaleRecord
      const records: MDLPSaleRecord[] = parsed.rows.map(row => {
        const monthNum = row.month
          ? (isNaN(Number(row.month)) ? parseMonthName(row.month) : Number(row.month))
          : undefined;

        return {
          drug: row.drug || row.complexDrugName || '',
          region: row.region || '',
          city: row.city,
          contragent: row.contragent,
          sales: row.amount ?? 0,
          packages: row.quantity ?? 0,
          date: row.documentDate,
          year: row.year,
          month: monthNum,
          disposalType: row.disposalType,
          receiverType: row.receiverType,
          federalDistrict: row.federalDistrict,
        };
      }).filter(r => r.drug && r.region);

      if (!records.length) {
        setStatus('error');
        setMessage('Не удалось извлечь данные — проверьте формат файла');
        return;
      }

      setMdlpData(records);
      setStatus('done');
      setMessage(`Загружено ${records.length} записей из ${file.name}`);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Ошибка при чтении файла');
    }
  }, [setMdlpData]);

  const handleFiles = (files: FileList | null) => {
    if (!files || !files[0]) return;
    processFile(files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleClear = () => {
    clearAllData();
    setStatus('idle');
    setMessage('');
  };

  // ——— Компактный вариант для встройки в шапку/сайдбар ———
  if (compact) {
    const btnCls = lightTheme
      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600'
      : 'bg-white/10 hover:bg-white/20 border-white/20 text-white/80';
    return (
      <div className="relative">
        <button
          onClick={() => setExpanded(v => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${btnCls}`}
        >
          <Upload className="h-3.5 w-3.5" />
          <span>{dataLoaded ? `${wmRussiaData.length} тер.` : 'Загрузить данные'}</span>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {dataLoaded && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />}
        </button>

        {expanded && (
          <div className="absolute top-full mt-2 right-0 z-50 w-72 bg-slate-800/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-4">
            <UploadBody
              status={status}
              message={message}
              isDragging={isDragging}
              dataLoaded={dataLoaded}
              fileInputRef={fileInputRef}
              onFiles={handleFiles}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClear={handleClear}
            />
          </div>
        )}
      </div>
    );
  }

  // ——— Полный вариант ———
  return (
    <div className="wm-card bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <Upload className="h-4 w-4 text-cyan-400" />
        Загрузка данных МДЛП
      </h3>
      <UploadBody
        status={status}
        message={message}
        isDragging={isDragging}
        dataLoaded={dataLoaded}
        fileInputRef={fileInputRef}
        onFiles={handleFiles}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClear={handleClear}
      />
    </div>
  );
}

// Разделили тело на отдельный компонент, чтобы переиспользовать в обоих режимах
interface UploadBodyProps {
  status: UploadStatus;
  message: string;
  isDragging: boolean;
  dataLoaded: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onClear: () => void;
}

function UploadBody({
  status, message, isDragging, dataLoaded,
  fileInputRef, onFiles, onDrop, onDragOver, onDragLeave, onClear,
}: UploadBodyProps) {
  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-cyan-400 bg-cyan-500/10'
            : 'border-white/20 hover:border-cyan-400/50 hover:bg-white/5'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          className="hidden"
          onChange={e => onFiles(e.target.files)}
        />
        {status === 'parsing' ? (
          <div className="flex flex-col items-center gap-2 text-cyan-400">
            <Loader2 className="h-7 w-7 animate-spin" />
            <span className="text-xs">Читаем файл…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FileText className="h-7 w-7 text-gray-400" />
            <p className="text-xs text-gray-400">Перетащите файл или нажмите</p>
            <p className="text-[10px] text-gray-600">CSV, XLSX, XLS, JSON</p>
          </div>
        )}
      </div>

      {/* Статус */}
      {message && (
        <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
          status === 'done'
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
            : status === 'error'
            ? 'bg-red-500/15 text-red-300 border border-red-500/20'
            : 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
        }`}>
          {status === 'done'
            ? <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            : status === 'error'
            ? <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            : <Loader2 className="h-3.5 w-3.5 mt-0.5 shrink-0 animate-spin" />
          }
          <span>{message}</span>
        </div>
      )}

      {/* Кнопка сброса */}
      {dataLoaded && (
        <button
          onClick={onClear}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-300 py-1.5 rounded-lg hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
        >
          <X className="h-3 w-3" />
          Очистить данные
        </button>
      )}
    </div>
  );
}

// Конвертация русского названия месяца в номер
function parseMonthName(name: string): number | undefined {
  const map: Record<string, number> = {
    'январь': 1, 'янв': 1,
    'февраль': 2, 'фев': 2,
    'март': 3, 'мар': 3,
    'апрель': 4, 'апр': 4,
    'май': 5,
    'июнь': 6, 'июн': 6,
    'июль': 7, 'июл': 7,
    'август': 8, 'авг': 8,
    'сентябрь': 9, 'сен': 9,
    'октябрь': 10, 'окт': 10,
    'ноябрь': 11, 'ноя': 11,
    'декабрь': 12, 'дек': 12,
  };
  const key = name.toLowerCase().trim();
  return map[key];
}
