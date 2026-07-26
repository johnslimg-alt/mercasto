import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  CircleDollarSign,
  FlaskConical,
  Image,
  Megaphone,
  PlugZap,
  RadioTower,
  RefreshCw,
  Settings2,
  Users,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

const readAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin';
  } catch {
    return false;
  }
};

const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'Resultados de todas las plataformas.' },
  { id: 'connections', label: 'Connections', icon: PlugZap, description: 'Meta, TikTok, Google, X y Microsoft.' },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone, description: 'Campañas, conjuntos y anuncios.' },
  { id: 'creatives', label: 'Creatives', icon: Image, description: 'Imágenes, videos, textos y variantes.' },
  { id: 'audiences', label: 'Audiences', icon: Users, description: 'Segmentos y públicos sincronizados.' },
  { id: 'tracking', label: 'Pixels', icon: RadioTower, description: 'Píxeles, CAPI, eventos y UTM.' },
  { id: 'budgets', label: 'Budgets', icon: CircleDollarSign, description: 'Presupuestos y reglas de distribución.' },
  { id: 'tests', label: 'A/B Tests', icon: FlaskConical, description: 'Pruebas entre creativos y audiencias.' },
  { id: 'automations', label: 'Automations', icon: Settings2, description: 'Pausas, escalado y alertas automáticas.' },
  { id: 'ai', label: 'AI Analyst', icon: Bot, description: 'Análisis diario y recomendaciones.' },
];

const staticPlatforms = [
  { name: 'TikTok Ads', status: 'attention', detail: 'Reconnect advertiser account' },
  { name: 'Google Ads', status: 'planned', detail: 'API adapter planned' },
  { name: 'Merchant Center', status: 'planned', detail: 'Product feed planned' },
  { name: 'GA4 + GTM', status: 'planned', detail: 'Measurement adapter planned' },
  { name: 'X Ads', status: 'planned', detail: 'API access required' },
  { name: 'Microsoft Ads', status: 'planned', detail: 'API adapter planned' },
];

const statusClass = {
  ready: 'bg-lime-100 text-lime-800',
  attention: 'bg-amber-100 text-amber-800',
  planned: 'bg-slate-100 text-slate-600',
};

const money = (value, currency = 'MXN') => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const number = (value) => new Intl.NumberFormat('es-MX').format(Number(value || 0));

