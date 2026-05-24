// ==================== TOAST ОБ ОШИБКАХ ====================
// Слушает CustomEvent 'app-error' и показывает баннер на 5 секунд.
// Используется SharedDataProvider'ом и другими местами где раньше ошибки
// просто молчали в console.warn — пользователь не узнавал что данные не
// загрузились.
//
// Эмиттер: window.dispatchEvent(new CustomEvent('app-error', { detail: { message: '...' } }))

import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorMessage {
  id: number;
  message: string;
}

export function ErrorToast() {
  const [errors, setErrors] = useState<ErrorMessage[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const message: string = detail?.message || 'Произошла ошибка';
      const id = Date.now() + Math.random();
      setErrors(prev => [...prev, { id, message }]);
      // Авто-скрытие через 5 секунд
      setTimeout(() => {
        setErrors(prev => prev.filter(err => err.id !== id));
      }, 5000);
    };
    window.addEventListener('app-error', handler);
    return () => window.removeEventListener('app-error', handler);
  }, []);

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md pointer-events-none">
      {errors.map(err => (
        <div
          key={err.id}
          className="bg-red-50 border border-red-200 rounded-xl shadow-lg px-4 py-3 flex items-start gap-3 pointer-events-auto animate-in slide-in-from-right duration-300"
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-900">Ошибка</p>
            <p className="text-xs text-red-700 mt-0.5 break-words">{err.message}</p>
          </div>
          <button
            onClick={() => setErrors(prev => prev.filter(e => e.id !== err.id))}
            className="text-red-400 hover:text-red-600 transition-colors shrink-0"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Удобная функция для эмиссии ошибки из любого места (не только React-компонента). */
export function emitAppError(message: string): void {
  window.dispatchEvent(new CustomEvent('app-error', { detail: { message } }));
}
