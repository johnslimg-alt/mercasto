import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VerticalHero from '../../verticals/VerticalHero';
import VerticalAdGrid from '../../verticals/VerticalAdGrid';
import MapV3 from '../../common/MapV3';
import { Building2, Castle, FileCheck2, Home, KeyRound, LandPlot, MapPinned, SearchCheck, Store } from 'lucide-react';
import { getVerticalCopy } from '../../../utils/verticalCopy';
import { getInmueblesLandingCopy } from '../../../utils/inmueblesLandingCopy';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const CITIES = [
  { name: 'Ciudad de México', Icon: Building2 },
  { name: 'Guadalajara',      Icon: Home },
  { name: 'Monterrey',        Icon: MapPinned },
  { name: 'Cancún',           Icon: Home },
  { name: 'Puebla',           Icon: Building2 },
  { name: 'Tijuana',          Icon: MapPinned },
];
const OPERACIONES = ['Venta', 'Renta'];
const TIPOS = ['Casa', 'Departamento', 'Local', 'Terreno'];
const TIP_ICONS = [FileCheck2, Building2, SearchCheck];
const SUBSECTIONS = [
  { query: 'casas', Icon: Home },
  { query: 'departamentos', Icon: Building2 },
  { query: 'renta', Icon: KeyRound },
  { query: 'terrenos', Icon: LandPlot },
  { query: 'locales comerciales', Icon: Store },
  { query: 'oficinas', Icon: Building2 },
  { query: 'renta vacacional', Icon: Castle },
];

export default function InmueblesLanding({ lang = 'es' }) {
  const navigate = useNavigate();
  const copy = getVerticalCopy(lang, 'inmuebles');
  const landingCopy = getInmueblesLandingCopy(lang);
  const [operacion, setOperacion] = useState('');
  const [tipo, setTipo] = useState('');
  const localizedOperations = useMemo(() => OPERACIONES.map((value, index) => ({ value, name: landingCopy.operations[index] })), [landingCopy.operations]);
  const localizedTypes = useMemo(() => TIPOS.map((value, index) => ({ value, name: landingCopy.types[index] })), [landingCopy.types]);
  const localizedSubsections = useMemo(() => SUBSECTIONS.map((item, index) => ({ ...item, name: landingCopy.subsections[index] })), [landingCopy.subsections]);
  const localizedTips = useMemo(() => TIP_ICONS.map((Icon, index) => ({ Icon, title: landingCopy.tips[index][0], body: landingCopy.tips[index][1] })), [landingCopy.tips]);

  const handleSearch = (q, location = {}) => {
    const params = new URLSearchParams({ category: 'inmobiliaria' });
    if (q) params.set('search', q);
    if (location.state) params.set('state', location.state);
    if (location.city) params.set('location', location.city);
    if (location.radius) params.set('radius_km', location.radius);
    navigate(`/?${params.toString()}`);
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
        title={copy.title}
        subtitle={copy.subtitle}
        searchPlaceholder={copy.placeholder}
        labels={copy.labels}
        color="green"
        mapQuery="inmuebles en México"
        onSearch={handleSearch}
        subsections={localizedSubsections}
        onSubsectionSelect={(item) => navigate(`/?category=inmobiliaria&search=${encodeURIComponent(item.query)}`)}>
        <div className="flex justify-center gap-2 mt-2">
          {localizedOperations.map(op => (
            <button key={op.value}
              onClick={() => setOperacion(prev => prev === op.value ? '' : op.value)}
              className={`px-6 py-2 rounded-full text-[14px] font-bold border-2 transition-all ${operacion === op.value ? 'bg-white text-emerald-700 border-white' : 'border-white/50 text-white hover:border-white'}`}>
              {op.name}
            </button>
          ))}
        </div>
      </VerticalHero>

      {/* Quick filter bar */}
      <div className="bg-white border-b border-slate-100 sticky top-[148px] sm:top-[104px] z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-2 items-center">
          {localizedTypes.map(t => (
            <button key={t.value}
              onClick={() => setTipo(prev => prev === t.value ? '' : t.value)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${tipo === t.value ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}>
              {t.name}
            </button>
          ))}
          {(operacion || tipo) && (
            <button onClick={applyFilters}
              className="ml-auto px-4 py-1.5 bg-emerald-600 text-white rounded-full text-[13px] font-bold hover:bg-emerald-700 transition-colors">
              {landingCopy.applySearch}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-14">
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{landingCopy.mapTitle}</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{landingCopy.mapDescription}</p>
            </div>
            <button onClick={() => navigate('/?category=inmobiliaria')}
              className="hidden rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 sm:inline-flex">
              {copy.labels.viewList}
            </button>
          </div>
          <MapV3 category="inmobiliaria" title={landingCopy.mapMarkerTitle} className="h-[260px] md:h-[420px]" />
        </section>

        {/* Featured listings */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-2xl font-bold text-slate-900">{copy.featured}</h2>
            <a onClick={() => navigate('/?category=inmobiliaria')}
              className="text-[13px] font-semibold text-emerald-600 hover:underline cursor-pointer">{copy.labels.viewAll} →</a>
          </div>
          <VerticalAdGrid
            apiUrl={`${API_URL}/ads?category=inmobiliaria&per_page=8`}
            viewAllUrl="/?category=inmobiliaria"
            viewAllLabel={copy.labels.viewAll}
            cols={4}
          />
        </section>

        {/* Cities */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-5">{landingCopy.citiesTitle}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CITIES.map(c => {
              const Icon = c.Icon;
              return (
              <button key={c.name}
                onClick={() => navigate(`/?category=inmobiliaria&location=${encodeURIComponent(c.name)}`)}
                className="bg-white border border-slate-200 rounded-2xl p-4 text-center hover:border-emerald-400 hover:shadow-md transition-all group">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Icon size={21} strokeWidth={2.2} />
                </div>
                <div className="text-[13px] font-semibold text-slate-700 group-hover:text-emerald-700">{c.name}</div>
              </button>
            )})}
          </div>
        </section>

        {/* Tips */}
        <section className="bg-emerald-50 rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">{landingCopy.tipsTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {localizedTips.map(tip => {
              const Icon = tip.Icon;
              return (
              <div key={tip.title} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                  <Icon size={21} strokeWidth={2.2} />
                </div>
                <h3 className="font-bold text-[15px] text-slate-800 mb-2">{tip.title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{tip.body}</p>
              </div>
            )})}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-emerald-700 to-emerald-500 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div>
            <h2 className="text-2xl font-bold mb-2">{landingCopy.ctaTitle}</h2>
            <p className="text-emerald-100">{landingCopy.ctaBody}</p>
          </div>
          <button onClick={() => navigate('/post')}
            className="shrink-0 px-8 py-3 bg-white text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-colors text-[15px]">
            {landingCopy.ctaButton}
          </button>
        </section>

      </div>
    </div>
  );
}
