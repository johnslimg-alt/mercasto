import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { MapPin, List, LayoutGrid, ChevronDown, Search } from 'lucide-react';

const MapV3 = React.lazy(() => import('./MapV3'));

/**
 * SplitViewContainer — Карта сверху, объявления снизу с переключателем Grid/List
 * 
 * Layout:
 * ┌─────────────────────────────────────────┐
 * │           MAP (top, full width)         │
 * ├─────────────────────────────────────────┤
 * │ Toolbar: results count + Grid/List toggle│
 * ├─────────────────────────────────────────┤
 * │  Ad grid or Ad list below              │
 * └─────────────────────────────────────────┘
 */
export default function SplitViewContainer({
  ads = [],
  onAdClick,
  renderAdCard,
  title = 'Todo México',
  selectedState,
  loadingAds = false,
  hasMore = false,
  loadingMore = false,
  lastAdElementRef,
  getImageUrl,
  onSearchArea,
}) {
  const [viewLayout, setViewLayout] = useState('grid'); // 'grid' or 'list'
  const [hoveredAdId, setHoveredAdId] = useState(null);
  const [selectedAdId, setSelectedAdId] = useState(null);
  const [mapCollapsed, setMapCollapsed] = useState(() => {
    try {
      return window.innerWidth < 768;
    } catch (e) {
      return true;
    }
  });
  const listContainerRef = useRef(null);
  const adRefs = useRef({});
  const revealSentinelRef = useRef(null);
  const isMobileCatalog = useMemo(() => {
    try {
      return window.matchMedia('(max-width: 767px)').matches;
    } catch {
      return true;
    }
  }, []);
  const [visibleCount, setVisibleCount] = useState(() => isMobileCatalog ? 8 : ads.length);
  const genuineAds = useMemo(() => ads.filter(ad => !ad?.is_catalog_filler), [ads]);
  const catalogReferenceCount = ads.length - genuineAds.length;

  // Обработчики для синхронизации
  const handleAdHover = useCallback((adId) => {
    setHoveredAdId(adId);
  }, []);

  const handleAdLeave = useCallback(() => {
    setHoveredAdId(null);
  }, []);

  const handleAdClick = useCallback((ad) => {
    setSelectedAdId(ad.id);
    onAdClick?.(ad);
  }, [onAdClick]);

  const handleMarkerClick = useCallback((ad) => {
    setSelectedAdId(ad.id);
    
    // Scroll к карточке в списке
    if (adRefs.current[ad.id]) {
      adRefs.current[ad.id].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
    
    onAdClick?.(ad);
  }, [onAdClick]);

  // Получение изображения с fallback на placeholder
  const getAdImage = useCallback((ad) => {
    if (getImageUrl) {
      const url = getImageUrl(ad.image_url || ad.image);
      if (url) return url;
    }
    if (ad.image_url) return ad.image_url;
    if (ad.image) return ad.image;
    return '/placeholder-ad.svg';
  }, [getImageUrl]);

  useEffect(() => {
    if (!isMobileCatalog) {
      setVisibleCount(ads.length);
      return;
    }
    setVisibleCount(current => Math.min(ads.length, Math.max(current || 0, Math.min(8, ads.length))));
  }, [ads.length, isMobileCatalog]);

  useEffect(() => {
    if (!isMobileCatalog || visibleCount >= ads.length) return undefined;
    const sentinel = revealSentinelRef.current;
    if (!sentinel || !('IntersectionObserver' in window)) {
      setVisibleCount(ads.length);
      return undefined;
    }

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisibleCount(current => Math.min(ads.length, current + 8));
      }
    }, { rootMargin: '200px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [ads.length, isMobileCatalog, visibleCount]);

  const visibleAds = useMemo(
    () => ads.slice(0, isMobileCatalog ? visibleCount : ads.length),
    [ads, isMobileCatalog, visibleCount],
  );

  // Build map markers only after the collapsed map is opened. This avoids
  // preparing dozens of marker objects during the mobile catalog's first paint.
  const mapMarkers = useMemo(() => {
    if (mapCollapsed) return [];
    return genuineAds.slice(0, 80).map((ad, index) => {
      const lat = Number(ad.latitude ?? ad.lat);
      const lng = Number(ad.longitude ?? ad.lng);
      
      let coords;
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
        coords = [lat, lng];
      } else {
        // Fallback координаты по штату
        coords = [23.6345 + (Math.sin(index * 2.3) * 0.18), -102.5528 + (Math.cos(index * 2.3) * 0.18)];
      }

      return {
        id: ad.id,
        ad,
        coords,
        label: `$${Number(ad.price || 0).toLocaleString('es-MX', { notation: 'compact' })}`,
        tone: index % 2 ? 'dark' : 'lime',
        isHovered: hoveredAdId === ad.id,
        isSelected: selectedAdId === ad.id,
      };
    });
  }, [genuineAds, hoveredAdId, mapCollapsed, selectedAdId]);

  // Рендер карточки в зависимости от viewLayout
  const renderAdItem = (ad, index) => (
    <React.Fragment key={ad.id}>
      <div
        ref={(el) => (adRefs.current[ad.id] = el)}
        data-catalog-card
        onMouseEnter={() => handleAdHover(ad.id)}
        onMouseLeave={handleAdLeave}
        onClick={() => handleAdClick(ad)}
        className={`cursor-pointer transition-all duration-200 rounded-2xl ${
          hoveredAdId === ad.id 
            ? 'ring-2 ring-[#84CC16] shadow-lg scale-[1.01]' 
            : selectedAdId === ad.id
            ? 'ring-2 ring-blue-500 shadow-lg'
            : 'hover:shadow-md'
        }`}
      >
        {renderAdCard(ad, {
          displayImageUrl: getAdImage(ad),
          compact: viewLayout === 'list',
          layout: viewLayout,
          priority: index < (isMobileCatalog ? 2 : 4),
          imageWidth: isMobileCatalog ? 400 : 520,
        })}
      </div>
      
      {/* Infinite scroll trigger */}
      {index === visibleAds.length - 1 && visibleCount >= ads.length && <div ref={lastAdElementRef} data-catalog-page-sentinel />}
    </React.Fragment>
  );

  return (
    <div className="split-view-container w-full">
      
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MAP SECTION — Наверху, полная ширина                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="mb-5">
        <div className={`relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md transition-all duration-300 ${mapCollapsed ? 'h-[60px]' : 'h-[220px] md:h-[320px] lg:h-[360px]'}`}>
          {!mapCollapsed && (
            <React.Suspense fallback={<div className="h-full bg-slate-800 animate-pulse rounded-xl" />}>
              <MapV3
                markers={mapMarkers}
                title={selectedState || title}
                onMarkerClick={handleMarkerClick}
                showFullscreen={true}
                className="h-full border-0 shadow-none rounded-none"
                highlightedAdId={hoveredAdId}
                selectedAdId={selectedAdId}
                onSearchArea={onSearchArea}
              />
            </React.Suspense>
          )}
          
          {/* Map overlay info */}
          {!mapCollapsed && (
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[5] flex items-center justify-between gap-2">
              <div className="rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-2 shadow-lg">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <MapPin size={14} className="text-[#84CC16]" />
                  <span>{genuineAds.length} anuncio{genuineAds.length !== 1 ? 's' : ''} real{genuineAds.length !== 1 ? 'es' : ''} en el mapa</span>
                  {catalogReferenceCount > 0 && <span className="text-slate-500 dark:text-slate-400">· {catalogReferenceCount} referencia{catalogReferenceCount !== 1 ? 's' : ''} de catálogo fuera del mapa</span>}
                </div>
              </div>
              {hoveredAdId && (
                <div className="rounded-xl bg-[#84CC16]/95 backdrop-blur-sm px-3 py-2 shadow-lg">
                  <span className="text-xs font-bold text-slate-950 animate-pulse flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                    Destacado en mapa
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Collapse/Expand toggle */}
          <button
            onClick={() => setMapCollapsed(!mapCollapsed)}
            className="absolute top-3 right-3 z-[10] flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-lg hover:bg-white dark:hover:bg-slate-800 transition-all"
          >
            <MapPin size={13} className="text-[#84CC16]" />
            {mapCollapsed ? 'Mostrar mapa' : 'Ocultar mapa'}
            <ChevronDown size={13} className={`transition-transform ${mapCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TOOLBAR — Результаты + переключатель Grid / List              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="sticky top-[64px] z-30 mb-4 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <h2 className="text-[16px] md:text-[18px] font-bold text-slate-900 dark:text-white">
            Resultados
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[12px] font-bold text-slate-600 dark:text-slate-400">
            {genuineAds.length} reales{catalogReferenceCount > 0 ? ` · ${catalogReferenceCount} catálogo` : ''}
          </span>
        </div>

        {/* Grid / List Toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          <button
            onClick={() => setViewLayout('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
              viewLayout === 'grid'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            title="Vista cuadrícula"
          >
            <LayoutGrid size={15} />
            <span className="text-[11px] font-black">Cuadrícula</span>
          </button>
          <button
            onClick={() => setViewLayout('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
              viewLayout === 'list'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            title="Vista lista"
          >
            <List size={15} />
            <span className="text-[11px] font-black">Lista</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ADS SECTION — Grid or List layout                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div ref={listContainerRef}>
        {loadingAds ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#84CC16]"></div>
          </div>
        ) : ads.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <Search size={48} className="text-slate-300 mb-4" />
            <span className="text-slate-400 font-bold uppercase tracking-widest text-sm">No se encontraron resultados</span>
            <p className="text-slate-400 text-sm mt-2">Intenta cambiar los filtros o la búsqueda</p>
          </div>
        ) : viewLayout === 'grid' ? (
          /* ═══ GRID VIEW ═══ */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {visibleAds.map((ad, index) => renderAdItem(ad, index))}
            {visibleCount < ads.length && <div ref={revealSentinelRef} data-catalog-batch-sentinel className="col-span-full h-px" />}
            
            {loadingMore && (
              <div className="col-span-full flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#84CC16]"></div>
              </div>
            )}
            
            {!loadingMore && !hasMore && ads.length > 0 && (
              <div className="col-span-full text-center text-slate-400 font-bold uppercase tracking-widest text-xs py-10 mt-6">
                Has llegado al final
              </div>
            )}
          </div>
        ) : (
          /* ═══ LIST VIEW ═══ */
          <div className="space-y-3">
            {visibleAds.map((ad, index) => renderAdItem(ad, index))}
            {visibleCount < ads.length && <div ref={revealSentinelRef} data-catalog-batch-sentinel className="h-px" />}
            
            {loadingMore && (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#84CC16]"></div>
              </div>
            )}
            
            {!loadingMore && !hasMore && ads.length > 0 && (
              <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-xs py-10 mt-6">
                Has llegado al final
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
