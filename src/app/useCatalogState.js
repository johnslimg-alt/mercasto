import { useState } from 'react';

export function useCatalogState() {
  const [selectedState, setSelectedState] = useState('');
  const [activeCat, setActiveCat] = useState('');
  const [activeSub, setActiveSub] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [conditionFilter, setConditionFilter] = useState([]);
  const [dynamicFilters, setDynamicFilters] = useState({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedLocInput, setDebouncedLocInput] = useState('');
  const [hasMore, setHasMore] = useState(true);

  return {
    selectedState, setSelectedState,
    activeCat, setActiveCat,
    activeSub, setActiveSub,
    minPrice, setMinPrice,
    maxPrice, setMaxPrice,
    conditionFilter, setConditionFilter,
    dynamicFilters, setDynamicFilters,
    loadingMore, setLoadingMore,
    currentPage, setCurrentPage,
    debouncedSearch, setDebouncedSearch,
    debouncedLocInput, setDebouncedLocInput,
    hasMore, setHasMore,
  };
}
