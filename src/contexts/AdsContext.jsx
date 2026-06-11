import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AdsContext = createContext(null);

export function AdsProvider({ children }) {
  // === ОБЪЯВЛЕНИЯ ===
  const [serverAds, setServerAds] = useState([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // === ФИЛЬТРЫ ===
  const [filters, setFilters] = useState({
    category: '',
    state: '',
    city: '',
    minPrice: '',
    maxPrice: '',
    search: '',
    sortBy: 'newest',
    onlyWithCoords: false
  });

  // === ИЗБРАННОЕ ===
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = useCallback((adId) => {
    setFavorites(prev => 
      prev.includes(adId) 
        ? prev.filter(id => id !== adId)
        : [...prev, adId]
    );
  }, []);

  const isFavorite = useCallback((adId) => favorites.includes(adId), [favorites]);

  // === ЗАГРУЗКА ОБЪЯВЛЕНИЙ ===
  const loadAds = useCallback(async (reset = false) => {
    if (loadingAds) return;
    
    setLoadingAds(true);
    const page = reset ? 1 : currentPage;
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20'
      });

      // Добавляем фильтры
      if (filters.category) params.append('category', filters.category);
      if (filters.state) params.append('state', filters.state);
      if (filters.city) params.append('city', filters.city);
      if (filters.minPrice) params.append('min_price', filters.minPrice);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);
      if (filters.search) params.append('q', filters.search);
      if (filters.sortBy) params.append('sort', filters.sortBy);
      if (filters.onlyWithCoords) params.append('has_coords', '1');

      const response = await fetch(`/api/ads?${params}`);
      const data = await response.json();

      if (reset) {
        setServerAds(data.data || []);
      } else {
        setServerAds(prev => [...prev, ...(data.data || [])]);
      }

      setTotalCount(data.meta?.total || 0);
      setHasMore(data.meta?.current_page < data.meta?.last_page);
      setCurrentPage(page + 1);
    } catch (error) {
      console.error('Failed to load ads:', error);
    } finally {
      setLoadingAds(false);
    }
  }, [loadingAds, currentPage, filters]);

  // === ОБНОВЛЕНИЕ ФИЛЬТРОВ ===
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      category: '',
      state: '',
      city: '',
      minPrice: '',
      maxPrice: '',
      search: '',
      sortBy: 'newest',
      onlyWithCoords: false
    });
  }, []);

  // === ПОИСК НА КАРТЕ ===
  const [mapBounds, setMapBounds] = useState(null);
  
  const searchInBounds = useCallback((bounds) => {
    setMapBounds(bounds);
    // TODO: Implement bounds-based search
  }, []);

  // === ИМПРЕССИИ ===
  const trackImpression = useCallback(async (adId) => {
    try {
      await fetch('/api/ads/track-impression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_id: adId })
      });
    } catch (error) {
      console.error('Failed to track impression:', error);
    }
  }, []);

  const value = {
    // Объявления
    serverAds,
    loadingAds,
    hasMore,
    totalCount,
    loadAds,
    
    // Фильтры
    filters,
    updateFilter,
    resetFilters,
    
    // Избранное
    favorites,
    toggleFavorite,
    isFavorite,
    
    // Карта
    mapBounds,
    searchInBounds,
    
    // Аналитика
    trackImpression
  };

  return (
    <AdsContext.Provider value={value}>
      {children}
    </AdsContext.Provider>
  );
}

export function useAds() {
  const context = useContext(AdsContext);
  if (!context) {
    throw new Error('useAds must be used within AdsProvider');
  }
  return context;
}
