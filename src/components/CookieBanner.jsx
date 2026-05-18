import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Show banner only if no consent has been stored yet
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Small delay so it doesn't flash on first paint
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'all');
    setVisible(false);
  };

  const essential = () => {
    localStorage.setItem('cookie_consent', 'essential');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-5"
      role="dialog"
      aria-label="Aviso de cookies"
      aria-live="polite"
    >
      <div className="max-w-4xl mx-auto bg-[#0F172A] text-white rounded-2xl shadow-2xl border border-white/10 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Icon + text */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 bg-lime-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
            <Cookie className="w-4 h-4 text-lime-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white leading-snug">
              Usamos cookies para mejorar tu experiencia.
            </p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Algunas son esenciales; otras nos ayudan a entender cómo usas Mercasto.{' '}
              <button
                onClick={() => navigate('/cookies')}
                className="text-lime-400 hover:text-lime-300 underline underline-offset-2 transition-colors"
              >
                Más información
              </button>
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <button
            onClick={essential}
            className="flex-1 sm:flex-none px-4 py-2 text-xs font-medium text-slate-300 bg-white/10 hover:bg-white/15 rounded-xl transition-colors border border-white/10"
          >
            Solo esenciales
          </button>
          <button
            onClick={accept}
            className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-white bg-lime-500 hover:bg-lime-400 rounded-xl transition-colors shadow-sm"
          >
            Aceptar todas
          </button>
          <button
            onClick={essential}
            className="p-2 text-slate-500 hover:text-slate-300 transition-colors rounded-xl hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
