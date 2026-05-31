import AdSenseBanner from '../common/AdSenseBanner';
import { getRecentlyViewed, clearRecentlyViewed } from '../../utils/recentlyViewed';
import { mexicoLocations, subcategoriesMap, translations, spotlightRealEstate, jobsBoard, servicesMarketplace, automotiveDeals, recentlyViewed } from '../../constants/mockData';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Pencil, PlusCircle, Activity, Heart, MapPin, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Camera, User, BadgeCheck, ShieldCheck, Building2, Zap, Ticket, Crown, Store, UploadCloud, LogOut, Settings, BarChart3, QrCode, Download, Loader2, Settings2, Globe, Sparkles, Play, Video, Phone, AlertTriangle, ArrowRight, ExternalLink, MessageCircle, Share2, Star, Info, HelpCircle, Menu, X, Bell, LayoutGrid, List } from "lucide-react";
import SidebarFilters from '../common/SidebarFilters';

// --- MAP COORDINATES ---
const STATE_COORDS = {
  "Aguascalientes": [21.8853, -102.2916],
  "Baja California": [30.8406, -115.2838],
  "Baja California Sur": [26.0444, -111.6661],
  "Campeche": [19.8301, -90.5349],
  "Chiapas": [16.7569, -93.1292],
  "Chihuahua": [28.6330, -106.0691],
  "Ciudad de México": [19.4326, -99.1332],
  "CDMX": [19.4326, -99.1332],
  "Coahuila": [27.0587, -101.7068],
  "Colima": [19.2433, -103.7247],
  "Durango": [24.0277, -104.6532],
  "Guanajuato": [21.0190, -101.2574],
  "Guerrero": [17.4392, -99.5451],
  "Hidalgo": [20.0911, -98.7624],
  "Jalisco": [20.6597, -103.3496],
  "GDL": [20.6597, -103.3496],
  "México": [19.3565, -99.6312],
  "EdoMex": [19.3565, -99.6312],
  "Michoacán": [19.5665, -101.7068],
  "Morelos": [18.6813, -99.1013],
  "Nayarit": [21.7514, -104.8455],
  "Nuevo León": [25.5922, -100.0574],
  "Oaxaca": [17.0732, -96.7266],
  "OAX": [17.0732, -96.7266],
  "Puebla": [19.0414, -98.2063],
  "Querétaro": [20.5888, -100.3899],
  "QRO": [20.5888, -100.3899],
  "Quintana Roo": [19.1847, -88.4753],
  "San Luis Potosí": [22.1565, -100.9855],
  "Sinaloa": [25.1721, -107.4795],
  "Sonora": [29.2972, -110.3309],
  "Tabasco": [17.8409, -92.6189],
  "Tamaulipas": [24.2669, -98.8363],
  "Tlaxcala": [19.3182, -98.2375],
  "Veracruz": [19.1738, -96.1342],
  "Yucatán": [20.7099, -89.0943],
  "Zacatecas": [22.7709, -102.5832]
};

