import React from 'react';
import { useNavigate } from 'react-router-dom';
import MercastoMapPreview from './MercastoMapPreview';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const STATE_COORDS = {
  'Ciudad de México': [19.4326, -99.1332],
  CDMX: [19.4326, -99.1332],
  Jalisco: [20.6597, -103.3496],
  'Nuevo León': [25.6866, -100.3161],
  México: [19.2925, -99.6557],
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

function adCoords(ad, index) {
  const lat = Number(ad?.latitude ?? ad?.lat);
  const lng = Number(ad?.longitude ?? ad?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
    return { coords: [lat, lng], approximate: false };
  }

  const locationText = `${ad?.state || ''} ${ad?.location || ''} ${ad?.city || ''}`.toLowerCase();
  const stateKey = Object.keys(STATE_COORDS).find((key) => locationText.includes(key.toLowerCase()));
  const base = stateKey ? STATE_COORDS[stateKey] : [23.6345, -102.5528];

  return {
    coords: [
      base[0] + (Math.sin(index * 2.31) * 0.16),
      base[1] + (Math.cos(index * 2.31) * 0.16),
    ],
    approximate: true,
  };
}

function markerLabel(ad) {
  const price = Number(ad?.price || 0);
  if (price > 0) return `$${price.toLocaleString('es-MX', { notation: 'compact' })}`;
  return ad?.category ? String(ad.category).slice(0, 10) : 'Ver';
}

export default function AdsMap({
  ads,
  apiUrl,
  category,
  title = 'Todo México',
  className = 'h-[220px] md:h-[340px]',
  onMarkerClick,
  showFullscreen = true,
}) {
  const navigate = useNavigate();
  const [loadedAds, setLoadedAds] = React.useState([]);
  const [loading, setLoading] = React.useState(Boolean(apiUrl || category));

  React.useEffect(() => {
    if (!apiUrl && !category) return;
    const controller = new AbortController();
    const url = apiUrl || `${API_URL}/ads?category=${encodeURIComponent(category)}&per_page=80`;

    setLoading(true);
    fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((payload) => {
        const nextAds = Array.isArray(payload) ? payload : (payload.data || []);
        setLoadedAds(nextAds);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadedAds([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [apiUrl, category]);

  const sourceAds = React.useMemo(() => (
    Array.isArray(ads) && ads.length ? ads : loadedAds
  ), [ads, loadedAds]);

  const markers = React.useMemo(() => sourceAds.slice(0, 80).map((ad, index) => {
    const location = adCoords(ad, index);
    return {
      id: ad.id || `ad-${index}`,
      ad,
      coords: location.coords,
      approximate: location.approximate,
      label: markerLabel(ad),
      tone: location.approximate ? 'dark' : 'lime',
      title: ad.title,
      price: ad.price,
      location: ad.location || ad.city || ad.state,
      category: ad.category,
    };
  }), [sourceAds]);

  const handleMarkerClick = (adOrMarker) => {
    if (onMarkerClick) return onMarkerClick(adOrMarker);
    const id = adOrMarker?.id || adOrMarker?.ad?.id;
    if (id) navigate(`/?ad=${id}`);
  };

  const handleSearchArea = ({ lat, lng, radius, query, maxPrice, onlyWithCoords }) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (query) params.set('search', query);
    if (maxPrice) params.set('max_price', String(maxPrice));
    if (onlyWithCoords) params.set('has_coords', '1');
    params.set('lat', String(lat));
    params.set('lng', String(lng));
    params.set('radius', String(radius));
    navigate(`/?${params.toString()}`);
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-950 ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-[4] flex items-center justify-center bg-slate-950/10 text-xs font-black text-slate-500 dark:bg-slate-950/30 dark:text-slate-300">
          Cargando anuncios...
        </div>
      )}
      <MercastoMapPreview
        title={title}
        markers={markers}
        onMarkerClick={handleMarkerClick}
        onSearchArea={handleSearchArea}
        showFullscreen={showFullscreen}
        className="h-full rounded-none border-0 shadow-none"
      />
    </div>
  );
}