export default function AdvertisingHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin] = useState(readAdmin);
  const [metaStatus, setMetaStatus] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [period, setPeriod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const visible = isAdmin && location.pathname.startsWith('/admin/marketing');
  const activeSection = new URLSearchParams(location.search).get('section') || 'dashboard';
  const activeSectionInfo = sections.find((item) => item.id === activeSection) || sections[0];

  const loadMeta = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setError('No hay una sesión administrativa activa.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` };
      const statusResponse = await fetch(`${API_URL}/admin/marketing/meta/status`, { headers });
      const statusPayload = await statusResponse.json();

      if (!statusResponse.ok) {
        throw new Error(statusPayload.message || statusPayload.error || 'No se pudo comprobar Meta Ads.');
      }

      setMetaStatus(statusPayload);

      if (!statusPayload.configured) {
        setCampaigns([]);
        setPeriod(null);
        return;
      }

      const campaignsResponse = await fetch(`${API_URL}/admin/marketing/meta/campaigns?days=7&limit=50`, { headers });
      const campaignsPayload = await campaignsResponse.json();

      if (!campaignsResponse.ok) {
        throw new Error(campaignsPayload.message || campaignsPayload.error || 'No se pudieron cargar las campañas de Meta.');
      }

      setCampaigns(campaignsPayload.data || []);
      setPeriod(campaignsPayload.period || null);
    } catch (requestError) {
      setError(requestError.message || 'Error al cargar Meta Ads.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) loadMeta();
  }, [loadMeta, visible]);

  const totals = useMemo(() => campaigns.reduce((accumulator, campaign) => {
    const metrics = campaign.metrics || {};
    accumulator.spend += Number(metrics.spend || 0);
    accumulator.impressions += Number(metrics.impressions || 0);
    accumulator.clicks += Number(metrics.clicks || 0);
    accumulator.registrations += Number(metrics.registrations || 0);
    accumulator.purchases += Number(metrics.purchases || 0);
    return accumulator;
  }, { spend: 0, impressions: 0, clicks: 0, registrations: 0, purchases: 0 }), [campaigns]);

  const metaPlatform = {
    name: 'Meta Ads',
    status: metaStatus?.configured ? 'ready' : 'attention',
    detail: metaStatus?.configured
      ? `${metaStatus.ad_account_id} · ${metaStatus.graph_version}`
      : 'Faltan credenciales del servidor',
  };

  if (!visible) return null;

  const setSection = (section) => navigate(`/admin/marketing?section=${section}`, { replace: true });

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-100 dark:bg-slate-950">
      <div className="mx-auto min-h-screen max-w-[1600px] px-4 py-5 md:px-7">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-slate-950 px-5 py-5 text-white shadow-xl">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-lime-400">Mercasto Marketing</p>
            <h1 className="mt-1 text-2xl font-black md:text-3xl">Advertising Hub</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">Una sola consola para campañas, medición, presupuestos y automatización multiplataforma.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={loadMeta} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold hover:bg-slate-800 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button type="button" onClick={() => navigate('/admin')} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold hover:bg-slate-800">Volver al admin</button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[270px_1fr]">
          <aside className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <nav className="space-y-1">
              {sections.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setSection(id)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-extrabold transition ${activeSection === id ? 'bg-lime-400 text-slate-950' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}>
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="space-y-5">
            {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Spend · 7 días', money(totals.spend), period ? `${period.since} — ${period.until}` : 'Meta Ads'],
                ['Registrations', number(totals.registrations), `${number(totals.clicks)} clicks`],
                ['Impressions', number(totals.impressions), `${campaigns.length} campañas`],
                ['Purchases', number(totals.purchases), 'Meta attribution'],
              ].map(([label, value, detail]) => (
                <article key={label} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{loading ? '…' : value}</p>
                  <p className="mt-2 text-xs text-slate-500">{detail}</p>
                </article>
              ))}
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-950 dark:text-white">Platform connections</h2>
                <p className="text-sm text-slate-500">Adapters share one internal campaign and metrics model.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[metaPlatform, ...staticPlatforms].map((platform) => (
                  <article key={platform.name} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white">{platform.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">{platform.detail}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${statusClass[platform.status]}`}>{platform.status}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {(activeSection === 'dashboard' || activeSection === 'campaigns') && (
              <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                  <h2 className="text-xl font-black text-slate-950 dark:text-white">Meta campaigns</h2>
                  <p className="text-sm text-slate-500">Resultados normalizados de los últimos 7 días.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-950">
                      <tr>
                        <th className="px-5 py-3">Campaign</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Spend</th><th className="px-5 py-3">Clicks</th><th className="px-5 py-3">CTR</th><th className="px-5 py-3">CPC</th><th className="px-5 py-3">Registrations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {!loading && campaigns.map((campaign) => (
                        <tr key={campaign.id}>
                          <td className="px-5 py-4"><p className="font-bold text-slate-900 dark:text-white">{campaign.name}</p><p className="text-xs text-slate-500">{campaign.objective || campaign.id}</p></td>
                          <td className="px-5 py-4 text-xs font-bold">{campaign.effective_status || campaign.status || '—'}</td>
                          <td className="px-5 py-4 font-semibold">{money(campaign.metrics?.spend, campaign.currency || 'MXN')}</td>
                          <td className="px-5 py-4">{number(campaign.metrics?.clicks)}</td>
                          <td className="px-5 py-4">{Number(campaign.metrics?.ctr || 0).toFixed(2)}%</td>
                          <td className="px-5 py-4">{money(campaign.metrics?.cpc, campaign.currency || 'MXN')}</td>
                          <td className="px-5 py-4">{number(campaign.metrics?.registrations)}</td>
                        </tr>
                      ))}
                      {!loading && campaigns.length === 0 && <tr><td colSpan="7" className="px-5 py-10 text-center text-slate-500">No hay campañas disponibles o Meta todavía no está configurado.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeSection !== 'dashboard' && activeSection !== 'campaigns' && (
              <section className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">{activeSectionInfo.label}</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{activeSectionInfo.description} Este módulo se conectará al mismo modelo interno de campañas y métricas.</p>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
