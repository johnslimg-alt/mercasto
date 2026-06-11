import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Phone, Mail, X, Copy, Check, ExternalLink, Shield, Clock } from 'lucide-react';

/**
 * ContactarButton — Unified contact button with modal showing all communication channels.
 *
 * Replaces the cluttered WhatsApp/Telegram/Email button group with a single
 * "Contactar" CTA that opens a clean modal with all available channels.
 *
 * Features:
 * - Rate limiting (cooldown between contacts)
 * - Trust badges (verified seller, response time)
 * - Copy phone/email to clipboard
 * - Deep links to WhatsApp, Telegram, Email
 *
 * Props:
 * @param {Object} seller - Seller info { name, phone, email, telegram, whatsapp, verified, avg_response_time }
 * @param {string} adTitle - Title of the ad being contacted
 * @param {string} adId - ID of the ad (for rate limiting)
 * @param {string} className - Additional CSS classes for the trigger button
 * @param {string} size - Button size: 'sm' | 'md' | 'lg' (default: 'md')
 */
export default function ContactarButton({
  seller = {},
  adTitle = '',
  adId = '',
  className = '',
  size = 'md',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [cooldown, setCooldown] = useState(false);
  const modalRef = useRef(null);

  // Rate limiting — 30 second cooldown between contacts per ad
  useEffect(() => {
    if (!adId) return;
    const lastContact = localStorage.getItem(`contact_cooldown_${adId}`);
    if (lastContact) {
      const elapsed = Date.now() - parseInt(lastContact, 10);
      if (elapsed < 30000) {
        setCooldown(true);
        const timer = setTimeout(() => setCooldown(false), 30000 - elapsed);
        return () => clearTimeout(timer);
      }
    }
  }, [adId]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const markContacted = () => {
    if (adId) {
      localStorage.setItem(`contact_cooldown_${adId}`, Date.now().toString());
      setCooldown(true);
      setTimeout(() => setCooldown(false), 30000);
    }
  };

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleWhatsApp = () => {
    const phone = seller.whatsapp || seller.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola, me interesa tu anuncio "${adTitle}" en Mercasto.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    markContacted();
  };

  const handleTelegram = () => {
    const username = seller.telegram || '';
    const cleanUsername = username.replace('@', '');
    window.open(`https://t.me/${cleanUsername}`, '_blank');
    markContacted();
  };

  const handleEmail = () => {
    const email = seller.email || '';
    const subject = encodeURIComponent(`Consulta sobre: ${adTitle} — Mercasto`);
    const body = encodeURIComponent(`Hola ${seller.name || ''},\n\nVi tu anuncio "${adTitle}" en Mercasto y me gustaría más información.\n\nSaludos.`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    markContacted();
  };

  const handlePhone = () => {
    const phone = seller.phone || '';
    window.location.href = `tel:${phone}`;
    markContacted();
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-[13px]',
    md: 'px-5 py-2.5 text-[14px]',
    lg: 'px-6 py-3 text-[16px]',
  };

  const hasWhatsApp = Boolean(seller.whatsapp || seller.phone);
  const hasTelegram = Boolean(seller.telegram);
  const hasEmail = Boolean(seller.email);
  const hasPhone = Boolean(seller.phone);
  const hasAnyChannel = hasWhatsApp || hasTelegram || hasEmail || hasPhone;

  if (!hasAnyChannel) return null;

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={cooldown}
        className={`
          btn-primary flex items-center justify-center gap-2 font-bold
          rounded-xl shadow-md hover:shadow-lg transition-all duration-200
          hover:scale-[1.02] active:scale-[0.98]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          bg-[#84CC16] text-slate-950 hover:bg-[#65A30D]
          ${sizeClasses[size] || sizeClasses.md}
          ${className}
        `}
      >
        <MessageCircle size={size === 'sm' ? 14 : 18} />
        {cooldown ? 'Espera un momento...' : 'Contactar'}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal Content */}
          <div
            ref={modalRef}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Contactar a {seller.name || 'el vendedor'}
                </h3>
                {adTitle && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[280px]">
                    Sobre: {adTitle}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Trust Badges */}
            {(seller.verified || seller.avg_response_time) && (
              <div className="flex flex-wrap gap-2 px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                {seller.verified && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
                    <Shield size={12} /> Verificado
                  </span>
                )}
                {seller.avg_response_time && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">
                    <Clock size={12} /> Responde en ~{seller.avg_response_time}
                  </span>
                )}
              </div>
            )}

            {/* Contact Channels */}
            <div className="p-5 space-y-3">
              {/* WhatsApp */}
              {hasWhatsApp && (
                <button
                  onClick={handleWhatsApp}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-slate-900 dark:text-white text-[14px]">WhatsApp</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{seller.whatsapp || seller.phone}</div>
                  </div>
                  <ExternalLink size={16} className="text-slate-400 group-hover:text-green-500 transition-colors" />
                </button>
              )}

              {/* Telegram */}
              {hasTelegram && (
                <button
                  onClick={handleTelegram}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#229ED9] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.535.223l.188-2.85 5.18-4.686c.223-.195-.054-.31-.35-.11l-6.4 4.02-2.76-.89c-.6-.188-.614-.6.126-.89L17.2 7.15c.523-.188.983.118.694 1.07z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-slate-900 dark:text-white text-[14px]">Telegram</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{seller.telegram}</div>
                  </div>
                  <ExternalLink size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                </button>
              )}

              {/* Phone Call */}
              {hasPhone && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePhone}
                    className="flex-1 flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-700 dark:bg-slate-600 flex items-center justify-center shrink-0">
                      <Phone size={18} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-slate-900 dark:text-white text-[14px]">Llamar</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{seller.phone}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => copyToClipboard(seller.phone, 'phone')}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
                    title="Copiar número"
                  >
                    {copiedField === 'phone' ? (
                      <Check size={18} className="text-green-500" />
                    ) : (
                      <Copy size={18} className="text-slate-400" />
                    )}
                  </button>
                </div>
              )}

              {/* Email */}
              {hasEmail && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEmail}
                    className="flex-1 flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-700 dark:bg-slate-600 flex items-center justify-center shrink-0">
                      <Mail size={18} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-slate-900 dark:text-white text-[14px]">Email</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{seller.email}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => copyToClipboard(seller.email, 'email')}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
                    title="Copiar email"
                  >
                    {copiedField === 'email' ? (
                      <Check size={18} className="text-green-500" />
                    ) : (
                      <Copy size={18} className="text-slate-400" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
                🛡️ Mercasto no comparte tu información personal con el vendedor.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
