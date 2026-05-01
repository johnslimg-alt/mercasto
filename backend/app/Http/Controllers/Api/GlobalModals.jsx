import React from 'react';
import { XCircle, QrCode, Ticket, User, Camera, Loader2, Crown, CheckCircle } from 'lucide-react';

export const QRModal = ({ qrModalData, setQrModalData }) => {
  if (!qrModalData) return null;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrModalData)}`;
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setQrModalData(null)}>
      <div className="bg-white rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95 flex flex-col items-center max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <button onClick={() => setQrModalData(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
        <div className="w-12 h-12 bg-lime-100 text-[#65A30D] rounded-2xl flex items-center justify-center mb-4"><QrCode size={28}/></div>
        <h2 className="text-[20px] font-bold text-slate-900 mb-2">Escanea para contactar</h2>
        <p className="text-[13px] text-slate-500 mb-6 text-center">Abre la cámara de tu celular y escanea este código para enviar un mensaje al vendedor.</p>
        <div className="p-4 bg-white border-2 border-slate-100 rounded-3xl shadow-sm mb-6"><img src={qrUrl} alt="QR Code" className="w-48 h-48" /></div>
        <button onClick={() => setQrModalData(null)} className="btn-md w-full bg-slate-100 text-slate-700 hover:bg-slate-200">Cerrar</button>
      </div>
    </div>
  );
};

export const ReportModal = ({ showReportModal, setShowReportModal, handleReportAd, reportForm, setReportForm }) => {
  if (!showReportModal) return null;
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReportModal(false)}>
      <div className="bg-white rounded-3xl p-6 md:p-8 relative shadow-2xl animate-in fade-in zoom-in-95 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <button onClick={() => setShowReportModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
        <h2 className="text-[20px] font-bold text-slate-900 mb-2">Reportar Anuncio</h2>
        <p className="text-[13px] text-slate-500 mb-6">Ayúdanos a entender el problema con este anuncio.</p>
        <form onSubmit={handleReportAd} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Motivo</label>
            <select required value={reportForm.reason} onChange={e => setReportForm({...reportForm, reason: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white">
              <option value="">Selecciona un motivo...</option><option value="Fraude o estafa">Fraude o estafa</option><option value="Contenido inapropiado">Contenido inapropiado</option><option value="Artículo falso o falsificado">Artículo falso o falsificado</option><option value="Ya se vendió">Ya se vendió</option><option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Comentarios adicionales</label>
            <textarea value={reportForm.comments} onChange={e => setReportForm({...reportForm, comments: e.target.value})} placeholder="Proporciona más detalles..." className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] min-h-[80px] bg-white"></textarea>
          </div>
          <button type="submit" className="btn-md w-full bg-[#0F172A] text-white hover:bg-black mt-2 shadow-sm">Enviar Reporte</button>
        </form>
      </div>
    </div>
  );
};

export const UserReportModal = ({ showUserReportModal, setShowUserReportModal, handleUserReportSubmit, userReportForm, setUserReportForm }) => {
  if (!showUserReportModal) return null;
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowUserReportModal(false)}>
      <div className="bg-white rounded-3xl p-6 md:p-8 relative shadow-2xl animate-in fade-in zoom-in-95 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <button onClick={() => setShowUserReportModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
        <h2 className="text-[20px] font-bold text-slate-900 mb-2">Reportar Vendedor</h2>
        <p className="text-[13px] text-slate-500 mb-6">Ayúdanos a mantener una comunidad segura.</p>
        <form onSubmit={handleUserReportSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Motivo</label>
            <select required value={userReportForm.reason} onChange={e => setUserReportForm({...userReportForm, reason: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white">
              <option value="">Selecciona un motivo...</option><option value="Comportamiento abusivo">Comportamiento abusivo o insultos</option><option value="Sospecha de fraude">Sospecha de fraude</option><option value="Vende productos ilegales">Vende productos prohibidos</option><option value="Suplantación de identidad">Suplantación de identidad</option><option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Detalles adicionales</label>
            <textarea value={userReportForm.comments} onChange={e => setUserReportForm({...userReportForm, comments: e.target.value})} placeholder="Explica la situación..." className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] min-h-[80px] bg-white"></textarea>
          </div>
          <button type="submit" className="btn-md w-full bg-[#0F172A] text-white hover:bg-black mt-2 shadow-sm">Enviar Reporte</button>
        </form>
      </div>
    </div>
  );
};

export const CouponModal = ({ showCouponModal, setShowCouponModal, handleRedeemCoupon, couponInput, setCouponInput }) => {
  if (!showCouponModal) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative shadow-2xl animate-in fade-in zoom-in-95">
        <button onClick={() => setShowCouponModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
        <div className="flex justify-center mb-4"><Ticket className="text-[#84CC16] w-12 h-12" /></div>
        <h2 className="text-[20px] font-bold tracking-tight mb-2 text-center text-slate-900">Canjear Cupón</h2>
        <p className="text-center text-slate-500 text-[13px] mb-6">Introduce tu código promocional para recibir créditos gratis.</p>
        <form onSubmit={handleRedeemCoupon} className="space-y-4">
          <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} required placeholder="CÓDIGO" className="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 uppercase text-center font-bold tracking-widest" />
          <button type="submit" className="btn-lg w-full bg-[#0F172A] text-white hover:bg-black">Canjear</button>
        </form>
      </div>
    </div>
  );
};

export const ProfileModal = ({ showProfileModal, setShowProfileModal, handleProfileSubmit, profileForm, setProfileForm, profileLoading, user, getImageUrl }) => {
  if (!showProfileModal) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95">
        <button onClick={() => setShowProfileModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
        <h2 className="text-[22px] font-bold tracking-tight mb-6 text-center text-slate-900">Editar Perfil</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-slate-100 mb-3 overflow-hidden relative group border border-slate-200">
              {profileForm.avatarPreview ? <img src={profileForm.avatarPreview} className="w-full h-full object-cover" alt="Avatar" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><User size={40} /></div>}
              <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-colors"><Camera className="w-8 h-8 text-white" /><input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files[0]; if (file) { if (profileForm.avatarPreview && profileForm.avatarPreview.startsWith('blob:')) URL.revokeObjectURL(profileForm.avatarPreview); setProfileForm({ ...profileForm, avatarFile: file, avatarPreview: URL.createObjectURL(file) }); } }}/></label>
            </div>
            <span className="text-[12px] font-medium text-slate-500">Cambiar Foto</span>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Nombre</label>
            <input value={profileForm.name} onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />
          </div>
          <button type="submit" disabled={profileLoading} className="btn-lg w-full bg-[#0F172A] text-white hover:bg-black flex justify-center mt-2">{profileLoading ? <Loader2 className="animate-spin" size={20}/> : 'Guardar Cambios'}</button>
        </form>
      </div>
    </div>
  );
};

export const PricingModal = ({ showPricingModal, setShowPricingModal, priceTab, setPriceTab, handleClipPayment, t }) => {
  if (!showPricingModal) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-end md:items-center justify-center p-0 md:p-6 backdrop-blur-sm">
      <div className="bg-slate-50 w-full max-w-5xl md:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0">
        <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="p-5 flex justify-between items-center">
            <h3 className="font-bold text-[22px] text-slate-900 flex items-center gap-2"><Crown className="w-6 h-6 text-amber-500"/> {t.pricing_title}</h3>
            <button onClick={() => setShowPricingModal(false)} className="p-1 text-slate-400 hover:text-slate-800 transition-colors"><XCircle size={26}/></button>
          </div>
          <div className="flex px-5 gap-6 border-t border-slate-100">
            <button onClick={() => setPriceTab('particular')} className={`py-4 font-semibold text-[14px] border-b-2 transition-colors ${priceTab === 'particular' ? 'border-[#84CC16] text-[#65A30D]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t.tab_individuals}</button>
            <button onClick={() => setPriceTab('pro')} className={`py-4 font-semibold text-[14px] border-b-2 transition-colors ${priceTab === 'pro' ? 'border-[#84CC16] text-[#65A30D]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t.tab_businesses}</button>
          </div>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto">
          {priceTab === 'particular' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto">
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 flex flex-col shadow-sm">
                <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[12px] mb-2">{t.plan_free}</h4><p className="text-4xl font-black text-slate-900 mb-4">$0</p>
                <ul className="space-y-3 mb-8 flex-1"><li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> 3 {t.free_ad} / mes</li><li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Contacto por QR</li></ul>
                <button className="btn-lg w-full border border-slate-300 text-slate-700 hover:bg-slate-50">{t.current_plan}</button>
              </div>
              <div className="bg-[#84CC16] rounded-3xl p-6 md:p-8 border border-[#84CC16] flex flex-col shadow-lg">
                <h4 className="font-bold text-lime-100 uppercase tracking-wider text-[12px] mb-2">{t.plan_plus}</h4><p className="text-4xl font-black text-white mb-4">$99 <span className="text-[14px] font-medium text-lime-100">/mes</span></p>
                <ul className="space-y-3 mb-8 flex-1"><li className="flex items-center gap-2 text-[14px] text-white"><CheckCircle className="w-4 h-4 text-white"/> 10 anuncios / mes</li><li className="flex items-center gap-2 text-[14px] text-white"><CheckCircle className="w-4 h-4 text-white"/> 2 Subidas a TOP gratis</li><li className="flex items-center gap-2 text-[14px] text-white"><CheckCircle className="w-4 h-4 text-white"/> Más visibilidad</li></ul>
                <button onClick={() => handleClipPayment(99, 'Suscripción Paquete Plus')} className="btn-lg w-full bg-white text-[#65A30D] hover:bg-slate-50 shadow-sm">{t.buy_plan}</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#84CC16]/50 flex flex-col relative shadow-sm">
                <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[12px] mb-2">{t.plan_pro_basic}</h4><p className="text-4xl font-black text-slate-900 mb-4">$500 <span className="text-[14px] font-medium text-slate-500">/mes</span></p>
                <ul className="space-y-3 mb-8 flex-1"><li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> 50 anuncios / mes</li><li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Insignia "PRO"</li><li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Página de Empresa</li><li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Estadísticas avanzadas</li></ul>
                <button onClick={() => handleClipPayment(500, 'Suscripción PRO Estándar')} className="btn-lg w-full border-2 border-[#84CC16] text-[#65A30D] hover:bg-[#84CC16]/5">{t.buy_plan}</button>
              </div>
              <div className="bg-[#0F172A] rounded-3xl p-6 md:p-8 flex flex-col relative shadow-xl transform md:-translate-y-2 ring-2 ring-[#84CC16]">
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#84CC16] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-md">POPULAR</div>
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[12px] mb-2">{t.plan_pro_max}</h4><p className="text-4xl font-black text-white mb-4">$1,500 <span className="text-[14px] font-medium text-slate-400">/mes</span></p>
                <ul className="space-y-3 mb-8 flex-1"><li className="flex items-center gap-2 text-[14px] text-white/90"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Anuncios Ilimitados</li><li className="flex items-center gap-2 text-[14px] text-white/90"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Subida masiva (XML/CSV)</li><li className="flex items-center gap-2 text-[14px] text-white/90"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> 10 Destacados incluidos</li><li className="flex items-center gap-2 text-[14px] text-white/90"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Soporte dedicado</li></ul>
                <button onClick={() => handleClipPayment(1500, 'Suscripción PRO Ilimitado')} className="btn-lg w-full bg-[#84CC16] text-white hover:bg-[#65A30D] shadow-md">{t.buy_plan}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};