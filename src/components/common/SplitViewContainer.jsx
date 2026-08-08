import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { MapPin, List, LayoutGrid, ChevronDown, Search } from 'lucide-react';
import { getExactMapCoordinates } from '../../utils/mapCoordinates';

const MapV3 = React.lazy(() => import('./MapV3'));

const getIsMobileCatalog = () => {
  try {
    return window.matchMedia('(max-width: 767px)').matches;
  } catch {
    return true;
  }
};

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
  category = '',
  initialFilters = {},
  loadingAds = false,
  hasMore = false,
  loadingMore = false,
  lastAdElementRef,
  getImageUrl,
  onSearchArea,
  t = {},
}) {
  const [viewLayout, setViewLayout] = useState('grid'); // 'grid' or 'list'
  const [hoveredAdId, setHoveredAdId] = useState(null);
  const [selectedAdId, setSelectedAdId] = useState(null);
  const [isMobileCatalog, setIsMobileCatalog] = useState(getIsMobileCatalog);
  const [mapCollapsed, setMapCollapsed] = useState(getIsMobileCatalog);
  const mapPreferenceTouchedRef = useRef(false);
  const listContainerRef = useRef(null);
  const adRefs = useRef({});
  const revealSentinelRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(() => isMobileCatalog ? 8 : ads.length);
  const genuineAds = useMemo(() => ads.filter(ad => !ad?.is_catalog_filler), [ads]);
  const mappableAds = useMemo(
    () => genuineAds.filter(ad => getExactMapCoordinates(ad)),
    [genuineAds],
  );
  const catalogReferenceCount = ads.length - genuineAds.length;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const syncBreakpoint = (event) => {
      const mobile = Boolean(event.matches);
      setIsMobileCatalog(mobile);
      if (!mapPreferenceTouchedRef.current) {
        setMapCollapsed(mobile);
      }
    };

    syncBreakpoint(media);
    if (media.addEventListener) media.addEventListener('change', syncBreakpoint);
    else media.addListener?.(syncBreakpoint);

    return () => {
      if (media.removeEventListener) media.removeEventListener('change', syncBreakpoint);
      else media.removeListener?.(syncBreakpoint);
    };
  }, []);

  const toggleMapCollapsed = useCallback(() => {
    mapPreferenceTouchedRef.current = true;
    setMapCollapsed(current => !current);
  }, []);

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
    setVisibleCount(current => {
      const mobileBatch = Math.min(8, ads.length);
      if (current <= 0 || current >= ads.length) return mobileBatch;
      return Math.min(ads.length, Math.max(current, mobileBatch));
    });
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
    return mappableAds.slice(0, 80).map((ad, index) => {
      const coords = getExactMapCoordinates(ad);

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
  }, [hoveredAdId, mapCollapsed, mappableAds, selectedAdId]);

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
        <div data-testid="catalog-map-shell" className={`relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md transition-all duration-300 ${mapCollapsed ? 'h-[60px]' : 'h-[220px] md:h-[320px] lg:h-[360px]'}`}>
          {!mapCollapsed && (
            <React.Suspense fallback={<div className="h-full bg-slate-800 animate-pulse rounded-xl" />}>
              <MapV3
                markers={mapMarkers}
                title={selectedState || title}
                category={category}
                initialFilters={initialFilters}
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
                  <span data-testid="catalog-map-real-count">{mappableAds.length} {t.map_real_listings || 'Anuncios reales en el mapa'}</span>
                  {catalogReferenceCount > 0 && <span data-testid="catalog-map-reference-count" className="text-slate-500 dark:text-slate-400">· {catalogReferenceCount} {t.map_catalog_references || 'Referencias de catálogo fuera del mapa'}</span>}
                </div>
              </div>
              {hoveredAdId && (
                <div className="rounded-xl bg-[#84CC16]/95 backdrop-blur-sm px-3 py-2 shadow-lg">
                  <span className="text-xs font-bold text-slate-950 animate-pulse flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                    {t.map_highlighted || 'Destacado en mapa'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Collapse/Expand toggle */}
          <button
            data-testid="catalog-map-toggle"
            onClick={toggleMapCollapsed}
            className="absolute top-3 right-3 z-[10] flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-lg hover:bg-white dark:hover:bg-slate-800 transition-all"
          >
            <MapPin size={13} className="text-[#84CC16]" />
            {mapCollapsed ? (t.open_map || 'Abrir mapa') : (t.hide_map || 'Ocultar mapa')}
            <ChevronDown size={13} className={`transition-transform ${mapCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TOOLBAR — Результаты + переключатель Grid / List              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="sticky top-[64px] z-30 mb-4 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <h2 data-testid="catalog-results-title" className="text-[16px] md:text-[18px] font-bold text-slate-900 dark:text-white">
            {t.search_results || 'Resultados'}
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[12px] font-bold text-slate-600 dark:text-slate-400">
            {genuineAds.length} {t.real_listings || 'anuncios reales'}{catalogReferenceCount > 0 ? ` · ${catalogReferenceCount} ${t.catalog_references || 'referencias de catálogo'}` : ''}
          </span>
        </div>

        {/* Grid / List Toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          <button
            data-testid="catalog-grid-view"
            onClick={() => setViewLayout('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
              viewLayout === 'grid'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            title={t.grid_view || 'Vista cuadrícula'}
          >
            <LayoutGrid size={15} />
            <span className="text-[11px] font-black">{t.grid || 'Cuadrícula'}</span>
          </button>
          <button
            data-testid="catalog-list-view"
            onClick={() => setViewLayout('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
              viewLayout === 'list'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            title={t.list_view || 'Vista lista'}
          >
            <List size={15} />
            <span className="text-[11px] font-black">{t.list || 'Lista'}</span>
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
            <span className="text-slate-400 font-bold uppercase tracking-widest text-sm">{t.no_results_found || 'No se encontraron resultados'}</span>
            <p className="text-slate-400 text-sm mt-2">{t.change_filters_or_search || 'Intenta cambiar los filtros o la búsqueda'}</p>
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
                {t.end_of_results || 'Has llegado al final'}
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
                {t.end_of_results || 'Has llegado al final'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
