import React from 'react';
import { ChevronLeft, ChevronRight, Download, Share2, Heart, MapPin, Shield, CheckCircle, User, Phone } from 'lucide-react';

export default function AdDetailScreen({
  ad, API_URL, getImageUrl, getImageUrls, getCatName, t, lang, favoriteIds,
  categoriesData, sliderAutoplay, handleShareAd, handleToggleFavorite,
  setReportingAd, setShowReportModal, handleViewCompany, handleWhatsAppClick,
  allAds, setViewedAd, MediaSlider, renderAdCard
}) {
  if (!ad) return null;
  
  const imageItems = getImageUrls(ad.image_url, ad.image).map(url => ({ type: 'image', url, id: url }));
  const mediaItems = [...imageItems];

  if (ad.video_url) {
      mediaItems.unshift({
          type: 'video',
          id: 'video-item',
          url: getImageUrl(ad.video_url),
          processing: ad.video_processing_status === 'pending',
      });
  }

  const isPro = ad.type === 'pro';
  const relatedAds = allAds.filter(a => a.category === ad.category && a.id !== ad.id).slice(0, 4);

  return (
  <div className="bg-[var(--paper)] min-h-screen pb-24 md:pb-12 w-full">
    <div className="sticky top-0 bg-white/90 backdrop-blur-xl z-40 border-b border-slate-200 px-4 py-3 flex items-center shadow-sm h-[60px]">
       <button onClick={() => { if(window.location.hash) window.history.back(); else { setViewedAd(null); window.history.replaceState({}, '', '/'); } }} className="btn-sm flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent">
         <ChevronLeft className="w-4 h-4" /> {t.back_to_list}
       </button>
    </div>

    <div className="max-w-[1000px] mx-auto md:py-8 pt-4 px-4">
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row rounded-3xl">
         <div className="w-full md:w-1/2 h-72 md:h-[500px] lg:h-[600px] bg-slate-50 relative overflow-hidden">
            <MediaSlider media={mediaItems} isPro={isPro} autoplay={sliderAutoplay} />
         </div>

         <div className="w-full md:w-1/2 p-6 md:p-8 lg:p-10 flex flex-col">
            <div className="flex-1">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-900 font-bold text-[32px] md:text-[38px] tracking-tight leading-none">${Number(ad.price).toLocaleString()} <span className="text-[14px] text-slate-500 font-medium tracking-normal align-top">MXN</span></p>
                <div className="flex items-center gap-2">
                  {ad.category === 'inmobiliaria' && (
                    <a href={`${API_URL}/ads/${ad.id}/pdf`} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors active:scale-95 group" title={t.download_pdf}>
                      <Download className="w-5 h-5 text-slate-400 group-hover:text-slate-700" />
                    </a>
                  )}
                  <button onClick={() => handleShareAd(ad)} className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors active:scale-95 group">
                    <Share2 className="w-5 h-5 text-slate-400 group-hover:text-slate-700" />
                  </button>
                  <button onClick={(e) => handleToggleFavorite(e, ad.id)} className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors active:scale-95 group">
                    <Heart className={`w-5 h-5 ${favoriteIds.includes(ad.id) ? 'fill-red-500 text-red-500' : 'text-slate-400 group-hover:text-red-500'}`} />
                  </button>
                </div>
              </div>
              <h1 className="text-[20px] md:text-[24px] font-semibold text-slate-900 leading-tight mb-5">{ad.title}</h1>
              
              <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-100 pb-6">
                 <span className="flex items-center text-[12px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                     <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400"/> {ad.location || 'México'}
                 </span>
                 {ad.category && (
                   <span className="flex items-center text-[12px] font-semibold text-[#65A30D] bg-[#84CC16]/10 px-2.5 py-1.5 rounded-lg">
                       {getCatName(categoriesData.find(c => c.slug === ad.category), lang) || ad.category}
                   </span>
                 )}
              </div>

              <div className="mb-8">
                 <h3 className="text-[15px] font-bold text-slate-900 mb-3">{t.product_desc}</h3>
                 <p className="text-[14px] text-slate-600 whitespace-pre-line leading-relaxed">{ad.description || t.no_desc}</p>
              </div>

              <div className="mb-8">
                 <h3 className="text-[15px] font-bold text-slate-900 mb-3">{t.location}</h3>
                 <div className="w-full h-48 md:h-64 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative shadow-sm">
                     <iframe width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" src={`https://maps.google.com/maps?q=${encodeURIComponent(ad.location || 'Mexico')}&t=&z=14&ie=UTF8&iwloc=&output=embed`} style={{ border: 0, filter: 'grayscale(0.1) contrast(1.05)' }}></iframe>
                 </div>
              </div>

              <button onClick={() => { setReportingAd(ad); setShowReportModal(true); }} className="text-[12px] text-slate-400 hover:text-red-500 mb-6 flex items-center gap-1.5 underline underline-offset-4 font-medium transition-colors w-fit">
                <Shield size={14} /> {t.report_ad}
              </button>

              <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-200 mb-8 md:mb-0 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleViewCompany(ad.user)}>
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-[#0F172A] text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-inner shrink-0">
                     {ad.user?.avatar_url ? (
                       <img src={getImageUrl(ad.user.avatar_url)} className="w-full h-full rounded-xl object-cover" alt="Seller Avatar" />
                     ) : (
                       ad.user?.name ? ad.user.name[0].toUpperCase() : <User size={24}/>
                     )}
                   </div>
                   <div>
                     <p className="font-semibold text-slate-900 text-[15px] flex items-center gap-1.5">{ad.user?.name || t.verified_seller} {ad.user?.role === 'business' && <span className="badge bg-slate-900 text-white leading-none px-1.5 py-0.5">PRO</span>}</p>
                     <p className="text-[12px] font-medium text-slate-500 flex items-center mt-0.5"><CheckCircle className="w-3.5 h-3.5 text-[#84CC16] mr-1"/> {t.id_confirmed}</p>
                   </div>
                 </div>
                 <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>

            <div className="fixed md:static bottom-0 left-0 w-full bg-white md:bg-transparent p-4 md:p-0 border-t md:border-none border-slate-200 z-50 md:mt-4">
                <div className="flex gap-3">
                  <button 
                    onClick={() => { handleWhatsAppClick(ad); const phone = ad.user?.phone_number ? ad.user.phone_number.replace(/\D/g, '') : '521234567890'; window.open(`https://wa.me/${phone}?text=${encodeURIComponent('Hola, me interesa tu anuncio: ' + ad.title)}`, '_blank'); }}
                    className="btn-lg flex-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white flex items-center justify-center gap-2 shadow-md"
                  >
                     <Phone className="w-5 h-5" /> WhatsApp
                  </button>
                  <button 
                    onClick={() => { const phone = ad.user?.phone_number ? ad.user.phone_number.replace(/\D/g, '') : '521234567890'; window.open(`https://t.me/+${phone}`, '_blank'); }}
                    className="btn-lg flex-1 bg-[#229ED9] hover:bg-[#1C88BA] text-white flex items-center justify-center gap-2 shadow-md"
                  >
                     <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.535.223l.188-2.85 5.18-4.686c.223-.195-.054-.31-.35-.11l-6.4 4.02-2.76-.89c-.6-.188-.614-.6.126-.89L17.2 7.15c.523-.188.983.118.694 1.07z"/></svg> Telegram
                  </button>
                </div>
            </div>
         </div>
      </div>

      {/* ПОХОЖИЕ ОБЪЯВЛЕНИЯ */}
      {relatedAds.length > 0 && (
        <div className="mt-12 mb-8 pt-8 border-t border-slate-200">
          <h3 className="text-[20px] font-bold text-slate-900 mb-6">{t.similar_ads}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedAds.map(relAd => renderAdCard(relAd))}
          </div>
        </div>
      )}
    </div>
  </div>
  );
}