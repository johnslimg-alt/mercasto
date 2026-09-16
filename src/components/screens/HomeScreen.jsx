import React from 'react';
import ItemListSchema from '../seo/ItemListSchema';
import FAQSchema from '../seo/FAQSchema';
import MercastoGoldenHome from '../home/MercastoGoldenHome';
import MercastoHomeFunctionalBlocks from '../home/MercastoHomeFunctionalBlocks';

export default function HomeScreen({
  automotiveAds,
  executeSearch,
  lang,
  realEstateAds,
  searchLocationInput,
  selectedState,
  serverAds,
  setActiveCat,
  setSearchLocationInput,
  setSearchQuery,
  setSelectedState,
  setAuthMode,
  setShowAuthModal,
  setShowPricingModal,
  t,
  getImageUrl,
  handleViewAd,
  user,
}) {
  const safeServerAds = React.useMemo(
    () => (Array.isArray(serverAds) ? serverAds : []),
    [serverAds],
  );

  const [featuredAds, setFeaturedAds] = React.useState(() => {
    if (typeof window === 'undefined') return [];
    if (window.__FEATURED_ADS_CACHE__) return window.__FEATURED_ADS_CACHE__;
    try {
      const cached = localStorage.getItem('__mercasto_featured_ads');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    const apiUrl =
      (typeof window !== 'undefined' && window.__API_URL__) ||
      import.meta.env?.VITE_API_URL ||
      '/api';

    const prefetched =
      typeof window !== 'undefined' && window.__FEATURED_ADS_PROMISE__;

    const request = prefetched
      ? prefetched
      : fetch(apiUrl + '/ads/featured', {
          headers: { Accept: 'application/json' },
        }).then((response) => (response.ok ? response.json() : null));

    let mounted = true;
    request
      .then((data) => {
        if (!mounted) return;
        const next = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];
        setFeaturedAds(next);
        try {
          localStorage.setItem('__mercasto_featured_ads', JSON.stringify(next));
        } catch {
          // Storage is an optional performance cache.
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <MercastoGoldenHome
        serverAds={safeServerAds}
        featuredAds={featuredAds}
        executeSearch={executeSearch}
        setSearchQuery={setSearchQuery}
        setActiveCat={setActiveCat}
        setAuthMode={setAuthMode}
        setShowAuthModal={setShowAuthModal}
        user={user}
        setSearchLocationInput={setSearchLocationInput}
        searchLocationInput={searchLocationInput}
        selectedState={selectedState}
        setSelectedState={setSelectedState}
        openPricing={() => setShowPricingModal?.(true)}
        handleViewAd={handleViewAd}
        getImageUrl={getImageUrl}
        lang={lang}
        t={t}
      />

      <MercastoHomeFunctionalBlocks
        automotiveAds={automotiveAds}
        executeSearch={executeSearch}
        handleViewAd={handleViewAd}
        lang={lang}
        realEstateAds={realEstateAds}
        selectedState={selectedState}
        setActiveCat={setActiveCat}
        setSearchLocationInput={setSearchLocationInput}
        setSearchQuery={setSearchQuery}
        setSelectedState={setSelectedState}
        t={t}
        user={user}
      />

      {safeServerAds.length > 0 && (
        <ItemListSchema
          items={safeServerAds}
          listName={(t?.featured || 'Mercasto') + ' · Mercasto'}
          lang={lang}
        />
      )}

      <div className="sr-only" aria-hidden="true">
        <span>Mercasto: compra, vende y renta en todo México</span>
      </div>
      <FAQSchema pageType="home" lang={lang} renderContent={false} />
    </>
  );
}
