import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'https://mercasto.com/storage';

const readAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin';
  } catch {
    return false;
  }
};

const parseImages = (ad) => {
  const raw = ad?.image_url ?? ad?.images ?? ad?.image;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (!raw || typeof raw !== 'string') return [];
  try {
    const decoded = JSON.parse(raw);
    return Array.isArray(decoded) ? decoded.filter(Boolean) : [raw];
  } catch {
    return [raw];
  }
};

const imageUrl = (path) => {
  if (!path) return '/placeholder-ad.svg';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  if (path.startsWith('/')) return path;
  return `${STORAGE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

const plainText = (value) => {
  if (!value) return '';
  if (typeof value === 'object') return value.es || value.en || Object.values(value)[0] || '';
  try {
    const decoded = JSON.parse(value);
    if (decoded && typeof decoded === 'object') return decoded.es || decoded.en || Object.values(decoded)[0] || value;
  } catch {}
  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(date);
};

const formatWait = (seconds = 0) => {
  const total = Math.max(0, Number(seconds) || 0);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${Math.max(1, minutes)} min`;
};

const statusInfo = (status) => {
  const value = String(status || 'queued');
  if (value.includes('approved')) return { label: 'Aprobado', css: 'bg-emerald-100 text-emerald-700' };
  if (value.includes('rejected')) return { label: 'Rechazado', css: 'bg-red-100 text-red-700' };
  if (value === 'processing' || value === 'queued') return { label: value === 'processing' ? 'IA revisando' : 'En cola IA', css: 'bg-blue-100 text-blue-700' };
  if (value === 'failed') return { label: 'Error de IA', css: 'bg-amber-100 text-amber-800' };
  return { label: 'Revisión manual', css: 'bg-orange-100 text-orange-800' };
};

