// ==================== ОБЁРТКА ДЛЯ RECHARTS-БЛОКОВ ====================
// Локальный ErrorBoundary именно для charts. Когда Recharts падает
// (например `T.startsWith is not a function` при невалидных данных),
// упадёт только этот блок, не вся страница. Юзер видит маленькое
// сообщение «График временно недоступен» вместо белого экрана.

import React from 'react';

interface Props {
  children: React.ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
}

export class ChartErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn(`[ChartErrorBoundary ${this.props.label || ''}]`, error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-xs text-amber-700">
            📊 График временно недоступен{this.props.label ? ` (${this.props.label})` : ''}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-[10px] text-amber-600 hover:text-amber-800 underline mt-1"
          >
            Попробовать ещё раз
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
