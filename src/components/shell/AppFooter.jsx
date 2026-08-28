import React from 'react';
import MercastoLogo from './MercastoLogo';

export default function AppFooter({
  navigate,
  setActiveCat,
  setCurrentTab,
  setDashboardTab,
  setSearchQuery,
  setShowAuthModal,
  setViewedAd,
  t,
  user,
}) {
  return (
      <footer className="mt-10 bg-[#0F172A] text-slate-300 pb-24 md:pb-0">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div>
              <button type="button" aria-label={t.home || 'Inicio'} className="footer-logo flex items-center gap-2 mb-3 h-8 opacity-80 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => { setCurrentTab('home'); setViewedAd(null); setActiveCat(''); setSearchQuery(''); navigate('/'); }}>
                <MercastoLogo className="h-8" isFooter={true} tagline={t.ai_brand_short} />
              </button>
              <p className="text-[13px] text-slate-400 leading-relaxed">{t.footer_desc}</p>
            </div>
            <div><div className="font-semibold text-white mb-3 text-[14px]">{t.buyers || 'Compradores'}</div><ul className="space-y-2 text-[13px]"><li><a href="/ayuda/comprar-y-contactar" onClick={(e) => { e.preventDefault(); navigate('/ayuda/comprar-y-contactar'); }} className="hover:text-white cursor-pointer">{t.how_to_buy || 'Cómo comprar'}</a></li><li><a href="/seguridad" onClick={(e) => { e.preventDefault(); navigate('/seguridad'); }} className="hover:text-white cursor-pointer">{t.safety_tips || 'Consejos de seguridad'}</a></li><li><button type="button" onClick={() => { if(user){setCurrentTab('profile'); setDashboardTab('favorites'); navigate('/profile');} else {setShowAuthModal(true);}}} className="hover:text-white cursor-pointer text-left">{t.favorites || 'Favoritos'}</button></li></ul></div>
            <div><div className="font-semibold text-white mb-3 text-[14px]">{t.sellers || 'Vendedores'}</div><ul className="space-y-2 text-[13px]"><li><a href="/post" onClick={(e) => { e.preventDefault(); navigate('/post'); }} className="hover:text-white cursor-pointer">{t.post_ad || 'Publicar anuncio'}</a></li><li><a href="/tarifas" onClick={(e) => { e.preventDefault(); navigate('/tarifas'); }} className="hover:text-white cursor-pointer">{t.pricing || 'Tarifas'}</a></li><li><button type="button" onClick={() => { if(user){setCurrentTab('profile'); setDashboardTab('my_ads'); navigate('/profile');} else {setShowAuthModal(true);}}} className="hover:text-white cursor-pointer text-left">{t.promote_ad || 'Promocionar anuncio'}</button></li></ul></div>
            <div><div className="font-semibold text-white mb-3 text-[14px]">{t.business || 'Negocios'}</div><ul className="space-y-2 text-[13px]"><li><a href="/tarifas" onClick={(e) => { e.preventDefault(); navigate('/tarifas'); }} className="hover:text-white cursor-pointer">Mercasto Pro</a></li><li><a href="/tiendas" onClick={(e) => { e.preventDefault(); navigate('/tiendas'); }} className="hover:text-white cursor-pointer">{t.footer_store_directory}</a></li><li><a href="/contacto" onClick={(e) => { e.preventDefault(); navigate('/contacto'); }} className="hover:text-white cursor-pointer">{t.footer_solutions}</a></li><li><a href="mailto:partners@mercasto.com" className="hover:text-white cursor-pointer">{t.partners || 'Socios'}</a></li></ul></div>
            <div><div className="font-semibold text-white mb-3 text-[14px]">{t.help || 'Ayuda'}</div><ul className="space-y-2 text-[13px]"><li><a href="/ayuda" onClick={(e) => { e.preventDefault(); navigate('/ayuda'); }} className="hover:text-white cursor-pointer">{t.help_center || 'Centro de Ayuda'}</a></li><li><a href="/seguridad" onClick={(e) => { e.preventDefault(); navigate('/seguridad'); }} className="hover:text-white cursor-pointer">{t.safety_center || 'Centro de Seguridad'}</a></li><li><a href="/privacidad" onClick={(e) => { e.preventDefault(); navigate('/privacidad'); }} className="hover:text-white cursor-pointer">{t.privacy_policy || 'Aviso de Privacidad'}</a></li></ul></div>
          </div>
          <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-[12px] text-slate-400">
              <span>© 2026 Mercasto · {t.footer_made_in_mexico}</span>
        <span className="text-slate-600">·</span>
        <a href="/sobre-mercasto" onClick={(e) => { e.preventDefault(); navigate('/sobre-mercasto'); }} className="hover:text-white cursor-pointer transition-colors">{t.footer_about}</a>
        <span className="text-slate-600">·</span>
        <a href="/como-funciona" onClick={(e) => { e.preventDefault(); navigate('/como-funciona'); }} className="hover:text-white cursor-pointer transition-colors">{t.how_it_works}</a>
        <span className="text-slate-600">·</span>
        <a href="/contacto" onClick={(e) => { e.preventDefault(); navigate('/contacto'); }} className="hover:text-white cursor-pointer transition-colors">{t.footer_contact}</a>
        <span className="text-slate-600">·</span>
        <a href="/ayuda" onClick={(e) => { e.preventDefault(); navigate('/ayuda'); }} className="hover:text-white cursor-pointer transition-colors">{t.help}</a>
        <span className="text-slate-600">·</span>
        <a href="/terminos" onClick={(e) => { e.preventDefault(); navigate('/terminos'); }} className="hover:text-white cursor-pointer transition-colors">{t.terms_of_use}</a>
        <span className="text-slate-600">·</span>
        <a href="/privacidad" onClick={(e) => { e.preventDefault(); navigate('/privacidad'); }} className="hover:text-white cursor-pointer transition-colors">{t.privacy_policy}</a>
        <span className="text-slate-600">·</span>
        <a href="/cookies" onClick={(e) => { e.preventDefault(); navigate('/cookies'); }} className="hover:text-white cursor-pointer transition-colors">{t.footer_cookies}</a>
            </div>
          </div>
        </div>
      </footer>
  );
}
