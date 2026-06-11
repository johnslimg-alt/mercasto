import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Loader2 } from 'lucide-react';
import { useToast } from './Toast';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function PushNotificationManager({ user, compact = false }) {
  const toast = useToast();
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState(null);

  useEffect(() => {
    checkPermission();
    fetchVapidKey();
  }, []);

  const checkPermission = () => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
    if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setSubscribed(!!subscription);
        });
      });
    }
  };

  const fetchVapidKey = async () => {
    try {
      const response = await fetch(`${API_BASE}/push/vapid-key`);
      const data = await response.json();
      setVapidKey(data.publicKey);
    } catch (error) {
      console.error('Failed to fetch VAPID key:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async () => {
    if (!vapidKey) { toast.error('VAPID key not loaded'); return; }
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      if (permission !== 'granted') { toast.warning('Permiso denegado'); setLoading(false); return; }
      if (!('serviceWorker' in navigator)) { toast.error('Service Worker no soportado'); setLoading(false); return; }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const response = await fetch(`${API_BASE}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (response.ok) { setSubscribed(true); toast.success('¡Notificaciones activadas!'); }
      else { toast.error('Error al guardar suscripción'); }
    } catch (error) { console.error('Subscribe error:', error); toast.error('Error al activar notificaciones'); }
    finally { setLoading(false); }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await fetch(`${API_BASE}/push/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        setSubscribed(false);
        toast.success('Notificaciones desactivadas');
      }
    } catch (error) { console.error('Unsubscribe error:', error); toast.error('Error al desactivar'); }
    finally { setLoading(false); }
  };

  const sendTest = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/push/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      const data = await response.json();
      if (data.success) { toast.success(`Notificación enviada (${data.sent})`); }
      else { toast.error(data.message || 'Error'); }
    } catch (error) { toast.error('Error al enviar prueba'); }
    finally { setLoading(false); }
  };

  if (permission === 'unsupported') return null;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Notificaciones Push</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{subscribed ? 'Activadas' : 'Desactivadas'}</p>
          </div>
        </div>
        <button onClick={subscribed ? unsubscribe : subscribe} disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition ${subscribed ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400' : 'bg-lime-500 text-white hover:bg-lime-600'} disabled:opacity-50`}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : subscribed ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-start gap-3">
          <BellOff className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-900 dark:text-amber-100">Notificaciones bloqueadas</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Permite las notificaciones en la configuración de tu navegador</p>
          </div>
        </div>
      </div>
    );
  }

  if (subscribed) {
    return (
      <div className="p-4 bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 rounded-lg">
        <div className="flex items-start gap-3">
          <Check className="w-5 h-5 text-lime-600 dark:text-lime-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-lime-900 dark:text-lime-100">Notificaciones activadas</p>
            <p className="text-sm text-lime-700 dark:text-lime-300 mt-1">Recibirás alertas de nuevos mensajes y actualizaciones</p>
            <div className="flex gap-2 mt-3">
              <button onClick={sendTest} disabled={loading} className="px-3 py-1.5 text-sm bg-lime-500 text-white rounded-lg hover:bg-lime-600 disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar prueba'}
              </button>
              <button onClick={unsubscribe} disabled={loading} className="px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600">Desactivar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-blue-900 dark:text-blue-100">Activa las notificaciones</p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Recibe alertas de nuevos mensajes, ofertas y actualizaciones importantes</p>
          <button onClick={subscribe} disabled={loading} className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />Activando...</>) : (<><Bell className="w-4 h-4" />Activar notificaciones</>)}
          </button>
        </div>
        <button className="text-blue-400 hover:text-blue-600"><X className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
