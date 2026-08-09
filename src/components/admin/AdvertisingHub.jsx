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
  const [savingCampaignId, setSavingCampaignId] = useState('');
  const [budgetDrafts, setBudgetDrafts] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const visible = isAdmin && location.pathname.startsWith('/admin/marketing');
  const activeSection = new URLSearchParams(location.search).get('section') || 'dashboard';
  const activeSectionInfo = sections.find((item) => item.id === activeSection) || sections[0];

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No hay una sesión administrativa activa.');

    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const headers = authHeaders();
      const statusResponse = await fetch(`${API_URL}/admin/marketing/meta/status`, { headers });
      const statusPayload = await statusResponse.json();

      if (!statusResponse.ok) throw new Error(statusPayload.message || statusPayload.error || 'No se pudo comprobar Meta Ads.');

      setMetaStatus(statusPayload);

      if (!statusPayload.configured) {
        setCampaigns([]);
        setPeriod(null);
        return;
      }

      const campaignsResponse = await fetch(`${API_URL}/admin/marketing/meta/campaigns?days=7&limit=50`, { headers });
      const campaignsPayload = await campaignsResponse.json();

      if (!campaignsResponse.ok) throw new Error(campaignsPayload.message || campaignsPayload.error || 'No se pudieron cargar las campañas de Meta.');

      const data = campaignsPayload.data || [];
      setCampaigns(data);
      setPeriod(campaignsPayload.period || null);
      setBudgetDrafts(Object.fromEntries(data.map((campaign) => [campaign.id, campaign.daily_budget ?? ''])));
    } catch (requestError) {
      setError(requestError.message || 'Error al cargar Meta Ads.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (visible) loadMeta();
  }, [loadMeta, visible]);

  const mutateCampaign = async (campaignId, endpoint, payload, successMessage) => {
    setSavingCampaignId(campaignId);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`${API_URL}/admin/marketing/meta/campaigns/${campaignId}/${endpoint}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message || result.error || 'Meta rechazó la operación.');

      setNotice(successMessage);
      await loadMeta();
    } catch (requestError) {
      setError(requestError.message || 'No se pudo actualizar la campaña.');
    } finally {
      setSavingCampaignId('');
    }
  };

  const toggleCampaign = (campaign) => {
    const currentStatus = campaign.status || campaign.effective_status;
    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const action = nextStatus === 'ACTIVE' ? 'activar' : 'pausar';

    if (!window.confirm(`Confirmas ${action} la campaña “${campaign.name}”?`)) return;

    mutateCampaign(campaign.id, 'status', { status: nextStatus }, `Campaña ${nextStatus === 'ACTIVE' ? 'activada' : 'pausada'}.`);
  };

  const saveBudget = (campaign) => {
    const value = Number(budgetDrafts[campaign.id]);

    if (!Number.isFinite(value) || value < 1) {
      setError('El presupuesto diario debe ser de al menos 1 MXN.');
      return;
    }

    if (!window.confirm(`Cambiar el presupuesto diario de “${campaign.name}” a ${money(value)}?`)) return;

    mutateCampaign(campaign.id, 'budget', { daily_budget: value }, `Presupuesto actualizado a ${money(value)}.`);
  };

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
    detail: metaStatus?.configured ? `${metaStatus.ad_account_id} · ${metaStatus.graph_version}` : 'Faltan credenciales del servidor',
  };

  if (!visible) return null;

  const setSection = (section) => navigate(`/admin/marketing?section=${section}`, { replace: true });

  return (
    <div className="fixed inset-0 z-[90] overflow-x-hidden overflow-y-auto bg-slate-100 dark:bg-slate-950">
      <div className="mx-auto min-h-screen w-full max-w-[1600px] overflow-x-hidden px-3 py-4 sm:px-4 sm:py-5 md:px-7">
        <header className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-3xl bg-slate-950 px-4 py-5 text-white shadow-xl sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="break-words text-xs font-black uppercase tracking-[0.18em] text-lime-400 sm:tracking-[0.24em]">Mercasto Marketing</p>
            <h1 className="mt-1 break-words text-2xl font-black md:text-3xl">Advertising Hub</h1>
            <p className="mt-1 max-w-2xl break-words text-sm text-slate-300">Una sola consola para campañas, medición, presupuestos y automatización multiplataforma.</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button type="button" onClick={loadMeta} disabled={loading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold hover:bg-slate-800 disabled:opacity-50 sm:flex-none sm:px-4">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button type="button" onClick={() => navigate('/admin')} className="flex-1 rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold hover:bg-slate-800 sm:flex-none sm:px-4">Volver al admin</button>
          </div>
        </header>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:block lg:space-y-1">
              {sections.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" aria-pressed={activeSection === id} data-testid={`marketing-section-${id}`} onClick={() => setSection(id)} className={`flex min-w-0 w-full items-center gap-2 rounded-2xl px-3 py-3 text-left text-xs font-extrabold transition sm:text-sm ${activeSection === id ? 'bg-lime-400 text-slate-950' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}>
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 space-y-5">
            {error && <div className="break-words rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
            {notice && <div className="break-words rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-semibold text-lime-800">{notice}</div>}

            <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Spend · 7 días', money(totals.spend), period ? `${period.since} — ${period.until}` : 'Meta Ads'],
                ['Registrations', number(totals.registrations), `${number(totals.clicks)} clicks`],
                ['Impressions', number(totals.impressions), `${campaigns.length} campañas`],
                ['Purchases', number(totals.purchases), 'Meta attribution'],
              ].map(([label, value, detail]) => (
                <article key={label} className="min-w-0 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                  <p className="break-words text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="mt-2 break-words text-3xl font-black text-slate-950 dark:text-white">{loading ? '…' : value}</p>
                  <p className="mt-2 break-words text-xs text-slate-500">{detail}</p>
                </article>
              ))}
            </section>

            <section className="min-w-0 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <div className="mb-4 min-w-0">
                <h2 className="break-words text-xl font-black text-slate-950 dark:text-white">Platform connections</h2>
                <p className="break-words text-sm text-slate-500">Adapters share one internal campaign and metrics model.</p>
              </div>
              <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[metaPlatform, ...staticPlatforms].map((platform) => (
                  <article key={platform.name} className="min-w-0 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-black text-slate-900 dark:text-white">{platform.name}</h3>
                        <p className="mt-1 break-all text-xs text-slate-500">{platform.detail}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${statusClass[platform.status]}`}>{platform.status}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {(activeSection === 'dashboard' || activeSection === 'campaigns') && (
              <section className="min-w-0 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                  <h2 className="break-words text-xl font-black text-slate-950 dark:text-white">Meta campaigns</h2>
                  <p className="break-words text-sm text-slate-500">Resultados y control de campañas. Los cambios requieren confirmación.</p>
                </div>
                <div className="max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                  <table className="min-w-[980px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-950">
                      <tr>
                        <th className="px-5 py-3">Campaign</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Daily budget</th><th className="px-5 py-3">Spend</th><th className="px-5 py-3">Clicks</th><th className="px-5 py-3">CTR</th><th className="px-5 py-3">Registrations</th><th className="px-5 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {!loading && campaigns.map((campaign) => {
                        const busy = savingCampaignId === campaign.id;
                        const active = (campaign.status || campaign.effective_status) === 'ACTIVE';

                        return (
                          <tr key={campaign.id}>
                            <td className="max-w-[260px] px-5 py-4"><p className="break-words font-bold text-slate-900 dark:text-white">{campaign.name}</p><p className="break-all text-xs text-slate-500">{campaign.objective || campaign.id}</p></td>
                            <td className="whitespace-nowrap px-5 py-4 text-xs font-bold">{campaign.effective_status || campaign.status || '—'}</td>
                            <td className="px-5 py-4">
                              {campaign.daily_budget == null ? <span className="text-xs text-slate-500">Ad set budget</span> : (
                                <div className="flex min-w-[180px] items-center gap-2">
                                  <input type="number" min="1" step="1" value={budgetDrafts[campaign.id] ?? ''} onChange={(event) => setBudgetDrafts((current) => ({ ...current, [campaign.id]: event.target.value }))} className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950" />
                                  <button type="button" disabled={busy} onClick={() => saveBudget(campaign)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Guardar</button>
                                </div>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 font-semibold">{money(campaign.metrics?.spend, campaign.currency || 'MXN')}</td>
                            <td className="whitespace-nowrap px-5 py-4">{number(campaign.metrics?.clicks)}</td>
                            <td className="whitespace-nowrap px-5 py-4">{Number(campaign.metrics?.ctr || 0).toFixed(2)}%</td>
                            <td className="whitespace-nowrap px-5 py-4">{number(campaign.metrics?.registrations)}</td>
                            <td className="whitespace-nowrap px-5 py-4">
                              <button type="button" disabled={busy} onClick={() => toggleCampaign(campaign)} className={`rounded-lg px-3 py-2 text-xs font-black text-white disabled:opacity-50 ${active ? 'bg-amber-600' : 'bg-lime-700'}`}>
                                {busy ? 'Guardando…' : active ? 'Pausar' : 'Activar'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {!loading && campaigns.length === 0 && <tr><td colSpan="8" className="px-5 py-10 text-center text-slate-500">No hay campañas disponibles o Meta todavía no está configurado.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeSection !== 'dashboard' && activeSection !== 'campaigns' && (
              <section className="min-w-0 rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
                <h2 className="break-words text-xl font-black text-slate-900 dark:text-white">{activeSectionInfo.label}</h2>
                <p className="mx-auto mt-2 max-w-xl break-words text-sm text-slate-500">{activeSectionInfo.description} Este módulo se conectará al mismo modelo interno de campañas y métricas.</p>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
