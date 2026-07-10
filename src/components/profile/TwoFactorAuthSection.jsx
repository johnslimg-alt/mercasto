import React, { useState } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

function getToken() {
  return localStorage.getItem('auth_token');
}

export default function TwoFactorAuthSection({ user, setUser, t, showToast }) {
  const enabled = Boolean(user?.two_factor_confirmed_at);
  const [step, setStep] = useState('idle'); // idle | setup | done
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/user/two-factor-authentication`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) {
        showToast?.(data.message || t.error_generic || 'Error', 'error');
        return;
      }
      const dataUrl = await QRCode.toDataURL(data.qr_code_url, { width: 220, margin: 2 });
      setQrDataUrl(dataUrl);
      setRecoveryCodes(data.recovery_codes || []);
      setStep('setup');
    } catch (e) {
      showToast?.(t.connection_error || 'Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/user/two-factor-authentication/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast?.(data.message || t.otp_invalid || 'Código incorrecto', 'error');
        return;
      }
      showToast?.(t.twofa_enabled || 'Autenticación en dos pasos activada');
      setStep('done');
      const updatedUser = { ...user, two_factor_confirmed_at: new Date().toISOString() };
      setUser?.(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (e) {
      showToast?.(t.connection_error || 'Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const disable2fa = async () => {
    if (!window.confirm(t.twofa_disable_confirm || '¿Desactivar la autenticación en dos pasos?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/user/two-factor-authentication`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        showToast?.(t.twofa_disabled || 'Autenticación en dos pasos desactivada');
        const updatedUser = { ...user, two_factor_confirmed_at: null };
        setUser?.(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setStep('idle');
        setQrDataUrl(null);
        setRecoveryCodes(null);
      } else {
        showToast?.(t.error_generic || 'Error', 'error');
      }
    } catch (e) {
      showToast?.(t.connection_error || 'Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md pt-6 border-t border-slate-100 dark:border-slate-700">
      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
        <ShieldCheck className="w-4 h-4 text-lime-600" /> {t.twofa_title || 'Autenticación en dos pasos'}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        {t.twofa_desc || 'Añade una capa extra de seguridad con una app como Google Authenticator.'}
      </p>

      {enabled ? (
        <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/30">
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t.twofa_active || 'Activada'}</span>
          <button onClick={disable2fa} disabled={loading} className="btn-sm bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (t.disable || 'Desactivar')}
          </button>
        </div>
      ) : step === 'idle' ? (
        <button onClick={startSetup} disabled={loading} className="btn-sm bg-slate-900 hover:bg-black text-white disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (t.twofa_enable || 'Activar 2FA')}
        </button>
      ) : step === 'setup' ? (
        <div className="space-y-3">
          {qrDataUrl && <img src={qrDataUrl} alt="QR" className="rounded-xl border border-slate-200 dark:border-slate-700" />}
          {recoveryCodes && (
            <div className="text-xs bg-slate-50 dark:bg-slate-800 rounded-xl p-3 font-mono space-y-0.5">
              <p className="font-sans font-bold text-slate-600 dark:text-slate-300 mb-1">{t.twofa_recovery_codes || 'Códigos de recuperación (guárdalos):'}</p>
              {recoveryCodes.map((c, i) => <div key={i}>{c}</div>)}
            </div>
          )}
          <form onSubmit={confirmSetup} className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              placeholder="123456"
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-lime-500/30"
            />
            <button type="submit" disabled={loading || code.length !== 6} className="btn-sm bg-lime-500 hover:bg-lime-600 text-white disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (t.verify || 'Verificar')}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
