import React, { useMemo } from 'react';
import { MapPin, Shield, CheckCircle, AlertTriangle, Share2, Heart, MessageCircle, ChevronLeft, Calendar, Tag, BarChart3, User } from 'lucide-react';
import { filterConfig } from '../../constants/filterConfig';

export default function AdDetailScreen({
  ad, API_URL, getImageUrl, getImageUrls, getCatName, t, lang, favoriteIds, categoriesData,
  sliderAutoplay, handleShareAd, handleToggleFavorite, setReportingAd, setShowReportModal,
  handleViewCompany, handleWhatsAppClick, allAds, setViewedAd, onBack, MediaSlider, renderAdCard, AdSenseBanner
}) {
  if (!ad) return null;
  
  const isFav = favoriteIds.includes(ad.id);
  const images = getImageUrls(ad.image_url, ad.image).map(url => ({ type: 'image', url }));
  if (ad.video_url) images.unshift({ type: 'video', url: getImageUrl(ad.video_url) });

  let attributes = {};
  try {
    attributes = typeof ad.attributes === 'string' ? JSON.parse(ad.attributes) : (ad.attributes || {});
  } catch(e) {}

  const catConfig = filterConfig[ad.category] || [];

  return (
    <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-6 lg:py-8">
      <button onClick={() => (onBack ? onBack() : setViewedAd(null))} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 font-medium transition-colors w-fit">
        <ChevronLeft size={20} /> Volver a resultados
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* MEDIA SLIDER */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm h-[300px] md:h-[500px]">
            <MediaSlider media={images} autoplay={sliderAutoplay} />
          </div>

          {/* AD DETAILS */}
          <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-tight">{ad.title}</h1>
            <p className="text-3xl md:text-4xl font-black text-[#65A30D] mb-6">${Number(ad.price).toLocaleString()} <span className="text-lg text-slate-500 font-medium">MXN</span></p>
            
            <div className="flex flex-wrap items-center gap-3 mb-8 text-[13px] text-slate-600 font-medium">
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl"><MapPin size={16}/> {ad.location || 'México'}</span>
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl"><Calendar size={16}/> {new Date(ad.created_at).toLocaleDateString()}</span>
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl"><BarChart3 size={16}/> {ad.views || 0} vistas</span>
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl capitalize"><Tag size={16}/> {ad.condition || 'Usado'}</span>
            </div>

            {/* DYNAMIC EAV ATTRIBUTES (Отображение фильтров) */}
            {Object.keys(attributes).length > 0 && (
              <div className="mb-10">
                <h3 className="text-[18px] font-bold text-slate-900 mb-5">Características principales</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(attributes).map(([key, val]) => {
                    const fieldDef = catConfig.find(f => f.id === key);
                    const label = fieldDef ? fieldDef.label : key;
                    const displayVal = Array.isArray(val) ? val.join(', ') : val;
                    return (
                      <div key={key} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                        <p className="text-[12px] text-slate-500 font-medium mb-1">{label}</p>
                        <p className="text-[14px] font-semibold text-slate-900">{displayVal}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <h3 className="text-[18px] font-bold text-slate-900 mb-4">Descripción</h3>
            <div className="text-slate-700 leading-relaxed whitespace-pre-line text-[15px]">
              {ad.description}
            </div>
            
            <div className="flex items-center gap-4 mt-8 pt-6 border-t border-slate-100">
              <button onClick={() => { setReportingAd(ad); setShowReportModal(true); }} className="text-slate-400 hover:text-red-500 text-[13px] font-medium flex items-center gap-1.5 transition-colors"><AlertTriangle size={16}/> Reportar anuncio sospechoso</button>
            </div>
          </div>
        </div>

        {/* SIDEBAR: SELLER CONTACT */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm sticky top-[90px]">
            <div className="flex items-center gap-4 mb-6 cursor-pointer group" onClick={() => handleViewCompany(ad.user)}>
              {ad.user?.avatar_url ? (
                <img src={getImageUrl(ad.user.avatar_url)} className="w-16 h-16 rounded-2xl object-cover border border-slate-200 group-hover:border-[#84CC16] transition-colors" alt=""/>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 group-hover:border-[#84CC16] transition-colors"><User size={24} className="text-slate-400" /></div>
              )}
              <div>
                <h3 className="font-bold text-slate-900 text-[16px] group-hover:text-[#65A30D] transition-colors flex items-center gap-1.5">
                  {ad.user?.name || 'Usuario'}
                  {ad.user?.is_verified && <CheckCircle className="w-4 h-4 text-[#84CC16]" title="Vendedor Verificado" />}
                </h3>
                <p className="text-[13px] text-slate-500 mt-0.5">En Mercasto desde {new Date(ad.user?.created_at || ad.created_at).getFullYear()}</p>
              </div>
            </div>

            <button onClick={() => { handleWhatsAppClick(ad); window.open(`https://wa.me/52${ad.user?.phone_number || '1234567890'}?text=Hola, me interesa tu anuncio "${ad.title}" en Mercasto`, '_blank'); }} className="btn-lg w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white flex items-center justify-center gap-2 mb-3 shadow-md shadow-[#25D366]/20">
              <MessageCircle size={20} /> Contactar por WhatsApp
            </button>

            <div className="flex gap-3 mt-4">
              <button onClick={(e) => handleToggleFavorite(e, ad.id)} className={`btn-md flex-1 flex items-center justify-center gap-2 border transition-colors ${isFav ? 'bg-red-50 border-red-100 text-red-600' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                <Heart size={18} className={isFav ? "fill-red-500" : ""} /> {isFav ? 'Guardado' : 'Favorito'}
              </button>
              <button onClick={() => handleShareAd(ad)} className="btn-md flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2">
                <Share2 size={18} /> Compartir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
