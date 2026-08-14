import React from 'react';
import { useNavigate } from 'react-router-dom';
import VerticalHero from '../../verticals/VerticalHero';
import VerticalAdGrid from '../../verticals/VerticalAdGrid';
import MapV3 from '../../common/MapV3';
import { Home, Compass, Ticket, Tent, Gift, Ship, MapPin, Sparkles, Heart } from 'lucide-react';
import { getVerticalCopy, getVerticalLandingCopy } from '../../../utils/verticalCopy';

const SUBSECTIONS = [
  { name: 'Hoteles y Hospedaje', query: 'hospedaje', Icon: Home },
  { name: 'Tours y Viajes', query: 'tours', Icon: Compass },
  { name: 'Boletos a Eventos', query: 'boletos_turismo', Icon: Ticket },
  { name: 'Artículos de Viaje', query: 'articulos_camping', Icon: Tent },
  { name: 'Souvenirs y Regalos', query: 'souvenirs', Icon: Gift },
  { name: 'Renta de Transporte', query: 'renta_vehiculos', Icon: Ship },
  { name: 'Guías y Servicios', query: 'guias_servicios', Icon: MapPin },
  { name: 'Atracciones', query: 'atracciones_exp', Icon: Sparkles },
  { name: 'Retiros y Wellness', query: 'retiros_bienestar', Icon: Heart },
];

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export default function TurismoLanding({ lang = 'es' }) {
  const navigate = useNavigate();
  const copy = getVerticalCopy(lang, 'turismo');
  const landingCopy = getVerticalLandingCopy(lang, 'turismo');
  const handleSearch = (q, location = {}) => {
    const params = new URLSearchParams({ category: 'turismo' });
    if (q) params.set('search', q);
    if (location.state) params.set('state', location.state);
    if (location.city) params.set('location', location.city);
    if (location.radius) params.set('radius_km', location.radius);
    navigate(`/?${params.toString()}`);
  };

  const applySubcategory = (query) => {
    const params = new URLSearchParams({ category: 'turismo', search: query });
    navigate(`/listings?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <VerticalHero
        title={copy.title}
        subtitle={copy.subtitle}
        searchPlaceholder={copy.placeholder}
        labels={copy.labels}
        onSearch={handleSearch}
        color="green"
      />

      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 -mt-8 relative z-10">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-xl">
          <h2 className="text-[18px] font-bold text-slate-800 dark:text-slate-100 mb-6 text-center lg:text-left">
            {landingCopy.exploreTitle}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-4">
            {SUBSECTIONS.map(sub => {
              const Icon = sub.Icon;
              const label = sub.query === 'renta_vehiculos'
                ? landingCopy.transportRental
                : (landingCopy.sectionLabels[sub.query] || sub.name);
              return (
                <button
                  key={sub.query}
                  onClick={() => applySubcategory(sub.query)}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 hover:border-slate-200 hover:shadow-md dark:hover:bg-slate-900 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-lime-500/10 text-lime-600 dark:bg-lime-500/20 dark:text-lime-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon size={24} />
                  </div>
                  <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 text-center">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white">
              {copy.featured}
            </h3>
          </div>

          <VerticalAdGrid
            apiUrl={`${API_URL}/ads?category=turismo&per_page=6`}
            viewAllUrl="/listings?category=turismo"
            viewAllLabel={landingCopy.viewAll}
            cols={3}
          />
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm sticky top-[90px] h-[480px] flex flex-col">
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {landingCopy.mapTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {landingCopy.mapDescription}
              </p>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 relative">
              <MapV3
                category="turismo"
                interactive={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