export default function AdminModerationCenter() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(readAdmin);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const visible = location.pathname.startsWith('/admin') && isAdmin;
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    setIsAdmin(readAdmin());
  }, [location.pathname]);

  const headers = useMemo(() => ({
    Accept: 'application/json',
    Authorization: `Bearer ${token || ''}`,
  }), [token]);

  const loadQueue = useCallback(async (silent = false) => {
    if (!visible || !token) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/admin/moderation/ads?per_page=100`, { headers });
      if (!response.ok) throw new Error(`No se pudo cargar la cola (${response.status})`);
      const payload = await response.json();
      setItems(Array.isArray(payload) ? payload : (payload.data || []));
      setTotal(Number(payload.total ?? payload.data?.length ?? 0));
    } catch (loadError) {
      setError(loadError.message || 'No se pudo cargar la moderación.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [headers, token, visible]);

  useEffect(() => {
    if (!visible) return undefined;
    loadQueue();
    const interval = window.setInterval(() => loadQueue(true), 30000);
    return () => window.clearInterval(interval);
  }, [loadQueue, visible]);

  const openDetail = useCallback(async (adId) => {
    setDetailLoading(true);
    setDetail(null);
    setReason('');
    setError('');
    try {
      const response = await fetch(`${API_URL}/admin/moderation/ads/${adId}`, { headers });
      if (!response.ok) throw new Error('No se pudo abrir el anuncio completo.');
      setDetail(await response.json());
    } catch (detailError) {
      setError(detailError.message || 'No se pudo abrir el anuncio.');
    } finally {
      setDetailLoading(false);
    }
  }, [headers]);

  const submitDecision = useCallback(async (decision) => {
    if (!detail || actionLoading) return;
    if (decision === 'rejected' && !reason.trim()) {
      setError('Escribe el motivo del rechazo para que el vendedor pueda corregirlo.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/admin/moderation/ads/${detail.id}/decision`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: reason.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'No se pudo guardar la decisión.');

      setDetail(null);
      setReason('');
      await loadQueue(true);
    } catch (decisionError) {
      setError(decisionError.message || 'No se pudo guardar la decisión.');
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, detail, headers, loadQueue, reason]);

  const retryAI = useCallback(async () => {
    if (!detail || actionLoading) return;
    setActionLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/admin/moderation/ads/${detail.id}/retry-ai`, {
        method: 'POST',
        headers,
      });
      if (!response.ok) throw new Error('No se pudo repetir la revisión automática.');
      setDetail(null);
      await loadQueue(true);
    } catch (retryError) {
      setError(retryError.message || 'No se pudo repetir la revisión automática.');
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, detail, headers, loadQueue]);

  const processPending = useCallback(async () => {
    if (processing) return;
    setProcessing(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/admin/moderation/process-pending`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 }),
      });
      if (!response.ok) throw new Error('No se pudo iniciar la cola de IA.');
      await loadQueue(true);
    } catch (processError) {
      setError(processError.message || 'No se pudo iniciar la cola de IA.');
    } finally {
      setProcessing(false);
    }
  }, [headers, loadQueue, processing]);

  if (!visible) return null;

  const oldest = items[0];

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); loadQueue(); }}
        className="fixed right-4 bottom-20 md:bottom-6 z-[80] flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-left text-white shadow-2xl ring-1 ring-white/10 hover:bg-slate-900"
        aria-label="Abrir moderación inteligente"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-xl text-slate-950">✓</span>
        <span>
          <span className="block text-sm font-extrabold">Moderación inteligente</span>
          <span className="block text-xs text-slate-300">
            {total} pendientes{oldest ? ` · más antiguo ${formatWait(oldest.waiting_seconds)}` : ''}
          </span>
        </span>
        {total > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-black">{total}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex bg-slate-950/70 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="ml-auto flex h-full w-full max-w-5xl flex-col bg-slate-50 shadow-2xl dark:bg-slate-950">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 md:px-6 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">Moderación de anuncios</h2>
                <p className="text-sm text-slate-500">Ordenados del más antiguo al más reciente · horario de Ciudad de México</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={processPending}
                  disabled={processing}
                  className="rounded-xl bg-lime-400 px-4 py-2 text-sm font-extrabold text-slate-950 disabled:opacity-50"
                >
                  {processing ? 'Enviando…' : 'Procesar pendientes con IA'}
                </button>
                <button type="button" onClick={() => { setOpen(false); setDetail(null); }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cerrar</button>
              </div>
            </header>

            {error && <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 md:mx-6">{error}</div>}

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[380px_1fr]">
              <aside className="min-h-0 overflow-y-auto border-r border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Pendientes: {total}</span>
                  <button type="button" onClick={() => loadQueue()} className="text-xs font-bold text-lime-700">Actualizar</button>
                </div>

                {loading ? (
                  <div className="py-16 text-center text-sm font-semibold text-slate-500">Cargando cola…</div>
                ) : items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No hay anuncios pendientes.</div>
                ) : (
                  <div className="space-y-3">
                    {items.map((ad) => {
                      const images = parseImages(ad);
                      const ai = statusInfo(ad.ai_moderation_status);
                      return (
                        <button
                          type="button"
                          key={ad.id}
                          onClick={() => openDetail(ad.id)}
                          className={`w-full rounded-2xl border p-3 text-left transition hover:border-lime-400 hover:shadow-md ${detail?.id === ad.id ? 'border-lime-400 bg-lime-50' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
                        >
                          <div className="flex gap-3">
                            <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                              <img src={imageUrl(images[0])} alt="" className="h-full w-full object-cover" />
                              {ad.illustrative_cover && <span className="absolute bottom-1 left-1 rounded bg-slate-950/80 px-1.5 py-0.5 text-[9px] font-bold text-white">Ilustrativa</span>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="line-clamp-2 text-sm font-extrabold text-slate-900 dark:text-white">{plainText(ad.title)}</h3>
                                <span className="shrink-0 text-[10px] font-bold text-slate-400">#{ad.id}</span>
                              </div>
                              <p className="mt-1 text-xs font-bold text-lime-700">${Number(ad.price || 0).toLocaleString('es-MX')} MXN</p>
                              <p className="mt-1 text-[11px] text-slate-500">Enviado: {formatDate(ad.moderation_submitted_at)}</p>
                              <p className="text-[11px] font-bold text-orange-700">Esperando: {formatWait(ad.waiting_seconds)}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${ai.css}`}>{ai.label}</span>
                            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Revisar →</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </aside>

              <main className="min-h-0 overflow-y-auto p-4 md:p-6">
                {detailLoading ? (
                  <div className="py-24 text-center text-sm font-semibold text-slate-500">Abriendo anuncio completo…</div>
                ) : !detail ? (
                  <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                    Selecciona un anuncio y revisa fotos, descripción, vendedor, atributos e historial antes de decidir.
                  </div>
                ) : (
                  <AdReview detail={detail} reason={reason} setReason={setReason} actionLoading={actionLoading} submitDecision={submitDecision} retryAI={retryAI} />
                )}
              </main>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AdReview({ detail, reason, setReason, actionLoading, submitDecision, retryAI }) {
  const images = parseImages(detail);
  const ai = statusInfo(detail.ai_moderation_status);
  const attributes = detail.attributes && typeof detail.attributes === 'object' ? detail.attributes : {};
  const decisions = Array.isArray(detail.moderation_decisions) ? detail.moderation_decisions : [];

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${ai.css}`}>{ai.label}</span>
              <span className="text-xs font-bold text-slate-400">Anuncio #{detail.id}</span>
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{plainText(detail.title)}</h2>
            <p className="mt-1 text-lg font-black text-lime-700">${Number(detail.price || 0).toLocaleString('es-MX')} MXN</p>
          </div>
          <div className="rounded-2xl bg-orange-50 px-4 py-3 text-right">
            <p className="text-[11px] font-bold uppercase tracking-wide text-orange-700">Fecha de envío</p>
            <p className="text-sm font-extrabold text-slate-900">{formatDate(detail.moderation_submitted_at)}</p>
            <p className="text-xs font-bold text-orange-700">Esperando {formatWait(detail.waiting_seconds)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {images.length > 0 ? images.map((image, index) => (
            <div key={`${image}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
              <img src={imageUrl(image)} alt={`Imagen ${index + 1}`} className="h-full w-full object-contain" />
              {detail.illustrative_cover && index === 0 && (
                <span className="absolute bottom-2 left-2 rounded-lg bg-slate-950/85 px-2 py-1 text-xs font-extrabold text-white">Imagen ilustrativa, no foto del vendedor</span>
              )}
            </div>
          )) : (
            <div className="aspect-[4/3] rounded-2xl bg-slate-100 p-8 text-center text-sm text-slate-500">Sin imágenes</div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Descripción completa</h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-200">{plainText(detail.description) || 'Sin descripción'}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Datos del anuncio</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <InfoRow label="Categoría" value={detail.category} />
            <InfoRow label="Subcategoría" value={detail.subcategory} />
            <InfoRow label="Condición" value={detail.condition} />
            <InfoRow label="Ubicación" value={[detail.location, detail.city, detail.state].filter(Boolean).join(', ')} />
            <InfoRow label="Vendedor" value={`${detail.user?.name || 'Sin nombre'} · ${detail.user?.email || 'Sin email'}`} />
            <InfoRow label="Cuenta verificada" value={detail.user?.is_verified ? 'Sí' : 'No'} />
            <InfoRow label="Fotos originales" value={detail.has_original_images ? 'Sí' : 'No; se usa portada ilustrativa'} />
          </dl>
        </div>
      </section>

      {Object.keys(attributes).length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Características declaradas</h3>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Object.entries(attributes).map(([key, value]) => <InfoRow key={key} label={key.replaceAll('_', ' ')} value={Array.isArray(value) ? value.join(', ') : String(value ?? '')} />)}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Análisis e historial</h3>
          <button type="button" onClick={retryAI} disabled={actionLoading} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-700 disabled:opacity-50">Repetir análisis de IA</button>
        </div>
        {detail.ai_moderation_reason && (
          <div className="mt-3 rounded-2xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <strong>Último resultado:</strong> {detail.ai_moderation_reason}
            {detail.ai_moderation_confidence !== null && detail.ai_moderation_confidence !== undefined && (
              <span className="ml-2 font-bold">({Math.round(Number(detail.ai_moderation_confidence) * 100)}%)</span>
            )}
          </div>
        )}
        <div className="mt-3 space-y-2">
          {decisions.length === 0 ? <p className="text-sm text-slate-500">Todavía no hay decisiones registradas.</p> : decisions.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-slate-800 dark:text-white">{item.source === 'admin' ? 'Administrador' : 'IA'} · {item.decision}</strong>
                <span className="text-slate-400">{formatDate(item.created_at)}</span>
              </div>
              {item.reason && <p className="mt-1 text-slate-600 dark:text-slate-300">{item.reason}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="sticky bottom-0 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">Comentario o motivo del rechazo</label>
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Es obligatorio al rechazar y se guardará en el historial…" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-lime-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" disabled={actionLoading} onClick={() => submitDecision('approved')} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">Aprobar y publicar</button>
          <button type="button" disabled={actionLoading} onClick={() => submitDecision('manual_review')} className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-extrabold text-slate-950 disabled:opacity-50">Dejar pendiente</button>
          <button type="button" disabled={actionLoading} onClick={() => submitDecision('rejected')} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">Rechazar</button>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
      <dt className="capitalize text-slate-500">{label}</dt>
      <dd className="text-right font-bold text-slate-800 dark:text-slate-100">{value || '—'}</dd>
    </div>
  );
}
