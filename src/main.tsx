import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import '@/styles/index.css';
import { SharedDataProvider } from '@/context/SharedDataContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SharedDataProvider>
      <App />
    </SharedDataProvider>
  </React.StrictMode>
);
