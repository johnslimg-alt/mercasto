import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Bell, Camera, CheckCircle, ChevronLeft, Globe, Lock, MapPin, Phone, Save, Trash2, User } from 'lucide-react';
import BusinessProfileEditor from '../profile/BusinessProfileEditor';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || '/storage';

function getToken() {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
}

function getAvatarSrc(url) {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${STORAGE_URL}/${url}`;
}

function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${value ? 'bg-lime-500' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </label>
  );
}

export default function ProfileEditScreen() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [toast, setToast] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [form, setForm] = useState({ name: '', bio: '', city: '', phone_number: '', whatsapp: '', website: '', social_instagram: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [notifForm, setNotifForm] = useState({ email_new_message: true, email_ad_reply: true, push_enabled: false });
  const [phoneInput, setPhoneInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const cardClass = 'bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800';
  const inputClass = 'w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/30';
  const headingClass = 'font-semibold text-slate-800 dark:text-white flex items-center gap-2';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/');
      return;
    }

    fetch(`${API_URL}/user/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.ok ? response.json() : Promise.reject(response.status))
      .then(data => {
        setProfile(data);
        setPhoneInput(data.phone_number || '');
        setForm({
          name: data.name || '',
          bio: data.bio || '',
          city: data.city || '',
          phone_number: data.phone_number || '',
          whatsapp: data.whatsapp || '',
          website: data.website || '',
          social_instagram: data.social_instagram || '',
        });
        if (data.notification_preferences) {
          try {
            const preferences = typeof data.notification_preferences === 'string'
              ? JSON.parse(data.notification_preferences)
              : data.notification_preferences;
            setNotifForm(prev => ({ ...prev, ...preferences }));
          } catch {}
        }
        setAvatarPreview(getAvatarSrc(data.avatar_url));
      })
      .catch(() => showToast('Error al cargar el perfil', 'error'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleAvatarChange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);
    const body = new FormData();
    body.append('avatar', file);
    try {
      const response = await fetch(`${API_URL}/user/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body,
      });
      const data = await response.json();
      if (response.ok) {
        setAvatarPreview(getAvatarSrc(data.avatar_url));
        showToast('Foto actualizada');
      } else {
        showToast(data.message || 'Error al subir la foto', 'error');
      }
    } catch {
      showToast('Error de red al subir la foto', 'error');
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  };

  const handleSaveProfile = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/user/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (response.ok) {
        showToast('Perfil guardado correctamente');
        setProfile(prev => ({ ...prev, ...data }));
      } else {
        const message = data.errors ? Object.values(data.errors).flat().join(' ') : data.message;
        showToast(message || 'Error al guardar', 'error');
      }
    } catch {
      showToast('Error de red', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async event => {
    event.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      showToast('La contraseña debe tener al menos 8 caracteres', 'error');
      return;
    }
    setSaving(true);
    try {
      const body = { new_password: passwordForm.new_password };
      if (passwordForm.current_password) body.current_password = passwordForm.current_password;
      const response = await fetch(`${API_URL}/user/password`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (response.ok) {
        showToast('Contraseña actualizada');
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        showToast(data.message || 'Error al cambiar la contraseña', 'error');
      }
    } catch {
      showToast('Error de red', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phoneInput || phoneInput.length < 10) {
      showToast('Ingresa un número válido (mín. 10 dígitos)', 'error');
      return;
    }
    setPhoneVerifying(true);
    try {
      const response = await fetch(`${API_URL}/phone/send-otp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput }),
      });
      const data = await response.json();
      if (response.ok) {
        setOtpSent(true);
        showToast('Código enviado. Revisa tu teléfono.');
      } else {
        showToast(data.error || 'Error al enviar el código', 'error');
      }
    } catch {
      showToast('Error de red', 'error');
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpInput.length !== 6) {
      showToast('El código debe tener 6 dígitos', 'error');
      return;
    }
    setPhoneVerifying(true);
    try {
      const response = await fetch(`${API_URL}/phone/verify-otp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpInput }),
      });
      const data = await response.json();
      if (response.ok) {
        showToast(data.message || '¡Teléfono verificado!');
        setProfile(prev => ({ ...prev, phone_verified: true, phone_number: phoneInput }));
        setOtpSent(false);
        setOtpInput('');
      } else {
        showToast(data.error || 'Código incorrecto', 'error');
      }
    } catch {
      showToast('Error de red', 'error');
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      const response = await fetch(`${API_URL}/user/notifications`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(notifForm),
      });
      showToast(response.ok ? 'Preferencias guardadas' : 'Error al guardar preferencias', response.ok ? 'success' : 'error');
    } catch {
      showToast('Error de red', 'error');
    }
  };

  if (loading) {
    return <div className="profile-dark-scope min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin" /></div>;
  }

  const isOAuth = profile?.is_oauth_only;

  return (
    <div className="profile-dark-scope min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-lime-500'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"><ChevronLeft size={20} /></button>
          <h1 className="font-semibold text-slate-900 dark:text-white">Editar perfil</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className={`${cardClass} flex flex-col items-center gap-4`}>
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 ring-4 ring-white dark:ring-slate-800 shadow">
              {avatarPreview ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full flex items-center justify-center bg-lime-100 dark:bg-lime-500/15 text-lime-600 dark:text-lime-300 text-3xl font-bold">{(profile?.name || 'U')[0].toUpperCase()}</div>}
            </div>
            {avatarUploading && <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-8 h-8 bg-lime-500 hover:bg-lime-600 rounded-full flex items-center justify-center shadow text-white"><Camera size={14} /></button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-lime-600 font-medium hover:underline">Cambiar foto</button>
          {profile?.member_since && <p className="text-xs text-slate-400">Miembro desde {profile.member_since}</p>}
        </div>

        <form onSubmit={handleSaveProfile} className={`${cardClass} space-y-4`}>
          <h2 className={headingClass}><User size={16} className="text-lime-500" /> Información básica</h2>
          <input required maxLength={255} value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} className={inputClass} placeholder="Nombre completo" />
          <textarea rows={3} maxLength={1000} value={form.bio} onChange={event => setForm(prev => ({ ...prev, bio: event.target.value }))} className={`${inputClass} resize-none`} placeholder="Biografía" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input maxLength={120} value={form.city} onChange={event => setForm(prev => ({ ...prev, city: event.target.value }))} className={inputClass} placeholder="Ciudad" />
            <input type="tel" maxLength={20} value={form.phone_number} onChange={event => setForm(prev => ({ ...prev, phone_number: event.target.value }))} className={inputClass} placeholder="Teléfono" />
            <input type="tel" maxLength={20} value={form.whatsapp} onChange={event => setForm(prev => ({ ...prev, whatsapp: event.target.value }))} className={inputClass} placeholder="WhatsApp" />
            <input type="url" maxLength={255} value={form.website} onChange={event => setForm(prev => ({ ...prev, website: event.target.value }))} className={inputClass} placeholder="Sitio web" />
          </div>
          <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
            <span className="px-3 text-slate-400 text-sm bg-slate-50 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-700 py-2.5">@</span>
            <input maxLength={100} value={form.social_instagram} onChange={event => setForm(prev => ({ ...prev, social_instagram: event.target.value.replace(/^@/, '') }))} className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400" placeholder="Instagram" />
          </div>
          <button type="submit" disabled={saving} className="w-full bg-lime-500 hover:bg-lime-600 text-white font-semibold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={15} />} Guardar información</button>
        </form>

        <BusinessProfileEditor showToast={showToast} />

        <div className={`${cardClass} space-y-4`}>
          <h2 className={headingClass}><Phone size={16} className="text-lime-500" /> Verificación de teléfono</h2>
          {profile?.phone_verified ? (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-4 py-3"><CheckCircle size={18} /><span className="text-sm font-medium">{profile.phone_number} — Verificado ✓</span></div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">Verifica tu teléfono para ganar confianza con los compradores. Recibirás un código SMS.</p>
              {!otpSent ? (
                <div className="flex gap-2"><input type="tel" placeholder="+52 55 1234 5678" value={phoneInput} onChange={event => setPhoneInput(event.target.value)} className={`${inputClass} flex-1`} /><button type="button" onClick={handleSendOtp} disabled={phoneVerifying} className="bg-lime-500 hover:bg-lime-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl whitespace-nowrap">Enviar código</button></div>
              ) : (
                <div className="space-y-3"><input inputMode="numeric" maxLength={6} placeholder="123456" value={otpInput} onChange={event => setOtpInput(event.target.value.replace(/\D/g, ''))} className={`${inputClass} text-center text-2xl tracking-widest font-mono`} /><button type="button" onClick={handleVerifyOtp} disabled={phoneVerifying || otpInput.length !== 6} className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl">Verificar</button></div>
              )}
            </div>
          )}
        </div>

        {!isOAuth && (
          <form onSubmit={handleSavePassword} className={`${cardClass} space-y-4`}>
            <h2 className={headingClass}><Lock size={16} className="text-lime-500" /> Cambiar contraseña</h2>
            {profile?.password_set && <input type="password" value={passwordForm.current_password} onChange={event => setPasswordForm(prev => ({ ...prev, current_password: event.target.value }))} className={inputClass} placeholder="Contraseña actual" />}
            <input type="password" minLength={8} required value={passwordForm.new_password} onChange={event => setPasswordForm(prev => ({ ...prev, new_password: event.target.value }))} className={inputClass} placeholder="Nueva contraseña" />
            <input type="password" required value={passwordForm.confirm_password} onChange={event => setPasswordForm(prev => ({ ...prev, confirm_password: event.target.value }))} className={inputClass} placeholder="Confirmar contraseña" />
            <button type="submit" disabled={saving} className="w-full bg-lime-500 hover:bg-lime-600 text-white font-semibold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60"><Lock size={15} /> Actualizar contraseña</button>
          </form>
        )}

        <div className={`${cardClass} space-y-4`}>
          <h2 className={headingClass}><Bell size={16} className="text-lime-500" /> Notificaciones</h2>
          <Toggle value={notifForm.email_new_message} onChange={value => setNotifForm(prev => ({ ...prev, email_new_message: value }))} label="Correo cuando reciba un mensaje" />
          <Toggle value={notifForm.email_ad_reply} onChange={value => setNotifForm(prev => ({ ...prev, email_ad_reply: value }))} label="Correo cuando alguien pregunte por mi anuncio" />
          <button type="button" onClick={handleSaveNotifications} className="w-full border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-xl py-2.5 text-sm">Guardar preferencias</button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-red-100 dark:border-red-500/20 space-y-3">
          <h2 className="font-semibold text-red-700 flex items-center gap-2"><Trash2 size={16} /> Zona de peligro</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Eliminar tu cuenta es una acción permanente.</p>
          <button type="button" onClick={() => setShowDeleteModal(true)} className="w-full border border-red-300 text-red-600 hover:bg-red-50 font-medium rounded-xl py-2.5 text-sm">Eliminar mi cuenta</button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2">¿Eliminar tu cuenta?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Esta acción es irreversible. Escribe <strong>ELIMINAR</strong> para confirmar.</p>
            <input value={deleteConfirmText} onChange={event => setDeleteConfirmText(event.target.value)} placeholder="ELIMINAR" className={`${inputClass} mb-4`} />
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }} className="flex-1 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
              <button type="button" disabled={deleteConfirmText !== 'ELIMINAR'} onClick={async () => {
                const response = await fetch(`${API_URL}/user`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
                if (response.ok) {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('token');
                  window.location.href = '/';
                } else {
                  showToast('Error al eliminar la cuenta', 'error');
                  setShowDeleteModal(false);
                }
              }} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
