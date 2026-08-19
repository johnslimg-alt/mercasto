import { QrCode, XCircle } from 'lucide-react';
import useModalFocusTrap from '../../hooks/useModalFocusTrap';

export default function QRModal({ qrModalData, setQrModalData, t }) {
    const isOpen = Boolean(qrModalData);
    const closeModal = () => setQrModalData(null);
    const { dialogRef, initialFocusRef, handleKeyDown } = useModalFocusTrap({ isOpen, onClose: closeModal });
    if (!isOpen) return null;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrModalData)}`;

    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <div data-pointer-dismiss-surface aria-hidden="true" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal} />
        <div ref={dialogRef} role="dialog" aria-modal="true" onKeyDown={handleKeyDown} aria-labelledby="qr-contact-title" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95 flex flex-col items-center max-w-sm w-full">
          <button ref={initialFocusRef} type="button" aria-label={t.close_btn} onClick={closeModal} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><XCircle size={24}/></button>
          <div className="w-12 h-12 bg-lime-100 dark:bg-lime-500/10 text-[#65A30D] dark:text-[#84CC16] rounded-2xl flex items-center justify-center mb-4"><QrCode size={28}/></div>
          <h2 id="qr-contact-title" className="text-[20px] font-bold text-slate-900 dark:text-white mb-2">{t.qr_contact_title}</h2>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-6 text-center">{t.qr_contact_desc}</p>
          <div className="p-4 bg-white border-2 border-slate-100 rounded-3xl shadow-sm mb-6">
            <img src={qrUrl} alt={t.qr_contact_title} className="w-48 h-48" />
          </div>
          <button onClick={closeModal} className="btn-md w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700">{t.close_btn}</button>
        </div>
      </div>
    );
  }
