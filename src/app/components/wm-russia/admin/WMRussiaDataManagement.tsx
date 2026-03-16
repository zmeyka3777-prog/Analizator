import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Edit2, UserX, Search, Copy, Filter, Calendar, User, Activity } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { MedRepData, ActivityLogEntry, WMFederalDistrict, WM_FEDERAL_DISTRICTS, WM_PRODUCTS } from '@/types';
import { api } from '@/lib/api';

interface WMRussiaDataManagementProps {
  medReps: MedRepData[];
  onMedRepAdd: (medRep: Partial<MedRepData>) => void;
  onMedRepEdit: (id: string, updates: Partial<MedRepData>) => void;
  onMedRepDeactivate: (id: string) => void;
  activityLog: ActivityLogEntry[];
  userId?: string;
}

interface MedRepWithStatus extends MedRepData {
  isActive?: boolean;
}

const MONTHS = [
  { value: 1, label: 'Янв' },
  { value: 2, label: 'Фев' },
  { value: 3, label: 'Мар' },
  { value: 4, label: 'Апр' },
  { value: 5, label: 'Май' },
  { value: 6, label: 'Июн' },
  { value: 7, label: 'Июл' },
  { value: 8, label: 'Авг' },
  { value: 9, label: 'Сен' },
  { value: 10, label: 'Окт' },
  { value: 11, label: 'Ноя' },
  { value: 12, label: 'Дек' },
];

const ACTION_TYPES = [
  { value: 'all', label: 'Все действия' },
  { value: 'upload', label: 'Загрузка данных' },
  { value: 'edit_plan', label: 'Изменение плана' },
  { value: 'add_medrep', label: 'Добавление медпреда' },
  { value: 'edit_medrep', label: 'Редактирование медпреда' },
  { value: 'delete_medrep', label: 'Деактивация медпреда' },
];

