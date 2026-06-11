import { mexicoLocations, subcategoriesMap, mockAds, translations, spotlightRealEstate, jobsBoard, servicesMarketplace, automotiveDeals, recentlyViewed } from '../../constants/mockData';
import { getCategoryFields, resolveCategorySchema } from '../../constants/categorySchema';
import MEXICO_STATES, { MEXICO_STATES_CITIES } from '../../utils/mexicoStates';
import React from 'react';
import { Shield, Pencil, PlusCircle, Activity, Heart, MapPin, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Camera, User, BadgeCheck, ShieldCheck, Building2, Zap, Ticket, Crown, Store, UploadCloud, LogOut, Settings, BarChart3, QrCode, Download, Loader2, Settings2, Globe, Sparkles, Play, Video, Phone, AlertTriangle, ArrowRight, ExternalLink, MessageCircle, Share2, Star, Info, HelpCircle, Menu, X, Bell } from "lucide-react";

import SortablePhotoGrid from '../SortablePhotoGrid';
import MapV3 from '../common/MapV3';
const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const AUTO_MODELS = {
  Nissan: ['Versa', 'Sentra', 'March', 'Kicks', 'X-Trail', 'Frontier', 'NP300', 'Otro'],
  Toyota: ['Corolla', 'Yaris', 'Camry', 'RAV4', 'Hilux', 'Tacoma', 'Avanza', 'Otro'],
  Honda: ['Civic', 'City', 'Accord', 'CR-V', 'HR-V', 'BR-V', 'Otro'],
  Volkswagen: ['Jetta', 'Virtus', 'Vento', 'Tiguan', 'Taos', 'Saveiro', 'Otro'],
  Chevrolet: ['Aveo', 'Onix', 'Tracker', 'Captiva', 'S10', 'Silverado', 'Otro'],
  Ford: ['Figo', 'Focus', 'Escape', 'Bronco', 'Ranger', 'F-150', 'Otro'],
};

