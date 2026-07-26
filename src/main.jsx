import './lib/notificationPolyfill.js'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppWrapper from './App.jsx'
import AdminModerationCenter from './components/admin/AdminModerationCenter.jsx'
import AdvertisingHub from './components/admin/AdvertisingHub.jsx'
import { UIProvider } from './contexts/UIContext.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { initBehaviorAnalytics } from './utils/analytics'
import { installCampaignAttribution } from './utils/campaignAttribution'
import { installMetaCapiBridge } from './utils/metaCapiBridge'
import { initTikTokPixel } from './utils/tiktokPixel'
import { installProtectedRouteReturn } from './utils/protectedRouteReturn'
import { installPublishLocationAutofill } from './utils/publishLocationAutofill'
import { installPaidAdRenewalBridge } from './utils/paidAdRenewalBridge'
import { installAdExpiryCountdown } from './utils/adExpiryCountdown'
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
installPublishLocationAutofill();
installPaidAdRenewalBridge();
installAdExpiryCountdown();
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
            {/* Keep admin overlays inside the shared router/provider tree so they reuse the authenticated admin session. */}
            <AdminModerationCenter />
            <AdvertisingHub />
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
