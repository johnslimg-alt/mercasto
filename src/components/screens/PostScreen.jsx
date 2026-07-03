import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusCircle, ChevronRight, ChevronLeft, Trash2, Camera, Loader2,
  Sparkles, Video, MapPin, Tag, Zap, Car, Home, Briefcase,
  ShoppingBag, Dog, Monitor, Smartphone, Shirt, Baby, Dumbbell,
  BookOpen, Package, Cpu, Settings2, Ticket, Building2, Check,
  Phone, MessageCircle, Send, Locate,
} from 'lucide-react';
import { mexicoLocations, subcategoriesMap } from '../../constants/locationsAndCategories';
import MapV3 from '../common/MapV3';
import SortablePhotoGrid from '../SortablePhotoGrid';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

const MEXICO_STATES = Object.keys(mexicoLocations);

/* ============================== TOKENS ============================== */
const INK = "#1C1B19";
const BG = "#F7F5EE";
const TEAL = "#0E6E6B";
const PINK = "#D6336C";
const LINE = "#E4E0D4";
const FONT_HEAD = "'Fraunces', Georgia, serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";

const STEP_LABELS = ['Categoría', 'Detalles', 'Contacto'];

const CATEGORY_ICONS = {
  coches: Car, motor: Car, inmobiliaria: Home, empleo: Briefcase,
  servicios: Settings2, moda: Shirt, hogar: Home, electronica: Monitor,
  telefonos: Smartphone, deportes: Dumbbell, infantil: Baby, bebes: Baby,
  mascotas: Dog, negocios: Building2, formacion: BookOpen,
  informatica: Cpu, coleccionismo: Package,
};

// Фасеты публикации — сохраняются в form.attributes (filterConfig) и используются фильтрами поиска
// (доставки нет: продажа напрямую покупатель↔продавец).
const SALE_FACETS = [
  { key: 'listing_type', label: 'Tipo de anuncio', options: ['Venta', 'Renta', 'Renta con opción a compra', 'Traspaso', 'Gratis', 'Intercambio'] },
  { key: 'payment_method', label: 'Pago aceptado', options: ['Efectivo', 'Transferencia SPEI', 'Tarjeta de crédito', 'Tarjeta de débito', 'Pago seguro (escrow)', 'PayPal', 'Criptomonedas'] },
  { key: 'warranty', label: 'Garantía', options: ['Sin garantía', 'Con garantía', 'Garantía de fábrica', '30 días de garantía', '90 días de garantía', '1 año de garantía'] },
  { key: 'negotiable', label: 'Precio', options: ['Precio fijo', 'Negociable', 'Acepto ofertas'] },
  { key: 'seller_response', label: 'Respuesta al comprador', options: ['Responde rápido (< 1 hora)', 'Responde hoy', 'Atiende por chat', 'Atiende por teléfono'] },
];

const CONTACT_METHODS = [
  { id: 'phone', label: 'Teléfono', icon: Phone, hint: 'Llamadas' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, hint: 'Mensajes' },
  { id: 'telegram', label: 'Telegram', icon: Send, hint: 'Usuario' },
];

const selectClass = "w-full min-h-[48px] rounded-xl border px-4 py-3 text-[15px] outline-none transition-shadow cursor-pointer bg-white";
const inputClass = "w-full min-h-[48px] rounded-xl border px-4 py-3 text-[15px] outline-none transition-shadow bg-white";
const focusHandlers = {
  onFocus: (e) => { e.target.style.borderColor = TEAL; e.target.style.boxShadow = `0 0 0 3px ${TEAL}22`; },
  onBlur: (e) => { e.target.style.borderColor = LINE; e.target.style.boxShadow = "none"; },
};

function Field({ label, optional, required, children }) {
  return (
    <div className="w-full" style={{ fontFamily: FONT_BODY }}>
      {label && (
        <label className="block text-sm font-medium mb-1.5" style={{ color: INK }}>
          {label}{required && <span style={{ color: PINK }}> *</span>}{optional && <span className="opacity-50 font-normal"> (opcional)</span>}
        </label>
      )}
      {children}
    </div>
  );
}

