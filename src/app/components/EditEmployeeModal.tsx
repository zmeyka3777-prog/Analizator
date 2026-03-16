import React, { useState } from 'react';
import { Employee } from '@/data/employees';

interface Props {
  employee: Employee;
  onClose: () => void;
  onSave: (updated: Employee) => void;
}

export function EditEmployeeModal({ employee, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    firstName: employee.firstName,
    lastName: employee.lastName,
    middleName: employee.middleName || '',
    email: employee.email,
    phone: employee.phone,
    territory: employee.territory,
    status: employee.status,
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...employee,
      firstName: form.firstName,
      lastName: form.lastName,
      middleName: form.middleName || undefined,
      email: form.email,
      phone: form.phone,
      territory: form.territory,
      status: form.status as 'active' | 'inactive',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl border border-white/20 w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Редактирование сотрудника</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-xs mb-1">Фамилия</label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => handleChange('lastName', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                required
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs mb-1">Имя</label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => handleChange('firstName', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-white/60 text-xs mb-1">Отчество</label>
            <input
              type="text"
              value={form.middleName}
              onChange={e => handleChange('middleName', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-white/60 text-xs mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-white/60 text-xs mb-1">Телефон</label>
            <input
              type="text"
              value={form.phone}
              onChange={e => handleChange('phone', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-white/60 text-xs mb-1">Территория</label>
            <input
              type="text"
              value={form.territory}
              onChange={e => handleChange('territory', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-white/60 text-xs mb-1">Статус</label>
            <select
              value={form.status}
              onChange={e => handleChange('status', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
            >
              <option value="active" className="bg-gray-900">Активный</option>
              <option value="inactive" className="bg-gray-900">Неактивный</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/10 text-white/60 rounded-lg hover:bg-white/20 transition-all text-sm"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all text-sm font-medium"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
