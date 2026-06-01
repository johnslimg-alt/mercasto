import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Search, MapPin, Star, CheckCircle, ArrowRight, 
  ChevronRight, Sparkles, Store, Loader2, Globe, Heart, ShieldCheck, Briefcase
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || '/storage';

const MEXICO_STATES = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", 
  "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", 
  "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", 
  "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", 
  "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
];

const CATEGORIES = [
  { slug: 'motor', name: 'Automotriz', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  { slug: 'inmobiliaria', name: 'Bienes Raíces', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  { slug: 'empleo', name: 'Empleos', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  { slug: 'servicios', name: 'Servicios Profesionales', color: 'text-sky-600 bg-sky-50 border-sky-100' },
  { slug: 'informatica', name: 'Informática y Electrónica', color: 'text-violet-600 bg-violet-50 border-violet-100' },
  { slug: 'telefonos', name: 'Telefonía', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  { slug: 'hogar', name: 'Hogar y Muebles', color: 'text-teal-600 bg-teal-50 border-teal-100' }
];

export default function StoresScreen() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStores, setTotalStores] = useState(0);

  useEffect(() => {
    document.title = 'Directorio de Tiendas Oficiales y Negocios PRO | Mercasto México';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Encuentra y compra con total seguridad en el Directorio Oficial de Tiendas y Vendedores PRO verificados de Mercasto en todo México.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const delayDebounce = setTimeout(async () => {
      try {
        let url = `${API_URL}/stores?page=${page}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (selectedState) url += `&state=${encodeURIComponent(selectedState)}`;
        if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load stores');
        const data = await response.json();

        if (!cancelled) {
          setStores(data.data || []);
          setTotalPages(data.last_page || 1);
          setTotalStores(data.total || 0);
        }
      } catch (err) {
        console.error('Error fetching stores directory:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(delayDebounce);
    };
  }, [search, selectedState, selectedCategory, page]);

  const handleStoreClick = (storeId) => {
    // Navigate directly to public storefront screen
    navigate(`/vendedor/${storeId}`);
  };

  const getStoreLogo = (store) => {
    if (store.business_logo_url) {
      if (store.business_logo_url.startsWith('http')) return store.business_logo_url;
      return `${STORAGE_URL}/${store.business_logo_url}`;
    }
    if (store.avatar_url) {
      if (store.avatar_url.startsWith('http')) return store.avatar_url;
      return `${STORAGE_URL}/${store.avatar_url}`;
    }
    return null;
  };

  const getStoreBanner = (store) => {
    if (store.business_banner_url) {
      if (store.business_banner_url.startsWith('http')) return store.business_banner_url;
      return `${STORAGE_URL}/${store.business_banner_url}`;
    }
    return "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&h=200&fit=crop";
  };

  return (
    <div className="stores-dark-scope min-h-screen bg-slate-50 pb-20">
      {/* Dynamic Sleek Header Cover */}
      <section
        className="relative overflow-hidden py-16 md:py-24 text-center text-white"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)' }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 10% 20%, white 1px, transparent 1px), radial-gradient(circle at 90% 80%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}
        />
        <div className="relative max-w-5xl mx-auto px-4 z-10">
          <div className="inline-flex items-center gap-2 bg-lime-500/20 text-lime-400 border border-lime-500/30 rounded-full px-4.5 py-1.5 text-xs font-bold uppercase tracking-widest mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Directorio PRO México
          </div>
          <h1 className="text-4xl md:text-5.5xl font-black mb-4 leading-tight tracking-tight">
            Tiendas y Negocios Oficiales
          </h1>
          <p className="text-slate-300 text-base md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Compra directamente con vendedores profesionales y empresas con perfiles RFC verificados y alta reputación en todo el país.
          </p>
        </div>
      </section>

      {/* Filter and Search Section */}
      <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-5 md:p-7 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar tienda por nombre o descripción..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-lime-500/30 focus:border-lime-500 text-sm font-medium transition-all"
            />
          </div>

          {/* State Filter */}
          <div className="relative">
            <MapPin className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
            <select
              value={selectedState}
              onChange={(e) => { setSelectedState(e.target.value); setPage(1); }}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-lime-500/30 focus:border-lime-500 text-sm font-medium transition-all appearance-none cursor-pointer bg-white"
            >
              <option value="">Todo México 🇲🇽</option>
              {MEXICO_STATES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Building2 className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-lime-500/30 focus:border-lime-500 text-sm font-medium transition-all appearance-none cursor-pointer bg-white"
            >
              <option value="">Todas las categorías</option>
              {CATEGORIES.map(cat => (
                <option key={cat.slug} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex flex-wrap gap-2.5 mt-6 justify-center">
          <button
            onClick={() => { setSelectedCategory(''); setPage(1); }}
            className={`px-4 py-2 text-xs font-bold rounded-full border transition-all ${
              selectedCategory === '' 
                ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos los rubros
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.slug}
              onClick={() => { setSelectedCategory(cat.name); setPage(1); }}
              className={`px-4 py-2 text-xs font-bold rounded-full border transition-all ${
                selectedCategory === cat.name 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid List */}
      <main className="max-w-7xl mx-auto px-4 mt-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Store className="w-6 h-6 text-lime-500" /> Negocios activos
            <span className="text-xs font-bold bg-slate-200 text-slate-700 px-3 py-1 rounded-full">{totalStores} en total</span>
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm animate-pulse h-[340px]">
                <div className="h-28 bg-slate-200 w-full" />
                <div className="px-6 pb-6 pt-0 relative flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-300 border-4 border-white -mt-8 shadow" />
                  <div className="w-32 h-5 bg-slate-200 rounded mt-4" />
                  <div className="w-24 h-4 bg-slate-200 rounded mt-2" />
                  <div className="w-48 h-10 bg-slate-100 rounded mt-4" />
                  <div className="w-full h-10 bg-slate-200 rounded mt-6" />
                </div>
              </div>
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-sm">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No encontramos tiendas</h3>
            <p className="text-slate-500 text-sm mb-6">Prueba a cambiar los filtros de búsqueda o ubicación para ver otros negocios.</p>
            <button
              onClick={() => { setSearch(''); setSelectedState(''); setSelectedCategory(''); setPage(1); }}
              className="btn-md bg-slate-950 text-white hover:bg-black font-bold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider transition-all shadow-md"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stores.map(store => {
              const logo = getStoreLogo(store);
              const banner = getStoreBanner(store);
              const displayName = store.business_name || store.name;
              
              return (
                <div 
                  key={store.id}
                  onClick={() => handleStoreClick(store.id)}
                  className="group bg-white rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-lime-500/30 transition-all cursor-pointer flex flex-col h-[360px]"
                >
                  {/* Store Banner */}
                  <div className="h-28 relative bg-slate-100 overflow-hidden shrink-0">
                    <img 
                      src={banner} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      alt="Banner" 
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    {store.is_verified && (
                      <span className="absolute top-3 right-3 bg-lime-500/90 text-white font-bold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow backdrop-blur-sm">
                        <CheckCircle className="w-3 h-3" /> VERIFICADO
                      </span>
                    )}
                  </div>

                  {/* Store Card Info */}
                  <div className="px-5 pb-6 pt-0 relative flex flex-col items-center flex-1">
                    {/* Store Logo */}
                    <div className="w-16 h-16 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center font-black text-2xl shadow-lg border-4 border-white -mt-8 z-10 shrink-0 overflow-hidden relative">
                      {logo ? (
                        <img src={logo} className="w-full h-full object-cover" alt="Logo" />
                      ) : (
                        displayName[0].toUpperCase()
                      )}
                    </div>

                    {/* Store Title */}
                    <h3 className="font-bold text-slate-900 text-center text-base mt-3 line-clamp-1 group-hover:text-lime-600 transition-colors flex items-center justify-center gap-1.5 w-full px-2">
                      {displayName}
                      <span className="badge bg-slate-900 text-white scale-90 px-1 py-0.5 text-[9px] font-black rounded">PRO</span>
                    </h3>

                    {/* Address / Location */}
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 justify-center max-w-full truncate px-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span className="truncate">{store.business_address || 'México'}</span>
                    </p>

                    {/* Review Rating Stars */}
                    <div className="flex items-center gap-1 mt-2.5 shrink-0 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="font-bold text-slate-800 text-[11px]">{Number(store.rating_avg || 0).toFixed(1)}</span>
                      <span className="text-slate-400 text-[10px]">({store.rating_count || 0})</span>
                    </div>

                    {/* Store Short Description */}
                    <p className="text-xs text-slate-500 text-center mt-3 line-clamp-2 leading-relaxed flex-1 px-1">
                      {store.business_description || 'Tienda oficial con un catálogo de productos de alta calidad y atención profesional.'}
                    </p>

                    {/* Stats Footer Bar */}
                    <div className="w-full border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between shrink-0">
                      <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                        {store.active_ads_count || 0} anuncios activos
                      </span>
                      <span className="text-xs font-bold text-lime-600 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                        Ver vitrina <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Section */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="btn-sm border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Anterior
            </button>
            {[...Array(totalPages)].map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all border ${
                    page === p 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
              className="btn-sm border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Siguiente
            </button>
          </div>
        )}
      </main>

      {/* Why Choose PRO Banner */}
      <section className="max-w-7xl mx-auto px-4 mt-20">
        <div className="bg-gradient-to-br from-lime-600 to-emerald-700 rounded-3.5xl p-8 md:p-12 text-white relative overflow-hidden shadow-lg">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_30%,white_1px,transparent_1px)] bg-[size:20px_20px]" />
          <div className="relative z-10 max-w-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 border border-white/30 rounded-full px-3 py-1 mb-4 inline-block">MÁS CONFIANZA</span>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight leading-tight">¿Tienes un negocio o eres vendedor frecuente?</h2>
            <p className="text-white/90 text-sm md:text-base leading-relaxed mb-6 font-light">
              Únete a Mercasto PRO y obtén una vitrina profesional exclusiva, carga tu propio banner de portada, logo comercial, horarios de atención, enlace de sitio web, verificación RFC y destaca tus productos en el directorio nacional.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/profile')}
                className="bg-white text-emerald-700 font-extrabold text-sm px-6 py-3 rounded-full hover:bg-slate-50 transition-colors shadow-lg"
              >
                Activar Perfil PRO
              </button>
              <button
                onClick={() => navigate('/ayuda')}
                className="bg-emerald-800/40 border border-white/20 text-white font-extrabold text-sm px-6 py-3 rounded-full hover:bg-emerald-800/60 transition-colors"
              >
                Conocer planes
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
