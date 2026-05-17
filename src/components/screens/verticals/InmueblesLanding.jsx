import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VerticalHero from '../../verticals/VerticalHero';
import VerticalAdGrid from '../../verticals/VerticalAdGrid';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const CITIES = [
  { name: 'Ciudad de México', emoji: '🏙️' },
  { name: 'Guadalajara',      emoji: '🌇' },
  { name: 'Monterrey',        emoji: '🏔️' },
  { name: 'Cancún',           emoji: '🏖️' },
  { name: 'Puebla',           emoji: '⛪' },
  { name: 'Tijuana',          emoji: '🌉' },
];
const TIPOS = ['Casa', 'Departamento', 'Local', 'Terreno'];
const TIPS = [
  { icon: '📋', title: 'Verifica el título de propiedad',
    body: 'Solicita la escritura y confirma que esté libre de gravámenes antes de firmar cualquier contrato.' },
  { icon: '🏦', title: 'Conoce tus opciones de crédito',
    body: 'INFONAVIT, FOVISSSTE y créditos bancarios — compara tasas y condiciones antes de comprometerte.' },
  { icon: '🔍', title: 'Visita siempre en persona',
    body: 'Las fotos no lo cuentan todo. Programa una visita para verificar el estado real del inmueble.' },
];

export default function InmueblesLanding() {
  const navigate = useNavigate();
  const [operacion, setOperacion] = useState('');
  const [tipo, setTipo] = useState('');

  React.useEffect(() => {
    document.title = 'Comprar y rentar propiedades en México — Mercasto';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Encuentra casas, departamentos y terrenos en venta o renta en México. Las mejores propiedades en Mercasto.');
  }, []);

  const handleSearch = (q) => {
    navigate(`/?search=${encodeURIComponent(q)}&category=inmobiliaria`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams({ category: 'inmobiliaria' });
    const query = [operacion, tipo].filter(Boolean).join(' ');
    if (query) params.set('search', query);
    navigate(`/?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <VerticalHero
        title="Encuentra propiedades en México"
        subtitle="Compra, renta o invierte en los mejores inmuebles del país"
        searchPlaceholder="Buscar por ciudad, colonia, tipo de propiedad…"
        color="green"
        onSearch={handleSearch}>
        <div className="flex justify-center gap-2 mt-2">
          {['Venta', 'Renta'].map(op => (
            <button key={op}
              onClick={() => setOperacion(prev => prev === op ? '' : op)}
              className={`px-6 py-2 rounded-full text-[14px] font-bold border-2 transition-all ${operacion === op ? 'bg-white text-emerald-700 border-white' : 'border-white/50 text-white hover:border-white'}`}>
              {op}
            </button>
          ))}
        </div>
      </VerticalHero>

      {/* Quick filter bar */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-2 items-center">
          {TIPOS.map(t => (
            <button key={t}
              onClick={() => setTipo(prev => prev === t ? '' : t)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${tipo === t ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}>
              {t}
            </button>
          ))}
          {(operacion || tipo) && (
            <button onClick={applyFilters}
              className="ml-auto px-4 py-1.5 bg-emerald-600 text-white rounded-full text-[13px] font-bold hover:bg-emerald-700 transition-colors">
              Buscar →
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-14">

        {/* Featured listings */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-2xl font-bold text-slate-900">Propiedades destacadas</h2>
            <a onClick={() => navigate('/?category=inmobiliaria')}
              className="text-[13px] font-semibold text-emerald-600 hover:underline cursor-pointer">Ver todas →</a>
          </div>
          <VerticalAdGrid
            apiUrl={`${API_URL}/ads?category=inmobiliaria&per_page=8`}
            viewAllUrl="/?category=inmobiliaria"
            viewAllLabel="Ver todas las propiedades →"
            cols={4}
          />
        </section>

        {/* Cities */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-5">Buscar por ciudad</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CITIES.map(c => (
              <button key={c.name}
                onClick={() => navigate(`/?category=inmobiliaria&location=${encodeURIComponent(c.name)}`)}
                className="bg-white border border-slate-200 rounded-2xl p-4 text-center hover:border-emerald-400 hover:shadow-md transition-all group">
                <div className="text-3xl mb-2">{c.emoji}</div>
                <div className="text-[13px] font-semibold text-slate-700 group-hover:text-emerald-700">{c.name}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Tips */}
        <section className="bg-emerald-50 rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Consejos para comprar o rentar</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIPS.map(tip => (
              <div key={tip.title} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="text-3xl mb-3">{tip.icon}</div>
                <h3 className="font-bold text-[15px] text-slate-800 mb-2">{tip.title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{tip.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-emerald-700 to-emerald-500 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div>
            <h2 className="text-2xl font-bold mb-2">¿Tienes una propiedad para vender o rentar?</h2>
            <p className="text-emerald-100">Llega a miles de compradores e inquilinos en toda la República.</p>
          </div>
          <button onClick={() => navigate('/post')}
            className="shrink-0 px-8 py-3 bg-white text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-colors text-[15px]">
            Publicar propiedad gratis →
          </button>
        </section>

      </div>
    </div>
  );
}
