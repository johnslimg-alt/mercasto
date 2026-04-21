import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import * as Sentry from "@sentry/react";
import { BrowserRouter } from 'react-router-dom';

// Защита квот разработчика: активируем Sentry ТОЛЬКО в боевом окружении (Production)
if (import.meta.env.VITE_SENTRY_DSN && import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, 
    // Защита от Sentry Session Replay Overload: снижаем частоту записи экранов до 0.1% для продакшена (спасает трафик и квоты)
    replaysSessionSampleRate: import.meta.env.PROD ? 0.001 : 1.0, 
    replaysOnErrorSampleRate: 1.0,
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
