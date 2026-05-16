import React from 'react';
import { useNavigate } from 'react-router-dom';
import VerticalHero from '../../verticals/VerticalHero';
import VerticalAdGrid from '../../verticals/VerticalAdGrid';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const SERVICE_CATS = [
  { name: 'Plomería',    emoji: '🔧' },
  { name: 'Electricidad', emoji: '⚡' },
  { name: 'Carpintería', emoji: '🪚' },
  { name: 'Limpieza',    emoji: '🧹' },
  { name: 'Clases',      emoji: '📚' },
  { name: 'Diseño',      emoji: '🎨' },
  { name: 'Fotografía',  emoji: '📷' },
  { name: 'Jardinería',  emoji: '🌿' },
];

const TRUST = [
  { icon: '✅', title: 'Profesionales verificados',
    body: 'Revisamos la identidad y experiencia de cada proveedor antes de publicar.' },
  { icon: '⭐', title: 'Con reseñas reales',
    body: 'Lee opiniones de clientes anteriores antes de contratar a cualquier profesional.' },
  { icon: '🤝', title: 'Sin intermediarios',
    body: 'Contacta directamente al profesional y negocia el precio sin comisiones.' },
];

export default function ServiciosLanding() {
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = 'Contratar servicios profesionales en México — Mercasto';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Contrata plomeros, electricistas, diseñadores y más en México. Profesionales verificados con reseñas en Mercasto.');
  }, []);

  const handleSearch = (q) => {
    navigate(`/?search=${encodeURIComponent(q)}&category=servicios`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <VerticalHero
        title="Contrata profesionales verificados"
        subtitle="Plomeros, electricistas, diseñadores y más — cerca de ti"
        searchPlaceholder="Buscar servicio, profesional o ciudad…"
        color="orange"
        onSearch={handleSearch}
      />

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-14">

        {/* Service category grid */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-5">¿Qué servicio necesitas?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SERVICE_CATS.map(s => (
              <button key={s.name}
                onClick={() => navigate(`/?category=servicios&search=${encodeURIComponent(s.name)}`)}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col items-center gap-3 hover:border-orange-400 hover:shadow-md transition-all group text-center">
                <span className="text-4xl">{s.emoji}</span>
                <span className="text-[14px] font-semibold text-slate-700 group-hover:text-orange-600">{s.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Featured services */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-2xl font-bold text-slate-900">Servicios destacados</h2>
            <a onClick={() => navigate('/?category=servicios')}
              className="text-[13px] font-semibold text-orange-500 hover:underline cursor-pointer">Ver todos →</a>
          </div>
          <VerticalAdGrid
            apiUrl={`${API_URL}/ads?category=servicios&per_page=6`}
            viewAllUrl="/?category=servicios"
            viewAllLabel="Ver todos los servicios →"
            cols={3}
          />
        </section>

        {/* Trust section */}
        <section className="bg-orange-50 rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">¿Por qué Mercasto?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TRUST.map(item => (
              <div key={item.title} className="bg-white rounded-2xl p-6 shadow-sm text-center">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-[15px] text-slate-800 mb-2">{item.title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Provider CTA */}
        <section className="bg-gradient-to-r from-orange-600 to-orange-400 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div>
            <h2 className="text-2xl font-bold mb-2">¿Eres profesional independiente?</h2>
            <p className="text-orange-100">Publica tus servicios gratis y conecta con clientes en tu ciudad.</p>
          </div>
          <button onClick={() => navigate('/post')}
            className="shrink-0 px-8 py-3 bg-white text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-colors text-[15px]">
            Ofrecer mi servicio →
          </button>
        </section>

      </div>
    </div>
  );
}
