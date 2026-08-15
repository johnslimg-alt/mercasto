import { XCircle } from 'lucide-react';
import useModalFocusTrap from '../../hooks/useModalFocusTrap';

export default function ReportModal({ handleReportAd, reportForm, setReportForm, setShowReportModal, showReportModal, t }) {
    const closeModal = () => setShowReportModal(false);
    const { dialogRef, initialFocusRef, handleKeyDown } = useModalFocusTrap({ isOpen: showReportModal, onClose: closeModal });
    if (!showReportModal) return null;
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <div data-pointer-dismiss-surface aria-hidden="true" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal} />
        <div ref={dialogRef} role="dialog" aria-modal="true" onKeyDown={handleKeyDown} aria-labelledby="report-ad-title" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 relative shadow-2xl animate-in fade-in zoom-in-95 w-full max-w-md">
          <button ref={initialFocusRef} type="button" aria-label={t.close_btn || t.close} onClick={closeModal} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><XCircle size={24}/></button>
          <h2 id="report-ad-title" className="text-[20px] font-bold text-slate-900 dark:text-white mb-2">{t.report_ad}</h2>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-6">{t.report_ad_help}</p>
          <form onSubmit={handleReportAd} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.reason}</label>
              <select required value={reportForm.reason} onChange={e => setReportForm({...reportForm, reason: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                <option value="">{t.report_select_reason}</option>
                <option value="Fraude o estafa">{t.report_reason_fraud}</option>
                <option value="Contenido inapropiado">{t.report_reason_inappropriate}</option>
                <option value="Artículo falso o falsificado">{t.report_reason_counterfeit}</option>
                <option value="Ya se vendió">{t.sold_status}</option>
                <option value="Otro">{t.report_reason_other}</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.comments}</label>
              <textarea value={reportForm.comments} onChange={e => setReportForm({...reportForm, comments: e.target.value})} placeholder={t.report_details_placeholder} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] min-h-[80px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"></textarea>
            </div>
            <button type="submit" className="btn-md w-full bg-[#0F172A] dark:bg-[#84CC16] text-white dark:text-slate-950 hover:bg-black dark:hover:bg-[#65A30D] mt-2 shadow-sm">{t.report_send}</button>
          </form>
        </div>
      </div>
    );
  }
