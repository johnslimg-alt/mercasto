import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'https://mercasto.com/storage';

function getImg(path) {
  if (!path) return '/placeholder-ad.svg';
  if (Array.isArray(path)) {
    return path.length ? getImg(path[0]) : '/placeholder-ad.svg';
  }
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  if (path.startsWith('[')) {
    try {
      const a = JSON.parse(path);
      if (a && a.length) return a[0].startsWith('http') ? a[0] : `${STORAGE_URL}/${a[0]}`;
    } catch (e) {}
  }
  return `${STORAGE_URL}/${path}`;
}

function AdSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden animate-pulse">
      <div className="h-44 bg-slate-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="h-3 bg-slate-100 rounded w-2/3" />
      </div>
    </div>
  );
}

export default function VerticalAdGrid({ apiUrl, viewAllUrl, viewAllLabel = 'Ver todos →', cols = 4 }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetch(apiUrl)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => {
        setAds(Array.isArray(d) ? d : (d.data || []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiUrl]);

  const skeletonCount = cols === 3 ? 6 : 8;
  const gridClass = cols === 3
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';

  return (
    <div>
      <div className={gridClass}>
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) => <AdSkeleton key={i} />)
          : ads.map(ad => (
            <div key={ad.id}
              onClick={() => navigate(`/?ad=${ad.id}`)}
              className="rounded-2xl bg-white border border-slate-100 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="relative h-44 bg-slate-100 overflow-hidden">
                <img
                  src={getImg(ad.images || ad.image_url || ad.image)}
                  alt={ad.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={e => { if (!e.currentTarget.src.endsWith('placeholder-ad.svg')) e.currentTarget.src = '/placeholder-ad.svg'; }}
                />
                {ad.price && (
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
                    ${Number(ad.price).toLocaleString('es-MX')}
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-[13px] text-slate-800 line-clamp-2 leading-snug mb-1">{ad.title}</h3>
                {ad.location && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin size={10} />{ad.location}
                  </p>
                )}
              </div>
            </div>
          ))
        }
      </div>
      {viewAllUrl && (
        <div className="text-center mt-6">
          <button
            onClick={() => navigate(viewAllUrl)}
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-slate-200 hover:border-slate-400 rounded-xl font-semibold text-[14px] text-slate-700 hover:text-slate-900 transition-all">
            {viewAllLabel}
          </button>
        </div>
      )}
    </div>
  );
}
