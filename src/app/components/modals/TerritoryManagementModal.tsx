// ==================== МОДАЛЬНОЕ ОКНО УПРАВЛЕНИЯ ТЕРРИТОРИЯМИ ====================
// Добавление, редактирование и удаление территорий

import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  AlertTriangle,
  CheckCircle,
  Building2,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { Territory, FederalDistrict } from '@/data/federalDistricts';
import {
  getDistrictsDraft,
  addTerritory,
  updateTerritory,
  deleteTerritory,
  publishDistrictsDraft,
  hasUnpublishedDistrictChanges
} from '@/data/districtsManager';
import { getYears } from '@/utils/dateUtils';

interface TerritoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  districtId?: string;
}

export default function TerritoryManagementModal({
  isOpen,
  onClose,
  onSuccess,
  districtId
}: TerritoryManagementModalProps) {
  const [districts, setDistricts] = useState<FederalDistrict[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(districtId || '');
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<Territory>>({
    name: '',
    budget2025: 0,
  });
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [hasUnpublished, setHasUnpublished] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDistricts();
    }
  }, [isOpen]);

  useEffect(() => {
    if (districtId) {
      setSelectedDistrictId(districtId);
    }
  }, [districtId]);

  const loadDistricts = () => {
    setDistricts(getDistrictsDraft());
    setHasUnpublished(hasUnpublishedDistrictChanges());
  };

  const handlePublish = () => {
    if (window.confirm('🚀 Опубликовать изменения?\n\nНовые территории появятся у всех сотрудников: региональных и территориальных менеджеров, медпредов, во всех отчётах и графиках.')) {
      const success = publishDistrictsDraft();
      if (success) {
        alert('✅ Изменения успешно опубликованы!\n\nВсе сотрудники теперь видят обновлённый список территорий.');
        loadDistricts();
        if (onSuccess) onSuccess();
      } else {
        alert('❌ Ошибка при публикации изменений');
      }
    }
  };

  const selectedDistrict = districts.find(d => d.id === selectedDistrictId);

  const handleStartEdit = (territory: Territory) => {
    setEditingTerritory(territory);
    setFormData(territory);
    setIsAddingNew(false);
  };

  const handleStartAdd = () => {
    if (!selectedDistrictId) {
      alert('❌ Выберите округ для добавления территории!');
      return;
    }
    setIsAddingNew(true);
    setEditingTerritory(null);
    setFormData({
      name: '',
      budget2025: 0,
    });
  };

  const handleSave = () => {
    if (!selectedDistrictId) {
      alert('❌ Выберите округ!');
      return;
    }

    if (isAddingNew) {
      if (!formData.name) {
        alert('❌ Введите название территории!');
        return;
      }

      const newTerritory: Territory = {
        id: `territory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: formData.name!,
        budget2025: formData.budget2025 || 0,
      };

      addTerritory(selectedDistrictId, newTerritory);
      alert(`✅ Территория "${formData.name}" успешно добавлена!`);
    } else if (editingTerritory) {
      updateTerritory(selectedDistrictId, editingTerritory.id, formData);
      alert(`✅ Территория "${formData.name}" успешно обновлена!`);
    }

    loadDistricts();
    setIsAddingNew(false);
    setEditingTerritory(null);
    setFormData({
      name: '',
      budget2025: 0,
    });

    if (onSuccess) onSuccess();
  };

  const handleDelete = (territoryId: string) => {
    if (!selectedDistrictId) return;

    deleteTerritory(selectedDistrictId, territoryId);
    loadDistricts();
    setShowConfirmDelete(null);
    alert('✅ Территория удалена!');
    if (onSuccess) onSuccess();
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingTerritory(null);
    setFormData({
      name: '',
      budget2025: 0,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Управление территориями</h2>
                <p className="text-blue-100 text-sm">Добавление, редактирование и удаление территорий</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hasUnpublished && (
                <div className="flex items-center gap-2 bg-yellow-500/20 backdrop-blur border-2 border-yellow-300 rounded-xl px-4 py-2">
                  <AlertCircle className="w-5 h-5 text-yellow-100" />
                  <span className="text-sm font-semibold text-yellow-100">Есть неопубликованные изменения</span>
                </div>
              )}
              <Button
                onClick={onClose}
                className="bg-white/20 backdrop-blur text-white border-2 border-white/30 hover:bg-white/30"
                size="sm"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Выбор округа */}
          {!districtId && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Выберите федеральный округ
              </label>
              <select
                value={selectedDistrictId}
                onChange={(e) => setSelectedDistrictId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-medium"
              >
                <option value="">-- Выберите округ --</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.icon} {district.name} ({district.territories.length} территорий)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Информация о выбранном округе */}
          {selectedDistrict && (
            <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedDistrict.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedDistrict.name}</h3>
                  <p className="text-sm text-slate-600">
                    {selectedDistrict.shortName} • {selectedDistrict.territories.length} территорий
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Кнопка добавления */}
          {selectedDistrictId && !isAddingNew && !editingTerritory && (
            <Button
              onClick={handleStartAdd}
              className="mb-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить новую территорию
            </Button>
          )}

          {/* Форма добавления/редактирования */}
          {(isAddingNew || editingTerritory) && selectedDistrict && (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 mb-6 border-2 border-blue-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                {isAddingNew ? (
                  <>
                    <Plus className="w-5 h-5 text-emerald-600" />
                    Новая территория в {selectedDistrict.shortName}
                  </>
                ) : (
                  <>
                    <Edit2 className="w-5 h-5 text-blue-600" />
                    Редактирование: {editingTerritory?.name}
                  </>
                )}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Название территории <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Например: Москва"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Бюджет 2025 (тыс. ₽)
                  </label>
                  <input
                    type="number"
                    value={formData.budget2025 || 0}
                    onChange={(e) => setFormData({ ...formData, budget2025: Number(e.target.value) })}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    step="1000"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    В рублях: {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format((formData.budget2025 || 0) * 1000)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                >
                  Отмена
                </Button>
              </div>
            </div>
          )}

          {/* Список территорий */}
          {selectedDistrict && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Территории округа ({selectedDistrict.territories.length})
              </h3>
              {selectedDistrict.territories.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>В этом округе пока нет территорий</p>
                  <p className="text-sm">Добавьте первую территорию</p>
                </div>
              ) : (
                selectedDistrict.territories.map((territory) => (
                  <div
                    key={territory.id}
                    className="bg-white rounded-2xl border-2 border-slate-200 p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
                            style={{
                              background: `linear-gradient(to bottom right, ${selectedDistrict.color}, ${selectedDistrict.color}dd)`
                            }}
                          >
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800">{territory.name}</h4>
                            <p className="text-xs text-slate-500">{selectedDistrict.shortName}</p>
                          </div>
                        </div>
                        <div className="ml-13">
                          <p className="text-xs text-slate-500">Бюджет 2025</p>
                          <p className="text-sm font-bold" style={{ color: selectedDistrict.color }}>
                            {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(territory.budget2025 * 1000)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleStartEdit(territory)}
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => setShowConfirmDelete(territory.id)}
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-red-600 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Подтверждение удаления */}
                    {showConfirmDelete === territory.id && (
                      <div className="mt-4 p-4 bg-red-50 rounded-xl border-2 border-red-200">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-red-800 mb-2">
                              Вы уверены, что хотите удалить территорию "{territory.name}"?
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleDelete(territory.id)}
                                size="sm"
                                className="bg-red-600 text-white hover:bg-red-700"
                              >
                                Да, удалить
                              </Button>
                              <Button
                                onClick={() => setShowConfirmDelete(null)}
                                size="sm"
                                variant="outline"
                              >
                                Отмена
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Подсказка если округ не выбран */}
          {!selectedDistrictId && (
            <div className="text-center py-12 text-slate-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Выберите федеральный округ для управления территориями</p>
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              <CheckCircle className="w-4 h-4 inline mr-1 text-emerald-600" />
              Все изменения сохраняются автоматически
            </p>
            <div className="flex items-center gap-3">
              {hasUnpublished && (
                <Button
                  onClick={handlePublish}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Опубликовать изменения
                </Button>
              )}
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
              >
                Готово
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
