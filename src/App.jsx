import React, { useState, useMemo, useEffect, useCallback, useRef, Suspense } from 'react';
import { trackPageView, events } from './utils/analytics';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { getTranslations } from './utils/translations';
import { localizedText } from './utils/localize';
import { formatDate, formatMXN, formatNumber } from './utils/localeFormat';
import { formatPaymentActionCopy, getPaymentActionCopy } from './utils/paymentActionCopy';
import { appendDynamicFilters, parseDynamicFilters } from './utils/filterUrlState';
import { createOAuthRegistrationUrl, createRegistrationConsentPayload } from './utils/registrationConsent';
import { clearPublishDraft } from './utils/publishDraft';
import { ensurePushSubscription, fetchVapidPublicKey } from './utils/webPush';
import { subcategoriesByLang } from './constants/subcategoryTranslations';
import { getVerticalCanonicalAlias, getVerticalSeo } from './constants/verticalSeo';
import { getPublicSeo } from './constants/publicSeo';
import {
  AuthEntryRoute, LegacyAccountListingRoute, ReferralRedirect, RequireAuth,
} from './app/routeHelpers';
import { useRefQueryParam } from './app/referralQuery';
import { useSearchSuggestionState } from './app/useSearchSuggestionState';
import { useLocationSearchState } from './app/useLocationSearchState';
import { useViewedAdState } from './app/useViewedAdState';
import {
  AdminScreen, HomeScreen, CatalogScreen, PostScreen, SellerLandingScreen, UserDashboard,
  AdDetailScreen, StorefrontScreen, EditAdScreen, SellerProfileScreen, AutosLanding, InmueblesLanding,
  EmpleosLanding, ServiciosLanding, CategoryLanding, ProductosLanding, TurismoLanding, ProfileEditScreen,
  TerminosScreen, PrivacidadScreen, CookiesScreen, NotFoundScreen, VerificarEmailScreen, StoresScreen,
  NotificationsScreen, ChatScreen, ContactoScreen, AyudaScreen, GeoSourcePage, ReferralScreen,
} from './app/lazyScreens';
import AppFooter from './components/shell/AppFooter';
import AppHeader from './components/shell/AppHeader';
import MobileTabBar from './components/shell/MobileTabBar';

// Subcategory data is either an array of Spanish labels (canonical value == display label)
// or an object keyed by a stable slug (canonical value == slug, label is translated).
// Always returns [{ value, label }] pairs so the dropdown can render either shape uniformly.
function localizeServerMessage(lang, serverMessage, fallback) {
  return lang === 'es' && serverMessage ? serverMessage : fallback;
}

function getSubcategoryOptions(activeCat, lang) {
  const canonical = subcategoriesByLang.es[activeCat];
  if (!canonical) return null;
  const localized = subcategoriesByLang[lang]?.[activeCat] || canonical;
  if (Array.isArray(canonical)) {
    return canonical.map((label, idx) => ({ value: label, label: localized[idx] || label }));
  }
  return Object.keys(canonical).map((slug) => ({ value: slug, label: localized[slug] || canonical[slug] }));
}
import AdSenseBanner from './components/common/AdSenseBanner';
import AdCard from './components/common/AdCard';
import BuyerConversionNudge from './components/BuyerConversionNudge';
const OnboardingModal = React.lazy(() => import('./components/OnboardingModal'));
const QRModal = React.lazy(() => import('./components/modals/QRModal'));
const ReportModal = React.lazy(() => import('./components/modals/ReportModal'));
const UserReportModal = React.lazy(() => import('./components/modals/UserReportModal'));
const PricingModal = React.lazy(() => import('./components/modals/PricingModal'));
const CouponModal = React.lazy(() => import('./components/modals/CouponModal'));
const ProfileModal = React.lazy(() => import('./components/modals/ProfileModal'));
const AiCommandModal = React.lazy(() => import('./components/admin/AiCommandModal'));
import {
  Search, Home, PlusCircle, Plus, User, Users, Settings, Shield, Menu,
  MapPin, ChevronRight, ChevronLeft, Heart, SlidersHorizontal,
  CheckCircle, XCircle, BarChart3, LogOut, Globe, Sparkles, Loader2, Play, Video, Phone, AlertTriangle,
  Ticket, Pencil, Moon, Sun, BadgeCheck, Zap, Building2, Crown, Store, TrendingUp, UploadCloud,
  ShieldCheck, Camera, Trash2, Download, PieChart as PieChartIcon, QrCode, Share2, Bell, MessageCircle
} from 'lucide-react';

// echo/pusher deferred: only needed for authenticated real-time notifications.
// Dynamic import keeps laravel-echo + pusher-js (~73 KB) out of the critical bundle.
let _echoInstance = null;
async function getEcho() {
  if (import.meta.env.VITE_DISABLE_REALTIME === 'true') return null;
  if (_echoInstance) return _echoInstance;
  const mod = await import('./echo');
  _echoInstance = mod.default;
  return _echoInstance;
}
const CookieBanner = React.lazy(() => import('./components/CookieBanner'));
import { useUI } from './contexts/UIContext';

const SUPPORTED_LANGUAGES = new Set([
  'es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar',   'ru', 'ja',
]);
const LANGUAGE_OPTIONS = [...SUPPORTED_LANGUAGES];
const NAV_LABELS = {
  es: ['Todo', 'Autos', 'Inmuebles', 'Servicios', 'Empleo', 'Tiendas'],
  en: ['All', 'Cars', 'Real estate', 'Services', 'Jobs', 'Stores'],
  pt: ['Tudo', 'Carros', 'Imóveis', 'Serviços', 'Empregos', 'Lojas'],
  fr: ['Tout', 'Voitures', 'Immobilier', 'Services', 'Emplois', 'Boutiques'],
  zh: ['全部', '汽车', '房地产', '服务', '招聘', '商店'],
  ko: ['전체', '자동차', '부동산', '서비스', '채용', '상점'],
  de: ['Alle', 'Autos', 'Immobilien', 'Dienstleistungen', 'Jobs', 'Shops'],
  it: ['Tutto', 'Auto', 'Immobili', 'Servizi', 'Lavoro', 'Negozi'],
  ar: ['الكل', 'سيارات', 'عقارات', 'خدمات', 'وظائف', 'متاجر'],


  ru: ['Все', 'Авто', 'Недвижимость', 'Услуги', 'Работа', 'Магазины'],
  ja: ['すべて', '自動車', '不動産', 'サービス', '求人', 'ショップ'],
};

// Глобальный перехватчик фатальных ошибок (Защита от белого экрана)
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    try {
      sessionStorage.setItem('mercasto_last_runtime_error', JSON.stringify({
        message: error?.message || String(error),
        stack: error?.stack || '',
        componentStack: errorInfo?.componentStack || '',
        path: window.location.pathname,
        time: new Date().toISOString(),
      }));
    } catch {}
  }

  static recoverFromStaleApp() {
    Promise.allSettled([
      'caches' in window ? caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))) : Promise.resolve(),
      navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(regs => Promise.all(regs.map(reg => reg.update()))) : Promise.resolve(),
    ]).finally(() => window.location.replace(`/?refresh=${Date.now()}`));
  }

  static resetSessionAndReload() {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('just_registered');
    } catch {}
    window.location.replace('/');
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || String(this.state.error || 'Unknown runtime error');
      const t = this.props.t || getTranslations('es');
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-center w-full">
          <h1 className="text-[24px] font-bold text-white mb-2">{t.shell_error_title}</h1>
          <p className="text-slate-300 mb-6 max-w-md">{t.shell_error_desc}</p>
          <div className="text-left bg-slate-900 text-red-300 p-4 rounded-xl mb-6 overflow-x-auto max-w-3xl w-full font-mono text-[12px] border border-red-900/50 shadow-sm whitespace-pre-wrap">
            <strong>{t.shell_error_code}:</strong> {errorMessage}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => ErrorBoundary.resetSessionAndReload()} className="px-6 py-3 bg-[#84CC16] text-slate-950 font-bold rounded-xl shadow-md hover:bg-[#65A30D] transition-colors">{t.shell_open_guest}</button>
            <button onClick={() => ErrorBoundary.recoverFromStaleApp()} className="px-6 py-3 bg-slate-800 text-white rounded-xl shadow-md hover:bg-slate-700 transition-colors">{t.shell_reload}</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const getEnvVar = (key, prodFallback) => {
  const value = import.meta.env[key];
  if (value) return value;
  if (import.meta.env.PROD) return prodFallback;
  throw new Error(`Environment variable ${key} is required in development/staging. Please check your .env file.`);
};

const API_URL = getEnvVar('VITE_API_BASE_URL', 'https://mercasto.com/api');
const STORAGE_URL = getEnvVar('VITE_STORAGE_URL', 'https://mercasto.com/storage');
const ENABLE_AI_PANEL = import.meta.env.VITE_ENABLE_AI_PANEL === 'true';


const getImageUrl = (path, fallback = null) => {
  const defaultFallback = fallback || '/placeholder-ad.svg';
  if (!path) return defaultFallback;

  const safeExternalImage = (url) => {
    if (typeof url === 'string' && url.includes('images.unsplash.com')) {
      let optimized = url.replace(/w=\d+/, 'w=400');
      if (optimized.includes('q=')) {
        optimized = optimized.replace(/q=\d+/, 'q=70');
      } else {
        optimized += '&q=70';
      }
      if (!optimized.includes('auto=format')) {
        optimized += '&auto=format&fit=crop';
      }
      return optimized;
    }
    return url;
  };

  if (Array.isArray(path)) {
    if (path.length > 0) {
      const first = path[0];
      if (first && (first.startsWith('http') || first.startsWith('data:'))) return safeExternalImage(first);
      return `${STORAGE_URL}/${first}`;
    }
    return defaultFallback;
  }
  if (typeof path === 'string') {
    if (path.startsWith('http') || path.startsWith('data:')) return safeExternalImage(path);
    if (path.startsWith('[')) {
      try {
        const arr = JSON.parse(path);
        if (arr && arr.length > 0) {
          const first = arr[0];
          if (first.startsWith('http') || first.startsWith('data:')) return safeExternalImage(first);
          return `${STORAGE_URL}/${first}`;
        }
      } catch (e) {}
    }
    return `${STORAGE_URL}/${path}`;
  }
  return defaultFallback;
};

const getImageUrls = (pathStr, fallbackArr = []) => {
  if (!pathStr) return fallbackArr;
  if (Array.isArray(pathStr)) {
    return pathStr.map(p => getImageUrl(p));
  }
  try {
    const arr = JSON.parse(pathStr);
    if (Array.isArray(arr)) {
      return arr.map(p => getImageUrl(p));
    }
  } catch(e) {}
  const single = getImageUrl(pathStr);
  return [single];
};

// База данных всех Штатов и основных Городов Мексики
const MEXICO_STATES_CITIES = {
  "Aguascalientes": ["Aguascalientes", "Asientos", "Calvillo", "Cosío", "Jesús María", "Pabellón de Arteaga", "Rincón de Romos", "San José de Gracia", "Tepezalá", "El Llano", "San Francisco de los Romo"],
  "Baja California": ["Ensenada", "Mexicali", "Tecate", "Tijuana", "Playas de Rosarito", "San Quintín", "San Felipe"],
  "Baja California Sur": ["Comondú", "Mulegé", "La Paz", "Los Cabos", "Loreto"],
  "Campeche": ["Calkiní", "Campeche", "Carmen", "Champotón", "Hecelchakán", "Hopelchén", "Palizada", "Tenabo", "Escárcega", "Calakmul", "Candelaria", "Seybaplaya", "Dzitbalché"],
  "Chiapas": ["Tuxtla Gutiérrez", "Tapachula", "San Cristóbal de las Casas", "Comitán de Domínguez", "Chiapa de Corzo", "Palenque", "Ocosingo", "Tonalá", "Villaflores", "Huixtla", "Reforma"],
  "Chihuahua": ["Chihuahua", "Ciudad Juárez", "Cuauhtémoc", "Delicias", "Hidalgo del Parral", "Nuevo Casas Grandes", "Camargo", "Jiménez", "Ojinaga", "Meoqui"],
  "Ciudad de México": ["Álvaro Obregón", "Azcapotzalco", "Benito Juárez", "Coyoacán", "Cuajimalpa de Morelos", "Cuauhtémoc", "Gustavo A. Madero", "Iztacalco", "Iztapalapa", "La Magdalena Contreras", "Miguel Hidalgo", "Milpa Alta", "Tláhuac", "Tlalpan", "Venustiano Carranza", "Xochimilco"],
  "Coahuila": ["Saltillo", "Torreón", "Monclova", "Piedras Negras", "Acuña", "Matamoros", "San Pedro", "Frontera", "Ramos Arizpe", "Sabinas", "Múzquiz"],
  "Colima": ["Colima", "Manzanillo", "Tecomán", "Villa de Álvarez", "Armería", "Coquimatlán", "Cuauhtémoc", "Comala", "Ixtlahuacán", "Minatitlán"],
  "Durango": ["Durango", "Gómez Palacio", "Lerdo", "Pueblo Nuevo", "Santiago Papasquiaro", "Guadalupe Victoria", "Cuencamé", "Canatlán", "Nuevo Ideal"],
  "Estado de México": ["Ecatepec de Morelos", "Nezahualcóyotl", "Toluca", "Naucalpan de Juárez", "Chimalhuacán", "Tlalnepantla de Baz", "Cuautitlán Izcalli", "Tecámac", "Ixtapaluca", "Atizapán de Zaragoza", "Tultitlán", "Valle de Chalco Solidaridad", "Chalco", "Coacalco de Berriozábal", "La Paz", "Huixquilucan", "Texcoco", "Metepec"],
  "Guanajuato": ["León", "Irapuato", "Celaya", "Salamanca", "Silao de la Victoria", "Guanajuato", "San Miguel de Allende", "Pénjamo", "Valle de Santiago", "San Francisco del Rincón", "Dolores Hidalgo", "Acámbaro"],
  "Guerrero": ["Acapulco de Juárez", "Chilpancingo de los Bravo", "Iguala de la Independencia", "Zihuatanejo de Azueta", "Taxco de Alarcón", "Chilapa de Álvarez", "Tlapa de Comonfort"],
  "Hidalgo": ["Pachuca de Soto", "Tulancingo de Bravo", "Mineral de la Reforma", "Tizayuca", "Tula de Allende", "Huejutla de Reyes", "Tepeji del Río de Ocampo", "Ixmiquilpan"],
  "Jalisco": ["Guadalajara", "Zapopan", "San Pedro Tlaquepaque", "Tlajomulco de Zúñiga", "Tonalá", "Puerto Vallarta", "Lagos de Moreno", "Tepatitlán de Morelos", "Zapotlán el Grande", "Ocotlán", "Tala", "Arandas"],
  "Michoacán": ["Morelia", "Uruapan", "Zamora", "Lázaro Cárdenas", "Zitácuaro", "Apatzingán", "Hidalgo", "Tarímbaro", "La Piedad", "Pátzcuaro", "Los Reyes", "Sahuayo"],
  "Morelos": ["Cuernavaca", "Jiutepec", "Cuautla", "Temixco", "Yautepec", "Emiliano Zapata", "Ayala", "Xochitepec", "Puente de Ixtla", "Jojutla"],
  "Nayarit": ["Tepic", "Bahía de Banderas", "Santiago Ixcuintla", "Compostela", "Tecuala", "Acaponeta", "Xalisco", "San Blas", "Ruiz"],
  "Nuevo León": ["Monterrey", "Apodaca", "Guadalupe", "General Escobedo", "Juárez", "San Nicolás de los Garza", "Santa Catarina", "San Pedro Garza García", "García", "Cadereyta Jiménez", "Linares", "Pesquería"],
  "Oaxaca": ["Oaxaca de Juárez", "San Juan Bautista Tuxtepec", "Juchitán de Zaragoza", "Heroica Ciudad de Huajuapan de León", "Salina Cruz", "Santa Cruz Xoxocotlán", "Loma Bonita", "Heroica Ciudad de Tlaxiaco"],
  "Puebla": ["Puebla", "Tehuacán", "San Martín Texmelucan", "San Andrés Cholula", "Atlixco", "San Pedro Cholula", "Amozoc", "Teziutlán", "Huauchinango", "Zacatlán"],
  "Querétaro": ["Santiago de Querétaro", "San Juan del Río", "Corregidora", "El Marqués", "Tequisquiapan", "Amealco de Bonfil", "Pedro Escobedo", "Ezequiel Montes"],
  "Quintana Roo": ["Benito Juárez", "Solidaridad", "Othón P. Blanco", "Cozumel", "Tulum", "Felipe Carrillo Puerto", "Isla Mujeres", "Bacalar", "José María Morelos", "Lázaro Cárdenas", "Puerto Morelos"],
  "San Luis Potosí": ["San Luis Potosí", "Soledad de Graciano Sánchez", "Ciudad Valles", "Rioverde", "Matehuala", "Tamazunchale", "Ciudad Fernández", "Mexquitic de Carmona"],
  "Sinaloa": ["Culiacán", "Mazatlán", "Ahome", "Guasave", "Navolato", "Salvador Alvarado", "El Fuerte", "Sinaloa", "Rosario", "Escuinapa"],
  "Sonora": ["Hermosillo", "Cajeme", "Nogales", "San Luis Río Colorado", "Navojoa", "Guaymas", "Caborca", "Agua Prieta", "Huatabampo", "Puerto Peñasco"],
  "Tabasco": ["Centro", "Cárdenas", "Comalcalco", "Macuspana", "Huimanguillo", "Cunduacán", "Centla", "Paraíso", "Teapa", "Balancán"],
  "Tamaulipas": ["Reynosa", "Matamoros", "Nuevo Laredo", "Tampico", "Ciudad Victoria", "Ciudad Madero", "Altamira", "Río Bravo", "El Mante", "Valle Hermoso"],
  "Tlaxcala": ["Tlaxcala", "Huamantla", "Apizaco", "San Pablo del Monte", "Chiautempan", "Zacatelco", "Calpulalpan", "Contla de Juan Cuamatzi"],
  "Veracruz": ["Veracruz", "Xalapa", "Coatzacoalcos", "Córdoba", "Poza Rica de Hidalgo", "Papantla", "Minatitlán", "San Andrés Tuxtla", "Boca del Río", "Orizaba", "Tuxpan", "Martínez de la Torre"],
  "Yucatán": ["Mérida", "Kanasín", "Valladolid", "Tizimín", "Progreso", "Umán", "Tekax", "Ticul", "Chemax", "Motul", "Hunucmá", "Oxkutzcab"],
  "Zacatecas": ["Zacatecas", "Fresnillo", "Guadalupe", "Jerez", "Río Grande", "Víctor Rosales", "Sombrerete", "Loreto", "Pinos", "Ojocaliente"]
};

const CATEGORY_ACTIVE_ALIASES = {
  motor: ['motor', 'coches-y-motor'],
  'coches-y-motor': ['coches-y-motor', 'motor'],
};

const getRelativePath = (url) => {
    if (!url) return null;
    if (url.startsWith(STORAGE_URL)) return url.replace(`${STORAGE_URL}/`, '');
    return url;
};

const getCatName = (cat, lang) => {
  if (!cat) return '';
  return cat.name?.[lang] || cat.name?.['es'] || cat.name;
};

const MediaSlider = ({ media, autoplay, alt = 'Imagen del anuncio', priority = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoplay || !media || media.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev === media.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [media, autoplay]);

  if (!media || media.length === 0) return <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400"><Camera size={48}/></div>;
  return (
    <div className="relative w-full h-full group bg-black/5 flex items-center justify-center">
      {media[currentIndex].type === 'video' ? (
        <video src={media[currentIndex].url} controls className="max-w-full max-h-full object-contain" />
      ) : (
        <img
          src={media[currentIndex].url}
          alt={alt}
          width="800"
          height="600"
          loading={priority && currentIndex === 0 ? 'eager' : 'lazy'}
          fetchPriority={priority && currentIndex === 0 ? 'high' : 'auto'}
          decoding="async"
          data-ad-detail-hero={priority && currentIndex === 0 ? 'true' : undefined}
          className="max-w-full max-h-full object-contain shadow-sm"
        />
      )}
      {media.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev === 0 ? media.length - 1 : prev - 1); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white text-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><ChevronLeft/></button>
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev === media.length - 1 ? 0 : prev + 1); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white text-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><ChevronRight/></button>
        </>
      )}
    </div>
  );
};

// --- ДАННЫЕ И ПЕРЕВОДЫ ---



