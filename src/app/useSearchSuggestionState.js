import { useRef, useState } from 'react';

function loadRecentSearches() {
  try {
    const storedSearches = JSON.parse(localStorage.getItem('mercasto_recent_searches') || '[]');
    if (!Array.isArray(storedSearches)) {
      localStorage.removeItem('mercasto_recent_searches');
      return [];
    }
    return storedSearches.filter(item => typeof item === 'string').slice(0, 5);
  } catch {
    localStorage.removeItem('mercasto_recent_searches');
    return [];
  }
}

export function useSearchSuggestionState() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState(loadRecentSearches);
  const suggestionDebounceRef = useRef(null);
  const suggestionAbortRef = useRef(null);
  const suggestionSequenceRef = useRef(0);
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);

  return {
    desktopSearchRef,
    highlightedIndex,
    mobileSearchRef,
    recentSearches,
    searchQuery,
    setHighlightedIndex,
    setRecentSearches,
    setSearchQuery,
    setShowSuggestions,
    setSuggestions,
    showSuggestions,
    suggestionAbortRef,
    suggestionDebounceRef,
    suggestionSequenceRef,
    suggestions,
  };
}
