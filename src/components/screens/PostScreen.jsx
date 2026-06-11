import { mexicoLocations, subcategoriesMap } from '../../constants/mockData';
import { filterConfig } from '../../constants/filterConfig';
import MEXICO_STATES from '../../utils/mexicoStates';
import { IconMap } from '../../constants/iconMap';
import React from 'react';
import { Shield, Pencil, PlusCircle, Activity, Heart, MapPin, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Camera, User, BadgeCheck, ShieldCheck, Building2, Zap, Ticket, Crown, Store, UploadCloud, LogOut, Settings, BarChart3, QrCode, Download, Loader2, Settings2, Globe, Sparkles, Play, Video, Phone, AlertTriangle, ArrowRight, ExternalLink, MessageCircle, Share2, Star, Info, HelpCircle, Menu, X, Bell } from "lucide-react";

import SortablePhotoGrid from '../SortablePhotoGrid';
import MapV3 from '../common/MapV3';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const brandModelsMap = {
  'toyota': ['Corolla', 'Camry', 'RAV4', 'Tacoma', 'Yaris', 'Prius', 'Hilux', 'Sienna', 'Land Cruiser'],
  'nissan': ['Versa', 'Sentra', 'Altima', 'March', 'Frontier', 'Kicks', 'X-Trail', 'Pathfinder', 'Tsuru'],
  'volkswagen': ['Jetta', 'Golf', 'Tiguan', 'Vento', 'Polo', 'Taos', 'Virtus', 'Taigun', 'Beetle'],
  'ford': ['Mustang', 'Lobo', 'Explorer', 'Ranger', 'Focus', 'Escape', 'Bronco', 'F-150', 'Edge'],
  'chevrolet': ['Aveo', 'Onix', 'Silverado', 'Equinox', 'Tracker', 'Captiva', 'Cavalier', 'Suburban', 'Spark'],
  'honda': ['Civic', 'Accord', 'CR-V', 'Fit', 'HR-V', 'City', 'Pilot', 'Odyssey'],
  'bmw': ['Serie 3', 'Serie 1', 'X3', 'X5', 'Serie 5', 'X1', 'X6', 'Serie 4'],
  'mercedes-benz': ['Clase C', 'Clase A', 'GLC', 'GLE', 'Clase E', 'GLA', 'CLA'],
  'audi': ['A3', 'A4', 'Q3', 'Q5', 'A1', 'A6', 'Q7'],
  'kia': ['Rio', 'Forte', 'Sportage', 'Seltos', 'Soul', 'Sorento'],
  'hyundai': ['Accent', 'Elantra', 'Tucson', 'Creta', 'Santa Fe', 'Grand i10'],
  'mazda': ['Mazda 3', 'Mazda 2', 'CX-30', 'CX-5', 'CX-3', 'Mazda 6', 'MX-5'],
  'jeep': ['Grand Cherokee', 'Wrangler', 'Compass', 'Renegade', 'Cherokee'],
  'tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
  'mg': ['MG5', 'HS', 'ZS', 'RX5', 'GT'],
  'byd': ['Dolphin', 'Yuan Plus', 'Song Plus', 'Han', 'Tang'],
  'apple': ['iPhone 15', 'iPhone 15 Pro', 'iPhone 14', 'iPhone 14 Pro', 'iPhone 13', 'MacBook Pro', 'MacBook Air', 'iPad Pro', 'iPad Air', 'Apple Watch'],
  'samsung': ['Galaxy S24', 'Galaxy S23', 'Galaxy S22', 'Galaxy A54', 'Galaxy Tab', 'Galaxy Watch'],
  'xiaomi': ['Redmi Note 13', 'Redmi Note 12', 'Xiaomi 14', 'Xiaomi 13', 'Poco F5', 'Mi Pad'],
  'motorola': ['Moto G84', 'Moto G54', 'Edge 40', 'Razr 40', 'Moto G14']
};

