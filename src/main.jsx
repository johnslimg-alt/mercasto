import './lib/notificationPolyfill.js'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppWrapper from './App.jsx'
import AdminOverlays from './components/admin/AdminOverlays.jsx'
import { UIProvider } from './contexts/UIContext.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { activateAnalyticsVendors, initBehaviorAnalytics, revokeAnalyticsVendors } from './utils/analytics'
import { getVendorConsentState, hasVendorConsent, subscribeTrackingConsent } from './utils/trackingConsent'
import { installCampaignAttribution } from './utils/campaignAttribution'
import { installProtectedRouteReturn } from './utils/protectedRouteReturn'
import { installStaleChunkRecovery } from './utils/staleChunkRecovery'
import './index.css'
import './design-spacing.css'
import './leaflet-dark-overrides.css'
import './catalog-touch-targets.css'
import './tap-target-accessibility.css'
import './mobile-shell-touch-targets.css'
import './header-focus.css'
import './admin-dark-safety.css'
import './components/home/mercasto-golden-home.mobile-fix.css'
import './i18n';

if (window.location.pathname === '/publicar-gratis') {
  window.history.replaceState(
    window.history.state,
    '',
    `/vendedores${window.location.search}${window.location.hash}`,
  );
}

installCampaignAttribution();
installStaleChunkRecovery();
installProtectedRouteReturn();

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
      loadMetaBridge().then(async ({ installMetaCapiBridge }) => {
        installMetaCapiBridge();
        const { installOpenAIAdsBridge } = await import('./utils/openaiAdsBridge');
        installOpenAIAdsBridge();
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
    window.removeEventListener('pointerdown', handlePossibleInteraction, true);
    window.removeEventListener('touchstart', handlePossibleInteraction, true);
    window.removeEventListener('keydown', handlePossibleInteraction, true);
    window.clearTimeout(fallbackTimer);
  };

  function handlePossibleInteraction() {
    if (!hasVendorConsent()) return;
    void activateVendorAnalytics('interaction');
  }

  function activateVendorAnalytics(reason = 'unknown') {
    if (vendorActivationStarted) return false;
    if (!hasVendorConsent()) return false;
    vendorActivationStarted = true;
    window.__mercastoAnalyticsVendorActivationReason = reason;
    removeActivationListeners();

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
    return true;
  }

  window.addEventListener('pointerdown', handlePossibleInteraction, { once: true, capture: true, passive: true });
  window.addEventListener('touchstart', handlePossibleInteraction, { once: true, capture: true, passive: true });
  window.addEventListener('keydown', handlePossibleInteraction, { once: true, capture: true });

  subscribeTrackingConsent((state) => {
    if (state === 'granted') {
      void activateVendorAnalytics('consent-change');
      return;
    }
    if (state === 'denied') {
      revokeAnalyticsVendors();
      vendorActivationStarted = false;
    }
  });

  if (hasVendorConsent()) {
    fallbackTimer = window.setTimeout(() => activateVendorAnalytics('already-granted-fallback'), vendorFallbackMs);
  } else if (getVendorConsentState() === 'denied') {
    revokeAnalyticsVendors();
  }

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
            <AdminOverlays />
          </BrowserRouter>
        </ToastProvider>
      </UIProvider>
    </React.StrictMode>
  );
}

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
