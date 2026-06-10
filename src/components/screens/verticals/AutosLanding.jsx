import SEO from "../../SEO";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VerticalHero from '../../verticals/VerticalHero';
import VerticalAdGrid from '../../verticals/VerticalAdGrid';
import MapV3 from '../../common/MapV3';
import { Bike, Car, CarFront, Gauge, PackageSearch, Truck, Wrench } from 'lucide-react';
import { useUI } from '../../../contexts/UIContext';
import { getVerticalCopy } from '../../../utils/verticalCopy';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const BRANDS = ['Toyota', 'Nissan', 'Honda', 'Volkswagen', 'Chevrolet', 'Ford', 'Kia', 'Hyundai'];
const BRAND_LOGOS = {
  Toyota: (
    <svg viewBox="0 0 100 100" className="w-8 h-8 select-none pointer-events-none fill-current">
      <path d="M50,15 C22.4,15 0,30.7 0,50 C0,69.3 22.4,85 50,85 C77.6,85 100,69.3 100,50 C100,30.7 77.6,15 50,15 Z M50,22 C73.2,22 92,34.5 92,50 C92,65.5 73.2,78 50,78 C26.8,78 8,65.5 8,50 C8,34.5 26.8,22 50,22 Z M50,30 C41.2,30 34,36.7 34,45 C34,53.3 41.2,60 50,60 C58.8,60 66,53.3 66,45 C66,36.7 58.8,30 50,30 Z M50,36 C54.4,36 58,40 58,45 C58,50 54.4,54 50,54 C45.6,54 42,50 42,45 C42,40 45.6,36 50,36 Z" />
    </svg>
  ),
  Nissan: (
    <svg viewBox="0 0 100 100" className="w-8 h-8 select-none pointer-events-none stroke-current fill-none" strokeWidth="6">
      <circle cx="50" cy="50" r="35" />
      <rect x="10" y="42" width="80" height="16" rx="4" className="fill-current" />
    </svg>
  ),
  Honda: (
    <svg viewBox="0 0 100 100" className="w-8 h-8 select-none pointer-events-none stroke-current fill-none" strokeWidth="6" strokeLinecap="round">
      <rect x="15" y="15" width="70" height="70" rx="12" />
      <path d="M35,30 L35,70 M65,30 L65,70 M35,50 L65,50" />
    </svg>
  ),
  Volkswagen: (
    <svg viewBox="0 0 100 100" className="w-8 h-8 select-none pointer-events-none stroke-current fill-none" strokeWidth="6">
      <circle cx="50" cy="50" r="40" />
      <path d="M25,25 L43,65 L50,50 L57,65 L75,25 M28,25 L47,75 L50,68 L53,75 L72,25" />
    </svg>
  ),
  Chevrolet: (
    <svg viewBox="0 0 100 100" className="w-8 h-8 select-none pointer-events-none fill-current">
      <path d="M35,30 L65,30 L69,42 L85,42 L85,58 L69,58 L65,70 L35,70 L31,58 L15,58 L15,42 L31,42 Z" />
    </svg>
  ),
  Ford: (
    <svg viewBox="0 0 100 100" className="w-8 h-8 select-none pointer-events-none fill-current">
      <ellipse cx="50" cy="50" rx="45" ry="25" className="fill-none stroke-current" strokeWidth="5" />
      <path d="M25,50 C25,42 35,42 42,42 C49,42 45,58 55,58 C62,58 70,50 70,50 M38,35 L38,65" className="stroke-current fill-none" strokeWidth="5" strokeLinecap="round" />
    </svg>
  ),
  Kia: (
    <svg viewBox="0 0 120 40" className="w-12 h-6 select-none pointer-events-none stroke-current fill-none" strokeWidth="8" strokeLinecap="miter" strokeLinejoin="miter">
      <path d="M10,5 L10,35 M10,20 L30,5 M10,20 L30,35 M50,5 L50,35 M70,35 L85,5 L100,35 M77,22 L93,22" />
    </svg>
  ),
  Hyundai: (
    <svg viewBox="0 0 100 100" className="w-8 h-8 select-none pointer-events-none stroke-current fill-none" strokeWidth="6">
      <ellipse cx="50" cy="50" rx="45" ry="30" />
      <path d="M35,30 L45,70 M65,30 L55,70 M38,48 L62,52" strokeWidth="8" strokeLinecap="round" />
    </svg>
  ),
};
const PRICE_RANGES = [
  { label: '< $100k', max: 100000 },
  { label: '$100k – $300k', min: 100000, max: 300000 },
  { label: '> $300k', min: 300000 },
];
const SUBSECTIONS = [
  { name: 'Autos', query: 'autos', Icon: CarFront },
  { name: 'Motos', query: 'motos', Icon: Bike },
  { name: 'Camionetas', query: 'camionetas', Icon: Car },
  { name: 'Camiones', query: 'camiones', Icon: Truck },
  { name: 'Refacciones', query: 'refacciones', Icon: Wrench },
  { name: 'Verificados', query: 'vendedor verificado', Icon: Gauge },
  { name: 'Autopartes', query: 'autopartes', Icon: PackageSearch },
];

