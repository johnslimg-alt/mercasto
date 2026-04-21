import React, { useState, useMemo, useEffect, useCallback, useRef, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { translations } from './constants/mockData';
import ChartTooltip from './components/common/ChartTooltip';
import AdSenseBanner from './components/common/AdSenseBanner';
import { 
  Search, Home, PlusCircle, User, Users, Settings, Shield, 
  MapPin, ChevronRight, ChevronLeft, Heart, SlidersHorizontal,
  CheckCircle, XCircle, BarChart3, LogOut, Globe, Sparkles, Loader2, Play, Video, Phone, AlertTriangle, Activity,
  Car, Briefcase, Wrench, Monitor, Smartphone, Sofa, Shirt, Baby, PawPrint, Bike, Ticket, Pencil, Moon, Sun, BadgeCheck,
  Star, Zap, Building2, Crown, Store, TrendingUp, UploadCloud, Cpu, ShieldCheck, Camera, Trash2, Download, PieChart as PieChartIcon, QrCode, Share2, Bell
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import echo from './echo';

// --- ЛОГОТИП И ИКОНКИ ---
const MercastoLogo = ({ className = "h-11" }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    {/* Новый лаконичный логотип: Буква "M" внутри геолокационного пина */}
    <svg viewBox="0 0 100 100" className="h-full w-auto drop-shadow-md">
      <path d="M50 5 C27.9 5 10 22.9 10 45 C10 75 50 95 50 95 C50 95 90 75 90 45 C90 22.9 72.1 5 50 5 Z" fill="#84CC16" />
      <path d="M30 60 L30 35 L50 50 L70 35 L70 60" fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <div className="flex flex-col justify-center">
      <span className="font-sans text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight">Mercasto</span>
      <span className="text-[7.5px] font-bold text-[#65A30D] uppercase tracking-widest leading-none mt-1">Marketplace</span>
    </div>
  </div>
);

// --- КАРТА ИКОНОК ---
const IconMap = { Car, Home, Briefcase, Wrench, Monitor, Smartphone, Sofa, Shirt, Baby, PawPrint, Bike, Ticket, Star, Store, Activity, Cpu };

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'https://mercasto.com/storage';

const getImageUrl = (path, fallback = null) => {
  if (!path) return fallback || 'https://placehold.co/600x400?text=No+Image';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  if (path.startsWith('[')) {
    try {
      const arr = JSON.parse(path);
      if (arr && arr.length > 0) return `${STORAGE_URL}/${arr[0]}`;
    } catch (e) {}
  }
  return `${STORAGE_URL}/${path}`;
};

const getImageUrls = (pathStr, fallbackArr = []) => {
  if (!pathStr) return fallbackArr;
  try {
    const arr = JSON.parse(pathStr);
    if (Array.isArray(arr)) return arr.map(p => p.startsWith('http') || p.startsWith('data:') ? p : `${STORAGE_URL}/${p}`);
  } catch(e) {}
  return [getImageUrl(pathStr)];
};

// База данных всех Штатов и основных Городов Мексики
const MEXICO_STATES_CITIES = {
  "Aguascalientes": ["Aguascalientes", "Jesús María", "Calvillo", "Rincón de Romos"],
  "Baja California": ["Tijuana", "Mexicali", "Ensenada", "Playas de Rosarito", "Tecate"],
  "Baja California Sur": ["La Paz", "Cabo San Lucas", "San José del Cabo", "Loreto"],
  "Campeche": ["Campeche", "Ciudad del Carmen", "Champotón", "Escárcega"],
  "Chiapas": ["Tuxtla Gutiérrez", "Tapachula", "San Cristóbal de las Casas", "Comitán"],
  "Chihuahua": ["Chihuahua", "Ciudad Juárez", "Delicias", "Hidalgo del Parral", "Cuauhtémoc"],
  "Ciudad de México": ["Álvaro Obregón", "Azcapotzalco", "Benito Juárez", "Coyoacán", "Cuauhtémoc", "Gustavo A. Madero", "Iztapalapa", "Miguel Hidalgo", "Tlalpan", "Xochimilco"],
  "Coahuila": ["Saltillo", "Torreón", "Monclova", "Piedras Negras", "Acuña"],
  "Colima": ["Colima", "Manzanillo", "Tecomán", "Villa de Álvarez"],
  "Durango": ["Durango", "Gómez Palacio", "Lerdo", "Santiago Papasquiaro"],
  "Estado de México": ["Toluca", "Ecatepec", "Naucalpan", "Tlalnepantla", "Nezahualcóyotl", "Metepec", "Huixquilucan", "Cuautitlán Izcalli", "Chalco"],
  "Guanajuato": ["León", "Irapuato", "Celaya", "Guanajuato", "San Miguel de Allende", "Salamanca"],
  "Guerrero": ["Acapulco", "Chilpancingo", "Zihuatanejo", "Iguala", "Taxco"],
  "Hidalgo": ["Pachuca", "Tulancingo", "Tula de Allende", "Tizayuca"],
  "Jalisco": ["Guadalajara", "Zapopan", "Tlaquepaque", "Tonalá", "Puerto Vallarta", "Tlajomulco de Zúñiga", "Lagos de Moreno"],
  "Michoacán": ["Morelia", "Uruapan", "Zamora", "Lázaro Cárdenas", "Zitácuaro"],
  "Morelos": ["Cuernavaca", "Jiutepec", "Cuautla", "Temixco"],
  "Nayarit": ["Tepic", "Bahía de Banderas", "Compostela", "Santiago Ixcuintla"],
  "Nuevo León": ["Monterrey", "Apodaca", "Guadalupe", "San Nicolás de los Garza", "San Pedro Garza García", "Santa Catarina", "General Escobedo"],
  "Oaxaca": ["Oaxaca de Juárez", "Salina Cruz", "Juchitán de Zaragoza", "San Juan Bautista Tuxtepec", "Puerto Escondido"],
  "Puebla": ["Puebla", "Tehuacán", "San Pedro Cholula", "San Andrés Cholula", "Atlixco"],
  "Querétaro": ["Santiago de Querétaro", "San Juan del Río", "Corregidora", "El Marqués"],
  "Quintana Roo": ["Cancún", "Playa del Carmen", "Chetumal", "Cozumel", "Tulum"],
  "San Luis Potosí": ["San Luis Potosí", "Ciudad Valles", "Matehuala", "Rioverde"],
  "Sinaloa": ["Culiacán", "Mazatlán", "Los Mochis", "Guasave", "Navolato"],
  "Sonora": ["Hermosillo", "Ciudad Obregón", "Nogales", "San Luis Río Colorado", "Guaymas", "Navojoa"],
  "Tabasco": ["Villahermosa", "Cárdenas", "Comalcalco", "Macuspana"],
  "Tamaulipas": ["Tampico", "Reynosa", "Matamoros", "Nuevo Laredo", "Ciudad Victoria", "Ciudad Madero"],
  "Tlaxcala": ["Tlaxcala", "Apizaco", "Huamantla", "Chiautempan"],
  "Veracruz": ["Veracruz", "Xalapa", "Coatzacoalcos", "Poza Rica", "Boca del Río", "Córdoba", "Orizaba", "Minatitlán"],
  "Yucatán": ["Mérida", "Kanasín", "Valladolid", "Progreso", "Tizimín"],
  "Zacatecas": ["Zacatecas", "Fresnillo", "Guadalupe", "Jerez"]
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

// Утилита для безопасной конвертации VAPID-ключей Web Push
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const MediaSlider = ({ media, autoplay }) => {
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
        <img src={media[currentIndex].url} className="max-w-full max-h-full object-contain shadow-sm" />
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

const AdminScreen = React.lazy(() => import('./components/screens/AdminScreen'));

const HomeScreen = React.lazy(() => import('./components/screens/HomeScreen'));

const PostScreen = React.lazy(() => import('./components/screens/PostScreen'));

const UserDashboard = React.lazy(() => import('./components/screens/UserDashboard'));

// Безопасный импорт экранов (если файл не найден, React не выдаст белый экран, а покажет заглушку)
const AdDetailScreen = React.lazy(() => import('./components/screens/AdDetailScreen').catch(() => ({ default: () => <div className="flex h-screen items-center justify-center p-10 text-center mt-20 text-slate-500">Ad Detail Screen - En construcción</div> })));
const StorefrontScreen = React.lazy(() => import('./components/screens/StorefrontScreen').catch(() => ({ default: () => <div className="flex h-screen items-center justify-center p-10 text-center mt-20 text-slate-500">Storefront - En construcción</div> })));
const StaticPages = React.lazy(() => import('./components/screens/StaticPages').catch(() => ({ default: ({currentTab}) => <div className="flex h-screen items-center justify-center p-10 text-center mt-20 text-2xl font-bold capitalize text-slate-400">{currentTab} - Página en construcción</div> })));

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = location.pathname.split('/')[1] || 'home';

  // Защита от Prototype Pollution (WSOD Crash): проверяем, что язык действительно существует в словаре
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('lang');
    return Object.keys(translations).includes(saved) ? saved : 'es';
  });
  const t = translations[lang] || translations['es'];

  const [serverAds, setServerAds] = useState([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [activeCat, setActiveCat] = useState(''); // Фильтр по категории
  
  // Состояния для динамической фильтрации (EAV JSON)
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [conditionFilter, setConditionFilter] = useState([]);
  const [dynamicFilters, setDynamicFilters] = useState({});
  
  const [viewedAd, setViewedAd] = useState(null); 
  const [viewedCompany, setViewedCompany] = useState(null);
  const [companyAds, setCompanyAds] = useState([]);
  const [loadingCompanyAds, setLoadingCompanyAds] = useState(false);
  const [companyReviews, setCompanyReviews] = useState([]);
  const [companyRatingStats, setCompanyRatingStats] = useState({ average: 0, total: 0 });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // Защита от фатального "Белого экрана смерти" (WSOD) при повреждении localStorage
  const getSafeUser = () => {
    try { return JSON.parse(localStorage.getItem('user')) || null; } 
    catch (e) { localStorage.removeItem('user'); return null; }
  };
  const [user, setUser] = useState(getSafeUser()); 
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [resetToken, setResetToken] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorChallengeToken, setTwoFactorChallengeToken] = useState('');

  const [accountType, setAccountType] = useState('particular');
  const [userRole, setUserRole] = useState('admin');
  
  const [form, setForm] = useState({ title: '', price: '', description: '', location: '', category: '', condition: 'nuevo', attributes: {} });
  const [debouncedLocation, setDebouncedLocation] = useState('');
  const [isMapUpdating, setIsMapUpdating] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [images, setImages] = useState([]); // { source: 'new' | 'existing', file?: File, url?: string, preview: string }
  const [videoFile, setVideoFile] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [priceTab, setPriceTab] = useState(accountType); 
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [analyticsDays, setAnalyticsDays] = useState(7);
  const [dashboardPage, setDashboardPage] = useState(1);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [availableProviders, setAvailableProviders] = useState({ google: false, apple: false, telegram: false });
  const [mapsApiKey, setMapsApiKey] = useState('');

  const setCurrentTab = useCallback((tab) => {
    // FIX: Memory Leak. При уходе со страницы создания/редактирования объявления очищаем временные URL-объекты
    if (currentTab === 'post' && tab !== 'post') {
        images.forEach(img => {
            if (img.source === 'new' && img.preview) {
                URL.revokeObjectURL(img.preview);
            }
        });
        // Также сбрасываем состояние формы, чтобы не показывать "протухшие" данные
        setImages([]);
        setVideoFile(null);
        setEditingAd(null);
        setForm({ title: '', price: '', description: '', location: '', category: '', condition: 'nuevo', attributes: {} });
    }

    if (tab === 'home') navigate('/'); else navigate(`/${tab}`);
  }, [navigate, currentTab, images]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api'}/auth/providers`)
      .then(res => res.json())
      .then(data => {
        // Normalize: live server returns { providers: { apple: { enabled: bool } } }
        // Our new route returns { apple: bool } — handle both shapes
        const p = data?.providers ?? data;
        setAvailableProviders({
          google:   p?.google?.enabled  ?? p?.google  ?? false,
          apple:    p?.apple?.enabled   ?? p?.apple   ?? false,
          telegram: p?.telegram?.enabled ?? p?.telegram ?? false,
        });
        setMapsApiKey(data?.maps_api_key || '');
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
  const [sliderAutoplay, setSliderAutoplay] = useState(() => localStorage.getItem('sliderAutoplay') !== 'false');
  const [notificationsForm, setNotificationsForm] = useState({ email_alerts: true, push_notifications: true, marketing: false });
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userAds, setUserAds] = useState([]);
  const [favoriteAds, setFavoriteAds] = useState([]);
  const [categoriesData, setCategoriesData] = useState([]);
  const [adminCatForm, setAdminCatForm] = useState({ slug: '', name_es: '', name_en: '', icon: 'Star', sort_order: 100 });
  const [adminLoading, setAdminLoading] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [dashboardTab, setDashboardTab] = useState('my_ads');
  const [adminTab, setAdminTab] = useState('categories');
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [adminPendingAds, setAdminPendingAds] = useState([]);
  const [loadingPendingAds, setLoadingPendingAds] = useState(false);
  const [adminCoupons, setAdminCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({ code: '', credits: 100, max_uses: 10 });
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingAd, setReportingAd] = useState(null);
  const [reportForm, setReportForm] = useState({ reason: '', comments: '' });
  const [adminReports, setAdminReports] = useState([]);
  const [adminUserReports, setAdminUserReports] = useState([]);
  const [adminReportTab, setAdminReportTab] = useState('ads');
  const [showUserReportModal, setShowUserReportModal] = useState(false);
  const [userReportForm, setUserReportForm] = useState({ reason: '', comments: '' });
  const [authPhone, setAuthPhone] = useState('');
  const [loadingReports, setLoadingReports] = useState(false);
  const [radius, setRadius] = useState(50);
  const [searchLocation, setSearchLocation] = useState(null); // { lat, lng, name }
  const [searchLocationInput, setSearchLocationInput] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showMobileLocationPicker, setShowMobileLocationPicker] = useState(false);
  const [locState, setLocState] = useState('');
  const [locCity, setLocCity] = useState('');
  const desktopLocationInputRef = useRef(null);
  const mobileLocationInputRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedLocInput, setDebouncedLocInput] = useState('');
  
  // FIX: Функция executeSearch отсутствовала, что приводило к фатальному сбою (WSOD) при нажатии Enter
  const executeSearch = useCallback((overrideSearch = null, overrideLoc = null) => {
    setDebouncedSearch(typeof overrideSearch === 'string' ? overrideSearch : searchQuery);
    setDebouncedLocInput(typeof overrideLoc === 'string' ? overrideLoc : searchLocationInput);
    setCurrentTab('home');
    setViewedAd(null);
    setViewedCompany(null);
  }, [searchQuery, searchLocationInput, setCurrentTab]);

  // Защита от логических сбоев UI: сбрасываем специфичные для категории фильтры (ОЗУ, двигатель) при смене самой категории
  useEffect(() => {
    setDynamicFilters({});
  }, [activeCat]);

  // FIX: Performance. Оптимизация рендеринга карточек, чтобы избежать создания сотен лишних функций при скролле
  const handleAdImageLoad = useCallback((e) => {
    e.target.classList.remove('opacity-0');
    if (e.target.parentElement) {
      e.target.parentElement.classList.remove('bg-slate-200', 'dark:bg-slate-800');
    }
  }, []);

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
      }, 300); // Ждем окончания анимации закрытия
      return () => clearTimeout(timer);
    }
  }, [showAuthModal]);

  const PUBLIC_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BAhZDxk3BjI_OCkHCOEyihsxsuCfcDtMilUZjMfecw-Lt4JvHNfYkmZIU_llDiaF3L0uOtXsgU60IZksmtpTrIs';
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
  
  // --- СОСТОЯНИЕ ТЕМНОЙ ТЕМЫ ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [qrModalData, setQrModalData] = useState(null);
  const fileInputRef = useRef(null);
  const [adStatusFilter, setAdStatusFilter] = useState('active');
  const [companyForm, setCompanyForm] = useState({
    name: user?.name || 'AutoMotors México S.A.',
    description: 'Somos una agencia de autos seminuevos certificados con más de 10 años de experiencia en el mercado...',
    website: 'https://automotors.mx',
    phone: user?.phone_number || '+52 322 123 4567',
    address: 'Av. Insurgentes Sur 1234, Ciudad de México',
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
      } else alert('Error al obtener datos del backend');
    } catch (err) { console.error("Export error", err); alert('Error de conexión'); }
  };

  // --- ПЕРЕХВАТ OAuth ТОКЕНА ИЗ URL ---
  useEffect(() => {
    // 1. Отработка прямых ссылок на объявления (Google Merchant, Sitemap, Web Push)
    const urlParams = new URLSearchParams(window.location.search);
    const adIdParam = urlParams.get('ad');
    const companyIdParam = urlParams.get('store');
    const hash = window.location.hash;
    
    let targetAdId = null;
    let targetCompanyId = null;

    if (adIdParam) targetAdId = adIdParam;
    else if (hash.startsWith('#ad-')) targetAdId = hash.replace('#ad-', '');
    else if (companyIdParam) targetCompanyId = companyIdParam;
    else if (hash.startsWith('#company-')) targetCompanyId = hash.replace('#company-', '');

    if (targetAdId) {
      fetch(`${API_URL}/ads/${targetAdId}`)
        .then(res => res.ok ? res.json() : null)
        .then(adData => {
           if (adData) {
             setViewedAd(adData);
             if (currentTab !== 'home') setCurrentTab('home');
             // Конвертируем ?ad=123 в красивый hash-формат для консистентности
             if (adIdParam) window.history.replaceState({}, '', `/#ad-${targetAdId}`);
           }
        })
        .catch(() => console.error("Error loading deep link ad"));
    }
    else if (targetCompanyId) {
      // Защита UX: Обработка прямых ссылок на магазины PRO-продавцов
      fetch(`${API_URL}/users/${targetCompanyId}/profile`)
        .then(res => res.ok ? res.json() : null)
        .then(sellerData => {
           if (sellerData) {
             handleViewCompany(sellerData);
             if (companyIdParam) window.history.replaceState({}, '', `/#company-${targetCompanyId}`);
           }
        })
        .catch(() => console.error("Error loading deep link company"));
    }

    // 2. Отработка токенов и платежей
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const rToken = params.get('reset_token');
    const rEmail = params.get('email');
    const eToken = params.get('email_token');
    const paymentStatus = params.get('payment');
    const oauthChallenge = params.get('oauth_challenge');
    const oauthCode = params.get('oauth_code');

    // Обработка возврата с платежного шлюза
    if (paymentStatus === 'success') {
      // UX Fix: Мгновенно обновляем профиль (роль и баланс), чтобы пользователь сразу увидел свой PRO-статус
      const token = localStorage.getItem('auth_token');
      if (token) {
        fetch(`${API_URL}/user`, { headers: { 'Authorization': `Bearer ${token}` } })
          .then(res => res.json())
          .then(userData => {
            setUser(userData);
            setUserRole(userData.role || 'individual');
            localStorage.setItem('user', JSON.stringify(userData));
          }).catch(() => {});
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'error') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        alert('El pago no se pudo completar o fue cancelado.');
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
            alert(data.message || 'Correo actualizado con éxito.');
          } else alert(data.message || 'Error al confirmar el correo.');
        })
        .catch(err => console.error(err))
        .finally(() => window.history.replaceState({}, document.title, window.location.pathname));
      } else {
        alert('Debes iniciar sesión primero para confirmar tu correo.');
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
        })
        .catch(err => {
          console.error(err);
          alert('Error de autenticación con Google');
        });
    } else if (params.get('token')) {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert('Ese enlace de autenticación ya no es válido. Inicia sesión de nuevo.');
    } else if (error) {
      alert('Error de autenticación con Google');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => { localStorage.setItem('lang', lang); }, [lang]);
  useEffect(() => { setPriceTab(accountType); }, [accountType, showPricingModal]);

  useEffect(() => { setDashboardPage(1); }, [dashboardTab, adStatusFilter]);

  // --- СОХРАНЕНИЕ НАСТРОЕК СЛАЙДЕРА ---
  useEffect(() => {
    localStorage.setItem('sliderAutoplay', sliderAutoplay);
  }, [sliderAutoplay]);

  // --- ПРИМЕНЕНИЕ ТЕМНОЙ ТЕМЫ ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // --- ДИНАМИЧЕСКОЕ SEO & GOOGLE TAG MANAGER ---
  useEffect(() => {
    let title = "Mercasto | Compra, Vende y Renta en Todo México";
    let desc = "Únete a Mercasto, el mercado local de crecimiento más rápido en México. Compra autos, renta departamentos, busca empleo y ofrece servicios cerca de ti.";
    
    if (viewedAd) {
      title = `${viewedAd.title} - ${viewedAd.location?.split(',')[0]} | Mercasto`;
      desc = viewedAd.description ? viewedAd.description.substring(0, 160) : desc;
    } else if (viewedCompany) {
      title = `${viewedCompany.name} - Tienda en Mercasto`;
    } else if (activeCat) {
      const catName = getCatName(categoriesData.find(c => c.slug === activeCat), lang) || activeCat;
      title = `${catName} en México | Anuncios Clasificados Mercasto`;
    }

    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);

    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'virtual_page_view',
        page_title: title,
        page_path: `/${currentTab}${activeCat ? `?cat=${activeCat}` : ''}${viewedAd ? `?ad=${viewedAd.id}` : ''}`
      });
    }
  }, [currentTab, activeCat, viewedAd, viewedCompany, categoriesData, lang]);

  // --- WEBSOCKETS LISTENER ---
  useEffect(() => {
    if (user?.id && echo) {
        const channel = echo.private(`App.Models.User.${user.id}`);
        
        channel.listen('.NewNotification', (e) => {
            console.log('Real-time event received:', e);
            // The actual notification data is inside e.notification
            setNotifications(prev => [e.notification, ...prev]);
        });

        return () => {
            channel.stopListening('.NewNotification');
            echo.leave(`private-App.Models.User.${user.id}`); // Закрываем приватный канал с правильным префиксом
        };
    }
// Защита от DDoS WebSockets (Connection Thrashing): привязываем зависимость ТОЛЬКО к ID,
// иначе при любом обновлении профиля/баланса React будет рвать и заново создавать сокет-соединение
}, [user?.id]);

  // --- WEB PUSH API SUBSCRIPTION LOGIC ---
  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });
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

  // --- GOOGLE PLACES AUTOCOMPLETE ---
  useEffect(() => {
    if (!mapsApiKey) return;

    const initAutocomplete = (ref) => {
      if (window.google?.maps?.places && ref.current && !ref.current.dataset.autocompleteReady) {
          const autocomplete = new window.google.maps.places.Autocomplete(ref.current, {
              types: ['(cities)'],
              componentRestrictions: { country: 'mx' }
          });
          autocomplete.addListener('place_changed', () => {
              const place = autocomplete.getPlace();
              if (place.geometry) {
                  setSearchLocation({
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng(),
                  });
                  setSearchLocationInput(place.formatted_address);
              }
          });
          ref.current.dataset.autocompleteReady = 'true';
      }
    };

    const bindAutocomplete = () => {
      // Google Maps Autocomplete отключен в Header, так как мы используем кастомные выпадающие списки
      // Он остался доступен для других компонентов (например, PostScreen)
    };

    if (window.google?.maps?.places) {
      bindAutocomplete();
      return;
    }

    const scriptId = 'google-maps-places-script';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsApiKey)}&libraries=places&callback=Function.prototype`;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', bindAutocomplete, { once: true });
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', bindAutocomplete, { once: true });
    }
  }, [mapsApiKey]);

  useEffect(() => {
    if (user && user.notification_preferences) {
      try {
        const prefs = typeof user.notification_preferences === 'string' ? JSON.parse(user.notification_preferences) : user.notification_preferences;
        setNotificationsForm({
          email_alerts: prefs.email_alerts ?? true,
          push_notifications: prefs.push_notifications ?? true,
          marketing: prefs.marketing ?? false,
        });
      } catch (e) {}
    }
    
    // Автоматически обновляем подписку, если пользователь уже разрешил уведомления
    if (user && Notification.permission === 'granted') {
       subscribeToPush();
    }
    
  }, [user]);

  const loadUserAds = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/ads`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUserAds(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) { console.error("Error fetching user ads", err); }
  }, [user]);

  const loadFavoriteAds = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/favorite-ads`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setFavoriteAds(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) { console.error("Error fetching favorite ads", err); }
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
        setNotifications(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) { console.error("Error fetching notifications", err); }
  }, [user]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const handleMarkNotificationRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/user/notifications/${id}/read`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    } catch (err) { console.error(err); }
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
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

  useEffect(() => {
    if (currentTab === 'profile' && accountType === 'pro' && user) {
      fetch(`${API_URL}/user/analytics?days=${analyticsDays}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
      .then(res => res.ok ? res.json() : [])
      .then(data => setAnalyticsData(Array.isArray(data) ? data : (data.data || [])))
      .catch(err => console.error("Error fetching analytics", err));
    }
  }, [currentTab, accountType, user, analyticsDays]);

  useEffect(() => {
    setIsMapUpdating(true);
    const timer = setTimeout(() => {
      setDebouncedLocation(form.location);
      setIsMapUpdating(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [form.location]);

  const loadAds = useCallback(async (page = 1) => {
    if (page > 1) {
      setLoadingMore(true);
    } else {
      setLoadingAds(true);
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
    if (selectedState && !searchLocation && !debouncedLocInput) params.append('location', selectedState);
        
        // Прикрепляем значения глобальных фильтров и EAV-атрибутов для Laravel Controller
        if (minPrice) params.append('min_price', minPrice);
        if (maxPrice) params.append('max_price', maxPrice);
        if (conditionFilter.length > 0) params.append('condition', conditionFilter.join(','));
        Object.keys(dynamicFilters).forEach(key => {
            if (Array.isArray(dynamicFilters[key]) && dynamicFilters[key].length > 0) {
                dynamicFilters[key].forEach(v => params.append(`filters[${key}][]`, v));
            } else if (typeof dynamicFilters[key] === 'string' && dynamicFilters[key]) {
                params.append(`filters[${key}]`, dynamicFilters[key]);
            }
        });

    try {
      const res = await fetch(`${API_URL}/ads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.data || []);
        setServerAds(prev => page === 1 ? items : [...prev, ...items]);
        setCurrentPage(data.current_page || 1);
        setHasMore(data.last_page ? data.current_page < data.last_page : false);
      }
    } catch (err) { console.error("Error fetching ads", err); } 
    finally { setLoadingAds(false); setLoadingMore(false); }
  }, [debouncedSearch, debouncedLocInput, activeCat, selectedState, searchLocation, radius, minPrice, maxPrice, conditionFilter, dynamicFilters]); // Защита от бага Stale Closure в React

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
        setFavoriteIds(data);
      }
    } catch (err) { console.error("Error fetching favorites", err); }
  }, [user]);

  useEffect(() => {
    setServerAds([]); // Сбрасываем объявления при смене фильтров
    loadAds(1);
  }, [debouncedSearch, activeCat, selectedState, searchLocation, debouncedLocInput, radius, minPrice, maxPrice, conditionFilter, dynamicFilters]);
  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  // --- ПАНЕЛЬ АДМИНИСТРАТОРА: ПОЛЬЗОВАТЕЛИ ---
  const loadAdminUsers = useCallback(async () => {
    setLoadingAdminUsers(true);
    try {
      const token = localStorage.getItem('auth_token');
      // UX Fix: Передаем поисковый запрос на бэкенд, чтобы поиск работал по ВСЕЙ базе данных, а не только по первой странице
      const res = await fetch(`${API_URL}/users?search=${encodeURIComponent(adminUserSearch)}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        // Фикс белого экрана: Laravel возвращает { data: [...] } при пагинации
        setAdminUsers(data.data || (Array.isArray(data) ? data : []));
      }
    } catch (err) { console.error("Error fetching users", err); } 
    finally { setLoadingAdminUsers(false); }
  }, [adminUserSearch]);

  const handleAdminVerifyUser = async (id) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/users/${id}/verify`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(prev => prev.map(u => u.id === id ? { ...u, is_verified: data.is_verified } : u));
      }
    } catch (err) { console.error("Error verifying user", err); }
  };

  const handleAdminDeleteUser = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAdminUsers(prev => prev.filter(u => u.id !== id));
      else alert('Error al eliminar usuario');
    } catch (err) { console.error("Error deleting user", err); }
  };

  const handleAdminChangeRole = async (id, newRole) => {
    if (!window.confirm(`¿Cambiar rol a ${newRole}?`)) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/users/${id}/role`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) setAdminUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
      else alert('Error al cambiar rol');
    } catch (err) { console.error("Error changing role", err); }
  };

  // --- ПАНЕЛЬ АДМИНИСТРАТОРА: МОДЕРАЦИЯ ---
  const loadPendingAds = useCallback(async () => {
    setLoadingPendingAds(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/ads/pending`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAdminPendingAds(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) { console.error("Error fetching pending ads", err); }
    finally { setLoadingPendingAds(false); }
  }, []);

  const handleModerateAd = async (id, status) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/ads/${id}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setAdminPendingAds(prev => prev.filter(ad => ad.id !== id));
        if (status === 'active') loadAds(1); // Refresh the public feed after approval
      }
    } catch (err) { console.error("Error moderating ad", err); }
  };

  // --- ПАНЕЛЬ АДМИНИСТРАТОРА: ЖАЛОБЫ (REPORTS) ---
  const loadAdminReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/reports`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAdminReports(Array.isArray(data) ? data : (data.data || []));
      }
      const res2 = await fetch(`${API_URL}/admin/user-reports`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res2.ok) {
        const data2 = await res2.json();
        setAdminUserReports(Array.isArray(data2) ? data2 : (data2.data || []));
      }
    } catch (err) { console.error("Error fetching reports", err); }
    finally { setLoadingReports(false); }
  }, []);

  const handleDeleteReport = async (id) => {
    if (!window.confirm('¿Eliminar este reporte?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/reports/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAdminReports(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleDeleteUserReport = async (id) => {
    if (!window.confirm('¿Eliminar este reporte de usuario?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/user-reports/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAdminUserReports(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error(err); }
  };

  // --- ПАНЕЛЬ АДМИНИСТРАТОРА: КУПОНЫ ---
  const loadCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/coupons`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAdminCoupons(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) { console.error("Error fetching coupons", err); }
    finally { setLoadingCoupons(false); }
  }, []);

  const handleCreateCoupon = async (e) => {
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
        alert('Cupón creado exitosamente');
      } else {
        const errData = await res.json();
        alert(errData.message || 'Error al crear cupón');
      }
    } catch (err) { console.error(err); alert('Error de conexión'); }
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm('¿Eliminar cupón?')) return;
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
      .then(res => res.json())
      .then(data => setCategoriesData(Array.isArray(data) ? data : (data.data || [])))
      .catch(err => console.error("Error fetching categories", err));
  }, []);

  // --- ПАНЕЛЬ АДМИНИСТРАТОРА: КАТЕГОРИИ ---
  const handleSaveCategory = async (e) => {
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
        setCategoriesData(await catRes.json());
        cancelCatEdit();
        alert('Categoría guardada exitosamente');
      } else alert('Error al guardar la categoría');
    } catch (err) { console.error(err); alert('Error de conexión'); }
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

  // --- ЛОГИКА АВТОРИЗАЦИИ (API) ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
      let endpoint = '';
      if (authMode === 'register') endpoint = '/register';
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
          alert(result.message);
          setAuthMode('login');
        } else if (result.two_factor) {
          setTwoFactorEmail(result.email || data.email || '');
          setTwoFactorChallengeToken(result.challenge_token || '');
          setRequiresTwoFactor(true);
        } else {
          if (!result.user) {
            alert('Error de servidor: respuesta inesperada.');
            return;
          }
          setUser(result.user);
          setUserRole(result.user.role || 'individual');
          localStorage.setItem('user', JSON.stringify(result.user));
          if (result.access_token) localStorage.setItem('auth_token', result.access_token);
          setShowAuthModal(false);
        }
      } else {
        alert(result.message || result.error || "Credenciales incorrectas");
      }
    } catch (err) { 
      console.error("Auth error", err); 
      alert("Error de conexión");
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
        alert(result.message || 'Código 2FA inválido.');
      }
    } catch (err) { alert('Error de conexión.'); }
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
        alert(result.message || 'SMS enviado');
        setAuthMode('phone_verify');
      } else alert(result.message || 'Error al enviar SMS');
    } catch (err) { alert('Error de conexión'); }
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
        body: JSON.stringify({ phone_number: authPhone, code: formData.get('code') })
      });
      const result = await res.json();
      if (res.ok) {
        setUser(result.user); setUserRole(result.user.role || 'individual');
        localStorage.setItem('user', JSON.stringify(result.user));
        if (result.access_token) localStorage.setItem('auth_token', result.access_token);
        setShowAuthModal(false);
      } else alert(result.message || 'Código SMS inválido');
    } catch (err) { alert('Error de conexión'); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('auth_token');
    // Clear local state first for immediate UX response
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
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
      } else alert('Error al actualizar el perfil');
    } catch (err) { console.error("Profile update error", err); }
    finally { setProfileLoading(false); }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      alert('Las contraseñas nuevas no coinciden.');
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
        alert(data.message || 'Contraseña actualizada exitosamente.');
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        alert(`Error: ${data.message || 'No se pudo actualizar la contraseña.'}`);
      }
    } catch (err) { console.error("Password update error", err); alert('Error de conexión'); }
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
        alert(data.message || 'Se ha enviado un enlace de confirmación a tu nuevo correo.');
        setEmailForm({ new_email: '', password: '' });
      } else {
        alert(`Error: ${data.message || 'No se pudo procesar la solicitud.'}`);
      }
    } catch (err) { console.error("Email update error", err); alert('Error de conexión'); }
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
        body: JSON.stringify(notificationsForm)
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
        alert('Preferencias de notificación guardadas.');
      } else alert('Error al guardar preferencias.');
    } catch (err) { console.error("Notifications update error", err); alert('Error de conexión'); }
    finally { setNotificationsLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar tu cuenta? Esta acción eliminará todos tus anuncios permanentemente y no se puede deshacer.')) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Cuenta eliminada exitosamente.');
        handleLogout();
      } else {
        alert('Error al eliminar la cuenta.');
      }
    } catch (err) { console.error("Account deletion error", err); }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImageObjects = files.map(file => ({
      source: 'new',
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

  const handleGenerateDescription = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const firstNewImage = images.find(img => img.source === 'new' && img.file);
    if (!firstNewImage?.file) {
      alert('Agrega al menos una foto nueva para generar la descripción con IA.');
      return;
    }

    setAiLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('image', firstNewImage.file);
      if (form.title) formData.append('title', form.title);
      if (form.category) formData.append('category', form.category);
      if (form.condition) formData.append('condition', form.condition);

      const res = await fetch(`${API_URL}/ads/generate-description`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'No se pudo generar la descripción.');
        return;
      }

      if (data.description) {
        setForm(prev => ({ ...prev, description: data.description }));
      }
    } catch (err) {
      console.error('AI description error', err);
      alert('Error de conexión al generar la descripción.');
    } finally {
      setAiLoading(false);
    }
  };

  const handlePostSubmit = async (e) => {
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
    formData.append('category', form.category || 'general');
    if (user && user.id) formData.append('user_id', user.id);
    
    // Добавляем динамические атрибуты (EAV JSON)
    if (form.attributes) {
      Object.keys(form.attributes).forEach(key => {
        if (form.attributes[key]) {
          formData.append(`attributes[${key}]`, form.attributes[key]);
        }
      });
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

      const res = await fetch(endpoint, { 
        method: 'POST', 
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData 
      });

      if (res.ok) {
        // Очищаем оперативную память браузера от временных файлов (Memory Leak fix)
        images.forEach(img => {
          if (img.source === 'new' && img.preview) {
            URL.revokeObjectURL(img.preview);
          }
        });

        // Сбрасываем состояние формы
        setForm({ title: '', price: '', description: '', location: '', category: '', condition: 'nuevo', attributes: {} });
        setImages([]);
        setVideoFile(null);
        setEditingAd(null);
        setCurrentTab('home');
        loadAds(1); // Reload after create/update
        loadUserAds(); // Обновляем список моих объявлений
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.message || 'Ошибка при сохранении объявления.'}`);
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
        alert("Error al eliminar el anuncio.");
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
      title: ad.title,
      price: ad.price,
      description: ad.description || '',
      location: ad.location || '',
      category: ad.category || '',
      condition: ad.condition || 'usado',
      attributes: parsedAttributes
    });
    setImages(getImageUrls(ad.image_url, ad.image).map(url => ({
      source: 'existing',
      url: url,
      preview: url
    })));
    setVideoFile(ad.video_url ? { name: 'Video adjunto (Haz clic en la papelera para eliminar)', isExisting: true } : null); // Исправляем баг потери видео при редактировании
    setCurrentTab('post');
  };

  // --- АНАЛИТИКА КЛИКОВ WHATSAPP ---
  const handleWhatsAppClick = (ad) => {
    fetch(`${API_URL}/ads/${ad.id}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ channel: 'whatsapp' })
    }).catch(err => console.log("Analytics error", err));
      
      // GTM Event push para conversiones
      if (typeof window !== 'undefined') {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'whatsapp_click',
          ad_id: ad.id,
          ad_title: ad.title,
          ad_category: ad.category
        });
      }
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
        handleViewCompany(viewedCompany); // Перезагружаем профиль продавца для обновления отзывов
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.message}`);
      }
    } catch (err) { console.error("Review error", err); alert('Error de conexión'); } 
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
        alert(data.message || 'Subida masiva completada');
        window.location.reload(); // Recargar para mostrar los nuevos anuncios en el dashboard
      } else {
        alert(`Error: ${data.message || 'No se pudo procesar el archivo.'}`);
      }
    } catch (err) {
      console.error("Bulk upload error", err);
      alert('Error de conexión al subir el archivo.');
    } finally {
      setIsUploadingBulk(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- ПЕРЕКЛЮЧЕНИЕ СТАТУСА ОБЪЯВЛЕНИЯ (АКТИВНО/НЕАКТИВНО) ---
  const handleToggleAdStatus = async (ad) => {
    if (ad.status === 'pending' || ad.status === 'rejected') {
      alert('Este anuncio está en revisión o fue rechazado y no puede ser activado manualmente.');
      return;
    }
    const newStatus = ad.status === 'inactive' ? 'active' : 'inactive';
    // Оптимистичное обновление UI
    setUserAds(prev => prev.map(a => a.id === ad.id ? { ...a, status: newStatus } : a));
    setServerAds(prev => prev.map(a => a.id === ad.id ? { ...a, status: newStatus } : a));
    
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/ads/${ad.id}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) { console.error("Error updating status", err); }
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
      const data = await res.json();
      alert(data.message || 'Reporte enviado.');
      setShowReportModal(false);
      setReportForm({ reason: '', comments: '' });
      setReportingAd(null);
    } catch (err) { console.error("Report error", err); alert('Error de conexión'); }
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
      const data = await res.json();
      alert(data.message || 'Reporte de usuario enviado.');
      setShowUserReportModal(false);
      setUserReportForm({ reason: '', comments: '' });
    } catch (err) { console.error("Report error", err); alert('Error de conexión'); }
  };

  // --- ПОДЕЛИТЬСЯ ОБЪЯВЛЕНИЕМ ---
  const handleShareAd = (ad) => {
    if (navigator.share) {
      navigator.share({ title: ad.title, text: `Mira este anuncio en Mercasto: ${ad.title}`, url: window.location.href }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('¡Enlace copiado al portapapeles!');
    }
  };

  // --- ОПЛАТА ЧЕРЕЗ CLIP MEXICO ---
  const handleClipPayment = async (amount, description, adId = null) => {
    if (!user) { setShowAuthModal(true); return; }
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/payment/clip`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description, ad_id: adId })
      });
      const data = await res.json();
      if (res.ok && data.payment_url) {
        window.location.href = data.payment_url;
      } else alert('Error al generar pago con Clip');
    } catch (err) { console.error("Clip payment error", err); alert('Error de conexión'); }
  };
  
  // --- ПРОДВИЖЕНИЕ ОБЪЯВЛЕНИЯ (Выбор: Кредиты или Карта) ---
  const handlePromoteAd = async (ad) => {
    const balance = parseFloat(user?.balance || 0);
    if (balance >= 50) {
      if (window.confirm(`¿Deseas usar 50 créditos de tu saldo para promocionar este anuncio? (Saldo actual: ${balance} Créditos)`)) {
        try {
          const token = localStorage.getItem('auth_token');
          const res = await fetch(`${API_URL}/ads/${ad.id}/promote/credits`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          });
          const data = await res.json();
          if (res.ok) {
            alert('¡Anuncio promocionado con éxito!');
            const updatedUser = { ...user, balance: data.balance };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUserAds(prev => prev.map(a => a.id === ad.id ? { ...a, promoted: 'destacado' } : a));
            setServerAds(prev => prev.map(a => a.id === ad.id ? { ...a, promoted: 'destacado' } : a));
          } else alert(data.message || 'Error al promocionar');
        } catch (e) { console.error(e); alert('Error de conexión'); }
      }
    } else {
      handleClipPayment(50, `Promoción de anuncio: ${ad.title}`, ad.id);
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
      alert(data.message);
      if (res.ok && data.balance !== undefined) {
        setShowCouponModal(false);
        setCouponInput('');
        const updatedUser = { ...user, balance: data.balance };
        setUser(updatedUser); 
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (e) { console.error(e); alert('Error de conexión'); }
  };

  // --- ПРОСМОТР ОБЪЯВЛЕНИЯ И АНАЛИТИКА ---
  const handleViewAd = (ad) => {
    window.history.pushState({ popup: 'ad' }, '', `#ad-${ad.id}`);
    setViewedAd(ad);
    window.scrollTo(0, 0); // Исправляет проблему "белого экрана" из-за скролла
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

  // --- ПРОСМОТР ПРОФИЛЯ ПРОДАВЦА (STOREFRONT) ---
  const handleViewCompany = (seller) => {
    if (!seller) return;
    window.history.pushState({ popup: 'company' }, '', `#company-${seller.id}`);
    setViewedCompany(seller);
    window.scrollTo(0, 0); // Исправляет проблему "белого экрана" из-за скролла
    setLoadingCompanyAds(true);
    Promise.all([
      fetch(`${API_URL}/ads?user_id=${seller.id}`).then(res => res.ok ? res.json() : { data: [] }),
      fetch(`${API_URL}/users/${seller.id}/reviews`).then(res => res.ok ? res.json() : { reviews: [], average: 0, total: 0 })
    ]).then(([adsData, reviewsData]) => {
        setCompanyAds(adsData.data || (Array.isArray(adsData) ? adsData : []));
        setCompanyReviews(reviewsData.reviews || []);
        setCompanyRatingStats({ average: reviewsData.average || 0, total: reviewsData.total || 0 });
    }).catch(err => console.error(err)).finally(() => setLoadingCompanyAds(false));
  };

  // --- РЕНДЕР КАРТОЧКИ ---
  const renderAdCard = (ad) => {
    const isDestacado = ad.promoted === 'destacado' || ad.is_featured;
    const isUrgente = ad.promoted === 'urgente';
    const isPro = ad.user?.role === 'business';
    const isFav = favoriteIds.includes(ad.id);
    const safeImage = getImageUrl(ad.image_url, ad.image);

    return (
      <article key={ad.id} onClick={() => handleViewAd(ad)} className="card bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer group flex flex-col h-full shrink-0">
        <div className="relative bg-slate-200 dark:bg-slate-800">
          <img src={safeImage} loading="lazy" className="w-full h-[160px] md:h-[180px] object-cover group-hover:scale-105 transition-transform duration-500 opacity-0 transition-opacity duration-300" onLoad={handleAdImageLoad} alt={ad.title}/>
          <button onClick={(e) => handleToggleFavorite(e, ad.id)} className="heart absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white z-10">
            <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-slate-700'}`} />
          </button>
          {isDestacado && <span className="badge absolute top-2.5 left-2.5 bg-blue-600 text-white z-10">Top seller</span>}
          {!isDestacado && isUrgente && <span className="badge absolute top-2.5 left-2.5 bg-amber-500 text-white z-10">Urgent</span>}
          {!isDestacado && !isUrgente && isPro && <span className="badge absolute top-2.5 left-2.5 bg-[#84CC16] text-white z-10">PRO</span>}
        </div>
        <div className="p-3.5 flex flex-col flex-1 relative bg-white z-10">
          <div className="text-[20px] font-bold leading-none">${Number(ad.price).toLocaleString()} <span className="text-[11px] font-medium text-slate-500">MXN</span></div>
          <h3 className="text-[14px] font-medium mt-1.5 line-clamp-1">{ad.title}</h3>
          <div className="flex items-center justify-between mt-auto pt-2 text-[12px] text-slate-500">
            <span className="truncate pr-2">{ad.location?.split(',')[0] || 'México'}</span>
          </div>
        {ad.user?.role !== 'business' && (
            <button className="w-full mt-3 btn-md bg-[#0F172A] text-white hover:bg-black" onClick={(e) => { e.stopPropagation(); handleViewAd(ad); }}>Contact</button>
          )}
        </div>
      </article>
    );
  };

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
  const renderAdDetailScreen = () => <AdDetailScreen ad={viewedAd} API_URL={API_URL} getImageUrl={getImageUrl} getImageUrls={getImageUrls} getCatName={getCatName} t={t} lang={lang} favoriteIds={favoriteIds} categoriesData={categoriesData} sliderAutoplay={sliderAutoplay} handleShareAd={handleShareAd} handleToggleFavorite={handleToggleFavorite} setReportingAd={setReportingAd} setShowReportModal={setShowReportModal} handleViewCompany={handleViewCompany} handleWhatsAppClick={handleWhatsAppClick} allAds={allAds} setViewedAd={setViewedAd} MediaSlider={MediaSlider} renderAdCard={renderAdCard} AdSenseBanner={AdSenseBanner} />;

  // --- РЕНДЕР ПУБЛИЧНОГО ПРОФИЛЯ ПРОДАВЦА (STOREFRONT) ---
  const renderStorefrontScreen = () => <StorefrontScreen company={viewedCompany} t={t} getImageUrl={getImageUrl} companyRatingStats={companyRatingStats} companyAds={companyAds} companyReviews={companyReviews} loadingCompanyAds={loadingCompanyAds} submittingReview={submittingReview} setShowUserReportModal={setShowUserReportModal} setQrModalData={setQrModalData} setViewedCompany={setViewedCompany} renderAdCard={renderAdCard} renderSkeletonCard={renderSkeletonCard} handleReviewSubmit={handleReviewSubmit} reviewForm={reviewForm} setReviewForm={setReviewForm} user={user} handleViewCompany={handleViewCompany} />;

  // --- РЕНДЕР МОДАЛКИ С QR-КОДОМ ---
  const renderQRModal = () => {
    if (!qrModalData) return null;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrModalData)}`;
    
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setQrModalData(null)}>
        <div className="bg-white rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95 flex flex-col items-center max-w-sm w-full" onClick={e => e.stopPropagation()}>
          <button onClick={() => setQrModalData(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
          <div className="w-12 h-12 bg-lime-100 text-[#65A30D] rounded-2xl flex items-center justify-center mb-4"><QrCode size={28}/></div>
          <h2 className="text-[20px] font-bold text-slate-900 mb-2">Escanea para contactar</h2>
          <p className="text-[13px] text-slate-500 mb-6 text-center">Abre la cámara de tu celular y escanea este código para enviar un mensaje al vendedor.</p>
          <div className="p-4 bg-white border-2 border-slate-100 rounded-3xl shadow-sm mb-6">
            <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
          </div>
          <button onClick={() => setQrModalData(null)} className="btn-md w-full bg-slate-100 text-slate-700 hover:bg-slate-200">Cerrar</button>
        </div>
      </div>
    );
  };

  // --- РЕНДЕР МОДАЛКИ ЖАЛОБЫ (REPORT) ---
  const renderReportModal = () => {
    if (!showReportModal) return null;
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReportModal(false)}>
        <div className="bg-white rounded-3xl p-6 md:p-8 relative shadow-2xl animate-in fade-in zoom-in-95 w-full max-w-md" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowReportModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
          <h2 className="text-[20px] font-bold text-slate-900 mb-2">Reportar Anuncio</h2>
          <p className="text-[13px] text-slate-500 mb-6">Ayúdanos a entender el problema con este anuncio.</p>
          <form onSubmit={handleReportAd} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">Motivo</label>
              <select required value={reportForm.reason} onChange={e => setReportForm({...reportForm, reason: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white">
                <option value="">Selecciona un motivo...</option>
                <option value="Fraude o estafa">Fraude o estafa</option>
                <option value="Contenido inapropiado">Contenido inapropiado</option>
                <option value="Artículo falso o falsificado">Artículo falso o falsificado</option>
                <option value="Ya se vendió">Ya se vendió</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">Comentarios adicionales</label>
              <textarea value={reportForm.comments} onChange={e => setReportForm({...reportForm, comments: e.target.value})} placeholder="Proporciona más detalles..." className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] min-h-[80px] bg-white"></textarea>
            </div>
            <button type="submit" className="btn-md w-full bg-[#0F172A] text-white hover:bg-black mt-2 shadow-sm">Enviar Reporte</button>
          </form>
        </div>
      </div>
    );
  };

  // --- РЕНДЕР МОДАЛКИ ЖАЛОБЫ НА ПОЛЬЗОВАТЕЛЯ ---
  const renderUserReportModal = () => {
    if (!showUserReportModal) return null;
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowUserReportModal(false)}>
        <div className="bg-white rounded-3xl p-6 md:p-8 relative shadow-2xl animate-in fade-in zoom-in-95 w-full max-w-md" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowUserReportModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
          <h2 className="text-[20px] font-bold text-slate-900 mb-2">Reportar Vendedor</h2>
          <p className="text-[13px] text-slate-500 mb-6">Ayúdanos a mantener una comunidad segura.</p>
          <form onSubmit={handleUserReportSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">Motivo</label>
              <select required value={userReportForm.reason} onChange={e => setUserReportForm({...userReportForm, reason: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white">
                <option value="">Selecciona un motivo...</option>
                <option value="Comportamiento abusivo">Comportamiento abusivo o insultos</option>
                <option value="Sospecha de fraude">Sospecha de fraude</option>
                <option value="Vende productos ilegales">Vende productos prohibidos</option>
                <option value="Suplantación de identidad">Suplantación de identidad</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">Detalles adicionales</label>
              <textarea value={userReportForm.comments} onChange={e => setUserReportForm({...userReportForm, comments: e.target.value})} placeholder="Explica la situación..." className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] min-h-[80px] bg-white"></textarea>
            </div>
            <button type="submit" className="btn-md w-full bg-[#0F172A] text-white hover:bg-black mt-2 shadow-sm">Enviar Reporte</button>
          </form>
        </div>
      </div>
    );
  };

  // --- РЕНДЕР ЦЕНОВОЙ МОДЕЛИ ---
  const renderPricingModal = () => {
    if (!showPricingModal) return null;

    return (
      <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-end md:items-center justify-center p-0 md:p-6 backdrop-blur-sm">
        <div className="bg-slate-50 w-full max-w-5xl md:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0">
          <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
            <div className="p-5 flex justify-between items-center">
              <h3 className="font-bold text-[22px] text-slate-900 flex items-center gap-2"><Crown className="w-6 h-6 text-amber-500"/> {t.pricing_title}</h3>
              <button onClick={() => setShowPricingModal(false)} className="p-1 text-slate-400 hover:text-slate-800 transition-colors"><XCircle size={26}/></button>
            </div>
            <div className="flex px-5 gap-6 border-t border-slate-100">
              <button onClick={() => setPriceTab('particular')} className={`py-4 font-semibold text-[14px] border-b-2 transition-colors ${priceTab === 'particular' ? 'border-[#84CC16] text-[#65A30D]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t.tab_individuals}</button>
              <button onClick={() => setPriceTab('pro')} className={`py-4 font-semibold text-[14px] border-b-2 transition-colors ${priceTab === 'pro' ? 'border-[#84CC16] text-[#65A30D]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t.tab_businesses}</button>
            </div>
          </div>
          <div className="p-4 md:p-6 overflow-y-auto">
            {priceTab === 'particular' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto">
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 flex flex-col shadow-sm">
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[12px] mb-2">{t.plan_free}</h4>
                  <p className="text-4xl font-black text-slate-900 mb-4">$0</p>
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> 3 {t.free_ad} / mes</li>
                    <li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Contacto por QR</li>
                  </ul>
                  <button className="btn-lg w-full border border-slate-300 text-slate-700 hover:bg-slate-50">{t.current_plan}</button>
                </div>
                <div className="bg-[#84CC16] rounded-3xl p-6 md:p-8 border border-[#84CC16] flex flex-col shadow-lg">
                  <h4 className="font-bold text-lime-100 uppercase tracking-wider text-[12px] mb-2">{t.plan_plus}</h4>
                  <p className="text-4xl font-black text-white mb-4">$99 <span className="text-[14px] font-medium text-lime-100">/mes</span></p>
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-[14px] text-white"><CheckCircle className="w-4 h-4 text-white"/> 10 anuncios / mes</li>
                    <li className="flex items-center gap-2 text-[14px] text-white"><CheckCircle className="w-4 h-4 text-white"/> 2 Subidas a TOP gratis</li>
                    <li className="flex items-center gap-2 text-[14px] text-white"><CheckCircle className="w-4 h-4 text-white"/> Más visibilidad</li>
                  </ul>
                  <button onClick={() => handleClipPayment(99, 'Suscripción Paquete Plus')} className="btn-lg w-full bg-white text-[#65A30D] hover:bg-slate-50 shadow-sm">{t.buy_plan}</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#84CC16]/50 flex flex-col relative shadow-sm">
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[12px] mb-2">{t.plan_pro_basic}</h4>
                  <p className="text-4xl font-black text-slate-900 mb-4">$500 <span className="text-[14px] font-medium text-slate-500">/mes</span></p>
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> 50 anuncios / mes</li>
                    <li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Insignia "PRO"</li>
                    <li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Página de Empresa</li>
                    <li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Estadísticas avanzadas</li>
                  </ul>
                  <button onClick={() => handleClipPayment(500, 'Suscripción PRO Estándar')} className="btn-lg w-full border-2 border-[#84CC16] text-[#65A30D] hover:bg-[#84CC16]/5">{t.buy_plan}</button>
                </div>
                <div className="bg-[#0F172A] rounded-3xl p-6 md:p-8 flex flex-col relative shadow-xl transform md:-translate-y-2 ring-2 ring-[#84CC16]">
                  <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#84CC16] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-md">POPULAR</div>
                  <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[12px] mb-2">{t.plan_pro_max}</h4>
                  <p className="text-4xl font-black text-white mb-4">$1,500 <span className="text-[14px] font-medium text-slate-400">/mes</span></p>
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-[14px] text-white/90"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Anuncios Ilimitados</li>
                    <li className="flex items-center gap-2 text-[14px] text-white/90"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Subida masiva (XML/CSV)</li>
                    <li className="flex items-center gap-2 text-[14px] text-white/90"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> 10 Destacados incluidos</li>
                    <li className="flex items-center gap-2 text-[14px] text-white/90"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Soporte dedicado</li>
                  </ul>
                  <button onClick={() => handleClipPayment(1500, 'Suscripción PRO Ilimitado')} className="btn-lg w-full bg-[#84CC16] text-white hover:bg-[#65A30D] shadow-md">{t.buy_plan}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- РЕНДЕР ДАШБОРДА ПОЛЬЗОВАТЕЛЯ ---
  const activeAds = useMemo(() => userAds.filter(a => a.status === 'active'), [userAds]);
  const inactiveAds = useMemo(() => userAds.filter(a => a.status !== 'active'), [userAds]);
  const totalViews = useMemo(() => userAds.reduce((sum, a) => sum + (a.views || 0), 0), [userAds]);
  const totalContactClicks = useMemo(() => userAds.reduce((sum, a) => sum + (a.whatsapp_clicks || 0), 0), [userAds]);
  const conversionRate = useMemo(() => totalViews > 0 ? ((totalContactClicks / totalViews) * 100).toFixed(1) : 0, [totalViews, totalContactClicks]);
  const catObj = useMemo(() => categoriesData.reduce((acc, cat) => { acc[cat.slug] = getCatName(cat, lang); return acc; }, {}), [categoriesData, lang]);
  const categoryStats = useMemo(() => categoriesData.map(c => ({ name: getCatName(c, lang), count: userAds.filter(a => a.category === c.slug).length })).filter(c => c.count > 0), [categoriesData, userAds, lang]);

  const renderUserDashboard = () => <UserDashboard ChartTooltip={ChartTooltip} accountType={accountType} activeAds={activeAds} adStatusFilter={adStatusFilter} analyticsData={analyticsData} analyticsDays={analyticsDays} catObj={catObj} categoriesData={categoriesData} categoryStats={categoryStats} companyForm={companyForm} conversionRate={conversionRate} dashboardPage={dashboardPage} dashboardTab={dashboardTab} emailForm={emailForm} emailLoading={emailLoading} favoriteAds={favoriteAds} form={form} getImageUrl={getImageUrl} handleBulkUpload={handleBulkUpload} handleClipPayment={handleClipPayment} handleDeleteAccount={handleDeleteAccount} handleDeleteAd={handleDeleteAd} handleEditAd={handleEditAd} handleEmailSubmit={handleEmailSubmit} handleExportCompanyData={handleExportCompanyData} handleLogout={handleLogout} handleNotificationsSubmit={handleNotificationsSubmit} handlePasswordSubmit={handlePasswordSubmit} handlePromoteAd={handlePromoteAd} handleToggleAdStatus={handleToggleAdStatus} handleToggleFavorite={handleToggleFavorite} inactiveAds={inactiveAds} isDarkMode={isDarkMode} isUploadingBulk={isUploadingBulk} lang={lang} notifications={notifications} notificationsForm={notificationsForm} notificationsLoading={notificationsLoading} openProfileModal={openProfileModal} passwordForm={passwordForm} passwordLoading={passwordLoading} renderUserDashboard={renderUserDashboard} setAccountType={setAccountType} setAdStatusFilter={setAdStatusFilter} setAnalyticsDays={setAnalyticsDays} setCompanyForm={setCompanyForm} setCurrentTab={setCurrentTab} setDashboardPage={setDashboardPage} setDashboardTab={setDashboardTab} setEmailForm={setEmailForm} setNotificationsForm={setNotificationsForm} setPasswordForm={setPasswordForm} setShowCouponModal={setShowCouponModal} setShowPricingModal={setShowPricingModal} setSliderAutoplay={setSliderAutoplay} sliderAutoplay={sliderAutoplay} t={t} totalContactClicks={totalContactClicks} totalViews={totalViews} user={user} userAds={userAds} userRole={userRole} />;

  // --- РЕНДЕР ГЛАВНОЙ СТРАНИЦЫ ---
  const renderHomeScreen = () => <HomeScreen AdSenseBanner={AdSenseBanner} IconMap={IconMap} MercastoLogo={MercastoLogo} activeCat={activeCat} categoriesData={categoriesData} form={form} hasMore={hasMore} images={images} lang={lang} lastAdElementRef={lastAdElementRef} loadingAds={loadingAds} loadingMore={loadingMore} renderAdCard={renderAdCard} renderSkeletonCard={renderSkeletonCard} searchQuery={searchQuery} selectedState={selectedState} serverAds={serverAds} setActiveCat={setActiveCat} setCurrentTab={setCurrentTab} setSearchQuery={setSearchQuery} setSelectedState={setSelectedState} setShowPricingModal={setShowPricingModal} t={t} isDarkMode={isDarkMode} minPrice={minPrice} setMinPrice={setMinPrice} maxPrice={maxPrice} setMaxPrice={setMaxPrice} conditionFilter={conditionFilter} setConditionFilter={setConditionFilter} dynamicFilters={dynamicFilters} setDynamicFilters={setDynamicFilters} />;

  // --- РЕНДЕР РОСКОШНОЙ ФОРМЫ (POST SCREEN) ---
  const renderPostScreen = () => <PostScreen categoriesData={categoriesData} debouncedLocation={debouncedLocation} editingAd={editingAd} form={form} handleImageChange={handleImageChange} handlePostSubmit={handlePostSubmit} images={images} isMapUpdating={isMapUpdating} lang={lang} postLoading={postLoading} removeImage={removeImage} setEditingAd={setEditingAd} setForm={setForm} setVideoFile={setVideoFile} t={t} videoFile={videoFile} aiLoading={aiLoading} handleGenerateDescription={handleGenerateDescription} isDarkMode={isDarkMode} />;

  const renderCouponModal = () => {
    if (!showCouponModal) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative shadow-2xl animate-in fade-in zoom-in-95">
          <button onClick={() => setShowCouponModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
          <div className="flex justify-center mb-4"><Ticket className="text-[#84CC16] w-12 h-12" /></div>
          <h2 className="text-[20px] font-bold tracking-tight mb-2 text-center text-slate-900">Canjear Cupón</h2>
          <p className="text-center text-slate-500 text-[13px] mb-6">Introduce tu código promocional para recibir créditos gratis.</p>
          <form onSubmit={handleRedeemCoupon} className="space-y-4">
            <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} required placeholder="CÓDIGO" className="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 uppercase text-center font-bold tracking-widest" />
            <button type="submit" className="btn-lg w-full bg-[#0F172A] text-white hover:bg-black">Canjear</button>
          </form>
        </div>
      </div>
    );
  };

  // --- РЕНДЕР МОДАЛКИ ПРОФИЛЯ ---
  const renderProfileModal = () => {
    if (!showProfileModal) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white w-full max-w-md rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95">
          <button onClick={() => setShowProfileModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
          <h2 className="text-[22px] font-bold tracking-tight mb-6 text-center text-slate-900">Editar Perfil</h2>
          
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full bg-slate-100 mb-3 overflow-hidden relative group border border-slate-200">
                {profileForm.avatarPreview ? (
                  <img src={profileForm.avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400"><User size={40} /></div>
                )}
                <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-colors">
                  <Camera className="w-8 h-8 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) setProfileForm({ ...profileForm, avatarFile: file, avatarPreview: URL.createObjectURL(file) });
                  }}/>
                </label>
              </div>
              <span className="text-[12px] font-medium text-slate-500">Cambiar Foto</span>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">Nombre</label>
              <input value={profileForm.name} onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />
            </div>

            <button type="submit" disabled={profileLoading} className="btn-lg w-full bg-[#0F172A] text-white hover:bg-black flex justify-center mt-2">
              {profileLoading ? <Loader2 className="animate-spin" size={20}/> : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  // --- РЕНДЕР ПАНЕЛИ АДМИНИСТРАТОРА ---
  const renderAdminScreen = () => <AdminScreen IconMap={IconMap} adminCatForm={adminCatForm} adminCoupons={adminCoupons} adminLoading={adminLoading} adminPendingAds={adminPendingAds} adminReportTab={adminReportTab} adminReports={adminReports} adminTab={adminTab} adminUserReports={adminUserReports} adminUserSearch={adminUserSearch} adminUsers={adminUsers} allAds={allAds} cancelCatEdit={cancelCatEdit} categoriesData={categoriesData} couponForm={couponForm} editingCatId={editingCatId} form={form} getImageUrl={getImageUrl} getImageUrls={getImageUrls} handleAdminChangeRole={handleAdminChangeRole} handleAdminDeleteUser={handleAdminDeleteUser} handleAdminVerifyUser={handleAdminVerifyUser} handleCreateCoupon={handleCreateCoupon} handleDeleteCoupon={handleDeleteCoupon} handleDeleteReport={handleDeleteReport} handleDeleteUserReport={handleDeleteUserReport} handleEditCategory={handleEditCategory} handleModerateAd={handleModerateAd} handleSaveCategory={handleSaveCategory} handleViewAd={handleViewAd} lang={lang} loadAdminReports={loadAdminReports} loadAdminUsers={loadAdminUsers} loadCoupons={loadCoupons} loadPendingAds={loadPendingAds} loadingAdminUsers={loadingAdminUsers} loadingCoupons={loadingCoupons} loadingPendingAds={loadingPendingAds} loadingReports={loadingReports} setAdminCatForm={setAdminCatForm} setAdminReportTab={setAdminReportTab} setAdminTab={setAdminTab} setAdminUserSearch={setAdminUserSearch} setCouponForm={setCouponForm} t={t} user={user} userRole={userRole} />;

  // --- РЕНДЕР МОБИЛЬНОГО ТАБ-БАРА ---
  const renderTabBar = () => (
    <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 pb-safe pt-2 px-6 flex justify-between items-center z-40 h-[84px] shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
      <button onClick={() => setCurrentTab('home')} className={`flex flex-col items-center p-1 ${currentTab === 'home' ? 'text-[#84CC16]' : 'text-gray-400 hover:text-[#84CC16]'}`}>
        <Home className="w-6 h-6 mb-1" />
      </button>
      <button onClick={() => { setCurrentTab('home'); window.scrollTo(0,0); setTimeout(() => mobileLocationInputRef.current?.focus(), 100); }} className={`flex flex-col items-center p-1 text-gray-400 hover:text-[#84CC16]`}>
        <Search className="w-6 h-6 mb-1" />
      </button>
      <button onClick={() => setCurrentTab('post')} className="flex flex-col items-center p-1 -mt-8"><div className="flex flex-col items-center justify-center bg-[#84CC16] text-white p-3.5 rounded-full shadow-lg border-4 border-[#f5f5f5]"><PlusCircle className="w-7 h-7" /></div></button>
      <button onClick={() => { user ? setShowNotifications(!showNotifications) : (setAuthMode('login'), setShowAuthModal(true)); }} className={`flex flex-col items-center p-1 relative ${currentTab === 'notifications' ? 'text-[#84CC16]' : 'text-gray-400 hover:text-[#84CC16]'}`}><Bell className="w-6 h-6 mb-1" />{notifications.filter(n => !n.is_read).length > 0 && <span className="absolute top-0 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
      <button onClick={() => { user ? setCurrentTab('profile') : (setAuthMode('login'), setShowAuthModal(true)); }} className={`flex flex-col items-center p-1 ${currentTab === 'profile' ? 'text-[#84CC16]' : 'text-gray-400 hover:text-[#84CC16]'}`}>
        <User className="w-6 h-6 mb-1" />
      </button>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-[var(--paper)] font-sans text-[var(--ink)] selection:bg-[#84CC16]/20">
      
      {/* GLOBAL HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-3 h-[68px]">
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentTab('home'); setViewedAd(null); setViewedCompany(null); setActiveCat(''); setSearchQuery(''); }} className="flex items-center gap-2.5 shrink-0 hover:opacity-90 transition-opacity">
              <MercastoLogo />
            </a>
            <div className="hidden lg:flex flex-1 items-center">
              <div className="flex w-full max-w-[820px] items-center bg-white border border-slate-300 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-[#84CC16]/30 focus-within:border-[#84CC16]">
                <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
              <input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentTab('home'); setViewedAd(null); setViewedCompany(null); }} onKeyDown={e => e.key === 'Enter' && executeSearch()} placeholder={t.search_placeholder || "Buscar autos, celulares, empleos..."} className="w-full px-3 py-2.5 bg-transparent outline-none text-[14px]" />
                <div className="h-7 w-px bg-slate-200"></div>
                
                {/* КАСТОМНЫЙ ПОПАП ВЫБОРА ЛОКАЦИИ (ШТАТ + ГОРОД) */}
                <div className="relative flex items-center w-full max-w-[220px]">
                  <MapPin className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
                  <button onClick={() => setShowLocationPicker(!showLocationPicker)} className="w-full px-2 py-2.5 bg-transparent outline-none text-[14px] text-left truncate text-slate-700">
                    {searchLocationInput || t.location_placeholder || "Estado y Ciudad"}
                  </button>
                  
                  {showLocationPicker && (
                    <div className="absolute top-full left-0 mt-3 w-[260px] bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50">
                      <div className="mb-3">
                        <label className="block text-[12px] font-semibold text-slate-700 mb-1">{t.state || 'Estado'}</label>
                        <select value={locState} onChange={e => { setLocState(e.target.value); setLocCity(''); }} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-[#84CC16]/30 cursor-pointer">
                          <option value="">{t.all_mexico || 'Todo México'}</option>
                          {Object.keys(MEXICO_STATES_CITIES).map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                      </div>
                      {locState && (
                        <div className="mb-4">
                          <label className="block text-[12px] font-semibold text-slate-700 mb-1">{t.city || 'Ciudad / Municipio'}</label>
                          <select value={locCity} onChange={e => setLocCity(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-[#84CC16]/30 cursor-pointer">
                            <option value="">{t.all_cities || 'Todas las ciudades'}</option>
                          {MEXICO_STATES_CITIES[locState]?.map(city => <option key={city} value={city}>{city}</option>)}
                          </select>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => setShowLocationPicker(false)} className="btn-sm flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200">{t.cancel || 'Cerrar'}</button>
                      <button onClick={() => { const query = locCity ? `${locCity}, ${locState}` : locState; setSearchLocationInput(query); setSelectedState(locState); setShowLocationPicker(false); executeSearch(null, query); }} className="btn-sm flex-1 bg-[#84CC16] text-white hover:bg-[#65A30D]">{t.apply || 'Aplicar'}</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-7 w-px bg-slate-200"></div>
                <select value={radius} onChange={e => setRadius(Number(e.target.value))} className="bg-transparent px-3 py-2.5 text-[13px] outline-none text-slate-700 w-fit cursor-pointer">
                  <option value={5}>+5 km</option>
                  <option value={10}>+10 km</option>
                  <option value={25}>+25 km</option>
                  <option value={50}>+50 km</option>
                  <option value={100}>+100 km</option>
                </select>
              <button onClick={executeSearch} className="btn-md bg-[#84CC16] hover:bg-[#65A30D] text-white m-1 ml-2 flex items-center gap-1.5">
                  <Search size={16}/>
                  {t.search_btn || "Buscar"}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100/50 hover:bg-slate-200/50 border border-slate-200/50 text-slate-500 hover:text-slate-900 transition-colors mr-1">
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <div className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 bg-slate-100/50 px-2 py-1 rounded-lg border border-slate-200/50">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <select value={lang} onChange={(e) => setLang(e.target.value)} className="bg-transparent text-[12px] font-bold outline-none cursor-pointer uppercase appearance-none pr-1">
                  {Object.keys(translations).map(l => (
                    <option key={l} value={l}>{l.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
              <button onClick={() => { user ? setShowNotifications(!showNotifications) : (setAuthMode('login'), setShowAuthModal(true)); }} className="relative p-2.5 hover:bg-slate-100 rounded-xl text-slate-700">
                  <Bell className="w-[22px] h-[22px]" />
                  {notifications.filter(n => !n.is_read).length > 0 && <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                </button>
                {showNotifications && user && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                    <div className="p-4 border-b border-slate-100 font-bold text-slate-900 flex justify-between items-center">
                    <span>{t.notifications || "Notificaciones"}</span>
                      {notifications.filter(n => !n.is_read).length > 0 && (
                      <button onClick={handleMarkAllNotificationsRead} className="text-[11px] text-[#65A30D] hover:underline font-medium font-sans">{t.mark_all_read || "Marcar todas leídas"}</button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? <div className="p-6 text-center text-slate-500 text-[13px]">{t.no_notifications || "No tienes notificaciones"}</div> :
                        notifications.map(n => (
                          <div key={n.id} onClick={() => handleMarkNotificationRead(n.id)} className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors relative group ${!n.is_read ? 'bg-[#84CC16]/5' : ''}`}>
                            <h4 className={`text-[13px] pr-6 ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</h4>
                            <p className="text-[12px] text-slate-600 mt-1">{n.message}</p>
                            <span className="text-[10px] text-slate-400 block mt-2">{new Date(n.created_at).toLocaleString()}</span>
                            <button onClick={(e) => handleDeleteNotification(e, n.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            <button onClick={() => { if(user) { setCurrentTab('profile'); setDashboardTab('favorites'); } else { setAuthMode('login'); setShowAuthModal(true); } }} className="relative p-2.5 hover:bg-slate-100 rounded-xl">
                <Heart className="w-[22px] h-[22px] text-slate-700" />
                {favoriteIds.length > 0 && <span className="absolute -top-0.5 -right-0.5 bg-[#84CC16] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full border-2 border-white">{favoriteIds.length}</span>}
              </button>
            <button onClick={() => { if(user) { setCurrentTab('profile'); } else { setAuthMode('login'); setShowAuthModal(true); } setViewedAd(null); setViewedCompany(null); }} className="flex items-center gap-2 pl-1 pr-2.5 py-1 hover:bg-slate-100 rounded-xl">
                {user?.avatar_url ? (
                  <img src={getImageUrl(user.avatar_url)} className="w-8 h-8 rounded-lg object-cover" alt=""/>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500"><User size={18} /></div>
                )}
              <span className="text-[13px] font-medium hidden lg:block">{user?.name || t.guest || 'Invitado'}</span>
              </button>
              <button onClick={() => { setCurrentTab('post'); setViewedAd(null); setViewedCompany(null); }} className="btn-lg bg-[#84CC16] hover:bg-[#65A30D] text-white shadow-md shadow-[#84CC16]/20 ml-1 hidden sm:inline-flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" /> {t.post_ad || "Publicar"}
              </button>
            </div>
          </div>
          {/* Mobile Search & Location */}
          <div className="lg:hidden pb-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#84CC16]/30">
              <Search className="w-4 h-4 text-slate-500" />
            <input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentTab('home'); setViewedAd(null); setViewedCompany(null); }} onKeyDown={e => e.key === 'Enter' && executeSearch()} placeholder={t.search_placeholder_short || "Buscar producto..."} className="bg-transparent w-full text-sm outline-none"/>
            </div>
            
            {/* МОБИЛЬНЫЙ ВЫБОР ЛОКАЦИИ */}
            <div className="relative">
              <div onClick={() => setShowMobileLocationPicker(!showMobileLocationPicker)} className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2.5 cursor-pointer">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span className={`text-sm ${searchLocationInput ? 'text-slate-900' : 'text-slate-500'}`}>{searchLocationInput || t.location_placeholder_short || "Ubicación o Estado"}</span>
              </div>
              {showMobileLocationPicker && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50">
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">{t.state || 'Estado'}</label>
                  <select value={locState} onChange={e => { setLocState(e.target.value); setLocCity(''); }} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-[14px] outline-none mb-3 bg-white">
                    <option value="">{t.all_mexico || 'Todo México'}</option>
                    {Object.keys(MEXICO_STATES_CITIES).map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                  {locState && (
                    <>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">{t.city || 'Ciudad'}</label>
                      <select value={locCity} onChange={e => setLocCity(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-[14px] outline-none mb-3 bg-white">
                        <option value="">{t.all_cities || 'Todas las ciudades'}</option>
                      {MEXICO_STATES_CITIES[locState]?.map(city => <option key={city} value={city}>{city}</option>)}
                      </select>
                    </>
                  )}
                <button onClick={() => { const query = locCity ? `${locCity}, ${locState}` : locState; setSearchLocationInput(query); setSelectedState(locState); setShowMobileLocationPicker(false); executeSearch(null, query); }} className="btn-sm w-full bg-[#84CC16] text-white py-3">{t.apply || 'Aplicar'}</button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-white">
          <div className="max-w-[1440px] mx-auto px-4 lg:px-6">
            <nav className="flex items-center gap-6 overflow-x-auto no-scrollbar text-[13.5px] font-medium text-slate-600">
              <a onClick={() => setActiveCat('')} className={`whitespace-nowrap py-3.5 cursor-pointer border-b-2 transition-colors ${activeCat === '' ? 'border-[#84CC16] text-[#0F172A] font-bold' : 'border-transparent hover:text-[#0F172A]'}`}>{t.all || 'All'}</a>
              {categoriesData.map(c => (
                <a key={c.slug} onClick={() => setActiveCat(c.slug)} className={`whitespace-nowrap py-3.5 cursor-pointer border-b-2 transition-colors ${activeCat === c.slug ? 'border-[#84CC16] text-[#0F172A] font-bold' : 'border-transparent hover:text-[#0F172A]'}`}>{getCatName(c, lang)}</a>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="w-full">
        {viewedAd ? (
          renderAdDetailScreen()
        ) : viewedCompany ? (
          renderStorefrontScreen()
        ) : (
          <>
            <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#84CC16]" /></div>}>
              <Routes>
                <Route path="/" element={renderHomeScreen()} />
                <Route path="/post" element={renderPostScreen()} />
                <Route path="/profile" element={renderUserDashboard()} />
                <Route path="/admin" element={renderAdminScreen()} />
                <Route path="/terms" element={<StaticPages currentTab="terms" />} />
                <Route path="/privacy" element={<StaticPages currentTab="privacy" />} />
                <Route path="/help" element={<StaticPages currentTab="help" />} />
                <Route path="/safety" element={<StaticPages currentTab="safety" />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-10 bg-[#0F172A] text-slate-300">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3 h-8 opacity-80 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => { setCurrentTab('home'); setViewedAd(null); setActiveCat(''); setSearchQuery(''); }}>
                <MercastoLogo className="h-8" />
              </div>
              <p className="text-[13px] text-slate-400 leading-relaxed">{t.footer_desc || 'El marketplace local de más rápido crecimiento en México. Compra, vende, renta y encuentra empleo de forma segura.'}</p>
            </div>
            <div><h5 className="font-semibold text-white mb-3 text-[14px]">{t.buyers || 'Compradores'}</h5><ul className="space-y-2 text-[13px]"><li><a href="#" onClick={e=>{e.preventDefault(); setCurrentTab('help'); window.scrollTo(0,0);}} className="hover:text-white cursor-pointer">{t.how_to_buy || 'Cómo comprar'}</a></li><li><a href="#" onClick={e=>{e.preventDefault(); setCurrentTab('safety'); window.scrollTo(0,0);}} className="hover:text-white cursor-pointer">{t.safety_tips || 'Consejos de seguridad'}</a></li><li><a href="#" onClick={e=>{e.preventDefault(); if(user){setCurrentTab('profile'); setDashboardTab('favorites');} else {setShowAuthModal(true);}}} className="hover:text-white cursor-pointer">{t.favorites || 'Favoritos'}</a></li></ul></div>
            <div><h5 className="font-semibold text-white mb-3 text-[14px]">{t.sellers || 'Vendedores'}</h5><ul className="space-y-2 text-[13px]"><li><a href="#" onClick={(e) => { e.preventDefault(); setCurrentTab('post'); window.scrollTo(0,0);}} className="hover:text-white cursor-pointer">{t.post_ad || 'Publicar anuncio'}</a></li><li><a href="#" onClick={(e) => { e.preventDefault(); setShowPricingModal(true)}} className="hover:text-white cursor-pointer">{t.pricing || 'Precios'}</a></li><li><a href="#" onClick={e=>{e.preventDefault(); if(user){setCurrentTab('profile'); setDashboardTab('my_ads');} else {setShowAuthModal(true);}}} className="hover:text-white cursor-pointer">{t.promote_ad || 'Promocionar anuncio'}</a></li></ul></div>
            <div><h5 className="font-semibold text-white mb-3 text-[14px]">{t.business || 'Negocios'}</h5><ul className="space-y-2 text-[13px]"><li><a href="#" onClick={(e) => { e.preventDefault(); setShowPricingModal(true)}} className="hover:text-white cursor-pointer">Mercasto Pro</a></li><li><a href="#" onClick={e=>{e.preventDefault(); setCurrentTab('terms'); window.scrollTo(0,0);}} className="hover:text-white cursor-pointer">API</a></li><li><a href="#" onClick={e=>{e.preventDefault(); alert('Escríbenos a partners@mercasto.com');}} className="hover:text-white cursor-pointer">{t.partners || 'Socios'}</a></li></ul></div>
            <div><h5 className="font-semibold text-white mb-3 text-[14px]">{t.help || 'Ayuda'}</h5><ul className="space-y-2 text-[13px]"><li><a href="#" onClick={e=>{e.preventDefault(); setCurrentTab('help'); window.scrollTo(0,0);}} className="hover:text-white cursor-pointer">{t.help_center || 'Centro de Ayuda'}</a></li><li><a href="#" onClick={e=>{e.preventDefault(); setCurrentTab('safety'); window.scrollTo(0,0);}} className="hover:text-white cursor-pointer">{t.safety_center || 'Centro de Seguridad'}</a></li><li><a href="#" onClick={e=>{e.preventDefault(); setCurrentTab('privacy'); window.scrollTo(0,0);}} className="hover:text-white cursor-pointer">{t.privacy_policy || 'Aviso de Privacidad'}</a></li></ul></div>
          </div>
          <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-[12px] text-slate-400">
              <span>© 2026 Mercasto México S.A. de C.V.</span>
            </div>
          </div>
        </div>
      </footer>

      {!viewedAd && renderTabBar()}
      {renderPricingModal()}
      {renderProfileModal()}
      {renderCouponModal()}
      {renderQRModal()}
      {renderReportModal()}
      {renderUserReportModal()}

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => !authLoading && setShowAuthModal(false)}>
          {requiresTwoFactor ? (
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <h2 className="text-[22px] font-bold tracking-tight mb-6 text-center text-slate-900">Verificación de dos pasos</h2>
              <p className="text-center text-slate-500 text-sm -mt-4 mb-6">Ingresa el código de tu app de autenticación.</p>
              <form onSubmit={handleTwoFactorSubmit} className="space-y-3.5">
                <input name="code" required autoFocus placeholder="Código de 6 dígitos" maxLength="6" className="w-full text-center tracking-[0.5em] px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all placeholder:text-slate-400"/>
                <div className="pt-2">
                  <button type="submit" disabled={authLoading} className="btn-lg w-full bg-[#84CC16] text-white hover:bg-[#65A30D] flex items-center justify-center">
                    {authLoading ? <Loader2 className="animate-spin" size={20}/> : 'Verificar e Iniciar Sesión'}
                  </button>
                </div>
              </form>
            </div>
          ) : authMode === 'phone_request' || authMode === 'phone_verify' ? (
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
              <h2 className="text-[22px] font-bold tracking-tight mb-6 text-center text-slate-900">Acceso con Teléfono</h2>
              
              {authMode === 'phone_request' ? (
                <form onSubmit={handlePhoneRequestSubmit} className="space-y-3.5">
                  <input name="phone_number" required type="tel" placeholder="Número de teléfono" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all"/>
                  <button type="submit" disabled={authLoading} className="btn-lg w-full bg-[#0F172A] text-white hover:bg-black flex items-center justify-center mt-2">{authLoading ? <Loader2 className="animate-spin" size={20}/> : 'Recibir SMS'}</button>
                </form>
              ) : (
                <form onSubmit={handlePhoneVerifySubmit} className="space-y-3.5">
                  <p className="text-center text-slate-500 text-[13px] -mt-2 mb-4">Código enviado al <br/><strong>{authPhone}</strong></p>
                  <input name="code" required autoFocus placeholder="Código de 6 dígitos" maxLength="6" className="w-full text-center tracking-[0.5em] px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all"/>
                  <button type="submit" disabled={authLoading} className="btn-lg w-full bg-[#84CC16] text-white hover:bg-[#65A30D] flex items-center justify-center mt-2">{authLoading ? <Loader2 className="animate-spin" size={20}/> : 'Verificar y Entrar'}</button>
                </form>
              )}
              <div className="mt-6 text-center">
                 <button type="button" onClick={() => setAuthMode('login')} className="text-[13px] font-medium text-slate-500 hover:text-[#84CC16] transition-colors underline underline-offset-4">Volver a iniciar sesión</button>
              </div>
            </div>
          ) : (
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95">
                <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
                <h2 className="text-[22px] font-bold tracking-tight mb-6 text-center text-slate-900">
                  {authMode === 'login' ? t.login : authMode === 'register' ? t.register : authMode === 'forgot_password' ? t.forgot_password : t.reset_password}
                </h2>
                <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                    {authMode === 'register' && <input name="name" required placeholder={t.name} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all placeholder:text-slate-400"/>}
                    {authMode !== 'reset_password' && <input name="email" type="email" required placeholder={t.email} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all placeholder:text-slate-400"/>}
                    {(authMode === 'login' || authMode === 'register') && <input name="password" type="password" required placeholder={t.password} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all placeholder:text-slate-400"/>}
                    {authMode === 'reset_password' && <input name="password" type="password" required placeholder={t.new_password} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all placeholder:text-slate-400"/>}
                    <div className="pt-2">
                      <button type="submit" disabled={authLoading} className="btn-lg w-full bg-[#84CC16] text-white hover:bg-[#65A30D] flex items-center justify-center">
                          {authLoading ? <Loader2 className="animate-spin" size={20}/> : (authMode === 'login' ? t.login : authMode === 'register' ? t.register : authMode === 'forgot_password' ? t.send_link : t.reset_password)}
                      </button>
                    </div>
                </form>
                
                {(authMode === 'login' || authMode === 'register') && (
                  <>
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                      <div className="relative flex justify-center text-[12px]"><span className="bg-white px-2 text-slate-400 font-medium">O</span></div>
                    </div>

                    <div className="space-y-2.5">
                      {availableProviders?.google && (
                        <button type="button" onClick={() => window.location.href = `${API_URL}/auth/google/redirect`} className="btn-md w-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-3">
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google
                        </button>
                      )}
                      <button type="button" onClick={() => setAuthMode('phone_request')} className="btn-md w-full bg-[#10B981] text-white hover:bg-[#059669] flex items-center justify-center gap-3">
                          <Phone className="w-4 h-4" />
                          Teléfono (SMS)
                      </button>
                      {availableProviders?.apple && (
                      <button type="button" onClick={() => window.location.href = `${API_URL}/auth/apple/redirect`} className="btn-md w-full bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-3">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                              <path d="M16.365 21.435c-1.47 1.043-2.52 1.488-4.225 1.488-1.545 0-2.925-.536-4.39-1.503-3.64-2.42-6.58-8.24-4.88-13.16 1.18-3.41 3.98-5.32 6.84-5.32 1.54 0 2.92.54 4.15 1.25 1.05.61 1.67.92 2.29.92.57 0 1.25-.32 2.38-.97 1.44-.82 3.12-1.12 4.7-.62 2.66.86 4.49 2.97 5.48 5.76-4.5 1.83-5.34 7.63-2.02 10.37-1.07 2.95-3.21 5.34-5.59 7.04-1.28.92-2.3 1.34-3.67 1.34-1.29 0-2.35-.45-3.8-1.39zm-3.08-20.17c-.55-2.05 1.27-4.13 3.3-4.26.65 2.15-1.39 4.34-3.3 4.26z"/>
                          </svg>
                          Apple
                      </button>
                      )}
                      {availableProviders?.telegram && (
                      <button type="button" onClick={() => window.location.href = `${API_URL}/auth/telegram/redirect`} className="btn-md w-full bg-[#229ED9] text-white hover:bg-[#1c88ba] flex items-center justify-center gap-2">
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
                        <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-[13px] font-medium text-slate-500 hover:text-[#84CC16] transition-colors underline underline-offset-4">
                            {authMode === 'login' ? "¿No tienes cuenta? Únete" : "Ya tengo cuenta"}
                        </button>
                    )}
                    {authMode === 'login' && (
                        <button type="button" onClick={() => setAuthMode('forgot_password')} className="text-[12px] font-medium text-slate-400 hover:text-[#84CC16] transition-colors">
                            ¿Olvidaste tu contraseña?
                        </button>
                    )}
                    {(authMode === 'forgot_password' || authMode === 'reset_password' || authMode === 'phone_request' || authMode === 'phone_verify') && (
                        <button type="button" onClick={() => setAuthMode('login')} className="text-[13px] font-medium text-slate-500 hover:text-[#84CC16] transition-colors underline underline-offset-4">
                            Volver a iniciar sesión
                        </button>
                    )}
                </div>
            </div>
          )}
        </div>
      )}

      {/* STYLES */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
        :root{--lime:#84CC16;--lime2:#65A30D;--ink:#0F172A;--paper:#F8FAFC}
        html{scroll-behavior:smooth}
        body{font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:var(--paper);color:var(--ink); -webkit-font-smoothing: antialiased;}
        h1, h2, h3, h4, h5, p, span, button, input, select, label, textarea { font-family: 'Inter', sans-serif !important; }
        * { outline: none !important; font-style: normal !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .btn-sm{padding:.375rem .75rem;font-size:.8125rem;line-height:1.1rem;border-radius:.5rem;font-weight:500;transition:.15s}
        .btn-md{padding:.55rem 1rem;font-size:.875rem;line-height:1.25rem;border-radius:.6rem;font-weight:500;transition:.15s}
        .btn-lg{padding:.8rem 1.4rem;font-size:.95rem;line-height:1.25rem;border-radius:.75rem;font-weight:600;transition:.15s}
        .card{transition:all .2s ease}
        .card:hover{transform:translateY(-2px);box-shadow:0 10px 25px -10px rgba(15,23,42,.15)}
        .scrollbar-hide::-webkit-scrollbar{display:none}
        .scrollbar-hide{scrollbar-width:none;-ms-overflow-style:none}
        .line-clamp-1{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
        .line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .badge{font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;letter-spacing:.02em}
        
        /* ГЛОБАЛЬНЫЕ ПРАВИЛА ТЕМНОЙ ТЕМЫ */
        html.dark { --paper: #0F172A; --ink: #F8FAFC; }
        html.dark .bg-white { background-color: #1E293B !important; }
        html.dark .bg-slate-50, html.dark .bg-slate-100 { background-color: #0F172A !important; }
        html.dark .border-slate-100, html.dark .border-slate-200, html.dark .border-slate-300 { border-color: #334155 !important; }
        html.dark .text-slate-900, html.dark .text-slate-800, html.dark .text-slate-700 { color: #F8FAFC !important; }
        html.dark .text-slate-600, html.dark .text-slate-500, html.dark .text-slate-400 { color: #94A3B8 !important; }
        html.dark .bg-white\\/90 { background-color: rgba(30, 41, 59, 0.9) !important; }
        html.dark input, html.dark textarea, html.dark select { background-color: #0F172A !important; color: #F8FAFC !important; }
      `}} />
    </div>
  );
}
 
