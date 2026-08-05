import React from 'react';
import { useNavigate } from 'react-router-dom';
import VerticalHero from '../../verticals/VerticalHero';
import { Laptop, Home, Shirt, Gamepad2, Baby, Dog, BookOpen } from 'lucide-react';
import { getVerticalCopy } from '../../../utils/verticalCopy';


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
  const handleSearch = (q, location = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (location.state) params.set('state', location.state);
    if (location.city) params.set('location', location.city);
    if (location.radius) params.set('radius_km', location.radius);
    navigate(`/?${params.toString()}`);
  };

  const applySubcategory = (slug) => {
    if (slug === 'formacion') {
      navigate('/listings?category=formacion');
      return;
    }
    navigate(`/${slug}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">

      <VerticalHero 
        title={copy.title}
        subtitle={copy.subtitle}
        searchPlaceholder={copy.placeholder}
        onSearch={handleSearch}
        color="purple"
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

      <section className="max-w-[1440px] mx-auto px-4 lg:px-6 mt-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Cómo explorar productos en Mercasto</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Elige una categoría para consultar anuncios publicados, filtrar por ubicación y contactar directamente al anunciante. Los resultados con filtros usan páginas de búsqueda no indexables para evitar duplicados.
          </p>
        </div>
      </section>
    </div>
  );
}
