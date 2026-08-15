import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatDateTime } from '../../utils/localeFormat';
import { events } from '../../utils/analytics';
import {
  ArrowLeft,
  CircleAlert,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  User,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';
const CHAT_POLL_INTERVAL_MS = 20000;

function apiHeaders(token, json = false) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

function messageText(message) {
  return message?.body || message?.content || '';
}

function formatTimestamp(value, lang = 'es') {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return formatDateTime(value, lang, {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });
}

function uniqueMessages(messages) {
  const seen = new Set();
  return messages.filter((message) => {
    if (!message?.id || seen.has(message.id)) return false;
    seen.add(message.id);
    return true;
  });
}

export default function ChatScreen({ user, lang = 'es', t = {} }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = localStorage.getItem('auth_token');
  const requestedConversationId = Number(searchParams.get('conversation') || 0) || null;
  const requestedAdId = Number(searchParams.get('ad_id') || 0) || null;
  const requestedSellerId = Number(searchParams.get('seller_id') || 0) || null;
  const requestedTitle = searchParams.get('title') || '';

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(requestedConversationId);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const bottomRef = useRef(null);

  const newThreadTarget = useMemo(() => {
    if (!requestedAdId || !requestedSellerId || requestedSellerId === Number(user?.id)) return null;
    return {
      ad_id: requestedAdId,
      user_id: requestedSellerId,
      name: t.seller,
      ad: { id: requestedAdId, title: requestedTitle },
    };
  }, [requestedAdId, requestedSellerId, requestedTitle, t.seller, user?.id]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => Number(item.conversation_id) === Number(selectedConversationId)) || conversation,
    [conversation, conversations, selectedConversationId],
  );

  const loadConversations = useCallback(async ({ quiet = false } = {}) => {
    if (!token) return;
    if (!quiet) setLoadingConversations(true);
    try {
      const response = await fetch(`${API_BASE}/chat/conversations`, {
        headers: apiHeaders(token),
      });
      if (!response.ok) throw new Error('conversation load failed');
      const data = await response.json();
      const items = Array.isArray(data) ? data : [];
      setConversations(items);
      setError('');

      if (!selectedConversationId && requestedConversationId) {
        setSelectedConversationId(requestedConversationId);
      } else if (!selectedConversationId && newThreadTarget) {
        const existing = items.find((item) => (
          Number(item.ad_id) === requestedAdId && Number(item.user_id) === requestedSellerId
        ));
        if (existing) {
          setSelectedConversationId(existing.conversation_id);
          setSearchParams({ conversation: String(existing.conversation_id) }, { replace: true });
        }
      }
    } catch {
      if (!quiet) setError(t.chat_load_failed);
    } finally {
      if (!quiet) setLoadingConversations(false);
    }
  }, [newThreadTarget, requestedAdId, requestedConversationId, requestedSellerId, selectedConversationId, setSearchParams, t.chat_load_failed, token]);

  const loadMessages = useCallback(async (conversationId, { quiet = false } = {}) => {
    if (!token || !conversationId) return;
    if (!quiet) setLoadingMessages(true);
    try {
      const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}/messages`, {
        headers: apiHeaders(token),
      });
      if (!response.ok) throw new Error('message load failed');
      const data = await response.json();
      setConversation(data.conversation || null);
      setMessages(uniqueMessages(Array.isArray(data.messages) ? data.messages : []));
      setError('');
      if (!quiet) {
        window.dispatchEvent(new Event('mercasto:notifications-changed'));
      }
    } catch {
      if (!quiet) setError(t.chat_load_failed);
    } finally {
      if (!quiet) setLoadingMessages(false);
    }
  }, [t.chat_load_failed, token]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    } else {
      setConversation(null);
      setMessages([]);
    }
  }, [loadMessages, selectedConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, sending]);

  useEffect(() => {
    if (!user?.id || !token) return undefined;
    let cancelled = false;
    let echo = null;
    let channel = null;

    import('../../echo').then((module) => {
      if (cancelled) return;
      echo = module.default;
      if (token && echo.connector?.pusher?.config?.auth?.headers) {
        echo.connector.pusher.config.auth.headers.Authorization = `Bearer ${token}`;
      }
      channel = echo.private(`chat.${user.id}`);
      channel.listen('.message.sent', ({ message }) => {
        if (!message?.id) return;
        if (Number(message.conversation_id) === Number(selectedConversationId)) {
          setMessages((previous) => uniqueMessages([...previous, message]));
        }
        loadConversations({ quiet: true });
      });
      setRealtimeConnected(true);
    }).catch(() => setRealtimeConnected(false));

    return () => {
      cancelled = true;
      setRealtimeConnected(false);
      channel?.stopListening('.message.sent');
      echo?.leave(`chat.${user.id}`);
    };
  }, [loadConversations, selectedConversationId, token, user?.id]);

  useEffect(() => {
    if (!token) return undefined;
    const timer = window.setInterval(() => {
      loadConversations({ quiet: true });
      if (selectedConversationId) loadMessages(selectedConversationId, { quiet: true });
    }, CHAT_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadConversations, loadMessages, selectedConversationId, token]);

  const selectConversation = (item) => {
    setSelectedConversationId(item.conversation_id);
    setConversation(item);
    setSearchParams({ conversation: String(item.conversation_id) }, { replace: true });
  };

  const startNewThread = () => {
    setSelectedConversationId(null);
    setConversation(null);
    setMessages([]);
    if (newThreadTarget) {
      setSearchParams({
        ad_id: String(newThreadTarget.ad_id),
        seller_id: String(newThreadTarget.user_id),
        ...(requestedTitle ? { title: requestedTitle } : {}),
      }, { replace: true });
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending || !token) return;

    const target = selectedConversation || newThreadTarget;
    const receiverId = Number(target?.user_id || 0);
    const adId = Number(target?.ad_id || target?.ad?.id || 0);
    if (!receiverId || !adId) {
      setError(t.chat_target_missing);
      return;
    }

    setSending(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/chat/messages`, {
        method: 'POST',
        headers: apiHeaders(token, true),
        body: JSON.stringify({ receiver_id: receiverId, ad_id: adId, content }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('send failed');

      setDraft('');
      setMessages((previous) => uniqueMessages([...previous, payload]));
      const nextConversationId = Number(payload.conversation_id || selectedConversationId);
      const analyticsContext = {
        listing_id: String(adId),
        ad_id: String(adId),
        source: selectedConversationId ? 'existing_conversation' : 'listing_contact',
      };
      if (!selectedConversationId && nextConversationId) {
        events.messageStarted(analyticsContext);
      }
      events.messageSent(analyticsContext);
      if (nextConversationId) {
        setSelectedConversationId(nextConversationId);
        setSearchParams({ conversation: String(nextConversationId) }, { replace: true });
      }
      await loadConversations({ quiet: true });
    } catch {
      setError(t.chat_send_failed);
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return null;
  }

  const threadTarget = selectedConversation || newThreadTarget;
  const showThread = Boolean(selectedConversationId || newThreadTarget);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 dark:bg-slate-950 md:pb-8">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={t.back}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black text-slate-900 dark:text-white">
              {t.messages}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {realtimeConnected
                ? (t.chat_realtime)
                : (t.chat_polling)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadConversations();
              if (selectedConversationId) loadMessages(selectedConversationId);
            }}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={t.retry}
          >
            <RefreshCw size={19} />
          </button>
        </div>
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl grid-cols-1 overflow-hidden border-x border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={`${showThread ? 'hidden md:block' : 'block'} border-r border-slate-200 dark:border-slate-800`}>
          {newThreadTarget && (
            <button
              type="button"
              onClick={startNewThread}
              className="m-3 flex min-h-14 w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl border border-lime-300 bg-lime-50 px-3 text-left hover:bg-lime-100 dark:border-lime-500/30 dark:bg-lime-500/10"
            >
              <MessageCircle className="shrink-0 text-lime-700 dark:text-lime-300" size={20} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-900 dark:text-white">
                  {t.new_message}
                </span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  {requestedTitle || t.seller}
                </span>
              </span>
            </button>
          )}

          {loadingConversations ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : conversations.length === 0 && !newThreadTarget ? (
            <div className="px-6 py-20 text-center">
              <MessageCircle className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={42} />
              <p className="font-bold text-slate-700 dark:text-slate-200">
                {t.no_messages}
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t.chat_empty_hint}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {conversations.map((item) => {
                const active = Number(item.conversation_id) === Number(selectedConversationId);
                return (
                  <button
                    key={item.conversation_id}
                    type="button"
                    onClick={() => selectConversation(item)}
                    className={`flex min-h-20 w-full items-center gap-3 px-4 py-3 text-left transition-colors ${active ? 'bg-lime-50 dark:bg-lime-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'}`}
                  >
                    {item.avatar_url ? (
                      <img src={item.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800">
                        <User size={20} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-black text-slate-900 dark:text-white">{item.name || t.seller}</span>
                        {Number(item.unread_count) > 0 && (
                          <span className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-lime-500 px-1.5 text-[11px] font-black text-slate-950">
                            {item.unread_count}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">
                        {item.last_message || item.ad?.title || t.messages}
                      </span>
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {formatTimestamp(item.created_at, lang)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className={`${showThread ? 'flex' : 'hidden md:flex'} min-h-[calc(100vh-8rem)] flex-col`}>
          {showThread ? (
            <>
              <div className="flex min-h-16 items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedConversationId(null);
                    setConversation(null);
                    setSearchParams({}, { replace: true });
                  }}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
                  aria-label={t.back}
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {threadTarget?.name || t.seller}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {threadTarget?.ad?.title || requestedTitle || t.messages}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-5 dark:bg-slate-950/60">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-16 text-slate-400">
                    <Loader2 className="animate-spin" size={24} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="mx-auto max-w-sm py-16 text-center">
                    <MessageCircle className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={42} />
                    <p className="font-bold text-slate-700 dark:text-slate-200">
                      {t.chat_start}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {t.chat_safety}
                    </p>
                  </div>
                ) : (
                  <div className="mx-auto flex max-w-2xl flex-col gap-3">
                    {messages.map((message) => {
                      const mine = Number(message.sender_id) === Number(user.id);
                      return (
                        <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${mine ? 'rounded-br-md bg-lime-500 text-slate-950' : 'rounded-bl-md bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100'}`}>
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{messageText(message)}</p>
                            <p className={`mt-1.5 text-right text-[10px] ${mine ? 'text-slate-800/70' : 'text-slate-400'}`}>
                              {formatTimestamp(message.created_at, lang)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 border-t border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  <CircleAlert size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={sendMessage} className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="mx-auto flex max-w-2xl items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value.slice(0, 1000))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage(event);
                      }
                    }}
                    rows={1}
                    maxLength={1000}
                    placeholder={t.write_message}
                    className="mc-control max-h-32 flex-1 resize-y border px-4 py-3 text-sm outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20"
                    aria-label={t.write_message}
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="mc-primary-action mc-icon-button"
                    aria-label={t.sendMessage}
                  >
                    {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <MessageCircle className="mb-4 text-slate-300 dark:text-slate-600" size={54} />
              <p className="text-lg font-black text-slate-700 dark:text-slate-200">
                {t.select_conversation}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
