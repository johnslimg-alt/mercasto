import React, { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { getTranslations } from '../utils/translations';

export function LocalizedRouteLoadError({ translationKey }) {
  const { lang, loadedLangVersion } = useUI();
  void loadedLangVersion;
  const copy = getTranslations(lang);
  return (
    <div className="flex h-screen items-center justify-center p-10 text-center mt-20 text-slate-500">
      {copy[translationKey] || ''}
    </div>
  );
}

function ProtectedRoutePlaceholder({ loading = false }) {
  const { lang, loadedLangVersion } = useUI();
  void loadedLangVersion;
  const t = getTranslations(lang);
  return (
    <section className="flex min-h-[calc(100vh-11rem)] items-center justify-center px-4 py-12" aria-live="polite">
      <div className="flex min-h-56 w-full max-w-md flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-[#84CC16]" aria-label={t.shell_loading_session} />
        ) : (
          <>
            <ShieldCheck className="mb-4 h-10 w-10 text-[#84CC16]" aria-hidden="true" />
            <h1 className="text-xl font-black text-slate-900 dark:text-white">{t.shell_login_continue}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.shell_login_continue_desc}</p>
          </>
        )}
      </div>
    </section>
  );
}

export function RequireAuth({ user, authReady, setAuthMode, setShowAuthModal, admin = false, children }) {
  const hasToken = Boolean(localStorage.getItem('auth_token'));

  useEffect(() => {
    if (authReady && (!user || !hasToken)) {
      setAuthMode('login');
      setShowAuthModal(true);
    }
  }, [authReady, hasToken, setAuthMode, setShowAuthModal, user]);

  if (!authReady) return <ProtectedRoutePlaceholder loading />;
  if (!user || !hasToken) return <ProtectedRoutePlaceholder />;
  if (admin && user.role !== 'admin') return <Navigate to="/profile" replace />;
  return children;
}

export function AuthEntryRoute({ mode, user, authReady, setAuthMode, setShowAuthModal, tagline }) {
  const { lang, loadedLangVersion } = useUI();
  void loadedLangVersion;
  const t = getTranslations(lang);
  const hasToken = Boolean(localStorage.getItem('auth_token'));
  const isRegistration = mode === 'register';

  useEffect(() => {
    if (authReady && (!user || !hasToken)) {
      setAuthMode(mode);
      setShowAuthModal(true);
    }
  }, [authReady, hasToken, mode, setAuthMode, setShowAuthModal, user]);

  if (!authReady) return <ProtectedRoutePlaceholder loading />;
  if (user && hasToken) return <Navigate to="/profile" replace />;

  return (
    <section className="flex min-h-[calc(100vh-11rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-[#84CC16]" aria-hidden="true" />
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          {isRegistration ? `${t.register} · Mercasto` : `${t.login} · Mercasto`}
        </h1>
        <p className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-lime-50 px-3 py-1.5 text-xs font-extrabold text-lime-800 dark:bg-lime-500/10 dark:text-lime-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {tagline || t.ai_brand_tagline}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {isRegistration ? t.auth_register_desc : t.auth_login_desc}
        </p>
        <button type="button" onClick={() => { setAuthMode(mode); setShowAuthModal(true); }} className="btn-lg mt-6 w-full bg-[#84CC16] text-slate-950 hover:bg-[#65A30D]">
          {isRegistration ? t.register : t.login}
        </button>
      </div>
    </section>
  );
}

export function LegacyAccountListingRoute({ suffix }) {
  const { id } = useParams();
  const safeId = encodeURIComponent(String(id || ''));
  const target = suffix === 'photos'
    ? `/anuncio/${safeId}/editar?section=photos`
    : `/anuncio/${safeId}/editar`;
  return <Navigate to={target} replace />;
}

export function ReferralRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    localStorage.setItem('pendingReferral', code);
    navigate('/');
  }, [code, navigate]);
  return null;
}
