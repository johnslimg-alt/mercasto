import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ADMIN_FRAUD_RISK_NAMESPACE } from './adminFraudRiskI18n';
import useModalFocusTrap from '../../hooks/useModalFocusTrap';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';
const PAGE_SIZE = 50;

const readAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin';
  } catch {
    return false;
  }
};

const formatDate = (value, locale, fallback) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  try {
    return new Intl.DateTimeFormat(locale || 'es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Mexico_City',
    }).format(date);
  } catch {
    return fallback;
  }
};

const scoreClasses = (score) => {
  const value = Number(score || 0);
  if (value >= 70) return 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200';
  if (value >= 40) return 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200';
  if (value >= 20) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
};

export default function AdminFraudRiskOverlay() {
  const location = useLocation();
  const { t, i18n } = useTranslation(ADMIN_FRAUD_RISK_NAMESPACE);
  const locale = i18n.resolvedLanguage || i18n.language || 'es-MX';
  const direction = i18n.dir(locale);
  const [isAdmin, setIsAdmin] = useState(readAdmin);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [threshold, setThreshold] = useState(40);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [analysisById, setAnalysisById] = useState({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const visible = location.pathname.startsWith('/admin') && isAdmin;
  const close = () => setOpen(false);
  const { dialogRef, initialFocusRef, handleKeyDown } = useModalFocusTrap({
    isOpen: visible && open,
    onClose: close,
  });
  const token = localStorage.getItem('auth_token');
  const headers = useMemo(() => ({
    Accept: 'application/json',
    Authorization: `Bearer ${token || ''}`,
  }), [token]);

  useEffect(() => {
    setIsAdmin(readAdmin());
  }, [location.pathname]);

  const load = useCallback(async (silent = false, targetPage = page) => {
    if (!visible || !token) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const requestedPage = Math.max(1, Number(targetPage || 1));
      const response = await fetch(`${API_URL}/admin/moderation/ads?mode=risk&per_page=${PAGE_SIZE}&page=${requestedPage}`, { headers });
      if (!response.ok) throw new Error(t('error'));
      const payload = await response.json();
      setItems(Array.isArray(payload?.data) ? payload.data : []);
      setThreshold(Number(payload?.review_threshold ?? 40));
      setTotal(Math.max(0, Number(payload?.total ?? 0)));
      setPage(Math.max(1, Number(payload?.page ?? requestedPage)));
      setLastPage(Math.max(1, Number(payload?.last_page ?? 1)));
    } catch (loadError) {
      setError(loadError?.message || t('error'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [headers, page, t, token, visible]);

  const loadSummary = useCallback(async () => {
    if (!visible || !token) return;
    try {
      const response = await fetch(`${API_URL}/admin/moderation/ads?mode=risk&per_page=1&page=1`, { headers });
      if (!response.ok) return;
      const payload = await response.json();
      setTotal(Math.max(0, Number(payload?.total ?? 0)));
      setThreshold(Number(payload?.review_threshold ?? 40));
    } catch {
      // Badge prefetch is best effort; the detailed overlay reports load errors.
    }
  }, [headers, token, visible]);

  useEffect(() => {
    if (!visible || !token) return undefined;
    loadSummary();
    const interval = window.setInterval(loadSummary, 60000);
    return () => window.clearInterval(interval);
  }, [loadSummary, token, visible]);

  useEffect(() => {
    if (!visible || !open) return undefined;
    load();
    const interval = window.setInterval(() => load(true), 60000);
    return () => window.clearInterval(interval);
  }, [load, open, visible]);

  const changePage = useCallback((nextPage) => {
    const bounded = Math.max(1, Math.min(lastPage, Number(nextPage || 1)));
    if (bounded === page) return;
    setPage(bounded);
    load(false, bounded);
  }, [lastPage, load, page]);

  const analyze = useCallback(async (adId) => {
    if (!adId || analyzingId !== null) return;
    setAnalyzingId(adId);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${API_URL}/admin/moderation/ads/${adId}/retry-ai`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'risk' }),
      });
      if (!response.ok) throw new Error(t('error'));
      const payload = await response.json();
      setAnalysisById((current) => ({ ...current, [adId]: payload }));
      await load(true);
    } catch (analysisError) {
      setError(analysisError?.message || t('error'));
    } finally {
      setAnalyzingId(null);
    }
  }, [analyzingId, headers, load, t]);

  const runBatch = useCallback(async () => {
    if (batchRunning) return;
    setBatchRunning(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${API_URL}/admin/moderation/process-pending`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'risk', limit: PAGE_SIZE }),
      });
      if (!response.ok) throw new Error(t('error'));
      const payload = await response.json();
      setNotice(payload?.queued ? t('running') : t('batchDone', { count: Number(payload?.analyzed || 0) }));
      await loadSummary();
    } catch (batchError) {
      setError(batchError?.message || t('error'));
    } finally {
      setBatchRunning(false);
    }
  }, [batchRunning, headers, loadSummary, t]);

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        data-testid="admin-fraud-risk-open"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-3 z-[80] flex items-center gap-2 rounded-2xl border border-slate-800 bg-white px-3 py-2.5 text-sm font-extrabold text-slate-900 shadow-xl hover:bg-slate-50 md:bottom-6 md:left-4 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
        aria-label={t('open')}
        dir={direction}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-300 text-slate-950" aria-hidden="true">⚑</span>
        <span className="hidden sm:inline">{t('score')}</span>
        {total > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{total}</span>}
      </button>

      {open && (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-[110] flex bg-slate-950/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-fraud-risk-title"
          onKeyDown={handleKeyDown}
          dir={direction}
        >
          <div className="flex h-full w-full flex-col bg-slate-50 shadow-2xl md:ml-auto md:max-w-4xl dark:bg-slate-950">
            <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="admin-fraud-risk-title" className="text-xl font-black text-slate-950 dark:text-white">{t('title')}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => load()} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">{t('refresh')}</button>
                  <button type="button" disabled={batchRunning} onClick={runBatch} className="rounded-xl bg-amber-300 px-3 py-2 text-sm font-extrabold text-slate-950 disabled:opacity-50">{batchRunning ? t('running') : t('runBatch')}</button>
                  <button ref={initialFocusRef} type="button" onClick={close} className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-extrabold text-white dark:bg-white dark:text-slate-950">{t('close')}</button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{t('total', { count: total })}</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{t('threshold', { score: threshold })}</span>
              </div>
            </header>

            <div className="mx-4 mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 md:mx-6 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
              {t('advisory')}
            </div>
            {error && <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 md:mx-6 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</div>}
            {notice && <div className="mx-4 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 md:mx-6 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</div>}

            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
              {loading ? (
                <div className="py-20 text-center text-sm font-semibold text-slate-500">{t('loading')}</div>
              ) : items.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">{t('empty')}</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {items.map((item) => {
                      const score = Math.max(0, Math.min(100, Number(item?.fraud_score || 0)));
                      const flags = Array.isArray(item?.fraud_flags) ? item.fraud_flags.filter(Boolean) : [];
                      const latest = analysisById[item.id];
                      const provider = latest?.analysis?.provider;
                      const degraded = Boolean(latest?.analysis?.degraded);
                      return (
                        <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-400">{t('ad', { id: item.id })}</p>
                              <h3 className="mt-1 line-clamp-2 text-base font-black text-slate-950 dark:text-white">{item.title || t('unknown')}</h3>
                              <p className="mt-1 text-xs text-slate-500">{item.user?.name || t('unknown')} · {item.status || t('unknown')}</p>
                            </div>
                            <div className={`shrink-0 rounded-2xl px-3 py-2 text-center ${scoreClasses(score)}`} aria-label={t('scoreAria', { score })}>
                              <div className="text-2xl font-black leading-none">{score}</div>
                              <div className="mt-1 text-[10px] font-extrabold uppercase">{t('score')}</div>
                            </div>
                          </div>

                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                            <div className="h-full rounded-full bg-current text-amber-500" style={{ width: `${score}%` }} />
                          </div>

                          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <Info label={t('checked')} value={formatDate(item.last_fraud_check_at, locale, t('unknown'))} />
                            <Info label={t('seller')} value={item.user?.is_verified ? `${item.user?.name || t('unknown')} ✓` : (item.user?.name || t('unknown'))} />
                          </dl>

                          <div className="mt-4">
                            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{t('reasons')}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {flags.length ? flags.map((flag) => (
                                <span key={flag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{flag}</span>
                              )) : <span className="text-xs text-slate-500">{t('noReasons')}</span>}
                            </div>
                          </div>

                          {latest && (
                            <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs dark:bg-slate-950">
                              <div className="flex flex-wrap items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                                <span>{t('provider')}: {provider === 'python_private' ? t('normal') : t('fallback')}</span>
                                {degraded && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900 dark:bg-amber-950 dark:text-amber-200">{t('degraded')}</span>}
                                {latest?.listing?.status_unchanged && <span className="text-emerald-700 dark:text-emerald-300">{t('unchanged')}</span>}
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            disabled={analyzingId !== null}
                            onClick={() => analyze(item.id)}
                            className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-extrabold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                          >
                            {analyzingId === item.id ? t('analyzing') : t('analyze')}
                          </button>
                        </article>
                      );
                    })}
                  </div>

                  {lastPage > 1 && (
                    <nav className="mt-6 flex items-center justify-center gap-3" aria-label={t('pagination')}>
                      <button
                        type="button"
                        disabled={page <= 1 || loading}
                        onClick={() => changePage(page - 1)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
                      >
                        {t('previous')}
                      </button>
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{t('page', { page, total: lastPage })}</span>
                      <button
                        type="button"
                        disabled={page >= lastPage || loading}
                        onClick={() => changePage(page + 1)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
                      >
                        {t('next')}
                      </button>
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950">
      <dt className="font-bold text-slate-400">{label}</dt>
      <dd className="mt-1 break-words font-extrabold text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  );
}
