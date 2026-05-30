import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Eye, Heart, MessageCircle, CreditCard, BarChart3, ArrowUp, ArrowDown, Minus, Loader2 } from 'lucide-react';

const API = (window.VITE_API_URL || import.meta.env?.VITE_API_URL || 'https://mercasto.com/api');

function SparkBar({ data }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.views), 1);
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {data.map((d, i) => {
        const pct = maxVal > 0 ? (d.views / maxVal) * 100 : 0;
        const date = new Date(d.date + 'T12:00:00');
        const label = days[date.getDay()];
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {d.views} vistas
            </div>
            <div className="w-full flex items-end" style={{ height: '96px' }}>
              <div
                className="w-full rounded-t-md bg-[#84CC16] transition-all duration-300"
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-2 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-[22px] font-bold text-slate-900 leading-none">{value}</div>
      <div className="text-[12px] text-slate-500 font-medium">{label}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

function WkTrend({ thisWeek, lastWeek }) {
  if (lastWeek === 0 && thisWeek === 0) return null;
  if (lastWeek === 0) return <span className="flex items-center gap-0.5 text-[11px] text-emerald-600 font-semibold"><ArrowUp className="w-3 h-3"/>Nuevo</span>;
  const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  if (pct > 0)  return <span className="flex items-center gap-0.5 text-[11px] text-emerald-600 font-semibold"><ArrowUp className="w-3 h-3"/>+{pct}% vs semana pasada</span>;
  if (pct < 0)  return <span className="flex items-center gap-0.5 text-[11px] text-red-500 font-semibold"><ArrowDown className="w-3 h-3"/>{pct}% vs semana pasada</span>;
  return <span className="flex items-center gap-0.5 text-[11px] text-slate-400 font-semibold"><Minus className="w-3 h-3"/>Sin cambio</span>;
}

const STATUS_LABEL = { active: 'Activo', inactive: 'Inactivo', pending: 'Pendiente', rejected: 'Rechazado', expired: 'Expirado', paused: 'Pausado' };
const STATUS_COLOR = { active: 'bg-lime-100 text-lime-700', inactive: 'bg-slate-100 text-slate-500', pending: 'bg-yellow-100 text-yellow-700', rejected: 'bg-red-100 text-red-600', expired: 'bg-slate-100 text-slate-400', paused: 'bg-orange-100 text-orange-600' };

export default function SellerStatsScreen({ token }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/seller/stats`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      if (!res.ok) throw new Error('Error al cargar estadísticas');
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-7 h-7 animate-spin text-[#84CC16]" />
    </div>
  );

  if (error) return (
    <div className="text-center py-16 text-slate-500">
      <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <p className="font-medium">{error}</p>
      <button onClick={load} className="mt-4 text-sm text-[#65A30D] underline">Reintentar</button>
    </div>
  );

  const fmt = n => typeof n === 'number' ? n.toLocaleString('es-MX') : '—';
  const fmtPrice = n => n != null ? `$${Number(n).toLocaleString('es-MX')}` : '—';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-bold text-slate-900">Estadísticas</h2>
        <p className="text-[13px] text-slate-500 mt-0.5">Rendimiento de tus anuncios en los últimos 7 días</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Eye}           label="Total Vistas"     value={fmt(data.total_views)}     color="bg-blue-500"
          sub={<WkTrend thisWeek={data.views_this_week} lastWeek={data.views_last_week}/>} />
        <KpiCard icon={TrendingUp}    label="Esta Semana"      value={fmt(data.views_this_week)}  color="bg-[#84CC16]" />
        <KpiCard icon={Heart}         label="Favoritos"        value={fmt(data.total_favorites)}  color="bg-rose-500" />
        <KpiCard icon={MessageCircle} label="Mensajes"         value={fmt(data.total_messages)}   color="bg-violet-500" />
      </div>

      {/* Credits + ads summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="text-[12px] text-slate-500 font-medium mb-1">Anuncios Activos</div>
          <div className="text-[20px] font-bold text-slate-900">{data.active_ads}<span className="text-slate-400 text-[14px] font-normal"> / {data.total_ads}</span></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="text-[12px] text-slate-500 font-medium mb-1 flex items-center gap-1"><CreditCard className="w-3.5 h-3.5"/>Créditos</div>
          <div className="text-[20px] font-bold text-slate-900">{fmt(data.credits_balance)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm col-span-2 md:col-span-1">
          <div className="text-[12px] text-slate-500 font-medium mb-1">Semana pasada</div>
          <div className="text-[20px] font-bold text-slate-900">{fmt(data.views_last_week)} <span className="text-[13px] text-slate-400 font-normal">vistas</span></div>
        </div>
      </div>

      {/* 7-day chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-[14px] font-semibold text-slate-800 mb-4">Vistas — últimos 7 días</h3>
        <SparkBar data={data.views_by_day} />
      </div>

      {/* Top ads table */}
      {data.top_ads && data.top_ads.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-[14px] font-semibold text-slate-800">Top Anuncios</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                  <th className="text-left px-5 py-2.5 font-semibold">Título</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Vistas</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Favs</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Precio</th>
                  <th className="text-right px-5 py-2.5 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.top_ads.map(ad => (
                  <tr key={ad.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-800 font-medium max-w-[180px] truncate">{ad.title}</td>
                    <td className="px-4 py-3 text-right text-slate-700 font-semibold">{fmt(ad.views)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{fmt(ad.favorites)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmtPrice(ad.price)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[ad.status] || 'bg-slate-100 text-slate-500'}`}>
                        {STATUS_LABEL[ad.status] || ad.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
