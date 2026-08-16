import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Download, FileText, Loader2, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

function aiLabel(status, copy) {
  if (status === 'pass') return copy.admin_ai_pass;
  if (status === 'manual_review') return copy.admin_ai_review;
  if (status === 'failed') return copy.admin_ai_failed;
  return copy.admin_ai_waiting;
}

export default function AdminKycVerifications({ token, copy }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/admin/kyc`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(String(response.status));
      const payload = await response.json();
      setItems(Array.isArray(payload) ? payload : (payload.data || []));
    } catch {
      setError(copy.admin_identity_load_error);
    } finally {
      setLoading(false);
    }
  }, [copy.admin_identity_load_error, token]);

  useEffect(() => { load(); }, [load]);

  const review = async (id, decision) => {
    setBusyId(id);
    setError('');
    try {
      const response = await fetch(`${API_URL}/admin/kyc/${id}/${decision}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(String(response.status));
      setItems(current => current.filter(item => item.id !== id));
    } catch {
      setError(copy.admin_identity_review_error);
    } finally {
      setBusyId(null);
    }
  };

  const openDocument = async (id) => {
    setError('');
    try {
      const response = await fetch(`${API_URL}/admin/kyc/document/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError(copy.admin_document_error);
    }
  };

  if (loading) return <div data-testid="admin-kyc-loading" role="status" className="p-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>;

  return (
    <div>
      {error && <div role="alert" className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
      {items.length === 0 ? (
        <div data-testid="admin-kyc-empty" className="p-10 text-center text-[12px] font-bold uppercase tracking-widest text-slate-400">{copy.admin_no_kyc}</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {items.map(item => (
            <div key={item.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-semibold text-slate-900 dark:text-white">{item.name || item.email}</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    <BadgeCheck className="h-3 w-3" /> {copy.admin_ai_prescreen}: {aiLabel(item.kyc_ai_status, copy)}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{item.email} · ID {item.id}</p>
                {item.kyc_ai_notes && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[12px] text-slate-600 dark:bg-slate-900 dark:text-slate-300">{item.kyc_ai_notes}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" onClick={() => openDocument(item.id)} className="btn-sm flex items-center gap-1.5 bg-slate-100 text-xs text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700" aria-label={`${copy.admin_download}: ${item.name || item.email}`}>
                  <FileText className="h-3.5 w-3.5" /><Download className="h-3.5 w-3.5" /> {copy.admin_document}
                </button>
                <button type="button" onClick={() => review(item.id, 'approve')} disabled={busyId === item.id} className="btn-sm flex items-center gap-1.5 bg-emerald-50 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {busyId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} {copy.admin_approve}
                </button>
                <button type="button" onClick={() => review(item.id, 'reject')} disabled={busyId === item.id} className="btn-sm flex items-center gap-1.5 bg-red-50 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50 dark:bg-red-950/30 dark:text-red-300">
                  {item.kyc_ai_status === 'manual_review' ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldX className="h-3.5 w-3.5" />} {copy.admin_reject}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
