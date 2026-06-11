import React, { useState, useRef, useCallback, useMemo } from 'react';
import { MapPin, List, LayoutGrid, ChevronDown } from 'lucide-react';
import MapV3 from './MapV3';

/**
 * SplitViewContainer — Desktop: список слева + карта справа (sticky)
 * Mobile: toggle между списком и картой
 * 
 * Синхронизация:
 * - Hover на карточку → подсветка маркера на карте
 * - Click на маркер → scroll к карточке + onAdClick
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
}) {
  const [mobileView, setMobileView] = useState('list'); // 'list' or 'map'
  const [hoveredAdId, setHoveredAdId] = useState(null);
  const [selectedAdId, setSelectedAdId] = useState(null);
  const listContainerRef = useRef(null);
  const adRefs = useRef({});

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
    
    // Scroll к карточке в списке (desktop)
    if (adRefs.current[ad.id]) {
      adRefs.current[ad.id].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
    
    onAdClick?.(ad);
  }, [onAdClick]);

  // Мемоизация маркеров для карты
  const mapMarkers = useMemo(() => {
    return ads.slice(0, 80).map((ad, index) => {
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
  }, [ads, hoveredAdId, selectedAdId]);

  return (
    <div className="split-view-container">
      {/* Mobile Toggle Buttons */}
      <div className="lg:hidden sticky top-[64px] z-30 mb-4 flex gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            mobileView === 'list'
              ? 'bg-slate-900 text-white dark:bg-[#84CC16] dark:text-slate-950'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <List size={16} />
          Lista ({ads.length})
        </button>
        <button
          onClick={() => setMobileView('map')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            mobileView === 'map'
              ? 'bg-slate-900 text-white dark:bg-[#84CC16] dark:text-slate-950'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <MapPin size={16} />
          Mapa
        </button>
      </div>

      {/* Desktop: Flex Row Layout */}
      <div className="hidden lg:flex gap-6">
        {/* Left: Scrollable List */}
        <div 
          ref={listContainerRef}
          className="w-[45%] overflow-y-auto pr-4"
          style={{ maxHeight: 'calc(100vh - 140px)' }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-slate-900 dark:text-white">
              Resultados <span className="text-slate-400 text-[14px] font-normal ml-1">({ads.length})</span>
            </h2>
          </div>

          {loadingAds ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#84CC16]"></div>
            </div>
          ) : ads.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
              <MapPin size={48} className="text-slate-300 mb-4" />
              <span className="text-slate-400 font-bold uppercase tracking-widest">No se encontraron resultados</span>
            </div>
          ) : (
            <div className="space-y-4">
              {ads.map((ad, index) => (
                <React.Fragment key={ad.id}>
                  <div
                    ref={(el) => (adRefs.current[ad.id] = el)}
                    onMouseEnter={() => handleAdHover(ad.id)}
                    onMouseLeave={handleAdLeave}
                    onClick={() => handleAdClick(ad)}
                    className={`cursor-pointer transition-all duration-200 rounded-2xl ${
                      hoveredAdId === ad.id 
                        ? 'ring-2 ring-[#84CC16] shadow-lg scale-[1.02]' 
                        : selectedAdId === ad.id
                        ? 'ring-2 ring-blue-500 shadow-lg'
                        : 'hover:shadow-md'
                    }`}
                  >
                    {renderAdCard(ad, { 
                      displayImageUrl: getImageUrl ? getImageUrl(ad.image_url || ad.image) : null,
                      compact: true // Компактный вид для split view
                    })}
                  </div>
                  
                  {/* Infinite scroll trigger */}
                  {index === ads.length - 1 && <div ref={lastAdElementRef} />}
                </React.Fragment>
              ))}
              
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

        {/* Right: Sticky Map */}
        <div className="w-[55%]">
          <div 
            className="sticky top-[84px]"
            style={{ height: 'calc(100vh - 140px)' }}
          >
            <div className="h-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700">
              <MapV3
                markers={mapMarkers}
                title={selectedState || title}
                onMarkerClick={handleMarkerClick}
                showFullscreen={true}
                className="h-full border-0 shadow-none rounded-none"
                highlightedAdId={hoveredAdId}
                selectedAdId={selectedAdId}
              />
            </div>
            
            {/* Map Info Overlay */}
            <div className="absolute bottom-4 left-4 right-4 z-[5] rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 p-3 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <MapPin size={14} className="text-[#84CC16]" />
                  {ads.length} anuncio{ads.length !== 1 ? 's' : ''} en el mapa
                </span>
                {hoveredAdId && (
                  <span className="text-[#84CC16] font-bold animate-pulse">
                    ● Destacado
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Conditional Render */}
      <div className="lg:hidden">
        {mobileView === 'list' ? (
          <div>
            {loadingAds ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#84CC16]"></div>
              </div>
            ) : ads.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center">
                <MapPin size={48} className="text-slate-300 mb-4" />
                <span className="text-slate-400 font-bold uppercase tracking-widest">No se encontraron resultados</span>
              </div>
            ) : (
              <div className="space-y-4">
                {ads.map((ad, index) => (
                  <React.Fragment key={ad.id}>
                    <div
                      ref={(el) => (adRefs.current[ad.id] = el)}
                      onClick={() => handleAdClick(ad)}
                      className="cursor-pointer"
                    >
                      {renderAdCard(ad, { 
                        displayImageUrl: getImageUrl ? getImageUrl(ad.image_url || ad.image) : null
                      })}
                    </div>
                    
                    {index === ads.length - 1 && <div ref={lastAdElementRef} />}
                  </React.Fragment>
                ))}
                
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
        ) : (
          <div className="h-[calc(100vh-200px)] rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700">
            <MapV3
              markers={mapMarkers}
              title={selectedState || title}
              onMarkerClick={handleMarkerClick}
              showFullscreen={true}
              className="h-full border-0 shadow-none rounded-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
