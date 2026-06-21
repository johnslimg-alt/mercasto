import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFoundScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Página no encontrada | Mercasto';
    let meta = document.querySelector('meta[name="robots"]');
    let created = false;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
      created = true;
    }
    meta.content = 'noindex, nofollow';
    window.scrollTo(0, 0);
    return () => {
      if (meta) {
        meta.remove();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-16">
      {/* Illustration */}
      <div className="relative mb-8 select-none">
        <div className="text-[100px] leading-none text-center filter drop-shadow-sm">🌵</div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-3 bg-amber-200 rounded-full blur-sm opacity-60" />
      </div>

      {/* Error badge */}
      <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-500 text-sm font-mono px-3 py-1.5 rounded-full mb-6">
        Error 404
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-3">
        ¡Ay! Página no encontrada
      </h1>
      <p className="text-slate-500 text-center max-w-md mb-2">
        El anuncio que buscas ya no existe o fue eliminado.
      </p>
      <p className="text-slate-400 text-sm text-center max-w-sm mb-10">
        Puede que el enlace esté desactualizado, el anuncio haya expirado o la URL esté mal escrita.
      </p>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:border-slate-300 hover:shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-5 py-2.5 bg-lime-500 text-white rounded-xl text-sm font-medium hover:bg-lime-600 transition-colors shadow-sm"
        >
          <Home className="w-4 h-4" />
          Ir al inicio
        </button>
        <button
          onClick={() => { navigate('/'); setTimeout(() => { const el = document.querySelector('input[type="search"], input[placeholder*="busca"], input[placeholder*="Busca"]'); if (el) el.focus(); }, 300); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:border-slate-300 hover:shadow-sm transition-all"
        >
          <Search className="w-4 h-4" />
          Buscar anuncios
        </button>
      </div>

      {/* Suggested categories */}
      <div className="mt-12 text-center">
        <p className="text-sm text-slate-400 mb-4">Quizás te interese explorar:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { label: '🚗 Autos', path: '/autos' },
            { label: '🏠 Inmuebles', path: '/inmuebles' },
            { label: '💼 Empleos', path: '/empleos' },
            { label: '🔧 Servicios', path: '/servicios' },
          ].map((cat) => (
            <button
              key={cat.path}
              onClick={() => navigate(cat.path)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-full text-sm hover:border-lime-400 hover:text-lime-700 transition-colors"
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-16 text-xs text-slate-300">
        © 2026 Mercasto México •{' '}
        <button onClick={() => navigate('/terminos')} className="hover:text-slate-400 transition-colors underline underline-offset-2">Términos</button>
        {' '}•{' '}
        <button onClick={() => navigate('/privacidad')} className="hover:text-slate-400 transition-colors underline underline-offset-2">Privacidad</button>
      </p>
    </div>
  );
}
