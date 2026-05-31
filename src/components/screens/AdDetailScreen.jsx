
import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Shield, CheckCircle, AlertTriangle, Share2, Heart, MessageCircle, ChevronLeft, Calendar, Tag, BarChart3, User, Pencil, Pause, Play, Loader2, Send } from 'lucide-react';
import { filterConfig } from '../../constants/filterConfig';
import { addRecentlyViewed } from '../../utils/recentlyViewed';
import { events } from '../../utils/analytics';

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

const buildPublicLocationLabel = (ad) => {
  const parts = [ad?.location, ad?.city, ad?.municipality, ad?.state]
    .map(value => String(value || '').trim())
    .filter(Boolean);
  const uniqueParts = [...new Set(parts)];
  return uniqueParts.join(' · ');
};

const buildMapEmbedUrl = (locationLabel) => {
  if (!locationLabel) return null;
  return `https://www.openstreetmap.org/export/embed.html?bbox=-117.7%2C14.2%2C-86.0%2C32.8&layer=mapnik&marker=23.6345%2C-102.5528#${encodeURIComponent(`${locationLabel}, México`)}`;
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

const getSafeWhatsAppNumber = (ad) => {
  const candidates = [
    ad?.user?.business_whatsapp,
    ad?.user?.whatsapp,
  ];

  for (const rawCandidate of candidates) {
    const digits = String(rawCandidate || '').replace(/\D/g, '');
    if (!digits) continue;

    if (digits.length === 10) return `52${digits}`;
    if (digits.length >= 11 && digits.length <= 15) return digits;
  }

  return null;
};

// ── Price Sparkline ──────────────────────────────────────────────────────────
function PriceSparkline({ history }) {
  const [tooltip, setTooltip] = React.useState(null);
  const W = 280, H = 64, PAD = 8;
  const prices = history.map(h => Number(h.new_price));
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const pts = prices.map((p, i) => {
    const x = PAD + (i / (prices.length - 1)) * (W - PAD * 2);
    const y = PAD + ((maxP - p) / range) * (H - PAD * 2);
    return [x, y];
  });
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `M${pts[0][0]},${pts[0][1]} ` +
    pts.slice(1).map(([x, y]) => `L${x},${y}`).join(' ') +
    ` L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;

  return (
    <div className="mt-3 mb-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3">
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">Historial de precio</p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="overflow-visible">
        <defs>
          <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#84CC16" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#84CC16" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#spark-grad)" />
        <polyline points={polyline} fill="none" stroke="#65A30D" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([x, y], i) => (
          <circle
            key={i}
            cx={x} cy={y} r="4"
            fill="white" stroke="#65A30D" strokeWidth="2"
            className="cursor-pointer"
            onMouseEnter={() => setTooltip({ x, y, price: prices[i], date: history[i].changed_at })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
        {tooltip && (
          <g>
            <rect
              x={Math.min(tooltip.x - 48, W - 100)} y={tooltip.y - 40}
              width="96" height="30" rx="6"
              fill="#1e293b" opacity="0.92"
            />
            <text
              x={Math.min(tooltip.x - 48, W - 100) + 48}
              y={tooltip.y - 26}
              textAnchor="middle" fill="white"
              fontSize="10" fontWeight="600"
            >
              ${Number(tooltip.price).toLocaleString('es-MX')}
            </text>
            <text
              x={Math.min(tooltip.x - 48, W - 100) + 48}
              y={tooltip.y - 14}
              textAnchor="middle" fill="#94a3b8"
              fontSize="9"
            >
              {new Date(tooltip.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export default function AdDetailScreen({
  ad, API_URL, getImageUrl, getImageUrls, getCatName, t, lang, favoriteIds, categoriesData,
  sliderAutoplay, handleShareAd, handleToggleFavorite, setReportingAd, setShowReportModal,
  handleViewCompany, handleWhatsAppClick, allAds, setViewedAd, onBack, MediaSlider, renderAdCard, AdSenseBanner,
  currentUser,
  handleRenewAd
}) {
  const [similarAds, setSimilarAds] = useState([]);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [renderedAtMs] = useState(() => Date.now());

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

  useEffect(() => {
    if (!ad?.id) { setPriceHistory([]); return; }
    fetch(`${API_URL}/ads/${ad.id}/price-history`)
      .then(r => r.ok ? r.json() : { history: [] })
      .then(data => setPriceHistory(Array.isArray(data.history) ? data.history : []))
      .catch(() => setPriceHistory([]));
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
  const whatsappNumber = getSafeWhatsAppNumber(ad);
  const whatsappMessage = encodeURIComponent(`Hola, me interesa tu anuncio "${ad.title}" en Mercasto`);
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}` : null;
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/#ad-${ad.id}` : '';
  const shareText = `${t.check_this_ad || 'Mira este anuncio en Mercasto'}: ${ad.title || ''}`;
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const encodedShareText = encodeURIComponent(shareText);
  const shareOptions = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodedShareText}%20${encodedShareUrl}` },
    { label: 'Telegram', href: `https://t.me/share/url?url=${encodedShareUrl}&text=${encodedShareText}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}` },
    { label: 'X / Twitter', href: `https://twitter.com/intent/tweet?text=${encodedShareText}&url=${encodedShareUrl}` },
    { label: 'Email', href: `mailto:?subject=${encodeURIComponent(ad.title || 'Mercasto')}&body=${encodedShareText}%0A${encodedShareUrl}` },
  ];

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      handleShareAd(ad);
    } finally {
      setShowShareMenu(false);
    }
  };

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

      {isOwner && (() => {
        const exp = ad.expires_at ? new Date(ad.expires_at) : null;
        if (!exp) return null;
        const daysLeft = Math.ceil((exp - renderedAtMs) / (1000 * 60 * 60 * 24));
        const expired = ad.status === 'expired' || daysLeft <= 0;
        const expiring = !expired && daysLeft <= 7;
        if (!expired && !expiring) return null;
        const formattedDate = exp.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
        return (
          <div className={`mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl px-5 py-4 border ${expired ? 'bg-red-50 border-red-200 text-red-800' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
            <div className="text-sm font-medium">
              {expired
                ? 'Este anuncio ha expirado y no es visible para otros usuarios.'
                : `Este anuncio expira el ${formattedDate} (en ${daysLeft <= 1 ? '1 día' : daysLeft + ' días'}).`}
            </div>
            {handleRenewAd && (
              <button
                onClick={() => handleRenewAd(ad)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${expired ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
              >
                Renovar anuncio
              </button>
            )}
          </div>
        );
      })()}
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
            {priceHistory.length >= 2 && <PriceSparkline history={priceHistory} />}

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

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleWhatsAppClick(ad)}
                className="btn-lg w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white flex items-center justify-center gap-2 mb-3 shadow-md shadow-[#25D366]/20"
              >
                <MessageCircle size={20} /> Contactar por WhatsApp
              </a>
            )}

            {telegramUrl ? (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-lg mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 text-white shadow-md shadow-sky-500/20 transition-colors hover:bg-sky-600"
              >
                <Send size={19} /> Escribir por Telegram
              </a>
            ) : null}

            {!whatsappUrl && !telegramUrl && (
              <div className="mb-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center text-[12px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
                Este vendedor aún no tiene un canal de contacto público.
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={(e) => handleToggleFavorite(e, ad.id)} className={`btn-md flex-1 flex items-center justify-center gap-2 border transition-colors ${isFav ? 'bg-red-50 border-red-100 text-red-600' : 'bg-white dark:bg-slate-700 border-slate-300 text-slate-700 dark:text-slate-200 hover:bg-slate-50'}`}>
                <Heart size={18} className={isFav ? "fill-red-500" : ""} /> {isFav ? 'Guardado' : 'Favorito'}
              </button>
              <div className="relative flex-1">
                <button
                  onClick={() => setShowShareMenu(prev => !prev)}
                  className="btn-md w-full bg-white dark:bg-slate-700 border border-slate-300 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2"
                  aria-expanded={showShareMenu}
                >
                  <Share2 size={18} /> Compartir
                </button>
                {showShareMenu && (
                  <div className="absolute right-0 z-30 mt-2 max-h-64 w-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    {navigator.share && (
                      <button
                        type="button"
                        onClick={() => {
                          handleShareAd(ad);
                          setShowShareMenu(false);
                        }}
                        className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        Compartir desde el dispositivo
                      </button>
                    )}
                    {shareOptions.map(option => (
                      <a
                        key={option.label}
                        href={option.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowShareMenu(false)}
                        className="block px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        {option.label}
                      </a>
                    ))}
                    <button
                      type="button"
                      onClick={copyShareLink}
                      className="block w-full border-t border-slate-100 px-4 py-3 text-left text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Copiar enlace
                    </button>
                  </div>
                )}
              </div>
            </div>
            {currentUser && !isOwner && (
              <button
                onClick={() => setAlertEnabled(v => !v)}
                className={`mt-3 w-full flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-colors ${
                  alertEnabled
                    ? 'bg-lime-50 border-lime-300 text-lime-800 dark:bg-lime-950/30 dark:border-lime-500/30 dark:text-lime-200'
                    : 'bg-white dark:bg-slate-700 border-slate-300 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <span className="text-base">{alertEnabled ? '🔔' : '🔕'}</span>
                {alertEnabled ? 'Alerta de precio activa' : 'Activar alerta de precio'}
              </button>
            )}
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