export default function PostScreen({ categoriesData, debouncedLocation, editingAd, form, handleImageChange, handlePostSubmit, images, isMapUpdating, lang, postLoading, removeImage, removeImageById, reorderImages, setEditingAd, setForm, setVideoFile, t, videoFile, aiLoading, handleGenerateDescription }) {
    const [apiCategoryFields, setApiCategoryFields] = React.useState(null);
    const [loadingCategoryFields, setLoadingCategoryFields] = React.useState(false);
    const [currentStep, setCurrentStep] = React.useState(1);

    React.useEffect(() => {
      if (!form.category) {
        setApiCategoryFields(null);
        setLoadingCategoryFields(false);
        return;
      }

      let cancelled = false;
      setLoadingCategoryFields(true);

      fetch(`${API_URL}/category-attributes?category=${encodeURIComponent(form.category)}`)
        .then(response => response.ok ? response.json() : [])
        .then(data => {
          if (cancelled) return;
          setApiCategoryFields(Array.isArray(data) && data.length > 0 ? data : null);
        })
        .catch(() => {
          if (!cancelled) setApiCategoryFields(null);
        })
        .finally(() => {
          if (!cancelled) setLoadingCategoryFields(false);
        });

      return () => { cancelled = true; };
    }, [form.category]);

    const categoryFields = React.useMemo(() => {
      if (!form.category) return [];
      const apiFields = apiCategoryFields;
      if (!apiFields) {
        return filterConfig[form.category] ?? [];
      }

      const localFields = filterConfig[form.category] ?? [];
      return apiFields.map(apiField => {
        const apiFieldId = apiField.id || apiField.key;

        let normalizedApiId = apiFieldId;
        if (apiFieldId === 'brand') normalizedApiId = 'marca';
        else if (apiFieldId === 'model') normalizedApiId = 'modelo';
        else if (apiFieldId === 'kms') normalizedApiId = 'km';
        else if (apiFieldId === 'fuel') normalizedApiId = 'combustible';

        const localField = localFields.find(f => {
          const localFieldId = f.id || f.key;
          return localFieldId === normalizedApiId;
        });

        let resolvedMinPlaceholder = apiField.minPlaceholder;
        if (!resolvedMinPlaceholder) {
          if (apiField.key === 'year') resolvedMinPlaceholder = 'Desde';
          else if (apiField.key === 'kms' || apiField.key === 'km') resolvedMinPlaceholder = 'Mín.';
          else if (localField) resolvedMinPlaceholder = localField.minPlaceholder;
        }

        if (localField) {
          return {
            ...localField,
            ...apiField,
            id: normalizedApiId,
            key: normalizedApiId,
            type: apiField.type || localField.type,
            options: apiField.options || localField.options,
            placeholder: apiField.placeholder || localField.placeholder,
            minPlaceholder: resolvedMinPlaceholder,
            maxPlaceholder: apiField.maxPlaceholder || localField.maxPlaceholder,
          };
        }

        return {
          ...apiField,
          id: normalizedApiId,
          key: normalizedApiId,
          minPlaceholder: resolvedMinPlaceholder,
        };
      });
    }, [apiCategoryFields, form.category]);

    React.useEffect(() => {
      if (!form.category || categoryFields.length === 0 || !form.attributes) return;

      const allowedKeys = new Set(categoryFields.map(field => field.id || field.key));
      allowedKeys.add('subcategory');
      allowedKeys.add('location_accuracy');

      const cleanedAttributes = Object.fromEntries(
        Object.entries(form.attributes).filter(([key]) => allowedKeys.has(key))
      );

      if (Object.keys(cleanedAttributes).length !== Object.keys(form.attributes).length) {
        setForm(prev => ({ ...prev, attributes: cleanedAttributes }));
      }
    }, [categoryFields, form.attributes, form.category, setForm]);

    const handleCoordsSelect = (lat, lng) => {
      setForm(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        location: prev.location || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      }));
    };

    return (
      <div className="bg-[var(--paper)] dark:bg-slate-950 min-h-screen w-full flex items-start justify-center py-6 md:py-10 px-4">
        <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-10 shadow-sm dark:shadow-none">
          <h2 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white mb-6 flex items-center gap-2 cursor-pointer" onClick={() => editingAd && setEditingAd(null)}>
              <PlusCircle className="text-[#84CC16]" size={26} /> {editingAd ? (t.edit_ad || 'Editar anuncio') : t.post_title}
          </h2>

          {/* STEP INDICATOR */}
          <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-5">
            {['1. Categoría', '2. Características', '3. Fotos y Ubicación'].map((stepName, idx) => {
              const stepNum = idx + 1;
              const isActive = currentStep === stepNum;
              const isCompleted = currentStep > stepNum;
              return (
                <div key={stepName} className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-[#84CC16] text-white shadow-md' : isCompleted ? 'bg-[#84CC16]/25 text-[#65A30D]' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    {stepNum}
                  </span>
                  <span className={`text-xs md:text-sm font-semibold ${isActive ? 'text-slate-950 dark:text-white font-bold' : 'text-slate-400'}`}>{stepName}</span>
                </div>
              );
            })}
          </div>

          <form onSubmit={handlePostSubmit} className="space-y-6">
              
              {/* STEP 1: CATEGORY & SUBCATEGORY */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <label className="block text-[14px] font-bold text-slate-700 dark:text-slate-300 mb-3">Selecciona una Categoría</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {categoriesData.map(c => {
                        const Icon = IconMap[c.icon] || Star;
                        const isSelected = form.category === c.slug;
                        return (
                          <button
                            type="button"
                            key={c.slug}
                            onClick={() => {
                              setForm({ ...form, category: c.slug, subcategory: '', attributes: {} });
                            }}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${isSelected ? 'border-[#84CC16] bg-[#F7FEE7] dark:bg-slate-900/60 ring-2 ring-[#84CC16]' : 'border-slate-200 dark:border-slate-800 hover:border-[#84CC16] hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          >
                            <Icon size={24} className={isSelected ? 'text-[#65A30D]' : 'text-slate-500'} />
                            <span className="text-[13px] font-bold mt-2 text-slate-800 dark:text-slate-100">{c.name[lang] || c.name['es']}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {form.category && (
                    <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
                      <label className="block text-[14px] font-bold text-slate-700 dark:text-slate-300 mb-3">Selecciona una Subcategoría</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(subcategoriesMap[form.category] || []).map(sub => {
                          const isSelected = form.subcategory === sub;
                          return (
                            <button
                              type="button"
                              key={sub}
                              onClick={() => setForm({ ...form, subcategory: sub })}
                              className={`p-3 rounded-lg border text-center transition-all text-xs font-semibold ${isSelected ? 'border-[#84CC16] bg-[#F7FEE7] dark:bg-slate-900/60 ring-2 ring-[#84CC16]' : 'border-slate-200 dark:border-slate-800 hover:border-[#84CC16] hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                              {sub}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-6">
                    <button
                      type="button"
                      disabled={!form.category || !form.subcategory}
                      onClick={() => setCurrentStep(2)}
                      className="btn-lg bg-[#0F172A] text-white hover:bg-black flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CHARACTERISTICS & DETAILS */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* TITLE */}
                  <div>
                      <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.ad_title}</label>
                      <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Ej: Honda Civic 2018" />
                  </div>

                  {/* PRICE & CONDITION */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                          <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.condition || 'Estado'}</label>
                          <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer transition-all">
                              <option value="nuevo">{(t.new || 'Nuevo')}</option>
                              <option value="usado">{(t.used || 'Usado')}</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.ad_price}</label>
                          <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-slate-400 text-[14px]">$</span>
                              <input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} required className="w-full px-3.5 py-2.5 pl-7 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="0.00" />
                          </div>
                      </div>
                  </div>

                  {/* DYNAMIC CATEGORY ATTRIBUTES */}
                  {form.category && (loadingCategoryFields || categoryFields.length > 0) && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/50">
                      <h3 className="text-[14px] font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Settings2 size={16} className="text-[#84CC16]" /> {t.ad_attributes || 'Características del anuncio'}
                        {loadingCategoryFields && <Loader2 size={14} className="animate-spin text-slate-400" />}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryFields.map(field => {
                          const fieldId = field.id || field.key;

                          // BRAND -> MODEL DEPENDENCY DROPDOWN
                          if (fieldId === 'modelo' && brandModelsMap[(form.attributes?.marca || '').toLowerCase()]) {
                            const availableModels = brandModelsMap[(form.attributes.marca).toLowerCase()] || [];
                            return (
                              <div key={fieldId}>
                                <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{field.label}</label>
                                <select
                                  value={form.attributes?.[fieldId] || ''}
                                  onChange={e => setForm({...form, attributes: {...(form.attributes || {}), [fieldId]: e.target.value}})}
                                  required={field.required}
                                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer transition-all"
                                >
                                  <option value="">Seleccionar modelo...</option>
                                  {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                  <option value="Otro">Otro modelo</option>
                                </select>
                                {form.attributes?.[fieldId] === 'Otro' && (
                                  <input
                                    type="text"
                                    placeholder="Especifica el modelo"
                                    onChange={e => setForm({...form, attributes: {...(form.attributes || {}), [fieldId]: e.target.value}})}
                                    className="w-full mt-2 px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                                  />
                                )}
                              </div>
                            );
                          }

                          return (
                            <div key={fieldId}>
                              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{field.label}</label>
                              {(field.type === 'select' || field.type === 'checkbox') && (
                                <select
                                  value={form.attributes?.[fieldId] || ''}
                                  onChange={e => setForm({...form, attributes: {...(form.attributes || {}), [fieldId]: e.target.value}})}
                                  required={field.required}
                                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer transition-all"
                                >
                                  <option value="">{(t.select || 'Seleccionar')}...</option>
                                  {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                              )}
                              {field.type === 'text' && (
                                <input
                                  type="text"
                                  value={form.attributes?.[fieldId] || ''}
                                  onChange={e => setForm({...form, attributes: {...(form.attributes || {}), [fieldId]: e.target.value}})}
                                  placeholder={field.placeholder || ''}
                                  required={field.required}
                                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                              )}
                              {field.type === 'range' && (
                                <input
                                  type="number"
                                  value={form.attributes?.[fieldId] || ''}
                                  onChange={e => setForm({...form, attributes: {...(form.attributes || {}), [fieldId]: e.target.value}})}
                                  min={field.range?.min}
                                  max={field.range?.max}
                                  step={field.range?.step}
                                  placeholder={field.minPlaceholder || field.range?.min || '0'}
                                  required={field.required}
                                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* DESCRIPTION */}
                  <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300">{t.ad_desc}</label>
                        <button type="button" onClick={handleGenerateDescription} disabled={aiLoading} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium text-[#65A30D] hover:bg-[#84CC16]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                          {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                          {aiLoading ? (t.generating || 'Generando…') : (t.generate_ai || '✨ Generar con IA')}
                        </button>
                      </div>
                      <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all h-32 resize-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder={t.ad_desc_placeholder || "Describe tu artículo..."} />
                  </div>

                  <div className="flex justify-between items-center pt-6">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="btn-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                    >
                      <ChevronLeft size={16} /> Atrás
                    </button>
                    <button
                      type="button"
                      disabled={!form.title || !form.price || !form.description}
                      onClick={() => setCurrentStep(3)}
                      className="btn-lg bg-[#0F172A] text-white hover:bg-black flex items-center gap-1.5 disabled:opacity-50"
                    >
                      Siguiente <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PHOTOS & LOCATION */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* IMAGE UPLOAD */}
                  <div>
                      <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.ad_photos || 'Fotos del anuncio'}</label>

                      {images.length > 0 ? (
                         <div className="w-full space-y-3">
                            <SortablePhotoGrid
                              photos={images}
                              onReorder={reorderImages}
                              onDelete={removeImageById}
                            />

                            {images.length < 10 && (
                               <label className="aspect-square border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-center hover:bg-[#84CC16]/5 hover:border-[#84CC16]/50 transition-all cursor-pointer bg-slate-50 dark:bg-slate-950 w-full py-4">
                                  <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                                  <PlusCircle className="text-slate-400" size={24} />
                                  <span className="text-xs text-slate-400 mt-1">{t.add_more_photos || 'Agregar más fotos'}</span>
                               </label>
                            )}
                         </div>
                      ) : (
                         <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-[#84CC16]/5 hover:border-[#84CC16]/50 transition-all cursor-pointer group relative overflow-hidden h-40 md:h-48 bg-slate-50 dark:bg-slate-950">
                            <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                            <div className="w-14 h-14 bg-white dark:bg-slate-900 group-hover:bg-[#84CC16]/10 rounded-full flex items-center justify-center mb-3 transition-colors shadow-sm">
                               <Camera className="text-slate-400 group-hover:text-[#65A30D]" size={28} />
                            </div>
                            <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200 mb-1">{(t.drag_photos_hint || 'Arrastra tus fotos aquí o')} <span className="text-[#65A30D] dark:text-[#84CC16]">{(t.browse_label || 'explora')}</span></p>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400">{(t.max_photos_hint || 'Máximo 10 fotos (JPG, PNG)')}</p>
                         </label>
                      )}
                  </div>

                  {/* VIDEO URL */}
                  <div className="my-5">
                      <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.video_hint || 'Video (Opcional, MP4, max 50MB)'}</label>
                      {videoFile ? (
                        <div className="flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                          <Video className="text-slate-500" />
                          <span className="text-sm text-slate-700 truncate flex-1">{videoFile.name}</span>
                          <button type="button" onClick={() => setVideoFile(null)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                      ) : (
                         <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-[#84CC16]/5 hover:border-[#84CC16]/50 transition-all cursor-pointer">
                           <input type="file" accept="video/mp4,video/quicktime" onChange={(e) => setVideoFile(e.target.files[0])} className="hidden" />
                           <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-800">
                             <Video className="text-[#65A30D]" size={20} />
                           </div>
                           <div className="flex-1 text-left">
                             <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{t.video_opt || 'Subir video'}</p>
                             <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.no_file_selected || 'Sin archivo seleccionado'}</p>
                           </div>
                         </label>
                      )}
                  </div>

                  {/* STATE -> CITY DEPENDENT SELECTORS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{(t.state || 'Estado')} <span className="text-red-500">*</span></label>
                      <select value={form.state || ''} onChange={e => setForm({...form, state: e.target.value, city: '', location: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer transition-all">
                        <option value="">{t.select_state || 'Seleccionar estado'}</option>
                        {MEXICO_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {form.state && (
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.city || 'Ciudad'} <span className="text-red-500">*</span></label>
                        <select
                          value={form.city || ''}
                          onChange={e => {
                            const newCity = e.target.value;
                            setForm(prev => ({ ...prev, city: newCity, location: newCity ? `${newCity}, ${prev.state}` : prev.state }));
                          }}
                          required
                          className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer transition-all"
                        >
                          <option value="">{t.select_city || 'Seleccionar ciudad'}</option>
                          {(mexicoLocations[form.state] || []).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* EXACT LOCATION ADDRESS */}
                  <div>
                     <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.location || 'Dirección específica / Ubicación'}</label>
                     <div className="relative mb-3">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} required className="w-full px-3.5 py-2.5 pl-10 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder={t.loc_placeholder || "Escribe tu dirección o haz clic en el mapa"} />
                     </div>
                     
                     {/* INTERACTIVE GEOLOCATION ACCURACY CONTROL */}
                     <div className="mb-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                       <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300">Precisión de Ubicación en el Mapa</label>
                       <div className="flex gap-4">
                         <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                           <input type="radio" checked={(form.attributes?.location_accuracy || 'approximate') === 'exact'} onChange={() => setForm({...form, attributes: {...(form.attributes || {}), location_accuracy: 'exact'}})} className="text-[#84CC16] focus:ring-[#84CC16]" />
                           <span>Ubicación exacta (Punto GPS)</span>
                         </label>
                         <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                           <input type="radio" checked={(form.attributes?.location_accuracy || 'approximate') === 'approximate'} onChange={() => setForm({...form, attributes: {...(form.attributes || {}), location_accuracy: 'approximate'}})} className="text-[#84CC16] focus:ring-[#84CC16]" />
                           <span>Aproximada (Ocultar dirección exacta)</span>
                         </label>
                       </div>
                     </div>

                     <div className="w-full h-48 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                         {isMapUpdating && <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50"><Loader2 className="w-8 h-8 text-[#84CC16] animate-spin"/></div>}
                         <MapV3
                           title={debouncedLocation || form.location || form.state || 'Todo México'}
                           markers={form.latitude && form.longitude ? [{ label: 'Seleccionado', coords: [form.latitude, form.longitude], tone: 'lime' }] : []}
                           showFullscreen={false}
                           onSelectCoords={handleCoordsSelect}
                           className={`h-full rounded-none border-0 shadow-none transition-opacity duration-300 ${isMapUpdating ? 'opacity-40' : 'opacity-100'}`}
                         />
                     </div>
                  </div>

                  <div className="flex justify-between items-center pt-6">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="btn-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                    >
                      <ChevronLeft size={16} /> Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={postLoading || !form.state || !form.location}
                      className="btn-lg bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {postLoading ? <Loader2 className="animate-spin" size={20}/> : <><Sparkles size={18}/> {editingAd ? (t.save_changes || 'Guardar cambios') : t.publish_btn}</>}
                    </button>
                  </div>
                </div>
              )}

          </form>
        </div>
      </div>
    );
}
