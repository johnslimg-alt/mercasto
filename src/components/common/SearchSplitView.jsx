import React, { useState, useMemo } from 'react';
import { Map, List, X, Filter, Search as SearchIcon } from 'lucide-react';
import AdsMap from './AdsMap';

const SearchSplitView = ({
  ads,
  loading,
  viewLayout,
  showMap,
  setShowMap,
  renderAdCard,
  renderSkeletonCard,
  loadMoreRef,
  hasMore,
  onMapFilterChange,
  lang,
  isDarkMode
}) => {
  const [mapFilters, setMapFilters] = useState({ query: '', maxPrice: null, onlyGps: false });

  const filteredMapAds = useMemo(() => {
    let result = ads.filter(ad => ad.lat && ad.lng);
    if (mapFilters.query) {
      const q = mapFilters.query.toLowerCase();
      result = result.filter(ad => 
        ad.title?.toLowerCase().includes(q) || ad.description?.toLowerCase().includes(q)
      );
    }
    if (mapFilters.maxPrice) {
      result = result.filter(ad => ad.price <= mapFilters.maxPrice);
    }
    if (mapFilters.onlyGps) {
      result = result.filter(ad => ad.lat && ad.lng);
    }
    return result;
  }, [ads, mapFilters]);

  // Mobile/Tablet: toggle between list and map
  if (viewLayout !== 'desktop') {
    return (
      <>
        {showMap ? (
          <div className="relative">
            <button
              onClick={() => setShowMap(false)}
              className="absolute top-2 right-2 z-[1000] bg-white dark:bg-gray-800 shadow-lg rounded-lg px-3 py-2 flex items-center gap-1 text-sm font-medium"
            >
              <List size={16} /> {lang === 'es' ? 'Lista' : 'List'}
            </button>
            <AdsMap ads={filteredMapAds} onClose={() => setShowMap(false)} />
          </div>
        ) : (
          <div>
            {ads.map((ad, i) => renderAdCard(ad, i))}
            {loading && [...Array(4)].map((_, i) => renderSkeletonCard(i))}
            {hasMore && <div ref={loadMoreRef} className="h-10" />}
          </div>
        )}
      </>
    );
  }

  // Desktop: split view
  return (
    <div className="flex gap-4">
      {/* List - 60% */}
      <div className="flex-1 lg:w-3/5">
        {ads.map((ad, i) => renderAdCard(ad, i))}
        {loading && [...Array(4)].map((_, i) => renderSkeletonCard(i))}
        {hasMore && <div ref={loadMoreRef} className="h-10" />}
      </div>

      {/* Map - 40% */}
      <div className="lg:w-2/5 hidden lg:block">
        <div className="sticky top-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {filteredMapAds.length} {lang === 'es' ? 'anuncios en mapa' : 'ads on map'}
              </span>
              <button
                onClick={() => setShowMap(false)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {lang === 'es' ? 'Ocultar' : 'Hide'}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={lang === 'es' ? 'Filtrar...' : 'Filter...'}
                value={mapFilters.query}
                onChange={(e) => setMapFilters(f => ({...f, query: e.target.value}))}
                className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700"
              />
              <input
                type="number"
                placeholder={lang === 'es' ? 'Max $' : 'Max $'}
                value={mapFilters.maxPrice || ''}
                onChange={(e) => setMapFilters(f => ({...f, maxPrice: e.target.value ? Number(e.target.value) : null}))}
                className="w-20 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700"
              />
            </div>
          </div>
          <div className="h-[calc(100vh-200px)] rounded-xl overflow-hidden">
            <AdsMap ads={filteredMapAds} onClose={() => {}} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchSplitView;
