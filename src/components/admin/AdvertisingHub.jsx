import React, { useMemo } from 'react';
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
  Settings2,
  Users,
} from 'lucide-react';

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

const platforms = [
  { name: 'Meta Ads', status: 'ready', detail: 'Facebook + Instagram' },
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

export default function AdvertisingHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = useMemo(readAdmin, [location.pathname]);
  const visible = isAdmin && location.pathname.startsWith('/admin/marketing');
  const activeSection = new URLSearchParams(location.search).get('section') || 'dashboard';

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
          <button type="button" onClick={() => navigate('/admin')} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold hover:bg-slate-800">Volver al admin</button>
        </header>

        <div className="grid gap-5 lg:grid-cols-[270px_1fr]">
          <aside className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <nav className="space-y-1">
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-extrabold transition ${activeSection === id ? 'bg-lime-400 text-slate-950' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="space-y-5">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Spend today', '—', 'Awaiting unified metrics'],
                ['Registrations', '—', 'Meta + TikTok attribution'],
                ['Published ads', '—', 'PostAd conversion'],
                ['ROAS', '—', 'Purchases and paid renewals'],
              ].map(([label, value, detail]) => (
                <article key={label} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
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
                {platforms.map((platform) => (
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

            <section className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{sections.find((item) => item.id === activeSection)?.label || 'Dashboard'}</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{sections.find((item) => item.id === activeSection)?.description}. This foundation is ready for API-backed modules without coupling platform-specific logic to the interface.</p>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
