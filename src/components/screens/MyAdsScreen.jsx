import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CheckSquare, ExternalLink, Loader2, Pencil, PlusCircle, Square, Trash2, TrendingUp, X, Zap } from 'lucide-react';
import { localizedText } from '../../utils/localize';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

// Returns days until expiry (negative = already expired)
function daysUntilExpiry(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const PROMO_LABELS = {
  boost_1_day: { name: 'Subir 24 horas', totalMs: 1 * 24 * 60 * 60 * 1000, category: 'boost' },
  boost_3_days: { name: 'Subir 3 días', totalMs: 3 * 24 * 60 * 60 * 1000, category: 'boost' },
  highlight_7_days: { name: 'Resaltado 7 días', totalMs: 7 * 24 * 60 * 60 * 1000, category: 'highlight' },
  featured_7_days: { name: 'Destacado 7 días', totalMs: 7 * 24 * 60 * 60 * 1000, category: 'top' },
  featured_30_days: { name: 'Destacado 30 días', totalMs: 30 * 24 * 60 * 60 * 1000, category: 'top' },
  top_category_7_days: { name: 'Top categoría 7 días', totalMs: 7 * 24 * 60 * 60 * 1000, category: 'top' },
};

// Las 3 categorías de promoción que se pueden comprar (solo una puede estar activa a la vez por anuncio)
const PROMO_CATEGORIES = [
  { key: 'boost', label: 'Subir' },
  { key: 'highlight', label: 'Resaltar' },
  { key: 'top', label: 'Destacar arriba' },
];

function formatRemaining(remainingMs) {
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  return days >= 1
    ? `${days} ${days === 1 ? 'día' : 'días'} restante${days === 1 ? '' : 's'}`
    : `${Math.max(1, hours)} h restante${hours === 1 ? '' : 's'}`;
}

// Returns { name, remainingLabel, percentLeft, category } for an active (non-expired) promotion, or null
function activePromotion(ad) {
  if (!ad.boost_type || !ad.boost_expires_at) return null;
  const meta = PROMO_LABELS[ad.boost_type];
  if (!meta) return null;
  const remainingMs = new Date(ad.boost_expires_at) - Date.now();
  if (remainingMs <= 0) return null;

  const percentLeft = Math.min(100, Math.max(0, Math.round((remainingMs / meta.totalMs) * 100)));

  return { name: meta.name, remainingLabel: formatRemaining(remainingMs), percentLeft, category: meta.category };
}

export default function MyAdsScreen({
  userAds,
  getImageUrl,
  handleDeleteAd,
  handleToggleAdStatus,
  handlePromoteAd,
  handleRepublishAd,
  handleRenewAd,
  t,
  lang,
  accountType,
  setCurrentTab,
  setShowPricingModal,
  onRefreshAds,
  handleBulkUpload,
  fileInputRef,
  isUploadingBulk,
  userRole,
}) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const counts = useMemo(() => ({
    all: userAds.length,
    active: userAds.filter(ad => ad.status === 'active').length,
    paused: userAds.filter(ad => ad.status === 'paused').length,
    featured: userAds.filter(ad => ad.promoted || ad.is_featured).length,
    draft: userAds.filter(ad => ad.status === 'draft').length,
    pending: userAds.filter(ad => ad.status === 'pending').length,
    sold: userAds.filter(ad => ad.status === 'sold' || ad.status === 'inactive' || ad.status === 'archived').length,
    rejected: userAds.filter(ad => ad.status === 'rejected').length,
  }), [userAds]);

  const filteredAds = useMemo(() => {
    let list;
    if (filter === 'active') list = userAds.filter(ad => ad.status === 'active');
    else if (filter === 'paused') list = userAds.filter(ad => ad.status === 'paused');
    else if (filter === 'featured') list = userAds.filter(ad => ad.promoted || ad.is_featured);
    else if (filter === 'draft') list = userAds.filter(ad => ad.status === 'draft');
    else if (filter === 'pending') list = userAds.filter(ad => ad.status === 'pending');
    else if (filter === 'sold') list = userAds.filter(ad => ad.status === 'sold' || ad.status === 'inactive' || ad.status === 'archived');
    else if (filter === 'rejected') list = userAds.filter(ad => ad.status === 'rejected');
    else list = userAds;

    const sorted = [...list];
    if (sortBy === 'recent') sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    else if (sortBy === 'oldest') sorted.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    else if (sortBy === 'price_desc') sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    else if (sortBy === 'price_asc') sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    else if (sortBy === 'views_desc') sorted.sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
    else if (sortBy === 'expiring_soon') sorted.sort((a, b) => {
      const da = daysUntilExpiry(a.expires_at); const db = daysUntilExpiry(b.expires_at);
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
    return sorted;
  }, [filter, sortBy, userAds]);

  const allVisibleSelected = filteredAds.length > 0 && filteredAds.every(ad => selectedIds.has(ad.id));

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const doBulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/ads/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action, ad_ids: [...selectedIds] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');
      setToast({ type: 'success', text: `${data.affected || selectedIds.size} ${t.ads_updated || 'anuncios actualizados'}` });
      cancelSelection();
      onRefreshAds?.();
    } catch (error) {
      setToast({ type: 'error', text: error.message || t.connection_error || 'Error de red' });
    } finally {
      setBulkLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const doBulkPromoteWithCredits = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/ads/promote/credits/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ad_ids: [...selectedIds] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');
      const promotedCount = data.promoted_ids?.length || 0;
      setToast({ type: 'success', text: `${promotedCount} ${t.ads_promoted || 'anuncios promocionados'} (saldo: ${data.balance})` });
      cancelSelection();
      onRefreshAds?.();
    } catch (error) {
      setToast({ type: 'error', text: error.message || t.connection_error || 'Error de red' });
    } finally {
      setBulkLoading(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const sortOptions = [
    ['recent', t.sort_recent || 'Más recientes'],
    ['oldest', t.sort_oldest || 'Más antiguos'],
    ['price_desc', t.sort_price_desc || 'Precio: mayor a menor'],
    ['price_asc', t.sort_price_asc || 'Precio: menor a mayor'],
    ['views_desc', t.sort_views || 'Más vistos'],
    ['expiring_soon', t.sort_expiring || 'Por vencer'],
  ];

  const filters = [
    ['all', t.all_filter || 'All', counts.all],
    ['active', t.active_status || 'Active', counts.active],
    ['paused', t.paused_status || 'Paused', counts.paused],
    ['featured', t.featured_status || 'Featured', counts.featured],
    ['draft', t.draft_status || 'Drafts', counts.draft],
    ['pending', t.pending_status || 'Pending review', counts.pending],
    ['sold', t.sold_status || 'Sold', counts.sold],
    ['rejected', t.rejected_status || 'Rejected', counts.rejected],
  ];

  return (
    <>
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'success' ? 'bg-[#84CC16] text-white' : 'bg-red-500 text-white'}`}>
          {toast.text}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm flex-1">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
          <h2 className="text-[18px] font-bold text-slate-900 dark:text-white">
            {t.my_ads}
            <span className="text-slate-500 dark:text-slate-400 font-medium ml-2 text-[15px]">({counts[filter]})</span>
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => selectionMode ? cancelSelection() : setSelectionMode(true)} className="btn-sm border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5">
              {selectionMode ? <X className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{selectionMode ? (t.cancel || 'Cancelar') : (t.select || 'Seleccionar')}</span>
            </button>
            {(userRole === 'business' || userRole === 'admin') && handleBulkUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.xml,.xlsx"
                  onChange={handleBulkUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef?.current?.click()}
                  disabled={isUploadingBulk}
                  className="btn-sm border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUploadingBulk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{t.bulk_upload || 'Subir Excel/CSV'}</span>
                </button>
              </>
            )}
            <button onClick={() => setCurrentTab('post')} className="text-[13px] font-semibold text-[#65A30D] hover:text-[#84CC16] flex items-center gap-1">
              <PlusCircle className="w-4 h-4" /> {t.post}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pt-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1 overflow-x-auto">
            {selectionMode && (
              <button
                onClick={() => setSelectedIds(allVisibleSelected ? new Set() : new Set(filteredAds.map(ad => ad.id)))}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 dark:text-slate-300 mr-4 shrink-0 pb-3"
              >
                {allVisibleSelected ? <CheckSquare className="w-4 h-4 text-[#84CC16]" /> : <Square className="w-4 h-4 text-slate-400" />}
                {t.select_all || 'Seleccionar todo'}
              </button>
            )}
            {filters.map(([key, label, count]) => (
              <button key={key} onClick={() => { setFilter(key); cancelSelection(); }} className={`pb-3 px-1 mr-4 text-[14px] font-semibold border-b-2 transition-colors shrink-0 ${filter === key ? 'border-[#84CC16] text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                {label}<span className="text-[12px] font-normal ml-1 text-slate-400">({count})</span>
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="mb-3 shrink-0 text-[12.5px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#84CC16]/30"
          >
            {sortOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>

        {filteredAds.length === 0 ? (
          <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[12px]">{t.noAds}</div>
        ) : filteredAds.map(ad => {
          const selected = selectedIds.has(ad.id);
          const promo = activePromotion(ad);
          const CardBody = (
            <>
              {selectionMode && (
                <div className="shrink-0 self-center">{selected ? <CheckSquare className="w-5 h-5 text-[#84CC16]" /> : <Square className="w-5 h-5 text-slate-300" />}</div>
              )}
              <img src={getImageUrl(ad.image_url, ad.image)} loading="lazy" className="w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" alt={localizedText(ad.title, lang)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-semibold text-slate-900 dark:text-white text-[13.5px] line-clamp-1">{localizedText(ad.title, lang)}</h4>
                  {ad.status !== 'active' && (
                    <span className="badge bg-slate-200 text-slate-600 text-[10px] py-0.5">
                      {ad.status === 'paused' ? (t.paused_status || 'Pausado') :
                       ad.status === 'expired' ? (t.expired_status || 'Expirado') :
                       ad.status === 'draft' ? (t.draft_status || 'Borrador') :
                       ad.status === 'pending' ? (t.pending_status || 'En Moderación') :
                       ad.status === 'sold' || ad.status === 'inactive' || ad.status === 'archived' ? (t.sold_status || 'Vendido') :
                       ad.status === 'rejected' ? (t.rejected_status || 'Rechazado') :
                       ad.status}
                    </span>
                  )}
                  {(() => { const d = daysUntilExpiry(ad.expires_at); if (ad.status === 'expired' || d !== null && d <= 0) return <span className="badge bg-red-100 text-red-700 text-[10px] py-0.5">{t.expired_status || 'Expired'}</span>; if (d !== null && d <= 7 && ad.status === 'active') return <span className="badge bg-orange-100 text-orange-700 text-[10px] py-0.5">{t.expires_in || 'Expires in'} {d} {t.days || 'days'}</span>; return null; })()}
                  {(ad.promoted || ad.is_featured) && !promo && <span className="badge bg-lime-100 text-lime-700 text-[10px] py-0.5">{ad.promoted === 'urgente' ? 'Urgente' : ad.promoted === 'highlight' ? 'Resaltado' : (t.destacado || 'Destacado')}</span>}
                </div>
                <div className="flex items-center gap-3 flex-wrap mt-0.5">
                  <p className="text-[#65A30D] text-[13.5px] font-bold">
                    ${Number(ad.price).toLocaleString(lang === 'es' ? 'es-MX' : lang === 'pt' ? 'pt-BR' : 'en-US')}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {ad.views || 0} {t.views}</p>
                  {promo && (
                    <span className="text-[11px] font-semibold text-[#65A30D] flex items-center gap-1"><Zap className="w-3 h-3" /> {promo.remainingLabel}</span>
                  )}
                </div>
                {promo && (
                  <div className="mt-1 max-w-[200px] h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-[#84CC16] rounded-full transition-all" style={{ width: `${promo.percentLeft}%` }} />
                  </div>
                )}
              </div>
            </>
          );
          return (
            <div key={ad.id} onClick={selectionMode ? () => toggleSelect(ad.id) : undefined} className={`px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center ${selectionMode ? 'cursor-pointer' : ''} ${selected ? 'bg-lime-50/70 dark:bg-lime-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
              {selectionMode ? (
                <div className="flex gap-2.5 flex-1 w-full">{CardBody}</div>
              ) : (
                <Link to={`/?ad=${ad.id}`} className="flex gap-2.5 flex-1 w-full">{CardBody}</Link>
              )}

              {!selectionMode && (
                <div className="flex w-full sm:w-auto gap-1.5 mt-1 sm:mt-0 flex-wrap" onClick={e => e.stopPropagation()}>
                  <Link to={`/?ad=${ad.id}`} className="btn-sm flex-1 sm:flex-none bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 text-[11px]"><ExternalLink className="w-3 h-3" /> {t.view || 'Ver'}</Link>
                  <Link to={`/anuncio/${ad.id}/editar`} className="btn-sm flex-1 sm:flex-none bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 text-[11px]"><Pencil className="w-3 h-3" /> {t.edit || 'Editar'}</Link>
                  {ad.status === 'active' && <button onClick={() => handleToggleAdStatus(ad)} className="btn-sm flex-1 sm:flex-none bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center gap-1 text-[11px]"><Zap className="w-3 h-3" /> {t.pause || 'Pausar'}</button>}
                  {ad.status === 'paused' && <button onClick={() => handleToggleAdStatus(ad)} className="btn-sm flex-1 sm:flex-none bg-lime-50 hover:bg-lime-100 text-[#65A30D] flex items-center justify-center gap-1 text-[11px]"><Zap className="w-3 h-3" /> {t.reactivate || 'Reactivar'}</button>}
                  {(() => { const d = daysUntilExpiry(ad.expires_at); return (d !== null && d <= 7 && ad.status === 'active') ? <button onClick={() => handleRenewAd(ad)} className="btn-sm flex-1 sm:flex-none bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center gap-1 text-[11px]">{t.renew || 'Renew'}</button> : null; })()}
                  {ad.status === 'expired' && <button onClick={() => handleRepublishAd(ad)} className="btn-sm flex-1 sm:flex-none bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center gap-1 text-[11px]">{t.republish || 'Republicar'}</button>}
                  {ad.status === 'active' && PROMO_CATEGORIES.map(({ key, label }) => {
                    const isActiveHere = promo && promo.category === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handlePromoteAd(ad)}
                        title={isActiveHere ? `${promo.name} · ${promo.remainingLabel}` : label}
                        className={`btn-sm flex-1 sm:flex-none flex items-center justify-center gap-1 text-[11px] ${isActiveHere ? 'bg-[#84CC16] text-white' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        {isActiveHere ? promo.remainingLabel : label}
                      </button>
                    );
                  })}
                  <button onClick={() => handleDeleteAd(ad.id)} className="btn-sm flex-1 sm:flex-none bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center gap-1 text-[11px]"><Trash2 className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectionMode && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800 shadow-2xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 shrink-0">{selectedIds.size} {t.selected || 'seleccionados'}</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={doBulkPromoteWithCredits} disabled={bulkLoading || selectedIds.size === 0} className="btn-sm bg-[#0F172A] text-white flex items-center gap-1.5 disabled:opacity-40">{bulkLoading ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />} {t.promote_with_credits || 'Promocionar con créditos'} ({selectedIds.size} × 50)</button>
            <button onClick={() => doBulkAction('pause')} disabled={bulkLoading || selectedIds.size === 0} className="btn-sm bg-amber-50 text-amber-700 border border-amber-200 disabled:opacity-40">{t.pause || 'Pausar'}</button>
            <button onClick={() => doBulkAction('activate')} disabled={bulkLoading || selectedIds.size === 0} className="btn-sm bg-lime-50 text-[#65A30D] border border-lime-200 disabled:opacity-40">{t.reactivate || 'Activar'}</button>
            <button onClick={() => doBulkAction('delete')} disabled={bulkLoading || selectedIds.size === 0} className="btn-sm bg-red-50 text-red-600 border border-red-200 disabled:opacity-40">{t.delete || 'Eliminar'}</button>
          </div>
        </div>
      )}

      {accountType === 'particular' && (
        <div className="bg-[#0F172A] rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-lg ring-1 ring-[#0F172A] mt-6">
          <div className="mb-6 md:mb-0 md:mr-8 text-center md:text-left">
            <h3 className="text-[20px] md:text-[22px] font-bold mb-2 text-white">{t.upgrade_pro}</h3>
            <p className="text-[14px] text-white/80">{t.upgrade_pro_desc}</p>
          </div>
          <button onClick={() => setShowPricingModal(true)} className="btn-md bg-[#84CC16] hover:bg-[#65A30D] text-white whitespace-nowrap w-full md:w-auto text-center shadow-md">{t.tariffs}</button>
        </div>
      )}
    </>
  );
}
