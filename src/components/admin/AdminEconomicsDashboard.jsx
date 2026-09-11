import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, BadgeDollarSign, BarChart3, Info, Loader2, Megaphone, Package, RefreshCw, Users,
} from 'lucide-react';
import { formatMXN, formatNumber } from '../../utils/localeFormat';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

const COPY = Object.freeze({
  es: {
    title: 'Economía del vendedor',
    subtitle: 'Activación, conversión y ingreso calculados solo sobre inventario real.',
    refresh: 'Actualizar',
    loadError: 'No se pudo cargar la economía del vendedor.',
    inventory: 'Inventario real',
    realListings: 'Anuncios reales',
    sellersWithListing: 'Vendedores con anuncio',
    addressableUsers: 'Usuarios (sin admin)',
    funnel: 'Embudo',
    sellerActivation: 'Activación de vendedor',
    listingPublication: 'Publicación por registro',
    listingToContact: 'Anuncio → primer contacto',
    freeToPaid: 'Gratis → pago',
    medianFirstResponse: 'Primera respuesta (mediana)',
    minutes: 'min',
    revenue: 'Ingreso',
    paidAmount: 'Cobrado total',
    payingUsers: 'Usuarios que pagaron',
    arppu: 'ARPPU',
    promotion: 'Promoción',
    promotionPayments: 'Pagos de promoción',
    promotionRevenue: 'Ingreso por promoción',
    promotionAttach: 'Tasa de adjunción',
    unavailableTitle: 'Métricas que todavía no se pueden calcular',
    noData: 'Sin datos suficientes',
  },
  en: {
    title: 'Seller economics',
    subtitle: 'Activation, conversion and revenue computed over real inventory only.',
    refresh: 'Refresh',
    loadError: 'Could not load seller economics.',
    inventory: 'Real inventory',
    realListings: 'Real listings',
    sellersWithListing: 'Sellers with a listing',
    addressableUsers: 'Users (excluding admins)',
    funnel: 'Funnel',
    sellerActivation: 'Seller activation',
    listingPublication: 'Publication per registration',
    listingToContact: 'Listing → first contact',
    freeToPaid: 'Free → paid',
    medianFirstResponse: 'First response (median)',
    minutes: 'min',
    revenue: 'Revenue',
    paidAmount: 'Collected total',
    payingUsers: 'Paying users',
    arppu: 'ARPPU',
    promotion: 'Promotion',
    promotionPayments: 'Promotion payments',
    promotionRevenue: 'Promotion revenue',
    promotionAttach: 'Attach rate',
    unavailableTitle: 'Metrics that cannot be computed yet',
    noData: 'Not enough data',
  },
  ru: {
    title: 'Экономика продавца',
    subtitle: 'Активация, конверсия и выручка — только по реальному инвентарю.',
    refresh: 'Обновить',
    loadError: 'Не удалось загрузить экономику продавца.',
    inventory: 'Реальный инвентарь',
    realListings: 'Реальных объявлений',
    sellersWithListing: 'Продавцов с объявлением',
    addressableUsers: 'Пользователей (без админов)',
    funnel: 'Воронка',
    sellerActivation: 'Активация продавца',
    listingPublication: 'Публикаций на регистрацию',
    listingToContact: 'Объявление → первый контакт',
    freeToPaid: 'Бесплатно → оплата',
    medianFirstResponse: 'Первый ответ (медиана)',
    minutes: 'мин',
    revenue: 'Выручка',
    paidAmount: 'Собрано всего',
    payingUsers: 'Платящих пользователей',
    arppu: 'ARPPU',
    promotion: 'Промо',
    promotionPayments: 'Платежей за промо',
    promotionRevenue: 'Выручка от промо',
    promotionAttach: 'Доля с промо',
    unavailableTitle: 'Метрики, которые пока нельзя посчитать',
    noData: 'Недостаточно данных',
  },
});

function copyFor(lang) {
  return COPY[lang] || COPY.es;
}

function MetricCard({ icon: Icon, label, value, note }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
          {note && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{note}</p>}
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lime-50 text-lime-600 dark:bg-lime-950/30">
          <Icon size={19} />
        </span>
      </div>
    </div>
  );
}

