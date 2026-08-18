import React from 'react';
import { Bell, Loader2, Settings2 } from 'lucide-react';
import SidebarFilters from '../common/SidebarFilters';
import SplitViewContainer from '../common/SplitViewContainer';
import BottomSheet from '../ui/BottomSheet';
import { normalizeSavedSearchSelection } from '../../utils/savedSearchSelection';

const SavedSearchesPanel = React.lazy(() => import('../common/SavedSearchesPanel'));

export default function CatalogScreen({
  activeCat,
  adsLoadError,
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
  onRetryAds,
  onSearchArea,
  renderAdCard,
  savingSearchAlert,
  searchQuery,
  searchLocationInput,
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
  const [filterViewport, setFilterViewport] = React.useState(() => {
    if (typeof window === 'undefined') return 'desktop';
    if (window.innerWidth < 768) return 'mobile';
    if (window.innerWidth < 1024) return 'tablet';
    return 'desktop';
  });
  const [catalogToast, setCatalogToast] = React.useState(null);
  const toastTimerRef = React.useRef(null);
  const tabletFilterDialogRef = React.useRef(null);
  const tabletFilterCloseRef = React.useRef(null);
  const tabletFilterOpenerRef = React.useRef(null);
  const safeServerAds = React.useMemo(
    () => (Array.isArray(serverAds) ? serverAds : []),
    [serverAds],
  );

  React.useEffect(() => {
    const updateFilterViewport = () => {
      const nextViewport = window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop';
      setFilterViewport(nextViewport);
      if (nextViewport === 'desktop') setShowMobileFilters(false);
    };
    updateFilterViewport();
    window.addEventListener('resize', updateFilterViewport);
    return () => window.removeEventListener('resize', updateFilterViewport);
  }, []);

  React.useEffect(() => {
    if (!showMobileFilters || filterViewport !== 'tablet') return undefined;
    const dialog = tabletFilterDialogRef.current;
    if (!dialog) return undefined;
    tabletFilterOpenerRef.current = document.activeElement;
    const focusableSelector = 'button:not([disabled]):not([tabindex="-1"]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const frame = window.requestAnimationFrame(() => tabletFilterCloseRef.current?.focus());
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowMobileFilters(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = Array.from(dialog.querySelectorAll(focusableSelector))
        .filter((element) => !element.hasAttribute('disabled') && element.getClientRects().length > 0);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      dialog.removeEventListener('keydown', handleKeyDown);
      const opener = tabletFilterOpenerRef.current;
      tabletFilterOpenerRef.current = null;
      window.requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus();
      });
    };
  }, [filterViewport, showMobileFilters]);
  const mapInitialFilters = React.useMemo(() => {
    const arrayFirst = (value) => Array.isArray(value) ? (value[0] || '') : (value || '');
    return {
      query: searchQuery || '',
      minPrice: minPrice || '',
      maxPrice: maxPrice || '',
      state: arrayFirst(dynamicFilters?.location_state) || selectedState || '',
      city: arrayFirst(dynamicFilters?.location_city) || '',
      listingType: arrayFirst(dynamicFilters?.listing_type) || '',
      condition: Array.isArray(conditionFilter) ? conditionFilter : [],
      dynamic: dynamicFilters || {},
      locationLabel: searchLocationInput || '',
    };
  }, [conditionFilter, dynamicFilters, maxPrice, minPrice, searchLocationInput, searchQuery, selectedState]);

  const applySavedSearch = React.useCallback((filters, closeFilters = false) => {
    const {
      query,
      category,
      state,
      city,
      minPrice: nextMinPrice,
      maxPrice: nextMaxPrice,
      condition,
      dynamicFilters: nextDynamicFilters,
    } = normalizeSavedSearchSelection(filters);
    const locationLabel = city || state;

    setSearchQuery(query);
    setActiveCat(category);
    setSelectedState(state);
    setSearchLocation?.(null);
    setSearchLocationInput?.(locationLabel);
    setMinPrice(nextMinPrice);
    setMaxPrice(nextMaxPrice);
    setConditionFilter(condition);
    setDynamicFilters(nextDynamicFilters);
    executeSearch?.(query, locationLabel, category, {
      minPrice: nextMinPrice,
      maxPrice: nextMaxPrice,
      condition,
      dynamicFilters: nextDynamicFilters,
      source: 'saved_search',
    });
    if (closeFilters) setShowMobileFilters(false);
  }, [
    executeSearch,
    setActiveCat,
    setMaxPrice,
    setMinPrice,
    setConditionFilter,
    setDynamicFilters,
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
    filters: {
      ...dynamicFilters,
      ...(conditionFilter.length ? { condition: conditionFilter } : {}),
    },
  }), [activeCat, conditionFilter, dynamicFilters, maxPrice, minPrice, searchQuery, selectedState]);

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
        <div className="mb-2 flex min-h-10 items-center justify-between lg:hidden">
          <h1 className="text-[18px] font-bold text-slate-900 dark:text-white">
            {t.search_results}
            <span className="ml-1 text-[14px] font-normal text-slate-400">({safeServerAds.length})</span>
          </h1>
          <button
            data-testid="catalog-mobile-filters"
            aria-expanded={showMobileFilters}
            onClick={() => setShowMobileFilters(value => !value)}
            className={`btn-sm flex items-center gap-2 border transition-colors ${showMobileFilters ? 'border-slate-900 bg-slate-900 text-white dark:border-[#84CC16] dark:bg-[#84CC16] dark:text-slate-950' : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}
          >
            <Settings2 size={16} /> {t.filters}
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
          isOpen={showMobileFilters && filterViewport === 'mobile'}
          onClose={() => setShowMobileFilters(false)}
          title={t.filters}
          closeLabel={t.close_btn || t.close}
          maxHeight="90vh"
          zIndex={9999}
        >
          <div className="block p-6">
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

        {showMobileFilters && filterViewport === 'tablet' && (
          <div className="fixed inset-0 z-[9999] flex items-stretch justify-start bg-slate-900/60 backdrop-blur-sm">
            <div data-pointer-dismiss-surface aria-hidden="true" className="absolute inset-0 -z-10" onClick={() => setShowMobileFilters(false)} />
            <div ref={tabletFilterDialogRef} data-testid="catalog-tablet-filter-dialog" role="dialog" aria-modal="true" aria-labelledby="tablet-filters-title" className="h-full w-[360px] overflow-y-auto border-r border-slate-200 bg-white p-6 shadow-2xl animate-slideRight dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <h2 id="tablet-filters-title" className="text-base font-bold text-slate-900 dark:text-white">{t.filters}</h2>
                <button
                  ref={tabletFilterCloseRef}
                  type="button"
                  data-testid="catalog-tablet-filter-close"
                  aria-label={t.close_btn || t.close}
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
              data-testid="catalog-save-search"
              onClick={handleSaveSearchAlert}
              disabled={savingSearchAlert}
              className="btn-sm flex items-center gap-2 border border-[#84CC16]/40 bg-[#84CC16]/10 text-[#365314] hover:bg-[#84CC16]/20 disabled:opacity-60 dark:text-[#BEF264]"
            >
              {savingSearchAlert ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
              {t.save_search}
            </button>
          </div>

          <SplitViewContainer
            ads={safeServerAds}
            onAdClick={handleViewAd}
            renderAdCard={renderAdCard}
            title={selectedState || t.all_mexico}
            selectedState={selectedState}
            category={activeCat}
            initialFilters={mapInitialFilters}
            adsLoadError={adsLoadError}
            loadingAds={loadingAds}
            hasMore={hasMore}
            loadingMore={loadingMore}
            lastAdElementRef={lastAdElementRef}
            getImageUrl={getImageUrl}
            onRetryAds={onRetryAds}
            onSearchArea={area => {
              onSearchArea?.(area);
              if (!area?.suppressToast) showCatalogToast(t.search_area_applied);
            }}
            t={t}
            lang={lang}
          />
        </div>
      </div>
    </div>
  );
}
