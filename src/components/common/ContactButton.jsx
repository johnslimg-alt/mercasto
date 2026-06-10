import { useState, useRef, useEffect } from 'react';
import { X, MessageCircle, Mail, Phone, Shield, AlertTriangle, Copy, Check } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

export default function ContactButton({ ad, user, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [formSent, setFormSent] = useState(false);
  const [formError, setFormError] = useState(null);
  const modalRef = useRef(null);

  // Извлечение контактов
  const getSafeTelegramUsername = (ad) => {
    const raw = ad?.telegram_username || ad?.telegram || ad?.telegram_url 
      || ad?.user?.telegram_username || ad?.user?.telegram || ad?.user?.telegram_url || '';
    if (!raw) return null;
    return String(raw).trim()
      .replace(/^@+/, '')
      .replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me)\//i, '')
      .replace(/[^a-zA-Z0-9_]/g, '') || null;
  };

  const getSafeWhatsAppNumber = (ad) => {
    const raw = ad?.user?.business_whatsapp || ad?.user?.whatsapp || ad?.whatsapp || '';
    if (!raw) return null;
    return String(raw).replace(/\D/g, '') || null;
  };

  // El email del vendedor nunca llega al cliente; el contacto por correo
  // se hace vía backend (/ads/{id}/contact-seller).

  const getSafePhone = (ad) => {
    const raw = ad?.user?.phone || ad?.phone || '';
    if (!raw) return null;
    const cleaned = String(raw).replace(/\D/g, '');
    return cleaned.length >= 8 ? cleaned : null;
  };

  const telegramUsername = getSafeTelegramUsername(ad);
  const whatsappNumber = getSafeWhatsAppNumber(ad);
  const phone = getSafePhone(ad);
  
  const whatsappMessage = encodeURIComponent(`Hola, me interesa tu anuncio "${ad?.title}" en Mercasto`);
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}` : null;
  const telegramUrl = telegramUsername ? `https://t.me/${telegramUsername}` : null;
  const phoneUrl = phone ? `tel:+${phone}` : null;

  // Email-канал siempre disponible vía backend relay
  const hasContacts = true;

  // Логирование клика
  const logContact = async (channel) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/ads/${ad.id}/contact-click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ channel, ad_id: ad.id })
      });
    } catch (e) {
      // Тихо игнорируем ошибки логирования
    }
  };

  // Отправка сообщения продавцу через backend (email продавца не раскрывается клиенту)
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setFormError(null);
    try {
      const res = await fetch(`${API_URL}/ads/${ad.id}/contact-seller`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'No se pudo enviar el mensaje.');
      }
      logContact('email');
      setFormSent(true);
    } catch (err) {
      setFormError(err.message || 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  const handleWhatsAppClick = () => {
    logContact('whatsapp');
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTelegramClick = () => {
    logContact('telegram');
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePhoneClick = () => {
    logContact('phone');
    window.location.href = phoneUrl;
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(`+${phone}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Закрытие при клике вне модалки
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  if (!hasContacts) return null;

  const isVerified = ad?.user?.is_verified || ad?.user?.verified || ad?.user?.kyc_status === 'approved';

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg transition-all ${className}`}
      >
        <MessageCircle size={20} />
        <span>Contactar</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-fadeIn">
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-900 w-full md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden animate-slideUp"
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Cerrar"
              >
                <X size={20} className="text-gray-500" />
              </button>

              <div className="flex items-start gap-3 pr-8">
                {ad?.user?.avatar ? (
                  <img src={ad.user.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {(ad?.user?.name || 'V')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                      {ad?.user?.name || 'Vendedor'}
                    </h3>
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                        <Shield size={12} />
                        Verificado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {ad?.title}
                  </p>
                </div>
              </div>
            </div>

            {/* Security Warning */}
            <div className="mx-6 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>Seguridad:</strong> No pagues anticipos sin verificar el producto o vendedor. Reúnete en lugares públicos.
                </p>
              </div>
            </div>

            {/* Contact Channels */}
            <div className="p-6 space-y-3">
              {whatsappUrl && (
                <button
                  onClick={handleWhatsAppClick}
                  className="w-full flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800/50 rounded-xl transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-900 dark:text-white">WhatsApp</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Responder rápida</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {telegramUrl && (
                <button
                  onClick={handleTelegramClick}
                  className="w-full flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 rounded-xl transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-900 dark:text-white">Telegram</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">@{telegramUsername}</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {phoneUrl && (
                <div className="flex gap-2">
                  <button
                    onClick={handlePhoneClick}
                    className="flex-1 flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-800/50 rounded-xl transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-900 dark:text-white">Llamar</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">+{phone}</div>
                    </div>
                  </button>
                  <button
                    onClick={handleCopyPhone}
                    className="px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    title="Copiar número"
                  >
                    {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} className="text-gray-500" />}
                  </button>
                </div>
              )}

              {!showEmailForm ? (
                <button
                  onClick={() => setShowEmailForm(true)}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-900 dark:text-white">Mensaje</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Enviar mensaje al vendedor</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : formSent ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl flex items-center gap-3">
                  <Check size={20} className="text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800 dark:text-green-300">
                    Mensaje enviado. El vendedor te responderá a tu correo.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleEmailSubmit} className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3">
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="Tu nombre"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                  />
                  <input
                    type="email"
                    required
                    maxLength={190}
                    placeholder="Tu correo electrónico"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                  />
                  <textarea
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={3}
                    placeholder={`Hola, me interesa "${ad?.title || 'tu anuncio'}"...`}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white resize-none"
                  />
                  {formError && (
                    <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={sending}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {sending ? 'Enviando…' : 'Enviar mensaje'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmailForm(false)}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-gray-600 dark:text-gray-300 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Tu mensaje se envía por Mercasto. El correo del vendedor no se comparte.
                  </p>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-2">
              <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                Mercasto no participa en la transacción. Verifica siempre al vendedor.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
