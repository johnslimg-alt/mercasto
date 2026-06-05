import React, { useState, useEffect, useMemo } from 'react';
import { Crosshair, Maximize2, Search, X, Loader2, SlidersHorizontal, MapPin, Layers, Filter } from 'lucide-react';
import { filterConfig } from '../../constants/filterConfig';
import { MEXICO_STATES, MEXICO_STATES_CITIES } from '../../utils/mexicoStates';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const DEFAULT_MARKERS = [
  { label: '$1.7k', coords: [19.4326, -99.1332], tone: 'lime' },
  { label: '$41k', coords: [20.6597, -103.3496], tone: 'dark' },
  { label: '$914', coords: [25.6866, -100.3161], tone: 'lime' },
  { label: '$35k', coords: [21.1619, -86.8515], tone: 'dark' },
];

let leafletPromise;
const loadLeaflet = () => {
  if (!leafletPromise) {
    leafletPromise = import('leaflet').then((mod) => mod.default || mod);
  }
  return leafletPromise;
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getAdImageUrl = (ad) => {
  const STORAGE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_STORAGE_URL) || '';
  const raw = ad?.image_url || ad?.image || null;
  if (!raw) return null;
  // Handle JSON array string like '["url1","url2"]' or '["url"]'
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0 && arr[0]) {
        const u = String(arr[0]);
        if (u.startsWith('http')) return u;
        if (u.startsWith('/')) return (STORAGE_URL || '') + u;
        return u;
      }
    } catch (e) { /* not JSON, fall through */ }
  }
  // Handle plain string URL
  if (typeof raw === 'string') {
    if (raw.startsWith('http')) return raw;
    if (raw.startsWith('/')) return (STORAGE_URL || '') + raw;
    return raw;
  }
  // Handle array directly
  if (Array.isArray(raw) && raw.length > 0) {
    const u = String(raw[0]);
    if (u.startsWith('http')) return u;
    if (u.startsWith('/')) return (STORAGE_URL || '') + u;
    return u;
  }
  return null;
};


const coordsToPoint = ([lat, lon]) => {
  const minLat = 14;
  const maxLat = 33;
  const minLon = -118;
  const maxLon = -86;
  const x = ((Number(lon) - minLon) / (maxLon - minLon)) * 100;
  const y = 100 - ((Number(lat) - minLat) / (maxLat - minLat)) * 100;
  return {
    left: `${Math.min(90, Math.max(8, x))}%`,
    top: `${Math.min(84, Math.max(14, y))}%`,
  };
};

const markerAccuracyLabel = (marker = {}) => (
  marker.accuracyLabel || (marker.approximate ? 'Approx' : 'GPS real')
);

const markerAccuracyClass = (marker = {}) => (
  marker.approximate
    ? 'bg-amber-100 text-amber-900 dark:bg-amber-400 dark:text-slate-950'
    : 'bg-[#84CC16] text-slate-950'
);

// Location coordinates for geocoding
const STATE_COORDS = {
  'Ciudad de México': [19.4326, -99.1332],
  CDMX: [19.4326, -99.1332],
  Jalisco: [20.6597, -103.3496],
  'Nuevo León': [25.6866, -100.3161],
  'México': [19.2925, -99.6557],
  'Estado de México': [19.2925, -99.6557],
  Puebla: [19.0414, -98.2063],
  Querétaro: [20.5888, -100.3899],
  'Baja California': [32.5149, -117.0382],
  'Quintana Roo': [21.1619, -86.8515],
  Yucatán: [20.9674, -89.5926],
  Veracruz: [19.1738, -96.1342],
  Guanajuato: [21.019, -101.2574],
  Chihuahua: [28.6329, -106.0691],
  Sonora: [29.2972, -110.3309],
  Sinaloa: [25.1721, -107.4795],
  Oaxaca: [17.0732, -96.7266],
  Chiapas: [16.7569, -93.1292],
  Michoacán: [19.5665, -101.7068],
  Guerrero: [17.4392, -99.5451],
  Tamaulipas: [24.2669, -98.8363],
};

