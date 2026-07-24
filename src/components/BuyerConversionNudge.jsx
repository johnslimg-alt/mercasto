import React, { useEffect, useState } from 'react';
import { MessageCircle, ShieldCheck, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'mercasto.buyer_conversion_nudge.dismissed_at';
const DISMISS_FOR_MS = 24 * 60 * 60 * 1000;

export default function BuyerConversionNudge() {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hasSession = Boolean(localStorage.getItem('auth_token'));
    const hiddenRoute = ['/login', '/register', '/post', '/profile', '/admin'].some((path) =>
      location.pathname.startsWith(path)
    );
    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) || 0);
    const recentlyDismissed = Date.now() - dismissedAt < DISMISS_FOR_MS;

    if (hasSession || hiddenRoute || recentlyDismissed) {
      setVisible(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setVisible(true), 4500);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  };

  const register = () => {
    try {
      sessionStorage.setItem('mercasto.buyer_registration_intent', location.pathname + location.search);
    } catch {}
    window.dispatchEvent(new CustomEvent('mercasto:open-auth', { detail: { mode: 'register' } }));
    navigate(location.pathname, { replace: true });
  };

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-xl rounded-2xl border border-lime-300 bg-slate-950 p-4 text-white shadow-2xl md:bottom-6 md:p-5" role="dialog" aria-label="Beneficios para compradores">
      <button type="button" onClick={dismiss} className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Cerrar">
        <X className="h-5 w-5" />
      </button>
      <div className="pr-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-lime-300">Compra directo, sin comisión</p>
        <h2 className="mt-1 text-lg font-black leading-tight">Regístrate gratis y habla directamente con los vendedores</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
          <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-lime-300" /> Contacta por WhatsApp o Telegram</span>
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-lime-300" /> Guarda favoritos y vuelve cuando quieras</span>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={register} className="rounded-xl bg-lime-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-lime-300">Crear cuenta gratis</button>
          <button type="button" onClick={dismiss} className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">Seguir explorando</button>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Mercasto no cobra comisión por contactar al vendedor. Verifica siempre el producto y acuerda una entrega segura.</p>
      </div>
    </aside>
  );
}
