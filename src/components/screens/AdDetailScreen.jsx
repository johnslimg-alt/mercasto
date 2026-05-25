
function OwnerControls({ ad, API_URL, setViewedAd }) {
  const [status, setStatus] = useState(ad.status);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState(null);
  const token = localStorage.getItem('auth_token');

  const pause = async () => {
    setLoading(true); setErrMsg(null);
    try {
      const res = await fetch(`${API_URL}/ads/${ad.id}/pause`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setStatus('paused');
        setViewedAd?.(prev => prev && prev.id === ad.id ? { ...prev, status: 'paused' } : prev);
      }
      else { const d = await res.json(); setErrMsg(d.message || 'Error al pausar'); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const activate = async () => {
    setLoading(true); setErrMsg(null);
    try {
      const res = await fetch(`${API_URL}/ads/${ad.id}/activate`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setStatus('active');
        setViewedAd?.(prev => prev && prev.id === ad.id ? { ...prev, status: 'active' } : prev);
      }
      else { const d = await res.json(); setErrMsg(d.message || 'Error al reactivar'); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-2">
      {errMsg && <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{errMsg}</p>}
      {status === 'active' && (
        <button onClick={pause} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Pause size={15} />} Pausar
        </button>
      )}
      {status === 'paused' && (
        <button onClick={activate} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-lime-100 hover:bg-[#65A30D]/20 text-[#65A30D] rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Reactivar
        </button>
      )}
    </div>
  );
}

import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Shield, CheckCircle, AlertTriangle, Share2, Heart, MessageCircle, ChevronLeft, Calendar, Tag, BarChart3, User, Pencil, Pause, Play, Loader2, Send } from 'lucide-react';
import { filterConfig } from '../../constants/filterConfig';
import { addRecentlyViewed } from '../../utils/recentlyViewed';
import { events } from '../../utils/analytics';

const buildPublicLocationLabel = (ad) => {
  const parts = [ad?.location, ad?.city, ad?.municipality, ad?.state]
    .map(value => String(value || '').trim())
    .filter(Boolean);
  const uniqueParts = [...new Set(parts)];
  return uniqueParts.join(' · ');
};

const buildMapEmbedUrl = (locationLabel) => {
  if (!locationLabel) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(`${locationLabel}, México`)}&output=embed`;
};

const getSafeTelegramUsername = (ad) => {
  const candidates = [
    ad?.telegram_username,
    ad?.telegram,
    ad?.telegram_url,
    ad?.user?.telegram_username,
    ad?.user?.telegram,
    ad?.user?.telegram_url,
  ];

  for (const rawCandidate of candidates) {
    const candidate = String(rawCandidate || '').trim();
    if (!candidate) continue;

    const cleaned = candidate
      .replace(/^@/, '')
      .replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me)\//i, '')
      .replace(/^t\.me\//i, '')
      .split(/[/?#]/)[0]
      .trim();

    if (/^[A-Za-z0-9_]{5,32}$/.test(cleaned)) {
      return cleaned;
    }
  }

  return null;
};

export default function AdDetailScreen({
  ad, API_URL, getImageUrl, getImageUrls, getCatName, t, lang, favoriteIds, categoriesData,
  sliderAutoplay, handleShareAd, handleToggleFavorite, setReportingAd, setShowReportModal,
  handleViewCompany, handleWhatsAppClick, allAds, setViewedAd, onBack, MediaSlider, renderAdCard, AdSenseBanner,
  currentUser
}) {
  const [similarAds, setSimilarAds] = useState([]);

  // Track recently viewed
  React.useEffect(() => {
    if (ad) {
      addRecentlyViewed(ad);
      events.adViewed(ad.id, ad.category);
    }
  }, [ad?.id]);

  useEffect(() => {
    if (!ad?.id) {
      setSimilarAds([]);
      return;
    }

    setSimilarAds([]);
    fetch(`${API_URL}/ads/${ad.id}/similar`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setSimilarAds(Array.isArray(data) ? data.slice(0, 8) : []))
      .catch(() => setSimilarAds([]));
  }, [API_URL, ad?.id]);

  if (!ad) return null;

  const isOwner = currentUser && currentUser.id === ad.user_id;
  const isFav = favoriteIds.includes(ad.id);
  const images = getImageUrls(ad.image_url, ad.image).map(url => ({ type: 'image', url }));
  if (ad.video_url) images.unshift({ type: 'video', url: getImageUrl(ad.video_url) });
  let attributes = {};
  try {
    attributes = typeof ad.attributes === 'string' ? JSON.parse(ad.attributes) : (ad.attributes || {});
  } catch(e) {}

  const catConfig = filterConfig[ad.category] || [];
  const locationLabel = buildPublicLocationLabel(ad);
  const mapEmbedUrl = buildMapEmbedUrl(locationLabel);
  const telegramUsername = getSafeTelegramUsername(ad);
  const telegramUrl = telegramUsername ? `https://t.me/${telegramUsername}` : null;

  return (
    <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-6 lg:py-8">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => (onBack ? onBack() : setViewedAd(null))} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium transition-colors">
          <ChevronLeft size={20} /> Volver a resultados
        </button>
        {isOwner && (
          <div className="flex items-center gap-2">
            <OwnerControls ad={ad} API_URL={API_URL} setViewedAd={setViewedAd} />
            <Link
              to={`/anuncio/${ad.id}/editar`}
              className="flex items-center gap-1.5 px-4 py-2 bg-lime-500 hover:bg-[#65A30D] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-lime-500/20"
            >
              <Pencil size={15} /> Editar
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* MEDIA SLIDER */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm h-[300px] md:h-[500px]">
            <MediaSlider media={images} autoplay={sliderAutoplay} />
          </div>

          {/* AD DETAILS */}
          <div className="mt-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-sm">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-tight">{ad.title}</h1>
            <p className="text-3xl md:text-4xl font-black text-[#65A30D] mb-2">${Number(ad.price).toLocaleString()} <span className="text-lg text-slate-500 font-medium">MXN</span></p>
            {ad.old_price && ad.price_dropped_at && Number(ad.old_price) > Number(ad.price) && (
              <div className="inline-flex flex-wrap items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-xl px-3 py-1.5 mb-5 text-[13px] font-semibold dark:bg-green-950/30 dark:border-green-500/30 dark:text-green-200">
                <span>Bajó de precio</span>
                <span>Antes: <span className="line-through text-green-600 dark:text-green-300">${Number(ad.old_price).toLocaleString("es-MX")}</span></span>
                <span className="bg-green-200 text-green-900 rounded-full px-1.5 py-0.5 text-[11px] font-bold dark:bg-green-500/20 dark:text-green-100">
                  {Math.round(((Number(ad.old_price) - Number(ad.price)) / Number(ad.old_price)) * 100)}% menos
                </span>
              </div>
            )}
            
            <div className="flex flex-wrap items-center gap-3 mb-8 text-[13px] text-slate-600 font-medium">
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl"><MapPin size={16}/> {locationLabel || 'México'}</span>
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl"><Calendar size={16}/> {new Date(ad.created_at).toLocaleDateString()}</span>
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl"><BarChart3 size={16}/> {ad.views || 0} vistas</span>
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl capitalize"><Tag size={16}/> {ad.condition || 'Usado'}</span>
            </div>

            {locationLabel && (
              <div className="mb-10 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-900/30">
                <div className="flex items-start gap-3 p-4 md:p-5">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#84CC16]/15 text-[#65A30D]">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">Ubicación del anuncio</h3>
                    <p className="mt-1 text-[14px] font-medium text-slate-600 dark:text-slate-300">{locationLabel}</p>
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">La ubicación es aproximada y se muestra solo con datos públicos del anuncio.</p>
                  </div>
                </div>
                {mapEmbedUrl && (
                  <div className="h-[220px] w-full border-t border-slate-200 dark:border-slate-700 md:h-[280px]">
                    <iframe
                      title={`Mapa de ${locationLabel}`}
                      src={mapEmbedUrl}
                      className="h-full w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )}
              </div>
            )}

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

            {telegramUrl ? (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-lg mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 text-white shadow-md shadow-sky-500/20 transition-colors hover:bg-sky-600"
              >
                <Send size={19} /> Escribir por Telegram
              </a>
            ) : (
              <div className="mb-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center text-[12px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
                Telegram no disponible para este anuncio.
              </div>
            )}

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

      {/* ПОХОЖИЕ ОБЪЯВЛЕНИЯ */}
      {similarAds.length > 0 && (
        <div className="mt-10">
          <h2 className="text-[20px] font-bold text-slate-900 mb-5">Te puede interesar</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {similarAds.map(simAd => (
              <div key={simAd.id} className="cursor-pointer" onClick={() => setViewedAd(simAd)}>
                {renderAdCard(simAd)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