const CITY_COORDS = {
  'ciudad de mexico': [19.4326, -99.1332],
  cdmx: [19.4326, -99.1332],
  guadalajara: [20.6597, -103.3496],
  zapopan: [20.7236, -103.3848],
  monterrey: [25.6866, -100.3161],
  puebla: [19.0414, -98.2063],
  queretaro: [20.5888, -100.3899],
  cancun: [21.1619, -86.8515],
  'puerto vallarta': [20.6534, -105.2253],
  merida: [20.9674, -89.5926],
  tijuana: [32.5149, -117.0382],
  leon: [21.125, -101.686],
  toluca: [19.2826, -99.6557],
  acapulco: [16.8531, -99.8237],
  hermosillo: [29.0729, -110.9559],
  chihuahua: [28.6329, -106.0691],
  veracruz: [19.1738, -96.1342],
  oaxaca: [17.0732, -96.7266],
  morelia: [19.7008, -101.1844],
  mazatlan: [23.2494, -106.4111],
  culiacan: [24.8091, -107.394],
  'san luis potosi': [22.1565, -100.9855],
  aguascalientes: [21.8853, -102.2916],
};

const normalizeLocationText = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

function adCoords(ad, index) {
  const lat = Number(ad?.latitude ?? ad?.lat);
  const lng = Number(ad?.longitude ?? ad?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
    return { coords: [lat, lng], approximate: false, accuracy: 'real', accuracyLabel: 'GPS real' };
  }

  const locationText = normalizeLocationText(`${ad?.city || ''} ${ad?.municipality || ''} ${ad?.location || ''} ${ad?.state || ''}`);
  const cityKey = Object.keys(CITY_COORDS).find((key) => locationText.includes(key));
  const stateKey = Object.keys(STATE_COORDS).find((key) => locationText.includes(normalizeLocationText(key)));
  const base = cityKey ? CITY_COORDS[cityKey] : (stateKey ? STATE_COORDS[stateKey] : [23.6345, -102.5528]);
  const jitter = cityKey ? 0.035 : 0.16;

  return {
    coords: [
      base[0] + (Math.sin(index * 2.31) * jitter),
      base[1] + (Math.cos(index * 2.31) * jitter),
    ],
    approximate: true,
    accuracy: cityKey ? 'city' : 'approx',
    accuracyLabel: cityKey ? 'Approx ciudad' : 'Approx estado',
  };
}

function markerLabel(ad) {
  const price = Number(ad?.price || 0);
  if (price > 0) return `$${price.toLocaleString('es-MX', { notation: 'compact' })}`;
  return ad?.category ? String(ad.category).slice(0, 10) : 'Ver';
}

