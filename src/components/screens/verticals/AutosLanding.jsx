import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VerticalHero from '../../verticals/VerticalHero';
import VerticalAdGrid from '../../verticals/VerticalAdGrid';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const BRANDS = ['Toyota', 'Nissan', 'Honda', 'Volkswagen', 'Chevrolet', 'Ford', 'Kia', 'Hyundai'];
const PRICE_RANGES = [
  { label: '< $100k', max: 100000 },
  { label: '$100k – $300k', min: 100000, max: 300000 },
  { label: '> $300k', min: 300000 },
];

export default function AutosLanding() {
  const navigate = useNavigate();
  const [condition, setCondition] = useState('');
  const [priceRange, setPriceRange] = useState(null);
  const [brand, setBrand] = useState('');

  React.useEffect(() => {
    document.title = 'Comprar y vender autos en México — Mercasto';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Encuentra autos nuevos y usados en México. Miles de vehículos con los mejores precios. Publica gratis en Mercasto.');
  }, []);

  const handleSearch = (q) => {
    navigate(`/?search=${encodeURIComponent(q)}&category=coches-y-motor`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set('category', 'coches-y-motor');
    if (condition) params.set('condition', condition);
    if (priceRange?.min) params.set('min_price', priceRange.min);
    if (priceRange?.max) params.set('max_price', priceRange.max);
    if (brand) params.set('search', brand);
    navigate(`/?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <VerticalHero
        title="Encuentra tu auto ideal en México"
        subtitle="Miles de autos nuevos y usados al mejor precio"
        searchPlaceholder="Buscar por marca, modelo, año…"
        color="blue"
        onSearch={handleSearch}
      />

      {/* Quick Filters bar */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
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

        {/* Featured Listings */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-2xl font-bold text-slate-900">Vehículos destacados</h2>
            <a onClick={() => navigate('/?category=coches-y-motor')}
              className="text-[13px] font-semibold text-blue-600 hover:underline cursor-pointer">
              Ver todos →
            </a>
          </div>
          <VerticalAdGrid
            apiUrl={`${API_URL}/ads?category=coches-y-motor&per_page=8`}
            viewAllUrl="/?category=coches-y-motor"
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
                onClick={() => navigate(`/?search=${encodeURIComponent(b)}&category=coches-y-motor`)}
                className="bg-white border border-slate-200 rounded-xl p-3 text-center hover:border-blue-400 hover:shadow-md transition-all group">
                <div className="text-2xl mb-1">🚗</div>
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
