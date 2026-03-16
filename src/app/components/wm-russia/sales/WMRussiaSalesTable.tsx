import React, { useState, useMemo } from 'react';
import { MedRepData } from '../../../../types';
import { getMedRepProductSales, calcCompletionPercent } from '../../../../data/wmRussiaData';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../ui/table';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { ChevronDown, ChevronRight, Search, FileSpreadsheet, FileText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface WMRussiaSalesTableProps {
  medReps: MedRepData[];
  showTerritory?: boolean;
  onMedRepClick?: (medRep: MedRepData) => void;
}

type SortField = 'name' | 'territory' | 'planPackages' | 'factPackages' | 'percentPackages' | 'planMoney' | 'factMoney' | 'percentMoney';
type SortDirection = 'asc' | 'desc';

const ROWS_PER_PAGE = 10;

function getPercentColor(percent: number): string {
  if (percent >= 95) return '#10b981';
  if (percent >= 85) return '#f59e0b';
  return '#ef4444';
}

function formatNumber(num: number): string {
  return num.toLocaleString('ru-RU');
}

function formatMoney(num: number): string {
  return num.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
}

function formatMoneyFull(num: number): string {
  return num.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';
}

export function WMRussiaSalesTable({ medReps, showTerritory = true, onMedRepClick }: WMRussiaSalesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAndSortedData = useMemo(() => {
    let data = [...medReps];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      data = data.filter(rep => rep.name.toLowerCase().includes(query));
    }

    data.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'territory':
          aVal = a.territory;
          bVal = b.territory;
          break;
        case 'planPackages':
          aVal = a.totalPackagesPlan;
          bVal = b.totalPackagesPlan;
          break;
        case 'factPackages':
          aVal = a.totalPackagesFact;
          bVal = b.totalPackagesFact;
          break;
        case 'percentPackages':
          aVal = calcCompletionPercent(a.totalPackagesFact, a.totalPackagesPlan);
          bVal = calcCompletionPercent(b.totalPackagesFact, b.totalPackagesPlan);
          break;
        case 'planMoney':
          aVal = a.totalMoneyPlan;
          bVal = b.totalMoneyPlan;
          break;
        case 'factMoney':
          aVal = a.totalMoneyFact;
          bVal = b.totalMoneyFact;
          break;
        case 'percentMoney':
          aVal = calcCompletionPercent(a.totalMoneyFact, a.totalMoneyPlan);
          bVal = calcCompletionPercent(b.totalMoneyFact, b.totalMoneyPlan);
          break;
        default:
          aVal = a.name;
          bVal = b.name;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal, 'ru') : bVal.localeCompare(aVal, 'ru');
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return data;
  }, [medReps, searchQuery, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedData.length / ROWS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredAndSortedData.slice(start, start + ROWS_PER_PAGE);
  }, [filteredAndSortedData, currentPage]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleExportExcel = () => {
    console.log('Export to Excel - placeholder');
  };

  const handleExportPDF = () => {
    console.log('Export to PDF - placeholder');
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const renderProductBreakdown = (rep: MedRepData) => {
    const products = getMedRepProductSales(rep);
    return (
      <TableRow className="bg-muted/30">
        <TableCell colSpan={showTerritory ? 9 : 8} className="p-0">
          <div className="p-4">
            <h4 className="text-sm font-medium mb-3">Продажи по продуктам</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map(product => {
                const percentColor = getPercentColor(product.completionPercent);
                return (
                  <div key={product.productId} className="flex flex-col gap-1 p-2 bg-background rounded border">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: product.color }}
                      />
                      <span className="text-sm font-medium truncate">{product.productName}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>План: {formatNumber(product.plan)}</span>
                      <span>Факт: {formatNumber(product.fact)}</span>
                      <span 
                        className="font-medium" 
                        style={{ color: percentColor }}
                      >
                        {product.completionPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all"
                        style={{ 
                          width: `${Math.min(100, product.completionPercent)}%`,
                          backgroundColor: percentColor
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по сотруднику..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-8"></TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('name')}
              >
                <span className="flex items-center">
                  Сотрудник
                  <SortIcon field="name" />
                </span>
              </TableHead>
              {showTerritory && (
                <TableHead 
                  className="cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort('territory')}
                >
                  <span className="flex items-center">
                    Территория
                    <SortIcon field="territory" />
                  </span>
                </TableHead>
              )}
              <TableHead 
                className="cursor-pointer hover:bg-muted/80 text-right"
                onClick={() => handleSort('planPackages')}
              >
                <span className="flex items-center justify-end">
                  План (упак)
                  <SortIcon field="planPackages" />
                </span>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/80 text-right"
                onClick={() => handleSort('factPackages')}
              >
                <span className="flex items-center justify-end">
                  Факт (упак)
                  <SortIcon field="factPackages" />
                </span>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/80 text-right"
                onClick={() => handleSort('percentPackages')}
              >
                <span className="flex items-center justify-end">
                  %
                  <SortIcon field="percentPackages" />
                </span>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/80 text-right"
                onClick={() => handleSort('planMoney')}
              >
                <span className="flex items-center justify-end">
                  План (₽)
                  <SortIcon field="planMoney" />
                </span>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/80 text-right"
                onClick={() => handleSort('factMoney')}
              >
                <span className="flex items-center justify-end">
                  Факт (₽)
                  <SortIcon field="factMoney" />
                </span>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/80 text-right"
                onClick={() => handleSort('percentMoney')}
              >
                <span className="flex items-center justify-end">
                  %
                  <SortIcon field="percentMoney" />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showTerritory ? 9 : 8} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'Сотрудники не найдены' : 'Нет данных'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map(rep => {
                const packagesPercent = calcCompletionPercent(rep.totalPackagesFact, rep.totalPackagesPlan);
                const moneyPercent = calcCompletionPercent(rep.totalMoneyFact, rep.totalMoneyPlan);
                const isExpanded = expandedRows.has(rep.id);

                return (
                  <React.Fragment key={rep.id}>
                    <TableRow 
                      className="cursor-pointer"
                      onClick={() => toggleRow(rep.id)}
                    >
                      <TableCell className="w-8">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell 
                        className="font-medium hover:underline"
                        onClick={(e) => {
                          if (onMedRepClick) {
                            e.stopPropagation();
                            onMedRepClick(rep);
                          }
                        }}
                      >
                        {rep.name}
                      </TableCell>
                      {showTerritory && (
                        <TableCell>{rep.territory}</TableCell>
                      )}
                      <TableCell className="text-right">{formatNumber(rep.totalPackagesPlan)}</TableCell>
                      <TableCell className="text-right">{formatNumber(rep.totalPackagesFact)}</TableCell>
                      <TableCell className="text-right">
                        <span 
                          className="font-semibold px-2 py-0.5 rounded"
                          style={{ 
                            color: getPercentColor(packagesPercent),
                            backgroundColor: `${getPercentColor(packagesPercent)}15`
                          }}
                        >
                          {packagesPercent.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right"><span title={formatMoneyFull(rep.totalMoneyPlan)}>{formatMoney(rep.totalMoneyPlan)}</span></TableCell>
                      <TableCell className="text-right"><span title={formatMoneyFull(rep.totalMoneyFact)}>{formatMoney(rep.totalMoneyFact)}</span></TableCell>
                      <TableCell className="text-right">
                        <span 
                          className="font-semibold px-2 py-0.5 rounded"
                          style={{ 
                            color: getPercentColor(moneyPercent),
                            backgroundColor: `${getPercentColor(moneyPercent)}15`
                          }}
                        >
                          {moneyPercent.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                    {isExpanded && renderProductBreakdown(rep)}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Показано {(currentPage - 1) * ROWS_PER_PAGE + 1}-{Math.min(currentPage * ROWS_PER_PAGE, filteredAndSortedData.length)} из {filteredAndSortedData.length}
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              «
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ‹
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                if (totalPages <= 5) return true;
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .map((page, idx, arr) => {
                const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && (
                      <span className="px-2 py-1 text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  </React.Fragment>
                );
              })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              »
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
