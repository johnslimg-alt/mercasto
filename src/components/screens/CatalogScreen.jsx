import React from 'react';
import { Bell, Loader2, Settings2 } from 'lucide-react';
import SidebarFilters from '../common/SidebarFilters';
import SplitViewContainer from '../common/SplitViewContainer';
import BottomSheet from '../ui/BottomSheet';
import { normalizeSavedSearchSelection } from '../../utils/savedSearchSelection';

const SavedSearchesPanel = React.lazy(() => import('../common/SavedSearchesPanel'));

export default function CatalogScreen({
  activeCat,
  conditionFilter,
  dynamicFilters,
  executeSearch,
  getImageUrl,
  handleSaveSearchAlert,
  handleViewAd,
  hasMore,
  lang,
  lastAdElementRef,
  loadingAds,
  loadingMore,
  maxPrice,
  minPrice,
  onSearchArea,
  renderAdCard,
  savingSearchAlert,
  searchQuery,
  selectedState,
  serverAds,
  setActiveCat,
  setConditionFilter,
  setDynamicFilters,
  setMaxPrice,
  setMinPrice,
  setSearchLocation,
  setSearchLocationInput,
  setSearchQuery,
  setSelectedState,
  t,
  token,
  user,
}) {
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);
  const [catalogToast, setCatalogToast] = React.useState(null);
  const toastTimerRef = React.useRef(null);
  const safeServerAds = React.useMemo(
    () => (Array.isArray(serverAds) ? serverAds : []),
    [serverAds],
  );

  const applySavedSearch = React.useCallback((filters, closeFilters = false) => {
    const {
      query,
      category,
      state,
      minPrice: nextMinPrice,
      maxPrice: nextMaxPrice,
    } = normalizeSavedSearchSelection(filters);

    setSearchQuery(query);
    setActiveCat(category);
    setSelectedState(state);
    setSearchLocation?.(null);
    setSearchLocationInput?.(state);
    setMinPrice(nextMinPrice);
    setMaxPrice(nextMaxPrice);
    executeSearch?.(query, state, category, {
      minPrice: nextMinPrice,
      maxPrice: nextMaxPrice,
      source: 'saved_search',
    });
    if (closeFilters) setShowMobileFilters(false);
  }, [
    executeSearch,
    setActiveCat,
    setMaxPrice,
    setMinPrice,
    setSearchLocation,
    setSearchLocationInput,
    setSearchQuery,
    setSelectedState,
  ]);

  const showCatalogToast = React.useCallback((message) => {
    window.clearTimeout(toastTimerRef.current);
    setCatalogToast(message);
    toastTimerRef.current = window.setTimeout(() => setCatalogToast(null), 3200);
  }, []);

  React.useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  const currentFilters = React.useMemo(() => ({
    query: searchQuery,
    category: activeCat,
    state: selectedState,
    min_price: minPrice,
    max_price: maxPrice,
  }), [activeCat, maxPrice, minPrice, searchQuery, selectedState]);

  const filterProps = {
    activeCat,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    conditionFilter,
    setConditionFilter,
    dynamicFilters,
    setDynamicFilters,
    t,
    lang,
  };

  return (
    <div className="relative min-h-[calc(100vh-11rem)]" data-catalog-screen>
      {catalogToast && (
        <div className="fixed left-1/2 top-24 z-[120] -translate-x-1/2 rounded-2xl border border-lime-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-xl shadow-slate-900/10">
          {catalogToast}
        </div>
      )}

      <div className="mx-auto flex min-h-[calc(100vh-11rem)] max-w-[1440px] flex-col gap-6 px-4 py-6 pb-28 md:pb-8 lg:flex-row lg:px-6 lg:py-8">
        <div className="mb-2 flex min-h-10 items-center justify-between md:hidden">
          <h1 className="text-[18px] font-bold text-slate-900 dark:text-white">
            {t.search_results || 'Resultados'}
            <span className="ml-1 text-[14px] font-normal text-slate-400">({safeServerAds.length})</span>
          </h1>
          <button
            onClick={() => setShowMobileFilters(value => !value)}
            className={`btn-sm flex items-center gap-2 border transition-colors ${showMobileFilters ? 'border-slate-900 bg-slate-900 text-white dark:border-[#84CC16] dark:bg-[#84CC16] dark:text-slate-950' : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}
          >
            <Settings2 size={16} /> Filtros
          </button>
        </div>

        <aside className="hidden shrink-0 lg:block lg:w-1/4">
          <SidebarFilters {...filterProps} />
          {user && (
            <React.Suspense fallback={null}>
              <SavedSearchesPanel
                user={user}
                token={token}
                currentFilters={currentFilters}
                onSearchSelect={filters => applySavedSearch(filters)}
              />
            </React.Suspense>
          )}
        </aside>

        <BottomSheet
          isOpen={showMobileFilters}
          onClose={() => setShowMobileFilters(false)}
          title={t.filters || 'Filtros'}
          maxHeight="90vh"
          zIndex={9999}
        >
          <div className="block p-6 md:hidden">
            <SidebarFilters {...filterProps} />
            {user && (
              <div className="mt-4">
                <React.Suspense fallback={null}>
                  <SavedSearchesPanel
                    user={user}
                    token={token}
                    currentFilters={currentFilters}
                    onSearchSelect={filters => applySavedSearch(filters, true)}
                  />
                </React.Suspense>
              </div>
            )}
          </div>
        </BottomSheet>

        {showMobileFilters && (
          <div className="fixed inset-0 z-[9999] hidden items-stretch justify-start bg-slate-900/60 backdrop-blur-sm md:flex lg:hidden">
            <div className="absolute inset-0 -z-10" onClick={() => setShowMobileFilters(false)} />
            <div className="h-full w-[360px] overflow-y-auto border-r border-slate-200 bg-white p-6 shadow-2xl animate-slideRight dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{t.filters || 'Filtros'}</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:text-slate-900 dark:bg-slate-800 dark:hover:text-white"
                >
                  ✕
                </button>
              </div>
              <SidebarFilters {...filterProps} />
              {user && (
                <div className="mt-4">
                  <React.Suspense fallback={null}>
                    <SavedSearchesPanel
                      user={user}
                      token={token}
                      currentFilters={currentFilters}
                      onSearchSelect={filters => applySavedSearch(filters, true)}
                    />
                  </React.Suspense>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-6 hidden min-h-9 items-center justify-between gap-3 lg:flex">
            <button
              onClick={handleSaveSearchAlert}
              disabled={savingSearchAlert}
              className="btn-sm flex items-center gap-2 border border-[#84CC16]/40 bg-[#84CC16]/10 text-[#365314] hover:bg-[#84CC16]/20 disabled:opacity-60 dark:text-[#BEF264]"
            >
              {savingSearchAlert ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
              Guardar búsqueda
            </button>
          </div>

          <SplitViewContainer
            ads={safeServerAds}
            onAdClick={handleViewAd}
            renderAdCard={renderAdCard}
            title={selectedState || t.all_mexico || 'Todo México'}
            selectedState={selectedState}
            loadingAds={loadingAds}
            hasMore={hasMore}
            loadingMore={loadingMore}
            lastAdElementRef={lastAdElementRef}
            getImageUrl={getImageUrl}
            onSearchArea={area => {
              onSearchArea?.(area);
              showCatalogToast('Búsqueda por área aplicada');
            }}
          />
        </div>
      </div>
    </div>
  );
}
