import React, { useState, useEffect, useMemo } from 'react';
import { Crosshair, Maximize2, Search, X, Loader2, SlidersHorizontal, MapPin, Layers, Filter, Navigation, Locate } from 'lucide-react';
import { filterConfig } from '../../constants/filterConfig';
import { MEXICO_STATES, MEXICO_STATES_CITIES } from '../../utils/mexicoStates';
import { useTranslation } from 'react-i18next';

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
    leafletPromise = import('leaflet')
      .then((mod) => mod.default || mod)
      .then((L) => {
        globalThis.L = L;
        return Promise.all([
          import('leaflet.markercluster'),
          import('leaflet-draw'),
          import('leaflet-draw/dist/leaflet.draw.css'),
        ]).then(() => L);
      });
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
  onLocationSelect,
  locationPicker = false,
  locationQuery = '',
  className = '',
  showFullscreen = true,
  initialFilters = {},
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || 'es';
  const [expanded, setExpanded] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
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
  const [selectedCategory, setSelectedCategory] = useState(category || '');
  const [categories, setCategories] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  
  // API config for category attributes
  const [apiConfig, setApiConfig] = useState(null);
  
  // Fetched ads state
  const [fetchedAds, setFetchedAds] = useState([]);
  
  const mapContainerRef = React.useRef(null);
  const largeMapContainerRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const largeMapInstanceRef = React.useRef(null);
  const mountedRef = React.useRef(true);
  const userMarkerRef = React.useRef(null);
  const pickerMarkerRef = React.useRef(null);

  // Fetch list of categories
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/categories`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync selectedCategory state when category prop changes
  useEffect(() => {
    setSelectedCategory(category || '');
  }, [category]);

  // Fetch ads if apiUrl or selectedCategory is provided
  useEffect(() => {
    const controller = new AbortController();
    // Fetch all ads if selectedCategory is empty, otherwise fetch category specific
    const url = apiUrl || `${API_URL}/ads?${selectedCategory ? `category=${encodeURIComponent(selectedCategory)}&` : ''}per_page=80`;

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
  }, [apiUrl, selectedCategory]);

  // Fetch category attributes from DB
  useEffect(() => {
    if (!selectedCategory) { setApiConfig(null); return; }
    let cancelled = false;
    fetch(`${API_URL}/category-attributes?category=${encodeURIComponent(selectedCategory)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (!cancelled) setApiConfig(data.length > 0 ? data : null); })
      .catch(() => { if (!cancelled) setApiConfig(null); });
    return () => { cancelled = true; };
  }, [selectedCategory]);

  const config = apiConfig ?? (selectedCategory ? (filterConfig[selectedCategory] || null) : null);

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
      if (selectedCategory && ad.category && ad.category !== selectedCategory) return false;
      if (listingType && ad.listing_type && ad.listing_type !== listingType) return false;
      
      return true;
    });
  }, [minPrice, maxPrice, normalizedMarkers, mapQuery, onlyWithCoords, selectedState, selectedCity, selectedCategory, listingType]);

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
    if (locationPicker) pickerMarkerRef.current = null;
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
    setSelectedCategory('');
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

  // Локация
  const loc = (ad.location || ad.city || ad.state || '').toString().trim();
  if (loc) {
    const locP = document.createElement('p');
    locP.className = 'leaflet-popup-card__loc';
    locP.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span></span>';
    locP.querySelector('span').textContent = loc;
    body.appendChild(locP);
  }

  // Начало описания
  const rawDesc = (ad.description || '').toString().replace(/\s+/g, ' ').trim();
  if (rawDesc) {
    const descP = document.createElement('p');
    descP.className = 'leaflet-popup-card__desc';
    descP.textContent = rawDesc.length > 90 ? rawDesc.slice(0, 90).trimEnd() + '…' : rawDesc;
    body.appendChild(descP);
  }

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


  // Геолокация пользователя - "Buscar cerca de mí"
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalización no disponible en este navegador');
      return;
    }
    
    setLocating(true);
    setLocationError('');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const loc = { lat: latitude, lng: longitude };
        setUserLocation(loc);
        setLocating(false);
        
        // Определяем активную карту (fullscreen или обычная)
        const activeMap = expanded ? largeMapInstanceRef.current : mapInstanceRef.current;
        
        // Центрируем карту на локации пользователя
        if (activeMap && leaflet) {
          activeMap.setView([latitude, longitude], 14, { animate: true });
          
          // Удаляем старый маркер если есть
          if (userMarkerRef.current && activeMap.hasLayer(userMarkerRef.current)) {
            activeMap.removeLayer(userMarkerRef.current);
          }
          
          // Добавляем маркер "Ты здесь"
          const userIcon = leaflet.divIcon({
            className: 'user-location-marker',
            html: '<div style="width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          
          userMarkerRef.current = leaflet.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 1000 })
            .addTo(activeMap)
            .bindPopup('<strong>📍 Estás aquí</strong>');
        }
      },
      (error) => {
        setLocating(false);
        switch(error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Permiso de ubicación denegado. Activa la ubicación en tu navegador.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Ubicación no disponible');
            break;
          case error.TIMEOUT:
            setLocationError('Tiempo de espera agotado');
            break;
          default:
            setLocationError('Error desconocido al obtener ubicación');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const initMap = (container, instanceRef, isLarge = false, isDrawMode = false) => {
    if (!leaflet || !container) return;

    if (instanceRef.current) {
      removeMap(instanceRef);
    }

    const L = leaflet;
    if (!L) return;

    let center = [23.6345, -102.5528];
    let zoom = isLarge ? 5 : 4;

    const validMarkers = visibleMarkers.filter(m => m.coords && Array.isArray(m.coords) && m.coords.length >= 2);
    const normalizedQuery = normalizeLocationText(locationQuery);
    const queryCity = Object.keys(CITY_COORDS).find((key) => normalizedQuery.includes(key));
    const queryState = Object.keys(STATE_COORDS).find((key) => normalizedQuery.includes(normalizeLocationText(key)));

    if (locationPicker && (queryCity || queryState)) {
      center = queryCity ? CITY_COORDS[queryCity] : STATE_COORDS[queryState];
      zoom = queryCity ? 12 : 7;
    }
    
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
        attributionControl: true,
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
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
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

    const markerGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 16,
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        let className = "marker-cluster-custom";
        if (count < 10) className += " marker-cluster-small";
        else if (count < 50) className += " marker-cluster-medium";
        else className += " marker-cluster-large";
        return L.divIcon({
          html: "<div><span>" + count + "</span></div>",
          className: className,
          iconSize: L.point(40, 40)
        });
      }
    });

    validMarkers.forEach((marker, index) => {
      const [lat, lon] = marker.coords.map(Number);
      if (Number.isNaN(lat) || Number.isNaN(lon)) return;

      const ad = marker.ad;
      const isDarkMarker = marker.tone === 'dark' || index % 2;

      // Category symbol mapping: prices for auto/real estate, icons/emojis for others
      let symbol = marker.label || '$';
      if (ad && ad.category !== 'motor' && ad.category !== 'inmobiliaria') {
        const symbols = {
          'empleo': '💼',
          'servicios': '🔧',
          'electronica': '💻',
          'tecnologia': '💻',
          'informatica': '💻',
          'moda': '👕',
          'hogar': '🛋️',
          'ocio': '🚲',
          'telefonia': '📱',
          'mascotas': '🐶',
          'negocios': '🏢'
        };
        symbol = symbols[ad.category] || '📦';
      }

      const markerHtml = `
        <div class="custom-leaflet-marker-shell">
          <div class="custom-leaflet-marker ${isDarkMarker ? 'custom-leaflet-marker--dark' : 'custom-leaflet-marker--lime'}">
            ${symbol}
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

      const leafMarker = L.marker([lat, lon], { icon: customIcon });

      if (ad) {
        leafMarker.bindPopup(() => createPopupElement(ad, marker));

        // Draw service coverage zone if it is a service listing
        if (ad.category === 'servicios') {
          let radiusMeters = 10000;
          try {
            const attrs = typeof ad.attributes === 'string' ? JSON.parse(ad.attributes) : (ad.attributes || {});
            const cob = attrs.cobertura || attrs.radius || '';
            if (cob.includes('colonia') || cob.includes('Colonia')) radiusMeters = 2000;
            else if (cob.includes('ciudad') || cob.includes('Ciudad')) radiusMeters = 15000;
            else if (cob.includes('estado') || cob.includes('Estado')) radiusMeters = 80000;
          } catch (e) {}

          L.circle([lat, lon], {
            color: '#3b82f6',
            fillColor: '#60a5fa',
            fillOpacity: 0.12,
            radius: radiusMeters,
            weight: 1.5,
            dashArray: '3, 3'
          }).addTo(map);
        }
      }

      leafMarker.on('click', () => {
        onMarkerClick?.(marker.ad || marker);
      });

      markerGroup.addLayer(leafMarker);
    });

    markerGroup.addTo(map);

    if (locationPicker) {
      const selected = validMarkers[0]?.coords;
      if (selected) {
        pickerMarkerRef.current = L.marker(selected, { draggable: true }).addTo(map);
        pickerMarkerRef.current.on('dragend', (event) => {
          const point = event.target.getLatLng();
          onLocationSelect?.({ lat: point.lat, lng: point.lng });
        });
      }
      map.on('click', (event) => {
        const point = event.latlng;
        if (pickerMarkerRef.current) pickerMarkerRef.current.setLatLng(point);
        else {
          pickerMarkerRef.current = L.marker(point, { draggable: true }).addTo(map);
          pickerMarkerRef.current.on('dragend', (dragEvent) => {
            const draggedPoint = dragEvent.target.getLatLng();
            onLocationSelect?.({ lat: draggedPoint.lat, lng: draggedPoint.lng });
          });
        }
        onLocationSelect?.({ lat: point.lat, lng: point.lng });
      });
    }

    if (validMarkers.length > 1 && markerGroup.getLayers().length > 0) {
      try {
        map.fitBounds(markerGroup.getBounds(), { padding: [30, 30] });
      } catch {
        // Keep the map usable even if Leaflet races during mobile route changes.
      }
    }

    // ── Draw control (polygon area search) ──
    if (isDrawMode && L.Control && L.Control.Draw) {
      const drawItems = new L.FeatureGroup();
      map.addLayer(drawItems);
      const drawControl = new L.Control.Draw({
        draw: {
          polygon: { allowIntersection: false, showArea: true },
          rectangle: true,
          circle: false,
          marker: false,
          polyline: false,
          circlemarker: false,
        },
        edit: { featureGroup: drawItems },
      });
      map.addControl(drawControl);
      map.on(L.Draw.Event.CREATED, (e) => {
        drawItems.addLayer(e.layer);
        const bounds = e.layer.getBounds();
        onSearchArea?.({
          lat: bounds.getCenter().lat,
          lng: bounds.getCenter().lng,
          radius: Math.round(bounds.getNorthEast().distanceTo(bounds.getSouthWest()) / 2000),
          polygon: e.layer.toGeoJSON(),
        });
        setDrawMode(false);
      });
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
      initMap(mapContainerRef.current, mapInstanceRef, false, drawMode);
    }
    return () => {
      removeMap(mapInstanceRef);
    };
  }, [leaflet, expanded, drawMode, visibleMarkers, locationPicker, locationQuery]);

  useEffect(() => {
    if (leaflet && expanded) {
      const timer = setTimeout(() => {
        initMap(largeMapContainerRef.current, largeMapInstanceRef, true, drawMode);
      }, 100);
      return () => clearTimeout(timer);
    }
    return () => {
      removeMap(largeMapInstanceRef);
    };
  }, [leaflet, expanded, drawMode, visibleMarkers, locationPicker, locationQuery]);

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
          placeholder={t('home.searchPlaceholder')}
        />
      </div>

      {/* Category Dropdown */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('ads.category')}</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white outline-none"
        >
          <option value="">{t('filters.allCategories')}</option>
          {categories.map(cat => (
            <option key={cat.slug} value={cat.slug}>
              {cat.name?.[lang] || cat.name?.['es'] || cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={selectedState}
          onChange={(e) => handleStateChange(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white outline-none"
        >
          <option value="">{t('filters.allStates')}</option>
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
          <option value="">{t('filters.allCities')}</option>
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
          placeholder={t('filters.minPrice')}
        />
        <input
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          type="number"
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-slate-500"
          placeholder={t('filters.maxPrice')}
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
          <p className="text-xs font-black text-slate-400">{t('ads.condition', { defaultValue: 'Condition' })}</p>
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
          <MapPin size={14} /> {t('map.realGpsOnly', { defaultValue: 'Real GPS only' })}
        </button>
        <button
          type="button"
          onClick={clearAllFilters}
          className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/20 px-3 py-2 text-xs font-black text-red-400 hover:bg-red-500/30 transition-colors"
        >
          <X size={14} /> {t('common.reset')}
        </button>
      </div>

      {/* Search Area Button */}
      <button
        type="button"
        onClick={handleSearchArea}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#84CC16] px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-[#a3e635] transition-colors"
      >
        <Crosshair size={16} /> {t('map.searchArea', { defaultValue: 'Search this area' })}
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
              {fetchingAds ? t('ads.loading', { defaultValue: 'Loading listings...' }) : t('common.loading')}
            </span>
          </div>
        )}
        
        {leaflet && !loadFailed ? (
          <>
            {locationError && (
              <div className="mx-4 mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <span>⚠️</span>
                <span>{locationError}</span>
              </div>
            )}
            <div ref={mapContainerRef} className="h-full w-full min-h-[190px]" style={{ zIndex: 1 }} />
          </>
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

        {/* Geolocation Button - Buscar cerca de mí */}
        {showFullscreen && leaflet && !loadFailed && (
          <button
            type="button"
            onClick={getUserLocation}
            disabled={locating}
            className="absolute bottom-3 left-3 z-[2] inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-2.5 text-xs font-black text-white shadow-lg hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Buscar cerca de mí"
          >
            {locating ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Locate size={13} />
            )}
            <span className="hidden sm:inline">Cerca de mí</span>
          </button>
        )}

        {/* Draw Area Button (small map) */}
        {showFullscreen && leaflet && !loadFailed && (
          <button
            type="button"
            onClick={() => setDrawMode((v) => !v)}
            className={`absolute bottom-14 left-3 z-[2] inline-flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition-all ${
              drawMode
                ? 'bg-[#84CC16] text-slate-950'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
            title="Dibujar área de búsqueda"
          >
            <Crosshair size={13} />
            <span className="hidden sm:inline">Dibujar área</span>
          </button>
        )}

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
              onClick={getUserLocation}
              disabled={locating}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-colors bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Buscar cerca de mí"
            >
              {locating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Locate size={14} />
              )}
              <span className="hidden sm:inline">Cerca de mí</span>
            </button>

            {/* Draw Area Button (fullscreen header) */}
            <button
              type="button"
              onClick={() => setDrawMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-colors ${
                drawMode
                  ? 'bg-[#84CC16] text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Dibujar área de búsqueda"
            >
              <Crosshair size={14} />
              <span className="hidden sm:inline">Dibujar área</span>
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
