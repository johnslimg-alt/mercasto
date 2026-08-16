import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUI } from '../../contexts/UIContext';
import { getTranslations } from '../../utils/translations';
import { formatDate, formatNumber, localeFor } from '../../utils/localeFormat';
import { getAdminOperationalCopy } from '../../utils/adminOperationalCopy';
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

const sectionDefs = [
  { id: 'dashboard', icon: BarChart3 },
  { id: 'connections', icon: PlugZap },
  { id: 'campaigns', icon: Megaphone },
  { id: 'creatives', icon: Image },
  { id: 'audiences', icon: Users },
  { id: 'tracking', icon: RadioTower },
  { id: 'budgets', icon: CircleDollarSign },
  { id: 'tests', icon: FlaskConical },
  { id: 'automations', icon: Settings2 },
  { id: 'ai', icon: Bot },
];

const staticPlatformDefs = [
  { name: 'TikTok Ads', status: 'attention', detailIndex: 0 },
  { name: 'Google Ads', status: 'planned', detailIndex: 1 },
  { name: 'Merchant Center', status: 'planned', detailIndex: 2 },
  { name: 'GA4 + GTM', status: 'planned', detailIndex: 3 },
  { name: 'X Ads', status: 'planned', detailIndex: 4 },
  { name: 'Microsoft Ads', status: 'planned', detailIndex: 5 },
];

const statusClass = {
  ready: 'bg-lime-100 text-lime-800',
  attention: 'bg-amber-100 text-amber-800',
  planned: 'bg-slate-100 text-slate-600',
};

