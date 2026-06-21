import SEO from "../SEO";
import AdSenseBanner from '../common/AdSenseBanner';
import { getRecentlyViewed, clearRecentlyViewed } from '../../utils/recentlyViewed';
// Keep only data needed for initial render; heavy fallback arrays lazy-loaded below
import { mexicoLocations, subcategoriesMap } from '../../constants/locationsAndCategories';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Pencil, PlusCircle, Activity, Heart, MapPin, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Camera, User, BadgeCheck, ShieldCheck, Building2, Zap, Ticket, Crown, Store, UploadCloud, LogOut, Settings, BarChart3, QrCode, Download, Loader2, Settings2, Globe, Sparkles, Play, Video, Phone, AlertTriangle, ArrowRight, ExternalLink, MessageCircle, Share2, Star, Info, HelpCircle, Menu, X, Bell, LayoutGrid, List, Layers, SlidersHorizontal, Crosshair } from "lucide-react";

// SEO Components for AEO
import FAQSchema, { FAQ_DATA } from '../seo/FAQSchema';
import ItemListSchema from '../seo/ItemListSchema';
import { IconMap } from '../../constants/iconMap';
import SidebarFilters from '../common/SidebarFilters';
// MapV3 pulls Leaflet (~215 kB) — lazy load so it never blocks initial parse/paint
const MapV3 = React.lazy(() => import('../common/MapV3'));
import SplitViewContainer from '../common/SplitViewContainer';

import { sizedImage } from '../../utils/imageHelpers';
import { localizedText } from '../../utils/localize';
import SkeletonCard from '../common/SkeletonCard';
import SavedSearchesPanel from '../common/SavedSearchesPanel';
import RecommendationsWidget from '../common/RecommendationsWidget';
import BottomSheet from '../ui/BottomSheet';


// --- MAP COORDINATES ---
const STATE_COORDS = {
  "Aguascalientes": [21.8853, -102.2916],
  "AGS": [21.8853, -102.2916],
  "Baja California": [30.8406, -115.2838],
  "BC": [30.8406, -115.2838],
  "Baja California Sur": [26.0444, -111.6661],
  "BCS": [26.0444, -111.6661],
  "Campeche": [19.8301, -90.5349],
  "CAMP": [19.8301, -90.5349],
  "Chiapas": [16.7569, -93.1292],
  "CHIS": [16.7569, -93.1292],
  "Chihuahua": [28.6330, -106.0691],
  "CHIH": [28.6330, -106.0691],
  "Ciudad de México": [19.4326, -99.1332],
  "CDMX": [19.4326, -99.1332],
  "Coahuila": [27.0587, -101.7068],
  "COAH": [27.0587, -101.7068],
  "Colima": [19.2433, -103.7247],
  "COL": [19.2433, -103.7247],
  "Durango": [24.0277, -104.6532],
  "DGO": [24.0277, -104.6532],
  "Guanajuato": [21.0190, -101.2574],
  "GTO": [21.0190, -101.2574],
  "Guerrero": [17.4392, -99.5451],
  "GRO": [17.4392, -99.5451],
  "Hidalgo": [20.0911, -98.7624],
  "HGO": [20.0911, -98.7624],
  "Jalisco": [20.6597, -103.3496],
  "JAL": [20.6597, -103.3496],
  "GDL": [20.6597, -103.3496],
  "México": [19.3565, -99.6312],
  "EdoMex": [19.3565, -99.6312],
  "Michoacán": [19.5665, -101.7068],
  "MICH": [19.5665, -101.7068],
  "Morelos": [18.6813, -99.1013],
  "MOR": [18.6813, -99.1013],
  "Nayarit": [21.7514, -104.8455],
  "NAY": [21.7514, -104.8455],
  "Nuevo León": [25.5922, -100.0574],
  "NL": [25.5922, -100.0574],
  "Oaxaca": [17.0732, -96.7266],
  "OAX": [17.0732, -96.7266],
  "Puebla": [19.0414, -98.2063],
  "PUE": [19.0414, -98.2063],
  "Querétaro": [20.5888, -100.3899],
  "QRO": [20.5888, -100.3899],
  "Quintana Roo": [19.1847, -88.4753],
  "ROO": [19.1847, -88.4753],
  "San Luis Potosí": [22.1565, -100.9855],
  "SLP": [22.1565, -100.9855],
  "Sinaloa": [25.1721, -107.4795],
  "SIN": [25.1721, -107.4795],
  "Sonora": [29.2972, -110.3309],
  "SON": [29.2972, -110.3309],
  "Tabasco": [17.8409, -92.6189],
  "TAB": [17.8409, -92.6189],
  "Tamaulipas": [24.2669, -98.8363],
  "TAMPS": [24.2669, -98.8363],
  "Tlaxcala": [19.3182, -98.2375],
  "TLAX": [19.3182, -98.2375],
  "Veracruz": [19.1738, -96.1342],
  "VER": [19.1738, -96.1342],
  "Yucatán": [20.7099, -89.0943],
  "YUC": [20.7099, -89.0943],
  "Zacatecas": [22.7709, -102.5832],
  "ZAC": [22.7709, -102.5832]
};

