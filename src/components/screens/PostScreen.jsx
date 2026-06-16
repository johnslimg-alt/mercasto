import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusCircle, ChevronRight, ChevronLeft, Trash2, Camera, Loader2,
  Sparkles, Video, MapPin, Tag, Zap, Car, Home, Briefcase,
  ShoppingBag, Dog, Monitor, Smartphone, Shirt, Baby, Dumbbell,
  BookOpen, Package, Cpu, Settings2, Ticket, Building2
} from 'lucide-react';
import { mexicoLocations, subcategoriesMap } from '../../constants/mockData';
import MapV3 from '../common/MapV3';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

const MEXICO_STATES = Object.keys(mexicoLocations);

const STEP_LABELS = ['Categoría', 'Características', 'Fotos y Ubicación'];

const CATEGORY_ICONS = {
  coches: Car, motor: Car, inmobiliaria: Home, empleo: Briefcase,
  servicios: Settings2, moda: Shirt, hogar: Home, electronica: Monitor,
  telefonos: Smartphone, deportes: Dumbbell, infantil: Baby, bebes: Baby,
  mascotas: Dog, negocios: Building2, formacion: BookOpen,
  informatica: Cpu, coleccionismo: Package,
};

// Lightweight photo grid — no dnd-kit required
function PhotoGrid({ images, onRemove }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {images.map((img, idx) => (
        <div
          key={idx}
          className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700"
        >
          {idx === 0 && (
            <span className="absolute bottom-1 left-1 z-10 bg-teal-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
              Portada
            </span>
          )}
          <button
            type="button"
            onClick={() => onRemove(idx)}
            className="absolute top-1 right-1 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none transition-colors"
          >
            ×
          </button>
          <img src={img.preview} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
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
  setEditingAd,
  setForm,
  setVideoFile,
  t,
  videoFile,
  aiLoading,
  handleGenerateDescription,
}) {
  const [step, setStep] = useState(1);
  const [apiAttributes, setApiAttributes] = useState(null);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [customCity, setCustomCity] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
    }
  };

  const goBack = () => setStep(prev => Math.max(1, prev - 1));

  const mapQuery = form.location || form.state || 'México';

  // Render a dynamic attribute field
  const renderAttrField = (field) => {
    const key = field.id || field.key;
    const val = form.attributes?.[key] || '';
    const errKey = `attr_${key}`;
    const hasErr = !!errors[errKey];
    const baseClass = `w-full px-3.5 py-2.5 border ${hasErr ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'} rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-all`;
    const onChange = v => setForm(prev => ({ ...prev, attributes: { ...(prev.attributes || {}), [key]: v } }));

    if (field.type === 'select' && field.options?.length > 0) {
      return (
        <div key={key} className="space-y-2">
          <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            {field.label || key}{field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select value={val} onChange={e => onChange(e.target.value)} className={baseClass + ' cursor-pointer'}>
            <option value="">Seleccionar...</option>
            {field.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          {hasErr && <p className="text-xs text-red-500">{errors[errKey]}</p>}
        </div>
      );
    }
    if (field.type === 'number' || field.type === 'range') {
      return (
        <div key={key} className="space-y-2">
          <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            {field.label || key}{field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input type="number" value={val} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} className={baseClass} />
          {hasErr && <p className="text-xs text-red-500">{errors[errKey]}</p>}
        </div>
      );
    }
    return (
      <div key={key} className="space-y-2">
        <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300">
          {field.label || key}{field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input type="text" value={val} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} className={baseClass} />
        {hasErr && <p className="text-xs text-red-500">{errors[errKey]}</p>}
      </div>
    );
  };

  return (
    <div className="bg-[var(--paper)] min-h-screen w-full flex items-start justify-center py-6 md:py-10 px-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-950 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-10 shadow-sm">

        {/* Header */}
        <h2
          className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white mb-6 flex items-center gap-2 cursor-pointer"
          onClick={() => editingAd && setEditingAd(null)}
        >
          <PlusCircle className="text-[#84CC16]" size={26} />
          {editingAd ? t.edit_ad || 'Editar anuncio' : t.post_title}
        </h2>

        {/* Step indicator */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-5">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-[#84CC16] text-white shadow-md' : done ? 'bg-[#84CC16]/25 text-[#65A30D]' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  {n}
                </span>
                <span className={`text-xs md:text-sm font-semibold ${active ? 'text-slate-950 dark:text-white' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── KEY FIX: noValidate disables browser HTML5 validation ── */}
        <form onSubmit={handlePostSubmit} noValidate className="space-y-6">

          {/* ══════════════ STEP 1 — Category ══════════════ */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <label className="block text-[14px] font-bold text-slate-700 dark:text-slate-300 mb-3">
                  Selecciona una Categoría
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categoriesData.map(cat => {
                    const Icon = CATEGORY_ICONS[cat.slug] || Tag;
                    const selected = form.category === cat.slug;
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => setForm({ ...form, category: cat.slug, subcategory: '', attributes: {} })}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${selected ? 'border-[#84CC16] bg-[#F7FEE7] dark:bg-slate-900/60 ring-2 ring-[#84CC16]' : 'border-slate-200 dark:border-slate-800 hover:border-[#84CC16] hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        <Icon size={24} className={selected ? 'text-[#65A30D]' : 'text-slate-500'} />
                        <span className="text-[13px] font-bold mt-2 text-slate-800 dark:text-slate-100">
                          {cat.name?.[lang] || cat.name?.es || cat.slug}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.category && (subcategoriesMap[form.category] || []).length > 0 && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <label className="block text-[14px] font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Selecciona una Subcategoría
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(subcategoriesMap[form.category] || []).map(sub => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setForm({ ...form, subcategory: sub })}
                        className={`p-3 rounded-lg border text-center transition-all text-xs font-semibold ${form.subcategory === sub ? 'border-[#84CC16] bg-[#F7FEE7] dark:bg-slate-900/60 ring-2 ring-[#84CC16]' : 'border-slate-200 dark:border-slate-800 hover:border-[#84CC16] hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-6">
                <button
                  type="button"
                  disabled={!form.category || ((subcategoriesMap[form.category] || []).length > 0 && !form.subcategory)}
                  onClick={goNext}
                  className="btn-lg bg-[#0F172A] text-white hover:bg-black flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ══════════════ STEP 2 — Details ══════════════ */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">

              {/* Title */}
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {t.ad_title}
                </label>
                <input
                  value={form.title}
                  onChange={e => { setForm({ ...form, title: e.target.value }); if (errors.title) setErrors(p => ({ ...p, title: null })); }}
                  className={`w-full px-3.5 py-2.5 border ${errors.title ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'} rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white`}
                  placeholder="Ej: Honda Civic 2018"
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>

              {/* Condition + Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t.condition || 'Estado'}
                  </label>
                  <select
                    value={form.condition}
                    onChange={e => setForm({ ...form, condition: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer transition-all"
                  >
                    <option value="nuevo">{t.new || 'Nuevo'}</option>
                    <option value="usado">{t.used || 'Usado'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t.ad_price}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-slate-400 text-[14px]">$</span>
                    <input
                      type="number"
                      value={form.price}
                      onChange={e => { setForm({ ...form, price: e.target.value }); if (errors.price) setErrors(p => ({ ...p, price: null })); }}
                      className={`w-full px-3.5 py-2.5 pl-7 border ${errors.price ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'} rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
                </div>
              </div>

              {/* Dynamic attributes */}
              {form.category && (attributesLoading || dynamicAttributes.length > 0) && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/50">
                  <h3 className="text-[14px] font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Zap size={16} className="text-[#84CC16]" />
                    {t.ad_attributes || 'Características del anuncio'}
                    {attributesLoading && <Loader2 size={14} className="animate-spin text-slate-400" />}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dynamicAttributes.map(field => renderAttrField(field))}
                  </div>
                </div>
              )}

              {/* AI Description */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                    {t.ad_desc}
                  </label>
                  {handleGenerateDescription && (
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={aiLoading}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#65A30D] hover:text-[#84CC16] disabled:opacity-50 transition-colors"
                    >
                      {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      {t.generate_ai || 'Generar con IA'}
                    </button>
                  )}
                </div>
                <textarea
                  value={form.description}
                  onChange={e => { setForm({ ...form, description: e.target.value }); if (errors.description) setErrors(p => ({ ...p, description: null })); }}
                  className={`w-full px-3.5 py-2.5 border ${errors.description ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'} rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all min-h-[140px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white`}
                  placeholder={t.ad_desc}
                />
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
              </div>

              {/* Step 2 navigation */}
              <div className="flex justify-between items-center pt-6">
                <button type="button" onClick={goBack} className="btn-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
                  <ChevronLeft size={16} /> Atrás
                </button>
                <button type="button" onClick={goNext} className="btn-lg bg-[#0F172A] text-white hover:bg-black flex items-center gap-1.5">
                  Siguiente <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ══════════════ STEP 3 — Photos + Location ══════════════ */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">

              {/* Photos */}
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {t.ad_photos || 'Fotos del anuncio'}
                </label>
                {images.length > 0 ? (
                  <div className="space-y-3">
                    <PhotoGrid images={images} onRemove={removeImage} />
                    {images.length < 10 && (
                      <label className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 py-4 hover:bg-[#84CC16]/5 hover:border-[#84CC16]/50 transition-all cursor-pointer text-slate-500 dark:text-slate-400 text-sm">
                        <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
                        <PlusCircle size={18} /> {t.add_more_photos || 'Agregar más fotos'}
                      </label>
                    )}
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-[#84CC16]/5 hover:border-[#84CC16]/50 transition-all cursor-pointer h-40 md:h-48 bg-slate-50 dark:bg-slate-950">
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
                    <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mb-3 shadow-sm">
                      <Camera className="text-slate-400" size={28} />
                    </div>
                    <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200 mb-1">
                      {t.drag_photos_hint || 'Arrastra tus fotos aquí o'} <span className="text-[#65A30D]">{t.browse_label || 'explora'}</span>
                    </p>
                    <p className="text-[12px] text-slate-500">{t.max_photos_hint || 'Máximo 10 fotos (JPG, PNG)'}</p>
                  </label>
                )}
              </div>

              {/* Video */}
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {t.video_hint || 'Video (Opcional, MP4, max 50MB)'}
                </label>
                {videoFile ? (
                  <div className="flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <Video className="text-slate-500" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{videoFile.name}</span>
                    <button type="button" onClick={() => setVideoFile(null)} className="p-1 text-slate-400 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-[#84CC16]/5 hover:border-[#84CC16]/50 transition-all cursor-pointer">
                    <input type="file" accept="video/mp4,video/quicktime" onChange={e => setVideoFile(e.target.files[0])} className="hidden" />
                    <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-800">
                      <Video className="text-[#65A30D]" size={20} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{t.video_opt || 'Subir video'}</p>
                      <p className="text-[11px] text-slate-500">{t.no_file_selected || 'Sin archivo seleccionado'}</p>
                    </div>
                  </label>
                )}
              </div>

              {/* State + City */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* State */}
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t.state || 'Estado'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.state || ''}
                    onChange={e => {
                      setForm({ ...form, state: e.target.value, city: '', location: e.target.value });
                      setCustomCity(false);
                    }}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer transition-all"
                  >
                    <option value="">{t.select_state || 'Seleccionar estado'}</option>
                    {MEXICO_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* City — only shown when state is selected */}
                {form.state && (
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t.city || 'Ciudad'} <span className="text-red-500">*</span>
                    </label>
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
                          className="flex-1 px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => { setCustomCity(false); setForm(prev => ({ ...prev, city: '' })); }}
                          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                        >
                          Seleccionar de la lista
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
                        className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer transition-all"
                      >
                        <option value="">{t.select_city || 'Seleccionar ciudad'}</option>
                        {(mexicoLocations[form.state] || []).map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="otro">Otro (Escribir manualmente)...</option>
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Location + Map */}
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {t.location || 'Dirección específica / Ubicación'}
                </label>
                <div className="relative mb-3">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    value={form.location || ''}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 pl-10 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    placeholder={t.loc_placeholder || 'Escribe tu dirección o haz clic en el mapa'}
                  />
                </div>

                {/* GPS button */}
                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleGPS}
                    disabled={gpsLoading}
                    className="px-4 py-2 bg-[#84CC16] hover:bg-[#65A30D] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                  >
                    {gpsLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                    Usar GPS actual
                  </button>
                </div>

                {/* Интерактивная карта: тап задаёт точные координаты (lat/lng) */}
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-2">{t.tap_map_hint || 'Toca el mapa para marcar la ubicación exacta de tu anuncio.'}</p>
                <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
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

              {/* Step 3 navigation */}
              <div className="flex justify-between items-center pt-6">
                <button type="button" onClick={goBack} className="btn-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
                  <ChevronLeft size={16} /> Atrás
                </button>
                <button
                  type="submit"
                  disabled={postLoading || !form.state || !form.location}
                  className="btn-lg bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {postLoading
                    ? <Loader2 className="animate-spin" size={20} />
                    : <><Sparkles size={18} /> {editingAd ? t.save_changes || 'Guardar cambios' : t.publish_btn}</>
                  }
                </button>
              </div>

            </div>
          )}

        </form>
      </div>
    </div>
  );
}
