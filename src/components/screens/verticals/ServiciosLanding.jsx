import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import VerticalHero from '../../verticals/VerticalHero';
import VerticalAdGrid from '../../verticals/VerticalAdGrid';
import MapV3 from '../../common/MapV3';
import { BadgeCheck, Brush, Camera, Car, GraduationCap, Hammer, HeartHandshake, Leaf, PawPrint, Plug, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { getVerticalCopy } from '../../../utils/verticalCopy';
import { getServiciosLandingCopy } from '../../../utils/serviciosLandingCopy';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const SERVICE_CATS = [
  { query: 'plomería electricidad carpintería', Icon: Wrench },
  { query: 'reparaciones mantenimiento', Icon: Hammer },
  { query: 'limpieza', Icon: Sparkles },
  { query: 'clases cursos', Icon: GraduationCap },
  { query: 'diseño marketing', Icon: Brush },
  { query: 'fotografía eventos', Icon: Camera },
  { query: 'jardinería', Icon: Leaf },
  { query: 'mudanza transporte', Icon: Car },
  { query: 'mascotas veterinario', Icon: PawPrint },
  { query: 'cuidado enfermería', Icon: HeartHandshake },
  { query: 'electricidad', Icon: Plug },
];

const TRUST_ICONS = [BadgeCheck, ShieldCheck, Wrench];

export default function ServiciosLanding({ lang = 'es' }) {
  const navigate = useNavigate();
  const copy = getVerticalCopy(lang, 'servicios');
  const landingCopy = getServiciosLandingCopy(lang);
  const localizedCategories = useMemo(() => SERVICE_CATS.map((item, index) => ({ ...item, name: landingCopy.categories[index] })), [landingCopy.categories]);
  const localizedTrust = useMemo(() => TRUST_ICONS.map((Icon, index) => ({ Icon, title: landingCopy.trust[index][0], body: landingCopy.trust[index][1] })), [landingCopy.trust]);

  const handleSearch = (q, location = {}) => {
    const params = new URLSearchParams({ category: 'servicios' });
    if (q) params.set('search', q);
    if (location.state) params.set('state', location.state);
    if (location.city) params.set('location', location.city);
    if (location.radius) params.set('radius_km', location.radius);
    navigate(`/?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <VerticalHero
        title={copy.title}
        subtitle={copy.subtitle}
        searchPlaceholder={copy.placeholder}
        labels={copy.labels}
        color="orange"
        mapQuery="servicios profesionales en México"
        onSearch={handleSearch}
        subsections={localizedCategories}
        onSubsectionSelect={(item) => navigate(`/?category=servicios&search=${encodeURIComponent(item.query)}`)}
      />

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-14">
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{landingCopy.mapTitle}</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{landingCopy.mapDescription}</p>
            </div>
            <button onClick={() => navigate('/?category=servicios')}
              className="hidden rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 sm:inline-flex">
              {copy.labels.viewList}
            </button>
          </div>
          <MapV3 category="servicios" title={landingCopy.mapMarkerTitle} className="h-[260px] md:h-[420px]" />
        </section>

        {/* Service category grid */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-5">{landingCopy.needsTitle}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {localizedCategories.map(s => {
              const Icon = s.Icon;
              return (
              <button key={s.name}
                onClick={() => navigate(`/?category=servicios&search=${encodeURIComponent(s.query)}`)}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col items-center gap-3 hover:border-orange-400 hover:shadow-md transition-all group text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <Icon size={23} strokeWidth={2.2} />
                </span>
                <span className="text-[14px] font-semibold text-slate-700 group-hover:text-orange-600">{s.name}</span>
              </button>
            )})}
          </div>
        </section>

        {/* Featured services */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-2xl font-bold text-slate-900">{copy.featured}</h2>
            <a onClick={() => navigate('/?category=servicios')}
              className="text-[13px] font-semibold text-orange-500 hover:underline cursor-pointer">{copy.labels.viewAll} →</a>
          </div>
          <VerticalAdGrid
            apiUrl={`${API_URL}/ads?category=servicios&per_page=6`}
            viewAllUrl="/?category=servicios"
            viewAllLabel={copy.labels.viewAll}
            cols={3}
            variant="services"
          />
        </section>

        {/* Trust section */}
        <section className="bg-orange-50 rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">{landingCopy.trustTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {localizedTrust.map(item => {
              const Icon = item.Icon;
              return (
              <div key={item.title} className="bg-white rounded-2xl p-6 shadow-sm text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600">
                  <Icon size={23} strokeWidth={2.2} />
                </div>
                <h3 className="font-bold text-[15px] text-slate-800 mb-2">{item.title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{item.body}</p>
              </div>
            )})}
          </div>
        </section>

        {/* Provider CTA */}
        <section className="bg-gradient-to-r from-orange-600 to-orange-400 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div>
            <h2 className="text-2xl font-bold mb-2">{landingCopy.ctaTitle}</h2>
            <p className="text-orange-100">{landingCopy.ctaBody}</p>
          </div>
          <button onClick={() => navigate('/post')}
            className="shrink-0 px-8 py-3 bg-white text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-colors text-[15px]">
            {landingCopy.ctaButton}
          </button>
        </section>

      </div>
    </div>
  );
}