const LeafletMap = ({ ads, onViewAd }) => {
  const [expanded, setExpanded] = React.useState(false);
  const mapAds = React.useMemo(() => (ads || []).slice(0, 6).map(ad => {
    if (ad.latitude && ad.longitude) return { ad, coords: [parseFloat(ad.latitude), parseFloat(ad.longitude)] };
    const stateName = ad.state || ad.location?.split(',')[1]?.trim() || ad.location?.split('·')[0]?.trim() || ad.location?.split(',')[0]?.trim() || '';
    const cleanedState = Object.keys(STATE_COORDS).find(k =>
      stateName.toLowerCase().includes(k.toLowerCase()) ||
      k.toLowerCase().includes(stateName.toLowerCase())
    );
    const base = cleanedState ? STATE_COORDS[cleanedState] : [23.6345, -102.5528];
    return { ad, coords: base };
  }), [ads]);

  const center = mapAds[0]?.coords || [23.6345, -102.5528];
  const bbox = `${center[1] - 6}%2C${center[0] - 4}%2C${center[1] + 6}%2C${center[0] + 4}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${center[0]}%2C${center[1]}`;

  const mapBody = (
    <>
      <iframe title="Mapa de anuncios" src={mapUrl} className="h-full w-full border-0 opacity-90 dark:opacity-75" loading="lazy" />
      <div className="absolute left-3 right-3 top-3 z-[3] flex flex-wrap gap-2">
        <div className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-slate-800 shadow-sm dark:bg-slate-950/90 dark:text-white">Todo México</div>
        <div className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:bg-slate-950/90 dark:text-slate-300">Filtros activos</div>
        <button type="button" onClick={() => setExpanded(true)} className="ml-auto rounded-full bg-[#84CC16] px-3 py-1.5 text-xs font-black text-slate-950 shadow-sm">
          Ampliar mapa
        </button>
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[2] flex gap-2 overflow-x-auto">
        {mapAds.slice(0, 4).map(({ ad }, index) => (
          <button key={ad.id || index} onClick={() => onViewAd(ad)} className={`pointer-events-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-black text-white shadow-lg ${index % 2 ? 'bg-slate-950' : 'bg-[#84CC16]'}`}>
            ${Number(ad.price || 0).toLocaleString('es-MX', { notation: 'compact' })}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <>
    <div className="osm-embed-shell relative mb-4 md:mb-6 h-[190px] md:h-[320px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shadow-md">
      {mapBody}
    </div>
    {expanded && (
      <div className="fixed inset-0 z-[9999] bg-slate-950/80 p-3 backdrop-blur-sm">
        <div className="relative h-full overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
          <div className="absolute inset-x-3 top-3 z-[4] flex gap-2 rounded-2xl bg-white/95 p-2 shadow-xl dark:bg-slate-900/95">
            <input className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700" placeholder="Buscar en el mapa..." />
            <button className="rounded-xl bg-[#84CC16] px-3 py-2 text-sm font-black text-slate-950">Buscar</button>
            <button type="button" onClick={() => setExpanded(false)} className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white dark:bg-slate-700">Cerrar</button>
          </div>
          <iframe title="Mapa ampliado de anuncios" src={mapUrl} className="h-full w-full border-0 opacity-90" loading="lazy" />
          <div className="absolute inset-x-0 bottom-0 z-[3] bg-slate-950/90 p-3">
            <div className="flex gap-2 overflow-x-auto">
              {mapAds.slice(0, 6).map(({ ad }, index) => (
                <button key={ad.id || index} onClick={() => onViewAd(ad)} className="shrink-0 rounded-full bg-[#84CC16] px-3 py-2 text-xs font-black text-slate-950">
                  ${Number(ad.price || 0).toLocaleString('es-MX', { notation: 'compact' })}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default function HomeScreen({ IconMap, MercastoLogo, activeCat, adsTotal = 0, categoriesData, executeSearch, form, hasMore, images, lang, lastAdElementRef, loadingAds, loadingMore, renderAdCard, searchQuery, selectedState, serverAds, setActiveCat, setCurrentTab, setSearchLocation, setSearchLocationInput, setSearchQuery, setSelectedState, setShowPricingModal, t, minPrice, setMinPrice, maxPrice, setMaxPrice, conditionFilter, setConditionFilter, dynamicFilters, setDynamicFilters, getImageUrl, handleViewAd }) {
    const [showMobileFilters, setShowMobileFilters] = React.useState(false);
    const [showAllCategories, setShowAllCategories] = React.useState(false);
    const [showMap, setShowMap] = React.useState(false);
    const [viewLayout, setViewLayout] = React.useState('grid'); // 'grid' or 'list'
    const [homeToast, setHomeToast] = React.useState(null);
    const homeToastTimerRef = React.useRef(null);
    const navigate = useNavigate();
    const VERTICAL_SLUGS = {
      'coches-y-motor': '/autos',
      'motor': '/autos',
      'inmobiliaria': '/inmuebles',
      'empleo': '/empleos',
      'servicios': '/servicios',
    };
    const getVerticalPath = React.useCallback((slug = '') => {
      if (VERTICAL_SLUGS[slug]) return VERTICAL_SLUGS[slug];
      if (slug.startsWith('coches-y-motor/')) return '/autos';
      if (slug.startsWith('inmobiliaria/')) return '/inmuebles';
      if (slug.startsWith('empleo/')) return '/empleos';
      if (slug.startsWith('servicios/')) return '/servicios';
      return null;
    }, []);
    const verticalCategoryCards = React.useMemo(() => ([
      { slug: 'boletos', name: { es: 'Boletos', en: 'Tickets' }, icon: 'Ticket' },
      { slug: 'motor', name: { es: 'Autos', en: 'Cars' }, icon: 'Car' },
      { slug: 'inmobiliaria', name: { es: 'Inmuebles', en: 'Real Estate' }, icon: 'Home' },
      { slug: 'electronica', name: { es: 'Electrónica', en: 'Electronics' }, icon: 'Cpu' },
      { slug: 'servicios', name: { es: 'Servicios', en: 'Services' }, icon: 'Wrench' },
      { slug: 'empleo', name: { es: 'Empleos', en: 'Jobs' }, icon: 'Briefcase' },
      { slug: 'hogar', name: { es: 'Hogar', en: 'Home' }, icon: 'Sofa' },
      { slug: 'moda', name: { es: 'Moda', en: 'Fashion' }, icon: 'Shirt' },
      { slug: 'bebes', name: { es: 'Bebés', en: 'Babies' }, icon: 'Baby' },
      { slug: 'mascotas', name: { es: 'Mascotas', en: 'Pets' }, icon: 'PawPrint' },
      { slug: 'deportes', name: { es: 'Deportes', en: 'Sports' }, icon: 'Bike' },
      { slug: 'tiendas', name: { es: 'Tiendas', en: 'Stores' }, icon: 'Store', action: 'pricing' },
    ]), []);

    // Заглушка (Fallback) на случай, если база данных категорий пуста
    const defaultCats = [
      { slug: 'motor', name: { es: 'Motor' }, icon: 'Car' },
      { slug: 'inmobiliaria', name: { es: 'Inmuebles' }, icon: 'Home' },
      { slug: 'empleo', name: { es: 'Empleo' }, icon: 'Briefcase' },
      { slug: 'servicios', name: { es: 'Servicios' }, icon: 'Wrench' },
      { slug: 'informatica', name: { es: 'Informática' }, icon: 'Monitor' },
      { slug: 'telefonia', name: { es: 'Telefonía' }, icon: 'Smartphone' },
      { slug: 'hogar', name: { es: 'Hogar' }, icon: 'Sofa' },
      { slug: 'moda', name: { es: 'Moda' }, icon: 'Shirt' },
      { slug: 'bebes', name: { es: 'Bebés' }, icon: 'Baby' },
      { slug: 'mascotas', name: { es: 'Mascotas' }, icon: 'PawPrint' },
      { slug: 'ocio', name: { es: 'Ocio' }, icon: 'Bike' },
      { slug: 'boletos', name: { es: 'Boletos' }, icon: 'Ticket' }
    ];
    const displayCategories = categoriesData && categoriesData.length > 0 ? categoriesData : defaultCats;
    const homeCategories = React.useMemo(() => verticalCategoryCards, [verticalCategoryCards]);
    const trendingAds = React.useMemo(() => {
      const seen = new Set();
      return (serverAds || [])
        .filter(ad => {
          if (!ad?.id || seen.has(ad.id)) return false;
          seen.add(ad.id);
          return true;
        })
        .slice(0, 12);
    }, [serverAds]);
    const displayImageMap = React.useMemo(() => {
      const seen = new Map();
      const result = new Map();
      (serverAds || []).forEach(ad => {
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
    }, [serverAds, activeCat]);
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
             <h2 className="text-[18px] font-bold text-slate-900">{t.search_results || 'Resultados'} <span className="text-slate-400 text-[14px] font-normal ml-1">({serverAds.length})</span></h2>
             <button onClick={() => setShowMobileFilters(!showMobileFilters)} className={`btn-sm flex items-center gap-2 border transition-colors ${showMobileFilters ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}>
               <Settings2 size={16} /> Filtros
             </button>
          </div>

          {/* Динамическая боковая панель (Адаптивная: скрывается на мобилках, открывается по кнопке) */}
          <aside className={`w-full lg:w-1/4 shrink-0 ${showMobileFilters ? 'block' : 'hidden md:block'}`}>
             <SidebarFilters activeCat={activeCat} minPrice={minPrice} setMinPrice={setMinPrice} maxPrice={maxPrice} setMaxPrice={setMaxPrice} conditionFilter={conditionFilter} setConditionFilter={setConditionFilter} dynamicFilters={dynamicFilters} setDynamicFilters={setDynamicFilters} t={t} lang={lang} />
          </aside>

          {/* Сетка результатов (товары) */}
          <div className="flex-1">
            <div className="hidden md:flex justify-between items-center mb-6">
              <h2 className="text-[22px] font-bold tracking-tight text-slate-900">{t.search_results || 'Resultados de búsqueda'} <span className="text-slate-400 text-[14px] font-normal ml-2">({serverAds.length})</span></h2>
            </div>

            {/* Map and Layout Control Panel */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <button 
                onClick={() => setShowMap(prev => !prev)} 
                className={`btn-sm flex items-center gap-2 border transition-all ${showMap ? 'bg-[#0f8f7d] text-white border-[#0f8f7d]' : 'bg-white text-slate-700 border-slate-300 hover:border-[#0f8f7d]'}`}
              >
                <MapPin size={16} /> {showMap ? 'Ocultar mapa' : 'Mostrar en mapa'}
              </button>
              
              <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1 bg-white">
                <button 
                  onClick={() => setViewLayout('grid')} 
                  className={`btn-sm px-2.5 py-1 rounded-lg transition-all ${viewLayout === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  title="Vista Cuadrícula"
                >
                  <LayoutGrid size={15} />
                </button>
                <button 
                  onClick={() => setViewLayout('list')} 
                  className={`btn-sm px-2.5 py-1 rounded-lg transition-all ${viewLayout === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  title="Vista Lista"
                >
                  <List size={15} />
                </button>
              </div>
            </div>

            {showMap && serverAds.length > 0 && (
              <LeafletMap ads={serverAds} onViewAd={handleViewAd} />
            )}

          {loadingAds ? (

            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#84CC16]" size={40}/></div>

          ) : serverAds.length === 0 ? (

            <div className="py-20 text-center flex flex-col items-center">

              <Search size={48} className="text-slate-300 mb-4" />

              <span className="text-slate-400 font-bold uppercase tracking-widest">{t.noAds}</span>

            </div>

          ) : (

            <>

              <div className={viewLayout === 'list' ? "list-layout" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4"}>

                {serverAds.map((ad, index) => (

                  <React.Fragment key={ad.id}>

                    {renderAdCard(ad, { displayImageUrl: displayImageMap.get(ad.id) })}

                    {/* Показываем рекламный баннер после каждого 7-го объявления */}

                    {(index + 1) % 7 === 0 && <AdSenseBanner key={`ad-banner-${ad.id}`} />}

                  </React.Fragment>

                ))}

              </div>

              <div ref={lastAdElementRef} />

              {loadingMore && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#84CC16]" size={32}/></div>}

              {!loadingMore && !hasMore && serverAds.length > 0 && <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-xs py-10 mt-6">Has llegado al final</div>}

            </>

          )}
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

              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#84CC16] animate-pulse"></span><strong className="text-[#0F172A] dark:text-white font-semibold">{Number(adsTotal || serverAds.length || 0).toLocaleString('es-MX')}</strong> {t.active_listings || 'anuncios disponibles'}</span>

              <span className="text-slate-300 hidden sm:block">•</span>

              <span>{t.verified_marketplace || 'Compra con vendedores verificados y anuncios moderados'}</span>

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

            <section className="col-span-12">

              <div className="flex items-center justify-between mb-4">

                <h2 className="text-[22px] font-bold tracking-tight">{t.browse_category || 'Explorar por categoría'}</h2>

                <div className="flex items-center gap-3">

                  <span className="text-[13px] font-medium text-slate-500 hidden sm:block">{t.marketplace_verticals || 'Sitios principales de Mercasto'}</span>

                </div>

              </div>

              <div className="category-rail rail-fade -mx-4 px-4 lg:mx-0 lg:px-0">

                {homeCategories.map(cat => {

                  const Icon = IconMap[cat.icon] || Star;

                  return (

                    <button key={cat.slug || cat.action} aria-label={cat.name?.[lang] || cat.name?.['es'] || cat.name} onClick={() => {
                        if (cat.action === 'home') { navigate('/'); setActiveCat(''); executeSearch?.('', null, ''); return; }
                        if (cat.action === 'pricing') { setShowPricingModal?.(true); return; }
                        const vpath = cat.verticalPath || getVerticalPath(cat.slug);
                        if (vpath) { navigate(vpath); } else { executeSearch?.('', null, cat.slug); }
                      }} className="category-pill group min-w-[82px] sm:min-w-[96px] max-w-[108px]">

                      <div className="category-icon flex items-center justify-center text-slate-500 group-hover:text-[#65A30D] transition-all">

                        <Icon size={15} strokeWidth={2.2} />

                      </div>

                      <h3 className="font-semibold text-[10px] text-center text-slate-700 group-hover:text-[#365314] line-clamp-2 leading-tight">
                        {cat.name?.[lang] || cat.name?.['es'] || cat.name}
                      </h3>

                    </button>

                  );

                })}

              </div>

            </section>




            {/* 3. TRENDING NOW */}

            <section className="col-span-12 mt-2">

              <div className="flex items-center justify-between mb-4">

                <div className="flex items-center gap-3">

                  <h2 className="text-[22px] font-bold tracking-tight">{t.trending_now || 'Tendencias'}</h2>

                  <span className="badge bg-red-500 text-white hidden sm:block">LIVE</span>

                </div>

                <div className="flex items-center gap-2">

                  <button onClick={() => showHomeToast('Búsqueda guardada en este navegador.')} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50 hidden sm:block">{t.save_search || 'Guardar búsqueda'}</button>

                  <button onClick={() => { setActiveCat(''); document.querySelector('.md\\:hidden button')?.click(); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">{t.filter || 'Filtros'}</button>

                  <a onClick={() => setActiveCat('')} className="text-[13px] font-semibold text-[#65A30D] hover:underline ml-1 cursor-pointer">{t.see_all || 'Ver todo →'}</a>

                </div>

              </div>

              <div className="relative -mx-4 lg:mx-0 px-4 lg:px-0">

                <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">

                  {trendingAds.map(ad => (

                    <div key={ad.id} className="snap-start shrink-0 w-[260px]">

                      {renderAdCard(ad)}

                    </div>

                  ))}

                </div>

              </div>

            </section>



            {/* 4. DEALS OF THE DAY */}

            <section className="col-span-12">

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                <div className="relative overflow-hidden rounded-3xl p-[1px] group">

                  <div className="absolute inset-0 bg-gradient-to-br from-[#84CC16] to-[#65A30D] opacity-90 group-hover:opacity-100 transition"></div>

                  <div className="relative bg-gradient-to-br from-[#84CC16] to-[#65A30D] rounded-[23px] p-6 text-white h-[190px] flex flex-col">

                    <span className="text-[11px] uppercase tracking-wider bg-white/20 w-fit px-2.5 py-1 rounded-full font-semibold">{t.deal_of_day || 'Oferta del día'}</span>

                    <h3 className="text-[26px] font-bold mt-3 leading-tight">{t.up_to_40 || 'Hasta 40% OFF'}</h3>

                    <p className="text-white/90 text-[14px]">{t.elec_phones || 'Electrónica y Celulares'}</p>

                    <div className="mt-auto flex items-center justify-between">

                      <button onClick={() => setActiveCat('telefonia')} className="btn-md bg-white text-[#0F172A] hover:bg-slate-100">{t.shop_now || 'Comprar ahora →'}</button>

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

                  <a onClick={() => setActiveCat('inmobiliaria')} className="text-[13px] font-semibold text-[#65A30D] hover:underline cursor-pointer">{t.view_props || 'Ver propiedades →'}</a>

                </div>

              </div>

              <div className="grid grid-cols-12 gap-4">

                <div className="col-span-12 xl:col-span-8">

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

                    {spotlightRealEstate.map((item, idx) => (

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

                    ))}

                  </div>

                </div>

                <div className="col-span-12 xl:col-span-4">

                  <div className="osm-embed-shell market-card h-full min-h-[360px] overflow-hidden relative bg-slate-100 dark:bg-slate-900">

                    <iframe
                      title="Mapa de propiedades en México"
                      src="https://www.openstreetmap.org/export/embed.html?bbox=-118.5%2C14.2%2C-86.4%2C32.9&layer=mapnik&marker=23.6345%2C-102.5528"
                      className="absolute inset-0 h-full w-full border-0 opacity-80 dark:opacity-65"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-white/55 dark:from-slate-950/45 dark:to-slate-950/70 pointer-events-none"></div>

                    <div className="absolute inset-0 p-4">

                      <div className="flex items-center justify-between">

                        <h3 className="font-semibold">{selectedState || t.all_mexico || 'Todo México'}</h3>

                        <button onClick={() => { setActiveCat('inmobiliaria'); executeSearch?.('', null, 'inmobiliaria'); }} className="btn-sm bg-white border border-slate-300 shadow-sm hover:bg-slate-50">{t.search_map || 'Buscar en mapa'}</button>

                      </div>

                      <div className="relative mt-6">

                        <div className="absolute left-[20%] top-[40%]"><div className="w-8 h-8 rounded-full bg-[#84CC16] text-white flex items-center justify-center text-[11px] font-bold shadow-lg ring-4 ring-[#84CC16]/30 animate-pulse cursor-pointer" onClick={() => { runSearch('3.2M', 'inmobiliaria'); }}>$3.2M</div></div>

                        <div className="absolute left-[55%] top-[25%]"><div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold shadow-lg cursor-pointer" onClick={() => { runSearch('1.8M', 'inmobiliaria'); }}>$1.8M</div></div>

                        <div className="absolute left-[70%] top-[60%]"><div className="w-8 h-8 rounded-full bg-[#84CC16] text-white flex items-center justify-center text-[11px] font-bold shadow-lg ring-4 ring-[#84CC16]/30 cursor-pointer" onClick={() => { runSearch('4.9M', 'inmobiliaria'); }}>$4.9M</div></div>

                        <div className="absolute left-[35%] top-[70%]"><div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold shadow-lg cursor-pointer" onClick={() => { runSearch('28k', 'inmobiliaria'); }}>$28k</div></div>

                      </div>

                      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur rounded-xl p-3 border border-slate-200">

                        <div className="flex items-center justify-between text-[12px]"><span className="font-medium">{selectedState ? `Propiedades en ${selectedState}` : 'Propiedades en todo México'}</span><span onClick={() => { setSearchLocation?.(null); setSearchLocationInput?.(''); setSelectedState(''); executeSearch?.(null, ''); }} className="text-[#65A30D] font-semibold cursor-pointer hover:underline">{t.view_all_mexico || 'Ver todo México'} →</span></div>

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

                  <a onClick={() => setActiveCat('empleo')} className="text-[13px] font-semibold text-[#65A30D] hover:underline ml-1 cursor-pointer">{t.see_all || 'Ver todo →'}</a>

                </div>

              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">

                <div className="overflow-x-auto">

                  <table className="w-full text-[14px]">

                    <thead className="bg-slate-50 dark:bg-slate-950 text-[12px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">

                      <tr><th className="text-left font-semibold px-4 py-3">{t.role || 'Puesto'}</th><th className="text-left font-semibold px-4 py-3 hidden md:table-cell">{t.company || 'Empresa'}</th><th className="text-left font-semibold px-4 py-3">{t.salary_mxn || 'Salario MXN'}</th><th className="text-left font-semibold px-4 py-3 hidden sm:table-cell">{t.location || 'Ubicación'}</th><th className="text-right font-semibold px-4 py-3">{t.action || 'Acción'}</th></tr>

                    </thead>

                    <tbody className="">

                      {jobsBoard.map((job, idx) => (

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

                            <button onClick={() => setCurrentTab('post')} className={`btn-sm text-white ${idx === 0 ? 'bg-[#84CC16] hover:bg-[#65A30D]' : 'bg-slate-900 hover:bg-black'}`}>{t.apply || 'Aplicar'}</button>

                          </td>

                        </tr>

                      ))}

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

                <a onClick={() => setActiveCat('servicios')} className="text-[13px] font-semibold text-[#65A30D] hover:underline cursor-pointer">{t.browse_services || 'Ver todos →'}</a>

              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {servicesMarketplace.map((srv, idx) => (

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

                      <button onClick={() => setActiveCat('servicios')} className="btn-sm bg-[#84CC16] text-white hover:bg-[#65A30D]">{t.book_now || 'Reservar'}</button>

                    </div>

                  </div>

                ))}

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

                {automotiveDeals.map((car, idx) => (

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

                ))}

              </div>

            </section>



            {/* 9. RECENTLY VIEWED - localStorage */}
            {(() => {
              const recentAds = getRecentlyViewed();
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

                  <button onClick={() => setShowPricingModal(true)} className="btn-md w-full mt-5 bg-transparent border border-slate-300 dark:border-slate-700 text-[#0F172A] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-850 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md hover:border-[#84CC16] dark:hover:border-[#84CC16] hover:text-[#65A30D] dark:hover:text-[#84CC16] hover:ring-2 hover:ring-[#84CC16]/20">Elegir plan</button>

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

                  <button onClick={() => setShowPricingModal(true)} className="btn-md w-full mt-5 bg-[#84CC16] text-white hover:bg-[#65A30D]">See pricing</button>

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

                  <button onClick={() => navigate('/contacto?enterprise=1')} className="btn-md w-full mt-5 border border-slate-300 dark:border-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-850 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md hover:border-[#84CC16] dark:hover:border-[#84CC16] hover:text-[#65A30D] dark:hover:text-[#84CC16] hover:ring-2 hover:ring-[#84CC16]/20">{t.contact_sales || 'Contactar ventas'}</button>

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

                    <h4 className="font-semibold mt-3">{t.post_60s || 'Publica en 60s'}</h4>

                    <p className="text-[13px] text-slate-600 mt-1">{t.post_60s_desc || 'Fotos, precio, ubicación. La IA hace el resto.'}</p>

                  </div>

                  <div className="text-center relative">

                    <div className="w-11 h-11 mx-auto rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold shadow-lg">02</div>

                    <h4 className="font-semibold mt-3">{t.get_leads || 'Recibe contactos'}</h4>

                    <p className="text-[13px] text-slate-600 mt-1">{t.get_leads_desc || 'Llamadas, WhatsApp o escaneo QR seguro.'}</p>

                  </div>

                  <div className="text-center relative">

                    <div className="w-11 h-11 mx-auto rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold shadow-lg">03</div>

                    <h4 className="font-semibold mt-3">{t.meet_safely || 'Encuentros seguros'}</h4>

                    <p className="text-[13px] text-slate-600 mt-1">{t.meet_safely_desc || 'Perfiles verificados (KYC) para tu paz mental.'}</p>

                  </div>

                  <div className="text-center relative">

                    <div className="w-11 h-11 mx-auto rounded-full bg-[#84CC16] text-white flex items-center justify-center font-bold shadow-lg">04</div>

                    <h4 className="font-semibold mt-3">{t.sell_faster || 'Vende rápido'}</h4>

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

                  <h4 className="font-semibold mt-3">{t.avoid_scams || 'Evita fraudes'}</h4>

          <p className="text-[13px] text-slate-600 mt-1">{t.avoid_scams_desc || 'Nunca pagues por adelantado. Revisa las insignias.'}</p>

                  <button onClick={() => navigate('/safety')} className="btn-sm border border-slate-300 mt-3 hover:bg-slate-50">{t.learn_more || 'Saber más'}</button>

                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 card">

                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-blue-600" /></div>

                  <h4 className="font-semibold mt-3">{t.safe_payments || 'Pagos seguros'}</h4>

                  <p className="text-[13px] text-slate-600 mt-1">{t.safe_payments_desc || 'Reúnete en público. Cuenta el dinero antes de irte.'}</p>

                  <button onClick={() => navigate('/safety')} className="btn-sm border border-slate-300 mt-3 hover:bg-slate-50">{t.learn_more || 'Saber más'}</button>

                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 card">

                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>

                  <h4 className="font-semibold mt-3">{t.verified_sellers || 'Vendedores verificados'}</h4>

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

                    <a key={term} onClick={() => runSearch(term)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-[13px] cursor-pointer">{term}</a>

                  ))}

                </div>

              </div>

            </section>



            {/* 14. CITIES */}

            <section className="col-span-12">

              <div className="flex items-center justify-between mb-3">

                <h3 className="font-bold text-[17px]">{t.explore_city || 'Explorar por ciudad'}</h3>

                <a onClick={() => { setSearchLocation?.(null); setSearchLocationInput?.(''); setSelectedState(''); executeSearch?.(null, ''); }} className="text-[13px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer">{t.view_all_mexico || 'Ver todo México →'}</a>

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

                  <a key={city.name} onClick={() => applyCityFilter(city.name)} className={`bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 hover:shadow-sm flex justify-between items-center cursor-pointer ${city.highlight ? 'ring-2 ring-[#84CC16]/40' : ''}`}>

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

                  <h4 className="font-bold text-[18px]">{t.newsletter_title || 'Recibe las mejores ofertas de México'}</h4>

                  <p className="text-[13px] text-slate-600">{t.newsletter_desc || 'Resumen semanal de ofertas, caída de precios y nuevos empleos.'}</p>

                </div>

                <form className="flex w-full md:w-auto gap-2" onSubmit={e => { e.preventDefault(); showHomeToast('Gracias por suscribirte.'); e.target.reset(); }}>

                  <input type="email" required placeholder={t.your_email || 'Tu correo electrónico'} className="w-full md:w-[300px] px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]"/>

                  <button type="submit" className="btn-md bg-[#84CC16] text-white hover:bg-[#65A30D] whitespace-nowrap">{t.subscribe || 'Suscribirse'}</button>

                </form>

              </div>

            </section>

          </div>

        </main>

      </div>

    );

}
