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
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm h-[300px] md:h-[500px]">
            <MediaSlider media={images} autoplay={sliderAutoplay} />
          </div>

          {/* AD DETAILS */}
          <div className="mt-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-sm">
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
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm sticky top-[90px]">
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
              <button onClick={(e) => handleToggleFavorite(e, ad.id)} className={`btn-md flex-1 flex items-center justify-center gap-2 border transition-colors ${isFav ? 'bg-red-50 border-red-100 text-red-600' : 'bg-white dark:bg-slate-700 border-slate-300 text-slate-700 dark:text-slate-200 hover:bg-slate-50'}`}>
                <Heart size={18} className={isFav ? "fill-red-500" : ""} /> {isFav ? 'Guardado' : 'Favorito'}
              </button>
              <button onClick={() => handleShareAd(ad)} className="btn-md flex-1 bg-white dark:bg-slate-700 border border-slate-300 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2">
                <Share2 size={18} /> Compartir
              </button>
            </div>
            <button
              onClick={() => {
                const text = encodeURIComponent(`${t.check_this_ad || '¡Mira este anuncio en Mercasto!'} ${window.location.href}`);
                window.open(`https://wa.me/?text=${text}`, '_blank');
              }}
              className="flex items-center justify-center gap-2 w-full mt-3 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {t.share_whatsapp || 'Compartir por WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
