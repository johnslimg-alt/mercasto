import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VerticalHero from '../../verticals/VerticalHero';
import VerticalAdGrid from '../../verticals/VerticalAdGrid';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const AREAS = [
  { name: 'Tecnología',     emoji: '💻' },
  { name: 'Ventas',         emoji: '📈' },
  { name: 'Administración', emoji: '🗂️' },
  { name: 'Marketing',      emoji: '📣' },
  { name: 'Finanzas',       emoji: '💰' },
  { name: 'Educación',      emoji: '📚' },
  { name: 'Salud',          emoji: '🏥' },
  { name: 'Diseño',         emoji: '🎨' },
];
const MODALIDADES = ['Presencial', 'Remoto', 'Híbrido'];

export default function EmpleosLanding() {
  const navigate = useNavigate();
  const [area, setArea] = useState('');
  const [modalidad, setModalidad] = useState('');

  React.useEffect(() => {
    document.title = 'Empleos y trabajos en México — Mercasto';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Encuentra trabajo en México. Miles de empleos en tecnología, ventas, administración y más. Busca o publica empleos gratis en Mercasto.');
  }, []);

  const handleSearch = (q) => {
    navigate(`/?search=${encodeURIComponent(q)}&category=empleo`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams({ category: 'empleo' });
    const query = [area, modalidad].filter(Boolean).join(' ');
    if (query) params.set('search', query);
    navigate(`/?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <VerticalHero
        title="Encuentra trabajo en México"
        subtitle="Miles de oportunidades laborales en todo el país"
        searchPlaceholder="Buscar por puesto, empresa, ciudad…"
        color="purple"
        onSearch={handleSearch}
      />

      {/* Quick filters */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-2 items-center">
          {AREAS.map(a => (
            <button key={a.name}
              onClick={() => setArea(prev => prev === a.name ? '' : a.name)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${area === a.name ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}>
              {a.name}
            </button>
          ))}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          {MODALIDADES.map(m => (
            <button key={m}
              onClick={() => setModalidad(prev => prev === m ? '' : m)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${modalidad === m ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}>
              {m}
            </button>
          ))}
          {(area || modalidad) && (
            <button onClick={applyFilters}
              className="ml-auto px-4 py-1.5 bg-purple-600 text-white rounded-full text-[13px] font-bold hover:bg-purple-700 transition-colors">
              Buscar empleos →
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-14">

        {/* Featured jobs */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-2xl font-bold text-slate-900">Empleos recientes</h2>
            <a onClick={() => navigate('/?category=empleo')}
              className="text-[13px] font-semibold text-purple-600 hover:underline cursor-pointer">Ver todos →</a>
          </div>
          <VerticalAdGrid
            apiUrl={`${API_URL}/ads?category=empleo&per_page=6`}
            viewAllUrl="/?category=empleo"
            viewAllLabel="Ver todos los empleos →"
            cols={3}
          />
        </section>

        {/* Stats */}
        <section className="bg-purple-600 rounded-3xl p-8 text-white text-center grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: '12,000+',          label: 'Empleos activos' },
            { n: '3,500+',           label: 'Empresas publicando' },
            { n: 'CDMX · GDL · MTY', label: 'Principales ciudades' },
            { n: 'Gratis',           label: 'Buscar trabajo' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl font-black mb-1">{s.n}</div>
              <div className="text-sm text-purple-100">{s.label}</div>
            </div>
          ))}
        </section>

        {/* Areas grid */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-5">Explorar por área</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {AREAS.map(a => (
              <button key={a.name}
                onClick={() => navigate(`/?category=empleo&search=${encodeURIComponent(a.name)}`)}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 hover:border-purple-400 hover:shadow-md transition-all group">
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-[13px] font-semibold text-slate-700 group-hover:text-purple-700">{a.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Employer CTA */}
        <section className="bg-gradient-to-r from-purple-700 to-purple-500 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div>
            <h2 className="text-2xl font-bold mb-2">¿Buscas talento para tu empresa?</h2>
            <p className="text-purple-100">Publica tu oferta de trabajo y conecta con los mejores candidatos en México.</p>
          </div>
          <button onClick={() => navigate('/post')}
            className="shrink-0 px-8 py-3 bg-white text-purple-700 font-bold rounded-xl hover:bg-purple-50 transition-colors text-[15px]">
            Publicar vacante gratis →
          </button>
        </section>

      </div>
    </div>
  );
}
