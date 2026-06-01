import React from 'react';
import { Maximize2, Search, X, Loader2 } from 'lucide-react';

const DEFAULT_MARKERS = [
  { label: '$1.7k', coords: [19.4326, -99.1332], tone: 'lime' },
  { label: '$41k', coords: [20.6597, -103.3496], tone: 'dark' },
  { label: '$914', coords: [25.6866, -100.3161], tone: 'lime' },
  { label: '$35k', coords: [21.1619, -86.8515], tone: 'dark' },
];

const loadLeaflet = () => {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    // Load CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      resolve(window.L);
    };
    script.onerror = () => {
      reject(new Error('Failed to load Leaflet script'));
    };
    document.body.appendChild(script);
  });
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
  const [loaded, setLoaded] = React.useState(!!window.L);
  const [loading, setLoading] = React.useState(!window.L);
  
  const mapContainerRef = React.useRef(null);
  const largeMapContainerRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const largeMapInstanceRef = React.useRef(null);

  const normalizedMarkers = markers && markers.length ? markers : DEFAULT_MARKERS;

  React.useEffect(() => {
    let active = true;
    loadLeaflet()
      .then(() => {
        if (active) {
          setLoaded(true);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
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
    if (!loaded || !container) return;

    if (instanceRef.current) {
      instanceRef.current.remove();
      instanceRef.current = null;
    }

    const L = window.L;
    if (!L) return;

    // Mexico centroid default
    let center = [23.6345, -102.5528];
    let zoom = isLarge ? 5 : 4;

    const validMarkers = normalizedMarkers.filter(m => m.coords && Array.isArray(m.coords) && m.coords.length >= 2);
    
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

    const map = L.map(container, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: isLarge,
    });

    instanceRef.current = map;

    const isDark = document.documentElement.classList.contains('dark');
    const tileUrl = isDark 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
    }).addTo(map);

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
        const title = ad.title || 'Anuncio';
        const price = Number(ad.price || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
        const imgUrl = ad.image_url || ad.image || 'https://picsum.photos/seed/mercasto/100/75';
        
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
      map.fitBounds(markerGroup.getBounds(), { padding: [30, 30] });
    }
  };

  React.useEffect(() => {
    if (loaded && !expanded) {
      initMap(mapContainerRef.current, mapInstanceRef, false);
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loaded, expanded, normalizedMarkers]);

  React.useEffect(() => {
    if (loaded && expanded) {
      // Small timeout to allow container to fully expand
      const timer = setTimeout(() => {
        initMap(largeMapContainerRef.current, largeMapInstanceRef, true);
      }, 100);
      return () => clearTimeout(timer);
    }
    return () => {
      if (largeMapInstanceRef.current) {
        largeMapInstanceRef.current.remove();
        largeMapInstanceRef.current = null;
      }
    };
  }, [loaded, expanded, normalizedMarkers]);

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-md dark:border-slate-700 dark:bg-slate-950 ${className}`}>
        {loading && (
          <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center bg-slate-900/10 backdrop-blur-[2px] dark:bg-slate-950/20">
            <Loader2 className="h-8 w-8 animate-spin text-[#84CC16]" />
            <span className="mt-2 text-xs font-semibold text-slate-500">Cargando OpenStreetMap...</span>
          </div>
        )}
        
        <div ref={mapContainerRef} className="h-full w-full min-h-[190px]" style={{ zIndex: 1 }} />
        
        <div className="absolute left-3 top-3 z-[2] rounded-full bg-white/92 px-3 py-1.5 text-xs font-black text-slate-800 shadow-md dark:bg-slate-950/88 dark:text-white pointer-events-none">
          {title}
        </div>
        <div className="absolute right-3 top-3 z-[2] rounded-full bg-slate-950/90 px-3 py-1.5 text-xs font-black text-white shadow-md dark:bg-[#84CC16] dark:text-slate-950 pointer-events-none">
          OpenStreetMap
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
            <div className="absolute inset-x-3 top-3 z-[5] flex gap-2 rounded-2xl bg-white/95 p-2 shadow-xl dark:bg-slate-900/95">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                <Search size={16} className="text-[#84CC16]" />
                <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none dark:text-white" placeholder="Buscar en el mapa..." />
              </div>
              <button type="button" onClick={onSearch} className="rounded-xl bg-[#84CC16] px-4 py-2 text-sm font-black text-slate-950 hover:bg-[#65A30D]">Buscar</button>
              <button type="button" onClick={() => setExpanded(false)} className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white dark:bg-slate-700 hover:bg-slate-800" aria-label="Cerrar mapa">
                <X size={18} />
              </button>
            </div>
            
            <div ref={largeMapContainerRef} className="h-full w-full" style={{ zIndex: 1 }} />
          </div>
        </div>
      )}
    </>
  );
}