export default function AppWrapper() {
  const { lang, loadedLangVersion } = useUI();
  void loadedLangVersion;
  const t = getTranslations(lang);
  return (
    <ErrorBoundary t={t}>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const { lang, setLang, loadedLangVersion, isDarkMode, setIsDarkMode } = useUI();

  // Page-view tracking. Keep filtered/catalog/detail states out of homepage conversion metrics.
  useEffect(() => {
    trackPageView(location.pathname + location.search, document.title);

    const params = new URLSearchParams(location.search);
    const homepageContentKeys = [
      'q', 'search', 'category', 'cat', 'subcategory', 'state', 'city', 'location',
      'min_price', 'max_price', 'condition', 'sort', 'page', 'lat', 'lng', 'radius',
      'radius_km', 'ad', 'store',
    ];
    const hasHomepageContentState = homepageContentKeys.some(key => params.has(key))
      || /^#(?:ad-|company-)/.test(location.hash || '');

    if (location.pathname === '/' && !hasHomepageContentState) {
      events.homepageViewed({ source: 'route' });
    }
  }, [location]);

  const currentTab = location.pathname.split('/')[1] || 'home';

  // UIProvider is the single source of truth for language, storage and document direction.
  // Reading the version keeps this component reactive when a lazy runtime dictionary finishes loading.
  void loadedLangVersion;
  const t = getTranslations(lang);
  const paymentCopy = getPaymentActionCopy(lang);

  const [serverAds, setServerAds] = useState([]);
  const [realEstateAds, setRealEstateAds] = useState([]);
  const [jobAds, setJobAds] = useState([]);
  const [serviceAds, setServiceAds] = useState([]);
  const [automotiveAds, setAutomotiveAds] = useState([]);
  const [adsTotal, setAdsTotal] = useState(0);
  const [loadingAds, setLoadingAds] = useState(true);
  const [adsLoadError, setAdsLoadError] = useState(false);
  const {
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
  } = useSearchSuggestionState();
  const [selectedState, setSelectedState] = useState('');
  const [activeCat, setActiveCat] = useState(''); // Фильтр по категории
  const [activeSub, setActiveSub] = useState(''); // Фильтр по подкатегории

  // Состояния для динамической фильтрации (EAV JSON)
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [conditionFilter, setConditionFilter] = useState([]);
  const [dynamicFilters, setDynamicFilters] = useState({});

  const {
    viewedAd, setViewedAd, deepLinkAdMissing, setDeepLinkAdMissing,
    deepLinkAdLoadError, setDeepLinkAdLoadError, deepLinkAdRetryNonce, setDeepLinkAdRetryNonce,
  } = useViewedAdState();
  const [viewedCompany, setViewedCompany] = useState(null);
  const [companyAds, setCompanyAds] = useState([]);
  const [loadingCompanyAds, setLoadingCompanyAds] = useState(false);
  const [companyAdsLoadError, setCompanyAdsLoadError] = useState(false);
  const [companyReviews, setCompanyReviews] = useState([]);
  const [loadingCompanyReviews, setLoadingCompanyReviews] = useState(false);
  const [companyReviewsLoadError, setCompanyReviewsLoadError] = useState(false);
  const [companyRatingStats, setCompanyRatingStats] = useState({ average: 0, total: 0 });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadCompanyAds = useCallback(async (sellerId, { clear = false } = {}) => {
    if (!sellerId) return;
    if (clear) setCompanyAds([]);
    setLoadingCompanyAds(true);
    setCompanyAdsLoadError(false);
    try {
      const response = await fetch(`${API_URL}/ads?user_id=${sellerId}`);
      if (!response.ok) throw new Error(`company-ads-load-failed:${response.status}`);
      const payload = await response.json();
      setCompanyAds(payload.data || (Array.isArray(payload) ? payload : []));
      setCompanyAdsLoadError(false);
    } catch (err) {
      setCompanyAdsLoadError(true);
      console.error('Error loading company ads', err);
    } finally {
      setLoadingCompanyAds(false);
    }
  }, []);

  const loadCompanyReviews = useCallback(async (sellerId, { clear = false } = {}) => {
    if (!sellerId) return;
    if (clear) {
      setCompanyReviews([]);
      setCompanyRatingStats({ average: 0, total: 0 });
    }
    setLoadingCompanyReviews(true);
    setCompanyReviewsLoadError(false);
    try {
      const response = await fetch(`${API_URL}/users/${sellerId}/reviews`);
      if (!response.ok) throw new Error(`company-reviews-load-failed:${response.status}`);
      const payload = await response.json();
      setCompanyReviews(payload.reviews || []);
      setCompanyRatingStats({ average: payload.average || 0, total: payload.total || 0 });
      setCompanyReviewsLoadError(false);
    } catch (err) {
      setCompanyReviewsLoadError(true);
      console.error('Error loading company reviews', err);
    } finally {
      setLoadingCompanyReviews(false);
    }
  }, []);

  const loadCompanySecondaryData = useCallback((sellerId, options = {}) => Promise.all([
    loadCompanyAds(sellerId, options),
    loadCompanyReviews(sellerId, options),
  ]), [loadCompanyAds, loadCompanyReviews]);

  // Защита от фатального "Белого экрана смерти" (WSOD) при повреждении localStorage
  const getSafeUser = () => {
    try { return JSON.parse(localStorage.getItem('user')) || null; }
    catch (e) { localStorage.removeItem('user'); return null; }
  };
  const initialAuthToken = localStorage.getItem('auth_token');
  const initialUser = initialAuthToken ? getSafeUser() : null;
  const [authReady, setAuthReady] = useState(!initialAuthToken);
  const [user, setUser] = useState(initialUser);
  const [showAuthModal, setShowAuthModal] = useState(false);
  useRefQueryParam();
  const [authMode, setAuthMode] = useState('login');
  const [registrationConsentAccepted, setRegistrationConsentAccepted] = useState(false);
  const [pendingPhoneRegistrationConsent, setPendingPhoneRegistrationConsent] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [emailBannerDismissed, setEmailBannerDismissed] = useState(false);
  const [emailBannerSent, setEmailBannerSent] = useState(false);

  // Show onboarding once for organic registrations. High-intent protected-route
  // registrations continue to bypass it through protectedRouteReturn.
  useEffect(() => {
    const resolved = Boolean(
      user?.onboarding_completed_at
      || user?.onboarding_skipped_at
      || (user?.id != null && localStorage.getItem('onboarding_done_user_id') === String(user.id)),
    );
    if (!user || resolved || localStorage.getItem('just_registered') !== '1') return undefined;

    const timer = window.setTimeout(() => setShowOnboarding(true), 500);
    return () => window.clearTimeout(timer);
  }, [user]);

  // A transient network failure must not block browsing. Retry the server-side
  // completion/skip marker after the authenticated session is available again.
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('auth_token');
    const pending = localStorage.getItem('onboarding_pending_sync');
    if (!token || !pending) return;

    let pendingSync;
    try { pendingSync = JSON.parse(pending); }
    catch { localStorage.removeItem('onboarding_pending_sync'); return; }

    if (String(pendingSync?.user_id ?? '') !== String(user.id) || !pendingSync?.payload) {
      localStorage.removeItem('onboarding_pending_sync');
      return;
    }

    fetch('/api/user/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(pendingSync.payload),
    }).then((response) => {
      if (response.ok) localStorage.removeItem('onboarding_pending_sync');
    }).catch(() => {});
  }, [user]);
  const [resetToken, setResetToken] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const authModalDialogRef = useRef(null);
  const authModalOpenerRef = useRef(null);
  const authModalWasOpenRef = useRef(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorChallengeToken, setTwoFactorChallengeToken] = useState('');

  const getAuthModalFocusables = useCallback(() => {
    const dialog = authModalDialogRef.current;
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.getClientRects().length > 0);
  }, []);

  const handleAuthModalKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && !authLoading) {
      event.preventDefault();
      event.stopPropagation();
      setShowAuthModal(false);
      return;
    }
    if (event.key !== 'Tab') return;

    const dialog = authModalDialogRef.current;
    const focusables = getAuthModalFocusables();
    if (!dialog || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }, [authLoading, getAuthModalFocusables]);

  useEffect(() => {
    if (showAuthModal && !authModalWasOpenRef.current) {
      const active = document.activeElement;
      authModalOpenerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
      authModalWasOpenRef.current = true;
      return;
    }
    if (!showAuthModal && authModalWasOpenRef.current) {
      authModalWasOpenRef.current = false;
      const opener = authModalOpenerRef.current;
      authModalOpenerRef.current = null;
      window.requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus();
      });
    }
  }, [showAuthModal]);

  useEffect(() => {
    if (!showAuthModal || authLoading) return undefined;

    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setShowAuthModal(false);
    };

    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [showAuthModal, authLoading]);

  useEffect(() => {
    if (!showAuthModal) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const dialog = authModalDialogRef.current;
      if (!dialog) return;
      const preferred = dialog.querySelector(
        'input[autofocus], input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])',
      ) || getAuthModalFocusables()[0];
      preferred?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showAuthModal, authMode, requiresTwoFactor, getAuthModalFocusables]);

  const [accountType, setAccountType] = useState('particular');
  const [userRole, setUserRole] = useState(() => initialUser?.role || 'individual');

  const [form, setForm] = useState({ title: '', price: '', description: '', location: '', city: '', state: '', latitude: '', longitude: '', category: '', condition: 'nuevo', attributes: {} });
  const [debouncedLocation, setDebouncedLocation] = useState('');
  const [isMapUpdating, setIsMapUpdating] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [listingQualityPreflight, setListingQualityPreflight] = useState(null);
  const [editingAd, setEditingAd] = useState(null);
  const [images, setImages] = useState([]); // { source: 'new' | 'existing', file?: File, url?: string, preview: string }
  const [videoFile, setVideoFile] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [appToast, setAppToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setAppToast({ message, type });
    setTimeout(() => setAppToast(null), 3500);
  };
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [priceTab, setPriceTab] = useState(accountType);
  const [promotionTargetAdId, setPromotionTargetAdId] = useState('');
  const [customCreditsAmount, setCustomCreditsAmount] = useState('');
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsLoadError, setAnalyticsLoadError] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState(7);
  const [dashboardPage, setDashboardPage] = useState(1);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [availableProviders, setAvailableProviders] = useState({ google: false, twitter: false, telegram: false, telegram_bot_id: null, sms: false });

  const discardPostDraft = useCallback(() => {
    (Array.isArray(images) ? images : []).forEach(img => {
      if (img.source === 'new' && img.preview) URL.revokeObjectURL(img.preview);
    });
    setImages([]);
    setVideoFile(null);
    setEditingAd(null);
    setForm({ title: '', price: '', description: '', location: '', city: '', state: '', latitude: '', longitude: '', category: '', condition: 'nuevo', attributes: {} });
  }, [images]);

  const setCurrentTab = useCallback((tab) => {
    // Leaving the publication flow must clean temporary previews, regardless of the next route.
    if (currentTab === 'post' && tab !== 'post') discardPostDraft();
    if (tab === 'home') navigate('/'); else navigate(`/${tab}`);
  }, [navigate, currentTab, discardPostDraft]);

  const handleHeaderCategoryClick = useCallback((slug = '') => {
    if (slug) events.categorySelected(slug, { source: 'header_category' });
    setViewedAd(null);
    setViewedCompany(null);
    setActiveCat(slug);
    setSearchQuery('');
    setDebouncedSearch('');
    const verticalPaths = {
      motor: '/autos',
      inmobiliaria: '/inmuebles',
      servicios: '/servicios',
      empleo: '/empleos',
      tiendas: '/tiendas',
    };
    navigate(verticalPaths[slug] || '/');
    window.scrollTo(0, 0);
  }, [navigate]);

  const isHeaderCategoryActive = useCallback((slug = '') => {
    if (activeCat === slug) return true;
    return (CATEGORY_ACTIVE_ALIASES[activeCat] || []).includes(slug);
  }, [activeCat]);

  const handleAdBack = useCallback(() => {
    setViewedAd(null);
    if (window.location.hash.startsWith('#ad-')) {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/auth/providers`)
      .then(res => res.json())
      .then(data => {
        // Normalize: live server returns { providers: { apple: { enabled: bool } } }
        // Our new route returns { apple: bool } — handle both shapes
        const p = data?.providers ?? data;
        setAvailableProviders({
          google:   p?.google?.enabled  ?? p?.google  ?? false,
          twitter:  p?.twitter?.enabled ?? p?.twitter ?? false,
          telegram: p?.telegram?.enabled ?? p?.telegram ?? false,
          telegram_bot_id: p?.telegram_bot_id ?? null,
          sms:      p?.sms?.enabled      ?? p?.sms      ?? p?.phone?.enabled ?? p?.phone ?? false,
        });
      })
      .catch(() => {});

  }, []);
  const [profileForm, setProfileForm] = useState({ name: '', avatarFile: null, avatarPreview: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [emailForm, setEmailForm] = useState({ new_email: '', password: '' });
  const [emailLoading, setEmailLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showTabBarMenu, setShowTabBarMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sliderAutoplay, setSliderAutoplay] = useState(() => localStorage.getItem('sliderAutoplay') !== 'false');
  const [notificationsForm, setNotificationsForm] = useState({ email_alerts: true, email_new_message: true, push_notifications: true, marketing: false });
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [searchAlerts, setSearchAlerts] = useState([]);
  const [loadingSearchAlerts, setLoadingSearchAlerts] = useState(false);
  const [savingSearchAlert, setSavingSearchAlert] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userAds, setUserAds] = useState([]);
  const [userAdsLoading, setUserAdsLoading] = useState(true);
  const [userAdsLoadError, setUserAdsLoadError] = useState(false);
  const [favoriteAds, setFavoriteAds] = useState([]);
  const [favoriteAdsLoading, setFavoriteAdsLoading] = useState(true);
  const [favoriteAdsLoadError, setFavoriteAdsLoadError] = useState(false);
  const [categoriesData, setCategoriesData] = useState([]);
  const [adminCatForm, setAdminCatForm] = useState({ slug: '', name_es: '', name_en: '', icon: 'Star', sort_order: 100 });
  const [adminLoading, setAdminLoading] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [dashboardTab, setDashboardTab] = useState('my_ads');


  useEffect(() => {
    if (location.pathname !== '/profile') return;
    const requestedTab = new URLSearchParams(location.search).get('tab');
    const allowedTabs = new Set([
      'my_ads', 'favorites', 'saved_searches', 'company', 'stats',
      'transactions', 'contact_history', 'reviews', 'privacy', 'settings',
    ]);
    if (requestedTab && allowedTabs.has(requestedTab)) {
      setDashboardTab(requestedTab);
    }
  }, [location.pathname, location.search]);
  const [adminTab, setAdminTab] = useState('categories');
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);
  const [adminUsersLoadError, setAdminUsersLoadError] = useState(false);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [adminPendingAds, setAdminPendingAds] = useState([]);
  const [loadingPendingAds, setLoadingPendingAds] = useState(false);
  const [adminPendingAdsLoadError, setAdminPendingAdsLoadError] = useState(false);
  const [adminCoupons, setAdminCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({ code: '', credits: 100, max_uses: 10 });
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [adminCouponsLoadError, setAdminCouponsLoadError] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingAd, setReportingAd] = useState(null);
  const [reportForm, setReportForm] = useState({ reason: '', comments: '' });
  const [adminReports, setAdminReports] = useState([]);
  const [adminUserReports, setAdminUserReports] = useState([]);
  const [adminReportTab, setAdminReportTab] = useState('ads');
  const [showUserReportModal, setShowUserReportModal] = useState(false);
  const [userReportForm, setUserReportForm] = useState({ reason: '', comments: '' });
  const [authPhone, setAuthPhone] = useState('');

  // --- CLIP PAYMENTS STATE ---
  const [userPayments, setUserPayments] = useState([]);
  const [loadingUserPayments, setLoadingUserPayments] = useState(false);
  const [userPaymentsLoadError, setUserPaymentsLoadError] = useState(false);
  const [userPaymentsPage, setUserPaymentsPage] = useState(1);
  const [userPaymentsLastPage, setUserPaymentsLastPage] = useState(1);
  const [userPaymentsTotal, setUserPaymentsTotal] = useState(0);

  const [adminPayments, setAdminPayments] = useState([]);
  const [loadingAdminPayments, setLoadingAdminPayments] = useState(false);
  const [adminPaymentsLoadError, setAdminPaymentsLoadError] = useState(false);
  const [adminPaymentsPage, setAdminPaymentsPage] = useState(1);
  const [adminPaymentsLastPage, setAdminPaymentsLastPage] = useState(1);
  const [adminPaymentsTotal, setAdminPaymentsTotal] = useState(0);
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [loadingAdminAnalytics, setLoadingAdminAnalytics] = useState(false);
  const [adminAnalyticsLoadError, setAdminAnalyticsLoadError] = useState(false);

  // --- AI COMMAND CENTER STATE ---
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiAgentType, setAiAgentType] = useState('postgresql');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [adminReportsLoadError, setAdminReportsLoadError] = useState(false);
  const {
    locCity,
    locState,
    mobileSearchInputRef,
    radius,
    searchLocation,
    searchLocationInput,
    setLocCity,
    setLocState,
    setRadius,
    setSearchLocation,
    setSearchLocationInput,
    setShowLocationPicker,
    setShowMobileLocationPicker,
    showLocationPicker,
    showMobileLocationPicker,
  } = useLocationSearchState();
  const skipFilterUrlSyncRef = useRef(false);
  const lastInternalFilterPathRef = useRef('');
  const skipCategoryFilterResetRef = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);
  const adsAbortRef = useRef(null);
  const adsRequestSequenceRef = useRef(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedLocInput, setDebouncedLocInput] = useState('');

  const buildHomeFilterPath = useCallback((overrides = {}) => {
    const nextSearch = overrides.search ?? debouncedSearch;
    const nextCategory = overrides.category ?? activeCat;
    const nextSubcategory = overrides.subcategory ?? activeSub;
    const nextLocation = overrides.location ?? (debouncedLocInput || selectedState);
    const nextState = overrides.state ?? locState;
    const nextCity = overrides.city ?? locCity;
    const nextMinPrice = overrides.minPrice ?? minPrice;
    const nextMaxPrice = overrides.maxPrice ?? maxPrice;
    const nextCondition = overrides.condition ?? conditionFilter;
    const nextDynamicFilters = overrides.dynamicFilters ?? dynamicFilters;
    const nextGeo = Object.prototype.hasOwnProperty.call(overrides, 'geo') ? overrides.geo : searchLocation;
    const nextRadius = overrides.radius ?? radius;
    const params = new URLSearchParams();

    if (String(nextSearch || '').trim()) params.set('search', String(nextSearch).trim());
    if (String(nextCategory || '').trim()) params.set('category', String(nextCategory).trim());
    if (String(nextSubcategory || '').trim()) params.set('subcategory', String(nextSubcategory).trim());
    if (String(nextLocation || '').trim()) params.set('location', String(nextLocation).trim());
    if (String(nextState || '').trim()) params.set('state', String(nextState).trim());
    if (String(nextCity || '').trim()) params.set('city', String(nextCity).trim());
    if (String(nextMinPrice || '').trim()) params.set('min_price', String(nextMinPrice).trim());
    if (String(nextMaxPrice || '').trim()) params.set('max_price', String(nextMaxPrice).trim());
    if (nextGeo?.lat != null && nextGeo?.lng != null) {
      params.set('lat', String(nextGeo.lat));
      params.set('lng', String(nextGeo.lng));
      params.set('radius', String(nextRadius));
    }
    if (Array.isArray(nextCondition) && nextCondition.length > 0) params.set('condition', nextCondition.join(','));
    appendDynamicFilters(params, nextDynamicFilters);

    const query = params.toString();
    const basePath = overrides.pathname ?? (location.pathname === '/listings' ? '/listings' : '/');
    return query ? `${basePath}?${query}` : basePath;
  }, [activeCat, activeSub, conditionFilter, debouncedLocInput, debouncedSearch, dynamicFilters, locCity, locState, location.pathname, maxPrice, minPrice, radius, searchLocation, selectedState]);

  // Keep search/filter state shareable and prevent mobile location from being cleared on navigation.
  const executeSearch = useCallback((
    overrideSearch = null,
    overrideLoc = null,
    overrideCategory = undefined,
    overrideFilters = {},
  ) => {
    const filters = overrideFilters && typeof overrideFilters === 'object' ? overrideFilters : {};
    const nextSearch = typeof overrideSearch === 'string' ? overrideSearch : searchQuery;
    const nextLoc = typeof overrideLoc === 'string' ? overrideLoc : searchLocationInput;
    const nextCategory = typeof overrideCategory === 'string' ? overrideCategory : activeCat;
    const nextMinPrice = filters.minPrice ?? minPrice;
    const nextMaxPrice = filters.maxPrice ?? maxPrice;
    const nextCondition = filters.condition ?? conditionFilter;
    const nextDynamicFilters = filters.dynamicFilters ?? dynamicFilters;
    skipFilterUrlSyncRef.current = true;
    skipCategoryFilterResetRef.current = true;
    setDebouncedSearch(nextSearch);
    setDebouncedLocInput(nextLoc);
    if (typeof overrideCategory === 'string') setActiveCat(overrideCategory);
    if (Object.prototype.hasOwnProperty.call(filters, 'dynamicFilters')) setDynamicFilters(nextDynamicFilters);
    if (currentTab === 'post') discardPostDraft();
    setViewedAd(null);
    setViewedCompany(null);
    navigate(buildHomeFilterPath({
      search: nextSearch,
      location: nextLoc,
      category: nextCategory,
      minPrice: nextMinPrice,
      maxPrice: nextMaxPrice,
      condition: nextCondition,
      dynamicFilters: nextDynamicFilters,
    }));
    if (nextSearch && nextSearch.trim()) {
      events.searchPerformed(nextSearch.trim(), nextCategory || '', {
        source: filters.source || 'header_search',
      });
    }
  }, [
    activeCat,
    buildHomeFilterPath,
    conditionFilter,
    dynamicFilters,
    maxPrice,
    minPrice,
    navigate,
    searchLocationInput,
    searchQuery,
    currentTab,
    discardPostDraft,
  ]);

  const applyHeaderLocation = useCallback((mobile = false) => {
    const locationLabel = locCity ? `${locCity}, ${locState}` : locState;
    setSearchLocation(null);
    setSearchLocationInput(locationLabel);
    setSelectedState(locState);
    setDebouncedLocInput(locationLabel);
    if (mobile) setShowMobileLocationPicker(false);
    else setShowLocationPicker(false);
    executeSearch(null, locationLabel);
  }, [executeSearch, locCity, locState]);

  const fetchSuggestions = useCallback((q) => {
    clearTimeout(suggestionDebounceRef.current);
    suggestionSequenceRef.current += 1;
    const requestSequence = suggestionSequenceRef.current;
    suggestionAbortRef.current?.abort();
    suggestionAbortRef.current = null;

    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }

    suggestionDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      suggestionAbortRef.current = controller;
      try {
        const response = await fetch('/api/search/suggestions?q=' + encodeURIComponent(q), { signal: controller.signal });
        if (!response.ok) throw new Error(`Suggestions request failed: ${response.status}`);
        const data = await response.json();
        if (requestSequence !== suggestionSequenceRef.current) return;
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (error) {
        if (error?.name === 'AbortError' || requestSequence !== suggestionSequenceRef.current) return;
        setSuggestions([]);
      } finally {
        if (suggestionAbortRef.current === controller) suggestionAbortRef.current = null;
      }
    }, 250);
  }, []);

  useEffect(() => () => {
    clearTimeout(suggestionDebounceRef.current);
    suggestionAbortRef.current?.abort();
  }, []);

  const saveRecentSearch = useCallback((q) => {
    if (!q?.trim()) return;
    let recent;
    try {
      recent = JSON.parse(localStorage.getItem('mercasto_recent_searches') || '[]');
    } catch {
      recent = [];
    }
    if (!Array.isArray(recent)) recent = [];
    const updated = [q, ...recent.filter(r => r !== q)].slice(0, 8);
    localStorage.setItem('mercasto_recent_searches', JSON.stringify(updated));
    setRecentSearches(updated.slice(0, 5));
  }, []);

  const submitHeaderSearch = useCallback((event) => {
    event?.preventDefault();
    setShowSuggestions(false);
    if (searchQuery.trim()) saveRecentSearch(searchQuery);
    executeSearch();
  }, [executeSearch, saveRecentSearch, searchQuery]);

  const handleSuggestionSelect = useCallback((suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    saveRecentSearch(suggestion);
    executeSearch(suggestion);
  }, [executeSearch, saveRecentSearch, setSearchQuery]);

  const handleSearchInputKeyDown = useCallback((event) => {
    const items = suggestions.length > 0 ? suggestions : recentSearches;

    if (event.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex(index => Math.min(index + 1, items.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex(index => Math.max(index - 1, -1));
      return;
    }

    if (event.key === 'Enter' && highlightedIndex >= 0 && highlightedIndex < items.length) {
      event.preventDefault();
      handleSuggestionSelect(items[highlightedIndex]);
    }
  }, [handleSuggestionSelect, highlightedIndex, recentSearches, suggestions]);

  useEffect(() => {
    const handler = (e) => {
      if ((!desktopSearchRef.current || !desktopSearchRef.current.contains(e.target)) &&
          (!mobileSearchRef.current || !mobileSearchRef.current.contains(e.target))) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset category-specific filters on an intentional category change, but preserve
  // them while restoring a shareable URL/back-forward state.
  useEffect(() => {
    if (skipCategoryFilterResetRef.current) {
      skipCategoryFilterResetRef.current = false;
      return;
    }
    setDynamicFilters(current => Object.keys(current).length ? {} : current);
  }, [activeCat]);

  // FIX: Performance. Оптимизация рендеринга карточек, чтобы избежать создания сотен лишних функций при скролле
  const handleAdImageLoad = useCallback((e) => {
    e.target.classList.remove('opacity-0');
    if (e.target.parentElement) {
      e.target.parentElement.classList.remove('bg-slate-200', 'dark:bg-slate-800');
    }
  }, []);
  const handleAdImageError = useCallback((e) => {
    if (e.currentTarget.src.endsWith('/placeholder-ad.svg')) return;
    e.currentTarget.src = '/placeholder-ad.svg';
    handleAdImageLoad(e);
  }, [handleAdImageLoad]);

  // Защита от "Ловушки интерфейса" (Modal State Trap):
  // Сбрасываем все внутренние состояния авторизации, когда пользователь закрывает окно,
  // чтобы при следующем открытии он снова видел форму логина, а не застрял на вводе SMS.
  useEffect(() => {
    if (!showAuthModal) {
      const timer = setTimeout(() => {
        setAuthMode('login');
        setRequiresTwoFactor(false);
        setAuthPhone('');
        setTwoFactorEmail('');
        setTwoFactorChallengeToken('');
        setRegistrationConsentAccepted(false);
        setPendingPhoneRegistrationConsent(null);
      }, 300); // Ждем окончания анимации закрытия
      return () => clearTimeout(timer);
    }
  }, [showAuthModal]);

  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();
  const lastAdElementRef = useCallback(node => {
    if (loadingAds || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        // Загружаем следующую страницу, когда триггер-элемент становится видимым
        loadAds(currentPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingAds, loadingMore, hasMore, currentPage]);

  const impressionQueueRef = useRef(new Set());
  const impressionSeenRef = useRef(new Set());
  const impressionFlushTimerRef = useRef(null);
  const impressionObserverRef = useRef(null);

  const flushAdImpressions = useCallback(() => {
    const ids = Array.from(impressionQueueRef.current);
    if (!ids.length) return;

    impressionQueueRef.current.clear();
    if (impressionFlushTimerRef.current) {
      clearTimeout(impressionFlushTimerRef.current);
      impressionFlushTimerRef.current = null;
    }

    fetch(`${API_URL}/ads/impressions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ ad_ids: ids, placement: 'feed' }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  const queueAdImpression = useCallback((adId) => {
    if (!adId || impressionSeenRef.current.has(adId)) return;
    impressionSeenRef.current.add(adId);
    impressionQueueRef.current.add(adId);

    if (impressionQueueRef.current.size >= 20) {
      flushAdImpressions();
      return;
    }

    if (!impressionFlushTimerRef.current) {
      impressionFlushTimerRef.current = setTimeout(flushAdImpressions, 1200);
    }
  }, [flushAdImpressions]);

  const observeAdImpression = useCallback((node, adId) => {
    if (!node || !adId || impressionSeenRef.current.has(adId)) return;

    if (!impressionObserverRef.current) {
      impressionObserverRef.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            const visibleAdId = Number(entry.target.dataset.adId);
            queueAdImpression(visibleAdId);
            impressionObserverRef.current?.unobserve(entry.target);
          }
        });
      }, { threshold: [0.45] });
    }

    node.dataset.adId = String(adId);
    impressionObserverRef.current.observe(node);
  }, [queueAdImpression]);

  useEffect(() => () => {
    if (impressionFlushTimerRef.current) clearTimeout(impressionFlushTimerRef.current);
    flushAdImpressions();
    impressionObserverRef.current?.disconnect();
  }, [flushAdImpressions]);

  const [qrModalData, setQrModalData] = useState(null);
  const fileInputRef = useRef(null);
  const [adStatusFilter, setAdStatusFilter] = useState('active');
  const [companyForm, setCompanyForm] = useState({
    name: user?.name || '',
    description: '',
    website: '',
    phone: user?.phone_number || '',
    address: '',
    coverPreview: ''
  });

  // Синхронизация формы компании с данными пользователя
  useEffect(() => {
    if (user) {
      setCompanyForm(prev => ({
        ...prev,
        name: user.name || prev.name,
        phone: user.phone_number || prev.phone
      }));
    }
  }, [user]);

  // Keep restored local sessions honest without logging users out on transient network errors.
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
      setUserRole('individual');
      setAuthReady(true);
      return;
    }

    let cancelled = false;
    fetch(`${API_URL}/user`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setUserRole(userData.role || 'individual');
          localStorage.setItem('user', JSON.stringify(userData));
          setAuthReady(true);
          return;
        }

        if (res.status === 401) {
          localStorage.removeItem('user');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('token');
          setUser(null);
          setUserRole('individual');
          setFavoriteIds([]);
          setUserAds([]);
          setFavoriteAds([]);
        }
        setAuthReady(true);
      })
      .catch(() => {
        if (!cancelled) setAuthReady(true);
      });

    return () => { cancelled = true; };
  }, []);

  // --- ИСПРАВЛЕНИЕ "ВЫЛЕТОВ" С САЙТА ---
  // Обрабатываем кнопку "Назад" в браузере, чтобы не было пустых экранов
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      if (!hash) {
        setViewedAd(null);
        setViewedCompany(null);
        setShowAuthModal(false);
        setShowPricingModal(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleExportCompanyData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user`, { headers: { 'Authorization': `Bearer ${token}` } });

      if (res.ok) {
        const userData = await res.json();
        const exportData = {
          company_info: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            phone: userData.phone_number || companyForm.phone,
            role: userData.role,
            verified: userData.is_verified,
            registered_at: userData.created_at
          },
          profile_settings: companyForm,
          ads: userAds.map(ad => ({
            id: ad.id, title: ad.title, category: ad.category, price: ad.price,
            status: ad.status, views: ad.views || 0, whatsapp_clicks: ad.whatsapp_clicks || 0
          }))
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `mercasto_company_${userData.id}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      } else showToast(t.connection_error, 'error');
    } catch (err) { console.error("Export error", err); showToast(t.connection_error, 'error'); }
  };

  const hydrateCatalogStateFromUrl = useCallback((pathname, rawSearch, rawHash = '') => {
    if (!['/', '/listings'].includes(pathname)) return false;
    const params = new URLSearchParams(rawSearch);
    const hash = rawHash || '';
    if (params.has('ad') || params.has('store') || hash.startsWith('#ad-') || hash.startsWith('#company-')) return false;

    skipFilterUrlSyncRef.current = true;
    skipCategoryFilterResetRef.current = true;
    const searchParam = params.get('search') || params.get('q');
    const categoryParam = params.get('category') || params.get('cat');
    const stateParam = params.get('state') || '';
    const cityParam = params.get('city') || '';
    const locationParam = params.get('location') || cityParam || stateParam;
    const minPriceParam = params.get('min_price');
    const maxPriceParam = params.get('max_price');
    const conditionParam = params.get('condition');
    const hasLatParam = params.has('lat');
    const hasLngParam = params.has('lng');
    const latParam = hasLatParam ? Number(params.get('lat')) : Number.NaN;
    const lngParam = hasLngParam ? Number(params.get('lng')) : Number.NaN;
    const radiusRaw = params.get('radius') || params.get('radius_km');
    const radiusParam = radiusRaw ? Number(radiusRaw) : Number.NaN;
    const hasGeoArea = hasLatParam && hasLngParam
      && Number.isFinite(latParam) && Number.isFinite(lngParam)
      && latParam !== 0 && lngParam !== 0
      && Math.abs(latParam) <= 90 && Math.abs(lngParam) <= 180;

    setViewedAd(null);
    setViewedCompany(null);
    setSearchQuery(searchParam || '');
    setDebouncedSearch(searchParam || '');
    setActiveCat(categoryParam || '');
    setActiveSub(params.get('subcategory') || '');
    if (hasGeoArea) {
      setSearchLocation({ lat: latParam, lng: lngParam });
      setRadius(Number.isFinite(radiusParam) && radiusParam > 0 ? radiusParam : 50);
      setSearchLocationInput(locationParam || '');
      setSelectedState(stateParam || '');
      setLocState(stateParam);
      setLocCity(cityParam);
      setDebouncedLocInput(locationParam || '');
    } else if (locationParam) {
      setSearchLocation(null);
      setSearchLocationInput(locationParam);
      setSelectedState(stateParam || '');
      setLocState(stateParam);
      setLocCity(cityParam);
      setDebouncedLocInput(locationParam);
    } else {
      setSearchLocation(null);
      setSearchLocationInput('');
      setSelectedState('');
      setLocState('');
      setLocCity('');
      setDebouncedLocInput('');
    }
    setMinPrice(minPriceParam || '');
    setMaxPrice(maxPriceParam || '');
    if (conditionParam) {
      const nextConditions = conditionParam.split(',').filter(Boolean);
      setConditionFilter(current => (
        current.length === nextConditions.length
        && current.every((value, index) => value === nextConditions[index])
      ) ? current : nextConditions);
    } else {
      setConditionFilter(current => current.length ? [] : current);
    }
    const nextDynamicFilters = parseDynamicFilters(params);
    setDynamicFilters(current => JSON.stringify(current) === JSON.stringify(nextDynamicFilters) ? current : nextDynamicFilters);
    return true;
  }, []);

  useEffect(() => {
    const handleCatalogPopState = () => {
      lastInternalFilterPathRef.current = '';
      hydrateCatalogStateFromUrl(window.location.pathname, window.location.search, window.location.hash);
    };
    window.addEventListener('popstate', handleCatalogPopState);
    return () => window.removeEventListener('popstate', handleCatalogPopState);
  }, [hydrateCatalogStateFromUrl]);

  useEffect(() => {
    if (!['/', '/listings'].includes(location.pathname)) return;
    const currentPath = `${location.pathname}${location.search}`;
    if (lastInternalFilterPathRef.current === currentPath) {
      lastInternalFilterPathRef.current = '';
      return;
    }
    hydrateCatalogStateFromUrl(location.pathname, location.search, location.hash || window.location.hash);
  }, [location.hash, location.pathname, location.search, hydrateCatalogStateFromUrl]);

  useEffect(() => {
    if (!['/', '/listings'].includes(location.pathname)) return;
    if (viewedAd || viewedCompany) return;
    const params = new URLSearchParams(location.search);
    const hash = location.hash || window.location.hash;
    if (params.has('ad') || params.has('store') || hash.startsWith('#ad-') || hash.startsWith('#company-')) return;

    if (skipFilterUrlSyncRef.current) {
      skipFilterUrlSyncRef.current = false;
      return;
    }

    const nextPath = buildHomeFilterPath();
    const currentPath = `${location.pathname}${location.search}`;
    if (nextPath !== currentPath) {
      lastInternalFilterPathRef.current = nextPath;
      navigate(nextPath, { replace: true });
    }
  }, [activeCat, activeSub, buildHomeFilterPath, debouncedLocInput, debouncedSearch, dynamicFilters, location.pathname, location.search, maxPrice, minPrice, conditionFilter, radius, searchLocation, selectedState, navigate, viewedAd, viewedCompany]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const adIdParam = params.get('ad');
    const storeIdParam = params.get('store');
    const hash = location.hash || window.location.hash;
    const pathAdMatch = location.pathname.match(/^\/(?:ads|anuncio)\/(\d+)$/);
    const targetAdId = adIdParam || (hash.startsWith('#ad-') ? hash.replace('#ad-', '') : null) || (pathAdMatch ? pathAdMatch[1] : null);
    const targetStoreId = storeIdParam || (hash.startsWith('#company-') ? hash.replace('#company-', '') : null);
    if (!targetAdId && !targetStoreId) return;

    let cancelled = false;

    if (targetAdId) {
      if (pathAdMatch) {
        setDeepLinkAdMissing(false);
        setDeepLinkAdLoadError(false);
      }
      const token = localStorage.getItem('auth_token');
      fetch(`${API_URL}/ads/${targetAdId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
        .then(async res => {
          if (res.status === 404 || res.status === 410) {
            if (!cancelled && pathAdMatch) setDeepLinkAdMissing(true);
            return null;
          }
          if (!res.ok) throw new Error(`deep-link-ad-load-failed:${res.status}`);
          return res.json();
        })
        .then(adData => {
          if (cancelled || !adData) return;
          if (pathAdMatch) {
            setDeepLinkAdMissing(false);
            setDeepLinkAdLoadError(false);
          }
          setViewedCompany(null);
          setViewedAd(adData);
          if (adIdParam) navigate(`/#ad-${targetAdId}`, { replace: true });
        })
        .catch(err => {
          console.error('Error loading deep-link ad', err);
          if (!cancelled && pathAdMatch) setDeepLinkAdLoadError(true);
        });
    } else if (targetStoreId) {
      fetch(`${API_URL}/users/${targetStoreId}/profile`)
        .then(res => res.ok ? res.json() : null)
        .then(sellerData => {
          if (cancelled || !sellerData) return;
          setViewedAd(null);
          setViewedCompany(sellerData);
          window.scrollTo(0, 0);
          if (!cancelled) loadCompanySecondaryData(sellerData.id, { clear: true });
          if (storeIdParam) navigate(`/#company-${targetStoreId}`, { replace: true });
        })
        .catch(() => console.error("Error loading deep link store"));
    }

    return () => { cancelled = true; };
  }, [location.hash, location.search, location.pathname, navigate, setCurrentTab, deepLinkAdRetryNonce, loadCompanySecondaryData]);

  // --- ПЕРЕХВАТ OAuth ТОКЕНА ИЗ URL ---
  useEffect(() => {
    // Отработка токенов, платежей и OAuth-переходов выполняется один раз после загрузки.
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const rToken = params.get('reset_token');
    const rEmail = params.get('email');
    const eToken = params.get('email_token');
    const paymentStatus = params.get('payment');
    const oauthChallenge = params.get('oauth_challenge') || params.get('oauth_2fa');
    const oauthCode = params.get('oauth_code');
    const oauthNewUser = params.get('new_user') === '1';
    const oauthRegistrationEventId = params.get('registration_event_id');
    const oauthRegistrationMethod = params.get('registration_method') || 'oauth';

    // Обработка возврата с платежного шлюза
    if (paymentStatus === 'success') {
      // UX Fix: обновляем профиль (роль и баланс). Вебхук Clip прилетает асинхронно,
      // поэтому опрашиваем /user несколько раз, пока роль не станет business / не появится план.
      const token = localStorage.getItem('auth_token');
      if (token) {
        const refreshUserAfterPayment = async () => {
          for (let attempt = 0; attempt < 6; attempt++) {
            try {
              const res = await fetch(`${API_URL}/user`, { headers: { 'Authorization': `Bearer ${token}` } });
              const userData = await res.json();
              setUser(userData);
              setUserRole(userData.role || 'individual');
              localStorage.setItem('user', JSON.stringify(userData));
              // Останавливаемся, как только сервер подтвердил PRO/бизнес-статус
              if (userData.role === 'business' || userData.plan_code) break;
            } catch { /* пробуем снова */ }
            await new Promise(r => setTimeout(r, 2500));
          }
        };
        refreshUserAfterPayment();
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'error') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        showToast(t.payment_failed_or_canceled || 'El pago no se pudo completar o fue cancelado.', 'error');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (eToken) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        fetch(`${API_URL}/user/email/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ token: eToken })
        })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
            showToast(localizeServerMessage(lang, data.message, t.email_verified));
          } else showToast(localizeServerMessage(lang, data.message, t.account_action_email_confirm_error), 'error');
        })
        .catch(err => console.error(err))
        .finally(() => window.history.replaceState({}, document.title, window.location.pathname));
      } else {
        showToast(t.account_action_login_to_confirm_email, 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
        setShowAuthModal(true);
      }
    } else if (rToken && rEmail) {
      setResetToken(rToken);
      setResetEmail(rEmail);
      setAuthMode('reset_password');
      setShowAuthModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthChallenge) {
      setTwoFactorChallengeToken(oauthChallenge);
      // OAuth 2FA uses the same opaque server-side challenge as password login.
      // The account identity is resolved only from the short-lived challenge cache.
      setTwoFactorEmail('');
      setRequiresTwoFactor(true);
      setAuthMode('login');
      setShowAuthModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthCode) {
      window.history.replaceState({}, document.title, window.location.pathname); // Очищаем URL

      fetch(`${API_URL}/auth/oauth/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: oauthCode })
      })
        .then(async (res) => ({ ok: res.ok, data: await res.json() }))
        .then(({ ok, data }) => {
          if (!ok || !data.access_token || !data.user) {
            throw new Error(data.message || 'OAuth exchange failed');
          }
          localStorage.setItem('auth_token', data.access_token);
          setUser(data.user);
          setUserRole(data.user.role || 'individual');
          localStorage.setItem('user', JSON.stringify(data.user));
          if (oauthNewUser && oauthRegistrationEventId) {
            localStorage.setItem('just_registered', '1');
            events.registered({
              event_id: oauthRegistrationEventId,
              meta_event_id: oauthRegistrationEventId,
              method: oauthRegistrationMethod,
            });
          }
          if (!data.user.referred_by) applyPendingReferral(data.access_token);
        })
        .catch(err => {
          console.error(err);
          showToast(t.account_action_google_auth_error, 'error');
        });
    } else if (params.get('token')) {
      const token = params.get('token');
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.setItem('auth_token', token);

      fetch(`${API_URL}/user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load user'))
      .then(userData => {
        setUser(userData);
        setUserRole(userData.role || 'individual');
        localStorage.setItem('user', JSON.stringify(userData));
        if (!userData.referred_by) applyPendingReferral(token);
        setShowAuthModal(false);
      })
      .catch(err => {
        console.error(err);
        showToast(t.account_action_profile_load_error, 'error');
      });
    } else if (error) {
      if (error === 'registration_consent_required') {
        setAuthMode('register');
        setShowAuthModal(true);
        showToast(
          t.registration_legal_required ||
            'Confirma tu edad y aceptación para crear la cuenta.',
          'error',
        );
      } else {
        showToast(t.account_action_social_auth_error, 'error');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => { setPriceTab(accountType); }, [accountType, showPricingModal]);
  // Для платных/PRO (business) кабинетов принудительно показываем PRO-вид — кнопки "Particular" там нет
  useEffect(() => { if (userRole === 'business') setAccountType('pro'); }, [userRole]);

  const promotableAds = useMemo(
    () => (Array.isArray(userAds) ? userAds : []).filter(ad => ad.status === 'active'),
    [userAds]
  );

  useEffect(() => {
    if (!showPricingModal || promotionTargetAdId || promotableAds.length === 0) return;
    setPromotionTargetAdId(String(promotableAds[0].id));
  }, [showPricingModal, promotionTargetAdId, promotableAds]);

  useEffect(() => { setDashboardPage(1); }, [dashboardTab, adStatusFilter]);

  // --- СОХРАНЕНИЕ НАСТРОЕК СЛАЙДЕРА ---
  useEffect(() => {
    localStorage.setItem('sliderAutoplay', sliderAutoplay);
  }, [sliderAutoplay]);

  // --- ДИНАМИЧЕСКОЕ SEO & GOOGLE TAG MANAGER ---
  useEffect(() => {
    const verticalSeo = getVerticalSeo(location.pathname, lang);
    const publicSeo = getPublicSeo(location.pathname, lang);
    const verticalCanonicalAlias = getVerticalCanonicalAlias(location.pathname);
    let title = `Mercasto | ${t.ai_brand_tagline}`;
    let desc = t.ai_brand_description || 'Mercasto combina publicación asistida, descripciones, recomendaciones y moderación con IA para comprar y vender más rápido en México.';
    let ogImage = "https://mercasto.com/icon-512x512.png";
    let ogType = "website";

    const isViewedCatalogFiller = Boolean(viewedAd?.is_catalog_filler);
    const viewedExpiry = viewedAd?.expires_at ? new Date(viewedAd.expires_at) : null;
    const isViewedListingIndexable = Boolean(
      viewedAd
      && !isViewedCatalogFiller
      && viewedAd.status === 'active'
      && viewedExpiry
      && Number.isFinite(viewedExpiry.getTime())
      && viewedExpiry.getTime() > Date.now()
    );

    if (viewedAd) {
      title = `${localizedText(viewedAd.title, lang)} | Mercasto`;
      desc = viewedAd.description
        ? localizedText(viewedAd.description, lang).substring(0, 160)
        : (t.ai_brand_description || desc);
      ogImage = getImageUrl(viewedAd.image_url);
      ogType = isViewedListingIndexable ? "product" : "website";
    } else if (viewedCompany) {
      title = `${viewedCompany.name} | Mercasto`;
      desc = viewedCompany.bio
        ? viewedCompany.bio.substring(0, 160)
        : (t.ai_brand_description || desc);
      ogImage = getImageUrl(viewedCompany.avatar_url, "https://mercasto.com/icon-512x512.png");
      ogType = "profile";
    } else if (window.location.pathname === '/listings') {
      title = `Mercasto | ${t.ai_brand_short}`;
      desc = t.ai_brand_description || desc;
    } else if (verticalSeo) {
      title = verticalSeo.title;
      desc = verticalSeo.description;
    } else if (publicSeo) {
      title = publicSeo.title;
      desc = publicSeo.description;
    } else if (activeCat) {
      const catName = getCatName(categoriesData.find(c => c.slug === activeCat), lang) || activeCat;
      title = `${catName} | Mercasto`;
    }

    const sellerProfileOwnsSeo = /^\/vendedor\/\d+\/?$/.test(location.pathname);
    const geoSourceOwnsSeo = /^\/(?:como-funciona|seguridad|tarifas|sobre-mercasto|ayuda\/(?:publicar-anuncio|comprar-y-contactar))\/?$/.test(location.pathname);
    const routeSeoOwner = document.documentElement.dataset.mercastoSeoOwner;
    const routeOwnsSeo = sellerProfileOwnsSeo || geoSourceOwnsSeo || routeSeoOwner === 'not-found';
    if (!routeOwnsSeo) {
      document.title = title;
      document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);
      document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
      document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', desc);
    }
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', ogImage);
    document.querySelector('meta[name="twitter:image"]')?.setAttribute('content', ogImage);
    const canonicalHref = viewedAd
      ? `https://mercasto.com/ads/${viewedAd.id}`
      : viewedCompany
        ? `https://mercasto.com/vendedor/${viewedCompany.id}`
        : verticalCanonicalAlias
          ? `${window.location.origin}${verticalCanonicalAlias}`
          : `${window.location.origin}${window.location.pathname}`;
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalHref);
    document.querySelector('meta[property="og:type"]')?.setAttribute('content', ogType);

    const privatePathPatterns = [
      /^\/post\/?$/,
      /^\/profile\/?$/,
      /^\/admin(?:\/|$)/,
      /^\/dashboard(?:\/|$)/,
      /^\/notificaciones\/?$/,
      /^\/mensajes\/?$/,
      /^\/perfil\/editar\/?$/,
      /^\/anuncio\/\d+\/editar\/?$/,
    ];
    const searchParams = new URLSearchParams(location.search);
    const contentFilterKeys = [
      'q', 'search', 'category', 'cat', 'state', 'city', 'location',
      'min_price', 'max_price', 'condition', 'sort', 'page',
    ];
    const isFilteredResultsPage = ['/', '/listings'].includes(location.pathname)
      && contentFilterKeys.some(key => searchParams.has(key));
    const isPrivateRoute = privatePathPatterns.some(pattern => pattern.test(location.pathname));
    const robotsContent = isPrivateRoute
      ? 'noindex,nofollow,noarchive'
      : isFilteredResultsPage || Boolean(verticalCanonicalAlias) || (viewedAd && !isViewedListingIndexable)
        ? 'noindex,follow,max-image-preview:large'
        : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
    let robotsEl = document.querySelector('meta[name="robots"]');
    if (!robotsEl) {
      robotsEl = document.createElement('meta');
      robotsEl.setAttribute('name', 'robots');
      document.head.appendChild(robotsEl);
    }
    if (routeSeoOwner !== 'not-found') {
      robotsEl.setAttribute('content', robotsContent);
    }

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalHref);

    // Внедрение Schema.org JSON-LD структурированных данных
    const existingScript = document.getElementById('schema-ld-json');
    if (existingScript) {
      existingScript.remove();
    }

    let schemaData = null;

    if (viewedAd && isViewedListingIndexable) {
      schemaData = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": localizedText(viewedAd.title, lang),
        "description": localizedText(viewedAd.description, lang) || '',
        "image": getImageUrl(viewedAd.image_url),
        "offers": {
          "@type": "Offer",
          "url": `https://mercasto.com/ads/${viewedAd.id}`,
          "price": viewedAd.price,
          "priceCurrency": "MXN",
          "itemCondition": viewedAd.condition === 'new' ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
          "availability": "https://schema.org/InStock"
        }
      };
    } else if (viewedCompany) {
      const isBusiness = viewedCompany.role === 'business';
      schemaData = {
        "@context": "https://schema.org",
        "@type": isBusiness ? "Store" : "Person",
        "name": viewedCompany.name,
        "description": viewedCompany.bio || t.ai_brand_description || '',
        "image": getImageUrl(viewedCompany.avatar_url),
        "address": {
          "@type": "PostalAddress",
          ...(viewedCompany.city ? { "addressLocality": viewedCompany.city } : {}),
          "addressCountry": "MX"
        },
        "url": canonicalHref
      };
      if (viewedCompany.website) {
        schemaData.sameAs = viewedCompany.website;
      }
    } else if (verticalSeo) {
      schemaData = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            "@id": `${canonicalHref}#collection`,
            "url": canonicalHref,
            "name": verticalSeo.title,
            "description": verticalSeo.description,
            "inLanguage": lang === 'es' ? 'es-MX' : lang,
            "isPartOf": {
              "@type": "WebSite",
              "@id": "https://mercasto.com/#website",
              "name": "Mercasto",
              "url": "https://mercasto.com/"
            },
            "about": {
              "@type": "Thing",
              "name": verticalSeo.name
            }
          },
          {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": t.home || 'Inicio',
                "item": "https://mercasto.com/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": verticalSeo.name,
                "item": canonicalHref
              }
            ]
          }
        ]
      };
    }

    if (schemaData) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'schema-ld-json';
      script.text = JSON.stringify(schemaData);
      document.head.appendChild(script);
    }

    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'virtual_page_view',
        page_title: title,
        page_path: `/${currentTab}${activeCat ? `?cat=${activeCat}` : ''}${viewedAd ? `?ad=${viewedAd.id}` : ''}`
      });
    }

    return () => {
      const cleanupScript = document.getElementById('schema-ld-json');
      if (cleanupScript) {
        cleanupScript.remove();
      }
    };
  }, [currentTab, activeCat, viewedAd, viewedCompany, categoriesData, lang, location.pathname, location.search, t]);

  // --- WEBSOCKETS LISTENER ---
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    let channel = null;
    // Lazy-load Echo + Pusher only for authenticated users — keeps 73 KB off the critical path
    getEcho().then((echo) => {
      if (cancelled || !echo) return;
      const token = localStorage.getItem('auth_token');
      if (token && echo.connector?.pusher?.config?.auth?.headers) {
          echo.connector.pusher.config.auth.headers.Authorization = `Bearer ${token}`;
      }
      channel = echo.private(`App.Models.User.${user.id}`);
      channel.listen('.NewNotification', (e) => {
          const incoming = e.notification;
          if (!incoming?.id) return;
          setNotifications(prev => [incoming, ...prev.filter(item => item.id !== incoming.id)]);
          if (!incoming.is_read && !incoming.replaces_unread) {
            setUnreadCount(prev => prev + 1);
          }
      });
    });
    return () => {
      cancelled = true;
      if (channel) {
        channel.stopListening('.NewNotification');
      }
      // leave the private channel; echo may not be resolved yet — safe to ignore
      if (_echoInstance) {
        _echoInstance.leave(`private-App.Models.User.${user.id}`);
      }
    };
