import React from 'react';
import ItemListSchema from '../seo/ItemListSchema';
import FAQSchema from '../seo/FAQSchema';
import MercastoGoldenHome from '../home/MercastoGoldenHome';

export default function HomeScreen({
  executeSearch,
  lang,
  serverAds,
  setActiveCat,
  setSearchLocationInput,
  setSearchQuery,
  setSelectedState,
  t,
  getImageUrl,
  handleViewAd,
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
        setSearchLocationInput={setSearchLocationInput}
        setSelectedState={setSelectedState}
        handleViewAd={handleViewAd}
        getImageUrl={getImageUrl}
      />

      {safeServerAds.length > 0 && (
        <ItemListSchema
          items={safeServerAds}
          listName={(t?.featured || 'Mercasto') + ' · Mercasto'}
          lang={lang}
        />
      )}

      <div className="sr-only" aria-hidden="true">
        <FAQSchema pageType="home" lang={lang} />
      </div>
    </>
  );
}