export default function AdvertisingHub() {
  const { lang, loadedLangVersion } = useUI();
  void loadedLangVersion;
  const t = getTranslations(lang);
  const copy = getAdminOperationalCopy(lang).marketing;
  const sections = useMemo(() => sectionDefs.map((item) => ({ ...item, ...copy.sections[item.id] })), [copy]);
  const staticPlatforms = useMemo(() => staticPlatformDefs.map((item) => ({ ...item, detail: copy.platformDetails[item.detailIndex] })), [copy]);
  const money = (value, currency = 'MXN') => new Intl.NumberFormat(localeFor(lang), { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
  const number = (value) => formatNumber(value, lang);
  const serverMessage = useCallback((payload, fallback) => (lang === 'es' && (payload?.message || payload?.error) ? (payload.message || payload.error) : fallback), [lang]);
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
    if (!token) throw new Error(copy.authMissing);

    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, [copy.authMissing]);

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const headers = authHeaders();
      const statusResponse = await fetch(`${API_URL}/admin/marketing/meta/status`, { headers });
      const statusPayload = await statusResponse.json();

      if (!statusResponse.ok) throw new Error(serverMessage(statusPayload, copy.metaStatusError));

      setMetaStatus(statusPayload);

      if (!statusPayload.configured) {
        setCampaigns([]);
        setPeriod(null);
        return;
      }

      const campaignsResponse = await fetch(`${API_URL}/admin/marketing/meta/campaigns?days=7&limit=50`, { headers });
      const campaignsPayload = await campaignsResponse.json();

      if (!campaignsResponse.ok) throw new Error(serverMessage(campaignsPayload, copy.campaignsLoadError));

      const data = campaignsPayload.data || [];
      setCampaigns(data);
      setPeriod(campaignsPayload.period || null);
      setBudgetDrafts(Object.fromEntries(data.map((campaign) => [campaign.id, campaign.daily_budget ?? ''])));
    } catch (requestError) {
      setError(requestError.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, copy.campaignsLoadError, copy.loadError, copy.metaStatusError, serverMessage]);

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

      if (!response.ok) throw new Error(serverMessage(result, copy.metaRejected));

      setNotice(successMessage);
      await loadMeta();
    } catch (requestError) {
      setError(requestError.message || copy.updateError);
    } finally {
      setSavingCampaignId('');
    }
  };

  const toggleCampaign = (campaign) => {
    const currentStatus = campaign.status || campaign.effective_status;
    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const action = nextStatus === 'ACTIVE' ? copy.activateVerb : copy.pauseVerb;

    if (!window.confirm(copy.confirmToggle.replace('{action}', action).replace('{name}', campaign.name))) return;

    mutateCampaign(campaign.id, 'status', { status: nextStatus }, nextStatus === 'ACTIVE' ? copy.activated : copy.paused);
  };

  const saveBudget = (campaign) => {
    const value = Number(budgetDrafts[campaign.id]);

    if (!Number.isFinite(value) || value < 1) {
      setError(copy.budgetMin);
      return;
    }

    if (!window.confirm(copy.confirmBudget.replace('{name}', campaign.name).replace('{amount}', money(value)))) return;

    mutateCampaign(campaign.id, 'budget', { daily_budget: value }, copy.budgetUpdated.replace('{amount}', money(value)));
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
    detail: metaStatus?.configured ? `${metaStatus.ad_account_id} · ${metaStatus.graph_version}` : copy.missingCredentials,
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
            <p className="mt-1 max-w-2xl break-words text-sm text-slate-300">{copy.headerDesc}</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button type="button" onClick={loadMeta} disabled={loading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold hover:bg-slate-800 disabled:opacity-50 sm:flex-none sm:px-4">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t.refresh_btn}
            </button>
            <button type="button" onClick={() => navigate('/admin')} className="flex-1 rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold hover:bg-slate-800 sm:flex-none sm:px-4">{copy.backAdmin}</button>
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

          <section className="min-w-0 space-y-5">
            {error && <div className="break-words rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
            {notice && <div className="break-words rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-semibold text-lime-800">{notice}</div>}

            <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [copy.spend7, money(totals.spend), period ? `${formatDate(period.since, lang)} — ${formatDate(period.until, lang)}` : 'Meta Ads'],
                [copy.registrations, number(totals.registrations), `${number(totals.clicks)} ${t.clicks}`],
                [t.impressions, number(totals.impressions), `${campaigns.length} ${copy.campaigns}`],
                [copy.purchases, number(totals.purchases), copy.metaAttribution],
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
                <h2 className="break-words text-xl font-black text-slate-950 dark:text-white">{copy.connectionsTitle}</h2>
                <p className="break-words text-sm text-slate-500">{copy.adaptersDesc}</p>
              </div>
              <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[metaPlatform, ...staticPlatforms].map((platform) => (
                  <article key={platform.name} className="min-w-0 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-black text-slate-900 dark:text-white">{platform.name}</h3>
                        <p className="mt-1 break-all text-xs text-slate-500">{platform.detail}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${statusClass[platform.status]}`}>{copy[platform.status] || platform.status}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {(activeSection === 'dashboard' || activeSection === 'campaigns') && (
              <section className="min-w-0 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                  <h2 className="break-words text-xl font-black text-slate-950 dark:text-white">{copy.campaignsTitle}</h2>
                  <p className="break-words text-sm text-slate-500">{copy.campaignsDesc}</p>
                </div>
                <div className="max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                  <table className="min-w-[980px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-950">
                      <tr>
                        <th className="px-5 py-3">{copy.campaign}</th><th className="px-5 py-3">{t.status}</th><th className="px-5 py-3">{copy.dailyBudget}</th><th className="px-5 py-3">{copy.spend}</th><th className="px-5 py-3">{t.clicks}</th><th className="px-5 py-3">CTR</th><th className="px-5 py-3">{copy.registrations}</th><th className="px-5 py-3">{copy.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {!loading && campaigns.map((campaign) => {
                        const busy = savingCampaignId === campaign.id;
                        const active = (campaign.status || campaign.effective_status) === 'ACTIVE';

                        return (
                          <tr key={campaign.id}>
                            <td className="max-w-[260px] px-5 py-4"><p className="break-words font-bold text-slate-900 dark:text-white">{campaign.name}</p><p className="break-all text-xs text-slate-500">{campaign.objective || campaign.id}</p></td>
                            <td className="whitespace-nowrap px-5 py-4 text-xs font-bold">{(campaign.effective_status || campaign.status) === 'ACTIVE' ? t.active_status : (campaign.effective_status || campaign.status) === 'PAUSED' ? t.paused_status : (campaign.effective_status || campaign.status || '—')}</td>
                            <td className="px-5 py-4">
                              {campaign.daily_budget == null ? <span className="text-xs text-slate-500">{copy.adSetBudget}</span> : (
                                <div className="flex min-w-[180px] items-center gap-2">
                                  <input type="number" aria-label={`${copy.dailyBudget}: ${campaign.name}`} min="1" step="1" value={budgetDrafts[campaign.id] ?? ''} onChange={(event) => setBudgetDrafts((current) => ({ ...current, [campaign.id]: event.target.value }))} className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950" />
                                  <button type="button" disabled={busy} onClick={() => saveBudget(campaign)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{t.save_changes}</button>
                                </div>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 font-semibold">{money(campaign.metrics?.spend, campaign.currency || 'MXN')}</td>
                            <td className="whitespace-nowrap px-5 py-4">{number(campaign.metrics?.clicks)}</td>
                            <td className="whitespace-nowrap px-5 py-4">{formatNumber(campaign.metrics?.ctr || 0, lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
                            <td className="whitespace-nowrap px-5 py-4">{number(campaign.metrics?.registrations)}</td>
                            <td className="whitespace-nowrap px-5 py-4">
                              <button type="button" disabled={busy} onClick={() => toggleCampaign(campaign)} className={`rounded-lg px-3 py-2 text-xs font-black text-white disabled:opacity-50 ${active ? 'bg-amber-600' : 'bg-lime-700'}`}>
                                {busy ? t.saving_word : active ? t.pause : t.activate}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {!loading && campaigns.length === 0 && <tr><td colSpan="8" className="px-5 py-10 text-center text-slate-500">{copy.noCampaigns}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeSection !== 'dashboard' && activeSection !== 'campaigns' && (
              <section className="min-w-0 rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
                <h2 className="break-words text-xl font-black text-slate-900 dark:text-white">{activeSectionInfo.label}</h2>
                <p className="mx-auto mt-2 max-w-xl break-words text-sm text-slate-500">{activeSectionInfo.description} {copy.moduleSuffix}</p>
              </section>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
