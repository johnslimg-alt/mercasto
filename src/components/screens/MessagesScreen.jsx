import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || '/storage';

function avatarUrl(path) {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${STORAGE_URL}/${path.replace(/^\//, '')}`;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

let _echoInstance = null;
async function getEcho() {
  if (_echoInstance) return _echoInstance;
  const mod = await import('../../echo');
  _echoInstance = mod.default;
  return _echoInstance;
}

export default function MessagesScreen({ user }) {
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams();
  const [searchParams] = useSearchParams();
  const adId = searchParams.get('ad_id');

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const token = localStorage.getItem('auth_token');

  const selectedUserId = routeUserId ? Number(routeUserId) : null;
  const selectedConversation = conversations.find(c => c.user_id === selectedUserId);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    setLoadingConversations(true);
    try {
      const res = await fetch(`${API_URL}/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setConversations(await res.json());
    } catch { /* keep the screen quiet, retry on next visit */ }
    finally { setLoadingConversations(false); }
  }, [token]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = useCallback(async (otherUserId) => {
    if (!token || !otherUserId) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`${API_URL}/conversations/${otherUserId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setMessages(await res.json());
        setConversations(prev => prev.map(c => c.user_id === otherUserId ? { ...c, unread_count: 0, is_read: true } : c));
      }
    } catch { /* keep the screen quiet */ }
    finally { setLoadingMessages(false); }
  }, [token]);

  useEffect(() => {
    if (selectedUserId) loadMessages(selectedUserId);
    else setMessages([]);
  }, [selectedUserId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time: nuevos mensajes entrantes mientras el hilo está abierto
  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    let channel = null;
    getEcho().then((echo) => {
      if (cancelled || !echo) return;
      if (token && echo.connector?.pusher?.config?.auth?.headers) {
        echo.connector.pusher.config.auth.headers.Authorization = `Bearer ${token}`;
      }
      channel = echo.private(`chat.${user.id}`);
      channel.listen('.message.sent', (e) => {
        const incoming = e.message;
        if (selectedUserId && incoming.sender_id === selectedUserId) {
          setMessages(prev => [...prev, incoming]);
        }
        loadConversations();
      });
    });
    return () => {
      cancelled = true;
      if (channel) channel.stopListening('.message.sent');
    };
  }, [user?.id, selectedUserId, token, loadConversations]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending || !selectedUserId) return;
    setSending(true);
    setInput('');
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiver_id: selectedUserId, content, ad_id: adId || undefined }),
      });
      if (res.ok) {
        const sent = await res.json();
        setMessages(prev => [...prev, sent]);
        loadConversations();
      } else {
        setInput(content);
      }
    } catch {
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Inicia sesión para ver tus mensajes.</p>
      </div>
    );
  }

  const listPane = (
    <div className={`w-full md:w-[340px] md:border-r border-slate-200 dark:border-slate-800 flex-shrink-0 ${selectedUserId ? 'hidden md:block' : 'block'}`}>
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <h1 className="text-[17px] font-bold text-slate-900 dark:text-white">Mensajes</h1>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 65px)' }}>
        {loadingConversations ? (
          <div className="p-8 text-center text-slate-400 text-[14px]">Cargando...</div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
            <MessageCircle className="w-10 h-10 text-slate-300" />
            <p className="text-slate-500 dark:text-slate-300 text-[14px] font-medium">No tienes conversaciones todavía</p>
            <p className="text-slate-400 dark:text-slate-500 text-[12px]">Cuando contactes o te contacten sobre un anuncio, aparecerá aquí.</p>
          </div>
        ) : (
          conversations.map(c => (
            <button
              key={c.user_id}
              onClick={() => navigate(`/mensajes/${c.user_id}`)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedUserId === c.user_id ? 'bg-slate-50 dark:bg-slate-800' : ''}`}
            >
              {avatarUrl(c.avatar_url) ? (
                <img src={avatarUrl(c.avatar_url)} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold flex-shrink-0">
                  {(c.name || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[14px] truncate ${!c.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-200'}`}>{c.name}</span>
                  <span className="text-[11px] text-slate-400 flex-shrink-0">{formatTime(c.created_at)}</span>
                </div>
                {c.ad?.title && <p className="text-[11px] text-slate-400 truncate">{c.ad.title}</p>}
                <p className={`text-[12px] truncate ${!c.is_read ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400'}`}>{c.last_message}</p>
              </div>
              {!c.is_read && c.unread_count > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-[#84CC16] text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                  {c.unread_count > 9 ? '9+' : c.unread_count}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  const threadPane = selectedUserId ? (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate('/mensajes')} className="md:hidden p-1 -ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-white">
          <ArrowLeft size={20} />
        </button>
        {avatarUrl(selectedConversation?.avatar_url) ? (
          <img src={avatarUrl(selectedConversation.avatar_url)} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-[13px]">
            {(selectedConversation?.name || '?')[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-slate-900 dark:text-white truncate">{selectedConversation?.name || 'Usuario'}</p>
          {selectedConversation?.ad?.title && <p className="text-[11px] text-slate-400 truncate">{selectedConversation.ad.title}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50 dark:bg-slate-950">
        {loadingMessages ? (
          <div className="text-center text-slate-400 text-[13px] py-8">Cargando...</div>
        ) : (
          messages.map(m => {
            const mine = m.sender_id === user.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-[14px] leading-snug ${mine ? 'bg-[#84CC16] text-slate-950 rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-100 dark:border-slate-700'}`}>
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <span className={`text-[10px] block mt-1 text-right ${mine ? 'text-slate-950/60' : 'text-slate-400'}`}>{formatTime(m.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          maxLength={1000}
          placeholder="Escribe un mensaje..."
          className="flex-1 px-4 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[14px] outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-slate-900 dark:text-white"
        />
        <button type="submit" disabled={sending || !input.trim()} className="w-10 h-10 rounded-full bg-[#84CC16] text-slate-950 flex items-center justify-center disabled:opacity-40 flex-shrink-0 hover:bg-[#65A30D] transition-colors">
          <Send size={17} />
        </button>
      </form>
    </div>
  ) : (
    <div className="hidden md:flex flex-1 items-center justify-center text-slate-400 text-[14px]">
      Selecciona una conversación
    </div>
  );

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-900" style={{ minHeight: 'calc(100vh - 0px)' }}>
      {listPane}
      {threadPane}
    </div>
  );
}
