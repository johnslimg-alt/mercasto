import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export default function VerificarEmailScreen() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      setStatus('error');
      setMessage(t('verification.invalidLink', { defaultValue: 'The verification link is invalid.' }));
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
          setMessage(data.message || t('verification.success', { defaultValue: 'Email verified successfully.' }));
        } else {
          setStatus('error');
          setMessage(data.error || t('verification.expired', { defaultValue: 'The token is invalid or expired.' }));
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage(t('errors.networkError'));
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
            <h1 className="text-xl font-bold text-slate-900">{t('verification.checking', { defaultValue: 'Verifying your email...' })}</h1>
            <p className="text-slate-500 text-sm">{t('common.loading')}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-lime-500 mx-auto" />
            <h1 className="text-xl font-bold text-slate-900">{t('verification.verified', { defaultValue: 'Email verified' })}</h1>
            <p className="text-slate-600 text-sm">{message}</p>
            <p className="text-slate-500 text-sm">
              {t('verification.badge', { defaultValue: 'Your profile now displays the verified email badge.' })}
            </p>
            <Link
              to="/"
              className="inline-block mt-2 px-6 py-2.5 bg-lime-500 hover:bg-lime-600 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {t('home.home', { defaultValue: 'Go to Mercasto' })}
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto" />
            <h1 className="text-xl font-bold text-slate-900">{t('verification.failed', { defaultValue: 'Verification failed' })}</h1>
            <p className="text-slate-600 text-sm">{message}</p>
            <p className="text-slate-500 text-sm">
              {t('verification.retry', { defaultValue: 'Log in and request a new verification link.' })}
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
