import React from 'react';
import { MapPin, Search } from 'lucide-react';

const GRADIENT_MAP = {
  blue:   'from-blue-600 to-blue-800',
  green:  'from-emerald-600 to-emerald-800',
  purple: 'from-purple-600 to-purple-800',
  orange: 'from-orange-500 to-orange-700',
};

export default function VerticalHero({ title, subtitle, searchPlaceholder, color = 'blue', onSearch, mapQuery = 'México', children }) {
  const [query, setQuery] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
  };
  const openMapSearch = () => {
    const term = [query, mapQuery].filter(Boolean).join(' ');
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(term || 'México')}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`relative bg-gradient-to-br ${GRADIENT_MAP[color] || GRADIENT_MAP.blue} text-white py-16 px-4`}>
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 drop-shadow-sm">{title}</h1>
        {subtitle && (
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">{subtitle}</p>
        )}
        <form onSubmit={handleSubmit}
          className="flex items-center gap-2 bg-white rounded-2xl shadow-xl p-2 max-w-2xl mx-auto">
          <Search size={20} className="text-slate-400 ml-2 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchPlaceholder || 'Buscar…'}
            className="flex-1 bg-transparent text-slate-900 placeholder-slate-400 text-[15px] outline-none py-1"
          />
          <button type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-semibold text-[14px] transition-colors shrink-0">
            Buscar
          </button>
        </form>
        <button
          type="button"
          onClick={openMapSearch}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/12 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur hover:bg-white/20 transition-colors"
        >
          <MapPin size={16} /> Buscar en mapa
        </button>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
