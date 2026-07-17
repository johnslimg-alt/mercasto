import './lib/notificationPolyfill.js'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppWrapper from './App.jsx'
import AdminModerationCenter from './components/admin/AdminModerationCenter.jsx'
import { UIProvider } from './contexts/UIContext.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { initBehaviorAnalytics } from './utils/analytics'
import { installMetaCapiBridge } from './utils/metaCapiBridge'
import { initTikTokPixel } from './utils/tiktokPixel'
import { installProtectedRouteReturn } from './utils/protectedRouteReturn'
// Leaflet CSS is loaded lazily alongside the map bundle (see MapV3 loadLeaflet)
// so it no longer bloats the render-blocking critical stylesheet.
import './index.css'
import './i18n'; // Multi-language support

installProtectedRouteReturn();
installMetaCapiBridge();
initTikTokPixel();
initBehaviorAnalytics();

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <UIProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppWrapper />
            <AdminModerationCenter />
          </BrowserRouter>
        </ToastProvider>
      </UIProvider>
    </React.StrictMode>
  );
}

// Register Service Worker for performance & offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope)
      })
      .catch((error) => {
        console.log('❌ Service Worker registration failed:', error)
      });
  });
}