export default function MapV3({
  title = 'Todo México',
  markers: propMarkers,
  ads: propAds,
  apiUrl,
  category = null,
  onSearch,
  onSearchArea,
  onMarkerClick,
  className = '',
  showFullscreen = true,
  initialFilters = {},
}) {
  const [expanded, setExpanded] = useState(false);
  const [leaflet, setLeaflet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [fetchingAds, setFetchingAds] = useState(false);
  
  // Filter states
  const [mapQuery, setMapQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlyWithCoords, setOnlyWithCoords] = useState(false);
  const [selectedState, setSelectedState] = useState(initialFilters.state || '');
  const [selectedCity, setSelectedCity] = useState(initialFilters.city || '');
  const [listingType, setListingType] = useState(initialFilters.listingType || '');
  const [conditionFilter, setConditionFilter] = useState(initialFilters.condition || []);
  const [dynamicFilters, setDynamicFilters] = useState(initialFilters.dynamic || {});
  
  // API config for category attributes
  const [apiConfig, setApiConfig] = useState(null);
  
  // Fetched ads state
  const [fetchedAds, setFetchedAds] = useState([]);
  
  const mapContainerRef = React.useRef(null);
  const largeMapContainerRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const largeMapInstanceRef = React.useRef(null);
  const mountedRef = React.useRef(true);

  // Fetch ads if apiUrl or category is provided
  useEffect(() => {
    if (!apiUrl && !category) return;
    const controller = new AbortController();
    const url = apiUrl || `${API_URL}/ads?category=${encodeURIComponent(category)}&per_page=80`;

    setFetchingAds(true);
    fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((payload) => {
        const nextAds = Array.isArray(payload) ? payload : (payload.data || []);
        setFetchedAds(nextAds);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setFetchedAds([]);
      })
      .finally(() => setFetchingAds(false));

    return () => controller.abort();
  }, [apiUrl, category]);

  // Fetch category attributes from DB
  useEffect(() => {
    if (!category) { setApiConfig(null); return; }
    let cancelled = false;
    fetch(`${API_URL}/category-attributes?category=${encodeURIComponent(category)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (!cancelled) setApiConfig(data.length > 0 ? data : null); })
      .catch(() => { if (!cancelled) setApiConfig(null); });
    return () => { cancelled = true; };
  }, [category]);

  const config = apiConfig ?? (category ? (filterConfig[category] || null) : null);

  // Convert ads to markers
  const adsMarkers = useMemo(() => {
    const sourceAds = propAds || fetchedAds;
    if (!sourceAds || !sourceAds.length) return [];
    
    return sourceAds.slice(0, 80).map((ad, index) => {
      const location = adCoords(ad, index);
      return {
        id: ad.id || `ad-${index}`,
        ad,
        coords: location.coords,
        approximate: location.approximate,
        accuracy: location.accuracy,
        accuracyLabel: location.accuracyLabel,
        label: markerLabel(ad),
        tone: location.approximate ? 'dark' : 'lime',
        title: ad.title,
        price: ad.price,
        location: ad.location || ad.city || ad.state,
        category: ad.category,
      };
    });
  }, [propAds, fetchedAds]);

  const normalizedMarkers = propMarkers || (adsMarkers.length > 0 ? adsMarkers : DEFAULT_MARKERS);
  
  const visibleMarkers = useMemo(() => {
    const query = mapQuery.trim().toLowerCase();
    const priceLimitMin = Number(minPrice);
    const priceLimitMax = Number(maxPrice);

    return normalizedMarkers.filter(marker => {
      const ad = marker.ad || {};
      const text = `${marker.label || ''} ${ad.title || ''} ${ad.location || ''} ${ad.state || ''} ${ad.category || ''}`.toLowerCase();
      const price = Number(ad.price || String(marker.label || '').replace(/[^\d.]/g, '') || 0);

      if (query && !text.includes(query)) return false;
      if (priceLimitMin > 0 && price < priceLimitMin) return false;
      if (priceLimitMax > 0 && price > priceLimitMax) return false;
      if (onlyWithCoords && (!(marker.coords && marker.coords.length >= 2) || marker.approximate)) return false;
      if (selectedState && ad.state && !ad.state.toLowerCase().includes(selectedState.toLowerCase())) return false;
      if (selectedCity && ad.city && !ad.city.toLowerCase().includes(selectedCity.toLowerCase())) return false;
      if (listingType && ad.listing_type && ad.listing_type !== listingType) return false;
      
      return true;
    });
  }, [minPrice, maxPrice, normalizedMarkers, mapQuery, onlyWithCoords, selectedState, selectedCity, listingType]);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  // Close fullscreen on Escape key
  useEffect(() => {
    if (!expanded) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [expanded]);

  const removeMap = (instanceRef) => {
    if (!instanceRef.current) return;
    try {
      instanceRef.current.off();
      instanceRef.current.remove();
    } catch {
      // Leaflet can still have pending tile events during route changes.
    }
    instanceRef.current = null;
  };

  const updateMapArea = (map) => {
    if (!map || !mountedRef.current) return null;
    try {
      const center = map.getCenter();
      const bounds = map.getBounds();
      const north = bounds.getNorthEast();
      const radiusKm = Math.max(5, Math.min(250, Math.round(center.distanceTo(north) / 1000)));
      return {
        lat: Number(center.lat.toFixed(6)),
        lng: Number(center.lng.toFixed(6)),
        radius: radiusKm,
      };
    } catch {
      return null;
    }
  };

  const handleSearchArea = () => {
    const mapArea = updateMapArea(expanded ? largeMapInstanceRef.current : mapInstanceRef.current);
    if (onSearchArea && mapArea) {
      onSearchArea({
        ...mapArea,
        query: mapQuery.trim(),
        minPrice: minPrice ? Number(minPrice) : null,
        maxPrice: maxPrice ? Number(maxPrice) : null,
        onlyWithCoords,
        state: selectedState,
        city: selectedCity,
        listingType,
        condition: conditionFilter,
        dynamic: dynamicFilters,
      });
      return;
    }
    onSearch?.();
  };

  const clearAllFilters = () => {
    setMapQuery('');
    setMinPrice('');
    setMaxPrice('');
    setOnlyWithCoords(false);
    setSelectedState('');
    setSelectedCity('');
    setListingType('');
    setConditionFilter([]);
    setDynamicFilters({});
  };

  const handleStateChange = (state) => {
    setSelectedState(state);
    setSelectedCity('');
  };

  const handleCityChange = (city) => {
    setSelectedCity(city);
  };

  const handleConditionToggle = (val) => {
    setConditionFilter(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]);
  };

  const handleDynamicToggle = (key, val) => {
    setDynamicFilters(prev => {
      const current = prev[key] || [];
      return { ...prev, [key]: current.includes(val) ? current.filter(c => c !== val) : [...current, val] };
    });
  };

  useEffect(() => {
    let active = true;
    const fallbackTimer = window.setTimeout(() => {
      if (active) {
        setLoadFailed(true);
        setLoading(false);
      }
    }, 10000);

    loadLeaflet()
      .then((L) => {
        window.clearTimeout(fallbackTimer);
        if (active) {
          setLeaflet(L);
          setLoadFailed(false);
          setLoading(false);
        }
      })
      .catch(() => {
        window.clearTimeout(fallbackTimer);
        if (active) {
          setLoadFailed(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    window.__onMapAdClick = (adId) => {
      const found = normalizedMarkers.find(m => m.id === adId || m.ad?.id === adId);
      if (found) {
        onMarkerClick?.(found.ad || found);
      }
    };
    return () => {
      delete window.__onMapAdClick;
    };
  }, [normalizedMarkers, onMarkerClick]);


// Factory function — creates a fresh popup DOM element each time
// Called by Leaflet every time the popup opens, so content is never stale
function createPopupElement(ad, marker) {
  const rawTitle = ad.title || 'Anuncio';
  const price = Number(ad.price || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const rawImg = getAdImageUrl(ad);
  const FALLBACK_IMG = `https://placehold.co/300x200/84cc16/020617/png?text=${encodeURIComponent(rawTitle.slice(0, 15))}`;
  const imgUrl = rawImg || FALLBACK_IMG;
  const accuracy = markerAccuracyLabel(marker);
  const adId = ad.id;

  const popupWrapper = document.createElement('div');
  popupWrapper.className = 'leaflet-popup-card';

  const img = document.createElement('img');
  img.src = imgUrl;
  img.className = 'leaflet-popup-card__img';
  img.alt = rawTitle;
  img.loading = 'lazy';
  img.onerror = function() {
    this.onerror = null;
    this.src = FALLBACK_IMG;
  };
  popupWrapper.appendChild(img);

  const body = document.createElement('div');
  body.className = 'leaflet-popup-card__body';

  const accSpan = document.createElement('span');
  accSpan.className = `leaflet-popup-card__accuracy ${marker.approximate ? 'leaflet-popup-card__accuracy--approx' : 'leaflet-popup-card__accuracy--real'}`;
  accSpan.textContent = accuracy;
  body.appendChild(accSpan);

  const h4 = document.createElement('h4');
  h4.className = 'leaflet-popup-card__title';
  h4.textContent = rawTitle;
  body.appendChild(h4);

  const priceP = document.createElement('p');
  priceP.className = 'leaflet-popup-card__price';
  priceP.textContent = price;
  body.appendChild(priceP);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'leaflet-popup-card__btn';
  btn.textContent = 'Ver anuncio';
  btn.addEventListener('click', () => {
    window.__onMapAdClick?.(adId);
  });
  body.appendChild(btn);

  popupWrapper.appendChild(body);
  return popupWrapper;
}

  const initMap = (container, instanceRef, isLarge = false) => {
    if (!leaflet || !container) return;

    if (instanceRef.current) {
      removeMap(instanceRef);
    }

    const L = leaflet;
    if (!L) return;

    let center = [23.6345, -102.5528];
    let zoom = isLarge ? 5 : 4;

    const validMarkers = visibleMarkers.filter(m => m.coords && Array.isArray(m.coords) && m.coords.length >= 2);
    
    if (validMarkers.length > 0) {
      if (validMarkers.length === 1) {
        center = [Number(validMarkers[0].coords[0]), Number(validMarkers[0].coords[1])];
        zoom = 10;
      } else {
        const lats = validMarkers.map(m => Number(m.coords[0]));
        const lons = validMarkers.map(m => Number(m.coords[1]));
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        center = [(minLat + maxLat) / 2, (minLon + maxLon) / 2];
        zoom = isLarge ? 6 : 5;
      }
    }

    let map;
    try {
      map = L.map(container, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: isLarge,
        fadeAnimation: false,
        markerZoomAnimation: false,
        zoomAnimation: false,
      });
    } catch {
      setLoadFailed(true);
      setLoading(false);
      return;
    }

    instanceRef.current = map;
    
    // Всегда используем светлую тему карты (OpenStreetMap)
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    // Count tile errors - only fail if most tiles fail
    let tileErrorCount = 0;
    let tileLoadCount = 0;
    const tileLayerInstance = L.tileLayer(tileUrl, {
      maxZoom: 19,
      crossOrigin: true,
      attribution: '&copy; OpenStreetMap',
    });
    
    tileLayerInstance.on('tileload', () => { tileLoadCount++; });
    tileLayerInstance.on('tileerror', () => {
      tileErrorCount++;
      // Only fail if many tiles failed AND failures exceed successes
      if (mountedRef.current && instanceRef.current === map && tileErrorCount > 5 && tileErrorCount > tileLoadCount) {
        setLoadFailed(true);
      }
    });
    tileLayerInstance.addTo(map);

    const markerGroup = L.featureGroup();

    validMarkers.forEach((marker, index) => {
      const [lat, lon] = marker.coords.map(Number);
      if (Number.isNaN(lat) || Number.isNaN(lon)) return;

      const isDarkMarker = marker.tone === 'dark' || index % 2;
      const markerHtml = `
        <div class="custom-leaflet-marker-shell">
          <div class="custom-leaflet-marker ${isDarkMarker ? 'custom-leaflet-marker--dark' : 'custom-leaflet-marker--lime'}">
            ${marker.label || '$'}
          </div>
          <div class="custom-leaflet-marker-accuracy ${marker.approximate ? 'custom-leaflet-marker-accuracy--approx' : 'custom-leaflet-marker-accuracy--real'}">
            ${escapeHtml(markerAccuracyLabel(marker))}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'leaflet-custom-icon-wrapper',
        html: markerHtml,
        iconSize: [64, 30],
        iconAnchor: [32, 15],
        popupAnchor: [0, -15]
      });

      const leafMarker = L.marker([lat, lon], { icon: customIcon }).addTo(map);

      const ad = marker.ad;
      if (ad) {
        // Use factory function — creates a NEW DOM element each time popup opens
        // This fixes the bug where popup content disappears after first close
        leafMarker.bindPopup(() => createPopupElement(ad, marker));
      }

      leafMarker.on('click', () => {
        onMarkerClick?.(marker.ad || marker);
      });

      markerGroup.addLayer(leafMarker);
    });

    if (validMarkers.length > 1 && markerGroup.getLayers().length > 0) {
      try {
        map.fitBounds(markerGroup.getBounds(), { padding: [30, 30] });
      } catch {
        // Keep the map usable even if Leaflet races during mobile route changes.
      }
    }

    window.requestAnimationFrame(() => {
      if (mountedRef.current && instanceRef.current === map) {
        try {
          map.invalidateSize();
        } catch {
          // Ignore stale map instance after unmount.
        }
      }
    });
  };

  useEffect(() => {
    if (leaflet && !expanded) {
      initMap(mapContainerRef.current, mapInstanceRef, false);
    }
    return () => {
      removeMap(mapInstanceRef);
    };
  }, [leaflet, expanded]);

  useEffect(() => {
    if (leaflet && expanded) {
      const timer = setTimeout(() => {
        initMap(largeMapContainerRef.current, largeMapInstanceRef, true);
      }, 100);
      return () => clearTimeout(timer);
    }
    return () => {
      removeMap(largeMapInstanceRef);
    };
  }, [leaflet, expanded]);

  const availableCities = selectedState ? (MEXICO_STATES_CITIES[selectedState] || []) : [];

  // FilterPanel rendered inline (no internal component — avoids React remounting errors)
  const filterPanelContent = showFilters ? (
    <div className="p-4 space-y-4 bg-slate-900/95 border-b border-slate-800 max-h-[50vh] overflow-y-auto">
      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2">
        <Search size={15} className="shrink-0 text-[#84CC16]" />
        <input
          value={mapQuery}
          onChange={(e) => setMapQuery(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
          placeholder="Buscar en el mapa..."
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={selectedState}
          onChange={(e) => handleStateChange(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white outline-none"
        >
          <option value="">Todo México</option>
          {MEXICO_STATES.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
        <select
          value={selectedCity}
          onChange={(e) => handleCityChange(e.target.value)}
          disabled={!selectedState}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white outline-none disabled:opacity-50"
        >
          <option value="">Todas las ciudades</option>
          {availableCities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {/* Price */}
      <div className="grid grid-cols-2 gap-2">
        <input
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          type="number"
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-slate-500"
          placeholder="Precio mín."
        />
        <input
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          type="number"
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-slate-500"
          placeholder="Precio máx."
        />
      </div>

      {/* Listing Type */}
      <select
        value={listingType}
        onChange={(e) => setListingType(e.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white outline-none"
      >
        <option value="">Tipo de anuncio</option>
        <option value="Venta">Venta</option>
        <option value="Renta">Renta</option>
        <option value="Renta con opción a compra">Renta con opción a compra</option>
        <option value="Traspaso">Traspaso</option>
        <option value="Gratis">Gratis</option>
        <option value="Intercambio">Intercambio</option>
        <option value="Compro">Compro</option>
        <option value="Subasta">Subasta</option>
      </select>

      {/* Condition */}
      {config?.condition && (
        <div className="space-y-2">
          <p className="text-xs font-black text-slate-400">Condición</p>
          <div className="flex flex-wrap gap-2">
            {config.condition.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => handleConditionToggle(opt)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  conditionFilter.includes(opt)
                    ? 'bg-[#84CC16] text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Filters */}
      {config && Object.entries(config).filter(([key]) => key !== 'condition').map(([key, options]) => (
        <div key={key} className="space-y-2">
          <p className="text-xs font-black text-slate-400 capitalize">{key.replace(/_/g, ' ')}</p>
          <div className="flex flex-wrap gap-2">
            {options.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => handleDynamicToggle(key, opt)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  (dynamicFilters[key] || []).includes(opt)
                    ? 'bg-[#84CC16] text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Toggles */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOnlyWithCoords(v => !v)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-colors ${
            onlyWithCoords
              ? 'bg-[#84CC16] text-slate-950'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <MapPin size={14} /> Solo GPS real
        </button>
        <button
          type="button"
          onClick={clearAllFilters}
          className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/20 px-3 py-2 text-xs font-black text-red-400 hover:bg-red-500/30 transition-colors"
        >
          <X size={14} /> Limpiar
        </button>
      </div>

      {/* Search Area Button */}
      <button
        type="button"
        onClick={handleSearchArea}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#84CC16] px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-[#a3e635] transition-colors"
      >
        <Crosshair size={16} /> Buscar en esta zona
      </button>
    </div>
  ) : null;

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-md dark:border-slate-700 dark:bg-slate-950 ${className}`}>
        {(loading || fetchingAds) && (
          <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center bg-slate-900/10 backdrop-blur-[2px] dark:bg-slate-950/20">
            <Loader2 className="h-8 w-8 animate-spin text-[#84CC16]" />
            <span className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
              {fetchingAds ? 'Cargando anuncios...' : 'Cargando mapa...'}
            </span>
          </div>
        )}
        
        {leaflet && !loadFailed ? (
          <div ref={mapContainerRef} className="h-full w-full min-h-[190px]" style={{ zIndex: 1 }} />
        ) : (
          <div className="relative h-full min-h-[190px] w-full overflow-hidden bg-[radial-gradient(circle_at_28%_48%,rgba(132,204,22,.24),transparent_16%),radial-gradient(circle_at_70%_38%,rgba(14,165,233,.22),transparent_18%),linear-gradient(135deg,#e0f2fe,#ecfccb)] dark:bg-[radial-gradient(circle_at_28%_48%,rgba(132,204,22,.22),transparent_16%),radial-gradient(circle_at_70%_38%,rgba(14,165,233,.18),transparent_18%),linear-gradient(135deg,#020617,#0f172a)]">
            {visibleMarkers.slice(0, 18).map((marker, index) => {
              const pos = coordsToPoint(marker.coords || [23.6345, -102.5528]);
              return (
                <button
                  key={marker.id || index}
                  type="button"
                  onClick={() => onMarkerClick?.(marker.ad || marker)}
                  className={`absolute z-[2] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-transform hover:scale-110`}
                  style={pos}
                >
                  <span className={`rounded-full px-3 py-1.5 text-[11px] font-black shadow-xl ring-2 ring-white/70 ${marker.tone === 'dark' ? 'bg-slate-950 text-white dark:bg-[#84CC16] dark:text-slate-950' : 'bg-[#84CC16] text-slate-950'}`}>
                    {marker.label || '$'}
                  </span>
                  <span className={`mt-1 rounded-full px-2 py-0.5 text-[9px] font-black shadow ${markerAccuracyClass(marker)}`}>
                    {markerAccuracyLabel(marker)}
                  </span>
                </button>
              );
            })}
            <div className="absolute bottom-3 left-3 rounded-full bg-slate-950/80 px-3 py-1.5 text-[11px] font-bold text-white dark:bg-white/10">
              Mapa
            </div>
          </div>
        )}
        
        <div className="absolute left-3 top-3 z-[2] rounded-full bg-white/92 px-3 py-1.5 text-xs font-black text-slate-800 shadow-md dark:bg-slate-950/88 dark:text-white pointer-events-none">
          {title}
        </div>
        <div className="absolute right-3 top-3 z-[2] rounded-full bg-slate-950/90 px-3 py-1.5 text-xs font-black text-white shadow-md dark:bg-[#84CC16] dark:text-slate-950 pointer-events-none">
          {loadFailed ? 'Vista previa' : 'Mapa'}
        </div>

        {showFullscreen && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="absolute bottom-3 right-3 z-[2] inline-flex items-center gap-1.5 rounded-full bg-[#84CC16] px-3.5 py-2.5 text-xs font-black text-slate-950 shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <Maximize2 size={13} /> Ampliar
          </button>
        )}
      </div>

      {/* ===================== FULLSCREEN MAP MODAL ===================== */}
      {expanded && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-slate-950"
          role="dialog"
          aria-modal="true"
          aria-label="Mapa interactivo"
        >
          {/* ── Header bar ── */}
          <div className="relative z-[10] flex items-center gap-3 border-b border-slate-800 bg-slate-900/98 px-4 py-3 shadow-lg backdrop-blur sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#84CC16]">
                <MapPin size={18} className="text-slate-950" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black text-white truncate">Mapa interactivo</h2>
                <p className="text-[11px] font-semibold text-slate-400">
                  {visibleMarkers.length} anuncio{visibleMarkers.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-colors ${
                showFilters
                  ? 'bg-[#84CC16] text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Filter size={14} /> Filtros
            </button>

            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-colors sm:h-10 sm:w-auto sm:gap-2 sm:px-4"
              aria-label="Cerrar mapa"
              title="Cerrar (Esc)"
            >
              <X size={20} />
              <span className="hidden text-sm font-black sm:inline">Cerrar</span>
            </button>
          </div>

          {/* ── Filter Panel ── */}
          {filterPanelContent}

          {/* ── Map area ── */}
          <div className="relative flex-1 overflow-hidden">
            {leaflet && !loadFailed ? (
              <div ref={largeMapContainerRef} className="h-full w-full" style={{ zIndex: 1 }} />
            ) : (
              <div className="relative h-full w-full bg-[radial-gradient(circle_at_28%_48%,rgba(132,204,22,.24),transparent_16%),radial-gradient(circle_at_70%_38%,rgba(14,165,233,.22),transparent_18%),linear-gradient(135deg,#020617,#0f172a)]">
                {visibleMarkers.slice(0, 50).map((marker, index) => {
                  const pos = coordsToPoint(marker.coords || [23.6345, -102.5528]);
                  return (
                    <button key={marker.id || index} type="button" onClick={() => onMarkerClick?.(marker.ad || marker)} className="absolute z-[2] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={pos}>
                      <span className="rounded-full bg-[#84CC16] px-3 py-1.5 text-xs font-black text-slate-950 shadow-xl ring-2 ring-white/70">{marker.label || '$'}</span>
                      <span className={`mt-1 rounded-full px-2 py-0.5 text-[9px] font-black shadow ${markerAccuracyClass(marker)}`}>{markerAccuracyLabel(marker)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Bottom info panel ── */}
            <div className="absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-[5] rounded-2xl border border-slate-700/50 bg-slate-900/95 p-3 text-white shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} className="text-[#84CC16]" />
                    {visibleMarkers.length} anuncio{visibleMarkers.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Limpiar filtros
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="rounded-lg bg-red-500/20 px-3 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    <X size={14} className="inline mr-1" />
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black">
                <span className="rounded-full bg-[#84CC16] px-2 py-1 text-slate-950">● GPS real</span>
                <span className="rounded-full bg-amber-300 px-2 py-1 text-slate-950">● Approx ciudad/estado</span>
              </div>
              {visibleMarkers.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {visibleMarkers.slice(0, 10).map((marker, index) => (
                    <button
                      key={marker.id || index}
                      type="button"
                      onClick={() => onMarkerClick?.(marker.ad || marker)}
                      className="shrink-0 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-black text-white hover:bg-[#84CC16] hover:text-slate-950 hover:border-[#84CC16] transition-colors"
                    >
                      {marker.label || 'Ver'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
