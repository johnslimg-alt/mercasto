import { XCircle } from 'lucide-react';
import useModalFocusTrap from '../../hooks/useModalFocusTrap';

export default function UserReportModal({ handleUserReportSubmit, setShowUserReportModal, setUserReportForm, showUserReportModal, t, userReportForm }) {
    const closeModal = () => setShowUserReportModal(false);
    const { dialogRef, initialFocusRef, handleKeyDown } = useModalFocusTrap({ isOpen: showUserReportModal, onClose: closeModal });
    if (!showUserReportModal) return null;
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <div data-pointer-dismiss-surface aria-hidden="true" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal} />
        <div ref={dialogRef} role="dialog" aria-modal="true" onKeyDown={handleKeyDown} aria-labelledby="report-user-title" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 relative shadow-2xl animate-in fade-in zoom-in-95 w-full max-w-md">
          <button ref={initialFocusRef} type="button" aria-label={t.close_btn || t.close} onClick={closeModal} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><XCircle size={24}/></button>
          <h2 id="report-user-title" className="text-[20px] font-bold text-slate-900 dark:text-white mb-2">{t.report_seller}</h2>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-6">{t.report_user_help}</p>
          <form onSubmit={handleUserReportSubmit} className="space-y-4">
            <div>
              <label htmlFor="report-user-reason" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.reason}</label>
              <select id="report-user-reason" required value={userReportForm.reason} onChange={e => setUserReportForm({...userReportForm, reason: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                <option value="">{t.report_select_reason}</option>
                <option value="Comportamiento abusivo">{t.report_reason_abusive}</option>
                <option value="Sospecha de fraude">{t.report_reason_suspected_fraud}</option>
                <option value="Vende productos ilegales">{t.report_reason_prohibited_products}</option>
                <option value="Suplantación de identidad">{t.report_reason_impersonation}</option>
                <option value="Otro">{t.report_reason_other}</option>
              </select>
            </div>
            <div>
              <label htmlFor="report-user-comments" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.report_additional_details}</label>
              <textarea id="report-user-comments" value={userReportForm.comments} onChange={e => setUserReportForm({...userReportForm, comments: e.target.value})} placeholder={t.report_user_details_placeholder} className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] min-h-[80px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"></textarea>
            </div>
            <button type="submit" className="btn-md w-full bg-[#0F172A] dark:bg-[#84CC16] text-white dark:text-slate-950 hover:bg-black dark:hover:bg-[#65A30D] mt-2 shadow-sm">{t.report_send}</button>
          </form>
        </div>
      </div>
    );
  }
