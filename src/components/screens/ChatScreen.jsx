import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Send, MessageCircle, Search, User, CheckCheck,
  Check, Image as ImageIcon, Paperclip, MoreVertical, Phone,
  ExternalLink, ChevronRight, Circle, Loader2, AlertCircle,
  X, Smile
} from 'lucide-react';
import echo from '../../echo';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function getImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const base = (import.meta.env.VITE_STORAGE_URL || 'https://mercasto.com/storage').replace(/\/$/, '');
  return `${base}/${url.replace(/^\//, '')}`;
}

function getFirstImageUrl(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] || null;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed[0] || null : trimmed;
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

function Avatar({ user, size = 40, className = '' }) {
  const initials = (user?.name || '?').slice(0, 1).toUpperCase();
  if (user?.avatar_url) {
    return (
      <img
        src={getImageUrl(user.avatar_url)}
        alt={user?.name}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
        onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling?.style.removeProperty('display'); }}
      />
    );
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${className}`}
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#84CC16,#65A30D)', fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

function ConversationItem({ conv, isActive, onClick, currentUserId }) {
  const unread = conv.unread_count > 0 && conv.sender_id !== currentUserId;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left ${
        isActive ? 'bg-lime-50 dark:bg-lime-900/20 border-r-2 border-lime-500' : ''
      }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar user={{ name: conv.name, avatar_url: conv.avatar_url }} size={46} />
        {/* Online indicator — always shown for now, can wire to presence channel later */}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-[14px] truncate ${unread ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
            {conv.name || 'Usuario'}
          </span>
          <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2">{timeAgo(conv.created_at)}</span>
        </div>

        <div className="flex items-center gap-1">
          {conv.sender_id === currentUserId && (
            <CheckCheck size={13} className="text-lime-500 flex-shrink-0" />
          )}
          <p className={`text-[13px] truncate ${unread ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
            {conv.last_message || '...'}
          </p>
          {unread && (
            <span className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-lime-500 text-white text-[10px] font-bold flex items-center justify-center">
              {conv.unread_count > 9 ? '9+' : conv.unread_count}
            </span>
          )}
        </div>

        {/* Ad thumbnail if present */}
        {conv.ad && (
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="truncate">{conv.ad.title}</span>
            {conv.ad.price && (
              <span className="text-lime-600 font-semibold flex-shrink-0">
                ${Number(conv.ad.price).toLocaleString('es-MX')}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

function MessageBubble({ msg, isOwn, showAvatar, otherUser }) {
  const bubbleBase = 'max-w-[75%] px-4 py-2.5 text-[14px] leading-relaxed shadow-sm';
  const ownBubble = 'bg-lime-500 text-white rounded-t-2xl rounded-bl-2xl rounded-br-sm self-end';
  const theirBubble = 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-t-2xl rounded-br-2xl rounded-bl-sm self-start border border-slate-100 dark:border-slate-700';

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2 mb-1`}>
      {!isOwn && (
        showAvatar
          ? <Avatar user={otherUser} size={28} className="mb-0.5" />
          : <div style={{ width: 28, flexShrink: 0 }} />
      )}

      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`${bubbleBase} ${isOwn ? ownBubble : theirBubble}`}>
          {msg.content || msg.body}
        </div>
        <span className="text-[10px] text-slate-400 mt-0.5 px-1">
          {timeAgo(msg.created_at)}
          {isOwn && (msg.is_read
            ? <CheckCheck size={11} className="inline ml-1 text-lime-500" />
            : <Check size={11} className="inline ml-1 text-slate-400" />
          )}
        </span>
      </div>
    </div>
  );
}

export default function ChatScreen({ user, t }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialUserId = searchParams.get('with');
  const initialAdId = searchParams.get('ad');

  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeConv, setActiveConv] = useState(null); // { user_id, name, avatar_url, ad, conversation_id }
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const channelRef = useRef(null);
  const token = localStorage.getItem('auth_token');
  const dict = t || {};

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' }), [token]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!token) return;
    setLoadingConvs(true);
    try {
      const res = await fetch(`${API_URL}/chat/conversations`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setConversations(Array.isArray(data) ? data : []);
      }
    } catch { /* silent */ } finally {
      setLoadingConvs(false);
    }
  }, [token, authHeaders]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Open conversation by user_id (from ?with=... or click)
  const openConversation = useCallback(async (convData) => {
    setActiveConv(convData);
    setMessages([]);
    setLoadingMsgs(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/chat/${convData.user_id}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      setError('No se pudieron cargar los mensajes.');
    } finally {
      setLoadingMsgs(false);
      setTimeout(scrollToBottom, 100);
      setTimeout(() => inputRef.current?.focus(), 150);
    }

    // Mark as read in the list
    setConversations(prev => prev.map(c =>
      c.user_id === convData.user_id ? { ...c, unread_count: 0, is_read: true } : c
    ));
  }, [authHeaders, scrollToBottom]);

  // Open from query param (?with=userId&ad=adId)
  useEffect(() => {
    if (initialUserId && !activeConv) {
      openConversation({ user_id: Number(initialUserId), name: 'Usuario', avatar_url: null, ad_id: initialAdId ? Number(initialAdId) : null });
    }
  }, [activeConv, initialAdId, initialUserId, openConversation]);

  // WebSocket — listen for new messages on the private user channel
  useEffect(() => {
    if (!user?.id || !echo) return;
    const ch = echo.private(`chat.${user.id}`);
    channelRef.current = ch;

    ch.listen('.message.sent', (e) => {
      const msg = e.message || e;
      // If the chat with this sender is currently open — append message
      setActiveConv(prev => {
        if (prev && msg.sender_id === prev.user_id) {
          setMessages(m => [...m, msg]);
          setTimeout(scrollToBottom, 80);
        }
        return prev;
      });
      // Update conversations list
      loadConversations();
    });

    return () => {
      ch.stopListening('.message.sent');
    };
  }, [loadConversations, user?.id, scrollToBottom]);

  // Send a message
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !activeConv) return;
    setSending(true);
    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_id: user?.id,
      content: text,
      body: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    setTimeout(scrollToBottom, 60);

    try {
      const body = {
        receiver_id: activeConv.user_id,
        content: text,
      };
      if (activeConv.ad_id) body.ad_id = activeConv.ad_id;

      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const saved = await res.json();
        // Replace optimistic message
        setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...saved, content: saved.body || saved.content } : m));
        // Refresh conversations
        loadConversations();
      }
    } catch {
      // Revert optimistic if network error
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending, activeConv, user?.id, scrollToBottom, authHeaders, loadConversations]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const filteredConvs = conversations.filter(c =>
    !searchQuery || (c.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  // Mobile: show list or chat
  const [showList, setShowList] = useState(!initialUserId);

  // ---- Empty state (no conversations) ----
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-lime-50 flex items-center justify-center mb-4 shadow-inner">
        <MessageCircle size={36} className="text-lime-500" />
      </div>
      <h3 className="text-[18px] font-bold text-slate-800 dark:text-white mb-2">
        {dict.no_messages || 'Sin mensajes aún'}
      </h3>
      <p className="text-slate-500 text-[14px] max-w-xs leading-relaxed mb-6">
        {dict.no_messages_desc || 'Cuando contactes a un vendedor o alguien te escriba, verás las conversaciones aquí.'}
      </p>
      <button
        onClick={() => navigate('/')}
        className="btn bg-lime-500 text-white hover:bg-lime-600 rounded-2xl px-6 py-2.5 font-semibold text-[14px]"
      >
        {dict.browse_ads || 'Explorar anuncios'}
      </button>
    </div>
  );

  // ---- No conversation selected ----
  const NoChatSelected = () => (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <MessageCircle size={28} className="text-slate-400" />
      </div>
      <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-400">
        {dict.select_conversation || 'Selecciona una conversación'}
      </p>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 overflow-hidden">

      {/* ── SIDEBAR: Conversations list ── */}
      <aside className={`flex flex-col w-full md:w-[340px] lg:w-[380px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0 ${activeConv && !showList ? 'hidden md:flex' : 'flex'}`}>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-[18px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {dict.messages || 'Mensajes'}
              {totalUnread > 0 && (
                <span className="w-5 h-5 rounded-full bg-lime-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </h1>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder={dict.search_conversations || 'Buscar conversación...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-[13px] rounded-xl bg-slate-100 dark:bg-slate-800 border-0 outline-none focus:ring-2 focus:ring-lime-400 dark:text-white placeholder-slate-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-lime-500" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <EmptyState />
          ) : (
            filteredConvs.map(conv => (
              <ConversationItem
                key={conv.conversation_id || conv.user_id}
                conv={conv}
                isActive={activeConv?.user_id === conv.user_id}
                currentUserId={user?.id}
                onClick={() => {
                  openConversation({
                    user_id: conv.user_id,
                    name: conv.name,
                    avatar_url: conv.avatar_url,
                    ad: conv.ad,
                    ad_id: conv.ad_id,
                    conversation_id: conv.conversation_id,
                  });
                  setShowList(false);
                }}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── MAIN CHAT AREA ── */}
      <main className={`flex-1 flex flex-col min-w-0 ${!activeConv || showList ? 'hidden md:flex' : 'flex'}`}>

        {!activeConv ? (
          <NoChatSelected />
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                className="p-1.5 -ml-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
                onClick={() => { setShowList(true); setActiveConv(null); }}
              >
                <ArrowLeft size={20} />
              </button>

              <Avatar user={{ name: activeConv.name, avatar_url: activeConv.avatar_url }} size={40} />

              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-[15px] text-slate-900 dark:text-white truncate">{activeConv.name}</h2>
                {activeConv.ad && (
                  <button
                    onClick={() => navigate(`/?ad=${activeConv.ad.id}`)}
                    className="flex items-center gap-1 text-[11px] text-lime-600 hover:underline max-w-full truncate"
                  >
                    <span className="truncate">{activeConv.ad.title}</span>
                    <ExternalLink size={10} className="flex-shrink-0" />
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <a
                  href={`/vendedor/${activeConv.user_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Ver perfil"
                >
                  <User size={18} />
                </a>
              </div>
            </div>

            {/* Ad context banner */}
            {activeConv.ad && (
              <div className="mx-4 mt-3 mb-1 flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
                {getFirstImageUrl(activeConv.ad.image_url) && (
                  <img
                    src={getImageUrl(getFirstImageUrl(activeConv.ad.image_url))}
                    className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                    alt=""
                    onError={e => e.currentTarget.style.display = 'none'}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-300 truncate">{activeConv.ad.title}</p>
                  {activeConv.ad.price && (
                    <p className="text-[13px] font-bold text-amber-700 dark:text-amber-400">
                      ${Number(activeConv.ad.price).toLocaleString('es-MX')} MXN
                    </p>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/?ad=${activeConv.ad.id}`)}
                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline flex-shrink-0 flex items-center gap-0.5"
                >
                  Ver <ChevronRight size={13} />
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-0.5">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="animate-spin text-lime-500" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle size={32} className="text-red-400 mb-2" />
                  <p className="text-red-500 text-[14px]">{error}</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <MessageCircle size={24} className="text-slate-400" />
                  </div>
                  <p className="text-[14px] text-slate-500">
                    {dict.start_conversation || 'Inicia la conversación'}
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === user?.id;
                  const prevMsg = messages[idx - 1];
                  const showAvatar = !isOwn && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
                  return (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isOwn={isOwn}
                      showAvatar={showAvatar}
                      otherUser={{ name: activeConv.name, avatar_url: activeConv.avatar_url }}
                    />
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 pb-safe bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={dict.write_message || 'Escribe un mensaje...'}
                  rows={1}
                  className="flex-1 bg-transparent text-[14px] text-slate-800 dark:text-white placeholder-slate-400 outline-none resize-none max-h-[120px] overflow-y-auto leading-relaxed py-0.5"
                  style={{ minHeight: 24 }}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-lime-500 hover:bg-lime-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                  aria-label="Enviar"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">
                {dict.chat_safety_tip || 'Mantén las transacciones dentro de Mercasto para mayor seguridad.'}
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
