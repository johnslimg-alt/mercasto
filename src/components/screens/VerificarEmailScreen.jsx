import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { loadI18nLanguage } from '../../i18n';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export default function VerificarEmailScreen() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const { t, i18n } = useTranslation();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    let cancelled = false;

    const verifyEmail = async () => {
      const language = String(i18n.language || 'es').toLowerCase().split('-')[0];
      await loadI18nLanguage(language);
      if (cancelled) return;
      const localT = i18n.getFixedT(language);

      if (!token || !email) {
        setStatus('error');
        setMessage(localT('verification.invalidLink'));
        return;
      }

      try {
        const res = await fetch(`${API_URL}/email/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.ok) {
          setStatus('success');
          setMessage(localT('verification.success'));
        } else {
          setStatus('error');
          setMessage(localT('verification.expired'));
        }
      } catch {
        if (cancelled) return;
        setStatus('error');
        setMessage(localT('errors.networkError'));
      }
    };

    verifyEmail();
    return () => { cancelled = true; };
  }, [email, i18n, token]);

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
            <h1 className="text-xl font-bold text-slate-900">{t('verification.checking')}</h1>
            <p className="text-slate-500 text-sm">{t('common.loading')}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-lime-500 mx-auto" />
            <h1 className="text-xl font-bold text-slate-900">{t('verification.verified')}</h1>
            <p className="text-slate-600 text-sm">{message}</p>
            <p className="text-slate-500 text-sm">
              {t('verification.badge')}
            </p>
            <Link
              to="/"
              className="inline-block mt-2 px-6 py-2.5 bg-lime-500 hover:bg-lime-600 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {t('verification.home')}
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto" />
            <h1 className="text-xl font-bold text-slate-900">{t('verification.failed')}</h1>
            <p className="text-slate-600 text-sm">{message}</p>
            <p className="text-slate-500 text-sm">
              {t('verification.retry')}
            </p>
            <Link
              to="/"
              className="inline-block mt-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {t('common.back')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
