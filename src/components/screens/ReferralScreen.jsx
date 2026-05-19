import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export default function ReferralScreen({ t = {}, lang = 'es' }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { navigate('/'); return; }

    fetch(`${API_URL}/referral`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })
      .then(r => {
        if (!r.ok) throw new Error(t.referral_load_error || 'No se pudo cargar el programa de referidos');
        return r.json();
      })
      .then(setData)
      .catch(() => setError(t.referral_error || 'No pudimos cargar tu enlace de referido. Inténtalo de nuevo.'));
  }, [navigate, t.referral_error, t.referral_load_error]);

  const handleCopy = () => {
    if (!data) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(data.referral_url).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!data) return;
    const inviteText = lang === 'en'
      ? `Join Mercasto and buy or sell across Mexico. Register with my link: ${data.referral_url}`
      : lang === 'pt'
      ? `Entre no Mercasto e compre ou venda no México. Cadastre-se com meu link: ${data.referral_url}`
      : `¡Únete a Mercasto y compra o vende en México! Regístrate con mi enlace: ${data.referral_url}`;
    const msg = encodeURIComponent(inviteText);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const copy = {
    title: t.referral_title || (lang === 'en' ? 'Referral Program' : lang === 'pt' ? 'Programa de Indicações' : 'Programa de Referidos'),
    description: t.referral_desc || (lang === 'en'
      ? 'Each friend who registers with your link gives you 1 free featured boost for your listings.'
      : lang === 'pt'
      ? 'Cada amigo que se cadastra com seu link dá a você 1 destaque grátis para seus anúncios.'
      : 'Cada amigo que se registre con tu enlace te da 1 destacado gratis para tus anuncios.'),
    linkLabel: t.referral_link || (lang === 'en' ? 'Your referral link' : lang === 'pt' ? 'Seu link de indicação' : 'Tu enlace de referido'),
    copied: t.copied || (lang === 'en' ? 'Copied!' : lang === 'pt' ? 'Copiado!' : '¡Copiado!'),
    copy: t.copy || (lang === 'en' ? 'Copy' : lang === 'pt' ? 'Copiar' : 'Copiar'),
    shareWhatsApp: t.share_whatsapp || (lang === 'en' ? 'Share on WhatsApp' : lang === 'pt' ? 'Compartilhar no WhatsApp' : 'Compartir por WhatsApp'),
    friends: t.referral_friends || (lang === 'en' ? 'Friends invited' : lang === 'pt' ? 'Amigos convidados' : 'Amigos invitados'),
    credits: t.referral_credits || (lang === 'en' ? 'Credits earned' : lang === 'pt' ? 'Créditos ganhos' : 'Créditos ganados'),
    history: t.referral_history || (lang === 'en' ? 'Referral history' : lang === 'pt' ? 'Histórico de indicações' : 'Historial de referidos'),
    empty: t.referral_empty || (lang === 'en' ? 'You have not invited anyone yet. Share your link!' : lang === 'pt' ? 'Você ainda não convidou ninguém. Compartilhe seu link!' : 'Aún no has invitado a nadie. ¡Comparte tu enlace!'),
    credit: t.credit || (lang === 'en' ? 'credit' : lang === 'pt' ? 'crédito' : 'crédito'),
  };

  if (error) return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pt-8 sm:pt-10 text-slate-900 dark:text-white">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-950/30 dark:text-red-200">
        {error}
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
    </div>
  );

  const history = Array.isArray(data.history) ? data.history : [];

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pt-8 sm:pt-10 text-slate-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-2">{copy.title}</h1>
      <p className="text-slate-500 dark:text-slate-300 mb-6">
        {copy.description}
      </p>

      {/* Referral Link */}
      <div className="bg-lime-50 border border-lime-200 rounded-2xl p-4 mb-6 dark:bg-slate-900 dark:border-lime-400/30">
        <p className="text-sm text-slate-500 dark:text-slate-300 mb-1">{copy.linkLabel}</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            readOnly
            value={data.referral_url}
            onFocus={(event) => event.target.select()}
            className="flex-1 bg-white border border-lime-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-700 outline-none dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
          />
          <button
            onClick={handleCopy}
            className="bg-lime-500 hover:bg-lime-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            {copied ? copy.copied : copy.copy}
          </button>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={handleWhatsApp}
          className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          {copy.shareWhatsApp}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-3xl font-bold text-lime-500">{data.total_referred}</p>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">{copy.friends}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <p className="text-3xl font-bold text-yellow-500">{data.credits}</p>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">{copy.credits}</p>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{copy.history}</h2>
          <div className="space-y-2">
            {history.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-4 py-3 dark:bg-slate-900 dark:border-slate-800">
                <div>
                  <p className="font-medium">{item.user_name}</p>
                  <p className="text-xs text-slate-400">{item.joined_at}</p>
                </div>
                <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2.5 py-1 rounded-full dark:bg-yellow-400/10 dark:text-yellow-300">
                  +{item.credit_earned} {copy.credit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length === 0 && (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500">
          <p>{copy.empty}</p>
        </div>
      )}
    </div>
  );
}
