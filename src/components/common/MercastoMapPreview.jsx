import React from 'react';
import { Maximize2, Search, X, Loader2, SlidersHorizontal } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

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

export default function MercastoMapPreview({
  title = 'Todo México',
  markers = DEFAULT_MARKERS,
  onSearch,
  onMarkerClick,
  className = '',
  showFullscreen = true,
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [leaflet, setLeaflet] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [mapQuery, setMapQuery] = React.useState('');
  const [maxPrice, setMaxPrice] = React.useState('');
  const [onlyWithCoords, setOnlyWithCoords] = React.useState(false);
  
  const mapContainerRef = React.useRef(null);
  const largeMapContainerRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const largeMapInstanceRef = React.useRef(null);
  const mountedRef = React.useRef(true);

  const normalizedMarkers = markers && markers.length ? markers : DEFAULT_MARKERS;
  const visibleMarkers = React.useMemo(() => {
    const query = mapQuery.trim().toLowerCase();
    const priceLimit = Number(maxPrice);

    return normalizedMarkers.filter(marker => {
      const ad = marker.ad || {};
      const text = `${marker.label || ''} ${ad.title || ''} ${ad.location || ''} ${ad.state || ''} ${ad.category || ''}`.toLowerCase();
      const price = Number(ad.price || String(marker.label || '').replace(/[^\d.]/g, '') || 0);

      if (query && !text.includes(query)) return false;
      if (priceLimit > 0 && price > priceLimit) return false;
      if (onlyWithCoords && (!(marker.coords && marker.coords.length >= 2) || marker.approximate)) return false;
      return true;
    });
  }, [maxPrice, normalizedMarkers, mapQuery, onlyWithCoords]);

  React.useEffect(() => () => {
    mountedRef.current = false;
  }, []);

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

  React.useEffect(() => {
    let active = true;
    const fallbackTimer = window.setTimeout(() => {
      if (active) {
        setLoadFailed(true);
        setLoading(false);
      }
    }, 2500);

    loadLeaflet()
      .then((L) => {
        if (active) {
          setLeaflet(L);
          setLoadFailed(false);
          setLoading(false);
        }
      })
      .catch(() => {
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

  React.useEffect(() => {
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

  const initMap = (container, instanceRef, isLarge = false) => {
    if (!leaflet || !container) return;

    if (instanceRef.current) {
      removeMap(instanceRef);
    }

    const L = leaflet;
    if (!L) return;

    // Mexico centroid default
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
      });
    } catch {
      setLoadFailed(true);
      setLoading(false);
      return;
    }

    instanceRef.current = map;

    const isDark = document.documentElement.classList.contains('dark');
    const tileUrl = isDark 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      crossOrigin: true,
      attribution: '&copy; OpenStreetMap',
    })
      .on('tileerror', () => {
        if (mountedRef.current && instanceRef.current === map) setLoadFailed(true);
      })
      .addTo(map);

    const markerGroup = L.featureGroup();

    validMarkers.forEach((marker, index) => {
      const [lat, lon] = marker.coords.map(Number);
      if (Number.isNaN(lat) || Number.isNaN(lon)) return;

      const isDarkMarker = marker.tone === 'dark' || index % 2;
      const markerHtml = `
        <div class="custom-leaflet-marker ${isDarkMarker ? 'custom-leaflet-marker--dark' : 'custom-leaflet-marker--lime'}">
          ${marker.label || '$'}
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
        const title = escapeHtml(ad.title || 'Anuncio');
        const price = Number(ad.price || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
        const imgUrl = escapeHtml(ad.image_url || ad.image || 'https://picsum.photos/seed/mercasto/100/75');
        
        const popupContent = `
          <div class="leaflet-popup-card">
            <img src="${imgUrl}" class="leaflet-popup-card__img" alt="${title}"/>
            <div class="leaflet-popup-card__body">
              <h4 class="leaflet-popup-card__title">${title}</h4>
              <p class="leaflet-popup-card__price">${price}</p>
              <button type="button" class="leaflet-popup-card__btn" onclick="window.__onMapAdClick?.(${ad.id})">Ver anuncio</button>
            </div>
          </div>
        `;
        leafMarker.bindPopup(popupContent);
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

  React.useEffect(() => {
    if (leaflet && !expanded) {
      initMap(mapContainerRef.current, mapInstanceRef, false);
    }
    return () => {
      removeMap(mapInstanceRef);
    };
  }, [leaflet, expanded, visibleMarkers]);

  React.useEffect(() => {
    if (leaflet && expanded) {
      // Small timeout to allow container to fully expand
      const timer = setTimeout(() => {
        initMap(largeMapContainerRef.current, largeMapInstanceRef, true);
      }, 100);
      return () => clearTimeout(timer);
    }
    return () => {
      removeMap(largeMapInstanceRef);
    };
  }, [leaflet, expanded, visibleMarkers]);

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-md dark:border-slate-700 dark:bg-slate-950 ${className}`}>
        {loading && (
          <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center bg-slate-900/10 backdrop-blur-[2px] dark:bg-slate-950/20">
            <Loader2 className="h-8 w-8 animate-spin text-[#84CC16]" />
            <span className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-300">Cargando mapa...</span>
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
                  className={`absolute z-[2] -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-[11px] font-black shadow-xl ring-2 ring-white/70 transition-transform hover:scale-110 ${marker.tone === 'dark' ? 'bg-slate-950 text-white dark:bg-[#84CC16] dark:text-slate-950' : 'bg-[#84CC16] text-slate-950'}`}
                  style={pos}
                >
                  {marker.label || '$'}
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

      {expanded && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/90 p-3 backdrop-blur-sm">
          <div className="relative h-full overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="absolute inset-x-3 top-3 z-[5] grid gap-2 rounded-2xl bg-white/95 p-2 shadow-xl dark:bg-slate-900/95 md:grid-cols-[1fr_140px_auto_auto]">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                <Search size={16} className="text-[#84CC16]" />
                <input value={mapQuery} onChange={(e) => setMapQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none dark:text-white" placeholder="Buscar en el mapa..." />
              </div>
              <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} type="number" className="hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white md:block" placeholder="Precio máx." />
              <button type="button" onClick={() => setOnlyWithCoords(v => !v)} className={`hidden items-center gap-1 rounded-xl px-3 py-2 text-xs font-black md:inline-flex ${onlyWithCoords ? 'bg-[#84CC16] text-slate-950' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                <SlidersHorizontal size={14} /> GPS
              </button>
              <button type="button" onClick={() => setExpanded(false)} className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white dark:bg-slate-700 hover:bg-slate-800" aria-label="Cerrar mapa">
                <X size={18} />
              </button>
            </div>
            
            {leaflet && !loadFailed ? (
              <div ref={largeMapContainerRef} className="h-full w-full" style={{ zIndex: 1 }} />
            ) : (
              <div className="relative h-full w-full bg-[radial-gradient(circle_at_28%_48%,rgba(132,204,22,.24),transparent_16%),radial-gradient(circle_at_70%_38%,rgba(14,165,233,.22),transparent_18%),linear-gradient(135deg,#020617,#0f172a)]">
                {visibleMarkers.slice(0, 50).map((marker, index) => {
                  const pos = coordsToPoint(marker.coords || [23.6345, -102.5528]);
                  return (
                    <button key={marker.id || index} type="button" onClick={() => onMarkerClick?.(marker.ad || marker)} className="absolute z-[2] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#84CC16] px-3 py-1.5 text-xs font-black text-slate-950 shadow-xl ring-2 ring-white/70" style={pos}>
                      {marker.label || '$'}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="absolute inset-x-3 bottom-3 z-[5] rounded-2xl bg-slate-950/90 p-3 text-white shadow-xl backdrop-blur">
              <div className="flex items-center justify-between gap-3 text-xs font-bold">
                <span>{visibleMarkers.length} anuncios en mapa</span>
                <button type="button" onClick={() => { setMapQuery(''); setMaxPrice(''); setOnlyWithCoords(false); }} className="text-[#BEF264]">Limpiar filtros</button>
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
                {visibleMarkers.slice(0, 8).map((marker, index) => (
                  <button key={marker.id || index} type="button" onClick={() => onMarkerClick?.(marker.ad || marker)} className="shrink-0 rounded-full bg-[#84CC16] px-3 py-2 text-xs font-black text-slate-950">
                    {marker.label || 'Ver'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
