import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle, Loader2, Save } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || '/storage';

const DEFAULT_HOURS = [
  { day: 'Lunes', open: '09:00', close: '18:00', closed: false },
  { day: 'Martes', open: '09:00', close: '18:00', closed: false },
  { day: 'Miércoles', open: '09:00', close: '18:00', closed: false },
  { day: 'Jueves', open: '09:00', close: '18:00', closed: false },
  { day: 'Viernes', open: '09:00', close: '18:00', closed: false },
  { day: 'Sábado', open: '10:00', close: '14:00', closed: false },
  { day: 'Domingo', open: '', close: '', closed: true },
];

function getToken() {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
}

function normalizeHours(hours) {
  if (!Array.isArray(hours) || hours.length === 0) return DEFAULT_HOURS;
  const byDay = new Map(hours.map(item => [item.day, item]));
  return DEFAULT_HOURS.map(defaultItem => ({ ...defaultItem, ...(byDay.get(defaultItem.day) || {}) }));
}

export default function BusinessProfileEditor({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [form, setForm] = useState({
    business_profile_enabled: false,
    business_name: '',
    business_rfc: '',
    business_website: '',
    business_phone: '',
    business_whatsapp: '',
    business_address: '',
    business_description: '',
    business_logo_url: '',
    business_banner_url: '',
    business_hours: DEFAULT_HOURS,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadBusinessProfile() {
      try {
        const response = await fetch(`${API_URL}/user/business-profile`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!response.ok) throw new Error('business-profile-load-failed');
        const data = await response.json();
        if (cancelled) return;
        setForm(prev => ({
          ...prev,
          business_profile_enabled: Boolean(data.enabled),
          business_name: data.business_name || '',
          business_rfc: data.business_rfc || '',
          business_website: data.business_website || '',
          business_phone: data.business_phone || '',
          business_whatsapp: data.business_whatsapp || '',
          business_address: data.business_address || '',
          business_description: data.business_description || '',
          business_logo_url: data.business_logo_url || '',
          business_banner_url: data.business_banner_url || '',
          business_hours: normalizeHours(data.business_hours),
        }));
      } catch {
        if (!cancelled) showToast?.('No se pudo cargar el perfil de negocio', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadBusinessProfile();
    return () => { cancelled = true; };
  }, [showToast]);

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const updateHour = (index, key, value) => setForm(prev => ({
    ...prev,
    business_hours: prev.business_hours.map((item, idx) => idx === index ? { ...item, [key]: value } : item),
  }));

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const body = new FormData();
    body.append('logo', file);
    try {
      const response = await fetch(`${API_URL}/user/business-profile/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body
      });
      const data = await response.json();
      if (response.ok) {
        updateField('business_logo_url', data.business_logo_url);
        showToast?.('Logo de negocio actualizado');
      } else {
        showToast?.(data.message || 'Error al subir el logo', 'error');
      }
    } catch {
      showToast?.('Error al conectar con el servidor', 'error');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleBannerUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    const body = new FormData();
    body.append('banner', file);
    try {
      const response = await fetch(`${API_URL}/user/business-profile/banner`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body
      });
      const data = await response.json();
      if (response.ok) {
        updateField('business_banner_url', data.business_banner_url);
        showToast?.('Banner de portada de negocio actualizado');
      } else {
        showToast?.(data.message || 'Error al subir la portada', 'error');
      }
    } catch {
      showToast?.('Error al conectar con el servidor', 'error');
    } finally {
      setBannerUploading(false);
    }
  };

  const handleSave = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/user/business-profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = data.errors ? Object.values(data.errors).flat().join(' ') : data.message;
        showToast?.(message || 'Error al guardar el perfil de negocio', 'error');
        return;
      }
      showToast?.('Perfil de negocio guardado');
    } catch {
      showToast?.('Error de red al guardar el perfil de negocio', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="business-profile-dark-scope bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400"><Loader2 className="w-4 h-4 inline animate-spin mr-2" />Cargando perfil de negocio...</div>;
  }

  const inputClass = 'border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400';

  return (
    <form onSubmit={handleSave} className="business-profile-dark-scope bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm space-y-5 border border-slate-100 dark:border-slate-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2"><Building2 size={16} className="text-lime-500" /> Perfil de negocio</h2>
          <p className="text-xs text-slate-500 mt-1">Activa una vitrina profesional con horario, dirección y datos de contacto.</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
          <input type="checkbox" checked={form.business_profile_enabled} onChange={event => updateField('business_profile_enabled', event.target.checked)} /> Activar
        </label>
      </div>

      {form.business_profile_enabled && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
          {/* Logo Upload Block */}
          <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
            <label className="block text-xs font-bold text-slate-500 mb-3 text-center">Logo Comercial (PRO)</label>
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden relative group flex items-center justify-center border border-slate-200 dark:border-slate-700">
              {form.business_logo_url ? (
                <img
                  src={form.business_logo_url.startsWith('http') ? form.business_logo_url : `${STORAGE_URL}/${form.business_logo_url}`}
                  className="w-full h-full object-cover"
                  alt="Logo"
                />
              ) : (
                <Building2 className="w-8 h-8 text-slate-300" />
              )}
              {logoUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <input
              type="file"
              id="business-logo-file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <button
              type="button"
              onClick={() => document.getElementById('business-logo-file').click()}
              className="mt-3 text-xs font-bold text-lime-600 hover:text-lime-700 hover:underline"
            >
              Cambiar Logo
            </button>
          </div>

          {/* Banner Upload Block */}
          <div className="md:col-span-2 flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
            <label className="block text-xs font-bold text-slate-500 mb-3 text-center">Banner de Portada (PRO)</label>
            <div className="w-full h-20 bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden relative group flex items-center justify-center border border-slate-200 dark:border-slate-700">
              {form.business_banner_url ? (
                <img
                  src={form.business_banner_url.startsWith('http') ? form.business_banner_url : `${STORAGE_URL}/${form.business_banner_url}`}
                  className="w-full h-full object-cover"
                  alt="Banner"
                />
              ) : (
                <span className="text-xs text-slate-400 font-medium">1200 x 400 píxeles recomendados</span>
              )}
              {bannerUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <input
              type="file"
              id="business-banner-file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleBannerUpload}
            />
            <button
              type="button"
              onClick={() => document.getElementById('business-banner-file').click()}
              className="mt-3 text-xs font-bold text-lime-600 hover:text-lime-700 hover:underline"
            >
              Cambiar Portada
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Nombre comercial *</label>
          <input value={form.business_name} onChange={event => updateField('business_name', event.target.value)} maxLength={120} className={`w-full ${inputClass}`} placeholder="Mercasto Autos Veracruz" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">RFC</label>
          <input value={form.business_rfc} onChange={event => updateField('business_rfc', event.target.value.toUpperCase())} maxLength={13} className={`w-full uppercase ${inputClass}`} placeholder="XAXX010101000" />
          <p className="text-[11px] text-slate-400 mt-1">No se muestra públicamente; solo se muestra el estado de verificación.</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Descripción del negocio</label>
        <textarea value={form.business_description} onChange={event => updateField('business_description', event.target.value)} maxLength={1200} rows={4} className={`w-full resize-none ${inputClass}`} placeholder="Describe qué vendes, zonas de atención y por qué confiar en tu negocio." />
        <p className="text-right text-xs text-slate-400 mt-0.5">{form.business_description.length}/1200</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input type="url" value={form.business_website} onChange={event => updateField('business_website', event.target.value)} className={inputClass} placeholder="Sitio web" />
        <input value={form.business_address} onChange={event => updateField('business_address', event.target.value)} maxLength={255} className={inputClass} placeholder="Dirección" />
        <input type="tel" value={form.business_phone} onChange={event => updateField('business_phone', event.target.value)} maxLength={20} className={inputClass} placeholder="Teléfono negocio" />
        <input type="tel" value={form.business_whatsapp} onChange={event => updateField('business_whatsapp', event.target.value)} maxLength={20} className={inputClass} placeholder="WhatsApp negocio" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-500">Horario</h3>
        {form.business_hours.map((item, index) => (
          <div key={item.day} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-sm">
            <span className="text-slate-600 dark:text-slate-300">{item.day}</span>
            <input type="time" disabled={item.closed} value={item.open || ''} onChange={event => updateHour(index, 'open', event.target.value)} className="border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800" />
            <input type="time" disabled={item.closed} value={item.close || ''} onChange={event => updateHour(index, 'close', event.target.value)} className="border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800" />
            <label className="flex items-center gap-1 text-xs text-slate-500"><input type="checkbox" checked={Boolean(item.closed)} onChange={event => updateHour(index, 'closed', event.target.checked)} /> Cerrado</label>
          </div>
        ))}
      </div>

      <button type="submit" disabled={saving} className="w-full bg-slate-900 hover:bg-black text-white font-semibold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={15} />}
        Guardar perfil de negocio
      </button>

      {form.business_profile_enabled && form.business_name && <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 border border-emerald-100"><CheckCircle size={14} /> Tu vitrina profesional estará visible en tu perfil público.</div>}
    </form>
  );
}