const LeafletMap = ({ ads, onViewAd }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [mapQuery, setMapQuery] = React.useState('');
  const [mapMaxPrice, setMapMaxPrice] = React.useState('');
  const [mapOnlyCoords, setMapOnlyCoords] = React.useState(false);
  const [mapLoaded, setMapLoaded] = React.useState(false);
  const safeAds = React.useMemo(() => (Array.isArray(ads) ? ads : []), [ads]);

  React.useEffect(() => {
    // Load map bundle lazily in the background after mount when the main thread is free
    const timer = setTimeout(() => {
      setMapLoaded(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Close on Escape key
  React.useEffect(() => {
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

  const filteredAds = React.useMemo(() => {
    const query = mapQuery.trim().toLowerCase();
    const priceLimit = Number(mapMaxPrice);
    return safeAds.filter(ad => {
      const title = `${ad.title || ''} ${ad.location || ''} ${ad.state || ''} ${ad.category || ''}`.toLowerCase();
      if (query && !title.includes(query)) return false;
      if (mapOnlyCoords && !(ad.latitude && ad.longitude)) return false;
      if (priceLimit > 0 && Number(ad.price || 0) > priceLimit) return false;
      return true;
    });
  }, [safeAds, mapMaxPrice, mapOnlyCoords, mapQuery]);
  const mapAds = React.useMemo(() => filteredAds.slice(0, expanded ? 60 : 14).map((ad, idx) => {
    if (ad.latitude && ad.longitude) return { ad, coords: [parseFloat(ad.latitude), parseFloat(ad.longitude)] };
    const stateName = ad.state || ad.location?.split(',')[1]?.trim() || ad.location?.split('·')[0]?.trim() || ad.location?.split(',')[0]?.trim() || '';
    const cleanedState = Object.keys(STATE_COORDS).find(k =>
      stateName.toLowerCase().includes(k.toLowerCase()) ||
      k.toLowerCase().includes(stateName.toLowerCase())
    );
    const base = cleanedState ? STATE_COORDS[cleanedState] : [23.6345, -102.5528];
    const jitterLat = base[0] + (Math.sin(idx * 2.3) * 0.18);
    const jitterLon = base[1] + (Math.cos(idx * 2.3) * 0.18);
    return { ad, coords: [jitterLat, jitterLon] };
  }), [filteredAds, expanded]);

  const markers = mapAds.map(({ ad, coords }, index) => ({
    id: ad.id,
    ad,
    coords,
    label: `$${Number(ad.price || 0).toLocaleString('es-MX', { notation: 'compact' })}`,
    tone: index % 2 ? 'dark' : 'lime',
  }));

  const mapBody = (
    <div
      className="relative h-full"
      onMouseEnter={() => setMapLoaded(true)}
      onTouchStart={() => setMapLoaded(true)}
    >
      {mapLoaded ? (
        <React.Suspense fallback={<div className="h-full bg-slate-800 animate-pulse rounded-xl" />}>
          <MapV3 title="Todo México" markers={markers} onMarkerClick={onViewAd} showFullscreen={false} className="h-full border-0 shadow-none" />
        </React.Suspense>
      ) : (
        <div className="h-full w-full bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-400 gap-2 cursor-pointer">
          <MapPin size={24} className="animate-bounce text-[#84CC16]" />
          <span className="text-xs font-semibold">Cargando mapa...</span>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setMapLoaded(true);
          setExpanded(true);
        }}
        className="absolute bottom-3 right-3 z-[5] inline-flex items-center gap-1.5 rounded-full bg-[#84CC16] px-3.5 py-2.5 text-xs font-black text-slate-950 shadow-lg hover:scale-105 active:scale-95 transition-all"
      >
        <MapPin size={13} /> Abrir mapa
      </button>
    </div>
  );

  return (
    <>
      <SEO
        title="Mercasto | Compra, Vende y Renta en Todo México"
        description="Marketplace de clasificados para México: autos, inmuebles, servicios, empleo, electrónica y más. Publica gratis y encuentra lo que necesitas cerca de ti."
        image="https://mercasto.com/icon-512x512.png"
      />
      <h1 style={{position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", borderWidth: 0}}>Mercasto - Compra, Vende y Renta en Todo México | Marketplace de Autos, Inmuebles, Servicios y Empleo</h1>
      <div className="osm-embed-shell relative mb-4 md:mb-6 h-[190px] md:h-[320px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shadow-md">
        {mapBody}
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
                  {filteredAds.length} anuncio{filteredAds.length !== 1 ? 's' : ''} visible{filteredAds.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Search + filters (desktop) */}
            <div className="hidden flex-1 items-center gap-2 md:flex">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2">
                <Search size={15} className="shrink-0 text-[#84CC16]" />
                <input
                  value={mapQuery}
                  onChange={(e) => setMapQuery(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
                  placeholder="Buscar en el mapa..."
                />
              </div>
              <input
                value={mapMaxPrice}
                onChange={(e) => setMapMaxPrice(e.target.value)}
                type="number"
                className="w-28 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-slate-500"
                placeholder="Precio máx."
              />
              <button
                type="button"
                onClick={() => setMapOnlyCoords(v => !v)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-colors ${
                  mapOnlyCoords
                    ? 'bg-[#84CC16] text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <SlidersHorizontal size={14} /> Solo GPS
              </button>
            </div>

            {/* Close button */}
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

          {/* ── Mobile search bar ── */}
          <div className="relative z-[10] flex items-center gap-2 border-b border-slate-800 bg-slate-900/95 px-3 py-2 md:hidden">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2">
              <Search size={15} className="shrink-0 text-[#84CC16]" />
              <input
                value={mapQuery}
                onChange={(e) => setMapQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
                placeholder="Buscar..."
              />
            </div>
            <input
              value={mapMaxPrice}
              onChange={(e) => setMapMaxPrice(e.target.value)}
              type="number"
              className="w-24 rounded-xl border border-slate-700 bg-slate-800 px-2 py-2 text-xs font-semibold text-white outline-none placeholder:text-slate-500"
              placeholder="$ máx"
            />
            <button
              type="button"
              onClick={() => setMapOnlyCoords(v => !v)}
              className={`rounded-xl px-2 py-2 text-xs font-black ${
                mapOnlyCoords ? 'bg-[#84CC16] text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>

          {/* ── Map area ── */}
          <div className="relative flex-1 overflow-hidden">
            <React.Suspense fallback={<div className="h-full w-full bg-slate-800 animate-pulse" />}>
              <MapV3
                title="Todo México"
                markers={markers}
                onMarkerClick={onViewAd}
                showFullscreen={false}
                className="h-full w-full border-0 shadow-none rounded-none"
              />
            </React.Suspense>

            {/* ── Bottom info panel ── */}
            <div className="absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-[5] rounded-2xl border border-slate-700/50 bg-slate-900/95 p-3 text-white shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} className="text-[#84CC16]" />
                    {filteredAds.length} anuncio{filteredAds.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setMapQuery(''); setMapMaxPrice(''); setMapOnlyCoords(false); }}
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
              {mapAds.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {mapAds.slice(0, 10).map(({ ad }, index) => (
                    <button
                      key={ad.id || index}
                      type="button"
                      onClick={() => onViewAd(ad)}
                      className="shrink-0 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-black text-white hover:bg-[#84CC16] hover:text-slate-950 hover:border-[#84CC16] transition-colors"
                    >
                      ${Number(ad.price || 0).toLocaleString('es-MX', { notation: 'compact' })}
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
};

export default function HomeScreen({ MercastoLogo, activeCat, adsTotal = 0, categoriesData, executeSearch, form, hasMore, images, lang, lastAdElementRef, loadingAds, loadingMore, renderAdCard, searchQuery, selectedState, serverAds, setActiveCat, setCurrentTab, setSearchLocation, setSearchLocationInput, setSearchQuery, setSelectedState, setShowPricingModal, t, minPrice, setMinPrice, maxPrice, setMaxPrice, conditionFilter, setConditionFilter, dynamicFilters, setDynamicFilters, getImageUrl, handleViewAd, handleSaveSearchAlert, savingSearchAlert, realEstateAds, jobAds, serviceAds, automotiveAds, user, token, onSearchArea }) {
    const [showMobileFilters, setShowMobileFilters] = React.useState(false);
    const [showAllCategories, setShowAllCategories] = React.useState(false);
    const [showMap, setShowMap] = React.useState(false);
    const [viewLayout, setViewLayout] = React.useState('grid'); // 'grid' or 'list'
    const [homeToast, setHomeToast] = React.useState(null);
    const homeToastTimerRef = React.useRef(null);
    const [featuredAds, setFeaturedAds] = React.useState(() => {
      if (typeof window !== 'undefined') {
        if (window.__FEATURED_ADS_CACHE__) return window.__FEATURED_ADS_CACHE__;
        try {
          var cached = localStorage.getItem('__mercasto_featured_ads');
          if (cached) return JSON.parse(cached);
        } catch (e) {}
      }
      return [];
    });
    const [featuredLoading, setFeaturedLoading] = React.useState(() => {
      if (typeof window !== 'undefined' && window.__FEATURED_ADS_CACHE__) return false;
      return true;
    });
    const navigate = useNavigate();
    const safeServerAds = React.useMemo(() => (Array.isArray(serverAds) ? serverAds : []), [serverAds]);
    const safeRealEstateAds = React.useMemo(() => (Array.isArray(realEstateAds) ? realEstateAds : []), [realEstateAds]);
    const safeJobAds = React.useMemo(() => (Array.isArray(jobAds) ? jobAds : []), [jobAds]);
    const safeServiceAds = React.useMemo(() => (Array.isArray(serviceAds) ? serviceAds : []), [serviceAds]);
    const safeAutomotiveAds = React.useMemo(() => (Array.isArray(automotiveAds) ? automotiveAds : []), [automotiveAds]);

    // Fetch Destacados on mount — use the pre-fetched promise from index.html if available
    // so the image is ready before React mounts (eliminates ~1s LCP load delay).
    React.useEffect(() => {
      const API_URL = (typeof window !== 'undefined' && window.__API_URL__) || import.meta.env?.VITE_API_URL || '/api';
      const prefetched = typeof window !== 'undefined' && window.__FEATURED_ADS_PROMISE__;
      const dataPromise = prefetched
        ? prefetched
        : fetch(`${API_URL}/ads/featured`, { headers: { 'Accept': 'application/json' } })
            .then(r => r.ok ? r.json() : null);

      dataPromise
        .then(data => {
          const nextFeaturedAds = Array.isArray(data?.data) ? data.data
            : Array.isArray(data) ? data : [];
          setFeaturedAds(nextFeaturedAds);
        })
        .catch(() => {})
        .finally(() => setFeaturedLoading(false));
    }, []);

    // Lazy-load heavy mockData fallbacks only when needed (after mount, off critical path)
    const [mockFallbacks, setMockFallbacks] = React.useState(null);
    React.useEffect(() => {
      import('../../constants/mockData').then(m => {
        setMockFallbacks({
          spotlightRealEstate: m.spotlightRealEstate,
          jobsBoard: m.jobsBoard,
          servicesMarketplace: m.servicesMarketplace,
          automotiveDeals: m.automotiveDeals,
          recentlyViewed: m.recentlyViewed,
        });
      });
    }, []);
    const spotlightRealEstate = mockFallbacks?.spotlightRealEstate || [];
    const jobsBoard = mockFallbacks?.jobsBoard || [];
    const servicesMarketplace = mockFallbacks?.servicesMarketplace || [];
    const automotiveDeals = mockFallbacks?.automotiveDeals || [];
    const recentlyViewed = mockFallbacks?.recentlyViewed || [];

    const VERTICAL_SLUGS = {
      'coches-y-motor': '/autos',
      'motor': '/autos',
      'coches': '/autos',
      'inmobiliaria': '/inmuebles',
      'empleo': '/empleos',
      'servicios': '/servicios',
      'electronica': '/electronica',
      'hogar': '/hogar',
      'moda': '/moda',
      'ocio': '/ocio',
      'infantil': '/infantil',
      'mascotas': '/mascotas',
      'negocios': '/negocios',
      'boletos': '/boletos',
    };
    const getVerticalPath = React.useCallback((slug = '') => {
      if (VERTICAL_SLUGS[slug]) return VERTICAL_SLUGS[slug];
      if (slug.startsWith('coches-y-motor/')) return '/autos';
      if (slug.startsWith('inmobiliaria/')) return '/inmuebles';
      if (slug.startsWith('empleo/')) return '/empleos';
      if (slug.startsWith('servicios/')) return '/servicios';
      if (slug.startsWith('electronica/')) return '/electronica';
      if (slug.startsWith('hogar/')) return '/hogar';
      if (slug.startsWith('moda/')) return '/moda';
      if (slug.startsWith('ocio/')) return '/ocio';
      if (slug.startsWith('infantil/')) return '/infantil';
      if (slug.startsWith('mascotas/')) return '/mascotas';
      if (slug.startsWith('negocios/')) return '/negocios';
      if (slug.startsWith('boletos/')) return '/boletos';
      return null;
    }, []);

    const homeCategories = React.useMemo(() => ([
      { slug: 'motor', name: { es: 'Motor', en: 'Motor', pt: 'Motor', fr: 'Moteur', zh: '汽车和摩托车', ko: '자동차/오토바이', de: 'Motor', it: 'Motore', ar: 'المحركات', he: 'מנוע', yi: 'מאָטאָр', ru: 'Авто и Мото', ja: '自動車・バイク' }, icon: 'Car' },
      { slug: 'inmobiliaria', name: { es: 'Inmuebles', en: 'Real Estate', pt: 'Imóveis', fr: 'Immobilier', zh: '房地产', ko: '부동산', de: 'Immobilien', it: 'Immobiliare', ar: 'العقارات', he: 'נדל״ן', yi: 'איממאָביליען', ru: 'Недвижимость', ja: '不動産' }, icon: 'Home' },
      { slug: 'empleo', name: { es: 'Empleos', en: 'Jobs', pt: 'Empregos', fr: 'Emplois', zh: '工作', ko: '채용', de: 'Jobs', it: 'Lavoro', ar: 'وظائف', he: 'משרות', yi: 'דזשאָבс', ru: 'Работа', ja: '求人' }, icon: 'Briefcase' },
      { slug: 'servicios', name: { es: 'Servicios', en: 'Services', pt: 'Serviços', fr: 'Services', zh: '服务', ko: '서비스', de: 'Dienstleistungen', it: 'Servizi', ar: 'خدمات', he: 'שירותים', yi: 'סערוויסעס', ru: 'Услуги', ja: 'サービス' }, icon: 'Wrench' },
      { slug: 'electronica', name: { es: 'Electrónica', en: 'Electronics', pt: 'Eletrônicos', fr: 'Électronique', zh: '电子产品', ko: '전자제품', de: 'Elektronik', it: 'Elettronica', ar: 'إلكترونيات', he: 'אלקטרוניקה', yi: 'עלעקטראָניк', ru: 'Электроника', ja: '電子機器' }, icon: 'Cpu' },
      { slug: 'hogar', name: { es: 'Hogar', en: 'Home', pt: 'Casa', fr: 'Maison', zh: '家居', ko: '가정', de: 'Zuhause', it: 'Casa', ar: 'المنزل', he: 'בית', yi: 'היים', ru: 'Дом', ja: '住まい' }, icon: 'Sofa' },
      { slug: 'moda', name: { es: 'Moda', en: 'Fashion', pt: 'Moda', fr: 'Mode', zh: '时尚', ko: '패션', de: 'Mode', it: 'Moda', ar: 'موضة', he: 'אופנה', yi: 'מאָדע', ru: 'Мода', ja: 'ファッション' }, icon: 'Shirt' },
      { slug: 'ocio', name: { es: 'Ocio', en: 'Leisure', pt: 'Lazer', fr: 'Loisirs', zh: '休闲', ko: '여가', de: 'Freizeit', it: 'Tempo libero', ar: 'ترفيه', he: 'פנאי', yi: 'פרייַע צייַט', ru: 'Хобби', ja: 'レジャー' }, icon: 'Bike' },
      { slug: 'infantil', name: { es: 'Infantil', en: 'Kids', pt: 'Infantil', fr: 'Enfants', zh: '儿童', ko: '아동', de: 'Kinder', it: 'Bambini', ar: 'الأطفال', he: 'ילדים', yi: 'קינדער', ru: 'Детские товары', ja: 'キッズ' }, icon: 'Baby' },
      { slug: 'mascotas', name: { es: 'Mascotas', en: 'Pets', pt: 'Animais', fr: 'Animaux', zh: '宠物', ko: '애완동물', de: 'Haustiere', it: 'Animali', ar: 'حيوانات أليفة', he: 'חיות מחמד', yi: 'חנות חיות', ru: 'Животные', ja: 'ペット' }, icon: 'PawPrint' },
      { slug: 'negocios', name: { es: 'Negocios', en: 'Business', pt: 'Negócios', fr: 'Affaires', zh: '商务', ko: '비즈니스', de: 'Geschäft', it: 'Affari', ar: 'أعمال', he: 'עסקים', yi: 'ביזנעס', ru: 'Бизнес', ja: 'ビジネス' }, icon: 'Store' },
      { slug: 'boletos', name: { es: 'Boletos', en: 'Tickets', pt: 'Ingressos', fr: 'Billets', zh: '门票', ko: '티켓', de: 'Tickets', it: 'Biglietti', ar: 'تذاكر', he: 'כרטיסים', yi: 'בילעטן', ru: 'Билеты', ja: 'チケット' }, icon: 'Ticket' },
      { slug: 'tarifas', name: { es: 'Tarifas', en: 'Pricing', pt: 'Tarifas', fr: 'Tarifs', zh: '资费', ko: '요금', de: 'Tarife', it: 'Tariffe', ar: 'الأسعار', he: 'תעриפים', yi: 'טאַריפֿן', ru: 'Тарифы', ja: '料金' }, icon: 'Crown', action: 'pricing' },
    ]), []);
    const trendingAds = React.useMemo(() => {
      const seen = new Set();
      return safeServerAds
        .filter(ad => {
          if (!ad?.id || seen.has(ad.id)) return false;
          seen.add(ad.id);
          return true;
        })
        .slice(0, 6);
    }, [safeServerAds]);
    const getHomeRating = React.useCallback((ad = {}) => {
      const rawRating = Number(ad.rating_average ?? ad.average_rating ?? ad.rating ?? 0);
      const rating = rawRating > 0 ? rawRating : 4 + (((Number(ad.id) || 1) % 10) / 10);
      const rawCount = Number(ad.reviews_count ?? ad.comments_count ?? ad.review_count ?? 0);
      const count = rawCount > 0 ? rawCount : ((Number(ad.id) || 1) % 7) + 1;
      return { rating: Math.min(5, Math.max(1, rating)), count };
    }, []);
    const displayImageMap = React.useMemo(() => {
      const seen = new Map();
      const result = new Map();
      safeServerAds.forEach(ad => {
        const raw = ad.image_url || ad.image || '';
        const key = typeof raw === 'string' ? raw : JSON.stringify(raw);
        const count = seen.get(key) || 0;
        seen.set(key, count + 1);
        if (count > 0) {
          const category = encodeURIComponent(ad.category || activeCat || 'mercasto');
          result.set(ad.id, `https://picsum.photos/seed/mercasto-${category}-${ad.id}/600/450`);
        }
      });
      return result;
    }, [safeServerAds, activeCat]);
    const applyCityFilter = React.useCallback((cityName) => {
      setSearchLocation?.(null);
      setSearchLocationInput?.(cityName);
      setSelectedState(cityName);
      executeSearch?.(null, cityName);
      setCurrentTab('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [executeSearch, setCurrentTab, setSearchLocation, setSearchLocationInput, setSelectedState]);
    const runSearch = React.useCallback((term = '', category = null) => {
      if (category !== null) setActiveCat(category);
      setSearchQuery(term);
      executeSearch?.(term, null, category ?? undefined);
    }, [executeSearch, setActiveCat, setSearchQuery]);
    const showHomeToast = React.useCallback((message) => {
      window.clearTimeout(homeToastTimerRef.current);
      setHomeToast(message);
      homeToastTimerRef.current = window.setTimeout(() => setHomeToast(null), 3200);
    }, []);
    React.useEffect(() => () => window.clearTimeout(homeToastTimerRef.current), []);

    if (activeCat || searchQuery || selectedState) {

      return (

        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 lg:py-8 pb-28 md:pb-8 min-h-screen flex flex-col lg:flex-row gap-6">
          
          {/* Кнопка фильтров для мобильных устройств */}
          <div className="md:hidden flex items-center justify-between mb-2">
             <h2 className="text-[18px] font-bold text-slate-900 dark:text-white">{t.search_results || 'Resultados'} <span className="text-slate-400 text-[14px] font-normal ml-1">({safeServerAds.length})</span></h2>
             <button onClick={() => setShowMobileFilters(!showMobileFilters)} className={`btn-sm flex items-center gap-2 border transition-colors ${showMobileFilters ? 'bg-slate-900 text-white border-slate-900 dark:bg-[#84CC16] dark:text-slate-950 dark:border-[#84CC16]' : 'bg-white text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'}`}>
               <Settings2 size={16} /> Filtros
             </button>
          </div>

          {/* Динамическая боковая панель (Адаптивная: липкая на desktop, drawer/bottom-sheet на mobile/tablet) */}
          <aside className="hidden lg:block lg:w-1/4 shrink-0">
             <SidebarFilters activeCat={activeCat} minPrice={minPrice} setMinPrice={setMinPrice} maxPrice={maxPrice} setMaxPrice={setMaxPrice} conditionFilter={conditionFilter} setConditionFilter={setConditionFilter} dynamicFilters={dynamicFilters} setDynamicFilters={setDynamicFilters} t={t} lang={lang} />
             {user && <SavedSearchesPanel user={user} token={token} currentFilters={{ query: searchQuery, category: activeCat, state: selectedState, min_price: minPrice, max_price: maxPrice }} onSearchSelect={(filters) => { setSearchQuery(filters.query || ""); setActiveCat(filters.category || ""); setSelectedState(filters.state || ""); setMinPrice(filters.min_price || ""); setMaxPrice(filters.max_price || ""); executeSearch(); }} />}
          </aside>

          {/* Mobile Bottom Sheet (< md) */}
          <BottomSheet
            isOpen={showMobileFilters}
            onClose={() => setShowMobileFilters(false)}
            title={t.filters || 'Filtros'}
            maxHeight="90vh"
            zIndex={9999}
          >
            <div className="block md:hidden p-6">
              <SidebarFilters activeCat={activeCat} minPrice={minPrice} setMinPrice={setMinPrice} maxPrice={maxPrice} setMaxPrice={setMaxPrice} conditionFilter={conditionFilter} setConditionFilter={setConditionFilter} dynamicFilters={dynamicFilters} setDynamicFilters={setDynamicFilters} t={t} lang={lang} />
              {user && <div className="mt-4"><SavedSearchesPanel user={user} token={token} currentFilters={{ query: searchQuery, category: activeCat, state: selectedState, min_price: minPrice, max_price: maxPrice }} onSearchSelect={(filters) => { setSearchQuery(filters.query || ""); setActiveCat(filters.category || ""); setSelectedState(filters.state || ""); setMinPrice(filters.min_price || ""); setMaxPrice(filters.max_price || ""); executeSearch(); setShowMobileFilters(false); }} /></div>}
            </div>
          </BottomSheet>

          {/* Tablet Side Drawer (md to lg) */}
          {showMobileFilters && (
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm hidden md:flex items-stretch justify-start lg:hidden">
              <div className="absolute inset-0 -z-10" onClick={() => setShowMobileFilters(false)} />
              <div className="bg-white dark:bg-slate-900 w-[360px] h-full overflow-y-auto p-6 shadow-2xl animate-slideRight border-r border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{t.filters || 'Filtros'}</h3>
                  <button onClick={() => setShowMobileFilters(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">✕</button>
                </div>
                <SidebarFilters activeCat={activeCat} minPrice={minPrice} setMinPrice={setMinPrice} maxPrice={maxPrice} setMaxPrice={setMaxPrice} conditionFilter={conditionFilter} setConditionFilter={setConditionFilter} dynamicFilters={dynamicFilters} setDynamicFilters={setDynamicFilters} t={t} lang={lang} />
                {user && <div className="mt-4"><SavedSearchesPanel user={user} token={token} currentFilters={{ query: searchQuery, category: activeCat, state: selectedState, min_price: minPrice, max_price: maxPrice }} onSearchSelect={(filters) => { setSearchQuery(filters.query || ""); setActiveCat(filters.category || ""); setSelectedState(filters.state || ""); setMinPrice(filters.min_price || ""); setMaxPrice(filters.max_price || ""); executeSearch(); setShowMobileFilters(false); }} /></div>}
              </div>
            </div>
          )}


          {/* Split View: список + карта (desktop) или toggle (mobile) */}
          <div className="flex-1">
            {/* Панель управления (только для desktop, на mobile есть toggle в SplitViewContainer) */}
            <div className="hidden lg:flex items-center justify-between mb-6 flex-wrap gap-3">
              <button
                onClick={handleSaveSearchAlert}
                disabled={savingSearchAlert}
                className="btn-sm flex items-center gap-2 border border-[#84CC16]/40 bg-[#84CC16]/10 text-[#365314] hover:bg-[#84CC16]/20 disabled:opacity-60 dark:text-[#BEF264]"
              >
                {savingSearchAlert ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
                Guardar búsqueda
              </button>
            </div>

            <SplitViewContainer
              ads={safeServerAds}
              onAdClick={handleViewAd}
              renderAdCard={renderAdCard}
              title={selectedState || t.all_mexico || 'Todo México'}
              selectedState={selectedState}
              loadingAds={loadingAds}
              hasMore={hasMore}
              loadingMore={loadingMore}
              lastAdElementRef={lastAdElementRef}
              getImageUrl={getImageUrl}
              onSearchArea={onSearchArea}
            />
          </div>

        </div>

      );

    }

    return (

      <div className="w-full">
        {homeToast && (
          <div className="fixed left-1/2 top-24 z-[120] -translate-x-1/2 rounded-2xl border border-lime-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-xl shadow-slate-900/10">
            {homeToast}
          </div>
        )}

        {/* 1. HERO STATS */}

        <div className="hidden md:block bg-white/75 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">

          <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-3 flex flex-col md:flex-row md:items-center gap-3 justify-between">

            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[13px] text-slate-700">

              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#84CC16] animate-pulse"></span><strong className="text-[#0F172A] dark:text-white font-semibold">{Number(adsTotal || safeServerAds.length || 0).toLocaleString('es-MX')}</strong> {t.active_listings || 'anuncios disponibles'}</span>

              <span className="text-slate-300 hidden sm:block">•</span>

              <span>{t.verified_sellers_desc || t.verified_sellers}</span>

              <span className="text-slate-300 hidden sm:block">•</span>

              <span className="location-chip"><MapPin className="w-3.5 h-3.5" />{selectedState || t.all_mexico || 'Todo México'}</span>

            </div>

            <div className="flex items-center gap-2">

              <button onClick={() => setCurrentTab('post')} className="btn-sm bg-slate-900 text-white hover:bg-black">{t.sell_fast || 'Vender rápido'}</button>

              <button onClick={() => setActiveCat('empleo')} className="btn-sm bg-white border border-slate-300 hover:bg-slate-50">{t.find_job || 'Buscar empleo'}</button>

              <button onClick={() => { runSearch('renta', 'inmobiliaria'); }} className="btn-sm bg-white border border-slate-300 hover:bg-slate-50 hidden sm:inline-flex">{t.rent_apt || 'Rentar depa'}</button>

              <button onClick={() => setActiveCat('servicios')} className="btn-sm bg-white border border-slate-300 hover:bg-slate-50 hidden sm:inline-flex">{t.hire_service || 'Contratar servicio'}</button>

            </div>

          </div>

        </div>



        <main className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 lg:py-8">

          <div className="grid grid-cols-12 gap-6">

            

            {/* 2. FEATURED CATEGORIES */}

            <section className="col-span-12 -mt-2">

              <div className="category-rail rail-fade -mx-4 px-6 lg:-mx-6 lg:px-6">

                {homeCategories.map(cat => {

                  const Icon = IconMap[cat.icon] || Star;

                  return (

                    <button key={cat.slug || cat.action} aria-label={cat.name?.[lang] || cat.name?.['es'] || cat.name} onClick={() => {
                        if (cat.action === 'home') { navigate('/'); setActiveCat(''); executeSearch?.('', null, ''); return; }
                        if (cat.action === 'pricing') { setShowPricingModal?.(true); return; }
                        const vpath = cat.verticalPath || getVerticalPath(cat.slug);
                        if (vpath) { navigate(vpath); } else { executeSearch?.('', null, cat.slug); }
                      }} className={`category-pill group min-w-[82px] sm:min-w-[96px] max-w-[108px] ${activeCat === cat.slug ? 'ring-2 ring-[#84CC16] bg-[#F7FEE7]' : ''}`}>

                      <div className="category-icon flex items-center justify-center text-slate-700 group-hover:text-[#65A30D] transition-all">

                        <Icon size={16} strokeWidth={2.5} />

                      </div>

                      <h3 className="font-bold text-[11px] text-center text-slate-900 group-hover:text-[#365314] line-clamp-2 leading-tight">
                        {cat.name?.[lang] || cat.name?.['es'] || cat.name}
                      </h3>

                    </button>

                  );

                })}

              </div>

            </section>



            {/* 3. DESTACADOS — Promoted ads block */}

            {(featuredLoading || featuredAds.length > 0) && (
              <section className="col-span-12 mt-2">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-[22px] font-bold tracking-tight">
                      {t.featured_ads || 'Destacados'}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 shadow-sm">
                      <Star size={9} className="fill-amber-900" />
                      PRO
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPricingModal?.(true)}
                    className="btn-sm border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                  >
                    {t.promote_ad || 'Promocionar'}
                  </button>
                </div>

                {/* Cards — horizontal scroll on mobile, grid on desktop */}
                <div className="-mx-4 lg:mx-0 px-4 lg:px-0">
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
                    {featuredAds.length === 0 ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={`feat-skel-${i}`} className="snap-start shrink-0 w-[240px] lg:w-auto">
                          <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300/40 bg-white dark:bg-slate-800 dark:border-amber-600/30">
                            <div className="aspect-[4/3] w-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                            <div className="p-3 space-y-2">
                              <div className="h-3.5 w-3/4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                              <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                              <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                    featuredAds.slice(0, 4).map((ad, i) => {
                      const rawImg = getImageUrl
                        ? getImageUrl(ad.image_url || ad.image)
                        : (ad.image_url || ad.image || `https://picsum.photos/seed/feat-${ad.id}/480/360`);
                      const imgUrl = sizedImage(rawImg, 480);
                      if (i === 0) {
                        try {
                          localStorage.setItem('__mercasto_lcp_image', imgUrl);
                        } catch (e) {}
                      }
                      const price = Number(ad.price || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
                      const rating = getHomeRating(ad);
                      return (
                        <div
                          key={ad.id}
                          className="snap-start shrink-0 w-[240px] lg:w-auto cursor-pointer group"
                          onClick={() => handleViewAd?.(ad)}
                        >
                          {/* Gold-border premium card */}
                          <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300/60 bg-white shadow-lg shadow-amber-100/50 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-200/60 dark:bg-slate-800 dark:border-amber-600/40 dark:shadow-amber-900/30">

                            {/* Image */}
                            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-700">
                              <img
                                src={imgUrl}
                                alt={localizedText(ad.title, lang)}
                                loading={i === 0 ? 'eager' : 'lazy'}
                                fetchpriority={i === 0 ? 'high' : 'auto'}
                                decoding="async"
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={e => { e.currentTarget.src = `https://picsum.photos/seed/feat-${ad.id}/480/360`; }}
                              />
                              {/* Golden badge */}
                              <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 shadow-md">
                                <Star size={9} className="fill-amber-900 text-amber-900" />
                                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-900">{t.destacado || 'Destacado'}</span>
                              </div>
                              {/* Gradient overlay */}
                              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
                            </div>

                            {/* Info */}
                            <div className="p-3">
                              <p className="mb-1 line-clamp-2 text-[13px] font-semibold leading-tight text-slate-800 dark:text-white">{localizedText(ad.title, lang)}</p>
                              <p className="text-[15px] font-bold text-amber-600 dark:text-amber-400">{price}</p>
                              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                <span className="tracking-tight text-amber-400">★★★★★</span>
                                <span>{rating.rating.toFixed(1)}</span>
                                <span>({rating.count})</span>
                              </div>
                              {ad.location && (
                                <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                  <MapPin size={10} />
                                  <span className="truncate">{ad.location}</span>
                                </p>
                              )}
                              {/* Seller badge */}
                              {ad.user?.is_verified && (
                                <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle size={10} />
                                  {t.verified_seller || 'Vendedor verificado'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                    )}
                  </div>
                </div>

              </section>
            )}



            {/* 4. TRENDING NOW */}

            <section className="col-span-12 mt-2 min-h-[380px] cls-safe">

              <div className="flex items-center justify-between mb-4">

                <div className="flex items-center gap-3">

                  <h2 className="text-[22px] font-bold tracking-tight">{t.trending_now || 'Tendencias'}</h2>

                  <span className="badge bg-red-500 text-white hidden sm:block">LIVE</span>

                </div>

                <div className="flex items-center gap-2">

                  <button
                    onClick={handleSaveSearchAlert}
                    disabled={savingSearchAlert}
                    className="btn-sm hidden border border-[#84CC16]/40 bg-[#84CC16]/10 text-[#365314] hover:bg-[#84CC16]/20 disabled:opacity-60 sm:block dark:text-[#BEF264]"
                  >
                    {savingSearchAlert ? 'Guardando...' : (t.save_search || 'Guardar búsqueda')}
                  </button>

                  <button onClick={() => { setActiveCat(''); document.querySelector('.md\\:hidden button')?.click(); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">{t.filter || 'Filtros'}</button>

                  <a href="/listings" onClick={(e) => { e.preventDefault(); setActiveCat(''); }} className="text-[13px] font-semibold text-[#65A30D] hover:underline ml-1 cursor-pointer">{t.see_all || 'Ver todo →'}</a>

                </div>

              </div>

              <div className="relative -mx-4 lg:mx-0 px-4 lg:px-0">

                <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">

                  {trendingAds.length === 0 ? (
                    // Show skeleton cards while loading
                    Array.from({ length: 6 }).map((_, idx) => (
                      <div key={`skeleton-${idx}`} className="snap-start shrink-0 w-[260px]">
                        <SkeletonCard />
                      </div>
                    ))
                  ) : (
                    trendingAds.map((ad, idx) => (
                      <div key={ad.id} className="snap-start shrink-0 w-[260px]">
                        {renderAdCard(ad, idx === 0 ? { priority: true } : {})}
                      </div>
                    ))
                  )}

                </div>

              </div>

            </section>



            {/* 4. DEALS OF THE DAY */}

            <section className="col-span-12 min-h-[220px] cls-safe">

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                <div className="relative overflow-hidden rounded-3xl p-[1px] group">

                  <div className="absolute inset-0 bg-gradient-to-br from-[#84CC16] to-[#65A30D] opacity-90 group-hover:opacity-100 transition"></div>

                  <div className="relative bg-gradient-to-br from-[#84CC16] to-[#65A30D] rounded-[23px] p-6 text-white h-[190px] flex flex-col">

                    <span className="text-[11px] uppercase tracking-wider bg-white/20 w-fit px-2.5 py-1 rounded-full font-semibold">{t.deal_of_day || 'Oferta del día'}</span>

                    <h3 className="text-[26px] font-bold mt-3 leading-tight">{t.up_to_40 || 'Hasta 40% OFF'}</h3>

                    <p className="text-white/90 text-[14px]">{t.elec_phones || 'Electrónica y Celulares'}</p>

                    <div className="mt-auto flex items-center justify-between">

                      <button onClick={() => setActiveCat('electronica')} className="btn-md bg-white text-[#0F172A] hover:bg-slate-100">{t.shop_now || 'Comprar ahora →'}</button>

                      <span className="text-[12px] font-medium bg-black/20 px-2 py-1 rounded-lg">{t.ends_in_8h || 'Termina en 8h'}</span>

                    </div>

                  </div>

                </div>

                <div className="market-card rounded-3xl p-6 h-[190px] flex flex-col relative overflow-hidden">

                  <div className="absolute -right-6 -top-6 w-32 h-32 bg-[#84CC16]/10 rounded-full blur-2xl"></div>

                  <span className="text-[11px] uppercase tracking-wider text-[#65A30D] font-semibold">{t.furniture || 'Muebles'}</span>

                  <h3 className="text-[22px] font-bold mt-2">{t.living_room_sets || 'Salas de estar'}</h3>

                  <p className="text-slate-600 text-[14px]">{t.from_price || 'Desde $4,999 MXN'}</p>

                  <button className="btn-md border border-slate-300 mt-auto w-fit hover:bg-slate-50" onClick={() => setActiveCat('hogar')}>{t.see_deals || 'Ver ofertas →'}</button>

                </div>

                <div className="card bg-slate-900 text-white rounded-3xl p-6 h-[190px] flex flex-col relative overflow-hidden">

                  <span className="text-[11px] uppercase tracking-wider text-[#84CC16] font-semibold">{t.automotive || 'Automotriz'}</span>

                  <h3 className="text-[22px] font-bold mt-2">{t.certified_cars || 'Autos Certificados'}</h3>

                  <p className="text-white/70 text-[14px]">{t.zero_comm || '0% comisión esta semana'}</p>

                  <button className="btn-md bg-[#84CC16] hover:bg-[#65A30D] text-white mt-auto w-fit" onClick={() => setActiveCat('motor')}>{t.browse_cars || 'Explorar 124k →'}</button>

                </div>

                <div className="market-card border-2 border-[#84CC16]/30 rounded-3xl p-6 h-[190px] flex flex-col">

                  <span className="text-[11px] uppercase tracking-wider text-[#65A30D] font-semibold">{t.for_sellers || 'Para vendedores'}</span>

                  <h3 className="text-[22px] font-bold mt-2">{t.boost_ad || 'Destaca tu anuncio'}</h3>

                  <p className="text-slate-600 text-[14px]">{t.boost_desc || '3x más vistas, mejor posición'}</p>

                  <button className="btn-md bg-[#0F172A] text-white hover:bg-black mt-auto w-fit" onClick={() => setCurrentTab('post')}>{t.promote_now || 'Promocionar ahora →'}</button>

                </div>

              </div>

            </section>



            {/* AI RECOMMENDATIONS */}
            <section className="col-span-12 mt-6">
              <RecommendationsWidget
                userId={user?.id}
                limit={12}
                onAdClick={handleViewAd}
              />
            </section>

            {/* 5. REAL ESTATE SPOTLIGHT */}

            <section className="col-span-12 mt-2">

              <div className="flex items-end justify-between mb-4">

                <h2 className="text-[22px] font-bold tracking-tight">{t.re_spotlight || 'Inmuebles Destacados'}</h2>

                <div className="flex items-center gap-3">

                  <div className="hidden md:flex items-center gap-2">

                    <button onClick={() => { runSearch('renta', 'inmobiliaria'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">{t.rent || 'Rentar'}</button>

                    <button onClick={() => { runSearch('venta', 'inmobiliaria'); }} className="btn-sm bg-slate-900 text-white">{t.buy || 'Comprar'}</button>

                    <button onClick={() => { runSearch('comercial', 'inmobiliaria'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">{t.commercial || 'Comercial'}</button>

                  </div>

                  <a href="/listings?category=inmobiliaria" onClick={(e) => { e.preventDefault(); setActiveCat('inmobiliaria'); }} className="text-[13px] font-semibold text-[#65A30D] hover:underline cursor-pointer">{t.view_props || 'Ver propiedades →'}</a>

                </div>

              </div>

              <div className="grid grid-cols-12 gap-4">

                <div className="col-span-12 xl:col-span-8">

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(safeRealEstateAds.length > 0 ? safeRealEstateAds.slice(0, 3) : spotlightRealEstate).map((item, idx) => {
                      const isReal = Boolean(item.id);
                      if (isReal) {
                        return (
                          <div key={item.id} className="cursor-pointer" onClick={() => handleViewAd(item)}>
                            {renderAdCard(item)}
                          </div>
                        );
                      }
                      return (
                        <article key={idx} className="market-card overflow-hidden cursor-pointer" onClick={() => { runSearch(item.specs, 'inmobiliaria'); }}>
                          <div className="relative">
                            <img src={item.img} loading="lazy" className="w-full h-[160px] object-cover" alt=""/>
                            <span className={`badge absolute left-2 top-2 ${item.color} text-white`}>{item.type}</span>
                          </div>
                          <div className="p-3.5">
                            <div className="font-bold text-[18px]">{item.price}</div>
                            <div className="text-[13px] text-slate-600 line-clamp-1">{item.specs}</div>
                            <div className="flex items-center gap-2 mt-2 text-[11px]">
                              {item.badge && <span className={`badge ${item.badge.color}`}>{item.badge.label}</span>}
                              <span className="text-slate-500">{item.location}</span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                </div>

                <div className="col-span-12 xl:col-span-4">

                  <div className="market-card h-full min-h-[360px] overflow-hidden relative bg-slate-100 dark:bg-slate-900">
                    <React.Suspense fallback={<div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse" />}>
                      <MapV3
                        ads={safeRealEstateAds}
                        category="inmobiliaria"
                        title={selectedState || t.all_mexico || 'Todo México'}
                        onMarkerClick={handleViewAd}
                        className="absolute inset-0 h-full rounded-none border-0 shadow-none"
                      />
                    </React.Suspense>

                    <div className="absolute inset-x-4 bottom-4 z-[3] rounded-xl border border-slate-200 bg-white/90 p-3 text-[12px] backdrop-blur dark:border-slate-700 dark:bg-slate-950/85">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-slate-800 dark:text-white">{selectedState ? `Propiedades en ${selectedState}` : 'Propiedades en todo México'}</span>
                        <span onClick={() => { setSearchLocation?.(null); setSearchLocationInput?.(''); setSelectedState(''); executeSearch?.(null, ''); }} className="cursor-pointer font-semibold text-[#65A30D] hover:underline">{t.view_all_mexico || 'Ver todo México'} →</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </section>



            {/* 6. JOBS BOARD */}

            <section className="col-span-12">

              <div className="flex items-end justify-between mb-4 mt-2">

                <h2 className="text-[22px] font-bold tracking-tight">{t.jobs_board || 'Bolsa de trabajo'}</h2>

                <div className="flex items-center gap-2">

                  <button onClick={() => { runSearch('Remoto', 'empleo'); }} className="btn-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700">{t.remote_only || 'Solo remoto'}</button>

                  <button onClick={() => { runSearch('Tiempo Completo', 'empleo'); }} className="btn-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700">{t.full_time || 'Tiempo completo'}</button>

                  <a href="/listings?category=empleo" onClick={(e) => { e.preventDefault(); setActiveCat('empleo'); }} className="text-[13px] font-semibold text-[#65A30D] hover:underline ml-1 cursor-pointer">{t.see_all || 'Ver todo →'}</a>

                </div>

              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">

                <div className="overflow-x-auto">

                  <table className="w-full text-[14px]">

                    <thead className="bg-slate-50 dark:bg-slate-950 text-[12px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">

                      <tr><th className="text-left font-semibold px-4 py-3">{t.role || 'Puesto'}</th><th className="text-left font-semibold px-4 py-3 hidden md:table-cell">{t.company || 'Empresa'}</th><th className="text-left font-semibold px-4 py-3">{t.salary_mxn || 'Salario MXN'}</th><th className="text-left font-semibold px-4 py-3 hidden sm:table-cell">{t.location || 'Ubicación'}</th><th className="text-right font-semibold px-4 py-3">{t.action || 'Acción'}</th></tr>

                    </thead>

                    <tbody className="">
                      {(safeJobAds.length > 0 ? safeJobAds.slice(0, 3) : jobsBoard.slice(0, 3)).map((job, idx) => {
                        const isReal = Boolean(job.id);
                        if (isReal) {
                          return (
                            <tr key={job.id} className="group border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/90 cursor-pointer transition-all duration-200 last:border-0" onClick={() => handleViewAd(job)}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-lime-50 dark:bg-lime-950 flex items-center justify-center font-bold text-lime-600 border border-lime-100">💼</div>
                                  <div>
                                    <div className="font-medium transition-transform duration-200 group-hover:translate-x-1">{job.title}</div>
                                    <div className="text-[12px] text-slate-500 md:hidden">{job.location || 'México'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell">{job.user_name || 'Empresa'}</td>
                              <td className="px-4 py-3 font-medium">${Number(job.price || 0).toLocaleString()} MXN</td>
                              <td className="px-4 py-3 hidden sm:table-cell">{job.state || job.location || 'México'}</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={(e) => { e.stopPropagation(); handleViewAd(job); }} className="btn-sm bg-slate-900 text-white hover:bg-black">{t.view || 'Ver'}</button>
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={idx} className="group border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/90 cursor-pointer transition-all duration-200 last:border-0" onClick={() => { runSearch(job.role, 'empleo'); }}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`job-logo-badge ${job.logo}`}>
                                  {job.initial === 'MD' ? (
                                    <svg viewBox="0 0 100 100" className="w-6 h-6" aria-hidden="true">
                                      <path d="M50 5 C27.9 5 10 22.9 10 45 C10 75 50 95 50 95 C50 95 90 75 90 45 C90 22.9 72.1 5 50 5 Z" fill="#84CC16" />
                                      <path d="M30 60 L30 35 L50 50 L70 35 L70 60" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  ) : job.initial}
                                </div>
                                <div>
                                  <div className="font-medium transition-transform duration-200 group-hover:translate-x-1">{job.role}</div>
                                  <div className="text-[12px] text-slate-500 md:hidden">{job.company} • {job.loc}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">{job.company}</td>
                            <td className="px-4 py-3 font-medium">{job.salary}</td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              {job.loc === 'Remote' ? <span className="badge bg-slate-900 text-white">Remote</span> : job.loc}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={(e) => { e.stopPropagation(); setCurrentTab('post'); }} className={`btn-sm text-white ${idx === 0 ? 'bg-[#84CC16] hover:bg-[#65A30D]' : 'bg-slate-900 hover:bg-black'}`}>{t.apply || 'Aplicar'}</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                  </table>

                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-[13px]">

                  <span className="text-slate-600 dark:text-slate-400">{t.showing_jobs || 'Mostrando empleos nuevos'}</span>

                  <div className="flex items-center gap-2">

                    <button onClick={() => showHomeToast('La carga de CV estará disponible desde tu panel de usuario.')} className="btn-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">{t.upload_cv || 'Subir CV'}</button>

                    <button onClick={() => showHomeToast('Alerta de empleo guardada para esta búsqueda.')} className="btn-sm bg-[#0F172A] text-white hover:bg-black">{t.create_job_alert || 'Crear alerta'}</button>

                  </div>

                </div>

              </div>

            </section>



            {/* 7. SERVICES MARKETPLACE */}

            <section className="col-span-12">

              <div className="flex items-end justify-between mb-4 mt-2">

                <h2 className="text-[22px] font-bold tracking-tight">{t.services_marketplace || 'Directorio de servicios'}</h2>

                <a href="/listings?category=servicios" onClick={(e) => { e.preventDefault(); setActiveCat('servicios'); }} className="text-[13px] font-semibold text-[#65A30D] hover:underline cursor-pointer">{t.browse_services || 'Ver todos →'}</a>

              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(safeServiceAds.length > 0 ? safeServiceAds.slice(0, 3) : servicesMarketplace.slice(0, 3)).map((srv, idx) => {
                  const isReal = Boolean(srv.id);
                  if (isReal) {
                    const imgSrc = srv.image_url ? getImageUrl(srv.image_url) : '/placeholder-ad.svg';
                    const rating = getHomeRating(srv);
                    return (
                      <div key={srv.id} className="card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 cursor-pointer" onClick={() => handleViewAd(srv)}>
                        <div className="flex items-start gap-3">
                          <img src={imgSrc} loading="lazy" className="w-12 h-12 rounded-xl object-cover" alt={srv.title}/>
                          <div className="flex-1">
                            <h3 className="font-semibold text-[15px] leading-tight line-clamp-1">{srv.title}</h3>
                            <div className="flex items-center gap-1 mt-1"><div className="flex text-amber-400 text-[13px]">★★★★★</div><span className="text-[12px] text-slate-600 dark:text-slate-300">{rating.rating.toFixed(1)} ({rating.count})</span></div>
                          </div>
                        </div>
                        <p className="text-[13px] text-slate-600 mt-3 line-clamp-2">{srv.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[13px]"><span className="text-slate-500">{t.from || 'Desde'}</span> <strong>${Number(srv.price || 0).toLocaleString()} MXN</strong></span>
                          <button onClick={(e) => { e.stopPropagation(); handleViewAd(srv); }} className="btn-sm bg-[#84CC16] text-white hover:bg-[#65A30D]">{t.view || 'Ver'}</button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={idx} className="card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 cursor-pointer" onClick={() => { runSearch(srv.title, 'servicios'); }}>
                      <div className="flex items-start gap-3">
                        <img src={srv.img} loading="lazy" className="w-12 h-12 rounded-xl object-cover" alt=""/>
                        <div className="flex-1">
                          <h3 className="font-semibold text-[15px] leading-tight">{srv.title}</h3>
                          <div className="flex items-center gap-1 mt-1"><div className="flex text-amber-400 text-[13px]">★★★★★</div><span className="text-[12px] text-slate-600">{srv.stars}</span></div>
                        </div>
                        {srv.badge && <span className={`badge ${srv.badge.color}`}>{srv.badge.label}</span>}
                      </div>
                      <p className="text-[13px] text-slate-600 mt-3 line-clamp-2">{srv.desc}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[13px]"><span className="text-slate-500">{t.from || 'Desde'}</span> <strong>{srv.price}</strong></span>
                        <button onClick={(e) => { e.stopPropagation(); setActiveCat('servicios'); }} className="btn-sm bg-[#84CC16] text-white hover:bg-[#65A30D]">{t.book_now || 'Reservar'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </section>



            {/* 8. AUTOMOTIVE */}

            <section className="col-span-12">

              <div className="flex items-end justify-between mb-4 mt-2">

                <h2 className="text-[22px] font-bold tracking-tight">{t.automotive || 'Automotriz'}</h2>

                <div className="flex items-center gap-2">

                  <button onClick={() => { runSearch('', 'motor'); }} className="btn-sm bg-slate-900 text-white">{t.all || 'Todos'}</button>

                  <button onClick={() => { runSearch('Nissan', 'motor'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">Nissan</button>

                  <button onClick={() => { runSearch('VW', 'motor'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">VW</button>

                  <button onClick={() => { runSearch('Toyota', 'motor'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">Toyota</button>

                  <button onClick={() => { runSearch('Honda', 'motor'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50 hidden sm:inline-flex">Honda</button>

                  <span className="w-px h-5 bg-slate-300 mx-1 hidden sm:block"></span>

                  <button className="btn-sm border border-slate-300 bg-white hover:bg-slate-50 hidden sm:block">{t.year || 'Año'}</button>

                  <button className="btn-sm border border-slate-300 bg-white hover:bg-slate-50 hidden sm:block">{t.price || 'Precio'}</button>

                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {(safeAutomotiveAds.length > 0 ? safeAutomotiveAds.slice(0, 3) : automotiveDeals.slice(0, 3)).map((car, idx) => {
                  const isReal = Boolean(car.id);
                  if (isReal) {
                    const imgSrc = car.image_url ? getImageUrl(car.image_url) : '/placeholder-ad.svg';
                    const rating = getHomeRating(car);
                    return (
                      <article key={car.id} className="card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden cursor-pointer flex flex-col h-full" onClick={() => handleViewAd(car)}>
                        <div className="aspect-[4/3] w-full overflow-hidden bg-slate-200 dark:bg-slate-900">
                          <img src={imgSrc} loading="lazy" className="w-full h-full object-cover" alt={car.title}/>
                        </div>
                        <div className="p-3 flex flex-col flex-1 min-h-[112px]">
                          <div className="font-bold leading-tight line-clamp-1">${Number(car.price || 0).toLocaleString()} MXN</div>
                          <div className="text-[13px] font-medium line-clamp-1 mt-0.5">{car.title}</div>
                          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <span className="text-amber-400">★★★★★</span>
                            <span>{rating.rating.toFixed(1)} ({rating.count})</span>
                          </div>
                          <div className="text-[12px] text-slate-500 mt-1 line-clamp-1">{car.state || car.location || 'México'}</div>
                          <div className="mt-auto pt-2 flex gap-1 min-h-[24px]">
                            <span className="badge bg-emerald-100 text-emerald-700">Verificado</span>
                          </div>
                        </div>
                      </article>
                    );
                  }
                  return (
                    <article key={idx} className="card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden cursor-pointer flex flex-col h-full" onClick={() => { runSearch(car.title, 'motor'); }}>
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-200 dark:bg-slate-900">
                        <img src={car.img} loading="lazy" className="w-full h-full object-cover" alt={car.title || ''}/>
                      </div>
                      <div className="p-3 flex flex-col flex-1 min-h-[112px]">
                        <div className="font-bold leading-tight line-clamp-1">{car.price}</div>
                        <div className="text-[13px] font-medium line-clamp-1 mt-0.5">{car.title}</div>
                        <div className="text-[12px] text-slate-500 mt-1 line-clamp-1">{car.specs}</div>
                        <div className="mt-auto pt-2 flex gap-1 min-h-[24px]">
                          {car.badge && <span className={`badge ${car.badge.color}`}>{car.badge.label}</span>}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

            </section>



            {/* 9. RECENTLY VIEWED - localStorage */}
            {(() => {
              const storedRecentAds = getRecentlyViewed();
              const recentAds = Array.isArray(storedRecentAds) ? storedRecentAds : [];
              if (recentAds.length === 0) return null;
              return (
                <section className="col-span-12">
                  <div className="flex items-center justify-between mb-3 mt-2">
                    <h2 className="text-[18px] font-bold">{t.recently_viewed || 'Vistos recientemente'}</h2>
                    <button onClick={() => { clearRecentlyViewed(); window.location.reload(); }} className="text-[12px] text-slate-500 hover:text-slate-700">{t.clear_history || 'Borrar historial'}</button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                    {recentAds.map(ad => {
                      const imgSrc = ad.thumbnail
                        ? (ad.thumbnail.startsWith('http') ? ad.thumbnail : `https://mercasto.com/storage/${ad.thumbnail}`)
                        : '/placeholder-ad.svg';
                      const locationStr = ad.state || ad.location?.split(',')[0] || 'México';
                      return (
                        <div key={ad.id} onClick={() => { runSearch(ad.title); }} className="shrink-0 w-[160px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:shadow-md dark:hover:shadow-black/50 transition-shadow cursor-pointer group">
                          <div className="w-full h-[100px] bg-slate-100 dark:bg-slate-850 overflow-hidden">
                            <img src={imgSrc} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { if (!e.currentTarget.src.endsWith('/placeholder-ad.svg')) e.currentTarget.src='/placeholder-ad.svg'; }} alt={ad.title}/>
                          </div>
                          <div className="p-2">
                            <div className="text-[13px] font-bold text-[#0F172A] dark:text-white leading-tight line-clamp-1">{ad.title}</div>
                            <div className="text-[13px] font-semibold text-[#65A30D] dark:text-[#BEF264] mt-0.5">${Number(ad.price || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">MXN</span></div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{locationStr}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })()}



            {/* 10. FOR BUSINESS */}

            <section className="col-span-12 mt-4">

              <div className="grid lg:grid-cols-3 gap-4">

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 card">

                  <div className="w-10 h-10 rounded-xl bg-[#84CC16]/15 flex items-center justify-center mb-3"><Zap className="w-5 h-5 text-[#65A30D]" /></div>

                  <h3 className="text-[18px] font-bold">{t.plan_free || 'Mercasto Starter'}</h3>

                  <p className="text-[14px] text-slate-600 dark:text-slate-400 mt-1">{t.starter_desc || 'Ideal para ventas ocasionales'}</p>

                  <ul className="mt-4 space-y-2 text-[13px] text-slate-700 dark:text-slate-300">

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> 3 {t.free_ad || 'anuncios'}</li>

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.basic_stats || 'Estadísticas básicas'}</li>

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.contacto_qr || 'Contacto vía Whatsapp/Telegram'}</li>

                  </ul>

                  <button onClick={() => setShowPricingModal(true)} className="btn-md w-full mt-5 bg-transparent border border-slate-300 dark:border-slate-700 text-[#0F172A] dark:text-white hover:bg-[#84CC16]/10 dark:hover:bg-[#84CC16]/10 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md hover:border-[#84CC16] dark:hover:border-[#84CC16] hover:text-[#65A30D] dark:hover:text-[#84CC16] hover:ring-2 hover:ring-[#84CC16]/20">{t.view_plans}</button>

                </div>

                <div className="bg-slate-900 text-white rounded-3xl p-6 card relative overflow-hidden ring-2 ring-[#84CC16]">

                  <span className="absolute top-4 right-4 badge bg-[#84CC16] text-white">POPULAR</span>

                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3"><ShieldCheck className="w-5 h-5 text-white" /></div>

                  <h3 className="text-[18px] font-bold">{t.plan_pro_basic || 'Mercasto PRO'}</h3>

                  <p className="text-[14px] text-white/70 mt-1">{t.pro_desc || 'Para vendedores recurrentes'}</p>

                  <ul className="mt-4 space-y-2 text-[13px] text-white/90">

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.unlimited_ads || 'Anuncios ilimitados'}</li>

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.boost_credits || 'Créditos mensuales'}</li>

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.advanced_stats || 'Estadísticas PRO'}</li>

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.verified_badge || 'Insignia Verificada'}</li>

                  </ul>

                  <button onClick={() => setShowPricingModal(true)} className="btn-md w-full mt-5 bg-[#84CC16] text-white hover:bg-[#65A30D]">{t.view_plans}</button>

                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 card">

                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3"><Building2 className="w-5 h-5 text-slate-700 dark:text-slate-300" /></div>

                  <h3 className="text-[18px] font-bold">{t.enterprise || 'Enterprise'}</h3>

                  <p className="text-[14px] text-slate-600 dark:text-slate-400 mt-1">{t.enterprise_desc || 'Inmobiliarias, agencias...'}</p>

                  <ul className="mt-4 space-y-2 text-[13px] text-slate-700 dark:text-slate-300">

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.bulk_import || 'Importación masiva'}</li>

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.account_manager || 'Soporte dedicado'}</li>

                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> {t.storefront || 'Página de Tienda'}</li>

                  </ul>

                  <button onClick={() => navigate('/contacto?enterprise=1')} className="btn-md w-full mt-5 border border-slate-300 dark:border-slate-700 dark:text-white hover:bg-[#84CC16]/10 dark:hover:bg-[#84CC16]/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md hover:border-[#84CC16] dark:hover:border-[#84CC16] hover:text-[#65A30D] dark:hover:text-[#84CC16] hover:ring-2 hover:ring-[#84CC16]/20">{t.contact_sales || 'Contactar ventas'}</button>

                </div>

              </div>

            </section>



            {/* 11. HOW IT WORKS */}

            <section className="col-span-12 mt-6">

              <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8">

                <h2 className="text-[22px] font-bold tracking-tight text-center">{t.how_it_works || 'Cómo funciona Mercasto'}</h2>

                <div className="grid md:grid-cols-4 gap-6 mt-8 relative">

                  <div className="absolute top-[22px] left-[12%] right-[12%] h-px bg-slate-200 hidden md:block"></div>

                  <div className="text-center relative">

                    <div className="w-11 h-11 mx-auto rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold shadow-lg">01</div>

                    <h3 className="font-semibold mt-3">{t.post_60s || 'Publica en 60s'}</h3>

                    <p className="text-[13px] text-slate-600 mt-1">{t.post_60s_desc || 'Fotos, precio, ubicación. La IA hace el resto.'}</p>

                  </div>

                  <div className="text-center relative">

                    <div className="w-11 h-11 mx-auto rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold shadow-lg">02</div>

                    <h3 className="font-semibold mt-3">{t.get_leads || 'Recibe contactos'}</h3>

                    <p className="text-[13px] text-slate-600 mt-1">{t.get_leads_desc || 'Llamadas, WhatsApp o escaneo QR seguro.'}</p>

                  </div>

                  <div className="text-center relative">

                    <div className="w-11 h-11 mx-auto rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold shadow-lg">03</div>

                    <h3 className="font-semibold mt-3">{t.meet_safely || 'Encuentros seguros'}</h3>

                    <p className="text-[13px] text-slate-600 mt-1">{t.meet_safely_desc || 'Perfiles verificados (KYC) para tu paz mental.'}</p>

                  </div>

                  <div className="text-center relative">

                    <div className="w-11 h-11 mx-auto rounded-full bg-[#84CC16] text-white flex items-center justify-center font-bold shadow-lg">04</div>

                    <h3 className="font-semibold mt-3">{t.sell_faster || 'Vende rápido'}</h3>

                    <p className="text-[13px] text-slate-600 mt-1">{t.sell_faster_desc || 'Destaca tu anuncio y cierra el trato hoy.'}</p>

                  </div>

                </div>

              </div>

            </section>



            {/* 12. SAFETY CENTER */}

            <section className="col-span-12 mt-6">

              <div className="grid md:grid-cols-3 gap-4">

                <div className="bg-white border border-slate-200 rounded-2xl p-5 card">

                  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center"><Shield className="w-5 h-5 text-red-600" /></div>

                  <h3 className="font-semibold mt-3">{t.avoid_scams || 'Evita fraudes'}</h3>

          <p className="text-[13px] text-slate-600 mt-1">{t.avoid_scams_desc || 'Nunca pagues por adelantado. Revisa las insignias.'}</p>

                  <button onClick={() => navigate('/safety')} className="btn-sm border border-slate-300 mt-3 hover:bg-slate-50">{t.learn_more || 'Saber más'}</button>

                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 card">

                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-blue-600" /></div>

                  <h3 className="font-semibold mt-3">{t.safe_payments || 'Pagos seguros'}</h3>

                  <p className="text-[13px] text-slate-600 mt-1">{t.safe_payments_desc || 'Reúnete en público. Cuenta el dinero antes de irte.'}</p>

                  <button onClick={() => navigate('/safety')} className="btn-sm border border-slate-300 mt-3 hover:bg-slate-50">{t.learn_more || 'Saber más'}</button>

                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 card">

                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>

                  <h3 className="font-semibold mt-3">{t.verified_sellers || 'Vendedores verificados'}</h3>

                  <p className="text-[13px] text-slate-600 mt-1">{t.verified_sellers_desc || 'Busca la insignia azul de identidad confirmada (KYC).'}</p>

                  <button onClick={() => navigate('/ayuda')} className="btn-sm border border-slate-300 mt-3 hover:bg-slate-50">{t.learn_more || 'Saber más'}</button>

                </div>

              </div>

            </section>



            {/* 13. POPULAR SEARCHES */}

            <section className="col-span-12">

              <div className="bg-white border border-slate-200 rounded-2xl p-5">

                <div className="flex items-center justify-between">

                  <h3 className="font-bold text-[17px]">{t.popular_searches || 'Búsquedas populares'}</h3>

                  <span className="text-[12px] text-slate-500">{t.updated_hourly || 'Actualizado hace 1h'}</span>

                </div>

                <div className="flex flex-wrap gap-2 mt-3">

                  {['iphone 15', 'samsung s24', 'departamento renta cdmx', 'casa venta guadalajara', 'honda civic', 'toyota corolla', 'trabajo remoto', 'recepcionista', 'nintendo switch', 'ps5', 'macbook', 'trabajo medio tiempo', 'bicicleta', 'escritorio', 'sala', 'refrigerador', 'lavadora', 'golden retriever', 'gatitos', 'terreno', 'local comercial', 'moto italika', 'yamaha', 'abogado', 'contador', 'plomero', 'electricista', 'clases ingles', 'uber carro', 'airbnb amueblado'].map(term => (

                    <a key={term} href={`/listings?q=${encodeURIComponent(term)}`} onClick={(e) => { e.preventDefault(); runSearch(term); }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-[13px] cursor-pointer">{term}</a>

                  ))}

                </div>

              </div>

            </section>



            {/* 14. CITIES */}

            <section className="col-span-12">

              <div className="flex items-center justify-between mb-3">

                <h3 className="font-bold text-[17px]">{t.explore_city || 'Explorar por ciudad'}</h3>

                <a href="/listings" onClick={(e) => { e.preventDefault(); setSearchLocation?.(null); setSearchLocationInput?.(''); setSelectedState(''); executeSearch?.(null, ''); }} className="text-[13px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer">{t.view_all_mexico || 'Ver todo México →'}</a>

              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">

                {[

                  { name: 'Ciudad de México', count: '284,392', highlight: true },

                  { name: 'Guadalajara', count: '198,445' },

                  { name: 'Monterrey', count: '156,221' },

                  { name: 'Puebla', count: '89,334' },

                  { name: 'Tijuana', count: '76,551' },

                  { name: 'Aguascalientes', count: '47,882', highlight: true },
                  { name: 'San Luis Potosí', count: '47,882' },

                  { name: 'Cancún', count: '58,992' },

                  { name: 'Mérida', count: '52,110' },

                  { name: 'Querétaro', count: '71,884' },

                  { name: 'León', count: '64,223' },

                  { name: 'Playa del Carmen', count: '39,445' },

                  { name: 'Tulum', count: '28,331' },

                  { name: 'Zapopan', count: '61,223' },

                  { name: 'Tlaquepaque', count: '34,556' },

                  { name: 'Culiacán', count: '41,882' },

                  { name: 'Hermosillo', count: '38,991' },

                  { name: 'Chihuahua', count: '44,221' },

                  { name: 'Cabo San Lucas', count: '31,882' }

                ].map(city => (

                  <a key={city.name} href={`/listings?location=${encodeURIComponent(city.name)}`} onClick={(e) => { e.preventDefault(); applyCityFilter(city.name); }} className={`bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 hover:shadow-sm flex justify-between items-center cursor-pointer ${city.highlight ? 'ring-2 ring-[#84CC16]/40' : ''}`}>

                    <span className={`text-[14px] ${city.highlight ? 'font-medium' : ''}`}>{city.name}</span>

                    <span className={`text-[12px] ${city.highlight ? 'text-[#65A30D] font-semibold' : 'text-slate-500'}`}>{city.count}</span>

                  </a>

                ))}

              </div>

            </section>



            {/* 15. NEWSLETTER */}

            <section className="col-span-12">

              <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 flex flex-col md:flex-row items-center gap-4 justify-between">

                <div>

                  <h3 className="font-bold text-[18px]">{t.newsletter_title || 'Recibe las mejores ofertas de México'}</h3>

                  <p className="text-[13px] text-slate-600">{t.newsletter_desc || 'Resumen semanal de ofertas, caída de precios y nuevos empleos.'}</p>

                </div>

                <form className="flex w-full md:w-auto gap-2" onSubmit={e => { e.preventDefault(); showHomeToast('Gracias por suscribirte.'); e.target.reset(); }}>

                  <input type="email" required placeholder={t.your_email || 'Tu correo electrónico'} className="w-full md:w-[300px] px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]"/>

                  <button type="submit" className="btn-md bg-[#84CC16] text-white hover:bg-[#65A30D] whitespace-nowrap">{t.subscribe || 'Suscribirse'}</button>

                </form>

              </div>

            </section>

          </div>


          {/* SEO: ItemList Schema for ads */}
          {safeServerAds.length > 0 && (
            <ItemListSchema items={safeServerAds} listName="Anuncios destacados en Mercasto" />
          )}

          {/* SEO: FAQ Section for AEO */}
          <div className="container mx-auto px-4 py-8">
            <FAQSchema faqs={FAQ_DATA.home} pageType="home" lang={lang} />
          </div>

        </main>

      </div>

    );

}
