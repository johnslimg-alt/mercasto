import React from 'react';
import { ChevronDown, LocateFixed, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { MEXICO_STATES_CITIES } from '../../utils/mexicoStates';
import MercastoMapPreview from '../common/MercastoMapPreview';

const GRADIENT_MAP = {
  blue:   'from-blue-600 to-blue-800',
  green:  'from-emerald-600 to-emerald-800',
  purple: 'from-purple-600 to-purple-800',
  orange: 'from-orange-500 to-orange-700',
};

const ACCENT_MAP = {
  blue:   { bg: 'bg-blue-600', border: 'border-blue-100', text: 'text-blue-700', soft: 'from-white to-blue-50/80', chip: 'bg-blue-50 text-blue-700 border-blue-100' },
  green:  { bg: 'bg-emerald-600', border: 'border-emerald-100', text: 'text-emerald-700', soft: 'from-white to-emerald-50/80', chip: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  purple: { bg: 'bg-purple-600', border: 'border-purple-100', text: 'text-purple-700', soft: 'from-white to-purple-50/80', chip: 'bg-purple-50 text-purple-700 border-purple-100' },
  orange: { bg: 'bg-orange-500', border: 'border-orange-100', text: 'text-orange-700', soft: 'from-white to-orange-50/80', chip: 'bg-orange-50 text-orange-700 border-orange-100' },
};

const MAP_POINTS = {
  'Ciudad de México': [-99.1332, 19.4326],
  Jalisco: [-103.3496, 20.6597],
  Guadalajara: [-103.3496, 20.6597],
  'Puerto Vallarta': [-105.2253, 20.6534],
  'Nuevo León': [-100.3161, 25.6866],
  Monterrey: [-100.3161, 25.6866],
  'Estado de México': [-99.6557, 19.2925],
  'Quintana Roo': [-86.8515, 21.1619],
  Cancún: [-86.8515, 21.1619],
  Puebla: [-98.2063, 19.0414],
  Querétaro: [-100.3899, 20.5888],
  'Baja California': [-117.0382, 32.5149],
  Tijuana: [-117.0382, 32.5149],
  Veracruz: [-96.1342, 19.1738],
  Yucatán: [-89.5926, 20.9674],
  Mérida: [-89.5926, 20.9674],
};

export default function VerticalHero({
  title,
  subtitle,
  searchPlaceholder,
  color = 'blue',
  onSearch,
  mapQuery = 'México',
  subsections = [],
  onSubsectionSelect,
  children
}) {
  const [query, setQuery] = React.useState('');
  const [state, setState] = React.useState('');
  const [city, setCity] = React.useState('');
  const [radius, setRadius] = React.useState('25');
  const [showMap, setShowMap] = React.useState(false);
  const citySelectRef = React.useRef(null);
  const accent = ACCENT_MAP[color] || ACCENT_MAP.blue;
  const states = React.useMemo(() => Object.keys(MEXICO_STATES_CITIES).sort((a, b) => a.localeCompare(b, 'es')), []);
  const cities = React.useMemo(() => (state ? [...(MEXICO_STATES_CITIES[state] || [])].sort((a, b) => a.localeCompare(b, 'es')) : []), [state]);
  const locationLabel = city || state || 'Todo México';
  const mapTerm = [query || mapQuery, city, state].filter(Boolean).join(' ');
  const osmQuery = encodeURIComponent(mapTerm || 'México');
  const osmUrl = `https://www.openstreetmap.org/search?query=${osmQuery}`;
  const markerPoint = MAP_POINTS[city || state];
  const mapMarkers = markerPoint
    ? [{ label: 'Aquí', coords: [markerPoint[1], markerPoint[0]], tone: 'lime' }]
    : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(query, { state, city, radius });
  };

  const handleStateChange = (e) => {
    setState(e.target.value);
    setCity('');
    if (e.target.value) {
      requestAnimationFrame(() => citySelectRef.current?.focus());
    }
  };

  return (
    <div className={`relative bg-gradient-to-br ${GRADIENT_MAP[color] || GRADIENT_MAP.blue} text-white px-4 py-7 md:py-10`}>
      <div className="max-w-6xl mx-auto">
        {subsections.length > 0 && (
          <div className="mb-5 flex gap-2 overflow-x-auto no-scrollbar md:justify-center">
            {subsections.map(item => {
              const Icon = item.Icon;
              return (
                <button key={item.name}
                  type="button"
                  onClick={() => onSubsectionSelect?.(item)}
                  className={`min-w-[86px] rounded-2xl border ${accent.border} bg-gradient-to-b ${accent.soft} px-2.5 py-2 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}>
                  <span className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl ${accent.bg} text-white shadow-sm`}>
                    <Icon size={17} strokeWidth={2.2} />
                  </span>
                  <span className="block whitespace-nowrap text-[11px] font-bold text-slate-800">{item.name}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="text-center">
        <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2 drop-shadow-sm">{title}</h1>
        {subtitle && (
          <p className="text-sm md:text-base text-white/80 mb-5 max-w-2xl mx-auto">{subtitle}</p>
        )}
        </div>

        <form onSubmit={handleSubmit}
          className="mx-auto grid max-w-5xl grid-cols-1 gap-2 rounded-3xl bg-white p-2 shadow-2xl md:grid-cols-[1.35fr_0.9fr_0.85fr_0.55fr_auto]">
          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-slate-900">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={searchPlaceholder || 'Buscar…'}
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder-slate-400"
            />
          </label>
          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-slate-900">
            <MapPin size={18} className="text-slate-400 shrink-0" />
            <select value={state} onChange={handleStateChange} className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none">
              <option value="">Todo México</option>
              {states.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-slate-900">
            <LocateFixed size={18} className="text-slate-400 shrink-0" />
            <select ref={citySelectRef} value={city} onChange={e => setCity(e.target.value)} disabled={!state} className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none disabled:text-slate-400">
              <option value="">{state ? 'Toda la ciudad' : 'Ciudad'}</option>
              {cities.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-slate-900">
            <SlidersHorizontal size={18} className="text-slate-400 shrink-0" />
            <select value={radius} onChange={e => setRadius(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none">
              {['5', '10', '25', '50', '100'].map(item => <option key={item} value={item}>{item} km</option>)}
            </select>
          </label>
          <button type="submit"
            className="rounded-2xl bg-slate-950 px-6 py-3 text-[14px] font-bold text-white transition-colors hover:bg-black">
            Buscar
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setShowMap(prev => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur transition-colors hover:bg-white/25"
          >
            <MapPin size={16} /> Ver anuncios en mapa <ChevronDown size={14} className={`transition-transform ${showMap ? 'rotate-180' : ''}`} />
          </button>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/85">
            {locationLabel} · radio {radius} km
          </span>
          {children && <div className="flex flex-wrap items-center justify-center gap-2">{children}</div>}
        </div>

        {showMap && (
          <div className="mx-auto mt-4 grid max-w-5xl gap-3 overflow-hidden rounded-3xl border border-white/20 bg-white p-2 text-left shadow-2xl md:grid-cols-[1.35fr_0.65fr]">
            <MercastoMapPreview
              title={locationLabel}
              markers={mapMarkers}
              onSearch={handleSubmit}
              className="h-[260px] w-full rounded-2xl border-0 md:h-[320px]"
            />
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Mapa activo</p>
              <h3 className="mt-2 text-lg font-black">Anuncios cerca de {locationLabel}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Filtra por estado, ciudad y radio. El siguiente paso es conectar marcadores reales desde `/api/ads` con lat/lng.
              </p>
              <button type="button"
                onClick={handleSubmit}
                className={`mt-4 w-full rounded-2xl ${accent.bg} px-4 py-3 text-sm font-bold text-white`}>
                Aplicar búsqueda
              </button>
              <a
                href={osmUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block text-center text-xs font-semibold text-white/60 hover:text-white"
              >
                Abrir en OpenStreetMap
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
