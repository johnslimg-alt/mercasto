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
// Leaflet CSS is loaded lazily alongside the map bundle (see MapV3 loadLeaflet)
// so it no longer bloats the render-blocking critical stylesheet.
import './index.css'
// This must stay unlayered: dynamically loaded Leaflet vendor CSS is unlayered too.
// Our more-specific dark selectors then win the author cascade without !important.
import './leaflet-dark-overrides.css'
import './catalog-touch-targets.css'
// WCAG 2.5.8 (AA) text-sized navigation targets (footer links, home "see all").
// Unlayered on purpose so it beats the Tailwind utilities it has to coexist with.
import './tap-target-accessibility.css'
import './mobile-shell-touch-targets.css'
import './header-focus.css'
import './admin-dark-safety.css'
import './i18n'; // Multi-language support

// Keep /vendedores as the canonical seller acquisition landing page.
// Canonicalize only the legacy alias before React mounts, preserving campaign attribution.
if (window.location.pathname === '/publicar-gratis') {
  window.history.replaceState(
    window.history.state,
    '',
    `/vendedores${window.location.search}${window.location.hash}`,
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
  // Analytics vendors stay off the critical render path: they load on the first
  // real interaction, or after this fallback. The fallback is only armed when a
  // grant is already stored — it can never bypass consent.
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

  // Interaction only defers vendor loading for performance. It is never a
  // substitute for consent, so the capture-phase listeners below cannot start
  // a vendor before the visitor has decided (P0 privacy regression).
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
    return true;
  }

  window.addEventListener('pointerdown', handlePossibleInteraction, { once: true, capture: true, passive: true });
  window.addEventListener('touchstart', handlePossibleInteraction, { once: true, capture: true, passive: true });
  window.addEventListener('keydown', handlePossibleInteraction, { once: true, capture: true });

  // The old unconditional 12s fallback timer is intentionally gone: without a
  // recorded decision nothing may load. Consent changes are handled here instead.
  subscribeTrackingConsent((state) => {
    if (state === 'granted') {
      void activateVendorAnalytics('consent-change');
      return;
    }
    if (state === 'denied') {
      // Refusal or withdrawal must stop every vendor already on the page.
      revokeAnalyticsVendors();
      // A later grant may start the (still consent gated) vendors again.
      vendorActivationStarted = false;
    }
  });

  // Returning visitors who already granted consent keep the previous timing:
  // first interaction, or this consent-aware fallback. Without a recorded
  // decision the timer is never armed, so nothing can load.
  if (hasVendorConsent()) {
    fallbackTimer = window.setTimeout(() => activateVendorAnalytics('already-granted-fallback'), vendorFallbackMs);
  } else if (getVendorConsentState() === 'denied') {
    // A visitor who already refused starts clean: drop stale vendor cookies and
    // make sure no vendor state can be resumed without a new grant.
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
