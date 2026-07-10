import { mexicoLocations, subcategoriesMap } from '../../constants/locationsAndCategories';
import { mockAds, spotlightRealEstate, jobsBoard, servicesMarketplace, automotiveDeals, recentlyViewed } from '../../constants/mockData';
import React from 'react';
import { Shield, Pencil, PlusCircle, Heart, MapPin, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Camera, User, Users, BadgeCheck, ShieldCheck, Building2, Zap, Ticket, Crown, Store, UploadCloud, LogOut, Settings, BarChart3, QrCode, Download, Loader2, Settings2, Globe, Sparkles, Play, Video, Phone, AlertTriangle, ArrowRight, ExternalLink, MessageCircle, Share2, Star, Info, HelpCircle, Menu, X, Bell, CreditCard, Megaphone, MousePointerClick } from "lucide-react";
import { IconMap } from '../../constants/iconMap';
import { localizedText } from '../../utils/localize';
import AdminBusinessVerifications from './AdminBusinessVerifications';
export default function AdminScreen({ adminAnalytics, adminCatForm, adminCoupons, adminLoading, adminPendingAds, adminReportTab, adminReports, adminTab, adminUserReports, adminUserSearch, adminUsers, allAds, cancelCatEdit, categoriesData, couponForm, editingCatId, form, getImageUrl, getImageUrls, handleAdminChangeRole, handleAdminDeleteUser, handleAdminVerifyUser, handleCreateCoupon, handleDeleteCoupon, handleDeleteReport, handleDeleteUserReport, handleEditCategory, handleModerateAd, handleSaveCategory, handleViewAd, lang, loadAdminAnalytics, loadAdminReports, loadAdminUsers, loadCoupons, loadPendingAds, loadingAdminUsers, loadingCoupons, loadingPendingAds, loadingReports, setAdminCatForm, setAdminReportTab, setAdminTab, setAdminUserSearch, setCouponForm, t, user, userRole, adminPayments, loadingAdminPayments, adminPaymentsPage, adminPaymentsLastPage, adminPaymentsTotal, loadAdminPayments, token }) {
    if (userRole !== 'admin') return <div className="p-10 text-center font-bold text-red-500">{t.access_denied || 'Access denied'}</div>;
    React.useEffect(() => {
        if (adminTab === 'payments') {
            loadAdminPayments(1);
            loadAdminAnalytics?.();
        }
    }, [adminTab, loadAdminAnalytics, loadAdminPayments]);
    const filteredAdminUsers = adminUsers.filter(u => 
      (u.name && u.name.toLowerCase().includes(adminUserSearch.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(adminUserSearch.toLowerCase())) ||
      (u.id && u.id.toString() === adminUserSearch.trim())
    );
    return (
      <div className="dashboard-dark-scope bg-[var(--paper)] min-h-screen pb-6 md:pb-12 w-full">
        <div className="p-4 md:p-8 w-full max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h2 className="hidden md:flex text-2xl font-bold items-center gap-3 text-slate-900 tracking-tight"><Shield className="text-red-500" size={32}/> {t.admin_panel}</h2>
            <div className="bg-slate-200 p-1 rounded-xl flex items-center w-fit">
               <button onClick={() => setAdminTab('categories')} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'categories' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.cat_tab}</button>
               <button onClick={() => {setAdminTab('users'); loadAdminUsers();}} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'users' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.users_tab}</button>
               <button onClick={() => {setAdminTab('moderation'); loadPendingAds();}} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'moderation' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.mod_tab}</button>
               <button onClick={() => {setAdminTab('coupons'); loadCoupons();}} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'coupons' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.coupons_tab}</button>
               <button onClick={() => {setAdminTab('reports'); loadAdminReports();}} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'reports' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.reports_tab}</button>
               <button onClick={() => {setAdminTab('payments'); loadAdminPayments(1);}} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'payments' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.admin_payments_tab || 'Pagos'}</button>
               <button onClick={() => setAdminTab('business_verifications')} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'business_verifications' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>RFC/CSF</button>
            </div>
          </div>
          {adminTab === 'categories' ? (
            <>
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
            <h3 className="text-[18px] font-bold mb-6 text-slate-900 flex items-center gap-2">
              {editingCatId ? <Pencil className="text-[#84CC16]" size={20}/> : <PlusCircle className="text-[#84CC16]" size={20}/>} 
              {editingCatId ? t.edit_cat : t.add_cat}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.slug}</label>
                  <input value={adminCatForm.slug} onChange={e=>setAdminCatForm({...adminCatForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})} required placeholder="ej. deportes-extremos" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.icon}</label>
                  <select value={adminCatForm.icon} onChange={e=>setAdminCatForm({...adminCatForm, icon: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white cursor-pointer transition-all">
                    {Object.keys(IconMap).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.name_es}</label>
                  <input value={adminCatForm.name_es} onChange={e=>setAdminCatForm({...adminCatForm, name_es: e.target.value})} required placeholder="Deportes Extremos" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.name_en}</label>
                  <input value={adminCatForm.name_en} onChange={e=>setAdminCatForm({...adminCatForm, name_en: e.target.value})} required placeholder="Extreme Sports" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.sort_order}</label>
                  <input type="number" value={adminCatForm.sort_order} onChange={e=>setAdminCatForm({...adminCatForm, sort_order: parseInt(e.target.value) || 0})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-3 mt-2">
                <button type="submit" disabled={adminLoading} className="btn-md w-full md:w-auto bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-2">
                  {adminLoading ? <Loader2 className="animate-spin" size={18}/> : (editingCatId ? <><Pencil size={16}/> {t.save_changes}</> : <><PlusCircle size={16}/> {t.save_cat}</>)}
                </button>
                {editingCatId && (
                  <button type="button" onClick={cancelCatEdit} className="btn-md w-full md:w-auto border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-2">
                    {t.cancel}
                  </button>
                )}
              </div>
            </form>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-[18px] font-bold mb-6 text-slate-900">{t.existing_cats} ({categoriesData.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categoriesData.map(cat => {
                const Icon = IconMap[cat.icon] || Star;
                return (
                  <div key={cat.slug} className="border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-4 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100"><Icon size={20} className="text-[#65A30D]"/></div>
                      <div>
                        <p className="font-semibold text-[14px] text-slate-900 leading-tight">{cat.name?.[lang] || cat.name?.['es'] || cat.name}</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-1">{cat.slug}</p>
                      </div>
                    </div>
                    <button onClick={() => handleEditCategory(cat)} className="p-2 text-slate-400 hover:text-[#84CC16] hover:bg-[#84CC16]/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                       <Pencil size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
          </>
          ) : adminTab === 'moderation' ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-[18px] font-bold text-slate-900 mb-6 flex items-center gap-2"><ShieldCheck className="text-[#84CC16]" size={20}/> {t.pending_ads} ({adminPendingAds.length})</h3>
              {loadingPendingAds ? (
                 <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#84CC16]" size={32}/></div>
              ) : adminPendingAds.length === 0 ? (
                 <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[12px]">{t.no_pending}</div>
              ) : (
                 <div className="space-y-4">
                    {adminPendingAds.map(ad => (
                       <div key={ad.id} className="p-4 border border-slate-200 rounded-2xl flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                          {ad.image_url ? (
                             <img src={getImageUrls(ad.image_url, ad.image)[0]} className="w-20 h-20 rounded-xl object-cover border border-slate-200" alt="Preview" />
                          ) : (
                             <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200"><Camera className="text-slate-400"/></div>
                          )}
                          <div className="flex-1">
                             <h4 className="font-semibold text-slate-900 text-[15px] line-clamp-1">{localizedText(ad.title, lang)}</h4>
                             <p className="text-[14px] font-bold text-[#65A30D] mt-1">${Number(ad.price).toLocaleString()}</p>
                             <p className="text-[12px] text-slate-500 mt-1">Por: {ad.user?.name} ({ad.user?.email})</p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                             <button onClick={() => handleModerateAd(ad.id, 'active')} className="btn-sm bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 flex items-center justify-center gap-1.5 flex-1 sm:flex-none"><CheckCircle size={16}/> {t.approve}</button>
                             <button onClick={() => handleModerateAd(ad.id, 'rejected')} className="btn-sm bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 flex items-center justify-center gap-1.5 flex-1 sm:flex-none"><XCircle size={16}/> {t.reject}</button>
                          </div>
                       </div>
                    ))}
                 </div>
              )}
            </div>
          ) : adminTab === 'coupons' ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-[18px] font-bold text-slate-900 mb-6 flex items-center gap-2"><Ticket className="text-[#84CC16]" size={20}/> {t.coupon_gen}</h3>
              <form onSubmit={handleCreateCoupon} className="flex flex-col sm:flex-row items-end gap-3 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-full sm:flex-1">
                  <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.code}</label>
                  <input type="text" value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})} required className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 text-[13px] uppercase" />
                </div>
                <div className="w-full sm:w-28">
                  <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.credits}</label>
                  <input type="number" value={couponForm.credits} onChange={e => setCouponForm({...couponForm, credits: Number(e.target.value)})} required min="1" className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 text-[13px]" />
                </div>
                <div className="w-full sm:w-28">
                  <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.max_uses}</label>
                  <input type="number" value={couponForm.max_uses} onChange={e => setCouponForm({...couponForm, max_uses: Number(e.target.value)})} required min="1" className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 text-[13px]" />
                </div>
                <button type="submit" className="btn-sm bg-[#0F172A] text-white hover:bg-black h-[38px] w-full sm:w-auto">{t.create}</button>
              </form>
              {loadingCoupons ? <div className="flex justify-center py-5"><Loader2 className="animate-spin text-slate-400"/></div> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {adminCoupons.map(c => (
                    <div key={c.id} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center relative overflow-hidden bg-white">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#84CC16]"></div>
                      <div>
                        <div className="font-black text-slate-900 tracking-wider text-[15px]">{c.code}</div>
                        <div className="text-[12px] text-slate-500 mt-1"><span className="font-bold text-[#65A30D]">{c.credits} cr.</span> • Usado: {c.used_count}/{c.max_uses}</div>
                      </div>
                      <button onClick={() => handleDeleteCoupon(c.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  {adminCoupons.length === 0 && <p className="text-slate-400 text-[13px] col-span-full">{t.no_coupons}</p>}
                </div>
              )}
            </div>
          ) : adminTab === 'reports' ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h3 className="text-[18px] font-bold text-slate-900 flex items-center gap-2"><Shield className="text-[#84CC16]" size={20}/> {t.report_center}</h3>
                <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                  <button onClick={() => setAdminReportTab('ads')} className={`px-4 py-1.5 text-[12px] font-bold rounded-md transition-colors ${adminReportTab === 'ads' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.ads || 'Ads'}</button>
                  <button onClick={() => setAdminReportTab('users')} className={`px-4 py-1.5 text-[12px] font-bold rounded-md transition-colors ${adminReportTab === 'users' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.users_tab || 'Users'}</button>
                </div>
              </div>
              {loadingReports ? <div className="flex justify-center py-5"><Loader2 className="animate-spin text-slate-400"/></div> : (
                <div className="overflow-x-auto">
                  {adminReportTab === 'ads' ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[12px] uppercase tracking-wide text-slate-500">
                        <th className="p-3">{t.reported_ad}</th>
                        <th className="p-3">{t.reason}</th>
                        <th className="p-3 hidden md:table-cell">{t.comments}</th>
                        <th className="p-3 hidden sm:table-cell">{t.reported_by}</th>
                        <th className="p-3 text-right">{t.action}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminReports.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors text-[13px]">
                          <td className="p-3 font-medium text-slate-900">
                            ID: {r.ad_id} - <span className="line-clamp-1 cursor-pointer hover:text-[#65A30D] transition-colors" onClick={() => { const ad = allAds.find(a => a.id === r.ad_id); if(ad) handleViewAd(ad); }}>{r.ad_title}</span>
                            <span className={`badge mt-1 ${r.ad_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{r.ad_status}</span>
                          </td>
                          <td className="p-3 font-semibold text-red-600">{r.reason}</td>
                          <td className="p-3 text-slate-600 max-w-[200px] truncate hidden md:table-cell" title={r.comments}>{r.comments || '-'}</td>
                          <td className="p-3 text-slate-500 hidden sm:table-cell">{r.reporter_name ? `${r.reporter_name}` : 'Anónimo'}</td>
                          <td className="p-3 text-right">
                            <button onClick={() => handleDeleteReport(r.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Descartar reporte"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      ))}
                      {adminReports.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400 font-medium">{t.no_reports}</td></tr>}
                    </tbody>
                  </table>
                  ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[12px] uppercase tracking-wide text-slate-500">
                        <th className="p-3">{t.reported_user}</th>
                        <th className="p-3">{t.reason}</th>
                        <th className="p-3 hidden md:table-cell">{t.comments}</th>
                        <th className="p-3 hidden sm:table-cell">{t.reported_by}</th>
                        <th className="p-3 text-right">{t.action}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminUserReports.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors text-[13px]">
                          <td className="p-3 font-medium text-slate-900">ID: {r.reported_user_id} - <span className="text-[#65A30D]">{r.reported_name}</span></td>
                          <td className="p-3 font-semibold text-red-600">{r.reason}</td>
                          <td className="p-3 text-slate-600 max-w-[200px] truncate hidden md:table-cell" title={r.comments}>{r.comments || '-'}</td>
                          <td className="p-3 text-slate-500 hidden sm:table-cell">{r.reporter_name ? `${r.reporter_name}` : 'Anónimo'}</td>
                          <td className="p-3 text-right">
                            <button onClick={() => handleDeleteUserReport(r.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Descartar reporte"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      ))}
                      {adminUserReports.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400 font-medium">{t.no_reports}</td></tr>}
                    </tbody>
                  </table>
                  )}
                </div>
              )}
            </div>
          ) : adminTab === 'payments' ? (
            <div className="space-y-6">
              {/* Header Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      {t.admin_transactions_registered || 'Transacciones Registradas'}
                    </span>
                    <span className="text-3xl font-black text-slate-900 dark:text-white mt-1 block">
                      {adminPaymentsTotal}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 block">
                      {t.admin_volume_desc || 'Volumen total de transacciones de pago'}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700">
                    <CreditCard size={24} />
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      {t.admin_approved_revenue || 'Ingresos Aprobados (Pág. Actual)'}
                    </span>
                    <span className="text-3xl font-black text-[#84CC16] mt-1 block">
                      ${Number(adminAnalytics?.revenue_period ?? adminPayments.filter(p => ['paid', 'succeeded', 'approved'].includes(p.status?.toLowerCase())).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)).toFixed(2)} MXN
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 block">
                      {t.admin_approved_revenue_desc || 'Monto de pagos exitosos mostrados'}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-lime-50 dark:bg-lime-950/20 flex items-center justify-center text-[#84CC16] shadow-sm border border-lime-100/55 dark:border-lime-900/30">
                    <Zap size={24} className="fill-[#84CC16]/20" />
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Revenue promo 30d</span>
                    <span className="text-3xl font-black text-amber-500 mt-1 block">
                      ${Number(adminAnalytics?.promotion_revenue_period || 0).toFixed(2)}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 block">Boost / Highlight / Featured</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500 shadow-sm border border-amber-100/55 dark:border-amber-900/30">
                    <Megaphone size={24} />
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">CTR global</span>
                    <span className="text-3xl font-black text-blue-500 mt-1 block">{adminAnalytics?.ctr || 0}%</span>
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 block">
                      {Number(adminAnalytics?.total_clicks || 0).toLocaleString('es-MX')} clics / {Number(adminAnalytics?.total_impressions || 0).toLocaleString('es-MX')} imp.
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-500 shadow-sm border border-blue-100/55 dark:border-blue-900/30">
                    <MousePointerClick size={24} />
                  </div>
                </div>
              </div>
              {/* Audit Table Section */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <div>
                    <h3 className="text-[18px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="text-[#84CC16]" size={20}/> {t.admin_payments_audit || 'Auditoría de Pagos'}
                    </h3>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                      {t.admin_payments_audit_desc || 'Monitorea y valida las transacciones procesadas a través de la pasarela de pagos.'}
                    </p>
                  </div>
                  <button 
                    onClick={() => loadAdminPayments(adminPaymentsPage)}
                    disabled={loadingAdminPayments}
                    className="btn-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 self-end sm:self-auto"
                  >
                    {loadingAdminPayments ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#84CC16]" />
                    ) : (
                      <Zap className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    )}
                    {t.refresh_btn || 'Actualizar'}
                  </button>
                </div>
                {loadingAdminPayments ? (
                  <div className="space-y-4 py-4">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="border border-slate-100 dark:border-slate-700/60 rounded-2xl p-4 animate-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            <div className="w-5 h-5 bg-slate-200 dark:bg-slate-600 rounded-full" />
                          </div>
                          <div>
                            <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded-md w-40 mb-2" />
                            <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-md w-28" />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded-md w-20" />
                          <div className="h-6 bg-slate-100 dark:bg-slate-700 rounded-full w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : adminPayments.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center p-6 bg-slate-50/30 dark:bg-slate-900/10">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500 mb-4 shadow-sm">
                      <CreditCard className="w-8 h-8" />
                    </div>
                    <h3 className="text-[16px] font-bold text-slate-900 dark:text-white mb-1">{t.admin_no_payments || 'Sin pagos registrados'}</h3>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-sm">
                      {t.admin_no_payments_desc || 'No se encontraron transacciones en el historial del sistema. Todos los pagos iniciados aparecerán aquí.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto border border-slate-100 dark:border-slate-700/60 rounded-2xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 font-semibold text-[12px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/60">
                            <th className="py-4 px-5">{t.admin_user || 'Usuario'}</th>
                            <th className="py-4 px-5">{t.concept || 'Concepto'}</th>
                            <th className="py-4 px-5">{t.clip_ref || 'Referencia de pago'}</th>
                            <th className="py-4 px-5">{t.date || 'Fecha'}</th>
                            <th className="py-4 px-5">{t.amount || 'Monto'}</th>
                            <th className="py-4 px-5 text-right">{t.status || 'Estado'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-[14px]">
                          {adminPayments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                              <td className="py-4 px-5">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {payment.user_name || `${t.admin_user_id || 'Usuario ID:'} ${payment.user_id}`}
                                  </span>
                                  <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                                    {payment.user_email || (t.admin_email_not_available || 'Email no disponible')}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-5 font-semibold text-slate-900 dark:text-white">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
                                    {payment.description?.toLowerCase().includes('crédito') || payment.description?.toLowerCase().includes('credito') ? (
                                      <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                                    ) : (
                                      <CreditCard className="w-4 h-4 text-blue-500" />
                                    )}
                                  </div>
                                  <span className="line-clamp-1">{payment.description || (t.admin_services_fallback || 'Servicios Mercasto')}</span>
                                </div>
                              </td>
                              <td className="py-4 px-5 text-slate-600 dark:text-slate-300 font-mono text-[12px]">
                                {payment.clip_checkout_id ? (
                                  <span className="bg-slate-100 dark:bg-slate-700/80 px-2 py-1 rounded text-slate-700 dark:text-slate-300 select-all" title={t.admin_click_to_select_all || 'Click para seleccionar todo'}>
                                    {payment.clip_checkout_id.length > 16 ? `${payment.clip_checkout_id.substring(0, 16)}...` : payment.clip_checkout_id}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500">N/A</span>
                                )}
                              </td>
                              <td className="py-4 px-5 text-slate-500 dark:text-slate-400">
                                {payment.created_at ? new Date(payment.created_at).toLocaleString(lang === 'es' ? 'es-MX' : lang === 'pt' ? 'pt-BR' : 'en-US', {
                                  year: 'numeric', month: 'short', day: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                }) : 'N/A'}
                              </td>
                              <td className="py-4 px-5 font-black text-slate-900 dark:text-white">
                                ${parseFloat(payment.amount).toFixed(2)} MXN
                              </td>
                              <td className="py-4 px-5 text-right">
                                {payment.status === 'paid' || payment.status === 'succeeded' || payment.status === 'approved' ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full text-[12px] font-bold border border-emerald-100 dark:border-emerald-900/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {t.payment_status_approved || 'Aprobado'}
                                  </span>
                                ) : payment.status === 'pending' ? (
                                  <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full text-[12px] font-bold border border-amber-100 dark:border-amber-900/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    {t.payment_status_pending || 'Pendiente'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-full text-[12px] font-bold border border-red-100 dark:border-red-900/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    {t.payment_status_failed || 'Fallido'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile View */}
                    <div className="md:hidden space-y-3">
                      {adminPayments.map((payment) => (
                        <div key={payment.id} className="border border-slate-100 dark:border-slate-700/60 rounded-2xl p-4 bg-white dark:bg-slate-800 shadow-sm flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
                                {payment.description?.toLowerCase().includes('crédito') || payment.description?.toLowerCase().includes('credito') ? (
                                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                ) : (
                                  <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                                )}
                              </div>
                              <span className="font-semibold text-slate-900 dark:text-white text-[13px] line-clamp-1">{payment.description || (t.admin_services_fallback || 'Servicios Mercasto')}</span>
                            </div>
                            {payment.status === 'paid' || payment.status === 'succeeded' || payment.status === 'approved' ? (
                              <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[11px] font-bold border border-emerald-100 dark:border-emerald-900/30">
                                {t.payment_status_approved || 'Aprobado'}
                              </span>
                            ) : payment.status === 'pending' ? (
                              <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full text-[11px] font-bold border border-amber-100 dark:border-amber-900/30">
                                {t.payment_status_pending || 'Pendiente'}
                              </span>
                            ) : (
                              <span className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full text-[11px] font-bold border border-red-100 dark:border-red-900/30">
                                {t.payment_status_failed || 'Fallido'}
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] text-slate-500 dark:text-slate-400 space-y-1 pt-1 border-t border-slate-50 dark:border-slate-700/60">
                            <div className="flex justify-between">
                              <span className="font-medium">{t.admin_user || 'Usuario'}:</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{payment.user_name || `ID: ${payment.user_id}`}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">{t.clip_ref || 'Ref. pago'}:</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300 select-all">{payment.clip_checkout_id ? (payment.clip_checkout_id.length > 12 ? `${payment.clip_checkout_id.substring(0, 12)}...` : payment.clip_checkout_id) : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{payment.created_at ? new Date(payment.created_at).toLocaleDateString(lang === 'es' ? 'es-MX' : lang === 'pt' ? 'pt-BR' : 'en-US', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              }) : 'N/A'}</span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                ${parseFloat(payment.amount).toFixed(2)} MXN
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Pagination */}
                    {adminPaymentsLastPage > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 -mx-6 -mb-6 md:-mx-8 md:-mb-8 px-6 py-4 md:px-8">
                        <span className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                          {t.page_word || 'Página'} {adminPaymentsPage} {t.of_word || 'de'} {adminPaymentsLastPage} ({adminPaymentsTotal} {t.total_word || 'total'})
                        </span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => loadAdminPayments(adminPaymentsPage - 1)}
                            disabled={adminPaymentsPage === 1}
                            className="btn-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all font-semibold flex items-center gap-1"
                          >
                            <ChevronLeft size={16} />
                            {t.prev_btn || 'Anterior'}
                          </button>
                          <button 
                            onClick={() => loadAdminPayments(adminPaymentsPage + 1)}
                            disabled={adminPaymentsPage === adminPaymentsLastPage}
                            className="btn-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all font-semibold flex items-center gap-1"
                          >
                            {t.next_btn || 'Siguiente'}
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : adminTab === 'business_verifications' ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">Verificaciones de RFC / CSF pendientes</h3>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">Casos que la IA marcó para revisión manual (dudosos o rechazados).</p>
              </div>
              <AdminBusinessVerifications token={token} />
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-[18px] font-bold text-slate-900 flex items-center gap-2"><Users className="text-[#84CC16]" size={20}/> {t.user_mgmt}</h3>
                <div className="flex items-center gap-2 w-full md:w-auto">
                   <input value={adminUserSearch} onChange={e=>setAdminUserSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadAdminUsers()} placeholder={t.search_users} className="w-full md:w-64 px-3.5 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]" />
                   <button onClick={loadAdminUsers} className="bg-slate-900 hover:bg-black text-white p-2 border border-slate-900 rounded-xl transition-colors"><Search size={18}/></button>
                </div>
              </div>
              {loadingAdminUsers ? (
                 <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#84CC16]" size={32}/></div>
              ) : (
                 <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="border-b border-slate-200 text-[12px] uppercase tracking-wide text-slate-500">
                         <th className="p-3">{t.users_tab}</th>
                         <th className="p-3">{t.status || 'Status'}</th>
                         <th className="p-3">Email / IP</th>
                         <th className="p-3">{t.role}</th>
                         <th className="p-3">Plan</th>
                         <th className="p-3 text-right">{t.action}</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {filteredAdminUsers.map(u => {
                         const accountVerified = Boolean(u.account_verified || u.email_verified || u.email_verified_at || u.phone_verified || u.is_verified || u.kyc_status === 'approved');
                         const methods = u.account_verification_methods || [];
                         const methodLabels = [
                           (u.email_verified || u.email_verified_at || methods.includes('email')) ? 'Email' : null,
                           (u.phone_verified || methods.includes('phone')) ? 'Teléfono' : null,
                           (u.is_verified || methods.includes('admin')) ? 'Admin' : null,
                           (u.kyc_status === 'approved' || methods.includes('kyc')) ? 'KYC' : null,
                         ].filter(Boolean);
                         return (
                         <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                           <td className="p-3">
                             <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-300">
                                  {u.avatar_url ? <img src={getImageUrl(u.avatar_url)} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><User size={20} className="text-slate-400"/></div>}
                               </div>
                               <div>
                                 <p className="font-semibold text-[14px] text-slate-900 flex items-center gap-1">
                                   {u.name}
                                   {accountVerified ? (
                                     <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-100" title={t.verified_account || 'Verified account'}><CheckCircle size={11} /> {t.verified_account || 'Verified account'}</span>
                                   ) : (
                                     <span className="inline-flex items-center text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-100" title={t.unverified_account || 'Unverified account'}><XCircle size={11} /> {t.unverified_account || 'Unverified account'}</span>
                                   )}
                                 </p>
                                 <p className="text-[11px] font-medium text-slate-500 font-mono">ID: {u.id} | KYC: <span className={`font-bold capitalize ${u.kyc_status === 'approved' ? 'text-blue-600' : u.kyc_status === 'pending' ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`}>{u.kyc_status || 'unverified'}</span></p>
                               </div>
                             </div>
                           </td>
                           <td className="p-3">
                             <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${accountVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                               {accountVerified ? <CheckCircle size={13}/> : <AlertTriangle size={13}/>}
                               {accountVerified ? (t.verified_account || 'Verified') : (t.unverified_account || 'Unverified')}
                             </div>
                             <p className="text-[11px] text-slate-500 mt-1">{methodLabels.length ? methodLabels.join(' · ') : 'Email/teléfono pendiente'}</p>
                           </td>
                           <td className="p-3">
                             <p className="font-medium text-[14px] text-slate-900">{u.email}</p>
                             <p className="text-[11px] text-slate-500">{u.ip_address || t.hidden_ip}</p>
                           </td>
                           <td className="p-3">
                             <select 
                               value={u.role} 
                               onChange={(e) => handleAdminChangeRole(u.id, e.target.value)}
                               className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest outline-none cursor-pointer ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'business' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}
                             >
                               <option value="individual">Individual</option>
                               <option value="business">Business (PRO)</option>
                               <option value="admin">Admin</option>
                             </select>
                           </td>
                           <td className="p-3">
                             <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-lime-50 text-lime-700 border border-lime-100">
                               <Crown size={13}/>
                               {u.active_plan?.name || u.plan_name || 'Plan Gratis'}
                             </div>
                             <p className="text-[11px] text-slate-500 mt-1">
                               {u.active_plan?.monthly_ad_limit || u.monthly_ad_limit || 3} anuncios/mes
                               {(u.active_plan?.expires_at || u.plan_expires_at) ? ` · vence ${new Date(u.active_plan?.expires_at || u.plan_expires_at).toLocaleDateString('es-MX')}` : ''}
                             </p>
                           </td>
                           <td className="p-3 text-right flex items-center justify-end gap-2">
                             <button onClick={() => handleAdminVerifyUser(u.id)} className={`p-2 rounded-lg transition-colors ${u.is_verified ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-blue-500'}`} title={t.verify || 'Verify'}>
                               <BadgeCheck size={18}/>
                             </button>
                             <button onClick={() => handleAdminDeleteUser(u.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title={t.delete || 'Delete'}>
                               <Trash2 size={18}/>
                             </button>
                           </td>
                         </tr>
                         );
                       })}
                       {filteredAdminUsers.length === 0 && (
                         <tr>
                           <td colSpan="6" className="p-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">{t.no_users}</td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                 </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
}
