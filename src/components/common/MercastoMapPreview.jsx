import React from 'react';
import { Maximize2, Search, X } from 'lucide-react';

const DEFAULT_MARKERS = [
  { label: '$1.7k', x: 26, y: 55, tone: 'lime' },
  { label: '$41k', x: 48, y: 42, tone: 'dark' },
  { label: '$914', x: 64, y: 58, tone: 'lime' },
  { label: '$35k', x: 82, y: 48, tone: 'dark' },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const coordsToPoint = (coords) => {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lat, lon] = coords.map(Number);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return {
    x: clamp(((lon + 118.5) / 32.5) * 100, 8, 92),
    y: clamp(((32.8 - lat) / 18.6) * 100, 12, 84),
  };
};

export default function MercastoMapPreview({
  title = 'Todo México',
  markers = DEFAULT_MARKERS,
  onSearch,
  onMarkerClick,
  className = '',
  showFullscreen = true,
}) {
  const [expanded, setExpanded] = React.useState(false);
  const normalizedMarkers = markers.length ? markers : DEFAULT_MARKERS;

  const renderMap = (large = false) => (
    <div className={`mercasto-map-preview ${large ? 'mercasco-map-preview--large' : ''}`}>
      <div className="mercasto-map-grid" />
      <div className="mercasto-map-glow mercasto-map-glow--one" />
      <div className="mercasto-map-glow mercasto-map-glow--two" />
      <div className="mercasto-map-shape mercasto-map-shape--north" />
      <div className="mercasto-map-shape mercasto-map-shape--mexico" />
      <div className="mercasto-map-shape mercasto-map-shape--south" />

      <div className="absolute left-4 top-4 z-[2] rounded-full bg-white/92 px-3 py-1.5 text-xs font-black text-slate-800 shadow-sm dark:bg-slate-950/88 dark:text-white">
        {title}
      </div>
      <div className="absolute right-4 top-4 z-[2] rounded-full bg-slate-950/90 px-3 py-1.5 text-xs font-black text-white shadow-sm dark:bg-[#84CC16] dark:text-slate-950">
        Vista previa
      </div>

      {normalizedMarkers.map((marker, index) => {
        const point = marker.x !== undefined ? marker : coordsToPoint(marker.coords) || DEFAULT_MARKERS[index % DEFAULT_MARKERS.length];
        return (
          <button
            key={marker.id || index}
            type="button"
            onClick={() => onMarkerClick?.(marker.ad || marker)}
            className={`mercasto-map-marker ${marker.tone === 'dark' || index % 2 ? 'mercasto-map-marker--dark' : 'mercasto-map-marker--lime'}`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            {marker.label || '$'}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-md dark:border-slate-700 dark:bg-slate-950 ${className}`}>
        {renderMap(false)}
        {showFullscreen && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="absolute bottom-3 right-3 z-[3] inline-flex items-center gap-1.5 rounded-full bg-[#84CC16] px-3 py-2 text-xs font-black text-slate-950 shadow-lg"
          >
            <Maximize2 size={14} /> Ampliar
          </button>
        )}
      </div>

      {expanded && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/90 p-3 backdrop-blur-sm">
          <div className="relative h-full overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="absolute inset-x-3 top-3 z-[5] flex gap-2 rounded-2xl bg-white/95 p-2 shadow-xl dark:bg-slate-900/95">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                <Search size={16} className="text-[#84CC16]" />
                <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none dark:text-white" placeholder="Buscar en el mapa..." />
              </div>
              <button type="button" onClick={onSearch} className="rounded-xl bg-[#84CC16] px-3 py-2 text-sm font-black text-slate-950">Buscar</button>
              <button type="button" onClick={() => setExpanded(false)} className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white dark:bg-slate-700" aria-label="Cerrar mapa">
                <X size={18} />
              </button>
            </div>
            {renderMap(true)}
          </div>
        </div>
      )}
    </>
  );
}
