import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, ShieldCheck, ShieldX, Loader2, Download, FileText } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

export default function AdminBusinessVerifications({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/business-verifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setItems(await res.json());
    } catch (e) {
      console.error('Error loading business verifications', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const review = async (userId, decision) => {
    setBusyId(userId);
    try {
      const res = await fetch(`${API_URL}/admin/business-verifications/${userId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== userId));
      }
    } catch (e) {
      console.error('Error reviewing verification', e);
    } finally {
      setBusyId(null);
    }
  };

  const downloadCsf = (userId) => {
    fetch(`${API_URL}/admin/business-verifications/${userId}/csf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CSF-${userId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(e => console.error('Error downloading CSF', e));
  };

  if (loading) return <div className="p-8 text-center text-slate-400 text-sm"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  if (items.length === 0) {
    return (
      <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[12px]">
        Sin verificaciones pendientes de revisión manual
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map(item => (
        <div key={item.id} className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-900 text-[14px]">{item.business_name || item.name}</p>
              <span className={`badge text-[10px] ${item.business_rfc_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {item.business_rfc_status === 'rejected' ? <ShieldX className="w-3 h-3 inline mr-1" /> : <ShieldAlert className="w-3 h-3 inline mr-1" />}
                {item.business_rfc_status}
              </span>
            </div>
            <p className="text-[12px] text-slate-500 mt-0.5">{item.email} · RFC: <span className="font-mono">{item.business_rfc}</span></p>
            {item.business_rfc_ai_notes && (
              <p className="text-[12px] text-slate-600 mt-1 bg-slate-50 rounded-lg px-2.5 py-1.5">{item.business_rfc_ai_notes}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => downloadCsf(item.id)} className="btn-sm bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" /> <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => review(item.id, 'approve')}
              disabled={busyId === item.id}
              className="btn-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center gap-1.5 text-xs disabled:opacity-50"
            >
              {busyId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Aprobar
            </button>
            <button
              onClick={() => review(item.id, 'reject')}
              disabled={busyId === item.id}
              className="btn-sm bg-red-50 hover:bg-red-100 text-red-600 flex items-center gap-1.5 text-xs disabled:opacity-50"
            >
              <ShieldX className="w-3.5 h-3.5" /> Rechazar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
