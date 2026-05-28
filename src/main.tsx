import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import '@/styles/index.css';
import { SharedDataProvider } from '@/context/SharedDataContext';
import { GlobalFiltersProvider } from '@/context/GlobalFiltersContext';
import { ErrorToast } from '@/app/components/common/ErrorToast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackLabel="приложения">
      <SharedDataProvider>
        <GlobalFiltersProvider>
          <App />
          <ErrorToast />
        </GlobalFiltersProvider>
      </SharedDataProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