export function WMRussiaDataManagement({
  medReps,
  onMedRepAdd,
  onMedRepEdit,
  onMedRepDeactivate,
  activityLog: externalActivityLog,
  userId,
}: WMRussiaDataManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [selectedMedRep, setSelectedMedRep] = useState<MedRepData | null>(null);
  const [medRepStatuses, setMedRepStatuses] = useState<Record<string, boolean>>({});

  const [newMedRep, setNewMedRep] = useState({
    name: '',
    territory: '',
    district: '' as WMFederalDistrict | '',
  });

  const [planDistrictFilter, setPlanDistrictFilter] = useState<string>('all');
  const [planTerritoryFilter, setPlanTerritoryFilter] = useState<string>('all');
  const [plans, setPlans] = useState<Record<string, Record<number, number>>>({});
  const [editingCell, setEditingCell] = useState<{ productId: string; month: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const [bulkUpdateProducts, setBulkUpdateProducts] = useState<string[]>([]);
  const [bulkUpdateValue, setBulkUpdateValue] = useState('');

  const [activityActionFilter, setActivityActionFilter] = useState<string>('all');
  const [activityUserFilter, setActivityUserFilter] = useState<string>('all');
  const [activityDateFrom, setActivityDateFrom] = useState('');
  const [activityDateTo, setActivityDateTo] = useState('');
  const [localActivityLog, setLocalActivityLog] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      try {
        const [activityLogData, plansData, statusesData] = await Promise.all([
          api.wmRussia.getActivityLog(userId),
          api.wmRussia.getMonthlyPlans(userId),
          api.wmRussia.getMedRepsStatus(userId),
        ]);
        setLocalActivityLog(activityLogData as ActivityLogEntry[]);
        setPlans(plansData);
        setMedRepStatuses(statusesData);
      } catch (e) {
        console.error('Failed to load WM Russia data:', e);
      }
    };
    loadData();
  }, [userId]);

  const combinedActivityLog = useMemo(() => {
    const combined = [...externalActivityLog, ...localActivityLog];
    return combined.sort((a, b) => b.timestamp - a.timestamp);
  }, [externalActivityLog, localActivityLog]);

  const saveActivityLog = useCallback(async (newLog: ActivityLogEntry[]) => {
    const trimmedLog = newLog.slice(0, 100);
    setLocalActivityLog(trimmedLog);
    if (userId) {
      try {
        await api.wmRussia.saveActivityLog(parseInt(userId), trimmedLog);
      } catch (e) {
        console.error('Failed to save activity log:', e);
      }
    }
  }, [userId]);

  const addActivityLogEntry = useCallback((action: ActivityLogEntry['action'], description: string, details?: any) => {
    const entry: ActivityLogEntry = {
      id: `log_${Date.now()}`,
      userId: 'admin',
      userName: 'Администратор',
      action,
      description,
      timestamp: Date.now(),
      details,
    };
    setLocalActivityLog(prev => {
      const newLog = [entry, ...prev].slice(0, 100);
      if (userId) {
        api.wmRussia.saveActivityLog(parseInt(userId), newLog).catch(console.error);
      }
      return newLog;
    });
  }, [userId]);

  const savePlans = useCallback(async (newPlans: Record<string, Record<number, number>>) => {
    setPlans(newPlans);
    if (userId) {
      try {
        await api.wmRussia.saveMonthlyPlans(parseInt(userId), newPlans);
      } catch (e) {
        console.error('Failed to save plans:', e);
      }
    }
  }, [userId]);

  const saveMedRepStatuses = useCallback(async (statuses: Record<string, boolean>) => {
    setMedRepStatuses(statuses);
    if (userId) {
      try {
        await api.wmRussia.saveMedRepsStatus(parseInt(userId), statuses);
      } catch (e) {
        console.error('Failed to save medreps status:', e);
      }
    }
  }, [userId]);

  const medRepsWithStatus: MedRepWithStatus[] = useMemo(() => {
    return medReps.map(rep => ({
      ...rep,
      isActive: medRepStatuses[rep.id] !== false,
    }));
  }, [medReps, medRepStatuses]);

  const filteredMedReps = useMemo(() => {
    return medRepsWithStatus.filter(rep => {
      const matchesSearch = rep.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDistrict = districtFilter === 'all' || rep.district === districtFilter;
      return matchesSearch && matchesDistrict;
    });
  }, [medRepsWithStatus, searchQuery, districtFilter]);

  const territories = useMemo(() => {
    const uniqueTerritories = [...new Set(medReps.map(rep => rep.territory))];
    return uniqueTerritories.sort();
  }, [medReps]);

  const filteredActivityLog = useMemo(() => {
    return combinedActivityLog.filter(entry => {
      const matchesAction = activityActionFilter === 'all' || entry.action === activityActionFilter;
      const matchesUser = activityUserFilter === 'all' || entry.userId === activityUserFilter;
      
      let matchesDate = true;
      if (activityDateFrom) {
        const fromDate = new Date(activityDateFrom).getTime();
        matchesDate = matchesDate && entry.timestamp >= fromDate;
      }
      if (activityDateTo) {
        const toDate = new Date(activityDateTo).getTime() + 86400000;
        matchesDate = matchesDate && entry.timestamp <= toDate;
      }
      
      return matchesAction && matchesUser && matchesDate;
    });
  }, [combinedActivityLog, activityActionFilter, activityUserFilter, activityDateFrom, activityDateTo]);

  const uniqueUsers = useMemo(() => {
    const users = new Map<string, string>();
    combinedActivityLog.forEach(entry => {
      users.set(entry.userId, entry.userName);
    });
    return Array.from(users.entries());
  }, [combinedActivityLog]);

  const handleAddMedRep = () => {
    if (!newMedRep.name || !newMedRep.territory || !newMedRep.district) return;

    const medRepData: Partial<MedRepData> = {
      id: `medrep_${Date.now()}`,
      name: newMedRep.name,
      territory: newMedRep.territory,
      district: newMedRep.district as WMFederalDistrict,
      kokarnitPlan: 0, kokarnitFact: 0,
      artoxanPlan: 0, artoxanFact: 0,
      artoxanTablPlan: 0, artoxanTablFact: 0,
      artoxanGelPlan: 0, artoxanGelFact: 0,
      seknidoxPlan: 0, seknidoxFact: 0,
      klodifenPlan: 0, klodifenFact: 0,
      drastopPlan: 0, drastopFact: 0,
      ortsepolPlan: 0, ortsepolFact: 0,
      limendaPlan: 0, limendaFact: 0,
      ronocitPlan: 0, ronocitFact: 0,
      doramitcinPlan: 0, doramitcinFact: 0,
      alfectoPlan: 0, alfectoFact: 0,
      totalPackagesPlan: 0,
      totalPackagesFact: 0,
      totalMoneyPlan: 0,
      totalMoneyFact: 0,
    };

    onMedRepAdd(medRepData);
    addActivityLogEntry('add_medrep', `Добавлен медпредставитель: ${newMedRep.name}`, { medRep: medRepData });
    setNewMedRep({ name: '', territory: '', district: '' });
    setIsAddDialogOpen(false);
  };

  const handleEditMedRep = () => {
    if (!selectedMedRep) return;

    onMedRepEdit(selectedMedRep.id, selectedMedRep);
    addActivityLogEntry('edit_medrep', `Отредактирован медпредставитель: ${selectedMedRep.name}`, { updates: selectedMedRep });
    setIsEditDialogOpen(false);
    setSelectedMedRep(null);
  };

  const handleDeactivateMedRep = (medRep: MedRepData) => {
    const newStatuses = { ...medRepStatuses, [medRep.id]: false };
    saveMedRepStatuses(newStatuses);
    onMedRepDeactivate(medRep.id);
    addActivityLogEntry('delete_medrep', `Деактивирован медпредставитель: ${medRep.name}`, { medRepId: medRep.id });
  };

  const handleActivateMedRep = (medRep: MedRepData) => {
    const newStatuses = { ...medRepStatuses, [medRep.id]: true };
    saveMedRepStatuses(newStatuses);
    addActivityLogEntry('edit_medrep', `Активирован медпредставитель: ${medRep.name}`, { medRepId: medRep.id });
  };

  const handlePlanCellEdit = (productId: string, month: number) => {
    setEditingCell({ productId, month });
    setEditingValue(String(plans[productId]?.[month] || 0));
  };

  const handlePlanCellSave = () => {
    if (!editingCell) return;

    const value = parseInt(editingValue) || 0;
    const newPlans = { ...plans };
    if (!newPlans[editingCell.productId]) {
      newPlans[editingCell.productId] = {};
    }
    newPlans[editingCell.productId][editingCell.month] = value;
    savePlans(newPlans);
    
    addActivityLogEntry('edit_plan', `Изменен план для ${WM_PRODUCTS.find(p => p.key === editingCell.productId)?.name}: ${MONTHS.find(m => m.value === editingCell.month)?.label} = ${value}`, {
      productId: editingCell.productId,
      month: editingCell.month,
      value,
    });
    
    setEditingCell(null);
    setEditingValue('');
  };

  const handleCopyFromPreviousMonth = () => {
    const currentMonth = new Date().getMonth() + 1;
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    
    const newPlans = { ...plans };
    WM_PRODUCTS.forEach(product => {
      if (newPlans[product.key]?.[previousMonth]) {
        if (!newPlans[product.key]) {
          newPlans[product.key] = {};
        }
        newPlans[product.key][currentMonth] = newPlans[product.key][previousMonth];
      }
    });
    
    savePlans(newPlans);
    addActivityLogEntry('edit_plan', `Скопированы планы из ${MONTHS.find(m => m.value === previousMonth)?.label} в ${MONTHS.find(m => m.value === currentMonth)?.label}`);
  };

  const handleBulkUpdate = () => {
    if (bulkUpdateProducts.length === 0 || !bulkUpdateValue) return;

    const value = parseInt(bulkUpdateValue) || 0;
    const currentMonth = new Date().getMonth() + 1;
    
    const newPlans = { ...plans };
    bulkUpdateProducts.forEach(productId => {
      if (!newPlans[productId]) {
        newPlans[productId] = {};
      }
      newPlans[productId][currentMonth] = value;
    });
    
    savePlans(newPlans);
    addActivityLogEntry('edit_plan', `Массовое обновление планов: ${bulkUpdateProducts.length} продуктов = ${value}`, {
      products: bulkUpdateProducts,
      value,
      month: currentMonth,
    });
    
    setIsBulkUpdateDialogOpen(false);
    setBulkUpdateProducts([]);
    setBulkUpdateValue('');
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionLabel = (action: string) => {
    return ACTION_TYPES.find(a => a.value === action)?.label || action;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="medreps" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="medreps">Медпреды</TabsTrigger>
          <TabsTrigger value="plans">Планы</TabsTrigger>
          <TabsTrigger value="activity">Журнал активности</TabsTrigger>
        </TabsList>

        <TabsContent value="medreps" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-1 gap-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по имени..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Все округа" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все округа</SelectItem>
                  {WM_FEDERAL_DISTRICTS.map((d) => (
                    <SelectItem key={d.code} value={d.code}>
                      {d.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить медпреда
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Территория</TableHead>
                  <TableHead>Округ</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMedReps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Медпредставители не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMedReps.map((rep) => (
                    <TableRow key={rep.id}>
                      <TableCell className="font-medium">{rep.name}</TableCell>
                      <TableCell>{rep.territory}</TableCell>
                      <TableCell>{rep.district}</TableCell>
                      <TableCell>
                        <Badge variant={rep.isActive ? 'default' : 'secondary'}>
                          {rep.isActive ? 'Активен' : 'Неактивен'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedMedRep(rep);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {rep.isActive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivateMedRep(rep)}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActivateMedRep(rep)}
                            >
                              <User className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-4">
              <Select value={planDistrictFilter} onValueChange={setPlanDistrictFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Все округа" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все округа</SelectItem>
                  {WM_FEDERAL_DISTRICTS.map((d) => (
                    <SelectItem key={d.code} value={d.code}>
                      {d.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={planTerritoryFilter} onValueChange={setPlanTerritoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Все территории" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все территории</SelectItem>
                  {territories.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyFromPreviousMonth}>
                <Copy className="h-4 w-4 mr-2" />
                Копировать из пред. месяца
              </Button>
              <Button onClick={() => setIsBulkUpdateDialogOpen(true)}>
                Массовое обновление
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Продукт</TableHead>
                  {MONTHS.map((month) => (
                    <TableHead key={month.value} className="text-center min-w-[80px]">
                      {month.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {WM_PRODUCTS.map((product) => (
                  <TableRow key={product.key}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: product.color }}
                        />
                        {product.name}
                      </div>
                    </TableCell>
                    {MONTHS.map((month) => (
                      <TableCell
                        key={month.value}
                        className="text-center cursor-pointer hover:bg-muted/50"
                        onClick={() => handlePlanCellEdit(product.key, month.value)}
                      >
                        {editingCell?.productId === product.key && editingCell?.month === month.value ? (
                          <Input
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={handlePlanCellSave}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handlePlanCellSave();
                              if (e.key === 'Escape') {
                                setEditingCell(null);
                                setEditingValue('');
                              }
                            }}
                            className="w-20 h-8 text-center mx-auto"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm">
                            {plans[product.key]?.[month.value] || 0}
                          </span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={activityActionFilter} onValueChange={setActivityActionFilter}>
              <SelectTrigger className="w-[200px]">
                <Activity className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Тип действия" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activityUserFilter} onValueChange={setActivityUserFilter}>
              <SelectTrigger className="w-[180px]">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Пользователь" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все пользователи</SelectItem>
                {uniqueUsers.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={activityDateFrom}
                onChange={(e) => setActivityDateFrom(e.target.value)}
                className="w-[150px]"
                placeholder="От"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                type="date"
                value={activityDateTo}
                onChange={(e) => setActivityDateTo(e.target.value)}
                className="w-[150px]"
                placeholder="До"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата/Время</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Действие</TableHead>
                  <TableHead>Описание</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivityLog.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Записи не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActivityLog.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(entry.timestamp)}
                      </TableCell>
                      <TableCell>{entry.userName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getActionLabel(entry.action)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{entry.description}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить медпредставителя</DialogTitle>
            <DialogDescription>
              Заполните информацию о новом медпредставителе
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={newMedRep.name}
                onChange={(e) => setNewMedRep({ ...newMedRep, name: e.target.value })}
                placeholder="ФИО медпредставителя"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="territory">Территория</Label>
              <Input
                id="territory"
                value={newMedRep.territory}
                onChange={(e) => setNewMedRep({ ...newMedRep, territory: e.target.value })}
                placeholder="Город или регион"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="district">Федеральный округ</Label>
              <Select
                value={newMedRep.district}
                onValueChange={(value) => setNewMedRep({ ...newMedRep, district: value as WMFederalDistrict })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите округ" />
                </SelectTrigger>
                <SelectContent>
                  {WM_FEDERAL_DISTRICTS.map((d) => (
                    <SelectItem key={d.code} value={d.code}>
                      {d.code} - {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddMedRep}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать медпредставителя</DialogTitle>
            <DialogDescription>
              Измените информацию о медпредставителе
            </DialogDescription>
          </DialogHeader>
          {selectedMedRep && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Имя</Label>
                <Input
                  id="edit-name"
                  value={selectedMedRep.name}
                  onChange={(e) => setSelectedMedRep({ ...selectedMedRep, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-territory">Территория</Label>
                <Input
                  id="edit-territory"
                  value={selectedMedRep.territory}
                  onChange={(e) => setSelectedMedRep({ ...selectedMedRep, territory: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-district">Федеральный округ</Label>
                <Select
                  value={selectedMedRep.district}
                  onValueChange={(value) => setSelectedMedRep({ ...selectedMedRep, district: value as WMFederalDistrict })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WM_FEDERAL_DISTRICTS.map((d) => (
                      <SelectItem key={d.code} value={d.code}>
                        {d.code} - {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleEditMedRep}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkUpdateDialogOpen} onOpenChange={setIsBulkUpdateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Массовое обновление планов</DialogTitle>
            <DialogDescription>
              Установите одинаковое значение плана для нескольких продуктов на текущий месяц
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Выберите продукты</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto border rounded-lg p-2">
                {WM_PRODUCTS.map((product) => (
                  <label key={product.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkUpdateProducts.includes(product.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkUpdateProducts([...bulkUpdateProducts, product.key]);
                        } else {
                          setBulkUpdateProducts(bulkUpdateProducts.filter(p => p !== product.key));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{product.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bulk-value">Значение плана</Label>
              <Input
                id="bulk-value"
                type="number"
                value={bulkUpdateValue}
                onChange={(e) => setBulkUpdateValue(e.target.value)}
                placeholder="Введите значение"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkUpdateDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleBulkUpdate} disabled={bulkUpdateProducts.length === 0 || !bulkUpdateValue}>
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WMRussiaDataManagement;
