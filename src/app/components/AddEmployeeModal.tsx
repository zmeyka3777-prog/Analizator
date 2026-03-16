import React, { useState } from 'react';
import { Employee } from '@/data/employees';
import { TERRITORIES } from '@/data/salesData';

interface Props {
  onClose: () => void;
  onSave: (employee: Omit<Employee, 'id'>) => void;
}

export function AddEmployeeModal({ onClose, onSave }: Props) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    territory: TERRITORIES[0],
    role: 'med_rep' as Employee['role'],
    position: 'medpred' as Employee['position'],
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      firstName: form.firstName,
      lastName: form.lastName,
      middleName: form.middleName || undefined,
      email: form.email,
      phone: form.phone,
      territory: form.territory,
      role: form.role,
      position: form.position,
      hireDate: new Date().toISOString().split('T')[0],
      status: 'active',
      productPlans: {},
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl border border-white/20 w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Добавить сотрудника</h2>
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
              <label className="block text-white/60 text-xs mb-1">Фамилия *</label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => handleChange('lastName', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                required
                placeholder="Иванов"
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs mb-1">Имя *</label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => handleChange('firstName', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                required
                placeholder="Иван"
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
              placeholder="Иванович"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-xs mb-1">Роль *</label>
              <select
                value={form.role}
                onChange={e => {
                  const role = e.target.value as Employee['role'];
                  handleChange('role', role);
                  handleChange('position', role === 'med_rep' ? 'medpred' : 'manager');
                }}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              >
                <option value="med_rep" className="bg-gray-900">Медпред (МП)</option>
                <option value="territorial_manager" className="bg-gray-900">Территориальный менеджер (ТМ)</option>
              </select>
            </div>
            <div>
              <label className="block text-white/60 text-xs mb-1">Территория *</label>
              <select
                value={form.territory}
                onChange={e => handleChange('territory', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              >
                {TERRITORIES.map(t => (
                  <option key={t} value={t} className="bg-gray-900">{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-white/60 text-xs mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              required
              placeholder="i.ivanov@worldmedicine.ru"
            />
          </div>

          <div>
            <label className="block text-white/60 text-xs mb-1">Телефон *</label>
            <input
              type="text"
              value={form.phone}
              onChange={e => handleChange('phone', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              required
              placeholder="+7 (999) 123-45-67"
            />
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
              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-all text-sm font-medium"
            >
              Добавить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