// Защита от DDoS WebSockets (Connection Thrashing): привязываем зависимость ТОЛЬКО к ID,
// иначе при любом обновлении профиля/баланса React будет рвать и заново создавать сокет-соединение
}, [user?.id]);

  // --- WEB PUSH API SUBSCRIPTION LOGIC ---
  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const vapidKey = await fetchVapidPublicKey(API_URL);
      const subscription = await ensurePushSubscription(registration, vapidKey);
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/user/push-subscribe`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
    } catch (error) { console.error('Push subscribe error:', error); }
  };

  const unsubscribeFromPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        const token = localStorage.getItem('auth_token');
        await fetch(`${API_URL}/user/push-unsubscribe`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
      }
    } catch (error) { console.error('Push unsubscribe error:', error); }
  };

  useEffect(() => {
    if (user && user.notification_preferences) {
      try {
        const prefs = typeof user.notification_preferences === 'string' ? JSON.parse(user.notification_preferences) : user.notification_preferences;
        setNotificationsForm({
          email_alerts: prefs.email_alerts ?? true,
          email_new_message: prefs.email_new_message ?? true,
          push_notifications: prefs.push_notifications ?? true,
          marketing: prefs.marketing ?? false,
        });
      } catch (e) {}
    }

    // Автоматически обновляем подписку, если пользователь уже разрешил уведомления
    const preferences = user?.notification_preferences;
    let normalizedPreferences = preferences || {};
    if (typeof preferences === 'string') {
      try {
        normalizedPreferences = JSON.parse(preferences || '{}');
      } catch {
        normalizedPreferences = {};
      }
    }
    if (
      user
      && normalizedPreferences.push_notifications !== false
      && Notification.permission === 'granted'
    ) {
      subscribeToPush();
    }

  }, [user]);

  useEffect(() => {
    if (!user?.id || !lang) return undefined;
    const preferences = typeof user.notification_preferences === 'string'
      ? (() => { try { return JSON.parse(user.notification_preferences || '{}'); } catch { return {}; } })()
      : (user.notification_preferences || {});
    if (preferences.locale === lang) return undefined;

    let cancelled = false;
    const syncNotificationLocale = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        const res = await fetch(`${API_URL}/user/notifications`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale: lang }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const updatedPreferences = data?.user?.notification_preferences;
        if (!updatedPreferences) return;
        setUser(prev => {
          if (!prev || cancelled) return prev;
          const next = { ...prev, notification_preferences: updatedPreferences };
          localStorage.setItem('user', JSON.stringify(next));
          return next;
        });
      } catch {
        // Locale persistence is best-effort and must never block the UI.
      }
    };
    syncNotificationLocale();
    return () => { cancelled = true; };
  }, [user?.id, user?.notification_preferences, lang]);

  const loadUserAds = useCallback(async () => {
    if (!user) {
      setUserAdsLoading(false);
      return;
    }
    setUserAdsLoading(true);
    setUserAdsLoadError(false);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/ads`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error(`user-ads-load-failed:${res.status}`);
      const data = await res.json();
      setUserAds(
        Array.isArray(data)
          ? data
          : (Array.isArray(data?.data) ? data.data : [])
      );
      setUserAdsLoadError(false);
    } catch (err) {
      setUserAdsLoadError(true);
      console.error("Error fetching user ads", err);
    } finally {
      setUserAdsLoading(false);
    }
  }, [user]);

  const loadFavoriteAds = useCallback(async () => {
    if (!user) {
      setFavoriteAdsLoading(false);
      return;
    }
    setFavoriteAdsLoading(true);
    setFavoriteAdsLoadError(false);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/favorite-ads`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error(`favorite-ads-load-failed:${res.status}`);
      const data = await res.json();
      setFavoriteAds(
        Array.isArray(data)
          ? data
          : (Array.isArray(data?.data) ? data.data : [])
      );
      setFavoriteAdsLoadError(false);
    } catch (err) {
      setFavoriteAdsLoadError(true);
      console.error("Error fetching favorite ads", err);
    } finally {
      setFavoriteAdsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadUserAds();
    loadFavoriteAds();
  }, [loadUserAds, loadFavoriteAds]);

  // --- ЗАГРУЗКА УВЕДОМЛЕНИЙ ---
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/notifications/list`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data)
          ? data
          : (Array.isArray(data?.data) ? data.data : []);
        setNotifications(items);
        setUnreadCount(items.filter(item => !item.is_read).length);
      }
    } catch (err) { console.error("Error fetching notifications", err); }
  }, [user]);

  useEffect(() => { loadNotifications(); }, [loadNotifications, location.pathname]);

  useEffect(() => {
    const syncNotifications = () => loadNotifications();
    window.addEventListener('mercasto:notifications-changed', syncNotifications);
    return () => window.removeEventListener('mercasto:notifications-changed', syncNotifications);
  }, [loadNotifications]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return undefined;
    }

    const fetchUnreadCount = () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      fetch(`${API_URL}/notifications/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && typeof data.count === 'number') setUnreadCount(data.count);
        })
        .catch(() => {});
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);

    return () => { clearInterval(interval); };
  }, [user]);

  const handleMarkNotificationRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/user/notifications/${id}/read`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    } catch (err) { console.error(err); }
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnreadCount(0);
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/user/notifications/read-all`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    } catch (err) { console.error(err); }
  };

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/user/notifications/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    } catch (err) { console.error(err); }
  };

  const loadUserAnalytics = useCallback(async () => {
    if (currentTab !== 'profile' || accountType !== 'pro' || !user) return;
    setAnalyticsLoading(true);
    setAnalyticsLoadError(false);
    try {
      const res = await fetch(`${API_URL}/user/analytics?days=${analyticsDays}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) throw new Error(`user-analytics-load-failed:${res.status}`);
      const data = await res.json();
      setAnalyticsData(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []));
      setAnalyticsLoadError(false);
    } catch (err) {
      setAnalyticsLoadError(true);
      console.error("Error fetching analytics", err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [currentTab, accountType, user, analyticsDays]);

  useEffect(() => {
    loadUserAnalytics();
  }, [loadUserAnalytics]);

  useEffect(() => {
    setIsMapUpdating(true);
    const timer = setTimeout(() => {
      setDebouncedLocation(form.location);
      setIsMapUpdating(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [form.location]);

  const loadAds = useCallback(async (page = 1) => {
    const requestSequence = ++adsRequestSequenceRef.current;
    adsAbortRef.current?.abort();
    const controller = new AbortController();
    adsAbortRef.current = controller;

    if (page > 1) {
      setLoadingMore(true);
    } else {
      setLoadingAds(true);
      setAdsLoadError(false);
    }
    const params = new URLSearchParams();
    params.append('page', page);
    // Если задано местоположение для поиска по радиусу, используем его
    if (searchLocation && searchLocation.lat) {
        params.append('lat', searchLocation.lat);
        params.append('lng', searchLocation.lng);
        params.append('radius', radius);
    } else if (debouncedLocInput) {
        // Если пользователь ввел город вручную, но не выбрал из выпадающего списка
        params.append('location', debouncedLocInput);
    }
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (activeCat) params.append('category', activeCat);
    if (activeSub) params.append('subcategory', activeSub);
    if (selectedState && !searchLocation && !debouncedLocInput) params.append('location', selectedState);

        // Прикрепляем значения глобальных фильтров и EAV-атрибутов для Laravel Controller
        if (minPrice) params.append('min_price', minPrice);
        if (maxPrice) params.append('max_price', maxPrice);
        if (conditionFilter.length > 0) params.append('condition', conditionFilter.join(','));
        appendDynamicFilters(params, dynamicFilters);

    try {
      const res = await fetch(`${API_URL}/ads?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) {
        if (page === 1 && requestSequence === adsRequestSequenceRef.current) setAdsLoadError(true);
        return;
      }
      const data = await res.json();
      if (requestSequence !== adsRequestSequenceRef.current) return;
      if (page === 1) setAdsLoadError(false);

      const items = Array.isArray(data) ? data : (data.data || []);
      const nextTotal = Number(data.total);
      setServerAds(prev => page === 1 ? items : [...prev, ...items]);
      if (page === 1 || Number.isFinite(nextTotal)) {
        setAdsTotal(Number.isFinite(nextTotal) ? nextTotal : items.length);
      }
      setCurrentPage(data.current_page || 1);
      setHasMore(data.last_page ? data.current_page < data.last_page : false);
    } catch (err) {
      if (err?.name !== 'AbortError' && requestSequence === adsRequestSequenceRef.current) {
        if (page === 1) setAdsLoadError(true);
        console.error("Error fetching ads", err);
      }
    } finally {
      if (requestSequence === adsRequestSequenceRef.current) {
        if (adsAbortRef.current === controller) adsAbortRef.current = null;
        setLoadingAds(false);
        setLoadingMore(false);
      }
    }
  }, [debouncedSearch, debouncedLocInput, activeCat, activeSub, selectedState, searchLocation, radius, minPrice, maxPrice, conditionFilter, dynamicFilters]); // Защита от бага Stale Closure в React

  useEffect(() => () => {
    adsRequestSequenceRef.current += 1;
    adsAbortRef.current?.abort();
  }, []);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const res = await fetch(`${API_URL}/favorites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFavoriteIds(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error("Error fetching favorites", err); }
  }, [user]);

  useEffect(() => {
    setServerAds([]); // Сбрасываем объявления при смене фильтров
    loadAds(1);
  }, [debouncedSearch, activeCat, activeSub, selectedState, searchLocation, debouncedLocInput, radius, minPrice, maxPrice, conditionFilter, dynamicFilters]);
  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  useEffect(() => {
    // These four curated feeds only power marketing sections on the unfiltered
    // homepage. Catalog/detail routes should not pay for their requests or state updates.
    if (location.pathname !== '/' || location.search) return undefined;

    const fetchCategoryAds = async () => {
      try {
        const [reRes, jobRes, srvRes, autoRes] = await Promise.all([
          fetch(`${API_URL}/ads?category=inmobiliaria&limit=3`),
          fetch(`${API_URL}/ads?category=empleo&limit=4`),
          fetch(`${API_URL}/ads?category=servicios&limit=3`),
          fetch(`${API_URL}/ads?category=motor&limit=3`)
        ]);
        if (reRes.ok) {
          const data = await reRes.json();
          setRealEstateAds(Array.isArray(data) ? data : (data.data || []));
        }
        if (jobRes.ok) {
          const data = await jobRes.json();
          setJobAds(Array.isArray(data) ? data : (data.data || []));
        }
        if (srvRes.ok) {
          const data = await srvRes.json();
          setServiceAds(Array.isArray(data) ? data : (data.data || []));
        }
        if (autoRes.ok) {
          const data = await autoRes.json();
          setAutomotiveAds(Array.isArray(data) ? data : (data.data || []));
        }
      } catch (err) {
        console.error("Error fetching category ads:", err);
      }
    };
    fetchCategoryAds();
    return undefined;
  }, [location.pathname, location.search]);

  // --- ПАНЕЛЬ АДМИНИСТРАТОРА: ПОЛЬЗОВАТЕЛИ ---
  const loadAdminUsers = useCallback(async () => {
    setLoadingAdminUsers(true);
    setAdminUsersLoadError(false);
    try {
      const token = localStorage.getItem('auth_token');
      // UX Fix: Передаем поисковый запрос на бэкенд, чтобы поиск работал по ВСЕЙ базе данных, а не только по первой странице
      const res = await fetch(`${API_URL}/users?search=${encodeURIComponent(adminUserSearch)}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error(`admin-users-load-failed:${res.status}`);
      const data = await res.json();
      // Фикс белого экрана: Laravel возвращает { data: [...] } при пагинации
      setAdminUsers(data.data || (Array.isArray(data) ? data : []));
      setAdminUsersLoadError(false);
    } catch (err) {
      setAdminUsersLoadError(true);
      console.error("Error fetching users", err);
    } finally {
      setLoadingAdminUsers(false);
    }
  }, [adminUserSearch]);

  const handleAdminVerifyUser = async (id) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/users/${id}/verify`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(prev => prev.map(u => u.id === id ? {
          ...u,
          is_verified: data.is_verified,
          account_verified: data.account_verified,
          account_verification_methods: data.account_verification_methods || u.account_verification_methods || [],
        } : u));
      }
    } catch (err) { console.error("Error verifying user", err); }
  };

  const handleAdminDeleteUser = async (id, adminCopy) => {
    if (!window.confirm(adminCopy.deleteUserConfirm)) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAdminUsers(prev => prev.filter(u => u.id !== id));
      else showToast(adminCopy.deleteUserError, 'error');
    } catch (err) { console.error("Error deleting user", err); showToast(t.connection_error, 'error'); }
  };

  const handleAdminChangeRole = async (id, newRole, adminCopy) => {
    const roleLabel = ({ individual: adminCopy.roleIndividual, business: adminCopy.roleBusiness, admin: adminCopy.roleAdmin })[newRole] || newRole;
    if (!window.confirm(adminCopy.changeRoleConfirm.replace('{role}', roleLabel))) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/users/${id}/role`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) setAdminUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
      else showToast(adminCopy.changeRoleError, 'error');
    } catch (err) { console.error("Error changing role", err); showToast(t.connection_error, 'error'); }
  };

  // --- ПАНЕЛЬ АДМИНИСТРАТОРА: МОДЕРАЦИЯ ---
  const loadPendingAds = useCallback(async () => {
    setLoadingPendingAds(true);
    setAdminPendingAdsLoadError(false);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/ads/pending`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error(`admin-pending-ads-load-failed:${res.status}`);
      const data = await res.json();
      setAdminPendingAds(Array.isArray(data) ? data : (data.data || []));
      setAdminPendingAdsLoadError(false);
    } catch (err) {
      setAdminPendingAdsLoadError(true);
      console.error("Error fetching pending ads", err);
    } finally {
      setLoadingPendingAds(false);
    }
  }, []);

  const loadSearchAlerts = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    setLoadingSearchAlerts(true);
    try {
      const res = await fetch(`${API_URL}/user/search-alerts`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSearchAlerts(
          Array.isArray(data)
            ? data
            : (Array.isArray(data?.data) ? data.data : [])
        );
      }
    } catch (err) {
      console.error('Error fetching search alerts', err);
    } finally {
      setLoadingSearchAlerts(false);
    }
  }, []);

  const handleSaveSearchAlert = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    const actionT = getTranslations(lang);
    setSavingSearchAlert(true);
    try {
      const searchAlertFilters = { ...(dynamicFilters || {}) };
      delete searchAlertFilters.condition;
      if (conditionFilter.length) searchAlertFilters.condition = [...conditionFilter];

      const res = await fetch(`${API_URL}/user/search-alerts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery || debouncedSearch || '',
          category: activeCat || '',
          min_price: minPrice || null,
          max_price: maxPrice || null,
          city: searchLocationInput || debouncedLocInput || '',
          state: selectedState || '',
          filters: searchAlertFilters,
        }),
      });
      if (!res.ok) throw new Error('save-search-alert-failed');
      const created = await res.json();
      setSearchAlerts(prev => [created, ...prev.filter(item => item.id !== created.id)]);
      window.dispatchEvent(new CustomEvent('mercasto:search-alert-saved', { detail: created }));
      showToast(actionT.listing_action_search_saved);
    } catch (err) {
      console.error('Error saving search alert', err);
      showToast(actionT.listing_action_search_save_error, 'error');
    } finally {
      setSavingSearchAlert(false);
    }
  }, [activeCat, conditionFilter, debouncedLocInput, debouncedSearch, dynamicFilters, lang, maxPrice, minPrice, searchLocationInput, searchQuery, selectedState]);

  const handleToggleSearchAlert = useCallback(async (alert) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const nextActive = !alert.is_active;
    setSearchAlerts(prev => prev.map(item => item.id === alert.id ? { ...item, is_active: nextActive } : item));
    try {
      const res = await fetch(`${API_URL}/user/search-alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive }),
      });
      if (!res.ok) throw new Error('toggle-search-alert-failed');
    } catch (err) {
      console.error('Error toggling search alert', err);
      setSearchAlerts(prev => prev.map(item => item.id === alert.id ? { ...item, is_active: alert.is_active } : item));
    }
  }, []);

  const handleDeleteSearchAlert = useCallback(async (alertId) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const previous = searchAlerts;
    setSearchAlerts(prev => prev.filter(item => item.id !== alertId));
    try {
      const res = await fetch(`${API_URL}/user/search-alerts/${alertId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('delete-search-alert-failed');
    } catch (err) {
      console.error('Error deleting search alert', err);
      setSearchAlerts(previous);
    }
  }, [searchAlerts]);

  useEffect(() => {
    if (user) loadSearchAlerts();
  }, [user, loadSearchAlerts]);

  const handleModerateAd = async (id, status, adminCopy) => {
    const decision = status === 'active' ? 'approved' : 'rejected';
    const reason = decision === 'rejected'
      ? window.prompt(adminCopy.rejectReasonPrompt)
      : '';
    if (decision === 'rejected' && !reason?.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/moderation/ads/${id}/decision`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: reason?.trim() || '' })
      });
      if (!res.ok) throw new Error('moderation-decision-failed');
      setAdminPendingAds(prev => prev.filter(ad => ad.id !== id));
      if (decision === 'approved') loadAds(1);
    } catch (err) { console.error("Error moderating ad", err); }
  };

  // --- ПАНЕЛЬ АДМИНИСТРАТОРА: ЖАЛОБЫ (REPORTS) ---
  const loadAdminReports = useCallback(async () => {
    setLoadingReports(true);
    setAdminReportsLoadError(false);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [res, res2] = await Promise.all([
        fetch(`${API_URL}/admin/reports`, { headers }),
        fetch(`${API_URL}/admin/user-reports`, { headers }),
      ]);
      if (!res.ok || !res2.ok) throw new Error(`admin-reports-load-failed:${res.status}:${res2.status}`);
      const [data, data2] = await Promise.all([res.json(), res2.json()]);
      setAdminReports(Array.isArray(data) ? data : (data.data || []));
      setAdminUserReports(Array.isArray(data2) ? data2 : (data2.data || []));
      setAdminReportsLoadError(false);
    } catch (err) {
      setAdminReportsLoadError(true);
      console.error("Error fetching reports", err);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const handleDeleteReport = async (id, adminCopy) => {
    if (!window.confirm(adminCopy.deleteReportConfirm)) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/reports/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAdminReports(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error(err); showToast(t.connection_error, 'error'); }
  };

  const handleDeleteUserReport = async (id, adminCopy) => {
    if (!window.confirm(adminCopy.deleteUserReportConfirm)) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/user-reports/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAdminUserReports(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error(err); }
  };

  // --- HISTORIAL DE PAGOS DE CLIP ---
  const loadUserPayments = useCallback(async (page = 1) => {
    setLoadingUserPayments(true);
    if (page === 1) setUserPaymentsLoadError(false);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/payments?page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`user-payments-load-failed:${res.status}`);
      const data = await res.json();
      setUserPayments(data.data || []);
      setUserPaymentsPage(page);
      setUserPaymentsLastPage(data.last_page || 1);
      setUserPaymentsTotal(data.total || 0);
      if (page === 1) setUserPaymentsLoadError(false);
    } catch (err) {
      if (page === 1) setUserPaymentsLoadError(true);
      console.error("Error fetching user payments", err);
    } finally {
      setLoadingUserPayments(false);
    }
  }, []);

  const loadAdminPayments = useCallback(async (page = 1) => {
    setLoadingAdminPayments(true);
    setAdminPaymentsLoadError(false);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/payments?page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`admin-payments-load-failed:${res.status}`);
      const data = await res.json();
      setAdminPayments(data.data || []);
      setAdminPaymentsPage(page);
      setAdminPaymentsLastPage(data.last_page || 1);
      setAdminPaymentsTotal(data.total || 0);
      setAdminPaymentsLoadError(false);
    } catch (err) {
      setAdminPaymentsLoadError(true);
      console.error("Error fetching admin payments", err);
    } finally {
      setLoadingAdminPayments(false);
    }
  }, []);

  const loadAdminAnalytics = useCallback(async () => {
    setLoadingAdminAnalytics(true);
    setAdminAnalyticsLoadError(false);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/analytics?period=30`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`admin-analytics-load-failed:${res.status}`);
      setAdminAnalytics(await res.json());
      setAdminAnalyticsLoadError(false);
    } catch (err) {
      setAdminAnalyticsLoadError(true);
      console.error("Error fetching admin analytics", err);
    } finally {
      setLoadingAdminAnalytics(false);
    }
  }, []);

  // --- ПАНЕЛЬ АДМИНИСТРАТОРА: КУПОНЫ ---
  const loadCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    setAdminCouponsLoadError(false);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/coupons`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error(`admin-coupons-load-failed:${res.status}`);
      const data = await res.json();
      setAdminCoupons(Array.isArray(data) ? data : (data.data || []));
      setAdminCouponsLoadError(false);
    } catch (err) {
      setAdminCouponsLoadError(true);
      console.error("Error fetching coupons", err);
    } finally {
      setLoadingCoupons(false);
    }
  }, []);

  const handleCreateCoupon = async (e, adminCopy) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/coupons`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(couponForm)
      });
      if (res.ok) {
        setCouponForm({ code: '', credits: 100, max_uses: 10 });
        loadCoupons();
        showToast(adminCopy.couponCreated);
      } else {
        const errData = await res.json();
        showToast(localizeServerMessage(lang, errData.message, adminCopy.couponCreateError), 'error');
      }
    } catch (err) { console.error(err); showToast(t.connection_error, 'error'); }
  };

  const handleDeleteCoupon = async (id, adminCopy) => {
    if (!window.confirm(adminCopy.couponDeleteConfirm)) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/coupons/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        setAdminCoupons(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) { console.error(err); }
  };

  const handleToggleFavorite = async (e, id) => {
    e.stopPropagation();
    if (!user) { setShowAuthModal(true); return; }
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/ads/${id}/favorite`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'added') setFavoriteIds(prev => [...prev, id]);
        else setFavoriteIds(prev => prev.filter(fId => fId !== id));
        loadFavorites();
        loadFavoriteAds();
      }
    } catch (err) { console.error("Error toggling favorite", err); }
  };

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const categories = Array.isArray(data)
          ? data
          : (Array.isArray(data?.data) ? data.data : []);
        setCategoriesData(categories);
      })
      .catch(err => console.error("Error fetching categories", err));
  }, []);

  // --- ПАНЕЛЬ АДМИНИСТРАТОРА: КАТЕГОРИИ ---
  const handleSaveCategory = async (e, adminCopy) => {
    e.preventDefault();
    setAdminLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const method = editingCatId ? 'PUT' : 'POST';
      const url = editingCatId ? `${API_URL}/categories/${editingCatId}` : `${API_URL}/categories`;

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(adminCatForm)
      });

      if (res.ok) {
        const catRes = await fetch(`${API_URL}/categories`);
        const categoryPayload = catRes.ok ? await catRes.json() : [];
        setCategoriesData(
          Array.isArray(categoryPayload)
            ? categoryPayload
            : (Array.isArray(categoryPayload?.data) ? categoryPayload.data : [])
        );
        cancelCatEdit();
        showToast(adminCopy.categorySaved);
      } else showToast(adminCopy.categorySaveError, 'error');
    } catch (err) { console.error(err); showToast(t.connection_error, 'error'); }
    finally { setAdminLoading(false); }
  };

  const handleEditCategory = (cat) => {
    setEditingCatId(cat.id || cat.slug);
    setAdminCatForm({ slug: cat.slug, name_es: cat.name?.es || '', name_en: cat.name?.en || '', icon: cat.icon || 'Star', sort_order: cat.sort_order || 100 });
  };

  const cancelCatEdit = () => {
    setEditingCatId(null);
    setAdminCatForm({ slug: '', name_es: '', name_en: '', icon: 'Star', sort_order: 100 });
  };

  // В Production мы используем только реальные объявления из БД. Убираем mockAds, чтобы поиск мог корректно показывать "Ничего не найдено"
  const allAds = serverAds;

  const applyPendingReferral = async (token) => {
    const code = localStorage.getItem('pendingReferral');
    if (!code || !token) return;

    try {
      const res = await fetch(`${API_URL}/referral/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code })
      });

      if (res.ok || [400, 404].includes(res.status)) {
        localStorage.removeItem('pendingReferral');
      }
    } catch (err) {
      console.error('Referral apply failed', err);
    }
  };

  const registrationConsentForAction = () => {
    if (!registrationConsentAccepted) {
      showToast(
        t.registration_legal_required ||
          'Confirma tu edad y aceptación para continuar.',
        'error',
      );
      return null;
    }
    return createRegistrationConsentPayload('web', new Date(), {
      includeEventId: true,
    });
  };

  const handleOAuthStart = (provider) => {
    const isRegistration = authMode === 'register';
    const registrationPayload = isRegistration
      ? registrationConsentForAction()
      : null;
    if (isRegistration && !registrationPayload) return;
    window.location.href = createOAuthRegistrationUrl(
      API_URL,
      provider,
      registrationPayload,
    );
  };

  const handlePhoneAuthStart = () => {
    const isRegistration = authMode === 'register';
    const consent = isRegistration ? registrationConsentForAction() : null;
    if (isRegistration && !consent) return;
    setPendingPhoneRegistrationConsent(consent);
    setAuthMode('phone_request');
  };

  // --- ЛОГИКА АВТОРИЗАЦИИ (API) ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      let endpoint = '';
      if (authMode === 'register') {
        endpoint = '/register';
        const consent = registrationConsentForAction();
        if (!consent) return;
        Object.assign(data, consent);
        const pendingReferral = localStorage.getItem('pendingReferral');
        if (pendingReferral) data.referral_code = pendingReferral;
      }
      else if (authMode === 'login') endpoint = '/login';
      else if (authMode === 'forgot_password') endpoint = '/forgot-password';
      else if (authMode === 'reset_password') {
        endpoint = '/reset-password';
        data.token = resetToken;
        data.email = resetEmail;
      }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (res.ok) {
        if (authMode === 'forgot_password' || authMode === 'reset_password') {
          const successMessage = authMode === 'forgot_password'
            ? t.account_action_recovery_email_sent
            : t.password_updated;
          showToast(localizeServerMessage(lang, result.message, successMessage));
          setAuthMode('login');
        } else if (result.two_factor) {
          setTwoFactorEmail(result.email || data.email || '');
          setTwoFactorChallengeToken(result.challenge_token || '');
          setRequiresTwoFactor(true);
        } else {
          if (!result.user) {
            showToast(t.account_action_server_unexpected, 'error');
            return;
          }
          setUser(result.user);
          setUserRole(result.user.role || 'individual');
          localStorage.setItem('user', JSON.stringify(result.user));
          if (result.access_token) {
            localStorage.setItem('auth_token', result.access_token);
            if (authMode === 'register') await applyPendingReferral(result.access_token);
          }
          // Mark new registrations for onboarding
          if (authMode === 'register') {
            localStorage.setItem('just_registered', '1');
          }
          setShowAuthModal(false);
        }
      } else {
        const serverMessage = result.message || result.error;
        const fallbackMessage = authMode === 'login'
          ? t.account_action_invalid_credentials
          : authMode === 'forgot_password'
            ? t.account_action_recovery_email_error
            : authMode === 'reset_password'
              ? t.account_action_password_reset_error
              : t.account_action_request_error;
        showToast(localizeServerMessage(lang, serverMessage, fallbackMessage), 'error');
      }
    } catch (err) {
      console.error("Auth error", err);
      showToast(t.connection_error, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.email = twoFactorEmail;

    try {
      const res = await fetch(`${API_URL}/login/two-factor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          challenge_token: twoFactorChallengeToken,
          code: data.code,
        })
      });
      const result = await res.json();
      if (res.ok) {
        setUser(result.user);
        localStorage.setItem('user', JSON.stringify(result.user));
        if (result.access_token) localStorage.setItem('auth_token', result.access_token);
        setShowAuthModal(false);
        setRequiresTwoFactor(false);
        setTwoFactorChallengeToken('');
        setTwoFactorEmail('');
      } else {
        showToast(localizeServerMessage(lang, result.message, t.account_action_invalid_two_factor), 'error');
      }
    } catch (err) { showToast(t.connection_error, 'error'); }
    finally { setAuthLoading(false); }
  };

  const handlePhoneRequestSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const formData = new FormData(e.target);
    const phone = formData.get('phone_number');
    setAuthPhone(phone);
    try {
      const res = await fetch(`${API_URL}/auth/phone/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone })
      });
      const result = await res.json();
      if (res.ok) {
        showToast(localizeServerMessage(lang, result.message, t.account_action_sms_sent));
        setAuthMode('phone_verify');
      } else showToast(localizeServerMessage(lang, result.message, t.account_action_sms_unavailable), 'error');
    } catch (err) { showToast(t.connection_error, 'error'); }
    finally { setAuthLoading(false); }
  };

  const handlePhoneVerifySubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const formData = new FormData(e.target);
    try {
      const res = await fetch(`${API_URL}/auth/phone/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: authPhone,
          code: formData.get('code'),
          ...(pendingPhoneRegistrationConsent || {}),
        })
      });
      const result = await res.json();
      if (res.ok) {
        setUser(result.user); setUserRole(result.user.role || 'individual');
        localStorage.setItem('user', JSON.stringify(result.user));
        if (result.access_token) localStorage.setItem('auth_token', result.access_token);
        if (result.is_new_user && result.registration_event_id) {
          localStorage.setItem('just_registered', '1');
          events.registered({
            event_id: result.registration_event_id,
            meta_event_id: result.registration_event_id,
            method: result.registration_method || 'phone',
          });
        }
        setPendingPhoneRegistrationConsent(null);
        setShowAuthModal(false);
      } else showToast(localizeServerMessage(lang, result.message, t.account_action_sms_invalid), 'error');
    } catch (err) { showToast(t.connection_error, 'error'); }
    finally { setAuthLoading(false); }
  };

  const resendVerificationEmail = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token || !user) return;
    try {
      const res = await fetch(`${API_URL}/email/send-verification`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setEmailBannerSent(true);
        setTimeout(() => setEmailBannerSent(false), 5000);
      }
    } catch (e) { /* silent */ }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('auth_token');
    // Clear local state first for immediate UX response
    setUser(null);
    setUserRole('individual');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    setFavoriteIds([]);
    setUserAds([]);
    setFavoriteAds([]);
    // FIX: Ghost UI. Сбрасываем открытое объявление/магазин при выходе
    setViewedAd(null);
    setViewedCompany(null);

    // Защита от Logout Blackhole: дожидаемся отзыва токена на сервере, прежде чем перезагружать страницу, иначе браузер оборвет запрос
    if (token) {
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => console.error('Logout revoke error:', err));
    }

    // UX Оптимизация: Используем мягкий сброс SPA вместо жесткой перезагрузки страницы
    setCurrentTab('home');
    window.scrollTo(0, 0);
  };

  // --- ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ---
  const openProfileModal = () => {
    if (!user) return;
    setProfileForm({
      name: user.name || '',
      avatarFile: null,
      avatarPreview: user.avatar_url ? getImageUrl(user.avatar_url) : ''
    });
    setShowProfileModal(true);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    const formData = new FormData();
    formData.append('name', profileForm.name);
    if (profileForm.avatarFile) formData.append('avatar', profileForm.avatarFile);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/profile`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setShowProfileModal(false);
      } else showToast(t.profile_save_error, 'error');
    } catch (err) { console.error("Profile update error", err); }
    finally { setProfileLoading(false); }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showToast(t.passwords_mismatch, 'error');
      return;
    }
    setPasswordLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(localizeServerMessage(lang, data.message, t.password_updated));
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        showToast(localizeServerMessage(lang, data.message, t.password_update_error), 'error');
      }
    } catch (err) { console.error("Password update error", err); showToast(t.connection_error, 'error'); }
    finally { setPasswordLoading(false); }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/email/request`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(localizeServerMessage(lang, data.message, t.email_verification_sent));
        setEmailForm({ new_email: '', password: '' });
      } else {
        showToast(localizeServerMessage(lang, data.message, t.account_action_email_request_error), 'error');
      }
    } catch (err) { console.error("Email update error", err); showToast(t.connection_error, 'error'); }
    finally { setEmailLoading(false); }
  };

  const handleNotificationsSubmit = async (e) => {
    e.preventDefault();
    setNotificationsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/notifications`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...notificationsForm, locale: lang })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));

        if (notificationsForm.push_notifications) {
           subscribeToPush();
        } else {
           unsubscribeFromPush();
        }
        showToast(t.account_action_notifications_saved);
      } else showToast(t.account_action_notifications_error, 'error');
    } catch (err) { console.error("Notifications update error", err); showToast(t.connection_error, 'error'); }
    finally { setNotificationsLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(t.account_action_delete_confirm)) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(t.account_action_delete_success);
        handleLogout();
      } else {
        showToast(t.delete_account_error, 'error');
      }
    } catch (err) {
      console.error("Account deletion error", err);
      showToast(t.connection_error, 'error');
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImageObjects = files.map(file => ({
      source: 'new',
      id: crypto.randomUUID(),
      file: file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImageObjects].slice(0, 10));
  };

  const removeImage = (idxToRemove) => {
    const imageToRemove = images[idxToRemove];
    // Если это новое изображение, освобождаем URL-объект для предотвращения утечек памяти
    if (imageToRemove.source === 'new') {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    setImages(prev => prev.filter((_, i) => i !== idxToRemove));
  };

  const removeImageById = (id) => {
    const imageToRemove = images.find(img => img.id === id);
    if (imageToRemove && imageToRemove.source === 'new') {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleGenerateDescription = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!form.title) {
      showToast(t.listing_action_ai_title_required, 'error');
      return;
    }

    setAiLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const attrs = form.attributes && Object.keys(form.attributes).length > 0
        ? form.attributes
        : undefined;

      const res = await fetch(`${API_URL}/ads/generate-description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title:      form.title,
          category:   form.category   || undefined,
          condition:  form.condition  || undefined,
          location:   form.location   || undefined,
          price:      form.price      || undefined,
          attributes: attrs,
          locale:     lang,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(localizeServerMessage(lang, data.error || data.message, t.ai_description_failed), 'error');
        return;
      }

      if (data.description) {
        setForm(prev => ({ ...prev, description: data.description }));
      }
    } catch (err) {
      console.error('AI description error', err);
      showToast(t.connection_error, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handlePostSubmit = async (e, { acceptWarnings = false } = {}) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setPostLoading(true);
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('price', form.price);
    formData.append('description', form.description);
    formData.append('location', form.location || 'México');
    formData.append('city', form.city || '');
    formData.append('state', form.state || '');
    if (form.latitude !== '' && form.longitude !== '') {
      formData.append('latitude', form.latitude);
      formData.append('longitude', form.longitude);
    }
    formData.append('category', form.category || 'general');
    formData.append('condition', form.condition || 'usado');
    if (user && user.id) formData.append('user_id', user.id);

    // Добавляем динамические атрибуты (EAV JSON)
    if (form.attributes) {
      Object.keys(form.attributes).forEach(key => {
        if (form.attributes[key]) {
          formData.append(`attributes[${key}]`, form.attributes[key]);
        }
      });
    }
    if (form.subcategory) {
      formData.append('subcategory', form.subcategory);
      formData.append('attributes[subcategory]', form.subcategory);
    }

    // Обработка изображений для создания и обновления
    images.forEach(img => {
      if (img.source === 'new' && img.file) {
        formData.append('images[]', img.file);
      } else if (img.source === 'existing' && img.url) {
        // Отправляем обратно относительный путь для существующих изображений
        formData.append('existing_images[]', getRelativePath(img.url));
      }
    });

    // Добавляем видеофайл, если он выбран
    if (videoFile && !videoFile.isExisting) {
      formData.append('video_file', videoFile);
    } else if (editingAd && editingAd.video_url && !videoFile) {
      formData.append('remove_video', 'true'); // Корректное удаление видео
    }

    try {
      const token = localStorage.getItem('auth_token');
      const isUpdating = !!editingAd;
      const endpoint = isUpdating ? `${API_URL}/ads/${editingAd.id}` : `${API_URL}/ads`;

      // Для обновлений Laravel может имитировать PUT/PATCH с полем _method, но мы определили маршрут POST.
      // Поэтому мы просто отправляем POST на эндпоинт обновления.

      console.log("=== SUBMITTING FORM DATA ===");
      for (let pair of formData.entries()) {
        console.log(`FORM DATA FIELD: ${pair[0]} = ${pair[1]}`);
      }
      console.log("============================");

      if (!acceptWarnings) {
        const previewRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'X-Mercasto-Quality-Preflight': 'preview',
          },
          body: formData,
        });
        const previewData = await previewRes.json().catch(() => ({}));
        const preview = previewData.quality_preflight || null;
        if (preview) {
          setListingQualityPreflight(preview);
          if (!preview.passes_hard_validation || (preview.warnings || []).length > 0) return;
        }
        if (!previewRes.ok) {
          const validationError = Object.values(previewData.errors || {}).flat().find(Boolean);
          showToast(localizeServerMessage(lang, validationError || previewData.message, t.listing_action_save_error), 'error');
          return;
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      if (res.ok) {
        setListingQualityPreflight(null);
        const savedAd = await res.json().catch(() => null);

        // Очищаем оперативную память браузера от временных файлов (Memory Leak fix)
        images.forEach(img => {
          if (img.source === 'new' && img.preview) {
            URL.revokeObjectURL(img.preview);
          }
        });

        // Сбрасываем состояние формы
        setForm({ title: '', price: '', description: '', location: '', city: '', state: '', latitude: '', longitude: '', category: '', condition: 'nuevo', attributes: {} });
        setImages([]);
        setVideoFile(null);
        setEditingAd(null);
        if (!isUpdating) {
          clearPublishDraft();
          showToast(t.listing_action_publish_submitted);
        }
        setCurrentTab('profile');
        setDashboardTab('my_ads');
        navigate('/profile?tab=my_ads');
        // GA4 + Meta Pixel/CAPI ad posted event
        if (!editingAd && savedAd?.id) events.listingPublished(savedAd.id, form.category || "general");
        loadAds(1); // Reload after create/update
        loadUserAds(); // Обновляем список моих объявлений
      } else {
        const errorData = await res.json();
        const validationError = Object.values(errorData.errors || {}).flat().find(Boolean);
        showToast(localizeServerMessage(lang, validationError || errorData.message, t.listing_action_save_error), 'error');
      }
    } catch (err) { console.error("Post error"); }
    finally { setPostLoading(false); }
  };

  // --- УДАЛЕНИЕ ОБЪЯВЛЕНИЯ ---
  const handleDeleteAd = async (id) => {
    if (!window.confirm(t.confirm_delete)) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/ads/${id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        loadAds(1); // Reload after delete
        loadUserAds(); // Обновляем список моих объявлений
      } else {
        showToast(t.listing_action_delete_error, 'error');
      }
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  // --- РЕДАКТИРОВАНИЕ ОБЪЯВЛЕНИЯ ---
  const handleEditAd = (ad) => {
    let parsedAttributes = {};
    try {
        parsedAttributes = typeof ad.attributes === 'string' ? JSON.parse(ad.attributes) : (ad.attributes || {});
    } catch(e) { console.error("Error parsing attributes", e); }

    setEditingAd(ad);
    setForm({
      title: localizedText(ad.title, lang),
      price: ad.price,
      description: localizedText(ad.description, lang) || '',
      location: ad.location || '',
      city: ad.city || String(ad.location || '').split(',')[0].trim(),
      state: ad.state || '',
      latitude: ad.latitude || '',
      longitude: ad.longitude || '',
      category: ad.category || '',
      subcategory: ad.subcategory || '',
      condition: ad.condition || 'usado',
      attributes: parsedAttributes
    });
    setImages(getImageUrls(ad.image_url, ad.image).map(url => ({
      source: 'existing',
      id: url,
      url: url,
      preview: url
    })));
    setVideoFile(ad.video_url ? { name: t.listing_action_existing_video, isExisting: true } : null); // Исправляем баг потери видео при редактировании
    setCurrentTab('post');
    navigate('/post');
  };

  // --- CONTACT / SHARE CLICK ANALYTICS ---
  const handleWhatsAppClick = (ad, channel = 'whatsapp') => {
    fetch(`${API_URL}/ads/${ad.id}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ channel })
    }).catch(() => {});

    events.contactOpened(channel, ad.id, ad.category, {
      source: 'listing_contact',
    });
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/users/${viewedCompany.id}/reviews`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm)
      });
      if (res.ok) {
        setReviewForm({ rating: 5, comment: '' });
        loadCompanyReviews(viewedCompany.id); // Обновляем только отзывы, не скрывая объявления продавца
      } else {
        const errData = await res.json();
        showToast(localizeServerMessage(lang, errData.message, t.review_error), 'error');
      }
    } catch (err) { console.error("Review error", err); showToast(t.connection_error, 'error'); }
    finally { setSubmittingReview(false); }
  };

  // --- МАССОВАЯ ЗАГРУЗКА (CSV/XML) ---
  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingBulk(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/ads/bulk-upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        showToast(localizeServerMessage(lang, data.message, t.listing_action_bulk_success));
        window.location.reload(); // Recargar para mostrar los nuevos anuncios en el dashboard
      } else {
        const qualityGuidance = Array.isArray(data.rejected_rows)
          ? data.rejected_rows.slice(0, 3).flatMap(row =>
              (row.errors || []).map(code => `#${row.row}: ${t[`listing_quality_${code}`] || t.listing_quality_generic}`)
            ).join(' ')
          : '';
        showToast(qualityGuidance || localizeServerMessage(lang, data.message, t.listing_action_bulk_error), 'error');
      }
    } catch (err) {
      console.error("Bulk upload error", err);
      showToast(t.connection_error, 'error');
    } finally {
      setIsUploadingBulk(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- ПЕРЕКЛЮЧЕНИЕ СТАТУСА ОБЪЯВЛЕНИЯ (АКТИВНО/НЕАКТИВНО) ---
  const handleToggleAdStatus = async (ad) => {
    if (ad.status === 'pending' || ad.status === 'rejected') {
      showToast(t.listing_action_activation_blocked, 'error');
      return;
    }
    const newStatus = ad.status === 'active' ? 'paused' : (ad.status === 'paused' ? 'active' : (ad.status === 'inactive' ? 'active' : 'paused'));
    // Optimistic UI update
    setUserAds(prev => prev.map(a => a.id === ad.id ? { ...a, status: newStatus } : a));
    setServerAds(prev => prev.map(a => a.id === ad.id ? { ...a, status: newStatus } : a));

    try {
      const token = localStorage.getItem('auth_token');
      const endpoint = newStatus === 'paused' ? `${API_URL}/ads/${ad.id}/pause` : `${API_URL}/ads/${ad.id}/activate`;
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error("Error updating status", err);
      // Revert on error
      setUserAds(prev => prev.map(a => a.id === ad.id ? { ...a, status: ad.status } : a));
      setServerAds(prev => prev.map(a => a.id === ad.id ? { ...a, status: ad.status } : a));
    }
  };

  // --- REPUBLICAR ANUNCIO EXPIRADO ---
  const handleRepublishAd = async (ad) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/ads/${ad.id}/republish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setUserAds(prev => prev.map(a => a.id === ad.id ? { ...a, status: 'active', expires_at: data.expires_at, republish_count: data.republish_count } : a));
        setServerAds(prev => prev.map(a => a.id === ad.id ? { ...a, status: 'active' } : a));
        showToast(t.listing_action_republish_success);
      } else {
        showToast(localizeServerMessage(lang, data.message, t.listing_action_republish_error), 'error');
      }
    } catch (err) {
      console.error("Republish error", err);
      showToast(t.connection_error, 'error');
    }
  };


  // --- RENOVAR ANUNCIO (before expiry or republish expired with credit) ---
  const handleRenewAd = async (ad) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/ads/${ad.id}/renew`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        const newExpiry = formatDate(data.expires_at, lang, { day: 'numeric', month: 'long', year: 'numeric' });
        setUserAds(prev => prev.map(a => a.id === ad.id ? { ...a, status: 'active', expires_at: data.expires_at, reminder_sent_at: null } : a));
        showToast(newExpiry ? t.listing_action_renew_success.replace('{date}', newExpiry) : t.listing_action_renewed);
      } else if (res.status === 402 && data.payment_required) {
        showToast(localizeServerMessage(lang, data.message, t.listing_action_renew_payment));
      } else if (res.status === 402) {
        showToast(localizeServerMessage(lang, data.message, t.listing_action_renew_start_error), 'error');
      } else {
        showToast(localizeServerMessage(lang, data.message, t.listing_action_renew_error), 'error');
      }
    } catch (err) {
      console.error('Renew error', err);
      showToast(t.connection_error, 'error');
    }
  };

  // --- ПОЖАЛОВАТЬСЯ НА ОБЪЯВЛЕНИЕ ---
  const handleReportAd = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/ads/${reportingAd.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(reportForm)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(localizeServerMessage(lang, data.message, t.listing_action_report_error), 'error');
        return;
      }
      showToast(localizeServerMessage(lang, data.message, t.listing_action_report_sent));
      setShowReportModal(false);
      setReportForm({ reason: '', comments: '' });
      setReportingAd(null);
    } catch (err) { console.error("Report error", err); showToast(t.connection_error, 'error'); }
  };

  // --- ПОЖАЛОВАТЬСЯ НА ПОЛЬЗОВАТЕЛЯ ---
  const handleUserReportSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/users/${viewedCompany.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(userReportForm)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(localizeServerMessage(lang, data.message, t.listing_action_report_error), 'error');
        return;
      }
      showToast(localizeServerMessage(lang, data.message, t.listing_action_user_report_sent));
      setShowUserReportModal(false);
      setUserReportForm({ reason: '', comments: '' });
    } catch (err) { console.error("Report error", err); showToast(t.connection_error, 'error'); }
  };

  // --- ПОДЕЛИТЬСЯ ОБЪЯВЛЕНИЕМ ---
  const handleShareAd = (ad) => {
    const adTitle = localizedText(ad.title, lang);
    if (navigator.share) {
      navigator.share({ title: adTitle, text: t.listing_action_share_text.replace('{title}', adTitle), url: window.location.href }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast(t.copied);
    }
  };

  // --- PAYMENT CHECKOUT ---
  const handleClipPayment = async (amount, description, adId = null, productCode = null) => {
    if (!user) { setShowAuthModal(true); return; }

    // Cualquier tarifa (excepto recargas de créditos) puede pagarse con el saldo de la cuenta.
    const isCreditsTopUp = typeof productCode === 'string' && productCode.startsWith('credits_');
    const balance = parseFloat(user?.balance || 0);
    if (!isCreditsTopUp && (user?.unlimited_balance || balance >= amount) && amount > 0) {
      const balanceLabel = user?.unlimited_balance
        ? t.unlimited_balance_label
        : formatMXN(balance, lang, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      const amountLabel = formatMXN(amount, lang, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      const useBalance = window.confirm(formatPaymentActionCopy(lang, 'payWithBalance', { amount: amountLabel, balance: balanceLabel }));
      if (useBalance) {
        try {
          const token = localStorage.getItem('auth_token');
          const res = await fetch(`${API_URL}/payment/balance`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ description, ad_id: adId, product_code: productCode }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(paymentCopy.balancePaid);
            const updatedUser = { ...user, balance: data.balance };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            loadUserAds?.();
            return;
          }
          showToast(data.message || t.payment_error_generating, 'error');
          return;
        } catch (err) {
          console.error('Balance payment error', err);
          showToast(t.connection_error, 'error');
          return;
        }
      }
    }

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/payment/clip`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description, ad_id: adId, product_code: productCode })
      });
      const data = await res.json();
      if (res.ok && data.payment_url) {
        window.location.href = data.payment_url;
      } else showToast(localizeServerMessage(lang, data.message, t.payment_error_generating), 'error');
    } catch (err) { console.error("Payment error", err); showToast(t.connection_error, 'error'); }
  };

  const handlePromotionProductPayment = (amount, description, productCode) => {
    if (!user) { setShowAuthModal(true); return; }

    const adId = Number(promotionTargetAdId);
    if (!adId) {
      showToast(paymentCopy.selectActiveAd, 'error');
      return;
    }

    handleClipPayment(amount, description, adId, productCode);
  };

  const handleCreditsPayment = (amount, productCode) => {
    if (!user) { setShowAuthModal(true); return; }
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount < 50 || numericAmount > 5000) {
      showToast(formatPaymentActionCopy(lang, 'invalidCreditsAmount', {
        min: formatMXN(50, lang, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
        max: formatMXN(5000, lang, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      }), 'error');
      return;
    }
    handleClipPayment(numericAmount, `${formatNumber(numericAmount, lang)} ${t.pm_credits_unit} · Mercasto`, null, productCode);
  };

  // --- AI COMMAND CENTER LOGIC ---
  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setIsAiProcessing(true);
    setAiResult(null);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setAiResult({ error: t.shell_login_continue });
        setIsAiProcessing(false);
        return;
      }
      const endpoints = { postgresql: '/agents/postgresql', react: '/agents/react', ceo: '/agents/ceo', lawyer: '/agents/lawyer', notary: '/agents/notary', advocate: '/agents/advocate', marketing: '/agents/marketing', seo: '/agents/seo', ceo_ui: '/agents/ceo-ui', ceo_ux: '/agents/ceo-ux', ui: '/agents/ui' };
      const endpoint = endpoints[aiAgentType] || '/agents/ceo';
      const payload = aiAgentType === 'react' ? { prompt: aiPrompt } : { query: aiPrompt };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { error: `HTTP ${res.status}: ${text.substring(0, 100)}` };
      }

      if (!res.ok && !data.error && data.message) {
        data.error = data.message;
      }
      setAiResult(data);
    } catch (err) {
      setAiResult({ error: t.connection_error });
    } finally {
      setIsAiProcessing(false);
    }
  };

  // --- ПРОДВИЖЕНИЕ ОБЪЯВЛЕНИЯ (Выбор: Кредиты или Карта) ---
  const handlePromoteAd = async (ad, type = 'highlight') => {
    const balance = parseFloat(user?.balance || 0);
    if (user?.unlimited_balance || balance >= 50) {
      const typeLabel = type === 'boost' ? t.pm_boost_section : type === 'top' ? t.pm_top_category_name : t.pm_highlight_section;
      const balanceLabel = user?.unlimited_balance
        ? t.unlimited_balance_label
        : `${formatNumber(balance, lang)} ${t.pm_credits_unit}`;
      const creditsLabel = formatNumber(50, lang);
      if (window.confirm(formatPaymentActionCopy(lang, 'promotionConfirm', { credits: creditsLabel, type: typeLabel, balance: balanceLabel }))) {
        try {
          const token = localStorage.getItem('auth_token');
          const res = await fetch(`${API_URL}/ads/${ad.id}/promote/credits`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ type })
          });
          const data = await res.json();
          if (res.ok) {
            showToast(paymentCopy.promotionSuccess);
            const updatedUser = { ...user, balance: data.balance };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            const patch = { promoted: data.promoted, boost_type: data.boost_type, boost_expires_at: data.boost_expires_at };
            setUserAds(prev => prev.map(a => a.id === ad.id ? { ...a, ...patch } : a));
            setServerAds(prev => prev.map(a => a.id === ad.id ? { ...a, ...patch } : a));
            loadUserAds?.();
          } else showToast(data.message || paymentCopy.promotionError, 'error');
        } catch (e) { console.error(e); showToast(t.connection_error, 'error'); }
      }
    } else {
      setPromotionTargetAdId(String(ad.id));
      setPriceTab('pro');
      setShowPricingModal(true);
      showToast(paymentCopy.choosePackage);
    }
  };

  // --- АКТИВАЦИЯ КУПОНА ---
  const handleRedeemCoupon = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!couponInput || !couponInput.trim()) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/coupons/redeem`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.balance !== undefined) {
        showToast(localizeServerMessage(lang, data.message, t.coupon_redeem_success));
        setShowCouponModal(false);
        setCouponInput('');
        const updatedUser = { ...user, balance: data.balance };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        showToast(localizeServerMessage(lang, data.message, t.coupon_redeem_error), 'error');
      }
    } catch (e) { console.error(e); showToast(t.connection_error, 'error'); }
  };

  // --- ПРОСМОТР ОБЪЯВЛЕНИЯ И АНАЛИТИКА ---
  const handleViewAd = (ad) => {
    window.history.pushState({ popup: 'ad' }, '', `#ad-${ad.id}`);
    setViewedAd(ad);
    window.scrollTo(0, 0); // Исправляет проблему "белого экрана" из-за скролла
    if (ad.is_catalog_filler) return;

    fetch(`${API_URL}/ads/${ad.id}/view`, { method: 'POST' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.success) {
          setServerAds(prev => prev.map(a => a.id === ad.id ? { ...a, views: data.views } : a));
          if (user) {
            setUserAds(prev => prev.map(a => a.id === ad.id ? { ...a, views: data.views } : a));
          }
        }
      })
      .catch(err => console.error("Error recording view", err));
  };

  const handleMapAdClickGlobal = useCallback((adId) => {
    const allAdLists = [
      ...(Array.isArray(serverAds) ? serverAds : []),
      ...(Array.isArray(realEstateAds) ? realEstateAds : []),
      ...(Array.isArray(automotiveAds) ? automotiveAds : []),
      ...(Array.isArray(jobAds) ? jobAds : []),
      ...(Array.isArray(serviceAds) ? serviceAds : [])
    ];

    const foundAd = allAdLists.find(ad => ad && ad.id == adId);
    if (foundAd) {
      handleViewAd(foundAd);
    } else {
      const token = localStorage.getItem('auth_token');
      fetch(`${API_URL}/ads/${adId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
        .then(res => res.ok ? res.json() : null)
        .then(adData => {
          if (adData) {
            handleViewAd(adData);
          }
        })
        .catch(err => console.error("Error fetching ad for map click", err));
    }
  }, [serverAds, realEstateAds, automotiveAds, jobAds, serviceAds, handleViewAd]);

  useEffect(() => {
    window.__onMapAdClick = (adId) => {
      handleMapAdClickGlobal(adId);
    };
    return () => {
      delete window.__onMapAdClick;
    };
  }, [handleMapAdClickGlobal]);

  // --- ПРОСМОТР ПРОФИЛЯ ПРОДАВЦА (STOREFRONT) ---
  const handleViewCompany = (seller) => {
    if (!seller) return;
    window.history.pushState({ popup: 'company' }, '', `#company-${seller.id}`);
    setViewedCompany(seller);
    window.scrollTo(0, 0); // Исправляет проблему "белого экрана" из-за скролла
    loadCompanySecondaryData(seller.id, { clear: true });
  };

  // --- РЕНДЕР КАРТОЧКИ ---
  const renderAdCard = (ad, options = {}) => (
    <AdCard
      key={ad.id}
      ad={ad}
      options={options}
      favoriteIds={favoriteIds}
      getImageUrl={getImageUrl}
      handleViewAd={handleViewAd}
      handleToggleFavorite={handleToggleFavorite}
      observeAdImpression={observeAdImpression}
      onImageError={handleAdImageError}
      lang={lang}
      currentUser={user}
    />
  );

  // --- РЕНДЕР СКЕЛЕТОНА (ЗАГЛУШКИ) ---
  const renderSkeletonCard = (index) => (
    <article key={`skeleton-${index}`} className="card bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-full shrink-0 animate-pulse">
      <div className="relative bg-slate-200 dark:bg-slate-700 w-full h-[160px] md:h-[180px]"></div>
      <div className="p-3.5 flex flex-col flex-1 bg-white z-10">
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2 mb-2 mt-1"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 mb-4"></div>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-1/3"></div>
        </div>
      </div>
    </article>
  );

  // --- РЕНДЕР СТРАНИЦЫ ТОВАРА ---
  const renderAdDetailScreen = () => <AdDetailScreen ad={viewedAd} API_URL={API_URL} getImageUrl={getImageUrl} getImageUrls={getImageUrls} getCatName={getCatName} t={t} lang={lang} favoriteIds={favoriteIds} categoriesData={categoriesData} sliderAutoplay={sliderAutoplay} handleShareAd={handleShareAd} handleToggleFavorite={handleToggleFavorite} setReportingAd={setReportingAd} setShowReportModal={setShowReportModal} handleViewCompany={handleViewCompany} handleWhatsAppClick={handleWhatsAppClick} allAds={allAds} setViewedAd={setViewedAd} onBack={handleAdBack} MediaSlider={MediaSlider} renderAdCard={renderAdCard} AdSenseBanner={AdSenseBanner} currentUser={user} handleRenewAd={handleRenewAd} />;

  // --- РЕНДЕР ПУБЛИЧНОГО ПРОФИЛЯ ПРОДАВЦА (STOREFRONT) ---
  const renderStorefrontScreen = () => <StorefrontScreen company={viewedCompany} t={t} lang={lang} getImageUrl={getImageUrl} companyRatingStats={companyRatingStats} companyAds={companyAds} companyReviews={companyReviews} loadingCompanyAds={loadingCompanyAds} companyAdsLoadError={companyAdsLoadError} retryCompanyAds={() => loadCompanyAds(viewedCompany?.id)} loadingCompanyReviews={loadingCompanyReviews} companyReviewsLoadError={companyReviewsLoadError} retryCompanyReviews={() => loadCompanyReviews(viewedCompany?.id)} submittingReview={submittingReview} setShowUserReportModal={setShowUserReportModal} setQrModalData={setQrModalData} setViewedCompany={setViewedCompany} renderAdCard={renderAdCard} renderSkeletonCard={renderSkeletonCard} handleReviewSubmit={handleReviewSubmit} reviewForm={reviewForm} setReviewForm={setReviewForm} user={user} handleViewCompany={handleViewCompany} />;

  // --- РЕНДЕР МОДАЛКИ С QR-КОДОМ ---


  // --- РЕНДЕР МОДАЛКИ ЖАЛОБЫ (REPORT) ---


  // --- РЕНДЕР МОДАЛКИ ЖАЛОБЫ НА ПОЛЬЗОВАТЕЛЯ ---


  // --- РЕНДЕР ЦЕНОВОЙ МОДЕЛИ ---


  // --- РЕНДЕР ДАШБОРДА ПОЛЬЗОВАТЕЛЯ ---
  const safeUserAds = useMemo(() => (Array.isArray(userAds) ? userAds : []), [userAds]);
  const safeCategoriesData = useMemo(() => (Array.isArray(categoriesData) ? categoriesData : []), [categoriesData]);
  const activeAds = useMemo(() => safeUserAds.filter(a => a.status === 'active'), [safeUserAds]);
  const inactiveAds = useMemo(() => safeUserAds.filter(a => a.status !== 'active'), [safeUserAds]);
  const totalViews = useMemo(() => safeUserAds.reduce((sum, a) => sum + (a.views || 0), 0), [safeUserAds]);
  const totalContactClicks = useMemo(() => safeUserAds.reduce((sum, a) => sum + (a.whatsapp_clicks || 0), 0), [safeUserAds]);
  const conversionRate = useMemo(() => totalViews > 0 ? ((totalContactClicks / totalViews) * 100).toFixed(1) : 0, [totalViews, totalContactClicks]);
  const catObj = useMemo(() => safeCategoriesData.reduce((acc, cat) => { acc[cat.slug] = getCatName(cat, lang); return acc; }, {}), [safeCategoriesData, lang]);
  const categoryStats = useMemo(() => safeCategoriesData.map(c => ({ name: getCatName(c, lang), count: safeUserAds.filter(a => a.category === c.slug).length })).filter(c => c.count > 0), [safeCategoriesData, safeUserAds, lang]);
  const navLabels = NAV_LABELS[lang] || NAV_LABELS.en;
  const headerCategories = useMemo(() => {
    // Показываем корневые категории, исключая внутренние разделы «Товаров» и дубликаты
    const excludedSlugs = new Set([
      'electronica', 'hogar', 'moda', 'ocio', 'infantil', 'mascotas', 'formacion',
    ]);
    const cats = (Array.isArray(safeCategoriesData) ? safeCategoriesData : [])
      .filter(c => c && c.slug && !excludedSlugs.has(c.slug))
      .map(c => ({ slug: c.slug, label: getCatName(c, lang) }));
    cats.push({ slug: 'tiendas', label: navLabels[5] });
    return cats;
  }, [safeCategoriesData, lang, navLabels]);

  const renderUserDashboard = () => <UserDashboard accountType={accountType} activeAds={activeAds} adStatusFilter={adStatusFilter} analyticsData={analyticsData} analyticsLoading={analyticsLoading} analyticsLoadError={analyticsLoadError} loadUserAnalytics={loadUserAnalytics} analyticsDays={analyticsDays} catObj={catObj} categoriesData={categoriesData} categoryStats={categoryStats} companyForm={companyForm} conversionRate={conversionRate} dashboardPage={dashboardPage} dashboardTab={dashboardTab} emailForm={emailForm} emailLoading={emailLoading} favoriteAds={favoriteAds} favoriteAdsLoading={favoriteAdsLoading} favoriteAdsLoadError={favoriteAdsLoadError} loadFavoriteAds={loadFavoriteAds} fileInputRef={fileInputRef} form={form} getImageUrl={getImageUrl} handleBulkUpload={handleBulkUpload} handleClipPayment={handleClipPayment} handleDeleteAccount={handleDeleteAccount} handleDeleteAd={handleDeleteAd} handleEditAd={handleEditAd} handleEmailSubmit={handleEmailSubmit} handleExportCompanyData={handleExportCompanyData} handleLogout={handleLogout} handleNotificationsSubmit={handleNotificationsSubmit} handlePasswordSubmit={handlePasswordSubmit} handlePromoteAd={handlePromoteAd} handleToggleAdStatus={handleToggleAdStatus} handleRepublishAd={handleRepublishAd} handleRenewAd={handleRenewAd} handleToggleFavorite={handleToggleFavorite} inactiveAds={inactiveAds} isDarkMode={isDarkMode} isUploadingBulk={isUploadingBulk} lang={lang} notifications={notifications} notificationsForm={notificationsForm} notificationsLoading={notificationsLoading} openProfileModal={openProfileModal} passwordForm={passwordForm} passwordLoading={passwordLoading} renderAdCard={renderAdCard} renderSkeletonCard={renderSkeletonCard} searchAlerts={searchAlerts} loadingSearchAlerts={loadingSearchAlerts} handleToggleSearchAlert={handleToggleSearchAlert} handleDeleteSearchAlert={handleDeleteSearchAlert} setAccountType={setAccountType} setAdStatusFilter={setAdStatusFilter} setAnalyticsDays={setAnalyticsDays} setCompanyForm={setCompanyForm} setCurrentTab={setCurrentTab} setDashboardPage={setDashboardPage} setDashboardTab={setDashboardTab} setEmailForm={setEmailForm} setNotificationsForm={setNotificationsForm} setPasswordForm={setPasswordForm} setShowCouponModal={setShowCouponModal} setShowPricingModal={setShowPricingModal} setSliderAutoplay={setSliderAutoplay} sliderAutoplay={sliderAutoplay} t={t} totalContactClicks={totalContactClicks} totalViews={totalViews} user={user} setUser={setUser} userAds={userAds} userAdsLoading={userAdsLoading} userAdsLoadError={userAdsLoadError} userRole={userRole} onRefreshAds={loadUserAds} userPayments={userPayments} loadingUserPayments={loadingUserPayments} userPaymentsLoadError={userPaymentsLoadError} userPaymentsPage={userPaymentsPage} userPaymentsLastPage={userPaymentsLastPage} userPaymentsTotal={userPaymentsTotal} loadUserPayments={loadUserPayments} token={localStorage.getItem('auth_token')} />;

  const handleSearchArea = useCallback((area = {}) => {
    const { lat, lng, radius: nextRadius } = area;
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;

    const hasAreaField = (key) => Object.prototype.hasOwnProperty.call(area, key);
    const nextQuery = typeof area.query === 'string' ? area.query : searchQuery;
    const nextCategory = typeof area.category === 'string' ? area.category : activeCat;
    const nextMinPrice = hasAreaField('minPrice') ? String(area.minPrice ?? '') : minPrice;
    const nextMaxPrice = hasAreaField('maxPrice') ? String(area.maxPrice ?? '') : maxPrice;
    const nextCondition = Array.isArray(area.condition) ? area.condition : conditionFilter;
    const nextDynamicFilters = { ...(hasAreaField('dynamic') ? (area.dynamic || {}) : dynamicFilters) };
    if (area.listingType) nextDynamicFilters.listing_type = [area.listingType];
    else if (hasAreaField('listingType')) delete nextDynamicFilters.listing_type;
    const nextState = typeof area.state === 'string' ? area.state : selectedState;
    const nextCity = typeof area.city === 'string' ? area.city : '';
    const hasAreaLocationOverride = typeof area.state === 'string' || typeof area.city === 'string';
    const locationLabel = hasAreaLocationOverride ? (nextCity || nextState) : searchLocationInput;
    const geo = { lat: Number(lat), lng: Number(lng) };
    const normalizedRadius = Number.isFinite(Number(nextRadius)) && Number(nextRadius) > 0 ? Number(nextRadius) : radius;

    skipFilterUrlSyncRef.current = true;
    setSearchQuery(nextQuery);
    setDebouncedSearch(nextQuery);
    setActiveCat(nextCategory);
    setMinPrice(nextMinPrice);
    setMaxPrice(nextMaxPrice);
    setConditionFilter(nextCondition);
    setDynamicFilters(nextDynamicFilters);
    setSelectedState(nextState);
    setLocState(nextState);
    setLocCity(nextCity);
    setSearchLocationInput(locationLabel);
    setDebouncedLocInput(locationLabel);
    setSearchLocation(geo);
    setRadius(normalizedRadius);
    navigate(buildHomeFilterPath({
      pathname: '/listings',
      search: nextQuery,
      location: locationLabel,
      state: nextState,
      city: nextCity,
      category: nextCategory,
      minPrice: nextMinPrice,
      maxPrice: nextMaxPrice,
      condition: nextCondition,
      dynamicFilters: nextDynamicFilters,
      geo,
      radius: normalizedRadius,
    }), { replace: true });
  }, [activeCat, buildHomeFilterPath, conditionFilter, dynamicFilters, maxPrice, minPrice, navigate, radius, searchLocationInput, searchQuery, selectedState]);

  // Keep the homepage and hydrated catalog in separate chunks. Catalog routes no
  // longer parse or execute the long marketing homepage before showing results.
  const renderHomeScreen = () => (
    <HomeScreen
      activeCat={activeCat}
      adsTotal={adsTotal}
      executeSearch={executeSearch}
      form={form}
      lang={lang}
      renderAdCard={renderAdCard}
      renderSkeletonCard={renderSkeletonCard}
      selectedState={selectedState}
      serverAds={serverAds}
      setActiveCat={setActiveCat}
      setCurrentTab={setCurrentTab}
      setSearchLocation={setSearchLocation}
      setSearchLocationInput={setSearchLocationInput}
      setSearchQuery={setSearchQuery}
      setSelectedState={setSelectedState}
      setShowPricingModal={setShowPricingModal}
      t={t}
      getImageUrl={getImageUrl}
      handleViewAd={handleViewAd}
      handleSaveSearchAlert={handleSaveSearchAlert}
      savingSearchAlert={savingSearchAlert}
      realEstateAds={realEstateAds}
      jobAds={jobAds}
      serviceAds={serviceAds}
      automotiveAds={automotiveAds}
      user={user}
      viewedAd={viewedAd}
    />
  );

  const renderCatalogScreen = () => (
    <CatalogScreen
      activeCat={activeCat}
      adsLoadError={adsLoadError}
      conditionFilter={conditionFilter}
      dynamicFilters={dynamicFilters}
      executeSearch={executeSearch}
      getImageUrl={getImageUrl}
      handleSaveSearchAlert={handleSaveSearchAlert}
      handleViewAd={handleViewAd}
      hasMore={hasMore}
      lang={lang}
      lastAdElementRef={lastAdElementRef}
      loadingAds={loadingAds}
      loadingMore={loadingMore}
      maxPrice={maxPrice}
      minPrice={minPrice}
      onRetryAds={() => loadAds(1)}
      onSearchArea={handleSearchArea}
      renderAdCard={renderAdCard}
      savingSearchAlert={savingSearchAlert}
      searchQuery={searchQuery}
      searchLocationInput={searchLocationInput}
      selectedState={selectedState}
      serverAds={serverAds}
      setActiveCat={setActiveCat}
      setConditionFilter={setConditionFilter}
      setDynamicFilters={setDynamicFilters}
      setMaxPrice={setMaxPrice}
      setMinPrice={setMinPrice}
      setSearchLocation={setSearchLocation}
      setSearchLocationInput={setSearchLocationInput}
      setSearchQuery={setSearchQuery}
      setSelectedState={setSelectedState}
      t={t}
      token={localStorage.getItem('auth_token')}
      user={user}
    />
  );

  const catalogQuery = new URLSearchParams(location.search);
  const hasCatalogIntent = Boolean(
    activeCat
    || searchQuery
    || selectedState
    || minPrice
    || maxPrice
    || conditionFilter.length
    || ['q', 'search', 'category', 'cat', 'state', 'city', 'location', 'min_price', 'max_price', 'condition']
      .some(key => catalogQuery.has(key))
    || [...catalogQuery.keys()].some(key => key.startsWith('filters['))
  );
  const renderHomeRoute = () => (hasCatalogIntent ? renderCatalogScreen() : renderHomeScreen());

  // --- РЕНДЕР РОСКОШНОЙ ФОРМЫ (POST SCREEN) ---
  const renderPostScreen = () => <PostScreen categoriesData={safeCategoriesData} debouncedLocation={debouncedLocation} editingAd={editingAd} form={form} handleImageChange={handleImageChange} handlePostSubmit={handlePostSubmit} images={Array.isArray(images) ? images : []} isMapUpdating={isMapUpdating} lang={lang} listingQualityPreflight={listingQualityPreflight} clearListingQualityPreflight={setListingQualityPreflight} postLoading={postLoading} removeImage={removeImage} removeImageById={removeImageById} reorderImages={setImages} setEditingAd={setEditingAd} setForm={setForm} setVideoFile={setVideoFile} t={t} videoFile={videoFile} aiLoading={aiLoading} handleGenerateDescription={handleGenerateDescription} isDarkMode={isDarkMode} user={user} setUser={setUser} />;



  // --- РЕНДЕР МОДАЛКИ ПРОФИЛЯ ---


  // --- РЕНДЕР ПАНЕЛИ АДМИНИСТРАТОРА ---
  const renderAdminScreen = () => <AdminScreen adminAnalytics={adminAnalytics} loadingAdminAnalytics={loadingAdminAnalytics} adminAnalyticsLoadError={adminAnalyticsLoadError} adminCatForm={adminCatForm} adminCoupons={adminCoupons} adminCouponsLoadError={adminCouponsLoadError} adminLoading={adminLoading} adminPendingAds={adminPendingAds} adminPendingAdsLoadError={adminPendingAdsLoadError} adminReportTab={adminReportTab} adminReports={adminReports} adminTab={adminTab} adminUserReports={adminUserReports} adminUserSearch={adminUserSearch} adminUsers={adminUsers} adminUsersLoadError={adminUsersLoadError} allAds={allAds} cancelCatEdit={cancelCatEdit} categoriesData={categoriesData} couponForm={couponForm} editingCatId={editingCatId} form={form} getImageUrl={getImageUrl} getImageUrls={getImageUrls} handleAdminChangeRole={handleAdminChangeRole} handleAdminDeleteUser={handleAdminDeleteUser} handleAdminVerifyUser={handleAdminVerifyUser} handleCreateCoupon={handleCreateCoupon} handleDeleteCoupon={handleDeleteCoupon} handleDeleteReport={handleDeleteReport} handleDeleteUserReport={handleDeleteUserReport} handleEditCategory={handleEditCategory} handleModerateAd={handleModerateAd} handleSaveCategory={handleSaveCategory} handleViewAd={handleViewAd} lang={lang} loadAdminAnalytics={loadAdminAnalytics} loadAdminReports={loadAdminReports} loadAdminUsers={loadAdminUsers} loadCoupons={loadCoupons} loadPendingAds={loadPendingAds} loadingAdminUsers={loadingAdminUsers} loadingCoupons={loadingCoupons} loadingPendingAds={loadingPendingAds} loadingReports={loadingReports} adminReportsLoadError={adminReportsLoadError} setAdminCatForm={setAdminCatForm} setAdminReportTab={setAdminReportTab} setAdminTab={setAdminTab} setAdminUserSearch={setAdminUserSearch} setCouponForm={setCouponForm} t={t} user={user} userRole={userRole} adminPayments={adminPayments} loadingAdminPayments={loadingAdminPayments} adminPaymentsLoadError={adminPaymentsLoadError} adminPaymentsPage={adminPaymentsPage} adminPaymentsLastPage={adminPaymentsLastPage} adminPaymentsTotal={adminPaymentsTotal} loadAdminPayments={loadAdminPayments} token={localStorage.getItem('auth_token')} />;

  // --- РЕНДЕР МОБИЛЬНОГО ТАБ-БАРА ---
  const renderTabBar = () => (
    <MobileTabBar
      currentTab={currentTab}
      getImageUrl={getImageUrl}
      handleLogout={handleLogout}
      location={location}
      mobileSearchInputRef={mobileSearchInputRef}
      navigate={navigate}
      setActiveCat={setActiveCat}
      setAuthMode={setAuthMode}
      setCurrentTab={setCurrentTab}
      setDashboardTab={setDashboardTab}
      setSearchQuery={setSearchQuery}
      setShowAuthModal={setShowAuthModal}
      setShowMobileLocationPicker={setShowMobileLocationPicker}
      setShowTabBarMenu={setShowTabBarMenu}
      setViewedAd={setViewedAd}
      setViewedCompany={setViewedCompany}
      showTabBarMenu={showTabBarMenu}
      t={t}
      unreadCount={unreadCount}
      user={user}
    />
  );

  return (
    <div className="w-full min-h-screen bg-[var(--paper)] font-sans text-[var(--ink)] selection:bg-[#84CC16]/20">

      {/* GLOBAL TOAST */}
      {appToast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all max-w-xs ${appToast.type === 'error' ? 'bg-red-500' : 'bg-[#25D366]'}`}>
          {appToast.message}
        </div>
      )}

      {/* EMAIL VERIFICATION BANNER */}
      {user && !user.account_verified && !emailBannerDismissed && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between text-sm z-50 relative">
          <span className="text-yellow-800">
            {emailBannerSent
              ? <>✅ {t.verification_email_sent} {user.email}. {t.verification_check_inbox}</>
              : <>⚠️ {t.verification_unverified_desc}{' '}
                  <button type="button" onClick={resendVerificationEmail} className="underline text-yellow-700 font-medium hover:text-yellow-900">{t.verification_resend_email}</button>
                </>
            }
          </span>
          <button type="button" aria-label={t.close} onClick={() => setEmailBannerDismissed(true)} className="ml-4 text-yellow-600 hover:text-yellow-900 font-bold text-base leading-none">✕</button>
        </div>
      )}

      {/* GLOBAL HEADER */}
      <AppHeader
        LANGUAGE_OPTIONS={LANGUAGE_OPTIONS}
        MEXICO_STATES_CITIES={MEXICO_STATES_CITIES}
        activeCat={activeCat}
        activeSub={activeSub}
        applyHeaderLocation={applyHeaderLocation}
        desktopSearchRef={desktopSearchRef}
        favoriteIds={favoriteIds}
        fetchSuggestions={fetchSuggestions}
        getImageUrl={getImageUrl}
        getSubcategoryOptions={getSubcategoryOptions}
        handleDeleteNotification={handleDeleteNotification}
        handleHeaderCategoryClick={handleHeaderCategoryClick}
        handleLogout={handleLogout}
        handleMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        handleMarkNotificationRead={handleMarkNotificationRead}
        handleSearchInputKeyDown={handleSearchInputKeyDown}
        handleSuggestionSelect={handleSuggestionSelect}
        headerCategories={headerCategories}
        highlightedIndex={highlightedIndex}
        isAdminRoute={isAdminRoute}
        isDarkMode={isDarkMode}
        isHeaderCategoryActive={isHeaderCategoryActive}
        lang={lang}
        locCity={locCity}
        locState={locState}
        mobileSearchInputRef={mobileSearchInputRef}
        mobileSearchRef={mobileSearchRef}
        navLabels={navLabels}
        navigate={navigate}
        notifications={notifications}
        radius={radius}
        recentSearches={recentSearches}
        searchLocation={searchLocation}
        searchLocationInput={searchLocationInput}
        searchQuery={searchQuery}
        setActiveCat={setActiveCat}
        setActiveSub={setActiveSub}
        setAuthMode={setAuthMode}
        setCurrentTab={setCurrentTab}
        setDashboardTab={setDashboardTab}
        setHighlightedIndex={setHighlightedIndex}
        setIsDarkMode={setIsDarkMode}
        setLang={setLang}
        setLocCity={setLocCity}
        setLocState={setLocState}
        setRadius={setRadius}
        setRecentSearches={setRecentSearches}
        setSearchQuery={setSearchQuery}
        setShowAuthModal={setShowAuthModal}
        setShowLocationPicker={setShowLocationPicker}
        setShowMobileLocationPicker={setShowMobileLocationPicker}
        setShowNotifications={setShowNotifications}
        setShowProfileMenu={setShowProfileMenu}
        setShowSuggestions={setShowSuggestions}
        setViewedAd={setViewedAd}
        setViewedCompany={setViewedCompany}
        showLocationPicker={showLocationPicker}
        showMobileLocationPicker={showMobileLocationPicker}
        showNotifications={showNotifications}
        showProfileMenu={showProfileMenu}
        showSuggestions={showSuggestions}
        submitHeaderSearch={submitHeaderSearch}
        suggestions={suggestions}
        t={t}
        unreadCount={unreadCount}
        user={user}
      />

      {/* MAIN CONTENT */}
      <main className="w-full">
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#84CC16]" /></div>}>
          {viewedAd ? (
            renderAdDetailScreen()
          ) : viewedCompany ? (
            renderStorefrontScreen()
          ) : (
            <Routes>
              <Route path="/" element={renderHomeRoute()} />
              <Route path="/login" element={<AuthEntryRoute mode="login" user={user} authReady={authReady} setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} tagline={t.ai_brand_tagline} />} />
              <Route path="/register" element={<AuthEntryRoute mode="register" user={user} authReady={authReady} setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} tagline={t.ai_brand_tagline} />} />
              <Route path="/publish" element={<Navigate to="/post" replace />} />
              <Route path="/account" element={<Navigate to="/profile" replace />} />
              <Route path="/account/listings" element={<Navigate to="/profile?tab=my_ads" replace />} />
              <Route path="/account/billing" element={<Navigate to="/profile?tab=transactions" replace />} />
              <Route path="/account/promotions" element={<Navigate to="/tarifas" replace />} />
              <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
              <Route path="/account/listing/:id/edit" element={<LegacyAccountListingRoute suffix="edit" />} />
              <Route path="/account/listing/:id/photos" element={<LegacyAccountListingRoute suffix="photos" />} />
              <Route path="/listings" element={renderCatalogScreen()} />
              <Route path="/vendedores" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><SellerLandingScreen lang={lang} /></React.Suspense>} />
              <Route path="/publicar-gratis" element={<Navigate to="/vendedores" replace />} />
              <Route path="/post" element={<RequireAuth user={user} authReady={authReady} setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal}>{renderPostScreen()}</RequireAuth>} />
              <Route path="/notificaciones" element={<RequireAuth user={user} authReady={authReady} setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal}><React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><NotificationsScreen user={user} t={t} lang={lang} /></React.Suspense></RequireAuth>} />
              <Route path="/mensajes" element={<RequireAuth user={user} authReady={authReady} setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal}><React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><ChatScreen user={user} lang={lang} t={t} /></React.Suspense></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth user={user} authReady={authReady} setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal}>{renderUserDashboard()}</RequireAuth>} />
              <Route path="/admin/marketing" element={<RequireAuth user={user} authReady={authReady} setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} admin><div data-testid="admin-marketing-route-anchor" className="min-h-screen bg-slate-100 dark:bg-slate-950" /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth user={user} authReady={authReady} setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} admin>{renderAdminScreen()}</RequireAuth>} />
              <Route path="/terms" element={<Navigate to="/terminos" replace />} />
              <Route path="/privacy" element={<Navigate to="/privacidad" replace />} />
              <Route path="/help" element={<Navigate to="/ayuda" replace />} />
              <Route path="/safety" element={<Navigate to="/seguridad" replace />} />
              <Route path="/vendedor/:id" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><SellerProfileScreen currentUser={user} /></React.Suspense>} />
              <Route path="/perfil/editar" element={<RequireAuth user={user} authReady={authReady} setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal}><React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><ProfileEditScreen smsEnabled={availableProviders.sms} /></React.Suspense></RequireAuth>} />
              <Route path="/anuncio/:id/editar" element={<RequireAuth user={user} authReady={authReady} setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal}><React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><EditAdScreen t={t} lang={lang} /></React.Suspense></RequireAuth>} />
              <Route path="/ads/:id" element={deepLinkAdMissing ? (
                <React.Suspense fallback={null}><NotFoundScreen /></React.Suspense>
              ) : deepLinkAdLoadError ? (
                <div data-testid="deep-link-ad-load-error" role="alert" className="flex h-screen flex-col items-center justify-center gap-4 p-10 text-center">
                  <p className="text-slate-500 dark:text-slate-300">{t.route_load_error || t.connection_error}</p>
                  <button type="button" data-testid="deep-link-ad-retry" onClick={() => setDeepLinkAdRetryNonce(value => value + 1)} className="btn-sm border border-[#84CC16]/50 bg-[#84CC16]/10 text-[#365314] hover:bg-[#84CC16]/20 dark:text-[#BEF264]">
                    {t.retry_btn}
                  </button>
                </div>
              ) : <div data-testid="deep-link-ad-loading" role="status" className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>} />
              <Route path="/anuncio/:id" element={deepLinkAdMissing ? (
                <React.Suspense fallback={null}><NotFoundScreen /></React.Suspense>
              ) : deepLinkAdLoadError ? (
                <div data-testid="deep-link-ad-load-error" role="alert" className="flex h-screen flex-col items-center justify-center gap-4 p-10 text-center">
                  <p className="text-slate-500 dark:text-slate-300">{t.route_load_error || t.connection_error}</p>
                  <button type="button" data-testid="deep-link-ad-retry" onClick={() => setDeepLinkAdRetryNonce(value => value + 1)} className="btn-sm border border-[#84CC16]/50 bg-[#84CC16]/10 text-[#365314] hover:bg-[#84CC16]/20 dark:text-[#BEF264]">
                    {t.retry_btn}
                  </button>
                </div>
              ) : <div data-testid="deep-link-ad-loading" role="status" className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>} />
              <Route path="/motor" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><AutosLanding lang={lang} /></React.Suspense>} />
              <Route path="/autos" element={<Navigate to="/motor" replace />} />
              <Route path="/inmuebles" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><InmueblesLanding lang={lang} /></React.Suspense>} />
              <Route path="/empleos" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><EmpleosLanding lang={lang} /></React.Suspense>} />
              <Route path="/servicios" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><ServiciosLanding lang={lang} /></React.Suspense>} />
              <Route path="/productos" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><ProductosLanding lang={lang} /></React.Suspense>} />
              <Route path="/turismo" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><TurismoLanding lang={lang} /></React.Suspense>} />
              {['electronica', 'moda', 'hogar', 'tecnologia', 'telefonos', 'mascotas', 'infantil', 'negocios', 'ocio', 'boletos', 'hospedaje', 'tours', 'boletos_turismo', 'articulos_camping', 'souvenirs', 'renta_vehiculos', 'guias_servicios', 'atracciones_exp', 'retiros_bienestar'].map(category => (
                <Route key={category} path={`/${category}`} element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><CategoryLanding category={category} lang={lang} /></React.Suspense>} />
              ))}
              <Route path="/informatica" element={<Navigate to="/tecnologia" replace />} />
              <Route path="/telefonia" element={<Navigate to="/telefonos" replace />} />
              <Route path="/terminos" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><TerminosScreen /></React.Suspense>} />
  <Route path="/privacidad" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><PrivacidadScreen /></React.Suspense>} />
  <Route path="/cookies" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><CookiesScreen /></React.Suspense>} />
  <Route path="/acerca-de" element={<Navigate to="/sobre-mercasto" replace />} />
  <Route path="/tiendas" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><StoresScreen /></React.Suspense>} />
  <Route path="/contacto"  element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><ContactoScreen  /></React.Suspense>} />
  <Route path="/como-funciona" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><GeoSourcePage slug="como-funciona" /></React.Suspense>} />
  <Route path="/seguridad" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><GeoSourcePage slug="seguridad" /></React.Suspense>} />
  <Route path="/ayuda/publicar-anuncio" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><GeoSourcePage slug="ayuda/publicar-anuncio" /></React.Suspense>} />
  <Route path="/ayuda/comprar-y-contactar" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><GeoSourcePage slug="ayuda/comprar-y-contactar" /></React.Suspense>} />
  <Route path="/tarifas" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><GeoSourcePage slug="tarifas" /></React.Suspense>} />
  <Route path="/sobre-mercasto" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><GeoSourcePage slug="sobre-mercasto" /></React.Suspense>} />
  <Route path="/ayuda"     element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><AyudaScreen     /></React.Suspense>} />
  <Route path="/verificar-email" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><VerificarEmailScreen /></React.Suspense>} />
  <Route path="/referidos" element={<RequireAuth user={user} authReady={authReady} setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal}><React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><ReferralScreen t={t} lang={lang} /></React.Suspense></RequireAuth>} />
  <Route path="/r/:code" element={<ReferralRedirect />} />
  <Route path="*" element={<React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-lime-500 border-t-transparent animate-spin"/></div>}><NotFoundScreen /></React.Suspense>} />

            </Routes>
          )}
        </Suspense>
      </main>

      {/* FOOTER */}
      <AppFooter
        navigate={navigate}
        setActiveCat={setActiveCat}
        setCurrentTab={setCurrentTab}
        setDashboardTab={setDashboardTab}
        setSearchQuery={setSearchQuery}
        setShowAuthModal={setShowAuthModal}
        setViewedAd={setViewedAd}
        t={t}
        user={user}
      />

      {!viewedAd && currentTab !== 'post' && renderTabBar()}
      {showPricingModal && <React.Suspense fallback={null}><PricingModal customCreditsAmount={customCreditsAmount} handleClipPayment={handleClipPayment} handleCreditsPayment={handleCreditsPayment} handlePromotionProductPayment={handlePromotionProductPayment} lang={lang} localizedText={localizedText} priceTab={priceTab} promotableAds={promotableAds} promotionTargetAdId={promotionTargetAdId} setCustomCreditsAmount={setCustomCreditsAmount} setPriceTab={setPriceTab} setPromotionTargetAdId={setPromotionTargetAdId} setShowPricingModal={setShowPricingModal} showPricingModal={showPricingModal} t={t} user={user} /></React.Suspense>}
      {showProfileModal && <React.Suspense fallback={null}><ProfileModal handleProfileSubmit={handleProfileSubmit} profileForm={profileForm} profileLoading={profileLoading} setProfileForm={setProfileForm} setShowProfileModal={setShowProfileModal} showProfileModal={showProfileModal} t={t} /></React.Suspense>}
      {showCouponModal && <React.Suspense fallback={null}><CouponModal couponInput={couponInput} handleRedeemCoupon={handleRedeemCoupon} setCouponInput={setCouponInput} setShowCouponModal={setShowCouponModal} showCouponModal={showCouponModal} t={t} /></React.Suspense>}
      {qrModalData && <React.Suspense fallback={null}><QRModal qrModalData={qrModalData} setQrModalData={setQrModalData} t={t} /></React.Suspense>}
      {showReportModal && <React.Suspense fallback={null}><ReportModal handleReportAd={handleReportAd} reportForm={reportForm} setReportForm={setReportForm} setShowReportModal={setShowReportModal} showReportModal={showReportModal} t={t} /></React.Suspense>}
      {showUserReportModal && <React.Suspense fallback={null}><UserReportModal handleUserReportSubmit={handleUserReportSubmit} setShowUserReportModal={setShowUserReportModal} setUserReportForm={setUserReportForm} showUserReportModal={showUserReportModal} t={t} userReportForm={userReportForm} /></React.Suspense>}
      {showAiModal && user?.role === 'admin' && (
        <Suspense fallback={null}>
          <AiCommandModal
            lang={lang}
            closeLabel={t.close_btn || t.close}
            aiAgentType={aiAgentType}
            setAiAgentType={setAiAgentType}
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
            aiResult={aiResult}
            setAiResult={setAiResult}
            isAiProcessing={isAiProcessing}
            onSubmit={handleAiSubmit}
            onClose={() => setShowAiModal(false)}
          />
        </Suspense>
      )}

      {/* AI COMMAND CENTER FLOATING BUTTON (ADMIN ONLY) */}
      {ENABLE_AI_PANEL && user?.role === 'admin' && !viewedAd && !viewedCompany && (
        <button onClick={() => setShowAiModal(true)} className="fixed bottom-24 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center justify-center hover:bg-indigo-500 transition-all hover:scale-110 z-50 group">
          <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
        </button>
      )}

      <BuyerConversionNudge
        user={user}
        authModalOpen={showAuthModal}
        pathname={location.pathname}
        language={lang}
        onRegister={() => {
          setAuthMode('register');
          setShowAuthModal(true);
        }}
      />

      {/* ONBOARDING MODAL */}
      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingModal
            user={user}
            t={t}
            lang={lang}
            smsEnabled={availableProviders.sms}
            onClose={() => setShowOnboarding(false)}
          />
        </Suspense>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onKeyDown={handleAuthModalKeyDown}>
          <div data-pointer-dismiss-surface aria-hidden="true" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { if (!authLoading) setShowAuthModal(false); }} />
          {requiresTwoFactor ? (
            <div ref={authModalDialogRef} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-full max-w-sm rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95">
              <button type="button" aria-label={t.close_btn} disabled={authLoading} onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50"><XCircle size={24}/></button>
              <h2 id="auth-modal-title" className="text-[22px] font-bold tracking-tight mb-3 text-center text-slate-900 dark:text-white">{t.auth_two_factor_title}</h2>
              <p data-testid="auth-modal-ai-brand-message" className="mx-auto mb-5 max-w-[17rem] rounded-2xl bg-lime-50 px-3 py-2 text-center text-[11px] font-extrabold leading-snug text-lime-800 dark:bg-lime-500/10 dark:text-lime-300">
                {t.ai_brand_tagline}
              </p>
              <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-6">{t.auth_two_factor_desc}</p>
              <form onSubmit={handleTwoFactorSubmit} className="space-y-3.5">
                <input name="code" aria-label={t.auth_two_factor_placeholder} required autoFocus placeholder={t.auth_two_factor_placeholder} maxLength="32" className="w-full text-center tracking-[0.2em] px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"/>
                <div className="pt-2">
                  <button type="submit" disabled={authLoading} className="btn-lg w-full bg-[#84CC16] text-slate-950 hover:bg-[#65A30D] flex items-center justify-center">
                    {authLoading ? <Loader2 className="animate-spin" size={20}/> : t.auth_two_factor_verify}
                  </button>
                </div>
              </form>
            </div>
          ) : authMode === 'phone_request' || authMode === 'phone_verify' ? (
            <div ref={authModalDialogRef} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-full max-w-sm rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95">
              <button type="button" aria-label={t.close_btn} onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><XCircle size={24}/></button>
              <h2 id="auth-modal-title" className="text-[22px] font-bold tracking-tight mb-3 text-center text-slate-900 dark:text-white">{t.auth_phone_title}</h2>
              <p data-testid="auth-modal-ai-brand-message" className="mx-auto mb-5 max-w-[17rem] rounded-2xl bg-lime-50 px-3 py-2 text-center text-[11px] font-extrabold leading-snug text-lime-800 dark:bg-lime-500/10 dark:text-lime-300">
                {t.ai_brand_tagline}
              </p>

              {authMode === 'phone_request' ? (
                <form onSubmit={handlePhoneRequestSubmit} className="space-y-3.5">
                  <input name="phone_number" aria-label={t.auth_phone_placeholder} required type="tel" placeholder={t.auth_phone_placeholder} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"/>
                  <button type="submit" disabled={authLoading} className="btn-lg w-full bg-[#0F172A] text-white hover:bg-black flex items-center justify-center mt-2">{authLoading ? <Loader2 className="animate-spin" size={20}/> : t.auth_sms_receive}</button>
                </form>
              ) : (
                <form onSubmit={handlePhoneVerifySubmit} className="space-y-3.5">
                  <p className="text-center text-slate-500 dark:text-slate-400 text-[13px] -mt-2 mb-4">{t.auth_code_sent_to} <br/><strong>{authPhone}</strong></p>
                  <input name="code" aria-label={t.auth_code_placeholder} required autoFocus placeholder={t.auth_code_placeholder} maxLength="6" className="w-full text-center tracking-[0.5em] px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"/>
                  <button type="submit" disabled={authLoading} className="btn-lg w-full bg-[#84CC16] text-slate-950 hover:bg-[#65A30D] flex items-center justify-center mt-2">{authLoading ? <Loader2 className="animate-spin" size={20}/> : t.auth_phone_verify}</button>
                </form>
              )}
              <div className="mt-6 text-center">
                 <button type="button" onClick={() => setAuthMode('login')} className="text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-[#84CC16] transition-colors underline underline-offset-4">{t.auth_back_to_login}</button>
              </div>
            </div>
          ) : (
            <div ref={authModalDialogRef} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-full max-w-sm rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95">
                <button type="button" aria-label={t.close_btn} onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><XCircle size={24}/></button>
                <h2 id="auth-modal-title" className="text-[22px] font-bold tracking-tight mb-3 text-center text-slate-900 dark:text-white">
                  {authMode === 'login' ? t.login : authMode === 'register' ? t.register : authMode === 'forgot_password' ? t.forgot_password : t.reset_password}
                </h2>
                <p data-testid="auth-modal-ai-brand-message" className="mx-auto mb-5 max-w-[17rem] rounded-2xl bg-lime-50 px-3 py-2 text-center text-[11px] font-extrabold leading-snug text-lime-800 dark:bg-lime-500/10 dark:text-lime-300">
                  {t.ai_brand_tagline}
                </p>
                {authMode === 'register' && localStorage.getItem('pendingReferral') && (
                  <div className="bg-lime-50 border border-lime-200 rounded-2xl px-4 py-3 mb-2 flex items-center gap-2 text-sm text-lime-800 dark:bg-lime-900/20 dark:border-lime-400/30 dark:text-lime-300">
                    <span className="text-lg">🎁</span>
                    <span><strong>{t.auth_invited_title}</strong> {t.auth_invited_desc}</span>
                  </div>
                )}
                <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                    {authMode === 'register' && <input name="name" aria-label={t.name} required placeholder={t.name} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"/>}
                    {authMode !== 'reset_password' && <input name="email" aria-label={t.email} type="email" required placeholder={t.email} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"/>}
                    {(authMode === 'login' || authMode === 'register') && <input name="password" aria-label={t.password} type="password" required placeholder={t.password} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"/>}
                    {authMode === 'register' && (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 px-3.5 py-3">
                        <label className="flex items-start gap-3 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300 cursor-pointer">
                          <input
                            name="age_confirmed"
                            type="checkbox"
                            required
                            checked={registrationConsentAccepted}
                            onChange={(event) => setRegistrationConsentAccepted(event.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-[#84CC16]"
                          />
                          <span>
                            {t.registration_legal_consent || 'Confirmo que tengo al menos 18 años y acepto los términos y el aviso de privacidad.'}
                          </span>
                        </label>
                        <div className="mt-2 ml-7 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-semibold">
                          <a href="/terms" target="_blank" rel="noreferrer" className="text-[#65A30D] hover:underline">
                            {t.terms_of_use || 'Términos de uso'}
                          </a>
                          <a href="/privacy" target="_blank" rel="noreferrer" className="text-[#65A30D] hover:underline">
                            {t.privacy_policy || 'Aviso de Privacidad'}
                          </a>
                        </div>
                      </div>
                    )}
                    {authMode === 'reset_password' && (
                      <>
                        <input name="password" aria-label={t.new_password} type="password" required minLength="8" placeholder={t.new_password} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"/>
                        <input name="password_confirmation" aria-label={t.conf_password || 'Confirmar nueva contraseña'} type="password" required minLength="8" placeholder={t.conf_password || 'Confirmar nueva contraseña'} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"/>
                      </>
                    )}
                    <div className="pt-2">
                      <button type="submit" disabled={authLoading} className="btn-lg w-full bg-[#84CC16] text-slate-950 hover:bg-[#65A30D] flex items-center justify-center">
                          {authLoading ? <Loader2 className="animate-spin" size={20}/> : (authMode === 'login' ? t.login : authMode === 'register' ? t.register : authMode === 'forgot_password' ? t.send_link : t.reset_password)}
                      </button>
                    </div>
                </form>

                {(authMode === 'login' || authMode === 'register') && (
                  <>
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
                      <div className="relative flex justify-center text-[12px]"><span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-medium">{t.auth_or}</span></div>
                    </div>

                    <div className="space-y-2.5">
                      {availableProviders?.google && (
                        <button type="button" onClick={() => handleOAuthStart('google')} className="btn-md w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-3">
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google
                        </button>
                      )}
                      {availableProviders?.sms && (
                        <button type="button" onClick={handlePhoneAuthStart} className="btn-md w-full bg-[#10B981] text-white hover:bg-[#059669] flex items-center justify-center gap-3">
                            <Phone className="w-4 h-4" />
                            {t.auth_phone_sms}
                        </button>
                      )}

                      {availableProviders?.twitter && (
                      <button type="button" onClick={() => handleOAuthStart('twitter')} className="btn-md w-full bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          X (Twitter)
                      </button>
                      )}
                      {availableProviders?.telegram && (
                      <button type="button" onClick={() => {
                        const isRegistration = authMode === 'register';
                        const registrationConsent = isRegistration
                          ? registrationConsentForAction()
                          : null;
                        if (isRegistration && !registrationConsent) return;
                        // Telegram Login Widget — открываем popup авторизации
                        const botId = availableProviders?.telegram_bot_id || '8607696679';
                        const callbackUrl = `${API_URL}/auth/telegram/callback`;
                        window.TelegramLoginCallback = async (tgUser) => {
                          try {
                            const res = await fetch(`${API_URL}/auth/telegram/callback`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                ...tgUser,
                                ...(registrationConsent || {}),
                              })
                            });
                            const data = await res.json();
                            if (data.token && data.user) {
                              localStorage.setItem('auth_token', data.token);
                              setUser(data.user);
                              setUserRole(data.user.role || 'individual');
                              localStorage.setItem('user', JSON.stringify(data.user));
                              if (data.is_new_user && data.registration_event_id) {
                                localStorage.setItem('just_registered', '1');
                                events.registered({
                                  event_id: data.registration_event_id,
                                  meta_event_id: data.registration_event_id,
                                  method: data.registration_method || 'telegram',
                                });
                              }
                              setShowAuthModal(false);
                              showToast(t.auth_welcome_toast);
                            } else if (data.requires_2fa) {
                              setTwoFactorEmail(data.email);
                              setRequiresTwoFactor(true);
                              setAuthMode('login');
                            } else {
                              showToast(data.error || t.auth_telegram_error, 'error');
                            }
                          } catch (e) {
                            showToast(t.auth_telegram_connection_error, 'error');
                          }
                        };
                        // Открываем авторизационный popup Telegram
                        const popup = window.open(
                          `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${encodeURIComponent(window.location.origin)}&request_access=write`,

                          'telegram_auth',
                          'width=550,height=470,scrollbars=yes'
                        );
                        // Слушаем сообщение от popup
                        const listener = (event) => {
                          const allowedOrigins = ['https://oauth.telegram.org', 'https://oauth.tg.org'];
                          if (!allowedOrigins.includes(event.origin)) return;

                          let data = event.data;
                          if (typeof data === 'string') {
                            try {
                              data = JSON.parse(data);
                            } catch (e) {
                              return;
                            }
                          }

                          if (data?.event === 'auth_result' && data?.result) {
                            window.removeEventListener('message', listener);
                            window.TelegramLoginCallback(data.result);
                          }
                        };
                        window.addEventListener('message', listener);
                      }} className="btn-md w-full bg-[#229ED9] text-white hover:bg-[#1c88ba] flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.535.223l.188-2.85 5.18-4.686c.223-.195-.054-.31-.35-.11l-6.4 4.02-2.76-.89c-.6-.188-.614-.6.126-.89L17.2 7.15c.523-.188.983.118.694 1.07z"/>
                          </svg>
                          Telegram
                      </button>
                      )}
                    </div>
                  </>
                )}

                <div className="mt-6 text-center flex flex-col gap-2.5">
                    {(authMode === 'login' || authMode === 'register') && (
                        <button type="button" onClick={() => {
                          const nextMode = authMode === 'login' ? 'register' : 'login';
                          setAuthMode(nextMode);
                          if (nextMode === 'login') setRegistrationConsentAccepted(false);
                        }} className="text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-[#84CC16] transition-colors underline underline-offset-4">
                            {authMode === 'login' ? t.auth_no_account_join : t.auth_have_account}
                        </button>
                    )}
                    {authMode === 'login' && (
                        <button type="button" onClick={() => setAuthMode('forgot_password')} className="text-[12px] font-medium text-slate-400 hover:text-[#84CC16] transition-colors">
                            {t.forgot_password}
                        </button>
                    )}
                    {(authMode === 'forgot_password' || authMode === 'reset_password' || authMode === 'phone_request' || authMode === 'phone_verify') && (
                        <button type="button" onClick={() => setAuthMode('login')} className="text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-[#84CC16] transition-colors underline underline-offset-4">
                            {t.auth_back_to_login}
                        </button>
                    )}
                </div>
            </div>
          )}
        </div>
      )}

      <Suspense fallback={null}>
        <CookieBanner t={t} lang={lang} />
      </Suspense>
    </div>
  );
}
