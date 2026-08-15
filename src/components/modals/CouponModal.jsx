import { Ticket, XCircle } from 'lucide-react';
import useModalFocusTrap from '../../hooks/useModalFocusTrap';

export default function CouponModal({ couponInput, handleRedeemCoupon, setCouponInput, setShowCouponModal, showCouponModal, t }) {
    const closeModal = () => setShowCouponModal(false);
    const { dialogRef, initialFocusRef, handleKeyDown } = useModalFocusTrap({ isOpen: showCouponModal, onClose: closeModal });
    if (!showCouponModal) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="coupon-modal-title" onKeyDown={handleKeyDown} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl animate-in fade-in zoom-in-95">
          <button ref={initialFocusRef} type="button" aria-label={t.close_btn || t.close || 'Close'} onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><XCircle size={24}/></button>
          <div className="flex justify-center mb-4"><Ticket className="text-[#84CC16] w-12 h-12" /></div>
          <h2 id="coupon-modal-title" className="text-[20px] font-bold tracking-tight mb-2 text-center text-slate-900 dark:text-white">{t.redeem_coupon_title || 'Canjear Cupón'}</h2>
          <p className="text-center text-slate-500 dark:text-slate-400 text-[13px] mb-6">{t.redeem_coupon_desc || 'Introduce tu código promocional para recibir créditos gratis.'}</p>
          <form onSubmit={handleRedeemCoupon} className="space-y-4">
            <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} required placeholder={t.coupon_code_placeholder || 'CÓDIGO'} className="w-full px-3.5 py-3 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 uppercase text-center font-bold tracking-widest bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" />
            <button type="submit" className="btn-lg w-full bg-[#0F172A] dark:bg-[#84CC16] text-white dark:text-slate-950 hover:bg-black dark:hover:bg-[#65A30D]">{t.redeem || 'Canjear'}</button>
          </form>
        </div>
      </div>
    );
  }
