import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, User, Globe, Lock, Bell, Trash2, ChevronLeft, CheckCircle, AlertCircle, MapPin, Phone, Save } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';
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
      <span className="text-sm text-slate-700">{label}</span>
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

const MEXICAN_CITIES = [
  { state: 'Ciudad de México', cities: ['Ciudad de México', 'Álvaro Obregón', 'Coyoacán', 'Cuauhtémoc', 'Iztapalapa', 'Gustavo A. Madero', 'Xochimilco'] },
  { state: 'Estado de México', cities: ['Ecatepec', 'Naucalpan', 'Tlalnepantla', 'Chimalhuacán', 'Nezahualcóyotl', 'Toluca', 'Texcoco', 'Atizapán'] },
  { state: 'Jalisco', cities: ['Guadalajara', 'Zapopan', 'Tonalá', 'Tlaquepaque', 'Puerto Vallarta'] },
  { state: 'Nuevo León', cities: ['Monterrey', 'San Nicolás', 'Guadalupe', 'San Pedro Garza García', 'Apodaca'] },
  { state: 'Puebla', cities: ['Puebla', 'Tehuacán', 'San Andrés Cholula', 'Atlixco'] },
  { state: 'Veracruz', cities: ['Veracruz', 'Xalapa', 'Coatzacoalcos', 'Boca del Río', 'Orizaba'] },
  { state: 'Guanajuato', cities: ['León', 'Guanajuato', 'Irapuato', 'Celaya', 'Salamanca'] },
  { state: 'Chihuahua', cities: ['Chihuahua', 'Ciudad Juárez', 'Delicias', 'Parral'] },
  { state: 'Baja California', cities: ['Tijuana', 'Mexicali', 'Ensenada', 'Rosarito'] },
  { state: 'Sonora', cities: ['Hermosillo', 'Ciudad Obregón', 'Nogales', 'San Luis Río Colorado'] },
  { state: 'Sinaloa', cities: ['Culiacán', 'Mazatlán', 'Los Mochis', 'Guasave'] },
  { state: 'Coahuila', cities: ['Saltillo', 'Torreón', 'Monclova', 'Piedras Negras'] },
  { state: 'Tamaulipas', cities: ['Reynosa', 'Matamoros', 'Nuevo Laredo', 'Tampico', 'Ciudad Victoria'] },
  { state: 'Oaxaca', cities: ['Oaxaca', 'Salina Cruz', 'Juchitán', 'Tuxtepec'] },
  { state: 'Guerrero', cities: ['Acapulco', 'Chilpancingo', 'Iguala', 'Zihuatanejo'] },
  { state: 'Yucatán', cities: ['Mérida', 'Valladolid', 'Progreso', 'Tizimín'] },
  { state: 'Quintana Roo', cities: ['Cancún', 'Playa del Carmen', 'Tulum', 'Chetumal', 'Cozumel'] },
  { state: 'Michoacán', cities: ['Morelia', 'Lázaro Cárdenas', 'Uruapan', 'Zamora'] },
  { state: 'Hidalgo', cities: ['Pachuca', 'Tulancingo', 'Tizayuca', 'Ixmiquilpan'] },
  { state: 'Tabasco', cities: ['Villahermosa', 'Cárdenas', 'Comalcalco', 'Paraíso'] },
  { state: 'Chiapas', cities: ['Tuxtla Gutiérrez', 'San Cristóbal de las Casas', 'Tapachula', 'Comitán'] },
  { state: 'San Luis Potosí', cities: ['San Luis Potosí', 'Soledad de Graciano Sánchez', 'Ciudad Valles'] },
  { state: 'Querétaro', cities: ['Querétaro', 'San Juan del Río', 'Corregidora'] },
  { state: 'Morelos', cities: ['Cuernavaca', 'Jiutepec', 'Cuautla', 'Temixco'] },
  { state: 'Aguascalientes', cities: ['Aguascalientes', 'Calvillo', 'Rincón de Romos'] },
  { state: 'Durango', cities: ['Durango', 'Gómez Palacio', 'Lerdo'] },
  { state: 'Zacatecas', cities: ['Zacatecas', 'Fresnillo', 'Guadalupe'] },
  { state: 'Nayarit', cities: ['Tepic', 'Bahía de Banderas', 'Compostela'] },
  { state: 'Tlaxcala', cities: ['Tlaxcala', 'Apizaco', 'Huamantla'] },
  { state: 'Campeche', cities: ['Campeche', 'Ciudad del Carmen', 'Champotón'] },
  { state: 'Colima', cities: ['Colima', 'Manzanillo', 'Tecomán'] },
  { state: 'Baja California Sur', cities: ['La Paz', 'Los Cabos', 'Comondú'] },
];

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

  // Form state
  const [form, setForm] = useState({ name: '', bio: '', city: '', phone_number: '', whatsapp: '', website: '', social_instagram: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [notifForm, setNotifForm] = useState({ email_new_message: true, email_ad_reply: true, push_enabled: false });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const token = getToken();
    if (!token) { navigate('/'); return; }
    fetch(`${API_URL}/user/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setProfile(data);
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
            const np = typeof data.notification_preferences === 'string'
              ? JSON.parse(data.notification_preferences)
              : data.notification_preferences;
            setNotifForm(prev => ({ ...prev, ...np }));
          } catch {}
        }
        setAvatarPreview(getAvatarSrc(data.avatar_url));
      })
      .catch(() => { showToast('Error al cargar el perfil', 'error'); setLoading(false); })
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const r = await fetch(`${API_URL}/user/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await r.json();
      if (r.ok) {
        setAvatarPreview(getAvatarSrc(data.avatar_url));
        showToast('Foto actualizada');
      } else {
        showToast(data.message || 'Error al subir la foto', 'error');
      }
    } catch {
      showToast('Error de red al subir la foto', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/user/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (r.ok) {
        showToast('Perfil guardado correctamente');
        setProfile(prev => ({ ...prev, ...data }));
      } else {
        const msgs = data.errors ? Object.values(data.errors).flat().join(' ') : data.message;
        showToast(msgs || 'Error al guardar', 'error');
      }
    } catch {
      showToast('Error de red', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showToast('Las contraseñas no coinciden', 'error'); return;
    }
    if (passwordForm.new_password.length < 8) {
      showToast('La contraseña debe tener al menos 8 caracteres', 'error'); return;
    }
    setSaving(true);
    try {
      const body = { new_password: passwordForm.new_password };
      if (passwordForm.current_password) body.current_password = passwordForm.current_password;
      const r = await fetch(`${API_URL}/user/password`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (r.ok) {
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

  const handleSaveNotifications = async () => {
    try {
      const r = await fetch(`${API_URL}/user/notifications`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(notifForm),
      });
      if (r.ok) showToast('Preferencias guardadas');
      else showToast('Error al guardar preferencias', 'error');
    } catch {
      showToast('Error de red', 'error');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin" />
    </div>
  );

  const isOAuth = profile?.is_oauth_only;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-lime-500'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-semibold text-slate-900">Editar perfil</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Avatar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 ring-4 ring-white shadow">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 text-3xl font-bold">
                  {(profile?.name || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
            {avatarUploading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-lime-500 hover:bg-lime-600 rounded-full flex items-center justify-center shadow text-white"
            >
              <Camera size={14} />
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          <button onClick={() => fileInputRef.current?.click()} className="text-sm text-lime-600 font-medium hover:underline">
            Cambiar foto
          </button>
          {profile?.member_since && (
            <p className="text-xs text-slate-400">Miembro desde {profile.member_since}</p>
          )}
        </div>

        {/* Basic info */}
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><User size={16} className="text-lime-500" /> Información básica</h2>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nombre completo *</label>
            <input
              type="text" required maxLength={255}
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Biografía</label>
            <textarea
              rows={3} maxLength={1000}
              value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              placeholder="Cuéntanos algo sobre ti..."
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 resize-none"
            />
            <p className="text-right text-xs text-slate-400 mt-0.5">{form.bio.length}/1000</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1"><MapPin size={11} className="inline mr-1" />Ciudad</label>
            <select
              value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white"
            >
              <option value="">Sin especificar</option>
              {MEXICAN_CITIES.map(g => (
                <optgroup key={g.state} label={g.state}>
                  {g.cities.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1"><Phone size={11} className="inline mr-1" />Teléfono</label>
              <input
                type="tel" maxLength={20}
                value={form.phone_number} onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))}
                placeholder="+52 55 1234 5678"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">WhatsApp</label>
              <input
                type="tel" maxLength={20}
                value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
                placeholder="+52 55 1234 5678"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-lime-500 hover:bg-lime-600 text-white font-semibold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
            Guardar información
          </button>
        </form>

        {/* Links */}
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Globe size={16} className="text-lime-500" /> Redes y sitio web</h2>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Sitio web</label>
            <input
              type="url" maxLength={255}
              value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
              placeholder="https://mi-sitio.com"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Instagram</label>
            <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-lime-400">
              <span className="px-3 text-slate-400 text-sm bg-slate-50 border-r border-slate-300 py-2.5">@</span>
              <input
                type="text" maxLength={100}
                value={form.social_instagram} onChange={e => setForm(p => ({ ...p, social_instagram: e.target.value.replace(/^@/, '') }))}
                placeholder="usuario"
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-lime-500 hover:bg-lime-600 text-white font-semibold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
            Guardar enlaces
          </button>
        </form>

        {/* Password — hidden for OAuth accounts */}
        {!isOAuth && (
          <form onSubmit={handleSavePassword} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Lock size={16} className="text-lime-500" /> Cambiar contraseña</h2>

            {profile?.password_set && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Contraseña actual</label>
                <input
                  type="password"
                  value={passwordForm.current_password} onChange={e => setPasswordForm(p => ({ ...p, current_password: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nueva contraseña</label>
              <input
                type="password" minLength={8} required
                value={passwordForm.new_password} onChange={e => setPasswordForm(p => ({ ...p, new_password: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Confirmar contraseña</label>
              <input
                type="password" required
                value={passwordForm.confirm_password} onChange={e => setPasswordForm(p => ({ ...p, confirm_password: e.target.value }))}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 ${passwordForm.confirm_password && passwordForm.confirm_password !== passwordForm.new_password ? 'border-red-400' : 'border-slate-300'}`}
              />
              {passwordForm.confirm_password && passwordForm.confirm_password !== passwordForm.new_password && (
                <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            <button type="submit" disabled={saving} className="w-full bg-lime-500 hover:bg-lime-600 text-white font-semibold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock size={15} />}
              Actualizar contraseña
            </button>
          </form>
        )}

        {/* Notifications */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Bell size={16} className="text-lime-500" /> Notificaciones</h2>
          <div className="space-y-3">
            <Toggle
              value={notifForm.email_new_message}
              onChange={v => setNotifForm(p => ({ ...p, email_new_message: v }))}
              label="Correo cuando reciba un mensaje"
            />
            <Toggle
              value={notifForm.email_ad_reply}
              onChange={v => setNotifForm(p => ({ ...p, email_ad_reply: v }))}
              label="Correo cuando alguien pregunte por mi anuncio"
            />
          </div>
          <button onClick={handleSaveNotifications} className="w-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl py-2.5 text-sm">
            Guardar preferencias
          </button>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100 space-y-3">
          <h2 className="font-semibold text-red-700 flex items-center gap-2"><Trash2 size={16} /> Zona de peligro</h2>
          <p className="text-sm text-slate-600">Eliminar tu cuenta es una acción permanente. Todos tus anuncios y datos serán eliminados.</p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full border border-red-300 text-red-600 hover:bg-red-50 font-medium rounded-xl py-2.5 text-sm"
          >
            Eliminar mi cuenta
          </button>
        </div>

      </div>

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-slate-900 text-lg mb-2">¿Eliminar tu cuenta?</h3>
            <p className="text-sm text-slate-600 mb-4">Esta acción es irreversible. Escribe <strong>ELIMINAR</strong> para confirmar.</p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }} className="flex-1 border border-slate-300 rounded-xl py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                disabled={deleteConfirmText !== 'ELIMINAR'}
                onClick={async () => {
                  const r = await fetch(`${API_URL}/user`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${getToken()}` },
                  });
                  if (r.ok) {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('token');
                    window.location.href = '/';
                  } else {
                    showToast('Error al eliminar la cuenta', 'error');
                    setShowDeleteModal(false);
                  }
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
