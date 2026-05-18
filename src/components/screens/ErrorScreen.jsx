import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';

export default function ErrorScreen({ error, resetError }) {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Error | Mercasto';
    window.scrollTo(0, 0);
  }, []);

  const handleRetry = () => {
    if (typeof resetError === 'function') {
      resetError();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-16">
      {/* Illustration */}
      <div className="mb-8 relative select-none">
        <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center shadow-sm">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 bg-red-100 rounded-full blur-sm" />
      </div>

      {/* Badge */}
      <div className="inline-flex items-center gap-2 bg-red-50 text-red-500 text-sm font-mono px-3 py-1.5 rounded-full mb-6 border border-red-100">
        Error del sistema
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-3">
        Algo salió mal
      </h1>
      <p className="text-slate-500 text-center max-w-md mb-2">
        Ocurrió un error inesperado. Nuestro equipo ya fue notificado.
      </p>
      <p className="text-slate-400 text-sm text-center max-w-sm mb-10">
        Puedes intentar recargar la página o volver al inicio. Si el problema persiste, contáctanos en{' '}
        <a href="mailto:soporte@mercasto.com" className="text-lime-600 hover:text-lime-700 underline underline-offset-2">soporte@mercasto.com</a>.
      </p>

      {/* Error detail (dev only) */}
      {error && import.meta.env.DEV && (
        <div className="mb-8 max-w-lg w-full bg-slate-900 rounded-xl p-4 text-left overflow-auto">
          <p className="text-red-400 text-xs font-mono">{error.toString()}</p>
          {error.stack && <p className="text-slate-500 text-xs font-mono mt-2 whitespace-pre-wrap">{error.stack}</p>}
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={handleRetry}
          className="flex items-center gap-2 px-5 py-2.5 bg-lime-500 text-white rounded-xl text-sm font-medium hover:bg-lime-600 transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Intentar de nuevo
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:border-slate-300 hover:shadow-sm transition-all"
        >
          <Home className="w-4 h-4" />
          Ir al inicio
        </button>
      </div>

      <p className="mt-16 text-xs text-slate-300">
        © 2026 Mercasto México •{' '}
        <a href="mailto:soporte@mercasto.com" className="hover:text-slate-400 transition-colors underline underline-offset-2">soporte@mercasto.com</a>
      </p>
    </div>
  );
}
