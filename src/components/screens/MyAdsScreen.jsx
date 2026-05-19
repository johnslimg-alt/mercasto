import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CheckSquare, ExternalLink, Loader2, Pencil, PlusCircle, Square, Trash2, TrendingUp, X, Zap } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

export default function MyAdsScreen({
  userAds,
  getImageUrl,
  handleDeleteAd,
  handleToggleAdStatus,
  handlePromoteAd,
  handleRepublishAd,
  t,
  accountType,
  setCurrentTab,
  setShowPricingModal,
  onRefreshAds,
}) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const counts = useMemo(() => ({
    all: userAds.length,
    active: userAds.filter(ad => ad.status === 'active').length,
    paused: userAds.filter(ad => ad.status === 'paused').length,
    featured: userAds.filter(ad => ad.promoted === 'destacado' || ad.is_featured).length,
  }), [userAds]);

  const filteredAds = useMemo(() => {
    if (filter === 'active') return userAds.filter(ad => ad.status === 'active');
    if (filter === 'paused') return userAds.filter(ad => ad.status === 'paused');
    if (filter === 'featured') return userAds.filter(ad => ad.promoted === 'destacado' || ad.is_featured);
    return userAds;
  }, [filter, userAds]);

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
      setToast({ type: 'success', text: `${data.affected || selectedIds.size} anuncios actualizados` });
      cancelSelection();
      onRefreshAds?.();
    } catch (error) {
      setToast({ type: 'error', text: error.message || 'Error de red' });
    } finally {
      setBulkLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const filters = [
    ['all', 'Todos', counts.all],
    ['active', 'Activos', counts.active],
    ['paused', 'Pausados', counts.paused],
    ['featured', 'Destacados', counts.featured],
  ];

  return (
    <>
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'success' ? 'bg-[#84CC16] text-white' : 'bg-red-500 text-white'}`}>
          {toast.text}
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex-1">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-[18px] font-bold text-slate-900">
            {t.my_ads}
            <span className="text-slate-500 font-medium ml-2 text-[15px]">({counts[filter]})</span>
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => selectionMode ? cancelSelection() : setSelectionMode(true)} className="btn-sm border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center gap-1.5">
              {selectionMode ? <X className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{selectionMode ? 'Cancelar' : 'Seleccionar'}</span>
            </button>
            <button onClick={() => setCurrentTab('post')} className="text-[13px] font-semibold text-[#65A30D] hover:text-[#84CC16] flex items-center gap-1">
              <PlusCircle className="w-4 h-4" /> {t.post}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 px-5 pt-4 border-b border-slate-100 bg-white overflow-x-auto">
          {selectionMode && (
            <button
              onClick={() => setSelectedIds(allVisibleSelected ? new Set() : new Set(filteredAds.map(ad => ad.id)))}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 mr-4 shrink-0 pb-3"
            >
              {allVisibleSelected ? <CheckSquare className="w-4 h-4 text-[#84CC16]" /> : <Square className="w-4 h-4 text-slate-400" />}
              Seleccionar todo
            </button>
          )}
          {filters.map(([key, label, count]) => (
            <button key={key} onClick={() => { setFilter(key); cancelSelection(); }} className={`pb-3 px-1 mr-4 text-[14px] font-semibold border-b-2 transition-colors shrink-0 ${filter === key ? 'border-[#84CC16] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {label}<span className="text-[12px] font-normal ml-1 text-slate-400">({count})</span>
            </button>
          ))}
        </div>

        {filteredAds.length === 0 ? (
          <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[12px]">{t.noAds}</div>
        ) : filteredAds.map(ad => {
          const selected = selectedIds.has(ad.id);
          return (
            <div key={ad.id} onClick={selectionMode ? () => toggleSelect(ad.id) : undefined} className={`p-5 border-b border-slate-100 last:border-0 flex flex-col sm:flex-row gap-4 items-start sm:items-center ${selectionMode ? 'cursor-pointer' : ''} ${selected ? 'bg-lime-50/70' : 'hover:bg-slate-50'}`}>
              <div className="flex gap-3 flex-1 w-full">
                {selectionMode && (
                  <div className="shrink-0 self-center">{selected ? <CheckSquare className="w-5 h-5 text-[#84CC16]" /> : <Square className="w-5 h-5 text-slate-300" />}</div>
                )}
                <img src={getImageUrl(ad.image_url, ad.image)} loading="lazy" className="w-24 h-24 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-200 shrink-0" alt="" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-slate-900 text-[15px] line-clamp-1">{ad.title}</h4>
                    {ad.status !== 'active' && <span className="badge bg-slate-200 text-slate-600">{ad.status}</span>}
                    {(ad.promoted === 'destacado' || ad.is_featured) && <span className="badge bg-lime-100 text-lime-700">Destacado</span>}
                  </div>
                  <p className="text-[#65A30D] text-[16px] font-bold mt-1">${Number(ad.price).toLocaleString('es-MX')}</p>
                  <p className="text-[12px] text-slate-500 flex items-center gap-1 mt-2"><BarChart3 className="w-3.5 h-3.5" /> {ad.views || 0} {t.views}</p>
                </div>
              </div>

              {!selectionMode && (
                <div className="flex w-full sm:w-auto gap-2 mt-2 sm:mt-0 flex-wrap" onClick={e => e.stopPropagation()}>
                  <Link to={`/?ad=${ad.id}`} className="btn-sm flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-1.5 text-xs"><ExternalLink className="w-3.5 h-3.5" /> Ver</Link>
                  <Link to={`/anuncio/${ad.id}/editar`} className="btn-sm flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-1.5 text-xs"><Pencil className="w-3.5 h-3.5" /> Editar</Link>
                  {ad.status === 'active' && <button onClick={() => handleToggleAdStatus(ad)} className="btn-sm flex-1 sm:flex-none bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center gap-1.5 text-xs"><Zap className="w-3.5 h-3.5" /> Pausar</button>}
                  {ad.status === 'paused' && <button onClick={() => handleToggleAdStatus(ad)} className="btn-sm flex-1 sm:flex-none bg-lime-50 hover:bg-lime-100 text-[#65A30D] flex items-center justify-center gap-1.5 text-xs"><Zap className="w-3.5 h-3.5" /> Reactivar</button>}
                  {ad.status === 'expired' && <button onClick={() => handleRepublishAd(ad)} className="btn-sm flex-1 sm:flex-none bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center gap-1.5 text-xs">Republicar</button>}
                  {ad.status === 'active' && <button onClick={() => handlePromoteAd(ad)} className="btn-sm flex-1 sm:flex-none bg-[#0F172A] hover:bg-black text-white flex items-center justify-center gap-1.5 text-xs"><TrendingUp className="w-3.5 h-3.5" /> {t.promote}</button>}
                  <button onClick={() => handleDeleteAd(ad.id)} className="btn-sm flex-1 sm:flex-none bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center gap-1.5 text-xs"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectionMode && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-slate-200 shadow-2xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold text-slate-700 shrink-0">{selectedIds.size} seleccionados</span>
          <div className="flex items-center gap-2">
            <button onClick={() => doBulkAction('pause')} disabled={bulkLoading || selectedIds.size === 0} className="btn-sm bg-amber-50 text-amber-700 border border-amber-200 disabled:opacity-40">{bulkLoading ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : 'Pausar'}</button>
            <button onClick={() => doBulkAction('activate')} disabled={bulkLoading || selectedIds.size === 0} className="btn-sm bg-lime-50 text-[#65A30D] border border-lime-200 disabled:opacity-40">Activar</button>
            <button onClick={() => doBulkAction('delete')} disabled={bulkLoading || selectedIds.size === 0} className="btn-sm bg-red-50 text-red-600 border border-red-200 disabled:opacity-40">Eliminar</button>
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
