import './lib/notificationPolyfill.js'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppWrapper from './App.jsx'
import AdminOverlays from './components/admin/AdminOverlays.jsx'
import { UIProvider } from './contexts/UIContext.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { activateAnalyticsVendors, initBehaviorAnalytics } from './utils/analytics'
import { installCampaignAttribution } from './utils/campaignAttribution'
import { installProtectedRouteReturn } from './utils/protectedRouteReturn'
import { installStaleChunkRecovery } from './utils/staleChunkRecovery'
// Leaflet CSS is loaded lazily alongside the map bundle (see MapV3 loadLeaflet)
// so it no longer bloats the render-blocking critical stylesheet.
import './index.css'
// This must stay unlayered: dynamically loaded Leaflet vendor CSS is unlayered too.
// Our more-specific dark selectors then win the author cascade without !important.
import './leaflet-dark-overrides.css'
import './catalog-touch-targets.css'
import './mobile-shell-touch-targets.css'
import './header-focus.css'
import './admin-dark-safety.css'
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

// Anonymous seller traffic already sits on /post while the auth modal is open.
// Warm the lazy publication chunk now so a successful registration can reveal
// the form immediately instead of paying the cold chunk load after auth state flips.
if (window.location.pathname === '/post') {
  void import('./components/screens/PostScreen');
}

scheduleNonCriticalBootstrap();

function scheduleNonCriticalBootstrap() {
  const vendorFallbackMs = 12000;
  let bootstrapPromise;
  let metaBridgePromise;
  let vendorActivationStarted = false;
  let fallbackTimer;

  const loadMetaBridge = () => (
    metaBridgePromise ||= import('./utils/metaCapiBridge')
  );

  const bootstrapFirstPartyAnalytics = () => {
    if (bootstrapPromise) return bootstrapPromise;

    initBehaviorAnalytics();
    bootstrapPromise = Promise.allSettled([
      loadMetaBridge().then(({ installMetaCapiBridge }) => {
        installMetaCapiBridge();
      }),
      import('./utils/paidAdRenewalBridge').then(({ installPaidAdRenewalBridge }) => {
        installPaidAdRenewalBridge();
      }),
      import('./utils/adExpiryCountdown').then(({ installAdExpiryCountdown }) => {
        installAdExpiryCountdown();
      }),
    ]);
    return bootstrapPromise;
  };

  const removeActivationListeners = () => {
    window.removeEventListener('pointerdown', activateVendorAnalytics, true);
    window.removeEventListener('touchstart', activateVendorAnalytics, true);
    window.removeEventListener('keydown', activateVendorAnalytics, true);
    window.clearTimeout(fallbackTimer);
  };

  function activateVendorAnalytics() {
    if (vendorActivationStarted) return;
    vendorActivationStarted = true;
    removeActivationListeners();

    // Install first-party listeners synchronously so the interaction that woke
    // analytics is still captured. Heavy vendor scripts load after the bridge
    // chunk is ready, and queued events are replayed with their original IDs.
    const firstPartyReady = bootstrapFirstPartyAnalytics();
    window.setTimeout(async () => {
      await firstPartyReady;
      activateAnalyticsVendors();

      const [metaBridge, tiktokPixel] = await Promise.all([
        loadMetaBridge(),
        import('./utils/tiktokPixel'),
      ]);
      metaBridge.replayMetaBrowserEvents();
      const { initTikTokPixel } = tiktokPixel;
      initTikTokPixel();
    }, 0);
  }

  window.addEventListener('pointerdown', activateVendorAnalytics, { once: true, capture: true, passive: true });
  window.addEventListener('touchstart', activateVendorAnalytics, { once: true, capture: true, passive: true });
  window.addEventListener('keydown', activateVendorAnalytics, { once: true, capture: true });
  fallbackTimer = window.setTimeout(activateVendorAnalytics, vendorFallbackMs);
  window.__mercastoAnalyticsVendorActivationScheduled = true;

  const start = () => {
    const run = () => {
      void bootstrapFirstPartyAnalytics();
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
