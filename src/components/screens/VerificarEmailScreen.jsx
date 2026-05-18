import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function VerificarEmailScreen() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      setStatus('error');
      setMessage('El enlace de verificación no es válido. Faltan parámetros.');
      return;
    }

    fetch(`${API_URL}/email/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.ok) {
          setStatus('success');
          setMessage(data.message || '¡Email verificado correctamente!');
        } else {
          setStatus('error');
          setMessage(data.error || 'Token inválido o expirado.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('No se pudo conectar con el servidor. Inténtalo de nuevo.');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 max-w-md w-full text-center space-y-5">
        {/* Logo area */}
        <div className="flex justify-center mb-2">
          <div className="w-14 h-14 rounded-2xl bg-lime-50 flex items-center justify-center">
            <Mail className="w-7 h-7 text-lime-600" />
          </div>
        </div>

        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 text-lime-500 animate-spin mx-auto" />
            <h1 className="text-xl font-bold text-slate-900">Verificando tu correo…</h1>
            <p className="text-slate-500 text-sm">Solo un momento.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-lime-500 mx-auto" />
            <h1 className="text-xl font-bold text-slate-900">¡Correo verificado!</h1>
            <p className="text-slate-600 text-sm">{message}</p>
            <p className="text-slate-500 text-sm">
              Tu cuenta ahora muestra la insignia de email verificado ✉️ en tu perfil.
            </p>
            <Link
              to="/"
              className="inline-block mt-2 px-6 py-2.5 bg-lime-500 hover:bg-lime-600 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              Ir a Mercasto
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto" />
            <h1 className="text-xl font-bold text-slate-900">Verificación fallida</h1>
            <p className="text-slate-600 text-sm">{message}</p>
            <p className="text-slate-500 text-sm">
              Inicia sesión y solicita un nuevo enlace desde el aviso en la parte superior de la página.
            </p>
            <Link
              to="/"
              className="inline-block mt-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              Volver al inicio
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
