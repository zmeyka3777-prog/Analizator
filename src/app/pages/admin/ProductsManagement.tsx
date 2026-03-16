// ==================== УПРАВЛЕНИЕ ПРЕПАРАТАМИ ====================

import React, { useState, useEffect } from 'react';
import { Product } from '@/types/product.types';
import { adminApi } from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import {
  Pill,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Package,
  DollarSign,
  BarChart3,
  Loader2,
} from 'lucide-react';

interface EditingProduct {
  id: string;
  name: string;
  fullName: string;
  shortName: string;
  price: string;
  quantity: string;
  category: string;
  quota2025: string;
  budget2025: string;
}

export default function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingProduct | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getProducts();
      setProducts(response.products.map((p: any) => ({
        id: String(p.id),
        name: p.name,
        fullName: p.full_name || p.name,
        shortName: p.short_name || p.name,
        price: Number(p.price) || 0,
        quantity: 'упаковка',
        category: p.category || '',
        quota2025: p.quota2025 || 0,
        budget2025: Number(p.budget2025) || 0,
      })));
    } catch (err) {
      console.error('[ProductsManagement] Ошибка загрузки:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditForm({
      id: product.id,
      name: product.name,
      fullName: product.fullName || '',
      shortName: product.shortName || '',
      price: String(product.price),
      quantity: product.quantity || 'упаковка',
      category: product.category || '',
      quota2025: String(product.quota2025 || 0),
      budget2025: String(product.budget2025 || 0),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    if (!editForm) return;
    try {
      await adminApi.updateProduct(Number(editForm.id), {
        name: editForm.name,
        full_name: editForm.fullName,
        short_name: editForm.shortName,
        price: parseFloat(editForm.price) || 0,
        category: editForm.category,
        quota2025: parseInt(editForm.quota2025, 10) || 0,
        budget2025: parseInt(editForm.budget2025, 10) || 0,
      });
      await loadProducts();
    } catch (err: any) {
      console.error('[ProductsManagement] Ошибка сохранения:', err);
    }
    setEditingId(null);
    setEditForm(null);
  };

  const addProduct = async () => {
    if (!editForm || !editForm.name) return;
    try {
      await adminApi.createProduct({
        code: `product_${Date.now()}`,
        name: editForm.name,
        full_name: editForm.fullName,
        short_name: editForm.shortName,
        price: parseFloat(editForm.price) || 0,
        category: editForm.category,
        quota2025: parseInt(editForm.quota2025, 10) || 0,
        budget2025: parseInt(editForm.budget2025, 10) || 0,
      });
      await loadProducts();
    } catch (err: any) {
      console.error('[ProductsManagement] Ошибка добавления:', err);
    }
    setShowAddForm(false);
    setEditForm(null);
  };

  const removeProduct = async (id: string) => {
    try {
      await adminApi.deleteProduct(Number(id));
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      console.error('[ProductsManagement] Ошибка удаления:', err);
    }
  };

  const startAdd = () => {
    setShowAddForm(true);
    setEditForm({
      id: '',
      name: '',
      fullName: '',
      shortName: '',
      price: '',
      quantity: 'упаковка',
      category: '',
      quota2025: '',
      budget2025: '',
    });
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setEditForm(null);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Управление препаратами
            {loading && <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Настройка списка препаратов, цен, квот и бюджетов
          </p>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-cyan-600" />
            <span className="text-xs text-slate-500">Всего препаратов</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{products.length}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-xs text-slate-500">Общий бюджет 2025</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {formatCurrency(products.reduce((sum, p) => sum + (p.budget2025 || 0), 0))}
          </p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-violet-600" />
            <span className="text-xs text-slate-500">Общая квота 2025</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {products.reduce((sum, p) => sum + (p.quota2025 || 0), 0).toLocaleString('ru-RU')}
          </p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Pill className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-slate-500">Категории</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {new Set(products.map(p => p.category).filter(Boolean)).size}
          </p>
        </div>
      </div>

      {/* Поиск и добавление */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию или категории..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
          />
        </div>
        <Button
          onClick={startAdd}
          disabled={showAddForm}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl px-4"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      </div>

      {/* Форма добавления */}
      {showAddForm && editForm && (
        <div className="bg-cyan-50/50 rounded-2xl border border-cyan-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Новый препарат</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Название *</label>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Название препарата"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Полное название</label>
              <input
                type="text"
                value={editForm.fullName}
                onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                placeholder="Полное торговое название"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Краткое название</label>
              <input
                type="text"
                value={editForm.shortName}
                onChange={e => setEditForm({ ...editForm, shortName: e.target.value })}
                placeholder="Сокращение"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Цена (руб.) *</label>
              <input
                type="number"
                value={editForm.price}
                onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Категория</label>
              <input
                type="text"
                value={editForm.category}
                onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                placeholder="НПВС, Антигистаминные..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Ед. измерения</label>
              <input
                type="text"
                value={editForm.quantity}
                onChange={e => setEditForm({ ...editForm, quantity: e.target.value })}
                placeholder="упаковка"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Квота 2025 (шт.)</label>
              <input
                type="number"
                value={editForm.quota2025}
                onChange={e => setEditForm({ ...editForm, quota2025: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Бюджет 2025 (руб.)</label>
              <input
                type="number"
                value={editForm.budget2025}
                onChange={e => setEditForm({ ...editForm, budget2025: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button
              onClick={addProduct}
              disabled={!editForm.name || !editForm.price}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl"
            >
              <Check className="w-4 h-4 mr-2" />
              Добавить препарат
            </Button>
            <Button variant="outline" onClick={cancelAdd} className="rounded-xl">
              <X className="w-4 h-4 mr-2" />
              Отмена
            </Button>
          </div>
        </div>
      )}

      {/* Таблица препаратов */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Препарат</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Категория</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Цена</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Квота 2025</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Бюджет 2025</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                  {editingId === product.id && editForm ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg border border-cyan-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editForm.category}
                          onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg border border-cyan-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.price}
                          onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg border border-cyan-300 text-sm text-right focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.quota2025}
                          onChange={e => setEditForm({ ...editForm, quota2025: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg border border-cyan-300 text-sm text-right focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.budget2025}
                          onChange={e => setEditForm({ ...editForm, budget2025: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg border border-cyan-300 text-sm text-right focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={saveEdit} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{product.name}</p>
                          {product.fullName && product.fullName !== product.name && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[280px]">{product.fullName}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                          {product.category || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">
                        {(product.quota2025 || 0).toLocaleString('ru-RU')}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                        {formatCurrency(product.budget2025 || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startEdit(product)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeProduct(product.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && !loading && (
          <div className="px-6 py-12 text-center">
            <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {searchQuery ? 'Препараты не найдены' : 'Добавьте первый препарат через кнопку выше'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