export default function PostScreen({ categoriesData, debouncedLocation, editingAd, form, handleImageChange, handlePostSubmit, images, isMapUpdating, lang, postLoading, removeImage, removeImageById, reorderImages, setEditingAd, setForm, setVideoFile, t, videoFile, aiLoading, handleGenerateDescription }) {
    const [apiCategoryFields, setApiCategoryFields] = React.useState(null);
    const [loadingCategoryFields, setLoadingCategoryFields] = React.useState(false);

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
        return getCategoryFields(form.category, form.attributes?.subcategory) ?? [];
      }

      const localFields = getCategoryFields(form.category, form.attributes?.subcategory) ?? [];
      const normalizedApiFields = apiFields.map(apiField => {
        const apiFieldId = apiField.id || apiField.key;

        // Normalize backend key to match frontend key consistently
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

      const apiKeys = new Set(normalizedApiFields.map(field => field.id || field.key));
      return [
        ...normalizedApiFields,
        ...localFields.filter(field => !apiKeys.has(field.id || field.key)),
      ];
    }, [apiCategoryFields, form.attributes?.subcategory, form.category]);

    const selectedCategorySchema = React.useMemo(
      () => resolveCategorySchema(form.category),
      [form.category]
    );
    const availableCities = form.state ? (MEXICO_STATES_CITIES[form.state] || []) : [];

    React.useEffect(() => {
      if (!form.category || categoryFields.length === 0 || !form.attributes) return;

      const allowedKeys = new Set(['subcategory', ...categoryFields.map(field => field.id || field.key)]);
      const cleanedAttributes = Object.fromEntries(
        Object.entries(form.attributes).filter(([key]) => allowedKeys.has(key))
      );

      if (Object.keys(cleanedAttributes).length !== Object.keys(form.attributes).length) {
        setForm(prev => ({ ...prev, attributes: cleanedAttributes }));
      }
    }, [categoryFields, form.attributes, form.category, setForm]);

    return (
      <div className="bg-[var(--paper)] dark:bg-slate-950 min-h-screen w-full flex items-start justify-center py-6 md:py-10 px-4">
        <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-10 shadow-sm dark:shadow-none">
          <h2 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white mb-6 flex items-center gap-2 cursor-pointer" onClick={() => editingAd && setEditingAd(null)}>
              <PlusCircle className="text-[#84CC16]" size={26} /> {editingAd ? (t.edit_ad || 'Editar anuncio') : t.post_title}
          </h2>

          <form onSubmit={handlePostSubmit} className="space-y-6">
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

              {/* TITLE */}
              <div>
                  <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.ad_title}</label>
                  <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Ej: Honda Civic 2018" />
              </div>

              {/* CATEGORY & CONDITION & PRICE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                      <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.category || 'Categoría'}</label>
                      <select data-testid="post-category" value={form.category} onChange={e => setForm({...form, category: e.target.value, attributes: {}})} required className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer transition-all">
                          <option value="">{(t.select || 'Seleccionar')}...</option>
                          {categoriesData.map(c => <option key={c.slug} value={c.slug}>{c.name[lang] || c.name['es']}</option>)}
                      </select>
                  </div>
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

              {form.category && selectedCategorySchema.subcategories.length > 0 && (
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t.subcategory || 'Subcategoría'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    data-testid="post-subcategory"
                    value={form.attributes?.subcategory || ''}
                    onChange={e => setForm({
                      ...form,
                      attributes: { subcategory: e.target.value },
                    })}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer transition-all"
                  >
                    <option value="">{(t.select || 'Seleccionar')}...</option>
                    {selectedCategorySchema.subcategories.map(subcategory => (
                      <option key={subcategory.slug} value={subcategory.slug}>
                        {subcategory.label[lang] || subcategory.label.es}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                      if (fieldId === 'subcategory') return null;
                      const isAutoModel = fieldId === 'modelo' && ['coches', 'motor'].includes(form.category);
                      const dependentModels = isAutoModel ? (AUTO_MODELS[form.attributes?.marca] || []) : [];
                      return (
                      <div key={fieldId}>
                        <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{field.label}</label>
                        {(field.type === 'select' || field.type === 'checkbox') && !isAutoModel && (
                          <select
                            data-testid={`attribute-${fieldId}`}
                            value={form.attributes?.[fieldId] || ''}
                            onChange={e => {
                              const nextAttributes = {...(form.attributes || {}), [fieldId]: e.target.value};
                              if (fieldId === 'marca') delete nextAttributes.modelo;
                              setForm({...form, attributes: nextAttributes});
                            }}
                            required={field.required}
                            className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer transition-all"
                          >
                            <option value="">{(t.select || 'Seleccionar')}...</option>
                            {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        )}
                        {isAutoModel && dependentModels.length > 0 && (
                          <select
                            data-testid="attribute-modelo"
                            value={form.attributes?.[fieldId] || ''}
                            onChange={e => setForm({...form, attributes: {...(form.attributes || {}), [fieldId]: e.target.value}})}
                            required={field.required}
                            className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                          >
                            <option value="">{(t.select || 'Seleccionar')}...</option>
                            {dependentModels.map(model => <option key={model} value={model}>{model}</option>)}
                          </select>
                        )}
                        {field.type === 'text' && !(isAutoModel && dependentModels.length > 0) && (
                          <input
                            data-testid={`attribute-${fieldId}`}
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
                    )})}
                  </div>
                </div>
              )}

              {/* LOCATION & MAP */}
              <div className="mb-3">
                <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{(t.state || 'Estado')} <span className="text-red-500">*</span></label>
                <select data-testid="post-state" value={form.state || ''} onChange={e => setForm({...form, state: e.target.value, city: '', location: '', latitude: '', longitude: ''})} required className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer transition-all">
                  <option value="">{t.select_state || 'Seleccionar estado'}</option>
                  {MEXICO_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="mb-3">
                <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.city || 'Ciudad / Municipio'} <span className="text-red-500">*</span></label>
                <select
                  data-testid="post-city"
                  value={form.city || ''}
                  onChange={e => {
                    const city = e.target.value;
                    setForm({...form, city, location: city ? `${city}, ${form.state}` : '', latitude: '', longitude: ''});
                  }}
                  disabled={!form.state}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-50"
                >
                  <option value="">{form.state ? (t.select_city || 'Seleccionar ciudad') : (t.select_state_first || 'Primero selecciona un estado')}</option>
                  {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>

              <div>
                 <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.location || 'Ubicación'}</label>
                 <div className="relative mb-3">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input data-testid="post-location" value={form.location} onChange={e => setForm({...form, location: e.target.value, latitude: '', longitude: ''})} required className="w-full px-3.5 py-2.5 pl-10 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder={t.loc_placeholder || "Escribe colonia, calle o código postal"} />
                 </div>
                 <div className="w-full h-48 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                     {isMapUpdating && <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50"><Loader2 className="w-8 h-8 text-[#84CC16] animate-spin"/></div>}
                     <MapV3
                       title={debouncedLocation || form.location || form.state || 'Todo México'}
                       markers={form.latitude && form.longitude ? [{ label: 'Aquí', coords: [Number(form.latitude), Number(form.longitude)], tone: 'lime' }] : []}
                       locationPicker
                       locationQuery={`${form.city || ''} ${form.state || ''}`}
                       onLocationSelect={({ lat, lng }) => setForm(prev => ({ ...prev, latitude: lat.toFixed(7), longitude: lng.toFixed(7) }))}
                       showFullscreen={false}
                       className={`h-full rounded-none border-0 shadow-none transition-opacity duration-300 ${isMapUpdating ? 'opacity-40' : 'opacity-100'}`}
                     />
                 </div>
                 <p data-testid="post-coordinates" className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
                   {form.latitude && form.longitude
                     ? `${t.exact_location || 'Ubicación exacta seleccionada'}: ${form.latitude}, ${form.longitude}`
                     : (t.map_pick_hint || 'Selecciona una ciudad y toca el mapa para ajustar la ubicación exacta.')}
                 </p>
              </div>

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

              <div className="pt-2">
                <button type="submit" disabled={postLoading} className="btn-lg w-full bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-2">
                    {postLoading ? <Loader2 className="animate-spin" size={20}/> : <><Sparkles size={18}/> {editingAd ? (t.save_changes || 'Guardar cambios') : t.publish_btn}</>}
                </button>
              </div>
          </form>
        </div>
      </div>
    );
}
