import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

function formatPrice(value) {
  return Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parsePayload(notification) {
  if (notification.type !== 'price_drop' || !notification.data) return null;
  try {
    return typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data;
  } catch {
    return null;
  }
}

export default function NotificationsScreen({ user }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const token = localStorage.getItem('auth_token');

  const load = useCallback(async (nextPage = 1) => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/notifications?page=${nextPage}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      const items = json.data || [];
      setNotifications(prev => nextPage === 1 ? items : [...prev, ...items]);
      setHasMore(Boolean(json.next_page_url));
      setPage(nextPage);
    } catch {
      // Keep the screen quiet; the user can retry by reopening.
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(1); }, [load]);

  const markRead = useCallback(async (id) => {
    setNotifications(prev => prev.map(item => item.id === id ? { ...item, is_read: 1 } : item));
    if (!token) return;
    await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    }).catch(() => {});
  }, [token]);

  const markAllRead = async () => {
    setNotifications(prev => prev.map(item => ({ ...item, is_read: 1 })));
    if (!token) return;
    await fetch(`${API_URL}/notifications/read-all`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    }).catch(() => {});
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Inicia sesión para ver tus notificaciones.</p>
      </div>
    );
  }

  const unread = notifications.filter(item => !item.is_read).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-[13px] font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Volver</button>
          <h1 className="text-[17px] font-bold text-slate-900 dark:text-white">Notificaciones</h1>
          {unread > 0 ? (
            <button onClick={markAllRead} className="text-[12px] text-[#65A30D] hover:underline font-semibold">Marcar todas</button>
          ) : <span className="w-20" />}
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {loading && notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-[14px]">Cargando...</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-slate-500 dark:text-slate-300 text-[15px] font-medium">No tienes notificaciones todavía</p>
            <p className="text-slate-400 dark:text-slate-500 text-[13px] text-center px-8">
              Cuando baje el precio de un anuncio guardado, te avisaremos aquí.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl mt-3 mx-3 shadow-sm overflow-hidden border border-slate-100 dark:border-slate-800">
            {notifications.map(notification => {
              const payload = parsePayload(notification);
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    markRead(notification.id);
                    if (payload?.ad_url) navigate(payload.ad_url);
                  }}
                  className={`w-full text-left flex items-start gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${!notification.is_read ? 'bg-lime-50 dark:bg-lime-400/10' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    {payload ? (
                      <>
                        <p className={`text-[13px] leading-snug ${!notification.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                          Bajó de precio: {payload.ad_title}
                        </p>
                        <p className="text-[12px] text-slate-500 dark:text-slate-300 mt-1">
                          Antes <span className="line-through">${formatPrice(payload.old_price)}</span> ahora <span className="text-green-700 dark:text-green-300 font-bold">${formatPrice(payload.new_price)}</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className={`text-[13px] leading-snug ${!notification.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}`}>{notification.title}</p>
                        {notification.message && <p className="text-[12px] text-slate-500 dark:text-slate-300 mt-1">{notification.message}</p>}
                      </>
                    )}
                    <span className="text-[10px] text-slate-400 mt-1.5 block">{new Date(notification.created_at).toLocaleString('es-MX')}</span>
                  </div>
                  {!notification.is_read && <span className="w-2 h-2 rounded-full bg-lime-500 flex-shrink-0 mt-1.5" />}
                </button>
              );
            })}

            {hasMore && (
              <div className="p-4 text-center">
                <button onClick={() => load(page + 1)} disabled={loading} className="text-[13px] text-[#65A30D] font-semibold hover:underline disabled:opacity-50">
                  {loading ? 'Cargando...' : 'Cargar más'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
