import React from 'react';

interface Props {
  children: React.ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary ${this.props.fallbackLabel || ''}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '1rem', margin: '1rem' }}>
          <h2 style={{ color: '#b91c1c', fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            Ошибка рендера {this.props.fallbackLabel || 'компонента'}
          </h2>
          <pre style={{ color: '#dc2626', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ color: '#f87171', fontSize: '0.75rem', whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
          >
            Попробовать снова
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
