// ==================== УНИВЕРСАЛЬНОЕ МОДАЛЬНОЕ ОКНО ДЛЯ РЕДАКТИРОВАНИЯ ====================

import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { X, Save, Trash2 } from 'lucide-react';

interface Field {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select';
  options?: string[]; // для select
  required?: boolean;
  placeholder?: string;
}

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: () => void;
  title: string;
  fields: Field[];
  initialData?: any;
  isNew?: boolean;
}

export default function EditModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  title,
  fields,
  initialData = {},
  isNew = false,
}: EditModalProps) {
  const [formData, setFormData] = useState<any>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(initialData);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (name: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    // Убираем ошибку при изменении поля
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} обязательно для заполнения`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(formData);
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete && confirm('Вы уверены, что хотите удалить эту запись?')) {
      onDelete();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{isNew ? '➕ Добавить' : '✏️ Редактировать'} {title}</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xl hover:bg-white/30 transition-colors flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {field.type === 'text' && (
                  <input
                    type="text"
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all ${
                      errors[field.name] ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, Number(e.target.value))}
                    placeholder={field.placeholder}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all ${
                      errors[field.name] ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                )}

                {field.type === 'textarea' && (
                  <textarea
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all resize-none ${
                      errors[field.name] ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                )}

                {field.type === 'select' && (
                  <select
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all ${
                      errors[field.name] ? 'border-red-500' : 'border-slate-300'
                    }`}
                  >
                    <option value="">Выберите...</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}

                {errors[field.name] && (
                  <p className="text-red-500 text-sm mt-1">{errors[field.name]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-6 bg-slate-50">
          <div className="flex items-center justify-between gap-3">
            <div>
              {!isNew && onDelete && (
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Удалить
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={onClose} variant="outline">
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
