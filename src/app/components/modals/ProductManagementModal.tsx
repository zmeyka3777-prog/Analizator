// ==================== МОДАЛЬНОЕ ОКНО УПРАВЛЕНИЯ ПРЕПАРАТАМИ ====================
// Добавление, редактирование и удаление препаратов

import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  AlertTriangle,
  CheckCircle,
  Upload,
  AlertCircle,
  Undo2,
} from 'lucide-react';
import { Product } from '@/types/product.types';
import {
  getProductsDraft,
  addProduct,
  updateProduct,
  deleteProduct,
  publishProductsDraft,
  hasUnpublishedProductChanges,
  restoreDefaultProduct
} from '@/data/productsManager';
import { PRODUCTS as DEFAULT_PRODUCTS } from '@/data/salesData';
import { getYears } from '@/utils/dateUtils';

interface ProductManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// История действий для отмены
interface HistoryAction {
  type: 'add' | 'edit' | 'delete';
  product: Product;
  timestamp: number;
}

export default function ProductManagementModal({ isOpen, onClose, onSuccess }: ProductManagementModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    shortName: '',
    fullName: '',
    category: '',
    price: 0,
    quota2025: 0,
  });
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [hasUnpublished, setHasUnpublished] = useState(false);
  const [history, setHistory] = useState<HistoryAction[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      setHistory([]);
    }
  }, [isOpen]);

  const loadProducts = () => {
    setProducts(getProductsDraft());
    setHasUnpublished(hasUnpublishedProductChanges());
  };

  const handlePublish = () => {
    if (window.confirm('🚀 Опубликовать изменения?\n\nНовые препараты появятся у всех сотрудников: медпредов, региональных и территориальных менеджеров, во всех отчётах и графиках.')) {
      const success = publishProductsDraft();
      if (success) {
        alert('✅ Изменения успешно опубликованы!\n\nВсе сотрудники теперь видят обновлённый список препаратов.');
        loadProducts();
        setHistory([]);
        if (onSuccess) onSuccess();
      } else {
        alert('❌ Ошибка при публикации изменений');
      }
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    const lastAction = history[history.length - 1];

    if (lastAction.type === 'delete') {
      addProduct({
        id: lastAction.product.id,
        name: lastAction.product.name || lastAction.product.fullName || lastAction.product.shortName || '',
        shortName: lastAction.product.shortName,
        fullName: lastAction.product.fullName,
        category: lastAction.product.category,
        price: lastAction.product.price,
        quota2025: lastAction.product.quota2025,
      });
      alert(`✅ Препарат "${lastAction.product.shortName}" восстановлен!`);
    } else if (lastAction.type === 'add') {
      deleteProduct(lastAction.product.id);
      alert(`✅ Отменено добавление препарата "${lastAction.product.shortName}"`);
    } else if (lastAction.type === 'edit') {
      updateProduct(lastAction.product.id, lastAction.product);
      alert(`✅ Восстановлена предыдущая версия препарата "${lastAction.product.shortName}"`);
    }

    setHistory(prev => prev.slice(0, -1));
    loadProducts();
    if (onSuccess) onSuccess();
  };

  const handleStartEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData(product);
    setIsAddingNew(false);
  };

  const handleStartAdd = () => {
    setIsAddingNew(true);
    setEditingProduct(null);
    setFormData({
      shortName: '',
      fullName: '',
      category: '',
      price: 0,
      quota2025: 0,
    });
  };

  const handleSave = () => {
    if (isAddingNew) {
      if (!formData.shortName || !formData.fullName || !formData.category) {
        alert('❌ Заполните все обязательные поля!');
        return;
      }

      const newProduct = {
        name: formData.fullName || formData.shortName || '',
        shortName: formData.shortName!,
        fullName: formData.fullName!,
        category: formData.category!,
        price: formData.price || 0,
        quota2025: formData.quota2025 || 0,
      };

      addProduct(newProduct);
      setHistory(prev => [...prev, { type: 'add', product: newProduct, timestamp: Date.now() } as HistoryAction]);
      alert(`✅ Препарат "${formData.shortName}" успешно добавлен!`);
    } else if (editingProduct) {
      const updatedProduct = {
        ...editingProduct,
        shortName: formData.shortName || editingProduct.shortName,
        fullName: formData.fullName || editingProduct.fullName,
        category: formData.category || editingProduct.category,
        price: formData.price || editingProduct.price,
        quota2025: formData.quota2025 || editingProduct.quota2025,
      };

      updateProduct(editingProduct.id, updatedProduct);
      setHistory(prev => [...prev, { type: 'edit', product: updatedProduct, timestamp: Date.now() }]);
      alert(`✅ Препарат "${formData.shortName}" успешно обновлен!`);
    }

    loadProducts();
    setIsAddingNew(false);
    setEditingProduct(null);
    setFormData({
      shortName: '',
      fullName: '',
      category: '',
      price: 0,
      quota2025: 0,
    });

    if (onSuccess) onSuccess();
  };

  const handleDelete = (id: string) => {
    const productToDelete = products.find(p => p.id === id);
    if (!productToDelete) return;

    deleteProduct(id);
    setProducts(products.filter(p => p.id !== id));
    setShowConfirmDelete(null);
    alert('✅ Препарат удален!');

    setHistory(prev => [...prev, { type: 'delete', product: productToDelete, timestamp: Date.now() }]);

    if (onSuccess) onSuccess();
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingProduct(null);
    setFormData({
      shortName: '',
      fullName: '',
      category: '',
      price: 0,
      quota2025: 0,
    });
  };

  const handleRestoreDefault = () => {
    if (window.confirm('🔄 Восстановить стандартный список препаратов?\n\nВосстановятся все 12 стандартных препаратов World Medicine, включая удаленные. Ваши добавленные препараты сохранятся.')) {
      DEFAULT_PRODUCTS.forEach(defaultProduct => {
        const exists = products.find(p => p.id === defaultProduct.id);
        if (!exists) {
          restoreDefaultProduct(defaultProduct.id);
        }
      });

      alert('✅ Стандартные препараты восстановлены!');
      loadProducts();
      if (onSuccess) onSuccess();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Управление препаратами</h2>
                <p className="text-cyan-100 text-sm">Добавление, редактирование и удаление препаратов</p>
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
          {/* Кнопка добавления */}
          {!isAddingNew && !editingProduct && (
            <Button
              onClick={handleStartAdd}
              className="mb-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить новый препарат
            </Button>
          )}

          {/* Форма добавления/редактирования */}
          {(isAddingNew || editingProduct) && (
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 mb-6 border-2 border-cyan-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                {isAddingNew ? (
                  <>
                    <Plus className="w-5 h-5 text-emerald-600" />
                    Новый препарат
                  </>
                ) : (
                  <>
                    <Edit2 className="w-5 h-5 text-blue-600" />
                    Редактирование: {editingProduct?.shortName}
                  </>
                )}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Краткое название <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.shortName || ''}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    placeholder="Например: Церебролизин"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Полное название <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName || ''}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    placeholder="Например: Церебролизин 215.2 мг"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Категория <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    placeholder="Например: Ноотропы"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Цена (₽/упаковка)
                  </label>
                  <input
                    type="number"
                    value={formData.price || 0}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    step="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Квота {getYears().current} (упаковок)
                  </label>
                  <input
                    type="number"
                    value={formData.quota2025 || 0}
                    onChange={(e) => setFormData({ ...formData, quota2025: Number(e.target.value) })}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    step="100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700"
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

          {/* Список препаратов */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-800 mb-3">
              Все препараты ({products.length})
            </h3>
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl border-2 border-slate-200 p-4 hover:border-cyan-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{product.shortName}</h4>
                        <p className="text-sm text-slate-500">{product.fullName}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 ml-13">
                      <div>
                        <p className="text-xs text-slate-500">Категория</p>
                        <p className="text-sm font-medium text-slate-700">{product.category}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Цена</p>
                        <p className="text-sm font-medium text-purple-600">
                          {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(product.price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Квота {getYears().current}</p>
                        <p className="text-sm font-medium text-blue-600">
                          {new Intl.NumberFormat('ru-RU').format(product.quota2025)} уп.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleStartEdit(product)}
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setShowConfirmDelete(product.id)}
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-red-600 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Подтверждение удаления */}
                {showConfirmDelete === product.id && (
                  <div className="mt-4 p-4 bg-red-50 rounded-xl border-2 border-red-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-800 mb-2">
                          Вы уверены, что хотите удалить препарат "{product.shortName}"?
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleDelete(product.id)}
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
            ))}
          </div>
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
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Опубликовать изменения
                </Button>
              )}
              {history.length > 0 && (
                <Button
                  onClick={handleUndo}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700"
                >
                  <Undo2 className="w-4 h-4 mr-2" />
                  Отменить последнее действие
                </Button>
              )}
              <Button
                onClick={handleRestoreDefault}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700"
              >
                Восстановить стандартные препараты
              </Button>
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700"
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
