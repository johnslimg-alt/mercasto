import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VerticalHero from '../../verticals/VerticalHero';
import VerticalAdGrid from '../../verticals/VerticalAdGrid';
import MapV3 from '../../common/MapV3';
import { BriefcaseBusiness, ChartNoAxesCombined, Clock, GraduationCap, HeartPulse, Hotel, Landmark, Laptop, Megaphone, Palette, UserSearch } from 'lucide-react';
import { getVerticalCopy } from '../../../utils/verticalCopy';
import { getEmpleosLandingCopy } from '../../../utils/empleosLandingCopy';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const AREAS = [
  { value: 'Tecnología', Icon: Laptop },
  { value: 'Ventas', Icon: ChartNoAxesCombined },
  { value: 'Administración', Icon: BriefcaseBusiness },
  { value: 'Marketing', Icon: Megaphone },
  { value: 'Finanzas', Icon: Landmark },
  { value: 'Educación', Icon: GraduationCap },
  { value: 'Salud', Icon: HeartPulse },
  { value: 'Diseño', Icon: Palette },
];
const MODALIDADES = ['Presencial', 'Remoto', 'Híbrido'];
const SUBSECTIONS = [
  { query: 'vacantes', Icon: BriefcaseBusiness },
  { query: 'busco empleo', Icon: UserSearch },
  { query: 'tecnología', Icon: Laptop },
  { query: 'ventas', Icon: ChartNoAxesCombined },
  { query: 'administración', Icon: Landmark },
  { query: 'salud', Icon: HeartPulse },
  { query: 'hotelería turismo', Icon: Hotel },
  { query: 'medio tiempo', Icon: Clock },
  { query: 'cursos capacitación', Icon: GraduationCap },
];

export default function EmpleosLanding({ lang = 'es' }) {
  const navigate = useNavigate();
  const copy = getVerticalCopy(lang, 'empleos');
  const landingCopy = getEmpleosLandingCopy(lang);
  const [area, setArea] = useState('');
  const [modalidad, setModalidad] = useState('');
  const localizedAreas = useMemo(() => AREAS.map((item, index) => ({ ...item, name: landingCopy.areas[index] })), [landingCopy.areas]);
  const localizedModalities = useMemo(() => MODALIDADES.map((value, index) => ({ value, name: landingCopy.modalities[index] })), [landingCopy.modalities]);
  const localizedSubsections = useMemo(() => SUBSECTIONS.map((item, index) => ({ ...item, name: landingCopy.subsections[index] })), [landingCopy.subsections]);

  const handleSearch = (q, location = {}) => {
    const params = new URLSearchParams({ category: 'empleo' });
    if (q) params.set('search', q);
    if (location.state) params.set('state', location.state);
    if (location.city) params.set('location', location.city);
    if (location.radius) params.set('radius_km', location.radius);
    navigate(`/?${params.toString()}`);
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
        title={copy.title}
        subtitle={copy.subtitle}
        searchPlaceholder={copy.placeholder}
        labels={copy.labels}
        color="purple"
        mapQuery="empleos en México"
        onSearch={handleSearch}
        subsections={localizedSubsections}
        onSubsectionSelect={(item) => navigate(`/?category=empleo&search=${encodeURIComponent(item.query)}`)}
      />

      {/* Quick filters */}
      <div className="bg-white border-b border-slate-100 sticky top-[148px] sm:top-[104px] z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-2 items-center">
          {localizedAreas.map(a => (
            <button key={a.value}
              onClick={() => setArea(prev => prev === a.value ? '' : a.value)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${area === a.value ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}>
              {a.name}
            </button>
          ))}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          {localizedModalities.map(m => (
            <button key={m.value}
              onClick={() => setModalidad(prev => prev === m.value ? '' : m.value)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${modalidad === m.value ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}>
              {m.name}
            </button>
          ))}
          {(area || modalidad) && (
            <button onClick={applyFilters}
              className="ml-auto px-4 py-1.5 bg-purple-600 text-white rounded-full text-[13px] font-bold hover:bg-purple-700 transition-colors">
              {landingCopy.applyJobs}
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
            <button onClick={() => navigate('/?category=empleo')}
              className="hidden rounded-full bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 sm:inline-flex">
              {copy.labels.viewList}
            </button>
          </div>
          <MapV3 category="empleo" title={landingCopy.mapMarkerTitle} className="h-[260px] md:h-[420px]" />
        </section>

        {/* Featured jobs */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-2xl font-bold text-slate-900">{copy.featured}</h2>
            <a onClick={() => navigate('/?category=empleo')}
              className="text-[13px] font-semibold text-purple-600 hover:underline cursor-pointer">{copy.labels.viewAll} →</a>
          </div>
          <VerticalAdGrid
            apiUrl={`${API_URL}/ads?category=empleo&per_page=6`}
            viewAllUrl="/?category=empleo"
            viewAllLabel={copy.labels.viewAll}
            lang={lang}
            cols={3}
          />
        </section>

        {/* Stats */}
        <section className="bg-purple-600 rounded-3xl p-8 text-white text-center grid grid-cols-2 md:grid-cols-4 gap-6">
          {landingCopy.stats.map(([n, label]) => (
            <div key={label}>
              <div className="text-3xl font-black mb-1">{n}</div>
              <div className="text-sm text-purple-100">{label}</div>
            </div>
          ))}
        </section>

        {/* Areas grid */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-5">{landingCopy.areasTitle}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {localizedAreas.map(a => {
              const Icon = a.Icon;
              return (
              <button key={a.value}
                onClick={() => navigate(`/?category=empleo&search=${encodeURIComponent(a.value)}`)}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 hover:border-purple-400 hover:shadow-md transition-all group">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                <span className="text-[13px] font-semibold text-slate-700 group-hover:text-purple-700">{a.name}</span>
              </button>
            )})}
          </div>
        </section>

        {/* Employer CTA */}
        <section className="bg-gradient-to-r from-purple-700 to-purple-500 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div>
            <h2 className="text-2xl font-bold mb-2">{landingCopy.employerTitle}</h2>
            <p className="text-purple-100">{landingCopy.employerBody}</p>
          </div>
          <button onClick={() => navigate('/post')}
            className="shrink-0 px-8 py-3 bg-white text-purple-700 font-bold rounded-xl hover:bg-purple-50 transition-colors text-[15px]">
            {landingCopy.employerButton}
          </button>
        </section>

      </div>
    </div>
  );
}
