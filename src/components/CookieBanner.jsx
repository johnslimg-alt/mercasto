import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';
import {
  OPEN_COOKIE_PREFERENCES_EVENT,
  persistAnalyticsTrackingConsent,
  readCookieConsent,
} from '../utils/trackingConsent';

export default function CookieBanner({ t, lang }) {
  const [visible, setVisible] = useState(false);
  const [decision, setDecision] = useState(() => readCookieConsent());
  const navigate = useNavigate();

  useEffect(() => {
    let timer;

    // Show the banner only if no consent has been stored yet.
    if (!readCookieConsent()) {
      // Small delay so it doesn't flash on first paint
      timer = setTimeout(() => setVisible(true), 800);
    }

    // Consent must stay withdrawable: any "cookie settings" entry point can
    // bring this dialog back, even after a decision was stored.
    const openPreferences = () => {
      setDecision(readCookieConsent());
      setVisible(true);
    };
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, openPreferences);

    return () => {
      clearTimeout(timer);
      window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, openPreferences);
    };
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'all');
    setDecision('all');
    const notify = () => window.dispatchEvent(new CustomEvent('mercasto:tracking-consent'));
    const hasAuth = Boolean(localStorage.getItem('auth_token'));
    const privacyAllowsTracking = localStorage.getItem('mercasto_privacy_tracking_consent') !== 'false';
    if (hasAuth) {
      if (!privacyAllowsTracking) notify();
      void persistAnalyticsTrackingConsent(privacyAllowsTracking).then((synced) => {
        if (privacyAllowsTracking && synced) notify();
      });
    } else {
      notify();
    }
    setVisible(false);
  };

  const essential = () => {
    localStorage.setItem('cookie_consent', 'essential');
    setDecision('essential');
    window.dispatchEvent(new CustomEvent('mercasto:tracking-consent'));
    void persistAnalyticsTrackingConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  const dictionary = t || {};
  const stateLabel = decision === 'all'
    ? (dictionary.cookies_state_all || 'Tu elección actual: aceptaste todas las cookies.')
    : decision === 'essential'
      ? (dictionary.cookies_state_essential || 'Tu elección actual: solo cookies esenciales.')
      : '';

  return (
    <div
      className="fixed bottom-[84px] left-0 right-0 z-50 p-4 md:bottom-0 md:p-5"
      role="dialog"
      aria-label={dictionary.cookies_aria_label}
      aria-live="polite"
      data-testid="cookie-banner"
    >
      <div className="relative max-w-4xl mx-auto bg-[#0F172A] text-white rounded-2xl shadow-2xl border border-white/10 px-5 py-4 pr-12 sm:pr-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <button
          onClick={essential}
          className="absolute top-3 right-3 -m-2 p-4 text-slate-500 hover:text-slate-300 transition-colors rounded-xl hover:bg-white/10"
          aria-label={dictionary.close_btn}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon + text */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 bg-[#0f8f7d]/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
            <Cookie className="w-4 h-4 text-[#8be0d2]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white leading-snug">
              {dictionary.cookies_title}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {dictionary.cookies_desc}{' '}
              <button
                onClick={() => navigate('/cookies')}
                className="text-[#8be0d2] hover:text-[#b6f0e8] underline underline-offset-2 transition-colors"
              >
                {dictionary.learn_more}
              </button>
            </p>
            {stateLabel ? (
              <p className="text-xs text-[#8be0d2] mt-1 leading-relaxed" data-testid="cookie-consent-state">
                {stateLabel}
              </p>
            ) : null}
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2 flex-shrink-0 w-full sm:flex sm:w-auto sm:pr-9">
          <button
            onClick={essential}
            data-testid="cookie-essential"
            className="px-3 sm:px-4 py-2 text-xs font-medium text-slate-300 bg-white/10 hover:bg-white/15 rounded-xl transition-colors border border-white/10"
          >
            {dictionary.cookies_essential}
          </button>
          <button
            onClick={accept}
            data-testid="cookie-accept-all"
            className="px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-[#0b6f61] hover:bg-[#085147] rounded-xl transition-colors shadow-sm"
          >
            {dictionary.cookies_accept_all}
          </button>
        </div>
      </div>
    </div>
  );
}