export default function AdminEconomicsDashboard({ token, lang = 'es' }) {
  const copy = copyFor(lang);
  const [economics, setEconomics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch(`${API_URL}/admin/analytics?period=30`, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('auth_token') || ''}` },
      });
      if (!response.ok) {
        throw new Error(`admin-economics-load-failed:${response.status}`);
      }
      const payload = await response.json();
      setEconomics(payload.economics || null);
    } catch (error) {
      console.error('Error fetching seller economics', error);
      setLoadError(true);
      setEconomics(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const percent = value => (value === null || value === undefined
    ? copy.noData
    : `${formatNumber(value * 100, lang, { maximumFractionDigits: 1 })}%`);
  const numberOrDash = value => (value === null || value === undefined ? '—' : formatNumber(value, lang));
  const minutes = value => (value === null || value === undefined
    ? copy.noData
    : `${formatNumber(value, lang, { maximumFractionDigits: 1 })} ${copy.minutes}`);

  if (loading && !economics) {
    return (
      <div data-testid="admin-economics-loading" role="status" className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 p-6 text-[13px] font-semibold text-slate-500 dark:border-slate-700">
        <Loader2 size={18} className="animate-spin" />
        {copy.title}…
      </div>
    );
  }

  if (loadError || !economics) {
    return (
      <div data-testid="admin-economics-error" role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-[13px] text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
        <span className="flex items-center gap-2 font-semibold">
          <AlertTriangle size={16} />
          {copy.loadError}
        </span>
        <button
          type="button"
          onClick={load}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 font-bold text-amber-900 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200"
        >
          <RefreshCw size={16} />
          {copy.refresh}
        </button>
      </div>
    );
  }

  const inventory = economics.inventory || {};
  const funnel = economics.funnel || {};
  const revenue = economics.revenue || {};
  const promotion = economics.promotion || {};
  const unavailable = economics.unavailable || {};

  return (
    <section className="space-y-4" data-testid="admin-economics-dashboard">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[16px] font-bold text-slate-900 dark:text-white">
            <BarChart3 size={18} className="text-lime-600" />
            {copy.title}
          </h3>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
        </div>
        <button
          type="button"
          data-testid="admin-economics-refresh"
          onClick={load}
          disabled={loading}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          <span className="hidden sm:inline">{copy.refresh}</span>
        </button>
      </header>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{copy.inventory}</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            icon={Package}
            label={copy.realListings}
            value={numberOrDash(inventory.real_listings_total)}
            note={inventory.note}
          />
          <MetricCard
            icon={Users}
            label={copy.sellersWithListing}
            value={numberOrDash(inventory.sellers_with_listing_total)}
          />
          <MetricCard
            icon={Users}
            label={copy.addressableUsers}
            value={numberOrDash(inventory.addressable_users)}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{copy.funnel}</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard icon={Users} label={copy.sellerActivation} value={percent(funnel.seller_activation_rate)} />
          <MetricCard icon={Package} label={copy.listingPublication} value={percent(funnel.listing_publication_rate)} />
          <MetricCard icon={BadgeDollarSign} label={copy.listingToContact} value={percent(funnel.listing_to_first_contact_rate)} />
          <MetricCard icon={BadgeDollarSign} label={copy.freeToPaid} value={percent(funnel.free_to_paid_rate)} />
          <MetricCard icon={BarChart3} label={copy.medianFirstResponse} value={minutes(funnel.median_first_response_minutes)} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={BadgeDollarSign}
          label={copy.paidAmount}
          value={formatMXN(revenue.paid_amount_total || 0, lang)}
          note={economics.currency || 'MXN'}
        />
        <MetricCard icon={Users} label={copy.payingUsers} value={numberOrDash(revenue.paying_users)} />
        <MetricCard
          icon={BadgeDollarSign}
          label={copy.arppu}
          value={revenue.arppu == null ? copy.noData : formatMXN(revenue.arppu, lang)}
        />
        <MetricCard icon={Megaphone} label={copy.promotionPayments} value={numberOrDash(promotion.promotion_payments)} />
        <MetricCard
          icon={Megaphone}
          label={copy.promotionRevenue}
          value={formatMXN(promotion.promotion_revenue_total || 0, lang)}
        />
        <MetricCard icon={Megaphone} label={copy.promotionAttach} value={percent(promotion.promotion_attach_rate)} />
      </div>

      {Object.keys(unavailable).length > 0 && (
        <div
          data-testid="admin-economics-unavailable"
          className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40"
        >
          <p className="flex items-center gap-2 text-[13px] font-bold text-slate-700 dark:text-slate-200">
            <Info size={15} className="text-slate-400" />
            {copy.unavailableTitle}
          </p>
          <ul className="mt-2 space-y-1 text-[12px] text-slate-500 dark:text-slate-400">
            {Object.entries(unavailable).map(([key, reason]) => (
              <li key={key} data-testid={`admin-economics-unavailable-${key}`}>
                <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">{key}</span>
                {' — '}
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
