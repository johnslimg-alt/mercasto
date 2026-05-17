import { mexicoLocations, subcategoriesMap, mockAds, translations, spotlightRealEstate, jobsBoard, servicesMarketplace, automotiveDeals, recentlyViewed } from '../../constants/mockData';
import React from 'react';
import { Shield, Pencil, PlusCircle, Activity, Heart, MapPin, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Camera, User, BadgeCheck, ShieldCheck, Building2, Zap, Ticket, Crown, Store, UploadCloud, LogOut, Settings, BarChart3, QrCode, Download, Loader2, Settings2, Globe, Sparkles, Play, Video, Phone, AlertTriangle, ArrowRight, ExternalLink, MessageCircle, Share2, Star, Info, HelpCircle, Menu, X, Bell } from "lucide-react";

export default function PostScreen({ categoriesData, debouncedLocation, editingAd, form, handleImageChange, handlePostSubmit, images, isMapUpdating, lang, postLoading, removeImage, setEditingAd, setForm, setVideoFile, t, videoFile }) {
    const mapQuery = debouncedLocation ? encodeURIComponent(debouncedLocation) : "Mexico";

    const mapUrl = `https://maps.google.com/maps?q=${mapQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`;



    return (

      <div className="bg-[var(--paper)] min-h-screen w-full flex items-start justify-center py-6 md:py-10 px-4">

        <div className="w-full max-w-3xl bg-white rounded-2xl md:rounded-3xl border border-slate-200 p-6 md:p-10 shadow-sm">

          <h2 className="text-[22px] font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-2 cursor-pointer" onClick={() => editingAd && setEditingAd(null)}>

              <PlusCircle className="text-[#84CC16]" size={26} /> {editingAd ? 'Editar anuncio' : t.post_title}

          </h2>

          

          <form onSubmit={handlePostSubmit} className="space-y-6">

              {/* IMAGE UPLOAD */}

              <div>

                 <label className="block text-[13px] font-semibold text-slate-700 mb-2">Fotos del anuncio</label>

                 {images.length > 0 ? (

                    <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">

                       {images.map((img, idx) => (

                          <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200">

                             <img src={img.preview} className="w-full h-full object-cover" alt={`Preview ${idx}`} />

                             <button type="button" onClick={(e) => { e.preventDefault(); removeImage(idx); }} className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur rounded-full p-1 text-slate-500 hover:text-red-500 hover:bg-white shadow-sm transition-colors">

                               <Trash2 size={14}/>

                             </button>

                          </div>

                       ))}

                       {images.length < 10 && (

                          <label className="aspect-square border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center hover:bg-[#84CC16]/5 hover:border-[#84CC16]/50 transition-all cursor-pointer bg-slate-50">

                             <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />

                             <PlusCircle className="text-slate-400" size={24} />

                          </label>

                       )}

                    </div>

                 ) : (

                    <label className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-[#84CC16]/5 hover:border-[#84CC16]/50 transition-all cursor-pointer group relative overflow-hidden h-40 md:h-48 bg-slate-50">

                       <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />

                       <div className="w-14 h-14 bg-white group-hover:bg-[#84CC16]/10 rounded-full flex items-center justify-center mb-3 transition-colors shadow-sm">

                          <Camera className="text-slate-400 group-hover:text-[#65A30D]" size={28} />

                       </div>

                       <p className="text-[14px] font-medium text-slate-700 mb-1">Arrastra tus fotos aquí o <span className="text-[#65A30D]">explora</span></p>

                       <p className="text-[12px] text-slate-500">Máximo 10 fotos (JPG, PNG)</p>

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

                      <label className="block text-[13px] font-semibold text-slate-700 mb-2">Categoría</label>

                      <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white cursor-pointer transition-all">

                          <option value="">Seleccionar...</option>

                          {categoriesData.map(c => <option key={c.slug} value={c.slug}>{c.name[lang] || c.name['es']}</option>)}

                      </select>

                  </div>

                  <div>

                      <label className="block text-[13px] font-semibold text-slate-700 mb-2">Estado</label>

                      <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white cursor-pointer transition-all">

                          <option value="nuevo">Nuevo</option>

                          <option value="usado">Usado</option>

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



              {/* LOCATION & MAP */}

              {/* STATE DROPDOWN */}
              <div className="mb-3">
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">Estado <span className="text-red-500">*</span></label>
                <select value={form.state || ''} onChange={e => setForm({...form, state: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white cursor-pointer transition-all">
                  <option value="">Seleccionar estado</option>
                <option value="Aguascalientes">Aguascalientes</option>
                <option value="Baja California">Baja California</option>
                <option value="Baja California Sur">Baja California Sur</option>
                <option value="Campeche">Campeche</option>
                <option value="Chiapas">Chiapas</option>
                <option value="Chihuahua">Chihuahua</option>
                <option value="Ciudad de México">Ciudad de México</option>
                <option value="Coahuila">Coahuila</option>
                <option value="Colima">Colima</option>
                <option value="Durango">Durango</option>
                <option value="Guanajuato">Guanajuato</option>
                <option value="Guerrero">Guerrero</option>
                <option value="Hidalgo">Hidalgo</option>
                <option value="Jalisco">Jalisco</option>
                <option value="México">México</option>
                <option value="Michoacán">Michoacán</option>
                <option value="Morelos">Morelos</option>
                <option value="Nayarit">Nayarit</option>
                <option value="Nuevo León">Nuevo León</option>
                <option value="Oaxaca">Oaxaca</option>
                <option value="Puebla">Puebla</option>
                <option value="Querétaro">Querétaro</option>
                <option value="Quintana Roo">Quintana Roo</option>
                <option value="San Luis Potosí">San Luis Potosí</option>
                <option value="Sinaloa">Sinaloa</option>
                <option value="Sonora">Sonora</option>
                <option value="Tabasco">Tabasco</option>
                <option value="Tamaulipas">Tamaulipas</option>
                <option value="Tlaxcala">Tlaxcala</option>
                <option value="Veracruz">Veracruz</option>
                <option value="Yucatán">Yucatán</option>
                <option value="Zacatecas">Zacatecas</option>
                </select>
              </div>

              <div>

                 <label className="block text-[13px] font-semibold text-slate-700 mb-2">Ubicación</label>

                 <div className="relative mb-3">

                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />

                    <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} required className="w-full px-3.5 py-2.5 pl-10 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" placeholder="Escribe tu ciudad, colonia o código postal" />

                 </div>

                 <div className="w-full h-48 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative">

                     <iframe width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" src={mapUrl} style={{ border: 0, filter: 'grayscale(0.1) contrast(1.05)' }} className={`transition-opacity duration-300 ${isMapUpdating ? 'opacity-40' : 'opacity-100'}`}></iframe>

                     {isMapUpdating && <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50"><Loader2 className="w-8 h-8 text-[#84CC16] animate-spin"/></div>}

                 </div>

              </div>



              {/* DESCRIPTION */}

              <div>

                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.ad_desc}</label>

                  <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all min-h-[140px]" placeholder={t.ad_desc}></textarea>

              </div>



              {/* VIDEO URL */}

              <div>

                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">Video (Opcional, MP4, max 50MB)</label>

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

                    {postLoading ? <Loader2 className="animate-spin" size={20}/> : <><Sparkles size={18}/> {editingAd ? 'Guardar cambios' : t.publish_btn}</>}

                </button>

              </div>

          </form>

        </div>

      </div>

    );

}
