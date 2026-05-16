import { mexicoLocations, subcategoriesMap, mockAds, translations, spotlightRealEstate, jobsBoard, servicesMarketplace, automotiveDeals, recentlyViewed } from '../../constants/mockData';
import React from 'react';
import { Shield, Pencil, PlusCircle, Heart, MapPin, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Camera, User, BadgeCheck, ShieldCheck, Building2, Zap, Ticket, Crown, Store, UploadCloud, LogOut, Settings, BarChart3, QrCode, Download, Loader2, Settings2, Globe, Sparkles, Play, Video, Phone, AlertTriangle, ArrowRight, ExternalLink, MessageCircle, Share2, Star, Info, HelpCircle, Menu, X, Bell } from "lucide-react";

export default function AdminScreen({ IconMap, adminCatForm, adminCoupons, adminLoading, adminPendingAds, adminReportTab, adminReports, adminTab, adminUserReports, adminUserSearch, adminUsers, allAds, cancelCatEdit, categoriesData, couponForm, editingCatId, form, getImageUrl, getImageUrls, handleAdminChangeRole, handleAdminDeleteUser, handleAdminVerifyUser, handleCreateCoupon, handleDeleteCoupon, handleDeleteReport, handleDeleteUserReport, handleEditCategory, handleModerateAd, handleSaveCategory, handleViewAd, lang, loadAdminReports, loadAdminUsers, loadCoupons, loadPendingAds, loadingAdminUsers, loadingCoupons, loadingPendingAds, loadingReports, setAdminCatForm, setAdminReportTab, setAdminTab, setAdminUserSearch, setCouponForm, t, user, userRole }) {
    if (userRole !== 'admin') return <div className="p-10 text-center font-bold text-red-500">Acceso denegado</div>;



    const filteredAdminUsers = adminUsers.filter(u => 

      (u.name && u.name.toLowerCase().includes(adminUserSearch.toLowerCase())) ||

      (u.email && u.email.toLowerCase().includes(adminUserSearch.toLowerCase())) ||

      (u.id && u.id.toString() === adminUserSearch.trim())

    );



    return (

      <div className="bg-[var(--paper)] min-h-screen pb-6 md:pb-12 w-full">

        <div className="p-4 md:p-8 w-full max-w-5xl mx-auto">

          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">

            <h2 className="hidden md:flex text-2xl font-bold items-center gap-3 text-slate-900 tracking-tight"><Shield className="text-red-500" size={32}/> {t.admin_panel}</h2>

            <div className="bg-slate-200 p-1 rounded-xl flex items-center w-fit">

               <button onClick={() => setAdminTab('categories')} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'categories' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.cat_tab}</button>

               <button onClick={() => {setAdminTab('users'); loadAdminUsers();}} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'users' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.users_tab}</button>

               <button onClick={() => {setAdminTab('moderation'); loadPendingAds();}} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'moderation' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.mod_tab}</button>

               <button onClick={() => {setAdminTab('coupons'); loadCoupons();}} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'coupons' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.coupons_tab}</button>

               <button onClick={() => {setAdminTab('reports'); loadAdminReports();}} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'reports' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.reports_tab}</button>

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

                             <h4 className="font-semibold text-slate-900 text-[15px] line-clamp-1">{ad.title}</h4>

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

                  <button onClick={() => setAdminReportTab('ads')} className={`px-4 py-1.5 text-[12px] font-bold rounded-md transition-colors ${adminReportTab === 'ads' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Anuncios</button>

                  <button onClick={() => setAdminReportTab('users')} className={`px-4 py-1.5 text-[12px] font-bold rounded-md transition-colors ${adminReportTab === 'users' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Usuarios</button>

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

                         <th className="p-3">Email / IP</th>

                         <th className="p-3">{t.role}</th>

                         <th className="p-3 text-right">{t.action}</th>

                       </tr>

                     </thead>

                     <tbody className="divide-y divide-slate-100">

                       {filteredAdminUsers.map(u => (

                         <tr key={u.id} className="hover:bg-slate-50 transition-colors">

                           <td className="p-3">

                             <div className="flex items-center gap-3">

                               <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-300">

                                  {u.avatar_url ? <img src={getImageUrl(u.avatar_url)} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><User size={20} className="text-slate-400"/></div>}

                               </div>

                               <div>

                                 <p className="font-semibold text-[14px] text-slate-900 flex items-center gap-1">{u.name}</p>

                                 <p className="text-[11px] font-medium text-slate-500">ID: {u.id}</p>

                               </div>

                             </div>

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

                           <td className="p-3 text-right flex items-center justify-end gap-2">

                             <button onClick={() => handleAdminVerifyUser(u.id)} className={`p-2 rounded-lg transition-colors ${u.is_verified ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-blue-500'}`} title="Verificar">

                               <BadgeCheck size={18}/>

                             </button>

                             <button onClick={() => handleAdminDeleteUser(u.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Eliminar">

                               <Trash2 size={18}/>

                             </button>

                           </td>

                         </tr>

                       ))}

                       {filteredAdminUsers.length === 0 && (

                         <tr>

                           <td colSpan="4" className="p-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">{t.no_users}</td>

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
