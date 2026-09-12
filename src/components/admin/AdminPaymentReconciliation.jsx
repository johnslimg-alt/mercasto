import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BadgeCheck, CreditCard, Loader2, Receipt, RefreshCw, Search, ShieldAlert, Wallet,
} from 'lucide-react';
import { formatDate, formatDateTime, formatMXN, formatNumber } from '../../utils/localeFormat';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

const COPY = Object.freeze({
  es: {
    title: 'Conciliación de pagos',
    subtitle: 'Cada intento de pago con su referencia de Clip, el evento que lo cerró y el anuncio que pagó.',
    refresh: 'Actualizar',
    loadError: 'No se pudo cargar la conciliación de pagos.',
    empty: 'No hay pagos que coincidan con el filtro.',
    records: 'Registros',
    paidAmount: 'Cobrado',
    verifiedCash: 'Verificado',
    claimedUnverified: 'Sin verificar',
    internalBalance: 'Saldo interno',
    unmatchedListings: 'Sin anuncio asociado',
    refunds: 'Reembolsos',
    refundsNotTracked: 'Sin registro: Clip todavía no persiste reembolsos.',
    refundsTracked: 'Registrados',
    filterStatus: 'Estado',
    filterAll: 'Todos',
    payment: 'Pago',
    amount: 'Monto',
    clipReference: 'Referencia Clip',
    references: 'Referencias',
    created: 'Creado',
    settled: 'Liquidado',
    promotion: 'Promoción',
    delivered: 'Entregada',
    notDelivered: 'Sin entregar',
    boostActive: 'Impulso activo',
    boostInactive: 'Impulso inactivo',
    noSettlement: 'Sin liquidar',
    page: 'Página',
    of: 'de',
    previous: 'Anterior',
    next: 'Siguiente',
    privacyNote: 'Vista sin datos personales: sin correo, sin nombre y sin payload del proveedor.',
  },
  en: {
    title: 'Payment reconciliation',
    subtitle: 'Every payment attempt with its Clip reference, the event that closed it and the listing it paid for.',
    refresh: 'Refresh',
    loadError: 'Could not load payment reconciliation.',
    empty: 'No payments match the filter.',
    records: 'Records',
    paidAmount: 'Collected',
    verifiedCash: 'Verified',
    claimedUnverified: 'Unverified',
    internalBalance: 'Internal balance',
    unmatchedListings: 'Without a listing',
    refunds: 'Refunds',
    refundsNotTracked: 'Not tracked: Clip refunds are not persisted yet.',
    refundsTracked: 'Tracked',
    filterStatus: 'Status',
    filterAll: 'All',
    payment: 'Payment',
    amount: 'Amount',
    clipReference: 'Clip reference',
    references: 'References',
    created: 'Created',
    settled: 'Settled',
    promotion: 'Promotion',
    delivered: 'Delivered',
    notDelivered: 'Not delivered',
    boostActive: 'Boost active',
    boostInactive: 'Boost inactive',
    noSettlement: 'Not settled',
    page: 'Page',
    of: 'of',
    previous: 'Previous',
    next: 'Next',
    privacyNote: 'Privacy-safe view: no email, no name and no provider payload.',
  },
  ru: {
    title: 'Сверка платежей',
    subtitle: 'Каждая попытка оплаты с её ссылкой Clip, событием закрытия и объявлением, за которое заплатили.',
    refresh: 'Обновить',
    loadError: 'Не удалось загрузить сверку платежей.',
    empty: 'Нет платежей по выбранному фильтру.',
    records: 'Записей',
    paidAmount: 'Оплачено',
    verifiedCash: 'Подтверждено',
    claimedUnverified: 'Без подтверждения',
    internalBalance: 'Внутренний баланс',
    unmatchedListings: 'Без объявления',
    refunds: 'Возвраты',
    refundsNotTracked: 'Не учитываются: Clip-возвраты пока не сохраняются.',
    refundsTracked: 'Учтены',
    filterStatus: 'Статус',
    filterAll: 'Все',
    payment: 'Платёж',
    amount: 'Сумма',
    clipReference: 'Ссылка Clip',
    references: 'Ссылки',
    created: 'Создан',
    settled: 'Закрыт',
    promotion: 'Промо',
    delivered: 'Выдано',
    notDelivered: 'Не выдано',
    boostActive: 'Буст активен',
    boostInactive: 'Буст неактивен',
    noSettlement: 'Не закрыт',
    page: 'Страница',
    of: 'из',
    previous: 'Назад',
    next: 'Вперёд',
    privacyNote: 'Без персональных данных: без email, имени и payload провайдера.',
  },
});

