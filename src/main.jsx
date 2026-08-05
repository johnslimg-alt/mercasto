import './lib/notificationPolyfill.js'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppWrapper from './App.jsx'
import AdminOverlays from './components/admin/AdminOverlays.jsx'
import { UIProvider } from './contexts/UIContext.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { initBehaviorAnalytics } from './utils/analytics'
import { installCampaignAttribution } from './utils/campaignAttribution'
import { installProtectedRouteReturn } from './utils/protectedRouteReturn'
import { installStaleChunkRecovery } from './utils/staleChunkRecovery'
// Leaflet CSS is loaded lazily alongside the map bundle (see MapV3 loadLeaflet)
// so it no longer bloats the render-blocking critical stylesheet.
import './index.css'
import './i18n'; // Multi-language support

// Seller acquisition traffic must enter the publication flow directly.
// Preserve query/hash attribution while removing the obsolete landing-page hop.
if (['/vendedores', '/publicar-gratis'].includes(window.location.pathname)) {
  window.history.replaceState(
    window.history.state,
    '',
    `/post${window.location.search}${window.location.hash}`,
  );
}

// Install acquisition attribution before analytics bridges so every downstream
// event keeps its campaign context across registration and SPA navigation.
installCampaignAttribution();
installStaleChunkRecovery();
installProtectedRouteReturn();
scheduleNonCriticalBootstrap();

function scheduleNonCriticalBootstrap() {
  const start = () => {
    const run = () => {
      initBehaviorAnalytics();
      Promise.allSettled([
        import('./utils/metaCapiBridge').then(({ installMetaCapiBridge }) => installMetaCapiBridge()),
        import('./utils/tiktokPixel').then(({ initTikTokPixel }) => initTikTokPixel()),
        import('./utils/paidAdRenewalBridge').then(({ installPaidAdRenewalBridge }) => installPaidAdRenewalBridge()),
        import('./utils/adExpiryCountdown').then(({ installAdExpiryCountdown }) => installAdExpiryCountdown()),
      ]);
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(run, { timeout: 1200 });
    } else {
      window.setTimeout(run, 250);
    }
  };

  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start, { once: true });
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <UIProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppWrapper />
            {/* Admin-only overlays stay out of the public critical path. */}
            <AdminOverlays />
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
