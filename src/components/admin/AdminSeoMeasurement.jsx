import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, CheckCircle,
  Globe2, Loader2, RefreshCw, Search, ShieldCheck, Users,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

const number = value => Number(value || 0).toLocaleString('es-MX');
const percent = value => `${Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 1 })}%`;

function MetricCard({ icon: Icon, label, value, note }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
          {note && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{note}</p>}
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-50 text-lime-600 dark:bg-lime-950/30">
          <Icon size={21} />
        </span>
      </div>
    </div>
  );
}

function ProviderStatus({ label, provider, configured }) {
  const status = provider?.status || 'not_configured';
  const ok = status === 'ok';
  const text = ok ? 'Conectado' : status === 'error' ? 'Error temporal' : 'No configurado';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold text-slate-950 dark:text-white">{label}</p>
          <p className="mt-1 text-xs text-slate-500">
            {configured ? 'Acceso de lectura preparado' : 'Falta acceso de lectura externo'}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
          ok ? 'bg-emerald-100 text-emerald-700' : status === 'error'
            ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {text}
        </span>
      </div>
    </div>
  );
}

export default function AdminSeoMeasurement({ token }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/admin/seo-measurement?limit=12`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      setSnapshots(Array.isArray(payload.data) ? payload.data : []);
    } catch {
      setError('No se pudo cargar el reporte SEO/GEO.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const latest = snapshots[0];
  const report = latest?.report || {};
  const current = report.internal?.current || {};
  const supply = report.supply?.summary || {};
  const indexability = report.indexability || {};
  const external = report.external || {};
  const readiness = external.readiness || {};
  const nationalQualified = Boolean(report.supply?.national_qualification?.qualified);

  const periodLabel = useMemo(() => {
    if (!latest?.period_start || !latest?.period_end) return 'Sin periodo';
    return `${latest.period_start} — ${latest.period_end}`;
  }, [latest]);

  if (loading) {
    return <div className="grid min-h-[280px] place-items-center"><Loader2 className="animate-spin text-lime-500" size={32} /></div>;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="mx-auto text-red-500" size={30} />
        <p className="mt-3 font-bold text-red-800">{error}</p>
        <button onClick={load} className="btn-sm mt-4 bg-red-600 text-white">Reintentar</button>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:bg-slate-800">
        <BarChart3 className="mx-auto text-slate-400" size={34} />
        <p className="mt-3 font-bold text-slate-800 dark:text-white">Aún no hay snapshots semanales.</p>
        <p className="mt-1 text-sm text-slate-500">El scheduler genera el reporte los lunes a las 08:15.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black text-slate-950 dark:text-white">SEO / GEO semanal</h3>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              report.privacy_clear ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {report.privacy_clear ? 'Privacidad verificada' : 'Revisar privacidad'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{periodLabel} · generado {latest.generated_at || 'sin fecha'}</p>
        </div>
        <button onClick={load} className="btn-sm inline-flex items-center gap-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Globe2} label="Oferta genuine activa" value={number(supply.active_genuine)} note={`${number(supply.active_sellers)} vendedores`} />
        <MetricCard icon={ShieldCheck} label="Listos para confirmar" value={number(supply.ready_for_seller_confirmation)} note="Requieren acción del vendedor" />
        <MetricCard icon={Search} label="URLs genuine indexables" value={number(indexability.indexable_genuine_listing_urls)} note={`${number(indexability.active_catalog_references_noindex)} referencias noindex`} />
        <MetricCard icon={Activity} label="Source pages" value={number(indexability.source_pages)} note="Páginas factuales oficiales" />
        <MetricCard icon={Users} label="Usuarios nuevos" value={number(current.new_users)} note={`${number(current.verified_new_users)} verificados`} />
        <MetricCard icon={BarChart3} label="Primeros publicadores" value={number(current.first_publishers)} note={percent(current.registration_to_first_publish_percent)} />
        <MetricCard icon={Activity} label="Vistas genuine" value={number(current.genuine_listing_views)} note={`${number(current.genuine_contact_clicks)} contactos`} />
        <MetricCard icon={Search} label="Conversión contacto" value={percent(current.view_to_contact_percent)} note={`${number(current.distinct_contacted_listings)} anuncios contactados`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProviderStatus
          label="Google Search Console"
          provider={external.search_console}
          configured={readiness.search_console_configured}
        />
        <ProviderStatus
          label="GA4 Data API"
          provider={external.ga4}
          configured={readiness.ga4_data_configured}
        />
      </div>

      <div className={`rounded-3xl border p-6 ${
        nationalQualified
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-amber-200 bg-amber-50'
      }`}>
        <div className="flex items-start gap-3">
          {nationalQualified
            ? <CheckCircle className="mt-0.5 text-emerald-600" size={22} />
            : <AlertTriangle className="mt-0.5 text-amber-600" size={22} />}
          <div>
            <p className={`font-black ${nationalQualified ? 'text-emerald-900' : 'text-amber-900'}`}>
              {nationalQualified ? 'Umbral nacional alcanzado' : 'GEO local permanece bloqueado'}
            </p>
            <p className={`mt-1 text-sm ${nationalQualified ? 'text-emerald-800' : 'text-amber-800'}`}>
              {nationalQualified
                ? 'Aún se requieren dos snapshots semanales consecutivos antes de habilitar rutas.'
                : 'No se abrirán páginas de estado o ciudad hasta cumplir oferta genuine, diversidad, ubicación y dos semanas consecutivas.'}
            </p>
            <p className="mt-2 text-xs font-bold text-slate-600">
              Rutas location abiertas: {number(indexability.location_routes_open)} · categorías calificadas: {number(report.supply?.qualified_categories)} · estado/categoría: {number(report.supply?.qualified_state_categories)} · ciudad/categoría: {number(report.supply?.qualified_city_categories)}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h4 className="font-black text-slate-950 dark:text-white">Historial de snapshots</h4>
          <p className="mt-1 text-xs text-slate-500">Hasta 12 periodos, solo datos agregados.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-900/30">
              <tr>
                <th className="px-5 py-3">Periodo</th>
                <th className="px-5 py-3">Genuine activos</th>
                <th className="px-5 py-3">Usuarios</th>
                <th className="px-5 py-3">Primeras publicaciones</th>
                <th className="px-5 py-3">Indexables</th>
                <th className="px-5 py-3">External</th>
                <th className="px-5 py-3">Privacidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {snapshots.map(snapshot => {
                const row = snapshot.report || {};
                return (
                  <tr key={`${snapshot.period_start}-${snapshot.period_end}`} className="text-slate-700 dark:text-slate-300">
                    <td className="px-5 py-3 font-semibold">{snapshot.period_start} — {snapshot.period_end}</td>
                    <td className="px-5 py-3">{number(row.supply?.summary?.active_genuine)}</td>
                    <td className="px-5 py-3">{number(row.internal?.current?.new_users)}</td>
                    <td className="px-5 py-3">{number(row.internal?.current?.first_publishers)}</td>
                    <td className="px-5 py-3">{number(row.indexability?.indexable_genuine_listing_urls)}</td>
                    <td className="px-5 py-3">{snapshot.external_complete ? 'Completo' : 'Parcial'}</td>
                    <td className="px-5 py-3">{row.privacy_clear ? 'OK' : 'Revisar'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
