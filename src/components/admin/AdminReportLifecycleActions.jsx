import React, { useState } from 'react';
import { CheckCircle, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { formatReportReference, getReportLifecycleCopy } from '../../utils/reportLifecycleUi';

const STATUS_STYLES = {
  new: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  in_review: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  dismissed: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
};

export default function AdminReportLifecycleActions({ kind, report, token, lang, reload }) {
  const copy = getReportLifecycleCopy(lang);
  const status = report.status || 'new';
  const [note, setNote] = useState(report.resolution_note || '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const reference = formatReportReference(kind, report.id);

  const transition = async (nextStatus) => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const resource = kind === 'user' ? 'user-reports' : 'reports';
      const response = await fetch(`/api/admin/${resource}/${report.id}/transition`, {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus, resolution_note: note.trim() || null }),
      });
      if (!response.ok) throw new Error(`report-transition-failed:${response.status}`);
      await reload();
    } catch (transitionError) {
      console.error(transitionError);
      setError(copy.error);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-w-[170px] flex-col items-end gap-2" data-testid={`report-lifecycle-${kind}-${report.id}`}>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <code data-testid={`report-lifecycle-${kind}-${report.id}-reference`} className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{reference}</code>
        <span data-testid={`report-lifecycle-${kind}-${report.id}-status`} className={`rounded-full px-2 py-1 text-[10px] font-bold ${STATUS_STYLES[status] || STATUS_STYLES.new}`}>
          {copy[status] || copy.new}
        </span>
      </div>

      {status === 'new' && (
        <button type="button" data-testid={`report-lifecycle-${kind}-${report.id}-start`} disabled={pending} onClick={() => transition('in_review')} className="btn-sm inline-flex min-h-11 items-center gap-1.5 bg-slate-900 text-white hover:bg-black disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          {copy.start}
        </button>
      )}

      {status === 'in_review' && (
        <div className="flex w-full flex-col items-end gap-2">
          <label className="sr-only" htmlFor={`report-note-${kind}-${report.id}`}>{copy.note}</label>
          <input id={`report-note-${kind}-${report.id}`} data-testid={`report-lifecycle-${kind}-${report.id}-note`} value={note} onChange={(event) => setNote(event.target.value)} placeholder={copy.notePlaceholder} className="min-h-11 w-full min-w-[210px] rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-800 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/25 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" data-testid={`report-lifecycle-${kind}-${report.id}-resolve`} disabled={pending} onClick={() => transition('resolved')} className="btn-sm inline-flex min-h-11 items-center gap-1.5 bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50">
              {pending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {copy.resolve}
            </button>
            <button type="button" data-testid={`report-lifecycle-${kind}-${report.id}-dismiss`} disabled={pending} onClick={() => transition('dismissed')} className="btn-sm inline-flex min-h-11 items-center gap-1.5 border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-300">
              {pending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              {copy.dismiss}
            </button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="max-w-[220px] text-right text-[11px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