function Stepper({ step }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6 md:mb-8" style={{ fontFamily: FONT_BODY }}>
      {STEP_LABELS.map((s, i) => {
        const n = i + 1;
        const active = step === n, done = step > n;
        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors"
                style={{
                  background: done ? TEAL : active ? INK : "#FFF",
                  color: done || active ? "#FFF" : "#8A867B",
                  border: done || active ? "none" : `1.5px solid ${LINE}`,
                }}
              >
                {done ? <Check size={16} /> : n}
              </div>
              <span className="mt-1.5 text-[11px] md:text-xs font-medium" style={{ color: active ? INK : "#8A867B" }}>{s}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className="mx-2 md:mx-4 mb-5 h-[2px] w-10 md:w-20 rounded" style={{ background: step > n ? TEAL : LINE }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PostScreen({
  categoriesData,
  editingAd,
  form,
  handleImageChange,
  handlePostSubmit,
  images,
  isMapUpdating,
  lang,
  postLoading,
  removeImage,
  removeImageById,
  reorderImages,
  setEditingAd,
  setForm,
  setVideoFile,
  t,
  videoFile,
  aiLoading,
  handleGenerateDescription,
  user,
  setUser,
}) {
  const [step, setStep] = useState(1);
  const [apiAttributes, setApiAttributes] = useState(null);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [customCity, setCustomCity] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [savingContact, setSavingContact] = useState(false);

  /* ---------- contact step state ---------- */
  const [contactMethods, setContactMethods] = useState(() => {
    const methods = [];
    if (user?.phone_number) methods.push('phone');
    if (user?.whatsapp) methods.push('whatsapp');
    if (user?.telegram_username) methods.push('telegram');
    return methods.length ? methods : ['whatsapp'];
  });
  const [waMode, setWaMode] = useState('phone');
  const [phoneValue, setPhoneValue] = useState(user?.phone_number || user?.whatsapp || '');
  const [waUsername, setWaUsername] = useState('');
  const [telegramValue, setTelegramValue] = useState(user?.telegram_username || '');

  // Reset city mode when state changes
  useEffect(() => {
    setCustomCity(false);
  }, [form.state]);

  // Fetch dynamic attributes from API when category changes
  useEffect(() => {
    if (!form.category) {
      setApiAttributes(null);
      setAttributesLoading(false);
      return;
    }
    let cancelled = false;
    setAttributesLoading(true);
    fetch(`${API_URL}/category-attributes?category=${encodeURIComponent(form.category)}`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (!cancelled) setApiAttributes(Array.isArray(data) && data.length > 0 ? data : null);
      })
      .catch(() => { if (!cancelled) setApiAttributes(null); })
      .finally(() => { if (!cancelled) setAttributesLoading(false); });
    return () => { cancelled = true; };
  }, [form.category]);

  // Prune stale attribute keys when category's attribute list changes
  const dynamicAttributes = useMemo(() => apiAttributes || [], [apiAttributes]);

  useEffect(() => {
    if (!form.category || dynamicAttributes.length === 0 || !form.attributes) return;
    const validKeys = new Set(dynamicAttributes.map(f => f.id || f.key));
    SALE_FACETS.forEach(f => validKeys.add(f.key));
    const pruned = Object.fromEntries(
      Object.entries(form.attributes).filter(([k]) => validKeys.has(k))
    );
    if (Object.keys(pruned).length !== Object.keys(form.attributes).length) {
      setForm(prev => ({ ...prev, attributes: pruned }));
    }
  }, [dynamicAttributes, form.category]);

  // Set GPS coords
  const setCoords = (lat, lng) => {
    setForm(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      location: prev.location || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    }));
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está soportada por tu navegador.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords(pos.coords.latitude, pos.coords.longitude); setGpsLoading(false); },
      () => { setGpsLoading(false); alert('No se pudo obtener la ubicación. Asegúrate de dar permisos de GPS.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Step navigation with JS validation
  const goNext = () => {
    if (step === 1) {
      if (!form.category) { alert('Selecciona una categoría.'); return; }
      const subs = subcategoriesMap[form.category] || [];
      if (subs.length > 0 && !form.subcategory) { alert('Selecciona una subcategoría.'); return; }
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 2) {
      const errs = {};
      if (!form.title?.trim()) errs.title = 'El título es obligatorio.';
      if (!form.price) errs.price = 'El precio es obligatorio.';
      if (!form.description?.trim()) errs.description = 'La descripción es obligatoria.';
      // Validate required dynamic attributes
      dynamicAttributes.forEach(field => {
        const key = field.id || field.key;
        if (field.required && !form.attributes?.[key]) {
          errs[`attr_${key}`] = `${field.label || key} es obligatorio.`;
        }
      });
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
      setErrors({});
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goBack = () => { setStep(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const mapQuery = form.location || form.state || 'México';

  const phoneDigitsOk = (phoneValue || '').replace(/\D/g, '').length === 10;
  const step3Valid = !!form.state && !!form.location && contactMethods.length > 0
    && (!contactMethods.includes('phone') || phoneDigitsOk)
    && (!contactMethods.includes('whatsapp') || (waMode === 'username' ? !!waUsername.trim() : phoneDigitsOk))
    && (!contactMethods.includes('telegram') || !!telegramValue.trim());

  /* ---------- submit: sync contact info to profile, then publish ---------- */
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!step3Valid) return;

    const nextPhone = contactMethods.includes('phone') || (contactMethods.includes('whatsapp') && waMode === 'phone') ? phoneValue : (user?.phone_number || '');
    const nextWhatsapp = contactMethods.includes('whatsapp') ? (waMode === 'username' ? `@${waUsername.replace(/^@/, '')}` : phoneValue) : (user?.whatsapp || '');
    const whatsappChanged = nextWhatsapp !== (user?.whatsapp || '');
    const phoneChanged = nextPhone !== (user?.phone_number || '');

    if (user && (whatsappChanged || phoneChanged)) {
      setSavingContact(true);
      try {
        const token = localStorage.getItem('auth_token');
        const profileData = new FormData();
        profileData.append('name', user.name || '');
        if (nextWhatsapp) profileData.append('whatsapp', nextWhatsapp);
        if (nextPhone) profileData.append('phone_number', nextPhone);
        const res = await fetch(`${API_URL}/user/profile`, {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: profileData
        });
        if (res.ok && setUser) {
          const updatedUser = await res.json();
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } catch (err) { console.error('Contact sync error', err); }
      finally { setSavingContact(false); }
    }

    handlePostSubmit(e);
  };

  // Render a dynamic attribute field
  const renderAttrField = (field) => {
    const key = field.id || field.key;
    const val = form.attributes?.[key] || '';
    const errKey = `attr_${key}`;
    const hasErr = !!errors[errKey];
    const onChange = v => setForm(prev => ({ ...prev, attributes: { ...(prev.attributes || {}), [key]: v } }));

    if (field.type === 'select' && field.options?.length > 0) {
      return (
        <Field key={key} label={field.label || key} required={field.required}>
          <select value={val} onChange={e => onChange(e.target.value)} className={selectClass} style={{ borderColor: hasErr ? PINK : LINE }}>
            <option value="">Seleccionar...</option>
            {field.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          {hasErr && <p className="text-xs mt-1" style={{ color: PINK }}>{errors[errKey]}</p>}
        </Field>
      );
    }
    if (field.type === 'number' || field.type === 'range') {
      return (
        <Field key={key} label={field.label || key} required={field.required}>
          <input type="number" value={val} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} className={inputClass} style={{ borderColor: hasErr ? PINK : LINE }} {...focusHandlers} />
          {hasErr && <p className="text-xs mt-1" style={{ color: PINK }}>{errors[errKey]}</p>}
        </Field>
      );
    }
    return (
      <Field key={key} label={field.label || key} required={field.required}>
        <input type="text" value={val} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} className={inputClass} style={{ borderColor: hasErr ? PINK : LINE }} {...focusHandlers} />
        {hasErr && <p className="text-xs mt-1" style={{ color: PINK }}>{errors[errKey]}</p>}
      </Field>
    );
  };

  return (
    <div className="min-h-screen pb-28 md:pb-12" style={{ background: BG, fontFamily: FONT_BODY, color: INK }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600;700&display=swap');`}</style>

      <main className="mx-auto max-w-3xl px-4 py-6 md:py-10">
        <h1
          className="mb-1 text-center text-2xl md:text-3xl font-bold flex items-center justify-center gap-2 cursor-pointer"
          style={{ fontFamily: FONT_HEAD }}
          onClick={() => editingAd && setEditingAd(null)}
        >
          {editingAd ? (t.edit_ad || 'Editar anuncio') : (t.post_title || 'Publica tu anuncio')}
        </h1>
        <p className="mb-6 text-center text-sm" style={{ color: '#8A867B' }}>Gratis y en pocos minutos</p>

        <Stepper step={step} />

        {/* KEY FIX: noValidate disables browser HTML5 validation */}
        <form onSubmit={handleFinalSubmit} noValidate className="rounded-2xl border bg-white p-5 md:p-8 space-y-6" style={{ borderColor: LINE }}>

          {/* ══════════════ STEP 1 — Categoría ══════════════ */}
          {step === 1 && (
            <div className="space-y-6">
              <Field label="Categoría">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categoriesData.map(cat => {
                    const Icon = CATEGORY_ICONS[cat.slug] || Tag;
                    const selected = form.category === cat.slug;
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => setForm({ ...form, category: cat.slug, subcategory: '', attributes: {} })}
                        className="flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all"
                        style={{
                          borderColor: selected ? TEAL : LINE,
                          borderWidth: selected ? 2 : 1,
                          background: selected ? `${TEAL}0D` : '#FFF',
                        }}
                      >
                        <Icon size={24} style={{ color: selected ? TEAL : '#8A867B' }} />
                        <span className="text-[13px] font-semibold mt-2" style={{ color: INK }}>
                          {cat.name?.[lang] || cat.name?.es || cat.slug}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              {form.category && (subcategoriesMap[form.category] || []).length > 0 && (
                <Field label="Subcategoría">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(subcategoriesMap[form.category] || []).map(sub => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setForm({ ...form, subcategory: sub })}
                        className="p-3 rounded-xl border text-center transition-all text-xs font-semibold"
                        style={{
                          borderColor: form.subcategory === sub ? TEAL : LINE,
                          borderWidth: form.subcategory === sub ? 2 : 1,
                          background: form.subcategory === sub ? `${TEAL}0D` : '#FFF',
                          color: form.subcategory === sub ? TEAL : INK,
                        }}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
            </div>
          )}

          {/* ══════════════ STEP 2 — Detalles ══════════════ */}
          {step === 2 && (
            <div className="space-y-6">
              <Field label={t.ad_title || 'Título del anuncio'}>
                <input
                  value={form.title}
                  onChange={e => { setForm({ ...form, title: e.target.value }); if (errors.title) setErrors(p => ({ ...p, title: null })); }}
                  className={inputClass} style={{ borderColor: errors.title ? PINK : LINE }} {...focusHandlers}
                  placeholder="Ej: Honda Civic 2018"
                />
                {errors.title && <p className="text-xs mt-1" style={{ color: PINK }}>{errors.title}</p>}
              </Field>

              {/* PHOTOS */}
              <Field label={t.ad_photos || 'Fotos'}>
                <span className="block -mt-1 mb-2 text-xs" style={{ color: '#8A867B' }}>{images.length}/10</span>
                {images.length > 0 ? (
                  <div className="w-full space-y-3">
                    <SortablePhotoGrid photos={images} onReorder={reorderImages} onDelete={removeImageById || removeImage} />
                    {images.length < 10 && (
                      <label className="aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer w-full py-4" style={{ borderColor: LINE }}>
                        <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
                        <Camera style={{ color: TEAL }} size={22} />
                        <span className="text-xs font-medium mt-1" style={{ color: TEAL }}>Agregar</span>
                      </label>
                    )}
                  </div>
                ) : (
                  <label className="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer h-40 md:h-48" style={{ borderColor: LINE }}>
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: `${TEAL}0D` }}>
                      <Camera style={{ color: TEAL }} size={28} />
                    </div>
                    <p className="text-[14px] font-medium" style={{ color: INK }}>{t.drag_photos_hint || 'Arrastra tus fotos aquí o'} <span style={{ color: TEAL }}>{t.browse_label || 'explora'}</span></p>
                    <p className="text-[12px] mt-1" style={{ color: '#8A867B' }}>{t.max_photos_hint || 'Máximo 10 fotos (JPG, PNG)'}</p>
                  </label>
                )}
              </Field>

              {/* VIDEO */}
              <Field label={t.video_hint || 'Video (opcional, MP4, máx. 50MB)'}>
                {videoFile ? (
                  <div className="flex items-center gap-3 p-2 rounded-xl border" style={{ borderColor: LINE }}>
                    <Video style={{ color: '#8A867B' }} />
                    <span className="text-sm truncate flex-1">{videoFile.name}</span>
                    <button type="button" onClick={() => setVideoFile(null)} style={{ color: PINK }}><Trash2 size={16} /></button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 p-3 border border-dashed rounded-xl cursor-pointer" style={{ borderColor: LINE }}>
                    <input type="file" accept="video/mp4,video/quicktime" onChange={e => setVideoFile(e.target.files[0])} className="hidden" />
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border" style={{ borderColor: LINE }}>
                      <Video style={{ color: TEAL }} size={20} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[13px] font-bold" style={{ color: INK }}>{t.video_opt || 'Subir video'}</p>
                      <p className="text-[11px]" style={{ color: '#8A867B' }}>{t.no_file_selected || 'Sin archivo seleccionado'}</p>
                    </div>
                  </label>
                )}
              </Field>

              {/* CONDITION + PRICE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label={t.condition || 'Estado'}>
                  <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} className={selectClass} style={{ borderColor: LINE }}>
                    <option value="nuevo">{t.new || 'Nuevo'}</option>
                    <option value="usado">{t.used || 'Usado'}</option>
                  </select>
                </Field>
                <Field label={t.ad_price || 'Precio'}>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px]" style={{ color: '#8A867B' }}>$</span>
                    <input
                      type="number"
                      value={form.price}
                      onChange={e => { setForm({ ...form, price: e.target.value }); if (errors.price) setErrors(p => ({ ...p, price: null })); }}
                      className={inputClass} style={{ borderColor: errors.price ? PINK : LINE, paddingLeft: '2.6rem' }} {...focusHandlers}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.price && <p className="text-xs mt-1" style={{ color: PINK }}>{errors.price}</p>}
                </Field>
              </div>

              {/* DYNAMIC ATTRIBUTES */}
              {form.category && (attributesLoading || dynamicAttributes.length > 0) && (
                <div className="border rounded-2xl p-5" style={{ borderColor: LINE, background: `${TEAL}05` }}>
                  <h3 className="text-[14px] font-bold mb-4 flex items-center gap-2" style={{ fontFamily: FONT_HEAD, color: INK }}>
                    <Zap size={16} style={{ color: TEAL }} />
                    {t.ad_attributes || 'Características del anuncio'}
                    {attributesLoading && <Loader2 size={14} className="animate-spin" style={{ color: '#8A867B' }} />}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dynamicAttributes.map(field => renderAttrField(field))}
                  </div>
                </div>
              )}

              {/* DETALLES DE VENTA (фасеты для фильтров поиска) */}
              <div className="border rounded-2xl p-5" style={{ borderColor: LINE, background: `${TEAL}05` }}>
                <h3 className="text-[14px] font-bold mb-4 flex items-center gap-2" style={{ fontFamily: FONT_HEAD, color: INK }}>
                  <Zap size={16} style={{ color: TEAL }} />
                  {t.sale_details || 'Detalles de venta'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SALE_FACETS.map(f => (
                    <Field key={f.key} label={f.label}>
                      <select
                        value={form.attributes?.[f.key] || ''}
                        onChange={e => setForm(prev => ({ ...prev, attributes: { ...(prev.attributes || {}), [f.key]: e.target.value } }))}
                        className={selectClass} style={{ borderColor: LINE }}
                      >
                        <option value="">{t.select_optional || 'Seleccionar (opcional)...'}</option>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </Field>
                  ))}
                </div>
              </div>

              {/* DESCRIPTION */}
              <Field label={t.ad_desc || 'Descripción'}>
                <div className="flex items-center justify-end mb-2">
                  {handleGenerateDescription && (
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={aiLoading}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium disabled:opacity-50 transition-colors"
                      style={{ color: TEAL }}
                    >
                      {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      {t.generate_ai || 'Generar con IA'}
                    </button>
                  )}
                </div>
                <textarea
                  value={form.description}
                  onChange={e => { setForm({ ...form, description: e.target.value }); if (errors.description) setErrors(p => ({ ...p, description: null })); }}
                  className="w-full rounded-xl border px-4 py-3 text-[15px] outline-none h-32 resize-none"
                  style={{ borderColor: errors.description ? PINK : LINE }} {...focusHandlers}
                  placeholder={t.ad_desc || 'Describe tu artículo...'}
                />
                {errors.description && <p className="text-xs mt-1" style={{ color: PINK }}>{errors.description}</p>}
              </Field>
            </div>
          )}

          {/* ══════════════ STEP 3 — Contacto ══════════════ */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 text-lg font-bold" style={{ fontFamily: FONT_HEAD, color: INK }}>Ubicación</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label={t.state || 'Estado'} required>
                    <select
                      value={form.state || ''}
                      onChange={e => {
                        setForm({ ...form, state: e.target.value, city: '', location: e.target.value });
                        setCustomCity(false);
                      }}
                      className={selectClass} style={{ borderColor: LINE }}
                    >
                      <option value="">{t.select_state || 'Seleccionar estado'}</option>
                      {MEXICO_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>

                  {form.state && (
                    <Field label={t.city || 'Ciudad'} required>
                      {customCity ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={form.city || ''}
                            onChange={e => {
                              const v = e.target.value;
                              setForm(prev => ({ ...prev, city: v, location: v ? `${v}, ${prev.state}` : prev.state }));
                            }}
                            placeholder="Escribe el nombre de tu ciudad"
                            className={inputClass} style={{ borderColor: LINE }} {...focusHandlers}
                          />
                          <button
                            type="button"
                            onClick={() => { setCustomCity(false); setForm(prev => ({ ...prev, city: '' })); }}
                            className="px-3 py-2 border rounded-xl text-xs font-semibold whitespace-nowrap"
                            style={{ borderColor: LINE, color: '#8A867B' }}
                          >
                            Elegir de la lista
                          </button>
                        </div>
                      ) : (
                        <select
                          value={form.city || ''}
                          onChange={e => {
                            const v = e.target.value;
                            if (v === 'otro') {
                              setCustomCity(true);
                              setForm(prev => ({ ...prev, city: '' }));
                            } else {
                              setForm(prev => ({ ...prev, city: v, location: v ? `${v}, ${prev.state}` : prev.state }));
                            }
                          }}
                          className={selectClass} style={{ borderColor: LINE }}
                        >
                          <option value="">{t.select_city || 'Seleccionar ciudad'}</option>
                          {(mexicoLocations[form.state] || []).map(c => <option key={c} value={c}>{c}</option>)}
                          <option value="otro">Otro (escribir manualmente)...</option>
                        </select>
                      )}
                    </Field>
                  )}
                </div>

                <Field label={t.location || 'Dirección específica / ubicación'}>
                  <div className="relative mt-1.5 mb-3">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#8A867B' }} size={18} />
                    <input
                      value={form.location || ''}
                      onChange={e => setForm({ ...form, location: e.target.value })}
                      className={inputClass} style={{ borderColor: LINE, paddingLeft: '2.6rem' }} {...focusHandlers}
                      placeholder={t.loc_placeholder || 'Escribe tu dirección o haz clic en el mapa'}
                    />
                  </div>
                </Field>

                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleGPS}
                    disabled={gpsLoading}
                    className="px-4 py-2.5 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 text-white"
                    style={{ background: TEAL }}
                  >
                    {gpsLoading ? <Loader2 size={14} className="animate-spin" /> : <Locate size={14} />}
                    Usar GPS actual
                  </button>
                </div>

                <p className="text-[12px] mb-2" style={{ color: '#8A867B' }}>{t.tap_map_hint || 'Toca el mapa para marcar la ubicación exacta de tu anuncio.'}</p>
                <div className="w-full h-64 rounded-xl overflow-hidden border relative" style={{ borderColor: LINE, background: '#EFEDE4' }}>
                  {isMapUpdating && <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(247,245,238,.6)' }}><Loader2 className="w-8 h-8 animate-spin" style={{ color: TEAL }} /></div>}
                  <MapV3
                    locationPicker
                    showFullscreen={false}
                    locationQuery={mapQuery}
                    markers={form.latitude && form.longitude ? [{ label: t.selected_label || 'Seleccionado', coords: [Number(form.latitude), Number(form.longitude)], tone: 'lime' }] : []}
                    onLocationSelect={({ lat, lng }) => setForm(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                    className="h-full rounded-none border-0 shadow-none"
                  />
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-lg font-bold" style={{ fontFamily: FONT_HEAD, color: INK }}>¿Cómo te contactan?</h2>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {CONTACT_METHODS.map((m) => {
                    const sel = contactMethods.includes(m.id);
                    return (
                      <button key={m.id} type="button"
                        onClick={() => setContactMethods(sel ? contactMethods.filter((x) => x !== m.id) : [...contactMethods, m.id])}
                        className="flex min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-sm font-semibold transition-colors"
                        style={{ borderColor: sel ? TEAL : LINE, borderWidth: sel ? 2 : 1, background: sel ? `${TEAL}0D` : '#FFF', color: sel ? TEAL : INK }}>
                        <m.icon size={20} />
                        {m.label}
                        <span className="text-[10px] font-normal" style={{ color: '#8A867B' }}>{m.hint}</span>
                      </button>
                    );
                  })}
                </div>

                {contactMethods.includes('whatsapp') && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: INK }}>WhatsApp: ¿cómo te escriben?</label>
                    <div className="inline-flex rounded-xl border p-1" style={{ borderColor: LINE, background: '#FFF' }}>
                      {[{ id: 'phone', label: 'Número de teléfono' }, { id: 'username', label: 'Usuario (@usuario)' }].map((opt) => (
                        <button key={opt.id} type="button" onClick={() => setWaMode(opt.id)}
                          className="min-h-[40px] rounded-lg px-4 text-sm font-semibold transition-colors"
                          style={{ background: waMode === opt.id ? TEAL : 'transparent', color: waMode === opt.id ? '#FFF' : INK }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {(contactMethods.includes('phone') || (contactMethods.includes('whatsapp') && waMode === 'phone')) && (
                    <Field label="Teléfono (10 dígitos)">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px]" style={{ color: '#8A867B' }}>+52</span>
                        <input type="tel" value={phoneValue} onChange={(e) => setPhoneValue(e.target.value.replace(/[^\d\s-]/g, ''))}
                          placeholder="55 1234 5678" className={inputClass} style={{ borderColor: LINE, paddingLeft: '3rem' }} {...focusHandlers} />
                      </div>
                      {contactMethods.includes('whatsapp') && waMode === 'phone' && (
                        <p className="mt-1 text-xs" style={{ color: '#8A867B' }}>Se usará también para WhatsApp</p>
                      )}
                    </Field>
                  )}
                  {contactMethods.includes('whatsapp') && waMode === 'username' && (
                    <Field label="Usuario de WhatsApp">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px]" style={{ color: '#8A867B' }}>@</span>
                        <input value={waUsername} onChange={(e) => setWaUsername(e.target.value.replace(/^@/, ''))} placeholder="usuario"
                          className={inputClass} style={{ borderColor: LINE, paddingLeft: '1.8rem' }} {...focusHandlers} />
                      </div>
                    </Field>
                  )}
                  {contactMethods.includes('telegram') && (
                    <Field label="Usuario de Telegram">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px]" style={{ color: '#8A867B' }}>@</span>
                        <input value={telegramValue} onChange={(e) => setTelegramValue(e.target.value.replace(/^@/, ''))} placeholder="usuario"
                          className={inputClass} style={{ borderColor: LINE, paddingLeft: '1.8rem' }} {...focusHandlers} />
                      </div>
                    </Field>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* NAV (desktop) */}
          <div className="hidden md:flex gap-3 justify-between pt-4">
            {step > 1 ? (
              <button type="button" onClick={goBack} className="flex min-h-[50px] items-center justify-center gap-1.5 rounded-xl border px-6 text-[15px] font-semibold"
                style={{ borderColor: LINE, color: INK, background: '#FFF' }}>
                <ChevronLeft size={18} /> Atrás
              </button>
            ) : <div />}
            {step < 3 ? (
              <button type="button" onClick={goNext}
                className="flex min-h-[50px] items-center justify-center gap-1.5 rounded-xl px-8 text-[15px] font-semibold text-white"
                style={{ background: TEAL }}>
                Siguiente <ChevronRight size={18} />
              </button>
            ) : (
              <button type="submit" disabled={postLoading || savingContact || !step3Valid}
                className="flex min-h-[50px] items-center justify-center gap-2 rounded-xl px-8 text-[15px] font-semibold text-white disabled:opacity-50"
                style={{ background: PINK }}>
                {(postLoading || savingContact)
                  ? <Loader2 className="animate-spin" size={20} />
                  : <><Sparkles size={18} /> {editingAd ? (t.save_changes || 'Guardar cambios') : t.publish_btn}</>}
              </button>
            )}
          </div>
        </form>
      </main>

      {/* NAV (mobile sticky) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex gap-3 border-t bg-white px-4 py-3 md:hidden" style={{ borderColor: LINE }}>
        {step > 1 ? (
          <button type="button" onClick={goBack} className="flex min-h-[50px] flex-1 items-center justify-center gap-1.5 rounded-xl border px-4 text-[15px] font-semibold"
            style={{ borderColor: LINE, color: INK, background: '#FFF' }}>
            <ChevronLeft size={18} /> Atrás
          </button>
        ) : <div className="flex-1" />}
        {step < 3 ? (
          <button type="button" onClick={goNext}
            className="flex min-h-[50px] flex-[2] items-center justify-center gap-1.5 rounded-xl px-8 text-[15px] font-semibold text-white"
            style={{ background: TEAL }}>
            Siguiente <ChevronRight size={18} />
          </button>
        ) : (
          <button type="button" onClick={handleFinalSubmit} disabled={postLoading || savingContact || !step3Valid}
            className="flex min-h-[50px] flex-[2] items-center justify-center gap-2 rounded-xl px-8 text-[15px] font-semibold text-white disabled:opacity-50"
            style={{ background: PINK }}>
            {(postLoading || savingContact)
              ? <Loader2 className="animate-spin" size={20} />
              : <><Sparkles size={18} /> {editingAd ? (t.save_changes || 'Guardar cambios') : t.publish_btn}</>}
          </button>
        )}
      </div>
    </div>
  );
}
