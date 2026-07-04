import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../../SEO';
import VerticalHero from '../../verticals/VerticalHero';
import VerticalAdGrid from '../../verticals/VerticalAdGrid';
import MapV3 from '../../common/MapV3';
import { Laptop, Home, Shirt, Gamepad2, Baby, Dog, BookOpen, HelpCircle } from 'lucide-react';
import { getVerticalCopy } from '../../../utils/verticalCopy';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const SUBSECTIONS = [
  { name: 'Electrónica', query: 'electronica', Icon: Laptop },
  { name: 'Hogar y Jardín', query: 'hogar', Icon: Home },
  { name: 'Moda', query: 'moda', Icon: Shirt },
  { name: 'Ocio y Hobbies', query: 'ocio', Icon: Gamepad2 },
  { name: 'Infantil y Bebés', query: 'infantil', Icon: Baby },
  { name: 'Mascotas', query: 'mascotas', Icon: Dog },
  { name: 'Libros y Cursos', query: 'formacion', Icon: BookOpen },
];

export default function ProductosLanding({ lang = 'es' }) {
  const navigate = useNavigate();
  const copy = getVerticalCopy(lang, 'productos');
  const [selectedSub, setSelectedSub] = useState('');

  const handleSearch = (q, location = {}) => {
    const params = new URLSearchParams({ category: selectedSub || 'productos' });
    if (q) params.set('search', q);
    if (location.state) params.set('state', location.state);
    if (location.city) params.set('location', location.city);
    if (location.radius) params.set('radius_km', location.radius);
    navigate(`/?${params.toString()}`);
  };

  const applySubcategory = (slug) => {
    navigate(`/${slug}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <SEO 
        title={copy.title} 
        description={copy.subtitle} 
      />

      <VerticalHero 
        title={copy.title}
        subtitle={copy.subtitle}
        placeholder={copy.placeholder}
        onSearch={handleSearch}
        bgGradient="from-pink-500 via-red-500 to-yellow-500"
      />

      {/* SUBSECTIONS GRID */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 -mt-8 relative z-10">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-xl">
          <h2 className="text-[18px] font-bold text-slate-800 dark:text-slate-100 mb-6 text-center lg:text-left">
            {lang === 'es' ? 'Explora por Categorías' : 'Explore by Categories'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
            {SUBSECTIONS.map((sub, idx) => {
              const Icon = sub.Icon;
              return (
                <button
                  key={idx}
                  onClick={() => applySubcategory(sub.query)}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 hover:border-slate-200 hover:shadow-md dark:hover:bg-slate-900 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-lime-500/10 text-lime-600 dark:bg-lime-500/20 dark:text-lime-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon size={24} />
                  </div>
                  <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 text-center">
                    {sub.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ADS GRID SECTION */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white">
              {copy.featuredTitle}
            </h3>
          </div>
          
          <VerticalAdGrid 
            category="productos" 
            lang={lang} 
            limit={6} 
          />
        </div>

        {/* MAP PANEL */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm sticky top-[90px] h-[480px] flex flex-col">
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'es' ? 'Mapa de Productos' : 'Goods Map'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {lang === 'es' ? 'Encuentra artículos cerca de tu ubicación.' : 'Find goods near your location.'}
              </p>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 relative">
              <MapV3 
                category="productos" 
                interactive={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