export default function AutosLanding() {
  const navigate = useNavigate();
  const { lang } = useUI();
  const copy = getVerticalCopy(lang, 'autos');
  const [condition, setCondition] = useState('');
  const [priceRange, setPriceRange] = useState(null);
  const [brand, setBrand] = useState('');

  React.useEffect(() => {
    document.title = 'Comprar y vender autos en México — Mercasto';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Encuentra autos nuevos y usados en México. Miles de vehículos con los mejores precios. Publica gratis en Mercasto.');
  }, []);

  const handleSearch = (q, location = {}) => {
    const params = new URLSearchParams({ category: 'motor' });
    if (q) params.set('search', q);
    if (location.state) params.set('state', location.state);
    if (location.city) params.set('location', location.city);
    if (location.radius) params.set('radius_km', location.radius);
    navigate(`/?${params.toString()}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set('category', 'motor');
    if (condition) params.set('condition', condition);
    if (priceRange?.min) params.set('min_price', priceRange.min);
    if (priceRange?.max) params.set('max_price', priceRange.max);
    if (brand) params.set('search', brand);
    navigate(`/?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <VerticalHero
        title={copy.title}
        subtitle={copy.subtitle}
        searchPlaceholder={copy.placeholder}
        labels={copy.labels}
        color="blue"
        mapQuery="autos en México"
        onSearch={handleSearch}
        subsections={SUBSECTIONS}
        onSubsectionSelect={(item) => navigate(`/?category=motor&search=${encodeURIComponent(item.query)}`)}
      />

      {/* Quick Filters bar */}
      <div className="bg-white border-b border-slate-100 sticky top-[148px] sm:top-[104px] z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-2 items-center">
          {['nuevo', 'usado'].map(c => (
            <button key={c}
              onClick={() => setCondition(prev => prev === c ? '' : c)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${condition === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          {PRICE_RANGES.map((r) => (
            <button key={r.label}
              onClick={() => setPriceRange(prev => prev?.label === r.label ? null : r)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${priceRange?.label === r.label ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
              {r.label}
            </button>
          ))}
          <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />
          {BRANDS.map(b => (
            <button key={b}
              onClick={() => setBrand(prev => prev === b ? '' : b)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all hidden sm:inline-flex ${brand === b ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
              {b}
            </button>
          ))}
          {(condition || priceRange || brand) && (
            <button onClick={applyFilters}
              className="ml-auto px-4 py-1.5 bg-blue-600 text-white rounded-full text-[13px] font-bold hover:bg-blue-700 transition-colors">
              Aplicar filtros →
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-14">
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Autos en el mapa</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Explora vehículos por ubicación, precio y coordenadas GPS.</p>
            </div>
            <button onClick={() => navigate('/?category=motor')}
              className="hidden rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 sm:inline-flex">
              {copy.labels.viewList}
            </button>
          </div>
          <MapV3 category="motor" title="Autos en México" className="h-[260px] md:h-[420px]" />
        </section>

        {/* Featured Listings */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-2xl font-bold text-slate-900">{copy.featured}</h2>
            <a onClick={() => navigate('/?category=motor')}
              className="text-[13px] font-semibold text-blue-600 hover:underline cursor-pointer">
              {copy.labels.viewAll} →
            </a>
          </div>
          <VerticalAdGrid
            apiUrl={`${API_URL}/ads?category=motor&per_page=8`}
            viewAllUrl="/?category=motor"
            viewAllLabel="Ver todos los vehículos →"
            cols={4}
          />
        </section>

        {/* Stats bar */}
        <section className="bg-blue-600 rounded-3xl p-8 text-white text-center grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: '45,000+', label: 'Vehículos disponibles' },
            { n: '1,200+', label: 'Vendedores verificados' },
            { n: '32',      label: 'Estados de México' },
            { n: 'Gratis',  label: 'Publicar anuncio' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl font-black mb-1">{s.n}</div>
              <div className="text-sm text-blue-100">{s.label}</div>
            </div>
          ))}
        </section>


        {/* Popular brands */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-5">Marcas populares</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {BRANDS.map(b => (
              <button key={b}
                onClick={() => navigate(`/?search=${encodeURIComponent(b)}&category=motor`)}
                className="bg-white border border-slate-200 rounded-xl p-3 text-center hover:border-blue-400 hover:shadow-md transition-all group">
                <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors p-2">
                  {BRAND_LOGOS[b] || <Car size={20} strokeWidth={2.2} />}
                </div>
                <div className="text-[12px] font-semibold text-slate-700 group-hover:text-blue-700">{b}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Sell CTA */}
        <section className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div>
            <h2 className="text-2xl font-bold mb-2">¿Quieres vender tu auto?</h2>
            <p className="text-slate-300">Publica gratis en minutos y llega a miles de compradores en México.</p>
          </div>
          <button
            onClick={() => navigate('/post')}
            className="shrink-0 px-8 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl transition-colors text-[15px]">
            Publicar anuncio gratis →
          </button>
        </section>

      </div>
    </div>
  );
}