const STATUS_OPTIONS = ['paid', 'paid_review', 'pending', 'expired', 'failed'];

const STATUS_STYLES = {
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  paid_review: 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  pending: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200',
  expired: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
};

function copyFor(lang) {
  return COPY[lang] || COPY.es;
}

function SummaryCard({ icon: Icon, label, value, note, tone = 'lime' }) {
  const tones = {
    lime: 'bg-lime-50 text-lime-600 dark:bg-lime-950/30',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-200',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
          {note && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{note}</p>}
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${tones[tone] || tones.lime}`}>
          <Icon size={19} />
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span
      data-testid={`admin-reconciliation-status-${status}`}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${style}`}
    >
      {status}
    </span>
  );
}

export default function AdminPaymentReconciliation({ token, lang = 'es' }) {
  const copy = copyFor(lang);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async (nextPage = 1, nextStatus = '') => {
    setLoading(true);
    setLoadError(false);
    try {
      const query = new URLSearchParams({ page: String(nextPage), per_page: '25' });
      if (nextStatus) {
        query.set('status', nextStatus);
      }
      const response = await fetch(`${API_URL}/admin/payments/reconciliation?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('auth_token') || ''}` },
      });
      if (!response.ok) {
        throw new Error(`admin-reconciliation-load-failed:${response.status}`);
      }
      const payload = await response.json();
      setRows(payload.data || []);
      setMeta(payload.meta || { current_page: 1, last_page: 1, total: 0 });
      setSummary(payload.summary || null);
      setPage(payload.meta?.current_page || nextPage);
    } catch (error) {
      console.error('Error fetching payment reconciliation', error);
      setLoadError(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Deferred so the initial load does not set state synchronously inside the
    // effect (react-hooks/set-state-in-effect).
    queueMicrotask(() => {
      load(1, '');
    });
  }, [load]);

  const statusCounts = useMemo(() => {
    const entries = Object.entries(summary?.by_status || {});
    entries.sort((a, b) => b[1].records - a[1].records);
    return entries;
  }, [summary]);

  // Reported money is not collected money: the headline paid total is shown
  // next to the verified / claimed / internal split the API now returns.
  const fundingSplitNote = useMemo(() => {
    if (summary?.verified_cash_amount === undefined) {
      return null;
    }

    return [
      `${copy.verifiedCash}: ${formatMXN(summary.verified_cash_amount || 0, lang)}`,
      `${copy.claimedUnverified}: ${formatMXN(summary.claimed_unverified_amount || 0, lang)}`,
      `${copy.internalBalance}: ${formatMXN(summary.internal_balance_amount || 0, lang)}`,
    ].join(' · ');
  }, [summary, copy, lang]);

  const refundsTracked = summary?.refund_tracking === 'tracked';

  const onFilterChange = event => {
    const value = event.target.value;
    setStatus(value);
    load(1, value);
  };

  return (
    <section className="space-y-4" data-testid="admin-payment-reconciliation">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[16px] font-bold text-slate-900 dark:text-white">
            <Receipt size={18} className="text-lime-600" />
            {copy.title}
          </h3>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="admin-reconciliation-status-filter">{copy.filterStatus}</label>
          <select
            id="admin-reconciliation-status-filter"
            data-testid="admin-reconciliation-status-filter"
            value={status}
            onChange={onFilterChange}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">{copy.filterAll}</option>
            {STATUS_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button
            type="button"
            data-testid="admin-reconciliation-refresh"
            onClick={() => load(page, status)}
            disabled={loading}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            <span className="hidden sm:inline">{copy.refresh}</span>
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={CreditCard}
          label={copy.records}
          value={formatNumber(meta.total || 0, lang)}
          note={statusCounts.map(([key, value]) => `${key}: ${value.records}`).join(' · ') || null}
        />
        <SummaryCard
          icon={Wallet}
          label={copy.paidAmount}
          value={formatMXN(summary?.paid_amount || 0, lang)}
          note={fundingSplitNote || summary?.currency || 'MXN'}
        />
        <SummaryCard
          icon={ShieldAlert}
          label={copy.unmatchedListings}
          value={formatNumber(summary?.unmatched_listing_reference || 0, lang)}
          tone="amber"
        />
        <SummaryCard
          icon={BadgeCheck}
          label={copy.refunds}
          value={refundsTracked
            ? formatMXN(summary?.refunded_amount || 0, lang)
            : copy.refundsNotTracked}
          note={refundsTracked
            ? `${copy.refundsTracked}: ${formatNumber(summary?.refund_records || 0, lang)}`
            : null}
          tone={refundsTracked ? 'lime' : 'slate'}
        />
      </div>

      {loadError && (
        <div
          data-testid="admin-reconciliation-error"
          role="alert"
          className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50/60 p-4 text-[13px] text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200"
        >
          <span className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} />
            {copy.loadError}
          </span>
          <button
            type="button"
            onClick={() => load(page, status)}
            className="min-h-[44px] rounded-xl bg-red-600 px-4 font-bold text-white"
          >
            {copy.refresh}
          </button>
        </div>
      )}

      {!loadError && loading && rows.length === 0 && (
        <div data-testid="admin-reconciliation-loading" role="status" className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 p-6 text-[13px] font-semibold text-slate-500 dark:border-slate-700">
          <Loader2 size={18} className="animate-spin" />
          {copy.title}…
        </div>
      )}

      {!loadError && !loading && rows.length === 0 && (
        <div data-testid="admin-reconciliation-empty" className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
          <Search size={22} className="text-slate-400" />
          <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200">{copy.empty}</p>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700/60 lg:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[12px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700/60 dark:bg-slate-700/30 dark:text-slate-400">
                  <th className="px-4 py-3">{copy.payment}</th>
                  <th className="px-4 py-3">{copy.amount}</th>
                  <th className="px-4 py-3">{copy.clipReference}</th>
                  <th className="px-4 py-3">{copy.references}</th>
                  <th className="px-4 py-3">{copy.created}</th>
                  <th className="px-4 py-3">{copy.settled}</th>
                  <th className="px-4 py-3">{copy.promotion}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px] dark:divide-slate-700/60">
                {rows.map(row => (
                  <tr key={row.payment_id} data-testid={`admin-reconciliation-row-${row.payment_id}`} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-900 dark:text-white">#{row.payment_id}</span>
                        <StatusBadge status={row.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {formatMXN(row.amount, lang)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] text-slate-600 dark:text-slate-300" title={row.clip_payment_request_id || ''}>
                        {row.clip_payment_request_id || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div className="flex flex-col">
                        <span>{row.listing_reference || '—'}</span>
                        <span className="text-[12px] text-slate-400">{row.user_reference || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(row.created_at, lang)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {row.settled_at ? (
                        <div className="flex flex-col">
                          <span>{formatDateTime(row.settled_at, lang)}</span>
                          <span className="text-[12px] text-slate-400">{row.settled_via}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">{copy.noSettlement}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${row.promotion?.delivered ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300'}`}>
                          {row.promotion?.delivered ? copy.delivered : copy.notDelivered}
                        </span>
                        {row.promotion?.delivered && (
                          <span className="text-[12px] font-semibold text-slate-500">
                            {row.promotion?.boost_active ? copy.boostActive : copy.boostInactive}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {rows.map(row => (
              <article
                key={row.payment_id}
                data-testid={`admin-reconciliation-card-${row.payment_id}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white">#{row.payment_id}</p>
                    <p className="mt-1 font-mono text-[12px] text-slate-500 dark:text-slate-400">{row.clip_payment_request_id || '—'}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <p className="mt-3 text-[18px] font-black text-slate-900 dark:text-white">{formatMXN(row.amount, lang)}</p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <dt className="font-semibold uppercase tracking-wide text-slate-400">{copy.references}</dt>
                    <dd className="mt-0.5 text-slate-700 dark:text-slate-200">{row.listing_reference || '—'}</dd>
                    <dd className="text-slate-400">{row.user_reference || '—'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wide text-slate-400">{copy.created}</dt>
                    <dd className="mt-0.5 text-slate-700 dark:text-slate-200">{formatDate(row.created_at, lang)}</dd>
                    <dd className="text-slate-400">{row.settled_at ? formatDateTime(row.settled_at, lang) : copy.noSettlement}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              data-testid="admin-reconciliation-previous"
              onClick={() => load(Math.max(1, page - 1), status)}
              disabled={page <= 1 || loading}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {copy.previous}
            </button>
            <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
              {copy.page} {page} {copy.of} {meta.last_page || 1}
            </span>
            <button
              type="button"
              data-testid="admin-reconciliation-next"
              onClick={() => load(Math.min(meta.last_page || 1, page + 1), status)}
              disabled={page >= (meta.last_page || 1) || loading}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {copy.next}
            </button>
          </div>
        </>
      )}

      <p className="text-[12px] text-slate-400">{copy.privacyNote}</p>
    </section>
  );
}
