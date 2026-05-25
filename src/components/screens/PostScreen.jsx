import { mexicoLocations, subcategoriesMap, mockAds, translations, spotlightRealEstate, jobsBoard, servicesMarketplace, automotiveDeals, recentlyViewed } from '../../constants/mockData';
import { filterConfig } from '../../constants/filterConfig';
import MEXICO_STATES from '../../utils/mexicoStates';
import React from 'react';
import { Shield, Pencil, PlusCircle, Activity, Heart, MapPin, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Camera, User, BadgeCheck, ShieldCheck, Building2, Zap, Ticket, Crown, Store, UploadCloud, LogOut, Settings, BarChart3, QrCode, Download, Loader2, Settings2, Globe, Sparkles, Play, Video, Phone, AlertTriangle, ArrowRight, ExternalLink, MessageCircle, Share2, Star, Info, HelpCircle, Menu, X, Bell } from "lucide-react";

import SortablePhotoGrid from '../SortablePhotoGrid';
const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export default function PostScreen({ categoriesData, debouncedLocation, editingAd, form, handleImageChange, handlePostSubmit, images, isMapUpdating, lang, postLoading, removeImage, removeImageById, reorderImages, setEditingAd, setForm, setVideoFile, t, videoFile, aiLoading, handleGenerateDescription }) {
    const mapQuery = debouncedLocation ? encodeURIComponent(debouncedLocation) : "Mexico";
    const [apiCategoryFields, setApiCategoryFields] = React.useState(null);
    const [loadingCategoryFields, setLoadingCategoryFields] = React.useState(false);

    const mapUrl = `https://maps.google.com/maps?q=${mapQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

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
      return apiCategoryFields ?? filterConfig[form.category] ?? [];
    }, [apiCategoryFields, form.category]);

    React.useEffect(() => {
      if (!form.category || categoryFields.length === 0 || !form.attributes) return;

      const allowedKeys = new Set(categoryFields.map(field => field.id || field.key));
      const cleanedAttributes = Object.fromEntries(
        Object.entries(form.attributes).filter(([key]) => allowedKeys.has(key))
      );

      if (Object.keys(cleanedAttributes).length !== Object.keys(form.attributes).length) {
        setForm(prev => ({ ...prev, attributes: cleanedAttributes }));
      }
    }, [categoryFields, form.attributes, form.category, setForm]);



    return (

      <div className="bg-[var(--paper)] min-h-screen w-full flex items-start justify-center py-6 md:py-10 px-4">

        <div className="w-full max-w-3xl bg-white rounded-2xl md:rounded-3xl border border-slate-200 p-6 md:p-10 shadow-sm">

          <h2 className="text-[22px] font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-2 cursor-pointer" onClick={() => editingAd && setEditingAd(null)}>

              <PlusCircle className="text-[#84CC16]" size={26} /> {editingAd ? (t.edit_ad || 'Editar anuncio') : t.post_title}

          </h2>

          

          <form onSubmit={handlePostSubmit} className="space-y-6">

              {/* IMAGE UPLOAD */}

              <div>

                 <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.ad_photos || 'Fotos del anuncio'}</label>

                 {images.length > 0 ? (

                    <div className="w-full space-y-3">

                       <SortablePhotoGrid
                         photos={images}
                         onReorder={reorderImages}
                         onDelete={removeImageById}
                       />

                       {images.length < 10 && (

                          <label className="aspect-square border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center hover:bg-[#84CC16]/5 hover:border-[#84CC16]/50 transition-all cursor-pointer bg-slate-50 w-full py-4">

                             <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />

                             <PlusCircle className="text-slate-400" size={24} />

                             <span className="text-xs text-slate-400 mt-1">{t.add_more_photos || 'Agregar más fotos'}</span>

                          </label>

                       )}

                    </div>

                 ) : (

                    <label className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-[#84CC16]/5 hover:border-[#84CC16]/50 transition-all cursor-pointer group relative overflow-hidden h-40 md:h-48 bg-slate-50">

                       <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />

                       <div className="w-14 h-14 bg-white group-hover:bg-[#84CC16]/10 rounded-full flex items-center justify-center mb-3 transition-colors shadow-sm">

                          <Camera className="text-slate-400 group-hover:text-[#65A30D]" size={28} />

                       </div>

                       <p className="text-[14px] font-medium text-slate-700 mb-1">{(t.drag_photos_hint || 'Arrastra tus fotos aquí o')} <span className="text-[#65A30D]">{(t.browse_label || 'explora')}</span></p>

                       <p className="text-[12px] text-slate-500">{(t.max_photos_hint || 'Máximo 10 fotos (JPG, PNG)')}</p>

                    </label>

                 )}

              </div>



              {/* TITLE */}

              <div>

                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.ad_title}</label>

                  <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" placeholder="Ej: Honda Civic 2018" />

              </div>



              {/* CATEGORY & CONDITION & PRICE */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                  <div>

                      <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.category || 'Categoría'}</label>

                      <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white cursor-pointer transition-all">

                          <option value="">{(t.select || 'Seleccionar')}...</option>

                          {categoriesData.map(c => <option key={c.slug} value={c.slug}>{c.name[lang] || c.name['es']}</option>)}

                      </select>

                  </div>

                  <div>

                      <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.condition || 'Estado'}</label>

                      <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white cursor-pointer transition-all">

                          <option value="nuevo">{(t.new || 'Nuevo')}</option>

                          <option value="usado">{(t.used || 'Usado')}</option>

                      </select>

                  </div>

                  <div>

                      <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.ad_price}</label>

                      <div className="relative">

                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-slate-400 text-[14px]">$</span>

                          <input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} required className="w-full px-3.5 py-2.5 pl-7 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" placeholder="0.00" />

                      </div>

                  </div>

              </div>

              {/* DYNAMIC CATEGORY ATTRIBUTES */}
              {form.category && (loadingCategoryFields || categoryFields.length > 0) && (
                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
                  <h3 className="text-[14px] font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Settings2 size={16} className="text-[#84CC16]" /> {t.ad_attributes || 'Características del anuncio'}
                    {loadingCategoryFields && <Loader2 size={14} className="animate-spin text-slate-400" />}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryFields.map(field => {
                      const fieldId = field.id || field.key;
                      return (
                      <div key={fieldId}>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">{field.label}</label>
                        {(field.type === 'select' || field.type === 'checkbox') && (
                          <select
                            value={form.attributes?.[fieldId] || ''}
                            onChange={e => setForm({...form, attributes: {...(form.attributes || {}), [fieldId]: e.target.value}})}
                            required={field.required}
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white cursor-pointer transition-all"
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
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all"
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
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all"
                          />
                        )}
                      </div>
                    )})}
                  </div>
                </div>
              )}



              {/* LOCATION & MAP */}

              {/* STATE DROPDOWN */}
              <div className="mb-3">
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">{(t.state || 'Estado')} <span className="text-red-500">*</span></label>
                <select value={form.state || ''} onChange={e => setForm({...form, state: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white cursor-pointer transition-all">
                  <option value="">{t.select_state || 'Seleccionar estado'}</option>
                {MEXICO_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>

                 <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.location || 'Ubicación'}</label>

                 <div className="relative mb-3">

                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />

                    <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} required className="w-full px-3.5 py-2.5 pl-10 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" placeholder={t.loc_placeholder || "Escribe tu ciudad, colonia o código postal"} />

                 </div>

                 <div className="w-full h-48 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative">

                     <iframe width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" src={mapUrl} style={{ border: 0, filter: 'grayscale(0.1) contrast(1.05)' }} className={`transition-opacity duration-300 ${isMapUpdating ? 'opacity-40' : 'opacity-100'}`}></iframe>

                     {isMapUpdating && <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50"><Loader2 className="w-8 h-8 text-[#84CC16] animate-spin"/></div>}

                 </div>

              </div>



              {/* DESCRIPTION */}

              <div>

                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[13px] font-semibold text-slate-700">{t.ad_desc}</label>
                    <button type="button" onClick={handleGenerateDescription} disabled={aiLoading} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium text-[#65A30D] hover:bg-[#84CC16]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      {aiLoading ? (t.generating || 'Generando…') : (t.generate_ai || '✨ Generar con IA')}
                    </button>
                  </div>

                  <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all min-h-[140px]" placeholder={t.ad_desc}></textarea>

              </div>



              {/* VIDEO URL */}

              <div>

                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.video_hint || 'Video (Opcional, MP4, max 50MB)'}</label>

                  {videoFile ? (

                    <div className="flex items-center gap-3 p-2 bg-slate-100 rounded-xl border border-slate-200">

                      <Video className="text-slate-500" />

                      <span className="text-sm text-slate-700 truncate flex-1">{videoFile.name}</span>

                      <button type="button" onClick={() => setVideoFile(null)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>

                    </div>

                  ) : (

                    <input type="file" accept="video/mp4,video/quicktime" onChange={(e) => setVideoFile(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#84CC16]/10 file:text-[#65A30D] hover:file:bg-[#84CC16]/20" />

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
